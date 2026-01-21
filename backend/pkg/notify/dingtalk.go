package notify

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// DingTalkNotifier 钉钉通知
type DingTalkNotifier struct {
	config *DingTalkConfig
}

// NewDingTalkNotifier 创建钉钉通知
func NewDingTalkNotifier(cfg *DingTalkConfig) *DingTalkNotifier {
	return &DingTalkNotifier{config: cfg}
}

// Send 发送钉钉消息
func (n *DingTalkNotifier) Send(to string, title string, content string) error {
	if !n.config.Enabled {
		return nil
	}

	webhook := n.config.Webhook

	// 如果配置了签名密钥，添加签名
	if n.config.Secret != "" {
		timestamp := time.Now().UnixMilli()
		sign := n.sign(timestamp)
		webhook = fmt.Sprintf("%s&timestamp=%d&sign=%s", webhook, timestamp, url.QueryEscape(sign))
	}

	// 构建消息体
	msg := map[string]interface{}{
		"msgtype": "markdown",
		"markdown": map[string]string{
			"title": title,
			"text":  fmt.Sprintf("### %s\n\n%s", title, content),
		},
	}

	body, _ := json.Marshal(msg)
	resp, err := http.Post(webhook, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("发送钉钉消息失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("钉钉返回错误状态码: %d", resp.StatusCode)
	}

	return nil
}

// sign 生成签名
func (n *DingTalkNotifier) sign(timestamp int64) string {
	stringToSign := fmt.Sprintf("%d\n%s", timestamp, n.config.Secret)
	h := hmac.New(sha256.New, []byte(n.config.Secret))
	h.Write([]byte(stringToSign))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}
