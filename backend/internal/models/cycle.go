package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CycleData stores a user's menstrual cycle reference (one row per user).
type CycleData struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	LastPeriodDate string    `gorm:"type:date;not null" json:"last_period_date"` // YYYY-MM-DD
	CycleLength    int       `gorm:"default:28" json:"cycle_length"`
	PeriodLength   int       `gorm:"default:5" json:"period_length"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (c *CycleData) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
