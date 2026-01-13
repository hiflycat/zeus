.PHONY: build build-frontend build-backend clean

# 构建前端
build-frontend:
	@echo "Building frontend..."
	cd frontend && yarn build
	rm -rf backend/dist
	cp -r frontend/dist backend/dist

# 构建后端
build-backend:
	@echo "Building backend..."
	cd backend && go build -o ./server ./cmd/server

# 全部打包（包含前端打包和 statik 嵌入）
build:
	@echo "Generating statik files..."
	$(MAKE) build-frontend
	rm -rf backend/statik
	cd backend && statik -src=./dist
	@echo "Building backend with embedded frontend..."
	$(MAKE) build-backend

# 清理构建文件
clean:
	@echo "Cleaning build files..."
	rm -rf frontend/dist
	rm -rf backend/statik
	rm -rf backend/dist
	rm -rf backend/server
