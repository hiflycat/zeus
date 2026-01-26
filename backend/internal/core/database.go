package core

import (
	"backend/internal/global"
	"backend/internal/model"
	"backend/internal/model/sso"
)

// Migrate 执行数据库迁移
func Migrate() error {
	db := global.GetDB()

	// 迁移现有模型
	if err := db.AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.APIDefinition{},
		&model.Menu{},
		&model.SystemConfig{},
		&model.NavigationCategory{},
		&model.Navigation{},
		// 表单模板相关
		&model.FormTemplate{},
		&model.FormField{},
		// 审批流程相关
		&model.ApprovalFlow{},
		&model.FlowNode{},
		// 工单相关模型
		&model.TicketType{},
		&model.Ticket{},
		&model.TicketData{},
		&model.ApprovalRecord{},
		&model.TicketComment{},
		&model.TicketAttachment{},
		&model.TicketTemplate{},
	); err != nil {
		return err
	}

	// 迁移 SSO 模型
	return db.AutoMigrate(
		&sso.Tenant{},
		&sso.User{},
		&sso.Group{},
		&sso.OIDCClient{},
		&sso.AuthorizationCode{},
		&sso.AccessToken{},
		&sso.RefreshToken{},
		&sso.UserSession{},
		&sso.UserConsent{},
	)
}
