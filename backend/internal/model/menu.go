package model

// Menu 菜单模型
type Menu struct {
	BaseModel
	ParentID  *uint  `gorm:"index;comment:父菜单ID" json:"parent_id"`
	Parent    *Menu  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children  []Menu `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Name      string `gorm:"type:varchar(50);not null" json:"name"`
	Path      string `gorm:"type:varchar(255);not null" json:"path"`
	Icon      string `gorm:"type:varchar(50)" json:"icon"`
	Component string `gorm:"type:varchar(255);comment:组件路径" json:"component"`
	Sort      int    `gorm:"type:int;default:0;comment:排序" json:"sort"`
	Status    int    `gorm:"type:tinyint;default:1;comment:状态 1-启用 0-禁用" json:"status"`
	Roles     []Role `gorm:"many2many:role_menus;" json:"roles,omitempty"`
}

// TableName 指定表名
func (Menu) TableName() string {
	return "menus"
}
