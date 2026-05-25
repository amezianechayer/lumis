package handlers

import (
	"errors"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/lumis/backend/internal/services"
)

type AuthHandler struct {
	authSvc  *services.AuthService
	validate *validator.Validate
}

func NewAuthHandler(authSvc *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authSvc:  authSvc,
		validate: validator.New(),
	}
}

// POST /api/v1/auth/register
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var input services.RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.validate.Struct(input); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "validation failed",
			"fields": formatValidationErrors(err),
		})
	}

	user, pair, err := h.authSvc.Register(c.Context(), input)
	if errors.Is(err, services.ErrEmailTaken) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email already registered"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "registration failed"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"user":   user,
		"tokens": pair,
	})
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var input services.LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.validate.Struct(input); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "validation failed",
			"fields": formatValidationErrors(err),
		})
	}

	user, pair, err := h.authSvc.Login(c.Context(), input)
	if errors.Is(err, services.ErrInvalidCreds) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid email or password"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "login failed"})
	}

	return c.JSON(fiber.Map{
		"user":   user,
		"tokens": pair,
	})
}

// POST /api/v1/auth/refresh
func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var body struct {
		RefreshToken string `json:"refresh_token" validate:"required"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.validate.Struct(body); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "refresh_token is required"})
	}

	pair, err := h.authSvc.Refresh(c.Context(), body.RefreshToken)
	if errors.Is(err, services.ErrInvalidToken) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid or expired refresh token"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token refresh failed"})
	}

	return c.JSON(fiber.Map{"tokens": pair})
}

// POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var body struct {
		RefreshToken string `json:"refresh_token" validate:"required"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	_ = h.authSvc.Logout(c.Context(), body.RefreshToken)
	return c.JSON(fiber.Map{"message": "logged out successfully"})
}

func formatValidationErrors(err error) map[string]string {
	fields := make(map[string]string)
	var ve validator.ValidationErrors
	if errors.As(err, &ve) {
		for _, fe := range ve {
			fields[fe.Field()] = fe.Tag()
		}
	}
	return fields
}
