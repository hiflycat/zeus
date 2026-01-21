package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/service"
	"backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type TemplateHandler struct {
	svc *service.TemplateService
}

func NewTemplateHandler() *TemplateHandler {
	return &TemplateHandler{svc: service.NewTemplateService()}
}

func (h *TemplateHandler) Create(c *gin.Context) {
	var req model.TicketTemplate
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

func (h *TemplateHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req model.TicketTemplate
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

func (h *TemplateHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.Delete(uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *TemplateHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	t, err := h.svc.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "模板不存在")
		return
	}
	response.Success(c, t)
}

func (h *TemplateHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	keyword := c.Query("keyword")
	typeID, _ := strconv.ParseUint(c.Query("type_id"), 10, 32)
	templates, total, err := h.svc.List(page, pageSize, keyword, uint(typeID))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"list": templates, "total": total, "page": page, "page_size": pageSize})
}

func (h *TemplateHandler) ListEnabled(c *gin.Context) {
	typeID, _ := strconv.ParseUint(c.Query("type_id"), 10, 32)
	templates, err := h.svc.ListEnabled(uint(typeID))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, templates)
}
