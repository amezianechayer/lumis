package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
)

const groqVisionModel = "meta-llama/llama-4-scout-17b-16e-instruct"

type SkinScanInput struct {
	SleepHours        float64 `json:"sleep_hours"`
	StressLevel       int     `json:"stress_level"`
	WaterIntakeLiters float64 `json:"water_intake_liters"`
	Notes             string  `json:"notes"`
	PhotoBase64       string  `json:"photo_base64"` // data:image/jpeg;base64,...
}

type SkinScanService struct {
	repo       *repository.SkinScanRepository
	groqAPIKey string
	storage    *StorageService
	httpClient *http.Client
}

func NewSkinScanService(repo *repository.SkinScanRepository, groqAPIKey string, storage *StorageService) *SkinScanService {
	return &SkinScanService{
		repo:       repo,
		groqAPIKey: groqAPIKey,
		storage:    storage,
		httpClient: &http.Client{Timeout: 45 * time.Second},
	}
}

type visionScores struct {
	OverallScore           int      `json:"overall_score"`
	AcneScore              int      `json:"acne_score"`
	HydrationScore         int      `json:"hydration_score"`
	UniformityScore        int      `json:"uniformity_score"`
	TextureScore           int      `json:"texture_score"`
	AcneCount              int      `json:"acne_count"`
	AcneZones              []string `json:"acne_zones"`
	DarkSpotsCount         int      `json:"dark_spots_count"`
	HyperpigmentationLevel string   `json:"hyperpigmentation_level"`
	PoresCondition         string   `json:"pores_condition"`
	RednessLevel           string   `json:"redness_level"`
	FineLinesDetected      bool     `json:"fine_lines_detected"`
	OilinessZones          []string `json:"oiliness_zones"`
	DrynessZones           []string `json:"dryness_zones"`
}

func (s *SkinScanService) Analyze(ctx context.Context, userID uuid.UUID, input SkinScanInput, user *models.User) (*models.SkinScan, error) {
	var scores visionScores
	var err error

	if input.PhotoBase64 != "" && s.groqAPIKey != "" {
		log.Printf("[SkinScan] photo provided (%d chars), calling Groq Vision...", len(input.PhotoBase64))
		scores, err = s.analyzeWithVision(ctx, input, user)
		if err != nil {
			log.Printf("[SkinScan] Groq Vision FAILED: %v — falling back to lifestyle scoring", err)
			scores = s.lifestyleScores(input, user)
		} else {
			log.Printf("[SkinScan] Groq Vision OK — overall=%d acne=%d hydration=%d", scores.OverallScore, scores.AcneScore, scores.HydrationScore)
		}
	} else {
		log.Printf("[SkinScan] no photo or no API key — lifestyle scoring only")
		scores = s.lifestyleScores(input, user)
	}

	photoURL := "pending"
	if input.PhotoBase64 != "" && s.storage != nil {
		if url, err := s.storage.UploadBase64(ctx, "skin-scans", userID, input.PhotoBase64); err != nil {
			log.Printf("[SkinScan] R2 upload failed: %v", err)
		} else if url != "" {
			photoURL = url
		}
	}

	scan := &models.SkinScan{
		UserID:                 userID,
		PhotoURL:               photoURL,
		OverallScore:           scores.OverallScore,
		AcneScore:              scores.AcneScore,
		HydrationScore:         scores.HydrationScore,
		UniformityScore:        scores.UniformityScore,
		TextureScore:           scores.TextureScore,
		AcneCount:              scores.AcneCount,
		AcneZones:              pq.StringArray(scores.AcneZones),
		DarkSpotsCount:         scores.DarkSpotsCount,
		HyperpigmentationLevel: scores.HyperpigmentationLevel,
		PoresCondition:         scores.PoresCondition,
		OilinessZones:          pq.StringArray(scores.OilinessZones),
		DrynessZones:           pq.StringArray(scores.DrynessZones),
		RednessLevel:           scores.RednessLevel,
		FineLinesDetected:      scores.FineLinesDetected,
		SleepHours:             input.SleepHours,
		StressLevel:            input.StressLevel,
		WaterIntakeLiters:      input.WaterIntakeLiters,
		Notes:                  input.Notes,
	}

	// Rich, persisted, Aroma-Zone-style narrative diagnostic (best-effort).
	if diag := s.generateDiagnostic(ctx, scores, input, user); diag != nil {
		if b, err := json.Marshal(diag); err == nil {
			scan.AIAnalysis = models.JSON(b)
		}
	}

	if err := s.repo.Create(ctx, scan); err != nil {
		return nil, err
	}
	return scan, nil
}

// GetScanWithDiagnostic returns a scan and, if it doesn't yet have an AI
// diagnostic (older scans created before the feature), generates one from its
// stored scores and persists it — so history shows the full diagnostic too.
func (s *SkinScanService) GetScanWithDiagnostic(ctx context.Context, userID, scanID uuid.UUID, user *models.User) (*models.SkinScan, error) {
	scan, err := s.repo.FindByID(ctx, scanID, userID)
	if err != nil || scan == nil {
		return scan, err
	}
	if len(scan.AIAnalysis) > 0 {
		return scan, nil // already has a diagnostic
	}

	scores := scanToVisionScores(scan)
	input := SkinScanInput{
		SleepHours:        scan.SleepHours,
		StressLevel:       scan.StressLevel,
		WaterIntakeLiters: scan.WaterIntakeLiters,
	}
	if diag := s.generateDiagnostic(ctx, scores, input, user); diag != nil {
		if b, err := json.Marshal(diag); err == nil {
			scan.AIAnalysis = models.JSON(b)
			_ = s.repo.UpdateAIAnalysis(ctx, scan.ID, b)
		}
	}
	return scan, nil
}

// scanToVisionScores rebuilds the scoring struct from a persisted scan, so the
// diagnostic generator can run on an old scan without its original photo.
func scanToVisionScores(scan *models.SkinScan) visionScores {
	return visionScores{
		OverallScore:           scan.OverallScore,
		AcneScore:              scan.AcneScore,
		HydrationScore:         scan.HydrationScore,
		UniformityScore:        scan.UniformityScore,
		TextureScore:           scan.TextureScore,
		AcneCount:              scan.AcneCount,
		AcneZones:              []string(scan.AcneZones),
		DarkSpotsCount:         scan.DarkSpotsCount,
		HyperpigmentationLevel: scan.HyperpigmentationLevel,
		PoresCondition:         scan.PoresCondition,
		RednessLevel:           scan.RednessLevel,
		FineLinesDetected:      scan.FineLinesDetected,
		OilinessZones:          []string(scan.OilinessZones),
		DrynessZones:           []string(scan.DrynessZones),
	}
}

// SkinDiagnostic is the rich, personalized diagnostic persisted in
// SkinScan.AIAnalysis and shown identically on the live result and in history.
type SkinDiagnostic struct {
	SkinType           string        `json:"skin_type"` // grasse|sèche|mixte|sensible|normale
	Summary            string        `json:"summary"`
	Concerns           []DiagConcern `json:"concerns"`
	RecommendedActives []DiagActive  `json:"recommended_actives"`
	Avoid              []DiagActive  `json:"avoid"`
	Routine            DiagRoutine   `json:"routine"`
	LifestyleTips      []string      `json:"lifestyle_tips"`
}

type DiagConcern struct {
	Label       string `json:"label"`
	Severity    string `json:"severity"` // faible|modérée|élevée
	Explanation string `json:"explanation"`
}

type DiagActive struct {
	Name string `json:"name"`
	Why  string `json:"why"`
}

type DiagRoutine struct {
	Morning []string `json:"morning"`
	Evening []string `json:"evening"`
}

// generateDiagnostic asks the text model for a personalized skincare diagnostic
// based on the computed scores + the user's profile. Best-effort: returns nil on
// any failure so the scan is still saved with its scores.
func (s *SkinScanService) generateDiagnostic(ctx context.Context, sc visionScores, input SkinScanInput, user *models.User) *SkinDiagnostic {
	if s.groqAPIKey == "" {
		return nil
	}

	declaredType := "non précisé"
	ageLine := ""
	if user != nil {
		if user.SkinType != nil && *user.SkinType != "" {
			declaredType = *user.SkinType
		}
		if age := user.Age(); age > 0 {
			ageLine = fmt.Sprintf("\n- Âge : %d ans (adapte : prévention 18-25, premiers signes 25-35, anti-âge 35+)", age)
		}
	}

	join := func(items []string) string {
		if len(items) == 0 {
			return "aucune"
		}
		return strings.Join(items, ", ")
	}

	prompt := fmt.Sprintf(`Tu es un expert dermo-cosmétique. À partir des résultats d'analyse de peau ci-dessous, rédige un diagnostic personnalisé, concret et bienveillant, en français (style diagnostic peau professionnel type Aroma-Zone).

Résultats de l'analyse :
- Score global : %d/100
- Acné : %d/100 (%d imperfections, zones : %s)
- Hydratation : %d/100
- Texture : %d/100 (pores : %s)
- Uniformité du teint : %d/100 (%d taches, hyperpigmentation : %s)
- Rougeurs : %s
- Fines lignes : %v
- Zones grasses : %s
- Zones sèches : %s
- Type de peau déclaré : %s%s
- Mode de vie : sommeil %.1fh/nuit, stress %d/10, eau %.1fL/jour

Déduis le VRAI type de peau (grasse, sèche, mixte, sensible ou normale) à partir des données.
Renvoie UNIQUEMENT un objet JSON valide (sans markdown, sans texte autour) :
{
  "skin_type": "grasse|sèche|mixte|sensible|normale",
  "summary": "<2-3 phrases résumant l'état de la peau et le besoin principal>",
  "concerns": [{"label": "<préoccupation>", "severity": "faible|modérée|élevée", "explanation": "<1 phrase liée aux données>"}],
  "recommended_actives": [{"name": "<actif + dosage>", "why": "<pourquoi pour cette peau>"}],
  "avoid": [{"name": "<ingrédient ou famille à éviter>", "why": "<pourquoi>"}],
  "routine": {"morning": ["<étape concrète>"], "evening": ["<étape concrète>"]},
  "lifestyle_tips": ["<conseil mode de vie>"]
}
Règles : 2 à 4 "concerns" priorisées, 3 à 5 "recommended_actives", 1 à 3 "avoid", 3 à 5 étapes par routine, 2 à 3 "lifestyle_tips". Cite des actifs réels (niacinamide, acide hyaluronique, rétinol, vitamine C, acide azélaïque, centella, AHA/BHA, SPF...). Ne fais aucun diagnostic médical.`,
		sc.OverallScore, sc.AcneScore, sc.AcneCount, join(sc.AcneZones),
		sc.HydrationScore, sc.TextureScore, sc.PoresCondition,
		sc.UniformityScore, sc.DarkSpotsCount, sc.HyperpigmentationLevel,
		sc.RednessLevel, sc.FineLinesDetected, join(sc.OilinessZones), join(sc.DrynessZones),
		declaredType, ageLine, input.SleepHours, input.StressLevel, input.WaterIntakeLiters)

	prompt += "\n\n" + langDirective(ctx)

	reqBody := groqRequest{
		Model:       groqModel,
		Messages:    []groqMessage{{Role: "user", Content: prompt}},
		Temperature: 0.4,
		MaxTokens:   1200,
	}
	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.groqAPIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}

	var gr groqResponse
	if err := json.Unmarshal(respBytes, &gr); err != nil {
		return nil
	}
	if gr.Error != nil || len(gr.Choices) == 0 {
		log.Printf("[SkinScan] diagnostic generation skipped: empty/err response")
		return nil
	}

	raw := extractJSON(gr.Choices[0].Message.Content)
	var diag SkinDiagnostic
	if err := json.Unmarshal([]byte(raw), &diag); err != nil {
		log.Printf("[SkinScan] diagnostic parse failed: %v", err)
		return nil
	}
	return &diag
}

func (s *SkinScanService) analyzeWithVision(ctx context.Context, input SkinScanInput, user *models.User) (visionScores, error) {
	skinTypeContext := ""
	if user != nil && user.SkinType != nil {
		skinTypeContext = fmt.Sprintf("\nDeclared skin type by user (use as prior, but visual evidence takes priority): %s", *user.SkinType)
	}

	prompt := fmt.Sprintf(`You are a professional dermatologist analyzing a facial skin photo.
Score calibration reference:
- 90-100: excellent (e.g. acne_score 95 = 0-1 barely visible spots, texture_score 95 = glass skin)
- 70-89: good (mild imperfections, not concerning)
- 50-69: moderate (visible issues, improvement needed)
- 30-49: significant concerns (multiple visible problems)
- 0-29: severe (major skin concerns)

CONSISTENCY RULES — you must respect these:
- If acne_count >= 10, then acne_score must be <= 65
- If acne_count >= 20, then acne_score must be <= 40
- If redness_level is "élevé", then overall_score cannot exceed 70
- If hyperpigmentation_level is "élevé", then uniformity_score must be <= 50
- If pores_condition is "larges", then texture_score must be <= 65
- Oily skin type: expect larger pores and oiliness zones, lower texture baseline
- Dry skin type: expect dryness zones, possibly fine lines, lower hydration baseline
- Sensitive skin type: expect elevated redness, lower redness_level threshold
- Do NOT invent problems that are not visible. Score only what you can actually see.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "overall_score": <0-100, weighted: acne+hydration=60pct, texture+uniformity=40pct>,
  "acne_score": <0-100, 100=zero acne visible>,
  "hydration_score": <0-100, 100=perfectly plump hydrated skin>,
  "uniformity_score": <0-100, 100=perfectly even tone, no spots>,
  "texture_score": <0-100, 100=completely smooth pores>,
  "acne_count": <exact count 0-30, count visible spots/pimples>,
  "acne_zones": <array from ["T-zone","joues","menton","front","nez"]>,
  "dark_spots_count": <0-20>,
  "hyperpigmentation_level": <"faible"|"modéré"|"élevé">,
  "pores_condition": <"fins"|"modérés"|"larges">,
  "redness_level": <"faible"|"modéré"|"élevé">,
  "fine_lines_detected": <true|false>,
  "oiliness_zones": <array from ["T-zone","joues","front","nez"], empty if not visible>,
  "dryness_zones": <array from ["joues","contour des yeux","front"], empty if not visible>
}
Lifestyle context (secondary influence only): sleep=%.1fh, stress=%d/10, water=%.1fL/day.%s`,
		input.SleepHours, input.StressLevel, input.WaterIntakeLiters, skinTypeContext)

	type imageURL struct {
		URL string `json:"url"`
	}
	type contentPart struct {
		Type     string    `json:"type"`
		Text     string    `json:"text,omitempty"`
		ImageURL *imageURL `json:"image_url,omitempty"`
	}
	type visionMsg struct {
		Role    string        `json:"role"`
		Content []contentPart `json:"content"`
	}
	type visionReq struct {
		Model       string      `json:"model"`
		Messages    []visionMsg `json:"messages"`
		Temperature float64     `json:"temperature"`
		MaxTokens   int         `json:"max_tokens"`
	}

	reqBody := visionReq{
		Model: groqVisionModel,
		Messages: []visionMsg{
			{
				Role: "user",
				Content: []contentPart{
					{Type: "image_url", ImageURL: &imageURL{URL: input.PhotoBase64}},
					{Type: "text", Text: prompt},
				},
			},
		},
		Temperature: 0.1,
		MaxTokens:   512,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return visionScores{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqAPIURL, bytes.NewReader(body))
	if err != nil {
		return visionScores{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.groqAPIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return visionScores{}, err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return visionScores{}, err
	}

	log.Printf("[SkinScan] Groq HTTP status: %d, body: %.500s", resp.StatusCode, string(respBytes))

	var groqResp groqResponse
	if err := json.Unmarshal(respBytes, &groqResp); err != nil {
		return visionScores{}, fmt.Errorf("parse groq response: %w", err)
	}
	if groqResp.Error != nil {
		return visionScores{}, fmt.Errorf("groq error: %s", groqResp.Error.Message)
	}
	if len(groqResp.Choices) == 0 {
		return visionScores{}, fmt.Errorf("no choices")
	}

	raw := groqResp.Choices[0].Message.Content
	log.Printf("[SkinScan] Groq raw response: %.300s", raw)
	raw = extractJSON(raw)

	var scores visionScores
	if err := json.Unmarshal([]byte(raw), &scores); err != nil {
		return visionScores{}, fmt.Errorf("parse scores JSON: %w", err)
	}

	scores = clampScores(scores)
	return scores, nil
}

// extractJSON strips markdown code fences if LLM wraps output in ```json ... ```
func extractJSON(s string) string {
	re := regexp.MustCompile("(?s)```(?:json)?\\s*({.*?})\\s*```")
	if m := re.FindStringSubmatch(s); len(m) > 1 {
		return m[1]
	}
	// Try to find raw JSON object
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start >= 0 && end > start {
		return s[start : end+1]
	}
	return s
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func clampScores(s visionScores) visionScores {
	s.AcneScore = clamp(s.AcneScore, 0, 100)
	s.HydrationScore = clamp(s.HydrationScore, 0, 100)
	s.UniformityScore = clamp(s.UniformityScore, 0, 100)
	s.TextureScore = clamp(s.TextureScore, 0, 100)
	s.AcneCount = clamp(s.AcneCount, 0, 30)
	s.DarkSpotsCount = clamp(s.DarkSpotsCount, 0, 20)

	// Cross-validation : si acne_count élevé mais acne_score élevé → corriger
	if s.AcneCount >= 10 && s.AcneScore > 70 {
		s.AcneScore = clamp(100-s.AcneCount*4, 15, 70)
	}

	// Recalcul pondéré systématique — acné + hydratation = 60% du score global
	s.OverallScore = clamp(
		(s.AcneScore*30+s.HydrationScore*30+s.TextureScore*20+s.UniformityScore*20)/100,
		0, 100,
	)

	// Valeurs qualitatives par défaut si absentes
	if s.HyperpigmentationLevel == "" {
		s.HyperpigmentationLevel = "faible"
	}
	if s.PoresCondition == "" {
		s.PoresCondition = "modérés"
	}
	if s.RednessLevel == "" {
		s.RednessLevel = "faible"
	}
	return s
}

// lifestyleScores estimates skin metrics from lifestyle data only (no photo).
// Each metric has its own formula — no metric uses another as proxy.
func (s *SkinScanService) lifestyleScores(input SkinScanInput, user *models.User) visionScores {
	// ── Sleep impact ──────────────────────────────────────────────────────────
	// Optimal: 7-9h. Below 6h degrades all metrics significantly.
	sleepScore := 0
	switch {
	case input.SleepHours >= 7 && input.SleepHours <= 9:
		sleepScore = 10
	case input.SleepHours >= 6:
		sleepScore = 4
	case input.SleepHours >= 5:
		sleepScore = -5
	default:
		sleepScore = -15
	}

	// ── Stress impact ─────────────────────────────────────────────────────────
	// Scale: 1-10. Above 6 is problematic for skin.
	stressScore := clamp(-(input.StressLevel-3)*5, -35, 0)

	// ── Hydration impact ──────────────────────────────────────────────────────
	// 2L+ is optimal. Below 1L is significantly negative.
	waterScore := 0
	switch {
	case input.WaterIntakeLiters >= 2.5:
		waterScore = 15
	case input.WaterIntakeLiters >= 2.0:
		waterScore = 10
	case input.WaterIntakeLiters >= 1.5:
		waterScore = 5
	case input.WaterIntakeLiters >= 1.0:
		waterScore = 0
	default:
		waterScore = -10
	}

	// ── Skin type adjustments (from onboarding) ──────────────────────────────
	// These baselines reflect structural characteristics of each skin type.
	// Sources: Baumann Skin Type classification, JAMA Dermatology guidelines.
	skinType := ""
	if user != nil && user.SkinType != nil {
		skinType = *user.SkinType
	}

	// Base offsets per skin type for each metric
	hydrationBase := 65
	acneBase := 75
	textureBase := 70
	uniformityBase := 68
	rednessBase := 72
	poresBase := 70

	switch skinType {
	case "oily":
		// Oily skin: sebaceous glands overactive → larger pores, acne-prone, but paradoxically better hydrated surface
		acneBase -= 8      // more acne-prone structurally
		textureBase -= 5   // texture affected by oiliness
		poresBase -= 12    // pores more visible in oily skin (established in dermatology)
		hydrationBase += 5 // surface appears more hydrated (sebum ≠ hydration but surface moisture)
	case "dry":
		// Dry skin: impaired barrier function → dehydration, fine lines, sensitivity
		hydrationBase -= 12 // structural dehydration
		textureBase -= 5    // flakiness affects texture
		rednessBase -= 5    // dryness can trigger mild irritation
	case "combination":
		// Combination: T-zone oily, cheeks dry — split behavior
		acneBase -= 4
		poresBase -= 6
		hydrationBase -= 4
	case "sensitive":
		// Sensitive skin: reactive, easily irritated, redness-prone
		rednessBase -= 15   // significantly more redness-prone
		uniformityBase -= 5 // uneven tone from reactivity
		acneBase -= 5       // more prone to breakouts from irritation
	}

	// ── Per-metric formulas ────────────────────────────────────────────────────

	// Hydration: water intake is the main lifestyle driver, sleep secondary
	hydration := clamp(hydrationBase+waterScore+sleepScore/2, 20, 100)

	// Acne: stress (cortisol → sebum) and sleep (cellular repair) are primary drivers
	acne := clamp(acneBase+stressScore+sleepScore, 15, 100)

	// Texture: skin repair happens during sleep (Stage 3 NREM) + stress degrades barrier
	texture := clamp(textureBase+sleepScore+stressScore/3, 20, 100)

	// Uniformity: chronic stress triggers melanogenesis; poor sleep delays cell turnover
	uniformity := clamp(uniformityBase+waterScore/2+sleepScore/2+stressScore/4, 20, 100)

	// Redness: stress causes vasodilation; sleep deprivation increases inflammatory cytokines
	// Separate formula — NOT derived from acne score
	rednessVal := clamp(rednessBase+stressScore/2+sleepScore/2, 0, 100)
	redness := qualLevel(rednessVal, "faible", "modéré", "élevé")

	// Hyperpigmentation: UV exposure is primary (unknown here), so we use uniformity
	// + stress (cortisol stimulates melanocytes via ACTH pathway)
	hyperpigVal := clamp(uniformity+stressScore/3, 0, 100)
	hyperpig := qualLevel(hyperpigVal, "faible", "modéré", "élevé")

	// Pores: driven by sebaceous activity (stress) and skin elasticity (sleep/age)
	// Separate formula — NOT a copy of texture
	poresVal := clamp(poresBase+stressScore/2+sleepScore/3, 0, 100)
	pores := qualLevel(poresVal, "fins", "modérés", "larges")

	// Derived counts
	acneCount := clamp((100-acne)/10, 0, 15)
	darkSpots := clamp((100-uniformity)/18, 0, 8)
	fineLines := hydration < 50 || sleepScore <= -5

	// Zones — influenced by skin type
	var acneZones, oilinessZones, drynessZones []string
	if acne < 85 {
		acneZones = append(acneZones, "T-zone")
	}
	if acne < 65 {
		acneZones = append(acneZones, "joues", "menton")
	}
	if skinType == "combination" {
		// Combination skin: T-zone oily, cheeks dry
		oilinessZones = append(oilinessZones, "T-zone", "nez")
		drynessZones = append(drynessZones, "joues")
	} else {
		if hydration < 55 || skinType == "dry" {
			drynessZones = append(drynessZones, "joues", "contour des yeux")
		}
		if input.StressLevel >= 7 || skinType == "oily" {
			oilinessZones = append(oilinessZones, "T-zone", "front")
		}
	}

	// Weighted overall: acné + hydratation = 60%, texture + uniformité = 40%
	overall := clamp((acne*30+hydration*30+texture*20+uniformity*20)/100, 0, 100)

	return visionScores{
		OverallScore:           overall,
		AcneScore:              acne,
		HydrationScore:         hydration,
		UniformityScore:        uniformity,
		TextureScore:           texture,
		AcneCount:              acneCount,
		AcneZones:              acneZones,
		DarkSpotsCount:         darkSpots,
		HyperpigmentationLevel: hyperpig,
		PoresCondition:         pores,
		RednessLevel:           redness,
		FineLinesDetected:      fineLines,
		OilinessZones:          oilinessZones,
		DrynessZones:           drynessZones,
	}
}

// qualLevel converts a "high = good" score to a qualitative 3-level label.
// levels[0] = good/low, levels[1] = moderate, levels[2] = bad/high
func qualLevel(score int, good, moderate, bad string) string {
	if score >= 70 {
		return good
	}
	if score >= 45 {
		return moderate
	}
	return bad
}

