package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/lumis/backend/internal/middleware"
	"github.com/lumis/backend/internal/repository"
	"github.com/lumis/backend/internal/services"
)

type StripeHandler struct {
	svc      *services.StripeService
	userRepo *repository.UserRepository
}

func NewStripeHandler(svc *services.StripeService, userRepo *repository.UserRepository) *StripeHandler {
	return &StripeHandler{svc: svc, userRepo: userRepo}
}

// POST /api/v1/stripe/checkout
func (h *StripeHandler) CreateCheckout(c *fiber.Ctx) error {
	if !h.svc.Enabled() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "payments not configured"})
	}

	userIDStr, ok := c.Locals(middleware.UserIDKey).(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	user, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	if user.IsPremium() {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "already premium"})
	}

	var body struct {
		SuccessURL string `json:"success_url"`
		CancelURL  string `json:"cancel_url"`
	}
	if err := c.BodyParser(&body); err != nil || body.SuccessURL == "" {
		body.SuccessURL = "lumis://premium/success"
		body.CancelURL = "lumis://premium/cancel"
	}

	result, err := h.svc.CreateCheckoutSession(c.Context(), userID, user.Email, body.SuccessURL, body.CancelURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

// GET /api/v1/stripe/status
func (h *StripeHandler) GetStatus(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals(middleware.UserIDKey).(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	user, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	return c.JSON(fiber.Map{
		"is_premium":    user.IsPremium(),
		"premium_until": user.PremiumUntil,
	})
}

// POST /api/v1/premium/activate  — called by mobile after RevenueCat purchase
func (h *StripeHandler) ActivatePremium(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals(middleware.UserIDKey).(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var body struct {
		DurationMonths int `json:"duration_months"`
	}
	if err := c.BodyParser(&body); err != nil || body.DurationMonths <= 0 {
		body.DurationMonths = 12
	}

	premiumUntil := time.Now().AddDate(0, body.DurationMonths, 0)
	if err := h.userRepo.SetPremium(c.Context(), userID, premiumUntil); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to activate premium"})
	}

	return c.JSON(fiber.Map{
		"is_premium":    true,
		"premium_until": premiumUntil,
	})
}

// POST /api/v1/webhook/stripe  (no auth middleware)
func (h *StripeHandler) Webhook(c *fiber.Ctx) error {
	signature := c.Get("Stripe-Signature")
	body := c.Body()

	if err := h.svc.HandleWebhook(body, signature); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"received": true})
}
