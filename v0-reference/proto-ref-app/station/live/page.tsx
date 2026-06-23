'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Search, RefreshCw, Play, Clock, Eye, Heart, ShoppingBag, Radio, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DataState, LoadingSkeleton } from '@/components/data-state'
import { 
  getStationLiveRooms, 
  formatViewCount, 
  formatDuration, 
  calculateCountdown, 
  formatCountdown,
  getLiveStatusInfo
} from '@/lib/api/station-live'
import type { StationLiveRoom, LiveFilter, StationLiveListResponse } from '@/lib/types/station-live'

// 筛选选项
const filterOptions: { value: LiveFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'live', label: '直播中' },
  { value: 'preview', label: '预告' },
  { value: 'replay', label: '回放' },
]

// 直播卡片骨架屏
function LiveCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <Skeleton className="w-full aspect-[16/9]" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  )
}

// 直播卡片组件
function LiveCard({ room, onClick }: { room: StationLiveRoom; onClick: () => void }) {
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)
  const statusInfo = getLiveStatusInfo(room.status)

  // 预告倒计时
  useEffect(() => {
    if (room.status !== 'preview' || !room.scheduledTime) return

    const updateCountdown = () => {
      const cd = calculateCountdown(room.scheduledTime!)
      setCountdown(cd)
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [room.status, room.scheduledTime])

  return (
    <div 
      className={`bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer transition-transform active:scale-[0.98] ${
        room.status === 'live' ? 'ring-2 ring-[#C41E3A]' : ''
      }`}
      onClick={onClick}
    >
      {/* 封面 */}
      <div className="relative aspect-[16/9]">
        <img 
          src={room.cover} 
          alt={room.title}
          className="w-full h-full object-cover"
        />
        
        {/* 状态标签 */}
        <div 
          className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"
          style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
        >
          {room.status === 'live' && (
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          )}
          {statusInfo.label}
        </div>

        {/* 直播中角标 */}
        {room.status === 'live' && (
          <div className="absolute top-2 right-2 bg-[#C41E3A] text-white text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
            <Radio className="w-3 h-3" />
            LIVE
          </div>
        )}

        {/* 回放时长 */}
        {room.status === 'replay' && room.replayDuration && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(room.replayDuration)}
          </div>
        )}

        {/* 预告倒计时 */}
        {room.status === 'preview' && countdown && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white">
              <Clock className="w-6 h-6 mx-auto mb-1" />
              <div className="text-sm font-medium">{formatCountdown(countdown)}</div>
            </div>
          </div>
        )}

        {/* 商品数量 */}
        {room.productCount > 0 && (
          <div className="absolute bottom-2 left-2 bg-[#C9A96E] text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <ShoppingBag className="w-3 h-3" />
            {room.productCount}件商品
          </div>
        )}
      </div>

      {/* 信息 */}
      <div className="p-3">
        {/* 标题 */}
        <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2">
          {room.title}
        </h3>

        {/* 主播信息 */}
        <div className="flex items-center gap-2 mb-2">
          <img 
            src={room.anchor.avatar} 
            alt={room.anchor.nickname}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-xs text-gray-600 truncate flex-1">
            {room.anchor.nickname}
          </span>
          {room.isStationExclusive && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded">
              专属
            </span>
          )}
        </div>

        {/* 统计数据 */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatViewCount(room.viewCount)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {formatViewCount(room.likeCount)}
          </span>
        </div>

        {/* 标签 */}
        {room.tags && room.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {room.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StationLivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSkeleton /></div>}>
      <StationLiveContent />
    </Suspense>
  )
}

function StationLiveContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stationId = Number(searchParams.get('stationId') || 1)
  
  const [filter, setFilter] = useState<LiveFilter>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [data, setData] = useState<StationLiveListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  // 加载数据
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
        setPage(1)
      } else {
        setLoading(true)
      }
      setError(null)
      
      const res = await getStationLiveRooms(stationId, filter, 1)
      if (res.code === 200 && res.data) {
        setData(res.data)
      } else {
        setError(res.message || '加载失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [stationId, filter])

  // 加载更多
  const loadMore = async () => {
    if (!data?.hasMore || loadingMore) return
    
    try {
      setLoadingMore(true)
      const res = await getStationLiveRooms(stationId, filter, page + 1)
      if (res.code === 200 && res.data) {
        setData(prev => prev ? {
          ...res.data,
          list: [...prev.list, ...res.data.list],
        } : res.data)
        setPage(p => p + 1)
      }
    } catch {
      // ignore
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  // 筛选后的列表
  const filteredList = data?.list.filter(room => 
    !searchKeyword || room.title.includes(searchKeyword) || room.anchor.nickname.includes(searchKeyword)
  ) || []

  // 进入直播间
  const enterLiveRoom = (roomId: number) => {
    router.push(`/live/room/${roomId}?stationId=${stationId}`)
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 导航栏 */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#C41E3A] to-[#A01830]">
        <div className="flex items-center justify-between px-4 h-12">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {data && (
              <>
                <img 
                  src={data.stationLogo} 
                  alt={data.stationName}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-white font-medium">{data.stationName} - 直播</span>
              </>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`text-white hover:bg-white/20 ${refreshing ? 'animate-spin' : ''}`}
            onClick={() => loadData(true)}
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索直播间"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9 bg-white/90 border-0 rounded-full h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 筛选标签 */}
      <div className="sticky top-[104px] z-40 bg-[#FAF8F5] px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === option.value
                  ? 'bg-[#C41E3A] text-white'
                  : 'bg-white text-gray-600'
              }`}
            >
              {option.label}
              {option.value === 'live' && data && (
                <span className="ml-1">
                  ({data.list.filter(r => r.status === 'live').length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 直播列表 */}
      <div className="px-4 py-4">
        <DataState
          loading={loading}
          error={error}
          empty={filteredList.length === 0}
          emptyMessage="暂无直播"
          onRetry={() => loadData()}
          loadingComponent={
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map(i => <LiveCardSkeleton key={i} />)}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4">
            {/* 直播中置顶 */}
            {filteredList.filter(r => r.status === 'live').map(room => (
              <LiveCard 
                key={room.id} 
                room={room} 
                onClick={() => enterLiveRoom(room.id)}
              />
            ))}
            
            {/* 预告 */}
            {filter !== 'live' && filteredList.filter(r => r.status === 'preview').map(room => (
              <LiveCard 
                key={room.id} 
                room={room} 
                onClick={() => enterLiveRoom(room.id)}
              />
            ))}
            
            {/* 回放 */}
            {filter !== 'live' && filter !== 'preview' && filteredList.filter(r => r.status === 'replay').map(room => (
              <LiveCard 
                key={room.id} 
                room={room} 
                onClick={() => enterLiveRoom(room.id)}
              />
            ))}
          </div>

          {/* 加载更多 */}
          {data?.hasMore && (
            <div className="mt-4 flex justify-center">
              <Button 
                variant="ghost" 
                className="text-[#C9A96E]"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? '加载中...' : '加载更多'}
                {!loadingMore && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          )}
        </DataState>
      </div>

      {/* 空态引导 */}
      {!loading && filteredList.length === 0 && filter === 'live' && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">暂无正在直播的内容</div>
          <Button 
            variant="outline"
            className="border-[#C9A96E] text-[#C9A96E]"
            onClick={() => setFilter('preview')}
          >
            <Clock className="w-4 h-4 mr-2" />
            查看直播预告
          </Button>
        </div>
      )}
    </div>
  )
}
