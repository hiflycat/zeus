package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"backend/internal/service"
	"backend/internal/model/response"
)

type AttachmentHandler struct {
	svc *service.AttachmentService
}

func NewAttachmentHandler() *AttachmentHandler {
	return &AttachmentHandler{svc: service.NewAttachmentService()}
}

// Upload 上传附件
func (h *AttachmentHandler) Upload(c *gin.Context) {
	ticketID, _ := strconv.ParseUint(c.Param("ticket_id"), 10, 32)
	userID, _ := c.Get("user_id")

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "请选择要上传的文件")
		return
	}
	defer file.Close()

	var commentID *uint
	if cid := c.PostForm("comment_id"); cid != "" {
		id, _ := strconv.ParseUint(cid, 10, 32)
		uid := uint(id)
		commentID = &uid
	}

	attachment, err := h.svc.Upload(
		c.Request.Context(),
		uint(ticketID),
		commentID,
		userID.(uint),
		header.Filename,
		header.Size,
		header.Header.Get("Content-Type"),
		file,
	)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, attachment)
}

// Delete 删除附件
func (h *AttachmentHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// List 获取工单的附件列表
func (h *AttachmentHandler) List(c *gin.Context) {
	ticketID, _ := strconv.ParseUint(c.Param("ticket_id"), 10, 32)
	attachments, err := h.svc.GetByTicketID(uint(ticketID))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, attachments)
}

// GetDownloadURL 获取附件下载URL
func (h *AttachmentHandler) GetDownloadURL(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	url, err := h.svc.GetDownloadURL(c.Request.Context(), uint(id))
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, gin.H{"url": url})
}
