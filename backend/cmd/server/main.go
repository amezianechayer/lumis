package main

import (
	"errors"
	"fmt"
	"log"
	"os"
	"time"

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
	if err := db.AutoMigrate(&models.User{}, &models.RefreshToken{}, &models.AuthToken{}, &models.FaceProfile{}, &models.Recommendation{}, &models.SkinScan{}, &models.CoachConversation{}, &models.CoachMessage{}, &models.ScannedProduct{}, &models.RoutineLog{}, &models.CycleData{}); err != nil {
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
	authTokenRepo := repository.NewAuthTokenRepository(db)
	faceProfileRepo := repository.NewFaceProfileRepository(db)
	recRepo := repository.NewRecommendationRepository(db)
	skinScanRepo := repository.NewSkinScanRepository(db)
	coachRepo := repository.NewCoachRepository(db)
	productRepo := repository.NewScannedProductRepository(db)
	routineRepo := repository.NewRoutineRepository(db)
	cycleRepo := repository.NewCycleRepository(db)

	// Services
	emailSender := services.NewEmailSender(cfg.ResendAPIKey, cfg.EmailFrom, logger)
	authSvc := services.NewAuthService(userRepo, tokenRepo, authTokenRepo, emailSender, rdb, cfg)
	storageSvc := services.NewStorageService(cfg.R2AccountID, cfg.R2AccessKey, cfg.R2SecretKey, cfg.R2Bucket, cfg.R2Endpoint)
	stripeSvc := services.NewStripeService(cfg.StripeSecretKey, cfg.StripeWebhookSecret, cfg.StripePremiumPriceID, userRepo)
	faceAnalysisSvc := services.NewFaceAnalysisService(faceProfileRepo, cfg.GroqAPIKey)
	cycleSvc := services.NewCycleService(cycleRepo)
	routineSvc := services.NewRoutineService(routineRepo)
	recSvc := services.NewRecommendationService(recRepo, faceProfileRepo, userRepo, skinScanRepo, productRepo, cycleSvc, cfg.GroqAPIKey, rdb)
	skinScanSvc := services.NewSkinScanService(skinScanRepo, cfg.GroqAPIKey, storageSvc)
	coachSvc := services.NewCoachService(coachRepo, userRepo, skinScanRepo, faceProfileRepo, productRepo, cycleSvc, routineSvc, cfg.GroqAPIKey)
	productSvc := services.NewProductService(productRepo, skinScanRepo, userRepo, cfg.GroqAPIKey)
	makeupGuideSvc := services.NewMakeupGuideService(faceProfileRepo, skinScanRepo, userRepo, cfg.GroqAPIKey, rdb)

	// Handlers
	authHandler := handlers.NewAuthHandler(authSvc)
	userHandler := handlers.NewUserHandler(userRepo)
	analysisHandler := handlers.NewAnalysisHandler(faceAnalysisSvc, faceProfileRepo)
	recHandler := handlers.NewRecommendationHandler(recSvc)
	skinScanHandler := handlers.NewSkinScanHandler(skinScanSvc, skinScanRepo, userRepo, recSvc, makeupGuideSvc, cfg.FreeScanLimit)
	coachHandler := handlers.NewCoachHandler(coachSvc, coachRepo, userRepo, cfg.FreeCoachDailyLimit)
	productHandler := handlers.NewProductHandler(productSvc)
	makeupGuideHandler := handlers.NewMakeupGuideHandler(makeupGuideSvc)
	routineHandler := handlers.NewRoutineHandler(routineSvc)
	cycleHandler := handlers.NewCycleHandler(cycleSvc)
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
		AllowOrigins: cfg.CORSAllowedOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-Lang",
		AllowMethods: "GET, POST, PATCH, DELETE, OPTIONS",
	}))
	app.Use(middleware.Logger(logger))
	app.Use(middleware.Language()) // store X-Lang on the request context for AI services
	app.Use(rateLimiter.PerIP(100, time.Minute)) // 100 req/min per IP

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

	// Auth (public) — tighter per-IP limit to slow credential-stuffing/brute-force
	auth := v1.Group("/auth", rateLimiter.PerIPScoped("auth", 20, time.Minute))
	auth.Post("/register", authHandler.Register)
	auth.Post("/guest", authHandler.Guest)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Post("/logout", authHandler.Logout)
	auth.Post("/forgot-password", authHandler.ForgotPassword)
	auth.Post("/reset-password", authHandler.ResetPassword)
	auth.Post("/verify-email", authHandler.VerifyEmail)
	auth.Post("/apple", authHandler.Apple)
	auth.Post("/google", authHandler.Google)

	// Protected routes
	protected := v1.Group("", middleware.Auth(authSvc))

	me := protected.Group("/me")
	me.Get("/", userHandler.GetMe)
	me.Patch("/", userHandler.UpdateMe)
	me.Delete("/", userHandler.DeleteMe)
	me.Post("/send-verification", authHandler.SendVerification)
	me.Post("/upgrade", authHandler.Upgrade)

	// Face analysis
	analysis := protected.Group("/analysis")
	analysis.Post("/face", analysisHandler.AnalyzeFace)
	analysis.Get("/face/latest", analysisHandler.GetLatest)
	analysis.Get("/face/history", analysisHandler.GetHistory)
	analysis.Get("/face/:id", analysisHandler.GetByID)
	analysis.Post("/color-quiz", analysisHandler.SaveColorQuiz)

	// Skin scan
	analysis.Post("/skin", skinScanHandler.Analyze)
	analysis.Get("/skin/latest", skinScanHandler.GetLatest)
	analysis.Get("/skin/history", skinScanHandler.GetHistory)
	analysis.Get("/skin/:id", skinScanHandler.GetByID)

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
	products.Post("/inci-ai", productHandler.AnalyzeInci)
	products.Post("/inci-save", productHandler.SaveInci)
	products.Get("/history", productHandler.GetHistory)

	// Recommendations
	recs := protected.Group("/recommendations")
	recs.Get("/", recHandler.List)
	recs.Post("/generate", recHandler.Generate)
	recs.Get("/:id", recHandler.GetByID)

	// Makeup guide (AI-personalized)
	protected.Get("/makeup-guide", makeupGuideHandler.Get)

	// Daily routine + streak
	routine := protected.Group("/routine")
	routine.Get("/status", routineHandler.Status)
	routine.Get("/week", routineHandler.Week)
	routine.Post("/complete", routineHandler.Complete)
	routine.Delete("/complete", routineHandler.Uncomplete)

	// Menstrual cycle → skin
	protected.Get("/cycle", cycleHandler.Get)
	protected.Post("/cycle", cycleHandler.Save)

	// Stripe / Premium
	stripeGroup := protected.Group("/stripe")
	stripeGroup.Post("/checkout", stripeHandler.CreateCheckout)
	stripeGroup.Get("/status", stripeHandler.GetStatus)

	// RevenueCat — activate premium after in-app purchase
	protected.Post("/premium/activate", stripeHandler.ActivatePremium)
	protected.Get("/premium/status", stripeHandler.GetStatus)

	// Stripe webhook (no auth)
	v1.Post("/webhook/stripe", stripeHandler.Webhook)

	addr := fmt.Sprintf(":%s", cfg.Port)
	logger.Info("server starting", zap.String("addr", addr))
	if err := app.Listen(addr); err != nil {
		logger.Fatal("server failed", zap.Error(err))
	}
}
