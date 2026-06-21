'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  User,
  FileText,
  MessageSquare,
  BookOpen,
  Users,
  Radio,
  Filter,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { DataState } from '@/components/data-state'
import { 
  getReportStats, 
  getReportList,
  getReportStatusLabel,
  getReportStatusColor,
  getReportTypeLabel,
  getTargetTypeLabel,
  getConclusionLabel,
  getConclusionColor
} from '@/lib/api/report'
import type { ReportRecord, ReportStats, ReportStatus } from '@/lib/types/report'

// 状态筛选选项
const statusFilters: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已处理' },
  { value: 'rejected', label: '已驳回' },
]

// 获取对象类型图标
function getTargetTypeIcon(type: string) {
  const icons: Record<string, React.ReactNode> = {
    user: <User className="w-4 h-4" />,
    post: <FileText className="w-4 h-4" />,
    comment: <MessageSquare className="w-4 h-4" />,
    course: <BookOpen className="w-4 h-4" />,
    circle: <Users className="w-4 h-4" />,
    live: <Radio className="w-4 h-4" />,
  }
  return icons[type] || <AlertCircle className="w-4 h-4" />
}

// 获取状态图标
function getStatusIcon(status: ReportStatus) {
  const icons: Record<ReportStatus, React.ReactNode> = {
    pending: <Clock className="w-4 h-4 text-amber-500" />,
    processing: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
    resolved: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    rejected: <XCircle className="w-4 h-4 text-red-500" />,
  }
  return icons[status]
}

export default function ReportResultPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [records, setRecords] = useState<ReportRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [selectedRecord, setSelectedRecord] = useState<ReportRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // 加载数据
  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, listRes] = await Promise.all([
        getReportStats(),
        getReportList({ status: statusFilter === 'all' ? undefined : statusFilter }),
      ])
      if (statsRes.code === 200) {
        setStats(statsRes.data)
      }
      if (listRes.code === 200) {
        setRecords(listRes.data.list)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (record: ReportRecord) => {
    setSelectedRecord(record)
    setShowDetail(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="flex-1 text-center font-medium">举报处理结果</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* 统计卡片 */}
      {stats && (
        <div className="p-4 bg-muted/30">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-background rounded-lg p-3">
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">总举报</div>
            </div>
            <div className="bg-background rounded-lg p-3">
              <div className="text-lg font-bold text-amber-600">{stats.pending + stats.processing}</div>
              <div className="text-xs text-muted-foreground">处理中</div>
            </div>
            <div className="bg-background rounded-lg p-3">
              <div className="text-lg font-bold text-green-600">{stats.resolved}</div>
              <div className="text-xs text-muted-foreground">已处理</div>
            </div>
            <div className="bg-background rounded-lg p-3">
              <div className="text-lg font-bold text-red-600">{stats.rejected}</div>
              <div className="text-xs text-muted-foreground">已驳回</div>
            </div>
          </div>
        </div>
      )}

      {/* 状态筛选 */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto border-b">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {statusFilters.map(filter => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            className="shrink-0"
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* 举报记录列表 */}
      <DataState
        loading={loading}
        empty={records.length === 0}
        emptyMessage="暂无举报记录"
      >
        <div className="divide-y">
          {records.map(record => (
            <div
              key={record.id}
              className="p-4 bg-background active:bg-muted/50 cursor-pointer"
              onClick={() => handleViewDetail(record)}
            >
              <div className="flex items-start gap-3">
                {/* 对象类型图标 */}
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {record.targetAvatar ? (
                    <img 
                      src={record.targetAvatar} 
                      alt="" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    getTargetTypeIcon(record.targetType)
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{record.targetTitle}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {getTargetTypeLabel(record.targetType)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {getReportTypeLabel(record.reportType)}：{record.reason}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{record.createdAt}</span>
                    <Badge className={getReportStatusColor(record.status)}>
                      {getStatusIcon(record.status)}
                      <span className="ml-1">{getReportStatusLabel(record.status)}</span>
                    </Badge>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </DataState>

      {/* 详情弹层 */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>举报详情</SheetTitle>
          </SheetHeader>

          {selectedRecord && (
            <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(85vh-100px)]">
              {/* 举报对象 */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3">举报对象</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    {selectedRecord.targetAvatar ? (
                      <img 
                        src={selectedRecord.targetAvatar} 
                        alt="" 
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      getTargetTypeIcon(selectedRecord.targetType)
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{selectedRecord.targetTitle}</div>
                    <div className="text-sm text-muted-foreground">
                      {getTargetTypeLabel(selectedRecord.targetType)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 举报信息 */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">举报信息</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">举报类型：</span>
                    <span>{getReportTypeLabel(selectedRecord.reportType)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">提交时间：</span>
                    <span>{selectedRecord.createdAt}</span>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">举报原因：</span>
                  <p className="mt-1">{selectedRecord.reason}</p>
                </div>
                {selectedRecord.evidence && selectedRecord.evidence.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">证据截图：</span>
                    <div className="flex gap-2 mt-2">
                      {selectedRecord.evidence.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`证据${idx + 1}`}
                          className="w-20 h-20 rounded-lg object-cover border"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* 处理状态 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">处理状态</h3>
                  <Badge className={getReportStatusColor(selectedRecord.status)}>
                    {getReportStatusLabel(selectedRecord.status)}
                  </Badge>
                </div>

                {selectedRecord.result ? (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">处理结论：</span>
                      <span className={`font-medium ${getConclusionColor(selectedRecord.result.conclusion)}`}>
                        {getConclusionLabel(selectedRecord.result.conclusion)}
                      </span>
                    </div>
                    {selectedRecord.result.action && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">处理措施：</span>
                        <p className="mt-1">{selectedRecord.result.action}</p>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-muted-foreground">处理说明：</span>
                      <p className="mt-1">{selectedRecord.result.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>处理人：{selectedRecord.result.handler}</span>
                      <span>{selectedRecord.result.handledAt}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-4 text-center text-sm text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p>正在处理中，请耐心等待</p>
                    <p className="text-xs mt-1">预计1-3个工作日内处理完成</p>
                  </div>
                )}
              </div>

              {/* 申诉入口 - 仅已驳回状态显示 */}
              {selectedRecord.status === 'rejected' && (
                <div className="pt-4">
                  <Link href={`/report/appeal?id=${selectedRecord.id}`}>
                    <Button variant="outline" className="w-full">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      我要申诉
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    如对处理结果有异议，可提交申诉
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 骨架屏 */}
      {loading && (
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
