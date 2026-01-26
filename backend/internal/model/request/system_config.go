package request

// TestEmailRequest 测试邮箱请求
type TestEmailRequest struct {
	To string `json:"to" binding:"required"`
}

// UpdateStorageConfigRequest 更新存储配置请求
type UpdateStorageConfigRequest struct {
	Value string `json:"value"`
}

// UpdateNotifyConfigRequest 更新通知配置请求
type UpdateNotifyConfigRequest struct {
	DingTalk string `json:"dingtalk"`
	WeChat   string `json:"wechat"`
}
