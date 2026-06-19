'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Clock, Eye, MessageSquare, Coins, Filter, ChevronDown } from 'lucide-react'
import { bountyApi, type Bounty } from '@/lib/api'

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '进行中' },
  { key: 'resolved', label: '已解决' },
  { key: 'expired', label: '已过期' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: '进行中', color: 'text-green-600', bg: 'bg-green-50' },
  answered: { label: '待采纳', color: 'text-orange-600', bg: 'bg-orange-50' },
  resolved: { label: '已解决', color: 'text-blue-600', bg: 'bg-blue-50' },
  expired: { label: '已过期', color: 'text-muted-foreground', bg: 'bg-muted' },
  cancelled: { label: '已取消', color: 'text-muted-foreground', bg: 'bg-muted' },
}

export default function BountyListPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadBounties(true)
  }, [activeTab])

  const loadBounties = async (reset = false) => {
    if (reset) {
      setLoading(true)
      setPage(1)
    }

    // Mock data
    const mockBounties: Bounty[] = [
      {
        id: '1',
        title: '求解八字命盘中的财运分析方法',
        description: '想了解如何从八字命盘中分析一个人的财运走势，包括正财、偏财的判断方法...',
        amount: 50,
        status: 'open',
        poster: { id: 'u1', name: '易学初学者', avatar: '/placeholder.svg?height=40&width=40' },
        answerCount: 3,
        viewCount: 128,
        category: '八字',
        tags: ['财运', '命盘分析'],
        createdAt: '2024-01-15T10:00:00Z',
        expireAt: '2024-01-22T10:00:00Z',
      },
      {
        id: '2',
        title: '风水布局中如何化解尖角煞？',
        description: '家里客厅有一个突出的墙角对着沙发，听说这是尖角煞，请问有什么化解方法？',
        amount: 30,
        status: 'resolved',
        poster: { id: 'u2', name: '风水爱好者', avatar: '/placeholder.svg?height=40&width=40' },
        answerCount: 5,
        viewCount: 256,
        category: '风水',
        tags: ['家居风水', '化煞'],
        createdAt: '2024-01-14T08:00:00Z',
        expireAt: '2024-01-21T08:00:00Z',
        resolvedAt: '2024-01-16T14:00:00Z',
      },
      {
        id: '3',
        title: '梅花易数起卦时间问题请教',
        description: '用梅花易数起卦时，如果是别人问事，应该用问卦人的时间还是起卦人的时间？',
        amount: 20,
        status: 'answered',
        poster: { id: 'u3', name: '梅花学徒', avatar: '/placeholder.svg?height=40&width=40' },
        answerCount: 2,
        viewCount: 89,
        category: '梅花易数',
        tags: ['起卦', '时间'],
        createdAt: '2024-01-13T15:00:00Z',
        expireAt: '2024-01-20T15:00:00Z',
      },
      {
        id: '4',
        title: '六爻预测中的用神取用问题',
        description: '在六爻预测中，如何准确判断用神？特别是测事业和财运时的用神取法...',
        amount: 100,
        status: 'open',
        poster: { id: 'u4', name: '六爻研究者', avatar: '/placeholder.svg?height=40&width=40' },
        answerCount: 1,
        viewCount: 312,
        category: '六爻',
        tags: ['用神', '预测技巧'],
        createdAt: '2024-01-12T09:00:00Z',
        expireAt: '2024-01-19T09:00:00Z',
      },
      {
        id: '5',
        title: '奇门遁甲中的三奇六仪如何理解？',
        description: '刚开始学习奇门遁甲，对三奇六仪的概念比较模糊，希望能有详细的解释...',
        amount: 40,
        status: 'expired',
        poster: { id: 'u5', name: '奇门新手', avatar: '/placeholder.svg?height=40&width=40' },
        answerCount: 0,
        viewCount: 45,
        category: '奇门遁甲',
        tags: ['基础概念', '入门'],
        createdAt: '2024-01-01T10:00:00Z',
        expireAt: '2024-01-08T10:00:00Z',
      },
    ]

    const filtered = activeTab === 'all' 
      ? mockBounties 
      : mockBounties.filter(b => b.status === activeTab)

    setTimeout(() => {
      setBounties(reset ? filtered : [...bounties, ...filtered])
      setHasMore(false)
      setLoading(false)
    }, 500)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  const getRemainingTime = (expireAt: string) => {
    const expire = new Date(expireAt)
    const now = new Date()
    const diff = expire.getTime() - now.getTime()
    if (diff <= 0) return '已过期'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `剩余${days}天`
    return `剩余${hours}小时`
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">悬赏广场</h1>
          </div>
          <button
            onClick={() => router.push('/bounty/create')}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            发布悬赏
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bounty List */}
      <div className="p-4 space-y-4">
        {loading ? (
          // Skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              </div>
            </div>
          ))
        ) : bounties.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">暂无悬赏问题</p>
            <button
              onClick={() => router.push('/bounty/create')}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm"
            >
              发布悬赏
            </button>
          </div>
        ) : (
          bounties.map(bounty => {
            const statusConfig = STATUS_CONFIG[bounty.status]
            return (
              <div
                key={bounty.id}
                onClick={() => router.push(`/bounty/${bounty.id}`)}
                className="bg-card rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={bounty.poster.avatar}
                    alt={bounty.poster.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{bounty.poster.name}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(bounty.createdAt)}</span>
                    </div>
                    {bounty.category && (
                      <span className="text-xs text-muted-foreground">{bounty.category}</span>
                    )}
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-medium mb-2 line-clamp-2">{bounty.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{bounty.description}</p>

                {/* Tags */}
                {bounty.tags && bounty.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {bounty.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{bounty.viewCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{bounty.answerCount}个回答</span>
                    </div>
                    {bounty.status === 'open' && (
                      <div className="flex items-center gap-1 text-orange-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{getRemainingTime(bounty.expireAt)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-primary font-semibold">
                    <Coins className="w-4 h-4" />
                    <span>¥{bounty.amount}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
