package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"gorm.io/gorm"
)

type AuthTokenRepository struct {
	db *gorm.DB
}

func NewAuthTokenRepository(db *gorm.DB) *AuthTokenRepository {
	return &AuthTokenRepository{db: db}
}

func (r *AuthTokenRepository) Create(ctx context.Context, userID uuid.UUID, rawToken, purpose string, expiresAt time.Time) error {
	at := models.AuthToken{
		UserID:    userID,
		TokenHash: HashToken(rawToken),
		Purpose:   purpose,
		ExpiresAt: expiresAt,
	}
	return r.db.WithContext(ctx).Create(&at).Error
}

// FindValid returns an unused, unexpired token matching the raw value + purpose.
func (r *AuthTokenRepository) FindValid(ctx context.Context, rawToken, purpose string) (*models.AuthToken, error) {
	var at models.AuthToken
	err := r.db.WithContext(ctx).
		Where("token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?",
			HashToken(rawToken), purpose, time.Now()).
		First(&at).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &at, err
}

func (r *AuthTokenRepository) MarkUsed(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&models.AuthToken{}).
		Where("id = ?", id).
		Update("used_at", now).Error
}

// DeleteForUserPurpose clears any outstanding tokens of a purpose for a user,
// so a freshly issued token is the only valid one.
func (r *AuthTokenRepository) DeleteForUserPurpose(ctx context.Context, userID uuid.UUID, purpose string) error {
	return r.db.WithContext(ctx).
		Where("user_id = ? AND purpose = ?", userID, purpose).
		Delete(&models.AuthToken{}).Error
}
