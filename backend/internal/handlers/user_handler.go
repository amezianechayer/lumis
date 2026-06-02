package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/lumis/backend/internal/middleware"
	"github.com/lumis/backend/internal/repository"
)

type UserHandler struct {
	userRepo *repository.UserRepository
}

func NewUserHandler(userRepo *repository.UserRepository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

// GET /api/v1/me
func (h *UserHandler) GetMe(c *fiber.Ctx) error {
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

	return c.JSON(fiber.Map{"user": user})
}

// PATCH /api/v1/me
func (h *UserHandler) UpdateMe(c *fiber.Ctx) error {
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

	var body struct {
		FullName    *string    `json:"full_name"`
		Username    *string    `json:"username"`
		Gender      *string    `json:"gender"`
		Goals       []string   `json:"goals"`
		SkinType    *string    `json:"skin_type"`
		DateOfBirth *time.Time `json:"date_of_birth"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if body.FullName != nil {
		user.FullName = body.FullName
	}
	if body.Username != nil {
		user.Username = body.Username
	}
	if body.Gender != nil {
		user.Gender = body.Gender
	}
	if body.Goals != nil {
		user.Goals = body.Goals
	}
	if body.SkinType != nil {
		user.SkinType = body.SkinType
	}
	if body.DateOfBirth != nil {
		user.DateOfBirth = body.DateOfBirth
	}

	if err := h.userRepo.Update(c.Context(), user); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update failed"})
	}

	return c.JSON(fiber.Map{"user": user})
}

// DELETE /api/v1/me
func (h *UserHandler) DeleteMe(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals(middleware.UserIDKey).(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	if err := h.userRepo.SoftDelete(c.Context(), userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "deletion failed"})
	}

	return c.JSON(fiber.Map{"message": "account deleted"})
}
