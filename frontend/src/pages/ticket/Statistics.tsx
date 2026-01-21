import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getTicketStats, TicketStats } from '@/api/ticket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-tw'

const TicketStatistics = () => {
  const { t } = useTranslation()
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [loading, setLoading] = useState(true)

  const statusLabels: Record<string, string> = {
    draft: t('ticket.statusDraft'),
    pending: t('ticket.statusPending'),
    approved: t('ticket.statusApproved'),
    rejected: t('ticket.statusRejected'),
    processing: t('ticket.statusProcessing'),
    completed: t('ticket.statusCompleted'),
    cancelled: t('ticket.statusCancelled'),
  }

  const priorityLabels: Record<number, string> = {
    1: t('ticket.priorityLow'),
    2: t('ticket.priorityMedium'),
    3: t('ticket.priorityHigh'),
    4: t('ticket.priorityUrgent'),
  }

  useEffect(() => {
    getTicketStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-8">{t('ticket.loading')}</div>
  }

  if (!stats) {
    return <div className="flex justify-center py-8">{t('ticket.stats.loadFailed')}</div>
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
      <h1 className="text-xl font-semibold">{t('ticket.stats.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('ticket.stats.total')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('ticket.stats.pending')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {(stats.by_status?.pending || 0) + (stats.by_status?.processing || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('ticket.stats.completed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.by_status?.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('ticket.stats.rejected')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.by_status?.rejected || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('ticket.stats.byStatus')}</CardTitle>
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
            <CardTitle>{t('ticket.stats.byPriority')}</CardTitle>
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
            <CardTitle>{t('ticket.stats.byType')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(stats.by_type || []).map((item) => (
                <div key={item.type_name} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{item.count}</div>
                  <div className="text-sm text-muted-foreground">{item.type_name || t('ticket.stats.uncategorized')}</div>
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
