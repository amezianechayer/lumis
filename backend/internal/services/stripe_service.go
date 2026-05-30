package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/webhook"
)

type StripeService struct {
	secretKey      string
	webhookSecret  string
	priceID        string
	userRepo       *repository.UserRepository
}

func NewStripeService(secretKey, webhookSecret, priceID string, userRepo *repository.UserRepository) *StripeService {
	if secretKey != "" {
		stripe.Key = secretKey
	}
	return &StripeService{
		secretKey:     secretKey,
		webhookSecret: webhookSecret,
		priceID:       priceID,
		userRepo:      userRepo,
	}
}

func (s *StripeService) Enabled() bool {
	return s.secretKey != "" && s.priceID != ""
}

type CheckoutResult struct {
	URL       string `json:"url"`
	SessionID string `json:"session_id"`
}

func (s *StripeService) CreateCheckoutSession(ctx context.Context, userID uuid.UUID, email, successURL, cancelURL string) (*CheckoutResult, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user not found")
	}

	// Create or reuse Stripe customer
	customerID := ""
	if user.StripeCustomerID != nil && *user.StripeCustomerID != "" {
		customerID = *user.StripeCustomerID
	} else {
		c, err := customer.New(&stripe.CustomerParams{
			Email: stripe.String(email),
			Metadata: map[string]string{
				"lumis_user_id": userID.String(),
			},
		})
		if err != nil {
			return nil, fmt.Errorf("create stripe customer: %w", err)
		}
		customerID = c.ID
		if err := s.userRepo.SetStripeCustomerID(ctx, userID, customerID); err != nil {
			log.Printf("[Stripe] failed to save customer ID: %v", err)
		}
	}

	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(s.priceID),
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		Metadata: map[string]string{
			"lumis_user_id": userID.String(),
		},
	}

	sess, err := session.New(params)
	if err != nil {
		return nil, fmt.Errorf("create checkout session: %w", err)
	}

	return &CheckoutResult{
		URL:       sess.URL,
		SessionID: sess.ID,
	}, nil
}

func (s *StripeService) HandleWebhook(payload []byte, signature string) error {
	var event stripe.Event

	if s.webhookSecret != "" && signature != "" {
		var err error
		event, err = webhook.ConstructEvent(payload, signature, s.webhookSecret)
		if err != nil {
			return fmt.Errorf("invalid webhook signature: %w", err)
		}
	} else {
		// Dev mode: no signature verification
		if err := json.Unmarshal(payload, &event); err != nil {
			return fmt.Errorf("parse webhook payload: %w", err)
		}
	}

	log.Printf("[Stripe] webhook event: %s", event.Type)

	switch event.Type {
	case "checkout.session.completed":
		return s.handleCheckoutCompleted(event)
	case "customer.subscription.deleted", "customer.subscription.updated":
		return s.handleSubscriptionChange(event)
	}
	return nil
}

func (s *StripeService) handleCheckoutCompleted(event stripe.Event) error {
	var sess stripe.CheckoutSession
	if err := parseStripeObject(event.Data.Raw, &sess); err != nil {
		return err
	}

	userIDStr, ok := sess.Metadata["lumis_user_id"]
	if !ok || userIDStr == "" {
		return fmt.Errorf("no lumis_user_id in session metadata")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return fmt.Errorf("invalid user ID in metadata: %w", err)
	}

	premiumUntil := time.Now().AddDate(1, 0, 0) // 1 year subscription
	if err := s.userRepo.SetPremium(context.Background(), userID, premiumUntil); err != nil {
		return fmt.Errorf("set premium: %w", err)
	}

	log.Printf("[Stripe] user %s is now premium until %s", userID, premiumUntil.Format("2006-01-02"))
	return nil
}

func (s *StripeService) handleSubscriptionChange(event stripe.Event) error {
	var sub stripe.Subscription
	if err := parseStripeObject(event.Data.Raw, &sub); err != nil {
		return err
	}

	if sub.Status == stripe.SubscriptionStatusCanceled || sub.Status == stripe.SubscriptionStatusUnpaid {
		userIDStr, ok := sub.Metadata["lumis_user_id"]
		if !ok {
			return nil
		}
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			return nil
		}
		// Clear premium
		past := time.Now().Add(-1 * time.Second)
		return s.userRepo.SetPremium(context.Background(), userID, past)
	}
	return nil
}

func parseStripeObject(raw []byte, v interface{}) error {
	return json.Unmarshal(raw, v)
}

// IsPremium checks if user has active premium
func (s *StripeService) IsPremium(user *models.User) bool {
	return user.IsPremium()
}
