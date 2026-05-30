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

type ProductService struct {
	repo       *repository.ScannedProductRepository
	skinRepo   *repository.SkinScanRepository
	userRepo   *repository.UserRepository
	groqAPIKey string
	httpClient *http.Client
}

func NewProductService(
	repo *repository.ScannedProductRepository,
	skinRepo *repository.SkinScanRepository,
	userRepo *repository.UserRepository,
	groqAPIKey string,
) *ProductService {
	return &ProductService{
		repo:       repo,
		skinRepo:   skinRepo,
		userRepo:   userRepo,
		groqAPIKey: groqAPIKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// openBeautyFacts structs for API response parsing
type obfProduct struct {
	StatusVerbose string `json:"status_verbose"`
	Product       struct {
		ProductName     string   `json:"product_name"`
		ProductNameFr   string   `json:"product_name_fr"`
		ProductNameEn   string   `json:"product_name_en"`
		GenericName     string   `json:"generic_name"`
		Brands          string   `json:"brands"`
		CategoriesTags  []string `json:"categories_tags"`
		IngredientsText string   `json:"ingredients_text"`
		ImageFrontURL   string   `json:"image_front_url"`
	} `json:"product"`
}

// productGroqMsg is a local struct to avoid name conflicts with coach_service.go
type productGroqMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type productGroqReq struct {
	Model       string           `json:"model"`
	Messages    []productGroqMsg `json:"messages"`
	Temperature float64          `json:"temperature"`
	MaxTokens   int              `json:"max_tokens"`
}

type productCompatibility struct {
	CompatibilityScore int      `json:"compatibility_score"`
	Verdict            string   `json:"verdict"`
	Pros               []string `json:"pros"`
	Cons               []string `json:"cons"`
	Tip                string   `json:"tip"`
}

func (s *ProductService) ScanBarcode(ctx context.Context, userID uuid.UUID, barcode string) (*models.ScannedProduct, error) {
	// 1. Call Open Beauty Facts
	obfURL := fmt.Sprintf("https://world.openbeautyfacts.org/api/v2/product/%s.json", barcode)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, obfURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build OBF request: %w", err)
	}
	req.Header.Set("User-Agent", "Lumis/1.0 (contact@lumis.app)")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("OBF request failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read OBF response: %w", err)
	}

	var obfResp obfProduct
	if err := json.Unmarshal(respBytes, &obfResp); err != nil {
		return nil, fmt.Errorf("parse OBF response: %w", err)
	}

	// 2. Product not found
	if obfResp.StatusVerbose != "product found" {
		product := &models.ScannedProduct{
			UserID:   userID,
			Barcode:  barcode,
			NotFound: true,
		}
		if err := s.repo.Create(ctx, product); err != nil {
			return nil, fmt.Errorf("save not-found product: %w", err)
		}
		return product, nil
	}

	p := obfResp.Product

	// Use the first non-empty name available
	productName := p.ProductName
	if productName == "" {
		productName = p.ProductNameFr
	}
	if productName == "" {
		productName = p.ProductNameEn
	}
	if productName == "" {
		productName = p.GenericName
	}
	if productName == "" && p.Brands != "" {
		productName = p.Brands
	}

	category := ""
	if len(p.CategoriesTags) > 0 {
		category = p.CategoriesTags[0]
		// Strip "en:" prefix if present
		if idx := strings.Index(category, ":"); idx >= 0 {
			category = category[idx+1:]
		}
	}

	product := &models.ScannedProduct{
		UserID:      userID,
		Barcode:     barcode,
		ProductName: productName,
		Brand:       p.Brands,
		Category:    category,
		Ingredients: p.IngredientsText,
		ImageURL:    p.ImageFrontURL,
	}

	// 3. Fetch user's latest skin scan for AI context
	skinScan, err := s.skinRepo.FindLatestByUser(ctx, userID)
	if err != nil {
		log.Printf("[ProductService] skin scan fetch error (non-fatal): %v", err)
	}

	// 4. Fetch user goals
	user, _ := s.userRepo.FindByID(ctx, userID)

	// 5. Call Groq for AI compatibility analysis
	if s.groqAPIKey != "" {
		compat, err := s.analyzeCompatibility(ctx, product, skinScan, user)
		if err != nil {
			log.Printf("[ProductService] Groq analysis failed (non-fatal): %v", err)
			// Set neutral defaults
			product.CompatibilityScore = 50
			product.Verdict = "neutral"
			product.Tip = "Analyse IA indisponible. Vérifie les ingrédients avec ton dermatologue."
		} else {
			product.CompatibilityScore = compat.CompatibilityScore
			product.Verdict = compat.Verdict
			product.Pros = pq.StringArray(compat.Pros)
			product.Cons = pq.StringArray(compat.Cons)
			product.Tip = compat.Tip
		}
	} else {
		product.CompatibilityScore = 50
		product.Verdict = "neutral"
	}

	// 6. Save and return
	if err := s.repo.Create(ctx, product); err != nil {
		return nil, fmt.Errorf("save product: %w", err)
	}

	return product, nil
}

func (s *ProductService) analyzeCompatibility(
	ctx context.Context,
	product *models.ScannedProduct,
	skinScan *models.SkinScan,
	user *models.User,
) (*productCompatibility, error) {
	var sb strings.Builder

	sb.WriteString("Tu es un expert en cosmétique et dermatologie. Analyse la compatibilité de ce produit avec le profil de peau de l'utilisateur.\n\n")

	sb.WriteString("## Produit\n")
	fmt.Fprintf(&sb, "- Nom : %s\n", product.ProductName)
	fmt.Fprintf(&sb, "- Marque : %s\n", product.Brand)
	fmt.Fprintf(&sb, "- Catégorie : %s\n", product.Category)
	if product.Ingredients != "" {
		ingredients := product.Ingredients
		if len(ingredients) > 500 {
			ingredients = ingredients[:500] + "..."
		}
		fmt.Fprintf(&sb, "- Ingrédients : %s\n", ingredients)
	}

	if skinScan != nil {
		sb.WriteString("\n## Profil de peau\n")
		fmt.Fprintf(&sb, "- Score global : %d/100\n", skinScan.OverallScore)
		fmt.Fprintf(&sb, "- Score acné : %d/100 (100=aucune acné)\n", skinScan.AcneScore)
		fmt.Fprintf(&sb, "- Hydratation : %d/100\n", skinScan.HydrationScore)
		fmt.Fprintf(&sb, "- Texture : %d/100\n", skinScan.TextureScore)
		if len(skinScan.AcneZones) > 0 {
			fmt.Fprintf(&sb, "- Zones d'acné : %s\n", strings.Join(skinScan.AcneZones, ", "))
		}
		if len(skinScan.DrynessZones) > 0 {
			fmt.Fprintf(&sb, "- Zones de sécheresse : %s\n", strings.Join(skinScan.DrynessZones, ", "))
		}
		fmt.Fprintf(&sb, "- Niveau de rougeur : %s\n", skinScan.RednessLevel)
		fmt.Fprintf(&sb, "- Pores : %s\n", skinScan.PoresCondition)
	} else {
		sb.WriteString("\n## Profil de peau\nAucune analyse de peau disponible.\n")
	}

	if user != nil && len(user.Goals) > 0 {
		fmt.Fprintf(&sb, "\n## Objectifs de l'utilisateur\n%s\n", strings.Join(user.Goals, ", "))
	}

	sb.WriteString(`
## Instructions
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans explication) avec ces champs exacts :
{
  "compatibility_score": <0-100>,
  "verdict": <"excellent"|"good"|"neutral"|"avoid">,
  "pros": <array de 1-3 avantages en français, strings courts>,
  "cons": <array de 0-3 inconvénients en français, strings courts>,
  "tip": <string, conseil personnalisé en français, max 2 phrases>
}
Règles verdict : excellent=85+, good=65-84, neutral=40-64, avoid=0-39.`)

	messages := []productGroqMsg{
		{Role: "user", Content: sb.String()},
	}

	reqBody := productGroqReq{
		Model:       groqModel,
		Messages:    messages,
		Temperature: 0.3,
		MaxTokens:   512,
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
		return nil, fmt.Errorf("parse groq response: %w", err)
	}
	if groqResp.Error != nil {
		return nil, fmt.Errorf("groq error: %s", groqResp.Error.Message)
	}
	if len(groqResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices in groq response")
	}

	raw := groqResp.Choices[0].Message.Content
	log.Printf("[ProductService] Groq raw: %.300s", raw)
	raw = extractJSON(raw)

	var compat productCompatibility
	if err := json.Unmarshal([]byte(raw), &compat); err != nil {
		return nil, fmt.Errorf("parse compatibility JSON: %w", err)
	}

	// Clamp score
	if compat.CompatibilityScore < 0 {
		compat.CompatibilityScore = 0
	}
	if compat.CompatibilityScore > 100 {
		compat.CompatibilityScore = 100
	}
	// Validate verdict
	validVerdicts := map[string]bool{"excellent": true, "good": true, "neutral": true, "avoid": true}
	if !validVerdicts[compat.Verdict] {
		switch {
		case compat.CompatibilityScore >= 85:
			compat.Verdict = "excellent"
		case compat.CompatibilityScore >= 65:
			compat.Verdict = "good"
		case compat.CompatibilityScore >= 40:
			compat.Verdict = "neutral"
		default:
			compat.Verdict = "avoid"
		}
	}

	return &compat, nil
}

func (s *ProductService) GetHistory(ctx context.Context, userID uuid.UUID) ([]models.ScannedProduct, error) {
	return s.repo.FindHistoryByUser(ctx, userID, 30)
}
