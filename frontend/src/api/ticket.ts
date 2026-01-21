import request from './request'

// ========== 表单模板相关类型 ==========
export interface FormTemplate {
  id?: number
  name: string
  description?: string
  enabled: boolean
  fields?: FormField[]
  created_at?: string
  updated_at?: string
}

export interface FormField {
  id?: number
  template_id?: number
  name: string
  label: string
  field_type: string
  required: boolean
  default_value?: string
  options?: string
  validation?: string
  placeholder?: string
  show_condition?: string
  sort_order: number
}

// 字段类型常量
export const FORM_FIELD_TYPES = {
  text: '单行文本',
  textarea: '多行文本',
  number: '数字',
  date: '日期',
  datetime: '日期时间',
  select: '下拉单选',
  multiselect: '下拉多选',
  user: '用户选择',
  attachment: '附件上传',
  money: '金额',
} as const

// ========== 工单类型相关类型 ==========
export interface TicketType {
  id?: number
  name: string
  description?: string
  icon?: string
  template_id?: number
  template?: FormTemplate
  flow_id?: number
  enabled: boolean
  created_at?: string
  updated_at?: string
}

// 工单快捷模板
export interface TicketTemplate {
  id?: number
  name: string
  description?: string
  type_id: number
  type?: TicketType
  preset_values?: string
  enabled: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

// ========== 审批流程相关类型 ==========
export interface ApprovalFlow {
  id?: number
  name: string
  description?: string
  version: number
  enabled: boolean
  nodes?: FlowNode[]
  created_at?: string
  updated_at?: string
}

// 流程节点
export interface FlowNode {
  id?: number
  flow_id?: number
  node_type: string
  name: string
  approver_type?: string
  approver_value?: string
  condition?: string
  next_node_id?: number
  true_branch_id?: number
  false_branch_id?: number
  sort_order: number
  position_x: number
  position_y: number
}

// 节点类型常量
export const FLOW_NODE_TYPES = {
  approve: '审批节点',
  countersign: '会签节点',
  or: '或签节点',
  condition: '条件节点',
  cc: '抄送节点',
} as const

// 审批人类型常量
export const APPROVER_TYPES = {
  role: '指定角色',
  user: '指定用户',
  form_field: '表单字段',
} as const

// 节点连接
export interface NodeConnection {
  source: string
  target: string
  sourceHandle?: string
}

// 兼容旧版本
export type ApprovalNode = FlowNode

// ========== 工单相关类型 ==========
export interface TicketData {
  id?: number
  ticket_id?: number
  field_id: number
  field?: FormField
  value: string
}

export interface Ticket {
  id?: number
  title: string
  description?: string
  type_id: number
  type?: TicketType
  priority: number
  status: string
  creator_id: number
  creator?: any
  assignee_id?: number
  assignee?: any
  flow_id?: number
  flow_version?: number
  current_node_id?: number
  current_node?: FlowNode
  data?: TicketData[]
  comments?: TicketComment[]
  attachments?: Attachment[]
  approval_records?: ApprovalRecord[]
  completed_at?: string
  created_at?: string
  updated_at?: string
  // 创建时用于提交动态表单数据
  form_data?: Record<string, any>
}

// 工单状态常量
export const TICKET_STATUS = {
  draft: '草稿',
  pending: '待审批',
  approving: '审批中',
  approved: '已通过',
  rejected: '已拒绝',
  withdrawn: '已撤回',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
} as const

// 工单优先级常量
export const TICKET_PRIORITY = {
  1: '低',
  2: '中',
  3: '高',
  4: '紧急',
} as const

// 附件
export interface Attachment {
  id?: number
  ticket_id: number
  comment_id?: number
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string
  uploader_id: number
  uploader?: any
  created_at?: string
}

// 评论
export interface TicketComment {
  id?: number
  ticket_id: number
  user_id: number
  user?: any
  content: string
  comment_type: string
  created_at?: string
}

// 审批记录
export interface ApprovalRecord {
  id: number
  ticket_id: number
  node_id: number
  node?: FlowNode
  approver_id: number
  approver?: any
  action: string
  result: string
  comment: string
  delegate_to_id?: number
  delegate_to?: any
  created_at: string
}

// 审批操作类型常量
export const APPROVAL_ACTIONS = {
  approve: '通过',
  reject: '拒绝',
  return: '退回',
  delegate: '转审',
  addsign: '加签',
  cc: '抄送',
  urge: '催办',
} as const

// 列表响应
export interface ListResponse<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

// ========== 工单类型 API ==========
export const getTicketTypes = (params?: any): Promise<ListResponse<TicketType>> => {
  return request.get('/ticket-types', { params })
}

export const getEnabledTicketTypes = (): Promise<TicketType[]> => {
  return request.get('/ticket-types/enabled')
}

export const createTicketType = (data: TicketType): Promise<TicketType> => {
  return request.post('/ticket-types', data)
}

export const updateTicketType = (id: number, data: TicketType): Promise<void> => {
  return request.put(`/ticket-types/${id}`, data)
}

export const deleteTicketType = (id: number): Promise<void> => {
  return request.delete(`/ticket-types/${id}`)
}

export const getEnabledTicketTemplates = (typeId?: number): Promise<TicketTemplate[]> => {
  return request.get('/ticket-templates/enabled', { params: { type_id: typeId } })
}

// ========== 工单 API ==========
export interface TicketListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
  type_id?: number
  creator_id?: number
}

export const getTickets = (params?: TicketListParams): Promise<ListResponse<Ticket>> => {
  return request.get('/tickets', { params })
}

export const getMyTickets = (params?: { page?: number; page_size?: number }): Promise<ListResponse<Ticket>> => {
  return request.get('/tickets/my', { params })
}

export const getPendingApprovals = (params?: { page?: number; page_size?: number }): Promise<ListResponse<Ticket>> => {
  return request.get('/tickets/pending', { params })
}

export const getTicketById = (id: number): Promise<Ticket> => {
  return request.get(`/tickets/${id}`)
}

export const createTicket = (data: Partial<Ticket>): Promise<Ticket> => {
  return request.post('/tickets', data)
}

export const updateTicket = (id: number, data: Partial<Ticket>): Promise<void> => {
  return request.put(`/tickets/${id}`, data)
}

export const deleteTicket = (id: number): Promise<void> => {
  return request.delete(`/tickets/${id}`)
}

export const submitTicket = (id: number): Promise<void> => {
  return request.post(`/tickets/${id}/submit`)
}

export const approveTicket = (id: number, data: { approved: boolean; comment: string }): Promise<void> => {
  return request.post(`/tickets/${id}/approve`, data)
}

export const completeTicket = (id: number): Promise<void> => {
  return request.post(`/tickets/${id}/complete`)
}

export const cancelTicket = (id: number): Promise<void> => {
  return request.post(`/tickets/${id}/cancel`)
}


export const getProcessedTickets = (params?: { page?: number; page_size?: number }): Promise<ListResponse<Ticket>> => {
  return request.get('/tickets/processed', { params })
}

export const getCCTickets = (params?: { page?: number; page_size?: number }): Promise<ListResponse<Ticket>> => {
  return request.get('/tickets/cc', { params })
}

// ========== 表单模板 API ==========
export const getFormTemplates = (params?: { page?: number; page_size?: number; keyword?: string }): Promise<ListResponse<FormTemplate>> => {
  return request.get('/form-templates', { params })
}

export const getEnabledFormTemplates = (): Promise<FormTemplate[]> => {
  return request.get('/form-templates/enabled')
}


export const createFormTemplate = (data: FormTemplate): Promise<FormTemplate> => {
  return request.post('/form-templates', data)
}

export const updateFormTemplate = (id: number, data: FormTemplate): Promise<void> => {
  return request.put(`/form-templates/${id}`, data)
}

export const deleteFormTemplate = (id: number): Promise<void> => {
  return request.delete(`/form-templates/${id}`)
}

export const getFormFields = (templateId: number): Promise<FormField[]> => {
  return request.get(`/form-templates/${templateId}/fields`)
}

export const saveFormFields = (templateId: number, fields: FormField[]): Promise<void> => {
  return request.put(`/form-templates/${templateId}/fields`, fields)
}

// ========== 审批流程 API ==========
export const getApprovalFlows = (params?: { page?: number; page_size?: number; keyword?: string }): Promise<ListResponse<ApprovalFlow>> => {
  return request.get('/approval-flows', { params })
}

export const getEnabledApprovalFlows = (): Promise<ApprovalFlow[]> => {
  return request.get('/approval-flows/enabled')
}


export const createApprovalFlow = (data: Partial<ApprovalFlow>): Promise<ApprovalFlow> => {
  return request.post('/approval-flows', data)
}

export const updateApprovalFlow = (id: number, data: Partial<ApprovalFlow>): Promise<void> => {
  return request.put(`/approval-flows/${id}`, data)
}

export const deleteApprovalFlow = (id: number): Promise<void> => {
  return request.delete(`/approval-flows/${id}`)
}

export const publishApprovalFlow = (id: number): Promise<void> => {
  return request.post(`/approval-flows/${id}/publish`)
}

export const getFlowNodes = (flowId: number): Promise<FlowNode[]> => {
  return request.get(`/approval-flows/${flowId}/nodes`)
}

export const saveFlowNodes = (flowId: number, nodes: FlowNode[]): Promise<void> => {
  return request.put(`/approval-flows/${flowId}/nodes`, nodes)
}

export const saveFlowNodesWithConnections = (flowId: number, data: { nodes: FlowNode[]; connections: NodeConnection[] }): Promise<void> => {
  return request.put(`/approval-flows/${flowId}/nodes-with-connections`, data)
}

// 兼容旧接口
export const getApprovalNodes = getFlowNodes
export const saveApprovalNodes = saveFlowNodes

// ========== 附件 API ==========
export const uploadAttachment = (ticketId: number, file: File, commentId?: number): Promise<Attachment> => {
  const formData = new FormData()
  formData.append('file', file)
  if (commentId) {
    formData.append('comment_id', commentId.toString())
  }
  return request.post(`/attachments/ticket/${ticketId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const getAttachments = (ticketId: number): Promise<Attachment[]> => {
  return request.get(`/attachments/ticket/${ticketId}`)
}

export const getAttachmentDownloadUrl = (id: number): Promise<{ url: string }> => {
  return request.get(`/attachments/${id}/download`)
}

export const deleteAttachment = (id: number): Promise<void> => {
  return request.delete(`/attachments/${id}`)
}

// ========== 统计 API ==========
export interface TicketStats {
  total: number
  by_status: Record<string, number>
  by_type: { type_name: string; count: number }[]
  by_priority: Record<number, number>
}

export const getTicketStats = (): Promise<TicketStats> => {
  return request.get('/tickets/stats')
}

// ========== 评论 API ==========
export const getComments = (ticketId: number): Promise<TicketComment[]> => {
  return request.get(`/comments/ticket/${ticketId}`)
}

export const createComment = (ticketId: number, data: { content: string; comment_type?: string }): Promise<TicketComment> => {
  return request.post(`/comments/ticket/${ticketId}`, data)
}

export const deleteComment = (id: number): Promise<void> => {
  return request.delete(`/comments/${id}`)
}

// ========== 审批记录 API ==========
export const getApprovalRecords = (ticketId: number): Promise<ApprovalRecord[]> => {
  return request.get(`/tickets/${ticketId}/records`)
}

export const checkCanApprove = (ticketId: number): Promise<{ can_approve: boolean }> => {
  return request.get(`/tickets/${ticketId}/can-approve`)
}
