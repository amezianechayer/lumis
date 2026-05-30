package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"gorm.io/gorm"
)

type ScannedProductRepository struct {
	db *gorm.DB
}

func NewScannedProductRepository(db *gorm.DB) *ScannedProductRepository {
	return &ScannedProductRepository{db: db}
}

func (r *ScannedProductRepository) Create(ctx context.Context, product *models.ScannedProduct) error {
	return r.db.WithContext(ctx).Create(product).Error
}

func (r *ScannedProductRepository) FindHistoryByUser(ctx context.Context, userID uuid.UUID, limit int) ([]models.ScannedProduct, error) {
	var products []models.ScannedProduct
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&products).Error
	return products, err
}
