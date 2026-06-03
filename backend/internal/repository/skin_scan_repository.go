package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"gorm.io/gorm"
)

type SkinScanRepository struct {
	db *gorm.DB
}

func NewSkinScanRepository(db *gorm.DB) *SkinScanRepository {
	return &SkinScanRepository{db: db}
}

func (r *SkinScanRepository) Create(ctx context.Context, scan *models.SkinScan) error {
	return r.db.WithContext(ctx).Create(scan).Error
}

func (r *SkinScanRepository) FindLatestByUser(ctx context.Context, userID uuid.UUID) (*models.SkinScan, error) {
	var scan models.SkinScan
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		First(&scan).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &scan, err
}

func (r *SkinScanRepository) FindHistoryByUser(ctx context.Context, userID uuid.UUID, limit int) ([]models.SkinScan, error) {
	var scans []models.SkinScan
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&scans).Error
	return scans, err
}

func (r *SkinScanRepository) CountThisMonth(ctx context.Context, userID uuid.UUID) (int64, error) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	var count int64
	err := r.db.WithContext(ctx).Model(&models.SkinScan{}).
		Where("user_id = ? AND created_at >= ?", userID, start).
		Count(&count).Error
	return count, err
}

func (r *SkinScanRepository) UpdateAIAnalysis(ctx context.Context, id uuid.UUID, analysis []byte) error {
	return r.db.WithContext(ctx).Model(&models.SkinScan{}).
		Where("id = ?", id).
		Update("ai_analysis", string(analysis)).Error
}

func (r *SkinScanRepository) FindByID(ctx context.Context, id, userID uuid.UUID) (*models.SkinScan, error) {
	var scan models.SkinScan
	err := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		First(&scan).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &scan, err
}
