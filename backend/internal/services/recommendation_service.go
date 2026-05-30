package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
)

type RecommendationService struct {
	recRepo      *repository.RecommendationRepository
	profileRepo  *repository.FaceProfileRepository
	userRepo     *repository.UserRepository
	skinScanRepo *repository.SkinScanRepository
	groqAPIKey   string
	httpClient   *http.Client
}

func NewRecommendationService(
	recRepo *repository.RecommendationRepository,
	profileRepo *repository.FaceProfileRepository,
	userRepo *repository.UserRepository,
	skinScanRepo *repository.SkinScanRepository,
	groqAPIKey string,
) *RecommendationService {
	return &RecommendationService{
		recRepo:      recRepo,
		profileRepo:  profileRepo,
		userRepo:     userRepo,
		skinScanRepo: skinScanRepo,
		groqAPIKey:   groqAPIKey,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
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

	var user *models.User
	gender := ""
	if u, err := s.userRepo.FindByID(ctx, userID); err == nil && u != nil {
		user = u
		if u.Gender != nil {
			gender = *u.Gender
		}
	}

	// Static templates for haircut / grooming / makeup / color season
	var templates []RecTemplate
	if profile != nil {
		templates = buildTemplatesWithoutSkincare(profile, gender)
	} else {
		templates = defaultTemplatesWithoutSkincare()
	}

	recs := make([]models.Recommendation, 0, len(templates)+1)
	for _, tpl := range templates {
		rec, err := templateToModel(userID, profile, tpl)
		if err != nil {
			return nil, fmt.Errorf("serialize rec: %w", err)
		}
		recs = append(recs, rec)
	}

	// AI-powered skincare recommendation
	var skinScan *models.SkinScan
	if s.skinScanRepo != nil {
		skinScan, _ = s.skinScanRepo.FindLatestByUser(ctx, userID)
	}
	skincareRec, err := s.generateSkincareRec(ctx, userID, profile, skinScan, user)
	if err != nil {
		log.Printf("[RecService] AI skincare failed, using fallback: %v", err)
		fallback, _ := templateToModel(userID, profile, buildSkincareRec("fitzpatrick_3", gender))
		recs = append(recs, fallback)
	} else {
		recs = append(recs, *skincareRec)
	}

	if err := s.recRepo.DeleteByUser(ctx, userID); err != nil {
		return nil, err
	}
	if err := s.recRepo.BulkCreate(ctx, recs); err != nil {
		return nil, err
	}
	return recs, nil
}

// generateSkincareRec calls Groq to build a personalized skincare recommendation.
func (s *RecommendationService) generateSkincareRec(
	ctx context.Context,
	userID uuid.UUID,
	profile *models.FaceProfile,
	skinScan *models.SkinScan,
	user *models.User,
) (*models.Recommendation, error) {
	if s.groqAPIKey == "" {
		return nil, fmt.Errorf("no groq key")
	}

	var sb strings.Builder
	sb.WriteString("Tu es un expert en dermatologie et skincare. Génère une routine skincare personnalisée au format JSON strict.\n\n")

	if skinScan != nil {
		sb.WriteString("## Analyse de peau récente\n")
		fmt.Fprintf(&sb, "- Score global : %d/100\n", skinScan.OverallScore)
		fmt.Fprintf(&sb, "- Hydratation : %d/100\n", skinScan.HydrationScore)
		fmt.Fprintf(&sb, "- Acné : %d/100 (100=sans acné)\n", skinScan.AcneScore)
		fmt.Fprintf(&sb, "- Texture : %d/100\n", skinScan.TextureScore)
		fmt.Fprintf(&sb, "- Uniformité : %d/100\n", skinScan.UniformityScore)
		fmt.Fprintf(&sb, "- Rougeur : %s\n", skinScan.RednessLevel)
		fmt.Fprintf(&sb, "- Pores : %s\n", skinScan.PoresCondition)
		fmt.Fprintf(&sb, "- Hyperpigmentation : %s\n", skinScan.HyperpigmentationLevel)
		if len(skinScan.AcneZones) > 0 {
			fmt.Fprintf(&sb, "- Zones acnéiques : %s\n", strings.Join(skinScan.AcneZones, ", "))
		}
		if skinScan.FineLinesDetected {
			sb.WriteString("- Premières ridules détectées : oui\n")
		}
		fmt.Fprintf(&sb, "- Sommeil : %.1fh/nuit, Stress : %d/10, Eau : %.1fL/j\n",
			skinScan.SleepHours, skinScan.StressLevel, skinScan.WaterIntakeLiters)
	} else {
		sb.WriteString("## Analyse de peau\nAucune analyse disponible — génère une routine universelle équilibrée.\n")
	}

	if profile != nil {
		fmt.Fprintf(&sb, "\n## Profil facial\n- Teinte peau : %s\n- Undertone : %s\n- Saison couleur : %s\n",
			profile.SkinTone, profile.Undertone, profile.ColorSeason)
	}

	gender := ""
	if user != nil {
		if user.Gender != nil {
			gender = *user.Gender
		}
		if len(user.Goals) > 0 {
			fmt.Fprintf(&sb, "\n## Objectifs\n%s\n", strings.Join(user.Goals, ", "))
		}
	}

	genderNote := "mixte"
	if gender == "male" {
		genderNote = "homme"
	} else if gender == "female" {
		genderNote = "femme"
	}

	fmt.Fprintf(&sb, `
## Format de réponse
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans explication) :
{
  "title": "<titre accrocheur de la routine, max 60 chars>",
  "summary": "<description de 1-2 phrases, personnalisée aux problèmes détectés>",
  "duration_min": <durée totale en minutes, int>,
  "difficulty": <"easy"|"medium"|"advanced">,
  "steps": [
    {
      "order": 1,
      "title": "<nom de l'étape>",
      "description": "<instruction claire, 1-2 phrases>",
      "tip": "<astuce optionnelle ou chaîne vide>",
      "duration_min": <durée en minutes, int>
    }
  ],
  "products": [
    {
      "name": "<nom générique du produit>",
      "category": "<catégorie>",
      "why": "<pourquoi ce produit pour ce profil>",
      "premium": false
    }
  ]
}
Génère 4-5 étapes et 3-5 produits. Public cible : %s. Sois très spécifique aux problèmes détectés.`, genderNote)

	messages := []recGroqMsg{
		{Role: "user", Content: sb.String()},
	}
	reqBody := recGroqReq{
		Model:       groqModel,
		Messages:    messages,
		Temperature: 0.5,
		MaxTokens:   1024,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, groqAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.groqAPIKey)

	httpResp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer httpResp.Body.Close()

	respBytes, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, err
	}

	var groqResp groqResponse
	if err := json.Unmarshal(respBytes, &groqResp); err != nil {
		return nil, fmt.Errorf("parse groq: %w", err)
	}
	if groqResp.Error != nil {
		return nil, fmt.Errorf("groq error: %s", groqResp.Error.Message)
	}
	if len(groqResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices")
	}

	raw := extractJSON(groqResp.Choices[0].Message.Content)
	log.Printf("[RecService] AI skincare raw: %.200s", raw)

	var parsed struct {
		Title       string       `json:"title"`
		Summary     string       `json:"summary"`
		DurationMin int          `json:"duration_min"`
		Difficulty  string       `json:"difficulty"`
		Steps       []RecStep    `json:"steps"`
		Products    []RecProduct `json:"products"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return nil, fmt.Errorf("parse skincare JSON: %w", err)
	}

	tpl := RecTemplate{
		Type:        "skincare",
		GenderTarget: "all",
		Title:       parsed.Title,
		Summary:     parsed.Summary,
		Steps:       parsed.Steps,
		Products:    parsed.Products,
		Occasions:   []string{"daily"},
		IconEmoji:   "🧴",
		DurationMin: parsed.DurationMin,
		Difficulty:  parsed.Difficulty,
	}

	rec, err := templateToModel(userID, profile, tpl)
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

// recGroqMsg and recGroqReq are package-local to avoid conflicts with coach_service.go
type recGroqMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type recGroqReq struct {
	Model       string       `json:"model"`
	Messages    []recGroqMsg `json:"messages"`
	Temperature float64      `json:"temperature"`
	MaxTokens   int          `json:"max_tokens"`
}

func (s *RecommendationService) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Recommendation, error) {
	return s.recRepo.FindByID(ctx, id, userID)
}

// ─── helpers ────────────────────────────────────────────────────────────────

// buildTemplatesWithoutSkincare returns all recs except skincare (generated by AI separately).
func buildTemplatesWithoutSkincare(p *models.FaceProfile, gender string) []RecTemplate {
	var tpls []RecTemplate

	shape := p.FaceShape
	season := p.ColorSeason
	_ = p.SkinTone

	if t, ok := haircutByShape[shape]; ok {
		t.Type = "haircut"
		t.GenderTarget = "all"
		tpls = append(tpls, t)
	}

	if gender == "male" || gender == "homme" {
		if t, ok := groomingByShape[shape]; ok {
			t.Type = "grooming"
			t.GenderTarget = "male"
			tpls = append(tpls, t)
		}
	} else {
		if t, ok := makeupBySeason[season]; ok {
			t.Type = "makeup"
			t.GenderTarget = "female"
			tpls = append(tpls, t)
		}
		if t, ok := makeupByShape[shape]; ok {
			t.Type = "makeup"
			t.GenderTarget = "female"
			tpls = append(tpls, t)
		}
	}

	if t, ok := colorSeasonGuide[season]; ok {
		t.Type = "color_season"
		t.GenderTarget = "all"
		tpls = append(tpls, t)
	}

	return tpls
}

func defaultTemplatesWithoutSkincare() []RecTemplate {
	return []RecTemplate{
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
