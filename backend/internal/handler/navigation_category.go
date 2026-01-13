package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"backend/internal/model"
	"backend/internal/service"
	"backend/pkg/response"
)

// NavigationCategoryHandler 网站分类处理器
type NavigationCategoryHandler struct {
	categoryService *service.NavigationCategoryService
}

// NewNavigationCategoryHandler 创建网站分类处理器
func NewNavigationCategoryHandler() *NavigationCategoryHandler {
	return &NavigationCategoryHandler{
		categoryService: service.NewNavigationCategoryService(),
	}
}

// Create 创建网站分类
func (h *NavigationCategoryHandler) Create(c *gin.Context) {
	var category model.NavigationCategory
	if err := c.ShouldBindJSON(&category); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.categoryService.Create(&category); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, category)
}

// Update 更新网站分类
func (h *NavigationCategoryHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	categoryID := uint(id)

	var category model.NavigationCategory
	if err := c.ShouldBindJSON(&category); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.categoryService.Update(categoryID, &category); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Delete 删除网站分类
func (h *NavigationCategoryHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	categoryID := uint(id)

	if err := h.categoryService.Delete(categoryID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetByID 根据 ID 获取网站分类
func (h *NavigationCategoryHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	categoryID := uint(id)

	category, err := h.categoryService.GetByID(categoryID)
	if err != nil {
		response.NotFound(c, "分类不存在")
		return
	}

	response.Success(c, category)
}

// List 获取网站分类列表
// 如果请求带分页参数（page 或 page_size），返回分页数据
// 如果请求不带分页参数，返回树形结构
func (h *NavigationCategoryHandler) List(c *gin.Context) {
	pageStr := c.Query("page")
	pageSizeStr := c.Query("page_size")
	keyword := c.Query("keyword")

	// 判断是否有分页参数
	hasPagination := pageStr != "" || pageSizeStr != ""

	if hasPagination {
		// 有分页参数，返回分页数据
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

		categories, total, err := h.categoryService.List(page, pageSize, keyword)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, gin.H{
			"list":      categories,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		})
	} else {
		// 无分页参数，返回树形结构
		allCategories, err := h.categoryService.GetAll(keyword)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		treeCategories := h.categoryService.BuildTree(allCategories)
		response.Success(c, treeCategories)
	}
}
