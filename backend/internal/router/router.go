package router

import (
	"backend/internal/config"
	"backend/internal/handler"
	ssoHandler "backend/internal/handler/sso"
	"backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

// SetupRouter 设置路由
func SetupRouter() *gin.Engine {
	r := gin.New()

	// 全局中间件
	r.Use(middleware.LoggerMiddleware())
	r.Use(middleware.RecoveryMiddleware())
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.MetricsMiddleware())

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API 路由组
	api := r.Group("/api/v1")
	{
		// 公开路由（不需要认证）
		public := api.Group("")
		{
			authHandler := handler.NewAuthHandler()
			public.POST("/auth/login", authHandler.Login)
			public.GET("/server/info", authHandler.GetServerInfo) // 获取服务器信息（服务名）
			// 性能监控
			public.GET("/metrics", func(c *gin.Context) {
				c.String(200, middleware.GetMetrics())
			})
			// OIDC 回调路由（始终注册，在 handler 中检查配置）
			public.GET("/auth/oidc/callback", handler.NewOIDCCallbackHandler().Callback)
		}

		// 需要认证的路由
		auth := api.Group("")
		auth.Use(middleware.AuthMiddleware())
		{
			authHandler := handler.NewAuthHandler()
			auth.GET("/auth/me", authHandler.GetCurrentUser)
			auth.POST("/auth/logout", authHandler.Logout)
			auth.POST("/auth/change-password", authHandler.ChangePassword)
			auth.GET("/auth/menus", handler.NewMenuHandler().GetUserMenus)

			// 用户管理
			userHandler := handler.NewUserHandler()
			user := auth.Group("/users")
			{
				user.GET("", middleware.PermissionMiddleware("user", "read"), userHandler.List)
				user.GET("/:id", middleware.PermissionMiddleware("user", "read"), userHandler.GetByID)
				user.POST("", middleware.PermissionMiddleware("user", "create"), userHandler.Create)
				user.PUT("/:id", middleware.PermissionMiddleware("user", "update"), userHandler.Update)
				user.DELETE("/:id", middleware.PermissionMiddleware("user", "delete"), userHandler.Delete)
				user.POST("/:id/roles", middleware.PermissionMiddleware("user", "update"), userHandler.AssignRoles)
			}

			// 角色管理
			roleHandler := handler.NewRoleHandler()
			role := auth.Group("/roles")
			{
				role.GET("", middleware.PermissionMiddleware("role", "read"), roleHandler.List)
				role.GET("/:id", middleware.PermissionMiddleware("role", "read"), roleHandler.GetByID)
				role.POST("", middleware.PermissionMiddleware("role", "create"), roleHandler.Create)
				role.PUT("/:id", middleware.PermissionMiddleware("role", "update"), roleHandler.Update)
				role.DELETE("/:id", middleware.PermissionMiddleware("role", "delete"), roleHandler.Delete)
				role.POST("/:id/permissions", middleware.PermissionMiddleware("role", "update"), roleHandler.AssignPermissions)
				role.POST("/:id/menus", middleware.PermissionMiddleware("role", "update"), roleHandler.AssignMenus)
			}

			// 权限管理
			permissionHandler := handler.NewPermissionHandler()
			permission := auth.Group("/permissions")
			{
				permission.GET("", middleware.PermissionMiddleware("permission", "read"), permissionHandler.List)
				permission.GET("/resources", middleware.PermissionMiddleware("permission", "read"), permissionHandler.GetResources)
				permission.GET("/:id", middleware.PermissionMiddleware("permission", "read"), permissionHandler.GetByID)
				permission.POST("", middleware.PermissionMiddleware("permission", "create"), permissionHandler.Create)
				permission.PUT("/:id", middleware.PermissionMiddleware("permission", "update"), permissionHandler.Update)
				permission.DELETE("/:id", middleware.PermissionMiddleware("permission", "delete"), permissionHandler.Delete)
			}

			// 菜单管理
			menuHandler := handler.NewMenuHandler()
			menu := auth.Group("/menus")
			{
				menu.GET("", middleware.PermissionMiddleware("menu", "read"), menuHandler.List)
				menu.GET("/:id", middleware.PermissionMiddleware("menu", "read"), menuHandler.GetByID)
				menu.POST("", middleware.PermissionMiddleware("menu", "create"), menuHandler.Create)
				menu.PUT("/:id", middleware.PermissionMiddleware("menu", "update"), menuHandler.Update)
				menu.DELETE("/:id", middleware.PermissionMiddleware("menu", "delete"), menuHandler.Delete)
			}

			// 网站分类管理
			navigationCategoryHandler := handler.NewNavigationCategoryHandler()
			navigationCategory := auth.Group("/navigation-categories")
			{
				navigationCategory.GET("", middleware.PermissionMiddleware("navigation_category", "read"), navigationCategoryHandler.List)
				navigationCategory.GET("/:id", middleware.PermissionMiddleware("navigation_category", "read"), navigationCategoryHandler.GetByID)
				navigationCategory.POST("", middleware.PermissionMiddleware("navigation_category", "create"), navigationCategoryHandler.Create)
				navigationCategory.PUT("/:id", middleware.PermissionMiddleware("navigation_category", "update"), navigationCategoryHandler.Update)
				navigationCategory.DELETE("/:id", middleware.PermissionMiddleware("navigation_category", "delete"), navigationCategoryHandler.Delete)
			}

			// 网站管理
			navigationHandler := handler.NewNavigationHandler()
			navigation := auth.Group("/navigations")
			{
				navigation.GET("", middleware.PermissionMiddleware("navigation", "read"), navigationHandler.List)
				navigation.GET("/:id", middleware.PermissionMiddleware("navigation", "read"), navigationHandler.GetByID)
				navigation.POST("", middleware.PermissionMiddleware("navigation", "create"), navigationHandler.Create)
				navigation.PUT("/:id", middleware.PermissionMiddleware("navigation", "update"), navigationHandler.Update)
				navigation.DELETE("/:id", middleware.PermissionMiddleware("navigation", "delete"), navigationHandler.Delete)
			}

			// 系统配置管理
			systemConfigHandler := handler.NewSystemConfigHandler()
			systemConfig := auth.Group("/system-config")
			{
				systemConfig.GET("/oidc", middleware.PermissionMiddleware("system", "read"), systemConfigHandler.GetOIDCConfig)
				systemConfig.PUT("/oidc", middleware.PermissionMiddleware("system", "update"), systemConfigHandler.UpdateOIDCConfig)
				systemConfig.GET("/email", middleware.PermissionMiddleware("system", "read"), systemConfigHandler.GetEmailConfig)
				systemConfig.PUT("/email", middleware.PermissionMiddleware("system", "update"), systemConfigHandler.UpdateEmailConfig)
				systemConfig.POST("/email/test", middleware.PermissionMiddleware("system", "read"), systemConfigHandler.TestEmail)
			}

		}
	}

	// 静态文件服务
	setupStaticFiles(r)

	// SSO 后台管理 API（始终可用，需要系统管理员权限）
	setupSSOAdminRoutes(r)

	// SSO 路由（OIDC Provider，仅在启用时注册）
	cfg := config.Get()
	if cfg != nil && cfg.SSO.Enabled {
		setupSSOProviderRoutes(r, cfg.SSO.Issuer)
	}

	return r
}

// setupSSOAdminRoutes 设置 SSO 后台管理路由（始终可用）
func setupSSOAdminRoutes(r *gin.Engine) {
	ssoAdmin := r.Group("/api/v1/sso")
	ssoAdmin.Use(middleware.AuthMiddleware())
	{
		// 租户管理
		tenantHandler := ssoHandler.NewTenantHandler()
		tenants := ssoAdmin.Group("/tenants")
		{
			tenants.GET("", middleware.PermissionMiddleware("sso_tenant", "read"), tenantHandler.List)
			tenants.GET("/:id", middleware.PermissionMiddleware("sso_tenant", "read"), tenantHandler.GetByID)
			tenants.POST("", middleware.PermissionMiddleware("sso_tenant", "create"), tenantHandler.Create)
			tenants.PUT("/:id", middleware.PermissionMiddleware("sso_tenant", "update"), tenantHandler.Update)
			tenants.DELETE("/:id", middleware.PermissionMiddleware("sso_tenant", "delete"), tenantHandler.Delete)
		}

		// SSO 用户管理
		userHandler := ssoHandler.NewUserHandler()
		users := ssoAdmin.Group("/users")
		{
			users.GET("", middleware.PermissionMiddleware("sso_user", "read"), userHandler.List)
			users.GET("/:id", middleware.PermissionMiddleware("sso_user", "read"), userHandler.GetByID)
			users.POST("", middleware.PermissionMiddleware("sso_user", "create"), userHandler.Create)
			users.PUT("/:id", middleware.PermissionMiddleware("sso_user", "update"), userHandler.Update)
			users.DELETE("/:id", middleware.PermissionMiddleware("sso_user", "delete"), userHandler.Delete)
			users.POST("/:id/reset-password", middleware.PermissionMiddleware("sso_user", "update"), userHandler.ResetPassword)
			users.POST("/:id/groups", middleware.PermissionMiddleware("sso_user", "update"), userHandler.AssignGroups)
		}

		// 用户组管理
		groupHandler := ssoHandler.NewGroupHandler()
		groups := ssoAdmin.Group("/groups")
		{
			groups.GET("", middleware.PermissionMiddleware("sso_group", "read"), groupHandler.List)
			groups.GET("/active", middleware.PermissionMiddleware("sso_group", "read"), groupHandler.ListActive)
			groups.GET("/:id", middleware.PermissionMiddleware("sso_group", "read"), groupHandler.GetByID)
			groups.POST("", middleware.PermissionMiddleware("sso_group", "create"), groupHandler.Create)
			groups.PUT("/:id", middleware.PermissionMiddleware("sso_group", "update"), groupHandler.Update)
			groups.DELETE("/:id", middleware.PermissionMiddleware("sso_group", "delete"), groupHandler.Delete)
		}

		// OIDC 客户端管理
		clientHandler := ssoHandler.NewOIDCClientHandler()
		clients := ssoAdmin.Group("/clients")
		{
			clients.GET("", middleware.PermissionMiddleware("sso_client", "read"), clientHandler.List)
			clients.GET("/:id", middleware.PermissionMiddleware("sso_client", "read"), clientHandler.GetByID)
			clients.POST("", middleware.PermissionMiddleware("sso_client", "create"), clientHandler.Create)
			clients.PUT("/:id", middleware.PermissionMiddleware("sso_client", "update"), clientHandler.Update)
			clients.DELETE("/:id", middleware.PermissionMiddleware("sso_client", "delete"), clientHandler.Delete)
		}
	}
}

// setupSSOProviderRoutes 设置 SSO Provider 路由（OIDC 端点）
func setupSSOProviderRoutes(r *gin.Engine, issuer string) {
	oidcHandler := ssoHandler.NewOIDCProviderHandler(issuer)

	// OIDC Discovery 端点（公开）
	r.GET("/.well-known/openid-configuration", oidcHandler.Discovery)
	r.GET("/.well-known/jwks.json", oidcHandler.JWKS)

	// OAuth2/OIDC 端点
	oauth := r.Group("/oauth")
	oauth.Use(middleware.SSOSessionMiddleware())
	{
		oauth.GET("/authorize", oidcHandler.Authorize)
		oauth.POST("/token", oidcHandler.Token)
		oauth.GET("/userinfo", oidcHandler.UserInfo)
		oauth.POST("/userinfo", oidcHandler.UserInfo)
		oauth.POST("/revoke", oidcHandler.Revoke)
		oauth.POST("/introspect", oidcHandler.Introspect)
		oauth.GET("/logout", oidcHandler.Logout)
		oauth.POST("/logout", oidcHandler.Logout)
	}

	// SSO 登录页面路由
	sso := r.Group("/sso")
	{
		sso.GET("/login", func(c *gin.Context) {
			c.File("./static/sso/login.html")
		})
		sso.POST("/auth/login", oidcHandler.Login)
	}
}
