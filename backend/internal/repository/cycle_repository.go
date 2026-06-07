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
			DoUpdates: clause.AssignmentColumns([]string{"last_period_date", "cycle_length", "period_length", "has_pcos", "updated_at"}),
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

// UpsertLog creates or updates a single day's tracking entry (one per user/date).
func (r *CycleRepository) UpsertLog(ctx context.Context, log *models.CycleLog) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "date"}},
			DoUpdates: clause.AssignmentColumns([]string{"mood", "skin_state", "flow", "symptoms", "notes", "updated_at"}),
		}).
		Create(log).Error
}

// FindLogs returns the user's most recent daily logs (newest first).
func (r *CycleRepository) FindLogs(ctx context.Context, userID uuid.UUID, limit int) ([]models.CycleLog, error) {
	if limit <= 0 {
		limit = 60
	}
	var logs []models.CycleLog
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("date DESC").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}
