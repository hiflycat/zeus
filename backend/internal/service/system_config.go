package service

import (
	"encoding/json"
	"errors"

	"backend/internal/model"
	"backend/internal/global"
	"gorm.io/gorm"
)

// SystemConfigService 系统配置服务
type SystemConfigService struct{}

// NewSystemConfigService 创建系统配置服务
func NewSystemConfigService() *SystemConfigService {
	return &SystemConfigService{}
}

// GetByKey 根据键获取配置
func (s *SystemConfigService) GetByKey(key string) (*model.SystemConfig, error) {
	var config model.SystemConfig
	// key 是 MySQL 保留关键字，需要使用反引号包裹
	if err := global.GetDB().Where("`key` = ?", key).First(&config).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // 返回 nil 表示记录不存在
		}
		return nil, err
	}
	return &config, nil
}

// Set 设置配置值
func (s *SystemConfigService) Set(key string, value string) error {
	var existingConfig model.SystemConfig
	if err := global.GetDB().Where("`key` = ?", key).First(&existingConfig).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 如果不存在，创建新配置
			newConfig := model.SystemConfig{
				Key:      key,
				Value:    value,
				Type:     "json",
				Category: "system",
			}
			return global.GetDB().Create(&newConfig).Error
		}
		return err
	}

	// 更新现有配置
	existingConfig.Value = value
	return global.GetDB().Save(&existingConfig).Error
}

// GetOIDCConfig 获取 OIDC 配置
func (s *SystemConfigService) GetOIDCConfig() (*OIDCConfigData, error) {
	config, err := s.GetByKey("oidc")
	if err != nil {
		// 数据库查询错误，返回错误
		return nil, err
	}

	// 如果记录不存在，返回默认配置
	if config == nil {
		return &OIDCConfigData{
			Enabled:        false,
			Issuer:         "",
			ClientID:       "",
			ClientSecret:   "",
			RedirectURL:    "",
			Scopes:         "openid profile email",
			AutoCreateUser: false,
			DefaultRoles:   []uint{},
		}, nil
	}

	// 如果 Value 为空，返回默认配置
	if config.Value == "" {
		return &OIDCConfigData{
			Enabled:        false,
			Issuer:         "",
			ClientID:       "",
			ClientSecret:   "",
			RedirectURL:    "",
			Scopes:         "openid profile email",
			AutoCreateUser: false,
			DefaultRoles:   []uint{},
		}, nil
	}

	var oidcConfig OIDCConfigData
	if err := json.Unmarshal([]byte(config.Value), &oidcConfig); err != nil {
		return nil, errors.New("解析 OIDC 配置失败: " + err.Error())
	}
	return &oidcConfig, nil
}

// UpdateOIDCConfig 更新 OIDC 配置
func (s *SystemConfigService) UpdateOIDCConfig(config *OIDCConfigData) error {
	valueJSON, err := json.Marshal(config)
	if err != nil {
		return err
	}

	var existingConfig model.SystemConfig
	// key 是 MySQL 保留关键字，需要使用反引号包裹
	if err := global.GetDB().Where("`key` = ?", "oidc").First(&existingConfig).Error; err != nil {
		// 如果不存在，创建新配置
		newConfig := model.SystemConfig{
			Key:      "oidc",
			Value:    string(valueJSON),
			Type:     "json",
			Category: "auth",
		}
		return global.GetDB().Create(&newConfig).Error
	}

	// 更新现有配置
	existingConfig.Value = string(valueJSON)
	return global.GetDB().Save(&existingConfig).Error
}

// OIDCConfigData OIDC 配置数据结构
type OIDCConfigData struct {
	Enabled        bool   `json:"enabled"`
	Issuer         string `json:"issuer"`
	ClientID       string `json:"client_id"`
	ClientSecret   string `json:"client_secret"`
	RedirectURL    string `json:"redirect_url"`
	Scopes         string `json:"scopes"`
	AutoCreateUser bool   `json:"auto_create_user"`
	DefaultRoles   []uint `json:"default_roles"`
}

// Validate 验证 OIDC 配置
func (c *OIDCConfigData) Validate() error {
	if !c.Enabled {
		return nil
	}

	if c.Issuer == "" {
		return errors.New("OIDC Issuer 不能为空")
	}
	if c.ClientID == "" {
		return errors.New("OIDC Client ID 不能为空")
	}
	if c.ClientSecret == "" {
		return errors.New("OIDC Client Secret 不能为空")
	}
	if c.RedirectURL == "" {
		return errors.New("OIDC Redirect URL 不能为空")
	}
	if c.Scopes == "" {
		c.Scopes = "openid profile email"
	}

	return nil
}

// EmailConfigData 邮箱配置数据结构
type EmailConfigData struct {
	Enabled  bool   `json:"enabled"`   // 是否启用邮箱
	Host     string `json:"host"`      // SMTP 服务器地址
	Port     int    `json:"port"`      // SMTP 端口
	Username string `json:"username"`  // SMTP 认证邮箱（用于登录，通常与发件人邮箱地址相同）
	Password string `json:"password"`  // SMTP 认证密码或授权码
	From     string `json:"from"`      // 发件人显示名称
	FromAddr string `json:"from_addr"` // 发件人邮箱地址（邮件中显示的发送者，通常与认证邮箱相同）
	UseTLS   bool   `json:"use_tls"`   // 是否使用 TLS
	UseSSL   bool   `json:"use_ssl"`   // 是否使用 SSL
}

// GetEmailConfig 获取邮箱配置
func (s *SystemConfigService) GetEmailConfig() (*EmailConfigData, error) {
	config, err := s.GetByKey("email")
	if err != nil {
		// 数据库查询错误，返回错误
		return nil, err
	}

	// 如果记录不存在，返回默认配置
	if config == nil {
		return &EmailConfigData{
			Enabled:  false,
			Host:     "",
			Port:     587,
			Username: "",
			Password: "",
			From:     "",
			FromAddr: "",
			UseTLS:   true,
			UseSSL:   false,
		}, nil
	}

	// 如果 Value 为空，返回默认配置
	if config.Value == "" {
		return &EmailConfigData{
			Enabled:  false,
			Host:     "",
			Port:     587,
			Username: "",
			Password: "",
			From:     "",
			FromAddr: "",
			UseTLS:   true,
			UseSSL:   false,
		}, nil
	}

	var emailConfig EmailConfigData
	if err := json.Unmarshal([]byte(config.Value), &emailConfig); err != nil {
		return nil, errors.New("解析邮箱配置失败: " + err.Error())
	}
	return &emailConfig, nil
}

// UpdateEmailConfig 更新邮箱配置
func (s *SystemConfigService) UpdateEmailConfig(config *EmailConfigData) error {
	// 验证配置
	if config.Enabled {
		if config.Host == "" {
			return errors.New("SMTP 服务器地址不能为空")
		}
		if config.Port == 0 {
			return errors.New("SMTP 端口不能为空")
		}
		if config.Username == "" {
			return errors.New("发件人邮箱不能为空")
		}
		if config.Password == "" {
			return errors.New("发件人密码不能为空")
		}
		if config.FromAddr == "" {
			return errors.New("发件人邮箱地址不能为空")
		}
	}

	valueJSON, err := json.Marshal(config)
	if err != nil {
		return err
	}

	var existingConfig model.SystemConfig
	// key 是 MySQL 保留关键字，需要使用反引号包裹
	if err := global.GetDB().Where("`key` = ?", "email").First(&existingConfig).Error; err != nil {
		// 如果不存在，创建新配置
		newConfig := model.SystemConfig{
			Key:      "email",
			Value:    string(valueJSON),
			Type:     "json",
			Category: "email",
		}
		return global.GetDB().Create(&newConfig).Error
	}

	// 更新现有配置
	existingConfig.Value = string(valueJSON)
	return global.GetDB().Save(&existingConfig).Error
}
