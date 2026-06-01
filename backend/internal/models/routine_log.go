package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RoutineLog records one completed routine period (morning/evening) on a given day.
type RoutineLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_routine_unique" json:"user_id"`
	LogDate   string    `gorm:"type:date;not null;uniqueIndex:idx_routine_unique" json:"log_date"` // YYYY-MM-DD
	Period    string    `gorm:"size:10;not null;uniqueIndex:idx_routine_unique" json:"period"`     // morning | evening
	CreatedAt time.Time `json:"created_at"`
}

func (r *RoutineLog) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}
