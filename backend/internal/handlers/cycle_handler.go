package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/lib/pq"
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
		"has_pcos":         data.HasPCOS,
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
		HasPCOS        bool   `json:"has_pcos"`
	}
	if err := c.BodyParser(&body); err != nil || body.LastPeriodDate == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	// SOPK : on autorise un cycle plus long/irrégulier, sinon on borne.
	if !body.HasPCOS && (body.CycleLength < 21 || body.CycleLength > 40) {
		body.CycleLength = 28
	}
	if body.CycleLength < 21 || body.CycleLength > 90 {
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
		HasPCOS:        body.HasPCOS,
	}
	if err := h.svc.Upsert(c.Context(), data); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "save failed"})
	}
	return c.JSON(fiber.Map{"configured": true, "has_pcos": data.HasPCOS, "phase": services.ComputeCyclePhase(data)})
}

// GET /api/v1/cycle/logs — recent daily tracking entries.
func (h *CycleHandler) GetLogs(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	logs, err := h.svc.GetLogs(c.Context(), userID, 60)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db error"})
	}
	if logs == nil {
		logs = []models.CycleLog{}
	}
	return c.JSON(fiber.Map{"logs": logs})
}

// POST /api/v1/cycle/log — upsert one day's tracking.
func (h *CycleHandler) SaveLog(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var body struct {
		Date      string   `json:"date"`
		Mood      string   `json:"mood"`
		SkinState string   `json:"skin_state"`
		Flow      string   `json:"flow"`
		Symptoms  []string `json:"symptoms"`
		Notes     string   `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil || body.Date == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	log := &models.CycleLog{
		UserID:    userID,
		Date:      body.Date,
		Mood:      body.Mood,
		SkinState: body.SkinState,
		Flow:      body.Flow,
		Symptoms:  pq.StringArray(body.Symptoms),
		Notes:     body.Notes,
	}
	if err := h.svc.SaveLog(c.Context(), log); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "save failed"})
	}
	return c.JSON(fiber.Map{"log": log})
}
