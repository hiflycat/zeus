package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/model/request"
	"backend/internal/service"
	"backend/internal/model/response"

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

func (h *ApprovalFlowHandler) ListFlows(c *gin.Context) {
	var req request.ListApprovalFlowRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	flows, total, err := h.svc.ListFlows(req.GetPage(), req.GetPageSize(), req.Keyword)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, response.NewPageResponse(flows, total, req.GetPage(), req.GetPageSize()))
}

func (h *ApprovalFlowHandler) ListEnabledFlows(c *gin.Context) {
	flows, err := h.svc.ListEnabledFlows()
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, flows)
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
	var nodes []model.FlowNode
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

// SaveNodesWithConnections 保存节点及连线（用于可视化编辑器）
func (h *ApprovalFlowHandler) SaveNodesWithConnections(c *gin.Context) {
	flowID, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var req request.SaveNodesWithConnectionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	// 转换为 service 层的 NodeConnection 类型
	connections := make([]service.NodeConnection, len(req.Connections))
	for i, conn := range req.Connections {
		connections[i] = service.NodeConnection{
			SourceID:     conn.Source,
			TargetID:     conn.Target,
			SourceHandle: conn.SourceHandle,
		}
	}
	if err := h.svc.SaveNodesWithConnections(uint(flowID), req.Nodes, connections); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// PublishFlow 发布新版本
func (h *ApprovalFlowHandler) PublishFlow(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.PublishFlow(uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}
