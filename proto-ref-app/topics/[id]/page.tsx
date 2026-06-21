"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Hash, Users, FileText, Share2, Plus, Flame, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// 话题数据类型
interface Topic {
  id: string
  name: string
  description: string
  cover?: string
  posts: number
  followers: number
  isFollowed: boolean
}

interface TopicPost {
  id: string
  type: 'post' | 'article'
  content: string
  images?: string[]
  author: {
    id: string
    name: string
    avatar: string
  }
  createdAt: string
  likes: number
  comments: number
  isLiked: boolean
  source?: {
    type: 'circle' | 'article'
    id: string
    name: string
  }
}

// Mock数据
const mockTopic: Topic = {
  id: "1",
  name: "八字入门",
  description: "探讨八字命理基础知识，分享学习心得，解答入门疑惑。适合初学者交流学习。",
  posts: 1280,
  followers: 5680,
  isFollowed: false,
}

const mockPosts: TopicPost[] = [
  {
    id: "1",
    type: "post",
    content: "今天学习了八字中的十神关系，感觉对理解命局有很大帮助。分享一下我的笔记：正官代表约束、规矩，七杀代表压力、挑战...",
    images: ["/placeholder.svg?height=200&width=200"],
    author: { id: "1", name: "命理新手", avatar: "/placeholder.svg?height=40&width=40" },
    createdAt: "2024-01-15T10:30:00Z",
    likes: 128,
    comments: 32,
    isLiked: false,
    source: { type: "circle", id: "1", name: "八字研习社" },
  },
  {
    id: "2",
    type: "article",
    content: "八字入门必知：天干地支的基本概念与记忆方法。很多初学者对天干地支感到困惑，本文将用最简单的方式帮你理解...",
    author: { id: "2", name: "周易大师", avatar: "/placeholder.svg?height=40&width=40" },
    createdAt: "2024-01-14T15:20:00Z",
    likes: 356,
    comments: 89,
    isLiked: true,
    source: { type: "article", id: "1", name: "专栏文章" },
  },
  {
    id: "3",
    type: "post",
    content: "请教各位大神，八字中的日主弱是不是一定不好？我看了一些资料说身弱需要帮扶，但又有说法是身弱也有好命...",
    author: { id: "3", name: "求学者", avatar: "/placeholder.svg?height=40&width=40" },
    createdAt: "2024-01-13T09:15:00Z",
    likes: 45,
    comments: 67,
    isLiked: false,
  },
]

// 骨架屏
function TopicSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-48 bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20 animate-pulse" />
      <div className="px-4 -mt-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="h-6 w-32 bg-[#F2EFEA] rounded animate-pulse mb-2" />
          <div className="h-4 w-full bg-[#F2EFEA] rounded animate-pulse mb-4" />
          <div className="flex gap-4">
            <div className="h-8 w-20 bg-[#F2EFEA] rounded animate-pulse" />
            <div className="h-8 w-20 bg-[#F2EFEA] rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="px-4 mt-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 bg-[#F2EFEA] rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-[#F2EFEA] rounded mb-1" />
                <div className="h-3 w-16 bg-[#F2EFEA] rounded" />
              </div>
            </div>
            <div className="h-4 w-full bg-[#F2EFEA] rounded mb-2" />
            <div className="h-4 w-2/3 bg-[#F2EFEA] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// 空状态
function EmptyState({ onPost }: { onPost: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-4">
        <FileText className="w-10 h-10 text-[#999999]" />
      </div>
      <p className="text-[#666666] mb-4">暂无相关内容</p>
      <button
        onClick={onPost}
        className="px-6 py-2 bg-gradient-to-r from-[#C41E3A] to-[#E84C3D] text-white rounded-full text-sm"
      >
        发布第一篇
      </button>
    </div>
  )
}

export default function TopicPage() {
  const params = useParams()
  const router = useRouter()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [posts, setPosts] = useState<TopicPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'latest' | 'hot'>('latest')
  const [isFollowed, setIsFollowed] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      // TODO: 调用 topicApi.detail() 和 topicApi.posts()
      await new Promise(r => setTimeout(r, 800))
      setTopic(mockTopic)
      setPosts(mockPosts)
      setIsFollowed(mockTopic.isFollowed)
      setIsLoading(false)
    }
    loadData()
  }, [params.id, sortBy])

  const handleFollow = async () => {
    const newState = !isFollowed
    setIsFollowed(newState)
    if (topic) {
      setTopic({ ...topic, followers: topic.followers + (newState ? 1 : -1) })
    }
    // TODO: 调用 topicApi.follow()
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `#${topic?.name}`,
        text: topic?.description,
        url: window.location.href,
      })
    }
  }

  const handlePost = () => {
    router.push(`/circles/create-post?topic=${params.id}`)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  if (isLoading) return <TopicSkeleton />

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 顶部背景 */}
      <div className="h-48 bg-gradient-to-br from-[#C41E3A] to-[#8B1528] relative">
        {/* 导航栏 */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* 装饰图案 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 right-8 w-32 h-32 border-4 border-white rounded-full" />
          <div className="absolute bottom-4 left-4 w-16 h-16 border-2 border-white rounded-full" />
        </div>
      </div>

      {/* 话题信息卡片 */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          {/* 话题名称 */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C41E3A] to-[#E84C3D] flex items-center justify-center">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#2C2C2C]">{topic?.name}</h1>
          </div>

          {/* 描述 */}
          <p className="text-sm text-[#666666] leading-relaxed mb-4">
            {topic?.description}
          </p>

          {/* 统计数据 */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#999999]" />
              <span className="text-sm text-[#666666]">
                <span className="font-semibold text-[#2C2C2C]">{topic?.posts?.toLocaleString()}</span> 篇内容
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#999999]" />
              <span className="text-sm text-[#666666]">
                <span className="font-semibold text-[#2C2C2C]">{topic?.followers?.toLocaleString()}</span> 人关注
              </span>
            </div>
          </div>

          {/* 关注按钮 */}
          <button
            onClick={handleFollow}
            className={cn(
              "w-full py-2.5 rounded-xl text-sm font-medium transition-all",
              isFollowed
                ? "bg-[#F5F0E8] text-[#666666]"
                : "bg-gradient-to-r from-[#C41E3A] to-[#E84C3D] text-white"
            )}
          >
            {isFollowed ? "已关注" : "+ 关注话题"}
          </button>
        </div>
      </div>

      {/* 排序Tab */}
      <div className="px-4 mt-4">
        <div className="flex items-center gap-1 bg-white rounded-xl p-1">
          <button
            onClick={() => setSortBy('latest')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all",
              sortBy === 'latest'
                ? "bg-gradient-to-r from-[#C41E3A] to-[#E84C3D] text-white"
                : "text-[#666666]"
            )}
          >
            <Clock className="w-4 h-4" />
            最新
          </button>
          <button
            onClick={() => setSortBy('hot')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all",
              sortBy === 'hot'
                ? "bg-gradient-to-r from-[#C41E3A] to-[#E84C3D] text-white"
                : "text-[#666666]"
            )}
          >
            <Flame className="w-4 h-4" />
            最热
          </button>
        </div>
      </div>

      {/* 帖子列表 */}
      <div className="px-4 mt-4 space-y-3">
        {posts.length === 0 ? (
          <EmptyState onPost={handlePost} />
        ) : (
          posts.map(post => (
            <div
              key={post.id}
              onClick={() => router.push(post.source?.type === 'article' 
                ? `/articles/${post.source.id}` 
                : `/circles/${post.source?.id}/posts/${post.id}`
              )}
              className="bg-white rounded-xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-transform cursor-pointer"
            >
              {/* 来源标签 */}
              {post.source && (
                <div className="flex items-center gap-1.5 mb-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs",
                    post.source.type === 'article' 
                      ? "bg-[#C9A96E]/10 text-[#C9A96E]"
                      : "bg-[#C41E3A]/10 text-[#C41E3A]"
                  )}>
                    {post.source.type === 'article' ? '文章' : '圈子'}
                  </span>
                  <span className="text-xs text-[#999999]">{post.source.name}</span>
                </div>
              )}

              {/* 作者信息 */}
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2C2C2C]">{post.author.name}</p>
                  <p className="text-xs text-[#999999]">{formatTime(post.createdAt)}</p>
                </div>
              </div>

              {/* 内容 */}
              <p className="text-sm text-[#2C2C2C] leading-relaxed line-clamp-3 mb-3">
                {post.content}
              </p>

              {/* 图片 */}
              {post.images && post.images.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {post.images.slice(0, 3).map((img, i) => (
                    <div
                      key={i}
                      className="w-20 h-20 rounded-lg overflow-hidden bg-[#F5F0E8]"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {post.images.length > 3 && (
                    <div className="w-20 h-20 rounded-lg bg-[#F5F0E8] flex items-center justify-center">
                      <span className="text-sm text-[#666666]">+{post.images.length - 3}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 互动数据 */}
              <div className="flex items-center gap-4 text-xs text-[#999999]">
                <span className={post.isLiked ? "text-[#C41E3A]" : ""}>
                  {post.likes} 赞
                </span>
                <span>{post.comments} 评论</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部发帖按钮 */}
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={handlePost}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-[#C41E3A] to-[#E84C3D] shadow-lg flex items-center justify-center"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  )
}
