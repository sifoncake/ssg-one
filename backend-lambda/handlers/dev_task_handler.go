package handlers

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ssg-one/backend-lambda/services"
	"github.com/ssg-one/backend-lambda/utils"

	"github.com/aws/aws-lambda-go/events"
)

type DevTaskHandler struct {
	lineService     *services.LINEService
	supabaseService *services.SupabaseService
}

func NewDevTaskHandler(
	lineService *services.LINEService,
	supabaseService *services.SupabaseService,
) *DevTaskHandler {
	return &DevTaskHandler{
		lineService:     lineService,
		supabaseService: supabaseService,
	}
}

// NotifyRequest represents a task completion notification request
type NotifyRequest struct {
	TaskID string `json:"task_id"`
	Status string `json:"status"`
	Result string `json:"result"`
}

// HandleNotify sends a push notification when a dev task completes
func (h *DevTaskHandler) HandleNotify(request events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	fmt.Println("Received dev task notification request")

	// Verify API key (simple auth)
	apiKey := request.Headers["x-api-key"]
	expectedKey := os.Getenv("DEV_TASK_API_KEY")
	if expectedKey != "" && apiKey != expectedKey {
		fmt.Println("Invalid API key")
		return utils.BuildErrorResponse(401, "Unauthorized")
	}

	// Parse request body
	var req NotifyRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		fmt.Printf("Failed to parse request: %v\n", err)
		return utils.BuildErrorResponse(400, "Invalid request body")
	}

	if req.TaskID == "" || req.Status == "" {
		return utils.BuildErrorResponse(400, "task_id and status are required")
	}

	// Get the dev user ID to send notification
	devUserID := os.Getenv("DEV_LINE_USER_ID")
	if devUserID == "" {
		fmt.Println("DEV_LINE_USER_ID not configured")
		return utils.BuildErrorResponse(500, "Notification recipient not configured")
	}

	// Build notification message
	var emoji string
	switch req.Status {
	case "done":
		emoji = "✅"
	case "failed":
		emoji = "❌"
	default:
		emoji = "ℹ️"
	}

	message := fmt.Sprintf("%s タスク完了\n\nステータス: %s", emoji, req.Status)
	if req.Result != "" {
		// Truncate result if too long for LINE message
		result := req.Result
		if len(result) > 1500 {
			result = result[:1500] + "...(省略)"
		}
		message += fmt.Sprintf("\n\n結果:\n%s", result)
	}

	// Send push notification
	if err := h.lineService.SendPush(devUserID, message); err != nil {
		fmt.Printf("Failed to send notification: %v\n", err)
		return utils.BuildErrorResponse(500, "Failed to send notification")
	}

	fmt.Printf("Notification sent for task %s\n", req.TaskID)

	return utils.BuildOKResponse()
}
