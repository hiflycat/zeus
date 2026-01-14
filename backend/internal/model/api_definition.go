package model

// APIDefinition API 定义模型
type APIDefinition struct {
	BaseModel
	Name        string `gorm:"type:varchar(50);not null" json:"name"`
	Path        string `gorm:"type:varchar(255);not null;uniqueIndex:idx_api_path_method" json:"path"`
	Method      string `gorm:"type:varchar(10);not null;uniqueIndex:idx_api_path_method" json:"method"`
	Resource    string `gorm:"type:varchar(50);not null;index:idx_api_resource" json:"resource"`
	Description string `gorm:"type:varchar(255)" json:"description"`
}

// TableName 指定表名
func (APIDefinition) TableName() string {
	return "api_definitions"
}
