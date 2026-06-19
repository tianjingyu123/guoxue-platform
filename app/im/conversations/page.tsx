'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Search, 
  MoreVertical, 
  Pin, 
  BellOff, 
  Trash2, 
  Users,
  Bell,
  Headphones,
  X,
  MessageCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DataState } from '@/components/data-state'
import { 
  getConversations, 
  searchConversationsAndFriends, 
  deleteConversation,
  togglePinConversation,
  toggleMuteConversation,
  getMessageSummary
} from '@/lib/api/im'
import type { ConversationItem, FriendItem } from '@/lib/types/im'

export default function ConversationsPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 搜索相关
  const [showSearch, setShowSearch] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<{
    conversations: ConversationItem[]
    friends: FriendItem[]
  } | null>(null)
  const [searching, setSearching] = useState(false)
  
  // 操作相关
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  
  // 左滑状态
  const [swipedId, setSwipedId] = useState<string | null>(null)
  
  // 加载会话列表
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getConversations()
      if (res.code === 200 && res.data) {
        // 排序：置顶在前，然后按更新时间倒序
        const sorted = [...res.data.list].sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
        setConversations(sorted)
        setTotalUnread(res.data.totalUnread)
      } else {
        setError(res.message || '加载失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    loadConversations()
  }, [loadConversations])
  
  // 搜索
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchResults(null)
      return
    }
    
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchConversationsAndFriends(searchKeyword)
        if (res.code === 200 && res.data) {
          setSearchResults(res.data)
        }
      } finally {
        setSearching(false)
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchKeyword])
  
  // 进入聊天
  const handleEnterChat = (conversation: ConversationItem) => {
    if (conversation.type === 'private') {
      router.push(`/im/chat/${conversation.targetId}`)
    } else if (conversation.type === 'group') {
      router.push(`/im/group-chat/${conversation.targetId}`)
    } else if (conversation.type === 'service') {
      router.push('/customer-service')
    } else if (conversation.type === 'system') {
      router.push('/im/messages')
    }
  }
  
  // 置顶/取消置顶
  const handleTogglePin = async () => {
    if (!activeConversation) return
    setActionLoading(true)
    try {
      const res = await togglePinConversation(activeConversation.id, !activeConversation.isPinned)
      if (res.code === 200) {
        setConversations(prev => {
          const updated = prev.map(c => 
            c.id === activeConversation.id ? { ...c, isPinned: !c.isPinned } : c
          )
          return updated.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          })
        })
        setShowActions(false)
      }
    } finally {
      setActionLoading(false)
    }
  }
  
  // 免打扰
  const handleToggleMute = async () => {
    if (!activeConversation) return
    setActionLoading(true)
    try {
      const res = await toggleMuteConversation(activeConversation.id, !activeConversation.isMuted)
      if (res.code === 200) {
        setConversations(prev => 
          prev.map(c => 
            c.id === activeConversation.id ? { ...c, isMuted: !c.isMuted } : c
          )
        )
        setShowActions(false)
      }
    } finally {
      setActionLoading(false)
    }
  }
  
  // 删除会话
  const handleDelete = async () => {
    if (!activeConversation) return
    setActionLoading(true)
    try {
      const res = await deleteConversation(activeConversation.id)
      if (res.code === 200) {
        setConversations(prev => prev.filter(c => c.id !== activeConversation.id))
        setShowDeleteConfirm(false)
        setShowActions(false)
        setSwipedId(null)
      }
    } finally {
      setActionLoading(false)
    }
  }
  
  // 获取会话类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'group': return <Users className="w-3 h-3" />
      case 'system': return <Bell className="w-3 h-3" />
      case 'service': return <Headphones className="w-3 h-3" />
      default: return null
    }
  }
  
  // 渲染会话项
  const renderConversationItem = (conversation: ConversationItem) => {
    const isSwiped = swipedId === conversation.id
    
    return (
      <div 
        key={conversation.id}
        className="relative overflow-hidden"
      >
        {/* 左滑操作按钮 */}
        <div 
          className={`absolute right-0 top-0 bottom-0 flex transition-transform duration-200 ${
            isSwiped ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <button
            onClick={() => {
              setActiveConversation(conversation)
              setShowDeleteConfirm(true)
            }}
            className="w-20 bg-destructive text-destructive-foreground flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
        
        {/* 会话内容 */}
        <div
          className={`flex items-center gap-3 p-4 bg-background transition-transform duration-200 ${
            isSwiped ? '-translate-x-20' : 'translate-x-0'
          } ${conversation.isPinned ? 'bg-muted/30' : ''}`}
          onClick={() => {
            if (isSwiped) {
              setSwipedId(null)
            } else {
              handleEnterChat(conversation)
            }
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0]
            const startX = touch.clientX
            const startY = touch.clientY
            
            const handleMove = (e: TouchEvent) => {
              const touch = e.touches[0]
              const diffX = startX - touch.clientX
              const diffY = Math.abs(startY - touch.clientY)
              
              if (diffY < 30 && diffX > 50) {
                setSwipedId(conversation.id)
              } else if (diffX < -30) {
                setSwipedId(null)
              }
            }
            
            const handleEnd = () => {
              document.removeEventListener('touchmove', handleMove)
              document.removeEventListener('touchend', handleEnd)
            }
            
            document.addEventListener('touchmove', handleMove)
            document.addEventListener('touchend', handleEnd)
          }}
        >
          {/* 头像 */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
              <img 
                src={conversation.targetAvatar} 
                alt={conversation.targetName}
                className="w-full h-full object-cover"
              />
            </div>
            {/* 未读角标 */}
            {conversation.unreadCount > 0 && !conversation.isMuted && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs"
              >
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Badge>
            )}
            {/* 免打扰红点 */}
            {conversation.unreadCount > 0 && conversation.isMuted && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-muted-foreground/50 rounded-full" />
            )}
            {/* 类型标识 */}
            {conversation.type !== 'private' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                {getTypeIcon(conversation.type)}
              </div>
            )}
          </div>
          
          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`font-medium truncate ${conversation.unreadCount > 0 ? 'text-foreground' : 'text-foreground/80'}`}>
                  {conversation.targetName}
                </span>
                {conversation.isPinned && (
                  <Pin className="w-3 h-3 text-primary flex-shrink-0" />
                )}
                {conversation.isMuted && (
                  <BellOff className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {conversation.lastMessage.time}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {conversation.draft ? (
                <p className="text-sm text-destructive truncate">
                  [草稿] {conversation.draft}
                </p>
              ) : (
                <p className={`text-sm truncate ${
                  conversation.unreadCount > 0 ? 'text-foreground/70' : 'text-muted-foreground'
                }`}>
                  {getMessageSummary(conversation.lastMessage)}
                </p>
              )}
            </div>
          </div>
          
          {/* 更多按钮 */}
          <button
            className="p-1 -mr-1 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation()
              setActiveConversation(conversation)
              setShowActions(true)
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">消息</h1>
            {totalUnread > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalUnread > 99 ? '99+' : totalUnread}
              </Badge>
            )}
          </div>
          <button onClick={() => setShowSearch(true)}>
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>
      
      {/* 会话列表 */}
      <DataState
        loading={loading}
        error={error}
        empty={conversations.length === 0}
        emptyMessage="暂无消息"
        emptyIcon={<MessageCircle className="w-12 h-12" />}
        onRetry={loadConversations}
        skeleton={
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-40 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        <div className="divide-y">
          {conversations.map(renderConversationItem)}
        </div>
      </DataState>
      
      {/* 搜索弹层 */}
      <Sheet open={showSearch} onOpenChange={setShowSearch}>
        <SheetContent side="top" className="h-full">
          <SheetHeader className="sr-only">
            <SheetTitle>搜索</SheetTitle>
          </SheetHeader>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索好友或聊天记录"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
                autoFocus
              />
              {searchKeyword && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchKeyword('')}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button variant="ghost" onClick={() => setShowSearch(false)}>
              取消
            </Button>
          </div>
          
          {searching ? (
            <div className="text-center text-muted-foreground py-8">
              搜索中...
            </div>
          ) : searchResults ? (
            <div className="space-y-4">
              {/* 好友结果 */}
              {searchResults.friends.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">好友</h3>
                  <div className="space-y-1">
                    {searchResults.friends.map(friend => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setShowSearch(false)
                          router.push(`/im/chat/${friend.id}`)
                        }}
                      >
                        <img 
                          src={friend.avatar} 
                          alt={friend.nickname}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium">{friend.remark || friend.nickname}</p>
                          {friend.signature && (
                            <p className="text-sm text-muted-foreground truncate">{friend.signature}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 会话结果 */}
              {searchResults.conversations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">聊天记录</h3>
                  <div className="space-y-1">
                    {searchResults.conversations.map(conv => (
                      <div
                        key={conv.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setShowSearch(false)
                          handleEnterChat(conv)
                        }}
                      >
                        <img 
                          src={conv.targetAvatar} 
                          alt={conv.targetName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{conv.targetName}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {getMessageSummary(conv.lastMessage)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {searchResults.friends.length === 0 && searchResults.conversations.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  未找到相关结果
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              输入关键词搜索好友或聊天记录
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      {/* 操作菜单 */}
      <Sheet open={showActions} onOpenChange={setShowActions}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader className="sr-only">
            <SheetTitle>会话操作</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2 py-2">
            <button
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 rounded-lg transition-colors"
              onClick={handleTogglePin}
              disabled={actionLoading}
            >
              <Pin className="w-5 h-5" />
              <span>{activeConversation?.isPinned ? '取消置顶' : '置顶聊天'}</span>
            </button>
            
            <button
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 rounded-lg transition-colors"
              onClick={handleToggleMute}
              disabled={actionLoading}
            >
              <BellOff className="w-5 h-5" />
              <span>{activeConversation?.isMuted ? '取消免打扰' : '消息免打扰'}</span>
            </button>
            
            <button
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 rounded-lg transition-colors text-destructive"
              onClick={() => {
                setShowActions(false)
                setShowDeleteConfirm(true)
              }}
            >
              <Trash2 className="w-5 h-5" />
              <span>删除会话</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* 删除确认 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除会话</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除与"{activeConversation?.targetName}"的会话吗？聊天记录将被清空且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
