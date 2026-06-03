package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/lumis/backend/config"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailTaken      = errors.New("email already registered")
	ErrInvalidCreds    = errors.New("invalid email or password")
	ErrInvalidToken    = errors.New("invalid or expired token")
	ErrAccountNotFound = errors.New("account not found")
	ErrWeakPassword     = errors.New("password too weak")
	ErrTokenReuse       = errors.New("refresh token reuse detected")
	ErrTooManyAttempts  = errors.New("too many login attempts")
	ErrAlreadyRegistered = errors.New("account already registered")
)

const (
	// bcryptCost is intentionally above the library default (10) for a better
	// security/perf trade-off on modern hardware.
	bcryptCost = 12

	// Brute-force lockout: after maxLoginAttempts failures for a given email,
	// further attempts are rejected for the duration of lockoutWindow.
	maxLoginAttempts = 8
	lockoutWindow    = 15 * time.Minute

	// One-time token lifetimes.
	passwordResetTTL = 1 * time.Hour
	emailVerifyTTL   = 24 * time.Hour
)

// dummyHash lets Login spend roughly the same time hashing whether or not the
// account exists, mitigating user-enumeration via timing side-channels.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("lumis-timing-equalizer"), bcryptCost)

type JWTClaims struct {
	UserID    string `json:"uid"`
	Email     string `json:"email"`
	IsPremium bool   `json:"premium"`
	jwt.RegisteredClaims
}

type AuthService struct {
	userRepo       *repository.UserRepository
	tokenRepo      *repository.TokenRepository
	authTokenRepo  *repository.AuthTokenRepository
	email          EmailSender
	rdb            *redis.Client
	cfg            *config.Config
	appleVerifier  *oidcVerifier
	googleVerifier *oidcVerifier
}

func NewAuthService(
	userRepo *repository.UserRepository,
	tokenRepo *repository.TokenRepository,
	authTokenRepo *repository.AuthTokenRepository,
	email EmailSender,
	rdb *redis.Client,
	cfg *config.Config,
) *AuthService {
	return &AuthService{
		userRepo:       userRepo,
		tokenRepo:      tokenRepo,
		authTokenRepo:  authTokenRepo,
		email:          email,
		rdb:            rdb,
		cfg:            cfg,
		appleVerifier:  newOIDCVerifier("https://appleid.apple.com/auth/keys", []string{"https://appleid.apple.com"}),
		googleVerifier: newOIDCVerifier("https://www.googleapis.com/oauth2/v3/certs", []string{"https://accounts.google.com", "accounts.google.com"}),
	}
}

type RegisterInput struct {
	Email    string `json:"email"    validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,min=8,max=72"`
	FullName string `json:"full_name" validate:"omitempty,max=100"`
}

type LoginInput struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
}

// ValidatePasswordStrength enforces a minimal, non-annoying policy: at least
// 8 characters with a mix of letters and digits.
func ValidatePasswordStrength(pw string) error {
	if len(pw) < 8 || len(pw) > 72 {
		return ErrWeakPassword
	}
	var hasLetter, hasDigit bool
	for _, r := range pw {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}
	if !hasLetter || !hasDigit {
		return ErrWeakPassword
	}
	return nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func (s *AuthService) Register(ctx context.Context, input RegisterInput) (*models.User, *TokenPair, error) {
	if err := ValidatePasswordStrength(input.Password); err != nil {
		return nil, nil, err
	}

	email := normalizeEmail(input.Email)

	existing, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, nil, fmt.Errorf("authService.Register: %w", err)
	}
	if existing != nil {
		return nil, nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcryptCost)
	if err != nil {
		return nil, nil, fmt.Errorf("authService.Register hash: %w", err)
	}

	user := &models.User{
		Email:        email,
		PasswordHash: string(hash),
	}
	if input.FullName != "" {
		user.FullName = &input.FullName
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, nil, fmt.Errorf("authService.Register create: %w", err)
	}

	pair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, nil, err
	}

	// Best-effort: a failed verification email must not block registration.
	if err := s.SendVerificationEmail(ctx, user); err != nil {
		// swallow — the user can request another verification email later.
		_ = err
	}

	return user, pair, nil
}

// CreateGuest provisions an anonymous account so a new user can start using the
// app immediately, with no signup wall. It can later be upgraded to a real
// account (email/password or Apple/Google) keeping the same data.
func (s *AuthService) CreateGuest(ctx context.Context) (*models.User, *TokenPair, error) {
	randomPw, err := generateSecureToken(24)
	if err != nil {
		return nil, nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(randomPw), bcryptCost)
	if err != nil {
		return nil, nil, fmt.Errorf("authService.CreateGuest hash: %w", err)
	}

	user := &models.User{
		Email:        fmt.Sprintf("guest-%s@guest.lumis", uuid.NewString()),
		PasswordHash: string(hash),
		IsGuest:      true,
	}
	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, nil, fmt.Errorf("authService.CreateGuest create: %w", err)
	}

	pair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}

// UpgradeGuest converts an anonymous guest account into a real email/password
// account, keeping the same user id (and therefore all their data + sessions).
func (s *AuthService) UpgradeGuest(ctx context.Context, userID uuid.UUID, email, password, fullName string) (*models.User, error) {
	if err := ValidatePasswordStrength(password); err != nil {
		return nil, err
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("authService.UpgradeGuest: %w", err)
	}
	if user == nil {
		return nil, ErrAccountNotFound
	}
	if !user.IsGuest {
		return nil, ErrAlreadyRegistered
	}

	email = normalizeEmail(email)
	existing, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("authService.UpgradeGuest find: %w", err)
	}
	if existing != nil && existing.ID != user.ID {
		return nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return nil, fmt.Errorf("authService.UpgradeGuest hash: %w", err)
	}

	user.Email = email
	user.PasswordHash = string(hash)
	user.IsGuest = false
	user.EmailVerified = false
	if fullName != "" {
		user.FullName = &fullName
	}

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("authService.UpgradeGuest update: %w", err)
	}

	_ = s.SendVerificationEmail(ctx, user) // best-effort
	return user, nil
}

func (s *AuthService) Login(ctx context.Context, input LoginInput) (*models.User, *TokenPair, error) {
	email := normalizeEmail(input.Email)

	// Brute-force protection. Fails open if Redis is unavailable.
	if locked, err := s.isLocked(ctx, email); err == nil && locked {
		return nil, nil, ErrTooManyAttempts
	}

	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, nil, fmt.Errorf("authService.Login: %w", err)
	}

	if user == nil {
		// Equalize timing with the success path to avoid leaking account existence.
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(input.Password))
		s.recordFailedLogin(ctx, email)
		return nil, nil, ErrInvalidCreds
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		s.recordFailedLogin(ctx, email)
		return nil, nil, ErrInvalidCreds
	}

	s.clearFailedLogins(ctx, email)

	pair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, nil, err
	}

	return user, pair, nil
}

func (s *AuthService) Refresh(ctx context.Context, rawRefreshToken string) (*TokenPair, error) {
	rt, err := s.tokenRepo.FindAnyByHash(ctx, rawRefreshToken)
	if err != nil {
		return nil, fmt.Errorf("authService.Refresh: %w", err)
	}
	if rt == nil {
		return nil, ErrInvalidToken
	}

	// Reuse detection: a token that was already rotated out is being replayed.
	// Treat it as a stolen token and revoke the entire family for the user.
	if rt.Revoked {
		_ = s.tokenRepo.RevokeAllForUser(ctx, rt.UserID)
		return nil, ErrTokenReuse
	}

	if time.Now().After(rt.ExpiresAt) {
		return nil, ErrInvalidToken
	}

	user, err := s.userRepo.FindByID(ctx, rt.UserID)
	if err != nil {
		return nil, fmt.Errorf("authService.Refresh findUser: %w", err)
	}
	if user == nil {
		return nil, ErrAccountNotFound
	}

	// Rotation: revoke the presented token before minting a fresh pair.
	if err := s.tokenRepo.Revoke(ctx, rawRefreshToken); err != nil {
		return nil, fmt.Errorf("authService.Refresh revoke: %w", err)
	}

	return s.generateTokenPair(ctx, user)
}

func (s *AuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	return s.tokenRepo.Revoke(ctx, rawRefreshToken)
}

// --- Social login (Sign in with Apple / Google) ---

func (s *AuthService) LoginWithApple(ctx context.Context, identityToken, fullName string) (*models.User, *TokenPair, error) {
	claims, err := s.appleVerifier.verify(ctx, identityToken, s.cfg.AppleClientIDs)
	if err != nil {
		return nil, nil, ErrInvalidIDToken
	}
	return s.findOrCreateSocialUser(ctx, "apple", claims, fullName)
}

func (s *AuthService) LoginWithGoogle(ctx context.Context, idToken string) (*models.User, *TokenPair, error) {
	if len(s.cfg.GoogleClientIDs) == 0 {
		return nil, nil, ErrInvalidIDToken
	}
	claims, err := s.googleVerifier.verify(ctx, idToken, s.cfg.GoogleClientIDs)
	if err != nil {
		return nil, nil, ErrInvalidIDToken
	}
	return s.findOrCreateSocialUser(ctx, "google", claims, "")
}

func (s *AuthService) findOrCreateSocialUser(ctx context.Context, provider string, claims *oidcClaims, fullName string) (*models.User, *TokenPair, error) {
	var (
		user *models.User
		err  error
	)

	// 1. Match by provider subject.
	switch provider {
	case "apple":
		user, err = s.userRepo.FindByAppleSub(ctx, claims.Subject)
	case "google":
		user, err = s.userRepo.FindByGoogleSub(ctx, claims.Subject)
	}
	if err != nil {
		return nil, nil, fmt.Errorf("authService.social find: %w", err)
	}

	email := normalizeEmail(claims.Email)

	// 2. Link to an existing email account.
	if user == nil && email != "" {
		user, err = s.userRepo.FindByEmail(ctx, email)
		if err != nil {
			return nil, nil, fmt.Errorf("authService.social findEmail: %w", err)
		}
		if user != nil {
			setProviderSub(user, provider, claims.Subject)
			user.EmailVerified = true
			if err := s.userRepo.Update(ctx, user); err != nil {
				return nil, nil, fmt.Errorf("authService.social link: %w", err)
			}
		}
	}

	// 3. Create a fresh account.
	if user == nil {
		if email == "" {
			return nil, nil, ErrInvalidIDToken
		}
		// Social accounts have no usable password; store a random unguessable
		// hash. They can set one later via the password-reset flow.
		randomPw, err := generateSecureToken(24)
		if err != nil {
			return nil, nil, err
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(randomPw), bcryptCost)
		if err != nil {
			return nil, nil, fmt.Errorf("authService.social hash: %w", err)
		}
		user = &models.User{
			Email:         email,
			PasswordHash:  string(hash),
			EmailVerified: true,
		}
		setProviderSub(user, provider, claims.Subject)
		if fullName != "" {
			user.FullName = &fullName
		}
		if err := s.userRepo.Create(ctx, user); err != nil {
			return nil, nil, fmt.Errorf("authService.social create: %w", err)
		}
	}

	pair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}

func setProviderSub(u *models.User, provider, sub string) {
	switch provider {
	case "apple":
		u.AppleSub = &sub
	case "google":
		u.GoogleSub = &sub
	}
}

// --- Password reset ---

// RequestPasswordReset issues a reset token and emails it. To avoid leaking
// which emails are registered, it returns nil whether or not the account exists.
func (s *AuthService) RequestPasswordReset(ctx context.Context, rawEmail string) error {
	email := normalizeEmail(rawEmail)
	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return fmt.Errorf("authService.RequestPasswordReset: %w", err)
	}
	if user == nil {
		return nil // silently succeed
	}

	// Invalidate any previous reset tokens, then mint a fresh one.
	_ = s.authTokenRepo.DeleteForUserPurpose(ctx, user.ID, models.PurposePasswordReset)

	raw, err := generateSecureToken(32)
	if err != nil {
		return fmt.Errorf("authService.RequestPasswordReset token: %w", err)
	}
	if err := s.authTokenRepo.Create(ctx, user.ID, raw, models.PurposePasswordReset, time.Now().Add(passwordResetTTL)); err != nil {
		return fmt.Errorf("authService.RequestPasswordReset store: %w", err)
	}

	link := s.buildLink("reset-password", raw)
	subject := "Réinitialise ton mot de passe Lumis"
	text := fmt.Sprintf("Tu as demandé à réinitialiser ton mot de passe.\n\nOuvre ce lien (valable 1 heure) :\n%s\n\nSi tu n'es pas à l'origine de cette demande, ignore cet email.", link)
	html := fmt.Sprintf(`<p>Tu as demandé à réinitialiser ton mot de passe.</p><p><a href="%s">Réinitialiser mon mot de passe</a> (valable 1 heure)</p><p>Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>`, link)
	if err := s.email.Send(ctx, user.Email, subject, html, text); err != nil {
		return fmt.Errorf("authService.RequestPasswordReset email: %w", err)
	}
	return nil
}

// ResetPassword consumes a reset token, sets a new password, and revokes all
// existing sessions so a potential attacker is logged out everywhere.
func (s *AuthService) ResetPassword(ctx context.Context, rawToken, newPassword string) error {
	if err := ValidatePasswordStrength(newPassword); err != nil {
		return err
	}

	at, err := s.authTokenRepo.FindValid(ctx, rawToken, models.PurposePasswordReset)
	if err != nil {
		return fmt.Errorf("authService.ResetPassword: %w", err)
	}
	if at == nil {
		return ErrInvalidToken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcryptCost)
	if err != nil {
		return fmt.Errorf("authService.ResetPassword hash: %w", err)
	}
	if err := s.userRepo.UpdatePassword(ctx, at.UserID, string(hash)); err != nil {
		return fmt.Errorf("authService.ResetPassword update: %w", err)
	}

	_ = s.authTokenRepo.MarkUsed(ctx, at.ID)
	_ = s.tokenRepo.RevokeAllForUser(ctx, at.UserID)
	return nil
}

// --- Email verification ---

func (s *AuthService) SendVerificationEmail(ctx context.Context, user *models.User) error {
	if user.EmailVerified {
		return nil
	}

	_ = s.authTokenRepo.DeleteForUserPurpose(ctx, user.ID, models.PurposeEmailVerify)

	raw, err := generateSecureToken(32)
	if err != nil {
		return fmt.Errorf("authService.SendVerificationEmail token: %w", err)
	}
	if err := s.authTokenRepo.Create(ctx, user.ID, raw, models.PurposeEmailVerify, time.Now().Add(emailVerifyTTL)); err != nil {
		return fmt.Errorf("authService.SendVerificationEmail store: %w", err)
	}

	link := s.buildLink("verify-email", raw)
	subject := "Confirme ton adresse email — Lumis"
	text := fmt.Sprintf("Bienvenue sur Lumis ✨\n\nConfirme ton adresse email (lien valable 24h) :\n%s", link)
	html := fmt.Sprintf(`<p>Bienvenue sur Lumis ✨</p><p><a href="%s">Confirmer mon adresse email</a> (valable 24h)</p>`, link)
	return s.email.Send(ctx, user.Email, subject, html, text)
}

// ResendVerification re-sends the verification email for an authenticated user.
func (s *AuthService) ResendVerification(ctx context.Context, userID uuid.UUID) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("authService.ResendVerification: %w", err)
	}
	if user == nil {
		return ErrAccountNotFound
	}
	return s.SendVerificationEmail(ctx, user)
}

func (s *AuthService) VerifyEmail(ctx context.Context, rawToken string) error {
	at, err := s.authTokenRepo.FindValid(ctx, rawToken, models.PurposeEmailVerify)
	if err != nil {
		return fmt.Errorf("authService.VerifyEmail: %w", err)
	}
	if at == nil {
		return ErrInvalidToken
	}

	if err := s.userRepo.SetEmailVerified(ctx, at.UserID); err != nil {
		return fmt.Errorf("authService.VerifyEmail update: %w", err)
	}
	_ = s.authTokenRepo.MarkUsed(ctx, at.ID)
	return nil
}

// buildLink builds a reset/verify link. Uses APP_URL when configured (so it can
// be a universal/web link), otherwise the app's custom scheme deep link.
func (s *AuthService) buildLink(path, token string) string {
	q := "token=" + url.QueryEscape(token)
	if s.cfg.AppURL != "" {
		return fmt.Sprintf("%s/%s?%s", strings.TrimRight(s.cfg.AppURL, "/"), path, q)
	}
	return fmt.Sprintf("lumis://%s?%s", path, q)
}

func (s *AuthService) ValidateAccessToken(tokenStr string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

func (s *AuthService) generateTokenPair(ctx context.Context, user *models.User) (*TokenPair, error) {
	expiresAt := time.Now().Add(s.cfg.JWTExpiry)

	claims := JWTClaims{
		UserID:    user.ID.String(),
		Email:     user.Email,
		IsPremium: user.IsPremium(),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, fmt.Errorf("authService: sign access token: %w", err)
	}

	rawRefresh, err := generateSecureToken(48)
	if err != nil {
		return nil, fmt.Errorf("authService: generate refresh token: %w", err)
	}

	refreshExpiry := time.Now().Add(s.cfg.JWTRefreshExpiry)
	if err := s.tokenRepo.Create(ctx, user.ID, rawRefresh, refreshExpiry); err != nil {
		return nil, fmt.Errorf("authService: store refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
		ExpiresAt:    expiresAt,
	}, nil
}

// --- brute-force lockout helpers (Redis-backed, fail-open) ---

func loginAttemptsKey(email string) string {
	return "loginfail:" + email
}

func (s *AuthService) isLocked(ctx context.Context, email string) (bool, error) {
	if s.rdb == nil {
		return false, nil
	}
	n, err := s.rdb.Get(ctx, loginAttemptsKey(email)).Int()
	if errors.Is(err, redis.Nil) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return n >= maxLoginAttempts, nil
}

func (s *AuthService) recordFailedLogin(ctx context.Context, email string) {
	if s.rdb == nil {
		return
	}
	key := loginAttemptsKey(email)
	pipe := s.rdb.Pipeline()
	pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, lockoutWindow)
	_, _ = pipe.Exec(ctx)
}

func (s *AuthService) clearFailedLogins(ctx context.Context, email string) {
	if s.rdb == nil {
		return
	}
	_ = s.rdb.Del(ctx, loginAttemptsKey(email)).Err()
}

func generateSecureToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// ParseUserID safely parses a UUID from the JWT claims subject.
func ParseUserID(subject string) (uuid.UUID, error) {
	id, err := uuid.Parse(subject)
	if err != nil {
		return uuid.Nil, fmt.Errorf("parseUserID: %w", err)
	}
	return id, nil
}
