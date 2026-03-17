package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/ssg-one/backend-lambda/models"
)

type SupabaseService struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewSupabaseService() *SupabaseService {
	// Try SUPABASE_KEY first (Lambda env var), fallback to SUPABASE_SERVICE_ROLE_KEY
	apiKey := os.Getenv("SUPABASE_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	}

	service := &SupabaseService{
		baseURL:    os.Getenv("SUPABASE_URL"),
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}

	// Log initialization for debugging (don't log the full key)
	fmt.Printf("Supabase initialized - URL: %s, API Key present: %v\n",
		service.baseURL, service.apiKey != "")

	return service
}

// UpsertUser creates or updates a LINE user in the database
func (s *SupabaseService) UpsertUser(user models.LINEUser) error {
	url := fmt.Sprintf("%s/rest/v1/line_users", s.baseURL)

	reqBody, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "resolution=merge-duplicates")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to upsert user: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// GetUserProfile retrieves a LINE user's profile
func (s *SupabaseService) GetUserProfile(lineUserID string) (*models.LINEUser, error) {
	url := fmt.Sprintf("%s/rest/v1/line_users?line_user_id=eq.%s&select=*", s.baseURL, lineUserID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user profile: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("supabase returned status %d: %s", resp.StatusCode, string(body))
	}

	var users []models.LINEUser
	if err := json.Unmarshal(body, &users); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(users) == 0 {
		return nil, fmt.Errorf("user not found")
	}

	return &users[0], nil
}

// Admin represents an admin user
type Admin struct {
	LineUserID string `json:"line_user_id"`
	Email      string `json:"email"`
}

// IsAdmin checks if a LINE user is an admin
func (s *SupabaseService) IsAdmin(lineUserID string) (bool, error) {
	url := fmt.Sprintf("%s/rest/v1/admins?line_user_id=eq.%s&select=*", s.baseURL, lineUserID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("failed to check admin status: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("supabase returned status %d: %s", resp.StatusCode, string(body))
	}

	var admins []map[string]interface{}
	if err := json.Unmarshal(body, &admins); err != nil {
		return false, fmt.Errorf("failed to parse response: %w", err)
	}

	return len(admins) > 0, nil
}

// GetAdminEmail retrieves the email for a LINE admin user
func (s *SupabaseService) GetAdminEmail(lineUserID string) (string, error) {
	url := fmt.Sprintf("%s/rest/v1/admins?line_user_id=eq.%s&select=email", s.baseURL, lineUserID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to get admin email: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("supabase returned status %d: %s", resp.StatusCode, string(body))
	}

	var admins []Admin
	if err := json.Unmarshal(body, &admins); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if len(admins) == 0 {
		return "", fmt.Errorf("admin not found")
	}

	return admins[0].Email, nil
}

// CreateMagicLinkToken creates a new magic link token in the database
func (s *SupabaseService) CreateMagicLinkToken(token models.AdminToken) error {
	url := fmt.Sprintf("%s/rest/v1/admin_tokens", s.baseURL)

	reqBody, err := json.Marshal(token)
	if err != nil {
		return fmt.Errorf("failed to marshal token: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to create token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// GetMagicLinkToken retrieves a magic link token from the database
func (s *SupabaseService) GetMagicLinkToken(token string) (*models.AdminToken, error) {
	url := fmt.Sprintf("%s/rest/v1/admin_tokens?token=eq.%s&select=*", s.baseURL, token)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get token: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("supabase returned status %d: %s", resp.StatusCode, string(body))
	}

	var tokens []models.AdminToken
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(tokens) == 0 {
		return nil, fmt.Errorf("token not found")
	}

	return &tokens[0], nil
}

// DevTask represents a development task
type DevTask struct {
	ID                 string    `json:"id,omitempty"`
	UserID             string    `json:"user_id"`
	Instruction        string    `json:"instruction"`
	Status             string    `json:"status"`
	Result             *string   `json:"result,omitempty"`
	AllowGitOperations bool      `json:"allow_git_operations"`
	CreatedAt          time.Time `json:"created_at,omitempty"`
	UpdatedAt          time.Time `json:"updated_at,omitempty"`
}

// CreateDevTask creates a new development task
func (s *SupabaseService) CreateDevTask(userID, instruction string, allowGitOps bool) (*DevTask, error) {
	url := fmt.Sprintf("%s/rest/v1/dev_tasks", s.baseURL)

	task := DevTask{
		UserID:             userID,
		Instruction:        instruction,
		Status:             "pending",
		AllowGitOperations: allowGitOps,
	}

	reqBody, err := json.Marshal(task)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal task: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("supabase returned status %d: %s", resp.StatusCode, string(body))
	}

	var tasks []DevTask
	if err := json.Unmarshal(body, &tasks); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(tasks) == 0 {
		return nil, fmt.Errorf("no task returned")
	}

	return &tasks[0], nil
}

// GetPendingDevTasksForNotification gets tasks that just completed (done/failed) and need notification
func (s *SupabaseService) GetCompletedDevTasks() ([]DevTask, error) {
	url := fmt.Sprintf("%s/rest/v1/dev_tasks?status=in.(done,failed)&select=*&order=updated_at.desc&limit=10", s.baseURL)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("supabase returned status %d: %s", resp.StatusCode, string(body))
	}

	var tasks []DevTask
	if err := json.Unmarshal(body, &tasks); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return tasks, nil
}

// MarkTokenAsUsed marks a magic link token as used
func (s *SupabaseService) MarkTokenAsUsed(token string) error {
	url := fmt.Sprintf("%s/rest/v1/admin_tokens?token=eq.%s", s.baseURL, token)

	updateData := map[string]interface{}{
		"used": true,
	}

	reqBody, err := json.Marshal(updateData)
	if err != nil {
		return fmt.Errorf("failed to marshal update data: %w", err)
	}

	req, err := http.NewRequest("PATCH", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to mark token as used: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
