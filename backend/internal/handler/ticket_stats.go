package handler

import (
	"backend/internal/model"
	"backend/migrations"
	"backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type TicketStatsHandler struct{}

func NewTicketStatsHandler() *TicketStatsHandler {
	return &TicketStatsHandler{}
}

// GetStats 获取工单统计
func (h *TicketStatsHandler) GetStats(c *gin.Context) {
	var stats struct {
		Total      int64            `json:"total"`
		ByStatus   map[string]int64 `json:"by_status"`
		ByType     []TypeCount      `json:"by_type"`
		ByPriority map[int]int64    `json:"by_priority"`
	}

	db := migrations.GetDB()

	// 总数
	db.Model(&model.Ticket{}).Count(&stats.Total)

	// 按状态统计
	stats.ByStatus = make(map[string]int64)
	var statusCounts []struct {
		Status string
		Count  int64
	}
	db.Model(&model.Ticket{}).Select("status, count(*) as count").Group("status").Scan(&statusCounts)
	for _, sc := range statusCounts {
		stats.ByStatus[sc.Status] = sc.Count
	}

	// 按类型统计
	db.Model(&model.Ticket{}).
		Select("ticket_types.name as type_name, count(*) as count").
		Joins("LEFT JOIN ticket_types ON tickets.type_id = ticket_types.id").
		Group("tickets.type_id").
		Scan(&stats.ByType)

	// 按优先级统计
	stats.ByPriority = make(map[int]int64)
	var priorityCounts []struct {
		Priority int
		Count    int64
	}
	db.Model(&model.Ticket{}).Select("priority, count(*) as count").Group("priority").Scan(&priorityCounts)
	for _, pc := range priorityCounts {
		stats.ByPriority[pc.Priority] = pc.Count
	}

	response.Success(c, stats)
}

type TypeCount struct {
	TypeName string `json:"type_name"`
	Count    int64  `json:"count"`
}
