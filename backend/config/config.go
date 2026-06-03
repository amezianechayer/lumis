package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	// Server
	Port string
	Env  string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// JWT
	JWTSecret        string
	JWTExpiry        time.Duration
	JWTRefreshExpiry time.Duration

	// Security
	CORSAllowedOrigins string

	// Social login (id token audiences accepted from the apps)
	AppleClientIDs  []string
	GoogleClientIDs []string

	// Email (transactional — password reset / verification)
	ResendAPIKey string
	EmailFrom    string
	// AppURL is the base used to build links in emails. When empty we fall back
	// to the app's custom scheme deep link (lumis://...).
	AppURL string

	// AI
	GroqAPIKey      string
	GeminiAPIKey    string
	ReplicateToken  string

	// Cloudflare R2
	R2AccountID  string
	R2AccessKey  string
	R2SecretKey  string
	R2Bucket     string
	R2Endpoint   string

	// Stripe
	StripeSecretKey      string
	StripeWebhookSecret  string
	StripePremiumPriceID string

	FreeScanLimit       int
	FreeCoachDailyLimit int
}

func Load() *Config {
	return &Config{
		Port:                 getEnv("PORT", "8080"),
		Env:                  getEnv("ENV", "development"),
		DatabaseURL:          mustEnv("DATABASE_URL"),
		RedisURL:             getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:            mustEnv("JWT_SECRET"),
		JWTExpiry:            time.Duration(getEnvInt("JWT_EXPIRY_MINUTES", 15)) * time.Minute,
		JWTRefreshExpiry:     time.Duration(getEnvInt("JWT_REFRESH_EXPIRY_DAYS", 30)) * 24 * time.Hour,
		CORSAllowedOrigins:   getEnv("CORS_ALLOWED_ORIGINS", "*"),
		AppleClientIDs:       splitCSV(getEnv("APPLE_CLIENT_IDS", "com.lumis.app")),
		GoogleClientIDs:      splitCSV(getEnv("GOOGLE_CLIENT_IDS", "")),
		ResendAPIKey:         getEnv("RESEND_API_KEY", ""),
		EmailFrom:            getEnv("EMAIL_FROM", "Lumis <onboarding@resend.dev>"),
		AppURL:               getEnv("APP_URL", ""),
		GroqAPIKey:           getEnv("GROQ_API_KEY", ""),
		GeminiAPIKey:         getEnv("GEMINI_API_KEY", ""),
		ReplicateToken:       getEnv("REPLICATE_API_TOKEN", ""),
		R2AccountID:          getEnv("CLOUDFLARE_R2_ACCOUNT_ID", ""),
		R2AccessKey:          getEnv("CLOUDFLARE_R2_ACCESS_KEY", ""),
		R2SecretKey:          getEnv("CLOUDFLARE_R2_SECRET_KEY", ""),
		R2Bucket:             getEnv("CLOUDFLARE_R2_BUCKET", "lumis-photos"),
		R2Endpoint:           getEnv("CLOUDFLARE_R2_ENDPOINT", ""),
		StripeSecretKey:      getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret:  getEnv("STRIPE_WEBHOOK_SECRET", ""),
		StripePremiumPriceID: getEnv("STRIPE_PREMIUM_PRICE_ID", ""),
		FreeScanLimit:       getEnvInt("FREE_SCAN_LIMIT", 3),
		FreeCoachDailyLimit: getEnvInt("FREE_COACH_DAILY_LIMIT", 10),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("required env var missing: " + key)
	}
	return v
}

// splitCSV parses a comma-separated env value into a trimmed, non-empty slice.
func splitCSV(v string) []string {
	if v == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if s := strings.TrimSpace(p); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
