'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Send, 
  Image as ImageIcon, 
  Headphones,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  X,
  Loader2,
  MessageCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { DataStateLoading } from '@/components/data-state'
import { 
  getCSConfig, 
  getOrCreateCSSession, 
  sendCSMessageStream, 
  requestTransferToHuman,
  cancelTransfer,
  submitRating,
  uploadCSImage 
} from '@/lib/api/customer-service'
import type { CSMessage, CSConfig, CSSessionStatus } from '@/lib/types/customer-service'

export default function CustomerServicePage() {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [config, setConfig] = useState<CSConfig | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [sessionStatus, setSessionStatus] = useState<CSSessionStatus>('ai')
  const [messages, setMessages] = useState<CSMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [showRatingDialog, setShowRatingDialog] = useState(false)
  const [ratingMessageId, setRatingMessageId] = useState<string>('')
  const [ratingValue, setRatingValue] = useState<'positive' | 'negative' | null>(null)
  const [ratingComment, setRatingComment] = useState('')
  const [queueInfo, setQueueInfo] = useState<{ position: number; wait: string } | null>(null)

  // 初始化
  useEffect(() => {
    async function init() {
      try {
        const [configRes, sessionRes] = await Promise.all([
          getCSConfig(),
          getOrCreateCSSession(),
        ])
        
        if (configRes.code === 200) {
          setConfig(configRes.data)
          // 添加欢迎消息
          const welcomeMsg: CSMessage = {
            id: 'welcome',
            role: 'assistant',
            type: 'text',
            content: configRes.data.welcomeMessage,
            suggestions: configRes.data.suggestions,
            createdAt: new Date().toISOString(),
          }
          setMessages([welcomeMsg])
        }
        
        if (sessionRes.code === 200) {
          setSessionId(sessionRes.data.id)
        }
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSend = async (content?: string) => {
    const text = content || inputValue.trim()
    if (!text || isSending) return

    setInputValue('')
    setIsSending(true)

    // 添加用户消息
    const userMsg: CSMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      type: 'text',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    // 添加AI回复占位
    const aiMsgId = 'ai_' + Date.now()
    const aiMsg: CSMessage = {
      id: aiMsgId,
      role: 'assistant',
      type: 'text',
      content: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, aiMsg])

    // 流式接收回复
    await sendCSMessageStream(sessionId, text, {
      onToken: (token) => {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, content: msg.content + token }
            : msg
        ))
      },
      onComplete: (completeMsg) => {
        setMessages(prev => prev.map(msg =>
          msg.id === aiMsgId
            ? { ...completeMsg, id: aiMsgId, isStreaming: false }
            : msg
        ))
        setIsSending(false)
      },
      onError: () => {
        setMessages(prev => prev.map(msg =>
          msg.id === aiMsgId
            ? { ...msg, content: '抱歉，系统出现异常，请稍后再试或转人工客服。', isStreaming: false }
            : msg
        ))
        setIsSending(false)
      },
    })
  }

  // 上传图片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const res = await uploadCSImage(file)
    if (res.code === 200) {
      const imgMsg: CSMessage = {
        id: 'img_' + Date.now(),
        role: 'user',
        type: 'image',
        content: '',
        image: res.data,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, imgMsg])
    }
    e.target.value = ''
  }

  // 转人工
  const handleTransfer = async () => {
    setIsTransferring(true)
    const res = await requestTransferToHuman(sessionId)
    if (res.code === 200) {
      setSessionStatus('waiting')
      setQueueInfo({
        position: res.data.queuePosition,
        wait: res.data.estimatedWait,
      })
      // 添加系统消息
      const sysMsg: CSMessage = {
        id: 'transfer_' + Date.now(),
        role: 'system',
        type: 'transfer',
        content: `已为您转接人工客服，当前排队${res.data.queuePosition}人，预计等待${res.data.estimatedWait}`,
        transfer: {
          queuePosition: res.data.queuePosition,
          estimatedWait: res.data.estimatedWait,
        },
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, sysMsg])
    }
    setIsTransferring(false)
    setShowTransferDialog(false)
  }

  // 取消转人工
  const handleCancelTransfer = async () => {
    await cancelTransfer(sessionId)
    setSessionStatus('ai')
    setQueueInfo(null)
  }

  // 提交评价
  const handleSubmitRating = async () => {
    if (!ratingValue) return
    
    await submitRating({
      sessionId,
      messageId: ratingMessageId,
      value: ratingValue,
      comment: ratingComment,
    })
    
    // 更新消息状态
    setMessages(prev => prev.map(msg =>
      msg.id === ratingMessageId
        ? { ...msg, rating: { value: ratingValue, comment: ratingComment } }
        : msg
    ))
    
    setShowRatingDialog(false)
    setRatingMessageId('')
    setRatingValue(null)
    setRatingComment('')
  }

  // 开始评价
  const startRating = (messageId: string, value: 'positive' | 'negative') => {
    setRatingMessageId(messageId)
    setRatingValue(value)
    if (value === 'negative') {
      setShowRatingDialog(true)
    } else {
      // 直接提交正面评价
      submitRating({ sessionId, messageId, value })
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, rating: { value, comment: undefined } }
          : msg
      ))
    }
  }

  if (isLoading) {
    return <DataStateLoading message="连接客服中..." />
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-primary text-primary-foreground">客</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">智能客服</span>
                {sessionStatus === 'waiting' && (
                  <Badge variant="secondary" className="text-xs">排队中</Badge>
                )}
                {sessionStatus === 'human' && (
                  <Badge className="bg-green-500 text-xs">人工服务</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {config?.workingHours ? `服务时间 ${config.workingHours}` : '在线服务'}
              </p>
            </div>
          </div>
          
          {sessionStatus === 'ai' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTransferDialog(true)}
              disabled={isTransferring}
            >
              <Headphones className="h-4 w-4 mr-1" />
              转人工
            </Button>
          )}
          {sessionStatus === 'waiting' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCancelTransfer}
            >
              取消排队
            </Button>
          )}
        </div>
      </header>

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id}>
              {/* 系统消息 */}
              {msg.role === 'system' && (
                <div className="flex justify-center">
                  <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm text-muted-foreground text-center max-w-xs">
                    {msg.type === 'transfer' && msg.transfer && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>排队中 第{msg.transfer.queuePosition}位 预计{msg.transfer.estimatedWait}</span>
                      </div>
                    )}
                    {msg.type !== 'transfer' && msg.content}
                  </div>
                </div>
              )}

              {/* 用户消息 */}
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-[80%]">
                    {msg.type === 'image' && msg.image && (
                      <img 
                        src={msg.image.url} 
                        alt="上传图片" 
                        className="max-w-[200px] rounded-lg"
                      />
                    )}
                    {msg.type === 'text' && (
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI/人工消息 */}
              {(msg.role === 'assistant' || msg.role === 'human') && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {msg.role === 'human' ? '人' : 'AI'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                      {/* 消息内容 */}
                      <div className="prose prose-sm max-w-none text-foreground">
                        {msg.content.split('\n').map((line, i) => (
                          <p key={i} className="mb-1 last:mb-0">
                            {line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .split('<strong>').map((part, j) => {
                                if (part.includes('</strong>')) {
                                  const [bold, rest] = part.split('</strong>')
                                  return <span key={j}><strong>{bold}</strong>{rest}</span>
                                }
                                return part
                              })}
                          </p>
                        ))}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                        )}
                      </div>
                      
                      {/* 知识引用 */}
                      {msg.references && msg.references.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2">相关帮助：</p>
                          <div className="space-y-1">
                            {msg.references.map((ref) => (
                              <a
                                key={ref.id}
                                href={ref.url}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {ref.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 推荐问题 */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.suggestions.map((suggestion, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="h-auto py-1.5 px-3 text-xs"
                            onClick={() => handleSend(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* 满意度评价 */}
                    {!msg.isStreaming && msg.type === 'text' && !msg.rating && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">这条回复有帮助吗？</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => startRating(msg.id, 'positive')}
                        >
                          <ThumbsUp className="h-4 w-4 text-muted-foreground hover:text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => startRating(msg.id, 'negative')}
                        >
                          <ThumbsDown className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                        </Button>
                      </div>
                    )}
                    {msg.rating && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {msg.rating.value === 'positive' ? (
                          <>
                            <ThumbsUp className="h-3 w-3 text-green-500" />
                            <span>已反馈有帮助</span>
                          </>
                        ) : (
                          <>
                            <ThumbsDown className="h-3 w-3 text-red-500" />
                            <span>已反馈</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 底部输入区 */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Input
              placeholder="请输入您的问题..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={isSending}
              className="flex-1"
            />
            <Button
              size="icon"
              disabled={!inputValue.trim() || isSending}
              onClick={() => handleSend()}
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 转人工确认对话框 */}
      <AlertDialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>转接人工客服</AlertDialogTitle>
            <AlertDialogDescription>
              {config?.isHumanAvailable ? (
                <>
                  当前有 {config.currentQueueCount} 人排队，预计等待约 {Math.ceil(config.currentQueueCount * 2)} 分钟。
                  <br />是否确认转接人工客服？
                </>
              ) : (
                <>
                  当前非服务时间（{config?.workingHours}），暂无人工客服在线。
                  <br />您可以留言，我们会尽快回复。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer} disabled={isTransferring}>
              {isTransferring ? '转接中...' : '确认转接'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 负面评价详情对话框 */}
      <AlertDialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>反馈问题</AlertDialogTitle>
            <AlertDialogDescription>
              感谢您的反馈，请告诉我们这条回复哪里不满意，帮助我们改进。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="请描述您的问题或建议（选填）"
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRatingDialog(false)
              setRatingValue(null)
              setRatingComment('')
            }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitRating}>
              提交反馈
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
