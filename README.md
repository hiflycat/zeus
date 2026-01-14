# Zeus 运维管理中心

Zeus 是一个企业级运维管理中心，提供统一的导航服务和 SSO 单点认证服务。基于 Go (Gin) + React (Vite) + Tailwind CSS 构建，采用 Monorepo 结构，实现 RBAC 权限管理和 JWT/OIDC 认证。

## 核心功能

- **运维管理中心**：统一管理企业内各类运维工具导航和单点登录系统
- **导航服务**：提供统一的应用导航入口，集中管理应用
- **SSO 单点认证服务**：作为身份提供者（Identity Provider），为其他应用提供统一的认证服务

## 界面预览

### 登录页面
![登录页面](./image/login.png)

### 导航页面
![导航页面](./image/navi.png)

## 技术栈

### 后端
- **Go 1.24+**
- **Gin** - HTTP Web 框架
- **GORM** - ORM 框架（支持自定义日志和慢查询检测）
- **MySQL** - 关系型数据库
- **JWT** - 身份认证
- **OIDC** - OpenID Connect 认证
- **Zap** - 结构化日志
- **Statik** - 静态文件嵌入（前端打包到后端）
- **Prometheus** - 性能监控指标

### 前端
- **React 19+** - UI 框架
- **Vite** - 构建工具
- **TypeScript** - 类型系统
- **Radix UI** - 无障碍 UI 组件库
- **Tailwind CSS** - 实用优先的 CSS 框架
- **React Router** - 路由管理
- **Axios** - HTTP 客户端
- **Zustand** - 状态管理
- **Sonner** - Toast 通知
- **i18next** - 国际化支持（中英文切换）

## 项目结构

```
zeus/
├── backend/                 # Go 后端服务
│   ├── cmd/
│   │   └── server/         # 应用入口
│   ├── internal/
│   │   ├── config/         # 配置管理
│   │   ├── model/          # 数据模型
│   │   ├── service/        # 业务逻辑层
│   │   ├── handler/        # HTTP 处理器
│   │   ├── middleware/     # 中间件
│   │   └── router/         # 路由配置
│   ├── pkg/                # 公共包
│   │   ├── jwt/            # JWT 工具
│   │   ├── logger/         # 日志工具
│   │   ├── response/       # 响应封装
│   │   ├── utils/          # 工具函数
│   │   ├── email/          # 邮件服务
│   │   └── validator/      # 验证器
│   ├── migrations/         # 数据库迁移和种子数据
│   │   ├── database.go    # 数据库连接和迁移
│   │   └── seed.go        # 数据种子和同步
│   ├── statik/             # 静态文件嵌入（自动生成）
│   ├── config.yaml.example # 配置示例
│   └── go.mod
├── frontend/                # React 前端应用
│   ├── src/
│   │   ├── api/            # API 请求封装
│   │   ├── components/     # 公共组件
│   │   │   └── ui-tw/     # Tailwind UI 组件（基于 Radix UI）
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── layouts/        # 布局组件
│   │   ├── pages/          # 页面组件
│   │   ├── router/         # 路由配置
│   │   ├── store/          # 状态管理
│   │   ├── utils/          # 工具函数
│   │   └── i18n/           # 国际化配置
│   └── package.json
└── README.md
```

## 快速开始

### 环境要求

- Go 1.24+
- Node.js 18+
- MySQL 5.7+

### 后端启动

1. **配置数据库**

   ```bash
   cd backend
   cp config.yaml.example config.yaml
   # 编辑 config.yaml，配置数据库连接信息
   ```

2. **初始化数据库**

   ```sql
   CREATE DATABASE zeus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **运行数据库迁移**

   ```bash
   cd backend
   go run cmd/server/main.go
   # 首次运行会自动创建表结构
   ```

4. **初始化基础数据**

   默认管理员账号：
   - 用户名: `admin`
   - 密码: `admin123`

5. **启动服务**

   ```bash
   cd backend
   go run cmd/server/main.go
   ```

   服务将在 `http://localhost:8080` 启动

### 前端启动

1. **安装依赖**

   ```bash
   cd frontend
   yarn install
   # 或使用 npm install
   ```

2. **启动开发服务器**

   ```bash
   yarn dev
   # 或使用 npm run dev
   ```

   前端将在 `http://localhost:3000` 启动

### 构建部署

#### 使用 Makefile（推荐）

```bash
# 构建前端
make build-frontend

# 构建后端
make build-backend

# 完整构建（前端 + 嵌入到后端）
make build

# 清理构建文件
make clean
```

#### 手动构建

1. **构建前端**

   ```bash
   cd frontend
   yarn build
   ```

2. **嵌入静态文件到后端**

   ```bash
   cd backend
   statik -src=../frontend/dist -dest=./statik -f
   ```

3. **构建后端**

   ```bash
   cd backend
   go build -o bin/server ./cmd/server
   ```

4. **运行**

   ```bash
   ./bin/server
   ```

   服务将在 `http://localhost:8080` 启动，前端已嵌入到后端中

## 功能特性

### 导航服务
- ✅ 统一应用导航入口
- ✅ 应用分类管理
- ✅ 应用图标和描述
- ✅ 快速访问常用应用
- ✅ 应用搜索功能

### SSO 单点认证服务（身份提供者）
- ✅ OIDC Provider（OpenID Connect 身份提供者）
- ✅ LDAP Server（LDAP 认证服务）
- ✅ 多租户支持
- ✅ SSO 用户/用户组管理
- ✅ OIDC 应用管理
- ✅ JWT Token 认证
- ✅ RBAC 权限管理
- ✅ 用户角色关联
- ✅ 角色权限关联
- ✅ 角色菜单关联

### 用户管理
- ✅ 用户列表（分页、搜索）
- ✅ 用户创建/编辑/删除
- ✅ 用户角色分配
- ✅ 用户状态管理

### 角色管理
- ✅ 角色列表（分页、搜索）
- ✅ 角色创建/编辑/删除
- ✅ 角色策略分配（基于 Casbin RBAC）
- ✅ 角色菜单分配

### API 定义管理
- ✅ API 定义列表（分页、搜索、按资源筛选）
- ✅ API 定义创建/编辑/删除
- ✅ API 路径 + HTTP 方法模式（如：/api/v1/users + POST）
- ✅ API 定义自动同步（启动时检查并添加新定义）

### 菜单管理
- ✅ 菜单树形列表（支持分页和树形两种模式）
- ✅ 菜单创建/编辑/删除
- ✅ 动态菜单生成（根据用户权限）
- ✅ 菜单图标选择器

### 系统配置
- ✅ OIDC 配置管理
- ✅ 邮件服务配置
- ✅ 邮件测试功能

### 性能监控
- ✅ Prometheus 格式指标
- ✅ 请求耗时统计
- ✅ 请求大小统计
- ✅ 错误计数统计
- ✅ 监控端点：`GET /api/v1/metrics`

### 国际化支持
- ✅ 中英文切换
- ✅ 语言持久化存储
- ✅ 界面文本国际化

### 其他功能
- ✅ 请求日志记录
- ✅ GORM 日志配置（支持慢查询检测）
- ✅ 错误处理
- ✅ 响应式设计
- ✅ 现代化 UI 设计（基于 Tailwind CSS）
- ✅ 表格组件统一封装
- ✅ 分页 Hook 复用
- ✅ 多标签页管理
- ✅ 角色切换（支持多角色用户）
- ✅ 前端静态文件嵌入后端（使用 statik）

## API 接口

### 公开接口

- `GET /health` - 健康检查
- `GET /api/v1/server/info` - 获取服务器信息
- `GET /api/v1/metrics` - 获取 Prometheus 格式的性能指标

### 认证接口

- `POST /api/v1/auth/login` - 登录
- `GET /api/v1/auth/me` - 获取当前用户信息
- `POST /api/v1/auth/logout` - 登出
- `GET /api/v1/auth/menus` - 获取用户菜单
- `POST /api/v1/auth/change-password` - 修改密码
- `GET /api/v1/auth/oidc/callback` - OIDC 回调

### 用户管理

- `GET /api/v1/users` - 获取用户列表
- `GET /api/v1/users/:id` - 获取用户详情
- `POST /api/v1/users` - 创建用户
- `PUT /api/v1/users/:id` - 更新用户
- `DELETE /api/v1/users/:id` - 删除用户
- `POST /api/v1/users/:id/roles` - 分配角色

### 角色管理

- `GET /api/v1/roles` - 获取角色列表
- `GET /api/v1/roles/:id` - 获取角色详情
- `POST /api/v1/roles` - 创建角色
- `PUT /api/v1/roles/:id` - 更新角色
- `DELETE /api/v1/roles/:id` - 删除角色
- `GET /api/v1/roles/:id/policies` - 获取角色策略
- `POST /api/v1/roles/:id/policies` - 分配策略
- `POST /api/v1/roles/:id/menus` - 分配菜单

### API 定义管理

- `GET /api/v1/api-definitions` - 获取 API 定义列表
- `GET /api/v1/api-definitions/resources` - 获取资源类型列表
- `GET /api/v1/api-definitions/all` - 获取所有 API 定义
- `GET /api/v1/api-definitions/:id` - 获取 API 定义详情
- `POST /api/v1/api-definitions` - 创建 API 定义
- `PUT /api/v1/api-definitions/:id` - 更新 API 定义
- `DELETE /api/v1/api-definitions/:id` - 删除 API 定义

### 菜单管理

- `GET /api/v1/menus` - 获取菜单列表（支持分页参数，无参数时返回树形结构）
- `GET /api/v1/menus/:id` - 获取菜单详情
- `POST /api/v1/menus` - 创建菜单
- `PUT /api/v1/menus/:id` - 更新菜单
- `DELETE /api/v1/menus/:id` - 删除菜单

### 导航分类管理

- `GET /api/v1/navigation-categories` - 获取分类列表
- `GET /api/v1/navigation-categories/:id` - 获取分类详情
- `POST /api/v1/navigation-categories` - 创建分类
- `PUT /api/v1/navigation-categories/:id` - 更新分类
- `DELETE /api/v1/navigation-categories/:id` - 删除分类

### 导航网站管理

- `GET /api/v1/navigations` - 获取网站列表
- `GET /api/v1/navigations/:id` - 获取网站详情
- `POST /api/v1/navigations` - 创建网站
- `PUT /api/v1/navigations/:id` - 更新网站
- `DELETE /api/v1/navigations/:id` - 删除网站

### 系统配置

- `GET /api/v1/system-config/oidc` - 获取 OIDC 配置
- `PUT /api/v1/system-config/oidc` - 更新 OIDC 配置
- `GET /api/v1/system-config/email` - 获取邮件配置
- `PUT /api/v1/system-config/email` - 更新邮件配置
- `POST /api/v1/system-config/email/test` - 测试邮件发送

### SSO 租户管理

- `GET /api/v1/sso/tenants` - 获取租户列表
- `GET /api/v1/sso/tenants/:id` - 获取租户详情
- `POST /api/v1/sso/tenants` - 创建租户
- `PUT /api/v1/sso/tenants/:id` - 更新租户
- `DELETE /api/v1/sso/tenants/:id` - 删除租户

### SSO 用户管理

- `GET /api/v1/sso/users` - 获取 SSO 用户列表
- `GET /api/v1/sso/users/:id` - 获取 SSO 用户详情
- `POST /api/v1/sso/users` - 创建 SSO 用户
- `PUT /api/v1/sso/users/:id` - 更新 SSO 用户
- `DELETE /api/v1/sso/users/:id` - 删除 SSO 用户
- `POST /api/v1/sso/users/:id/reset-password` - 重置密码
- `POST /api/v1/sso/users/:id/groups` - 分配用户组

### SSO 用户组管理

- `GET /api/v1/sso/groups` - 获取用户组列表
- `GET /api/v1/sso/groups/active` - 获取活跃用户组列表
- `GET /api/v1/sso/groups/:id` - 获取用户组详情
- `POST /api/v1/sso/groups` - 创建用户组
- `PUT /api/v1/sso/groups/:id` - 更新用户组
- `DELETE /api/v1/sso/groups/:id` - 删除用户组

### SSO OIDC 客户端管理

- `GET /api/v1/sso/clients` - 获取客户端列表
- `GET /api/v1/sso/clients/:id` - 获取客户端详情
- `POST /api/v1/sso/clients` - 创建客户端
- `PUT /api/v1/sso/clients/:id` - 更新客户端
- `DELETE /api/v1/sso/clients/:id` - 删除客户端

## 配置说明

### 数据库配置

```yaml
database:
  host: localhost
  port: 3306
  user: root
  password: password
  dbname: zeus
  charset: utf8mb4
  max_open_conns: 100
  max_idle_conns: 10
  log_level: warn      # GORM 日志级别: silent, error, warn, info
  slow_threshold: 200  # 慢查询阈值（毫秒）
```

### 日志配置

```yaml
log:
  level: info          # 日志级别: debug, info, warn, error
  format: console      # 日志格式: json, console
  output: stdout       # 输出方式: stdout, file
  filename: logs/app.log
  max_size: 100        # 日志文件最大大小（MB）
  max_backups: 3       # 保留的备份文件数量
  max_age: 7           # 保留天数
  compress: true       # 是否压缩
```

### SSO 配置

#### OIDC Provider 配置（服务端）

```yaml
sso:
  enabled: true
  issuer: "https://sso.example.com"  # OIDC Issuer URL
  oidc:
    access_token_ttl: 3600           # Access Token 有效期（秒）
    refresh_token_ttl: 604800        # Refresh Token 有效期（秒）
    code_ttl: 600                    # 授权码有效期（秒）
```

**OIDC 端点：**

| 端点 | 路径 | 说明 |
|------|------|------|
| Discovery | `/.well-known/openid-configuration` | OIDC 发现文档 |
| JWKS | `/.well-known/jwks.json` | 公钥集 |
| Authorization | `/oauth/authorize` | 授权端点 |
| Token | `/oauth/token` | 令牌端点 |
| UserInfo | `/oauth/userinfo` | 用户信息端点 |
| Revoke | `/oauth/revoke` | 令牌撤销 |
| Introspect | `/oauth/introspect` | 令牌内省 |
| Logout | `/oauth/logout` | 登出端点 |

**支持的授权流程：**
- Authorization Code Flow（Web 应用）
- Client Credentials Flow（服务间认证）
- Refresh Token（令牌刷新）

#### LDAP Server 配置（服务端）

```yaml
sso:
  ldap:
    enabled: true
    port: 389                              # LDAP 端口
    base_dn: "dc=zeus,dc=local"           # Base DN
    admin_dn: "cn=admin,dc=zeus,dc=local" # 管理员 DN
    admin_password: "your-admin-password"  # 管理员密码
```

**用户 DN 格式：**
```
uid={username},ou=users,o={tenant_name},dc=zeus,dc=local
```

**支持的 LDAP 操作：**
- Bind（用户认证）
- Search（用户查询）

**支持的 Search Filter：**

| Filter | 说明 |
|--------|------|
| `(objectClass=*)` | 获取所有用户 |
| `(objectClass=person)` | 获取所有用户 |
| `(uid=xxx)` | 按用户名查询 |
| `(cn=xxx)` | 按用户名查询 |
| `(mail=xxx)` | 按邮箱查询 |

**返回的用户属性：**
- `objectClass`: inetOrgPerson, organizationalPerson, person, top
- `uid`: 用户名
- `cn`: 用户名
- `sn`: 用户名
- `mail`: 邮箱
- `displayName`: 显示名称
- `telephoneNumber`: 电话
- `memberOf`: 用户组 DN 列表

### OIDC 客户端配置示例

#### GitLab

```yaml
# gitlab.rb
gitlab_rails['omniauth_providers'] = [
  {
    name: "openid_connect",
    label: "Zeus SSO",
    args: {
      name: "openid_connect",
      scope: ["openid", "profile", "email", "groups"],
      response_type: "code",
      issuer: "https://sso.example.com",
      client_auth_method: "basic",
      discovery: true,
      uid_field: "sub",
      client_options: {
        identifier: "your-client-id",
        secret: "your-client-secret",
        redirect_uri: "https://gitlab.example.com/users/auth/openid_connect/callback"
      }
    }
  }
]
```

#### Grafana

```ini
# grafana.ini
[auth.generic_oauth]
enabled = true
name = Zeus SSO
allow_sign_up = true
client_id = your-client-id
client_secret = your-client-secret
scopes = openid profile email groups
auth_url = https://sso.example.com/oauth/authorize
token_url = https://sso.example.com/oauth/token
api_url = https://sso.example.com/oauth/userinfo
```

#### Harbor

```yaml
# harbor.yml
oidc:
  name: Zeus SSO
  endpoint: https://sso.example.com
  client_id: your-client-id
  client_secret: your-client-secret
  groups_claim: groups
  scope: openid,profile,email,groups
  verify_cert: true
```

### LDAP 客户端配置示例

#### ldapsearch 命令行测试

```bash
# 使用管理员账号绑定并搜索所有用户
ldapsearch -H ldap://localhost:389 \
  -D "cn=admin,dc=zeus,dc=local" \
  -w "admin-password" \
  -b "ou=users,o=tenant_name,dc=zeus,dc=local" \
  "(objectClass=*)"

# 搜索特定用户
ldapsearch -H ldap://localhost:389 \
  -D "cn=admin,dc=zeus,dc=local" \
  -w "admin-password" \
  -b "ou=users,o=tenant_name,dc=zeus,dc=local" \
  "(uid=john)"

# 使用用户账号验证密码
ldapsearch -H ldap://localhost:389 \
  -D "uid=john,ou=users,o=tenant_name,dc=zeus,dc=local" \
  -w "user-password" \
  -b "dc=zeus,dc=local" \
  "(uid=john)"
```

#### GitLab LDAP

```yaml
# gitlab.rb
gitlab_rails['ldap_enabled'] = true
gitlab_rails['ldap_servers'] = {
  'main' => {
    'label' => 'Zeus LDAP',
    'host' => 'sso.example.com',
    'port' => 389,
    'uid' => 'uid',
    'bind_dn' => 'cn=admin,dc=zeus,dc=local',
    'password' => 'admin-password',
    'base' => 'ou=users,o=tenant_name,dc=zeus,dc=local',
    'verify_certificates' => false,
    'active_directory' => false
  }
}
```

#### Jenkins LDAP

```
Server: ldap://sso.example.com:389
Root DN: dc=zeus,dc=local
User search base: ou=users,o=tenant_name
User search filter: uid={0}
Manager DN: cn=admin,dc=zeus,dc=local
Manager Password: admin-password
```

#### Nexus LDAP

```
Protocol: ldap
Hostname: sso.example.com
Port: 389
Search Base: dc=zeus,dc=local
Authentication Method: Simple Authentication
Username: cn=admin,dc=zeus,dc=local
Password: admin-password
User Base DN: ou=users,o=tenant_name
User Object Class: inetOrgPerson
User ID Attribute: uid
User Real Name Attribute: displayName
User Email Attribute: mail
```

## 开发指南

### 后端开发

1. **添加新的 API 接口**

   - 在 `internal/service/` 中添加业务逻辑
   - 在 `internal/handler/` 中添加 HTTP 处理器
   - 在 `internal/router/` 中注册路由

2. **添加新的数据模型**

   - 在 `internal/model/` 中定义模型
   - 在 `migrations/database.go` 的 `Migrate()` 函数中添加模型迁移

3. **GORM 日志**

   - GORM 日志已集成到项目的 zap logger
   - 可通过配置文件设置日志级别和慢查询阈值
   - 慢查询会自动记录到日志中

### 前端开发

1. **添加新的页面**

   - 在 `src/pages/` 中创建页面组件
   - 在 `src/router/` 中注册路由

2. **添加新的 API**

   - 在 `src/api/` 中定义 API 接口

3. **国际化**

   - 在 `src/i18n/locales/` 中添加翻译文本
   - 使用 `useTranslation` hook 获取翻译函数
   - 使用 `t('key')` 获取翻译文本

## 设计风格

采用 **Tailwind CSS** 设计系统：

- **组件库**: 基于 Radix UI 构建，提供无障碍支持
- **样式**: Tailwind CSS 实用类
- **风格**: 简洁、现代、专业
- **主题**: 支持明暗主题切换

## 注意事项

1. **生产环境配置**
   - 修改 JWT Secret
   - 设置 `server.mode` 为 `release`
   - 配置数据库日志级别为 `warn` 或 `error`（避免日志过多）
   - 配置日志输出到文件

2. **安全**
   - 密码使用 bcrypt 加密存储
   - 敏感配置使用环境变量
   - 定期备份数据库

3. **性能**
   - 根据实际情况调整数据库连接池大小
   - 设置合适的慢查询阈值，监控性能
   - 生产环境建议关闭 GORM 的 info 级别日志

4. **开发**
   - 权限数据会在每次启动时自动同步，确保新增权限被正确添加
   - 使用 `make build` 构建时，前端会自动嵌入到后端
   - 开发时前端和后端可分别运行，生产环境使用嵌入模式

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

Copyright (c) 2024 Zeus
