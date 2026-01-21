package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"backend/internal/model"
	"backend/internal/service"
	"backend/pkg/response"
)

type CommentHandler struct {
	svc *service.CommentService
}

func NewCommentHandler() *CommentHandler {
	return &CommentHandler{svc: service.NewCommentService()}
}

// Create 创建评论
func (h *CommentHandler) Create(c *gin.Context) {
	ticketID, _ := strconv.ParseUint(c.Param("ticket_id"), 10, 32)
	userID, _ := c.Get("user_id")

	var req struct {
		Content     string `json:"content" binding:"required"`
		CommentType string `json:"comment_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请输入评论内容")
		return
	}

	commentType := req.CommentType
	if commentType == "" {
		commentType = "comment"
	}

	comment := model.TicketComment{
		TicketID:    uint(ticketID),
		UserID:      userID.(uint),
		Content:     req.Content,
		CommentType: commentType,
	}

	if err := h.svc.Create(&comment); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, comment)
}

// Delete 删除评论
func (h *CommentHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID, _ := c.Get("user_id")

	if err := h.svc.Delete(uint(id), userID.(uint)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// List 获取工单的评论列表
func (h *CommentHandler) List(c *gin.Context) {
	ticketID, _ := strconv.ParseUint(c.Param("ticket_id"), 10, 32)

	comments, err := h.svc.GetByTicketID(uint(ticketID))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, comments)
}
