package handler

import (
	"github.com/gin-gonic/gin"
	"backend/internal/service"
	"backend/pkg/email"
	"backend/pkg/response"
)

// SystemConfigHandler 系统配置处理器
type SystemConfigHandler struct {
	systemConfigService *service.SystemConfigService
}

// NewSystemConfigHandler 创建系统配置处理器
func NewSystemConfigHandler() *SystemConfigHandler {
	return &SystemConfigHandler{
		systemConfigService: service.NewSystemConfigService(),
	}
}

// GetOIDCConfig 获取 OIDC 配置
func (h *SystemConfigHandler) GetOIDCConfig(c *gin.Context) {
	config, err := h.systemConfigService.GetOIDCConfig()
	if err != nil {
		response.InternalError(c, "获取 OIDC 配置失败: "+err.Error())
		return
	}
	response.Success(c, config)
}

// UpdateOIDCConfig 更新 OIDC 配置
func (h *SystemConfigHandler) UpdateOIDCConfig(c *gin.Context) {
	var config service.OIDCConfigData
	if err := c.ShouldBindJSON(&config); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 验证配置
	if err := config.Validate(); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.systemConfigService.UpdateOIDCConfig(&config); err != nil {
		response.InternalError(c, "更新 OIDC 配置失败: "+err.Error())
		return
	}

	response.Success(c, nil)
}

// GetEmailConfig 获取邮箱配置
func (h *SystemConfigHandler) GetEmailConfig(c *gin.Context) {
	emailConfig, err := h.systemConfigService.GetEmailConfig()
	if err != nil {
		response.InternalError(c, "获取邮箱配置失败: "+err.Error())
		return
	}
	response.Success(c, emailConfig)
}

// UpdateEmailConfig 更新邮箱配置
func (h *SystemConfigHandler) UpdateEmailConfig(c *gin.Context) {
	var req service.EmailConfigData
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := h.systemConfigService.UpdateEmailConfig(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "邮箱配置更新成功"})
}

// TestEmail 测试邮箱配置
func (h *SystemConfigHandler) TestEmail(c *gin.Context) {
	var req struct {
		To string `json:"to" binding:"required"` // 测试收件人邮箱
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 获取邮箱配置
	emailConfig, err := h.systemConfigService.GetEmailConfig()
	if err != nil {
		response.InternalError(c, "获取邮箱配置失败: "+err.Error())
		return
	}

	if !emailConfig.Enabled {
		response.BadRequest(c, "邮箱功能未启用")
		return
	}

	// 创建邮件客户端
	client := email.NewEmailClient(&email.EmailConfig{
		Host:     emailConfig.Host,
		Port:     emailConfig.Port,
		Username: emailConfig.Username,
		Password: emailConfig.Password,
		From:     emailConfig.From,
		FromAddr: emailConfig.FromAddr,
		UseTLS:   emailConfig.UseTLS,
		UseSSL:   emailConfig.UseSSL,
	})

	// 发送测试邮件
	message := &email.EmailMessage{
		To:      []string{req.To},
		Subject: "测试邮件",
		Body:    "这是一封测试邮件，如果您收到此邮件，说明邮箱配置正确。",
		IsHTML:  false,
	}

	if err := client.Send(message); err != nil {
		response.BadRequest(c, "发送测试邮件失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{"message": "测试邮件发送成功"})
}
