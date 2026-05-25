package services

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
)

type RecommendationService struct {
	recRepo     *repository.RecommendationRepository
	profileRepo *repository.FaceProfileRepository
	userRepo    *repository.UserRepository
}

func NewRecommendationService(
	recRepo *repository.RecommendationRepository,
	profileRepo *repository.FaceProfileRepository,
	userRepo *repository.UserRepository,
) *RecommendationService {
	return &RecommendationService{recRepo: recRepo, profileRepo: profileRepo, userRepo: userRepo}
}

func (s *RecommendationService) GetOrGenerate(ctx context.Context, userID uuid.UUID, recType, occasion string) ([]models.Recommendation, error) {
	count, err := s.recRepo.CountByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if count == 0 {
		if _, err = s.Generate(ctx, userID); err != nil {
			return nil, err
		}
	}
	return s.recRepo.FindByUser(ctx, userID, recType, occasion)
}

func (s *RecommendationService) Generate(ctx context.Context, userID uuid.UUID) ([]models.Recommendation, error) {
	profile, err := s.profileRepo.FindLatestByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	gender := ""
	if user, err := s.userRepo.FindByID(ctx, userID); err == nil && user != nil && user.Gender != nil {
		gender = *user.Gender
	}

	var templates []RecTemplate
	if profile != nil {
		templates = buildTemplates(profile, gender)
	} else {
		templates = defaultTemplates()
	}

	recs := make([]models.Recommendation, 0, len(templates))
	for _, tpl := range templates {
		rec, err := templateToModel(userID, profile, tpl)
		if err != nil {
			return nil, fmt.Errorf("serialize rec: %w", err)
		}
		recs = append(recs, rec)
	}

	if err := s.recRepo.DeleteByUser(ctx, userID); err != nil {
		return nil, err
	}
	if err := s.recRepo.BulkCreate(ctx, recs); err != nil {
		return nil, err
	}
	return recs, nil
}

func (s *RecommendationService) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Recommendation, error) {
	return s.recRepo.FindByID(ctx, id, userID)
}

// ─── helpers ────────────────────────────────────────────────────────────────

func buildTemplates(p *models.FaceProfile, gender string) []RecTemplate {
	var tpls []RecTemplate

	shape := p.FaceShape
	season := p.ColorSeason
	skinTone := p.SkinTone

	// Haircut — all genders
	if t, ok := haircutByShape[shape]; ok {
		t.Type = "haircut"
		t.GenderTarget = "all"
		tpls = append(tpls, t)
	}

	if gender == "male" || gender == "homme" {
		// Grooming
		if t, ok := groomingByShape[shape]; ok {
			t.Type = "grooming"
			t.GenderTarget = "male"
			tpls = append(tpls, t)
		}
		// Skincare
		tpls = append(tpls, buildSkincareRec(skinTone, "male"))
	} else {
		// Makeup by season
		if t, ok := makeupBySeason[season]; ok {
			t.Type = "makeup"
			t.GenderTarget = "female"
			tpls = append(tpls, t)
		}
		// Makeup by shape
		if t, ok := makeupByShape[shape]; ok {
			t.Type = "makeup"
			t.GenderTarget = "female"
			tpls = append(tpls, t)
		}
		// Skincare
		tpls = append(tpls, buildSkincareRec(skinTone, "female"))
	}

	// Color season guide — all genders
	if t, ok := colorSeasonGuide[season]; ok {
		t.Type = "color_season"
		t.GenderTarget = "all"
		tpls = append(tpls, t)
	}

	return tpls
}

func defaultTemplates() []RecTemplate {
	return []RecTemplate{
		buildSkincareRec("fitzpatrick_3", "all"),
		haircutByShape["oval"],
		colorSeasonGuide["spring"],
	}
}

func templateToModel(userID uuid.UUID, profile *models.FaceProfile, tpl RecTemplate) (models.Recommendation, error) {
	stepsJSON, err := json.Marshal(tpl.Steps)
	if err != nil {
		return models.Recommendation{}, err
	}
	prodsJSON, err := json.Marshal(tpl.Products)
	if err != nil {
		return models.Recommendation{}, err
	}

	recType := tpl.Type
	if recType == "" {
		recType = "skincare"
	}

	var faceProfileID *uuid.UUID
	if profile != nil {
		faceProfileID = &profile.ID
	}

	return models.Recommendation{
		UserID:        userID,
		FaceProfileID: faceProfileID,
		Type:          recType,
		GenderTarget:  tpl.GenderTarget,
		Title:         tpl.Title,
		Summary:       tpl.Summary,
		Steps:         models.JSON(stepsJSON),
		Products:      models.JSON(prodsJSON),
		Occasions:     tpl.Occasions,
		Season:        tpl.Season,
		IsPremiumOnly: tpl.IsPremium,
		IconEmoji:     tpl.IconEmoji,
		DurationMin:   tpl.DurationMin,
		Difficulty:    tpl.Difficulty,
	}, nil
}
