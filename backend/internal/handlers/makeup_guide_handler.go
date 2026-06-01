package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/lumis/backend/internal/services"
)

type MakeupGuideHandler struct {
	svc *services.MakeupGuideService
}

func NewMakeupGuideHandler(svc *services.MakeupGuideService) *MakeupGuideHandler {
	return &MakeupGuideHandler{svc: svc}
}

// GET /api/v1/makeup-guide
func (h *MakeupGuideHandler) Get(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	guide, err := h.svc.Generate(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"guide": guide})
}
