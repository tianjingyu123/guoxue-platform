'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Star, Zap, Crown, Settings, Plus, ChevronRight, Sparkles, Users, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DataState, LoadingSkeleton } from '@/components/data-state'
import { getCircleBots, formatUsageCount } from '@/lib/api/circle-bots'
import type { CircleBotsResponse, CircleBotItem } from '@/lib/types/circle-bots'

type SortBy = 'hot' | 'new' | 'usage'

export default function CircleBotsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSkeleton /></div>}>
      <CircleBotsContent />
    </Suspense>
  )
}

function CircleBotsContent() {
  const searchParams = useSearchParams()
  const circleId = Number(searchParams.get('circleId')) || 1
  
  const [data, setData] = useState<CircleBotsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('hot')
  const [searching, setSearching] = useState(false)

  // 加载数据
  const loadData = async (search?: string) => {
    try {
      if (search !== undefined) {
        setSearching(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      const res = await getCircleBots({
        circleId,
        keyword: search ?? keyword,
        sortBy,
      })
      
      if (res.code === 200) {
        setData(res.data)
      } else {
        setError(res.message || '加载失败')
      }
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [circleId, sortBy])

  // 搜索
  const handleSearch = () => {
    loadData(keyword)
  }

  // 排序选项
  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'hot', label: '最热' },
    { value: 'new', label: '最新' },
    { value: 'usage', label: '使用量' },
  ]

  // 骨架屏
  const renderSkeleton = () => (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部 */}
      <div className="bg-gradient-to-br from-[#C41E3A] to-[#8B0000] px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-12 h-12 rounded-xl bg-white/20" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 bg-white/20 mb-2" />
            <Skeleton className="h-4 w-48 bg-white/20" />
          </div>
        </div>
      </div>
      
      {/* 列表 */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <DataState
      loading={loading}
      error={error}
      empty={!data?.bots.length}
      loadingSkeleton={renderSkeleton()}
      emptyTitle="暂无智能体"
      emptyDescription={data?.circle.isAdmin ? '作为管理员，您可以创建圈子专属智能体' : '该圈子还没有专属智能体'}
      emptyAction={
        data?.circle.isAdmin ? (
          <Link href={`/circles/bot-manage?circleId=${circleId}`}>
            <Button className="bg-[#C41E3A] hover:bg-[#A01830]">
              <Plus className="w-4 h-4 mr-2" />
              创建智能体
            </Button>
          </Link>
        ) : undefined
      }
      onRetry={loadData}
    >
      <div className="min-h-screen bg-[#FAF8F5]">
        {/* 顶部导航 + 圈子信息 */}
        <div className="bg-gradient-to-br from-[#C41E3A] to-[#8B0000] text-white px-4 pt-12 pb-6">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/circles/${circleId}`}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">圈子智能体</h1>
            {data?.circle.isAdmin && (
              <Link href={`/circles/bot-manage?circleId=${circleId}`}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
            )}
            {!data?.circle.isAdmin && <div className="w-10" />}
          </div>
          
          {/* 圈子信息摘要 */}
          {data?.circle && (
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
              <img 
                src={data.circle.icon} 
                alt={data.circle.name}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold truncate">{data.circle.name}</h2>
                  {data.circle.isOwner && (
                    <Badge className="bg-[#C9A96E] text-white text-xs">圈主</Badge>
                  )}
                  {data.circle.isAdmin && !data.circle.isOwner && (
                    <Badge className="bg-white/20 text-white text-xs">管理员</Badge>
                  )}
                </div>
                <p className="text-sm text-white/70 truncate">{data.circle.description}</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{data.total}</div>
                <div className="text-xs text-white/70">智能体</div>
              </div>
            </div>
          )}
        </div>

        {/* 搜索和筛选 */}
        <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E8E4DE] px-4 py-3">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索智能体"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 bg-white border-[#E8E4DE]"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={searching}
              className="bg-[#C41E3A] hover:bg-[#A01830]"
            >
              搜索
            </Button>
          </div>
          
          {/* 排序选项 */}
          <div className="flex gap-2">
            {sortOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={sortBy === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(opt.value)}
                className={sortBy === opt.value 
                  ? 'bg-[#C41E3A] hover:bg-[#A01830] text-white' 
                  : 'border-[#E8E4DE] text-gray-600'
                }
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 管理员创建入口 */}
        {data?.circle.isAdmin && (
          <div className="px-4 pt-4">
            <Link href={`/circles/bot-manage/create?circleId=${circleId}`}>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#C9A96E]/10 to-[#C41E3A]/10 rounded-xl border border-dashed border-[#C9A96E]">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#C41E3A] flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[#333]">创建圈子专属智能体</div>
                  <div className="text-sm text-gray-500">为圈友打造定制化AI助手</div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          </div>
        )}

        {/* Bot 网格列表 */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {data?.bots.map((bot) => (
              <BotCard key={bot.id} bot={bot} circleId={circleId} />
            ))}
          </div>
        </div>
      </div>
    </DataState>
  )
}

// Bot 卡片组件
function BotCard({ bot, circleId }: { bot: CircleBotItem; circleId: number }) {
  return (
    <Link href={`/bots/chat/${bot.id}?from=circle&circleId=${circleId}`}>
      <div className="bg-white rounded-xl border border-[#E8E4DE] overflow-hidden hover:shadow-md transition-shadow">
        {/* 头像和标签 */}
        <div className="relative p-4 pb-2">
          {/* 置顶/官方标签 */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {bot.isPinned && (
              <Badge className="bg-[#C41E3A] text-white text-xs px-1.5">
                <Pin className="w-3 h-3 mr-0.5" />
                置顶
              </Badge>
            )}
            {bot.isOfficial && (
              <Badge className="bg-[#C9A96E] text-white text-xs px-1.5">
                <Crown className="w-3 h-3 mr-0.5" />
                官方
              </Badge>
            )}
            {bot.isNew && !bot.isPinned && !bot.isOfficial && (
              <Badge className="bg-green-500 text-white text-xs">NEW</Badge>
            )}
          </div>
          
          <div className="w-14 h-14 rounded-xl overflow-hidden mx-auto mb-2 ring-2 ring-[#C9A96E]/30">
            <img 
              src={bot.avatar} 
              alt={bot.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          <h3 className="font-bold text-[#333] text-center truncate">{bot.name}</h3>
        </div>
        
        {/* 描述 */}
        <div className="px-3 pb-2">
          <p className="text-xs text-gray-500 line-clamp-2 h-8">{bot.description}</p>
        </div>
        
        {/* 标签 */}
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {bot.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag} 
              className="text-xs px-1.5 py-0.5 bg-[#FAF8F5] text-[#666] rounded"
            >
              {tag}
            </span>
          ))}
        </div>
        
        {/* 底部信息 */}
        <div className="px-3 py-2 border-t border-[#F0EDE8] flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Star className="w-3 h-3 text-[#C9A96E] fill-[#C9A96E]" />
            <span>{bot.rating}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Zap className="w-3 h-3" />
            <span>{formatUsageCount(bot.usageCount)}</span>
          </div>
          {bot.price > 0 ? (
            <span className="text-xs font-medium text-[#C41E3A]">{bot.price}币/次</span>
          ) : (
            <span className="text-xs text-green-600">免费</span>
          )}
        </div>
        
        {/* 创建者 */}
        <div className="px-3 py-2 bg-[#FAF8F5] flex items-center gap-2">
          <img 
            src={bot.creator.avatar} 
            alt={bot.creator.nickname}
            className="w-5 h-5 rounded-full"
          />
          <span className="text-xs text-gray-500 truncate">{bot.creator.nickname}</span>
        </div>
      </div>
    </Link>
  )
}
