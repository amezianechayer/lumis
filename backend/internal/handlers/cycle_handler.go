package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/services"
)

type CycleHandler struct {
	svc *services.CycleService
}

func NewCycleHandler(svc *services.CycleService) *CycleHandler {
	return &CycleHandler{svc: svc}
}

// GET /api/v1/cycle
func (h *CycleHandler) Get(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	data, err := h.svc.Get(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db error"})
	}
	if data == nil {
		return c.JSON(fiber.Map{"configured": false})
	}
	phase := services.ComputeCyclePhase(data)
	return c.JSON(fiber.Map{
		"configured":       true,
		"last_period_date": data.LastPeriodDate,
		"cycle_length":     data.CycleLength,
		"phase":            phase,
	})
}

// POST /api/v1/cycle
func (h *CycleHandler) Save(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var body struct {
		LastPeriodDate string `json:"last_period_date"`
		CycleLength    int    `json:"cycle_length"`
		PeriodLength   int    `json:"period_length"`
	}
	if err := c.BodyParser(&body); err != nil || body.LastPeriodDate == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if body.CycleLength < 21 || body.CycleLength > 40 {
		body.CycleLength = 28
	}
	if body.PeriodLength < 2 || body.PeriodLength > 10 {
		body.PeriodLength = 5
	}

	data := &models.CycleData{
		UserID:         userID,
		LastPeriodDate: body.LastPeriodDate,
		CycleLength:    body.CycleLength,
		PeriodLength:   body.PeriodLength,
	}
	if err := h.svc.Upsert(c.Context(), data); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "save failed"})
	}
	return c.JSON(fiber.Map{"configured": true, "phase": services.ComputeCyclePhase(data)})
}
