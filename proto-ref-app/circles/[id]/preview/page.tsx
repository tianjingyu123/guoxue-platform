"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ChevronLeft, Share2, Users, FileText, Crown, Lock, 
  Heart, MessageCircle, Star, CheckCircle, Sparkles
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { circleApi, type CirclePreview } from "@/lib/api"
import { cn } from "@/lib/utils"

// 骨架屏
function PreviewSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-64 bg-[#E8E3DB] animate-pulse" />
      <div className="px-4 -mt-16 space-y-4">
        <div className="h-32 bg-white rounded-2xl animate-pulse" />
        <div className="h-48 bg-white rounded-xl animate-pulse" />
        <div className="h-48 bg-white rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

// Mock数据
const mockPreview: CirclePreview = {
  circle: {
    id: "1",
    name: "八字命理研习社",
    cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop",
    description: "专注八字命理学习与交流，汇聚资深命理师与爱好者。从入门到精通，共同探索命理奥秘。",
    category: "命理",
    members: 12860,
    posts: 3280,
    isJoined: false,
    todayActive: 128,
    createdAt: "2023-01-01",
    owner: { id: "1", name: "周易大师", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=master" },
    rules: ["禁止发布广告", "尊重他人观点", "保持友善交流"],
    tags: ["八字", "命理", "易学", "传统文化"]
  },
  featuredPosts: [
    {
      id: "1",
      content: "今天给大家分享一个八字看婚姻的技巧，日支为配偶宫，看日支与其他地支的关系可以判断...",
      author: { name: "命理研究者", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user1" },
      likes: 328,
      comments: 56,
      preview: "日支为配偶宫，看日支与其他地支的关系..."
    },
    {
      id: "2", 
      content: "关于食神制杀格局的详细分析，食神制杀是八字中非常重要的格局之一...",
      author: { name: "易学传承", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user2" },
      likes: 256,
      comments: 42,
      preview: "食神制杀是八字中非常重要的格局之一..."
    },
    {
      id: "3",
      content: "八字十神详解系列（一）：比肩劫财的特性与应用，比肩代表同类相助...",
      author: { name: "周易学堂", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user3" },
      likes: 412,
      comments: 89,
      preview: "比肩代表同类相助，劫财则有争夺之意..."
    },
    {
      id: "4",
      content: "从八字看职业方向，官杀旺者适合从政或管理岗位，食伤生财者适合创业...",
      author: { name: "命理导师", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user4" },
      likes: 198,
      comments: 34,
      preview: "官杀旺者适合从政或管理岗位..."
    }
  ],
  joinStatus: {
    isJoined: false,
    isPaid: true,
    price: 99,
    originalPrice: 199,
    membershipDays: 365,
    discount: "限时5折"
  }
}

export default function CirclePreviewPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<CirclePreview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showLockTip, setShowLockTip] = useState<string | null>(null)
  const [approvalSubmitted, setApprovalSubmitted] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await circleApi.preview(params.id as string)
        setData(res)
      } catch {
        setData(mockPreview)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [params.id])

  const handlePostClick = (postId: string) => {
    setShowLockTip(postId)
    setTimeout(() => setShowLockTip(null), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: data?.circle.name,
        text: data?.circle.description,
        url: window.location.href
      })
    }
  }

  // 加入方式：free 免费 / paid 付费 / approval 审核
  const joinMethod: "free" | "paid" | "approval" =
    (data?.joinStatus as { joinMethod?: "free" | "paid" | "approval" })?.joinMethod ??
    (data?.joinStatus.isPaid ? "paid" : "free")

  const handleJoin = () => {
    if (joinMethod === "paid") {
      setShowJoinModal(true)
    } else if (joinMethod === "approval") {
      // 提交入圈申请，等待圈主审批
      setApprovalSubmitted(true)
    } else {
      router.push(`/circles/${params.id}`)
    }
  }

  if (isLoading) return <PreviewSkeleton />
  if (!data) return null

  const { circle, featuredPosts, joinStatus } = data

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-28">
      {/* 封面大图 + 渐变遮罩 */}
      <div className="relative h-72">
        <img 
          src={circle.cover} 
          alt={circle.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
        
        {/* 顶部导航 */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button 
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 限时优惠标签 */}
        {joinStatus.discount && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-[#C41E3A] to-[#FF6B35] rounded-full flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-bold text-white">{joinStatus.discount}</span>
          </div>
        )}
      </div>

      {/* 圈子信息卡片 */}
      <div className="px-4 -mt-20 relative z-10">
        <Card className="p-5 rounded-2xl border-0 shadow-[0_4px_24px_rgba(0,0,0,0.1)]">
          <div className="flex gap-4">
            {/* 圈子头像 */}
            <div className="relative">
              <img 
                src={circle.owner.avatar}
                alt={circle.name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-[#C9A96E] to-[#A67C52] rounded-full flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            
            {/* 圈子信息 */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-[#2C2C2C] mb-1">{circle.name}</h1>
              <p className="text-sm text-[#666666] line-clamp-2 mb-2">{circle.description}</p>
              
              {/* 统计数据 */}
              <div className="flex items-center gap-4 text-xs text-[#999999]">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {circle.members.toLocaleString()} 成员
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {circle.posts.toLocaleString()} 帖子
                </span>
                <span className="flex items-center gap-1 text-[#C41E3A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C41E3A] animate-pulse" />
                  今日活跃 {circle.todayActive}
                </span>
              </div>
            </div>
          </div>

          {/* 标签 */}
          {circle.tags && (
            <div className="flex flex-wrap gap-2 mt-4">
              {circle.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-2.5 py-1 text-xs bg-[#F5F0E8] text-[#666666] rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 精华内容预览 */}
      <div className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-[#C9A96E]" fill="#C9A96E" />
          <h2 className="text-base font-bold text-[#2C2C2C]">精华内容预览</h2>
          <span className="text-xs text-[#999999]">加入后解锁全部</span>
        </div>

        <div className="space-y-3">
          {featuredPosts.map((post, index) => (
            <Card 
              key={post.id}
              className={cn(
                "p-4 rounded-xl border-0 shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-pointer",
                "relative overflow-hidden transition-all active:scale-[0.98]"
              )}
              onClick={() => handlePostClick(post.id)}
            >
              {/* 锁定提示 */}
              {showLockTip === post.id && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 animate-in fade-in duration-200">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Lock className="w-8 h-8" />
                    <span className="text-sm font-medium">加入圈子后查看详情</span>
                  </div>
                </div>
              )}

              {/* 排名角标 */}
              <div className={cn(
                "absolute top-0 right-0 w-8 h-8 flex items-center justify-center text-xs font-bold text-white",
                index === 0 ? "bg-gradient-to-br from-[#FFD700] to-[#FFA500]" : 
                index === 1 ? "bg-gradient-to-br from-[#C0C0C0] to-[#A0A0A0]" :
                index === 2 ? "bg-gradient-to-br from-[#CD7F32] to-[#A0522D]" : "bg-[#999999]"
              )} style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}>
                <span className="translate-x-1 -translate-y-0.5">{index + 1}</span>
              </div>

              {/* 作者信息 */}
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium text-[#2C2C2C]">{post.author.name}</span>
              </div>

              {/* 内容预览 - 模糊处理 */}
              <div className="relative">
                <p className="text-sm text-[#666666] line-clamp-2">{post.preview}</p>
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent" />
              </div>

              {/* 互动数据 */}
              <div className="flex items-center gap-4 mt-3 text-xs text-[#999999]">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  {post.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {post.comments}
                </span>
              </div>

              {/* 锁定遮罩 */}
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
            </Card>
          ))}
        </div>

        {/* 更多内容提示 */}
        <div className="mt-4 p-4 bg-[#F5F0E8] rounded-xl text-center">
          <Lock className="w-6 h-6 text-[#C9A96E] mx-auto mb-2" />
          <p className="text-sm text-[#666666]">
            还有 <span className="font-bold text-[#C41E3A]">{circle.posts - featuredPosts.length}</span> 篇精彩内容
          </p>
          <p className="text-xs text-[#999999] mt-1">加入圈子立即解锁</p>
        </div>
      </div>

      {/* 圈子权益 */}
      <div className="px-4 mt-6">
        <h2 className="text-base font-bold text-[#2C2C2C] mb-3">加入后享有</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: FileText, text: "查看全部精华帖" },
            { icon: MessageCircle, text: "参与圈子讨论" },
            { icon: Users, text: "结识同好圈友" },
            { icon: Star, text: "专属会员活动" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#FFF5F0] flex items-center justify-center">
                <item.icon className="w-4 h-4 text-[#C41E3A]" />
              </div>
              <span className="text-sm text-[#2C2C2C]">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 底部固定加入栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 safe-area-pb">
        <div className="flex items-center gap-4">
          {/* 价格/方式信息 */}
          <div className="flex-1">
            {joinMethod === "paid" ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#C41E3A]">¥{joinStatus.price}</span>
                {joinStatus.originalPrice && (
                  <span className="text-sm text-[#999999] line-through">¥{joinStatus.originalPrice}</span>
                )}
                <span className="text-xs text-[#666666]">/ {joinStatus.membershipDays ?? 365}天</span>
              </div>
            ) : joinMethod === "approval" ? (
              <span className="text-lg font-bold text-[#2C2C2C]">审核制圈子</span>
            ) : (
              <span className="text-lg font-bold text-[#2C2C2C]">免费加入</span>
            )}
            {joinMethod === "approval" && (
              <p className="text-xs text-[#999999] mt-0.5">需圈主审核通过</p>
            )}
          </div>

          {/* 加入按钮 */}
          <Button 
            onClick={handleJoin}
            disabled={approvalSubmitted}
            className="px-8 py-3 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white font-bold rounded-full shadow-[0_4px_12px_rgba(196,30,58,0.3)] disabled:opacity-60"
          >
            {joinMethod === "paid" ? "立即加入" : joinMethod === "approval" ? (approvalSubmitted ? "申请已提交" : "申请加入") : "免费加入"}
          </Button>
        </div>
      </div>

      {/* 付费加入弹窗 */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowJoinModal(false)}>
          <div 
            className="w-full bg-white rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-[#E8E3DB] rounded-full mx-auto mb-6" />
            
            <h3 className="text-lg font-bold text-center text-[#2C2C2C] mb-2">加入{circle.name}</h3>
            <p className="text-sm text-[#666666] text-center mb-6">开启您的学习之旅</p>

            {/* 价格卡片 */}
            <div className="p-4 bg-gradient-to-br from-[#FFF5F0] to-[#FFEBE5] rounded-2xl border border-[#C41E3A]/20 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#666666]">会员时长</span>
                <span className="text-sm font-medium text-[#2C2C2C]">{joinStatus.membershipDays} 天</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666666]">支付金额</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#C41E3A]">¥{joinStatus.price}</span>
                  {joinStatus.originalPrice && (
                    <span className="text-sm text-[#999999] line-through">¥{joinStatus.originalPrice}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 支付按钮 */}
            <Button 
              className="w-full py-4 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white font-bold rounded-xl text-base"
              onClick={() => router.push(`/payment?type=circle&id=${params.id}`)}
            >
              确认支付
            </Button>

            {/* 协议 */}
            <p className="text-xs text-[#999999] text-center mt-4">
              点击确认即表示同意
              <Link href="/policy/user" className="text-[#C41E3A]">《用户协议》</Link>
            </p>
          </div>
        </div>
      )}

      {/* 审核加入 - 申请已提交提示 */}
      {approvalSubmitted && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-8" onClick={() => setApprovalSubmitted(false)}>
          <div className="w-full max-w-xs bg-white rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-[#3D7A5C]/10 mx-auto flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7 text-[#3D7A5C]" />
            </div>
            <h3 className="font-bold text-[#2C2C2C]">申请已提交</h3>
            <p className="text-sm text-[#666666] mt-2 leading-relaxed">
              你的入圈申请已提交给圈主审核，审核结果将在"我的申请"中通知你。
            </p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <Button variant="outline" className="rounded-full" onClick={() => setApprovalSubmitted(false)}>
                我知道了
              </Button>
              <Button
                className="rounded-full bg-[#C41E3A] hover:bg-[#A01829]"
                onClick={() => router.push("/mine/applications")}
              >
                查看申请
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
