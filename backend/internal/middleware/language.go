package middleware

import "github.com/gofiber/fiber/v2"

// LangCtxKey is the key under which the client's language is stored on the
// request context (read by AI services to generate content in that language).
const LangCtxKey = "lang"

// Language reads the X-Lang header (fr|en|ar) and stores it on the request
// context. Defaults to "fr".
func Language() fiber.Handler {
	return func(c *fiber.Ctx) error {
		lang := c.Get("X-Lang")
		switch lang {
		case "en", "ar", "fr":
		default:
			lang = "fr"
		}
		c.Context().SetUserValue(LangCtxKey, lang)
		return c.Next()
	}
}
