package core

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	casbinPkg "backend/internal/casbin"
	"backend/internal/config"
	"backend/internal/global"
	"backend/internal/ldap"
	"backend/internal/router"
	ssoService "backend/internal/service/sso"
	"backend/pkg/jwt"
	"backend/pkg/logger"
	"backend/pkg/scheduler"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

var (
	cfg        *config.Config
	sched      *scheduler.Scheduler
	httpServer *http.Server
	ldapServer *ldap.Server
)

// Bootstrap 初始化应用程序所有组件
func Bootstrap(configPath string) error {
	var err error

	// 加载配置
	cfg, err = config.Load(configPath)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// 初始化日志
	if err := logger.Init(&cfg.Log); err != nil {
		return fmt.Errorf("failed to init logger: %w", err)
	}

	logger.Info("Starting application...")

	// 初始化数据库
	if _, err := global.InitDB(cfg); err != nil {
		return fmt.Errorf("failed to init database: %w", err)
	}

	// 执行数据库迁移
	if err := Migrate(); err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}
	logger.Info("Database migrated successfully")

	// 初始化基础数据（管理员用户、角色、菜单）- 只在首次启动时执行
	if err := Seed(); err != nil {
		return fmt.Errorf("failed to seed database: %w", err)
	}
	logger.Info("Database seeded successfully")

	// 同步权限数据 - 每次启动都执行，检查并添加新权限
	if err := SyncAPIDefinitions(); err != nil {
		return fmt.Errorf("failed to sync API definitions: %w", err)
	}
	logger.Info("API definitions synced successfully")

	// 初始化 Casbin
	if err := casbinPkg.Init(global.GetDB()); err != nil {
		return fmt.Errorf("failed to init Casbin: %w", err)
	}
	logger.Info("Casbin initialized successfully")

	// 同步 Casbin 策略
	if err := SyncCasbinPolicies(); err != nil {
		return fmt.Errorf("failed to sync Casbin policies: %w", err)
	}
	logger.Info("Casbin policies synced successfully")

	// 同步普通工单用户权限
	if err := SyncTicketUserPolicies(); err != nil {
		return fmt.Errorf("failed to sync ticket user policies: %w", err)
	}
	logger.Info("Ticket user policies synced successfully")

	// 同步系统配置 - 每次启动都执行，检查并添加默认配置
	if err := SyncSystemConfigs(); err != nil {
		return fmt.Errorf("failed to sync system configs: %w", err)
	}
	logger.Info("System configs synced successfully")

	// 同步菜单数据 - 每次启动都执行，检查并添加新菜单
	if err := SyncMenus(); err != nil {
		return fmt.Errorf("failed to sync menus: %w", err)
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

	return nil
}

// Run 启动所有服务并等待退出信号
func Run() {
	// 启动定时任务调度器
	sched = scheduler.New()
	sched.Register(&ssoService.TokenCleanupJob{}, time.Hour)
	sched.Start()

	// 设置路由
	r := router.SetupRouter()

	// 创建 HTTP 服务器
	httpServer = &http.Server{
		Addr:           fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:        r,
		ReadTimeout:    cfg.Server.ReadTimeout,
		WriteTimeout:   cfg.Server.WriteTimeout,
		MaxHeaderBytes: 1 << 20,
	}

	// 启动 HTTP 服务器（在 goroutine 中）
	go func() {
		logger.Info("Server starting", zap.Int("port", cfg.Server.Port))
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("Failed to start server", zap.Error(err))
			os.Exit(1)
		}
	}()

	// 启动 LDAP 服务器（如果启用）
	if cfg.SSO.LDAP.Enabled {
		ldapServer = ldap.NewServer(cfg.SSO.LDAP.Port, cfg.SSO.LDAP.BaseDN, cfg.SSO.LDAP.AdminDN, cfg.SSO.LDAP.AdminPassword)
		go func() {
			logger.Info("LDAP server starting", zap.Int("port", cfg.SSO.LDAP.Port), zap.String("base_dn", cfg.SSO.LDAP.BaseDN))
			if err := ldapServer.Start(); err != nil {
				logger.Error("Failed to start LDAP server", zap.Error(err))
			}
		}()
	}

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// 优雅关闭
	shutdown()
}

// shutdown 关闭应用程序所有组件
func shutdown() {
	logger.Info("Shutting down server...")

	// 停止定时任务调度器
	if sched != nil {
		sched.Stop()
	}

	// 停止 LDAP 服务器
	if ldapServer != nil {
		if err := ldapServer.Stop(); err != nil {
			logger.Error("Failed to stop LDAP server", zap.Error(err))
		}
		logger.Info("LDAP server stopped")
	}

	// 优雅关闭 HTTP 服务器
	if httpServer != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := httpServer.Shutdown(ctx); err != nil {
			logger.Error("Server forced to shutdown", zap.Error(err))
		}
	}

	// 关闭数据库连接
	if err := global.CloseDB(); err != nil {
		logger.Error("Failed to close database", zap.Error(err))
	}

	// 同步日志
	logger.Sync()

	logger.Info("Server exited")
}

// MustBootstrap 初始化应用程序，失败时直接退出
func MustBootstrap(configPath string) {
	if err := Bootstrap(configPath); err != nil {
		fmt.Printf("Bootstrap failed: %v\n", err)
		os.Exit(1)
	}
}

// GetConfig 获取配置
func GetConfig() *config.Config {
	return cfg
}
