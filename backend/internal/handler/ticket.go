package handler

import (
	"strconv"

	"backend/internal/global"
	"backend/internal/model"
	"backend/internal/model/request"
	"backend/internal/model/response"
	"backend/internal/service"

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
	if err := global.GetDB().Preload("Roles").Where("id = ?", userID).First(&user).Error; err != nil {
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
	var req request.CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("user_id")

	ticket := model.Ticket{
		Title:       req.Title,
		Description: req.Description,
		TypeID:      req.TypeID,
		Priority:    req.Priority,
		CreatorID:   userID.(uint),
		Status:      model.TicketStatusDraft,
	}

	if err := h.svc.CreateWithFormData(&ticket, req.FormData); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, ticket)
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
	var req request.ListTicketRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	var user model.User
	isAdmin := false
	if userID != nil {
		isAdmin = isAdminUser(userID.(uint))
		if !isAdmin {
			_ = global.GetDB().Where("id = ?", userID).First(&user).Error
		}
	}

	var (
		tickets []model.Ticket
		total   int64
		err     error
	)
	if isAdmin {
		tickets, total, err = h.svc.List(req.GetPage(), req.GetPageSize(), req.Keyword, req.Status, req.TypeID, req.CreatorID)
	} else {
		tickets, total, err = h.svc.ListForUser(user.ID, req.GetPage(), req.GetPageSize(), req.Keyword, req.Status, req.TypeID)
	}
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, response.NewPageResponse(tickets, total, req.GetPage(), req.GetPageSize()))
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
	var req request.ApproveRequest
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
	var req request.PageRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("user_id")

	tickets, total, err := h.svc.GetMyTickets(userID.(uint), req.GetPage(), req.GetPageSize())
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, response.NewPageResponse(tickets, total, req.GetPage(), req.GetPageSize()))
}

func (h *TicketHandler) GetPendingApprovals(c *gin.Context) {
	var req request.PageRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("user_id")

	tickets, total, err := h.svc.GetPendingApprovals(userID.(uint), req.GetPage(), req.GetPageSize())
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, response.NewPageResponse(tickets, total, req.GetPage(), req.GetPageSize()))
}

// GetProcessedTickets 获取我处理过的工单
func (h *TicketHandler) GetProcessedTickets(c *gin.Context) {
	var req request.PageRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("user_id")

	tickets, total, err := h.svc.GetProcessedTickets(userID.(uint), req.GetPage(), req.GetPageSize())
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, response.NewPageResponse(tickets, total, req.GetPage(), req.GetPageSize()))
}

// GetCCTickets 获取抄送我的工单
func (h *TicketHandler) GetCCTickets(c *gin.Context) {
	var req request.PageRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	userID, _ := c.Get("user_id")

	tickets, total, err := h.svc.GetCCTickets(userID.(uint), req.GetPage(), req.GetPageSize())
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, response.NewPageResponse(tickets, total, req.GetPage(), req.GetPageSize()))
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
	var req request.TransferRequest
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
	var req request.ReturnRequest
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
	var req request.DelegateRequest
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
	var req request.AddSignRequest
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
