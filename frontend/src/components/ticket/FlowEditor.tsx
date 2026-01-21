import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { FlowNode, FLOW_NODE_TYPES, APPROVER_TYPES } from '@/api/ticket'
import { Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui-tw'
import { Plus, Trash2 } from 'lucide-react'

interface FlowEditorProps {
  nodes: FlowNode[]
  roles: { id: number; name: string }[]
  users: { id: number; username: string }[]
  onChange: (nodes: FlowNode[], connections: { source: string; target: string; sourceHandle?: string }[]) => void
}

// 辅助函数：将内部状态转换为外部格式
function convertToFlowNodes(nodes: Node[]): FlowNode[] {
  return nodes.map((node, index) => ({
    id: node.id.startsWith('temp-') ? undefined : parseInt(node.id),
    name: (node.data.label as string) || '',
    node_type: (node.data.nodeType as string) || 'approve',
    approver_type: (node.data.approverType as string) || 'role',
    approver_value: (node.data.approverValue as string) || '',
    condition: (node.data.condition as string) || '',
    position_x: Math.round(node.position.x),
    position_y: Math.round(node.position.y),
    sort_order: index + 1,
  }))
}

function convertToConnections(edges: Edge[]) {
  return edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || undefined,
  }))
}

// 节点颜色映射
const nodeColors: Record<string, string> = {
  approve: 'bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700',
  countersign: 'bg-purple-50 border-purple-300 dark:bg-purple-950 dark:border-purple-700',
  or: 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700',
  condition: 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-700',
  cc: 'bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600',
}

// 自定义节点组件
interface CustomNodeData {
  label: string
  nodeType: string
  approverType?: string
  approverValue?: string
  condition?: string
  roles: { id: number; name: string }[]
  users: { id: number; username: string }[]
  onUpdate: (id: string, data: Partial<CustomNodeData>) => void
  onDelete: (id: string) => void
}

function ApprovalNodeComponent({ id, data }: { id: string; data: CustomNodeData }) {
  const [editing, setEditing] = useState(false)
  const colorClass = nodeColors[data.nodeType] || nodeColors.approve

  const getApproverLabel = () => {
    if (!data.approverValue) return '未配置'
    if (data.approverType === 'role') {
      const role = data.roles.find((r) => r.id.toString() === data.approverValue)
      return role?.name || data.approverValue
    }
    if (data.approverType === 'user') {
      const user = data.users.find((u) => u.id.toString() === data.approverValue)
      return user?.username || data.approverValue
    }
    return data.approverValue
  }

  return (
    <div className={`px-4 py-3 rounded-lg border-2 min-w-[180px] ${colorClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {FLOW_NODE_TYPES[data.nodeType as keyof typeof FLOW_NODE_TYPES]}
        </span>
        <button
          onClick={() => data.onDelete(id)}
          className="p-1 rounded hover:bg-destructive/10 text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Input
            className="h-7 text-sm"
            value={data.label}
            onChange={(e) => data.onUpdate(id, { label: e.target.value })}
            placeholder="节点名称"
            autoFocus
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
          />
        </div>
      ) : (
        <div
          className="font-medium cursor-pointer hover:text-primary"
          onClick={() => setEditing(true)}
        >
          {data.label || '点击编辑'}
        </div>
      )}

      {data.nodeType !== 'condition' && (
        <div className="text-xs text-muted-foreground mt-1">
          {APPROVER_TYPES[data.approverType as keyof typeof APPROVER_TYPES] || '审批人'}: {getApproverLabel()}
        </div>
      )}

      {data.nodeType === 'condition' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} className="!bg-green-500" />
          <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} className="!bg-red-500" />
          <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
            <span>是</span>
            <span>否</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      )}
    </div>
  )
}

const nodeTypes: NodeTypes = {
  approval: ApprovalNodeComponent,
}

export default function FlowEditor({ nodes: initialNodes, roles, users, onChange }: FlowEditorProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const isInitialized = useRef(false)
  const onChangeRef = useRef(onChange)
  
  // 保持 onChange 引用最新
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])


  // 仅在初始化时从 props 加载数据
  useEffect(() => {
    if (isInitialized.current) return
    if (initialNodes.length === 0) return
    
    isInitialized.current = true
    
    const rfNodes: Node[] = initialNodes.map((node, index) => ({
      id: node.id?.toString() || `temp-${index}`,
      type: 'approval',
      position: { x: node.position_x || 250, y: node.position_y || index * 150 },
      data: {
        label: node.name,
        nodeType: node.node_type,
        approverType: node.approver_type,
        approverValue: node.approver_value,
        condition: node.condition,
        roles,
        users,
        onUpdate: handleNodeDataUpdate,
        onDelete: handleDeleteNode,
      },
    }))
    setNodes(rfNodes)

    // 构建连线
    const rfEdges: Edge[] = []
    initialNodes.forEach((node) => {
      const sourceId = node.id?.toString() || ''
      if (node.next_node_id) {
        rfEdges.push({
          id: `e${sourceId}-${node.next_node_id}`,
          source: sourceId,
          target: node.next_node_id.toString(),
          markerEnd: { type: MarkerType.ArrowClosed },
        })
      }
      if (node.true_branch_id) {
        rfEdges.push({
          id: `e${sourceId}-true-${node.true_branch_id}`,
          source: sourceId,
          target: node.true_branch_id.toString(),
          sourceHandle: 'true',
          markerEnd: { type: MarkerType.ArrowClosed },
          label: '是',
        })
      }
      if (node.false_branch_id) {
        rfEdges.push({
          id: `e${sourceId}-false-${node.false_branch_id}`,
          source: sourceId,
          target: node.false_branch_id.toString(),
          sourceHandle: 'false',
          markerEnd: { type: MarkerType.ArrowClosed },
          label: '否',
        })
      }
    })
    setEdges(rfEdges)
  }, [initialNodes, roles, users])

  const handleNodeDataUpdate = useCallback((id: string, updates: Partial<CustomNodeData>) => {
    setNodes((nds) => {
      const newNodes = nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
      // 延迟通知以避免在渲染期间更新
      setTimeout(() => {
        onChangeRef.current(convertToFlowNodes(newNodes), convertToConnections(edges))
      }, 0)
      return newNodes
    })
  }, [edges])

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => {
      const newNodes = nds.filter((node) => node.id !== id)
      setEdges((eds) => {
        const newEdges = eds.filter((edge) => edge.source !== id && edge.target !== id)
        setTimeout(() => {
          onChangeRef.current(convertToFlowNodes(newNodes), convertToConnections(newEdges))
        }, 0)
        return newEdges
      })
      return newNodes
    })
  }, [])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => {
      const newNodes = applyNodeChanges(changes, nds)
      setTimeout(() => {
        onChangeRef.current(convertToFlowNodes(newNodes), convertToConnections(edges))
      }, 0)
      return newNodes
    }),
    [edges]
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => {
      const newEdges = applyEdgeChanges(changes, eds)
      setTimeout(() => {
        onChangeRef.current(convertToFlowNodes(nodes), convertToConnections(newEdges))
      }, 0)
      return newEdges
    }),
    [nodes]
  )

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => {
      const newEdges = addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)
      setTimeout(() => {
        onChangeRef.current(convertToFlowNodes(nodes), convertToConnections(newEdges))
      }, 0)
      return newEdges
    }),
    [nodes]
  )

  const handleAddNode = (type: string) => {
    const newId = `temp-${Date.now()}`
    const newNode: Node = {
      id: newId,
      type: 'approval',
      position: { x: 250, y: nodes.length * 150 },
      data: {
        label: FLOW_NODE_TYPES[type as keyof typeof FLOW_NODE_TYPES],
        nodeType: type,
        approverType: 'role',
        approverValue: '',
        roles,
        users,
        onUpdate: handleNodeDataUpdate,
        onDelete: handleDeleteNode,
      },
    }
    setNodes((nds) => {
      const newNodes = [...nds, newNode]
      setTimeout(() => {
        onChangeRef.current(convertToFlowNodes(newNodes), convertToConnections(edges))
      }, 0)
      return newNodes
    })
  }


  // 选中节点的属性编辑面板
  const selectedNodeData = useMemo(() => {
    if (!selectedNode) return null
    return nodes.find((n) => n.id === selectedNode)
  }, [selectedNode, nodes])

  return (
    <div className="flex h-[500px] border rounded-lg overflow-hidden">
      {/* 左侧工具栏 */}
      <div className="w-48 border-r bg-muted/30 p-3 space-y-2">
        <div className="text-sm font-medium mb-3">添加节点</div>
        {Object.entries(FLOW_NODE_TYPES).map(([key, label]) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => handleAddNode(key)}
          >
            <Plus className="h-3 w-3 mr-2" />
            {label}
          </Button>
        ))}
      </div>

      {/* 中间画布 */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      {/* 右侧属性面板 */}
      {selectedNodeData && (
        <div className="w-64 border-l bg-muted/30 p-4 space-y-4">
          <div className="text-sm font-medium">节点属性</div>
          
          <div className="space-y-2">
            <Label className="text-xs">节点名称</Label>
            <Input
              value={(selectedNodeData.data.label as string) || ''}
              onChange={(e) => handleNodeDataUpdate(selectedNode!, { label: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">节点类型</Label>
            <Select
              value={(selectedNodeData.data.nodeType as string) || 'approve'}
              onValueChange={(v) => handleNodeDataUpdate(selectedNode!, { nodeType: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FLOW_NODE_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(selectedNodeData.data.nodeType as string) !== 'condition' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">审批人类型</Label>
                <Select
                  value={(selectedNodeData.data.approverType as string) || 'role'}
                  onValueChange={(v) => handleNodeDataUpdate(selectedNode!, { approverType: v, approverValue: '' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(APPROVER_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">审批人</Label>
                {(selectedNodeData.data.approverType as string) === 'role' ? (
                  <Select
                    value={(selectedNodeData.data.approverValue as string) || 'none'}
                    onValueChange={(v) => handleNodeDataUpdate(selectedNode!, { approverValue: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="选择角色" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">请选择</SelectItem>
                      {roles.filter(r => r.id != null && r.id !== 0).map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (selectedNodeData.data.approverType as string) === 'user' ? (
                  <Select
                    value={(selectedNodeData.data.approverValue as string) || 'none'}
                    onValueChange={(v) => handleNodeDataUpdate(selectedNode!, { approverValue: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="选择用户" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">请选择</SelectItem>
                      {users.filter(u => u.id != null && u.id !== 0).map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>{user.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={(selectedNodeData.data.approverValue as string) || ''}
                    onChange={(e) => handleNodeDataUpdate(selectedNode!, { approverValue: e.target.value })}
                    placeholder="表单字段名"
                  />
                )}
              </div>
            </>
          )}

          {(selectedNodeData.data.nodeType as string) === 'condition' && (
            <div className="space-y-2">
              <Label className="text-xs">条件配置 (JSON)</Label>
              <Input
                value={(selectedNodeData.data.condition as string) || ''}
                onChange={(e) => handleNodeDataUpdate(selectedNode!, { condition: e.target.value })}
                placeholder='{"field":"amount","operator":">","value":"1000"}'
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
