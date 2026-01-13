package sso

// Group SSO 用户组模型
type Group struct {
	BaseModelWithSoftDelete
	TenantID    uint   `gorm:"index;not null;comment:租户ID" json:"tenant_id"`
	Name        string `gorm:"type:varchar(100);not null;comment:组名称" json:"name"`
	Description string `gorm:"type:varchar(255);comment:组描述" json:"description"`
	Status      int    `gorm:"type:tinyint;default:1;comment:状态 1-启用 0-禁用" json:"status"`

	// 关联
	Tenant *Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Users  []*User `gorm:"many2many:sso_user_groups;" json:"users,omitempty"`
}

// TableName 指定表名
func (Group) TableName() string {
	return "sso_groups"
}
