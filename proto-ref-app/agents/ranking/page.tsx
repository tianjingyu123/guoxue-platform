'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap, MessageCircle, Users, Eye, TrendingUp, Play } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Mock data - 智能体排行
const mockAgentsRanking = [
  {
    id: '1',
    name: '周易算命大师',
    description: '专业八字、紫微、奇门遁甲算命',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    category: '算命',
    users: 12850,
    sessions: 45620,
    rating: 4.9,
    verified: true,
  },
  {
    id: '2',
    name: '国学经典讲解',
    description: '深度解读四书五经、道德经等',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    category: '国学',
    users: 9850,
    sessions: 32140,
    rating: 4.8,
    verified: true,
  },
  {
    id: '3',
    name: '风水大师助手',
    description: '阳宅风水、择日、布局建议',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    category: '风水',
    users: 8420,
    sessions: 28950,
    rating: 4.7,
    verified: false,
  },
  {
    id: '4',
    name: '塔罗牌占卜',
    description: '塔罗解读、抽签分析、运势预测',
    avatar: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=100',
    category: '占卜',
    users: 7240,
    sessions: 21850,
    rating: 4.6,
    verified: true,
  },
  {
    id: '5',
    name: '中医养生顾问',
    description: '健康咨询、养生建议、体质分析',
    avatar: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=100',
    category: '健康',
    users: 5850,
    sessions: 18520,
    rating: 4.5,
    verified: false,
  },
]

export default function AgentsRankingPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(mockAgentsRanking.map(a => a.category)))
  const filteredAgents = selectedCategory
    ? mockAgentsRanking.filter(a => a.category === selectedCategory)
    : mockAgentsRanking

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">智能体排行</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="pb-20">
        {/* 分类过滤 */}
        <div className="mx-4 mt-4 overflow-x-auto pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              全部
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 排行榜 */}
        <div className="mx-4 mt-4">
          <div className="space-y-3">
            {filteredAgents.map((agent, idx) => (
              <Card key={agent.id} className="p-4 hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => router.push(`/agents/${agent.id}`)}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative">
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {agent.verified && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-bold text-primary">#{idx + 1}</span>
                      <h3 className="font-semibold text-foreground">{agent.name}</h3>
                      <Badge variant="secondary" className="text-xs">{agent.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{agent.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-bold text-foreground">{agent.users.toLocaleString()}</div>
                    <div className="text-muted-foreground">用户</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-bold text-foreground">{agent.sessions.toLocaleString()}</div>
                    <div className="text-muted-foreground">对话</div>
                  </div>
                  <div className="col-span-2 text-center p-2 bg-primary/10 rounded">
                    <div className="font-bold text-primary">{agent.rating} 分</div>
                    <div className="text-muted-foreground">评分</div>
                  </div>
                </div>

                <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  立即对话
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
