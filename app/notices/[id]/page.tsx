"use client"

import { useState, useEffect, use } from "react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Eye, Share2, Megaphone, AlertCircle, Gift, Settings } from "lucide-react"
import { getNoticeDetail, getNoticeTypeLabel, getNoticeTypeColor, markNoticeRead } from "@/lib/api/notice"
import type { NoticeDetail } from "@/lib/types/notice"
import { toast } from "sonner"

// 获取类型图标
function getTypeIcon(type: string) {
  const icons: Record<string, React.ReactNode> = {
    announcement: <Megaphone className="w-5 h-5" />,
    activity: <Gift className="w-5 h-5" />,
    update: <Settings className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  }
  return icons[type] || <Megaphone className="w-5 h-5" />
}

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const noticeId = Number(resolvedParams.id)
  
  const [notice, setNotice] = useState<NoticeDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotice()
  }, [noticeId])

  const loadNotice = async () => {
    setLoading(true)
    try {
      const response = await getNoticeDetail(noticeId)
      if (response.code === 200 && response.data) {
        setNotice(response.data)
        // 标记为已读
        if (!response.data.isRead) {
          await markNoticeRead(noticeId)
        }
      }
    } catch (error) {
      console.error('加载公告失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (!notice) return
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: notice.title,
          text: notice.summary,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('链接已复制')
      }
    } catch {
      // 用户取消分享
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <BackButton fallbackUrl="/notices" />
            <h1 className="text-lg font-semibold">公告详情</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-40 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
      </div>
    )
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <BackButton fallbackUrl="/notices" />
            <h1 className="text-lg font-semibold">公告详情</h1>
            <div className="w-10" />
          </div>
        </header>

        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">公告不存在或已删除</p>
          <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackUrl="/notices" />
          <h1 className="text-lg font-semibold">公告详情</h1>
          <button onClick={handleShare} className="p-2 -mr-2">
            <Share2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* 公告封面 */}
        {notice.cover && (
          <div className="rounded-xl overflow-hidden">
            <img
              src={notice.cover}
              alt={notice.title}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* 公告标题和元信息 */}
        <div className="space-y-3">
          {/* 置顶和类型标签 */}
          <div className="flex items-center gap-2">
            {notice.isPinned && (
              <Badge variant="destructive" className="text-xs">
                置顶
              </Badge>
            )}
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{ 
                backgroundColor: `${getNoticeTypeColor(notice.type)}20`,
                color: getNoticeTypeColor(notice.type)
              }}
            >
              <span className="mr-1">{getTypeIcon(notice.type)}</span>
              {getNoticeTypeLabel(notice.type)}
            </Badge>
          </div>

          {/* 标题 */}
          <h1 className="text-xl font-bold text-foreground leading-tight">
            {notice.title}
          </h1>

          {/* 发布时间和阅读数 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {notice.publishedAt}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {notice.viewCount} 次阅读
            </span>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-border" />

        {/* 公告正文 */}
        <Card className="p-4">
          <article 
            className="prose prose-sm max-w-none
              prose-headings:text-foreground prose-headings:font-semibold
              prose-p:text-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground
              prose-ul:text-foreground prose-ol:text-foreground
              prose-li:text-foreground
              prose-blockquote:text-muted-foreground prose-blockquote:border-primary
            "
            dangerouslySetInnerHTML={{ __html: notice.content }}
          />
        </Card>

        {/* 相关链接 */}
        {notice.link && (
          <Card className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">相关链接</h3>
            <a 
              href={notice.link} 
              className="text-sm text-primary hover:underline flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              查看详情
              <span className="text-xs">→</span>
            </a>
          </Card>
        )}

        {/* 附件 */}
        {notice.attachments && notice.attachments.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">附件</h3>
            <div className="space-y-2">
              {notice.attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={attachment.url}
                  download={attachment.name}
                  className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {attachment.name}
                    </p>
                    {attachment.size && (
                      <p className="text-xs text-muted-foreground">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-primary">下载</span>
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* 发布信息 */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>由 热卜平台 发布</p>
          <p>发布时间：{notice.publishedAt}</p>
        </div>
      </main>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 safe-area-pb">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => window.history.back()}
          >
            返回列表
          </Button>
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            分享公告
          </Button>
        </div>
      </div>
    </div>
  )
}
