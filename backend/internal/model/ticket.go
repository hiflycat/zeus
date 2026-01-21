package model

import "time"

// TicketType 工单类型
type TicketType struct {
	BaseModel
	Name        string `gorm:"type:varchar(100);not null" json:"name"`
	Description string `gorm:"type:varchar(500)" json:"description"`
	Icon        string `gorm:"type:varchar(100)" json:"icon"`
	Enabled     bool   `gorm:"default:true" json:"enabled"`
}

func (TicketType) TableName() string { return "ticket_types" }

// TicketStatus 工单状态常量
const (
	TicketStatusDraft      = "draft"
	TicketStatusPending    = "pending"
	TicketStatusApproved   = "approved"
	TicketStatusRejected   = "rejected"
	TicketStatusProcessing = "processing"
	TicketStatusCompleted  = "completed"
	TicketStatusCancelled  = "cancelled"
)

// TicketPriority 工单优先级常量
const (
	TicketPriorityLow    = 1
	TicketPriorityMedium = 2
	TicketPriorityHigh   = 3
	TicketPriorityUrgent = 4
)

// Ticket 工单
type Ticket struct {
	BaseModel
	Title         string     `gorm:"type:varchar(200);not null" json:"title"`
	Description   string     `gorm:"type:text" json:"description"`
	TypeID        uint       `gorm:"not null;index" json:"type_id"`
	Type          TicketType `gorm:"foreignKey:TypeID" json:"type,omitempty"`
	Priority      int        `gorm:"default:2" json:"priority"`
	Status        string     `gorm:"type:varchar(20);default:'draft';index" json:"status"`
	CreatorID     uint       `gorm:"not null;index" json:"creator_id"`
	Creator       User       `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	AssigneeID    *uint      `gorm:"index" json:"assignee_id"`
	Assignee      *User      `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
	CurrentNodeID *uint      `json:"current_node_id"`
	CompletedAt   *time.Time `json:"completed_at"`
}

func (Ticket) TableName() string { return "tickets" }

// ApprovalFlow 审批流程
type ApprovalFlow struct {
	BaseModel
	TypeID  uint   `gorm:"not null;uniqueIndex" json:"type_id"`
	Name    string `gorm:"type:varchar(100);not null" json:"name"`
	Enabled bool   `gorm:"default:true" json:"enabled"`
}

func (ApprovalFlow) TableName() string { return "approval_flows" }

// ApprovalNode 审批节点
type ApprovalNode struct {
	BaseModel
	FlowID      uint   `gorm:"not null;index" json:"flow_id"`
	Name        string `gorm:"type:varchar(100);not null" json:"name"`
	RoleID      uint   `gorm:"not null" json:"role_id"`
	Role        Role   `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	ApproveType string `gorm:"type:varchar(10);default:'or'" json:"approve_type"`
	SortOrder   int    `gorm:"default:0" json:"sort_order"`
}

func (ApprovalNode) TableName() string { return "approval_nodes" }

// ApprovalRecord 审批记录
type ApprovalRecord struct {
	BaseModel
	TicketID   uint   `gorm:"not null;index" json:"ticket_id"`
	NodeID     uint   `gorm:"not null" json:"node_id"`
	ApproverID uint   `gorm:"not null" json:"approver_id"`
	Approver   User   `gorm:"foreignKey:ApproverID" json:"approver,omitempty"`
	Result     string `gorm:"type:varchar(20)" json:"result"`
	Comment    string `gorm:"type:text" json:"comment"`
}

func (ApprovalRecord) TableName() string { return "approval_records" }

// TicketComment 工单评论
type TicketComment struct {
	BaseModel
	TicketID    uint   `gorm:"not null;index" json:"ticket_id"`
	UserID      uint   `gorm:"not null" json:"user_id"`
	User        User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Content     string `gorm:"type:text;not null" json:"content"`
	CommentType string `gorm:"type:varchar(20);default:'comment'" json:"comment_type"`
}

func (TicketComment) TableName() string { return "ticket_comments" }

// TicketAttachment 工单附件
type TicketAttachment struct {
	BaseModel
	TicketID    uint   `gorm:"not null;index" json:"ticket_id"`
	CommentID   *uint  `gorm:"index" json:"comment_id"`
	FileName    string `gorm:"type:varchar(255);not null" json:"file_name"`
	FileSize    int64  `gorm:"not null" json:"file_size"`
	MimeType    string `gorm:"type:varchar(100)" json:"mime_type"`
	StoragePath string `gorm:"type:varchar(500);not null" json:"storage_path"`
	UploaderID  uint   `gorm:"not null" json:"uploader_id"`
}

func (TicketAttachment) TableName() string { return "ticket_attachments" }

// TicketTemplate 工单模板
type TicketTemplate struct {
	BaseModel
	Name         string `gorm:"type:varchar(100);not null" json:"name"`
	Description  string `gorm:"type:varchar(500)" json:"description"`
	TypeID       uint   `gorm:"not null;index" json:"type_id"`
	PresetValues string `gorm:"type:text" json:"preset_values"`
	Enabled      bool   `gorm:"default:true" json:"enabled"`
	SortOrder    int    `gorm:"default:0" json:"sort_order"`
}

func (TicketTemplate) TableName() string { return "ticket_templates" }
