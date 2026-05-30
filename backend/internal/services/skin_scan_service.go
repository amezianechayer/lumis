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
	prompt := fmt.Sprintf(`Analyze this facial skin photo carefully. Return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{
  "overall_score": <0-100>,
  "acne_score": <0-100, 100=no acne>,
  "hydration_score": <0-100, 100=perfectly hydrated>,
  "uniformity_score": <0-100, 100=perfectly even tone>,
  "texture_score": <0-100, 100=smooth>,
  "acne_count": <0-30>,
  "acne_zones": <array from ["T-zone","joues","menton","front","nez"]>,
  "dark_spots_count": <0-20>,
  "hyperpigmentation_level": <"faible"|"modéré"|"élevé">,
  "pores_condition": <"fins"|"modérés"|"larges">,
  "redness_level": <"faible"|"modéré"|"élevé">,
  "fine_lines_detected": <true|false>,
  "oiliness_zones": <array from ["T-zone","joues","front","nez"]>,
  "dryness_zones": <array from ["joues","contour des yeux","front"]>
}
Lifestyle context: sleep=%.1fh, stress=%d/10, water=%.1fL.`,
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
	s.OverallScore = clamp(s.OverallScore, 0, 100)
	s.AcneScore = clamp(s.AcneScore, 0, 100)
	s.HydrationScore = clamp(s.HydrationScore, 0, 100)
	s.UniformityScore = clamp(s.UniformityScore, 0, 100)
	s.TextureScore = clamp(s.TextureScore, 0, 100)
	s.AcneCount = clamp(s.AcneCount, 0, 30)
	s.DarkSpotsCount = clamp(s.DarkSpotsCount, 0, 20)
	if s.OverallScore == 0 {
		s.OverallScore = (s.AcneScore + s.HydrationScore + s.TextureScore + s.UniformityScore) / 4
	}
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

// lifestyleScores is the fallback when no photo is provided
func (s *SkinScanService) lifestyleScores(input SkinScanInput) visionScores {
	sleepBonus := 0
	if input.SleepHours >= 7 && input.SleepHours <= 9 {
		sleepBonus = 12
	} else if input.SleepHours >= 6 {
		sleepBonus = 6
	} else if input.SleepHours < 5 {
		sleepBonus = -10
	}

	stressPenalty := clamp((input.StressLevel-1)*4, 0, 36)

	waterBonus := 0
	if input.WaterIntakeLiters >= 2.0 {
		waterBonus = 15
	} else if input.WaterIntakeLiters >= 1.5 {
		waterBonus = 8
	} else if input.WaterIntakeLiters < 1.0 {
		waterBonus = -8
	}

	hydration := clamp(52+waterBonus+sleepBonus/2, 20, 100)
	acne := clamp(72-stressPenalty+sleepBonus/2, 15, 100)
	texture := clamp(65+sleepBonus, 20, 100)
	uniformity := clamp(60+waterBonus/2+sleepBonus/2, 20, 100)
	overall := (hydration + acne + texture + uniformity) / 4

	acneCount := clamp((100-acne)/12, 0, 15)
	hyperpig := levelFromScore(acne, []string{"faible", "modéré", "élevé"})
	pores := levelFromScore(texture, []string{"fins", "modérés", "larges"})
	redness := levelFromScore(acne, []string{"faible", "modéré", "élevé"})
	darkSpots := clamp((100-uniformity)/20, 0, 8)
	fineLines := hydration < 50

	var oilinessZones, drynessZones []string
	if hydration < 55 {
		drynessZones = []string{"joues", "contour des yeux"}
	}
	if stressPenalty > 16 {
		oilinessZones = []string{"T-zone", "front"}
	}

	acneZones := []string{}
	if acne < 85 {
		acneZones = []string{"T-zone"}
	}
	if acne < 60 {
		acneZones = append(acneZones, "joues")
	}

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

func levelFromScore(score int, levels []string) string {
	if score >= 70 {
		return levels[0]
	}
	if score >= 45 {
		return levels[1]
	}
	return levels[2]
}
