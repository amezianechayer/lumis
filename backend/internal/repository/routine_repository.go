package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type RoutineRepository struct {
	db *gorm.DB
}

func NewRoutineRepository(db *gorm.DB) *RoutineRepository {
	return &RoutineRepository{db: db}
}

// Complete inserts a routine log (idempotent — ignores if already present).
func (r *RoutineRepository) Complete(ctx context.Context, userID uuid.UUID, date, period string) error {
	log := &models.RoutineLog{UserID: userID, LogDate: date, Period: period}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(log).Error
}

// Uncomplete removes a routine log.
func (r *RoutineRepository) Uncomplete(ctx context.Context, userID uuid.UUID, date, period string) error {
	return r.db.WithContext(ctx).
		Where("user_id = ? AND log_date = ? AND period = ?", userID, date, period).
		Delete(&models.RoutineLog{}).Error
}

// FindPeriodsForDate returns the completed periods for a given date.
func (r *RoutineRepository) FindPeriodsForDate(ctx context.Context, userID uuid.UUID, date string) ([]string, error) {
	var periods []string
	err := r.db.WithContext(ctx).
		Model(&models.RoutineLog{}).
		Where("user_id = ? AND log_date = ?", userID, date).
		Pluck("period", &periods).Error
	return periods, err
}

// DistinctDates returns all distinct dates (desc) the user completed any routine.
func (r *RoutineRepository) DistinctDates(ctx context.Context, userID uuid.UUID) ([]string, error) {
	var dates []string
	err := r.db.WithContext(ctx).
		Model(&models.RoutineLog{}).
		Where("user_id = ?", userID).
		Distinct().
		Order("log_date DESC").
		Pluck("log_date", &dates).Error
	return dates, err
}

// FindLogsSince returns all routine logs on/after the given date (YYYY-MM-DD).
func (r *RoutineRepository) FindLogsSince(ctx context.Context, userID uuid.UUID, since string) ([]models.RoutineLog, error) {
	var logs []models.RoutineLog
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND log_date >= ?", userID, since).
		Find(&logs).Error
	return logs, err
}

// TotalCount returns the total number of completed routine periods.
func (r *RoutineRepository) TotalCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.RoutineLog{}).
		Where("user_id = ?", userID).
		Count(&count).Error
	return count, err
}
