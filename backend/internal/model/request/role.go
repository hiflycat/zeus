package request

// ListRoleRequest 角色列表请求
type ListRoleRequest struct {
	PageRequest
	Keyword string `form:"keyword"`
}

// AssignPoliciesRequest 分配 API 权限请求
type AssignPoliciesRequest struct {
	APIDefIDs []uint `json:"api_def_ids"`
}

// AssignMenusRequest 分配菜单请求
type AssignMenusRequest struct {
	MenuIDs []uint `json:"menu_ids" binding:"required"`
}
