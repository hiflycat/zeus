package sso

import (
	"encoding/base64"
	"net/url"
	"strings"

	"backend/internal/model/sso"
	ssoService "backend/internal/service/sso"

	"github.com/gin-gonic/gin"
)

// OIDCProviderHandler OIDC Provider 处理器
type OIDCProviderHandler struct {
	service *ssoService.OIDCProviderService
}

// NewOIDCProviderHandler 创建 OIDC Provider 处理器
func NewOIDCProviderHandler(issuer string) *OIDCProviderHandler {
	return &OIDCProviderHandler{
		service: ssoService.NewOIDCProviderService(issuer),
	}
}

// Discovery 返回 OIDC 发现文档
func (h *OIDCProviderHandler) Discovery(c *gin.Context) {
	c.JSON(200, h.service.GetDiscovery())
}

// JWKS 返回 JWKS
func (h *OIDCProviderHandler) JWKS(c *gin.Context) {
	c.JSON(200, h.service.GetJWKS())
}

// Authorize 授权端点
func (h *OIDCProviderHandler) Authorize(c *gin.Context) {
	clientID := c.Query("client_id")
	redirectURI := c.Query("redirect_uri")
	responseType := c.Query("response_type")
	scope := c.Query("scope")
	state := c.Query("state")
	nonce := c.Query("nonce")
	codeChallenge := c.Query("code_challenge")
	codeChallengeMethod := c.Query("code_challenge_method")

	// 验证必需参数
	if clientID == "" || redirectURI == "" || responseType == "" {
		c.Redirect(302, "/sso/error?type=invalid_request&message="+url.QueryEscape("missing required parameters"))
		return
	}

	// 目前只支持 authorization_code 流程
	if responseType != "code" {
		c.Redirect(302, "/sso/error?type=unsupported_response_type")
		return
	}

	// 验证客户端
	client, err := h.service.ValidateClient(clientID, redirectURI)
	if err != nil {
		errorType := "invalid_client"
		if strings.Contains(err.Error(), "redirect_uri") {
			errorType = "invalid_redirect_uri"
		}
		c.Redirect(302, "/sso/error?type="+errorType)
		return
	}

	// 检查用户是否已登录（通过 session）
	userID, exists := c.Get("sso_user_id")
	if !exists {
		// 重定向到登录页面
		loginURL := "/sso/login?redirect=" + url.QueryEscape(c.Request.URL.String())
		c.Redirect(302, loginURL)
		return
	}

	// 验证用户是否属于客户端的租户
	user, err := ssoService.GetUserByID(userID.(uint))
	if err != nil {
		// 用户不存在，清除 session 让用户重新登录
		c.SetCookie("sso_session", "", -1, "/", "", false, true)
		loginURL := "/sso/login?redirect=" + url.QueryEscape(c.Request.URL.String())
		c.Redirect(302, loginURL)
		return
	}
	if err := ssoService.ValidateUserForClient(user, client); err != nil {
		// 租户不匹配，清除 session 让用户重新登录
		c.SetCookie("sso_session", "", -1, "/", "", false, true)
		loginURL := "/sso/login?redirect=" + url.QueryEscape(c.Request.URL.String())
		c.Redirect(302, loginURL)
		return
	}

	// 检查用户是否已授权该应用
	// TODO: 检查 user_consents 表

	// 生成授权码
	code, err := h.service.CreateAuthorizationCode(clientID, userID.(uint), redirectURI, scope, state, nonce, codeChallenge, codeChallengeMethod)
	if err != nil {
		c.Redirect(302, "/sso/error?type=server_error")
		return
	}

	// 重定向回客户端
	redirectURL, _ := url.Parse(redirectURI)
	query := redirectURL.Query()
	query.Set("code", code)
	if state != "" {
		query.Set("state", state)
	}
	redirectURL.RawQuery = query.Encode()

	c.Redirect(302, redirectURL.String())
}

// Token 令牌端点
func (h *OIDCProviderHandler) Token(c *gin.Context) {
	grantType := c.PostForm("grant_type")

	// 获取客户端凭据
	clientID, clientSecret, ok := h.getClientCredentials(c)
	if !ok {
		c.JSON(401, gin.H{"error": "invalid_client"})
		return
	}

	var response *ssoService.TokenResponse
	var err error

	switch grantType {
	case "authorization_code":
		code := c.PostForm("code")
		redirectURI := c.PostForm("redirect_uri")
		codeVerifier := c.PostForm("code_verifier")
		response, err = h.service.ExchangeAuthorizationCode(code, clientID, clientSecret, redirectURI, codeVerifier)

	case "client_credentials":
		scope := c.PostForm("scope")
		response, err = h.service.ClientCredentialsGrant(clientID, clientSecret, scope)

	case "refresh_token":
		refreshToken := c.PostForm("refresh_token")
		response, err = h.service.RefreshTokenGrant(refreshToken, clientID, clientSecret)

	default:
		c.JSON(400, gin.H{"error": "unsupported_grant_type"})
		return
	}

	if err != nil {
		c.JSON(400, gin.H{"error": "invalid_grant"})
		return
	}

	c.JSON(200, response)
}

// UserInfo 用户信息端点
func (h *OIDCProviderHandler) UserInfo(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		c.JSON(401, gin.H{"error": "invalid_token"})
		return
	}

	accessToken := strings.TrimPrefix(authHeader, "Bearer ")
	userInfo, err := h.service.GetUserInfo(accessToken)
	if err != nil {
		c.JSON(401, gin.H{"error": "invalid_token"})
		return
	}

	c.JSON(200, userInfo)
}

// Revoke 令牌撤销端点
func (h *OIDCProviderHandler) Revoke(c *gin.Context) {
	token := c.PostForm("token")
	tokenTypeHint := c.PostForm("token_type_hint")

	if token == "" {
		c.JSON(400, gin.H{"error": "invalid_request"})
		return
	}

	if err := h.service.RevokeToken(token, tokenTypeHint); err != nil {
		c.JSON(500, gin.H{"error": "server_error"})
		return
	}

	c.Status(200)
}

// Introspect 令牌内省端点
func (h *OIDCProviderHandler) Introspect(c *gin.Context) {
	token := c.PostForm("token")
	if token == "" {
		c.JSON(400, gin.H{"error": "invalid_request"})
		return
	}

	result, err := h.service.IntrospectToken(token)
	if err != nil {
		c.JSON(500, gin.H{"error": "server_error"})
		return
	}

	c.JSON(200, result)
}

// Logout 登出端点 (OIDC RP-Initiated Logout)
func (h *OIDCProviderHandler) Logout(c *gin.Context) {
	idTokenHint := c.Query("id_token_hint")
	postLogoutRedirectURI := c.Query("post_logout_redirect_uri")
	state := c.Query("state")
	clientID := c.Query("client_id")

	// 清除 SSO session
	c.SetCookie("sso_session", "", -1, "/", "", false, true)

	// 如果提供了 id_token_hint，解析出 client_id 并撤销相关令牌
	validIDToken := false
	if idTokenHint != "" {
		parsedClientID, userID, err := h.service.ParseIDTokenHintWithUser(idTokenHint)
		if err == nil {
			validIDToken = true
			if clientID == "" {
				clientID = parsedClientID
			}
			// 撤销用户的令牌
			if userID > 0 {
				h.service.RevokeUserTokens(userID, clientID)
			}
		}
	}

	// 如果提供了 post_logout_redirect_uri，进行重定向
	if postLogoutRedirectURI != "" {
		// 如果有有效的 id_token_hint，信任该请求，直接重定向
		// 否则需要 client_id 来验证 redirect_uri
		if !validIDToken && clientID != "" {
			// 没有有效的 id_token_hint，验证 redirect_uri 是否已注册
			if err := h.service.ValidatePostLogoutRedirectURI(clientID, postLogoutRedirectURI); err != nil {
				c.JSON(400, gin.H{"error": "invalid_request"})
				return
			}
		}

		// 构建重定向 URL
		redirectURL, _ := url.Parse(postLogoutRedirectURI)
		if state != "" {
			query := redirectURL.Query()
			query.Set("state", state)
			redirectURL.RawQuery = query.Encode()
		}
		c.Redirect(302, redirectURL.String())
		return
	}

	// 没有 post_logout_redirect_uri 时，返回成功消息
	c.JSON(200, gin.H{"message": "logged out"})
}

// LoginRequest 登录请求
type LoginRequest struct {
	Tenant   string `json:"tenant"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Redirect string `json:"redirect"` // 授权回调地址，用于提取 client_id
}

// Login SSO 用户登录
func (h *OIDCProviderHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "请输入用户名和密码"})
		return
	}

	// 根据 tenant 名称查找 tenantID
	var tenantID uint
	if req.Tenant != "" {
		tenant, err := ssoService.GetTenantByName(req.Tenant)
		if err != nil {
			c.JSON(401, gin.H{"code": 401, "message": "用户名或密码错误"})
			return
		}
		tenantID = tenant.ID
	}

	user, err := ssoService.AuthenticateUser(tenantID, req.Username, req.Password)
	if err != nil {
		c.JSON(401, gin.H{"code": 401, "message": "用户名或密码错误"})
		return
	}

	// 如果有 redirect URL，验证用户租户与客户端租户匹配
	if req.Redirect != "" {
		var client *sso.OIDCClient
		var needClientValidation bool
		parsedURL, _ := url.Parse(req.Redirect)
		if parsedURL != nil {
			// OIDC: 从 redirect URL 中提取 client_id
			if clientID := parsedURL.Query().Get("client_id"); clientID != "" {
				client, _ = ssoService.GetClientByID(clientID)
				needClientValidation = true
			}
			// CAS: 从 /cas/login?service=xxx 中提取 service，再查找客户端
			if client == nil && strings.HasPrefix(parsedURL.Path, "/cas/login") {
				if service := parsedURL.Query().Get("service"); service != "" {
					client, _ = ssoService.GetClientByRootURL(service)
					needClientValidation = true
				}
			}
		}
		// 验证用户租户与客户端租户是否匹配
		// 如果需要验证但找不到客户端，或者租户不匹配，都返回错误
		if needClientValidation && (client == nil || user.TenantID != client.TenantID) {
			c.JSON(401, gin.H{"code": 401, "message": "用户名或密码错误"})
			return
		}
	}

	// 设置 SSO session cookie
	c.SetCookie("sso_session", ssoService.GenerateSessionToken(user.ID), 86400, "/", "", false, true)

	c.JSON(200, gin.H{"code": 0, "message": "登录成功"})
}

// getClientCredentials 获取客户端凭据
func (h *OIDCProviderHandler) getClientCredentials(c *gin.Context) (clientID, clientSecret string, ok bool) {
	// 尝试从 Authorization header 获取 (Basic Auth)
	authHeader := c.GetHeader("Authorization")
	if basicAuth, found := strings.CutPrefix(authHeader, "Basic "); found {
		decoded, err := base64.StdEncoding.DecodeString(basicAuth)
		if err == nil {
			parts := strings.SplitN(string(decoded), ":", 2)
			if len(parts) == 2 {
				return parts[0], parts[1], true
			}
		}
	}

	// 尝试从 POST body 获取
	clientID = c.PostForm("client_id")
	clientSecret = c.PostForm("client_secret")
	if clientID != "" && clientSecret != "" {
		return clientID, clientSecret, true
	}

	return "", "", false
}
