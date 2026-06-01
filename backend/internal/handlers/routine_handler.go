package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lumis/backend/internal/repository"
)

type RoutineHandler struct {
	repo *repository.RoutineRepository
}

func NewRoutineHandler(repo *repository.RoutineRepository) *RoutineHandler {
	return &RoutineHandler{repo: repo}
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
	if err := h.repo.Complete(c.Context(), userID, todayStr(), body.Period); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "save failed"})
	}
	return h.status(c)
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
	if err := h.repo.Uncomplete(c.Context(), userID, todayStr(), body.Period); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "delete failed"})
	}
	return h.status(c)
}

// GET /api/v1/routine/status
func (h *RoutineHandler) Status(c *fiber.Ctx) error {
	if _, err := parseUserID(c); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	return h.status(c)
}

func (h *RoutineHandler) status(c *fiber.Ctx) error {
	uid, _ := parseUserID(c)

	periods, _ := h.repo.FindPeriodsForDate(c.Context(), uid, todayStr())
	morningDone, eveningDone := false, false
	for _, p := range periods {
		if p == "morning" {
			morningDone = true
		} else if p == "evening" {
			eveningDone = true
		}
	}

	dates, _ := h.repo.DistinctDates(c.Context(), uid)
	streak := computeStreak(dates)
	total, _ := h.repo.TotalCount(c.Context(), uid)

	return c.JSON(fiber.Map{
		"morning_done":    morningDone,
		"evening_done":    eveningDone,
		"streak":          streak,
		"total_completed": total,
	})
}

// computeStreak counts consecutive days (ending today or yesterday) with any routine.
func computeStreak(dates []string) int {
	set := map[string]bool{}
	for _, d := range dates {
		if len(d) >= 10 {
			set[d[:10]] = true
		}
	}
	if len(set) == 0 {
		return 0
	}

	now := time.Now()
	cur := now
	if !set[cur.Format("2006-01-02")] {
		// grace: allow streak to count if completed yesterday
		cur = now.AddDate(0, 0, -1)
		if !set[cur.Format("2006-01-02")] {
			return 0
		}
	}

	streak := 0
	for set[cur.Format("2006-01-02")] {
		streak++
		cur = cur.AddDate(0, 0, -1)
	}
	return streak
}
