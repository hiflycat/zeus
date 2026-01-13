package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"backend/internal/config"
)

var jwtSecret []byte

// Claims JWT 声明
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// Init 初始化 JWT
func Init(cfg *config.JWTConfig) {
	jwtSecret = []byte(cfg.Secret)
}

// GenerateToken 生成 Token
func GenerateToken(userID uint, username string, expiration time.Duration) (string, error) {
	nowTime := time.Now()
	expireTime := nowTime.Add(expiration)

	claims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expireTime),
			IssuedAt:  jwt.NewNumericDate(nowTime),
			NotBefore: jwt.NewNumericDate(nowTime),
		},
	}

	tokenClaims := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token, err := tokenClaims.SignedString(jwtSecret)
	return token, err
}

// ParseToken 解析 Token
func ParseToken(token string) (*Claims, error) {
	tokenClaims, err := jwt.ParseWithClaims(token, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := tokenClaims.Claims.(*Claims); ok && tokenClaims.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// RefreshToken 刷新 Token
func RefreshToken(token string, expiration time.Duration) (string, error) {
	claims, err := ParseToken(token)
	if err != nil {
		return "", err
	}

	// 生成新 Token
	return GenerateToken(claims.UserID, claims.Username, expiration)
}
