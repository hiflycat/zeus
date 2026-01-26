package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/model/request"
	"backend/internal/service"
	"backend/internal/model/response"

	"github.com/gin-gonic/gin"
)

// RoleHandler 角色处理器
type RoleHandler struct {
	roleService *service.RoleService
}

// NewRoleHandler 创建角色处理器
func NewRoleHandler() *RoleHandler {
	return &RoleHandler{
		roleService: service.NewRoleService(),
	}
}

// Create 创建角色
func (h *RoleHandler) Create(c *gin.Context) {
	var role model.Role
	if err := c.ShouldBindJSON(&role); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.roleService.Create(&role); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, role)
}

// Update 更新角色
func (h *RoleHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	roleID := uint(id)

	var role model.Role
	if err := c.ShouldBindJSON(&role); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.roleService.Update(roleID, &role); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Delete 删除角色
func (h *RoleHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	roleID := uint(id)

	if err := h.roleService.Delete(roleID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetByID 根据 ID 获取角色
func (h *RoleHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	roleID := uint(id)

	role, err := h.roleService.GetByID(roleID)
	if err != nil {
		response.NotFound(c, "角色不存在")
		return
	}

	response.Success(c, role)
}

// List 获取角色列表
func (h *RoleHandler) List(c *gin.Context) {
	var req request.ListRoleRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	roles, total, err := h.roleService.List(req.GetPage(), req.GetPageSize(), req.Keyword)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, response.NewPageResponse(roles, total, req.GetPage(), req.GetPageSize()))
}

// AssignPolicies 分配 API 权限
func (h *RoleHandler) AssignPolicies(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	roleID := uint(id)

	var req request.AssignPoliciesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.roleService.AssignPolicies(roleID, req.APIDefIDs); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetPolicies 获取角色的 API 权限
func (h *RoleHandler) GetPolicies(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	roleID := uint(id)

	apiDefIDs, err := h.roleService.GetPolicies(roleID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, apiDefIDs)
}

// AssignMenus 分配菜单
func (h *RoleHandler) AssignMenus(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	roleID := uint(id)

	var req request.AssignMenusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.roleService.AssignMenus(roleID, req.MenuIDs); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}
