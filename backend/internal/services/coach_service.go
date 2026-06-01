package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
)

const groqAPIURL = "https://api.groq.com/openai/v1/chat/completions"
const groqModel = "llama-3.3-70b-versatile"

type CoachService struct {
	repo            *repository.CoachRepository
	userRepo        *repository.UserRepository
	skinScanRepo    *repository.SkinScanRepository
	faceProfileRepo *repository.FaceProfileRepository
	productRepo     *repository.ScannedProductRepository
	groqAPIKey      string
	httpClient      *http.Client
}

func NewCoachService(
	repo *repository.CoachRepository,
	userRepo *repository.UserRepository,
	skinScanRepo *repository.SkinScanRepository,
	faceProfileRepo *repository.FaceProfileRepository,
	productRepo *repository.ScannedProductRepository,
	groqAPIKey string,
) *CoachService {
	return &CoachService{
		repo:            repo,
		userRepo:        userRepo,
		skinScanRepo:    skinScanRepo,
		faceProfileRepo: faceProfileRepo,
		productRepo:     productRepo,
		groqAPIKey:      groqAPIKey,
		httpClient:      &http.Client{Timeout: 60 * time.Second},
	}
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqRequest struct {
	Model       string        `json:"model"`
	Messages    []groqMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
}

type groqResponse struct {
	Choices []struct {
		Message groqMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (s *CoachService) buildSystemPrompt(ctx context.Context, user *models.User, userID uuid.UUID) string {
	var sb strings.Builder
	sb.WriteString("Tu es Lumis Coach, un coach beauté et skincare IA hautement spécialisé. ")
	sb.WriteString("RÈGLE ABSOLUE : tu NE donnes JAMAIS de conseils génériques. ")
	sb.WriteString("Chaque réponse doit citer explicitement les données du profil de l'utilisateur (scores, zones, undertone, saison couleur, objectifs). ")
	sb.WriteString("Si tu ne peux pas personnaliser ta réponse avec les données disponibles, demande plus d'informations. ")
	sb.WriteString("Tu parles en français, ton ton est expert, direct et bienveillant. ")
	sb.WriteString("Réponses : max 4 paragraphes, toujours actionnables avec des étapes concrètes. ")
	sb.WriteString("Tu ne donnes pas de conseils médicaux — dermatologue pour problèmes persistants.\n\n")

	sb.WriteString("## Profil de l'utilisateur\n")
	if user != nil {
		if user.FullName != nil {
			fmt.Fprintf(&sb, "- Prénom : %s\n", strings.Split(*user.FullName, " ")[0])
		}
		if user.Gender != nil {
			fmt.Fprintf(&sb, "- Genre : %s\n", *user.Gender)
		}
		if len(user.Goals) > 0 {
			fmt.Fprintf(&sb, "- Objectifs : %s\n", strings.Join(user.Goals, ", "))
		}
	}

	// Skin scan data
	if s.skinScanRepo != nil {
		if scan, err := s.skinScanRepo.FindLatestByUser(ctx, userID); err == nil && scan != nil {
			sb.WriteString("\n## Dernière analyse de peau\n")
			fmt.Fprintf(&sb, "- Score global : %d/100\n", scan.OverallScore)
			fmt.Fprintf(&sb, "- Hydratation : %d/100\n", scan.HydrationScore)
			fmt.Fprintf(&sb, "- Acné : %d/100 (100 = aucune acné)\n", scan.AcneScore)
			fmt.Fprintf(&sb, "- Texture : %d/100\n", scan.TextureScore)
			fmt.Fprintf(&sb, "- Uniformité : %d/100\n", scan.UniformityScore)
			fmt.Fprintf(&sb, "- Rougeur : %s\n", scan.RednessLevel)
			fmt.Fprintf(&sb, "- Pores : %s\n", scan.PoresCondition)
			fmt.Fprintf(&sb, "- Hyperpigmentation : %s\n", scan.HyperpigmentationLevel)
			if len(scan.AcneZones) > 0 {
				fmt.Fprintf(&sb, "- Zones acnéiques : %s\n", strings.Join(scan.AcneZones, ", "))
			}
			if len(scan.DrynessZones) > 0 {
				fmt.Fprintf(&sb, "- Zones de sécheresse : %s\n", strings.Join(scan.DrynessZones, ", "))
			}
			if len(scan.OilinessZones) > 0 {
				fmt.Fprintf(&sb, "- Zones grasses : %s\n", strings.Join(scan.OilinessZones, ", "))
			}
			if scan.FineLinesDetected {
				sb.WriteString("- Ridules fines détectées : oui\n")
			}
			fmt.Fprintf(&sb, "- Sommeil : %.1fh/nuit | Stress : %d/10 | Eau : %.1fL/jour\n",
				scan.SleepHours, scan.StressLevel, scan.WaterIntakeLiters)
			if scan.Notes != "" {
				fmt.Fprintf(&sb, "- Notes : %s\n", scan.Notes)
			}
		}
	}

	// Face profile data
	if s.faceProfileRepo != nil {
		if profile, err := s.faceProfileRepo.FindLatestByUser(ctx, userID); err == nil && profile != nil {
			sb.WriteString("\n## Profil facial\n")
			fmt.Fprintf(&sb, "- Forme du visage : %s\n", profile.FaceShape)
			fmt.Fprintf(&sb, "- Teinte de peau : %s\n", profile.SkinTone)
			fmt.Fprintf(&sb, "- Undertone : %s\n", profile.Undertone)
			fmt.Fprintf(&sb, "- Saison couleur : %s\n", profile.ColorSeason)
			fmt.Fprintf(&sb, "- Forme des yeux : %s\n", profile.EyeShape)
		}
	}

	// Scanned products (last 5)
	if s.productRepo != nil {
		if products, err := s.productRepo.FindHistoryByUser(ctx, userID, 5); err == nil && len(products) > 0 {
			sb.WriteString("\n## Produits récemment scannés par l'utilisateur\n")
			for _, p := range products {
				if p.NotFound {
					continue
				}
				fmt.Fprintf(&sb, "- %s (%s) — %s, score compatibilité : %d/100, verdict : %s\n",
					p.ProductName, p.Brand, p.Category, p.CompatibilityScore, p.Verdict)
				if p.Tip != "" {
					fmt.Fprintf(&sb, "  Conseil : %s\n", p.Tip)
				}
			}
		}
	}

	sb.WriteString("\nUtilise ces données pour répondre de façon ultra-personnalisée. Ne répète pas ces infos sauf si pertinent.\n")

	return sb.String()
}

// SendMessage sends a user message to the coach and returns the assistant reply.
func (s *CoachService) SendMessage(ctx context.Context, userID uuid.UUID, convID uuid.UUID, content string) (*models.CoachMessage, error) {
	if s.groqAPIKey == "" {
		return nil, fmt.Errorf("groq API key not configured")
	}

	user, _ := s.userRepo.FindByID(ctx, userID)

	// save user message
	userMsg := &models.CoachMessage{
		ConversationID: convID,
		Role:           "user",
		Content:        content,
	}
	if err := s.repo.AddMessage(ctx, userMsg); err != nil {
		return nil, fmt.Errorf("save user message: %w", err)
	}

	// fetch recent history (last 20 messages) for context
	history, err := s.repo.GetRecentMessages(ctx, convID, 20)
	if err != nil {
		return nil, fmt.Errorf("fetch history: %w", err)
	}

	// build groq messages
	messages := []groqMessage{
		{Role: "system", Content: s.buildSystemPrompt(ctx, user, userID)},
	}
	for _, m := range history {
		messages = append(messages, groqMessage{Role: m.Role, Content: m.Content})
	}

	// call groq
	reply, err := s.callGroq(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("groq call: %w", err)
	}

	// save assistant message
	assistantMsg := &models.CoachMessage{
		ConversationID: convID,
		Role:           "assistant",
		Content:        reply,
	}
	if err := s.repo.AddMessage(ctx, assistantMsg); err != nil {
		return nil, fmt.Errorf("save assistant message: %w", err)
	}

	// update conversation title from first user message
	msgs, _ := s.repo.GetMessages(ctx, convID, 2)
	if len(msgs) <= 2 {
		title := content
		if len(title) > 60 {
			title = title[:57] + "..."
		}
		_ = s.repo.UpdateConversationTitle(ctx, convID, title)
	}

	return assistantMsg, nil
}

func (s *CoachService) callGroq(ctx context.Context, messages []groqMessage) (string, error) {
	reqBody := groqRequest{
		Model:       groqModel,
		Messages:    messages,
		Temperature: 0.7,
		MaxTokens:   1024,
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
		return "", fmt.Errorf("no choices in groq response")
	}

	return groqResp.Choices[0].Message.Content, nil
}
