package services

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"slices"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ErrInvalidIDToken is returned when a social provider's id token fails
// signature, issuer, audience, or expiry validation.
var ErrInvalidIDToken = errors.New("invalid id token")

// oidcClaims captures the fields we care about from Apple/Google id tokens.
type oidcClaims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// oidcVerifier validates RS256 id tokens against a provider's JWKS endpoint.
// Keys are cached for an hour and refreshed on a cache miss.
type oidcVerifier struct {
	jwksURL string
	issuers []string
	client  *http.Client

	mu      sync.RWMutex
	keys    map[string]*rsa.PublicKey
	fetched time.Time
}

func newOIDCVerifier(jwksURL string, issuers []string) *oidcVerifier {
	return &oidcVerifier{
		jwksURL: jwksURL,
		issuers: issuers,
		client:  &http.Client{Timeout: 10 * time.Second},
		keys:    map[string]*rsa.PublicKey{},
	}
}

type jwksResponse struct {
	Keys []struct {
		Kty string `json:"kty"`
		Kid string `json:"kid"`
		N   string `json:"n"`
		E   string `json:"e"`
	} `json:"keys"`
}

func (v *oidcVerifier) refreshKeys(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("oidc: jwks status %d", resp.StatusCode)
	}

	var data jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return err
	}

	keys := make(map[string]*rsa.PublicKey, len(data.Keys))
	for _, k := range data.Keys {
		if k.Kty != "RSA" {
			continue
		}
		pub, err := parseRSAPublicKey(k.N, k.E)
		if err != nil {
			continue
		}
		keys[k.Kid] = pub
	}

	v.mu.Lock()
	v.keys = keys
	v.fetched = time.Now()
	v.mu.Unlock()
	return nil
}

func parseRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, err
	}
	e := 0
	for _, b := range eBytes {
		e = e<<8 | int(b)
	}
	return &rsa.PublicKey{N: new(big.Int).SetBytes(nBytes), E: e}, nil
}

func (v *oidcVerifier) getKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	key, ok := v.keys[kid]
	stale := time.Since(v.fetched) > time.Hour
	v.mu.RUnlock()
	if ok && !stale {
		return key, nil
	}

	if err := v.refreshKeys(ctx); err != nil {
		if ok {
			return key, nil // serve stale key if refresh fails
		}
		return nil, err
	}

	v.mu.RLock()
	key, ok = v.keys[kid]
	v.mu.RUnlock()
	if !ok {
		return nil, ErrInvalidIDToken
	}
	return key, nil
}

// verify validates the token signature, issuer, audience and expiry, and
// returns the parsed claims on success.
func (v *oidcVerifier) verify(ctx context.Context, idToken string, audiences []string) (*oidcClaims, error) {
	var claims oidcClaims
	_, err := jwt.ParseWithClaims(idToken, &claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("oidc: unexpected signing method: %v", t.Header["alg"])
		}
		kid, _ := t.Header["kid"].(string)
		if kid == "" {
			return nil, ErrInvalidIDToken
		}
		return v.getKey(ctx, kid)
	}, jwt.WithValidMethods([]string{"RS256"}))
	if err != nil {
		return nil, ErrInvalidIDToken
	}

	if !slices.Contains(v.issuers, claims.Issuer) {
		return nil, ErrInvalidIDToken
	}
	if !audienceMatches(claims.Audience, audiences) {
		return nil, ErrInvalidIDToken
	}
	if claims.Subject == "" {
		return nil, ErrInvalidIDToken
	}
	return &claims, nil
}

func audienceMatches(aud jwt.ClaimStrings, allowed []string) bool {
	for _, a := range aud {
		if slices.Contains(allowed, a) {
			return true
		}
	}
	return false
}
