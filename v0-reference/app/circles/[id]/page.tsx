"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Bell, Share2, Users, FileText, ChevronDown, ChevronUp, Heart, MessageCircle, Pin, Crown, Shield, MoreHorizontal, Plus, Bookmark, Calendar, Star, Award, BookOpen, CheckCircle, Play, Lock, ChevronRight, Sparkles, Flame, Clock, Zap, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { circleApi, type CircleDetail, type CirclePost, type CircleMember } from "@/lib/api"

// Mock数据 - 增强版
const mockCircle: CircleDetail = {
  id: "1",
  name: "八字命理研习社",
  cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop",
  description: "探讨八字命理学的专业圈子，汇聚众多命理爱好者和专业人士，共同研习传统命理文化。",
  category: "命理",
  members: 12580,
  posts: 3256,
  isJoined: false,
  todayActive: 128,
  createdAt: "2023-01-15",
  owner: { id: "1", name: "周易大师", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=master" },
  rules: ["禁止发布广告信息", "尊重他人，理性讨论", "禁止人身攻击", "原创内容请标注"],
  announcement: "欢迎加入八字命理研习社！本圈子致力于传承和发扬中华传统命理文化，定期举办线上交流活动，欢迎各位同好积极参与讨论。近期将举办「八字入门精讲」系列直播，敬请期待！",
  tags: ["八字", "命理", "国学", "传统文化"],
}

// 会员权益
const memberBenefits = [
  { icon: BookOpen, title: "专属内容", desc: "解锁全部精华帖子" },
  { icon: MessageCircle, title: "直接提问", desc: "向圈主发起提问" },
  { icon: Play, title: "直播回放", desc: "观看历史直播" },
  { icon: Award, title: "专属勋章", desc: "展示会员身份" },
]

// 专栏数据
const columns = [
  { id: "col1", title: "八字入门系列", author: "周易大师", cover: "https://picsum.photos/200/150?random=301", articles: 12, views: 8560, isPremium: true },
  { id: "col2", title: "十神详解", author: "周易大师", cover: "https://picsum.photos/200/150?random=302", articles: 8, views: 5280, isPremium: false },
  { id: "col3", title: "实战案例分析", author: "周易大师", cover: "https://picsum.photos/200/150?random=303", articles: 24, views: 12800, isPremium: true },
]

// 圈子文章（圈主发布的深度长文，推送到首页前归属本圈）
const circleArticles = [
  { id: "1", title: "八字入门：如何正确排出你的生辰八字", cover: "/images/feed/article-1.jpg", author: "玄微子", publishedAt: "2024-01-15", views: 8520, likes: 1256, isFeatured: true },
  { id: "2", title: "紫微斗数与八字命理的区别与联系", cover: "/images/feed/article-2.jpg", author: "玄微子", publishedAt: "2024-01-12", views: 3200, likes: 456, isFeatured: false },
  { id: "3", title: "如何从八字看财运旺衰", cover: "", author: "玄微子", publishedAt: "2024-01-08", views: 5600, likes: 890, isFeatured: false },
]

// 近期活动
const activities = [
  { id: "act1", type: "live", title: "八字入门精讲（第3期）", time: "今晚 20:00", status: "upcoming" },
  { id: "act2", type: "checkin", title: "《滴天髓》共读打卡 Day 15", time: "进行中", status: "ongoing", participants: 328 },
  { id: "act3", type: "homework", title: "八字案例分析作业", time: "本周日截止", status: "ongoing", participants: 156 },
]

const mockPosts: CirclePost[] = [
  {
    id: "1",
    content: "今天分享一个八字案例分析：某人八字为甲子、丙寅、戊辰、壬戌，这个八字有什么特点？欢迎大家一起探讨。从五行来看...",
    images: ["https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop"],
    author: { id: "1", name: "周易大师", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=master", title: "圈主" },
    createdAt: "2024-01-15 10:30",
    likes: 128,
    comments: 32,
    isLiked: false,
    isPinned: true,
    isEssence: true,
  },
  {
    id: "2",
    content: "请教各位老师，关于日主强弱的判断，除了看得令、得地、得生、得助之外，还有什么需要注意的要点吗？",
    author: { id: "2", name: "命理新手", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=newbie" },
    createdAt: "2024-01-15 09:15",
    likes: 45,
    comments: 18,
    isLiked: true,
  },
  {
    id: "3",
    content: "分享一本好书《滴天髓》，这是学习八字必读的经典之作，里面的义理非常深刻，推荐给大家。",
    images: [
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop",
    ],
    author: { id: "3", name: "古籍爱好者", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=book" },
    createdAt: "2024-01-14 16:20",
    likes: 89,
    comments: 24,
    isLiked: false,
  },
]

const mockMembers: CircleMember[] = [
  { id: "1", name: "周易大师", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=master", title: "资深命理师", role: "owner", joinedAt: "2023-01-15", posts: 156 },
  { id: "2", name: "紫微研究者", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ziwei", title: "管理员", role: "admin", joinedAt: "2023-02-20", posts: 89 },
  { id: "3", name: "命理新手", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=newbie", role: "member", joinedAt: "2024-01-10", posts: 12 },
  { id: "4", name: "古籍爱好者", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=book", role: "member", joinedAt: "2023-12-05", posts: 34 },
]

// 骨架屏
function Skeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] animate-pulse">
      <div className="h-48 bg-[#E8E3DB]" />
      <div className="px-4 -mt-12">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-16 h-16 rounded-full bg-[#E8E3DB]" />
            <div className="flex-1">
              <div className="h-5 bg-[#E8E3DB] rounded w-32 mb-2" />
              <div className="h-4 bg-[#E8E3DB] rounded w-24" />
            </div>
          </div>
          <div className="h-4 bg-[#E8E3DB] rounded w-full mb-2" />
          <div className="h-4 bg-[#E8E3DB] rounded w-3/4" />
        </div>
      </div>
    </div>
  )
}

// 置顶帖子组件
function PinnedPost({ post, circleId }: { post: CirclePost; circleId: string }) {
  return (
    <Link href={`/circles/${circleId}/posts/${post.id}`}>
      <div className="bg-gradient-to-r from-[#FFF8E7] to-[#FFFBF0] rounded-xl p-3 border border-[#F0E6D3]">
        <div className="flex items-start gap-3">
          <img src={post.author.avatar} alt="" className="w-10 h-10 rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Pin className="w-3.5 h-3.5 text-[#C41E3A]" />
              <span className="text-[12px] text-[#C41E3A] font-medium">置顶</span>
              {post.isEssence && (
                <span className="text-[10px] px-1.5 py-0.5 bg-[#C9A96E]/10 text-[#C9A96E] rounded">精华</span>
              )}
            </div>
            <p className="text-[13px] text-[#2C2C2C] line-clamp-2 leading-relaxed">{post.content}</p>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-[#999]">
              <span>{post.author.name}</span>
              <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes}</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.comments}</span>
            </div>
          </div>
          {post.images && post.images.length > 0 && (
            <img src={post.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
          )}
        </div>
      </div>
    </Link>
  )
}

// 专栏卡片
function ColumnCard({ column, circleId }: { column: typeof columns[0]; circleId: string }) {
  return (
    <Link href={`/circles/${circleId}/columns/${column.id}`}>
      <div className="flex-shrink-0 w-[160px] bg-white rounded-xl overflow-hidden shadow-sm">
        <div className="relative">
          <img src={column.cover} alt="" className="w-full h-20 object-cover" />
          {column.isPremium && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-[#C9A96E] rounded-full flex items-center justify-center">
              <Lock className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="p-2.5">
          <h4 className="text-[13px] font-medium text-[#2C2C2C] line-clamp-1">{column.title}</h4>
          <p className="text-[11px] text-[#999] mt-1">{column.articles}篇 · {column.views}阅读</p>
        </div>
      </div>
    </Link>
  )
}

// 活动卡片
function ActivityCard({ activity, circleId }: { activity: typeof activities[0]; circleId: string }) {
  return (
    <Link href={`/circles/${circleId}/activities/${activity.id}`}>
      <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          activity.type === 'live' ? "bg-red-500/10" : 
          activity.type === 'checkin' ? "bg-green-500/10" : "bg-orange-500/10"
        )}>
          {activity.type === 'live' && <Play className="w-5 h-5 text-red-500" />}
          {activity.type === 'checkin' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {activity.type === 'homework' && <BookOpen className="w-5 h-5 text-orange-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-medium text-[#2C2C2C] truncate">{activity.title}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[#999]">{activity.time}</span>
            {activity.participants && (
              <span className="text-[11px] text-[#999]">{activity.participants}人参与</span>
            )}
          </div>
        </div>
        {activity.status === 'upcoming' && (
          <button className="px-3 py-1.5 bg-[#C41E3A] text-white text-[11px] rounded-full">预约</button>
        )}
        {activity.status === 'ongoing' && (
          <button className="px-3 py-1.5 bg-[#52C41A] text-white text-[11px] rounded-full">参与</button>
        )}
      </div>
    </Link>
  )
}

export default function CircleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string

  const [circle, setCircle] = useState<CircleDetail | null>(null)
  const [posts, setPosts] = useState<CirclePost[]>([])
  const [members, setMembers] = useState<CircleMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'posts' | 'articles' | 'essence' | 'columns' | 'members'>('home')
  const [showAnnouncement, setShowAnnouncement] = useState(true)
  const [isJoined, setIsJoined] = useState(false)
  const [isOwner] = useState(true) // Mock：当前用户是圈主（实际从 session 判断）
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [showBenefits, setShowBenefits] = useState(false)

  useEffect(() => {
    loadData()
  }, [circleId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [circleData, postsData, membersData] = await Promise.all([
        circleApi.detail(circleId).catch(() => mockCircle),
        circleApi.posts(circleId).catch(() => ({ data: mockPosts, total: mockPosts.length })),
        circleApi.listMembers(circleId).catch(() => ({ data: mockMembers, total: mockMembers.length })),
      ])
      setCircle(circleData)
      setPosts(postsData.data)
      setMembers(membersData.data)
      setIsJoined(circleData.isJoined)
      setLikedPosts(new Set(postsData.data.filter(p => p.isLiked).map(p => p.id)))
    } catch {
      setCircle(mockCircle)
      setPosts(mockPosts)
      setMembers(mockMembers)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!isJoined) {
      setShowBenefits(true)
    } else {
      const prev = isJoined
      setIsJoined(!prev)
      try {
        await circleApi.leave(circleId)
      } catch {
        setIsJoined(prev)
      }
    }
  }

  const confirmJoin = async () => {
    setShowBenefits(false)
    setIsJoined(true)
    try {
      await circleApi.join(circleId)
    } catch {
      setIsJoined(false)
    }
  }

  const handleLikePost = (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      return next
    })
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, likes: p.likes + (likedPosts.has(postId) ? -1 : 1) } : p
    ))
  }

  const tabs = [
    { id: 'home' as const, label: '首页' },
    { id: 'posts' as const, label: '帖子' },
    { id: 'articles' as const, label: '文章' },
    { id: 'essence' as const, label: '精华' },
    { id: 'columns' as const, label: '专栏' },
    { id: 'members' as const, label: '成员' },
  ]

  const pinnedPosts = posts.filter(p => p.isPinned)
  const essencePosts = posts.filter(p => p.isEssence)

  if (isLoading) return <Skeleton />
  if (!circle) return null

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部封面 */}
      <div className="relative h-48">
        <img src={circle.cover} alt={circle.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* 顶部导航 */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => router.push(`/common/share-poster?type=circle&targetId=${circleId}`)}
              className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center"
              aria-label="生成圈子分享海报"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* 圈子等级标识 */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-gradient-to-r from-[#C9A96E] to-[#E8D5B5] rounded-full flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-white fill-white" />
          <span className="text-[11px] text-white font-medium">优质圈子</span>
        </div>
      </div>

      {/* 圈子信息卡片 */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-full bg-[#FAF8F5] border-4 border-white shadow-md overflow-hidden flex-shrink-0">
              <img src={circle.owner.avatar} alt={circle.owner.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#2C2C2C]">{circle.name}</h1>
                <span className="px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-[10px] rounded">付费</span>
              </div>
              <div className="flex items-center gap-3 text-[12px] text-[#999999] mt-1">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {circle.members.toLocaleString()} 成员
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {circle.posts.toLocaleString()} 帖子
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  今日{circle.todayActive}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[13px] text-[#666666] mt-3 leading-relaxed">{circle.description}</p>
          
          {/* 标签 */}
          {circle.tags && circle.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {circle.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-[#F5F0E8] text-[#999999] text-[11px] rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 圈主信息 */}
          <Link href={`/user/${circle.owner.id}`} className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F5F0E8]">
            <img src={circle.owner.avatar} alt="" className="w-8 h-8 rounded-full" />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-medium text-[#2C2C2C]">{circle.owner.name}</span>
                <Crown className="w-3.5 h-3.5 text-[#C9A96E]" />
              </div>
              <span className="text-[11px] text-[#999]">圈主</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#CCC]" />
          </Link>
        </div>
      </div>

      {/* 公告栏 */}
      {circle.announcement && (
        <div className="mx-4 mt-3">
          <div className="bg-gradient-to-r from-[#FFF8E7] to-[#FFFBF0] rounded-xl border border-[#F0E6D3] overflow-hidden">
            <button 
              onClick={() => setShowAnnouncement(!showAnnouncement)}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[#C9A96E] flex items-center justify-center">
                  <Bell className="w-3 h-3 text-white" />
                </div>
                <span className="text-[13px] font-medium text-[#2C2C2C]">圈子公告</span>
              </div>
              {showAnnouncement ? (
                <ChevronUp className="w-4 h-4 text-[#999999]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#999999]" />
              )}
            </button>
            {showAnnouncement && (
              <div className="px-4 pb-3">
                <p className="text-[12px] text-[#666666] leading-relaxed">{circle.announcement}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab切换 */}
      <div className="mt-4 px-4">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-[#E8E3DB]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 pb-3 text-[14px] font-medium relative transition-colors whitespace-nowrap",
                activeTab === tab.id ? "text-[#C41E3A]" : "text-[#999999]"
              )}
            >
              {tab.label}
              {tab.id === 'members' && <span className="ml-1 text-[12px]">({circle.members})</span>}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="px-4 mt-4">
        {/* 首页Tab - 综合展示 */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* 近期活动 */}
            {activities.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#FF6B35]" />
                    <span className="font-medium text-[#2C2C2C]">近期活动</span>
                  </div>
                  <Link href={`/circles/${circleId}/activities`} className="text-[12px] text-[#999] flex items-center">
                    全部 <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {activities.slice(0, 2).map(act => (
                    <ActivityCard key={act.id} activity={act} circleId={circleId} />
                  ))}
                </div>
              </div>
            )}

            {/* 置顶帖子 */}
            {pinnedPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pin className="w-4 h-4 text-[#C41E3A]" />
                  <span className="font-medium text-[#2C2C2C]">置顶内容</span>
                </div>
                <div className="space-y-2">
                  {pinnedPosts.map(post => (
                    <PinnedPost key={post.id} post={post} circleId={circleId} />
                  ))}
                </div>
              </div>
            )}

            {/* 专栏推荐 */}
            {columns.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#C9A96E]" />
                    <span className="font-medium text-[#2C2C2C]">专栏推荐</span>
                  </div>
                  <Link href={`/circles/${circleId}/columns`} className="text-[12px] text-[#999] flex items-center">
                    全部 <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {columns.map(col => (
                    <ColumnCard key={col.id} column={col} circleId={circleId} />
                  ))}
                </div>
              </div>
            )}

            {/* 圈主推荐电子书 */}
            {isOwner && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#2563eb]" />
                    <span className="font-medium text-[#2C2C2C]">推荐电子书</span>
                    <span className="text-[11px] text-[#999]">（仅圈主可见管理入口）</span>
                  </div>
                  <Link
                    href={`/circles/${circleId}/recommend-ebook`}
                    className="text-[12px] flex items-center gap-0.5"
                    style={{ color: "var(--ebook-primary)" }}
                  >
                    管理 <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {circleArticles.slice(0, 3).map(a => (
                    <Link key={a.id} href={`/ebook/${a.id}`}
                      className="shrink-0 w-20 flex flex-col items-center gap-1">
                      <div className="w-16 h-22 rounded-lg overflow-hidden bg-[#1e3a5f] flex items-center justify-center"
                        style={{ height: "88px" }}>
                        <BookOpen className="w-6 h-6 text-white/40" />
                      </div>
                      <p className="text-[10px] text-center line-clamp-2 text-[#555]">{a.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 最新帖子 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-[#2C2C2C]">最新动态</span>
              </div>
              <div className="space-y-3">
                {posts.slice(0, 3).map(post => (
                  <PostCard key={post.id} post={post} circleId={circleId} likedPosts={likedPosts} onLike={handleLikePost} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 帖子列表 */}
        {activeTab === 'posts' && (
          <div className="space-y-3">
            {posts.map(post => (
              <PostCard key={post.id} post={post} circleId={circleId} likedPosts={likedPosts} onLike={handleLikePost} />
            ))}
          </div>
        )}

        {/* 精华帖子 */}
        {activeTab === 'essence' && (
          <div className="space-y-3">
            {essencePosts.length > 0 ? (
              essencePosts.map(post => (
                <PostCard key={post.id} post={post} circleId={circleId} likedPosts={likedPosts} onLike={handleLikePost} showEssence />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Star className="w-12 h-12 text-[#E8E3DB] mb-3" />
                <p className="text-[#999] text-[14px]">暂无精华内容</p>
              </div>
            )}
          </div>
        )}

        {/* 专栏列表 */}
        {activeTab === 'articles' && (
          circleArticles.length > 0 ? (
            <div className="space-y-3">
              {circleArticles.map(article => (
                <Link key={article.id} href={`/articles/${article.id}`}>
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm flex gap-3 p-3">
                    {article.cover ? (
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-[#F5F0E8] shrink-0">
                        <img src={article.cover} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : null}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start gap-1.5">
                        {article.isFeatured && (
                          <span className="mt-0.5 shrink-0 text-[10px] px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded">精选</span>
                        )}
                        <h4 className={cn("text-[14px] font-medium text-[#2C2C2C] leading-snug", article.cover ? "line-clamp-2" : "line-clamp-3")}>{article.title}</h4>
                      </div>
                      <div className="mt-auto flex items-center gap-3 text-[11px] text-[#999] pt-2">
                        <span>{article.author}</span>
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{article.views}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{article.likes}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm text-[#999]">圈主还没有发布文章</p>
            </div>
          )
        )}

        {activeTab === 'columns' && (
          <div className="grid grid-cols-2 gap-3">
            {columns.map(col => (
              <Link key={col.id} href={`/circles/${circleId}/columns/${col.id}`}>
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <div className="relative">
                    <img src={col.cover} alt="" className="w-full h-24 object-cover" />
                    {col.isPremium && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-[#C9A96E] rounded-full flex items-center justify-center">
                        <Lock className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="text-[14px] font-medium text-[#2C2C2C] line-clamp-1">{col.title}</h4>
                    <p className="text-[12px] text-[#999] mt-1">{col.articles}篇文章 · {col.views}阅读</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 成员列表 */}
        {activeTab === 'members' && (
          <div className="space-y-2">
            {members.map(member => (
              <Link 
                key={member.id} 
                href={`/user/${member.id}`}
                className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
              >
                <img src={member.avatar} alt={member.name} className="w-11 h-11 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-[#2C2C2C]">{member.name}</span>
                    {member.role === 'owner' && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#C9A96E]/10 text-[#C9A96E] text-[10px] rounded">
                        <Crown className="w-3 h-3" />圈主
                      </span>
                    )}
                    {member.role === 'admin' && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#4A90D9]/10 text-[#4A90D9] text-[10px] rounded">
                        <Shield className="w-3 h-3" />管理员
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#999999]">
                    {member.title && <span>{member.title}</span>}
                    <span>发帖 {member.posts}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] px-4 py-3 flex items-center gap-3 z-50">
        <button
          onClick={handleJoin}
          className={cn(
            "flex-1 py-3 rounded-full text-[14px] font-medium transition-all",
            isJoined 
              ? "bg-[#F5F0E8] text-[#666666]" 
              : "bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white shadow-lg"
          )}
        >
          {isJoined ? "已加入" : "¥199/年 加入圈子"}
        </button>
        {isJoined && (
          <Link 
            href={`/circles/${circleId}/post`}
            className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white text-[14px] font-medium text-center shadow-lg flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            发帖
          </Link>
        )}
      </div>

      {/* 会员权益弹窗 */}
      {showBenefits && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#C9A96E] to-[#E8D5B5] flex items-center justify-center mb-3">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-[18px] font-bold text-[#2C2C2C]">加入「{circle.name}」</h3>
                <p className="text-[14px] text-[#999] mt-1">¥199/年，解锁以下专属权益</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {memberBenefits.map((benefit, idx) => (
                  <div key={idx} className="bg-[#FAF8F5] rounded-xl p-3 flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#C41E3A]/10 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-4 h-4 text-[#C41E3A]" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-medium text-[#2C2C2C]">{benefit.title}</h4>
                      <p className="text-[11px] text-[#999]">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowBenefits(false)}
                  className="flex-1 py-3 rounded-full bg-[#F5F0E8] text-[#666] text-[14px] font-medium"
                >
                  再想想
                </button>
                <button 
                  onClick={confirmJoin}
                  className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white text-[14px] font-medium"
                >
                  立即加入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

// 帖子卡片组件
function PostCard({ post, circleId, likedPosts, onLike, showEssence }: { 
  post: CirclePost
  circleId: string
  likedPosts: Set<string>
  onLike: (id: string) => void
  showEssence?: boolean 
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* 置顶/精华标签 */}
      {(post.isPinned || (showEssence && post.isEssence)) && (
        <div className="flex items-center gap-2 mb-2">
          {post.isPinned && (
            <div className="flex items-center gap-1">
              <Pin className="w-3 h-3 text-[#C41E3A]" />
              <span className="text-[11px] text-[#C41E3A] font-medium">置顶</span>
            </div>
          )}
          {post.isEssence && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[#C9A96E]/10 text-[#C9A96E] rounded">精华</span>
          )}
        </div>
      )}
      
      {/* 作者信息 */}
      <div className="flex items-center justify-between mb-3">
        <Link href={`/user/${post.author.id}`} className="flex items-center gap-2">
          <img src={post.author.avatar} alt={post.author.name} className="w-9 h-9 rounded-full" />
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-medium text-[#2C2C2C]">{post.author.name}</span>
              {post.author.title && (
                <span className="px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-[10px] rounded">
                  {post.author.title}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#999999]">{post.createdAt}</span>
          </div>
        </Link>
        <button className="p-1">
          <MoreHorizontal className="w-5 h-5 text-[#999999]" />
        </button>
      </div>

      {/* 内容 */}
      <Link href={`/circles/${circleId}/posts/${post.id}`}>
        <p className="text-[14px] text-[#2C2C2C] leading-relaxed mb-3">{post.content}</p>

        {/* 图片 */}
        {post.images && post.images.length > 0 && (
          <div className={cn(
            "grid gap-2 mb-3",
            post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}>
            {post.images.map((img, idx) => (
              <img 
                key={idx} 
                src={img} 
                alt="" 
                className={cn(
                  "rounded-lg object-cover w-full",
                  post.images!.length === 1 ? "max-h-60" : "aspect-square"
                )}
              />
            ))}
          </div>
        )}
      </Link>

      {/* 操作栏 */}
      <div className="flex items-center gap-6 pt-2 border-t border-[#F5F0E8]">
        <button 
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1"
        >
          <Heart className={cn(
            "w-4 h-4",
            likedPosts.has(post.id) ? "fill-[#C41E3A] text-[#C41E3A]" : "text-[#999999]"
          )} />
          <span className={cn(
            "text-[12px]",
            likedPosts.has(post.id) ? "text-[#C41E3A]" : "text-[#999999]"
          )}>
            {post.likes}
          </span>
        </button>
        <Link href={`/circles/${circleId}/posts/${post.id}`} className="flex items-center gap-1">
          <MessageCircle className="w-4 h-4 text-[#999999]" />
          <span className="text-[12px] text-[#999999]">{post.comments}</span>
        </Link>
        <button className="flex items-center gap-1">
          <Bookmark className="w-4 h-4 text-[#999999]" />
        </button>
      </div>
    </div>
  )
}
