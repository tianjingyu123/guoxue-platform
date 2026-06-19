"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Heart, FileText, Video, BookOpen, ShoppingBag, Users, HelpCircle, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataState } from "@/components/data-state"
import useSWR from "swr"
import { getMyLikes, getLikeTypeName, getLikeTargetUrl, unlikeContent } from "@/lib/api/likes"
import type { LikeItem, LikeTargetType } from "@/lib/types/likes"

// 获取类型对应的图标
function getTypeIcon(type: LikeTargetType) {
  const iconMap: Record<LikeTargetType, React.ReactNode> = {
    article: <FileText className="w-4 h-4" />,
    course: <BookOpen className="w-4 h-4" />,
    video: <Video className="w-4 h-4" />,
    product: <ShoppingBag className="w-4 h-4" />,
    circle_post: <Users className="w-4 h-4" />,
    question: <HelpCircle className="w-4 h-4" />,
    answer: <MessageSquare className="w-4 h-4" />,
    comment: <MessageSquare className="w-4 h-4" />
  }
  return iconMap[type] || <FileText className="w-4 h-4" />
}

// 获取类型对应的颜色
function getTypeColor(type: LikeTargetType): string {
  const colorMap: Record<LikeTargetType, string> = {
    article: 'bg-blue-100 text-blue-600',
    course: 'bg-amber-100 text-amber-600',
    video: 'bg-red-100 text-red-600',
    product: 'bg-green-100 text-green-600',
    circle_post: 'bg-purple-100 text-purple-600',
    question: 'bg-orange-100 text-orange-600',
    answer: 'bg-teal-100 text-teal-600',
    comment: 'bg-gray-100 text-gray-600'
  }
  return colorMap[type] || 'bg-gray-100 text-gray-600'
}

// 筛选选项
const filterOptions: { label: string; value: LikeTargetType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '文章', value: 'article' },
  { label: '课程', value: 'course' },
  { label: '视频', value: 'video' },
  { label: '帖子', value: 'circle_post' },
  { label: '问答', value: 'question' },
  { label: '商品', value: 'product' }
]

// 骨架屏组件
function LikeSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-200 rounded-full" />
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-24 ml-auto" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 点赞项组件
function LikeItemCard({ 
  item, 
  onUnlike 
}: { 
  item: LikeItem
  onUnlike: (id: number) => void
}) {
  const router = useRouter()
  const [isUnliking, setIsUnliking] = useState(false)

  const handleClick = () => {
    router.push(getLikeTargetUrl(item.target.id, item.target.type))
  }

  const handleUnlike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsUnliking(true)
    try {
      const res = await unlikeContent(item.target.id, item.target.type)
      if (res.code === 200) {
        onUnlike(item.id)
      }
    } finally {
      setIsUnliking(false)
    }
  }

  return (
    <div 
      className="bg-white rounded-lg p-4 cursor-pointer active:bg-gray-50 transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* 类型图标 */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(item.target.type)}`}>
          {getTypeIcon(item.target.type)}
        </div>
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
            {item.target.title}
          </h3>
          
          {/* 底部信息 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* 作者信息 */}
              {item.target.author && (
                <>
                  <img 
                    src={item.target.author.avatar} 
                    alt={item.target.author.nickname}
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-xs text-gray-500">{item.target.author.nickname}</span>
                </>
              )}
              {/* 类型标签 */}
              <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
                {getLikeTypeName(item.target.type)}
              </span>
            </div>
            
            {/* 时间和取消点赞 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{item.createdAt}</span>
              <button
                onClick={handleUnlike}
                disabled={isUnliking}
                className="p-1 text-[#C41E3A] hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyLikesPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<LikeTargetType | 'all'>('all')

  // 获取点赞列表
  const { data, error, isLoading, mutate } = useSWR(
    ['my-likes', filter],
    () => getMyLikes(1, 50, filter === 'all' ? undefined : filter),
    { revalidateOnFocus: false }
  )

  const likes = data?.data?.list || []
  const total = data?.data?.total || 0

  // 处理取消点赞
  const handleUnlike = (id: number) => {
    mutate(
      prev => {
        if (!prev?.data) return prev
        return {
          ...prev,
          data: {
            ...prev.data,
            list: prev.data.list.filter(item => item.id !== id),
            total: prev.data.total - 1
          }
        }
      },
      false
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">我的点赞</h1>
          <div className="w-6" />
        </div>

        {/* 筛选栏 */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {filterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  filter === option.value
                    ? 'bg-[#C41E3A] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      {!isLoading && !error && likes.length > 0 && (
        <div className="px-4 py-2">
          <span className="text-xs text-gray-500">共 {total} 条点赞记录</span>
        </div>
      )}

      {/* 点赞列表 */}
      <div className="px-4 pb-20">
        <DataState
          isLoading={isLoading}
          error={error}
          isEmpty={likes.length === 0}
          loadingComponent={<LikeSkeleton />}
          emptyTitle="暂无点赞记录"
          emptyDescription="去发现更多精彩内容吧"
          emptyAction={
            <Button
              onClick={() => router.push('/')}
              className="bg-[#C41E3A] hover:bg-[#A31830] text-white"
            >
              去逛逛
            </Button>
          }
        >
          <div className="space-y-3 pt-2">
            {likes.map(item => (
              <LikeItemCard
                key={item.id}
                item={item}
                onUnlike={handleUnlike}
              />
            ))}
          </div>
        </DataState>
      </div>
    </div>
  )
}
