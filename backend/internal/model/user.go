package model

// User 用户模型
type User struct {
	BaseModel
	Username string `gorm:"type:varchar(50);not null;index:idx_user_username" json:"username"`
	Password string `gorm:"type:varchar(255);not null" json:"-"`
	Email    string `gorm:"type:varchar(100);index:idx_user_email" json:"email"`
	Avatar   string `gorm:"type:varchar(255)" json:"avatar"`
	Phone    string `gorm:"type:varchar(20)" json:"phone"`
	Status   int    `gorm:"type:tinyint;default:1;index:idx_user_status;comment:状态 1-启用 0-禁用" json:"status"`
	Roles    []Role `gorm:"many2many:user_roles;" json:"roles,omitempty"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}
