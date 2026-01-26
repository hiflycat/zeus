package request

// PageRequest 分页请求基础结构
type PageRequest struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"page_size" binding:"omitempty,min=1,max=1000"`
}

// GetPage 获取页码，默认为 1
func (p *PageRequest) GetPage() int {
	if p.Page <= 0 {
		return 1
	}
	return p.Page
}

// GetPageSize 获取每页数量，默认为 10
func (p *PageRequest) GetPageSize() int {
	if p.PageSize <= 0 {
		return 10
	}
	return p.PageSize
}

// GetOffset 获取偏移量
func (p *PageRequest) GetOffset() int {
	return (p.GetPage() - 1) * p.GetPageSize()
}

// IDRequest 通用 ID 请求（用于路径参数）
type IDRequest struct {
	ID uint `uri:"id" binding:"required,min=1"`
}
