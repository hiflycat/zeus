package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// WeChatNotifier 企业微信通知
type WeChatNotifier struct {
	config      *WeChatConfig
	accessToken string
	tokenExpiry time.Time
	mu          sync.Mutex
}

// NewWeChatNotifier 创建企业微信通知
func NewWeChatNotifier(cfg *WeChatConfig) *WeChatNotifier {
	return &WeChatNotifier{config: cfg}
}

// Send 发送企业微信消息
func (n *WeChatNotifier) Send(to string, title string, content string) error {
	if !n.config.Enabled {
		return nil
	}

	token, err := n.getAccessToken()
	if err != nil {
		return err
	}

	// 构建消息体
	msg := map[string]interface{}{
		"touser":  to,
		"msgtype": "text",
		"agentid": n.config.AgentID,
		"text": map[string]string{
			"content": fmt.Sprintf("%s\n\n%s", title, content),
		},
	}

	body, _ := json.Marshal(msg)
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=%s", token)
	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("发送企业微信消息失败: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}
	if result.ErrCode != 0 {
		return fmt.Errorf("企业微信返回错误: %s", result.ErrMsg)
	}

	return nil
}

// getAccessToken 获取 access_token
func (n *WeChatNotifier) getAccessToken() (string, error) {
	n.mu.Lock()
	defer n.mu.Unlock()

	// 如果 token 未过期，直接返回
	if n.accessToken != "" && time.Now().Before(n.tokenExpiry) {
		return n.accessToken, nil
	}

	// 获取新 token
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s",
		n.config.CorpID, n.config.Secret)
	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("获取企业微信 access_token 失败: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		ErrCode     int    `json:"errcode"`
		ErrMsg      string `json:"errmsg"`
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}
	if result.ErrCode != 0 {
		return "", fmt.Errorf("获取 access_token 失败: %s", result.ErrMsg)
	}

	n.accessToken = result.AccessToken
	n.tokenExpiry = time.Now().Add(time.Duration(result.ExpiresIn-60) * time.Second)

	return n.accessToken, nil
}
