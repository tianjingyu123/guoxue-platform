'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Bell, 
  CheckCheck, 
  MessageCircle, 
  Heart, 
  UserPlus, 
  ShoppingBag, 
  Gift, 
  AlertCircle,
  Megaphone,
  CreditCard,
  Headphones,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { DataState } from '@/components/data-state'
import { getMessages, markAsRead, markAllAsRead, getUnreadCounts } from '@/lib/api/messages'
import type { Message, MessageType, MessageUnreadCounts } from '@/lib/types/messages'

// 通知图标映射
const notificationIcons: Record<string, React.ReactNode> = {
  '评论': <MessageCircle className="w-5 h-5" />,
  '点赞': <Heart className="w-5 h-5" />,
  '关注': <UserPlus className="w-5 h-5" />,
  '加入圈子': <UserPlus className="w-5 h-5" />,
  '课程上新': <Gift className="w-5 h-5" />,
  '直播预告': <Megaphone className="w-5 h-5" />,
  '会员到期': <AlertCircle className="w-5 h-5" />,
  '活动通知': <Gift className="w-5 h-5" />,
  '课程收益': <CreditCard className="w-5 h-5" />,
  '打赏收入': <Gift className="w-5 h-5" />,
  '分销收益': <CreditCard className="w-5 h-5" />,
  '提现通知': <CreditCard className="w-5 h-5" />,
  '订单': <ShoppingBag className="w-5 h-5" />,
  '退款': <CreditCard className="w-5 h-5" />,
  '客服': <Headphones className="w-5 h-5" />,
  '工单': <Headphones className="w-5 h-5" />,
}

// 类型颜色映射
const typeColors: Record<MessageType, string> = {
  interaction: 'bg-blue-100 text-blue-600',
  system: 'bg-amber-100 text-amber-600',
  income: 'bg-green-100 text-green-600',
  transaction: 'bg-purple-100 text-purple-600',
  service: 'bg-rose-100 text-rose-600',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Message[]>([])
  const [unreadCounts, setUnreadCounts] = useState<MessageUnreadCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)

  // 获取通知列表
  const fetchNotifications = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)
      
      const [listRes, countRes] = await Promise.all([
        getMessages(),
        getUnreadCounts(),
      ])
      
      if (listRes.code === 200) {
        setNotifications(listRes.data?.list || [])
      }
      if (countRes.code === 200) {
        setUnreadCounts(countRes.data)
      }
      setError(null)
    } catch (err) {
      setError('加载失败')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // 标记单条已读
  const handleMarkRead = async (notification: Message) => {
    if (!notification.isRead) {
      await markAsRead(notification.id)
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      )
      setUnreadCounts(prev => prev ? { ...prev, total: Math.max(0, prev.total - 1) } : null)
    }
    
    // 跳转到对应链接
    if (notification.link) {
      router.push(notification.link)
    }
  }

  // 全部已读
  const handleMarkAllRead = async () => {
    if (!unreadCounts || unreadCounts.total === 0) return
    
    setMarkingAllRead(true)
    try {
      const res = await markAllAsRead()
      if (res.code === 200) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCounts(prev => prev ? { 
          ...prev, 
          interaction: 0, 
          system: 0, 
          income: 0, 
          transaction: 0, 
          service: 0, 
          total: 0 
        } : null)
        toast.success('已全部标记为已读')
      }
    } catch {
      toast.error('操作失败')
    } finally {
      setMarkingAllRead(false)
    }
  }

  // 下拉刷新
  const handleRefresh = () => {
    fetchNotifications(true)
  }

  // 获取图标
  const getIcon = (category: string) => {
    return notificationIcons[category] || <Bell className="w-5 h-5" />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">通知</h1>
            {unreadCounts && unreadCounts.total > 0 && (
              <span className="px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                {unreadCounts.total > 99 ? '99+' : unreadCounts.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAllRead || !unreadCounts || unreadCounts.total === 0}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              全部已读
            </Button>
          </div>
        </div>
      </header>

      {/* 通知列表 */}
      <DataState
        isLoading={loading}
        error={error}
        isEmpty={notifications.length === 0}
        emptyMessage="暂无通知"
        onRetry={() => fetchNotifications()}
      >
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                !notification.isRead ? 'bg-primary/5' : ''
              }`}
              onClick={() => handleMarkRead(notification)}
            >
              {/* 图标 */}
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                typeColors[notification.type]
              }`}>
                {notification.avatar ? (
                  <img 
                    src={notification.avatar} 
                    alt="" 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  getIcon(notification.category)
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </span>
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-destructive rounded-full shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {notification.time}
                  </span>
                </div>
                <p className={`text-sm mt-1 line-clamp-2 ${
                  !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {notification.content}
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-muted rounded">
                  {notification.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        {notifications.length > 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            已显示全部通知
          </div>
        )}
      </DataState>

      {/* 加载骨架屏 */}
      {loading && (
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
