package middleware

import (
	"encoding/base64"
	"strings"

	"github.com/gin-gonic/gin"
	"backend/pkg/jwt"
	"backend/pkg/response"
)

// AuthMiddleware JWT 认证中间件
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取 Token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "未提供认证令牌")
			c.Abort()
			return
		}

		// 检查 Bearer 前缀
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "认证令牌格式错误")
			c.Abort()
			return
		}

		// 解析 Token
		claims, err := jwt.ParseToken(parts[1])
		if err != nil {
			response.Unauthorized(c, "认证令牌无效或已过期")
			c.Abort()
			return
		}

		// 将用户信息存储到上下文
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)

		c.Next()
	}
}

// SSOSessionMiddleware SSO 会话中间件
func SSOSessionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionCookie, err := c.Cookie("sso_session")
		if err == nil && sessionCookie != "" {
			// 解析会话令牌获取用户 ID
			if userID := parseSessionToken(sessionCookie); userID > 0 {
				c.Set("sso_user_id", userID)
			}
		}
		c.Next()
	}
}

// parseSessionToken 解析会话令牌
func parseSessionToken(token string) uint {
	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(decoded) < 4 {
		return 0
	}
	return uint(decoded[0])<<24 | uint(decoded[1])<<16 | uint(decoded[2])<<8 | uint(decoded[3])
}
