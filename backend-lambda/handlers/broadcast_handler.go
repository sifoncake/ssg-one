package handlers

import (
	"encoding/json"
	"fmt"

	"github.com/ssg-one/backend-lambda/services"
	"github.com/ssg-one/backend-lambda/utils"

	"github.com/aws/aws-lambda-go/events"
)

type BroadcastHandler struct {
	lineService *services.LINEService
}

func NewBroadcastHandler(lineService *services.LINEService) *BroadcastHandler {
	return &BroadcastHandler{
		lineService: lineService,
	}
}

type BroadcastRequest struct {
	Message string `json:"message"`
}

// Handle processes broadcast message requests
func (h *BroadcastHandler) Handle(request events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	fmt.Println("Received broadcast request")

	// Parse request body
	var req BroadcastRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		fmt.Printf("Failed to parse request: %v\n", err)
		return utils.BuildErrorResponse(400, "Invalid request body")
	}

	if req.Message == "" {
		return utils.BuildErrorResponse(400, "Message is required")
	}

	// Send broadcast message
	if err := h.lineService.SendBroadcast(req.Message); err != nil {
		fmt.Printf("Failed to send broadcast: %v\n", err)
		return utils.BuildErrorResponse(500, "Failed to send broadcast message")
	}

	fmt.Println("Broadcast sent successfully")
	return utils.BuildSuccessResponse("Broadcast message sent successfully")
}
