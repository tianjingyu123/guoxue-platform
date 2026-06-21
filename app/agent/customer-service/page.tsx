'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Headphones, RefreshCw, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Message { id: string; role: 'user' | 'assistant'; content: string; time: string }

const WELCOME = `您好，欢迎联系智玄客服！

我可以帮您解决：
• 账号注册与登录问题
• 课程购买与退款申请
• VIP 会员开通与续费
• 内容投诉与举报
• 其他使用问题

请描述您的问题，我们将尽快为您解答。`

const QUICK = ['课程退款', 'VIP开通', '账号问题', '内容举报', '联系人工客服']

const AUTO_REPLIES: Record<string, string> = {
  '课程退款': '退款申请流程：进入「我的订单」→ 找到对应课程 → 点击「申请退款」。购买7日内且观看进度低于30%可申请退款，退款将在3个工作日内原路退回。',
  'VIP开通': 'VIP会员开通方式：进入「VIP中心」→ 选择套餐 → 完成支付即可立即生效。如遇支付问题请联系人工客服。',
  '账号问题': '常见账号问题：\n• 忘记密码：点击登录页「忘记密码」通过手机或邮箱重置\n• 账号被封：请说明详细情况，我们将为您核查处理',
  '内容举报': '如发现违规内容，请在内容详情页点击右上角「…」选择「举报」，填写举报原因提交。我们将在24小时内处理。',
  '联系人工客服': '人工客服服务时间：周一至周日 9:00-21:00\n工作时间内将在5分钟内响应，非工作时间请留言，我们将在次日处理。',
}

function nowTime() { return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }

export default function CustomerServicePage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([{ id: '0', role: 'assistant', content: WELCOME, time: nowTime() }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, time: nowTime() }])
    setInput('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    const reply = AUTO_REPLIES[text] ?? '感谢您的反馈！我已记录您的问题，客服人员将尽快跟进处理。如需紧急帮助，可拨打客服热线 400-XXX-XXXX。'
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, time: nowTime() }])
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex-shrink-0 sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <Headphones className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-base font-semibold text-foreground">智能客服</span>
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
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                <Headphones className="w-4 h-4 text-blue-600" />
              </div>
            )}
            <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              msg.role === 'assistant' ? 'bg-card border border-border text-foreground rounded-tl-sm' : 'bg-primary text-white rounded-tr-sm')}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={cn('text-[10px] mt-1', msg.role === 'assistant' ? 'text-muted-foreground' : 'text-white/70')}>{msg.time}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
              <Headphones className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 px-4 py-2 flex gap-2 overflow-x-auto">
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 text-foreground hover:bg-muted transition-colors">{q}</button>
        ))}
      </div>

      <div className="flex-shrink-0 px-4 pb-6 pt-2 border-t border-border flex items-end gap-2">
        <textarea className="flex-1 resize-none rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors max-h-32" rows={1} placeholder="描述您的问题…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }} />
        <Button onClick={() => send(input)} disabled={!input.trim() || loading} size="icon" className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0">
          <Send className="w-4 h-4 text-white" />
        </Button>
      </div>
    </div>
  )
}
