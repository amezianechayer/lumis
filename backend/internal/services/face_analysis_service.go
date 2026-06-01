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

type FaceAnalysisInput struct {
	PhotoBase64  string `json:"photo_base64"`
	SkinToneHint string `json:"skin_tone_hint"`
	VeinHint     string `json:"vein_hint"`
	Gender       string `json:"gender"`
}

type FaceAnalysisService struct {
	repo       *repository.FaceProfileRepository
	groqAPIKey string
	httpClient *http.Client
}

func NewFaceAnalysisService(repo *repository.FaceProfileRepository, groqAPIKey string) *FaceAnalysisService {
	return &FaceAnalysisService{
		repo:       repo,
		groqAPIKey: groqAPIKey,
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

type faceVisionResult struct {
	FaceShape           string   `json:"face_shape"`
	FaceShapeConfidence float64  `json:"face_shape_confidence"`
	EyeShape            string   `json:"eye_shape"`
	EyeDistance         string   `json:"eye_distance"`
	NoseShape           string   `json:"nose_shape"`
	LipShape            string   `json:"lip_shape"`
	JawType             string   `json:"jaw_type"`
	SkinTone            string   `json:"skin_tone"`
	Undertone           string   `json:"undertone"`
	ColorSeason         string   `json:"color_season"`
	BeardRecs           []string `json:"beard_recommendations"`
	HaircutRecs         []string `json:"haircut_recommendations"`
}

func (s *FaceAnalysisService) Analyze(ctx context.Context, userID uuid.UUID, input FaceAnalysisInput) (*models.FaceProfile, error) {
	var result faceVisionResult
	var err error

	if input.PhotoBase64 != "" && s.groqAPIKey != "" {
		result, err = s.analyzeWithVision(ctx, input)
		if err != nil {
			log.Printf("[FaceAnalysis] Groq Vision failed: %v — using fallback", err)
			result = defaultFaceResult(input)
		}
	} else {
		result = defaultFaceResult(input)
	}

	skinTone := result.SkinTone
	if skinTone == "" {
		skinTone = input.SkinToneHint
	}
	if skinTone == "" {
		skinTone = "fitzpatrick_3"
	}

	profile := &models.FaceProfile{
		UserID:                 userID,
		PhotoURL:               "pending",
		FaceShape:              result.FaceShape,
		FaceShapeConfidence:    result.FaceShapeConfidence,
		EyeShape:               result.EyeShape,
		EyeDistance:            result.EyeDistance,
		SkinTone:               skinTone,
		Undertone:              result.Undertone,
		ColorSeason:            result.ColorSeason,
		NoseShape:              result.NoseShape,
		LipShape:               result.LipShape,
		JawType:                result.JawType,
		BeardRecommendations:   pq.StringArray(result.BeardRecs),
		HaircutRecommendations: pq.StringArray(result.HaircutRecs),
		Landmarks:              nil,
		AnalysisVersion:        "2.0",
	}

	if err := s.repo.Create(ctx, profile); err != nil {
		return nil, fmt.Errorf("faceAnalysis: save profile: %w", err)
	}

	return profile, nil
}

func (s *FaceAnalysisService) analyzeWithVision(ctx context.Context, input FaceAnalysisInput) (faceVisionResult, error) {
	gender := input.Gender
	genderHint := ""
	haircutGuide := ""
	beardGuide := ""

	switch gender {
	case "male", "homme":
		genderHint = " This person is MALE."
		haircutGuide = `For MALE haircuts, recommend specific men's cuts based on face shape:
- oval: versatile, most cuts work (undercut, textured_crop, side_part, quiff)
- round: cuts with height on top (pompadour, faux_hawk, slick_back, undercut)
- square: softening cuts (textured_fringe, messy_top, side_swept, long_top_fade)
- heart: volume on sides/bottom (side_part, layered, buzz_cut_fade)
- oblong: avoid height, add width (side_part, fringe, buzz_cut)
- diamond: medium length, side_part, waves`
		beardGuide = `Recommend beard styles that balance the face shape.`
	case "female", "femme":
		genderHint = " This person is FEMALE."
		haircutGuide = `For FEMALE haircuts, recommend specific women's cuts based on face shape:
- oval: versatile, most cuts work (long_layers, bob, lob, curtain_bangs, pixie)
- round: elongating cuts (long_layers, side_swept_bangs, lob, high_bun)
- square: softening cuts (curtain_bangs, long_waves, side_part, layered_bob)
- heart: chin_length_bob, side_swept_bangs, long_layers_with_volume_below_chin
- oblong: avoid too long, add width (bob, curtain_bangs, soft_waves, collarbone_length)
- diamond: chin_length_bob, side_swept_bangs, full_fringe`
		beardGuide = `Set beard_recommendations to empty array [] for female.`
	default:
		genderHint = ""
		haircutGuide = "Recommend gender-neutral or unisex cuts appropriate for the face shape."
		beardGuide = "If beard is visible suggest styles, otherwise empty array []."
	}

	prompt := fmt.Sprintf(`You are a professional facial analyst and hairstyle consultant. Look very carefully at THIS specific person's face in the photo.%s

CRITICAL: Every person's face is unique. You MUST observe what you actually SEE, not generic defaults.
- Look at the actual width vs height ratio → face_shape
- Look at the actual eye shape → do NOT default to "almond"
- Look at the actual jaw structure → do NOT default to "defined"

Face shape guide: oval=balanced, round=equal width+height, square=angular jaw, heart=wide forehead+narrow jaw, oblong=longer than wide, diamond=narrow forehead+jaw+wide cheeks

%s
%s

Return ONLY valid JSON (no markdown):
{
  "face_shape": <"oval"|"round"|"square"|"heart"|"oblong"|"diamond">,
  "face_shape_confidence": <0.0-1.0>,
  "eye_shape": <"almond"|"round"|"hooded"|"monolid"|"upturned"|"downturned">,
  "eye_distance": <"close"|"average"|"wide">,
  "nose_shape": <"straight"|"button"|"wide"|"narrow"|"upturned">,
  "lip_shape": <"thin"|"full"|"heart"|"wide"|"downturned">,
  "jaw_type": <"soft"|"defined"|"square"|"pointed">,
  "skin_tone": <"fitzpatrick_1"|"fitzpatrick_2"|"fitzpatrick_3"|"fitzpatrick_4"|"fitzpatrick_5"|"fitzpatrick_6">,
  "undertone": <"cool"|"warm"|"neutral">,
  "color_season": <"spring"|"summer"|"autumn"|"winter">,
  "beard_recommendations": <array of 2-3 specific styles OR [] if female>,
  "haircut_recommendations": <array of 2-3 gender-appropriate specific cuts for THIS face shape>
}`, genderHint, haircutGuide, beardGuide)

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
		Temperature: 0.3,
		MaxTokens:   600,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return faceVisionResult{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqAPIURL, bytes.NewReader(body))
	if err != nil {
		return faceVisionResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.groqAPIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return faceVisionResult{}, err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return faceVisionResult{}, err
	}

	log.Printf("[FaceAnalysis] Groq HTTP %d, body: %.300s", resp.StatusCode, string(respBytes))

	var groqResp groqResponse
	if err := json.Unmarshal(respBytes, &groqResp); err != nil {
		return faceVisionResult{}, fmt.Errorf("parse groq response: %w", err)
	}
	if groqResp.Error != nil {
		return faceVisionResult{}, fmt.Errorf("groq error: %s", groqResp.Error.Message)
	}
	if len(groqResp.Choices) == 0 {
		return faceVisionResult{}, fmt.Errorf("no choices")
	}

	raw := groqResp.Choices[0].Message.Content
	raw = extractJSONFace(raw)

	var result faceVisionResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return faceVisionResult{}, fmt.Errorf("parse face JSON: %w", err)
	}

	result = sanitizeFaceResult(result)
	return result, nil
}

func extractJSONFace(s string) string {
	re := regexp.MustCompile("(?s)```(?:json)?\\s*({.*?})\\s*```")
	if m := re.FindStringSubmatch(s); len(m) > 1 {
		return m[1]
	}
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start >= 0 && end > start {
		return s[start : end+1]
	}
	return s
}

func sanitizeFaceResult(r faceVisionResult) faceVisionResult {
	validShapes := map[string]bool{"oval": true, "round": true, "square": true, "heart": true, "oblong": true, "diamond": true}
	if !validShapes[r.FaceShape] {
		r.FaceShape = "oval"
	}
	if r.FaceShapeConfidence <= 0 || r.FaceShapeConfidence > 1 {
		r.FaceShapeConfidence = 0.75
	}
	if r.EyeShape == "" {
		r.EyeShape = "almond"
	}
	if r.EyeDistance == "" {
		r.EyeDistance = "average"
	}
	if r.NoseShape == "" {
		r.NoseShape = "straight"
	}
	if r.LipShape == "" {
		r.LipShape = "full"
	}
	if r.JawType == "" {
		r.JawType = "defined"
	}
	validUndertones := map[string]bool{"cool": true, "warm": true, "neutral": true}
	if !validUndertones[r.Undertone] {
		r.Undertone = "neutral"
	}
	validSeasons := map[string]bool{"spring": true, "summer": true, "autumn": true, "winter": true}
	if !validSeasons[r.ColorSeason] {
		r.ColorSeason = "summer"
	}
	if len(r.BeardRecs) == 0 {
		r.BeardRecs = []string{"short_stubble", "clean_shaven"}
	}
	if len(r.HaircutRecs) == 0 {
		r.HaircutRecs = []string{"side_part", "textured_crop"}
	}
	return r
}

func defaultFaceResult(input FaceAnalysisInput) faceVisionResult {
	undertone := "neutral"
	season := "summer"
	if input.VeinHint == "blue" {
		undertone = "cool"
		season = "winter"
	} else if input.VeinHint == "green" {
		undertone = "warm"
		season = "autumn"
	}
	return faceVisionResult{
		FaceShape:           "oval",
		FaceShapeConfidence: 0.6,
		EyeShape:            "almond",
		EyeDistance:         "average",
		NoseShape:           "straight",
		LipShape:            "full",
		JawType:             "defined",
		SkinTone:            input.SkinToneHint,
		Undertone:           undertone,
		ColorSeason:         season,
		BeardRecs:           []string{"short_stubble", "clean_shaven"},
		HaircutRecs:         []string{"side_part", "textured_crop"},
	}
}
