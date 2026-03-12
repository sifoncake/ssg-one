package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"math/big"
	"os"
	"time"

	"github.com/ssg-one/backend-lambda/models"
	"github.com/ssg-one/backend-lambda/services"
)

type AdminHandler struct {
	supabaseService *services.SupabaseService
}

func NewAdminHandler(supabaseService *services.SupabaseService) *AdminHandler {
	return &AdminHandler{
		supabaseService: supabaseService,
	}
}

// HandleAdminRequest checks if user is admin and generates magic link
func (h *AdminHandler) HandleAdminRequest(userID string) string {
	// Check if user is admin
	isAdmin, err := h.supabaseService.IsAdmin(userID)
	if err != nil {
		fmt.Printf("Failed to check admin status: %v\n", err)
		return "管理者権限の確認に失敗しました。"
	}

	if !isAdmin {
		return "このコマンドは管理者のみ使用できます。"
	}

	// Generate magic link token
	token, twoFactorCode, err := h.generateMagicLink(userID)
	if err != nil {
		fmt.Printf("Failed to generate magic link: %v\n", err)
		return "マジックリンクの生成に失敗しました。"
	}

	// LIFF URL for magic link (opens in LINE app with LIFF context)
	liffID := os.Getenv("LIFF_ID")
	if liffID == "" {
		fmt.Println("LIFF_ID is unset; cannot build magic link")
		return "マジックリンクの生成に失敗しました。（管理者向け: LIFF_ID を設定してください）"
	}

	// Create response message with LIFF URL
	replyMessage := fmt.Sprintf(`🔐 管理画面アクセス

このリンクからアクセスできます：
https://liff.line.me/%s?token=%s

⏰ 有効期限：10分
🔢 2段階認証コード：%s

✅ このLINEアプリからタップ → 自動ログイン
⚠️ 別のデバイスから開く → コード入力が必要`, liffID, token, twoFactorCode)

	return replyMessage
}

// generateMagicLink creates a new magic link token
func (h *AdminHandler) generateMagicLink(userID string) (string, string, error) {
	// Generate random token (32 bytes = 256 bits)
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", "", fmt.Errorf("failed to generate token: %w", err)
	}
	token := base64.URLEncoding.EncodeToString(tokenBytes)

	// Generate 6-digit two-factor code
	twoFactorCode, err := generateTwoFactorCode()
	if err != nil {
		return "", "", fmt.Errorf("failed to generate two-factor code: %w", err)
	}

	// Use LINE User ID as fingerprint
	fingerprint := userID
	fmt.Printf("Using LINE User ID as fingerprint: %s\n", fingerprint)

	// Create token in database
	adminToken := models.AdminToken{
		Token:         token,
		LineUserID:    userID,
		TwoFactorCode: twoFactorCode,
		Fingerprint:   fingerprint,
		ExpiresAt:     time.Now().Add(10 * time.Minute),
		Used:          false,
		CreatedAt:     time.Now(),
	}

	if err := h.supabaseService.CreateMagicLinkToken(adminToken); err != nil {
		return "", "", fmt.Errorf("failed to create token: %w", err)
	}

	fmt.Printf("Magic link created - Token: %s, 2FA Code: %s\n", token, twoFactorCode)

	return token, twoFactorCode, nil
}

// generateTwoFactorCode generates a 6-digit random code
func generateTwoFactorCode() (string, error) {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}
