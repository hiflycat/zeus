package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

// Config 应用配置
type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	JWT      JWTConfig      `yaml:"jwt"`
	Log      LogConfig      `yaml:"log"`
	SSO      SSOConfig      `yaml:"sso"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port         int           `yaml:"port"`
	Mode         string        `yaml:"mode"` // debug, release, test
	ReadTimeout  time.Duration `yaml:"read_timeout"`
	WriteTimeout time.Duration `yaml:"write_timeout"`
	Name         string        `yaml:"name"` // 服务名称
}

// SSOConfig SSO 配置
type SSOConfig struct {
	Enabled bool       `yaml:"enabled"`
	Issuer  string     `yaml:"issuer"` // OIDC issuer URL
	OIDC    OIDCConfig `yaml:"oidc"`
	LDAP    LDAPConfig `yaml:"ldap"`
}

// OIDCConfig OIDC Provider 配置
type OIDCConfig struct {
	AccessTokenTTL  int `yaml:"access_token_ttl"`  // Access Token 有效期（秒）
	RefreshTokenTTL int `yaml:"refresh_token_ttl"` // Refresh Token 有效期（秒）
	CodeTTL         int `yaml:"code_ttl"`          // 授权码有效期（秒）
}

// LDAPConfig LDAP 配置
type LDAPConfig struct {
	Enabled       bool   `yaml:"enabled"`
	Port          int    `yaml:"port"`
	BaseDN        string `yaml:"base_dn"`
	AdminDN       string `yaml:"admin_dn"`
	AdminPassword string `yaml:"admin_password"`
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host         string `yaml:"host"`
	Port         int    `yaml:"port"`
	User         string `yaml:"user"`
	Password     string `yaml:"password"`
	DBName       string `yaml:"dbname"`
	Charset      string `yaml:"charset"`
	MaxOpenConns int    `yaml:"max_open_conns"`
	MaxIdleConns int    `yaml:"max_idle_conns"`
	LogLevel     string `yaml:"log_level"`     // silent, error, warn, info
	SlowThreshold int   `yaml:"slow_threshold"` // 慢查询阈值（毫秒）
}

// JWTConfig JWT 配置
type JWTConfig struct {
	Secret     string        `yaml:"secret"`
	Expiration time.Duration `yaml:"expiration"`
	Issuer     string        `yaml:"issuer"`
}

// LogConfig 日志配置
type LogConfig struct {
	Level      string `yaml:"level"`       // debug, info, warn, error
	Format     string `yaml:"format"`      // json, console
	Output     string `yaml:"output"`      // stdout, file
	Filename   string `yaml:"filename"`    // 日志文件路径
	MaxSize    int    `yaml:"max_size"`    // 日志文件最大大小(MB)
	MaxBackups int    `yaml:"max_backups"` // 保留的备份文件数量
	MaxAge     int    `yaml:"max_age"`     // 保留天数
	Compress   bool   `yaml:"compress"`    // 是否压缩
}

var globalConfig *Config

// Load 加载配置文件
func Load(configPath string) (*Config, error) {
	config := &Config{}

	// 读取 YAML 文件
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// 解析 YAML
	if err := yaml.Unmarshal(data, config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// 环境变量覆盖
	overrideWithEnv(config)

	// 设置默认值
	setDefaults(config)

	globalConfig = config
	return config, nil
}

// Get 获取全局配置
func Get() *Config {
	return globalConfig
}

// overrideWithEnv 使用环境变量覆盖配置
func overrideWithEnv(config *Config) {
	if port := os.Getenv("SERVER_PORT"); port != "" {
		fmt.Sscanf(port, "%d", &config.Server.Port)
	}

	if mode := os.Getenv("SERVER_MODE"); mode != "" {
		config.Server.Mode = mode
	}

	if host := os.Getenv("DB_HOST"); host != "" {
		config.Database.Host = host
	}

	if port := os.Getenv("DB_PORT"); port != "" {
		fmt.Sscanf(port, "%d", &config.Database.Port)
	}

	if user := os.Getenv("DB_USER"); user != "" {
		config.Database.User = user
	}

	if password := os.Getenv("DB_PASSWORD"); password != "" {
		config.Database.Password = password
	}

	if dbname := os.Getenv("DB_NAME"); dbname != "" {
		config.Database.DBName = dbname
	}

	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		config.JWT.Secret = secret
	}

	if level := os.Getenv("LOG_LEVEL"); level != "" {
		config.Log.Level = level
	}
}

// setDefaults 设置默认值
func setDefaults(config *Config) {
	if config.Server.Port == 0 {
		config.Server.Port = 8080
	}

	if config.Server.Mode == "" {
		config.Server.Mode = "debug"
	}

	if config.Server.ReadTimeout == 0 {
		config.Server.ReadTimeout = 10 * time.Second
	}

	if config.Server.WriteTimeout == 0 {
		config.Server.WriteTimeout = 10 * time.Second
	}

	if config.Server.Name == "" {
		config.Server.Name = "后台管理系统"
	}

	if config.Database.Host == "" {
		config.Database.Host = "localhost"
	}

	if config.Database.Port == 0 {
		config.Database.Port = 3306
	}

	if config.Database.Charset == "" {
		config.Database.Charset = "utf8mb4"
	}

	if config.Database.MaxOpenConns == 0 {
		config.Database.MaxOpenConns = 100
	}

	if config.Database.MaxIdleConns == 0 {
		config.Database.MaxIdleConns = 10
	}

	if config.Database.LogLevel == "" {
		config.Database.LogLevel = "warn"
	}

	if config.Database.SlowThreshold == 0 {
		config.Database.SlowThreshold = 200 // 默认 200ms
	}

	if config.JWT.Secret == "" {
		config.JWT.Secret = "your-secret-key-change-in-production"
	}

	if config.JWT.Expiration == 0 {
		config.JWT.Expiration = 24 * time.Hour
	}

	if config.JWT.Issuer == "" {
		config.JWT.Issuer = "go-scaffold"
	}

	if config.Log.Level == "" {
		config.Log.Level = "info"
	}

	if config.Log.Format == "" {
		config.Log.Format = "console"
	}

	if config.Log.Output == "" {
		config.Log.Output = "stdout"
	}

	// SSO 默认配置
	if config.SSO.Issuer == "" {
		config.SSO.Issuer = "http://localhost:8080"
	}
	// OIDC 默认配置
	if config.SSO.OIDC.AccessTokenTTL == 0 {
		config.SSO.OIDC.AccessTokenTTL = 3600 // 1小时
	}
	if config.SSO.OIDC.RefreshTokenTTL == 0 {
		config.SSO.OIDC.RefreshTokenTTL = 86400 * 7 // 7天
	}
	if config.SSO.OIDC.CodeTTL == 0 {
		config.SSO.OIDC.CodeTTL = 600 // 10分钟
	}
	// LDAP 默认配置
	if config.SSO.LDAP.Port == 0 {
		config.SSO.LDAP.Port = 389
	}
	if config.SSO.LDAP.BaseDN == "" {
		config.SSO.LDAP.BaseDN = "dc=zeus,dc=local"
	}
}

// DSN 返回数据库连接字符串
func (d *DatabaseConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
		d.User, d.Password, d.Host, d.Port, d.DBName, d.Charset)
}
