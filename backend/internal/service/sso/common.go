package sso

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"net/url"
	"strings"
	"time"

	"backend/internal/config"
	"backend/internal/global"
	"backend/internal/model/sso"
	"backend/pkg/utils"

	"gorm.io/gorm"
)

// GetUserByID 根据 ID 获取用户
func GetUserByID(userID uint) (*sso.User, error) {
	var user sso.User
	if err := global.GetDB().First(&user, userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserWithGroups 根据 ID 获取用户（包含用户组）
func GetUserWithGroups(userID uint) (*sso.User, error) {
	var user sso.User
	if err := global.GetDB().Preload("Groups").First(&user, userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// ValidateUserForClient 验证用户是否属于客户端的租户
func ValidateUserForClient(user *sso.User, client *sso.OIDCClient) error {
	if client == nil {
		return nil // 没有客户端信息时跳过验证
	}
	if user.TenantID != client.TenantID {
		return errors.New("user does not belong to this tenant")
	}
	return nil
}

// ValidateUserForTenant 验证用户是否属于指定租户
func ValidateUserForTenant(user *sso.User, tenantID uint) error {
	if tenantID == 0 {
		return nil // 没有指定租户时跳过验证
	}
	if user.TenantID != tenantID {
		return errors.New("user does not belong to this tenant")
	}
	return nil
}

// Session Token 有效期（24小时）
const sessionTokenTTL = 24 * time.Hour

// GenerateSessionToken 生成安全的会话令牌
// 格式: base64(userID|timestamp|random).base64(hmac_signature)
func GenerateSessionToken(userID uint) string {
	// 构建 payload: userID (4 bytes) + timestamp (8 bytes) + random (16 bytes)
	payload := make([]byte, 28)
	binary.BigEndian.PutUint32(payload[0:4], uint32(userID))
	binary.BigEndian.PutUint64(payload[4:12], uint64(time.Now().Unix()))
	rand.Read(payload[12:28])

	// 计算 HMAC 签名
	signature := computeHMAC(payload)

	// 返回 payload.signature 格式
	return base64.RawURLEncoding.EncodeToString(payload) + "." + base64.RawURLEncoding.EncodeToString(signature)
}

// ParseSessionToken 解析并验证会话令牌，返回 userID
func ParseSessionToken(token string) (uint, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return 0, errors.New("invalid token format")
	}

	// 解码 payload
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil || len(payload) != 28 {
		return 0, errors.New("invalid token payload")
	}

	// 解码并验证签名
	signature, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return 0, errors.New("invalid token signature")
	}

	expectedSig := computeHMAC(payload)
	if !hmac.Equal(signature, expectedSig) {
		return 0, errors.New("invalid token signature")
	}

	// 检查是否过期
	timestamp := int64(binary.BigEndian.Uint64(payload[4:12]))
	if time.Now().Unix()-timestamp > int64(sessionTokenTTL.Seconds()) {
		return 0, errors.New("token expired")
	}

	// 提取 userID
	userID := uint(binary.BigEndian.Uint32(payload[0:4]))
	return userID, nil
}

// computeHMAC 计算 HMAC-SHA256 签名
func computeHMAC(data []byte) []byte {
	secret := []byte(config.Get().JWT.Secret)
	h := hmac.New(sha256.New, secret)
	h.Write(data)
	return h.Sum(nil)
}

// AuthenticateUser 验证用户登录
func AuthenticateUser(tenantID uint, username, password string) (*sso.User, error) {
	var user sso.User
	db := global.GetDB().Where("username = ? AND status = 1", username)
	if tenantID > 0 {
		db = db.Where("tenant_id = ?", tenantID)
	}
	if err := db.First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户名或密码错误")
		}
		return nil, errors.New("用户名或密码错误")
	}

	if !utils.CheckPassword(password, user.Password) {
		return nil, errors.New("用户名或密码错误")
	}

	// 更新最后登录时间
	now := time.Now()
	global.GetDB().Model(&user).Update("last_login_at", now)

	return &user, nil
}

// GenerateRandomString 生成随机字符串
func GenerateRandomString(length int) string {
	b := make([]byte, length)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)[:length]
}

// ValidateURLDomain 验证 URL 域名是否匹配
func ValidateURLDomain(rootURL, requestURL string) error {
	parsedRoot, err := url.Parse(strings.TrimSuffix(rootURL, "/"))
	if err != nil {
		return errors.New("invalid root_url configuration")
	}

	parsedRequest, err := url.Parse(requestURL)
	if err != nil {
		return errors.New("invalid request url")
	}

	if parsedRoot.Scheme != parsedRequest.Scheme || parsedRoot.Host != parsedRequest.Host {
		return errors.New("url domain mismatch")
	}

	return nil
}

// GetGroupNames 获取用户组名称列表
func GetGroupNames(groups []*sso.Group) []string {
	names := make([]string, len(groups))
	for i, g := range groups {
		names[i] = g.Name
	}
	return names
}

// GetTenantByName 根据名称获取租户
func GetTenantByName(name string) (*sso.Tenant, error) {
	var tenant sso.Tenant
	if err := global.GetDB().Where("LOWER(name) = LOWER(?)", name).First(&tenant).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("租户不存在")
		}
		return nil, err
	}
	return &tenant, nil
}

// GetClientByID 根据 client_id 获取客户端
func GetClientByID(clientID string) (*sso.OIDCClient, error) {
	var client sso.OIDCClient
	if err := global.GetDB().Where("client_id = ? AND status = 1", clientID).First(&client).Error; err != nil {
		return nil, err
	}
	return &client, nil
}

// GetClientByRootURL 根据 root_url 域名获取客户端
func GetClientByRootURL(serviceURL string) (*sso.OIDCClient, error) {
	parsed, err := url.Parse(serviceURL)
	if err != nil {
		return nil, err
	}
	var client sso.OIDCClient
	if err := global.GetDB().Where("status = 1 AND root_url LIKE ?", parsed.Scheme+"://"+parsed.Host+"%").First(&client).Error; err != nil {
		return nil, err
	}
	return &client, nil
}
