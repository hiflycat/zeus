package model

// Role 角色模型
type Role struct {
	BaseModel
	Name        string `gorm:"type:varchar(50);not null;index:idx_role_name" json:"name"`
	Description string `gorm:"type:varchar(255)" json:"description"`
	Status      int    `gorm:"type:tinyint;default:1;index:idx_role_status;comment:状态 1-启用 0-禁用" json:"status"`
	Menus       []Menu `gorm:"many2many:role_menus;" json:"menus,omitempty"`
	Users       []User `gorm:"many2many:user_roles;" json:"users,omitempty"`
}

// TableName 指定表名
func (Role) TableName() string {
	return "roles"
}
