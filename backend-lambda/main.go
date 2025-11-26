package main

import (
	"fmt"
	"strings"

	"github.com/ssg-one/backend-lambda/handlers"
	"github.com/ssg-one/backend-lambda/services"
	"github.com/ssg-one/backend-lambda/utils"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

// Initialize services and handlers
var (
	lineService     *services.LINEService
	supabaseService *services.SupabaseService
	claudeService   *services.ClaudeService

	adminHandler    *handlers.AdminHandler
	authHandler     *handlers.AuthHandler
	broadcastHandler *handlers.BroadcastHandler
	pushHandler     *handlers.PushHandler
	webhookHandler  *handlers.LINEWebhookHandler
)

func init() {
	// Initialize services
	lineService = services.NewLINEService()
	supabaseService = services.NewSupabaseService()
	claudeService = services.NewClaudeService()

	// Initialize handlers
	adminHandler = handlers.NewAdminHandler(supabaseService)
	authHandler = handlers.NewAuthHandler(supabaseService)
	broadcastHandler = handlers.NewBroadcastHandler(lineService)
	pushHandler = handlers.NewPushHandler(lineService)
	webhookHandler = handlers.NewLINEWebhookHandler(
		lineService,
		supabaseService,
		claudeService,
		adminHandler,
	)
}

// Handler is the Lambda function entry point
func Handler(request events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	fmt.Printf("Request: %s %s\n", request.RequestContext.HTTP.Method, request.RawPath)

	// Handle CORS preflight
	if request.RequestContext.HTTP.Method == "OPTIONS" {
		return utils.BuildOKResponse(), nil
	}

	// Route request to appropriate handler
	// Strip leading "/" and stage prefix (e.g., "/prod", "/dev")
	path := strings.TrimPrefix(request.RawPath, "/")
	path = strings.TrimPrefix(path, "prod/")
	path = strings.TrimPrefix(path, "dev/")

	fmt.Printf("Routing to path: %s\n", path)

	switch path {
	case "line-webhook", "webhook":
		// LINE webhook endpoint
		return webhookHandler.Handle(request), nil

	case "send-line":
		// Broadcast message endpoint (legacy name)
		return broadcastHandler.Handle(request), nil

	case "broadcast":
		// Broadcast message endpoint
		return broadcastHandler.Handle(request), nil

	case "send-push":
		// Push message to specific user
		return pushHandler.Handle(request), nil

	case "verify-magic":
		// Verify magic link token
		return authHandler.HandleVerify(request), nil

	default:
		fmt.Printf("Unknown path: %s\n", path)
		return utils.BuildErrorResponse(404, "Not found"), nil
	}
}

func main() {
	lambda.Start(Handler)
}
