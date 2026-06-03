package handlers

import (
	"errors"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/lumis/backend/internal/middleware"
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
	if errors.Is(err, services.ErrWeakPassword) {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "password must be at least 8 characters and include letters and numbers",
			"fields": map[string]string{"Password": "weak"},
		})
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
	if errors.Is(err, services.ErrTooManyAttempts) {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "too many login attempts, please try again later"})
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
	if errors.Is(err, services.ErrInvalidToken) || errors.Is(err, services.ErrTokenReuse) || errors.Is(err, services.ErrAccountNotFound) {
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

// POST /api/v1/auth/guest
func (h *AuthHandler) Guest(c *fiber.Ctx) error {
	user, pair, err := h.authSvc.CreateGuest(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not create guest session"})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"user": user, "tokens": pair})
}

// POST /api/v1/auth/apple
func (h *AuthHandler) Apple(c *fiber.Ctx) error {
	var body struct {
		IdentityToken string `json:"identity_token" validate:"required"`
		FullName      string `json:"full_name"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.validate.Struct(body); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "identity_token is required"})
	}

	user, pair, err := h.authSvc.LoginWithApple(c.Context(), body.IdentityToken, body.FullName)
	if errors.Is(err, services.ErrInvalidIDToken) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid Apple credentials"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Apple sign-in failed"})
	}

	return c.JSON(fiber.Map{"user": user, "tokens": pair})
}

// POST /api/v1/auth/google
func (h *AuthHandler) Google(c *fiber.Ctx) error {
	var body struct {
		IDToken string `json:"id_token" validate:"required"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.validate.Struct(body); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "id_token is required"})
	}

	user, pair, err := h.authSvc.LoginWithGoogle(c.Context(), body.IDToken)
	if errors.Is(err, services.ErrInvalidIDToken) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid Google credentials"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Google sign-in failed"})
	}

	return c.JSON(fiber.Map{"user": user, "tokens": pair})
}

// POST /api/v1/auth/forgot-password
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var body struct {
		Email string `json:"email" validate:"required,email"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.validate.Struct(body); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "a valid email is required"})
	}

	// Always return 200 to avoid leaking whether the email is registered.
	_ = h.authSvc.RequestPasswordReset(c.Context(), body.Email)
	return c.JSON(fiber.Map{"message": "if the email exists, a reset link has been sent"})
}

// POST /api/v1/auth/reset-password
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var body struct {
		Token    string `json:"token"    validate:"required"`
		Password string `json:"password" validate:"required,min=8,max=72"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.validate.Struct(body); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "token and a valid password are required"})
	}

	err := h.authSvc.ResetPassword(c.Context(), body.Token, body.Password)
	if errors.Is(err, services.ErrWeakPassword) {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "password must be at least 8 characters and include letters and numbers",
		})
	}
	if errors.Is(err, services.ErrInvalidToken) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid or expired reset link"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "password reset failed"})
	}

	return c.JSON(fiber.Map{"message": "password updated, please sign in again"})
}

// POST /api/v1/auth/verify-email
func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	var body struct {
		Token string `json:"token" validate:"required"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.validate.Struct(body); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "token is required"})
	}

	err := h.authSvc.VerifyEmail(c.Context(), body.Token)
	if errors.Is(err, services.ErrInvalidToken) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid or expired verification link"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "email verification failed"})
	}

	return c.JSON(fiber.Map{"message": "email verified"})
}

// POST /api/v1/me/upgrade (protected) — guest → real account
func (h *AuthHandler) Upgrade(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals(middleware.UserIDKey).(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var body struct {
		Email    string `json:"email"     validate:"required,email,max=255"`
		Password string `json:"password"  validate:"required,min=8,max=72"`
		FullName string `json:"full_name" validate:"omitempty,max=100"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.validate.Struct(body); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "validation failed",
			"fields": formatValidationErrors(err),
		})
	}

	user, err := h.authSvc.UpgradeGuest(c.Context(), userID, body.Email, body.Password, body.FullName)
	if errors.Is(err, services.ErrWeakPassword) {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "password must be at least 8 characters and include letters and numbers",
			"fields": map[string]string{"Password": "weak"},
		})
	}
	if errors.Is(err, services.ErrEmailTaken) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email already registered"})
	}
	if errors.Is(err, services.ErrAlreadyRegistered) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "account already registered"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "account upgrade failed"})
	}

	return c.JSON(fiber.Map{"user": user})
}

// POST /api/v1/me/send-verification (protected)
func (h *AuthHandler) SendVerification(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals(middleware.UserIDKey).(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	if err := h.authSvc.ResendVerification(c.Context(), userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not send verification email"})
	}
	return c.JSON(fiber.Map{"message": "verification email sent"})
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
