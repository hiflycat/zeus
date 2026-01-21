package migrations

import (
	"fmt"
	"time"

	"backend/internal/config"
	"backend/internal/model"
	"backend/internal/model/sso"
	"backend/pkg/logger"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

var db *gorm.DB

// Init 初始化数据库连接
func Init(cfg *config.Config) (*gorm.DB, error) {
	var err error

	// 配置 GORM 日志级别
	logLevel := gormLogger.Silent
	switch cfg.Database.LogLevel {
	case "error":
		logLevel = gormLogger.Error
	case "warn":
		logLevel = gormLogger.Warn
	case "info":
		logLevel = gormLogger.Info
	case "silent":
		logLevel = gormLogger.Silent
	default:
		// 如果没有配置，根据 Server.Mode 决定
		if cfg.Server.Mode == "debug" {
			logLevel = gormLogger.Info
		} else {
			logLevel = gormLogger.Warn
		}
	}

	// 创建 GORM logger 适配器
	gormLog := logger.NewGormLogger(
		logLevel,
		time.Duration(cfg.Database.SlowThreshold)*time.Millisecond,
	)

	// 连接数据库
	db, err = gorm.Open(mysql.Open(cfg.Database.DSN()), &gorm.Config{
		Logger:                                   gormLog,
		DisableForeignKeyConstraintWhenMigrating: true, // 禁用外键约束
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	// 获取底层 sql.DB 设置连接池
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// 设置连接池参数
	sqlDB.SetMaxOpenConns(cfg.Database.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.Database.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// 测试连接
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return db
}

// Migrate 执行数据库迁移
func Migrate() error {
	// 迁移现有模型
	if err := db.AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.APIDefinition{},
		&model.Menu{},
		&model.SystemConfig{},
		&model.NavigationCategory{},
		&model.Navigation{},
		// 工单相关模型
		&model.TicketType{},
		&model.Ticket{},
		&model.ApprovalFlow{},
		&model.ApprovalNode{},
		&model.ApprovalRecord{},
		&model.TicketComment{},
		&model.TicketAttachment{},
		&model.TicketTemplate{},
	); err != nil {
		return err
	}

	// 迁移 SSO 模型
	return db.AutoMigrate(
		&sso.Tenant{},
		&sso.User{},
		&sso.Group{},
		&sso.OIDCClient{},
		&sso.AuthorizationCode{},
		&sso.AccessToken{},
		&sso.RefreshToken{},
		&sso.UserSession{},
		&sso.UserConsent{},
	)
}

// Close 关闭数据库连接
func Close() error {
	if db == nil {
		return nil
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
