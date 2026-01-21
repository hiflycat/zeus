package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/service"
	"backend/migrations"
	"backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type TicketHandler struct {
	svc *service.TicketService
}

func NewTicketHandler() *TicketHandler {
	return &TicketHandler{svc: service.NewTicketService()}
}

func isAdminUser(userID uint) bool {
	var user model.User
	if err := migrations.GetDB().Preload("Roles").Where("id = ?", userID).First(&user).Error; err != nil {
		return false
	}
	for _, role := range user.Roles {
		if role.Name == "admin" {
			return true
		}
	}
	return false
}

func (h *TicketHandler) Create(c *gin.Context) {
	var req struct {
		model.Ticket
		FormData map[string]interface{} `json:"form_data"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("user_id")
	req.CreatorID = userID.(uint)
	req.Status = model.TicketStatusDraft

	if err := h.svc.CreateWithFormData(&req.Ticket, req.FormData); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, req.Ticket)
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
	userID, _ := c.Get("user_id")
	isAdmin := isAdminUser(userID.(uint))
	if err := h.svc.Delete(uint(id), userID.(uint), isAdmin); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *TicketHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	ticket, err := h.svc.GetByIDWithDetails(uint(id))
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

	userID, _ := c.Get("user_id")
	var user model.User
	isAdmin := false
	if userID != nil {
		isAdmin = isAdminUser(userID.(uint))
		if !isAdmin {
			_ = migrations.GetDB().Where("id = ?", userID).First(&user).Error
		}
	}

	var (
		tickets []model.Ticket
		total   int64
		err     error
	)
	if isAdmin {
		tickets, total, err = h.svc.List(page, pageSize, keyword, status, uint(typeID), uint(creatorID))
	} else {
		tickets, total, err = h.svc.ListForUser(user.ID, page, pageSize, keyword, status, uint(typeID))
	}
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
	userID, _ := c.Get("user_id")
	isAdmin := isAdminUser(userID.(uint))

	// 检查用户是否有审批权限
	if !isAdmin {
		canApprove, err := h.svc.CanUserApprove(uint(id), userID.(uint))
		if err != nil {
			response.BadRequest(c, err.Error())
			return
		}
		if !canApprove {
			response.Forbidden(c, "您没有审批此工单的权限")
			return
		}
	}

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
	userID, _ := c.Get("user_id")

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
	userID, _ := c.Get("user_id")

	tickets, total, err := h.svc.GetPendingApprovals(userID.(uint), page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"list": tickets, "total": total, "page": page, "page_size": pageSize})
}

// GetProcessedTickets 获取我处理过的工单
func (h *TicketHandler) GetProcessedTickets(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	userID, _ := c.Get("user_id")

	tickets, total, err := h.svc.GetProcessedTickets(userID.(uint), page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"list": tickets, "total": total, "page": page, "page_size": pageSize})
}

// GetCCTickets 获取抄送我的工单
func (h *TicketHandler) GetCCTickets(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	userID, _ := c.Get("user_id")

	tickets, total, err := h.svc.GetCCTickets(userID.(uint), page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"list": tickets, "total": total, "page": page, "page_size": pageSize})
}

// Withdraw 撤回工单
func (h *TicketHandler) Withdraw(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID, _ := c.Get("user_id")
	if err := h.svc.Withdraw(uint(id), userID.(uint)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// Urge 催办工单
func (h *TicketHandler) Urge(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID, _ := c.Get("user_id")
	if err := h.svc.Urge(uint(id), userID.(uint)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// Transfer 转交工单
func (h *TicketHandler) Transfer(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req struct {
		TargetUserID uint `json:"target_user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("user_id")
	if err := h.svc.Transfer(uint(id), userID.(uint), req.TargetUserID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// Return 退回工单
func (h *TicketHandler) Return(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req struct {
		Comment   string `json:"comment"`
		ToCreator bool   `json:"to_creator"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("user_id")

	// 检查用户是否有审批权限
	canApprove, err := h.svc.CanUserApprove(uint(id), userID.(uint))
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if !canApprove {
		response.Forbidden(c, "您没有退回此工单的权限")
		return
	}

	if err := h.svc.Return(uint(id), userID.(uint), req.Comment, req.ToCreator); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// Delegate 转审工单
func (h *TicketHandler) Delegate(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req struct {
		TargetUserID uint   `json:"target_user_id" binding:"required"`
		Comment      string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("user_id")

	// 检查用户是否有审批权限
	canApprove, err := h.svc.CanUserApprove(uint(id), userID.(uint))
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if !canApprove {
		response.Forbidden(c, "您没有转审此工单的权限")
		return
	}

	if err := h.svc.Delegate(uint(id), userID.(uint), req.TargetUserID, req.Comment); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// AddSign 加签
func (h *TicketHandler) AddSign(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req struct {
		TargetUserID uint   `json:"target_user_id" binding:"required"`
		Comment      string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("user_id")

	// 检查用户是否有审批权限
	canApprove, err := h.svc.CanUserApprove(uint(id), userID.(uint))
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if !canApprove {
		response.Forbidden(c, "您没有加签此工单的权限")
		return
	}

	if err := h.svc.AddSign(uint(id), userID.(uint), req.TargetUserID, req.Comment); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// GetApprovalRecords 获取工单的审批记录
func (h *TicketHandler) GetApprovalRecords(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	records, err := h.svc.GetApprovalRecords(uint(id))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, records)
}

// CanApprove 检查当前用户是否可以审批
func (h *TicketHandler) CanApprove(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID, _ := c.Get("user_id")

	canApprove, err := h.svc.CanUserApprove(uint(id), userID.(uint))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"can_approve": canApprove})
}
