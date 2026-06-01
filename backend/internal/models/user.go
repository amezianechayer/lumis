package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type User struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Email            string         `gorm:"uniqueIndex;not null;size:255" json:"email"`
	PasswordHash     string         `gorm:"not null;size:255" json:"-"`
	Username         *string        `gorm:"uniqueIndex;size:50" json:"username,omitempty"`
	FullName         *string        `gorm:"size:100" json:"full_name,omitempty"`
	Gender           *string        `gorm:"size:20;check:gender IN ('male','female','nonbinary','prefer_not')" json:"gender,omitempty"`
	DateOfBirth      *time.Time     `json:"date_of_birth,omitempty"`
	AvatarURL        *string        `json:"avatar_url,omitempty"`
	PremiumUntil     *time.Time     `json:"premium_until,omitempty"`
	StripeCustomerID *string        `gorm:"size:100" json:"-"`
	Goals            pq.StringArray `gorm:"type:text[]" json:"goals,omitempty"`
	SkinType         *string        `gorm:"size:20;check:skin_type IN ('normal','oily','dry','combination','sensitive')" json:"skin_type,omitempty"`
	EmailVerified    bool           `gorm:"default:false" json:"email_verified"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

func (u *User) IsPremium() bool {
	return u.PremiumUntil != nil && u.PremiumUntil.After(time.Now())
}
