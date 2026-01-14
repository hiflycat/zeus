package model

// Navigation 网站模型
type Navigation struct {
	BaseModel
	CategoryID  *uint               `gorm:"index:idx_nav_category_id;comment:所属分类ID" json:"category_id"`
	Category    *NavigationCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Name        string              `gorm:"type:varchar(100);not null;comment:网站名称" json:"name"`
	URL         string              `gorm:"type:varchar(255);not null;comment:网站地址" json:"url"`
	Icon        string              `gorm:"type:varchar(50);comment:网站图标" json:"icon"`
	Description string              `gorm:"type:text;comment:描述" json:"description"`
	Sort        int                 `gorm:"type:int;default:0;index:idx_nav_sort;comment:排序" json:"sort"`
	Status      int                 `gorm:"type:tinyint;default:1;index:idx_nav_status;comment:状态 1-启用 0-禁用" json:"status"`
}

// TableName 指定表名
func (Navigation) TableName() string {
	return "navigations"
}
