'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Star, MessageSquare, TrendingUp, Flag } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface Review {
  id: string
  user: string
  avatar: string
  rating: number
  content: string
  date: string
  likes: number
  replied: boolean
  reply?: string
  flagged: boolean
}

const initialReviews: Review[] = [
  { id: '1', user: '张三', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60', rating: 5, content: '非常棒的课程，内容详尽，讲师专业，强烈推荐！', date: '2024-01-20', likes: 24, replied: true, reply: '感谢您的好评！您的支持是我持续创作的动力。', flagged: false },
  { id: '2', user: '李四', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60', rating: 4, content: '课程内容很好，如果能多些互动环节就更完美了。', date: '2024-01-18', likes: 12, replied: false, flagged: false },
  { id: '3', user: '王五', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60', rating: 3, content: '内容一般，和描述有些出入，期望能够更新优化。', date: '2024-01-15', likes: 5,  replied: false, flagged: false },
  { id: '4', user: '赵六', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60', rating: 5, content: '物超所值！每一节课都有实质性收获，值得反复观看。', date: '2024-01-12', likes: 31, replied: true, reply: '谢谢您的认可，后续还会更新更多精彩内容！', flagged: false },
  { id: '5', user: '钱七', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60', rating: 2, content: '讲师语速太快，很难跟上。希望能有字幕辅助。', date: '2024-01-10', likes: 8,  replied: false, flagged: false },
]

const avgRating = (initialReviews.reduce((s, r) => s + r.rating, 0) / initialReviews.length).toFixed(1)

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={cn('w-3 h-3', s <= rating ? 'text-accent fill-accent' : 'text-muted-foreground')} />
      ))}
    </div>
  )
}

export default function CourseReviewsManagePage() {
  const router = useRouter()
  const [reviews, setReviews] = useState(initialReviews)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [filter, setFilter] = useState<'all' | 'unreplied' | 'flagged'>('all')

  const submitReply = (id: string) => {
    if (!replyText.trim()) return
    setReviews(prev => prev.map(r => r.id === id ? { ...r, replied: true, reply: replyText } : r))
    setReplyingId(null)
    setReplyText('')
  }

  const toggleFlag = (id: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, flagged: !r.flagged } : r))
  }

  const filtered = reviews.filter(r => {
    if (filter === 'unreplied') return !r.replied
    if (filter === 'flagged')   return r.flagged
    return true
  })

  const stats = [
    { label: '综合评分', value: avgRating, sub: '满分 5.0' },
    { label: '评价总数', value: reviews.length, sub: '条' },
    { label: '待回复',   value: reviews.filter(r => !r.replied).length, sub: '条' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">课程评价管理</h1>
      </header>

      {/* Stats */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="text-center p-3 bg-card border border-border rounded-xl">
            <p className="text-xl font-black text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 px-4 py-3">
        {([
          { key: 'all',       label: '全部评价' },
          { key: 'unreplied', label: '待回复' },
          { key: 'flagged',   label: '已标记' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-20 space-y-3">
        {filtered.map(review => (
          <div key={review.id} className={cn('p-4 bg-card border rounded-xl', review.flagged ? 'border-accent/60' : 'border-border')}>
            <div className="flex items-start gap-3 mb-2">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={review.avatar} />
                <AvatarFallback>{review.user[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{review.user}</p>
                  <p className="text-[10px] text-muted-foreground">{review.date}</p>
                </div>
                <StarRow rating={review.rating} />
              </div>
            </div>

            <p className="text-sm text-foreground leading-relaxed mb-3">{review.content}</p>

            {review.replied && review.reply && (
              <div className="bg-muted/40 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-primary mb-1">讲师回复</p>
                <p className="text-xs text-foreground leading-relaxed">{review.reply}</p>
              </div>
            )}

            {replyingId === review.id && (
              <div className="mb-3">
                <textarea
                  placeholder="输入回复内容…"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  className="w-full min-h-[80px] px-3 py-2 text-xs bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setReplyingId(null); setReplyText('') }}
                    className="flex-1 py-1.5 text-xs text-muted-foreground border border-border rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => submitReply(review.id)}
                    className="flex-1 py-1.5 text-xs text-primary-foreground bg-primary rounded-lg"
                  >
                    发送回复
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {!review.replied && replyingId !== review.id && (
                <button
                  onClick={() => { setReplyingId(review.id); setReplyText('') }}
                  className="flex items-center gap-1 text-xs text-primary"
                >
                  <MessageSquare className="w-3.5 h-3.5" />回复
                </button>
              )}
              <button
                onClick={() => toggleFlag(review.id)}
                className={cn('flex items-center gap-1 text-xs', review.flagged ? 'text-accent' : 'text-muted-foreground')}
              >
                <Flag className="w-3.5 h-3.5" />
                {review.flagged ? '已标记' : '标记'}
              </button>
              <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />{review.likes} 有帮助
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">暂无相关评价</p>
        )}
      </div>
    </div>
  )
}
