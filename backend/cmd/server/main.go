package main

import (
	"backend/internal/config"
	"backend/internal/ldap"
	"backend/internal/router"
	"backend/migrations"
	"backend/pkg/jwt"
	"backend/pkg/logger"
	_ "backend/statik" // 导入 statik 生成的包
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// 加载配置
	cfg, err := config.Load("config.yaml")
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// 初始化日志
	if err := logger.Init(&cfg.Log); err != nil {
		fmt.Printf("Failed to init logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	logger.Info("Starting application...")

	// 初始化数据库
	_, err = migrations.Init(cfg)
	if err != nil {
		logger.Error("Failed to init database", zap.Error(err))
		os.Exit(1)
	}
	defer migrations.Close()

	// 执行数据库迁移
	if err := migrations.Migrate(); err != nil {
		logger.Error("Failed to migrate database", zap.Error(err))
		os.Exit(1)
	}
	logger.Info("Database migrated successfully")

	// 初始化基础数据（管理员用户、角色、菜单）- 只在首次启动时执行
	if err := migrations.Seed(); err != nil {
		logger.Error("Failed to seed database", zap.Error(err))
		os.Exit(1)
	}
	logger.Info("Database seeded successfully")

	// 同步权限数据 - 每次启动都执行，检查并添加新权限
	if err := migrations.SyncPermissions(); err != nil {
		logger.Error("Failed to sync permissions", zap.Error(err))
		os.Exit(1)
	}
	logger.Info("Permissions synced successfully")

	// 同步系统配置 - 每次启动都执行，检查并添加默认配置
	if err := migrations.SyncSystemConfigs(); err != nil {
		logger.Error("Failed to sync system configs", zap.Error(err))
		os.Exit(1)
	}
	logger.Info("System configs synced successfully")

	// 同步菜单数据 - 每次启动都执行，检查并添加新菜单
	if err := migrations.SyncMenus(); err != nil {
		logger.Error("Failed to sync menus", zap.Error(err))
		os.Exit(1)
	}
	logger.Info("Menus synced successfully")

	// 初始化 JWT
	jwt.Init(&cfg.JWT)

	// 设置 Gin 模式
	ginMode := cfg.Server.Mode
	if ginMode == "" {
		ginMode = "debug"
	}
	gin.SetMode(ginMode)

	// 设置路由
	r := router.SetupRouter()

	// 创建 HTTP 服务器
	srv := &http.Server{
		Addr:           fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:        r,
		ReadTimeout:    cfg.Server.ReadTimeout,
		WriteTimeout:   cfg.Server.WriteTimeout,
		MaxHeaderBytes: 1 << 20,
	}

	// 启动服务器（在 goroutine 中）
	go func() {
		logger.Info("Server starting", zap.Int("port", cfg.Server.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("Failed to start server", zap.Error(err))
			os.Exit(1)
		}
	}()

	// 启动 LDAP 服务器
	var ldapServer *ldap.Server
	if cfg.SSO.LDAP.Enabled {
		ldapServer = ldap.NewServer(cfg.SSO.LDAP.Port, cfg.SSO.LDAP.BaseDN, cfg.SSO.LDAP.AdminDN, cfg.SSO.LDAP.AdminPassword)
		go func() {
			logger.Info("LDAP server starting", zap.Int("port", cfg.SSO.LDAP.Port), zap.String("base_dn", cfg.SSO.LDAP.BaseDN))
			if err := ldapServer.Start(); err != nil {
				logger.Error("Failed to start LDAP server", zap.Error(err))
			}
		}()
	}

	// 等待中断信号以优雅地关闭服务器
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// 停止 LDAP 服务器
	if ldapServer != nil {
		if err := ldapServer.Stop(); err != nil {
			logger.Error("Failed to stop LDAP server", zap.Error(err))
		}
		logger.Info("LDAP server stopped")
	}

	// 优雅关闭
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown", zap.Error(err))
		os.Exit(1)
	}

	logger.Info("Server exited")
}
