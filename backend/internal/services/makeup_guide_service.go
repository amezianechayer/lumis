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
	"github.com/redis/go-redis/v9"
)

const makeupGuideCacheTTL = 24 * time.Hour

type MakeupGuideService struct {
	profileRepo  *repository.FaceProfileRepository
	skinScanRepo *repository.SkinScanRepository
	userRepo     *repository.UserRepository
	groqAPIKey   string
	httpClient   *http.Client
	rdb          *redis.Client
}

func NewMakeupGuideService(
	profileRepo *repository.FaceProfileRepository,
	skinScanRepo *repository.SkinScanRepository,
	userRepo *repository.UserRepository,
	groqAPIKey string,
	rdb *redis.Client,
) *MakeupGuideService {
	return &MakeupGuideService{
		profileRepo:  profileRepo,
		skinScanRepo: skinScanRepo,
		userRepo:     userRepo,
		groqAPIKey:   groqAPIKey,
		httpClient:   &http.Client{Timeout: 60 * time.Second},
		rdb:          rdb,
	}
}

// MakeupGuideResult is the personalized guide returned to the app.
type MakeupGuideResult struct {
	Title       string   `json:"title"`
	Intro       string   `json:"intro"`
	ColorTips   []string `json:"color_tips"`
	Steps       []struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Tip         string `json:"tip"`
	} `json:"steps"`
	Products []struct {
		Name     string `json:"name"`
		Category string `json:"category"`
		Why      string `json:"why"`
	} `json:"products"`
	IsMale bool `json:"is_male"`
}

func makeupGuideCacheKey(userID uuid.UUID) string {
	return fmt.Sprintf("makeup_guide:v1:%s", userID)
}

func (s *MakeupGuideService) InvalidateCache(ctx context.Context, userID uuid.UUID) {
	if s.rdb != nil {
		s.rdb.Del(ctx, makeupGuideCacheKey(userID))
	}
}

func (s *MakeupGuideService) Generate(ctx context.Context, userID uuid.UUID) (*MakeupGuideResult, error) {
	// Cache check
	if s.rdb != nil {
		if cached, err := s.rdb.Get(ctx, makeupGuideCacheKey(userID)).Bytes(); err == nil {
			var result MakeupGuideResult
			if json.Unmarshal(cached, &result) == nil {
				log.Printf("[MakeupGuide] cache HIT for user %s", userID)
				return &result, nil
			}
		}
	}

	profile, _ := s.profileRepo.FindLatestByUser(ctx, userID)
	user, _ := s.userRepo.FindByID(ctx, userID)
	var scan *models.SkinScan
	if s.skinScanRepo != nil {
		scan, _ = s.skinScanRepo.FindLatestByUser(ctx, userID)
	}

	if profile == nil {
		return nil, fmt.Errorf("no face profile — analyse faciale requise")
	}
	if s.groqAPIKey == "" {
		return nil, fmt.Errorf("groq not configured")
	}

	isMale := user != nil && user.Gender != nil && *user.Gender == "male"

	prompt := s.buildPrompt(profile, scan, user, isMale)

	reply, err := s.callGroqGuide(ctx, prompt)
	if err != nil {
		return nil, err
	}

	raw := extractJSON(reply)
	var result MakeupGuideResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("parse makeup guide: %w", err)
	}
	result.IsMale = isMale

	// Cache it
	if s.rdb != nil {
		if b, err := json.Marshal(result); err == nil {
			s.rdb.Set(ctx, makeupGuideCacheKey(userID), b, makeupGuideCacheTTL)
		}
	}

	return &result, nil
}

func (s *MakeupGuideService) buildPrompt(profile *models.FaceProfile, scan *models.SkinScan, user *models.User, isMale bool) string {
	var sb strings.Builder

	if isMale {
		sb.WriteString("Tu es un expert grooming masculin et barbier professionnel. Génère un guide grooming ULTRA-personnalisé.\n\n")
	} else {
		sb.WriteString("Tu es une maquilleuse professionnelle. Génère un guide maquillage ULTRA-personnalisé.\n\n")
	}

	sb.WriteString("## Profil de la personne\n")
	fmt.Fprintf(&sb, "- Forme du visage : %s\n", profile.FaceShape)
	fmt.Fprintf(&sb, "- Sous-ton de peau : %s\n", profile.Undertone)
	fmt.Fprintf(&sb, "- Saison couleur : %s\n", profile.ColorSeason)
	fmt.Fprintf(&sb, "- Carnation (Fitzpatrick) : %s\n", profile.SkinTone)
	fmt.Fprintf(&sb, "- Forme des yeux : %s | Lèvres : %s | Mâchoire : %s\n", profile.EyeShape, profile.LipShape, profile.JawType)

	if user != nil {
		if user.SkinType != nil {
			fmt.Fprintf(&sb, "- Type de peau : %s\n", *user.SkinType)
		}
		if len(user.Goals) > 0 {
			fmt.Fprintf(&sb, "- Objectifs : %s\n", strings.Join(user.Goals, ", "))
		}
	}

	if scan != nil {
		sb.WriteString("\n## Analyse de peau récente\n")
		fmt.Fprintf(&sb, "- Acné : %d/100 (100=aucune) | Rougeurs : %s | Hyperpigmentation : %s\n",
			scan.AcneScore, scan.RednessLevel, scan.HyperpigmentationLevel)
		fmt.Fprintf(&sb, "- Hydratation : %d/100 | Texture : %d/100\n", scan.HydrationScore, scan.TextureScore)
		if len(scan.AcneZones) > 0 {
			fmt.Fprintf(&sb, "- Zones à corriger : %s\n", strings.Join(scan.AcneZones, ", "))
		}
	}

	if isMale {
		sb.WriteString(`
## Instructions
Génère un guide grooming personnalisé qui :
1. Adapte la barbe/coupe à la forme du visage citée
2. Tient compte des problèmes de peau détectés (ex: si rougeurs, conseille produits apaisants après rasage)
3. Cite les couleurs de vêtements selon la saison couleur et l'undertone
4. Donne des produits réels (marques connues : Bulldog, L'Oréal Men, Nivea Men, etc.)

Réponds UNIQUEMENT en JSON (sans markdown) :
{
  "title": "<titre personnalisé citant la forme de visage>",
  "intro": "<2-3 phrases citant les données réelles du profil>",
  "color_tips": ["<couleur 1 à porter selon undertone>", "<couleur 2>", "<couleur à éviter>"],
  "steps": [
    {"title": "<étape>", "description": "<technique précise 2-3 phrases>", "tip": "<astuce>"}
  ],
  "products": [
    {"name": "<Marque + Produit>", "category": "<catégorie>", "why": "<pourquoi pour CE profil>"}
  ]
}
Génère 4-6 étapes et 3-4 produits.`)
	} else {
		sb.WriteString(`
## Instructions
Génère un guide maquillage personnalisé qui :
1. Adapte le contouring/highlight/blush à la forme du visage citée (ex: visage rond = allonger)
2. Choisit les couleurs de fard/blush/rouge à lèvres selon l'undertone et la saison couleur
3. Tient compte des problèmes de peau (ex: acné → conseille correcteur vert si rougeurs, anti-cernes adapté)
4. Donne des produits réels (marques : Maybelline, L'Oréal, Fenty, NYX, Charlotte Tilbury, etc.)

Réponds UNIQUEMENT en JSON (sans markdown) :
{
  "title": "<titre personnalisé citant la forme de visage>",
  "intro": "<2-3 phrases citant les données réelles du profil>",
  "color_tips": ["<couleur fard selon undertone>", "<couleur blush>", "<couleur rouge à lèvres>", "<couleur à éviter>"],
  "steps": [
    {"title": "<étape>", "description": "<technique précise 2-3 phrases avec placement exact>", "tip": "<astuce pro>"}
  ],
  "products": [
    {"name": "<Marque + Produit>", "category": "<catégorie>", "why": "<pourquoi pour CE profil/teint>"}
  ]
}
Génère 5-7 étapes et 4-5 produits.`)
	}

	return sb.String()
}

func (s *MakeupGuideService) callGroqGuide(ctx context.Context, prompt string) (string, error) {
	reqBody := groqRequest{
		Model:       groqModel,
		Messages:    []groqMessage{{Role: "user", Content: prompt}},
		Temperature: 0.5,
		MaxTokens:   2048,
	}
	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqAPIURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.groqAPIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var groqResp groqResponse
	if err := json.Unmarshal(respBytes, &groqResp); err != nil {
		return "", fmt.Errorf("parse groq response: %w", err)
	}
	if groqResp.Error != nil {
		return "", fmt.Errorf("groq error: %s", groqResp.Error.Message)
	}
	if len(groqResp.Choices) == 0 {
		return "", fmt.Errorf("no choices")
	}
	return groqResp.Choices[0].Message.Content, nil
}
