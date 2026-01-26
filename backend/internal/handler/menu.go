package handler

import (
	"strconv"

	"backend/internal/model"
	"backend/internal/model/request"
	"backend/internal/service"
	"backend/internal/model/response"

	"github.com/gin-gonic/gin"
)

// MenuHandler 菜单处理器
type MenuHandler struct {
	menuService *service.MenuService
}

// NewMenuHandler 创建菜单处理器
func NewMenuHandler() *MenuHandler {
	return &MenuHandler{
		menuService: service.NewMenuService(),
	}
}

// Create 创建菜单
func (h *MenuHandler) Create(c *gin.Context) {
	var menu model.Menu
	if err := c.ShouldBindJSON(&menu); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.menuService.Create(&menu); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, menu)
}

// Update 更新菜单
func (h *MenuHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	menuID := uint(id)

	var menu model.Menu
	if err := c.ShouldBindJSON(&menu); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.menuService.Update(menuID, &menu); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Delete 删除菜单
func (h *MenuHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	menuID := uint(id)

	if err := h.menuService.Delete(menuID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetByID 根据 ID 获取菜单
func (h *MenuHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	menuID := uint(id)

	menu, err := h.menuService.GetByID(menuID)
	if err != nil {
		response.NotFound(c, "菜单不存在")
		return
	}

	response.Success(c, menu)
}

// List 获取菜单列表
// 如果请求带分页参数（page 或 page_size），返回分页数据
// 如果请求不带分页参数，返回树形结构
func (h *MenuHandler) List(c *gin.Context) {
	pageStr := c.Query("page")
	pageSizeStr := c.Query("page_size")
	keyword := c.Query("keyword")

	// 判断是否有分页参数
	hasPagination := pageStr != "" || pageSizeStr != ""

	if hasPagination {
		// 有分页参数，返回分页数据
		var req request.ListMenuRequest
		if err := c.ShouldBindQuery(&req); err != nil {
			response.BadRequest(c, err.Error())
			return
		}

		menus, total, err := h.menuService.List(req.GetPage(), req.GetPageSize(), req.Keyword)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		response.Success(c, response.NewPageResponse(menus, total, req.GetPage(), req.GetPageSize()))
	} else {
		// 无分页参数，返回树形结构
		allMenus, err := h.menuService.GetAll(keyword)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}

		treeMenus := h.menuService.BuildTree(allMenus)
		response.Success(c, treeMenus)
	}
}

// GetUserMenus 获取用户菜单
func (h *MenuHandler) GetUserMenus(c *gin.Context) {
	userID, _ := c.Get("user_id")
	
	// 从请求头获取当前角色ID
	var roleID uint = 0
	roleIDStr := c.GetHeader("X-Current-Role-ID")
	if roleIDStr != "" {
		if parsedID, err := strconv.ParseUint(roleIDStr, 10, 32); err == nil {
			roleID = uint(parsedID)
		}
	}
	
	menus, err := h.menuService.GetUserMenus(userID.(uint), roleID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, menus)
}
