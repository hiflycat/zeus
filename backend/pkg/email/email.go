package email

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
)

// EmailConfig 邮件配置
type EmailConfig struct {
	Host     string   `json:"host"`      // SMTP 服务器地址
	Port     int      `json:"port"`      // SMTP 端口
	Username string   `json:"username"`  // SMTP 认证邮箱（用于登录）
	Password string   `json:"password"`  // SMTP 认证密码或授权码
	From     string   `json:"from"`      // 发件人显示名称
	FromAddr string   `json:"from_addr"` // 发件人邮箱地址（邮件中显示的发送者）
	UseTLS   bool     `json:"use_tls"`   // 是否使用 TLS
	UseSSL   bool     `json:"use_ssl"`   // 是否使用 SSL
}

// EmailMessage 邮件消息
type EmailMessage struct {
	To      []string `json:"to"`      // 收件人列表
	Cc      []string `json:"cc"`      // 抄送列表
	Bcc     []string `json:"bcc"`     // 密送列表
	Subject string   `json:"subject"` // 主题
	Body    string   `json:"body"`    // 正文（HTML 或纯文本）
	IsHTML  bool     `json:"is_html"` // 是否为 HTML 格式
}

// EmailClient 邮件客户端
type EmailClient struct {
	config *EmailConfig
}

// NewEmailClient 创建邮件客户端
func NewEmailClient(config *EmailConfig) *EmailClient {
	return &EmailClient{
		config: config,
	}
}

// Send 发送邮件
func (c *EmailClient) Send(message *EmailMessage) error {
	// 验证配置
	if err := c.validateConfig(); err != nil {
		return fmt.Errorf("invalid email config: %w", err)
	}

	// 验证消息
	if err := c.validateMessage(message); err != nil {
		return fmt.Errorf("invalid email message: %w", err)
	}

	// 构建邮件头
	headers := c.buildHeaders(message)

	// 构建邮件内容
	content := headers + "\r\n" + message.Body

	// 获取所有收件人（包括 To、Cc、Bcc）
	recipients := make([]string, 0)
	recipients = append(recipients, message.To...)
	recipients = append(recipients, message.Cc...)
	recipients = append(recipients, message.Bcc...)

	// 构建 SMTP 地址
	addr := fmt.Sprintf("%s:%d", c.config.Host, c.config.Port)

	// 设置认证
	auth := smtp.PlainAuth("", c.config.Username, c.config.Password, c.config.Host)

	// 发送邮件
	if c.config.UseSSL {
		// 使用 SSL/TLS
		return c.sendWithTLS(addr, auth, c.config.FromAddr, recipients, []byte(content))
	} else if c.config.UseTLS {
		// 使用 STARTTLS
		return c.sendWithSTARTTLS(addr, auth, c.config.FromAddr, recipients, []byte(content))
	} else {
		// 不使用加密（不推荐，仅用于测试）
		return smtp.SendMail(addr, auth, c.config.FromAddr, recipients, []byte(content))
	}
}

// sendWithTLS 使用 TLS 发送邮件
func (c *EmailClient) sendWithTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	// 连接到 SMTP 服务器
	conn, err := tls.Dial("tcp", addr, &tls.Config{
		ServerName: c.config.Host,
	})
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer conn.Close()

	// 创建 SMTP 客户端
	client, err := smtp.NewClient(conn, c.config.Host)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	// 认证
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("failed to authenticate: %w", err)
	}

	// 设置发件人
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// 设置收件人
	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return fmt.Errorf("failed to set recipient %s: %w", recipient, err)
		}
	}

	// 发送邮件内容
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}

	if _, err := writer.Write(msg); err != nil {
		writer.Close()
		return fmt.Errorf("failed to write message: %w", err)
	}

	if err := writer.Close(); err != nil {
		return fmt.Errorf("failed to close data writer: %w", err)
	}

	// 退出
	if err := client.Quit(); err != nil {
		return fmt.Errorf("failed to quit: %w", err)
	}

	return nil
}

// sendWithSTARTTLS 使用 STARTTLS 发送邮件
func (c *EmailClient) sendWithSTARTTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	// 连接到 SMTP 服务器
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer client.Close()

	// 发送 STARTTLS 命令
	if err := client.StartTLS(&tls.Config{
		ServerName: c.config.Host,
	}); err != nil {
		return fmt.Errorf("failed to start TLS: %w", err)
	}

	// 认证
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("failed to authenticate: %w", err)
	}

	// 设置发件人
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// 设置收件人
	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return fmt.Errorf("failed to set recipient %s: %w", recipient, err)
		}
	}

	// 发送邮件内容
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}

	if _, err := writer.Write(msg); err != nil {
		writer.Close()
		return fmt.Errorf("failed to write message: %w", err)
	}

	if err := writer.Close(); err != nil {
		return fmt.Errorf("failed to close data writer: %w", err)
	}

	// 退出
	if err := client.Quit(); err != nil {
		return fmt.Errorf("failed to quit: %w", err)
	}

	return nil
}

// buildHeaders 构建邮件头
func (c *EmailClient) buildHeaders(message *EmailMessage) string {
	headers := make([]string, 0)

	// From - 直接使用邮箱地址
	headers = append(headers, fmt.Sprintf("From: %s", c.config.FromAddr))

	// To
	if len(message.To) > 0 {
		headers = append(headers, fmt.Sprintf("To: %s", strings.Join(message.To, ", ")))
	}

	// Cc
	if len(message.Cc) > 0 {
		headers = append(headers, fmt.Sprintf("Cc: %s", strings.Join(message.Cc, ", ")))
	}

	// Subject
	headers = append(headers, fmt.Sprintf("Subject: %s", message.Subject))

	// Content-Type
	if message.IsHTML {
		headers = append(headers, "Content-Type: text/html; charset=UTF-8")
	} else {
		headers = append(headers, "Content-Type: text/plain; charset=UTF-8")
	}

	// MIME-Version
	headers = append(headers, "MIME-Version: 1.0")

	return strings.Join(headers, "\r\n")
}

// validateConfig 验证配置
func (c *EmailClient) validateConfig() error {
	if c.config.Host == "" {
		return fmt.Errorf("host is required")
	}
	if c.config.Port == 0 {
		return fmt.Errorf("port is required")
	}
	if c.config.Username == "" {
		return fmt.Errorf("username is required")
	}
	if c.config.Password == "" {
		return fmt.Errorf("password is required")
	}
	if c.config.FromAddr == "" {
		return fmt.Errorf("from_addr is required")
	}
	return nil
}

// validateMessage 验证消息
func (c *EmailClient) validateMessage(message *EmailMessage) error {
	if len(message.To) == 0 && len(message.Cc) == 0 && len(message.Bcc) == 0 {
		return fmt.Errorf("at least one recipient (To, Cc, or Bcc) is required")
	}
	if message.Subject == "" {
		return fmt.Errorf("subject is required")
	}
	if message.Body == "" {
		return fmt.Errorf("body is required")
	}
	return nil
}

// TestConnection 测试邮件连接
func (c *EmailClient) TestConnection() error {
	if err := c.validateConfig(); err != nil {
		return fmt.Errorf("invalid email config: %w", err)
	}

	addr := fmt.Sprintf("%s:%d", c.config.Host, c.config.Port)

	if c.config.UseSSL {
		// 测试 TLS 连接
		conn, err := tls.Dial("tcp", addr, &tls.Config{
			ServerName: c.config.Host,
		})
		if err != nil {
			return fmt.Errorf("failed to connect to SMTP server: %w", err)
		}
		conn.Close()
	} else {
		// 测试普通连接
		client, err := smtp.Dial(addr)
		if err != nil {
			return fmt.Errorf("failed to connect to SMTP server: %w", err)
		}
		defer client.Close()

		if c.config.UseTLS {
			// 测试 STARTTLS
			if err := client.StartTLS(&tls.Config{
				ServerName: c.config.Host,
			}); err != nil {
				return fmt.Errorf("failed to start TLS: %w", err)
			}
		}

		// 测试认证
		auth := smtp.PlainAuth("", c.config.Username, c.config.Password, c.config.Host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("failed to authenticate: %w", err)
		}
	}

	return nil
}
