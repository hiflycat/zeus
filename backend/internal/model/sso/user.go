package sso

import "time"

// User SSO 用户模型
type User struct {
	BaseModel
	TenantID          uint       `gorm:"index;not null;comment:租户ID" json:"tenant_id"`
	Username          string     `gorm:"type:varchar(50);not null;comment:用户名" json:"username"`
	Password          string     `gorm:"type:varchar(255);not null;comment:密码" json:"-"`
	Email             string     `gorm:"type:varchar(100);comment:邮箱" json:"email"`
	DisplayName       string     `gorm:"type:varchar(100);comment:显示名称" json:"display_name"`
	Phone             string     `gorm:"type:varchar(20);comment:手机号" json:"phone"`
	Avatar            string     `gorm:"type:varchar(255);comment:头像" json:"avatar"`
	Status            int        `gorm:"type:tinyint;default:1;comment:状态 1-启用 0-禁用" json:"status"`
	LastLoginAt       *time.Time `gorm:"comment:最后登录时间" json:"last_login_at"`
	PasswordChangedAt *time.Time `gorm:"comment:密码修改时间" json:"password_changed_at"`

	// 关联
	Tenant *Tenant  `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Groups []*Group `gorm:"many2many:sso_user_groups;" json:"groups,omitempty"`
}

// TableName 指定表名
func (User) TableName() string {
	return "sso_users"
}
