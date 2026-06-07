package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// CycleData stores a user's menstrual cycle reference (one row per user).
type CycleData struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	LastPeriodDate string    `gorm:"type:date;not null" json:"last_period_date"` // YYYY-MM-DD
	CycleLength    int       `gorm:"default:28" json:"cycle_length"`
	PeriodLength   int       `gorm:"default:5" json:"period_length"`
	// HasPCOS marks an irregular cycle / SOPK profile. Predictions become
	// estimates and skin guidance shifts toward hormonal-acne management.
	HasPCOS   bool      `gorm:"default:false" json:"has_pcos"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (c *CycleData) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// CycleLog is a single day's self-reported tracking (mood, skin, flow,
// symptoms). One row per user per day.
type CycleLog struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index:idx_cyclelog_user_date,unique,priority:1" json:"user_id"`
	Date      string         `gorm:"type:date;not null;index:idx_cyclelog_user_date,unique,priority:2" json:"date"` // YYYY-MM-DD
	Mood      string         `json:"mood"`       // happy|calm|tired|irritable|anxious|sad
	SkinState string         `json:"skin_state"` // clear|glowing|oily|dry|breakout|sensitive
	Flow      string         `json:"flow"`       // none|light|medium|heavy
	Symptoms  pq.StringArray `gorm:"type:text[]" json:"symptoms"`
	Notes     string         `json:"notes"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

func (c *CycleLog) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
