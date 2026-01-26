package request

// CreateCommentRequest 创建评论请求
type CreateCommentRequest struct {
	Content     string `json:"content" binding:"required"`
	CommentType string `json:"comment_type"`
}
