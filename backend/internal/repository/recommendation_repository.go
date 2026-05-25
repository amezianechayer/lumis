package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"gorm.io/gorm"
)

type RecommendationRepository struct {
	db *gorm.DB
}

func NewRecommendationRepository(db *gorm.DB) *RecommendationRepository {
	return &RecommendationRepository{db: db}
}

func (r *RecommendationRepository) BulkCreate(ctx context.Context, recs []models.Recommendation) error {
	return r.db.WithContext(ctx).Create(&recs).Error
}

func (r *RecommendationRepository) FindByUser(ctx context.Context, userID uuid.UUID, recType, occasion string) ([]models.Recommendation, error) {
	q := r.db.WithContext(ctx).Where("user_id = ?", userID)
	if recType != "" {
		q = q.Where("type = ?", recType)
	}
	if occasion != "" {
		q = q.Where("? = ANY(occasions)", occasion)
	}
	var recs []models.Recommendation
	err := q.Order("created_at DESC").Find(&recs).Error
	return recs, err
}

func (r *RecommendationRepository) FindByID(ctx context.Context, id, userID uuid.UUID) (*models.Recommendation, error) {
	var rec models.Recommendation
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&rec).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &rec, err
}

func (r *RecommendationRepository) CountByUser(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Recommendation{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

func (r *RecommendationRepository) DeleteByUser(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&models.Recommendation{}).Error
}
