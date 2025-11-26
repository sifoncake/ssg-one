package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type ClaudeService struct {
	apiKey     string
	httpClient *http.Client
}

type ClaudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ClaudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	System    string          `json:"system,omitempty"`
	Messages  []ClaudeMessage `json:"messages"`
}

type ClaudeContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type ClaudeResponse struct {
	ID      string          `json:"id"`
	Type    string          `json:"type"`
	Role    string          `json:"role"`
	Content []ClaudeContent `json:"content"`
	Model   string          `json:"model"`
	Usage   struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

func NewClaudeService() *ClaudeService {
	return &ClaudeService{
		apiKey:     os.Getenv("ANTHROPIC_API_KEY"),
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// SendMessage sends a message to Claude API and returns the response
func (c *ClaudeService) SendMessage(userMessage string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("ANTHROPIC_API_KEY not configured")
	}

	claudeReq := ClaudeRequest{
		Model:     "claude-sonnet-4-20250514",
		MaxTokens: 1024,
		System:    "あなたは親切なアシスタントです。日本語で簡潔に回答してください。",
		Messages: []ClaudeMessage{
			{
				Role:    "user",
				Content: userMessage,
			},
		},
	}

	reqBody, err := json.Marshal(claudeReq)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call Claude API: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Claude API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var claudeResp ClaudeResponse
	if err := json.Unmarshal(respBody, &claudeResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if len(claudeResp.Content) == 0 {
		return "", fmt.Errorf("no content in response")
	}

	fmt.Printf("Claude API usage - Input tokens: %d, Output tokens: %d\n",
		claudeResp.Usage.InputTokens, claudeResp.Usage.OutputTokens)

	return claudeResp.Content[0].Text, nil
}
