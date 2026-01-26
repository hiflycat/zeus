package sso

import (
	"time"

	"backend/internal/global"
	"backend/internal/model/sso"
	"backend/pkg/logger"

	"go.uber.org/zap"
)

// TokenCleanupJob Token 清理任务
type TokenCleanupJob struct{}

// Name 返回任务名称
func (j *TokenCleanupJob) Name() string {
	return "sso_token_cleanup"
}

// Run 执行清理
func (j *TokenCleanupJob) Run() {
	db := global.GetDB()
	now := time.Now()

	// 清理过期的授权码
	if result := db.Where("expires_at < ?", now).Delete(&sso.AuthorizationCode{}); result.Error == nil && result.RowsAffected > 0 {
		logger.Info("SSO cleanup: authorization codes", zap.Int64("count", result.RowsAffected))
	}

	// 清理过期的访问令牌
	if result := db.Where("expires_at < ?", now).Delete(&sso.AccessToken{}); result.Error == nil && result.RowsAffected > 0 {
		logger.Info("SSO cleanup: access tokens", zap.Int64("count", result.RowsAffected))
	}

	// 清理过期的刷新令牌
	if result := db.Where("expires_at < ?", now).Delete(&sso.RefreshToken{}); result.Error == nil && result.RowsAffected > 0 {
		logger.Info("SSO cleanup: refresh tokens", zap.Int64("count", result.RowsAffected))
	}

	// 清理过期的用户会话
	if result := db.Where("expires_at < ?", now).Delete(&sso.UserSession{}); result.Error == nil && result.RowsAffected > 0 {
		logger.Info("SSO cleanup: user sessions", zap.Int64("count", result.RowsAffected))
	}
}
