package response

// LoginResponse 登录响应
type LoginResponse struct {
	Token string       `json:"token"`
	User  UserInfoBrief `json:"user"`
}

// UserInfoBrief 用户简要信息
type UserInfoBrief struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
}

// UserInfoResponse 用户详细信息响应
type UserInfoResponse struct {
	ID       uint        `json:"id"`
	Username string      `json:"username"`
	Email    string      `json:"email"`
	Avatar   string      `json:"avatar"`
	Phone    string      `json:"phone"`
	Status   int         `json:"status"`
	Roles    []RoleInfo  `json:"roles"`
}

// RoleInfo 角色信息
type RoleInfo struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}
