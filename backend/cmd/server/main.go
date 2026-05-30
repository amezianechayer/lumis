package main

import (
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
	"github.com/lumis/backend/config"
	"github.com/lumis/backend/internal/handlers"
	"github.com/lumis/backend/internal/middleware"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
	"github.com/lumis/backend/internal/services"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load .env in development
	if os.Getenv("ENV") != "production" {
		_ = godotenv.Load()
	}

	cfg := config.Load()

	// Logger
	var logger *zap.Logger
	var err error
	if cfg.Env == "production" {
		logger, err = zap.NewProduction()
	} else {
		logger, err = zap.NewDevelopment()
	}
	if err != nil {
		log.Fatal("failed to init logger:", err)
	}
	defer logger.Sync()

	// Database
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}
	logger.Info("database connected")

	// Auto-migrate models (supplements SQL migrations)
	if err := db.AutoMigrate(&models.User{}, &models.RefreshToken{}, &models.FaceProfile{}, &models.Recommendation{}, &models.SkinScan{}, &models.CoachConversation{}, &models.CoachMessage{}, &models.ScannedProduct{}); err != nil {
		logger.Fatal("automigrate failed", zap.Error(err))
	}

	// Redis
	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		logger.Fatal("invalid redis URL", zap.Error(err))
	}
	rdb := redis.NewClient(redisOpts)

	// Repositories
	userRepo := repository.NewUserRepository(db)
	tokenRepo := repository.NewTokenRepository(db)
	faceProfileRepo := repository.NewFaceProfileRepository(db)
	recRepo := repository.NewRecommendationRepository(db)
	skinScanRepo := repository.NewSkinScanRepository(db)
	coachRepo := repository.NewCoachRepository(db)
	productRepo := repository.NewScannedProductRepository(db)

	// Services
	authSvc := services.NewAuthService(userRepo, tokenRepo, cfg)
	storageSvc := services.NewStorageService(cfg.R2AccountID, cfg.R2AccessKey, cfg.R2SecretKey, cfg.R2Bucket, cfg.R2Endpoint)
	stripeSvc := services.NewStripeService(cfg.StripeSecretKey, cfg.StripeWebhookSecret, cfg.StripePremiumPriceID, userRepo)
	faceAnalysisSvc := services.NewFaceAnalysisService(faceProfileRepo, cfg.GroqAPIKey)
	recSvc := services.NewRecommendationService(recRepo, faceProfileRepo, userRepo, skinScanRepo, cfg.GroqAPIKey)
	skinScanSvc := services.NewSkinScanService(skinScanRepo, cfg.GroqAPIKey, storageSvc)
	coachSvc := services.NewCoachService(coachRepo, userRepo, skinScanRepo, faceProfileRepo, cfg.GroqAPIKey)
	productSvc := services.NewProductService(productRepo, skinScanRepo, userRepo, cfg.GroqAPIKey)

	// Handlers
	authHandler := handlers.NewAuthHandler(authSvc)
	userHandler := handlers.NewUserHandler(userRepo)
	analysisHandler := handlers.NewAnalysisHandler(faceAnalysisSvc, faceProfileRepo)
	recHandler := handlers.NewRecommendationHandler(recSvc)
	skinScanHandler := handlers.NewSkinScanHandler(skinScanSvc, skinScanRepo, userRepo, cfg.FreeScanLimit)
	coachHandler := handlers.NewCoachHandler(coachSvc, coachRepo, userRepo, cfg.FreeCoachDailyLimit)
	productHandler := handlers.NewProductHandler(productSvc)
	stripeHandler := handlers.NewStripeHandler(stripeSvc, userRepo)

	// Middleware
	rateLimiter := middleware.NewRateLimiter(rdb)

	// Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			var e *fiber.Error
			if errors.As(err, &e) {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PATCH, DELETE, OPTIONS",
	}))
	app.Use(middleware.Logger(logger))
	app.Use(rateLimiter.PerIP(100, 60*1000000000)) // 100 req/min per IP

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		sqlDB, err := db.DB()
		dbOK := err == nil && sqlDB.Ping() == nil

		return c.JSON(fiber.Map{
			"status":   "ok",
			"database": map[bool]string{true: "ok", false: "error"}[dbOK],
			"version":  "1.0.0",
		})
	})

	// API v1
	v1 := app.Group("/api/v1")

	// Auth (public)
	auth := v1.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Post("/logout", authHandler.Logout)

	// Protected routes
	protected := v1.Group("", middleware.Auth(authSvc))

	me := protected.Group("/me")
	me.Get("/", userHandler.GetMe)
	me.Patch("/", userHandler.UpdateMe)
	me.Delete("/", userHandler.DeleteMe)

	// Face analysis
	analysis := protected.Group("/analysis")
	analysis.Post("/face", analysisHandler.AnalyzeFace)
	analysis.Get("/face/latest", analysisHandler.GetLatest)
	analysis.Get("/face/history", analysisHandler.GetHistory)
	analysis.Get("/face/:id", analysisHandler.GetByID)

	// Skin scan
	analysis.Post("/skin", skinScanHandler.Analyze)
	analysis.Get("/skin/latest", skinScanHandler.GetLatest)
	analysis.Get("/skin/history", skinScanHandler.GetHistory)

	// AI Coach
	coach := protected.Group("/coach")
	coach.Post("/conversations", coachHandler.CreateConversation)
	coach.Get("/conversations", coachHandler.ListConversations)
	coach.Get("/conversations/:id", coachHandler.GetConversation)
	coach.Post("/conversations/:id/messages", coachHandler.SendMessage)
	coach.Delete("/conversations/:id", coachHandler.DeleteConversation)

	// Products (barcode scan)
	products := protected.Group("/products")
	products.Post("/scan", productHandler.Scan)
	products.Get("/history", productHandler.GetHistory)

	// Recommendations
	recs := protected.Group("/recommendations")
	recs.Get("/", recHandler.List)
	recs.Post("/generate", recHandler.Generate)
	recs.Get("/:id", recHandler.GetByID)

	// Stripe
	stripeGroup := protected.Group("/stripe")
	stripeGroup.Post("/checkout", stripeHandler.CreateCheckout)
	stripeGroup.Get("/status", stripeHandler.GetStatus)

	// Stripe webhook (no auth)
	v1.Post("/webhook/stripe", stripeHandler.Webhook)

	addr := fmt.Sprintf(":%s", cfg.Port)
	logger.Info("server starting", zap.String("addr", addr))
	if err := app.Listen(addr); err != nil {
		logger.Fatal("server failed", zap.Error(err))
	}
}
