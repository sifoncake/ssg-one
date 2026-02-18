package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/ssg-one/backend-lambda/models"
)

type LINEService struct {
	channelAccessToken string
	httpClient         *http.Client
}

type LINEUserProfile struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	PictureURL  string `json:"pictureUrl"`
	StatusMessage string `json:"statusMessage"`
}

func NewLINEService() *LINEService {
	return &LINEService{
		channelAccessToken: os.Getenv("LINE_CHANNEL_ACCESS_TOKEN"),
		httpClient:         &http.Client{Timeout: 10 * time.Second},
	}
}

// SendReply sends a reply message to LINE
func (l *LINEService) SendReply(replyToken string, message string) error {
	url := "https://api.line.me/v2/bot/message/reply"

	replyReq := models.LINEReplyRequest{
		ReplyToken: replyToken,
		Messages: []models.LINEReplyMessage{
			{
				Type: "text",
				Text: message,
			},
		},
	}

	reqBody, err := json.Marshal(replyReq)
	if err != nil {
		return fmt.Errorf("failed to marshal reply request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", l.channelAccessToken))

	resp, err := l.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send reply: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("LINE API returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// SendPush sends a push message to a specific user
func (l *LINEService) SendPush(userID string, message string) error {
	url := "https://api.line.me/v2/bot/message/push"

	pushReq := models.LINEPushRequest{
		To: userID,
		Messages: []models.LINEReplyMessage{
			{
				Type: "text",
				Text: message,
			},
		},
	}

	reqBody, err := json.Marshal(pushReq)
	if err != nil {
		return fmt.Errorf("failed to marshal push request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", l.channelAccessToken))

	resp, err := l.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send push message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("LINE API returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// SendBroadcast sends a broadcast message to all users
func (l *LINEService) SendBroadcast(message string) error {
	url := "https://api.line.me/v2/bot/message/broadcast"

	broadcastReq := models.LINEBroadcastRequest{
		Messages: []models.LINEReplyMessage{
			{
				Type: "text",
				Text: message,
			},
		},
	}

	reqBody, err := json.Marshal(broadcastReq)
	if err != nil {
		return fmt.Errorf("failed to marshal broadcast request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", l.channelAccessToken))

	resp, err := l.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send broadcast: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("LINE API returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// GetUserProfile retrieves a user's profile from LINE
func (l *LINEService) GetUserProfile(userID string) (*LINEUserProfile, error) {
	url := fmt.Sprintf("https://api.line.me/v2/bot/profile/%s", userID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", l.channelAccessToken))

	resp, err := l.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user profile: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("LINE API returned status %d: %s", resp.StatusCode, string(body))
	}

	var profile LINEUserProfile
	if err := json.Unmarshal(body, &profile); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &profile, nil
}

type lineIDTokenVerifyResponse struct {
	Iss string `json:"iss"`
	Sub string `json:"sub"`
	Aud string `json:"aud"`
	Exp int64  `json:"exp"`
	Iat int64  `json:"iat"`
}

// VerifyIDToken verifies a LINE Login / LIFF ID token and returns the subject (LINE user id).
//
// It calls LINE's "Verify ID token" endpoint. The client id must match the channel used for LIFF.
// Required env:
// - LINE_LOGIN_CHANNEL_ID (recommended) or LINE_CHANNEL_ID (fallback)
func (l *LINEService) VerifyIDToken(idToken string) (string, error) {
	clientID := os.Getenv("LINE_LOGIN_CHANNEL_ID")
	if clientID == "" {
		clientID = os.Getenv("LINE_CHANNEL_ID")
	}
	if clientID == "" {
		return "", fmt.Errorf("LINE_LOGIN_CHANNEL_ID (or LINE_CHANNEL_ID) is not configured")
	}

	form := url.Values{}
	form.Set("id_token", idToken)
	form.Set("client_id", clientID)

	req, err := http.NewRequest("POST", "https://api.line.me/oauth2/v2.1/verify", bytes.NewBufferString(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to create verify request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := l.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to verify id token: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("LINE verify returned status %d: %s", resp.StatusCode, string(body))
	}

	var parsed lineIDTokenVerifyResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("failed to parse verify response: %w", err)
	}

	if parsed.Sub == "" {
		return "", fmt.Errorf("verify response missing sub: %s", string(body))
	}

	return parsed.Sub, nil
}
