package sso

import (
	"strconv"

	"backend/internal/model/sso"
	ssoService "backend/internal/service/sso"
	"backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// TenantHandler 租户管理处理器
type TenantHandler struct {
	service *ssoService.TenantService
}

// NewTenantHandler 创建租户处理器
func NewTenantHandler() *TenantHandler {
	return &TenantHandler{service: ssoService.NewTenantService()}
}

// List 获取租户列表
func (h *TenantHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	name := c.Query("name")

	tenants, total, err := h.service.List(page, pageSize, name)
	if err != nil {
		response.Error(c, 500, err.Error())
		return
	}

	response.Success(c, gin.H{"list": tenants, "total": total})
}

// GetByID 获取租户详情
func (h *TenantHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	tenant, err := h.service.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "租户不存在")
		return
	}
	response.Success(c, tenant)
}

// Create 创建租户
func (h *TenantHandler) Create(c *gin.Context) {
	var tenant sso.Tenant
	if err := c.ShouldBindJSON(&tenant); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.service.Create(&tenant); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, tenant)
}

// Update 更新租户
func (h *TenantHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var tenant sso.Tenant
	if err := c.ShouldBindJSON(&tenant); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	tenant.ID = uint(id)
	if err := h.service.Update(&tenant); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, tenant)
}

// Delete 删除租户
func (h *TenantHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.service.Delete(uint(id)); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, nil)
}

// UserHandler SSO 用户管理处理器
type UserHandler struct {
	service *ssoService.UserService
}

// NewUserHandler 创建用户处理器
func NewUserHandler() *UserHandler {
	return &UserHandler{service: ssoService.NewUserService()}
}

// List 获取用户列表
func (h *UserHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	tenantID, _ := strconv.ParseUint(c.Query("tenant_id"), 10, 32)
	username := c.Query("username")

	users, total, err := h.service.List(uint(tenantID), page, pageSize, username)
	if err != nil {
		response.Error(c, 500, err.Error())
		return
	}

	response.Success(c, gin.H{"list": users, "total": total})
}

// GetByID 获取用户详情
func (h *UserHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	user, err := h.service.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "用户不存在")
		return
	}
	response.Success(c, user)
}

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	TenantID    uint   `json:"tenant_id" binding:"required"`
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password" binding:"required,min=6"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Phone       string `json:"phone"`
	Status      int    `json:"status"`
	GroupIDs    []uint `json:"group_ids"`
}

// Create 创建用户
func (h *UserHandler) Create(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user := &sso.User{
		TenantID:    req.TenantID,
		Username:    req.Username,
		Password:    req.Password,
		Email:       req.Email,
		DisplayName: req.DisplayName,
		Phone:       req.Phone,
		Status:      req.Status,
	}

	if err := h.service.Create(user); err != nil {
		response.Error(c, 500, err.Error())
		return
	}

	// 分配用户组
	if len(req.GroupIDs) > 0 {
		if err := h.service.AssignGroups(user.ID, req.GroupIDs); err != nil {
			response.Error(c, 500, err.Error())
			return
		}
	}

	response.Success(c, user)
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Username    string `json:"username"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Phone       string `json:"phone"`
	Status      int    `json:"status"`
	GroupIDs    []uint `json:"group_ids"`
}

// Update 更新用户
func (h *UserHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user := &sso.User{
		Username:    req.Username,
		Email:       req.Email,
		DisplayName: req.DisplayName,
		Phone:       req.Phone,
		Status:      req.Status,
	}
	user.ID = uint(id)

	if err := h.service.Update(user); err != nil {
		response.Error(c, 500, err.Error())
		return
	}

	// 更新用户组
	if err := h.service.AssignGroups(uint(id), req.GroupIDs); err != nil {
		response.Error(c, 500, err.Error())
		return
	}

	response.Success(c, user)
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
}

// ResetPassword 重置密码
func (h *UserHandler) ResetPassword(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.service.UpdatePassword(uint(id), req.Password); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, nil)
}

// Delete 删除用户
func (h *UserHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.service.Delete(uint(id)); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, nil)
}

// AssignGroupsRequest 分配用户组请求
type AssignGroupsRequest struct {
	GroupIDs []uint `json:"group_ids"`
}

// AssignGroups 分配用户组
func (h *UserHandler) AssignGroups(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req AssignGroupsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.service.AssignGroups(uint(id), req.GroupIDs); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, nil)
}

// GroupHandler 用户组管理处理器
type GroupHandler struct {
	service *ssoService.GroupService
}

// NewGroupHandler 创建用户组处理器
func NewGroupHandler() *GroupHandler {
	return &GroupHandler{service: ssoService.NewGroupService()}
}

// List 获取用户组列表
func (h *GroupHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	tenantID, _ := strconv.ParseUint(c.Query("tenant_id"), 10, 32)

	groups, total, err := h.service.List(uint(tenantID), page, pageSize)
	if err != nil {
		response.Error(c, 500, err.Error())
		return
	}

	response.Success(c, gin.H{"list": groups, "total": total})
}

// ListActive 获取启用的用户组（用于下拉选择）
func (h *GroupHandler) ListActive(c *gin.Context) {
	tenantID, _ := strconv.ParseUint(c.Query("tenant_id"), 10, 32)

	groups, err := h.service.ListActive(uint(tenantID))
	if err != nil {
		response.Error(c, 500, err.Error())
		return
	}

	response.Success(c, groups)
}

// GetByID 获取用户组详情
func (h *GroupHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	group, err := h.service.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "用户组不存在")
		return
	}
	response.Success(c, group)
}

// Create 创建用户组
func (h *GroupHandler) Create(c *gin.Context) {
	var group sso.Group
	if err := c.ShouldBindJSON(&group); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.service.Create(&group); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, group)
}

// Update 更新用户组
func (h *GroupHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var group sso.Group
	if err := c.ShouldBindJSON(&group); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	group.ID = uint(id)
	if err := h.service.Update(&group); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, group)
}

// Delete 删除用户组
func (h *GroupHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.service.Delete(uint(id)); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, nil)
}

// OIDCClientHandler OIDC 客户端管理处理器
type OIDCClientHandler struct {
	service *ssoService.OIDCClientService
}

// NewOIDCClientHandler 创建 OIDC 客户端处理器
func NewOIDCClientHandler() *OIDCClientHandler {
	return &OIDCClientHandler{service: ssoService.NewOIDCClientService()}
}

// List 获取客户端列表
func (h *OIDCClientHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	tenantID, _ := strconv.ParseUint(c.Query("tenant_id"), 10, 32)

	clients, total, err := h.service.List(uint(tenantID), page, pageSize)
	if err != nil {
		response.Error(c, 500, err.Error())
		return
	}

	response.Success(c, gin.H{"list": clients, "total": total})
}

// GetByID 获取客户端详情
func (h *OIDCClientHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	client, err := h.service.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "客户端不存在")
		return
	}
	response.Success(c, client)
}

// Create 创建客户端
func (h *OIDCClientHandler) Create(c *gin.Context) {
	var client sso.OIDCClient
	if err := c.ShouldBindJSON(&client); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if client.ClientID == "" {
		response.BadRequest(c, "client_id 不能为空")
		return
	}
	if client.ClientSecret == "" {
		response.BadRequest(c, "client_secret 不能为空")
		return
	}

	if err := h.service.Create(&client); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, client)
}

// Update 更新客户端
func (h *OIDCClientHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var client sso.OIDCClient
	if err := c.ShouldBindJSON(&client); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	client.ID = uint(id)
	if err := h.service.Update(&client); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, client)
}

// Delete 删除客户端
func (h *OIDCClientHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.service.Delete(uint(id)); err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, nil)
}
