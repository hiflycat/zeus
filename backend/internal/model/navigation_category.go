package model

// NavigationCategory 网站分类模型
type NavigationCategory struct {
	BaseModel
	ParentID  *uint                 `gorm:"index;comment:父分类ID" json:"parent_id"`
	Parent    *NavigationCategory   `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children  []NavigationCategory  `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Name      string                `gorm:"type:varchar(50);not null;comment:分类名称" json:"name"`
	Description string              `gorm:"type:varchar(200);comment:分类描述" json:"description"`
	Icon      string                `gorm:"type:varchar(50);comment:分类图标" json:"icon"`
	Sort      int                   `gorm:"type:int;default:0;comment:排序" json:"sort"`
	Navigations []Navigation        `gorm:"foreignKey:CategoryID" json:"navigations,omitempty"`
}

// TableName 指定表名
func (NavigationCategory) TableName() string {
	return "navigation_categories"
}
