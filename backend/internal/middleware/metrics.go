package middleware

import (
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Metrics 性能指标
type Metrics struct {
	mu sync.RWMutex

	// HTTP 请求总数
	requestsTotal map[string]int64 // key: method_path_status

	// HTTP 请求耗时（毫秒）
	requestDuration map[string][]float64 // key: method_path

	// HTTP 请求大小（字节）
	requestSize map[string][]int64 // key: method_path

	// HTTP 响应大小（字节）
	responseSize map[string][]int64 // key: method_path

	// 慢请求计数（超过阈值的请求）
	slowRequests map[string]int64 // key: method_path

	// 错误请求计数
	errorsTotal map[string]int64 // key: method_path_status

	// 慢请求阈值（毫秒）
	slowRequestThreshold int64
}

var globalMetrics = &Metrics{
	requestsTotal:        make(map[string]int64),
	requestDuration:      make(map[string][]float64),
	requestSize:          make(map[string][]int64),
	responseSize:         make(map[string][]int64),
	slowRequests:         make(map[string]int64),
	errorsTotal:          make(map[string]int64),
	slowRequestThreshold: 1000, // 默认 1 秒
}

// MetricsMiddleware 性能监控中间件
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		method := c.Request.Method
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		// 获取请求大小
		requestSize := c.Request.ContentLength
		if requestSize < 0 {
			requestSize = 0
		}

		// 处理请求
		c.Next()

		// 计算耗时
		duration := time.Since(start)
		durationMs := float64(duration.Nanoseconds()) / 1e6

		// 获取响应状态码
		status := c.Writer.Status()
		statusStr := strconv.Itoa(status)

		// 获取响应大小
		responseSize := int64(c.Writer.Size())

		// 更新指标
		globalMetrics.mu.Lock()
		defer globalMetrics.mu.Unlock()

		// 请求总数
		key := method + "_" + path + "_" + statusStr
		globalMetrics.requestsTotal[key]++

		// 请求耗时
		durationKey := method + "_" + path
		if globalMetrics.requestDuration[durationKey] == nil {
			globalMetrics.requestDuration[durationKey] = make([]float64, 0, 100)
		}
		globalMetrics.requestDuration[durationKey] = append(globalMetrics.requestDuration[durationKey], durationMs)
		// 只保留最近 100 条记录
		if len(globalMetrics.requestDuration[durationKey]) > 100 {
			globalMetrics.requestDuration[durationKey] = globalMetrics.requestDuration[durationKey][len(globalMetrics.requestDuration[durationKey])-100:]
		}

		// 请求大小
		if globalMetrics.requestSize[durationKey] == nil {
			globalMetrics.requestSize[durationKey] = make([]int64, 0, 100)
		}
		globalMetrics.requestSize[durationKey] = append(globalMetrics.requestSize[durationKey], requestSize)
		if len(globalMetrics.requestSize[durationKey]) > 100 {
			globalMetrics.requestSize[durationKey] = globalMetrics.requestSize[durationKey][len(globalMetrics.requestSize[durationKey])-100:]
		}

		// 响应大小
		if globalMetrics.responseSize[durationKey] == nil {
			globalMetrics.responseSize[durationKey] = make([]int64, 0, 100)
		}
		globalMetrics.responseSize[durationKey] = append(globalMetrics.responseSize[durationKey], responseSize)
		if len(globalMetrics.responseSize[durationKey]) > 100 {
			globalMetrics.responseSize[durationKey] = globalMetrics.responseSize[durationKey][len(globalMetrics.responseSize[durationKey])-100:]
		}

		// 慢请求
		if int64(durationMs) > globalMetrics.slowRequestThreshold {
			globalMetrics.slowRequests[durationKey]++
		}

		// 错误请求（4xx 和 5xx）
		if status >= 400 {
			globalMetrics.errorsTotal[key]++
		}
	}
}

// GetMetrics 获取 Prometheus 格式的指标
func GetMetrics() string {
	globalMetrics.mu.RLock()
	defer globalMetrics.mu.RUnlock()

	var result string

	// HTTP 请求总数（counter）
	for key, count := range globalMetrics.requestsTotal {
		result += formatCounter("http_requests_total", key, count)
	}

	// HTTP 请求耗时（histogram）
	for key, durations := range globalMetrics.requestDuration {
		if len(durations) > 0 {
			result += formatHistogram("http_request_duration_seconds", key, durations)
		}
	}

	// HTTP 请求大小（histogram）
	for key, sizes := range globalMetrics.requestSize {
		if len(sizes) > 0 {
			result += formatHistogramBytes("http_request_size_bytes", key, sizes)
		}
	}

	// HTTP 响应大小（histogram）
	for key, sizes := range globalMetrics.responseSize {
		if len(sizes) > 0 {
			result += formatHistogramBytes("http_response_size_bytes", key, sizes)
		}
	}

	// 慢请求计数（counter）
	for key, count := range globalMetrics.slowRequests {
		result += formatCounter("http_slow_requests_total", key, count)
	}

	// 错误请求计数（counter）
	for key, count := range globalMetrics.errorsTotal {
		result += formatCounter("http_errors_total", key, count)
	}

	return result
}

// formatCounter 格式化 counter 指标
func formatCounter(metricName string, key string, count int64) string {
	// key 格式: method_path_status
	parts := parseKey(key)
	if len(parts) < 2 {
		return ""
	}
	method := parts[0]
	path := parts[1]
	status := ""
	if len(parts) >= 3 {
		status = parts[2]
	}

	labels := `method="` + method + `",path="` + path + `"`
	if status != "" {
		labels += `,status="` + status + `"`
	}

	return metricName + "{" + labels + "} " + strconv.FormatInt(count, 10) + "\n"
}

// formatHistogram 格式化 histogram 指标（秒）
func formatHistogram(metricName, key string, values []float64) string {
	parts := parseKey(key)
	if len(parts) < 2 {
		return ""
	}
	method := parts[0]
	path := parts[1]

	labels := `method="` + method + `",path="` + path + `"`

	// 计算统计值
	var sum float64
	var min, max float64 = values[0], values[0]
	for _, v := range values {
		sum += v / 1000.0 // 转换为秒
		if v/1000.0 < min {
			min = v / 1000.0
		}
		if v/1000.0 > max {
			max = v / 1000.0
		}
	}
	count := len(values)
	avg := sum / float64(count)

	result := metricName + "_sum{" + labels + "} " + strconv.FormatFloat(sum, 'f', 6, 64) + "\n"
	result += metricName + "_count{" + labels + "} " + strconv.Itoa(count) + "\n"
	result += metricName + "_avg{" + labels + "} " + strconv.FormatFloat(avg, 'f', 6, 64) + "\n"
	result += metricName + "_min{" + labels + "} " + strconv.FormatFloat(min, 'f', 6, 64) + "\n"
	result += metricName + "_max{" + labels + "} " + strconv.FormatFloat(max, 'f', 6, 64) + "\n"

	return result
}

// formatHistogramBytes 格式化 histogram 指标（字节）
func formatHistogramBytes(metricName, key string, values []int64) string {
	parts := parseKey(key)
	if len(parts) < 2 {
		return ""
	}
	method := parts[0]
	path := parts[1]

	labels := `method="` + method + `",path="` + path + `"`

	// 计算统计值
	var sum int64
	var min, max int64 = values[0], values[0]
	for _, v := range values {
		sum += v
		if v < min {
			min = v
		}
		if v > max {
			max = v
		}
	}
	count := len(values)
	avg := float64(sum) / float64(count)

	result := metricName + "_sum{" + labels + "} " + strconv.FormatInt(sum, 10) + "\n"
	result += metricName + "_count{" + labels + "} " + strconv.Itoa(count) + "\n"
	result += metricName + "_avg{" + labels + "} " + strconv.FormatFloat(avg, 'f', 2, 64) + "\n"
	result += metricName + "_min{" + labels + "} " + strconv.FormatInt(min, 10) + "\n"
	result += metricName + "_max{" + labels + "} " + strconv.FormatInt(max, 10) + "\n"

	return result
}

// parseKey 解析 key
func parseKey(key string) []string {
	parts := make([]string, 0)
	lastIndex := 0
	for i := 0; i < len(key); i++ {
		if key[i] == '_' {
			if i > lastIndex {
				parts = append(parts, key[lastIndex:i])
			}
			lastIndex = i + 1
		}
	}
	if lastIndex < len(key) {
		parts = append(parts, key[lastIndex:])
	}
	return parts
}
