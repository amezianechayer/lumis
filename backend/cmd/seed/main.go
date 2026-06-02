package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
	"github.com/lumis/backend/internal/services"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatal("db connect:", err)
	}

	// Auto-migrate
	if err := db.AutoMigrate(
		&models.User{},
		&models.RefreshToken{},
		&models.FaceProfile{},
		&models.Recommendation{},
	); err != nil {
		log.Fatal("migrate:", err)
	}
	fmt.Println("✓ Migrations OK")

	ctx := context.Background()

	userRepo := repository.NewUserRepository(db)
	profileRepo := repository.NewFaceProfileRepository(db)
	recRepo := repository.NewRecommendationRepository(db)
	recSvc := services.NewRecommendationService(recRepo, profileRepo, userRepo, nil, nil, "", nil)

	// ─── Seed users ───────────────────────────────────────────────────
	users := []struct {
		email    string
		name     string
		gender   string
		skinTone string
		shape    string
		season   string
	}{
		{"sophie@lumis.test", "Sophie", "female", "fitzpatrick_2", "oval", "spring"},
		{"karim@lumis.test", "Karim", "male", "fitzpatrick_4", "square", "autumn"},
		{"lea@lumis.test", "Léa", "female", "fitzpatrick_1", "heart", "winter"},
		{"adam@lumis.test", "Adam", "male", "fitzpatrick_5", "round", "summer"},
	}

	for _, u := range users {
		existing, _ := userRepo.FindByEmail(ctx, u.email)
		if existing != nil {
			fmt.Printf("  skip existing user %s\n", u.email)
			continue
		}

		hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		name := u.name
		gender := u.gender
		user := &models.User{
			ID:           uuid.New(),
			Email:        u.email,
			PasswordHash: string(hash),
			FullName:     &name,
			Gender:       &gender,
			Goals:        pq.StringArray{"makeup", "haircut", "color_season"},
		}
		if err := userRepo.Create(ctx, user); err != nil {
			log.Printf("  ERROR creating user %s: %v\n", u.email, err)
			continue
		}
		fmt.Printf("  ✓ user %s created (id=%s)\n", u.email, user.ID)

		// Face profile for this user
		profile := &models.FaceProfile{
			ID:                     uuid.New(),
			UserID:                 user.ID,
			PhotoURL:               "pending",
			FaceShape:              u.shape,
			FaceShapeConfidence:    0.87,
			EyeShape:               "almond",
			EyeDistance:            "normal",
			SkinTone:               u.skinTone,
			Undertone:              undertoneFor(u.season),
			ColorSeason:            u.season,
			NoseShape:              "straight",
			LipShape:               "full",
			JawType:                "defined",
			BeardRecommendations:   pq.StringArray{"stubble", "full beard"},
			HaircutRecommendations: pq.StringArray{"undercut", "textured crop"},
			AnalysisVersion:        "1.0",
		}
		if err := profileRepo.Create(ctx, profile); err != nil {
			log.Printf("  ERROR creating profile: %v\n", err)
			continue
		}
		fmt.Printf("    ✓ face profile: shape=%s season=%s\n", u.shape, u.season)

		// Generate recommendations
		recs, err := recSvc.Generate(ctx, user.ID)
		if err != nil {
			log.Printf("  ERROR generating recs: %v\n", err)
			continue
		}
		fmt.Printf("    ✓ %d recommendations generated\n", len(recs))

		time.Sleep(10 * time.Millisecond)
	}

	fmt.Println("\n✅ Seed terminé.")
	fmt.Println("   Connexion test : POST http://localhost:8080/api/v1/auth/login")
	fmt.Println("   Email  : sophie@lumis.test  |  karim@lumis.test")
	fmt.Println("   Mot de passe : password123")
}

func undertoneFor(season string) string {
	switch season {
	case "spring", "autumn":
		return "warm"
	case "summer":
		return "cool"
	case "winter":
		return "cool"
	}
	return "neutral"
}
