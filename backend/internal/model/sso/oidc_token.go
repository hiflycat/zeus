package sso

import "time"

// AuthorizationCode 授权码模型
type AuthorizationCode struct {
	BaseModel
	Code                string    `gorm:"type:varchar(255);uniqueIndex;not null;comment:授权码" json:"code"`
	ClientID            string    `gorm:"type:varchar(100);index;not null;comment:客户端ID" json:"client_id"`
	UserID              uint      `gorm:"index;not null;comment:用户ID" json:"user_id"`
	RedirectURI         string    `gorm:"type:varchar(255);not null;comment:回调地址" json:"redirect_uri"`
	Scopes              string    `gorm:"type:varchar(255);comment:授权范围" json:"scopes"`
	State               string    `gorm:"type:varchar(255);comment:状态参数" json:"state"`
	Nonce               string    `gorm:"type:varchar(255);comment:Nonce参数" json:"nonce"`
	CodeChallenge       string    `gorm:"type:varchar(128);comment:PKCE code_challenge" json:"code_challenge"`
	CodeChallengeMethod string    `gorm:"type:varchar(10);comment:PKCE方法(plain/S256)" json:"code_challenge_method"`
	ExpiresAt           time.Time `gorm:"not null;comment:过期时间" json:"expires_at"`
	Used                bool      `gorm:"default:false;comment:是否已使用" json:"used"`

	// 关联
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName 指定表名
func (AuthorizationCode) TableName() string {
	return "sso_authorization_codes"
}

// AccessToken 访问令牌模型
type AccessToken struct {
	BaseModel
	Token     string    `gorm:"type:varchar(500);uniqueIndex;not null;comment:访问令牌" json:"token"`
	ClientID  string    `gorm:"type:varchar(100);index;not null;comment:客户端ID" json:"client_id"`
	UserID    uint      `gorm:"index;comment:用户ID(client_credentials模式可为空)" json:"user_id"`
	Scopes    string    `gorm:"type:varchar(255);comment:授权范围" json:"scopes"`
	ExpiresAt time.Time `gorm:"not null;comment:过期时间" json:"expires_at"`
	Revoked   bool      `gorm:"default:false;comment:是否已撤销" json:"revoked"`

	// 关联
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName 指定表名
func (AccessToken) TableName() string {
	return "sso_access_tokens"
}

// RefreshToken 刷新令牌模型
type RefreshToken struct {
	BaseModel
	Token         string    `gorm:"type:varchar(500);uniqueIndex;not null;comment:刷新令牌" json:"token"`
	AccessTokenID uint      `gorm:"index;not null;comment:关联的访问令牌ID" json:"access_token_id"`
	ExpiresAt     time.Time `gorm:"not null;comment:过期时间" json:"expires_at"`
	Revoked       bool      `gorm:"default:false;comment:是否已撤销" json:"revoked"`

	// 关联
	AccessToken *AccessToken `gorm:"foreignKey:AccessTokenID" json:"access_token,omitempty"`
}

// TableName 指定表名
func (RefreshToken) TableName() string {
	return "sso_refresh_tokens"
}

// UserSession 用户会话模型（用于会话管理）
type UserSession struct {
	BaseModel
	UserID    uint      `gorm:"index;not null;comment:用户ID" json:"user_id"`
	SessionID string    `gorm:"type:varchar(255);uniqueIndex;not null;comment:会话ID" json:"session_id"`
	ClientID  string    `gorm:"type:varchar(100);comment:客户端ID" json:"client_id"`
	IPAddress string    `gorm:"type:varchar(45);comment:IP地址" json:"ip_address"`
	UserAgent string    `gorm:"type:varchar(500);comment:User-Agent" json:"user_agent"`
	ExpiresAt time.Time `gorm:"not null;comment:过期时间" json:"expires_at"`
	Revoked   bool      `gorm:"default:false;comment:是否已撤销" json:"revoked"`

	// 关联
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName 指定表名
func (UserSession) TableName() string {
	return "sso_user_sessions"
}

// UserConsent 用户授权记录模型
type UserConsent struct {
	BaseModel
	UserID   uint   `gorm:"index;not null;comment:用户ID" json:"user_id"`
	ClientID string `gorm:"type:varchar(100);index;not null;comment:客户端ID" json:"client_id"`
	Scopes   string `gorm:"type:varchar(255);comment:授权范围" json:"scopes"`

	// 关联
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName 指定表名
func (UserConsent) TableName() string {
	return "sso_user_consents"
}
