package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lumis/backend/internal/services"
)

type RoutineHandler struct {
	svc *services.RoutineService
}

func NewRoutineHandler(svc *services.RoutineService) *RoutineHandler {
	return &RoutineHandler{svc: svc}
}

func todayStr() string {
	return time.Now().Format("2006-01-02")
}

func validPeriod(p string) bool {
	return p == "morning" || p == "evening"
}

// POST /api/v1/routine/complete  { "period": "morning" }
func (h *RoutineHandler) Complete(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var body struct {
		Period string `json:"period"`
	}
	if err := c.BodyParser(&body); err != nil || !validPeriod(body.Period) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid period"})
	}
	if err := h.svc.Complete(c.Context(), userID, todayStr(), body.Period); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "save failed"})
	}
	return h.respond(c)
}

// DELETE /api/v1/routine/complete  { "period": "morning" }
func (h *RoutineHandler) Uncomplete(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var body struct {
		Period string `json:"period"`
	}
	if err := c.BodyParser(&body); err != nil || !validPeriod(body.Period) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid period"})
	}
	if err := h.svc.Uncomplete(c.Context(), userID, todayStr(), body.Period); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "delete failed"})
	}
	return h.respond(c)
}

// GET /api/v1/routine/status
func (h *RoutineHandler) Status(c *fiber.Ctx) error {
	if _, err := parseUserID(c); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	return h.respond(c)
}

func (h *RoutineHandler) respond(c *fiber.Ctx) error {
	uid, _ := parseUserID(c)
	sum := h.svc.Summary(c.Context(), uid, todayStr())
	return c.JSON(fiber.Map{
		"morning_done":    sum.MorningDone,
		"evening_done":    sum.EveningDone,
		"streak":          sum.Streak,
		"total_completed": sum.TotalCompleted,
	})
}
