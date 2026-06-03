package models

import (
	"time"

	"github.com/google/uuid"
)

// AuthToken backs one-time flows (password reset, email verification).
// Only the SHA-256 hash of the token is stored, never the raw value.
type AuthToken struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null;index"`
	TokenHash string     `gorm:"not null;size:255;uniqueIndex"`
	Purpose   string     `gorm:"not null;size:32;index"` // "password_reset" | "email_verify"
	ExpiresAt time.Time  `gorm:"not null"`
	UsedAt    *time.Time
	CreatedAt time.Time
}

const (
	PurposePasswordReset = "password_reset"
	PurposeEmailVerify   = "email_verify"
)
