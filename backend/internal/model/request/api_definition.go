package request

// ListAPIDefinitionRequest API 定义列表请求
type ListAPIDefinitionRequest struct {
	PageRequest
	Keyword  string `form:"keyword"`
	Resource string `form:"resource"`
}
