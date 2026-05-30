package handlers

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/lumis/backend/internal/middleware"
	"github.com/lumis/backend/internal/repository"
	"github.com/lumis/backend/internal/services"
)

type AnalysisHandler struct {
	faceSvc  *services.FaceAnalysisService
	faceRepo *repository.FaceProfileRepository
	validate *validator.Validate
}

func NewAnalysisHandler(faceSvc *services.FaceAnalysisService, faceRepo *repository.FaceProfileRepository) *AnalysisHandler {
	return &AnalysisHandler{
		faceSvc:  faceSvc,
		faceRepo: faceRepo,
		validate: validator.New(),
	}
}

// POST /api/v1/analysis/face
func (h *AnalysisHandler) AnalyzeFace(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals(middleware.UserIDKey).(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var input services.FaceAnalysisInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if input.PhotoBase64 == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "photo_base64 is required"})
	}

	profile, err := h.faceSvc.Analyze(c.Context(), userID, input)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "face analysis failed"})
	}

	// Strip raw landmarks from response to reduce payload
	profile.Landmarks = nil

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"face_profile": profile})
}

// GET /api/v1/analysis/face/latest
func (h *AnalysisHandler) GetLatest(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	profile, err := h.faceRepo.FindLatestByUser(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	if profile == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no face analysis found"})
	}

	profile.Landmarks = nil
	return c.JSON(fiber.Map{"face_profile": profile})
}

// GET /api/v1/analysis/face/:id
func (h *AnalysisHandler) GetByID(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	profileID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	profile, err := h.faceRepo.FindByID(c.Context(), profileID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	if profile == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "face profile not found"})
	}

	profile.Landmarks = nil
	return c.JSON(fiber.Map{"face_profile": profile})
}

// GET /api/v1/analysis/face/history
func (h *AnalysisHandler) GetHistory(c *fiber.Ctx) error {
	userID, err := parseUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	profiles, err := h.faceRepo.FindHistoryByUser(c.Context(), userID, 20)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	// Strip landmarks from list
	for i := range profiles {
		profiles[i].Landmarks = nil
	}

	return c.JSON(fiber.Map{"face_profiles": profiles})
}

func parseUserID(c *fiber.Ctx) (uuid.UUID, error) {
	s, ok := c.Locals(middleware.UserIDKey).(string)
	if !ok {
		return uuid.Nil, fiber.ErrUnauthorized
	}
	return uuid.Parse(s)
}
