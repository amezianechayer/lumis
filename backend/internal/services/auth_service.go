package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/lumis/backend/config"
	"github.com/lumis/backend/internal/models"
	"github.com/lumis/backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailTaken      = errors.New("email already registered")
	ErrInvalidCreds    = errors.New("invalid email or password")
	ErrInvalidToken    = errors.New("invalid or expired token")
	ErrAccountNotFound = errors.New("account not found")
)

type JWTClaims struct {
	UserID    string `json:"uid"`
	Email     string `json:"email"`
	IsPremium bool   `json:"premium"`
	jwt.RegisteredClaims
}

type AuthService struct {
	userRepo  *repository.UserRepository
	tokenRepo *repository.TokenRepository
	cfg       *config.Config
}

func NewAuthService(
	userRepo *repository.UserRepository,
	tokenRepo *repository.TokenRepository,
	cfg *config.Config,
) *AuthService {
	return &AuthService{userRepo: userRepo, tokenRepo: tokenRepo, cfg: cfg}
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

func (s *AuthService) Register(ctx context.Context, input RegisterInput) (*models.User, *TokenPair, error) {
	existing, err := s.userRepo.FindByEmail(ctx, input.Email)
	if err != nil {
		return nil, nil, fmt.Errorf("authService.Register: %w", err)
	}
	if existing != nil {
		return nil, nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, fmt.Errorf("authService.Register hash: %w", err)
	}

	user := &models.User{
		Email:        input.Email,
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

	return user, pair, nil
}

func (s *AuthService) Login(ctx context.Context, input LoginInput) (*models.User, *TokenPair, error) {
	user, err := s.userRepo.FindByEmail(ctx, input.Email)
	if err != nil {
		return nil, nil, fmt.Errorf("authService.Login: %w", err)
	}
	if user == nil {
		return nil, nil, ErrInvalidCreds
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, nil, ErrInvalidCreds
	}

	pair, err := s.generateTokenPair(ctx, user)
	if err != nil {
		return nil, nil, err
	}

	return user, pair, nil
}

func (s *AuthService) Refresh(ctx context.Context, rawRefreshToken string) (*TokenPair, error) {
	rt, err := s.tokenRepo.FindByHash(ctx, rawRefreshToken)
	if err != nil {
		return nil, fmt.Errorf("authService.Refresh: %w", err)
	}
	if rt == nil {
		return nil, ErrInvalidToken
	}

	user, err := s.userRepo.FindByID(ctx, rt.UserID)
	if err != nil {
		return nil, fmt.Errorf("authService.Refresh findUser: %w", err)
	}
	if user == nil {
		return nil, ErrAccountNotFound
	}

	// Revoke old token (rotation)
	if err := s.tokenRepo.Revoke(ctx, rawRefreshToken); err != nil {
		return nil, fmt.Errorf("authService.Refresh revoke: %w", err)
	}

	return s.generateTokenPair(ctx, user)
}

func (s *AuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	return s.tokenRepo.Revoke(ctx, rawRefreshToken)
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
