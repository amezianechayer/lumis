package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/lumis/backend/internal/services"
)

const UserIDKey = "userID"
const ClaimsKey = "claims"

func Auth(authSvc *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing authorization header"})
		}

		token := strings.TrimPrefix(header, "Bearer ")
		claims, err := authSvc.ValidateAccessToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid or expired token"})
		}

		c.Locals(UserIDKey, claims.UserID)
		c.Locals(ClaimsKey, claims)
		return c.Next()
	}
}
