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
	EyeColor            string   `json:"eye_color"`
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
		EyeColor:               result.EyeColor,
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

	// Rich, persisted morphology/color diagnostic (best-effort).
	if diag := s.generateFaceDiagnostic(ctx, result, input.Gender); diag != nil {
		if b, err := json.Marshal(diag); err == nil {
			profile.StyleAnalysis = models.JSON(b)
		}
	}

	if err := s.repo.Create(ctx, profile); err != nil {
		return nil, fmt.Errorf("faceAnalysis: save profile: %w", err)
	}

	return profile, nil
}

// FaceDiagnostic is the rich, personalized morphology + colorimetry reading
// persisted in FaceProfile.StyleAnalysis and shown on the face analysis screen.
type FaceDiagnostic struct {
	Summary       string   `json:"summary"`
	Strengths     []string `json:"strengths"`
	FaceShapeTips []string `json:"face_shape_tips"`
	BestColors    []string `json:"best_colors"`
	ColorsToAvoid []string `json:"colors_to_avoid"`
	StyleTips     []string `json:"style_tips"`
}

// generateFaceDiagnostic asks the text model for a personalized image-consulting
// reading based on the detected morphology + coloring. Best-effort: nil on error.
func (s *FaceAnalysisService) generateFaceDiagnostic(ctx context.Context, r faceVisionResult, gender string) *FaceDiagnostic {
	if s.groqAPIKey == "" {
		return nil
	}

	genderLine := "non précisé (conseils neutres)"
	switch gender {
	case "male", "homme":
		genderLine = "homme (grooming / barbe, pas de maquillage)"
	case "female", "femme":
		genderLine = "femme (maquillage)"
	}

	prompt := fmt.Sprintf(`Tu es un expert en morphologie du visage et en colorimétrie (conseil en image). À partir de l'analyse ci-dessous, rédige un diagnostic personnalisé, VALORISANT et concret, en français.

Analyse :
- Forme du visage : %s
- Yeux : %s, écart %s
- Nez : %s · Lèvres : %s · Mâchoire : %s
- Carnation (Fitzpatrick) : %s
- Sous-ton : %s
- Saison couleur : %s
- Profil : %s

Renvoie UNIQUEMENT un objet JSON valide (sans markdown) :
{
  "summary": "<2-3 phrases : lecture morpho + colorimétrie, ton valorisant>",
  "strengths": ["<atout du visage à mettre en valeur>"],
  "face_shape_tips": ["<conseil pour équilibrer la forme : coiffure / lunettes / encolure (+ barbe si homme)>"],
  "best_colors": ["<couleur qui sublime le teint>"],
  "colors_to_avoid": ["<couleur à éviter>"],
  "style_tips": ["<conseil maquillage (femme) ou grooming (homme) actionnable>"]
}
Règles : 2-3 "strengths", 2-4 "face_shape_tips", 4-6 "best_colors", 1-3 "colors_to_avoid", 2-4 "style_tips". Reste bienveillant et factuel, aucun jugement esthétique négatif.`,
		r.FaceShape, r.EyeShape, r.EyeDistance, r.NoseShape, r.LipShape, r.JawType,
		r.SkinTone, r.Undertone, r.ColorSeason, genderLine)

	reqBody := groqRequest{
		Model:       groqModel,
		Messages:    []groqMessage{{Role: "user", Content: prompt}},
		Temperature: 0.5,
		MaxTokens:   1000,
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
		return nil
	}

	raw := extractJSONFace(gr.Choices[0].Message.Content)
	var diag FaceDiagnostic
	if err := json.Unmarshal([]byte(raw), &diag); err != nil {
		log.Printf("[FaceAnalysis] diagnostic parse failed: %v", err)
		return nil
	}
	return &diag
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
- Look carefully at the IRIS color (the actual pigment) → eye_color
- Look at the actual jaw structure → do NOT default to "defined"

Face shape guide: oval=balanced, round=equal width+height, square=angular jaw, heart=wide forehead+narrow jaw, oblong=longer than wide, diamond=narrow forehead+jaw+wide cheeks

%s
%s

Return ONLY valid JSON (no markdown):
{
  "face_shape": <"oval"|"round"|"square"|"heart"|"oblong"|"diamond">,
  "face_shape_confidence": <0.0-1.0>,
  "eye_shape": <"almond"|"round"|"hooded"|"monolid"|"upturned"|"downturned">,
  "eye_color": <"marron"|"noisette"|"vert"|"bleu"|"gris"|"ambre"|"noir">,
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
	validEyeColors := map[string]bool{"marron": true, "noisette": true, "vert": true, "bleu": true, "gris": true, "ambre": true, "noir": true}
	if !validEyeColors[r.EyeColor] {
		r.EyeColor = "marron"
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
		EyeColor:            "marron",
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
