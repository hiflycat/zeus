package request

// ListMenuRequest 菜单列表请求
type ListMenuRequest struct {
	PageRequest
	Keyword string `form:"keyword"`
}
