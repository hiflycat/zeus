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
			user.Use(middleware.CasbinRBACMiddleware())
			{
				user.GET("", userHandler.List)
				user.GET("/:id", userHandler.GetByID)
				user.POST("", userHandler.Create)
				user.PUT("/:id", userHandler.Update)
				user.DELETE("/:id", userHandler.Delete)
				user.POST("/:id/roles", userHandler.AssignRoles)
			}

			// 角色管理
			roleHandler := handler.NewRoleHandler()
			role := auth.Group("/roles")
			role.Use(middleware.CasbinRBACMiddleware())
			{
				role.GET("", roleHandler.List)
				role.GET("/:id", roleHandler.GetByID)
				role.POST("", roleHandler.Create)
				role.PUT("/:id", roleHandler.Update)
				role.DELETE("/:id", roleHandler.Delete)
				role.GET("/:id/policies", roleHandler.GetPolicies)
				role.POST("/:id/policies", roleHandler.AssignPolicies)
				role.POST("/:id/menus", roleHandler.AssignMenus)
			}

			// API 定义管理
			apiDefHandler := handler.NewAPIDefinitionHandler()
			apiDef := auth.Group("/api-definitions")
			apiDef.Use(middleware.CasbinRBACMiddleware())
			{
				apiDef.GET("", apiDefHandler.List)
				apiDef.GET("/resources", apiDefHandler.GetResources)
				apiDef.GET("/all", apiDefHandler.GetAll)
				apiDef.GET("/:id", apiDefHandler.GetByID)
				apiDef.POST("", apiDefHandler.Create)
				apiDef.PUT("/:id", apiDefHandler.Update)
				apiDef.DELETE("/:id", apiDefHandler.Delete)
			}

			// 菜单管理
			menuHandler := handler.NewMenuHandler()
			menu := auth.Group("/menus")
			menu.Use(middleware.CasbinRBACMiddleware())
			{
				menu.GET("", menuHandler.List)
				menu.GET("/:id", menuHandler.GetByID)
				menu.POST("", menuHandler.Create)
				menu.PUT("/:id", menuHandler.Update)
				menu.DELETE("/:id", menuHandler.Delete)
			}

			// 网站分类管理
			navigationCategoryHandler := handler.NewNavigationCategoryHandler()
			navigationCategory := auth.Group("/navigation-categories")
			navigationCategory.Use(middleware.CasbinRBACMiddleware())
			{
				navigationCategory.GET("", navigationCategoryHandler.List)
				navigationCategory.GET("/:id", navigationCategoryHandler.GetByID)
				navigationCategory.POST("", navigationCategoryHandler.Create)
				navigationCategory.PUT("/:id", navigationCategoryHandler.Update)
				navigationCategory.DELETE("/:id", navigationCategoryHandler.Delete)
			}

			// 网站管理
			navigationHandler := handler.NewNavigationHandler()
			navigation := auth.Group("/navigations")
			navigation.Use(middleware.CasbinRBACMiddleware())
			{
				navigation.GET("", navigationHandler.List)
				navigation.GET("/:id", navigationHandler.GetByID)
				navigation.POST("", navigationHandler.Create)
				navigation.PUT("/:id", navigationHandler.Update)
				navigation.DELETE("/:id", navigationHandler.Delete)
			}

			// 系统配置管理
			systemConfigHandler := handler.NewSystemConfigHandler()
			systemConfig := auth.Group("/system-config")
			systemConfig.Use(middleware.CasbinRBACMiddleware())
			{
				systemConfig.GET("/oidc", systemConfigHandler.GetOIDCConfig)
				systemConfig.PUT("/oidc", systemConfigHandler.UpdateOIDCConfig)
				systemConfig.GET("/email", systemConfigHandler.GetEmailConfig)
				systemConfig.PUT("/email", systemConfigHandler.UpdateEmailConfig)
				systemConfig.POST("/email/test", systemConfigHandler.TestEmail)
			}

			// 工单类型管理
			ticketTypeHandler := handler.NewTicketTypeHandler()
			ticketType := auth.Group("/ticket-types")
			ticketType.Use(middleware.CasbinRBACMiddleware())
			{
				ticketType.GET("", ticketTypeHandler.List)
				ticketType.GET("/enabled", ticketTypeHandler.ListEnabled)
				ticketType.GET("/:id", ticketTypeHandler.GetByID)
				ticketType.POST("", ticketTypeHandler.Create)
				ticketType.PUT("/:id", ticketTypeHandler.Update)
				ticketType.DELETE("/:id", ticketTypeHandler.Delete)
			}

			// 工单管理
			ticketHandler := handler.NewTicketHandler()
			ticket := auth.Group("/tickets")
			ticket.Use(middleware.CasbinRBACMiddleware())
			{
				ticket.GET("", ticketHandler.List)
				ticket.GET("/my", ticketHandler.GetMyTickets)
				ticket.GET("/pending", ticketHandler.GetPendingApprovals)
				ticket.GET("/:id", ticketHandler.GetByID)
				ticket.POST("", ticketHandler.Create)
				ticket.PUT("/:id", ticketHandler.Update)
				ticket.DELETE("/:id", ticketHandler.Delete)
				ticket.POST("/:id/submit", ticketHandler.Submit)
				ticket.POST("/:id/approve", ticketHandler.Approve)
				ticket.POST("/:id/complete", ticketHandler.Complete)
				ticket.POST("/:id/cancel", ticketHandler.Cancel)
			}

			// 审批流程管理
			approvalFlowHandler := handler.NewApprovalFlowHandler()
			approvalFlow := auth.Group("/approval-flows")
			approvalFlow.Use(middleware.CasbinRBACMiddleware())
			{
				approvalFlow.GET("", approvalFlowHandler.ListFlows)
				approvalFlow.GET("/:id", approvalFlowHandler.GetFlowByID)
				approvalFlow.GET("/type/:type_id", approvalFlowHandler.GetFlowByTypeID)
				approvalFlow.POST("", approvalFlowHandler.CreateFlow)
				approvalFlow.PUT("/:id", approvalFlowHandler.UpdateFlow)
				approvalFlow.DELETE("/:id", approvalFlowHandler.DeleteFlow)
				approvalFlow.GET("/:id/nodes", approvalFlowHandler.GetNodes)
				approvalFlow.PUT("/:id/nodes", approvalFlowHandler.SaveNodes)
			}

			// 附件管理
			attachmentHandler := handler.NewAttachmentHandler()
			attachment := auth.Group("/attachments")
			attachment.Use(middleware.CasbinRBACMiddleware())
			{
				attachment.POST("/ticket/:ticket_id", attachmentHandler.Upload)
				attachment.GET("/ticket/:ticket_id", attachmentHandler.List)
				attachment.GET("/:id/download", attachmentHandler.GetDownloadURL)
				attachment.DELETE("/:id", attachmentHandler.Delete)
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

		// CAS 路由（仅在启用时注册）
		if cfg.SSO.CAS.Enabled {
			setupCASRoutes(r, cfg.SSO.Issuer, &cfg.SSO.CAS)
		}
	}

	return r
}

// setupSSOAdminRoutes 设置 SSO 后台管理路由（始终可用）
func setupSSOAdminRoutes(r *gin.Engine) {
	ssoAdmin := r.Group("/api/v1/sso")
	ssoAdmin.Use(middleware.AuthMiddleware())
	ssoAdmin.Use(middleware.CasbinRBACMiddleware())
	{
		// 租户管理
		tenantHandler := ssoHandler.NewTenantHandler()
		tenants := ssoAdmin.Group("/tenants")
		{
			tenants.GET("", tenantHandler.List)
			tenants.GET("/:id", tenantHandler.GetByID)
			tenants.POST("", tenantHandler.Create)
			tenants.PUT("/:id", tenantHandler.Update)
			tenants.DELETE("/:id", tenantHandler.Delete)
		}

		// SSO 用户管理
		userHandler := ssoHandler.NewUserHandler()
		users := ssoAdmin.Group("/users")
		{
			users.GET("", userHandler.List)
			users.GET("/:id", userHandler.GetByID)
			users.POST("", userHandler.Create)
			users.PUT("/:id", userHandler.Update)
			users.DELETE("/:id", userHandler.Delete)
			users.POST("/:id/reset-password", userHandler.ResetPassword)
			users.POST("/:id/groups", userHandler.AssignGroups)
		}

		// 用户组管理
		groupHandler := ssoHandler.NewGroupHandler()
		groups := ssoAdmin.Group("/groups")
		{
			groups.GET("", groupHandler.List)
			groups.GET("/active", groupHandler.ListActive)
			groups.GET("/:id", groupHandler.GetByID)
			groups.POST("", groupHandler.Create)
			groups.PUT("/:id", groupHandler.Update)
			groups.DELETE("/:id", groupHandler.Delete)
		}

		// OIDC 客户端管理
		clientHandler := ssoHandler.NewOIDCClientHandler()
		clients := ssoAdmin.Group("/clients")
		{
			clients.GET("", clientHandler.List)
			clients.GET("/:id", clientHandler.GetByID)
			clients.POST("", clientHandler.Create)
			clients.PUT("/:id", clientHandler.Update)
			clients.DELETE("/:id", clientHandler.Delete)
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

	// SSO 登录 API 路由
	sso := r.Group("/sso")
	{
		sso.POST("/auth/login", oidcHandler.Login)
	}
}

// setupCASRoutes 设置 CAS 路由
func setupCASRoutes(r *gin.Engine, issuer string, cfg *config.CASConfig) {
	casHandler := ssoHandler.NewCASHandler(issuer, cfg)

	cas := r.Group("/cas")
	{
		// CAS 1.0/2.0/3.0 端点
		cas.GET("/login", casHandler.Login)
		cas.POST("/login", casHandler.Login)
		cas.GET("/logout", casHandler.Logout)
		cas.GET("/validate", casHandler.Validate)
		cas.GET("/serviceValidate", casHandler.ServiceValidate)
		cas.GET("/p3/serviceValidate", casHandler.P3ServiceValidate)
		cas.GET("/proxyValidate", casHandler.ProxyValidate)
		cas.GET("/proxy", casHandler.Proxy)
		cas.POST("/samlValidate", casHandler.SAMLValidate)
	}
}
