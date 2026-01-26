package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/model/request"
	"backend/internal/service"
	"backend/internal/model/response"

	"github.com/gin-gonic/gin"
)

type TicketTypeHandler struct {
	svc *service.TicketTypeService
}

func NewTicketTypeHandler() *TicketTypeHandler {
	return &TicketTypeHandler{svc: service.NewTicketTypeService()}
}

func (h *TicketTypeHandler) Create(c *gin.Context) {
	var req model.TicketType
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

func (h *TicketTypeHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req model.TicketType
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

func (h *TicketTypeHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.Delete(uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *TicketTypeHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	t, err := h.svc.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "工单类型不存在")
		return
	}
	response.Success(c, t)
}

func (h *TicketTypeHandler) List(c *gin.Context) {
	var req request.ListTicketTypeRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	types, total, err := h.svc.List(req.GetPage(), req.GetPageSize(), req.Keyword)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, response.NewPageResponse(types, total, req.GetPage(), req.GetPageSize()))
}

func (h *TicketTypeHandler) ListEnabled(c *gin.Context) {
	types, err := h.svc.ListEnabled()
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, types)
}
