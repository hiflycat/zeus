package notify

// Notifier 通知接口
type Notifier interface {
	Send(to string, title string, content string) error
}

// Config 通知配置
type Config struct {
	DingTalk DingTalkConfig `json:"dingtalk"`
	WeChat   WeChatConfig   `json:"wechat"`
}

// DingTalkConfig 钉钉配置
type DingTalkConfig struct {
	Enabled bool   `json:"enabled"`
	Webhook string `json:"webhook"` // 机器人 Webhook 地址
	Secret  string `json:"secret"`  // 签名密钥（可选）
}

// WeChatConfig 企业微信配置
type WeChatConfig struct {
	Enabled bool   `json:"enabled"`
	CorpID  string `json:"corp_id"`  // 企业ID
	AgentID int    `json:"agent_id"` // 应用ID
	Secret  string `json:"secret"`   // 应用密钥
}
