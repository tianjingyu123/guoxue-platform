'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bot, Trash2, ChevronRight, Search, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  agentName: string
  agentCategory: string
  lastMessage: string
  lastTime: string
  messageCount: number
  unread: number
}

const mockConvs: Conversation[] = [
  { id: '1', agentName: '八字命理大师', agentCategory: '八字命理', lastMessage: '您的命局中财星得地，今年走食伤生财之运…', lastTime: '今天 14:35', messageCount: 24, unread: 0 },
  { id: '2', agentName: '奇门遁甲助手', agentCategory: '奇门遁甲', lastMessage: '根据今日癸卯日的奇门布局，您的出行方向…', lastTime: '昨天 20:12', messageCount: 8, unread: 2 },
  { id: '3', agentName: '紫微斗数专家', agentCategory: '紫微斗数', lastMessage: '您的命宫坐紫微星，主性格稳重、志向远大…', lastTime: '2天前', messageCount: 15, unread: 0 },
  { id: '4', agentName: '风水布局师', agentCategory: '风水', lastMessage: '根据您的房屋朝向，建议将财位布置在…', lastTime: '3天前', messageCount: 6, unread: 0 },
  { id: '5', agentName: '易经解读助手', agentCategory: '易经', lastMessage: '您抽到的卦象为「水雷屯」，代表事业初创…', lastTime: '上周', messageCount: 12, unread: 0 },
]

const CATEGORY_COLORS: Record<string, string> = {
  '八字命理': 'bg-red-50 text-red-700',
  '奇门遁甲': 'bg-purple-50 text-purple-700',
  '紫微斗数': 'bg-blue-50 text-blue-700',
  '风水':     'bg-green-50 text-green-700',
  '易经':     'bg-amber-50 text-amber-700',
}

export default function AgentsHistoryPage() {
  const router = useRouter()
  const [convs, setConvs] = useState(mockConvs)
  const [search, setSearch] = useState('')

  const filtered = convs.filter(c => c.agentName.includes(search) || c.lastMessage.includes(search))

  const remove = (id: string) => setConvs(prev => prev.filter(c => c.id !== id))

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground flex-1">对话历史</h1>
      </header>

      <div className="px-4 pt-4 pb-20">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索对话" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无对话记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(conv => (
              <button key={conv.id} onClick={() => router.push(`/agents/${conv.id}`)} className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl text-left hover:bg-muted/30 transition-colors">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{conv.agentName}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', CATEGORY_COLORS[conv.agentCategory] ?? 'bg-muted text-muted-foreground')}>
                        {conv.agentCategory}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{conv.lastTime}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {conv.unread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">{conv.unread}</span>
                      )}
                      <button onClick={e => { e.stopPropagation(); remove(conv.id) }} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
