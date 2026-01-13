package model

import (
	"time"

	"gorm.io/gorm"
)

// BaseModel 基础模型，包含公共字段
type BaseModel struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// BaseModelWithSoftDelete 带软删除的基础模型
type BaseModelWithSoftDelete struct {
	BaseModel
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
