package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/service"
	"backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type ApprovalFlowHandler struct {
	svc *service.ApprovalFlowService
}

func NewApprovalFlowHandler() *ApprovalFlowHandler {
	return &ApprovalFlowHandler{svc: service.NewApprovalFlowService()}
}

func (h *ApprovalFlowHandler) CreateFlow(c *gin.Context) {
	var req model.ApprovalFlow
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.svc.CreateFlow(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, req)
}

func (h *ApprovalFlowHandler) UpdateFlow(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req model.ApprovalFlow
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.svc.UpdateFlow(uint(id), &req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *ApprovalFlowHandler) DeleteFlow(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.DeleteFlow(uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *ApprovalFlowHandler) GetFlowByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	flow, err := h.svc.GetFlowByID(uint(id))
	if err != nil {
		response.NotFound(c, "审批流程不存在")
		return
	}
	response.Success(c, flow)
}

func (h *ApprovalFlowHandler) GetFlowByTypeID(c *gin.Context) {
	typeID, _ := strconv.ParseUint(c.Param("type_id"), 10, 32)
	flow, err := h.svc.GetFlowByTypeID(uint(typeID))
	if err != nil {
		response.NotFound(c, "该工单类型没有配置审批流程")
		return
	}
	response.Success(c, flow)
}

func (h *ApprovalFlowHandler) ListFlows(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	flows, total, err := h.svc.ListFlows(page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"list": flows, "total": total, "page": page, "page_size": pageSize})
}

func (h *ApprovalFlowHandler) GetNodes(c *gin.Context) {
	flowID, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	nodes, err := h.svc.GetNodesByFlowID(uint(flowID))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, nodes)
}

func (h *ApprovalFlowHandler) SaveNodes(c *gin.Context) {
	flowID, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var nodes []model.ApprovalNode
	if err := c.ShouldBindJSON(&nodes); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.svc.SaveNodes(uint(flowID), nodes); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}
