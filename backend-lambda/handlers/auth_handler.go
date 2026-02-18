package handlers

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/ssg-one/backend-lambda/services"
	"github.com/ssg-one/backend-lambda/utils"

	"github.com/aws/aws-lambda-go/events"
)

type AuthHandler struct {
	supabaseService *services.SupabaseService
	lineService     *services.LINEService
}

func NewAuthHandler(supabaseService *services.SupabaseService, lineService *services.LINEService) *AuthHandler {
	return &AuthHandler{
		supabaseService: supabaseService,
		lineService:     lineService,
	}
}

type VerifyTokenRequest struct {
	Token         string `json:"token"`
	TwoFactorCode string `json:"twoFactorCode,omitempty"`
	Fingerprint   string `json:"fingerprint,omitempty"`
	LineIDToken   string `json:"lineIdToken,omitempty"`
}

type VerifyTokenResponse struct {
	Success           bool   `json:"success"`
	RequiresTwoFactor bool   `json:"requiresTwoFactor"`
	LineUserId        string `json:"lineUserId,omitempty"`
	Email             string `json:"email,omitempty"`
	Error             string `json:"error,omitempty"`
}

// HandleVerify processes magic link token verification
func (h *AuthHandler) HandleVerify(request events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	fmt.Println("Received token verification request")

	// Parse request body
	var req VerifyTokenRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		fmt.Printf("Failed to parse request: %v\n", err)
		return utils.BuildErrorResponse(400, "Invalid request body")
	}

	if req.Token == "" {
		return utils.BuildErrorResponse(400, "Token is required")
	}

	// Get token from database
	storedToken, err := h.supabaseService.GetMagicLinkToken(req.Token)
	if err != nil {
		fmt.Printf("Token not found: %v\n", err)
		return utils.BuildAPIGatewayResponse(200, VerifyTokenResponse{
			Success: false,
			Error:   "無効なトークンです",
		})
	}

	// Check if token is expired
	if time.Now().After(storedToken.ExpiresAt) {
		fmt.Println("Token expired")
		return utils.BuildAPIGatewayResponse(200, VerifyTokenResponse{
			Success: false,
			Error:   "トークンの有効期限が切れています",
		})
	}

	// Check if token is already used
	if storedToken.Used {
		fmt.Println("Token already used")
		return utils.BuildAPIGatewayResponse(200, VerifyTokenResponse{
			Success: false,
			Error:   "このトークンは既に使用されています",
		})
	}

	// LINE in-app browser shortcut:
	// If the client provides a LIFF ID token and it verifies to the same LINE user as the token owner,
	// we can safely skip 2FA (smartphone LINE in-app).
	lineInAppVerified := false
	if req.LineIDToken != "" && h.lineService != nil {
		sub, err := h.lineService.VerifyIDToken(req.LineIDToken)
		if err != nil {
			fmt.Printf("LINE ID token verify failed (fallback to 2FA): %v\n", err)
		} else if sub == storedToken.LineUserID {
			lineInAppVerified = true
			fmt.Println("LINE ID token verified for the same user, skipping 2FA")
		} else {
			fmt.Printf("LINE ID token sub mismatch (fallback to 2FA): sub=%s expected=%s\n", sub, storedToken.LineUserID)
		}
	}

	if lineInAppVerified {

		// Get admin email
		email, err := h.supabaseService.GetAdminEmail(storedToken.LineUserID)
		if err != nil {
			fmt.Printf("Failed to get admin email: %v\n", err)
			return utils.BuildErrorResponse(500, "Failed to get admin email")
		}

		// Mark token as used
		if err := h.supabaseService.MarkTokenAsUsed(req.Token); err != nil {
			fmt.Printf("Failed to mark token as used: %v\n", err)
			return utils.BuildErrorResponse(500, "Failed to process token")
		}

		response := VerifyTokenResponse{
			Success:           true,
			RequiresTwoFactor: false,
			LineUserId:        storedToken.LineUserID,
			Email:             email,
		}

		fmt.Printf("Preparing success response: success=%v, requiresTwoFactor=%v, lineUserId=%s, email=%s\n",
			response.Success, response.RequiresTwoFactor, response.LineUserId, response.Email)

		result := utils.BuildAPIGatewayResponse(200, response)
		fmt.Printf("Response body: %s\n", result.Body)
		fmt.Printf("Response status code: %d\n", result.StatusCode)

		return result
	}

	// Not verified as LINE in-app (likely PC or normal browser): require 2FA
	if req.TwoFactorCode == "" {
		fmt.Println("Requiring 2FA")
		return utils.BuildAPIGatewayResponse(200, VerifyTokenResponse{
			Success:           false,
			RequiresTwoFactor: true,
			Error:             "2段階認証コードを入力してください",
		})
	}

	// Verify 2FA code
	if req.TwoFactorCode != storedToken.TwoFactorCode {
		fmt.Println("Invalid 2FA code")
		return utils.BuildAPIGatewayResponse(200, VerifyTokenResponse{
			Success:           false,
			RequiresTwoFactor: true,
			Error:             "認証コードが正しくありません",
		})
	}

	fmt.Println("2FA code verified successfully")

	// Get admin email
	email, err := h.supabaseService.GetAdminEmail(storedToken.LineUserID)
	if err != nil {
		fmt.Printf("Failed to get admin email: %v\n", err)
		return utils.BuildErrorResponse(500, "Failed to get admin email")
	}

	// Mark token as used
	if err := h.supabaseService.MarkTokenAsUsed(req.Token); err != nil {
		fmt.Printf("Failed to mark token as used: %v\n", err)
		return utils.BuildErrorResponse(500, "Failed to process token")
	}

	fmt.Printf("Returning success response for LINE User ID: %s, email: %s\n", storedToken.LineUserID, email)
	return utils.BuildAPIGatewayResponse(200, VerifyTokenResponse{
		Success:           true,
		RequiresTwoFactor: false,
		LineUserId:        storedToken.LineUserID,
		Email:             email,
	})
}
