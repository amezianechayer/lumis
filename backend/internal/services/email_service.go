package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// EmailSender abstracts transactional email delivery so the rest of the code
// doesn't care whether we're talking to Resend, SMTP, or just logging in dev.
type EmailSender interface {
	Send(ctx context.Context, to, subject, htmlBody, textBody string) error
}

// NewEmailSender returns a Resend-backed sender when an API key is configured,
// otherwise a console sender that logs the message (handy in development so the
// reset/verify links work end-to-end without an email provider).
func NewEmailSender(apiKey, from string, logger *zap.Logger) EmailSender {
	if apiKey != "" {
		return &resendSender{apiKey: apiKey, from: from, client: &http.Client{Timeout: 10 * time.Second}}
	}
	logger.Warn("RESEND_API_KEY not set — emails will be logged to the console instead of sent")
	return &consoleSender{logger: logger}
}

type consoleSender struct {
	logger *zap.Logger
}

func (s *consoleSender) Send(_ context.Context, to, subject, _, textBody string) error {
	s.logger.Info("[email:console] would send email",
		zap.String("to", to),
		zap.String("subject", subject),
		zap.String("body", textBody),
	)
	return nil
}

type resendSender struct {
	apiKey string
	from   string
	client *http.Client
}

func (s *resendSender) Send(ctx context.Context, to, subject, htmlBody, textBody string) error {
	payload := map[string]any{
		"from":    s.from,
		"to":      []string{to},
		"subject": subject,
		"html":    htmlBody,
		"text":    textBody,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("emailService: marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("emailService: new request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("emailService: send: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("emailService: resend returned status %d", resp.StatusCode)
	}
	return nil
}
