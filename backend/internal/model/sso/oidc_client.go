package sso

// OIDCClient OIDC 客户端应用模型
type OIDCClient struct {
	BaseModelWithSoftDelete
	TenantID        uint   `gorm:"index;not null;comment:租户ID" json:"tenant_id"`
	ClientID        string `gorm:"type:varchar(100);uniqueIndex;not null;comment:客户端ID" json:"client_id"`
	ClientSecret    string `gorm:"type:varchar(255);not null;comment:客户端密钥" json:"client_secret"`
	Name            string `gorm:"type:varchar(100);not null;comment:应用名称" json:"name"`
	Description     string `gorm:"type:varchar(255);comment:应用描述" json:"description"`
	LogoURL         string `gorm:"type:varchar(255);comment:应用Logo" json:"logo_url"`
	RedirectURIs           string `gorm:"type:text;not null;comment:回调地址(JSON数组)" json:"redirect_uris"`
	PostLogoutRedirectURIs string `gorm:"type:text;comment:登出回调地址(JSON数组)" json:"post_logout_redirect_uris"`
	AllowedScopes          string `gorm:"type:varchar(255);default:'openid profile email';comment:允许的scope" json:"allowed_scopes"`
	GrantTypes      string `gorm:"type:varchar(255);default:'authorization_code';comment:授权类型" json:"grant_types"`
	AccessTokenTTL  int    `gorm:"default:3600;comment:访问令牌有效期(秒)" json:"access_token_ttl"`
	RefreshTokenTTL int    `gorm:"default:86400;comment:刷新令牌有效期(秒)" json:"refresh_token_ttl"`
	Status          int    `gorm:"type:tinyint;default:1;comment:状态 1-启用 0-禁用" json:"status"`

	// 关联
	Tenant *Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
}

// TableName 指定表名
func (OIDCClient) TableName() string {
	return "sso_oidc_clients"
}
