package router

import (
	"net/http"
	"strings"
	"time"

	"backend/internal/config"
	_ "backend/statik" // 导入 statik 生成的包

	"github.com/gin-gonic/gin"
	"github.com/rakyll/statik/fs"
)

// setupStaticFiles 设置静态文件服务
func setupStaticFiles(r *gin.Engine) {
	cfg := config.Get()
	if cfg == nil {
		return
	}

	// ========== statik 静态资源与 SPA 路由兜底 ==========
	statikFS, err := fs.New()
	if err != nil {
		return
	}

	// 设置静态文件服务中间件
	r.Use(gin.HandlerFunc(func(c *gin.Context) {
		path := c.Request.URL.Path
		// 检查路径是否以 /api 开头，如果是，则跳过静态文件处理
		if strings.HasPrefix(path, "/api") {
			c.Next()
			return
		}
		// 如果不是 API 路径，则尝试提供静态文件
		if _, err := statikFS.Open(path); err == nil {
			c.Header("Cache-Control", "public, max-age=31536000")
			http.FileServer(statikFS).ServeHTTP(c.Writer, c.Request)
			c.Abort()
		} else {
			c.Next()
		}
	}))

	// 所有未匹配的路由都返回 index.html，以支持 SPA 路由
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api") {
			c.JSON(404, gin.H{"error": "API not found"})
			return
		}
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		// 读取并返回 index.html
		index, err := statikFS.Open("/index.html")
		if err != nil {
			c.String(404, "File not found")
			return
		}
		defer index.Close()
		http.ServeContent(c.Writer, c.Request, "index.html", time.Now(), index)
	})
}
