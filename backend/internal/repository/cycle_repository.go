package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CycleRepository struct {
	db *gorm.DB
}

func NewCycleRepository(db *gorm.DB) *CycleRepository {
	return &CycleRepository{db: db}
}

// Upsert creates or updates the user's cycle data.
func (r *CycleRepository) Upsert(ctx context.Context, data *models.CycleData) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"last_period_date", "cycle_length", "period_length", "updated_at"}),
		}).
		Create(data).Error
}

func (r *CycleRepository) FindByUser(ctx context.Context, userID uuid.UUID) (*models.CycleData, error) {
	var data models.CycleData
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&data).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &data, err
}
