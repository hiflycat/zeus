package crypto

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWK JSON Web Key
type JWK struct {
	Kty string `json:"kty"`
	Use string `json:"use,omitempty"`
	Kid string `json:"kid"`
	Alg string `json:"alg,omitempty"`
	N   string `json:"n,omitempty"`
	E   string `json:"e,omitempty"`
}

// JWKS JSON Web Key Set
type JWKS struct {
	Keys []JWK `json:"keys"`
}

// KeyPair RSA 密钥对
type KeyPair struct {
	Kid        string
	PrivateKey *rsa.PrivateKey
	PublicKey  *rsa.PublicKey
	CreatedAt  time.Time
}

// JWKManager JWK 密钥管理器
type JWKManager struct {
	mu       sync.RWMutex
	keyPairs []*KeyPair
	current  *KeyPair
}

var (
	defaultManager *JWKManager
	once           sync.Once
)

// GetJWKManager 获取默认的 JWK 管理器
func GetJWKManager() *JWKManager {
	once.Do(func() {
		defaultManager = NewJWKManager()
		// 初始化时生成一个密钥对
		if err := defaultManager.GenerateKeyPair(); err != nil {
			panic("failed to generate initial key pair: " + err.Error())
		}
	})
	return defaultManager
}

// NewJWKManager 创建新的 JWK 管理器
func NewJWKManager() *JWKManager {
	return &JWKManager{
		keyPairs: make([]*KeyPair, 0),
	}
}

// GenerateKeyPair 生成新的 RSA 密钥对
func (m *JWKManager) GenerateKeyPair() error {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return err
	}

	kid := generateKid()
	keyPair := &KeyPair{
		Kid:        kid,
		PrivateKey: privateKey,
		PublicKey:  &privateKey.PublicKey,
		CreatedAt:  time.Now(),
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.keyPairs = append(m.keyPairs, keyPair)
	m.current = keyPair

	return nil
}

// GetCurrentKeyPair 获取当前使用的密钥对
func (m *JWKManager) GetCurrentKeyPair() *KeyPair {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.current
}

// GetKeyPairByKid 根据 Kid 获取密钥对
func (m *JWKManager) GetKeyPairByKid(kid string) *KeyPair {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, kp := range m.keyPairs {
		if kp.Kid == kid {
			return kp
		}
	}
	return nil
}

// GetJWKS 获取 JWKS
func (m *JWKManager) GetJWKS() *JWKS {
	m.mu.RLock()
	defer m.mu.RUnlock()

	jwks := &JWKS{
		Keys: make([]JWK, 0, len(m.keyPairs)),
	}

	for _, kp := range m.keyPairs {
		jwk := JWK{
			Kty: "RSA",
			Use: "sig",
			Kid: kp.Kid,
			Alg: "RS256",
			N:   base64.RawURLEncoding.EncodeToString(kp.PublicKey.N.Bytes()),
			E:   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(kp.PublicKey.E)).Bytes()),
		}
		jwks.Keys = append(jwks.Keys, jwk)
	}

	return jwks
}

// SignToken 使用当前密钥签名 JWT
func (m *JWKManager) SignToken(claims jwt.Claims) (string, error) {
	kp := m.GetCurrentKeyPair()
	if kp == nil {
		return "", errors.New("no key pair available")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = kp.Kid

	return token.SignedString(kp.PrivateKey)
}

// VerifyToken 验证 JWT
func (m *JWKManager) VerifyToken(tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, errors.New("unexpected signing method")
		}

		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("kid not found in token header")
		}

		kp := m.GetKeyPairByKid(kid)
		if kp == nil {
			return nil, errors.New("key not found")
		}

		return kp.PublicKey, nil
	})
}

// generateKid 生成唯一的 Key ID
func generateKid() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// MarshalJWKS 将 JWKS 序列化为 JSON
func (jwks *JWKS) MarshalJSON() ([]byte, error) {
	type Alias JWKS
	return json.Marshal((*Alias)(jwks))
}
