package migrations

import (
	"errors"
	"strconv"

	casbinPkg "backend/internal/casbin"
	"backend/internal/model"
	"backend/pkg/utils"
	"gorm.io/gorm"
)

// Seed 初始化基础数据（只在首次启动时执行）
func Seed() error {
	// 检查是否已经初始化过
	var count int64
	if err := db.Model(&model.User{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		// 已经初始化过，跳过基础数据初始化
		return nil
	}

	// 创建超级管理员角色
	superAdminRole := model.Role{
		Name:        "admin",
		Description: "拥有所有权限的超级管理员",
		Status:      1,
	}
	if err := db.FirstOrCreate(&superAdminRole, model.Role{Name: "admin"}).Error; err != nil {
		return err
	}

	// 创建默认管理员用户
	hashedPassword, err := utils.HashPassword("admin123")
	if err != nil {
		return err
	}

	adminUser := model.User{
		Username: "admin",
		Password: hashedPassword,
		Email:    "admin@example.com",
		Status:   1,
	}

	if err := db.FirstOrCreate(&adminUser, model.User{Username: "admin"}).Error; err != nil {
		return err
	}

	// 将超级管理员角色分配给管理员用户
	if err := db.Model(&adminUser).Association("Roles").Replace([]model.Role{superAdminRole}); err != nil {
		return err
	}

	// 创建普通工单用户角色
	ticketUserRole := model.Role{
		Name:        "ticket_user",
		Description: "普通工单用户，可创建、查看和审批工单",
		Status:      1,
	}
	if err := db.FirstOrCreate(&ticketUserRole, model.Role{Name: "ticket_user"}).Error; err != nil {
		return err
	}

	// 创建普通用户
	userPassword, err := utils.HashPassword("user123")
	if err != nil {
		return err
	}

	normalUser := model.User{
		Username: "user",
		Password: userPassword,
		Email:    "user@example.com",
		Status:   1,
	}

	if err := db.FirstOrCreate(&normalUser, model.User{Username: "user"}).Error; err != nil {
		return err
	}

	// 将普通用户角色分配给普通用户
	if err := db.Model(&normalUser).Association("Roles").Replace([]model.Role{ticketUserRole}); err != nil {
		return err
	}

	return nil
}

// SyncAPIDefinitions 同步 API 定义数据（每次启动都执行）
func SyncAPIDefinitions() error {
	apiDefs := []model.APIDefinition{
		// 用户管理
		{Name: "用户列表", Path: "/api/v1/users", Method: "GET", Resource: "user", Description: "查看用户列表"},
		{Name: "用户详情", Path: "/api/v1/users/:id", Method: "GET", Resource: "user", Description: "查看用户详情"},
		{Name: "用户创建", Path: "/api/v1/users", Method: "POST", Resource: "user", Description: "创建用户"},
		{Name: "用户更新", Path: "/api/v1/users/:id", Method: "PUT", Resource: "user", Description: "更新用户信息"},
		{Name: "用户删除", Path: "/api/v1/users/:id", Method: "DELETE", Resource: "user", Description: "删除用户"},
		{Name: "用户分配角色", Path: "/api/v1/users/:id/roles", Method: "POST", Resource: "user", Description: "分配用户角色"},
		// 角色管理
		{Name: "角色列表", Path: "/api/v1/roles", Method: "GET", Resource: "role", Description: "查看角色列表"},
		{Name: "角色详情", Path: "/api/v1/roles/:id", Method: "GET", Resource: "role", Description: "查看角色详情"},
		{Name: "角色创建", Path: "/api/v1/roles", Method: "POST", Resource: "role", Description: "创建角色"},
		{Name: "角色更新", Path: "/api/v1/roles/:id", Method: "PUT", Resource: "role", Description: "更新角色信息"},
		{Name: "角色删除", Path: "/api/v1/roles/:id", Method: "DELETE", Resource: "role", Description: "删除角色"},
		{Name: "角色分配菜单", Path: "/api/v1/roles/:id/menus", Method: "POST", Resource: "role", Description: "分配角色菜单"},
		{Name: "角色获取策略", Path: "/api/v1/roles/:id/policies", Method: "GET", Resource: "role", Description: "获取角色策略"},
		{Name: "角色分配API", Path: "/api/v1/roles/:id/policies", Method: "POST", Resource: "role", Description: "分配角色API权限"},
		// API 管理
		{Name: "API列表", Path: "/api/v1/api-definitions", Method: "GET", Resource: "api", Description: "查看API列表"},
		{Name: "API资源列表", Path: "/api/v1/api-definitions/resources", Method: "GET", Resource: "api", Description: "获取API资源类型"},
		{Name: "API全部列表", Path: "/api/v1/api-definitions/all", Method: "GET", Resource: "api", Description: "获取所有API定义"},
		{Name: "API详情", Path: "/api/v1/api-definitions/:id", Method: "GET", Resource: "api", Description: "查看API详情"},
		{Name: "API创建", Path: "/api/v1/api-definitions", Method: "POST", Resource: "api", Description: "创建API"},
		{Name: "API更新", Path: "/api/v1/api-definitions/:id", Method: "PUT", Resource: "api", Description: "更新API信息"},
		{Name: "API删除", Path: "/api/v1/api-definitions/:id", Method: "DELETE", Resource: "api", Description: "删除API"},
		// 菜单管理
		{Name: "菜单列表", Path: "/api/v1/menus", Method: "GET", Resource: "menu", Description: "查看菜单列表"},
		{Name: "菜单详情", Path: "/api/v1/menus/:id", Method: "GET", Resource: "menu", Description: "查看菜单详情"},
		{Name: "菜单创建", Path: "/api/v1/menus", Method: "POST", Resource: "menu", Description: "创建菜单"},
		{Name: "菜单更新", Path: "/api/v1/menus/:id", Method: "PUT", Resource: "menu", Description: "更新菜单信息"},
		{Name: "菜单删除", Path: "/api/v1/menus/:id", Method: "DELETE", Resource: "menu", Description: "删除菜单"},
		// 系统设置
		{Name: "OIDC配置查看", Path: "/api/v1/system-config/oidc", Method: "GET", Resource: "system", Description: "查看OIDC配置"},
		{Name: "OIDC配置更新", Path: "/api/v1/system-config/oidc", Method: "PUT", Resource: "system", Description: "更新OIDC配置"},
		{Name: "邮件配置查看", Path: "/api/v1/system-config/email", Method: "GET", Resource: "system", Description: "查看邮件配置"},
		{Name: "邮件配置更新", Path: "/api/v1/system-config/email", Method: "PUT", Resource: "system", Description: "更新邮件配置"},
		{Name: "邮件测试", Path: "/api/v1/system-config/email/test", Method: "POST", Resource: "system", Description: "测试邮件发送"},
		// 网站管理
		{Name: "网站分类列表", Path: "/api/v1/navigation-categories", Method: "GET", Resource: "navigation", Description: "查看网站分类列表"},
		{Name: "网站分类详情", Path: "/api/v1/navigation-categories/:id", Method: "GET", Resource: "navigation", Description: "查看网站分类详情"},
		{Name: "网站分类创建", Path: "/api/v1/navigation-categories", Method: "POST", Resource: "navigation", Description: "创建网站分类"},
		{Name: "网站分类更新", Path: "/api/v1/navigation-categories/:id", Method: "PUT", Resource: "navigation", Description: "更新网站分类信息"},
		{Name: "网站分类删除", Path: "/api/v1/navigation-categories/:id", Method: "DELETE", Resource: "navigation", Description: "删除网站分类"},
		{Name: "网站列表", Path: "/api/v1/navigations", Method: "GET", Resource: "navigation", Description: "查看网站列表"},
		{Name: "网站详情", Path: "/api/v1/navigations/:id", Method: "GET", Resource: "navigation", Description: "查看网站详情"},
		{Name: "网站创建", Path: "/api/v1/navigations", Method: "POST", Resource: "navigation", Description: "创建网站"},
		{Name: "网站更新", Path: "/api/v1/navigations/:id", Method: "PUT", Resource: "navigation", Description: "更新网站信息"},
		{Name: "网站删除", Path: "/api/v1/navigations/:id", Method: "DELETE", Resource: "navigation", Description: "删除网站"},
		// SSO 租户管理
		{Name: "SSO租户列表", Path: "/api/v1/sso/tenants", Method: "GET", Resource: "sso_tenant", Description: "查看SSO租户列表"},
		{Name: "SSO租户详情", Path: "/api/v1/sso/tenants/:id", Method: "GET", Resource: "sso_tenant", Description: "查看SSO租户详情"},
		{Name: "SSO租户创建", Path: "/api/v1/sso/tenants", Method: "POST", Resource: "sso_tenant", Description: "创建SSO租户"},
		{Name: "SSO租户更新", Path: "/api/v1/sso/tenants/:id", Method: "PUT", Resource: "sso_tenant", Description: "更新SSO租户"},
		{Name: "SSO租户删除", Path: "/api/v1/sso/tenants/:id", Method: "DELETE", Resource: "sso_tenant", Description: "删除SSO租户"},
		// SSO 用户管理
		{Name: "SSO用户列表", Path: "/api/v1/sso/users", Method: "GET", Resource: "sso_user", Description: "查看SSO用户列表"},
		{Name: "SSO用户详情", Path: "/api/v1/sso/users/:id", Method: "GET", Resource: "sso_user", Description: "查看SSO用户详情"},
		{Name: "SSO用户创建", Path: "/api/v1/sso/users", Method: "POST", Resource: "sso_user", Description: "创建SSO用户"},
		{Name: "SSO用户更新", Path: "/api/v1/sso/users/:id", Method: "PUT", Resource: "sso_user", Description: "更新SSO用户"},
		{Name: "SSO用户删除", Path: "/api/v1/sso/users/:id", Method: "DELETE", Resource: "sso_user", Description: "删除SSO用户"},
		{Name: "SSO用户重置密码", Path: "/api/v1/sso/users/:id/reset-password", Method: "POST", Resource: "sso_user", Description: "重置SSO用户密码"},
		{Name: "SSO用户分配组", Path: "/api/v1/sso/users/:id/groups", Method: "POST", Resource: "sso_user", Description: "分配SSO用户组"},
		// SSO 用户组管理
		{Name: "SSO用户组列表", Path: "/api/v1/sso/groups", Method: "GET", Resource: "sso_group", Description: "查看SSO用户组列表"},
		{Name: "SSO活跃用户组", Path: "/api/v1/sso/groups/active", Method: "GET", Resource: "sso_group", Description: "查看活跃SSO用户组"},
		{Name: "SSO用户组详情", Path: "/api/v1/sso/groups/:id", Method: "GET", Resource: "sso_group", Description: "查看SSO用户组详情"},
		{Name: "SSO用户组创建", Path: "/api/v1/sso/groups", Method: "POST", Resource: "sso_group", Description: "创建SSO用户组"},
		{Name: "SSO用户组更新", Path: "/api/v1/sso/groups/:id", Method: "PUT", Resource: "sso_group", Description: "更新SSO用户组"},
		{Name: "SSO用户组删除", Path: "/api/v1/sso/groups/:id", Method: "DELETE", Resource: "sso_group", Description: "删除SSO用户组"},
		// SSO OIDC 客户端管理
		{Name: "OIDC客户端列表", Path: "/api/v1/sso/clients", Method: "GET", Resource: "sso_client", Description: "查看OIDC客户端列表"},
		{Name: "OIDC客户端详情", Path: "/api/v1/sso/clients/:id", Method: "GET", Resource: "sso_client", Description: "查看OIDC客户端详情"},
		{Name: "OIDC客户端创建", Path: "/api/v1/sso/clients", Method: "POST", Resource: "sso_client", Description: "创建OIDC客户端"},
		{Name: "OIDC客户端更新", Path: "/api/v1/sso/clients/:id", Method: "PUT", Resource: "sso_client", Description: "更新OIDC客户端"},
		{Name: "OIDC客户端删除", Path: "/api/v1/sso/clients/:id", Method: "DELETE", Resource: "sso_client", Description: "删除OIDC客户端"},
		// 存储配置
		{Name: "存储配置查看", Path: "/api/v1/system-config/storage", Method: "GET", Resource: "system", Description: "查看存储配置"},
		{Name: "存储配置更新", Path: "/api/v1/system-config/storage", Method: "PUT", Resource: "system", Description: "更新存储配置"},
		// 通知配置
		{Name: "通知配置查看", Path: "/api/v1/system-config/notify", Method: "GET", Resource: "system", Description: "查看通知配置"},
		{Name: "通知配置更新", Path: "/api/v1/system-config/notify", Method: "PUT", Resource: "system", Description: "更新通知配置"},
		// 工单类型管理
		{Name: "工单类型列表", Path: "/api/v1/ticket-types", Method: "GET", Resource: "ticket", Description: "查看工单类型列表"},
		{Name: "工单类型启用列表", Path: "/api/v1/ticket-types/enabled", Method: "GET", Resource: "ticket", Description: "查看启用的工单类型"},
		{Name: "工单类型详情", Path: "/api/v1/ticket-types/:id", Method: "GET", Resource: "ticket", Description: "查看工单类型详情"},
		{Name: "工单类型创建", Path: "/api/v1/ticket-types", Method: "POST", Resource: "ticket", Description: "创建工单类型"},
		{Name: "工单类型更新", Path: "/api/v1/ticket-types/:id", Method: "PUT", Resource: "ticket", Description: "更新工单类型"},
		{Name: "工单类型删除", Path: "/api/v1/ticket-types/:id", Method: "DELETE", Resource: "ticket", Description: "删除工单类型"},
		// 表单模板管理
		{Name: "表单模板列表", Path: "/api/v1/form-templates", Method: "GET", Resource: "ticket", Description: "查看表单模板列表"},
		{Name: "表单模板启用列表", Path: "/api/v1/form-templates/enabled", Method: "GET", Resource: "ticket", Description: "查看启用的表单模板"},
		{Name: "表单模板详情", Path: "/api/v1/form-templates/:id", Method: "GET", Resource: "ticket", Description: "查看表单模板详情"},
		{Name: "表单模板创建", Path: "/api/v1/form-templates", Method: "POST", Resource: "ticket", Description: "创建表单模板"},
		{Name: "表单模板更新", Path: "/api/v1/form-templates/:id", Method: "PUT", Resource: "ticket", Description: "更新表单模板"},
		{Name: "表单模板删除", Path: "/api/v1/form-templates/:id", Method: "DELETE", Resource: "ticket", Description: "删除表单模板"},
		// 表单字段管理
		{Name: "表单字段列表", Path: "/api/v1/form-templates/:id/fields", Method: "GET", Resource: "ticket", Description: "查看表单字段列表"},
		{Name: "表单字段保存", Path: "/api/v1/form-templates/:id/fields", Method: "PUT", Resource: "ticket", Description: "保存表单字段"},
		// 工单快捷模板管理
		{Name: "工单模板启用列表", Path: "/api/v1/ticket-templates/enabled", Method: "GET", Resource: "ticket", Description: "查看启用的工单模板"},
		// 工单管理
		{Name: "工单列表", Path: "/api/v1/tickets", Method: "GET", Resource: "ticket", Description: "查看工单列表"},
		{Name: "我的工单", Path: "/api/v1/tickets/my", Method: "GET", Resource: "ticket", Description: "查看我的工单"},
		{Name: "待审批工单", Path: "/api/v1/tickets/pending", Method: "GET", Resource: "ticket", Description: "查看待审批工单"},
		{Name: "我处理的工单", Path: "/api/v1/tickets/processed", Method: "GET", Resource: "ticket", Description: "查看我处理的工单"},
		{Name: "抄送我的工单", Path: "/api/v1/tickets/cc", Method: "GET", Resource: "ticket", Description: "查看抄送我的工单"},
		{Name: "工单统计", Path: "/api/v1/tickets/stats", Method: "GET", Resource: "ticket", Description: "查看工单统计"},
		{Name: "工单详情", Path: "/api/v1/tickets/:id", Method: "GET", Resource: "ticket", Description: "查看工单详情"},
		{Name: "工单创建", Path: "/api/v1/tickets", Method: "POST", Resource: "ticket", Description: "创建工单"},
		{Name: "工单更新", Path: "/api/v1/tickets/:id", Method: "PUT", Resource: "ticket", Description: "更新工单"},
		{Name: "工单删除", Path: "/api/v1/tickets/:id", Method: "DELETE", Resource: "ticket", Description: "删除工单"},
		{Name: "工单提交", Path: "/api/v1/tickets/:id/submit", Method: "POST", Resource: "ticket", Description: "提交工单审批"},
		{Name: "工单审批", Path: "/api/v1/tickets/:id/approve", Method: "POST", Resource: "ticket", Description: "审批工单"},
		{Name: "工单完成", Path: "/api/v1/tickets/:id/complete", Method: "POST", Resource: "ticket", Description: "完成工单"},
		{Name: "工单取消", Path: "/api/v1/tickets/:id/cancel", Method: "POST", Resource: "ticket", Description: "取消工单"},
		// 审批流程管理
		{Name: "审批流程列表", Path: "/api/v1/approval-flows", Method: "GET", Resource: "ticket", Description: "查看审批流程列表"},
		{Name: "审批流程启用列表", Path: "/api/v1/approval-flows/enabled", Method: "GET", Resource: "ticket", Description: "查看启用的审批流程"},
		{Name: "审批流程详情", Path: "/api/v1/approval-flows/:id", Method: "GET", Resource: "ticket", Description: "查看审批流程详情"},
		{Name: "审批流程创建", Path: "/api/v1/approval-flows", Method: "POST", Resource: "ticket", Description: "创建审批流程"},
		{Name: "审批流程更新", Path: "/api/v1/approval-flows/:id", Method: "PUT", Resource: "ticket", Description: "更新审批流程"},
		{Name: "审批流程删除", Path: "/api/v1/approval-flows/:id", Method: "DELETE", Resource: "ticket", Description: "删除审批流程"},
		{Name: "审批流程发布新版本", Path: "/api/v1/approval-flows/:id/publish", Method: "POST", Resource: "ticket", Description: "发布审批流程新版本"},
		{Name: "审批节点查看", Path: "/api/v1/approval-flows/:id/nodes", Method: "GET", Resource: "ticket", Description: "查看审批节点"},
		{Name: "审批节点保存", Path: "/api/v1/approval-flows/:id/nodes", Method: "PUT", Resource: "ticket", Description: "保存审批节点"},
		{Name: "审批节点连线保存", Path: "/api/v1/approval-flows/:id/nodes-with-connections", Method: "PUT", Resource: "ticket", Description: "保存审批节点及连线"},
		// 附件管理
		{Name: "附件上传", Path: "/api/v1/attachments/ticket/:ticket_id", Method: "POST", Resource: "ticket", Description: "上传附件"},
		{Name: "附件列表", Path: "/api/v1/attachments/ticket/:ticket_id", Method: "GET", Resource: "ticket", Description: "查看附件列表"},
		{Name: "附件下载", Path: "/api/v1/attachments/:id/download", Method: "GET", Resource: "ticket", Description: "下载附件"},
		{Name: "附件删除", Path: "/api/v1/attachments/:id", Method: "DELETE", Resource: "ticket", Description: "删除附件"},
		// 评论管理
		{Name: "评论列表", Path: "/api/v1/comments/ticket/:ticket_id", Method: "GET", Resource: "ticket", Description: "查看评论列表"},
		{Name: "评论创建", Path: "/api/v1/comments/ticket/:ticket_id", Method: "POST", Resource: "ticket", Description: "创建评论"},
		{Name: "评论删除", Path: "/api/v1/comments/:id", Method: "DELETE", Resource: "ticket", Description: "删除评论"},
		// 审批记录
		{Name: "审批记录", Path: "/api/v1/tickets/:id/records", Method: "GET", Resource: "ticket", Description: "查看审批记录"},
		{Name: "审批权限检查", Path: "/api/v1/tickets/:id/can-approve", Method: "GET", Resource: "ticket", Description: "检查审批权限"},
	}

	for _, apiDef := range apiDefs {
		if err := db.FirstOrCreate(&apiDef, model.APIDefinition{Path: apiDef.Path, Method: apiDef.Method}).Error; err != nil {
			return err
		}
	}

	return nil
}

// SyncCasbinPolicies 同步 Casbin 策略（为 admin 角色分配所有 API 权限）
func SyncCasbinPolicies() error {
	enforcer := casbinPkg.GetEnforcer()
	if enforcer == nil {
		return nil
	}

	var superAdminRole model.Role
	if err := db.Where("name = ?", "admin").First(&superAdminRole).Error; err != nil {
		return nil
	}

	// 获取所有 API 定义
	var apiDefs []model.APIDefinition
	if err := db.Find(&apiDefs).Error; err != nil {
		return err
	}

	roleIDStr := strconv.FormatUint(uint64(superAdminRole.ID), 10)

	// 为 admin 角色添加所有 API 权限（使用角色 ID）
	for _, apiDef := range apiDefs {
		enforcer.AddPolicy(roleIDStr, apiDef.Path, apiDef.Method)
	}

	return enforcer.SavePolicy()
}

// SyncTicketUserPolicies 为普通工单用户角色分配权限
func SyncTicketUserPolicies() error {
	enforcer := casbinPkg.GetEnforcer()
	if enforcer == nil {
		return nil
	}

	var ticketUserRole model.Role
	if err := db.Where("name = ?", "ticket_user").First(&ticketUserRole).Error; err != nil {
		return nil // 角色不存在，跳过
	}

	roleIDStr := strconv.FormatUint(uint64(ticketUserRole.ID), 10)

	// 普通工单用户需要的 API 权限
	ticketUserAPIs := []struct {
		Path   string
		Method string
	}{
		// 工单类型和模板（创建工单时需要）
		{"/api/v1/ticket-types/enabled", "GET"},
		{"/api/v1/ticket-templates/enabled", "GET"},
		{"/api/v1/form-templates/:id/fields", "GET"},
		// 工单列表
		{"/api/v1/tickets", "GET"},
		{"/api/v1/tickets/my", "GET"},
		{"/api/v1/tickets/pending", "GET"},
		{"/api/v1/tickets/processed", "GET"},
		{"/api/v1/tickets/cc", "GET"},
		// 工单操作
		{"/api/v1/tickets/:id", "GET"},
		{"/api/v1/tickets", "POST"},
		{"/api/v1/tickets/:id", "PUT"},
		{"/api/v1/tickets/:id", "DELETE"},
		{"/api/v1/tickets/:id/submit", "POST"},
		{"/api/v1/tickets/:id/approve", "POST"},
		{"/api/v1/tickets/:id/cancel", "POST"},
		// 附件
		{"/api/v1/attachments/ticket/:ticket_id", "POST"},
		{"/api/v1/attachments/ticket/:ticket_id", "GET"},
		{"/api/v1/attachments/:id/download", "GET"},
		// 评论
		{"/api/v1/comments/ticket/:ticket_id", "GET"},
		{"/api/v1/comments/ticket/:ticket_id", "POST"},
		// 审批记录
		{"/api/v1/tickets/:id/records", "GET"},
		{"/api/v1/tickets/:id/can-approve", "GET"},
		// 用户列表（选择审批人等场景需要）
		{"/api/v1/users", "GET"},
		// 角色列表（审批流程中选择角色需要）
		{"/api/v1/roles", "GET"},
	}

	for _, api := range ticketUserAPIs {
		enforcer.AddPolicy(roleIDStr, api.Path, api.Method)
	}

	// 为角色分配工单相关菜单
	var ticketMenu model.Menu
	if err := db.Where("path = ?", "/ticket").First(&ticketMenu).Error; err == nil {
		var ticketListMenu model.Menu
		if err := db.Where("path = ?", "/ticket/list").First(&ticketListMenu).Error; err == nil {
			db.Model(&ticketUserRole).Association("Menus").Replace([]model.Menu{ticketMenu, ticketListMenu})
		}
	}

	return enforcer.SavePolicy()
}

// SyncSystemConfigs 同步系统配置（每次启动都执行，检查并添加默认配置）
func SyncSystemConfigs() error {
	systemConfigs := []model.SystemConfig{
		{
			Key:      "oidc",
			Value:    `{"enabled":false,"issuer":"","client_id":"","client_secret":"","redirect_url":"","scopes":"openid profile email","auto_create_user":false,"default_roles":[]}`,
			Type:     "json",
			Category: "auth",
		},
		{
			Key:      "email",
			Value:    `{"enabled":false,"host":"","port":587,"username":"","password":"","from":"","from_addr":"","use_tls":true,"use_ssl":false}`,
			Type:     "json",
			Category: "notification",
		},
	}

	for _, config := range systemConfigs {
		// 只在配置不存在时创建，不覆盖已有配置
		if err := db.Where("`key` = ?", config.Key).FirstOrCreate(&config).Error; err != nil {
			return err
		}
	}

	return nil
}

// SyncMenus 同步菜单数据（每次启动都执行，检查并添加新菜单）
func SyncMenus() error {
	// 辅助函数：创建或更新菜单
	upsertMenu := func(menu *model.Menu) error {
		var existing model.Menu
		if err := db.Where("path = ?", menu.Path).First(&existing).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 不存在，创建新菜单
				return db.Create(menu).Error
			}
			return err
		}
		// 已存在，更新并保留 ID
		menu.ID = existing.ID
		return db.Model(&existing).Updates(map[string]any{
			"name":      menu.Name,
			"icon":      menu.Icon,
			"component": menu.Component,
			"sort":      menu.Sort,
			"status":    menu.Status,
			"parent_id": menu.ParentID,
		}).Error
	}

	// 创建仪表盘菜单
	dashboardMenu := model.Menu{
		Name:      "仪表盘",
		Path:      "/dashboard",
		Icon:      "DashboardOutlined",
		Component: "dashboard",
		Sort:      1,
		Status:    1,
	}
	if err := upsertMenu(&dashboardMenu); err != nil {
		return err
	}

	// 创建系统管理菜单
	systemMenu := model.Menu{
		Name:      "系统管理",
		Path:      "/system",
		Icon:      "SettingOutlined",
		Component: "",
		Sort:      2,
		Status:    1,
	}
	if err := upsertMenu(&systemMenu); err != nil {
		return err
	}

	// 创建系统管理子菜单
	systemSubMenus := []model.Menu{
		{Name: "导航管理", Path: "/system/navigation", Icon: "CompassOutlined", Component: "system/navigation", Sort: 1, Status: 1},
		{Name: "用户管理", Path: "/system/user", Icon: "UserOutlined", Component: "system/user", Sort: 2, Status: 1},
		{Name: "角色管理", Path: "/system/role", Icon: "SafetyOutlined", Component: "system/role", Sort: 3, Status: 1},
		{Name: "API 管理", Path: "/system/api", Icon: "ApiOutlined", Component: "system/api", Sort: 4, Status: 1},
		{Name: "菜单管理", Path: "/system/menu", Icon: "MenuOutlined", Component: "system/menu", Sort: 5, Status: 1},
		{Name: "系统设置", Path: "/system/settings", Icon: "SettingOutlined", Component: "system/settings", Sort: 6, Status: 1},
	}

	for i := range systemSubMenus {
		systemSubMenus[i].ParentID = &systemMenu.ID
		if err := upsertMenu(&systemSubMenus[i]); err != nil {
			return err
		}
	}

	// 创建 SSO 管理菜单
	ssoMenu := model.Menu{
		Name:      "SSO 管理",
		Path:      "/sso",
		Icon:      "KeyOutlined",
		Component: "",
		Sort:      3,
		Status:    1,
	}
	if err := upsertMenu(&ssoMenu); err != nil {
		return err
	}

	// 创建 SSO 子菜单
	ssoSubMenus := []model.Menu{
		{Name: "租户管理", Path: "/sso/tenants", Icon: "BankOutlined", Component: "sso/TenantManage", Sort: 1, Status: 1},
		{Name: "用户管理", Path: "/sso/users", Icon: "UserOutlined", Component: "sso/UserManage", Sort: 2, Status: 1},
		{Name: "用户组管理", Path: "/sso/groups", Icon: "TeamOutlined", Component: "sso/GroupManage", Sort: 3, Status: 1},
		{Name: "应用管理", Path: "/sso/clients", Icon: "AppstoreOutlined", Component: "sso/ClientManage", Sort: 4, Status: 1},
	}

	for i := range ssoSubMenus {
		ssoSubMenus[i].ParentID = &ssoMenu.ID
		if err := upsertMenu(&ssoSubMenus[i]); err != nil {
			return err
		}
	}

	// 创建工单管理菜单
	ticketMenu := model.Menu{
		Name:      "工单管理",
		Path:      "/ticket",
		Icon:      "ClipboardListOutlined",
		Component: "",
		Sort:      4,
		Status:    1,
	}
	if err := upsertMenu(&ticketMenu); err != nil {
		return err
	}

	// 创建工单子菜单
	ticketSubMenus := []model.Menu{
		{Name: "工单列表", Path: "/ticket/list", Icon: "FileTextOutlined", Component: "ticket/List", Sort: 1, Status: 1},
		{Name: "类型管理", Path: "/ticket/types", Icon: "AppstoreOutlined", Component: "ticket/TypeManage", Sort: 2, Status: 1},
		{Name: "模板管理", Path: "/ticket/templates", Icon: "FileOutlined", Component: "ticket/TemplateManage", Sort: 3, Status: 1},
		{Name: "流程管理", Path: "/ticket/flows", Icon: "ApartmentOutlined", Component: "ticket/FlowManage", Sort: 4, Status: 1},
		{Name: "统计报表", Path: "/ticket/statistics", Icon: "BarChartOutlined", Component: "ticket/Statistics", Sort: 5, Status: 1},
	}

	for i := range ticketSubMenus {
		ticketSubMenus[i].ParentID = &ticketMenu.ID
		if err := upsertMenu(&ticketSubMenus[i]); err != nil {
			return err
		}
	}

	// 将所有菜单分配给超级管理员角色
	var superAdminRole model.Role
	if err := db.Where("name = ?", "admin").First(&superAdminRole).Error; err != nil {
		return nil // 角色不存在，跳过
	}

	var allMenus []model.Menu
	if err := db.Find(&allMenus).Error; err != nil {
		return err
	}

	return db.Model(&superAdminRole).Association("Menus").Replace(allMenus)
}
