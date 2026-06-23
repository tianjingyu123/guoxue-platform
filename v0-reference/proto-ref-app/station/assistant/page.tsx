'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Send, 
  Mic, 
  MicOff,
  Trash2,
  MoreVertical,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { DataState } from '@/components/data-state'
import { 
  getStationAssistantConfig, 
  getAssistantSession, 
  sendAssistantMessage,
  clearAssistantSession 
} from '@/lib/api/station-assistant'
import type { 
  AssistantMessage, 
  StationAssistantConfig,
  ChartData,
  TableData,
  ActionSuggestion
} from '@/lib/types/station-assistant'

export default function StationAssistantPage() {
  const router = useRouter()
  const [config, setConfig] = useState<StationAssistantConfig | null>(null)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingChart, setStreamingChart] = useState<ChartData | null>(null)
  const [streamingTable, setStreamingTable] = useState<TableData | null>(null)
  const [streamingActions, setStreamingActions] = useState<ActionSuggestion[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadData = async () => {
    try {
      const [configRes, sessionRes] = await Promise.all([
        getStationAssistantConfig(),
        getAssistantSession()
      ])
      if (configRes.code === 200) {
        setConfig(configRes.data)
      }
      if (sessionRes.code === 200 && sessionRes.data.messages.length > 0) {
        setMessages(sessionRes.data.messages)
      }
    } catch (error) {
      console.error('Failed to load assistant data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (text?: string) => {
    const content = text || inputText.trim()
    if (!content || isSending) return

    // 添加用户消息
    const userMessage: AssistantMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      type: 'text',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsSending(true)
    setStreamingContent('')
    setStreamingChart(null)
    setStreamingTable(null)
    setStreamingActions([])

    try {
      await sendAssistantMessage(content, {
        onStart: () => {
          // 开始流式输出
        },
        onToken: (token) => {
          setStreamingContent(prev => prev + token)
        },
        onChart: (chart) => {
          setStreamingChart(chart)
        },
        onTable: (table) => {
          setStreamingTable(table)
        },
        onActions: (actions) => {
          setStreamingActions(actions)
        },
        onComplete: (message) => {
          setMessages(prev => [...prev, message])
          setStreamingContent('')
          setStreamingChart(null)
          setStreamingTable(null)
          setStreamingActions([])
          setIsSending(false)
        },
        onError: (error) => {
          console.error('Send message error:', error)
          setIsSending(false)
        }
      })
    } catch (error) {
      console.error('Send message error:', error)
      setIsSending(false)
    }
  }

  const handleSuggestionClick = (text: string) => {
    handleSend(text)
  }

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording)
    // TODO: 实现语音录制和转文字
  }

  const handleClearSession = async () => {
    try {
      const res = await clearAssistantSession()
      if (res.code === 200) {
        setMessages([])
        setShowClearDialog(false)
      }
    } catch (error) {
      console.error('Clear session error:', error)
    }
  }

  // 渲染 Markdown 内容（简化版）
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, index) => {
      // 标题
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-lg font-bold text-foreground mt-4 mb-2">{line.slice(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-base font-semibold text-foreground mt-3 mb-1">{line.slice(4)}</h3>
      }
      // 引用
      if (line.startsWith('> ')) {
        return (
          <blockquote key={index} className="border-l-4 border-primary/50 pl-3 my-2 text-muted-foreground italic">
            {line.slice(2)}
          </blockquote>
        )
      }
      // 列表
      if (line.match(/^(\d+)\.\s/)) {
        const text = line.replace(/^\d+\.\s/, '')
        return <li key={index} className="ml-4 list-decimal">{renderInlineMarkdown(text)}</li>
      }
      if (line.startsWith('- ')) {
        return <li key={index} className="ml-4 list-disc">{renderInlineMarkdown(line.slice(2))}</li>
      }
      // 空行
      if (!line.trim()) {
        return <br key={index} />
      }
      // 普通段落
      return <p key={index} className="my-1">{renderInlineMarkdown(line)}</p>
    })
  }

  // 渲染行内 Markdown
  const renderInlineMarkdown = (text: string) => {
    // 加粗
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      }
      return <span key={index}>{part}</span>
    })
  }

  // 渲染图表
  const renderChart = (chart: ChartData) => {
    if (chart.type === 'line') {
      const maxValue = Math.max(...chart.data.map(d => d.value))
      return (
        <div className="bg-muted/30 rounded-lg p-4 my-3">
          <h4 className="text-sm font-medium mb-3">{chart.title}</h4>
          <div className="flex items-end gap-2 h-32">
            {chart.data.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-primary/80 rounded-t transition-all"
                  style={{ height: `${(item.value / maxValue) * 100}%` }}
                />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (chart.type === 'pie') {
      const total = chart.data.reduce((sum, d) => sum + d.value, 0)
      return (
        <div className="bg-muted/30 rounded-lg p-4 my-3">
          <h4 className="text-sm font-medium mb-3">{chart.title}</h4>
          <div className="space-y-2">
            {chart.data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color || '#C41E3A' }}
                />
                <span className="text-sm flex-1">{item.label}</span>
                <span className="text-sm font-medium">{item.value}人</span>
                <span className="text-xs text-muted-foreground">
                  ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  // 渲染表格
  const renderTable = (table: TableData) => {
    return (
      <div className="bg-muted/30 rounded-lg p-4 my-3 overflow-x-auto">
        <h4 className="text-sm font-medium mb-3">{table.title}</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {table.headers.map((header, index) => (
                <th key={index} className="text-left py-2 px-2 font-medium text-muted-foreground">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border/50 last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="py-2 px-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // 渲染操作建议
  const renderActions = (actions: ActionSuggestion[]) => {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className={`
              text-xs
              ${action.priority === 'high' ? 'border-primary text-primary' : ''}
              ${action.priority === 'medium' ? 'border-amber-500 text-amber-600' : ''}
            `}
            onClick={() => action.link && router.push(action.link)}
          >
            {action.title}
            {action.link && <ExternalLink className="w-3 h-3 ml-1" />}
          </Button>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <DataState
        loading={true}
        loadingConfig={{
          skeleton: 'list',
          rows: 5
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/80 text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="w-10 h-10 border-2 border-white/30">
              <AvatarImage src={config?.avatar} />
              <AvatarFallback className="bg-white/20 text-white">
                <Sparkles className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold">{config?.name || '站长助理'}</h1>
              <p className="text-xs text-white/70">AI 运营助手</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowClearDialog(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                清除对话
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 欢迎消息 */}
        {messages.length === 0 && !isSending && (
          <div className="space-y-4">
            {/* AI 欢迎语 */}
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={config?.avatar} />
                <AvatarFallback className="bg-primary/10">
                  <Sparkles className="w-4 h-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <p className="text-sm leading-relaxed">{config?.welcomeMessage}</p>
                </div>
              </div>
            </div>

            {/* 能力标签 */}
            <div className="flex flex-wrap gap-2 ml-11">
              {config?.capabilities.map((cap, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {cap}
                </Badge>
              ))}
            </div>

            {/* 推荐问题 */}
            <div className="ml-11 space-y-2">
              <p className="text-xs text-muted-foreground">您可以试着问我：</p>
              <div className="flex flex-wrap gap-2">
                {config?.suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-2 px-3"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                  >
                    {suggestion.text}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 消息列表 */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 mb-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {message.role === 'assistant' && (
              <Avatar className="w-8 h-8">
                <AvatarImage src={config?.avatar} />
                <AvatarFallback className="bg-primary/10">
                  <Sparkles className="w-4 h-4 text-primary" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
              <div
                className={`
                  rounded-2xl px-4 py-3 max-w-[85%]
                  ${message.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-muted rounded-tl-sm'
                  }
                `}
              >
                {message.role === 'assistant' ? (
                  <div className="text-sm leading-relaxed">
                    {renderMarkdown(message.content)}
                    {message.chart && renderChart(message.chart)}
                    {message.table && renderTable(message.table)}
                    {message.actions && renderActions(message.actions)}
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* 流式输出中 */}
        {isSending && (
          <div className="flex gap-3 mb-4">
            <Avatar className="w-8 h-8">
              <AvatarImage src={config?.avatar} />
              <AvatarFallback className="bg-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <div className="text-sm leading-relaxed">
                  {streamingContent ? (
                    <>
                      {renderMarkdown(streamingContent)}
                      {streamingChart && renderChart(streamingChart)}
                      {streamingTable && renderTable(streamingTable)}
                      {streamingActions.length > 0 && renderActions(streamingActions)}
                    </>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入区 */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={isRecording ? 'text-red-500' : 'text-muted-foreground'}
            onClick={handleVoiceToggle}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Input
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="输入您的问题..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={isSending}
          />
          <Button
            size="icon"
            disabled={!inputText.trim() || isSending}
            onClick={() => handleSend()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        {isRecording && (
          <div className="mt-2 flex items-center justify-center gap-2 text-red-500">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm">正在录音...</span>
          </div>
        )}
      </div>

      {/* 清除对话确认 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清除对话</AlertDialogTitle>
            <AlertDialogDescription>
              确定要清除所有对话记录吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearSession}>确定清除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
