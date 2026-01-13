package model

// Permission 权限模型
type Permission struct {
	BaseModel
	Name        string `gorm:"type:varchar(50);not null" json:"name"`
	API         string `gorm:"type:varchar(255);not null;uniqueIndex:idx_api_method;comment:接口路径 如:/api/v1/users" json:"api"`
	Method      string `gorm:"type:varchar(10);not null;uniqueIndex:idx_api_method;comment:请求方法 如:GET,POST,PUT,DELETE" json:"method"`
	Resource    string `gorm:"type:varchar(50);not null;comment:资源名称 如:user,role" json:"resource"`
	Description string `gorm:"type:varchar(255)" json:"description"`
	Roles       []Role `gorm:"many2many:role_permissions;" json:"roles,omitempty"`
}

// TableName 指定表名
func (Permission) TableName() string {
	return "permissions"
}
