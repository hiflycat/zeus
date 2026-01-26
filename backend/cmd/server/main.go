package main

import (
	"backend/internal/core"
	_ "backend/statik" // 导入 statik 生成的包
)

func main() {
	// 初始化应用程序
	core.MustBootstrap("config.yaml")

	// 启动服务并等待退出
	core.Run()
}
