'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  MoreVertical, 
  Send, 
  Plus, 
  Image as ImageIcon, 
  Camera, 
  Mic, 
  ShoppingBag,
  X,
  Check,
  CheckCheck,
  Copy,
  Trash2,
  RotateCcw,
  Play,
  Pause,
  Loader2,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { toast } from 'sonner'
import { DataState, LoadingSkeleton } from '@/components/data-state'
import { 
  getChatTarget, 
  getChatHistory, 
  sendC2CMessage, 
  withdrawMessage, 
  deleteMessage,
  searchProducts,
  uploadChatImage,
  formatMessageTime,
  shouldShowTimeLabel,
  canWithdrawMessage,
  getChatPermission
} from '@/lib/api/im'
import type { ChatTarget, ChatMessage, ProductCard } from '@/lib/types/im'

const CURRENT_USER_ID = 0

export default function PrivateChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSkeleton /></div>}>
      <PrivateChatContent />
    </Suspense>
  )
}

function PrivateChatContent() {
  const params = useParams()
  const router = useRouter()
  const targetId = Number(params.id)
  
  const [target, setTarget] = useState<ChatTarget | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [showMorePanel, setShowMorePanel] = useState(false)
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productKeyword, setProductKeyword] = useState('')
  const [products, setProducts] = useState<ProductCard[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null)
  const [showMessageActions, setShowMessageActions] = useState(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [isRecording, setIsRecording] = useState(false)
  const [recordingCancelled, setRecordingCancelled] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // 加载聊天对象和历史消息
  useEffect(() => {
    async function loadChat() {
      setLoading(true)
      setError(null)
      try {
        const [targetRes, historyRes] = await Promise.all([
          getChatTarget(targetId),
          getChatHistory(targetId)
        ])
        
        if (targetRes.code === 200 && targetRes.data) {
          setTarget(targetRes.data)
        }
        
        if (historyRes.code === 200 && historyRes.data) {
          setMessages(historyRes.data.messages)
          setHasMore(historyRes.data.hasMore)
        }
      } catch {
        setError('加载失败，请重试')
      } finally {
        setLoading(false)
      }
    }
    
    loadChat()
  }, [targetId])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 加载更多历史消息
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return
    
    setLoadingMore(true)
    try {
      const oldestMsgId = messages[0]?.id
      const res = await getChatHistory(targetId, oldestMsgId)
      if (res.code === 200 && res.data) {
        setMessages(prev => [...res.data.messages, ...prev])
        setHasMore(res.data.hasMore)
      }
    } finally {
      setLoadingMore(false)
    }
  }, [targetId, messages, loadingMore, hasMore])

  // 发送文字消息
  const handleSendText = async () => {
    if (!inputText.trim() || sending) return
    
    const content = inputText.trim()
    setInputText('')
    setSending(true)
    
    // 乐观更新
    const tempMessage: ChatMessage = {
      id: 'temp_' + Date.now(),
      senderId: CURRENT_USER_ID,
      senderName: '我',
      senderAvatar: '/placeholder.svg',
      type: 'text',
      content,
      status: 'sending',
      isWithdrawn: false,
      createdAt: new Date().toLocaleString('zh-CN'),
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, tempMessage])
    
    try {
      const res = await sendC2CMessage({ targetId, type: 'text', content })
      if (res.code === 200 && res.data) {
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id 
            ? { ...m, id: res.data.messageId, status: 'sent' as const }
            : m
        ))
      }
    } catch {
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id ? { ...m, status: 'failed' as const } : m
      ))
      toast.error('发送失败')
    } finally {
      setSending(false)
    }
  }

  // 发送图片
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // 乐观更新
    const tempUrl = URL.createObjectURL(file)
    const tempMessage: ChatMessage = {
      id: 'temp_' + Date.now(),
      senderId: CURRENT_USER_ID,
      senderName: '我',
      senderAvatar: '/placeholder.svg',
      type: 'image',
      content: '',
      image: { url: tempUrl, width: 200, height: 200 },
      status: 'sending',
      isWithdrawn: false,
      createdAt: new Date().toLocaleString('zh-CN'),
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, tempMessage])
    setShowMorePanel(false)
    
    try {
      const uploadRes = await uploadChatImage(file)
      if (uploadRes.code === 200 && uploadRes.data) {
        const res = await sendC2CMessage({ targetId, type: 'image', imageUrl: uploadRes.data.url })
        if (res.code === 200) {
          setMessages(prev => prev.map(m => 
            m.id === tempMessage.id 
              ? { ...m, id: res.data.messageId, status: 'sent' as const, image: { ...m.image!, url: uploadRes.data.url } }
              : m
          ))
        }
      }
    } catch {
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id ? { ...m, status: 'failed' as const } : m
      ))
      toast.error('发送失败')
    }
    
    e.target.value = ''
  }

  // 发送商品卡片
  const handleSendProduct = async (product: ProductCard) => {
    setShowProductSearch(false)
    
    const tempMessage: ChatMessage = {
      id: 'temp_' + Date.now(),
      senderId: CURRENT_USER_ID,
      senderName: '我',
      senderAvatar: '/placeholder.svg',
      type: 'card',
      content: '',
      product,
      status: 'sending',
      isWithdrawn: false,
      createdAt: new Date().toLocaleString('zh-CN'),
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, tempMessage])
    
    try {
      const res = await sendC2CMessage({ targetId, type: 'card', productId: product.id })
      if (res.code === 200) {
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id ? { ...m, id: res.data.messageId, status: 'sent' as const } : m
        ))
      }
    } catch {
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id ? { ...m, status: 'failed' as const } : m
      ))
      toast.error('发送失败')
    }
  }

  // 搜索商品
  const handleSearchProducts = async () => {
    setSearchingProducts(true)
    try {
      const res = await searchProducts(productKeyword)
      if (res.code === 200 && res.data) {
        setProducts(res.data)
      }
    } finally {
      setSearchingProducts(false)
    }
  }

  // 长按消息
  const handleMessageLongPress = (message: ChatMessage) => {
    if (message.isWithdrawn) return
    setSelectedMessage(message)
    setShowMessageActions(true)
  }

  // 复制消息
  const handleCopyMessage = () => {
    if (selectedMessage?.content) {
      navigator.clipboard.writeText(selectedMessage.content)
      toast.success('已复制')
    }
    setShowMessageActions(false)
  }

  // 撤回消息
  const handleWithdrawMessage = async () => {
    if (!selectedMessage) return
    setShowWithdrawConfirm(false)
    setShowMessageActions(false)
    
    try {
      const res = await withdrawMessage(selectedMessage.id)
      if (res.code === 200) {
        setMessages(prev => prev.map(m => 
          m.id === selectedMessage.id ? { ...m, isWithdrawn: true, content: '消息已撤回' } : m
        ))
        toast.success('已撤回')
      }
    } catch {
      toast.error('撤回失败')
    }
  }

  // 删除消息
  const handleDeleteMessage = async () => {
    if (!selectedMessage) return
    setShowDeleteConfirm(false)
    setShowMessageActions(false)
    
    try {
      const res = await deleteMessage(selectedMessage.id)
      if (res.code === 200) {
        setMessages(prev => prev.filter(m => m.id !== selectedMessage.id))
        toast.success('已删除')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  // 渲染消息状态图标
  const renderMessageStatus = (status: string) => {
    switch (status) {
      case 'sending':
        return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />
      case 'read':
        return <CheckCheck className="w-3 h-3 text-primary" />
      case 'failed':
        return <span className="text-xs text-destructive">失败</span>
      default:
        return null
    }
  }

  // 渲染消息内容
  const renderMessageContent = (message: ChatMessage) => {
    if (message.isWithdrawn) {
      return <span className="text-muted-foreground text-sm italic">消息已撤回</span>
    }
    
    switch (message.type) {
      case 'text':
        return <p className="whitespace-pre-wrap break-words">{message.content}</p>
      
      case 'image':
        return (
          <img 
            src={message.image?.url} 
            alt="图片消息"
            className="max-w-[200px] max-h-[200px] rounded-lg cursor-pointer"
            onClick={() => window.open(message.image?.url, '_blank')}
          />
        )
      
      case 'voice':
        return (
          <div className="flex items-center gap-2 min-w-[100px]">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Play className="w-4 h-4" />
            </Button>
            <span className="text-sm">{message.voice?.duration}″</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-current w-0" />
            </div>
          </div>
        )
      
      case 'card':
        return (
          <Link 
            href={`/shop/product/${message.product?.id}`}
            className="block bg-background rounded-lg overflow-hidden border"
          >
            <div className="flex gap-3 p-3">
              <img 
                src={message.product?.cover} 
                alt={message.product?.title}
                className="w-16 h-16 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2">{message.product?.title}</h4>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-primary font-bold">¥{message.product?.price}</span>
                  {message.product?.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      ¥{message.product.originalPrice}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )
      
      default:
        return <p>{message.content}</p>
    }
  }

  // 计算消息权限（好友关系控制）
  const permission = target
    ? getChatPermission(target, messages, CURRENT_USER_ID)
    : { state: 'unrestricted' as const, canSend: true, hint: '' }

  // 发送前的权限校验
  const guardedSendText = () => {
    if (!permission.canSend) return
    handleSendText()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DataState isLoading={true} />
      </div>
    )
  }

  if (error || !target) {
    return (
      <div className="min-h-screen bg-background">
        <DataState 
          isError={true} 
          errorMessage={error || '加载失败'} 
          onRetry={() => window.location.reload()} 
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link href={`/user/${target.id}`} className="flex items-center gap-2">
              <div className="relative">
                <img 
                  src={target.avatar} 
                  alt={target.nickname}
                  className="w-9 h-9 rounded-full object-cover"
                />
                {target.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                )}
              </div>
              <div>
                <h1 className="font-medium text-sm">{target.remark || target.nickname}</h1>
                <p className="text-xs text-muted-foreground">
                  {target.isOnline ? '在线' : target.lastActiveAt || '离线'}
                </p>
              </div>
            </Link>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/user/${target.id}`)}>
                查看主页
              </DropdownMenuItem>
              <DropdownMenuItem>清空聊天记录</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                {target.isBlocked ? '移出黑名单' : '加入黑名单'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 消息列表 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={(e) => {
          const { scrollTop } = e.currentTarget
          if (scrollTop < 50 && hasMore && !loadingMore) {
            loadMoreMessages()
          }
        }}
      >
        {/* 加载更多指示器 */}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {hasMore && !loadingMore && messages.length > 0 && (
          <button 
            className="w-full text-center text-sm text-muted-foreground py-2"
            onClick={loadMoreMessages}
          >
            加载更多消息
          </button>
        )}

        {messages.map((message, index) => {
          const isMine = message.senderId === CURRENT_USER_ID
          const prevMessage = messages[index - 1]
          const showTime = shouldShowTimeLabel(message.timestamp, prevMessage?.timestamp)
          
          return (
            <div key={message.id}>
              {/* 时间标签 */}
              {showTime && (
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {formatMessageTime(message.timestamp)}
                  </span>
                </div>
              )}
              
              {/* 消息气泡 */}
              <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                {/* 头像 */}
                <Link href={isMine ? '/profile' : `/user/${message.senderId}`}>
                  <img 
                    src={message.senderAvatar}
                    alt={message.senderName}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                </Link>
                
                {/* 消息内容 */}
                <div 
                  className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    handleMessageLongPress(message)
                  }}
                >
                  <div 
                    className={`
                      rounded-2xl px-4 py-2.5
                      ${message.type === 'card' ? 'p-0 bg-transparent' : ''}
                      ${isMine 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-background rounded-tl-sm'
                      }
                      ${message.isWithdrawn ? 'bg-muted' : ''}
                    `}
                  >
                    {renderMessageContent(message)}
                  </div>
                  
                  {/* 消息状态 */}
                  {isMine && (
                    <div className="flex items-center gap-1 px-1">
                      {renderMessageStatus(message.status)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入区 */}
      <div className="sticky bottom-0 bg-background border-t p-3">
        {/* 消息权限提示条 */}
        {permission.hint && (
          <div
            className={`flex items-center gap-1.5 mb-2 px-3 py-2 rounded-lg text-xs leading-relaxed ${
              permission.state === 'unrestricted' || permission.state === 'replied'
                ? 'bg-green-50 text-green-600'
                : permission.state === 'blocked'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {(permission.state === 'unrestricted' || permission.state === 'replied') && (
              <Check className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{permission.hint}</span>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            disabled={!permission.canSend}
            onClick={() => setShowMorePanel(!showMorePanel)}
          >
            <Plus className={`w-5 h-5 transition-transform ${showMorePanel ? 'rotate-45' : ''}`} />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!permission.canSend}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  guardedSendText()
                }
              }}
              placeholder={
                permission.state === 'waiting_reply'
                  ? '等待对方回复...'
                  : permission.state === 'blocked'
                    ? '已加入黑名单'
                    : permission.state === 'can_greet'
                      ? '发送一条打招呼消息...'
                      : '输入消息...'
              }
              className="pr-10 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          
          {inputText.trim() ? (
            <Button 
              size="icon" 
              onClick={guardedSendText}
              disabled={sending || !permission.canSend}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon"
              disabled={!permission.canSend}
              onTouchStart={() => {
                if (!permission.canSend) return
                setIsRecording(true)
                setRecordingCancelled(false)
              }}
              onTouchEnd={() => {
                if (!recordingCancelled) {
                  toast.info('语音功能开发中')
                }
                setIsRecording(false)
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0]
                const element = e.currentTarget.getBoundingClientRect()
                if (touch.clientY < element.top - 50) {
                  setRecordingCancelled(true)
                }
              }}
            >
              <Mic className={`w-5 h-5 ${isRecording ? 'text-destructive' : ''}`} />
            </Button>
          )}
        </div>
        
        {/* 更多功能面板 */}
        {showMorePanel && permission.canSend && (
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <button 
              className="flex flex-col items-center gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs">相册</span>
            </button>
            
            <button className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs">拍照</span>
            </button>
            
            <button className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs">语音</span>
            </button>
            
            <button 
              className="flex flex-col items-center gap-2"
              onClick={() => {
                setShowProductSearch(true)
                setShowMorePanel(false)
                handleSearchProducts()
              }}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs">商品</span>
            </button>
          </div>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* 消息操作菜单 */}
      <Sheet open={showMessageActions} onOpenChange={setShowMessageActions}>
        <SheetContent side="bottom" className="h-auto">
          <div className="grid grid-cols-4 gap-4 py-4">
            {selectedMessage?.type === 'text' && (
              <button 
                className="flex flex-col items-center gap-2"
                onClick={handleCopyMessage}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Copy className="w-5 h-5" />
                </div>
                <span className="text-xs">复制</span>
              </button>
            )}
            
            {selectedMessage?.senderId === CURRENT_USER_ID && 
             canWithdrawMessage(selectedMessage?.timestamp || 0) && (
              <button 
                className="flex flex-col items-center gap-2"
                onClick={() => setShowWithdrawConfirm(true)}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <span className="text-xs">撤回</span>
              </button>
            )}
            
            <button 
              className="flex flex-col items-center gap-2"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <span className="text-xs">删除</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 商品搜索弹层 */}
      <Sheet open={showProductSearch} onOpenChange={setShowProductSearch}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>选择商品</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4">
            <div className="flex gap-2">
              <Input
                value={productKeyword}
                onChange={(e) => setProductKeyword(e.target.value)}
                placeholder="搜索商品"
                onKeyDown={(e) => e.key === 'Enter' && handleSearchProducts()}
              />
              <Button onClick={handleSearchProducts} disabled={searchingProducts}>
                {searchingProducts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto">
              {products.map(product => (
                <button
                  key={product.id}
                  className="flex gap-3 p-3 w-full text-left rounded-lg hover:bg-muted transition-colors"
                  onClick={() => handleSendProduct(product)}
                >
                  <img 
                    src={product.cover} 
                    alt={product.title}
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium line-clamp-2">{product.title}</h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-primary font-bold">¥{product.price}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through">
                          ¥{product.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              
              {products.length === 0 && !searchingProducts && (
                <div className="text-center text-muted-foreground py-8">
                  暂无商品
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 撤回确认 */}
      <AlertDialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤回消息</AlertDialogTitle>
            <AlertDialogDescription>
              确定要撤回这条消息吗？撤回后对方将无法看到。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdrawMessage}>撤回</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除消息</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条消息吗？删除后仅自己不可见。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
