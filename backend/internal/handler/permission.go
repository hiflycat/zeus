package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"backend/internal/model"
	"backend/internal/service"
	"backend/pkg/response"
)

// PermissionHandler 权限处理器
type PermissionHandler struct {
	permissionService *service.PermissionService
}

// NewPermissionHandler 创建权限处理器
func NewPermissionHandler() *PermissionHandler {
	return &PermissionHandler{
		permissionService: service.NewPermissionService(),
	}
}

// Create 创建权限
func (h *PermissionHandler) Create(c *gin.Context) {
	var permission model.Permission
	if err := c.ShouldBindJSON(&permission); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.permissionService.Create(&permission); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, permission)
}

// Update 更新权限
func (h *PermissionHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	permissionID := uint(id)

	var permission model.Permission
	if err := c.ShouldBindJSON(&permission); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.permissionService.Update(permissionID, &permission); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Delete 删除权限
func (h *PermissionHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	permissionID := uint(id)

	if err := h.permissionService.Delete(permissionID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetByID 根据 ID 获取权限
func (h *PermissionHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	permissionID := uint(id)

	permission, err := h.permissionService.GetByID(permissionID)
	if err != nil {
		response.NotFound(c, "权限不存在")
		return
	}

	response.Success(c, permission)
}

// List 获取权限列表
func (h *PermissionHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	keyword := c.Query("keyword")
	resource := c.Query("resource")

	permissions, total, err := h.permissionService.List(page, pageSize, keyword, resource)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"list":      permissions,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetResources 获取所有资源类型
func (h *PermissionHandler) GetResources(c *gin.Context) {
	resources, err := h.permissionService.GetResources()
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, resources)
}
