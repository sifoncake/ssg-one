package models

import "time"

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
