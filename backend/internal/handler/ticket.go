package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/service"
	"backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type TicketHandler struct {
	svc *service.TicketService
}

func NewTicketHandler() *TicketHandler {
	return &TicketHandler{svc: service.NewTicketService()}
}

func (h *TicketHandler) Create(c *gin.Context) {
	var req model.Ticket
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("userID")
	req.CreatorID = userID.(uint)
	req.Status = model.TicketStatusDraft

	if err := h.svc.Create(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, req)
}

func (h *TicketHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req model.Ticket
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

func (h *TicketHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.Delete(uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *TicketHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	ticket, err := h.svc.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "工单不存在")
		return
	}
	response.Success(c, ticket)
}

func (h *TicketHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	keyword := c.Query("keyword")
	status := c.Query("status")
	typeID, _ := strconv.ParseUint(c.Query("type_id"), 10, 32)
	creatorID, _ := strconv.ParseUint(c.Query("creator_id"), 10, 32)

	tickets, total, err := h.svc.List(page, pageSize, keyword, status, uint(typeID), uint(creatorID))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"list": tickets, "total": total, "page": page, "page_size": pageSize})
}

func (h *TicketHandler) Submit(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.Submit(uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *TicketHandler) Approve(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req struct {
		Approved bool   `json:"approved"`
		Comment  string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("userID")
	if err := h.svc.Approve(uint(id), userID.(uint), req.Approved, req.Comment); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *TicketHandler) Complete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.Complete(uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *TicketHandler) Cancel(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.Cancel(uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *TicketHandler) GetMyTickets(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	userID, _ := c.Get("userID")

	tickets, total, err := h.svc.GetMyTickets(userID.(uint), page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"list": tickets, "total": total, "page": page, "page_size": pageSize})
}

func (h *TicketHandler) GetPendingApprovals(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	userID, _ := c.Get("userID")

	tickets, total, err := h.svc.GetPendingApprovals(userID.(uint), page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"list": tickets, "total": total, "page": page, "page_size": pageSize})
}
