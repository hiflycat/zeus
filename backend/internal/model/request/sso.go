package request

// ListTenantRequest 租户列表请求
type ListTenantRequest struct {
	PageRequest
	Name string `form:"name"`
}

// ListSSOUserRequest SSO 用户列表请求
type ListSSOUserRequest struct {
	PageRequest
	TenantID uint   `form:"tenant_id"`
	Username string `form:"username"`
}

// CreateSSOUserRequest 创建 SSO 用户请求
type CreateSSOUserRequest struct {
	TenantID    uint   `json:"tenant_id" binding:"required"`
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password" binding:"required,min=6"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Phone       string `json:"phone"`
	Status      int    `json:"status"`
	GroupIDs    []uint `json:"group_ids"`
}

// UpdateSSOUserRequest 更新 SSO 用户请求
type UpdateSSOUserRequest struct {
	Username    string `json:"username"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Phone       string `json:"phone"`
	Status      int    `json:"status"`
	GroupIDs    []uint `json:"group_ids"`
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
}

// AssignGroupsRequest 分配用户组请求
type AssignGroupsRequest struct {
	GroupIDs []uint `json:"group_ids"`
}

// ListGroupRequest 用户组列表请求
type ListGroupRequest struct {
	PageRequest
	TenantID uint `form:"tenant_id"`
}

// ListOIDCClientRequest OIDC 客户端列表请求
type ListOIDCClientRequest struct {
	PageRequest
	TenantID uint `form:"tenant_id"`
}
