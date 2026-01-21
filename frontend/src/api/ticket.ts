import request from './request'

// 工单类型
export interface TicketType {
  id?: number
  name: string
  description?: string
  icon?: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

// 工单
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
  current_node_id?: number
  completed_at?: string
  created_at?: string
  updated_at?: string
}

// 审批流程
export interface ApprovalFlow {
  id?: number
  type_id: number
  name: string
  enabled: boolean
}

// 审批节点
export interface ApprovalNode {
  id?: number
  flow_id: number
  name: string
  role_id: number
  role?: any
  approve_type: string
  sort_order: number
}

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

export const getTicketTypeById = (id: number): Promise<TicketType> => {
  return request.get(`/ticket-types/${id}`)
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

// ========== 审批流程 API ==========
export const getApprovalFlows = (params?: any): Promise<ListResponse<ApprovalFlow>> => {
  return request.get('/approval-flows', { params })
}

export const getApprovalFlowById = (id: number): Promise<ApprovalFlow> => {
  return request.get(`/approval-flows/${id}`)
}

export const getApprovalFlowByTypeId = (typeId: number): Promise<ApprovalFlow> => {
  return request.get(`/approval-flows/type/${typeId}`)
}

export const createApprovalFlow = (data: ApprovalFlow): Promise<ApprovalFlow> => {
  return request.post('/approval-flows', data)
}

export const updateApprovalFlow = (id: number, data: ApprovalFlow): Promise<void> => {
  return request.put(`/approval-flows/${id}`, data)
}

export const deleteApprovalFlow = (id: number): Promise<void> => {
  return request.delete(`/approval-flows/${id}`)
}

export const getApprovalNodes = (flowId: number): Promise<ApprovalNode[]> => {
  return request.get(`/approval-flows/${flowId}/nodes`)
}

export const saveApprovalNodes = (flowId: number, nodes: ApprovalNode[]): Promise<void> => {
  return request.put(`/approval-flows/${flowId}/nodes`, nodes)
}

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
