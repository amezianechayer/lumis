package middleware

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

type RateLimiter struct {
	rdb *redis.Client
}

func NewRateLimiter(rdb *redis.Client) *RateLimiter {
	return &RateLimiter{rdb: rdb}
}

// PerIP limits requests per IP per minute window.
func (rl *RateLimiter) PerIP(limit int, window time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		key := fmt.Sprintf("ratelimit:ip:%s", c.IP())
		return rl.check(c, key, limit, window)
	}
}

// PerUser limits requests per authenticated user per day for AI features.
func (rl *RateLimiter) PerUser(limit int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals(UserIDKey).(string)
		if !ok || userID == "" {
			return c.Next()
		}

		now := time.Now()
		key := fmt.Sprintf("ratelimit:user:%s:day:%s", userID, now.Format("2006-01-02"))
		return rl.check(c, key, limit, 24*time.Hour)
	}
}

func (rl *RateLimiter) check(c *fiber.Ctx, key string, limit int, window time.Duration) error {
	ctx := context.Background()
	pipe := rl.rdb.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, window)

	if _, err := pipe.Exec(ctx); err != nil {
		// Fail open: if Redis is down, allow the request
		return c.Next()
	}

	count := incr.Val()
	c.Set("X-RateLimit-Limit", strconv.Itoa(limit))
	c.Set("X-RateLimit-Remaining", strconv.Itoa(max(0, limit-int(count))))

	if int(count) > limit {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error": "rate limit exceeded, try again later",
		})
	}
	return c.Next()
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
