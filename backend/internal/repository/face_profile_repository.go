package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"gorm.io/gorm"
)

type FaceProfileRepository struct {
	db *gorm.DB
}

func NewFaceProfileRepository(db *gorm.DB) *FaceProfileRepository {
	return &FaceProfileRepository{db: db}
}

func (r *FaceProfileRepository) Create(ctx context.Context, profile *models.FaceProfile) error {
	return r.db.WithContext(ctx).Create(profile).Error
}

func (r *FaceProfileRepository) Update(ctx context.Context, profile *models.FaceProfile) error {
	return r.db.WithContext(ctx).Save(profile).Error
}

func (r *FaceProfileRepository) FindLatestByUser(ctx context.Context, userID uuid.UUID) (*models.FaceProfile, error) {
	var profile models.FaceProfile
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		First(&profile).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &profile, err
}

func (r *FaceProfileRepository) FindByID(ctx context.Context, id, userID uuid.UUID) (*models.FaceProfile, error) {
	var profile models.FaceProfile
	err := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		First(&profile).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &profile, err
}

func (r *FaceProfileRepository) FindHistoryByUser(ctx context.Context, userID uuid.UUID, limit int) ([]models.FaceProfile, error) {
	var profiles []models.FaceProfile
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&profiles).Error
	return profiles, err
}
