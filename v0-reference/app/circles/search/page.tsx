'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, X, TrendingUp, Users, Crown, Star } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// 热门搜索
const hotSearches = [
  '八字命理', '紫微斗数', '风水堪舆', '易经', '六爻', '奇门遁甲', '四柱', '风水'
]

// 搜索历史
const defaultHistory = ['命理研习', '八字', '风水大师']

// Mock 搜索结果
const mockResults = [
  {
    id: '1',
    name: '八字命理研习社',
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    members: 12580,
    category: '命理',
    isJoined: false,
    isPaid: true,
    price: 99,
    description: '专业八字命理学习圈子，汇聚众多命理爱好者',
    tags: ['八字', '命理'],
  },
  {
    id: '2',
    name: '紫微斗数学院',
    cover: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop',
    members: 8960,
    category: '命理',
    isJoined: true,
    isPaid: true,
    price: 199,
    description: '紫微斗数爱好者的学习交流平台',
    tags: ['紫微斗数', '斗数'],
  },
  {
    id: '3',
    name: '风水堪舆交流',
    cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&h=200&fit=crop',
    members: 6320,
    category: '风水',
    isJoined: false,
    isPaid: false,
    price: 0,
    description: '风水堪舆爱好者的交流分享圈子',
    tags: ['风水', '堪舆'],
  },
  {
    id: '4',
    name: '易经研究会',
    cover: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=200&h=200&fit=crop',
    members: 15200,
    category: '易学',
    isJoined: false,
    isPaid: false,
    price: 0,
    description: '专注易经文化研究与传播',
    tags: ['易经', '国学'],
  },
  {
    id: '5',
    name: '奇门遁甲精研',
    cover: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop',
    members: 4580,
    category: '命理',
    isJoined: false,
    isPaid: true,
    price: 299,
    description: '奇门遁甲高阶学习与实战交流',
    tags: ['奇门遁甲', '命理'],
  },
]

function formatCount(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n.toString()
}

export default function CircleSearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [history, setHistory] = useState<string[]>(defaultHistory)
  const [results, setResults] = useState(mockResults)
  const [searching, setSearching] = useState(false)

  const doSearch = (kw: string) => {
    if (!kw.trim()) return
    setKeyword(kw)
    setSearching(true)
    // 添加到历史
    setHistory(prev => {
      const next = [kw, ...prev.filter(h => h !== kw)].slice(0, 10)
      return next
    })
    setTimeout(() => {
      setResults(mockResults.filter(r =>
        r.name.includes(kw) || r.description.includes(kw) || r.tags.some(t => t.includes(kw))
      ))
      setHasSearched(true)
      setSearching(false)
    }, 400)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(keyword)
  }

  const clearHistory = () => setHistory([])
  const clearKeyword = () => {
    setKeyword('')
    setHasSearched(false)
    inputRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 搜索栏 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => router.back()} className="flex-shrink-0">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <form onSubmit={handleSubmit} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="搜索圈子名称、分类..."
              className="w-full pl-9 pr-8 py-2 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            {keyword && (
              <button
                type="button"
                onClick={clearKeyword}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </form>
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground flex-shrink-0"
          >
            取消
          </button>
        </div>
      </div>

      <div className="pb-20">
        {!hasSearched ? (
          // 未搜索状态
          <div className="px-4 pt-5 space-y-6">
            {/* 搜索历史 */}
            {history.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-foreground">搜索历史</h2>
                  <button onClick={clearHistory} className="text-xs text-muted-foreground">
                    清空
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((kw, i) => (
                    <button
                      key={i}
                      onClick={() => doSearch(kw)}
                      className="px-3 py-1.5 bg-muted rounded-full text-sm text-foreground hover:bg-muted/70 transition-colors"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 热门搜索 */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">热门搜索</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {hotSearches.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => doSearch(kw)}
                    className="px-3 py-1.5 bg-muted rounded-full text-sm text-foreground hover:bg-muted/70 transition-colors flex items-center gap-1"
                  >
                    {i < 3 && <span className="text-primary font-bold text-xs">{i + 1}</span>}
                    {kw}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : searching ? (
          // 搜索中
          <div className="px-4 pt-5 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          // 无结果
          <div className="flex flex-col items-center justify-center pt-24 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">没有找到相关圈子</p>
            <p className="text-muted-foreground text-sm">换个关键词试试？</p>
          </div>
        ) : (
          // 搜索结果
          <div className="px-4 pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              找到 <span className="text-primary font-medium">{results.length}</span> 个相关圈子
            </p>
            {results.map(circle => (
              <button
                key={circle.id}
                onClick={() => router.push(`/circles/${circle.id}`)}
                className="w-full flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all text-left"
              >
                <Avatar className="w-16 h-16 rounded-xl flex-shrink-0">
                  <AvatarImage src={circle.cover} className="object-cover" />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                    {circle.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-foreground truncate">{circle.name}</span>
                    {circle.isPaid && (
                      <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-800 border-0 flex-shrink-0">
                        付费
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{circle.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{formatCount(circle.members)} 成员</span>
                    </div>
                    {circle.isJoined ? (
                      <span className="text-xs text-muted-foreground">已加入</span>
                    ) : (
                      <span className="text-xs text-primary font-medium">
                        {circle.isPaid ? `¥${circle.price}/年` : '免费加入'}
                      </span>
                    )}
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
