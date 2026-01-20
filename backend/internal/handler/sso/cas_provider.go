package sso

import (
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"backend/internal/config"
	"backend/internal/model/sso"
	ssoService "backend/internal/service/sso"

	"github.com/gin-gonic/gin"
)

// CASHandler CAS 处理器
type CASHandler struct {
	service *ssoService.CASProviderService
	issuer  string
}

// NewCASHandler 创建 CAS 处理器
func NewCASHandler(issuer string, cfg *config.CASConfig) *CASHandler {
	return &CASHandler{
		service: ssoService.NewCASProviderService(issuer, cfg),
		issuer:  issuer,
	}
}

// Login CAS 登录端点
func (h *CASHandler) Login(c *gin.Context) {
	service := c.Query("service")
	renew := c.Query("renew") == "true"
	gateway := c.Query("gateway") == "true"

	// 验证 service URL
	if service != "" {
		if _, err := h.service.ValidateService(service); err != nil {
			c.Redirect(302, "/sso/error?type=invalid_redirect_uri")
			return
		}
	}

	// 检查 TGC cookie
	tgc, _ := c.Cookie("TGC")

	// 如果有有效的 TGC 且不是 renew 模式
	if tgc != "" && !renew {
		session, err := h.service.ValidateTGT(tgc)
		if err == nil {
			// TGT 有效，直接生成 ST 并重定向
			if service != "" {
				client, _ := h.service.ValidateService(service)

				// 获取用户信息并验证租户
				user, err := ssoService.GetUserByID(session.UserID)
				if err != nil {
					// 用户不存在，清除无效的 TGC
					c.SetCookie("TGC", "", -1, "/cas", "", false, true)
					loginURL := "/sso/login?redirect=" + url.QueryEscape("/cas/login?service="+url.QueryEscape(service))
					c.Redirect(302, loginURL)
					return
				}
				if err := ssoService.ValidateUserForClient(user, client); err != nil {
					// 租户不匹配，清除无效的 TGC，让用户重新登录
					c.SetCookie("TGC", "", -1, "/cas", "", false, true)
					loginURL := "/sso/login?redirect=" + url.QueryEscape("/cas/login?service="+url.QueryEscape(service))
					c.Redirect(302, loginURL)
					return
				}

				clientID := ""
				if client != nil {
					clientID = client.ClientID
				}
				st, err := h.service.CreateST(session.UserID, clientID, service)
				if err != nil {
					c.String(500, "INTERNAL_ERROR")
					return
				}
				redirectURL := appendTicket(service, st)
				c.Redirect(302, redirectURL)
				return
			}
			// 没有 service，显示登录成功
			c.String(200, "Login successful")
			return
		}
	}

	// 检查 sso_session cookie（复用 OIDC 登录）
	ssoSession, _ := c.Cookie("sso_session")
	if ssoSession != "" && !renew {
		user, err := h.service.GetUserFromSession(ssoSession)
		if err == nil {
			// 如果有 service，验证用户租户
			var client *sso.OIDCClient
			if service != "" {
				client, _ = h.service.ValidateService(service)
				if err := ssoService.ValidateUserForClient(user, client); err != nil {
					// 租户不匹配，清除无效的 session，让用户重新登录
					c.SetCookie("sso_session", "", -1, "/", "", false, true)
					loginURL := "/sso/login?redirect=" + url.QueryEscape("/cas/login?service="+url.QueryEscape(service))
					c.Redirect(302, loginURL)
					return
				}
			}

			// 创建 TGT
			tgt, err := h.service.CreateTGT(user.ID)
			if err != nil {
				c.String(500, "INTERNAL_ERROR")
				return
			}

			// 设置 TGC cookie
			c.SetCookie("TGC", tgt, config.Get().SSO.CAS.TGTTTL, "/cas", "", false, true)

			// 如果有 service，生成 ST 并重定向
			if service != "" {
				clientID := ""
				if client != nil {
					clientID = client.ClientID
				}
				st, err := h.service.CreateST(user.ID, clientID, service)
				if err != nil {
					c.String(500, "INTERNAL_ERROR")
					return
				}
				redirectURL := appendTicket(service, st)
				c.Redirect(302, redirectURL)
				return
			}
			c.String(200, "Login successful")
			return
		}
	}

	// gateway 模式：如果未登录，直接重定向回 service（不带 ticket）
	if gateway && service != "" {
		c.Redirect(302, service)
		return
	}

	// 重定向到 SSO 登录页面
	loginURL := "/sso/login"
	if service != "" {
		// 构建回调 URL：/cas/login?service=xxx
		casLoginURL := "/cas/login?service=" + url.QueryEscape(service)
		loginURL += "?redirect=" + url.QueryEscape(casLoginURL)
	}
	c.Redirect(302, loginURL)
}

// Logout CAS 登出端点
func (h *CASHandler) Logout(c *gin.Context) {
	service := c.Query("service")

	// 获取 TGC
	tgc, _ := c.Cookie("TGC")

	if tgc != "" {
		// 登出并获取需要通知的服务
		services, _ := h.service.Logout(tgc)

		// 发送单点登出通知
		h.service.SendSingleLogout(services, tgc)
	}

	// 清除 TGC cookie
	c.SetCookie("TGC", "", -1, "/cas", "", false, true)

	// 如果提供了 service，重定向回去
	if service != "" {
		c.Redirect(302, service)
		return
	}

	c.String(200, "Logout successful")
}

// Validate CAS 1.0 票据验证
func (h *CASHandler) Validate(c *gin.Context) {
	ticket := c.Query("ticket")
	service := c.Query("service")

	if ticket == "" || service == "" {
		c.String(200, "no\n")
		return
	}

	user, _, err := h.service.ValidateST(ticket, service)
	if err != nil {
		c.String(200, "no\n")
		return
	}

	c.String(200, "yes\n%s\n", user.Username)
}

// ServiceValidate CAS 2.0 票据验证
func (h *CASHandler) ServiceValidate(c *gin.Context) {
	h.validateTicket(c, false, false)
}

// P3ServiceValidate CAS 3.0 票据验证（带属性）
func (h *CASHandler) P3ServiceValidate(c *gin.Context) {
	h.validateTicket(c, true, false)
}

// ProxyValidate 代理票据验证
func (h *CASHandler) ProxyValidate(c *gin.Context) {
	h.validateTicket(c, true, true)
}

// validateTicket 通用票据验证
func (h *CASHandler) validateTicket(c *gin.Context, includeAttributes, isProxy bool) {
	ticket := c.Query("ticket")
	service := c.Query("service")
	pgtUrl := c.Query("pgtUrl")

	if ticket == "" || service == "" {
		h.sendCASError(c, "INVALID_REQUEST", "Missing required parameters")
		return
	}

	var user *sso.User
	var client *sso.OIDCClient
	var proxies []string
	var err error

	if isProxy || strings.HasPrefix(ticket, "PT-") {
		user, proxies, err = h.service.ValidatePT(ticket, service)
	} else {
		user, client, err = h.service.ValidateST(ticket, service)
	}

	if err != nil {
		h.sendCASError(c, "INVALID_TICKET", "ticket validation failed")
		return
	}

	// 处理 pgtUrl（代理回调）
	var pgtIou string
	if pgtUrl != "" && client != nil {
		pgt, iou, err := h.service.CreatePGT(user.ID, client.ClientID)
		if err == nil {
			// 回调 pgtUrl
			if h.callbackPGT(pgtUrl, pgt, iou) {
				pgtIou = iou
			}
		}
	}

	h.sendCASSuccess(c, user, includeAttributes, pgtIou, proxies)
}

// Proxy 获取代理票据
func (h *CASHandler) Proxy(c *gin.Context) {
	pgt := c.Query("pgt")
	targetService := c.Query("targetService")

	if pgt == "" || targetService == "" {
		h.sendCASError(c, "INVALID_REQUEST", "Missing required parameters")
		return
	}

	// 验证 PGT
	token, err := h.service.ValidatePGT(pgt)
	if err != nil {
		h.sendCASError(c, "INVALID_TICKET", "invalid proxy granting ticket")
		return
	}

	// 验证目标服务
	if _, err := h.service.ValidateService(targetService); err != nil {
		h.sendCASError(c, "INVALID_SERVICE", "service not registered")
		return
	}

	// 创建 PT
	pt, err := h.service.CreatePT(token.UserID, token.ClientID, targetService, pgt)
	if err != nil {
		h.sendCASError(c, "INTERNAL_ERROR", "failed to create proxy ticket")
		return
	}

	// 返回 PT
	response := fmt.Sprintf(`<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
  <cas:proxySuccess>
    <cas:proxyTicket>%s</cas:proxyTicket>
  </cas:proxySuccess>
</cas:serviceResponse>`, pt)

	c.Header("Content-Type", "application/xml")
	c.String(200, response)
}

// SAMLValidate SAML 1.1 验证
func (h *CASHandler) SAMLValidate(c *gin.Context) {
	target := c.Query("TARGET")
	if target == "" {
		h.sendSAMLError(c, "Missing TARGET parameter")
		return
	}

	// 读取 SOAP 请求体
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		h.sendSAMLError(c, "Failed to read request body")
		return
	}

	// 解析 SAML 请求获取 ticket
	ticket := extractSAMLTicket(string(body))
	if ticket == "" {
		h.sendSAMLError(c, "Missing AssertionArtifact")
		return
	}

	// 验证票据
	user, _, err := h.service.ValidateST(ticket, target)
	if err != nil {
		h.sendSAMLError(c, "ticket validation failed")
		return
	}

	h.sendSAMLSuccess(c, user)
}

// sendCASSuccess 发送 CAS 成功响应
func (h *CASHandler) sendCASSuccess(c *gin.Context, user *sso.User, includeAttributes bool, pgtIou string, proxies []string) {
	var attrs string
	if includeAttributes {
		attributes := h.service.BuildUserAttributes(user)
		for k, v := range attributes {
			switch val := v.(type) {
			case []string:
				for _, item := range val {
					attrs += fmt.Sprintf("      <cas:%s>%s</cas:%s>\n", k, xmlEscape(item), k)
				}
			default:
				attrs += fmt.Sprintf("      <cas:%s>%s</cas:%s>\n", k, xmlEscape(fmt.Sprintf("%v", val)), k)
			}
		}
	}

	var pgtIouXML string
	if pgtIou != "" {
		pgtIouXML = fmt.Sprintf("    <cas:proxyGrantingTicket>%s</cas:proxyGrantingTicket>\n", pgtIou)
	}

	var proxiesXML string
	if len(proxies) > 0 {
		proxiesXML = "    <cas:proxies>\n"
		for _, p := range proxies {
			proxiesXML += fmt.Sprintf("      <cas:proxy>%s</cas:proxy>\n", xmlEscape(p))
		}
		proxiesXML += "    </cas:proxies>\n"
	}

	var attrsXML string
	if attrs != "" {
		attrsXML = fmt.Sprintf("    <cas:attributes>\n%s    </cas:attributes>\n", attrs)
	}

	response := fmt.Sprintf(`<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
  <cas:authenticationSuccess>
    <cas:user>%s</cas:user>
%s%s%s  </cas:authenticationSuccess>
</cas:serviceResponse>`, xmlEscape(user.Username), attrsXML, pgtIouXML, proxiesXML)

	c.Header("Content-Type", "application/xml")
	c.String(200, response)
}

// sendCASError 发送 CAS 错误响应
func (h *CASHandler) sendCASError(c *gin.Context, code, message string) {
	response := fmt.Sprintf(`<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
  <cas:authenticationFailure code="%s">
    %s
  </cas:authenticationFailure>
</cas:serviceResponse>`, code, xmlEscape(message))

	c.Header("Content-Type", "application/xml")
	c.String(200, response)
}

// sendSAMLSuccess 发送 SAML 成功响应
func (h *CASHandler) sendSAMLSuccess(c *gin.Context, user *sso.User) {
	now := time.Now().UTC()
	notBefore := now.Add(-5 * time.Minute).Format(time.RFC3339)
	notOnOrAfter := now.Add(5 * time.Minute).Format(time.RFC3339)
	issueInstant := now.Format(time.RFC3339)

	attributes := h.service.BuildUserAttributes(user)
	var attrsXML string
	for k, v := range attributes {
		switch val := v.(type) {
		case []string:
			for _, item := range val {
				attrsXML += fmt.Sprintf(`        <saml1:Attribute AttributeName="%s" AttributeNamespace="http://www.ja-sig.org/products/cas/">
          <saml1:AttributeValue>%s</saml1:AttributeValue>
        </saml1:Attribute>
`, k, xmlEscape(item))
			}
		default:
			attrsXML += fmt.Sprintf(`        <saml1:Attribute AttributeName="%s" AttributeNamespace="http://www.ja-sig.org/products/cas/">
          <saml1:AttributeValue>%s</saml1:AttributeValue>
        </saml1:Attribute>
`, k, xmlEscape(fmt.Sprintf("%v", val)))
		}
	}

	response := fmt.Sprintf(`<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <saml1p:Response xmlns:saml1p="urn:oasis:names:tc:SAML:1.0:protocol" IssueInstant="%s" MajorVersion="1" MinorVersion="1">
      <saml1p:Status>
        <saml1p:StatusCode Value="saml1p:Success"/>
      </saml1p:Status>
      <saml1:Assertion xmlns:saml1="urn:oasis:names:tc:SAML:1.0:assertion" IssueInstant="%s" Issuer="%s" MajorVersion="1" MinorVersion="1">
        <saml1:Conditions NotBefore="%s" NotOnOrAfter="%s">
          <saml1:AudienceRestrictionCondition>
            <saml1:Audience>%s</saml1:Audience>
          </saml1:AudienceRestrictionCondition>
        </saml1:Conditions>
        <saml1:AuthenticationStatement AuthenticationInstant="%s" AuthenticationMethod="urn:oasis:names:tc:SAML:1.0:am:password">
          <saml1:Subject>
            <saml1:NameIdentifier>%s</saml1:NameIdentifier>
            <saml1:SubjectConfirmation>
              <saml1:ConfirmationMethod>urn:oasis:names:tc:SAML:1.0:cm:artifact</saml1:ConfirmationMethod>
            </saml1:SubjectConfirmation>
          </saml1:Subject>
        </saml1:AuthenticationStatement>
        <saml1:AttributeStatement>
          <saml1:Subject>
            <saml1:NameIdentifier>%s</saml1:NameIdentifier>
          </saml1:Subject>
%s        </saml1:AttributeStatement>
      </saml1:Assertion>
    </saml1p:Response>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`, issueInstant, issueInstant, h.issuer, notBefore, notOnOrAfter, h.issuer, issueInstant, user.Username, user.Username, attrsXML)

	c.Header("Content-Type", "text/xml")
	c.String(200, response)
}

// sendSAMLError 发送 SAML 错误响应
func (h *CASHandler) sendSAMLError(c *gin.Context, message string) {
	response := fmt.Sprintf(`<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <saml1p:Response xmlns:saml1p="urn:oasis:names:tc:SAML:1.0:protocol">
      <saml1p:Status>
        <saml1p:StatusCode Value="saml1p:RequestDenied"/>
        <saml1p:StatusMessage>%s</saml1p:StatusMessage>
      </saml1p:Status>
    </saml1p:Response>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`, xmlEscape(message))

	c.Header("Content-Type", "text/xml")
	c.String(200, response)
}

// callbackPGT 回调 pgtUrl 传递 PGT
func (h *CASHandler) callbackPGT(pgtUrl, pgt, pgtIou string) bool {
	callbackURL, err := url.Parse(pgtUrl)
	if err != nil {
		return false
	}

	query := callbackURL.Query()
	query.Set("pgtId", pgt)
	query.Set("pgtIou", pgtIou)
	callbackURL.RawQuery = query.Encode()

	resp, err := httpGet(callbackURL.String())
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300
}

// appendTicket 在 URL 后追加 ticket 参数
func appendTicket(serviceURL, ticket string) string {
	u, err := url.Parse(serviceURL)
	if err != nil {
		return serviceURL + "?ticket=" + ticket
	}
	q := u.Query()
	q.Set("ticket", ticket)
	u.RawQuery = q.Encode()
	return u.String()
}

// extractSAMLTicket 从 SAML 请求中提取 ticket
func extractSAMLTicket(body string) string {
	// 简单解析，查找 AssertionArtifact
	start := strings.Index(body, "<samlp:AssertionArtifact>")
	if start == -1 {
		start = strings.Index(body, "<AssertionArtifact>")
		if start == -1 {
			return ""
		}
		start += len("<AssertionArtifact>")
	} else {
		start += len("<samlp:AssertionArtifact>")
	}

	end := strings.Index(body[start:], "</")
	if end == -1 {
		return ""
	}

	return strings.TrimSpace(body[start : start+end])
}

// xmlEscape XML 转义
func xmlEscape(s string) string {
	var b strings.Builder
	xml.EscapeText(&b, []byte(s))
	return b.String()
}

// httpGet 简单的 HTTP GET 请求
func httpGet(url string) (*http.Response, error) {
	return http.Get(url)
}
