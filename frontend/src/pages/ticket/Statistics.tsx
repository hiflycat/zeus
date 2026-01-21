import { useState, useEffect } from 'react'
import { getTicketStats, TicketStats } from '@/api/ticket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-tw'

const statusLabels: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
}

const priorityLabels: Record<number, string> = {
  1: '低',
  2: '中',
  3: '高',
  4: '紧急',
}

const TicketStatistics = () => {
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTicketStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-8">加载中...</div>
  }

  if (!stats) {
    return <div className="flex justify-center py-8">加载失败</div>
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500',
    pending: 'bg-yellow-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    processing: 'bg-blue-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-gray-400',
  }

  const priorityColors: Record<number, string> = {
    1: 'bg-gray-400',
    2: 'bg-blue-500',
    3: 'bg-orange-500',
    4: 'bg-red-500',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">工单统计</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总工单数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">待处理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {(stats.by_status?.pending || 0) + (stats.by_status?.processing || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.by_status?.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已拒绝</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.by_status?.rejected || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>按状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.by_status || {}).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-500'}`} />
                  <span className="flex-1">{statusLabels[status] || status}</span>
                  <span className="font-medium">{count}</span>
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${statusColors[status] || 'bg-gray-500'}`}
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>按优先级分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.by_priority || {}).map(([priority, count]) => (
                <div key={priority} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${priorityColors[Number(priority)] || 'bg-gray-500'}`} />
                  <span className="flex-1">{priorityLabels[Number(priority)] || priority}</span>
                  <span className="font-medium">{count}</span>
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${priorityColors[Number(priority)] || 'bg-gray-500'}`}
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>按类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(stats.by_type || []).map((item) => (
                <div key={item.type_name} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{item.count}</div>
                  <div className="text-sm text-muted-foreground">{item.type_name || '未分类'}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TicketStatistics
