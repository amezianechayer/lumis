package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type Recommendation struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	FaceProfileID  *uuid.UUID     `gorm:"type:uuid" json:"face_profile_id,omitempty"`
	Type           string         `gorm:"size:50;not null" json:"type"`           // makeup,grooming,haircut,skincare,color_season
	GenderTarget   string         `gorm:"size:20" json:"gender_target"`           // male,female,all
	Title          string         `gorm:"size:200" json:"title"`
	Summary        string         `json:"summary"`
	Steps          JSON           `gorm:"type:jsonb" json:"steps"`
	Products       JSON           `gorm:"type:jsonb" json:"products"`
	Occasions      pq.StringArray `gorm:"type:text[]" json:"occasions"`
	Season         string         `gorm:"size:20" json:"season,omitempty"`
	IsPremiumOnly  bool           `gorm:"default:false" json:"is_premium_only"`
	IconEmoji      string         `gorm:"size:10" json:"icon_emoji"`
	DurationMin    int            `json:"duration_min"`                          // estimated minutes
	Difficulty     string         `gorm:"size:20" json:"difficulty"`             // easy,medium,advanced
	CreatedAt      time.Time      `json:"created_at"`
}

func (r *Recommendation) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

// RecStep is the JSON shape stored in the Steps column.
type RecStep struct {
	Order       int    `json:"order"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Tip         string `json:"tip,omitempty"`
	DurationMin int    `json:"duration_min,omitempty"`
}

// RecProduct is the JSON shape stored in the Products column.
type RecProduct struct {
	Name     string `json:"name"`
	Category string `json:"category"`
	Why      string `json:"why"`
	Premium  bool   `json:"premium"`
}
