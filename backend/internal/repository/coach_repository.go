package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"gorm.io/gorm"
)

type CoachRepository struct {
	db *gorm.DB
}

func NewCoachRepository(db *gorm.DB) *CoachRepository {
	return &CoachRepository{db: db}
}

func (r *CoachRepository) CreateConversation(ctx context.Context, conv *models.CoachConversation) error {
	return r.db.WithContext(ctx).Create(conv).Error
}

func (r *CoachRepository) GetConversationByID(ctx context.Context, id, userID uuid.UUID) (*models.CoachConversation, error) {
	var conv models.CoachConversation
	err := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		First(&conv).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &conv, err
}

func (r *CoachRepository) ListConversations(ctx context.Context, userID uuid.UUID) ([]models.CoachConversation, error) {
	var convs []models.CoachConversation
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("updated_at DESC").
		Limit(20).
		Find(&convs).Error
	return convs, err
}

func (r *CoachRepository) AddMessage(ctx context.Context, msg *models.CoachMessage) error {
	return r.db.WithContext(ctx).Create(msg).Error
}

func (r *CoachRepository) GetMessages(ctx context.Context, convID uuid.UUID, limit int) ([]models.CoachMessage, error) {
	var msgs []models.CoachMessage
	err := r.db.WithContext(ctx).
		Where("conversation_id = ?", convID).
		Order("created_at ASC").
		Limit(limit).
		Find(&msgs).Error
	return msgs, err
}

func (r *CoachRepository) GetRecentMessages(ctx context.Context, convID uuid.UUID, limit int) ([]models.CoachMessage, error) {
	var msgs []models.CoachMessage
	err := r.db.WithContext(ctx).
		Where("conversation_id = ?", convID).
		Order("created_at DESC").
		Limit(limit).
		Find(&msgs).Error
	// reverse to chronological order
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, err
}

func (r *CoachRepository) UpdateConversationTitle(ctx context.Context, id uuid.UUID, title string) error {
	return r.db.WithContext(ctx).
		Model(&models.CoachConversation{}).
		Where("id = ?", id).
		Update("title", title).Error
}

// CountUserMessagesToday counts messages sent BY the user (role=user) today.
func (r *CoachRepository) CountUserMessagesToday(ctx context.Context, userID uuid.UUID) (int64, error) {
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	var count int64
	err := r.db.WithContext(ctx).Model(&models.CoachMessage{}).
		Joins("JOIN coach_conversations ON coach_conversations.id = coach_messages.conversation_id").
		Where("coach_conversations.user_id = ? AND coach_messages.role = 'user' AND coach_messages.created_at >= ?", userID, startOfDay).
		Count(&count).Error
	return count, err
}

func (r *CoachRepository) DeleteConversation(ctx context.Context, id, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		Delete(&models.CoachConversation{}).Error
}
