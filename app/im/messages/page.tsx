'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Bell, 
  Heart, 
  CreditCard, 
  Headphones, 
  CheckCheck,
  MessageCircle,
  ThumbsUp,
  UserPlus,
  Gift,
  ShoppingCart,
  Package,
  RefreshCcw,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { DataState } from '@/components/data-state'
import { getMessages, getUnreadCounts, markAsRead, markAllAsRead } from '@/lib/api/messages'
import type { Message, MessageType, MessageUnreadCounts } from '@/lib/types/messages'

// 消息分类配置
const MESSAGE_TABS: Array<{
  key: MessageType | 'all'
  label: string
  icon: React.ReactNode
}> = [
  { key: 'system', label: '系统通知', icon: <Bell className="w-4 h-4" /> },
  { key: 'interaction', label: '互动消息', icon: <Heart className="w-4 h-4" /> },
  { key: 'transaction', label: '交易消息', icon: <CreditCard className="w-4 h-4" /> },
  { key: 'service', label: '客服消息', icon: <Headphones className="w-4 h-4" /> },
]

// 消息分类图标
function getCategoryIcon(type: MessageType, category: string) {
  // 互动消息
  if (type === 'interaction') {
    if (category === '评论') return <MessageCircle className="w-5 h-5 text-blue-500" />
    if (category === '点赞') return <ThumbsUp className="w-5 h-5 text-red-500" />
    if (category === '关注') return <UserPlus className="w-5 h-5 text-green-500" />
    return <Heart className="w-5 h-5 text-pink-500" />
  }
  // 系统消息
  if (type === 'system') {
    if (category.includes('直播')) return <Gift className="w-5 h-5 text-purple-500" />
    if (category.includes('课程')) return <Bell className="w-5 h-5 text-blue-500" />
    return <Bell className="w-5 h-5 text-amber-500" />
  }
  // 交易消息
  if (type === 'transaction') {
    if (category === '订单') return <ShoppingCart className="w-5 h-5 text-green-500" />
    if (category === '退款') return <RefreshCcw className="w-5 h-5 text-orange-500" />
    return <Package className="w-5 h-5 text-blue-500" />
  }
  // 客服消息
  if (type === 'service') {
    return <Headphones className="w-5 h-5 text-primary" />
  }
  // 收益消息
  if (type === 'income') {
    return <CreditCard className="w-5 h-5 text-green-500" />
  }
  return <Bell className="w-5 h-5 text-muted-foreground" />
}

export default function MessagesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<MessageType | 'all'>('system')
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCounts, setUnreadCounts] = useState<MessageUnreadCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingAllRead, setMarkingAllRead] = useState(false)

  // 加载消息
  const loadMessages = async () => {
    setLoading(true)
    setError(null)
    try {
      const [messagesRes, countsRes] = await Promise.all([
        getMessages(activeTab === 'all' ? undefined : activeTab),
        getUnreadCounts(),
      ])
      if (messagesRes.code === 200) {
        setMessages(messagesRes.data)
      }
      if (countsRes.code === 200) {
        setUnreadCounts(countsRes.data)
      }
    } catch {
      setError('加载消息失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [activeTab])

  // 标记单条已读
  const handleMarkRead = async (message: Message) => {
    if (message.isRead) {
      // 已读则直接跳转
      if (message.link) {
        router.push(message.link)
      }
      return
    }
    
    try {
      await markAsRead(message.id)
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, isRead: true } : m
      ))
      // 更新未读数
      if (unreadCounts) {
        setUnreadCounts({
          ...unreadCounts,
          [message.type]: Math.max(0, unreadCounts[message.type] - 1),
          total: Math.max(0, unreadCounts.total - 1),
        })
      }
      // 跳转
      if (message.link) {
        router.push(message.link)
      }
    } catch {
      toast.error('操作失败')
    }
  }

  // 全部已读
  const handleMarkAllRead = async () => {
    setMarkingAllRead(true)
    try {
      const res = await markAllAsRead(activeTab === 'all' ? undefined : activeTab)
      if (res.code === 200) {
        setMessages(prev => prev.map(m => ({ ...m, isRead: true })))
        // 更新未读数
        if (unreadCounts) {
          if (activeTab === 'all') {
            setUnreadCounts({
              interaction: 0,
              system: 0,
              income: 0,
              transaction: 0,
              service: 0,
              total: 0,
            })
          } else {
            setUnreadCounts({
              ...unreadCounts,
              [activeTab]: 0,
              total: unreadCounts.total - unreadCounts[activeTab],
            })
          }
        }
        toast.success('已全部标为已读')
      }
    } catch {
      toast.error('操作失败')
    } finally {
      setMarkingAllRead(false)
    }
  }

  // 获取当前Tab未读数
  const getCurrentUnreadCount = () => {
    if (!unreadCounts) return 0
    if (activeTab === 'all') return unreadCounts.total
    return unreadCounts[activeTab] || 0
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold">消息中心</h1>
          </div>
          {getCurrentUnreadCount() > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="text-primary"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              全部已读
            </Button>
          )}
        </div>

        {/* 分类Tab */}
        <div className="flex border-b overflow-x-auto no-scrollbar">
          {MESSAGE_TABS.map(tab => {
            const count = unreadCounts ? unreadCounts[tab.key as MessageType] || 0 : 0
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as MessageType)}
                className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 py-3 px-2 relative transition-colors ${
                  activeTab === tab.key 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                <div className="relative">
                  {tab.icon}
                  {count > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
                <span className="text-xs">{tab.label}</span>
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* 消息列表 */}
      <DataState
        isLoading={loading}
        error={error}
        isEmpty={messages.length === 0}
        emptyTitle="暂无消息"
        emptyDescription="当前分类下没有消息"
        onRetry={loadMessages}
        loadingComponent={
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        <div className="divide-y">
          {messages.map(message => (
            <div
              key={message.id}
              onClick={() => handleMarkRead(message)}
              className={`flex gap-3 p-4 cursor-pointer active:bg-accent/50 transition-colors ${
                !message.isRead ? 'bg-primary/5' : ''
              }`}
            >
              {/* 图标/头像 */}
              <div className="shrink-0">
                {message.avatar ? (
                  <div className="relative">
                    <img 
                      src={message.avatar} 
                      alt="" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {!message.isRead && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background" />
                    )}
                  </div>
                ) : (
                  <div className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {getCategoryIcon(message.type, message.category)}
                    {!message.isRead && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background" />
                    )}
                  </div>
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${!message.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {message.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {message.category}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {message.time}
                  </span>
                </div>
                <p className={`text-sm mt-1 line-clamp-2 ${!message.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {message.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        {messages.length > 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            — 已显示全部消息 —
          </div>
        )}
      </DataState>
    </div>
  )
}
