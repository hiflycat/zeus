package migrations

import (
	"backend/internal/model"
	"backend/pkg/utils"
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

	// 创建仪表盘菜单
	dashboardMenu := model.Menu{
		Name:      "仪表盘",
		Path:      "/dashboard",
		Icon:      "DashboardOutlined",
		Component: "dashboard",
		Sort:      1,
		Status:    1,
	}
	if err := db.Where("path = ?", "/dashboard").FirstOrCreate(&dashboardMenu).Error; err != nil {
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
	if err := db.Where("path = ?", "/system").FirstOrCreate(&systemMenu).Error; err != nil {
		return err
	}

	// 创建子菜单
	subMenus := []model.Menu{
		{Name: "用户管理", Path: "/system/user", Icon: "UserOutlined", Component: "system/user", Sort: 1, Status: 1},
		{Name: "角色管理", Path: "/system/role", Icon: "TeamOutlined", Component: "system/role", Sort: 2, Status: 1},
		{Name: "权限管理", Path: "/system/permission", Icon: "SafetyOutlined", Component: "system/permission", Sort: 3, Status: 1},
		{Name: "菜单管理", Path: "/system/menu", Icon: "MenuOutlined", Component: "system/menu", Sort: 4, Status: 1},
		{Name: "系统设置", Path: "/system/settings", Icon: "SettingOutlined", Component: "system/settings", Sort: 5, Status: 1},
		{Name: "导航管理", Path: "/system/navigation", Icon: "AppstoreOutlined", Component: "system/navigation", Sort: 7, Status: 1},
	}

	for i := range subMenus {
		subMenus[i].ParentID = &systemMenu.ID
		if err := db.Where("path = ?", subMenus[i].Path).FirstOrCreate(&subMenus[i]).Error; err != nil {
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
	if err := db.Where("path = ?", "/sso").FirstOrCreate(&ssoMenu).Error; err != nil {
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
		if err := db.Where("path = ?", ssoSubMenus[i].Path).FirstOrCreate(&ssoSubMenus[i]).Error; err != nil {
			return err
		}
	}

	// 将所有菜单分配给超级管理员角色
	var allMenus []model.Menu
	if err := db.Find(&allMenus).Error; err != nil {
		return err
	}
	if err := db.Model(&superAdminRole).Association("Menus").Replace(allMenus); err != nil {
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

	return nil
}

// SyncPermissions 同步权限数据（每次启动都执行，检查并添加新权限）
func SyncPermissions() error {
	// 定义所有权限
	permissions := []model.Permission{
		// 用户管理
		{Name: "用户列表", API: "/api/v1/users", Method: "GET", Resource: "user", Description: "查看用户列表"},
		{Name: "用户详情", API: "/api/v1/users/:id", Method: "GET", Resource: "user", Description: "查看用户详情"},
		{Name: "用户创建", API: "/api/v1/users", Method: "POST", Resource: "user", Description: "创建用户"},
		{Name: "用户更新", API: "/api/v1/users/:id", Method: "PUT", Resource: "user", Description: "更新用户信息"},
		{Name: "用户删除", API: "/api/v1/users/:id", Method: "DELETE", Resource: "user", Description: "删除用户"},
		{Name: "用户分配角色", API: "/api/v1/users/:id/roles", Method: "POST", Resource: "user", Description: "分配用户角色"},
		// 角色管理
		{Name: "角色列表", API: "/api/v1/roles", Method: "GET", Resource: "role", Description: "查看角色列表"},
		{Name: "角色详情", API: "/api/v1/roles/:id", Method: "GET", Resource: "role", Description: "查看角色详情"},
		{Name: "角色创建", API: "/api/v1/roles", Method: "POST", Resource: "role", Description: "创建角色"},
		{Name: "角色更新", API: "/api/v1/roles/:id", Method: "PUT", Resource: "role", Description: "更新角色信息"},
		{Name: "角色删除", API: "/api/v1/roles/:id", Method: "DELETE", Resource: "role", Description: "删除角色"},
		{Name: "角色分配权限", API: "/api/v1/roles/:id/permissions", Method: "POST", Resource: "role", Description: "分配角色权限"},
		{Name: "角色分配菜单", API: "/api/v1/roles/:id/menus", Method: "POST", Resource: "role", Description: "分配角色菜单"},
		// 权限管理
		{Name: "权限列表", API: "/api/v1/permissions", Method: "GET", Resource: "permission", Description: "查看权限列表"},
		{Name: "权限资源列表", API: "/api/v1/permissions/resources", Method: "GET", Resource: "permission", Description: "获取权限资源类型"},
		{Name: "权限详情", API: "/api/v1/permissions/:id", Method: "GET", Resource: "permission", Description: "查看权限详情"},
		{Name: "权限创建", API: "/api/v1/permissions", Method: "POST", Resource: "permission", Description: "创建权限"},
		{Name: "权限更新", API: "/api/v1/permissions/:id", Method: "PUT", Resource: "permission", Description: "更新权限信息"},
		{Name: "权限删除", API: "/api/v1/permissions/:id", Method: "DELETE", Resource: "permission", Description: "删除权限"},
		// 菜单管理
		{Name: "菜单列表", API: "/api/v1/menus", Method: "GET", Resource: "menu", Description: "查看菜单列表"},
		{Name: "菜单详情", API: "/api/v1/menus/:id", Method: "GET", Resource: "menu", Description: "查看菜单详情"},
		{Name: "菜单创建", API: "/api/v1/menus", Method: "POST", Resource: "menu", Description: "创建菜单"},
		{Name: "菜单更新", API: "/api/v1/menus/:id", Method: "PUT", Resource: "menu", Description: "更新菜单信息"},
		{Name: "菜单删除", API: "/api/v1/menus/:id", Method: "DELETE", Resource: "menu", Description: "删除菜单"},
		// 系统设置
		{Name: "OIDC配置查看", API: "/api/v1/system-config/oidc", Method: "GET", Resource: "system", Description: "查看OIDC配置"},
		{Name: "OIDC配置更新", API: "/api/v1/system-config/oidc", Method: "PUT", Resource: "system", Description: "更新OIDC配置"},
		{Name: "邮件配置查看", API: "/api/v1/system-config/email", Method: "GET", Resource: "system", Description: "查看邮件配置"},
		{Name: "邮件配置更新", API: "/api/v1/system-config/email", Method: "PUT", Resource: "system", Description: "更新邮件配置"},
		{Name: "邮件测试", API: "/api/v1/system-config/email/test", Method: "POST", Resource: "system", Description: "测试邮件发送"},
		// 网站管理
		{Name: "网站分类列表", API: "/api/v1/navigation-categories", Method: "GET", Resource: "navigation", Description: "查看网站分类列表"},
		{Name: "网站分类详情", API: "/api/v1/navigation-categories/:id", Method: "GET", Resource: "navigation", Description: "查看网站分类详情"},
		{Name: "网站分类创建", API: "/api/v1/navigation-categories", Method: "POST", Resource: "navigation", Description: "创建网站分类"},
		{Name: "网站分类更新", API: "/api/v1/navigation-categories/:id", Method: "PUT", Resource: "navigation", Description: "更新网站分类信息"},
		{Name: "网站分类删除", API: "/api/v1/navigation-categories/:id", Method: "DELETE", Resource: "navigation", Description: "删除网站分类"},
		{Name: "网站列表", API: "/api/v1/navigations", Method: "GET", Resource: "navigation", Description: "查看网站列表"},
		{Name: "网站详情", API: "/api/v1/navigations/:id", Method: "GET", Resource: "navigation", Description: "查看网站详情"},
		{Name: "网站创建", API: "/api/v1/navigations", Method: "POST", Resource: "navigation", Description: "创建网站"},
		{Name: "网站更新", API: "/api/v1/navigations/:id", Method: "PUT", Resource: "navigation", Description: "更新网站信息"},
		{Name: "网站删除", API: "/api/v1/navigations/:id", Method: "DELETE", Resource: "navigation", Description: "删除网站"},
		// SSO 租户管理
		{Name: "SSO租户列表", API: "/api/v1/sso/tenants", Method: "GET", Resource: "sso_tenant", Description: "查看SSO租户列表"},
		{Name: "SSO租户详情", API: "/api/v1/sso/tenants/:id", Method: "GET", Resource: "sso_tenant", Description: "查看SSO租户详情"},
		{Name: "SSO租户创建", API: "/api/v1/sso/tenants", Method: "POST", Resource: "sso_tenant", Description: "创建SSO租户"},
		{Name: "SSO租户更新", API: "/api/v1/sso/tenants/:id", Method: "PUT", Resource: "sso_tenant", Description: "更新SSO租户"},
		{Name: "SSO租户删除", API: "/api/v1/sso/tenants/:id", Method: "DELETE", Resource: "sso_tenant", Description: "删除SSO租户"},
		// SSO 用户管理
		{Name: "SSO用户列表", API: "/api/v1/sso/users", Method: "GET", Resource: "sso_user", Description: "查看SSO用户列表"},
		{Name: "SSO用户详情", API: "/api/v1/sso/users/:id", Method: "GET", Resource: "sso_user", Description: "查看SSO用户详情"},
		{Name: "SSO用户创建", API: "/api/v1/sso/users", Method: "POST", Resource: "sso_user", Description: "创建SSO用户"},
		{Name: "SSO用户更新", API: "/api/v1/sso/users/:id", Method: "PUT", Resource: "sso_user", Description: "更新SSO用户"},
		{Name: "SSO用户删除", API: "/api/v1/sso/users/:id", Method: "DELETE", Resource: "sso_user", Description: "删除SSO用户"},
		{Name: "SSO用户重置密码", API: "/api/v1/sso/users/:id/reset-password", Method: "POST", Resource: "sso_user", Description: "重置SSO用户密码"},
		{Name: "SSO用户分配组", API: "/api/v1/sso/users/:id/groups", Method: "POST", Resource: "sso_user", Description: "分配SSO用户组"},
		// SSO 用户组管理
		{Name: "SSO用户组列表", API: "/api/v1/sso/groups", Method: "GET", Resource: "sso_group", Description: "查看SSO用户组列表"},
		{Name: "SSO用户组详情", API: "/api/v1/sso/groups/:id", Method: "GET", Resource: "sso_group", Description: "查看SSO用户组详情"},
		{Name: "SSO用户组创建", API: "/api/v1/sso/groups", Method: "POST", Resource: "sso_group", Description: "创建SSO用户组"},
		{Name: "SSO用户组更新", API: "/api/v1/sso/groups/:id", Method: "PUT", Resource: "sso_group", Description: "更新SSO用户组"},
		{Name: "SSO用户组删除", API: "/api/v1/sso/groups/:id", Method: "DELETE", Resource: "sso_group", Description: "删除SSO用户组"},
		// SSO OIDC 客户端管理
		{Name: "OIDC客户端列表", API: "/api/v1/sso/clients", Method: "GET", Resource: "sso_client", Description: "查看OIDC客户端列表"},
		{Name: "OIDC客户端详情", API: "/api/v1/sso/clients/:id", Method: "GET", Resource: "sso_client", Description: "查看OIDC客户端详情"},
		{Name: "OIDC客户端创建", API: "/api/v1/sso/clients", Method: "POST", Resource: "sso_client", Description: "创建OIDC客户端"},
		{Name: "OIDC客户端更新", API: "/api/v1/sso/clients/:id", Method: "PUT", Resource: "sso_client", Description: "更新OIDC客户端"},
		{Name: "OIDC客户端删除", API: "/api/v1/sso/clients/:id", Method: "DELETE", Resource: "sso_client", Description: "删除OIDC客户端"},
	}

	// 同步权限（如果不存在则创建）
	for _, permission := range permissions {
		if err := db.FirstOrCreate(&permission, model.Permission{API: permission.API, Method: permission.Method}).Error; err != nil {
			return err
		}
	}

	// 将所有权限分配给超级管理员角色
	var superAdminRole model.Role
	if err := db.Where("name = ?", "admin").First(&superAdminRole).Error; err != nil {
		// 超级管理员角色不存在，跳过
		return nil
	}

	var allPermissions []model.Permission
	if err := db.Find(&allPermissions).Error; err != nil {
		return err
	}

	return db.Model(&superAdminRole).Association("Permissions").Replace(allPermissions)
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
	// 创建 SSO 管理菜单
	ssoMenu := model.Menu{
		Name:      "SSO 管理",
		Path:      "/sso",
		Icon:      "KeyOutlined",
		Component: "",
		Sort:      3,
		Status:    1,
	}
	if err := db.Where("path = ?", "/sso").FirstOrCreate(&ssoMenu).Error; err != nil {
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
		if err := db.Where("path = ?", ssoSubMenus[i].Path).FirstOrCreate(&ssoSubMenus[i]).Error; err != nil {
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
