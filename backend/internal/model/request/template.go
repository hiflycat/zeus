package request

// ListTemplateRequest 模板列表请求
type ListTemplateRequest struct {
	PageRequest
	Keyword string `form:"keyword"`
	TypeID  uint   `form:"type_id"`
}
