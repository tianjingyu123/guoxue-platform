"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BackButton } from "@/components/common/back-button"
import { usePaymentBindings } from "@/hooks/use-payment-bindings"
import { BindPaymentDialog } from "@/components/wallet/bind-payment-dialog"
import { 
  Heart, Share2, BookOpen, GraduationCap, MessageCircle, 
  Radio, BookMarked, Check, ChevronRight, Users, FileText, Star,
  Sparkles, X, Loader2, Play, ImageIcon
} from "lucide-react"

// 圈子数据
const circleData = {
  id: 1,
  name: "八字命理研习社",
  cover: "",
  tags: ["八字命理", "四柱预测", "实战案例"],
  memberCount: 1280,
  newMembersWeek: 86,
  contentCount: 356,
  rating: 98,
  price: 199, // 0为免费
  isFree: false,
  needApproval: false, // 是否需要审批
  joined: false,
  description: "专注八字命理学习与实践的高质量社群。圈主每周更新深度文章，定期举办直播答疑，带你系统掌握八字排盘与分析技法。",
  // 图片介绍（可选，圈主上传）
  introImages: [
    { id: 1, url: "", caption: "圈子学习氛围" },
    { id: 2, url: "", caption: "线下活动剪影" },
    { id: 3, url: "", caption: "学员成果展示" },
  ],
  // 视频介绍（可选，圈主上传）
  introVideo: {
    url: "",
    cover: "",
    duration: "02:35",
    title: "周易大师带你走进八字命理研习社",
  },
  benefits: [
    { icon: "book", text: "独家内容：圈主精华帖、深度文章、实战案例" },
    { icon: "course", text: "专属课程：圈子内课程享8折优惠" },
    { icon: "chat", text: "互动答疑：向圈主/嘉宾提问、参与讨论" },
    { icon: "live", text: "圈内直播：知识授课直播、连麦互动" },
    { icon: "read", text: "古籍共修：圈主领读《渊海子平》等经典" },
  ],
  owner: {
    id: 1,
    name: "周易大师",
    avatar: "",
    isVerified: true,
    title: "八字命理资深讲师",
    intro: "从事命理研究20余年，师承多位名师，擅长八字精准分析与人生规划指导。已帮助超过10000位学员入门八字命理。",
    courseCount: 12,
    studentCount: 8560,
  },
  featuredContent: [
    { id: 1, type: "article", title: "八字入门：如何快速记忆天干地支", preview: "天干地支是八字命理的基础，很多初学者在这一步就..." },
    { id: 2, type: "post", title: "实战案例：从八字看事业发展方向", preview: "今天分享一个典型案例，命主1985年出生，乾造..." },
    { id: 3, type: "article", title: "十神详解：正官与七杀的区别", preview: "正官与七杀都是克日主的五行，但性质截然不同..." },
    { id: 4, type: "course", title: "八字排盘实战课（圈友专享）", preview: "本课程专为圈友打造，从零基础到独立排盘..." },
  ],
  reviews: [
    { id: 1, user: "命理爱好者", avatar: "", content: "加入这个圈子后，终于搞懂了八字的基本框架，周老师讲得太清楚了！", date: "2024-12-15" },
    { id: 2, user: "学习中的小白", avatar: "", content: "圈子里的氛围很好，大家互相帮助，老师也很耐心解答问题。", date: "2024-12-10" },
    { id: 3, user: "从业三年", avatar: "", content: "即使有一定基础，在这里也能学到很多实战技巧，物超所值。", date: "2024-12-05" },
  ],
}

// 相似圈子推荐
const similarCircles = [
  { id: 2, name: "紫微斗数学院", members: 2560, price: 299, cover: "" },
  { id: 3, name: "风水堪舆研习", members: 1680, price: 0, cover: "" },
  { id: 4, name: "姓名学交流圈", members: 860, price: 99, cover: "" },
]

// 权益图标映射
const benefitIcons: Record<string, React.ReactNode> = {
  book: <BookOpen className="w-5 h-5" />,
  course: <GraduationCap className="w-5 h-5" />,
  chat: <MessageCircle className="w-5 h-5" />,
  live: <Radio className="w-5 h-5" />,
  read: <BookMarked className="w-5 h-5" />,
}

export default function CircleIntroPage() {
  const params = useParams()
  const [isCollected, setIsCollected] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [payMethod, setPayMethod] = useState<"wechat" | "alipay" | "unionpay" | "huifu">("wechat")
  const { isBound } = usePaymentBindings()
  const [showBindDialog, setShowBindDialog] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [joinStatus, setJoinStatus] = useState<"none" | "pending" | "joined">(
    circleData.joined ? "joined" : "none"
  )

  const handleJoin = () => {
    if (circleData.isFree) {
      // 免费圈子直接加入
      setIsJoining(true)
      setTimeout(() => {
        setIsJoining(false)
        setJoinStatus("joined")
      }, 1000)
    } else if (circleData.needApproval) {
      // 需要审批
      setIsJoining(true)
      setTimeout(() => {
        setIsJoining(false)
        setJoinStatus("pending")
      }, 1000)
    } else {
      // 付费圈子弹出支付弹窗
      setShowPayModal(true)
    }
  }

  const handlePay = () => {
    // 所选第三方支付渠道未绑定时，引导用户先绑定
    if (!isBound(payMethod)) {
      setShowPayModal(false)
      setShowBindDialog(true)
      return
    }
    setIsJoining(true)
    setTimeout(() => {
      setIsJoining(false)
      setShowPayModal(false)
      setJoinStatus("joined")
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部封面区 */}
      <div className="relative">
        {/* 封面图 */}
        <div className="aspect-[16/9] bg-gradient-to-br from-primary/30 via-accent/20 to-secondary relative">
          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
          
          {/* 返回和分享按钮 */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 safe-area-pt">
            <BackButton overlay fallbackPath="/circles" />
            <button className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* 圈子名称和标签 */}
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-bold text-white drop-shadow-lg font-serif">
              {circleData.name}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {circleData.tags.map(tag => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="bg-white/20 backdrop-blur-sm text-white border-0 text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 核心数据区 */}
      <div className="px-4 py-4">
        <Card className="p-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-0">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{circleData.memberCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">成员</p>
              <p className="text-[10px] text-accent mt-0.5">近7天+{circleData.newMembersWeek}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{circleData.contentCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">内容</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{circleData.rating}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">好评率</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 圈子简介 */}
      <div className="px-4 pb-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{circleData.description}</p>
      </div>

      {/* 视频介绍（如有） */}
      {circleData.introVideo && circleData.introVideo.url !== undefined && (
        <div className="px-4 pb-4">
          <h2 className="font-semibold text-base text-foreground mb-3">视频介绍</h2>
          <Card 
            className="relative overflow-hidden cursor-pointer group"
            onClick={() => setIsVideoPlaying(true)}
          >
            <div className="aspect-video bg-gradient-to-br from-primary/20 via-accent/10 to-secondary flex items-center justify-center">
              {/* 视频封面占位 */}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
              {/* 播放按钮 */}
              <div className="relative z-10 w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 text-primary fill-primary ml-1" />
              </div>
              {/* 时���标签 */}
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs">
                {circleData.introVideo.duration}
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-foreground">{circleData.introVideo.title}</p>
            </div>
          </Card>
        </div>
      )}

      {/* 图片介绍（如有） */}
      {circleData.introImages && circleData.introImages.length > 0 && (
        <div className="px-4 pb-4">
          <h2 className="font-semibold text-base text-foreground mb-3">
            <ImageIcon className="w-4 h-4 inline mr-1.5 text-accent" />
            图片介绍
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {circleData.introImages.map((img, index) => (
              <div 
                key={img.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-secondary cursor-pointer group"
                onClick={() => setSelectedImage(index)}
              >
                {/* 图片占位 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                </div>
                {/* 悬停遮罩 */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {/* 图片说明 */}
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-[10px] text-white line-clamp-1">{img.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 权益区 */}
      <div className="px-4 pb-4">
        <h2 className="font-semibold text-base text-[#2C2C2C] mb-3">加入圈子，你将获得</h2>
        <Card className="p-4 space-y-3 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-0">
          {circleData.benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent">
                {benefitIcons[benefit.icon]}
              </div>
              <p className="text-sm text-foreground pt-1">{benefit.text}</p>
            </div>
          ))}
        </Card>
      </div>

      {/* 圈主介绍区 */}
      <div className="px-4 pb-4">
        <h2 className="font-semibold text-base text-[#2C2C2C] mb-3">圈主介绍</h2>
        <Card className="p-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-0">
          <div className="flex items-start gap-3">
            <Avatar className="w-14 h-14 ring-2 ring-accent/30">
              <AvatarImage src={circleData.owner.avatar} alt={circleData.owner.name} />
              <AvatarFallback className="bg-accent/20 text-accent text-lg font-medium">
                {circleData.owner.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{circleData.owner.name}</span>
                {circleData.owner.isVerified && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{circleData.owner.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{circleData.owner.courseCount}门课程</span>
                <span>{circleData.owner.studentCount.toLocaleString()}学员</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{circleData.owner.intro}</p>
          <Link 
            href={`/user/${circleData.owner.id}`}
            className="flex items-center justify-center gap-1 mt-3 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            查看圈主主页 <ChevronRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>

      {/* 精选内容预览区 */}
      <div className="px-4 pb-4">
        <h2 className="font-semibold text-base text-foreground mb-3">圈���精选内容</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {circleData.featuredContent.map(content => (
            <Card 
              key={content.id} 
              className="flex-shrink-0 w-64 p-3 bg-card hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                {content.type === "article" && <FileText className="w-4 h-4 text-primary" />}
                {content.type === "post" && <MessageCircle className="w-4 h-4 text-accent" />}
                {content.type === "course" && <GraduationCap className="w-4 h-4 text-green-500" />}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {content.type === "article" ? "文章" : content.type === "post" ? "帖子" : "课程"}
                </Badge>
              </div>
              <h3 className="font-medium text-sm text-foreground line-clamp-2">{content.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                {content.preview}
                <span className="text-primary ml-1">加入后查看完整内容</span>
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* 成员评价区 */}
      <div className="px-4 pb-4">
        <h2 className="font-semibold text-base text-foreground mb-3">成员评价</h2>
        <div className="space-y-3">
          {circleData.reviews.map(review => (
            <Card key={review.id} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={review.avatar} alt={review.user} />
                  <AvatarFallback className="bg-secondary text-foreground text-xs">
                    {review.user[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{review.user}</p>
                  <p className="text-[10px] text-muted-foreground">{review.date}</p>
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-3 h-3 fill-accent text-accent" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{review.content}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* 猜你喜欢推荐 */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="font-semibold text-base text-foreground">猜你喜欢</span>
          </div>
          <Link href="/circles" className="text-xs text-muted-foreground hover:text-foreground">
            更多圈子 <ChevronRight className="w-3 h-3 inline" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {similarCircles.map(circle => (
              <Link
                key={circle.id}
                href={`/circles/${circle.id}`}
                className="flex-shrink-0 w-36"
              >
              <Card className="overflow-hidden hover:bg-secondary/50 transition-colors">
                <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary/60" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{circle.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{circle.members}成员</p>
                  <p className="text-xs text-primary font-medium mt-1">
                    {circle.price === 0 ? "免费" : `¥${circle.price}`}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center gap-3 px-4 h-16">
          <button 
            onClick={() => setIsCollected(!isCollected)}
            className="flex flex-col items-center justify-center w-14"
          >
            <Heart className={`w-5 h-5 ${isCollected ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            <span className="text-[10px] text-muted-foreground mt-0.5">收藏</span>
          </button>
          
          <div className="flex-1">
            {joinStatus === "joined" ? (
              <Link
                href={`/circles/${params.id}`}
                className="flex items-center justify-center w-full py-3 bg-accent text-accent-foreground font-medium rounded-full"
              >
                进入圈子
              </Link>
            ) : joinStatus === "pending" ? (
              <button 
                disabled
                className="flex items-center justify-center w-full py-3 bg-secondary text-muted-foreground font-medium rounded-full"
              >
                审核中，请耐心等待
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isJoining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {circleData.isFree ? "免费加入" : `¥${circleData.price} 立即加入`}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        {!circleData.isFree && joinStatus === "none" && (
          <p className="text-center text-[10px] text-muted-foreground pb-2">
            已有 {circleData.memberCount.toLocaleString()} 人加入
          </p>
        )}
      </div>

      {/* 视频播放弹窗 */}
      {isVideoPlaying && circleData.introVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <button 
            onClick={() => setIsVideoPlaying(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors safe-area-pt"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="w-full max-w-2xl px-4">
            <div className="aspect-video bg-black rounded-xl flex items-center justify-center">
              {/* 视频播放器占位 */}
              <div className="text-center">
                <Play className="w-16 h-16 text-white/60 mx-auto mb-3" />
                <p className="text-white/60 text-sm">视频播放区域</p>
                <p className="text-white/40 text-xs mt-1">{circleData.introVideo.title}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 图片预览弹窗 */}
      {selectedImage !== null && circleData.introImages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors safe-area-pt z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="w-full h-full flex items-center justify-center p-4">
            {/* 图片占位 */}
            <div className="max-w-lg w-full aspect-square bg-secondary/20 rounded-xl flex flex-col items-center justify-center">
              <ImageIcon className="w-16 h-16 text-white/40 mb-3" />
              <p className="text-white/60 text-sm">
                {circleData.introImages[selectedImage]?.caption || "图片预览"}
              </p>
            </div>
          </div>
          {/* 图片切换指示器 */}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
            {circleData.introImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  selectedImage === index ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 支付弹窗 */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-lg bg-card rounded-t-2xl animate-in slide-in-from-bottom duration-300">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">确认支付</h3>
              <button onClick={() => setShowPayModal(false)} className="p-1">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* 圈子信息 */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{circleData.name}</p>
                  <p className="text-xs text-muted-foreground">{circleData.memberCount}成员 · 永久有效</p>
                </div>
                <p className="text-xl font-bold text-primary">¥{circleData.price}</p>
              </div>
            </div>
            
            {/* 支付方式 */}
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-3">选择支付方式</p>
              <div className="space-y-2">
                {[
                  { id: "wechat", name: "微信支付", desc: "", badge: "微", badgeColor: "bg-green-500" },
                  { id: "alipay", name: "支付宝支付", desc: "", badge: "支", badgeColor: "bg-blue-500" },
                  { id: "unionpay", name: "云闪付", desc: "", badge: "云", badgeColor: "bg-red-500" },
                  { id: "huifu", name: "汇付天下", desc: "", badge: "汇", badgeColor: "bg-orange-500" },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPayMethod(method.id as typeof payMethod)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-colors ${
                      payMethod === method.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <span className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold ${method.badgeColor}`}>{method.badge}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">{method.name}</p>
                      {method.desc && <p className="text-xs text-muted-foreground">{method.desc}</p>}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      payMethod === method.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {payMethod === method.id && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 支付按钮 */}
            <div className="p-4 safe-area-pb">
              <button
                onClick={handlePay}
                disabled={isJoining}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    支付中...
                  </>
                ) : (
                  `确认支付 ¥${circleData.price}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BindPaymentDialog
        open={showBindDialog}
        onClose={() => setShowBindDialog(false)}
        channel={payMethod}
      />
    </div>
  )
}
