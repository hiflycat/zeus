package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/service"
	"backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type FormTemplateHandler struct {
	svc *service.FormTemplateService
}

func NewFormTemplateHandler() *FormTemplateHandler {
	return &FormTemplateHandler{svc: service.NewFormTemplateService()}
}

func (h *FormTemplateHandler) Create(c *gin.Context) {
	var req model.FormTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.svc.Create(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, req)
}

func (h *FormTemplateHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req model.FormTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.svc.Update(uint(id), &req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *FormTemplateHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.Delete(uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *FormTemplateHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	t, err := h.svc.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "表单模板不存在")
		return
	}
	response.Success(c, t)
}

func (h *FormTemplateHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	keyword := c.Query("keyword")
	templates, total, err := h.svc.List(page, pageSize, keyword)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"list": templates, "total": total, "page": page, "page_size": pageSize})
}

func (h *FormTemplateHandler) ListEnabled(c *gin.Context) {
	templates, err := h.svc.ListEnabled()
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, templates)
}

func (h *FormTemplateHandler) GetFields(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	fields, err := h.svc.GetFields(uint(id))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, fields)
}

func (h *FormTemplateHandler) SaveFields(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var fields []model.FormField
	if err := c.ShouldBindJSON(&fields); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.svc.SaveFields(uint(id), fields); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}
