package model

import "time"

// ==================== 表单模板相关 ====================

// FormTemplate 表单模板
type FormTemplate struct {
	BaseModel
	Name        string      `gorm:"type:varchar(100);not null" json:"name"`
	Description string      `gorm:"type:varchar(500)" json:"description"`
	Enabled     bool        `gorm:"default:true" json:"enabled"`
	Fields      []FormField `gorm:"foreignKey:TemplateID" json:"fields,omitempty"`
}

func (FormTemplate) TableName() string { return "form_templates" }

// FormFieldType 表单字段类型常量
const (
	FormFieldTypeText       = "text"       // 单行文本
	FormFieldTypeTextarea   = "textarea"   // 多行文本
	FormFieldTypeNumber     = "number"     // 数字
	FormFieldTypeDate       = "date"       // 日期
	FormFieldTypeDatetime   = "datetime"   // 日期时间
	FormFieldTypeSelect     = "select"     // 下拉单选
	FormFieldTypeMultiSelect = "multiselect" // 下拉多选
	FormFieldTypeUser       = "user"       // 用户选择
	FormFieldTypeAttachment = "attachment" // 附件上传
	FormFieldTypeMoney      = "money"      // 金额
)

// FormField 表单字段
type FormField struct {
	BaseModel
	TemplateID   uint   `gorm:"not null;index" json:"template_id"`
	Name         string `gorm:"type:varchar(50);not null" json:"name"`           // 字段标识
	Label        string `gorm:"type:varchar(100);not null" json:"label"`         // 显示名称
	FieldType    string `gorm:"type:varchar(20);not null" json:"field_type"`     // 字段类型
	Required     bool   `gorm:"default:false" json:"required"`                   // 是否必填
	DefaultValue string `gorm:"type:text" json:"default_value"`                  // 默认值
	Options      string `gorm:"type:text" json:"options"`                        // 选项配置 JSON
	Validation   string `gorm:"type:text" json:"validation"`                     // 校验规则 JSON
	Placeholder  string `gorm:"type:varchar(200)" json:"placeholder"`            // 占位提示
	ShowCondition string `gorm:"type:text" json:"show_condition"`                // 显示条件 JSON
	SortOrder    int    `gorm:"default:0" json:"sort_order"`                     // 排序
}

func (FormField) TableName() string { return "form_fields" }

// ==================== 工单类型相关 ====================

// TicketType 工单类型
type TicketType struct {
	BaseModel
	Name        string        `gorm:"type:varchar(100);not null" json:"name"`
	Description string        `gorm:"type:varchar(500)" json:"description"`
	Icon        string        `gorm:"type:varchar(100)" json:"icon"`
	TemplateID  *uint         `gorm:"index" json:"template_id"`             // 关联表单模板
	Template    *FormTemplate `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
	FlowID      *uint         `gorm:"index" json:"flow_id"`                 // 关联审批流程
	Enabled     bool          `gorm:"default:true" json:"enabled"`
}

func (TicketType) TableName() string { return "ticket_types" }

// ==================== 审批流程相关 ====================

// ApprovalFlow 审批流程（重构：与工单类型解耦，支持版本管理）
type ApprovalFlow struct {
	BaseModel
	Name        string         `gorm:"type:varchar(100);not null" json:"name"`
	Description string         `gorm:"type:varchar(500)" json:"description"`
	Version     int            `gorm:"default:1" json:"version"`       // 版本号
	Enabled     bool           `gorm:"default:true" json:"enabled"`
	Nodes       []FlowNode     `gorm:"foreignKey:FlowID" json:"nodes,omitempty"`
}

func (ApprovalFlow) TableName() string { return "approval_flows" }

// FlowNodeType 流程节点类型常量
const (
	FlowNodeTypeApprove     = "approve"     // 审批节点
	FlowNodeTypeCountersign = "countersign" // 会签节点（多人全部通过）
	FlowNodeTypeOr          = "or"          // 或签节点（任一人通过）
	FlowNodeTypeCondition   = "condition"   // 条件节点
	FlowNodeTypeCC          = "cc"          // 抄送节点
)

// ApproverType 审批人类型常量
const (
	ApproverTypeRole      = "role"       // 指定角色
	ApproverTypeUser      = "user"       // 指定用户
	ApproverTypeFormField = "form_field" // 表单字段
)

// FlowNode 流程节点（重构：支持多种节点类型和审批人配置）
type FlowNode struct {
	BaseModel
	FlowID        uint   `gorm:"not null;index" json:"flow_id"`
	NodeType      string `gorm:"type:varchar(20);not null" json:"node_type"`       // 节点类型
	Name          string `gorm:"type:varchar(100);not null" json:"name"`           // 节点名称
	ApproverType  string `gorm:"type:varchar(20)" json:"approver_type"`            // 审批人类型
	ApproverValue string `gorm:"type:varchar(500)" json:"approver_value"`          // 审批人值（角色ID/用户ID/字段名）
	Condition     string `gorm:"type:text" json:"condition"`                       // 条件配置 JSON
	NextNodeID    *uint  `gorm:"index" json:"next_node_id"`                        // 下一节点ID（顺序流转）
	TrueBranchID  *uint  `gorm:"index" json:"true_branch_id"`                      // 条件为真时的分支节点ID
	FalseBranchID *uint  `gorm:"index" json:"false_branch_id"`                     // 条件为假时的分支节点ID
	SortOrder     int    `gorm:"default:0" json:"sort_order"`                      // 排序
	// 可视化编辑器位置信息
	PositionX     int    `gorm:"default:0" json:"position_x"`
	PositionY     int    `gorm:"default:0" json:"position_y"`
}

func (FlowNode) TableName() string { return "flow_nodes" }

// 兼容旧模型，保留 ApprovalNode 别名
type ApprovalNode = FlowNode

// ==================== 工单状态常量 ====================

const (
	TicketStatusDraft      = "draft"       // 草稿
	TicketStatusPending    = "pending"     // 待审批
	TicketStatusApproving  = "approving"   // 审批中
	TicketStatusApproved   = "approved"    // 已通过
	TicketStatusRejected   = "rejected"    // 已拒绝
	TicketStatusWithdrawn  = "withdrawn"   // 已撤回
	TicketStatusProcessing = "processing"  // 处理中
	TicketStatusCompleted  = "completed"   // 已完成
	TicketStatusCancelled  = "cancelled"   // 已取消
)

// TicketPriority 工单优先级常量
const (
	TicketPriorityLow    = 1
	TicketPriorityMedium = 2
	TicketPriorityHigh   = 3
	TicketPriorityUrgent = 4
)

// ==================== 工单主表 ====================

// Ticket 工单
type Ticket struct {
	BaseModel
	Title           string           `gorm:"type:varchar(200);not null" json:"title"`
	Description     string           `gorm:"type:text" json:"description"`
	TypeID          uint             `gorm:"not null;index" json:"type_id"`
	Type            TicketType       `gorm:"foreignKey:TypeID" json:"type,omitempty"`
	Priority        int              `gorm:"default:2" json:"priority"`
	Status          string           `gorm:"type:varchar(20);default:'draft';index" json:"status"`
	CreatorID       uint             `gorm:"not null;index" json:"creator_id"`
	Creator         User             `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	AssigneeID      *uint            `gorm:"index" json:"assignee_id"`
	Assignee        *User            `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
	FlowID          *uint            `gorm:"index" json:"flow_id"`                // 关联的审批流程ID
	FlowVersion     int              `gorm:"default:0" json:"flow_version"`       // 提交时的流程版本
	CurrentNodeID   *uint            `gorm:"index" json:"current_node_id"`        // 当前节点ID
	CurrentNode     *FlowNode        `gorm:"foreignKey:CurrentNodeID" json:"current_node,omitempty"`
	CompletedAt     *time.Time       `json:"completed_at"`
	Data            []TicketData     `gorm:"foreignKey:TicketID" json:"data,omitempty"`
	Comments        []TicketComment  `gorm:"foreignKey:TicketID" json:"comments,omitempty"`
	Attachments     []TicketAttachment `gorm:"foreignKey:TicketID" json:"attachments,omitempty"`
	ApprovalRecords []ApprovalRecord `gorm:"foreignKey:TicketID" json:"approval_records,omitempty"`
}

func (Ticket) TableName() string { return "tickets" }

// ==================== 工单表单数据 ====================

// TicketData 工单表单数据
type TicketData struct {
	BaseModel
	TicketID uint   `gorm:"not null;index" json:"ticket_id"`
	FieldID  uint   `gorm:"not null;index" json:"field_id"`          // 关联表单字段
	Field    *FormField `gorm:"foreignKey:FieldID" json:"field,omitempty"`
	Value    string `gorm:"type:text" json:"value"`                  // 字段值
}

func (TicketData) TableName() string { return "ticket_data" }

// ==================== 审批记录相关 ====================

// ApprovalAction 审批操作类型常量
const (
	ApprovalActionApprove  = "approve"  // 通过
	ApprovalActionReject   = "reject"   // 拒绝
	ApprovalActionReturn   = "return"   // 退回
	ApprovalActionDelegate = "delegate" // 转审
	ApprovalActionAddSign  = "addsign"  // 加签
	ApprovalActionCC       = "cc"       // 抄送
	ApprovalActionUrge     = "urge"     // 催办
)

// ApprovalRecord 审批记录
type ApprovalRecord struct {
	BaseModel
	TicketID    uint      `gorm:"not null;index" json:"ticket_id"`
	NodeID      uint      `gorm:"not null;index" json:"node_id"`
	Node        *FlowNode `gorm:"foreignKey:NodeID" json:"node,omitempty"`
	ApproverID  uint      `gorm:"not null;index" json:"approver_id"`
	Approver    User      `gorm:"foreignKey:ApproverID" json:"approver,omitempty"`
	Action      string    `gorm:"type:varchar(20);not null" json:"action"`          // 操作类型
	Result      string    `gorm:"type:varchar(20)" json:"result"`                   // 审批结果
	Comment     string    `gorm:"type:text" json:"comment"`                         // 审批意见
	DelegateToID *uint    `gorm:"index" json:"delegate_to_id"`                      // 转审/加签目标用户
	DelegateTo  *User     `gorm:"foreignKey:DelegateToID" json:"delegate_to,omitempty"`
}

func (ApprovalRecord) TableName() string { return "approval_records" }

// ==================== 工单评论 ====================

// CommentType 评论类型常量
const (
	CommentTypeComment  = "comment"  // 普通评论
	CommentTypeSystem   = "system"   // 系统消息
	CommentTypeApproval = "approval" // 审批意见
)

// TicketComment 工单评论
type TicketComment struct {
	BaseModel
	TicketID    uint   `gorm:"not null;index" json:"ticket_id"`
	UserID      uint   `gorm:"not null;index" json:"user_id"`
	User        User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Content     string `gorm:"type:text;not null" json:"content"`
	CommentType string `gorm:"type:varchar(20);default:'comment'" json:"comment_type"`
}

func (TicketComment) TableName() string { return "ticket_comments" }

// ==================== 工单附件 ====================

// TicketAttachment 工单附件
type TicketAttachment struct {
	BaseModel
	TicketID    uint   `gorm:"not null;index" json:"ticket_id"`
	CommentID   *uint  `gorm:"index" json:"comment_id"`
	FileName    string `gorm:"type:varchar(255);not null" json:"file_name"`
	FileSize    int64  `gorm:"not null" json:"file_size"`
	MimeType    string `gorm:"type:varchar(100)" json:"mime_type"`
	StoragePath string `gorm:"type:varchar(500);not null" json:"storage_path"`
	UploaderID  uint   `gorm:"not null;index" json:"uploader_id"`
	Uploader    *User  `gorm:"foreignKey:UploaderID" json:"uploader,omitempty"`
}

func (TicketAttachment) TableName() string { return "ticket_attachments" }

// ==================== 工单模板（快捷模板，复用表单模板） ====================

// TicketTemplate 工单快捷模板（用于快速创建工单的预设值）
type TicketTemplate struct {
	BaseModel
	Name         string `gorm:"type:varchar(100);not null" json:"name"`
	Description  string `gorm:"type:varchar(500)" json:"description"`
	TypeID       uint   `gorm:"not null;index" json:"type_id"`
	Type         *TicketType `gorm:"foreignKey:TypeID" json:"type,omitempty"`
	PresetValues string `gorm:"type:text" json:"preset_values"`          // 预设的表单值 JSON
	Enabled      bool   `gorm:"default:true" json:"enabled"`
	SortOrder    int    `gorm:"default:0" json:"sort_order"`
}

func (TicketTemplate) TableName() string { return "ticket_templates" }
