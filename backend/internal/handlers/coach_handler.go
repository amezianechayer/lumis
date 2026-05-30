package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
	"github.com/lumis/backend/internal/services"
)

type CoachHandler struct {
	svc                 *services.CoachService
	repo                *repository.CoachRepository
	userRepo            *repository.UserRepository
	freeCoachDailyLimit int
}

func NewCoachHandler(svc *services.CoachService, repo *repository.CoachRepository, userRepo *repository.UserRepository, freeCoachDailyLimit int) *CoachHandler {
	return &CoachHandler{svc: svc, repo: repo, userRepo: userRepo, freeCoachDailyLimit: freeCoachDailyLimit}
}

// POST /api/v1/coach/conversations
func (h *CoachHandler) CreateConversation(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	conv := &models.CoachConversation{
		UserID: userID,
		Title:  "Nouvelle conversation",
	}
	if err := h.repo.CreateConversation(c.Context(), conv); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create conversation"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"conversation": conv})
}

// GET /api/v1/coach/conversations
func (h *CoachHandler) ListConversations(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	convs, err := h.repo.ListConversations(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	return c.JSON(fiber.Map{"conversations": convs})
}

// GET /api/v1/coach/conversations/:id
func (h *CoachHandler) GetConversation(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid conversation id"})
	}

	conv, err := h.repo.GetConversationByID(c.Context(), convID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	if conv == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "conversation not found"})
	}

	msgs, err := h.repo.GetMessages(c.Context(), convID, 100)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	conv.Messages = msgs

	return c.JSON(fiber.Map{"conversation": conv})
}

// POST /api/v1/coach/conversations/:id/messages
func (h *CoachHandler) SendMessage(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid conversation id"})
	}

	// verify conversation belongs to user
	conv, err := h.repo.GetConversationByID(c.Context(), convID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	if conv == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "conversation not found"})
	}

	var body struct {
		Content string `json:"content"`
	}
	if err := c.BodyParser(&body); err != nil || body.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "content is required"})
	}

	// Premium gate: check daily message limit for free users
	user, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	if !user.IsPremium() {
		count, err := h.repo.CountUserMessagesToday(c.Context(), userID)
		if err == nil && int(count) >= h.freeCoachDailyLimit {
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"error":            "limit_reached",
				"upgrade_required": true,
				"used":             count,
				"limit":            h.freeCoachDailyLimit,
				"message":          "Tu as atteint ta limite de messages gratuits aujourd'hui.",
			})
		}
	}

	reply, err := h.svc.SendMessage(c.Context(), userID, convID, body.Content)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "coach unavailable: " + err.Error()})
	}

	return c.JSON(fiber.Map{"message": reply})
}

// DELETE /api/v1/coach/conversations/:id
func (h *CoachHandler) DeleteConversation(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid conversation id"})
	}

	if err := h.repo.DeleteConversation(c.Context(), convID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
