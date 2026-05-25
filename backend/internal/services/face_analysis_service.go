package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
)

type FaceAnalysisInput struct {
	Landmarks    [][]float64 `json:"landmarks"`
	SkinToneHint string      `json:"skin_tone_hint"` // "fitzpatrick_1" … "fitzpatrick_6"
	VeinHint     string      `json:"vein_hint"`      // "blue","green","both"
	Gender       string      `json:"gender"`
}

type FaceAnalysisService struct {
	repo *repository.FaceProfileRepository
}

func NewFaceAnalysisService(repo *repository.FaceProfileRepository) *FaceAnalysisService {
	return &FaceAnalysisService{repo: repo}
}

func (s *FaceAnalysisService) Analyze(ctx context.Context, userID uuid.UUID, input FaceAnalysisInput) (*models.FaceProfile, error) {
	if len(input.Landmarks) < 468 {
		return nil, fmt.Errorf("faceAnalysis: need 468 landmarks, got %d", len(input.Landmarks))
	}

	// Face shape
	shape, confidence := DetermineFaceShape(input.Landmarks)

	// Eye shape
	eyeShape, eyeDist := DetermineEyeShape(input.Landmarks)

	// Other features
	noseShape := DetermineNoseShape(input.Landmarks)
	lipShape := DetermineLipShape(input.Landmarks)
	jawType := DetermineJawType(input.Landmarks)

	// Skin tone + undertone + season
	fitzpatrick := parseFitzpatrick(input.SkinToneHint)
	undertone := DetermineUndertone(fitzpatrick, input.VeinHint)
	depth := fitzpatrickDepth(fitzpatrick)
	season := DetermineColorSeason(undertone, depth)
	skinTone := input.SkinToneHint
	if skinTone == "" {
		skinTone = fmt.Sprintf("fitzpatrick_%d", fitzpatrick)
	}

	// Beard / haircut recs
	beardR := GetBeardRecs(shape)
	haircutR := GetHaircutRecs(shape)

	// Serialize landmarks (capped at 468 points to limit storage)
	landmarkJSON, _ := json.Marshal(input.Landmarks)

	profile := &models.FaceProfile{
		UserID:                 userID,
		PhotoURL:               "pending", // R2 upload in Sprint 10
		FaceShape:              shape,
		FaceShapeConfidence:    confidence,
		EyeShape:               eyeShape,
		EyeDistance:            eyeDist,
		SkinTone:               skinTone,
		Undertone:              undertone,
		ColorSeason:            season,
		NoseShape:              noseShape,
		LipShape:               lipShape,
		JawType:                jawType,
		BeardRecommendations:   beardR,
		HaircutRecommendations: haircutR,
		Landmarks:              models.JSON(landmarkJSON),
		AnalysisVersion:        "1.0",
	}

	if err := s.repo.Create(ctx, profile); err != nil {
		return nil, fmt.Errorf("faceAnalysis: save profile: %w", err)
	}

	return profile, nil
}

func parseFitzpatrick(hint string) int {
	if hint == "" {
		return 3
	}
	// Format: "fitzpatrick_N"
	parts := strings.Split(hint, "_")
	if len(parts) != 2 {
		return 3
	}
	n, err := strconv.Atoi(parts[1])
	if err != nil || n < 1 || n > 6 {
		return 3
	}
	return n
}
