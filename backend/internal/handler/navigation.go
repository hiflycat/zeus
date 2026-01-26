package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/model/request"
	"backend/internal/service"
	"backend/internal/model/response"

	"github.com/gin-gonic/gin"
)

// NavigationHandler 网站处理器
type NavigationHandler struct {
	navigationService *service.NavigationService
}

// NewNavigationHandler 创建网站处理器
func NewNavigationHandler() *NavigationHandler {
	return &NavigationHandler{
		navigationService: service.NewNavigationService(),
	}
}

// Create 创建网站
func (h *NavigationHandler) Create(c *gin.Context) {
	var navigation model.Navigation
	if err := c.ShouldBindJSON(&navigation); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.navigationService.Create(&navigation); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, navigation)
}

// Update 更新网站
func (h *NavigationHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	navigationID := uint(id)

	var navigation model.Navigation
	if err := c.ShouldBindJSON(&navigation); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.navigationService.Update(navigationID, &navigation); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Delete 删除网站
func (h *NavigationHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	navigationID := uint(id)

	if err := h.navigationService.Delete(navigationID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetByID 根据 ID 获取网站
func (h *NavigationHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	navigationID := uint(id)

	navigation, err := h.navigationService.GetByID(navigationID)
	if err != nil {
		response.NotFound(c, "网站不存在")
		return
	}

	response.Success(c, navigation)
}

// List 获取网站列表（分页）
func (h *NavigationHandler) List(c *gin.Context) {
	var req request.ListNavigationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	var categoryID *uint
	if req.CategoryID != 0 {
		categoryID = &req.CategoryID
	}

	navigations, total, err := h.navigationService.List(req.GetPage(), req.GetPageSize(), req.Keyword, categoryID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, response.NewPageResponse(navigations, total, req.GetPage(), req.GetPageSize()))
}
