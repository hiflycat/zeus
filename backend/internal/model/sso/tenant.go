package sso

// Tenant 租户模型
type Tenant struct {
	BaseModel
	Name     string `gorm:"type:varchar(100);not null;comment:租户名称" json:"name"`
	Domain   string `gorm:"type:varchar(255);index;comment:租户域名" json:"domain"`
	Status   int    `gorm:"type:tinyint;default:1;comment:状态 1-启用 0-禁用" json:"status"`
	Settings string `gorm:"type:text;comment:租户配置(JSON格式)" json:"settings"`
}

// TableName 指定表名
func (Tenant) TableName() string {
	return "sso_tenants"
}
