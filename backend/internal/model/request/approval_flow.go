package request

import "backend/internal/model"

// ListApprovalFlowRequest 审批流程列表请求
type ListApprovalFlowRequest struct {
	PageRequest
	Keyword string `form:"keyword"`
}

// NodeConnection 节点连接
type NodeConnection struct {
	Source       string `json:"source"`
	Target       string `json:"target"`
	SourceHandle string `json:"sourceHandle,omitempty"`
}

// SaveNodesWithConnectionsRequest 保存节点及连线请求
type SaveNodesWithConnectionsRequest struct {
	Nodes       []model.FlowNode `json:"nodes"`
	Connections []NodeConnection `json:"connections"`
}
