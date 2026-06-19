"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/common/back-button"
import { FeatureApplyModal, StatusBadge } from "@/components/feature/feature-gate"
import { mockCircleFeatures, type FeatureType } from "@/lib/feature-permissions"
import { 
  MoreHorizontal, Share2, Bell, Calendar, Heart, MessageCircle,
  Play, BookOpen, FileText, Radio, ShoppingBag, Sparkles, Edit3, Video,
  ChevronDown, ImageIcon, Bot, Check, Star, Pin, HelpCircle, Lock,
  Settings
} from "lucide-react"

// 圈子数据
const circleData = {
  id: 1,
  name: "八字命理研习社",
  cover: "",
  memberCount: 1280,
  myMemberNo: "No.0086",
  hasSignedToday: false,
  signStreak: 7,
  hasAIAssistant: true,
  isMember: true, // 当前用户是否已加入
  isOwner: false, // 当前用户是否为圈主
  joinMethod: "paid" as "free" | "paid", // 加入方式：免费直接退出 / 付费走退款流程
}

// 内容Tab配置
const contentTabs = [
  { id: "all", label: "全部" },
  { id: "essence", label: "精华" },
  { id: "course", label: "课程" },
  { id: "article", label: "文章" },
  { id: "video", label: "短视频" },
  { id: "live", label: "直播" },
  { id: "product", label: "商品" },
]

// 帖子数据
const posts = [
  {
    id: 1,
    author: { name: "周易大师", avatar: "", isOwner: true },
    content: "【置顶】欢迎各位新成员加入八字命理研习社！本圈子专注于八字命理学习与实践，每周二晚8点直播答疑，每月发布深度文章，请大家积极参与讨论。",
    images: [],
    likes: 328,
    comments: 56,
    time: "3天前",
    isPinned: true,
    isEssence: false,
  },
  {
    id: 2,
    author: { name: "张玄风", avatar: "", isOwner: false },
    content: "分享一个八字看财运的心得：日主身旺财星有根，大运流年再遇财星，必有进财之喜。但若身弱财旺，反而容易因财惹祸，需谨慎理财。大家有什么看法？",
    images: ["", "", ""],
    likes: 156,
    comments: 42,
    time: "5小时前",
    isPinned: false,
    isEssence: true,
  },
  {
    id: 3,
    author: { name: "命理小白", avatar: "", isOwner: false },
    content: "请教各位老师，八字中的食神和伤官有什么区别？什么情况下食神生财比较好？",
    images: [""],
    likes: 28,
    comments: 15,
    time: "2小时前",
    isPinned: false,
    isEssence: false,
  },
  {
    id: 4,
    author: { name: "易学爱好者", avatar: "", isOwner: false },
    content: "今天学习了十神配置，终于理解了为什么说官印相生是好格局。笔记分享给大家，欢迎指正！",
    images: ["", ""],
    likes: 89,
    comments: 23,
    time: "昨天",
    isPinned: false,
    isEssence: true,
  },
]

// 课程数据
const courses = [
  { id: 1, title: "八字入门精讲", instructor: "周易大师", price: 199, students: 856, cover: "" },
  { id: 2, title: "十神深度解析", instructor: "周易大师", price: 299, students: 428, cover: "" },
  { id: 3, title: "大运流年实战", instructor: "周易大师", price: 399, students: 312, cover: "" },
]

// 文章数据
const articles = [
  { id: 1, title: "八字命理学入门指南：从零开始理解命盘", author: "周易大师", views: 2560, time: "3天前" },
  { id: 2, title: "十神配置与人生格局的关系探讨", author: "周易大师", views: 1890, time: "1周前" },
  { id: 3, title: "如何通过八字看婚姻感情？", author: "周易大师", views: 3240, time: "2周前" },
]

// 短视频数据
const videos = [
  { id: 1, title: "一分钟看懂八字排盘", cover: "", plays: 12800, duration: "00:58" },
  { id: 2, title: "什么是日主？", cover: "", plays: 8560, duration: "01:23" },
  { id: 3, title: "食神生财的秘密", cover: "", plays: 6280, duration: "02:15" },
  { id: 4, title: "官印相生格局解析", cover: "", plays: 5120, duration: "01:45" },
]

// 直播数据
const lives = [
  { id: 1, title: "本周二直播：八字看财运", status: "upcoming", time: "周二 20:00", viewers: 0 },
  { id: 2, title: "十神配置答疑", status: "ended", time: "上周二", viewers: 856, hasReplay: true },
  { id: 3, title: "八字入门第一讲回放", status: "ended", time: "2周前", viewers: 1280, hasReplay: true },
]

// 商品数据
const products = [
  { id: 1, name: "《渊海子平》正版精装", price: 68, sales: 256, cover: "" },
  { id: 2, name: "专业排盘罗盘", price: 128, sales: 89, cover: "" },
  { id: 3, name: "八字学习笔记本套装", price: 38, sales: 412, cover: "" },
]

export default function CircleMemberHomePage() {
  const [activeTab, setActiveTab] = useState("all")
  const [sortBy, setSortBy] = useState<"latest" | "reply">("latest")
  const [hasSigned, setHasSigned] = useState(circleData.hasSignedToday)
  const [showPublishMenu, setShowPublishMenu] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const router = useRouter()
  const params = useParams()
  const circleId = (params?.id as string) || "1"
  // 高级功能申请弹窗（音视频课程/直播/短视频/付费问答/圈主助理）
  const [applyFeature, setApplyFeature] = useState<FeatureType | null>(null)
  // 各功能开通状态（实际从 API 获取）
  const liveStatus = mockCircleFeatures.live.status
  const videoStatus = mockCircleFeatures.short_video.status
  const aiStatus = mockCircleFeatures.ai_assistant.status

  // 点击受限功能：已开通则执行操作，否则弹申请
  const handleFeatureClick = (feature: FeatureType, status: string, onApproved: () => void) => {
    setShowPublishMenu(false)
    if (status === "approved") {
      onApproved()
    } else if (status === "reviewing") {
      // 审核中不可操作
    } else {
      setApplyFeature(feature)
    }
  }

  const handleSign = () => {
    if (!hasSigned) {
      setHasSigned(true)
    }
  }

  // 渲染帖子卡片
  const renderPostCard = (post: typeof posts[0]) => (
    <Link key={post.id} href={`/post/${post.id}`}>
      <Card className="p-4 mb-3 hover:bg-secondary/30 transition-colors">
        {/* 标签 */}
        <div className="flex items-center gap-2 mb-2">
          {post.isPinned && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
              <Pin className="w-2.5 h-2.5 mr-0.5" />置顶
            </Badge>
          )}
          {post.isEssence && (
            <Badge className="bg-accent text-white text-[10px] px-1.5 py-0">
              <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />精华
            </Badge>
          )}
        </div>

        {/* 作者信息 */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.author.avatar} alt={post.author.name} />
            <AvatarFallback className="bg-secondary text-foreground text-xs">
              {post.author.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground">{post.author.name}</span>
              {post.author.isOwner && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">圈主</Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{post.time}</span>
          </div>
        </div>

        {/* 内容 */}
        <p className="text-sm text-foreground leading-relaxed line-clamp-3 mb-2">
          {post.content}
        </p>

        {/* 图片 */}
        {post.images.length > 0 && (
          <div className={cn(
            "grid gap-1.5 mb-3",
            post.images.length === 1 && "grid-cols-1",
            post.images.length === 2 && "grid-cols-2",
            post.images.length >= 3 && "grid-cols-3"
          )}>
            {post.images.slice(0, 3).map((_, index) => (
              <div 
                key={index} 
                className={cn(
                  "bg-secondary rounded-lg flex items-center justify-center",
                  post.images.length === 1 ? "aspect-[16/9]" : "aspect-square"
                )}
              >
                <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
              </div>
            ))}
          </div>
        )}

        {/* 互动数据 */}
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1 text-xs">
            <Heart className="w-3.5 h-3.5" /> {post.likes}
          </span>
          <span className="flex items-center gap-1 text-xs">
            <MessageCircle className="w-3.5 h-3.5" /> {post.comments}
          </span>
        </div>
      </Card>
    </Link>
  )

  // 渲染课程列表
  const renderCourses = () => (
    <div className="p-4 space-y-3">
      {courses.length > 0 ? courses.map(course => (
        <Link key={course.id} href={`/course/${course.id}`}>
          <Card className="flex gap-3 p-3 hover:bg-secondary/30 transition-colors">
            <div className="w-28 aspect-[4/3] rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-8 h-8 text-accent/60" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-foreground line-clamp-2">{course.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{course.instructor}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-primary font-medium">¥{course.price}</span>
                <span className="text-xs text-muted-foreground">{course.students}人学习</span>
              </div>
            </div>
          </Card>
        </Link>
      )) : (
        <div className="flex flex-col items-center justify-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">暂无课程</p>
        </div>
      )}
    </div>
  )

  // 渲染文章列表
  const renderArticles = () => (
    <div className="p-4 space-y-3">
      {articles.length > 0 ? articles.map(article => (
        <Link key={article.id} href={`/articles/${article.id}`}>
          <Card className="p-4 hover:bg-secondary/30 transition-colors">
            <h3 className="font-medium text-sm text-foreground line-clamp-2">{article.title}</h3>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{article.author}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{article.views} 阅读</span>
                <span>{article.time}</span>
              </div>
            </div>
          </Card>
        </Link>
      )) : (
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">暂无文章</p>
        </div>
      )}
    </div>
  )

  // 渲染短视频瀑布流
  const renderVideos = () => (
    <div className="p-4">
      {videos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {videos.map(video => (
            <Link key={video.id} href={`/video/${video.id}`}>
              <Card className="overflow-hidden hover:bg-secondary/30 transition-colors">
                <div className="aspect-[3/4] bg-secondary flex items-center justify-center relative">
                  <Play className="w-10 h-10 text-white/60" />
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                    {video.duration}
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px]">
                    <Play className="w-3 h-3 fill-current" /> {(video.plays / 1000).toFixed(1)}k
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground line-clamp-2">{video.title}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <Video className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">暂无短视频</p>
        </div>
      )}
    </div>
  )

  // 渲染直播列表
  const renderLives = () => (
    <div className="p-4 space-y-3">
      {lives.length > 0 ? lives.map(live => (
        <Link key={live.id} href={`/live/${live.id}`}>
          <Card className="flex gap-3 p-3 hover:bg-secondary/30 transition-colors">
            <div className="w-24 aspect-video rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 relative">
              <Radio className="w-6 h-6 text-primary/60" />
              {live.status === "upcoming" && (
                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[10px]">
                  预约
                </div>
              )}
              {live.hasReplay && (
                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-accent text-white text-[10px]">
                  回放
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-foreground line-clamp-1">{live.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{live.time}</p>
              {live.viewers > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{live.viewers} 人观看</p>
              )}
            </div>
          </Card>
        </Link>
      )) : (
        <div className="flex flex-col items-center justify-center py-16">
          <Radio className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">暂无直播</p>
        </div>
      )}
    </div>
  )

  // 渲染商品列表
  const renderProducts = () => (
    <div className="p-4">
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {products.map(product => (
            <Link key={product.id} href={`/mall/product/${product.id}`}>
              <Card className="overflow-hidden hover:bg-secondary/30 transition-colors">
                <div className="aspect-square bg-secondary flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground line-clamp-2">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-primary font-medium">¥{product.price}</span>
                    <span className="text-[10px] text-muted-foreground">{product.sales}人购买</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">暂无商品</p>
        </div>
      )}
    </div>
  )

  // 渲染Tab内容
  const renderTabContent = () => {
    switch (activeTab) {
      case "all":
        return (
          <div className="p-4 pb-24">
            {/* 排序切换 */}
            <div className="flex items-center gap-3 mb-3">
              <button 
                onClick={() => setSortBy("latest")}
                className={cn(
                  "text-sm transition-colors",
                  sortBy === "latest" ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                最新发布
              </button>
              <span className="text-muted-foreground/30">|</span>
              <button 
                onClick={() => setSortBy("reply")}
                className={cn(
                  "text-sm transition-colors",
                  sortBy === "reply" ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                最新回复
              </button>
            </div>
            {posts.map(renderPostCard)}
          </div>
        )
      case "essence":
        return (
          <div className="p-4 pb-24">
            {posts.filter(p => p.isEssence).map(renderPostCard)}
            {posts.filter(p => p.isEssence).length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Star className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">暂无精华帖</p>
              </div>
            )}
          </div>
        )
      case "course":
        return renderCourses()
      case "article":
        return renderArticles()
      case "video":
        return renderVideos()
      case "live":
        return renderLives()
      case "product":
        return renderProducts()
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-lg border-b border-[#E8E0D5] safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/circle" />
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-full hover:bg-secondary transition-colors">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu((v) => !v)}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="更多操作"
              >
                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* 更多操作下拉菜单 */}
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-40 bg-card rounded-xl border border-border shadow-lg overflow-hidden py-1">
                    {circleData.isOwner ? (
                      <button
                        onClick={() => {
                          setShowMoreMenu(false)
                          router.push(`/circle/${circleId}/settings`)
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/50"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        圈子设置
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowMoreMenu(false)
                          // 正向操作：分享圈子，不在活跃浏览场景诱导退出
                          if (navigator.share) {
                            navigator.share({ title: circleData.name, url: window.location.href }).catch(() => {})
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/50"
                      >
                        <Share2 className="w-4 h-4 text-muted-foreground" />
                        分享给好友
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 圈子头部信息 */}
      <div className="relative">
        {/* 封面图 */}
        <div className="h-28 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary" />
        
        {/* 圈子信息卡片 */}
        <div className="px-4 -mt-8 relative z-10">
          <Card className="p-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-0">
            <div className="flex items-start gap-3">
              {/* 圈子头像 */}
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-background shadow-lg">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-lg text-foreground">{circleData.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{circleData.memberCount} 成员</span>
                  {circleData.myMemberNo && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-accent text-accent">
                      {circleData.myMemberNo}
                    </Badge>
                  )}
                </div>
              </div>

              {/* 签到按钮 */}
              <button 
                onClick={handleSign}
                disabled={hasSigned}
                className={cn(
                  "flex flex-col items-center px-3 py-1.5 rounded-lg transition-colors",
                  hasSigned 
                    ? "bg-secondary text-muted-foreground" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {hasSigned ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-[10px] mt-0.5">已签到</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] mt-0.5">签到</span>
                  </>
                )}
              </button>
            </div>
            
            {/* 签到连续天数 */}
            {hasSigned && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  连续签到 <span className="text-accent font-medium">{circleData.signStreak + 1}</span> 天
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 内容Tab栏 */}
      <div className="sticky top-14 z-30 bg-[#FAF8F5] border-b border-[#E8E0D5] mt-4">
        <div className="flex items-center px-4 overflow-x-auto scrollbar-hide">
          {contentTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative",
                activeTab === tab.id 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab内容 */}
      {renderTabContent()}

      {/* 悬浮按钮组 */}
      <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-40">
        {/* 圈主助理 - 已开通可用，否则申请开通 */}
        <button 
          onClick={() => handleFeatureClick("ai_assistant", aiStatus, () => setShowAIAssistant(true))}
          disabled={aiStatus === "reviewing"}
          className={cn(
            "relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors",
            aiStatus === "approved"
              ? "bg-accent shadow-accent/30 hover:bg-accent/90"
              : "bg-secondary border border-border",
          )}
          aria-label={aiStatus === "approved" ? "圈主助理" : "申请开通圈主助理"}
        >
          <Bot className={cn("w-6 h-6", aiStatus === "approved" ? "text-white" : "text-muted-foreground")} />
          {aiStatus !== "approved" && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C41E3A] flex items-center justify-center">
              <Lock className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </button>

        {/* 发布按钮 */}
        <div className="relative">
          <button 
            onClick={() => setShowPublishMenu(!showPublishMenu)}
            className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Edit3 className="w-6 h-6 text-primary-foreground" />
          </button>

          {/* 发布菜单 */}
          {showPublishMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowPublishMenu(false)} 
              />
              <div className="absolute bottom-16 right-0 w-56 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* 发帖子 - 所有成员可用 */}
                <Link 
                  href="/publish?type=post"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="whitespace-nowrap">发帖子</span>
                </Link>
                {/* 发短视频 - 需申请开通 */}
                <button
                  onClick={() => handleFeatureClick("short_video", videoStatus, () => window.location.assign("/publish?type=video"))}
                  disabled={videoStatus === "reviewing"}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors border-t border-border disabled:opacity-60"
                >
                  <Video className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="flex-1 text-left whitespace-nowrap">发短视频</span>
                  {videoStatus !== "approved" && <StatusBadge status={videoStatus} />}
                </button>
                {/* 发起直播 - 需申请开通 */}
                <button
                  onClick={() => handleFeatureClick("live", liveStatus, () => window.location.assign("/manage/live/create"))}
                  disabled={liveStatus === "reviewing"}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors border-t border-border disabled:opacity-60"
                >
                  <Radio className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="flex-1 text-left whitespace-nowrap">发起直播</span>
                  {liveStatus !== "approved" && <StatusBadge status={liveStatus} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI助理半屏弹窗 */}
      {showAIAssistant && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowAIAssistant(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 h-[60vh] bg-card rounded-t-2xl z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-foreground">圈主助理</h3>
                  <p className="text-[10px] text-muted-foreground">AI智能问答</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAIAssistant(false)}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* AI对话区域 */}
            <div className="flex-1 p-4 overflow-y-auto h-[calc(60vh-120px)]">
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1">
                  <Card className="p-3 bg-secondary/50">
                    <p className="text-sm text-foreground">
                      你好！我是本圈的AI助理，可以回答你关于八字命理的问题，也可以帮你了解圈子内容。有什么可以帮你的吗？
                    </p>
                  </Card>
                </div>
              </div>
            </div>

            {/* 输入框 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t border-border safe-area-pb">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="输入你的问题..."
                  className="flex-1 px-4 py-2.5 rounded-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 高级功能申请弹窗 */}
      {applyFeature && (
        <FeatureApplyModal
          feature={applyFeature}
          onClose={() => setApplyFeature(null)}
          onSubmit={() => setApplyFeature(null)}
        />
      )}
    </div>
  )
}
