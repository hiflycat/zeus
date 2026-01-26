package request

// ListFormTemplateRequest 表单模板列表请求
type ListFormTemplateRequest struct {
	PageRequest
	Keyword string `form:"keyword"`
}
