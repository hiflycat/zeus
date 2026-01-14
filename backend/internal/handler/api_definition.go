package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/service"
	"backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// APIDefinitionHandler API 定义处理器
type APIDefinitionHandler struct {
	apiDefService *service.APIDefinitionService
}

// NewAPIDefinitionHandler 创建 API 定义处理器
func NewAPIDefinitionHandler() *APIDefinitionHandler {
	return &APIDefinitionHandler{
		apiDefService: service.NewAPIDefinitionService(),
	}
}

// Create 创建 API 定义
func (h *APIDefinitionHandler) Create(c *gin.Context) {
	var apiDef model.APIDefinition
	if err := c.ShouldBindJSON(&apiDef); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.apiDefService.Create(&apiDef); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, apiDef)
}

// Update 更新 API 定义
func (h *APIDefinitionHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)

	var apiDef model.APIDefinition
	if err := c.ShouldBindJSON(&apiDef); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.apiDefService.Update(uint(id), &apiDef); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Delete 删除 API 定义
func (h *APIDefinitionHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)

	if err := h.apiDefService.Delete(uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetByID 根据 ID 获取 API 定义
func (h *APIDefinitionHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)

	apiDef, err := h.apiDefService.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "API 定义不存在")
		return
	}

	response.Success(c, apiDef)
}

// List 获取 API 定义列表
func (h *APIDefinitionHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	keyword := c.Query("keyword")
	resource := c.Query("resource")

	apiDefs, total, err := h.apiDefService.List(page, pageSize, keyword, resource)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"list":      apiDefs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetResources 获取所有资源类型
func (h *APIDefinitionHandler) GetResources(c *gin.Context) {
	resources, err := h.apiDefService.GetResources()
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, resources)
}

// GetAll 获取所有 API 定义（用于角色分配）
func (h *APIDefinitionHandler) GetAll(c *gin.Context) {
	apiDefs, err := h.apiDefService.GetAll()
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, apiDefs)
}
