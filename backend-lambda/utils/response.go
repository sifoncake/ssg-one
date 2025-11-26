package utils

import (
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
)

// BuildAPIGatewayResponse creates a standardized API Gateway response
func BuildAPIGatewayResponse(statusCode int, body interface{}) events.APIGatewayV2HTTPResponse {
	bodyJSON, _ := json.Marshal(body)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: statusCode,
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
		Body: string(bodyJSON),
	}
}

// BuildSuccessResponse creates a success response
func BuildSuccessResponse(message string) events.APIGatewayV2HTTPResponse {
	return BuildAPIGatewayResponse(200, map[string]interface{}{
		"message": message,
	})
}

// BuildErrorResponse creates an error response
func BuildErrorResponse(statusCode int, errorMessage string) events.APIGatewayV2HTTPResponse {
	return BuildAPIGatewayResponse(statusCode, map[string]interface{}{
		"error": errorMessage,
	})
}

// BuildOKResponse creates a simple 200 OK response
func BuildOKResponse() events.APIGatewayV2HTTPResponse {
	return BuildAPIGatewayResponse(200, map[string]interface{}{
		"status": "ok",
	})
}
