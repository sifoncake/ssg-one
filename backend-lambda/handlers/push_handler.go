package handlers

import (
	"encoding/json"
	"fmt"

	"github.com/ssg-one/backend-lambda/services"
	"github.com/ssg-one/backend-lambda/utils"

	"github.com/aws/aws-lambda-go/events"
)

type PushHandler struct {
	lineService *services.LINEService
}

func NewPushHandler(lineService *services.LINEService) *PushHandler {
	return &PushHandler{
		lineService: lineService,
	}
}

type PushRequest struct {
	UserID  string `json:"userId"`
	Message string `json:"message"`
}

// Handle processes push message requests
func (h *PushHandler) Handle(request events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	fmt.Println("Received push message request")

	// Parse request body
	var req PushRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		fmt.Printf("Failed to parse request: %v\n", err)
		return utils.BuildErrorResponse(400, "Invalid request body")
	}

	if req.UserID == "" {
		return utils.BuildErrorResponse(400, "UserID is required")
	}

	if req.Message == "" {
		return utils.BuildErrorResponse(400, "Message is required")
	}

	// Send push message
	if err := h.lineService.SendPush(req.UserID, req.Message); err != nil {
		fmt.Printf("Failed to send push message: %v\n", err)
		return utils.BuildErrorResponse(500, "Failed to send push message")
	}

	fmt.Printf("Push message sent to user %s\n", req.UserID)
	return utils.BuildSuccessResponse("Push message sent successfully")
}
