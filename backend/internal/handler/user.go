package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/model/request"
	"backend/internal/service"
	"backend/internal/model/response"

	"github.com/gin-gonic/gin"
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
	var req request.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 构建 User 对象
	user := model.User{
		Username: req.Username,
		Email:    req.Email,
		Phone:    req.Phone,
		Password: req.Password,
		Status:   req.Status,
	}

	// 创建用户
	if err := h.userService.Create(&user); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 处理角色分配（如果提供了 role_ids）
	if len(req.RoleIDs) > 0 {
		if err := h.userService.AssignRoles(user.ID, req.RoleIDs); err != nil {
			response.BadRequest(c, "用户创建成功，但角色分配失败: "+err.Error())
			return
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

	var req request.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 构建 User 对象
	user := model.User{
		Username: req.Username,
		Email:    req.Email,
		Phone:    req.Phone,
		Status:   req.Status,
		Password: req.Password,
	}

	// 更新用户基本信息
	if err := h.userService.Update(userID, &user); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 处理角色分配（如果提供了 role_ids）
	if req.RoleIDs != nil {
		if err := h.userService.AssignRoles(userID, req.RoleIDs); err != nil {
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
	var req request.ListUserRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	users, total, err := h.userService.List(req.GetPage(), req.GetPageSize(), req.Keyword)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, response.NewPageResponse(users, total, req.GetPage(), req.GetPageSize()))
}

// AssignRoles 分配角色
func (h *UserHandler) AssignRoles(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID := uint(id)

	var req request.AssignRolesRequest
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
