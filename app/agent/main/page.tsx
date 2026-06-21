'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Sparkles, RefreshCw, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
}

const WELCOME = `您好！我是智玄 AI 助手，精通八字命理、奇门遁甲、紫微斗数等传统命理学。

您可以向我提问：
- 八字分析与五行解读
- 流年运势与注意事项
- 婚姻、事业、财运预测
- 风水布局与趋吉避凶

请告诉我您的需求，我将竭诚为您服务。`

const QUICK_PROMPTS = ['帮我分析今年运势', '我的八字五行缺什么', '解读事业宫位走势', '分析近期财运方向']

function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export default function AgentMainPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: WELCOME, time: nowTime() },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, time: nowTime() }])
    setInput('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '感谢您的提问。根据您提供的信息，我来为您做详细分析……\n\n（此为演示模式，实际对话将接入 AI 模型进行精准推算。）',
      time: nowTime(),
    }])
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex-shrink-0 sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <span className="text-base font-semibold text-foreground">智玄 AI 助手</span>
          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">在线</span>
        </div>
        <button onClick={() => setMessages([{ id: '0', role: 'assistant', content: WELCOME, time: nowTime() }])} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              msg.role === 'assistant'
                ? 'bg-card border border-border text-foreground rounded-tl-sm'
                : 'bg-primary text-white rounded-tr-sm',
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={cn('text-[10px] mt-1', msg.role === 'assistant' ? 'text-muted-foreground' : 'text-white/70')}>{msg.time}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 px-4 py-2 flex gap-2 overflow-x-auto">
        {QUICK_PROMPTS.map(q => (
          <button key={q} onClick={() => send(q)} className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 text-foreground hover:bg-muted transition-colors">
            {q}
          </button>
        ))}
      </div>

      <div className="flex-shrink-0 px-4 pb-6 pt-2 border-t border-border">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors max-h-32"
            rows={1}
            placeholder="输入您的问题…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          />
          <Button onClick={() => send(input)} disabled={!input.trim() || loading} size="icon" className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0">
            <Send className="w-4 h-4 text-white" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          内容由 AI 生成，仅供参考，不构成专业建议，请理性看待。
        </p>
      </div>
    </div>
  )
}
