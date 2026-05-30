package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type ScannedProduct struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID             uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Barcode            string         `gorm:"size:50;not null" json:"barcode"`
	ProductName        string         `gorm:"size:255" json:"product_name"`
	Brand              string         `gorm:"size:100" json:"brand"`
	Category           string         `gorm:"size:100" json:"category"`
	Ingredients        string         `gorm:"type:text" json:"ingredients"`
	ImageURL           string         `json:"image_url"`
	CompatibilityScore int            `json:"compatibility_score"`
	Verdict            string         `gorm:"size:20" json:"verdict"` // excellent|good|neutral|avoid
	Pros               pq.StringArray `gorm:"type:text[]" json:"pros"`
	Cons               pq.StringArray `gorm:"type:text[]" json:"cons"`
	Tip                string         `gorm:"type:text" json:"tip"`
	NotFound           bool           `gorm:"default:false" json:"not_found"`
	CreatedAt          time.Time      `json:"created_at"`
}

func (p *ScannedProduct) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
