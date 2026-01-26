package middleware

import (
	"strconv"

	casbinPkg "backend/internal/casbin"
	"backend/internal/global"
	"backend/internal/model"
	"backend/internal/model/response"

	"github.com/gin-gonic/gin"
)

// CasbinRBACMiddleware Casbin RBAC 权限验证中间件
func CasbinRBACMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			response.Unauthorized(c, "未认证")
			c.Abort()
			return
		}

		method := c.Request.Method
		path := c.FullPath()

		// 获取用户的角色
		var user model.User
		if err := global.GetDB().Preload("Roles").Where("id = ?", userID).First(&user).Error; err != nil {
			response.Forbidden(c, "权限不足")
			c.Abort()
			return
		}

		if len(user.Roles) == 0 {
			response.Forbidden(c, "权限不足")
			c.Abort()
			return
		}

		// 使用 Casbin 检查权限（用角色 ID）
		enforcer := casbinPkg.GetEnforcer()
		if enforcer == nil {
			response.InternalError(c, "权限系统未初始化")
			c.Abort()
			return
		}

		// 检查用户的任一角色是否有权限
		hasPermission := false
		for _, role := range user.Roles {
			roleIDStr := strconv.FormatUint(uint64(role.ID), 10)
			ok, err := enforcer.Enforce(roleIDStr, path, method)
			if err == nil && ok {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			response.Forbidden(c, "权限不足")
			c.Abort()
			return
		}

		c.Next()
	}
}
