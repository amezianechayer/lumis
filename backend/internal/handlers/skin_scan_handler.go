package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/lumis/backend/internal/middleware"
	"github.com/lumis/backend/internal/repository"
	"github.com/lumis/backend/internal/services"
)

type SkinScanHandler struct {
	svc          *services.SkinScanService
	repo         *repository.SkinScanRepository
	userRepo     *repository.UserRepository
	freeScanLimit int
}

func NewSkinScanHandler(svc *services.SkinScanService, repo *repository.SkinScanRepository, userRepo *repository.UserRepository, freeScanLimit int) *SkinScanHandler {
	return &SkinScanHandler{svc: svc, repo: repo, userRepo: userRepo, freeScanLimit: freeScanLimit}
}

// POST /api/v1/analysis/skin
func (h *SkinScanHandler) Analyze(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals(middleware.UserIDKey).(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	// Premium gate: check monthly scan limit for free users
	user, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	if !user.IsPremium() {
		count, err := h.repo.CountThisMonth(c.Context(), userID)
		if err == nil && int(count) >= h.freeScanLimit {
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"error":            "limit_reached",
				"upgrade_required": true,
				"used":             count,
				"limit":            h.freeScanLimit,
				"message":          "Tu as atteint ta limite de scans gratuits ce mois-ci.",
			})
		}
	}

	var input services.SkinScanInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if input.StressLevel < 1 || input.StressLevel > 10 {
		input.StressLevel = 5
	}
	if input.SleepHours <= 0 {
		input.SleepHours = 7
	}
	if input.WaterIntakeLiters <= 0 {
		input.WaterIntakeLiters = 1.5
	}

	scan, err := h.svc.Analyze(c.Context(), userID, input)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "skin scan failed"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"skin_scan": scan})
}

// GET /api/v1/analysis/skin/latest
func (h *SkinScanHandler) GetLatest(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	scan, err := h.repo.FindLatestByUser(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	if scan == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no skin scan found"})
	}

	return c.JSON(fiber.Map{"skin_scan": scan})
}

// GET /api/v1/analysis/skin/history
func (h *SkinScanHandler) GetHistory(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	scans, err := h.repo.FindHistoryByUser(c.Context(), userID, 20)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	return c.JSON(fiber.Map{"skin_scans": scans})
}
