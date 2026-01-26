package request

// ListNavigationRequest 网站列表请求
type ListNavigationRequest struct {
	PageRequest
	Keyword    string `form:"keyword"`
	CategoryID uint   `form:"category_id"`
}

// ListNavigationCategoryRequest 网站分类列表请求
type ListNavigationCategoryRequest struct {
	PageRequest
	Keyword string `form:"keyword"`
}
