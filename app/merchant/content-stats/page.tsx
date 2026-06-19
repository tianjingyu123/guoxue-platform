'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Eye, ThumbsUp, ShoppingBag } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataState } from '@/components/data-state'
import { getContentStats, getContentList } from '@/lib/api/merchant'
import type { ContentStats, ContentItem } from '@/lib/types/merchant'

export default function ContentStatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ContentStats | null>(null)
  const [contents, setContents] = useState<ContentItem[]>([])
  const [activeType, setActiveType] = useState<'商品' | '文章' | null>(null)

  useEffect(() => {
    loadData()
  }, [activeType])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, contentRes] = await Promise.all([
        getContentStats(),
        getContentList(activeType ? (activeType === '商品' ? '商品' : '文章') : undefined, 1, 20),
      ])

      if (statsRes.code === 200) {
        setStats(statsRes.data)
      } else {
        setError('加载内容统计失败')
      }

      if (contentRes.code === 200) {
        setContents(contentRes.data.list)
      }
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已发布':
        return 'bg-green-100 text-green-800'
      case '草稿':
        return 'bg-gray-100 text-gray-800'
      case '下架':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">内容统计</h1>
          <div className="w-8" />
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!stats}
        onRetry={loadData}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        {stats && (
          <div className="pb-20">
            {/* 数据概览 */}
            <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">发布商品</div>
                <div className="text-2xl font-bold text-foreground">{stats.publishedProducts}</div>
                <div className="text-xs text-muted-foreground mt-1">/ {stats.totalProducts}</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">已发布文章</div>
                <div className="text-2xl font-bold text-foreground">{stats.publishedArticles}</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">总浏览数</div>
                <div className="text-2xl font-bold text-foreground">{stats.totalViews.toLocaleString()}</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">总点赞数</div>
                <div className="text-2xl font-bold text-foreground">{stats.totalLikes.toLocaleString()}</div>
              </Card>
            </div>

            {/* 内容详情卡片 */}
            <div className="mx-4 mt-6 grid grid-cols-1 gap-3">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">商品</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{stats.totalProducts} 件</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">已发布</div>
                    <div className="text-lg font-bold text-foreground">{stats.publishedProducts}</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">草稿</div>
                    <div className="text-lg font-bold text-foreground">{stats.draftProducts}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gold" />
                    <span className="font-semibold text-foreground">文章</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{stats.publishedArticles} 篇</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">总阅读</span>
                    <span className="font-semibold text-foreground">{stats.totalViews.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">总点赞</span>
                    <span className="font-semibold text-foreground">{stats.totalLikes.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* 内容列表 */}
            <div className="mx-4 mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">内容列表</h3>
              <div className="flex gap-2 mb-3 pb-2 overflow-x-auto">
                <button
                  onClick={() => setActiveType(null)}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeType === null
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setActiveType('商品')}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeType === '商品'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  商品
                </button>
                <button
                  onClick={() => setActiveType('文章')}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeType === '文章'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  文章
                </button>
              </div>

              {contents.length > 0 ? (
                <div className="space-y-2">
                  {contents.map(item => (
                    <Card key={item.id} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground line-clamp-1">
                              {item.title}
                            </span>
                            <Badge variant="secondary" className={`text-xs ${getStatusColor(item.status)}`}>
                              {item.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{item.createdAt}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-3 h-3" /> {item.views}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <ThumbsUp className="w-3 h-3" /> {item.likes}
                        </span>
                        {item.sales !== undefined && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <ShoppingBag className="w-3 h-3" /> {item.sales} 件
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <div className="text-muted-foreground">暂无内容</div>
                </Card>
              )}
            </div>
          </div>
        )}
      </DataState>
    </div>
  )
}
