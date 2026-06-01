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
	"github.com/lib/pq"
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
		httpClient:   &http.Client{Timeout: 60 * time.Second},
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
	profile, _ := s.profileRepo.FindLatestByUser(ctx, userID)
	user, _ := s.userRepo.FindByID(ctx, userID)
	var skinScan *models.SkinScan
	if s.skinScanRepo != nil {
		skinScan, _ = s.skinScanRepo.FindLatestByUser(ctx, userID)
	}

	var recs []models.Recommendation
	var err error

	if s.groqAPIKey != "" {
		recs, err = s.generateAllWithGroq(ctx, userID, profile, skinScan, user)
		if err != nil {
			log.Printf("[RecService] Groq generation failed, using fallback: %v", err)
			recs = buildFallbackRecs(userID, profile, user)
		}
	} else {
		recs = buildFallbackRecs(userID, profile, user)
	}

	if err := s.recRepo.DeleteByUser(ctx, userID); err != nil {
		return nil, err
	}
	if err := s.recRepo.BulkCreate(ctx, recs); err != nil {
		return nil, err
	}
	return recs, nil
}

// generateAllWithGroq generates all 5 recommendation types in a single Groq call.
func (s *RecommendationService) generateAllWithGroq(
	ctx context.Context,
	userID uuid.UUID,
	profile *models.FaceProfile,
	skinScan *models.SkinScan,
	user *models.User,
) ([]models.Recommendation, error) {
	var sb strings.Builder

	sb.WriteString("Tu es un expert beauté, dermatologue et styliste. Génère 5 recommandations ultra-personnalisées basées sur le profil complet de l'utilisateur.\n\n")

	// User profile
	gender := "non spécifié"
	if user != nil {
		if user.Gender != nil {
			gender = *user.Gender
		}
		if len(user.Goals) > 0 {
			fmt.Fprintf(&sb, "## Objectifs utilisateur\n%s\n\n", strings.Join(user.Goals, ", "))
		}
	}
	fmt.Fprintf(&sb, "## Genre : %s\n\n", gender)

	// Skin scan
	if skinScan != nil {
		sb.WriteString("## Analyse de peau récente\n")
		fmt.Fprintf(&sb, "- Score global : %d/100\n", skinScan.OverallScore)
		fmt.Fprintf(&sb, "- Hydratation : %d/100\n", skinScan.HydrationScore)
		fmt.Fprintf(&sb, "- Acné : %d/100 (100=aucune)\n", skinScan.AcneScore)
		fmt.Fprintf(&sb, "- Texture : %d/100\n", skinScan.TextureScore)
		fmt.Fprintf(&sb, "- Uniformité : %d/100\n", skinScan.UniformityScore)
		fmt.Fprintf(&sb, "- Rougeur : %s | Pores : %s | Hyperpigmentation : %s\n",
			skinScan.RednessLevel, skinScan.PoresCondition, skinScan.HyperpigmentationLevel)
		if len(skinScan.AcneZones) > 0 {
			fmt.Fprintf(&sb, "- Zones acnéiques : %s\n", strings.Join(skinScan.AcneZones, ", "))
		}
		if len(skinScan.DrynessZones) > 0 {
			fmt.Fprintf(&sb, "- Zones sèches : %s\n", strings.Join(skinScan.DrynessZones, ", "))
		}
		fmt.Fprintf(&sb, "- Sommeil : %.1fh/nuit, Stress : %d/10, Eau : %.1fL/j\n",
			skinScan.SleepHours, skinScan.StressLevel, skinScan.WaterIntakeLiters)
		sb.WriteString("\n")
	} else {
		sb.WriteString("## Analyse de peau : non disponible — base-toi sur le profil facial.\n\n")
	}

	// Face profile
	if profile != nil {
		sb.WriteString("## Profil facial\n")
		fmt.Fprintf(&sb, "- Forme du visage : %s\n", profile.FaceShape)
		fmt.Fprintf(&sb, "- Teinte peau : %s\n", profile.SkinTone)
		fmt.Fprintf(&sb, "- Undertone : %s\n", profile.Undertone)
		fmt.Fprintf(&sb, "- Saison couleur : %s\n", profile.ColorSeason)
		fmt.Fprintf(&sb, "- Forme des yeux : %s\n", profile.EyeShape)
		fmt.Fprintf(&sb, "- Mâchoire : %s\n", profile.JawType)
		sb.WriteString("\n")
	}

	sb.WriteString(`## Instructions STRICTES
Génère EXACTEMENT 5 recommandations ultra-personnalisées, une par type : skincare, makeup, haircut, grooming, color_season.

RÈGLES ABSOLUES :
1. INTERDICTION de conseils génériques comme "hydrate ta peau" sans mentionner POURQUOI selon les données (score, zone, problème détecté).
2. Cite TOUJOURS les données réelles : "ton score acné de X/100", "ta zone T", "ton undertone warm", "ta forme de visage ovale", etc.
3. Les produits doivent être des MARQUES RÉELLES connues (ex: CeraVe, La Roche-Posay, Neutrogena, L'Oréal, Fenty Beauty, etc.)
4. Pour "haircut" : décris précisément la coupe (ex: "dégradé haut sur les côtés, longueur 5cm sur le dessus"), comment la demander au coiffeur, et quels produits de coiffage utiliser.
5. Pour "grooming" (genre masculin) : routine barbe/sourcils/soin spécifique. Pour (genre féminin) : sourcils/lèvres/finitions.
6. Pour "color_season" : cite les couleurs HEX spécifiques à porter, les couleurs à éviter, et pourquoi selon l'undertone et la teinte de peau.
7. Pour "makeup" : technique d'application précise (stippling, baking, etc.), ordre d'application, et comment adapter selon les problèmes détectés.
8. Chaque étape doit avoir une description de 2-3 phrases minimum avec la technique exacte.
9. Pour chaque produit, le champ "why" doit expliquer POURQUOI ce produit spécifiquement pour CE profil (pas de généralités).
10. Occasions variées selon le type : ["daily", "evening", "professional", "date", "weekend"].

Réponds UNIQUEMENT avec un tableau JSON valide (sans markdown, sans commentaires) :
[
  {
    "type": "skincare",
    "icon": "🌿",
    "title": "<titre spécifique avec le problème cité, max 60 chars>",
    "summary": "<2-3 phrases citant les données réelles : scores, zones, problèmes spécifiques>",
    "duration_min": <int>,
    "difficulty": <"easy"|"medium"|"advanced">,
    "occasions": ["daily"],
    "steps": [
      {"order": 1, "title": "<nom étape précis>", "description": "<technique exacte 2-3 phrases, pourquoi pour ce profil>", "tip": "<astuce spécifique ou vide>", "duration_min": <int>}
    ],
    "products": [
      {"name": "<Marque + Nom Exact>", "category": "<catégorie>", "why": "<explication spécifique au profil>", "premium": false}
    ]
  }
]
Génère 4-6 étapes et 3-5 produits par recommandation. Types requis : skincare, makeup, haircut, grooming, color_season.`)

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

	reqBody := recGroqReq{
		Model:       groqModel,
		Messages:    []recGroqMsg{{Role: "user", Content: sb.String()}},
		Temperature: 0.4,
		MaxTokens:   4096,
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

	raw := groqResp.Choices[0].Message.Content
	log.Printf("[RecService] Groq raw (first 300): %.300s", raw)
	raw = extractJSONArray(raw)

	var parsed []struct {
		Type        string   `json:"type"`
		Icon        string   `json:"icon"`
		Title       string   `json:"title"`
		Summary     string   `json:"summary"`
		DurationMin int      `json:"duration_min"`
		Difficulty  string   `json:"difficulty"`
		Occasions   []string `json:"occasions"`
		Steps       []struct {
			Order       int    `json:"order"`
			Title       string `json:"title"`
			Description string `json:"description"`
			Tip         string `json:"tip"`
			DurationMin int    `json:"duration_min"`
		} `json:"steps"`
		Products []struct {
			Name     string `json:"name"`
			Category string `json:"category"`
			Why      string `json:"why"`
			Premium  bool   `json:"premium"`
		} `json:"products"`
	}

	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return nil, fmt.Errorf("parse recs JSON: %w", err)
	}

	var faceProfileID *uuid.UUID
	if profile != nil {
		faceProfileID = &profile.ID
	}

	recs := make([]models.Recommendation, 0, len(parsed))
	for _, p := range parsed {
		stepsJSON, _ := json.Marshal(p.Steps)
		prodsJSON, _ := json.Marshal(p.Products)

		recType := p.Type
		validTypes := map[string]bool{"skincare": true, "makeup": true, "haircut": true, "grooming": true, "color_season": true}
		if !validTypes[recType] {
			recType = "skincare"
		}

		difficulty := p.Difficulty
		if difficulty == "" {
			difficulty = "easy"
		}

		icon := p.Icon
		if icon == "" {
			icons := map[string]string{"skincare": "🌿", "makeup": "💄", "haircut": "✂️", "grooming": "🧔", "color_season": "🎨"}
			icon = icons[recType]
		}

		occasions := p.Occasions
		if len(occasions) == 0 {
			occasions = []string{"daily"}
		}

		recs = append(recs, models.Recommendation{
			UserID:        userID,
			FaceProfileID: faceProfileID,
			Type:          recType,
			GenderTarget:  "all",
			Title:         p.Title,
			Summary:       p.Summary,
			Steps:         models.JSON(stepsJSON),
			Products:      models.JSON(prodsJSON),
			Occasions:     pq.StringArray(occasions),
			IconEmoji:     icon,
			DurationMin:   p.DurationMin,
			Difficulty:    difficulty,
		})
	}

	return recs, nil
}

func extractJSONArray(s string) string {
	// Strip markdown code fences
	if i := strings.Index(s, "```"); i >= 0 {
		s = s[i:]
		if j := strings.Index(s[3:], "```"); j >= 0 {
			s = s[3 : 3+j]
		}
		s = strings.TrimPrefix(s, "json")
		s = strings.TrimSpace(s)
	}
	start := strings.Index(s, "[")
	end := strings.LastIndex(s, "]")
	if start >= 0 && end > start {
		return s[start : end+1]
	}
	return s
}

// buildFallbackRecs returns minimal static recs when Groq is unavailable.
func buildFallbackRecs(userID uuid.UUID, profile *models.FaceProfile, user *models.User) []models.Recommendation {
	gender := ""
	if user != nil && user.Gender != nil {
		gender = *user.Gender
	}

	makeupTitle := "Routine Maquillage Naturel"
	makeupSummary := "Une routine maquillage légère et naturelle pour sublimer tes traits au quotidien."
	if gender == "male" || gender == "homme" {
		makeupTitle = "Teint Naturel & Correcteur"
		makeupSummary = "Une routine discrète pour unifier le teint et corriger les imperfections sans effet maquillé."
	}

	defaultSteps, _ := json.Marshal([]map[string]interface{}{
		{"order": 1, "title": "Préparation", "description": "Hydrate bien ta peau avant d'appliquer quoi que ce soit.", "tip": "", "duration_min": 2},
		{"order": 2, "title": "Application", "description": "Applique le produit en tapotant avec les doigts pour un rendu naturel.", "tip": "Moins c'est plus.", "duration_min": 3},
	})
	defaultProds, _ := json.Marshal([]map[string]interface{}{
		{"name": "BB Cream SPF 30", "category": "teint", "why": "Couvre légèrement tout en protégeant", "premium": false},
	})

	recs := []models.Recommendation{
		{
			UserID: userID, Type: "skincare", GenderTarget: "all",
			Title: "Routine Skincare Essentielle", Summary: "Une routine de base pour prendre soin de ta peau au quotidien.",
			Steps: models.JSON(defaultSteps), Products: models.JSON(defaultProds),
			Occasions: pq.StringArray{"daily"}, IconEmoji: "🌿", DurationMin: 5, Difficulty: "easy",
		},
		{
			UserID: userID, Type: "makeup", GenderTarget: "all",
			Title: makeupTitle, Summary: makeupSummary,
			Steps: models.JSON(defaultSteps), Products: models.JSON(defaultProds),
			Occasions: pq.StringArray{"daily"}, IconEmoji: "💄", DurationMin: 5, Difficulty: "easy",
		},
		{
			UserID: userID, Type: "haircut", GenderTarget: "all",
			Title: "Coupe Adaptée à Ton Visage", Summary: "Une coupe qui met en valeur tes traits naturels.",
			Steps: models.JSON(defaultSteps), Products: models.JSON(defaultProds),
			Occasions: pq.StringArray{"daily"}, IconEmoji: "✂️", DurationMin: 0, Difficulty: "easy",
		},
		{
			UserID: userID, Type: "grooming", GenderTarget: "all",
			Title: "Entretien & Finitions", Summary: "Les gestes essentiels pour un look soigné au quotidien.",
			Steps: models.JSON(defaultSteps), Products: models.JSON(defaultProds),
			Occasions: pq.StringArray{"daily"}, IconEmoji: "🧔", DurationMin: 5, Difficulty: "easy",
		},
		{
			UserID: userID, Type: "color_season", GenderTarget: "all",
			Title: "Ta Palette de Couleurs", Summary: "Les couleurs qui subliment naturellement ton teint et tes yeux.",
			Steps: models.JSON(defaultSteps), Products: models.JSON(defaultProds),
			Occasions: pq.StringArray{"daily"}, IconEmoji: "🎨", DurationMin: 0, Difficulty: "easy",
		},
	}

	for i := range recs {
		if recs[i].ID == uuid.Nil {
			recs[i].ID = uuid.New()
		}
	}

	return recs
}

func (s *RecommendationService) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Recommendation, error) {
	return s.recRepo.FindByID(ctx, id, userID)
}

// recGroqMsg and recGroqReq kept for compatibility
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
