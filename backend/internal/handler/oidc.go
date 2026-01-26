package handler

import (
	"context"

	"github.com/gin-gonic/gin"
	"backend/internal/service"
	"backend/internal/model/response"
)

// OIDCHandler OIDC 认证处理器
type OIDCHandler struct {
	oidcService *service.OIDCService
}

// NewOIDCHandler 创建 OIDC 处理器
func NewOIDCHandler() (*OIDCHandler, error) {
	oidcService, err := service.NewOIDCService()
	if err != nil {
		return nil, err
	}
	return &OIDCHandler{
		oidcService: oidcService,
	}, nil
}

// OIDCCallbackHandler OIDC 回调处理器（始终可用）
type OIDCCallbackHandler struct{}

// NewOIDCCallbackHandler 创建 OIDC 回调处理器
func NewOIDCCallbackHandler() *OIDCCallbackHandler {
	return &OIDCCallbackHandler{}
}

// Callback OIDC 回调处理
func (h *OIDCCallbackHandler) Callback(c *gin.Context) {
	// 获取授权码
	code := c.Query("code")
	if code == "" {
		response.BadRequest(c, "Authorization code is required")
		return
	}

	// 动态创建 OIDC 服务
	oidcService, err := service.NewOIDCService()
	if err != nil {
		response.BadRequest(c, "OIDC is not configured: "+err.Error())
		return
	}

	ctx := context.Background()

	// 交换授权码获取 token
	token, err := oidcService.ExchangeCode(ctx, code)
	if err != nil {
		response.BadRequest(c, "Failed to exchange authorization code: "+err.Error())
		return
	}

	// 获取用户信息和 id_token
	userInfo, idToken, err := oidcService.GetUserInfoWithIDToken(ctx, token)
	if err != nil {
		response.BadRequest(c, "Failed to get user info: "+err.Error())
		return
	}

	// 登录或创建用户
	jwtToken, user, err := oidcService.LoginOrCreateUser(userInfo)
	if err != nil {
		response.BadRequest(c, "Failed to login or create user: "+err.Error())
		return
	}

	// 返回 token 和用户信息给前端
	response.Success(c, gin.H{
		"token":    jwtToken,
		"id_token": idToken,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"avatar":   user.Avatar,
		},
	})
}

// Callback OIDC 回调处理（旧版，保留兼容）
func (h *OIDCHandler) Callback(c *gin.Context) {
	// 获取授权码
	code := c.Query("code")

	if code == "" {
		response.BadRequest(c, "Authorization code is required")
		return
	}

	ctx := context.Background()

	// 交换授权码获取 token
	token, err := h.oidcService.ExchangeCode(ctx, code)
	if err != nil {
		response.BadRequest(c, "Failed to exchange authorization code: "+err.Error())
		return
	}

	// 获取用户信息
	userInfo, err := h.oidcService.GetUserInfo(ctx, token)
	if err != nil {
		response.BadRequest(c, "Failed to get user info: "+err.Error())
		return
	}

	// 登录或创建用户
	jwtToken, user, err := h.oidcService.LoginOrCreateUser(userInfo)
	if err != nil {
		response.BadRequest(c, "Failed to login or create user: "+err.Error())
		return
	}

	// 返回 token 和用户信息给前端
	response.Success(c, gin.H{
		"token": jwtToken,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"avatar":   user.Avatar,
		},
	})
}
