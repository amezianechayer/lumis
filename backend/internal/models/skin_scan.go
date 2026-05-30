package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type SkinScan struct {
	ID                     uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID                 uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	PhotoURL               string         `gorm:"default:'pending'" json:"photo_url"`
	OverallScore           int            `json:"overall_score"`
	AcneScore              int            `json:"acne_score"`
	HydrationScore         int            `json:"hydration_score"`
	UniformityScore        int            `json:"uniformity_score"`
	TextureScore           int            `json:"texture_score"`
	AcneCount              int            `gorm:"default:0" json:"acne_count"`
	AcneZones              pq.StringArray `gorm:"type:text[]" json:"acne_zones,omitempty"`
	DarkSpotsCount         int            `gorm:"default:0" json:"dark_spots_count"`
	HyperpigmentationLevel string         `gorm:"size:20" json:"hyperpigmentation_level"`
	PoresCondition         string         `gorm:"size:20" json:"pores_condition"`
	OilinessZones          pq.StringArray `gorm:"type:text[]" json:"oiliness_zones,omitempty"`
	DrynessZones           pq.StringArray `gorm:"type:text[]" json:"dryness_zones,omitempty"`
	RednessLevel           string         `gorm:"size:20" json:"redness_level"`
	FineLinesDetected      bool           `gorm:"default:false" json:"fine_lines_detected"`
	AIAnalysis             JSON           `gorm:"type:jsonb" json:"ai_analysis,omitempty"`
	SleepHours             float64        `json:"sleep_hours"`
	StressLevel            int            `json:"stress_level"`
	WaterIntakeLiters      float64        `json:"water_intake_liters"`
	Notes                  string         `json:"notes,omitempty"`
	WeekNumber             int            `json:"week_number"`
	Year                   int            `json:"year"`
	CreatedAt              time.Time      `json:"created_at"`
}

func (s *SkinScan) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	now := time.Now()
	_, week := now.ISOWeek()
	s.WeekNumber = week
	s.Year = now.Year()
	return nil
}
