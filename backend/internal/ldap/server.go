package ldap

import (
	"fmt"
	"log"
	"net"
	"strings"

	"backend/internal/model/sso"
	"backend/migrations"
	"backend/pkg/utils"

	ldap "github.com/nmcclain/ldap"
)

// Server LDAP 服务器
type Server struct {
	listener      net.Listener
	baseDN        string
	port          int
	adminDN       string
	adminPassword string
}

// NewServer 创建 LDAP 服务器
func NewServer(port int, baseDN, adminDN, adminPassword string) *Server {
	return &Server{
		port:          port,
		baseDN:        baseDN,
		adminDN:       adminDN,
		adminPassword: adminPassword,
	}
}

// Start 启动 LDAP 服务器
func (s *Server) Start() error {
	server := ldap.NewServer()

	// 注册处理器
	handler := &Handler{
		baseDN:        s.baseDN,
		adminDN:       s.adminDN,
		adminPassword: s.adminPassword,
	}
	server.BindFunc("", handler)
	server.SearchFunc("", handler)

	// 监听端口
	addr := fmt.Sprintf(":%d", s.port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", addr, err)
	}
	s.listener = listener

	log.Printf("LDAP server listening on %s", addr)

	// 启动服务
	return server.Serve(listener)
}

// Stop 停止 LDAP 服务器
func (s *Server) Stop() error {
	if s.listener != nil {
		return s.listener.Close()
	}
	return nil
}

// Handler LDAP 请求处理器
type Handler struct {
	baseDN        string
	adminDN       string
	adminPassword string
}

// Bind 处理 LDAP Bind 请求（用户认证）
func (h *Handler) Bind(bindDN, bindSimplePw string, conn net.Conn) (ldap.LDAPResultCode, error) {
	log.Printf("LDAP Bind request: DN=%s", bindDN)

	// 检查是否是管理员账号
	if h.adminDN != "" && strings.EqualFold(bindDN, h.adminDN) {
		if bindSimplePw == h.adminPassword {
			log.Printf("LDAP Bind success: admin")
			return ldap.LDAPResultSuccess, nil
		}
		log.Printf("LDAP Bind failed: invalid admin password")
		return ldap.LDAPResultInvalidCredentials, nil
	}

	// 解析 DN 获取用户名和租户
	// DN 格式: uid={username},ou=users,o={tenant_name},dc=zeus,dc=local
	username, tenantName, err := h.parseDN(bindDN)
	if err != nil {
		log.Printf("LDAP Bind failed: invalid DN format: %v", err)
		return ldap.LDAPResultInvalidDNSyntax, nil
	}

	// 查找租户（忽略大小写）
	var tenant sso.Tenant
	if err := migrations.GetDB().Where("LOWER(name) = LOWER(?) AND status = 1", tenantName).First(&tenant).Error; err != nil {
		log.Printf("LDAP Bind failed: tenant not found: %s", tenantName)
		return ldap.LDAPResultInvalidCredentials, nil
	}

	// 查找用户
	var user sso.User
	if err := migrations.GetDB().Where("tenant_id = ? AND username = ? AND status = 1", tenant.ID, username).First(&user).Error; err != nil {
		log.Printf("LDAP Bind failed: user not found: %s", username)
		return ldap.LDAPResultInvalidCredentials, nil
	}

	// 验证密码
	if !utils.CheckPassword(bindSimplePw, user.Password) {
		log.Printf("LDAP Bind failed: invalid password for user: %s", username)
		return ldap.LDAPResultInvalidCredentials, nil
	}

	log.Printf("LDAP Bind success: user=%s, tenant=%s", username, tenantName)
	return ldap.LDAPResultSuccess, nil
}

// Search 处理 LDAP Search 请求
func (h *Handler) Search(boundDN string, req ldap.SearchRequest, conn net.Conn) (ldap.ServerSearchResult, error) {
	log.Printf("LDAP Search request: BoundDN=%s, BaseDN=%s, Filter=%s", boundDN, req.BaseDN, req.Filter)

	// 检查是否已认证（不允许匿名访问）
	if boundDN == "" {
		log.Printf("LDAP Search failed: anonymous access not allowed")
		return ldap.ServerSearchResult{ResultCode: ldap.LDAPResultInsufficientAccessRights}, nil
	}

	// 解析 BaseDN 获取租户
	_, tenantName, err := h.parseBaseDN(req.BaseDN)
	if err != nil {
		return ldap.ServerSearchResult{ResultCode: ldap.LDAPResultNoSuchObject}, nil
	}

	// 查找租户（忽略大小写）
	var tenant sso.Tenant
	if err := migrations.GetDB().Where("LOWER(name) = LOWER(?) AND status = 1", tenantName).First(&tenant).Error; err != nil {
		return ldap.ServerSearchResult{ResultCode: ldap.LDAPResultNoSuchObject}, nil
	}

	// 解析 filter
	filterType, filterValue := h.parseFilter(req.Filter)

	var users []sso.User
	db := migrations.GetDB().Preload("Groups").Where("tenant_id = ? AND status = 1", tenant.ID)

	switch filterType {
	case "all":
		// 获取所有用户
		if err := db.Find(&users).Error; err != nil {
			return ldap.ServerSearchResult{ResultCode: ldap.LDAPResultOther}, nil
		}
	case "uid", "cn":
		// 查询特定用户
		if err := db.Where("username = ?", filterValue).Find(&users).Error; err != nil {
			return ldap.ServerSearchResult{ResultCode: ldap.LDAPResultOther}, nil
		}
	case "mail":
		// 按邮箱查询
		if err := db.Where("email = ?", filterValue).Find(&users).Error; err != nil {
			return ldap.ServerSearchResult{ResultCode: ldap.LDAPResultOther}, nil
		}
	default:
		// 不支持的 filter，返回空结果
		return ldap.ServerSearchResult{ResultCode: ldap.LDAPResultSuccess}, nil
	}

	// 构建返回结果
	entries := make([]*ldap.Entry, 0, len(users))
	for _, user := range users {
		entry := h.buildUserEntry(&user, tenantName)
		entries = append(entries, entry)
	}

	log.Printf("LDAP Search success: found %d users", len(entries))
	return ldap.ServerSearchResult{
		Entries:    entries,
		ResultCode: ldap.LDAPResultSuccess,
	}, nil
}

// buildUserEntry 构建用户 LDAP 条目
func (h *Handler) buildUserEntry(user *sso.User, tenantName string) *ldap.Entry {
	dn := fmt.Sprintf("uid=%s,ou=users,o=%s,%s", user.Username, tenantName, h.baseDN)
	entry := &ldap.Entry{
		DN: dn,
		Attributes: []*ldap.EntryAttribute{
			{Name: "objectClass", Values: []string{"inetOrgPerson", "organizationalPerson", "person", "top"}},
			{Name: "uid", Values: []string{user.Username}},
			{Name: "cn", Values: []string{user.Username}},
			{Name: "sn", Values: []string{user.Username}},
		},
	}

	if user.Email != "" {
		entry.Attributes = append(entry.Attributes, &ldap.EntryAttribute{Name: "mail", Values: []string{user.Email}})
	}
	if user.DisplayName != "" {
		entry.Attributes = append(entry.Attributes, &ldap.EntryAttribute{Name: "displayName", Values: []string{user.DisplayName}})
	}
	if user.Phone != "" {
		entry.Attributes = append(entry.Attributes, &ldap.EntryAttribute{Name: "telephoneNumber", Values: []string{user.Phone}})
	}

	// 添加组信息
	if len(user.Groups) > 0 {
		groups := make([]string, len(user.Groups))
		for i, g := range user.Groups {
			groups[i] = fmt.Sprintf("cn=%s,ou=groups,o=%s,%s", g.Name, tenantName, h.baseDN)
		}
		entry.Attributes = append(entry.Attributes, &ldap.EntryAttribute{Name: "memberOf", Values: groups})
	}

	return entry
}

// parseDN 解析 DN 获取用户名和租户名
// DN 格式: uid={username},ou=users,o={tenant_name},dc=zeus,dc=local
func (h *Handler) parseDN(dn string) (username, tenantName string, err error) {
	parts := strings.Split(strings.ToLower(dn), ",")
	for _, part := range parts {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "uid":
			username = kv[1]
		case "o":
			tenantName = kv[1]
		}
	}

	if username == "" || tenantName == "" {
		return "", "", fmt.Errorf("invalid DN format")
	}

	return username, tenantName, nil
}

// parseBaseDN 解析 BaseDN 获取租户名
func (h *Handler) parseBaseDN(baseDN string) (ou, tenantName string, err error) {
	parts := strings.Split(strings.ToLower(baseDN), ",")
	for _, part := range parts {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "ou":
			ou = kv[1]
		case "o":
			tenantName = kv[1]
		}
	}

	if tenantName == "" {
		return "", "", fmt.Errorf("invalid BaseDN format")
	}

	return ou, tenantName, nil
}

// parseFilter 解析 LDAP filter
// 返回 filter 类型和值
// 支持: (objectClass=*), (uid=xxx), (cn=xxx), (mail=xxx)
func (h *Handler) parseFilter(filter string) (filterType, filterValue string) {
	filter = strings.TrimSpace(strings.ToLower(filter))

	// 匹配所有用户的 filter
	if filter == "(objectclass=*)" || filter == "(objectclass=person)" ||
		filter == "(objectclass=inetorgperson)" || filter == "(&)" || filter == "" {
		return "all", ""
	}

	// 解析简单 filter: (attr=value)
	if strings.HasPrefix(filter, "(") && strings.HasSuffix(filter, ")") {
		inner := filter[1 : len(filter)-1]
		// 处理 AND filter: (&(objectClass=person)(uid=xxx))
		if strings.HasPrefix(inner, "&") {
			// 提取内部的条件
			inner = strings.TrimPrefix(inner, "&")
			// 查找 uid 或 cn 条件
			if idx := strings.Index(inner, "(uid="); idx >= 0 {
				end := strings.Index(inner[idx:], ")")
				if end > 0 {
					return "uid", inner[idx+5 : idx+end]
				}
			}
			if idx := strings.Index(inner, "(cn="); idx >= 0 {
				end := strings.Index(inner[idx:], ")")
				if end > 0 {
					return "cn", inner[idx+4 : idx+end]
				}
			}
			if idx := strings.Index(inner, "(mail="); idx >= 0 {
				end := strings.Index(inner[idx:], ")")
				if end > 0 {
					return "mail", inner[idx+6 : idx+end]
				}
			}
			// 如果只有 objectClass 条件，返回所有用户
			if strings.Contains(inner, "objectclass=") {
				return "all", ""
			}
		}

		// 简单 filter
		if parts := strings.SplitN(inner, "=", 2); len(parts) == 2 {
			attr := parts[0]
			value := parts[1]
			if value == "*" {
				return "all", ""
			}
			switch attr {
			case "uid":
				return "uid", value
			case "cn":
				return "cn", value
			case "mail":
				return "mail", value
			case "objectclass":
				return "all", ""
			}
		}
	}

	return "", ""
}
