"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/common/back-button"
import { Pin, Eye, ChevronRight, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { 
  getNoticeList, 
  getNoticeTypeLabel, 
  getNoticeTypeColor 
} from "@/lib/api/notice"
import type { NoticeItem, NoticeType } from "@/lib/types/notice"
import { DataStateEmpty, DataStateError, DataStateLoading } from "@/components/data-state"

// 筛选选项
const filterOptions: { value: NoticeType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'system', label: '系统' },
  { value: 'update', label: '更新' },
  { value: 'activity', label: '活动' },
  { value: 'maintenance', label: '维护' },
  { value: 'policy', label: '政策' },
]

export default function NoticesListPage() {
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<NoticeType | 'all'>('all')
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  // 加载数据
  const loadData = async (pageNum: number, typeFilter?: NoticeType | 'all', append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      const response = await getNoticeList({
        page: pageNum,
        pageSize: 10,
        type: typeFilter === 'all' ? undefined : typeFilter,
      })

      if (response.code === 200) {
        if (append) {
          setNotices(prev => [...prev, ...response.data.list])
        } else {
          setNotices(response.data.list)
        }
        setHasMore(response.data.hasMore)
        setPage(pageNum)
      } else {
        setError(response.message || '加载失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadData(1, filter)
  }, [filter])

  // 加载更多
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(page + 1, filter, true)
    }
  }

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
    
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <BackButton fallbackPath="/profile" />
          <h1 className="text-lg font-semibold">平台公告</h1>
          <div className="w-10" />
        </div>
        
        {/* 筛选栏 */}
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2">
            {filterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                  filter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 公告列表 */}
      <main className="p-4 space-y-3">
        {loading ? (
          <DataStateLoading text="加载公告中..." />
        ) : error ? (
          <DataStateError message={error} onRetry={() => loadData(1, filter)} />
        ) : notices.length === 0 ? (
          <DataStateEmpty title="暂无公告" description="当前没有任何公告信息" />
        ) : (
          <>
            {notices.map(notice => (
              <Link key={notice.id} href={`/notices/${notice.id}`}>
                <Card className={cn(
                  "p-4 transition-all hover:shadow-md",
                  !notice.isRead && "border-l-2 border-l-primary"
                )}>
                  <div className="flex items-start gap-3">
                    {/* 封面图（如有） */}
                    {notice.cover && (
                      <img 
                        src={notice.cover} 
                        alt=""
                        className="w-20 h-14 rounded object-cover flex-shrink-0"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {/* 标题行 */}
                      <div className="flex items-center gap-2 mb-1">
                        {notice.isPinned && (
                          <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        )}
                        {!notice.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <h3 className={cn(
                          "font-medium text-sm line-clamp-1",
                          !notice.isRead && "text-foreground",
                          notice.isRead && "text-muted-foreground"
                        )}>
                          {notice.title}
                        </h3>
                      </div>
                      
                      {/* 摘要 */}
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {notice.summary}
                      </p>
                      
                      {/* 底部信息 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={cn("text-[10px] px-1.5 py-0", getNoticeTypeColor(notice.type))}
                          >
                            {getNoticeTypeLabel(notice.type)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(notice.publishedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          <span>{notice.viewCount > 10000 ? `${(notice.viewCount / 10000).toFixed(1)}万` : notice.viewCount}</span>
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}

            {/* 加载更多 */}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-3 text-sm text-muted-foreground flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    加载中...
                  </>
                ) : (
                  '点击加载更多'
                )}
              </button>
            )}

            {!hasMore && notices.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-4">
                已加载全部公告
              </p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
