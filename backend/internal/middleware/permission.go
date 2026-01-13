package middleware

import (
	"strconv"

	"backend/internal/service"
	"backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// PermissionMiddleware 权限验证中间件（基于 API 路径）
func PermissionMiddleware(resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			response.Unauthorized(c, "未认证")
			c.Abort()
			return
		}

		// 获取当前请求的方法和路径
		method := c.Request.Method
		path := c.FullPath() // 获取路由模板路径，如 /api/v1/users/:id

		// 从请求头获取当前角色ID（前端通过 X-Current-Role-ID 传递）
		var roleID uint = 0
		roleIDStr := c.GetHeader("X-Current-Role-ID")
		if roleIDStr != "" {
			if parsedID, err := strconv.ParseUint(roleIDStr, 10, 32); err == nil {
				roleID = uint(parsedID)
			}
		}

		permissionService := service.NewPermissionService()
		hasPermission, err := permissionService.CheckPermissionByAPI(userID.(uint), method, path, roleID)
		if err != nil {
			response.InternalError(c, "权限检查失败")
			c.Abort()
			return
		}

		if !hasPermission {
			response.Forbidden(c, "权限不足")
			c.Abort()
			return
		}

		c.Next()
	}
}
