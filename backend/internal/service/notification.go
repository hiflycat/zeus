package service

import (
	"encoding/json"
	"fmt"

	"backend/internal/model"
	"backend/migrations"
	"backend/pkg/email"
	"backend/pkg/notify"
)

// NotificationService 通知服务
type NotificationService struct {
	configSvc *SystemConfigService
}

// NewNotificationService 创建通知服务
func NewNotificationService() *NotificationService {
	return &NotificationService{
		configSvc: NewSystemConfigService(),
	}
}

// NotifyTicketCreated 工单创建通知
func (s *NotificationService) NotifyTicketCreated(ticket *model.Ticket) {
	var creator model.User
	migrations.GetDB().First(&creator, ticket.CreatorID)

	title := fmt.Sprintf("新工单: %s", ticket.Title)
	content := fmt.Sprintf("工单编号: #%d\n创建人: %s\n优先级: %s\n\n%s",
		ticket.ID, creator.Username, getPriorityText(ticket.Priority), ticket.Description)

	s.sendNotification(title, content)
}

// NotifyTicketApproved 工单审批通知
func (s *NotificationService) NotifyTicketApproved(ticket *model.Ticket, approved bool, comment string) {
	var creator model.User
	migrations.GetDB().First(&creator, ticket.CreatorID)

	status := "已通过"
	if !approved {
		status = "已拒绝"
	}

	title := fmt.Sprintf("工单审批结果: %s", ticket.Title)
	content := fmt.Sprintf("工单编号: #%d\n审批结果: %s\n审批意见: %s",
		ticket.ID, status, comment)

	s.sendToUser(creator.ID, title, content)
}

// NotifyTicketCompleted 工单完成通知
func (s *NotificationService) NotifyTicketCompleted(ticket *model.Ticket) {
	var creator model.User
	migrations.GetDB().First(&creator, ticket.CreatorID)

	title := fmt.Sprintf("工单已完成: %s", ticket.Title)
	content := fmt.Sprintf("工单编号: #%d\n状态: 已完成", ticket.ID)

	s.sendToUser(creator.ID, title, content)
}

// NotifyPendingApproval 待审批通知
func (s *NotificationService) NotifyPendingApproval(ticket *model.Ticket, approverIDs []uint) {
	title := fmt.Sprintf("待审批工单: %s", ticket.Title)
	content := fmt.Sprintf("工单编号: #%d\n请及时处理", ticket.ID)

	for _, userID := range approverIDs {
		s.sendToUser(userID, title, content)
	}
}

// sendNotification 发送通知（广播）
func (s *NotificationService) sendNotification(title, content string) {
	s.sendByEmail("", title, content)
	s.sendByDingTalk(title, content)
	s.sendByWeChat("@all", title, content)
}

// sendToUser 发送通知给指定用户
func (s *NotificationService) sendToUser(userID uint, title, content string) {
	var user model.User
	if err := migrations.GetDB().First(&user, userID).Error; err != nil {
		return
	}

	if user.Email != "" {
		s.sendByEmail(user.Email, title, content)
	}
	s.sendByDingTalk(title, content)
	s.sendByWeChat(user.Username, title, content)
}

// sendByEmail 发送邮件
func (s *NotificationService) sendByEmail(to, title, content string) {
	cfg, err := s.configSvc.GetEmailConfig()
	if err != nil || cfg == nil || !cfg.Enabled {
		return
	}

	client := email.NewEmailClient(&email.EmailConfig{
		Host:     cfg.Host,
		Port:     cfg.Port,
		Username: cfg.Username,
		Password: cfg.Password,
		From:     cfg.From,
		FromAddr: cfg.FromAddr,
		UseTLS:   cfg.UseTLS,
		UseSSL:   cfg.UseSSL,
	})
	msg := &email.EmailMessage{
		To:      []string{to},
		Subject: title,
		Body:    content,
		IsHTML:  false,
	}
	client.Send(msg)
}

// sendByDingTalk 发送钉钉通知
func (s *NotificationService) sendByDingTalk(title, content string) {
	config, err := s.configSvc.GetByKey("notify.dingtalk")
	if err != nil || config == nil || config.Value == "" {
		return
	}

	var cfg notify.DingTalkConfig
	if err := json.Unmarshal([]byte(config.Value), &cfg); err != nil {
		return
	}

	notifier := notify.NewDingTalkNotifier(&cfg)
	notifier.Send("", title, content)
}

// sendByWeChat 发送企业微信通知
func (s *NotificationService) sendByWeChat(to, title, content string) {
	config, err := s.configSvc.GetByKey("notify.wechat")
	if err != nil || config == nil || config.Value == "" {
		return
	}

	var cfg notify.WeChatConfig
	if err := json.Unmarshal([]byte(config.Value), &cfg); err != nil {
		return
	}

	notifier := notify.NewWeChatNotifier(&cfg)
	notifier.Send(to, title, content)
}

// getPriorityText 获取优先级文本
func getPriorityText(priority int) string {
	switch priority {
	case model.TicketPriorityLow:
		return "低"
	case model.TicketPriorityMedium:
		return "中"
	case model.TicketPriorityHigh:
		return "高"
	case model.TicketPriorityUrgent:
		return "紧急"
	default:
		return "中"
	}
}
