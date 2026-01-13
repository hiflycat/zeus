package model

// Role 角色模型
type Role struct {
	BaseModelWithSoftDelete
	Name        string       `gorm:"type:varchar(50);uniqueIndex;not null" json:"name"`
	Description string       `gorm:"type:varchar(255)" json:"description"`
	Status      int          `gorm:"type:tinyint;default:1;comment:状态 1-启用 0-禁用" json:"status"`
	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
	Menus       []Menu       `gorm:"many2many:role_menus;" json:"menus,omitempty"`
	Users       []User       `gorm:"many2many:user_roles;" json:"users,omitempty"`
}

// TableName 指定表名
func (Role) TableName() string {
	return "roles"
}
