package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/lumis/backend/internal/services"
)

type RecommendationHandler struct {
	svc *services.RecommendationService
}

func NewRecommendationHandler(svc *services.RecommendationService) *RecommendationHandler {
	return &RecommendationHandler{svc: svc}
}

// GET /api/v1/recommendations?type=grooming&occasion=daily
func (h *RecommendationHandler) List(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	recType := c.Query("type")
	occasion := c.Query("occasion")

	recs, err := h.svc.GetOrGenerate(c.Context(), userID, recType, occasion)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(fiber.Map{"recommendations": recs})
}

// POST /api/v1/recommendations/generate
func (h *RecommendationHandler) Generate(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	recs, err := h.svc.Generate(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"recommendations": recs})
}

// GET /api/v1/recommendations/:id
func (h *RecommendationHandler) GetByID(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid id")
	}

	rec, err := h.svc.GetByID(c.Context(), id, userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	if rec == nil {
		return fiber.NewError(fiber.StatusNotFound, "recommendation not found")
	}
	return c.JSON(rec)
}
