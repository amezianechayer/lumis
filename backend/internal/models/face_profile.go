package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type FaceProfile struct {
	ID                     uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID                 uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	PhotoURL               string         `gorm:"not null" json:"photo_url"`
	FaceShape              string         `gorm:"size:50" json:"face_shape"`
	FaceShapeConfidence    float64        `json:"face_shape_confidence"`
	EyeShape               string         `gorm:"size:50" json:"eye_shape"`
	EyeDistance            string         `gorm:"size:20" json:"eye_distance"`
	SkinTone               string         `gorm:"size:20" json:"skin_tone"`
	Undertone              string         `gorm:"size:20" json:"undertone"`
	ColorSeason            string         `gorm:"size:20" json:"color_season"`
	NoseShape              string         `gorm:"size:50" json:"nose_shape"`
	LipShape               string         `gorm:"size:50" json:"lip_shape"`
	JawType                string         `gorm:"size:50" json:"jaw_type"`
	BeardRecommendations   pq.StringArray `gorm:"type:text[]" json:"beard_recommendations,omitempty"`
	HaircutRecommendations pq.StringArray `gorm:"type:text[]" json:"haircut_recommendations,omitempty"`
	Landmarks              JSON           `gorm:"type:jsonb" json:"landmarks,omitempty"`
	AnalysisVersion        string         `gorm:"size:20;default:'1.0'" json:"analysis_version"`
	CreatedAt              time.Time      `json:"created_at"`
}

// JSON is a helper type for jsonb columns without external datatypes dependency.
type JSON json.RawMessage

func (j JSON) Value() (interface{}, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return string(j), nil
}

func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	switch v := value.(type) {
	case []byte:
		*j = JSON(v)
	case string:
		*j = JSON(v)
	}
	return nil
}

func (f *FaceProfile) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}
