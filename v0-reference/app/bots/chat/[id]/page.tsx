'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  MoreVertical, 
  Send, 
  Mic, 
  ImagePlus, 
  Paperclip,
  Phone,
  History,
  Trash2,
  Settings,
  Share2,
  MicOff,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { DataState, LoadingSkeleton } from '@/components/data-state'
import { 
  getBotDetail, 
  getChatHistory, 
  sendMessageStream,
  uploadChatFile,
  createVoiceRoom
} from '@/lib/api/bots'
import type { BotDetail, ChatMessage } from '@/lib/types/bots'

export default function BotChatPage() {
  const params = useParams()
  const router = useRouter()
  const botId = Number(params.id)
  
  const [botDetail, setBotDetail] = useState<BotDetail | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  
  // 加载 Bot 详情和对话历史
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const [detailRes, historyRes] = await Promise.all([
          getBotDetail(botId),
          getChatHistory(botId)
        ])
        
        if (detailRes.code === 200) {
          setBotDetail(detailRes.data)
        }
        if (historyRes.code === 200 && historyRes.data.messages.length > 0) {
          setMessages(historyRes.data.messages)
        }
      } catch (err) {
        setError('加载失败，请重试')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [botId])
  
  // 消息变化时滚动
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText, scrollToBottom])
  
  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return
    
    const userMessage: ChatMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      type: 'text',
      content: inputValue.trim(),
      createdAt: new Date().toISOString(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsSending(true)
    setStreamingText('')
    
    // 添加占位的 AI 消息
    const aiMessageId = 'ai_' + Date.now()
    setMessages(prev => [...prev, {
      id: aiMessageId,
      role: 'assistant',
      type: 'text',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    }])
    
    try {
      await sendMessageStream(
        botId,
        userMessage.content,
        {
          onStart: () => {},
          onToken: (token) => {
            setStreamingText(prev => prev + token)
          },
          onComplete: (fullText) => {
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: fullText, isStreaming: false }
                : msg
            ))
            setStreamingText('')
            setIsSending(false)
          },
          onError: (err) => {
            setError(err.message)
            setIsSending(false)
          }
        }
      )
    } catch (err) {
      setError('发送失败，请重试')
      setIsSending(false)
    }
  }
  
  // 点击推荐问题
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    inputRef.current?.focus()
  }
  
  // 上传文件
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      const res = await uploadChatFile(botId, file)
      if (res.code === 200) {
        const fileMessage: ChatMessage = {
          id: 'file_' + Date.now(),
          role: 'user',
          type: file.type.startsWith('image/') ? 'image' : 'file',
          content: `[上传了${file.type.startsWith('image/') ? '图片' : '文件'}]`,
          attachment: res.data,
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, fileMessage])
      }
    } catch (err) {
      setError('文件上传失败')
    }
    
    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  // 语音输入
  const handleVoiceToggle = () => {
    setIsRecording(!isRecording)
    // TODO: 实际语音录制逻辑
  }
  
  // 语音通话
  const handleVoiceCall = async () => {
    try {
      const res = await createVoiceRoom(botId)
      if (res.code === 200) {
        // TODO: 跳转语音房间
        alert('语音房间创建成功: ' + res.data.roomId)
      }
    } catch (err) {
      setError('创建语音房间失败')
    }
  }
  
  // 渲染消息内容（支持 Markdown 简化版）
  const renderMessageContent = (content: string) => {
    // 简单的 Markdown 处理
    return content.split('\n').map((line, i) => {
      // 粗体
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 标题
      if (line.startsWith('# ')) {
        return <h3 key={i} className="text-base font-bold mt-2 mb-1">{line.slice(2)}</h3>
      }
      if (line.startsWith('## ')) {
        return <h4 key={i} className="text-sm font-bold mt-2 mb-1">{line.slice(3)}</h4>
      }
      // 列表
      if (line.match(/^\d+\.\s/)) {
        return <p key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: line }} />
      }
      if (line.startsWith('- ')) {
        return <p key={i} className="ml-4">• {line.slice(2)}</p>
      }
      // 空行
      if (!line.trim()) {
        return <br key={i} />
      }
      return <p key={i} dangerouslySetInnerHTML={{ __html: line }} />
    })
  }
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-[#FAF8F5]">
        <div className="h-14 bg-gradient-to-r from-[#C41E3A] to-[#E8544E] flex items-center px-4">
          <div className="w-8 h-8 bg-white/20 rounded-full animate-pulse" />
          <div className="ml-3 flex-1">
            <div className="w-24 h-4 bg-white/20 rounded animate-pulse" />
            <div className="w-16 h-3 bg-white/20 rounded mt-1 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 p-4">
          <LoadingSkeleton type="list" count={3} />
        </div>
      </div>
    )
  }
  
  if (error && !botDetail) {
    return (
      <DataState
        isLoading={false}
        error={error}
        isEmpty={false}
        onRetry={() => window.location.reload()}
      >
        <div />
      </DataState>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <header className="h-14 bg-gradient-to-r from-[#C41E3A] to-[#E8544E] flex items-center px-4 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/10"
          onClick={() => (typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push("/bots"))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="ml-2 flex items-center flex-1 min-w-0">
          <Avatar className="w-8 h-8 border-2 border-white/30">
            <AvatarImage src={botDetail?.avatar} />
            <AvatarFallback className="bg-white/20 text-white text-xs">
              {botDetail?.name?.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="ml-2 min-w-0">
            <h1 className="text-white font-medium text-sm truncate">{botDetail?.name}</h1>
            <p className="text-white/70 text-xs">
              {botDetail?.isOfficial ? '官方认证' : '在线'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {botDetail?.voiceEnabled && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/10"
              onClick={handleVoiceCall}
            >
              <Phone className="w-5 h-5" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem>
                <History className="w-4 h-4 mr-2" />
                历史记录
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="w-4 h-4 mr-2" />
                分享
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                设置
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                清空对话
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 欢迎消息 */}
        {messages.length === 0 && botDetail && (
          <div className="space-y-4">
            {/* Bot 欢迎语 */}
            <div className="flex gap-3">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={botDetail.avatar} />
                <AvatarFallback className="bg-[#C41E3A] text-white text-xs">
                  {botDetail.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[80%]">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {botDetail.welcomeMessage}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 推荐问题 */}
            {botDetail.suggestions && botDetail.suggestions.length > 0 && (
              <div className="pl-12">
                <p className="text-xs text-gray-500 mb-2">您可以这样问我：</p>
                <div className="flex flex-wrap gap-2">
                  {botDetail.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="px-3 py-1.5 bg-white border border-[#C41E3A]/20 text-[#C41E3A] text-xs rounded-full hover:bg-[#C41E3A]/5 transition-colors"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 能力说明 */}
            {botDetail.capabilities && (
              <div className="pl-12 pt-2">
                <div className="bg-[#C41E3A]/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-2">我的能力：</p>
                  <div className="flex flex-wrap gap-1.5">
                    {botDetail.capabilities.map((cap, index) => (
                      <span 
                        key={index}
                        className="px-2 py-0.5 bg-white text-xs text-gray-600 rounded"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 对话消息 */}
        {messages.map((message) => (
          <div 
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === 'user' ? "flex-row-reverse" : ""
            )}
          >
            {/* 头像 */}
            <Avatar className="w-9 h-9 shrink-0">
              {message.role === 'user' ? (
                <>
                  <AvatarImage src="/placeholder.svg?height=36&width=36" />
                  <AvatarFallback className="bg-[#C9A96E] text-white text-xs">我</AvatarFallback>
                </>
              ) : (
                <>
                  <AvatarImage src={botDetail?.avatar} />
                  <AvatarFallback className="bg-[#C41E3A] text-white text-xs">
                    {botDetail?.name?.slice(0, 1)}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            
            {/* 消息内容 */}
            <div className={cn(
              "max-w-[80%]",
              message.role === 'user' ? "text-right" : ""
            )}>
              {/* 文本消息 */}
              {message.type === 'text' && (
                <div className={cn(
                  "px-4 py-3 shadow-sm",
                  message.role === 'user' 
                    ? "bg-[#C41E3A] text-white rounded-2xl rounded-tr-sm"
                    : "bg-white text-gray-700 rounded-2xl rounded-tl-sm"
                )}>
                  {message.isStreaming ? (
                    <div className="text-sm leading-relaxed">
                      {renderMessageContent(streamingText)}
                      <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5" />
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed">
                      {renderMessageContent(message.content)}
                    </div>
                  )}
                </div>
              )}
              
              {/* 图片消息 */}
              {message.type === 'image' && message.attachment && (
                <div className={cn(
                  "rounded-2xl overflow-hidden shadow-sm",
                  message.role === 'user' ? "rounded-tr-sm" : "rounded-tl-sm"
                )}>
                  <img 
                    src={message.attachment.url} 
                    alt={message.attachment.name}
                    className="max-w-full max-h-48 object-cover"
                  />
                </div>
              )}
              
              {/* 文件消息 */}
              {message.type === 'file' && message.attachment && (
                <div className={cn(
                  "px-4 py-3 shadow-sm flex items-center gap-2",
                  message.role === 'user' 
                    ? "bg-[#C41E3A] text-white rounded-2xl rounded-tr-sm"
                    : "bg-white text-gray-700 rounded-2xl rounded-tl-sm"
                )}>
                  <Paperclip className="w-4 h-4" />
                  <span className="text-sm truncate">{message.attachment.name}</span>
                </div>
              )}
              
              {/* 时间 */}
              <p className={cn(
                "text-xs text-gray-400 mt-1",
                message.role === 'user' ? "text-right pr-1" : "pl-1"
              )}>
                {new Date(message.createdAt).toLocaleTimeString('zh-CN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* 使用限制提示 */}
      {botDetail?.limits && !botDetail.isFree && (
        <div className="px-4 py-2 bg-[#C9A96E]/10 border-t border-[#C9A96E]/20">
          <p className="text-xs text-[#C9A96E] text-center">
            今日免费次数：{botDetail.limits.usedCount}/{botDetail.limits.dailyFreeCount}
            {botDetail.limits.usedCount >= botDetail.limits.dailyFreeCount && (
              <button className="ml-2 underline">升级会员</button>
            )}
          </p>
        </div>
      )}
      
      {/* 底部输入区 */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center gap-2">
          {/* 语音按钮 */}
          {botDetail?.voiceEnabled && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "shrink-0",
                isRecording && "text-[#C41E3A] bg-[#C41E3A]/10"
              )}
              onClick={handleVoiceToggle}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          )}
          
          {/* 输入框 */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={isRecording ? "正在录音..." : "输入您的问题..."}
              disabled={isRecording || isSending}
              className="pr-20 bg-gray-50 border-gray-200 focus:border-[#C41E3A] focus:ring-[#C41E3A]/20"
            />
            
            {/* 附件按钮 */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {botDetail?.fileEnabled && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4 text-gray-500" />
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* 发送按钮 */}
          <Button
            size="icon"
            className="shrink-0 bg-[#C41E3A] hover:bg-[#A3172E]"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
