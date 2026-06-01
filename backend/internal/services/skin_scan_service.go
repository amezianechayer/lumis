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

func (s *SkinScanService) Analyze(ctx context.Context, userID uuid.UUID, input SkinScanInput) (*models.SkinScan, error) {
	var scores visionScores
	var err error

	if input.PhotoBase64 != "" && s.groqAPIKey != "" {
		log.Printf("[SkinScan] photo provided (%d chars), calling Groq Vision...", len(input.PhotoBase64))
		scores, err = s.analyzeWithVision(ctx, input)
		if err != nil {
			log.Printf("[SkinScan] Groq Vision FAILED: %v — falling back to lifestyle scoring", err)
			scores = s.lifestyleScores(input)
		} else {
			log.Printf("[SkinScan] Groq Vision OK — overall=%d acne=%d hydration=%d", scores.OverallScore, scores.AcneScore, scores.HydrationScore)
		}
	} else {
		log.Printf("[SkinScan] no photo or no API key — lifestyle scoring only")
		scores = s.lifestyleScores(input)
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

	if err := s.repo.Create(ctx, scan); err != nil {
		return nil, err
	}
	return scan, nil
}

func (s *SkinScanService) analyzeWithVision(ctx context.Context, input SkinScanInput) (visionScores, error) {
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
Lifestyle context (secondary influence only): sleep=%.1fh, stress=%d/10, water=%.1fL/day.`,
		input.SleepHours, input.StressLevel, input.WaterIntakeLiters)

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
func (s *SkinScanService) lifestyleScores(input SkinScanInput) visionScores {
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

	// ── Per-metric formulas (each with its own baseline) ─────────────────────

	// Hydration: driven primarily by water intake, secondarily by sleep
	hydration := clamp(65+waterScore+sleepScore/2, 20, 100)

	// Acne: driven primarily by stress and sleep (hormonal & inflammatory)
	acne := clamp(75+stressScore+sleepScore, 15, 100)

	// Texture: driven by sleep (skin repair happens at night) + partial stress
	texture := clamp(70+sleepScore+stressScore/3, 20, 100)

	// Uniformity: driven by hydration and sleep, stress contributes via inflammation
	uniformity := clamp(68+waterScore/2+sleepScore/2+stressScore/4, 20, 100)

	// Redness: driven by stress (vasodilation) and poor sleep (inflammation).
	// Separate formula — NOT derived from acne score.
	rednessBase := clamp(72+stressScore/2+sleepScore/2, 0, 100)
	redness := qualLevel(rednessBase, "faible", "modéré", "élevé")

	// Hyperpigmentation: driven by uniformity score + partial stress.
	// Stress triggers melanogenesis; poor uniformity correlates with dark spots.
	hyperpigBase := clamp(uniformity+stressScore/3, 0, 100)
	hyperpig := qualLevel(hyperpigBase, "faible", "modéré", "élevé")

	// Pores: correlate with oiliness (stress-driven) and skin texture.
	// Separate formula — NOT a copy of texture.
	poresBase := clamp(70+stressScore/2+sleepScore/3, 0, 100)
	pores := qualLevel(poresBase, "fins", "modérés", "larges")

	// Derived counts
	acneCount := clamp((100-acne)/10, 0, 15)
	darkSpots := clamp((100-uniformity)/18, 0, 8)
	fineLines := hydration < 50 || sleepScore <= -5

	// Zones
	var acneZones, oilinessZones, drynessZones []string
	if acne < 85 {
		acneZones = append(acneZones, "T-zone")
	}
	if acne < 65 {
		acneZones = append(acneZones, "joues", "menton")
	}
	if hydration < 55 {
		drynessZones = append(drynessZones, "joues", "contour des yeux")
	}
	if input.StressLevel >= 7 {
		oilinessZones = append(oilinessZones, "T-zone", "front")
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

