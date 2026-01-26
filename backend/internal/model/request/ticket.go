package request

// CreateTicketRequest 创建工单请求
type CreateTicketRequest struct {
	Title       string                 `json:"title" binding:"required"`
	Description string                 `json:"description"`
	TypeID      uint                   `json:"type_id" binding:"required"`
	Priority    int                    `json:"priority"`
	FormData    map[string]interface{} `json:"form_data"`
}

// ListTicketRequest 工单列表请求
type ListTicketRequest struct {
	PageRequest
	Keyword   string `form:"keyword"`
	Status    string `form:"status"`
	TypeID    uint   `form:"type_id"`
	CreatorID uint   `form:"creator_id"`
}

// ApproveRequest 审批请求
type ApproveRequest struct {
	Approved bool   `json:"approved"`
	Comment  string `json:"comment"`
}

// TransferRequest 转交请求
type TransferRequest struct {
	TargetUserID uint `json:"target_user_id" binding:"required"`
}

// ReturnRequest 退回请求
type ReturnRequest struct {
	Comment   string `json:"comment"`
	ToCreator bool   `json:"to_creator"`
}

// DelegateRequest 转审请求
type DelegateRequest struct {
	TargetUserID uint   `json:"target_user_id" binding:"required"`
	Comment      string `json:"comment"`
}

// AddSignRequest 加签请求
type AddSignRequest struct {
	TargetUserID uint   `json:"target_user_id" binding:"required"`
	Comment      string `json:"comment"`
}
