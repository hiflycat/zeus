package model

// SystemConfig 系统配置模型
type SystemConfig struct {
	BaseModelWithSoftDelete
	Key      string `gorm:"type:varchar(100);uniqueIndex;not null;comment:配置键" json:"key"`
	Value    string `gorm:"type:text;comment:配置值(JSON格式)" json:"value"`
	Type     string `gorm:"type:varchar(50);default:'string';comment:配置类型" json:"type"`
	Category string `gorm:"type:varchar(50);default:'system';comment:配置分类" json:"category"`
}

// TableName 指定表名
func (SystemConfig) TableName() string {
	return "system_configs"
}
