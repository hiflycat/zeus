package request

// ListUserRequest 用户列表请求
type ListUserRequest struct {
	PageRequest
	Keyword string `form:"keyword"`
}

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	Email    string `json:"email" binding:"required,email"`
	Phone    string `json:"phone"`
	Status   int    `json:"status"`
	RoleIDs  []uint `json:"role_ids"`
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email" binding:"omitempty,email"`
	Phone    string `json:"phone"`
	Status   int    `json:"status"`
	RoleIDs  []uint `json:"role_ids"`
}

// AssignRolesRequest 分配角色请求
type AssignRolesRequest struct {
	RoleIDs []uint `json:"role_ids" binding:"required"`
}
