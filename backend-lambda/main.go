package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	supa "github.com/supabase-community/supabase-go"
)

// Request represents the incoming request body for broadcast
type Request struct {
	Message string `json:"message"`
}

// PushRequest represents the incoming request body for push messages
type PushRequest struct {
	UserID  string `json:"userId"`
	Message string `json:"message"`
}

// VerifyMagicRequest represents the incoming request body for magic link verification
type VerifyMagicRequest struct {
	Token         string `json:"token"`
	TwoFactorCode string `json:"twoFactorCode,omitempty"`
	Fingerprint   string `json:"fingerprint"`
}

// Response represents the API response
type Response struct {
	Success bool   `json:"success,omitempty"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

// VerifyMagicResponse represents the magic link verification response
type VerifyMagicResponse struct {
	Success        bool   `json:"success"`
	LineUserID     string `json:"lineUserId,omitempty"`
	Email          string `json:"email,omitempty"`
	RequiresTwoFA  bool   `json:"requiresTwoFA,omitempty"`
	Error          string `json:"error,omitempty"`
}

// LINEMessage represents a LINE message
type LINEMessage struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// LINEBroadcastRequest represents the LINE API request body
type LINEBroadcastRequest struct {
	Messages []LINEMessage `json:"messages"`
}

// LINEPushRequest represents the LINE Push API request body
type LINEPushRequest struct {
	To       string        `json:"to"`
	Messages []LINEMessage `json:"messages"`
}

// LINEReplyRequest represents the LINE Reply API request body
type LINEReplyRequest struct {
	ReplyToken string        `json:"replyToken"`
	Messages   []LINEMessage `json:"messages"`
}

// LINEWebhookEvent represents a LINE webhook event
type LINEWebhookEvent struct {
	Type       string `json:"type"`
	ReplyToken string `json:"replyToken"`
	Source     struct {
		Type   string `json:"type"`
		UserID string `json:"userId"`
	} `json:"source"`
	Message struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"message"`
}

// LINEWebhookRequest represents the LINE webhook request body
type LINEWebhookRequest struct {
	Events []LINEWebhookEvent `json:"events"`
}

// LINEUser represents a LINE user in the database
type LINEUser struct {
	LineUserID  string    `json:"line_user_id"`
	DisplayName string    `json:"display_name,omitempty"`
	PictureURL  string    `json:"picture_url,omitempty"`
	FirstSeenAt time.Time `json:"first_seen_at,omitempty"`
	LastSeenAt  time.Time `json:"last_seen_at"`
}

// AdminToken represents a magic link token in the database
type AdminToken struct {
	Token         string    `json:"token"`
	LineUserID    string    `json:"line_user_id"`
	TwoFactorCode string    `json:"two_factor_code"`
	Fingerprint   string    `json:"fingerprint"`
	ExpiresAt     time.Time `json:"expires_at"`
	Used          bool      `json:"used"`
	CreatedAt     time.Time `json:"created_at"`
}

// getSupabaseClient initializes and returns a Supabase client
func getSupabaseClient() (*supa.Client, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return nil, fmt.Errorf("SUPABASE_URL and SUPABASE_KEY must be set")
	}

	client, err := supa.NewClient(supabaseURL, supabaseKey, &supa.ClientOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to create Supabase client: %w", err)
	}

	return client, nil
}

// upsertLINEUser saves or updates a LINE user in Supabase
func upsertLINEUser(lineUserID string) error {
	fmt.Printf("Upserting LINE user: %s\n", lineUserID)

	client, err := getSupabaseClient()
	if err != nil {
		return fmt.Errorf("failed to get Supabase client: %w", err)
	}

	now := time.Now()

	// Prepare user data
	user := map[string]interface{}{
		"line_user_id": lineUserID,
		"last_seen_at": now.Format(time.RFC3339),
	}

	// Upsert user (insert or update based on line_user_id)
	_, _, err = client.From("line_users").
		Upsert(user, "line_user_id", "", "").
		Execute()

	if err != nil {
		return fmt.Errorf("failed to upsert user: %w", err)
	}

	fmt.Printf("Successfully upserted user %s to Supabase\n", lineUserID)
	return nil
}

// isAdmin checks if a LINE user is an admin
func isAdmin(lineUserID string) (bool, error) {
	fmt.Printf("Checking if user %s is admin\n", lineUserID)

	client, err := getSupabaseClient()
	if err != nil {
		return false, fmt.Errorf("failed to get Supabase client: %w", err)
	}

	// Query admins table with count
	_, count, err := client.From("admins").
		Select("*", "exact", false).
		Eq("line_user_id", lineUserID).
		Execute()

	if err != nil {
		fmt.Printf("Error checking admin status: %v\n", err)
		return false, fmt.Errorf("failed to check admin status: %w", err)
	}

	isAdminUser := count > 0
	fmt.Printf("User %s admin status: %v (count: %d)\n", lineUserID, isAdminUser, count)
	return isAdminUser, nil
}

// getAdminEmail gets the email for an admin LINE user
func getAdminEmail(lineUserID string) (string, error) {
	fmt.Printf("Getting email for admin user %s\n", lineUserID)

	client, err := getSupabaseClient()
	if err != nil {
		return "", fmt.Errorf("failed to get Supabase client: %w", err)
	}

	// Query admins table for email
	data, _, err := client.From("admins").
		Select("email", "", false).
		Eq("line_user_id", lineUserID).
		Single().
		Execute()

	if err != nil {
		fmt.Printf("Error getting admin email: %v\n", err)
		return "", fmt.Errorf("failed to get admin email: %w", err)
	}

	// Parse the response data
	var adminData map[string]interface{}
	if err := json.Unmarshal(data, &adminData); err != nil {
		fmt.Printf("Failed to parse admin data: %v\n", err)
		return "", fmt.Errorf("invalid admin data")
	}

	email, ok := adminData["email"].(string)
	if !ok || email == "" {
		fmt.Println("Email not found in admin data")
		return "", fmt.Errorf("email not found for admin")
	}

	fmt.Printf("Found admin email: %s\n", email)
	return email, nil
}

// generateSecureToken generates a cryptographically secure random token
func generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

// generateTwoFactorCode generates a 6-digit two-factor code
func generateTwoFactorCode() (string, error) {
	// Generate a random number between 0 and 999999
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("failed to generate two-factor code: %w", err)
	}
	// Format as 6-digit string with leading zeros
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// createMagicLinkToken creates a magic link token and saves it to the database
func createMagicLinkToken(lineUserID, fingerprint string) (string, string, error) {
	fmt.Printf("Creating magic link token for user %s\n", lineUserID)

	// Generate token (32 bytes = 64 character hex string)
	token, err := generateSecureToken(32)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate token: %w", err)
	}

	// Generate two-factor code
	twoFactorCode, err := generateTwoFactorCode()
	if err != nil {
		return "", "", fmt.Errorf("failed to generate two-factor code: %w", err)
	}

	// Set expiry to 10 minutes from now
	expiresAt := time.Now().Add(10 * time.Minute)

	client, err := getSupabaseClient()
	if err != nil {
		return "", "", fmt.Errorf("failed to get Supabase client: %w", err)
	}

	// Prepare token data
	tokenData := map[string]interface{}{
		"token":           token,
		"line_user_id":    lineUserID,
		"two_factor_code": twoFactorCode,
		"fingerprint":     fingerprint,
		"expires_at":      expiresAt.Format(time.RFC3339),
		"used":            false,
	}

	// Insert token into database
	_, _, err = client.From("admin_tokens").
		Insert(tokenData, false, "", "", "").
		Execute()

	if err != nil {
		return "", "", fmt.Errorf("failed to insert token: %w", err)
	}

	fmt.Printf("Successfully created magic link token for user %s\n", lineUserID)
	return token, twoFactorCode, nil
}

// verifyMagicToken verifies a magic link token and optionally two-factor code
func verifyMagicToken(token, twoFactorCode, fingerprint string) (string, bool, error) {
	fmt.Printf("Verifying magic link token: %s\n", token)

	client, err := getSupabaseClient()
	if err != nil {
		return "", false, fmt.Errorf("failed to get Supabase client: %w", err)
	}

	// Fetch token from database
	data, _, err := client.From("admin_tokens").
		Select("*", "", false).
		Eq("token", token).
		Single().
		Execute()

	if err != nil {
		fmt.Printf("Token not found: %v\n", err)
		return "", false, fmt.Errorf("invalid token")
	}

	// Parse the response data
	var tokenData map[string]interface{}
	if err := json.Unmarshal(data, &tokenData); err != nil {
		fmt.Printf("Failed to parse token data: %v\n", err)
		return "", false, fmt.Errorf("invalid token data")
	}
	fmt.Printf("Token data: %+v\n", tokenData)

	// Check if token is already used
	if used, ok := tokenData["used"].(bool); ok && used {
		fmt.Println("Token already used")
		return "", false, fmt.Errorf("token already used")
	}

	// Check expiry
	expiresAtStr, ok := tokenData["expires_at"].(string)
	if !ok {
		fmt.Println("Invalid expires_at format")
		return "", false, fmt.Errorf("invalid token data")
	}

	expiresAt, err := time.Parse(time.RFC3339, expiresAtStr)
	if err != nil {
		fmt.Printf("Error parsing expiry time: %v\n", err)
		return "", false, fmt.Errorf("invalid expiry time")
	}

	if time.Now().After(expiresAt) {
		fmt.Println("Token expired")
		return "", false, fmt.Errorf("token expired")
	}

	// Get stored fingerprint and two-factor code
	storedFingerprint, _ := tokenData["fingerprint"].(string)
	storedTwoFactorCode, _ := tokenData["two_factor_code"].(string)
	lineUserID, _ := tokenData["line_user_id"].(string)

	// Check if this is the same device
	sameDevice := storedFingerprint != "" && storedFingerprint == fingerprint

	fmt.Printf("Same device: %v (stored: %s, current: %s)\n", sameDevice, storedFingerprint, fingerprint)

	// If not same device, require 2FA code
	requiresTwoFA := !sameDevice

	if requiresTwoFA {
		if twoFactorCode == "" {
			fmt.Println("Two-factor code required but not provided")
			return lineUserID, true, nil // Return requiresTwoFA=true
		}

		if twoFactorCode != storedTwoFactorCode {
			fmt.Println("Invalid two-factor code")
			return "", false, fmt.Errorf("invalid two-factor code")
		}

		fmt.Println("Two-factor code verified")
	}

	// Update token: mark as used and store fingerprint if not set
	updateData := map[string]interface{}{
		"used": true,
	}
	if storedFingerprint == "" {
		updateData["fingerprint"] = fingerprint
	}

	_, _, err = client.From("admin_tokens").
		Update(updateData, "", "").
		Eq("token", token).
		Execute()

	if err != nil {
		fmt.Printf("Warning: Failed to mark token as used: %v\n", err)
		// Don't fail the verification if we can't mark it as used
	}

	fmt.Printf("Token verified successfully for user: %s\n", lineUserID)
	return lineUserID, false, nil
}

// Handler is the Lambda handler function for API Gateway V2
// getCORSHeaders returns the standard CORS headers for all responses
func getCORSHeaders() map[string]string {
	return map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS, GET",
		"Access-Control-Allow-Headers": "Content-Type,x-line-signature",
		"Content-Type":                 "application/json",
	}
}

// createResponse creates a standardized API Gateway response with CORS headers
func createResponse(statusCode int, body string) events.APIGatewayV2HTTPResponse {
	return events.APIGatewayV2HTTPResponse{
		StatusCode: statusCode,
		Headers:    getCORSHeaders(),
		Body:       body,
	}
}

// createJSONResponse creates a JSON API Gateway response with CORS headers
func createJSONResponse(statusCode int, data interface{}) events.APIGatewayV2HTTPResponse {
	return createResponse(statusCode, toJSON(data))
}

func Handler(request events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	fmt.Printf("=== Lambda Handler Called ===\n")
	fmt.Printf("Method: %s\n", request.RequestContext.HTTP.Method)
	fmt.Printf("RawPath: %s\n", request.RawPath)
	fmt.Printf("RequestContext.HTTP.Path: %s\n", request.RequestContext.HTTP.Path)
	fmt.Printf("RouteKey: %s\n", request.RequestContext.RouteKey)
	fmt.Printf("Body length: %d\n", len(request.Body))
	fmt.Printf("Body preview: %.100s\n", request.Body)
	fmt.Printf("===========================\n")

	// Get CORS headers
	headers := getCORSHeaders()

	// Handle OPTIONS preflight
	if request.RequestContext.HTTP.Method == "OPTIONS" {
		fmt.Println("Handling OPTIONS preflight request")
		return createResponse(200, ""), nil
	}

	// Only allow POST
	if request.RequestContext.HTTP.Method != "POST" {
		fmt.Printf("Method not allowed: %s\n", request.RequestContext.HTTP.Method)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 405,
			Headers:    headers,
			Body:       toJSON(Response{Error: "Method not allowed"}),
		}, nil
	}

	// Get the path to route on
	path := request.RawPath
	if path == "" {
		path = request.RequestContext.HTTP.Path
	}
	fmt.Printf("Routing on path: %s\n", path)

	// Route based on path - check if path contains the endpoint
	if path == "/line-webhook" || request.RequestContext.RouteKey == "POST /line-webhook" {
		fmt.Println("✓ Routing to LINE webhook handler")
		return handleLINEWebhook(request, headers)
	}

	if path == "/send-line" || request.RequestContext.RouteKey == "POST /send-line" {
		fmt.Println("✓ Routing to send-line handler")
		return handleSendLine(request, headers)
	}

	if path == "/send-push" || request.RequestContext.RouteKey == "POST /send-push" {
		fmt.Println("✓ Routing to send-push handler")
		return handleSendPush(request, headers)
	}

	if path == "/verify-magic" || request.RequestContext.RouteKey == "POST /verify-magic" {
		fmt.Println("✓ Routing to verify-magic handler")
		return handleVerifyMagic(request, headers)
	}

	// Check if body looks like a LINE webhook (has "events" field)
	if len(request.Body) > 0 {
		var webhookCheck map[string]interface{}
		if err := json.Unmarshal([]byte(request.Body), &webhookCheck); err == nil {
			if _, hasEvents := webhookCheck["events"]; hasEvents {
				fmt.Println("✓ Body contains 'events' field - routing to LINE webhook handler")
				return handleLINEWebhook(request, headers)
			}
			if _, hasUserID := webhookCheck["userId"]; hasUserID {
				fmt.Println("✓ Body contains 'userId' field - routing to send-push handler")
				return handleSendPush(request, headers)
			}
			if _, hasMessage := webhookCheck["message"]; hasMessage {
				fmt.Println("✓ Body contains 'message' field - routing to send-line handler")
				return handleSendLine(request, headers)
			}
		}
	}

	// Default to send-line endpoint
	fmt.Println("✓ Default routing to send-line handler")
	return handleSendLine(request, headers)
}

// handleVerifyMagic handles the /verify-magic endpoint for verifying magic link tokens
func handleVerifyMagic(request events.APIGatewayV2HTTPRequest, headers map[string]string) (events.APIGatewayV2HTTPResponse, error) {
	fmt.Println("=== Verify Magic Handler ===")

	// Parse request body
	var req VerifyMagicRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		fmt.Printf("Failed to parse request body: %v\n", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(VerifyMagicResponse{Success: false, Error: "Invalid request body"}),
		}, nil
	}

	// Validate token
	if req.Token == "" {
		fmt.Println("Token is empty")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(VerifyMagicResponse{Success: false, Error: "Token is required"}),
		}, nil
	}

	// Validate fingerprint
	if req.Fingerprint == "" {
		fmt.Println("Fingerprint is empty")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(VerifyMagicResponse{Success: false, Error: "Fingerprint is required"}),
		}, nil
	}

	fmt.Printf("Token: %s\n", req.Token)
	fmt.Printf("Two-factor code: %s\n", req.TwoFactorCode)
	fmt.Printf("Fingerprint: %s\n", req.Fingerprint)

	// Verify the magic token
	lineUserID, requiresTwoFA, err := verifyMagicToken(req.Token, req.TwoFactorCode, req.Fingerprint)
	if err != nil {
		fmt.Printf("Token verification failed: %v\n", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(VerifyMagicResponse{Success: false, Error: err.Error()}),
		}, nil
	}

	// If requires 2FA but not provided yet, return requiresTwoFA flag
	if requiresTwoFA {
		fmt.Println("Two-factor authentication required")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 200,
			Headers:    headers,
			Body:       toJSON(VerifyMagicResponse{Success: false, RequiresTwoFA: true}),
		}, nil
	}

	// Get admin email
	email, err := getAdminEmail(lineUserID)
	if err != nil {
		fmt.Printf("Failed to get admin email: %v\n", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       toJSON(VerifyMagicResponse{Success: false, Error: "Failed to get admin email"}),
		}, nil
	}

	// Token verified successfully
	fmt.Printf("Magic link verified successfully for user: %s (email: %s)\n", lineUserID, email)
	return events.APIGatewayV2HTTPResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       toJSON(VerifyMagicResponse{Success: true, LineUserID: lineUserID, Email: email}),
	}, nil
}

// handleSendLine handles the /send-line endpoint for broadcasting messages
func handleSendLine(request events.APIGatewayV2HTTPRequest, headers map[string]string) (events.APIGatewayV2HTTPResponse, error) {

	// Parse request body
	var req Request
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		fmt.Printf("Failed to parse request body: %v\n", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(Response{Error: "Invalid request body"}),
		}, nil
	}

	// Validate message
	if req.Message == "" {
		fmt.Println("Message is empty")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(Response{Error: "Message is required"}),
		}, nil
	}

	fmt.Printf("Message to send: %s\n", req.Message)

	// Get LINE credentials
	channelAccessToken := os.Getenv("LINE_CHANNEL_ACCESS_TOKEN")
	if channelAccessToken == "" {
		fmt.Println("LINE_CHANNEL_ACCESS_TOKEN not configured")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       toJSON(Response{Error: "LINE credentials not configured"}),
		}, nil
	}

	fmt.Printf("LINE token configured (length: %d)\n", len(channelAccessToken))

	// Send to LINE
	if err := sendLINEBroadcast(req.Message, channelAccessToken); err != nil {
		fmt.Printf("Failed to send LINE message: %v\n", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       toJSON(Response{Error: fmt.Sprintf("Failed to send message to LINE: %v", err)}),
		}, nil
	}

	fmt.Println("Message sent successfully to LINE")

	// Success response
	return events.APIGatewayV2HTTPResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       toJSON(Response{Success: true, Message: "Message sent successfully"}),
	}, nil
}

// handleSendPush handles the /send-push endpoint for sending messages to specific users
func handleSendPush(request events.APIGatewayV2HTTPRequest, headers map[string]string) (events.APIGatewayV2HTTPResponse, error) {
	fmt.Println("=== Send Push Handler ===")

	// Parse request body
	var req PushRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		fmt.Printf("Failed to parse request body: %v\n", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(Response{Error: "Invalid request body"}),
		}, nil
	}

	// Validate userId
	if req.UserID == "" {
		fmt.Println("userId is empty")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(Response{Error: "userId is required"}),
		}, nil
	}

	// Validate message
	if req.Message == "" {
		fmt.Println("Message is empty")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(Response{Error: "Message is required"}),
		}, nil
	}

	fmt.Printf("userId: %s\n", req.UserID)
	fmt.Printf("Message to send: %s\n", req.Message)

	// Get LINE credentials
	channelAccessToken := os.Getenv("LINE_CHANNEL_ACCESS_TOKEN")
	if channelAccessToken == "" {
		fmt.Println("LINE_CHANNEL_ACCESS_TOKEN not configured")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       toJSON(Response{Error: "LINE credentials not configured"}),
		}, nil
	}

	fmt.Printf("LINE token configured (length: %d)\n", len(channelAccessToken))

	// Send push message to LINE
	if err := sendLINEPush(req.UserID, req.Message, channelAccessToken); err != nil {
		fmt.Printf("Failed to send push message: %v\n", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       toJSON(Response{Error: fmt.Sprintf("Failed to send message to LINE: %v", err)}),
		}, nil
	}

	fmt.Println("Push message sent successfully to LINE")

	// Success response
	return events.APIGatewayV2HTTPResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       toJSON(Response{Success: true, Message: "Push message sent successfully"}),
	}, nil
}

// handleLINEWebhook handles the /line-webhook endpoint for receiving messages from LINE
func handleLINEWebhook(request events.APIGatewayV2HTTPRequest, headers map[string]string) (events.APIGatewayV2HTTPResponse, error) {
	fmt.Println("=== LINE Webhook Handler ===")

	// Get LINE credentials
	channelSecret := os.Getenv("LINE_CHANNEL_SECRET")
	channelAccessToken := os.Getenv("LINE_CHANNEL_ACCESS_TOKEN")

	if channelSecret == "" || channelAccessToken == "" {
		fmt.Println("LINE credentials not configured")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       toJSON(Response{Error: "LINE credentials not configured"}),
		}, nil
	}

	// Verify signature
	signature := request.Headers["x-line-signature"]
	if signature == "" {
		fmt.Println("Missing x-line-signature header")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(Response{Error: "Missing signature"}),
		}, nil
	}

	if !verifySignature(channelSecret, request.Body, signature) {
		fmt.Println("Invalid signature")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 403,
			Headers:    headers,
			Body:       toJSON(Response{Error: "Invalid signature"}),
		}, nil
	}

	fmt.Println("Signature verified successfully")

	// Parse webhook request
	var webhookReq LINEWebhookRequest
	if err := json.Unmarshal([]byte(request.Body), &webhookReq); err != nil {
		fmt.Printf("Failed to parse webhook body: %v\n", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       toJSON(Response{Error: "Invalid webhook body"}),
		}, nil
	}

	fmt.Printf("Received %d events\n", len(webhookReq.Events))

	// Handle connection test (empty events array)
	if len(webhookReq.Events) == 0 {
		fmt.Println("Connection test - no events to process")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 200,
			Headers:    headers,
			Body:       "OK",
		}, nil
	}

	// Process each event
	for i, event := range webhookReq.Events {
		fmt.Printf("Event %d: type=%s\n", i, event.Type)
		fmt.Printf("User ID: %s\n", event.Source.UserID)
		fmt.Printf("Source type: %s\n", event.Source.Type)

		// Only handle message events
		if event.Type != "message" {
			fmt.Printf("Skipping non-message event: %s\n", event.Type)
			continue
		}

		// Only handle text messages
		if event.Message.Type != "text" {
			fmt.Printf("Skipping non-text message: %s\n", event.Message.Type)
			continue
		}

		userMessage := event.Message.Text
		replyToken := event.ReplyToken
		userID := event.Source.UserID

		fmt.Printf("Received message: %s\n", userMessage)
		fmt.Printf("Reply token: %s\n", replyToken)
		fmt.Printf("From user: %s\n", userID)

		// Save/update user in Supabase
		if err := upsertLINEUser(userID); err != nil {
			fmt.Printf("Warning: Failed to upsert user to Supabase: %v\n", err)
			// Don't fail the request if Supabase fails, just log it
		}

		// Check if message is "管理画面" command
		if userMessage == "管理画面" {
			fmt.Println("Processing 管理画面 command")

			// Check if user is admin
			isAdminUser, err := isAdmin(userID)
			if err != nil {
				fmt.Printf("Error checking admin status: %v\n", err)
				replyMessage := "エラーが発生しました。しばらくしてからもう一度お試しください。"
				if err := sendLINEReply(replyToken, replyMessage, channelAccessToken); err != nil {
					fmt.Printf("Failed to send error reply: %v\n", err)
				}
				continue
			}

			if !isAdminUser {
				fmt.Printf("User %s is not an admin\n", userID)
				replyMessage := "権限がありません"
				if err := sendLINEReply(replyToken, replyMessage, channelAccessToken); err != nil {
					fmt.Printf("Failed to send unauthorized reply: %v\n", err)
				}
				continue
			}

			// User is admin - generate magic link
			fmt.Printf("User %s is an admin - generating magic link\n", userID)
			// Empty fingerprint for LINE-initiated links (fingerprint will be captured on first access)
			token, twoFactorCode, err := createMagicLinkToken(userID, "")
			if err != nil {
				fmt.Printf("Error creating magic link token: %v\n", err)
				replyMessage := "マジックリンクの生成に失敗しました。"
				if err := sendLINEReply(replyToken, replyMessage, channelAccessToken); err != nil {
					fmt.Printf("Failed to send error reply: %v\n", err)
				}
				continue
			}

			// Get the base URL from environment or use production Vercel URL
			baseURL := os.Getenv("NEXT_PUBLIC_URL")
			if baseURL == "" {
				baseURL = "https://ssg-one-seven.vercel.app"
			}

			// Create reply message with magic link
			replyMessage := fmt.Sprintf(`🔐 管理画面アクセス

このリンクからアクセスできます：
%s/auth/magic?token=%s

⏰ 有効期限：10分
🔢 2段階認証コード：%s

※別のデバイスからアクセスする場合は
　上記コードの入力が必要です`, baseURL, token, twoFactorCode)

			// Send reply
			if err := sendLINEReply(replyToken, replyMessage, channelAccessToken); err != nil {
				fmt.Printf("Failed to send magic link reply: %v\n", err)
				continue
			}

			fmt.Println("Magic link sent successfully")
			continue
		}

		// Default reply for regular messages
		replyMessage := fmt.Sprintf("受け取りました: %s", userMessage)

		// Send reply
		if err := sendLINEReply(replyToken, replyMessage, channelAccessToken); err != nil {
			fmt.Printf("Failed to send reply: %v\n", err)
			// Continue processing other events even if one fails
			continue
		}

		fmt.Println("Reply sent successfully")
	}

	// Return 200 OK to LINE
	return events.APIGatewayV2HTTPResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       "OK",
	}, nil
}

// verifySignature verifies the LINE webhook signature
func verifySignature(channelSecret, body, signature string) bool {
	mac := hmac.New(sha256.New, []byte(channelSecret))
	mac.Write([]byte(body))
	expectedSignature := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// sendLINEReply sends a reply message to LINE Messaging API
func sendLINEReply(replyToken, message, accessToken string) error {
	fmt.Printf("Sending LINE reply: %s\n", message)

	// Prepare LINE Reply API request
	replyReq := LINEReplyRequest{
		ReplyToken: replyToken,
		Messages: []LINEMessage{
			{
				Type: "text",
				Text: message,
			},
		},
	}

	// Marshal request to JSON
	jsonData, err := json.Marshal(replyReq)
	if err != nil {
		return fmt.Errorf("failed to marshal reply request: %w", err)
	}

	fmt.Printf("Reply request JSON: %s\n", string(jsonData))

	// Create HTTP request
	req, err := http.NewRequest("POST", "https://api.line.me/v2/bot/message/reply", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create reply request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send reply request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body for debugging
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("LINE Reply API response status: %d\n", resp.StatusCode)
	fmt.Printf("LINE Reply API response body: %s\n", string(body))

	// Check response status
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("LINE Reply API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// sendLINEPush sends a push message to a specific user via LINE Messaging API
func sendLINEPush(userID, message, accessToken string) error {
	fmt.Printf("Sending LINE push to user: %s\n", userID)

	// Prepare LINE Push API request
	pushReq := LINEPushRequest{
		To: userID,
		Messages: []LINEMessage{
			{
				Type: "text",
				Text: message,
			},
		},
	}

	// Marshal request to JSON
	jsonData, err := json.Marshal(pushReq)
	if err != nil {
		return fmt.Errorf("failed to marshal push request: %w", err)
	}

	fmt.Printf("Push request JSON: %s\n", string(jsonData))

	// Create HTTP request
	req, err := http.NewRequest("POST", "https://api.line.me/v2/bot/message/push", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create push request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send push request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body for debugging
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("LINE Push API response status: %d\n", resp.StatusCode)
	fmt.Printf("LINE Push API response body: %s\n", string(body))

	// Check response status
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("LINE Push API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// sendLINEBroadcast sends a broadcast message to LINE Messaging API
func sendLINEBroadcast(message, accessToken string) error {
	// Prepare LINE API request
	lineReq := LINEBroadcastRequest{
		Messages: []LINEMessage{
			{
				Type: "text",
				Text: message,
			},
		},
	}

	// Marshal request to JSON
	jsonData, err := json.Marshal(lineReq)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", "https://api.line.me/v2/bot/message/broadcast", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("LINE API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// toJSON converts a struct to JSON string
func toJSON(v interface{}) string {
	data, _ := json.Marshal(v)
	return string(data)
}

func main() {
	lambda.Start(Handler)
}
