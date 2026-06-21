'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, CheckCircle2, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type QFilter = 'all' | 'answered' | 'pending'

interface Question {
  id: string
  content: string
  expert: string
  avatar: string
  status: 'answered' | 'pending'
  askedAt: string
  answeredAt?: string
  cost: string
  preview?: string
}

const mockQs: Question[] = [
  {
    id: '1',
    content: '我是1985年10月15日午时生，想知道今年的财运走势和投资方向，是否适合做生意？',
    expert: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80',
    status: 'answered', askedAt: '2024-01-20', answeredAt: '2024-01-20',
    cost: '¥50.00', preview: '您的命局中财星得地，今年丙午流年走食伤生财之运…',
  },
  {
    id: '2',
    content: '请问我的八字日主身强还是身弱？用神是什么？近两年感情方面有没有好的发展机会？',
    expert: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80',
    status: 'answered', askedAt: '2024-01-15', answeredAt: '2024-01-16',
    cost: '¥30.00', preview: '从您提供的生辰来看，日主甲木生于丑月，天气寒凉…',
  },
  {
    id: '3',
    content: '想问一下我的事业宫，今年是否有升职加薪的机会，需要注意什么？',
    expert: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80',
    status: 'pending', askedAt: '2024-01-22',
    cost: '¥80.00',
  },
]

export default function MyQuestionsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<QFilter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = filter === 'all' ? mockQs : mockQs.filter(q => q.status === filter)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">我的问答</h1>
      </header>

      <div className="flex gap-2 px-4 pt-4 pb-2">
        {(['all','answered','pending'] as QFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter === f ? 'bg-primary text-white' : 'bg-muted text-foreground'
            )}
          >
            {f === 'all' ? '全部' : f === 'answered' ? '已回答' : '待回答'}
          </button>
        ))}
      </div>

      <div className="px-4 pb-20 space-y-3 pt-2">
        {filtered.map(q => (
          <div key={q.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === q.id ? null : q.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5">
                  <AvatarImage src={q.avatar} />
                  <AvatarFallback>{q.expert[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">{q.expert}</span>
                    <span className={cn('text-xs flex items-center gap-0.5 flex-shrink-0',
                      q.status === 'answered' ? 'text-green-600' : 'text-orange-500'
                    )}>
                      {q.status === 'answered'
                        ? <><CheckCircle2 className="w-3 h-3" /> 已回答</>
                        : <><Clock className="w-3 h-3" /> 待回答</>
                      }
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">{q.content}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{q.askedAt}</span>
                    <span className="font-medium text-primary">{q.cost}</span>
                  </div>
                </div>
              </div>
            </button>

            {expanded === q.id && q.preview && (
              <div className="px-4 pb-4 pt-0 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">专家回答：</p>
                <p className="text-sm text-foreground leading-relaxed">{q.preview}</p>
                <p className="text-xs text-muted-foreground mt-2">回复于 {q.answeredAt}</p>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">暂无问答记录</p>
        )}
      </div>
    </div>
  )
}
