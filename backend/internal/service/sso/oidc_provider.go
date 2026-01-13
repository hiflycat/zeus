package sso

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"backend/internal/model/sso"
	"backend/migrations"
	"backend/pkg/crypto"
	"backend/pkg/utils"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// OIDCProviderService OIDC Provider 服务
type OIDCProviderService struct {
	issuer string
}

// NewOIDCProviderService 创建 OIDC Provider 服务
func NewOIDCProviderService(issuer string) *OIDCProviderService {
	return &OIDCProviderService{
		issuer: issuer,
	}
}

// OIDCDiscovery OIDC 发现文档
type OIDCDiscovery struct {
	Issuer                           string   `json:"issuer"`
	AuthorizationEndpoint            string   `json:"authorization_endpoint"`
	TokenEndpoint                    string   `json:"token_endpoint"`
	UserinfoEndpoint                 string   `json:"userinfo_endpoint"`
	JwksURI                          string   `json:"jwks_uri"`
	RevocationEndpoint               string   `json:"revocation_endpoint"`
	IntrospectionEndpoint            string   `json:"introspection_endpoint"`
	EndSessionEndpoint               string   `json:"end_session_endpoint"`
	ResponseTypesSupported           []string `json:"response_types_supported"`
	GrantTypesSupported              []string `json:"grant_types_supported"`
	SubjectTypesSupported            []string `json:"subject_types_supported"`
	IDTokenSigningAlgValuesSupported []string `json:"id_token_signing_alg_values_supported"`
	ScopesSupported                  []string `json:"scopes_supported"`
	TokenEndpointAuthMethodsSupported []string `json:"token_endpoint_auth_methods_supported"`
	ClaimsSupported                  []string `json:"claims_supported"`
}

// GetDiscovery 获取 OIDC 发现文档
func (s *OIDCProviderService) GetDiscovery() *OIDCDiscovery {
	return &OIDCDiscovery{
		Issuer:                           s.issuer,
		AuthorizationEndpoint:            s.issuer + "/oauth/authorize",
		TokenEndpoint:                    s.issuer + "/oauth/token",
		UserinfoEndpoint:                 s.issuer + "/oauth/userinfo",
		JwksURI:                          s.issuer + "/.well-known/jwks.json",
		RevocationEndpoint:               s.issuer + "/oauth/revoke",
		IntrospectionEndpoint:            s.issuer + "/oauth/introspect",
		EndSessionEndpoint:               s.issuer + "/oauth/logout",
		ResponseTypesSupported:           []string{"code"},
		GrantTypesSupported:              []string{"authorization_code", "client_credentials", "refresh_token"},
		SubjectTypesSupported:            []string{"public"},
		IDTokenSigningAlgValuesSupported: []string{"RS256"},
		ScopesSupported:                  []string{"openid", "profile", "email", "groups"},
		TokenEndpointAuthMethodsSupported: []string{"client_secret_basic", "client_secret_post"},
		ClaimsSupported:                  []string{"sub", "iss", "aud", "exp", "iat", "name", "email", "groups"},
	}
}

// GetJWKS 获取 JWKS
func (s *OIDCProviderService) GetJWKS() *crypto.JWKS {
	return crypto.GetJWKManager().GetJWKS()
}

// ValidateClient 验证客户端
func (s *OIDCProviderService) ValidateClient(clientID, redirectURI string) (*sso.OIDCClient, error) {
	var client sso.OIDCClient
	if err := migrations.GetDB().Where("client_id = ? AND status = 1", clientID).First(&client).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid client_id")
		}
		return nil, err
	}

	// 验证 redirect_uri
	var redirectURIs []string
	if err := json.Unmarshal([]byte(client.RedirectURIs), &redirectURIs); err != nil {
		return nil, errors.New("invalid redirect_uris configuration")
	}

	valid := false
	for _, uri := range redirectURIs {
		if uri == redirectURI {
			valid = true
			break
		}
	}
	if !valid {
		return nil, errors.New("invalid redirect_uri")
	}

	return &client, nil
}

// ValidateClientCredentials 验证客户端凭据
func (s *OIDCProviderService) ValidateClientCredentials(clientID, clientSecret string) (*sso.OIDCClient, error) {
	var client sso.OIDCClient
	if err := migrations.GetDB().Where("client_id = ? AND status = 1", clientID).First(&client).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid client credentials")
		}
		return nil, err
	}

	if client.ClientSecret != clientSecret {
		return nil, errors.New("invalid client credentials")
	}

	return &client, nil
}

// CreateAuthorizationCode 创建授权码
func (s *OIDCProviderService) CreateAuthorizationCode(clientID string, userID uint, redirectURI, scopes, state, nonce string) (string, error) {
	code := generateRandomString(32)

	authCode := &sso.AuthorizationCode{
		Code:        code,
		ClientID:    clientID,
		UserID:      userID,
		RedirectURI: redirectURI,
		Scopes:      scopes,
		State:       state,
		Nonce:       nonce,
		ExpiresAt:   time.Now().Add(10 * time.Minute),
		Used:        false,
	}

	if err := migrations.GetDB().Create(authCode).Error; err != nil {
		return "", err
	}

	return code, nil
}

// ExchangeAuthorizationCode 交换授权码
func (s *OIDCProviderService) ExchangeAuthorizationCode(code, clientID, clientSecret, redirectURI string) (*TokenResponse, error) {
	// 验证客户端凭据
	client, err := s.ValidateClientCredentials(clientID, clientSecret)
	if err != nil {
		return nil, err
	}

	// 查找授权码
	var authCode sso.AuthorizationCode
	if err := migrations.GetDB().Where("code = ? AND used = false", code).First(&authCode).Error; err != nil {
		return nil, errors.New("invalid authorization code")
	}

	// 验证授权码
	if authCode.ClientID != clientID {
		return nil, errors.New("authorization code was not issued to this client")
	}
	if authCode.RedirectURI != redirectURI {
		return nil, errors.New("redirect_uri mismatch")
	}
	if time.Now().After(authCode.ExpiresAt) {
		return nil, errors.New("authorization code expired")
	}

	// 标记授权码已使用
	migrations.GetDB().Model(&authCode).Update("used", true)

	// 获取用户信息
	var user sso.User
	if err := migrations.GetDB().Preload("Groups").First(&user, authCode.UserID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	// 生成令牌
	return s.generateTokens(client, &user, authCode.Scopes, authCode.Nonce)
}

// ClientCredentialsGrant 客户端凭据授权
func (s *OIDCProviderService) ClientCredentialsGrant(clientID, clientSecret, scopes string) (*TokenResponse, error) {
	client, err := s.ValidateClientCredentials(clientID, clientSecret)
	if err != nil {
		return nil, err
	}

	// 验证 scope
	if !s.validateScopes(client.AllowedScopes, scopes) {
		return nil, errors.New("invalid scope")
	}

	// 生成访问令牌（无用户关联）
	accessToken := generateRandomString(32)
	expiresAt := time.Now().Add(time.Duration(client.AccessTokenTTL) * time.Second)

	token := &sso.AccessToken{
		Token:     accessToken,
		ClientID:  clientID,
		UserID:    0,
		Scopes:    scopes,
		ExpiresAt: expiresAt,
	}

	if err := migrations.GetDB().Create(token).Error; err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresIn:   client.AccessTokenTTL,
		Scope:       scopes,
	}, nil
}

// RefreshTokenGrant 刷新令牌授权
func (s *OIDCProviderService) RefreshTokenGrant(refreshToken, clientID, clientSecret string) (*TokenResponse, error) {
	client, err := s.ValidateClientCredentials(clientID, clientSecret)
	if err != nil {
		return nil, err
	}

	// 查找刷新令牌
	var rt sso.RefreshToken
	if err := migrations.GetDB().Preload("AccessToken").Where("token = ? AND revoked = false", refreshToken).First(&rt).Error; err != nil {
		return nil, errors.New("invalid refresh token")
	}

	if time.Now().After(rt.ExpiresAt) {
		return nil, errors.New("refresh token expired")
	}

	if rt.AccessToken.ClientID != clientID {
		return nil, errors.New("refresh token was not issued to this client")
	}

	// 撤销旧令牌
	migrations.GetDB().Model(&rt).Update("revoked", true)
	migrations.GetDB().Model(&rt.AccessToken).Update("revoked", true)

	// 获取用户信息
	var user sso.User
	if err := migrations.GetDB().Preload("Groups").First(&user, rt.AccessToken.UserID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	// 生成新令牌
	return s.generateTokens(client, &user, rt.AccessToken.Scopes, "")
}

// TokenResponse 令牌响应
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	IDToken      string `json:"id_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
}

// generateTokens 生成令牌
func (s *OIDCProviderService) generateTokens(client *sso.OIDCClient, user *sso.User, scopes, nonce string) (*TokenResponse, error) {
	accessToken := generateRandomString(32)
	refreshToken := generateRandomString(32)
	accessExpiresAt := time.Now().Add(time.Duration(client.AccessTokenTTL) * time.Second)
	refreshExpiresAt := time.Now().Add(time.Duration(client.RefreshTokenTTL) * time.Second)

	// 保存访问令牌
	at := &sso.AccessToken{
		Token:     accessToken,
		ClientID:  client.ClientID,
		UserID:    user.ID,
		Scopes:    scopes,
		ExpiresAt: accessExpiresAt,
	}
	if err := migrations.GetDB().Create(at).Error; err != nil {
		return nil, err
	}

	// 保存刷新令牌
	rt := &sso.RefreshToken{
		Token:         refreshToken,
		AccessTokenID: at.ID,
		ExpiresAt:     refreshExpiresAt,
	}
	if err := migrations.GetDB().Create(rt).Error; err != nil {
		return nil, err
	}

	// 生成 ID Token
	idToken, err := s.generateIDToken(client, user, scopes, nonce)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    client.AccessTokenTTL,
		RefreshToken: refreshToken,
		IDToken:      idToken,
		Scope:        scopes,
	}, nil
}

// IDTokenClaims ID Token 声明
type IDTokenClaims struct {
	jwt.RegisteredClaims
	Nonce             string   `json:"nonce,omitempty"`
	Name              string   `json:"name,omitempty"`
	DisplayName       string   `json:"display_name,omitempty"`
	PreferredUsername string   `json:"preferred_username,omitempty"`
	Email             string   `json:"email,omitempty"`
	Groups            []string `json:"groups,omitempty"`
}

// generateIDToken 生成 ID Token
func (s *OIDCProviderService) generateIDToken(client *sso.OIDCClient, user *sso.User, scopes, nonce string) (string, error) {
	now := time.Now()
	claims := IDTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Subject:   string(rune(user.ID)),
			Audience:  jwt.ClaimStrings{client.ClientID},
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(client.AccessTokenTTL) * time.Second)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
		Nonce: nonce,
	}

	// 根据 scope 添加声明
	scopeList := strings.Split(scopes, " ")
	for _, scope := range scopeList {
		switch scope {
		case "profile":
			claims.PreferredUsername = user.Username
			claims.DisplayName = user.DisplayName
			claims.Name = user.DisplayName
			if claims.Name == "" {
				claims.Name = user.Username
			}
		case "email":
			claims.Email = user.Email
		case "groups":
			groups := make([]string, len(user.Groups))
			for i, g := range user.Groups {
				groups[i] = g.Name
			}
			claims.Groups = groups
		}
	}

	return crypto.GetJWKManager().SignToken(claims)
}

// GetUserInfo 获取用户信息
func (s *OIDCProviderService) GetUserInfo(accessToken string) (map[string]interface{}, error) {
	var at sso.AccessToken
	if err := migrations.GetDB().Where("token = ? AND revoked = false", accessToken).First(&at).Error; err != nil {
		return nil, errors.New("invalid access token")
	}

	if time.Now().After(at.ExpiresAt) {
		return nil, errors.New("access token expired")
	}

	var user sso.User
	if err := migrations.GetDB().Preload("Groups").First(&user, at.UserID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	userInfo := map[string]interface{}{
		"sub": user.ID,
	}

	scopeList := strings.Split(at.Scopes, " ")
	for _, scope := range scopeList {
		switch scope {
		case "profile":
			userInfo["preferred_username"] = user.Username
			userInfo["display_name"] = user.DisplayName
			userInfo["name"] = user.DisplayName
			if userInfo["name"] == "" {
				userInfo["name"] = user.Username
			}
		case "email":
			userInfo["email"] = user.Email
		case "groups":
			groups := make([]string, len(user.Groups))
			for i, g := range user.Groups {
				groups[i] = g.Name
			}
			userInfo["groups"] = groups
		}
	}

	return userInfo, nil
}

// RevokeToken 撤销令牌
func (s *OIDCProviderService) RevokeToken(token, tokenTypeHint string) error {
	if tokenTypeHint == "refresh_token" {
		return migrations.GetDB().Model(&sso.RefreshToken{}).Where("token = ?", token).Update("revoked", true).Error
	}
	return migrations.GetDB().Model(&sso.AccessToken{}).Where("token = ?", token).Update("revoked", true).Error
}

// IntrospectToken 令牌内省
func (s *OIDCProviderService) IntrospectToken(token string) (map[string]interface{}, error) {
	var at sso.AccessToken
	if err := migrations.GetDB().Where("token = ?", token).First(&at).Error; err != nil {
		return map[string]interface{}{"active": false}, nil
	}

	if at.Revoked || time.Now().After(at.ExpiresAt) {
		return map[string]interface{}{"active": false}, nil
	}

	return map[string]interface{}{
		"active":    true,
		"scope":     at.Scopes,
		"client_id": at.ClientID,
		"sub":       at.UserID,
		"exp":       at.ExpiresAt.Unix(),
		"iat":       at.CreatedAt.Unix(),
	}, nil
}

// ParseIDTokenHint 解析 id_token_hint 并返回 client_id
func (s *OIDCProviderService) ParseIDTokenHint(idTokenHint string) (clientID string, err error) {
	token, err := crypto.GetJWKManager().VerifyToken(idTokenHint)
	if err != nil {
		return "", errors.New("invalid id_token_hint")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid id_token_hint claims")
	}

	// 获取 audience (client_id)
	aud, ok := claims["aud"]
	if !ok {
		return "", errors.New("missing aud claim in id_token_hint")
	}

	switch v := aud.(type) {
	case string:
		return v, nil
	case []interface{}:
		if len(v) > 0 {
			if s, ok := v[0].(string); ok {
				return s, nil
			}
		}
	}

	return "", errors.New("invalid aud claim in id_token_hint")
}

// ParseIDTokenHintWithUser 解析 id_token_hint 并返回 client_id 和 user_id
func (s *OIDCProviderService) ParseIDTokenHintWithUser(idTokenHint string) (clientID string, userID uint, err error) {
	token, err := crypto.GetJWKManager().VerifyToken(idTokenHint)
	if err != nil {
		return "", 0, errors.New("invalid id_token_hint")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", 0, errors.New("invalid id_token_hint claims")
	}

	// 获取 audience (client_id)
	if aud, ok := claims["aud"]; ok {
		switch v := aud.(type) {
		case string:
			clientID = v
		case []interface{}:
			if len(v) > 0 {
				if s, ok := v[0].(string); ok {
					clientID = s
				}
			}
		}
	}

	// 获取 subject (user_id)
	if sub, ok := claims["sub"]; ok {
		switch v := sub.(type) {
		case float64:
			userID = uint(v)
		case string:
			// 尝试解析字符串形式的 user_id
			if len(v) > 0 {
				userID = uint(v[0])
			}
		}
	}

	return clientID, userID, nil
}

// ValidatePostLogoutRedirectURI 验证 post_logout_redirect_uri
func (s *OIDCProviderService) ValidatePostLogoutRedirectURI(clientID, postLogoutRedirectURI string) error {
	var client sso.OIDCClient
	if err := migrations.GetDB().Where("client_id = ? AND status = 1", clientID).First(&client).Error; err != nil {
		return errors.New("invalid client_id")
	}

	// 如果客户端没有配置 post_logout_redirect_uris，则不允许重定向
	if client.PostLogoutRedirectURIs == "" {
		return errors.New("post_logout_redirect_uri not registered")
	}

	var uris []string
	if err := json.Unmarshal([]byte(client.PostLogoutRedirectURIs), &uris); err != nil {
		return errors.New("invalid post_logout_redirect_uris configuration")
	}

	for _, uri := range uris {
		if uri == postLogoutRedirectURI {
			return nil
		}
	}

	return errors.New("post_logout_redirect_uri not registered")
}

// RevokeUserTokens 撤销用户的所有令牌
func (s *OIDCProviderService) RevokeUserTokens(userID uint, clientID string) error {
	db := migrations.GetDB()

	// 撤销访问令牌
	query := db.Model(&sso.AccessToken{}).Where("user_id = ?", userID)
	if clientID != "" {
		query = query.Where("client_id = ?", clientID)
	}
	if err := query.Update("revoked", true).Error; err != nil {
		return err
	}

	// 撤销刷新令牌
	subQuery := db.Model(&sso.AccessToken{}).Select("id").Where("user_id = ?", userID)
	if clientID != "" {
		subQuery = subQuery.Where("client_id = ?", clientID)
	}
	return db.Model(&sso.RefreshToken{}).Where("access_token_id IN (?)", subQuery).Update("revoked", true).Error
}

// AuthenticateUser 验证用户
func (s *OIDCProviderService) AuthenticateUser(tenantID uint, username, password string) (*sso.User, error) {
	var user sso.User
	db := migrations.GetDB().Where("username = ? AND status = 1", username)
	if tenantID > 0 {
		db = db.Where("tenant_id = ?", tenantID)
	}
	if err := db.First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户名或密码错误")
		}
		return nil, err
	}

	if !utils.CheckPassword(password, user.Password) {
		return nil, errors.New("用户名或密码错误")
	}

	// 更新最后登录时间
	now := time.Now()
	migrations.GetDB().Model(&user).Update("last_login_at", now)

	return &user, nil
}

// validateScopes 验证 scope
func (s *OIDCProviderService) validateScopes(allowedScopes, requestedScopes string) bool {
	allowed := strings.Split(allowedScopes, " ")
	requested := strings.Split(requestedScopes, " ")

	allowedMap := make(map[string]bool)
	for _, scope := range allowed {
		allowedMap[scope] = true
	}

	for _, scope := range requested {
		if !allowedMap[scope] {
			return false
		}
	}
	return true
}

// generateRandomString 生成随机字符串
func generateRandomString(length int) string {
	b := make([]byte, length)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)[:length]
}
