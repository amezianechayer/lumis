package config

import (
	"os"
	"strconv"
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
	JWTRefreshSecret string
	JWTExpiry        time.Duration
	JWTRefreshExpiry time.Duration

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

	// Rate limiting (requests per day)
	FreeAnalysisLimit    int
	PremiumAnalysisLimit int
}

func Load() *Config {
	return &Config{
		Port:                 getEnv("PORT", "8080"),
		Env:                  getEnv("ENV", "development"),
		DatabaseURL:          mustEnv("DATABASE_URL"),
		RedisURL:             getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:            mustEnv("JWT_SECRET"),
		JWTRefreshSecret:     mustEnv("JWT_REFRESH_SECRET"),
		JWTExpiry:            time.Duration(getEnvInt("JWT_EXPIRY_MINUTES", 15)) * time.Minute,
		JWTRefreshExpiry:     time.Duration(getEnvInt("JWT_REFRESH_EXPIRY_DAYS", 30)) * 24 * time.Hour,
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
		FreeAnalysisLimit:    getEnvInt("FREE_ANALYSIS_LIMIT", 10),
		PremiumAnalysisLimit: getEnvInt("PREMIUM_ANALYSIS_LIMIT", 50),
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

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
