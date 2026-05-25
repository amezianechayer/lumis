package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"gorm.io/gorm"
)

type TokenRepository struct {
	db *gorm.DB
}

func NewTokenRepository(db *gorm.DB) *TokenRepository {
	return &TokenRepository{db: db}
}

func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func (r *TokenRepository) Create(ctx context.Context, userID uuid.UUID, rawToken string, expiresAt time.Time) error {
	rt := models.RefreshToken{
		UserID:    userID,
		TokenHash: HashToken(rawToken),
		ExpiresAt: expiresAt,
	}
	return r.db.WithContext(ctx).Create(&rt).Error
}

func (r *TokenRepository) FindByHash(ctx context.Context, rawToken string) (*models.RefreshToken, error) {
	var rt models.RefreshToken
	err := r.db.WithContext(ctx).
		Where("token_hash = ? AND revoked = false AND expires_at > ?", HashToken(rawToken), time.Now()).
		First(&rt).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &rt, err
}

func (r *TokenRepository) Revoke(ctx context.Context, rawToken string) error {
	return r.db.WithContext(ctx).
		Model(&models.RefreshToken{}).
		Where("token_hash = ?", HashToken(rawToken)).
		Update("revoked", true).Error
}

func (r *TokenRepository) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.RefreshToken{}).
		Where("user_id = ?", userID).
		Update("revoked", true).Error
}
