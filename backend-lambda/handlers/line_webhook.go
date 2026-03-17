package handlers

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/ssg-one/backend-lambda/models"
	"github.com/ssg-one/backend-lambda/services"
	"github.com/ssg-one/backend-lambda/utils"

	"github.com/aws/aws-lambda-go/events"
)

type LINEWebhookHandler struct {
	lineService     *services.LINEService
	supabaseService *services.SupabaseService
	claudeService   *services.ClaudeService
	adminHandler    *AdminHandler
}

func NewLINEWebhookHandler(
	lineService *services.LINEService,
	supabaseService *services.SupabaseService,
	claudeService *services.ClaudeService,
	adminHandler *AdminHandler,
) *LINEWebhookHandler {
	return &LINEWebhookHandler{
		lineService:     lineService,
		supabaseService: supabaseService,
		claudeService:   claudeService,
		adminHandler:    adminHandler,
	}
}

// Handle processes LINE webhook events
func (h *LINEWebhookHandler) Handle(request events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	fmt.Println("Received LINE webhook request")

	// Parse webhook request
	var webhookReq models.LINEWebhookRequest
	if err := json.Unmarshal([]byte(request.Body), &webhookReq); err != nil {
		fmt.Printf("Failed to parse webhook request: %v\n", err)
		return utils.BuildErrorResponse(400, "Invalid request body")
	}

	// Process each event
	for _, event := range webhookReq.Events {
		if event.Type != "message" || event.Message.Type != "text" {
			continue
		}

		userID := event.Source.UserID
		userMessage := event.Message.Text
		replyToken := event.ReplyToken

		fmt.Printf("Processing message from user %s: %s\n", userID, userMessage)

		// Get or create user profile
		if err := h.ensureUserExists(userID); err != nil {
			fmt.Printf("Failed to ensure user exists: %v\n", err)
			// Continue processing even if user creation fails
		}

		// Route message to appropriate handler
		var replyMessage string
		trimmedMessage := strings.TrimSpace(userMessage)

		switch {
		case trimmedMessage == "管理画面":
			// Check if user is admin and handle magic link generation
			replyMessage = h.adminHandler.HandleAdminRequest(userID)
		case trimmedMessage == "メニュー":
			// Return mini-app menu
			replyMessage = h.handleMenuCommand(userID)
		case strings.HasPrefix(trimmedMessage, "dev-deploy\n"), strings.HasPrefix(trimmedMessage, "dev\n"):
			// Handle dev task (only for authorized user)
			replyMessage = h.handleDevTask(userID, trimmedMessage)
		default:
			// Handle regular message with Claude AI
			replyMessage = h.handleClaudeMessage(userMessage)
		}

		// Send reply
		if err := h.lineService.SendReply(replyToken, replyMessage); err != nil {
			fmt.Printf("Failed to send reply: %v\n", err)
			return utils.BuildErrorResponse(500, "Failed to send reply")
		}

		fmt.Println("Reply sent successfully")
	}

	return utils.BuildOKResponse()
}

// ensureUserExists creates or updates user in database
func (h *LINEWebhookHandler) ensureUserExists(userID string) error {
	// Get user profile from LINE
	profile, err := h.lineService.GetUserProfile(userID)
	if err != nil {
		return fmt.Errorf("failed to get user profile: %w", err)
	}

	// Upsert user in database
	user := models.LINEUser{
		LineUserID:  userID,
		DisplayName: profile.DisplayName,
		PictureURL:  profile.PictureURL,
		FirstSeenAt: time.Now(),
		LastSeenAt:  time.Now(),
	}

	if err := h.supabaseService.UpsertUser(user); err != nil {
		return fmt.Errorf("failed to upsert user: %w", err)
	}

	return nil
}

// handleMenuCommand returns the mini-app URL
func (h *LINEWebhookHandler) handleMenuCommand(userID string) string {
	liffID := os.Getenv("MINI_APP_LIFF_ID")
	if liffID == "" {
		return "メニューは現在準備中です。"
	}

	liffURL := fmt.Sprintf("https://liff.line.me/%s", liffID)

	return fmt.Sprintf(`📱 SSG ONE メニュー

以下のリンクからアクセスしてください：
%s`, liffURL)
}

// handleClaudeMessage processes regular messages using Claude AI
func (h *LINEWebhookHandler) handleClaudeMessage(userMessage string) string {
	fmt.Printf("Calling Claude API for message: %s\n", userMessage)

	claudeResponse, err := h.claudeService.SendMessage(userMessage)
	if err != nil {
		fmt.Printf("Claude API error: %v\n", err)
		return "申し訳ございません。現在応答できません。しばらくしてからもう一度お試しください。"
	}

	return claudeResponse
}

// handleDevTask handles development task requests
func (h *LINEWebhookHandler) handleDevTask(userID, message string) string {
	// Check if user is authorized
	devUserID := os.Getenv("DEV_LINE_USER_ID")
	if devUserID == "" {
		fmt.Println("DEV_LINE_USER_ID not configured")
		return "この機能は現在利用できません。"
	}

	if userID != devUserID {
		fmt.Printf("Unauthorized dev task request from user: %s\n", userID)
		return "この機能を使用する権限がありません。"
	}

	// Determine if this is a deploy task (with git operations)
	allowGitOps := false
	var instruction string

	if strings.HasPrefix(message, "dev-deploy\n") {
		// dev-deploy: Allow git commit & push
		allowGitOps = true
		instruction = strings.TrimPrefix(message, "dev-deploy\n")
		instruction = strings.TrimSpace(instruction)
	} else {
		// dev: No git operations
		allowGitOps = false
		instruction = strings.TrimPrefix(message, "dev\n")
		instruction = strings.TrimSpace(instruction)
	}

	if instruction == "" {
		return "指示文が空です。dev\\n または dev-deploy\\n の後に指示を入力してください。"
	}

	// Create task in database
	task, err := h.supabaseService.CreateDevTask(userID, instruction, allowGitOps)
	if err != nil {
		fmt.Printf("Failed to create dev task: %v\n", err)
		return "タスクの登録に失敗しました。"
	}

	emoji := "⚙️"
	if allowGitOps {
		emoji = "🚀"
	}

	fmt.Printf("Dev task created: %s (allow_git_ops: %v)\n", task.ID, allowGitOps)
	return fmt.Sprintf("%s タスクを受け付けました", emoji)
}
