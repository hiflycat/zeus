package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"backend/internal/model"
	"backend/internal/service"
	"backend/pkg/response"
)

// UserHandler 用户处理器
type UserHandler struct {
	userService *service.UserService
}

// NewUserHandler 创建用户处理器
func NewUserHandler() *UserHandler {
	return &UserHandler{
		userService: service.NewUserService(),
	}
}

// Create 创建用户
func (h *UserHandler) Create(c *gin.Context) {
	// 使用 map 来接收 JSON，因为需要单独处理 role_ids
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 构建 User 对象
	var user model.User
	if username, ok := req["username"].(string); ok {
		user.Username = username
	}
	if email, ok := req["email"].(string); ok {
		user.Email = email
	}
	if phone, ok := req["phone"].(string); ok {
		user.Phone = phone
	}
	if password, ok := req["password"].(string); ok {
		user.Password = password
	}
	if status, ok := req["status"].(float64); ok {
		user.Status = int(status)
	}

	// 创建用户
	if err := h.userService.Create(&user); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 处理角色分配（如果提供了 role_ids）
	if roleIDsInterface, ok := req["role_ids"].([]interface{}); ok && len(roleIDsInterface) > 0 {
		var roleIDs []uint
		for _, id := range roleIDsInterface {
			if idFloat, ok := id.(float64); ok {
				roleIDs = append(roleIDs, uint(idFloat))
			}
		}
		if len(roleIDs) > 0 {
			if err := h.userService.AssignRoles(user.ID, roleIDs); err != nil {
				response.BadRequest(c, "用户创建成功，但角色分配失败: "+err.Error())
				return
			}
		}
	}

	// 重新加载用户信息（包含角色）
	userWithRoles, err := h.userService.GetByID(user.ID)
	if err != nil {
		response.Success(c, user)
		return
	}

	response.Success(c, userWithRoles)
}

// Update 更新用户
func (h *UserHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID := uint(id)

	// 使用 map 来接收 JSON，因为 Password 字段有 json:"-" 标签
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 构建 User 对象，单独处理密码字段
	var user model.User

	// 处理用户名
	if username, ok := req["username"].(string); ok {
		user.Username = username
	}

	// 处理邮箱
	if email, ok := req["email"].(string); ok {
		user.Email = email
	}

	// 处理手机号
	if phone, ok := req["phone"].(string); ok {
		user.Phone = phone
	}

	// 处理状态
	if status, ok := req["status"].(float64); ok {
		user.Status = int(status)
	}

	// 处理密码（如果提供了）
	if password, ok := req["password"].(string); ok && password != "" {
		user.Password = password
	}

	// 更新用户基本信息
	if err := h.userService.Update(userID, &user); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 处理角色分配（如果提供了 role_ids）
	if roleIDsInterface, ok := req["role_ids"].([]interface{}); ok {
		var roleIDs []uint
		for _, id := range roleIDsInterface {
			if idFloat, ok := id.(float64); ok {
				roleIDs = append(roleIDs, uint(idFloat))
			}
		}
		// 即使 role_ids 为空数组，也执行分配（清空角色）
		if err := h.userService.AssignRoles(userID, roleIDs); err != nil {
			response.BadRequest(c, "用户更新成功，但角色分配失败: "+err.Error())
			return
		}
	}

	// 重新加载用户信息（包含角色）
	userWithRoles, err := h.userService.GetByID(userID)
	if err != nil {
		response.Success(c, nil)
		return
	}

	response.Success(c, userWithRoles)
}

// Delete 删除用户
func (h *UserHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID := uint(id)

	if err := h.userService.Delete(userID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetByID 根据 ID 获取用户
func (h *UserHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID := uint(id)

	user, err := h.userService.GetByID(userID)
	if err != nil {
		response.NotFound(c, "用户不存在")
		return
	}

	response.Success(c, user)
}

// List 获取用户列表
func (h *UserHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	keyword := c.Query("keyword")

	users, total, err := h.userService.List(page, pageSize, keyword)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"list":      users,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// AssignRoles 分配角色
func (h *UserHandler) AssignRoles(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID := uint(id)

	var req struct {
		RoleIDs []uint `json:"role_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.userService.AssignRoles(userID, req.RoleIDs); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}
