package request

// ListTicketTypeRequest 工单类型列表请求
type ListTicketTypeRequest struct {
	PageRequest
	Keyword string `form:"keyword"`
}
