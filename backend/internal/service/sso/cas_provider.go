package sso

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"backend/internal/config"
	"backend/internal/global"
	"backend/internal/model/sso"
	"backend/pkg/utils"

	"gorm.io/gorm"
)

// CASProviderService CAS Provider 服务
type CASProviderService struct {
	issuer string
	config *config.CASConfig
}

// NewCASProviderService 创建 CAS Provider 服务
func NewCASProviderService(issuer string, cfg *config.CASConfig) *CASProviderService {
	return &CASProviderService{
		issuer: issuer,
		config: cfg,
	}
}

// ValidateService 验证服务 URL，返回匹配的客户端
func (s *CASProviderService) ValidateService(serviceURL string) (*sso.OIDCClient, error) {
	if serviceURL == "" {
		return nil, errors.New("service URL is required")
	}

	// 解析服务 URL
	parsedURL, err := url.Parse(serviceURL)
	if err != nil {
		return nil, errors.New("invalid service URL")
	}

	// 精确查询：匹配 root_url 的 scheme://host
	rootURL := fmt.Sprintf("%s://%s", parsedURL.Scheme, parsedURL.Host)
	var client sso.OIDCClient
	if err := global.GetDB().Where("status = 1 AND root_url = ?", rootURL).First(&client).Error; err != nil {
		return nil, errors.New("service URL not registered")
	}

	return &client, nil
}

// GetClientByID 通过 clientId 获取应用
func (s *CASProviderService) GetClientByID(clientId string) (*sso.OIDCClient, error) {
	if clientId == "" {
		return nil, errors.New("client ID is required")
	}

	var client sso.OIDCClient
	if err := global.GetDB().Where("client_id = ? AND status = 1", clientId).First(&client).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("client not found")
		}
		return nil, err
	}

	return &client, nil
}

// ValidateServiceForClient 验证 service URL 是否属于指定应用
func (s *CASProviderService) ValidateServiceForClient(serviceURL string, client *sso.OIDCClient) bool {
	if serviceURL == "" || client == nil {
		return false
	}

	parsedURL, err := url.Parse(serviceURL)
	if err != nil {
		return false
	}

	rootURL := fmt.Sprintf("%s://%s", parsedURL.Scheme, parsedURL.Host)
	return rootURL == client.RootURL
}

// CreateTGT 创建 TGT (Ticket Granting Ticket)
func (s *CASProviderService) CreateTGT(userID uint) (string, error) {
	tgt := "TGT-" + generateCASRandomString(32)
	expiresAt := time.Now().Add(time.Duration(s.config.TGTTTL) * time.Second)

	session := &sso.UserSession{
		UserID:    userID,
		SessionID: tgt,
		ExpiresAt: expiresAt,
	}

	if err := global.GetDB().Create(session).Error; err != nil {
		return "", err
	}

	return tgt, nil
}

// ValidateTGT 验证 TGT
func (s *CASProviderService) ValidateTGT(tgt string) (*sso.UserSession, error) {
	if !strings.HasPrefix(tgt, "TGT-") {
		return nil, errors.New("invalid TGT format")
	}

	var session sso.UserSession
	if err := global.GetDB().Where("session_id = ? AND revoked = false", tgt).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("TGT not found")
		}
		return nil, err
	}

	if time.Now().After(session.ExpiresAt) {
		return nil, errors.New("TGT expired")
	}

	return &session, nil
}

// CreateST 创建 ST (Service Ticket)
func (s *CASProviderService) CreateST(userID uint, clientID, service string) (string, error) {
	st := "ST-" + generateCASRandomString(32)
	expiresAt := time.Now().Add(time.Duration(s.config.TicketTTL) * time.Second)

	authCode := &sso.AuthorizationCode{
		Code:        st,
		ClientID:    clientID,
		UserID:      userID,
		RedirectURI: service,
		Scopes:      "cas:st",
		ExpiresAt:   expiresAt,
		Used:        false,
	}

	if err := global.GetDB().Create(authCode).Error; err != nil {
		return "", err
	}

	return st, nil
}

// ValidateST 验证 ST
func (s *CASProviderService) ValidateST(ticket, service string) (*sso.User, *sso.OIDCClient, error) {
	if !strings.HasPrefix(ticket, "ST-") {
		return nil, nil, errors.New("invalid ticket format")
	}

	var authCode sso.AuthorizationCode
	if err := global.GetDB().Where("code = ? AND used = false", ticket).First(&authCode).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, errors.New("ticket not found")
		}
		return nil, nil, err
	}

	// 检查是否过期
	if time.Now().After(authCode.ExpiresAt) {
		return nil, nil, errors.New("ticket expired")
	}

	// 检查 service 域名是否匹配
	parsedStored, _ := url.Parse(authCode.RedirectURI)
	parsedRequest, _ := url.Parse(service)
	if parsedStored == nil || parsedRequest == nil ||
		parsedStored.Scheme != parsedRequest.Scheme || parsedStored.Host != parsedRequest.Host {
		return nil, nil, errors.New("service mismatch")
	}

	// 标记为已使用
	global.GetDB().Model(&authCode).Update("used", true)

	// 获取用户信息
	var user sso.User
	if err := global.GetDB().Preload("Groups").First(&user, authCode.UserID).Error; err != nil {
		return nil, nil, errors.New("user not found")
	}

	// 获取客户端信息
	var client sso.OIDCClient
	if err := global.GetDB().Where("client_id = ?", authCode.ClientID).First(&client).Error; err != nil {
		return nil, nil, errors.New("client not found")
	}

	return &user, &client, nil
}

// CreatePGT 创建 PGT (Proxy Granting Ticket)
func (s *CASProviderService) CreatePGT(userID uint, clientID string) (string, string, error) {
	pgt := "PGT-" + generateCASRandomString(32)
	pgtIou := "PGTIOU-" + generateCASRandomString(32)
	expiresAt := time.Now().Add(time.Duration(s.config.TGTTTL) * time.Second)

	accessToken := &sso.AccessToken{
		Token:     pgt,
		ClientID:  clientID,
		UserID:    userID,
		Scopes:    "cas:pgt",
		ExpiresAt: expiresAt,
	}

	if err := global.GetDB().Create(accessToken).Error; err != nil {
		return "", "", err
	}

	return pgt, pgtIou, nil
}

// ValidatePGT 验证 PGT
func (s *CASProviderService) ValidatePGT(pgt string) (*sso.AccessToken, error) {
	if !strings.HasPrefix(pgt, "PGT-") {
		return nil, errors.New("invalid PGT format")
	}

	var token sso.AccessToken
	if err := global.GetDB().Where("token = ? AND revoked = false", pgt).First(&token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("PGT not found")
		}
		return nil, err
	}

	if time.Now().After(token.ExpiresAt) {
		return nil, errors.New("PGT expired")
	}

	return &token, nil
}

// CreatePT 创建 PT (Proxy Ticket)
func (s *CASProviderService) CreatePT(userID uint, clientID, targetService, pgt string) (string, error) {
	pt := "PT-" + generateCASRandomString(32)
	expiresAt := time.Now().Add(time.Duration(s.config.TicketTTL) * time.Second)

	authCode := &sso.AuthorizationCode{
		Code:        pt,
		ClientID:    clientID,
		UserID:      userID,
		RedirectURI: targetService,
		Scopes:      "cas:pt",
		State:       pgt, // 存储关联的 PGT
		ExpiresAt:   expiresAt,
		Used:        false,
	}

	if err := global.GetDB().Create(authCode).Error; err != nil {
		return "", err
	}

	return pt, nil
}

// ValidatePT 验证 PT
func (s *CASProviderService) ValidatePT(ticket, service string) (*sso.User, []string, error) {
	if !strings.HasPrefix(ticket, "PT-") {
		return nil, nil, errors.New("invalid ticket format")
	}

	var authCode sso.AuthorizationCode
	if err := global.GetDB().Where("code = ? AND used = false", ticket).First(&authCode).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, errors.New("ticket not found")
		}
		return nil, nil, err
	}

	if time.Now().After(authCode.ExpiresAt) {
		return nil, nil, errors.New("ticket expired")
	}

	// 检查 service 域名是否匹配
	parsedStored, _ := url.Parse(authCode.RedirectURI)
	parsedRequest, _ := url.Parse(service)
	if parsedStored == nil || parsedRequest == nil ||
		parsedStored.Scheme != parsedRequest.Scheme || parsedStored.Host != parsedRequest.Host {
		return nil, nil, errors.New("service mismatch")
	}

	// 标记为已使用
	global.GetDB().Model(&authCode).Update("used", true)

	// 获取用户信息
	var user sso.User
	if err := global.GetDB().Preload("Groups").First(&user, authCode.UserID).Error; err != nil {
		return nil, nil, errors.New("user not found")
	}

	// 构建代理链
	var proxies []string
	if authCode.State != "" {
		proxies = append(proxies, authCode.State)
	}

	return &user, proxies, nil
}

// Logout 登出，撤销 TGT 及相关票据
func (s *CASProviderService) Logout(tgt string) ([]string, error) {
	if tgt == "" {
		return nil, nil
	}

	// 获取 TGT 对应的会话
	session, err := s.ValidateTGT(tgt)
	if err != nil {
		return nil, err
	}

	// 撤销 TGT
	global.GetDB().Model(&sso.UserSession{}).Where("session_id = ?", tgt).Update("revoked", true)

	// 查找该用户的所有 ST（用于单点登出通知）
	var authCodes []sso.AuthorizationCode
	global.GetDB().Where("user_id = ? AND scopes = ? AND used = true", session.UserID, "cas:st").Find(&authCodes)

	var services []string
	for _, code := range authCodes {
		services = append(services, code.RedirectURI)
	}

	return services, nil
}

// SendSingleLogout 发送单点登出通知
func (s *CASProviderService) SendSingleLogout(services []string, ticket string) {
	if !s.config.SingleLogout || len(services) == 0 {
		return
	}

	logoutRequest := fmt.Sprintf(`<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="%s" Version="2.0" IssueInstant="%s">
  <samlp:SessionIndex>%s</samlp:SessionIndex>
</samlp:LogoutRequest>`, generateCASRandomString(16), time.Now().UTC().Format(time.RFC3339), ticket)

	client := &http.Client{Timeout: 5 * time.Second}

	for _, service := range services {
		go func(svc string) {
			req, err := http.NewRequest("POST", svc, strings.NewReader(logoutRequest))
			if err != nil {
				return
			}
			req.Header.Set("Content-Type", "text/xml")
			client.Do(req)
		}(service)
	}
}

// BuildUserAttributes 构建用户属性
func (s *CASProviderService) BuildUserAttributes(user *sso.User) map[string]interface{} {
	attrs := make(map[string]interface{})

	if user.Email != "" {
		attrs["email"] = user.Email
	}
	if user.DisplayName != "" {
		attrs["displayName"] = user.DisplayName
	}
	if user.Phone != "" {
		attrs["phone"] = user.Phone
	}

	if len(user.Groups) > 0 {
		groups := make([]string, len(user.Groups))
		for i, g := range user.Groups {
			groups[i] = g.Name
		}
		attrs["memberOf"] = groups
	}

	return attrs
}

// AuthenticateUser 验证用户（复用 OIDC 的方法）
func (s *CASProviderService) AuthenticateUser(tenantID uint, username, password string) (*sso.User, error) {
	var user sso.User
	db := global.GetDB().Where("username = ? AND status = 1", username)
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
	global.GetDB().Model(&user).Update("last_login_at", now)

	return &user, nil
}

// GetUserFromSession 从 sso_session cookie 获取用户
func (s *CASProviderService) GetUserFromSession(sessionToken string) (*sso.User, error) {
	userID, err := ParseSessionToken(sessionToken)
	if err != nil {
		return nil, err
	}

	var user sso.User
	if err := global.GetDB().Preload("Groups").First(&user, userID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	if user.Status != 1 {
		return nil, errors.New("user disabled")
	}

	return &user, nil
}

// generateCASRandomString 生成随机字符串
func generateCASRandomString(length int) string {
	b := make([]byte, length)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)[:length]
}
