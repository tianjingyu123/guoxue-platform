"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Users, ChevronRight, ChevronDown, Plus, Sparkles, X, MessageSquare, Flame } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { BottomNav } from "@/components/bottom-nav"
import { AISearchButton, AISearchModal, useAISearch } from "@/components/ai-search"
import { CircleCardList, type CircleData } from "@/components/circle/circle-card"

// ============================================
// 数据定义
// ============================================

// 我加入的圈子
const myJoinedCircles = [
  { id: 1, name: "八字命理研习社", cover: "/images/circles/circle-1.jpg", members: 12800, unread: 12, lastPost: "今日话题：如何看流年大运" },
  { id: 2, name: "紫微斗数精研会", cover: "/images/circles/circle-2.jpg", members: 8560, unread: 3, lastPost: "紫微斗数案例分析第56期" },
  { id: 3, name: "风水堪舆学院", cover: "/images/circles/circle-3.jpg", members: 6280, unread: 0, lastPost: "办公室风水布局要点" },
  { id: 5, name: "道家养生圈", cover: "/images/circles/circle-2.jpg", members: 9800, unread: 8, lastPost: "道家呼吸法入门教程" },
]

// 我创建的圈子
const myCreatedCircles = [
  { id: 101, name: "易学初学者交流群", cover: "/images/circles/circle-1.jpg", members: 128, unread: 5, lastPost: "刚才有人问了八字入门的问题..." },
  { id: 102, name: "本地风水爱好者", cover: "/images/circles/circle-2.jpg", members: 56, unread: 0, lastPost: "周末约着看房的朋友们..." },
]

// 热门圈子数据（10个）- 丰富展示信息
const hotCircles = [
  { 
    id: 1, 
    name: "八字命理研习社", 
    cover: "/images/circles/circle-1.jpg", 
    description: "专注八字命理学习与实践的高质量社群",
    highlight: "周易大师亲授，每周直播答疑，已有3000+学员受益",
    members: 12800, 
    posts: 3560, 
    todayPosts: 128,
    category: "八字命理", 
    price: 99, 
    owner: "周易大师", 
    ownerAvatar: "/images/experts/expert-1.jpg",
    ownerTitle: "20年命理研究",
    isVerified: true,
    tags: ["TOP1", "活跃"],
    hotPosts: ["如何看流年大运的吉凶？", "八字看婚姻的三个关键点"],
    rating: 4.9,
    ratingCount: 1286,
    recentJoiners: ["/images/avatars/avatar-1.jpg", "/images/avatars/avatar-2.jpg", "/images/avatars/avatar-3.jpg"]
  },
  { 
    id: 2, 
    name: "紫微斗数精研会", 
    cover: "/images/circles/circle-2.jpg", 
    description: "深入研究紫微斗数，探索命运密码",
    highlight: "紫微斗数第四代传人坐镇，从入门到精通完整体系",
    members: 8560, 
    posts: 2180, 
    todayPosts: 86,
    category: "紫微斗数", 
    price: 0, 
    owner: "张玄风", 
    ownerAvatar: "/images/experts/expert-2.jpg",
    ownerTitle: "紫微传承人",
    isVerified: true,
    tags: ["免费", "新手友好"],
    hotPosts: ["命宫主星性格详解", "紫微斗数排盘基础教程"],
    rating: 4.8,
    ratingCount: 856,
    recentJoiners: ["/images/avatars/avatar-1.jpg", "/images/avatars/avatar-2.jpg", "/images/avatars/avatar-3.jpg"]
  },
  { 
    id: 3, 
    name: "风水堪舆学院", 
    cover: "/images/circles/circle-3.jpg", 
    description: "实战派风水知识分享与交流",
    highlight: "1000+真实案例解析，学完就能自己看风水",
    members: 6280, 
    posts: 1890, 
    todayPosts: 45,
    category: "风水堪舆", 
    price: 199, 
    owner: "陈风水", 
    ownerAvatar: "/images/experts/expert-1.jpg",
    ownerTitle: "实战派风水师",
    isVerified: true,
    tags: ["大咖入驻", "实战派"],
    hotPosts: ["客厅沙发摆放禁忌", "办公室旺财风水布局"],
    rating: 4.7,
    ratingCount: 628,
    recentJoiners: ["/images/avatars/avatar-2.jpg", "/images/avatars/avatar-3.jpg", "/images/avatars/avatar-1.jpg"]
  },
  { 
    id: 4, 
    name: "姓名学研究所", 
    cover: "/images/circles/circle-1.jpg", 
    description: "姓名与命运的关系研究",
    highlight: "起名改名5000+案例，五格三才数理详解",
    members: 4560, 
    posts: 980, 
    todayPosts: 32,
    category: "姓名学", 
    price: 0, 
    owner: "王文昌", 
    ownerAvatar: "/images/experts/expert-2.jpg",
    ownerTitle: "姓名学专家",
    isVerified: true,
    tags: ["免费"],
    hotPosts: ["2024龙宝宝起名大全"],
    rating: 4.8,
    ratingCount: 456,
    recentJoiners: ["/images/avatars/avatar-3.jpg", "/images/avatars/avatar-1.jpg", "/images/avatars/avatar-2.jpg"]
  },
  { 
    id: 5, 
    name: "道家养生圈", 
    cover: "/images/circles/circle-2.jpg", 
    description: "道家养生功法与理论",
    highlight: "武当山道长亲授，道家内丹功法，修身养性",
    members: 9800, 
    posts: 2560, 
    todayPosts: 98,
    category: "道家文化", 
    price: 68, 
    owner: "李道长", 
    ownerAvatar: "/images/experts/expert-1.jpg",
    ownerTitle: "武当道士",
    isVerified: true,
    tags: ["活跃", "干货多"],
    hotPosts: ["道家呼吸吐纳法", "站桩功入门教程"],
    rating: 4.9,
    ratingCount: 980,
    recentJoiners: ["/images/avatars/avatar-1.jpg", "/images/avatars/avatar-3.jpg", "/images/avatars/avatar-2.jpg"]
  },
  { 
    id: 6, 
    name: "中医经络研习", 
    cover: "/images/circles/circle-3.jpg", 
    description: "中医经络与穴位养生",
    highlight: "中医世家传承，经络穴位图解，日常保健必备",
    members: 7200, 
    posts: 1680, 
    todayPosts: 56,
    category: "中医养生", 
    price: 0, 
    owner: "张仲景传人", 
    ownerAvatar: "/images/experts/expert-2.jpg",
    ownerTitle: "中医师",
    isVerified: false,
    tags: ["免费", "科普"],
    hotPosts: ["常用穴位按摩指南"],
    rating: 4.6,
    ratingCount: 420,
    recentJoiners: ["/images/avatars/avatar-2.jpg", "/images/avatars/avatar-1.jpg", "/images/avatars/avatar-3.jpg"]
  },
  { 
    id: 7, 
    name: "周易六爻研习", 
    cover: "/images/circles/circle-1.jpg", 
    description: "六爻预测技法研讨",
    highlight: "铜钱起卦、断卦技法，实战案例每日更新",
    members: 3280, 
    posts: 890, 
    todayPosts: 28,
    category: "八字命理", 
    price: 58, 
    owner: "六爻居士", 
    ownerAvatar: "/images/experts/expert-1.jpg",
    ownerTitle: "六爻研究者",
    isVerified: true,
    tags: ["进阶"],
    hotPosts: ["六爻断卦基本流程"],
    rating: 4.7,
    ratingCount: 320,
    recentJoiners: ["/images/avatars/avatar-3.jpg", "/images/avatars/avatar-2.jpg", "/images/avatars/avatar-1.jpg"]
  },
  { 
    id: 8, 
    name: "梅花易数交流", 
    cover: "/images/circles/circle-2.jpg", 
    description: "梅花易数入门与提高",
    highlight: "随时随地起卦断卦，日常预测必备技能",
    members: 2560, 
    posts: 720, 
    todayPosts: 18,
    category: "八字命理", 
    price: 0, 
    owner: "梅花仙子", 
    ownerAvatar: "/images/experts/expert-2.jpg",
    ownerTitle: "梅花易数传人",
    isVerified: false,
    tags: ["免��", "入门"],
    hotPosts: ["梅花易数快速入门"],
    rating: 4.5,
    ratingCount: 256,
    recentJoiners: ["/images/avatars/avatar-1.jpg", "/images/avatars/avatar-2.jpg", "/images/avatars/avatar-3.jpg"]
  },
  { 
    id: 9, 
    name: "奇门遁甲秘境", 
    cover: "/images/circles/circle-3.jpg", 
    description: "古代兵法预测术",
    highlight: "帝王之术，择吉避凶，人生重大决策必备",
    members: 1980, 
    posts: 560, 
    todayPosts: 12,
    category: "道家文化", 
    price: 198, 
    owner: "奇门居士", 
    ownerAvatar: "/images/experts/expert-1.jpg",
    ownerTitle: "奇门传人",
    isVerified: true,
    tags: ["高阶", "稀缺"],
    hotPosts: ["奇门遁甲入门概述"],
    rating: 4.8,
    ratingCount: 198,
    recentJoiners: ["/images/avatars/avatar-2.jpg", "/images/avatars/avatar-3.jpg", "/images/avatars/avatar-1.jpg"]
  },
  { 
    id: 10, 
    name: "面相手相研究", 
    cover: "/images/circles/circle-1.jpg", 
    description: "相学入门与提高",
    highlight: "观人识面，掌握命运，社交识人必备技能",
    members: 5680, 
    posts: 1230, 
    todayPosts: 42,
    category: "相学", 
    price: 0, 
    owner: "相面先生", 
    ownerAvatar: "/images/experts/expert-2.jpg",
    ownerTitle: "相学研究者",
    isVerified: false,
    tags: ["免费", "图文多"],
    hotPosts: ["面相看性格基础"],
    rating: 4.6,
    ratingCount: 568,
    recentJoiners: ["/images/avatars/avatar-3.jpg", "/images/avatars/avatar-1.jpg", "/images/avatars/avatar-2.jpg"]
  },
]

// 推荐圈子（瀑布流）- 完整数据结构
const recommendCircles = [
  { id: 11, name: "易经智慧应用", cover: "/images/circles/circle-1.jpg", description: "易经智慧在现代生活中的应用", highlight: "易经64卦实战应用，职场决策、人生规划必备", members: 4280, price: 0, category: "国学经典", ownerAvatar: "/images/experts/expert-1.jpg", owner: "易学居士", ownerTitle: "易学研究者", isVerified: true, tags: ["免费", "干货多"], rating: 4.7, todayPosts: 28, recentJoiners: ["/images/avatars/avatar-1.jpg", "/images/avatars/avatar-2.jpg", "/images/avatars/avatar-3.jpg"] },
  { id: 12, name: "塔罗牌占卜交流", cover: "/images/circles/circle-2.jpg", description: "塔罗牌解读与交流", highlight: "78张塔罗牌详解，每日牌阵练习与解读", members: 3560, price: 38, category: "西方占卜", ownerAvatar: "/images/experts/expert-2.jpg", owner: "塔罗师Luna", ownerTitle: "塔罗占卜师", isVerified: true, tags: ["活跃", "新手友好"], rating: 4.8, todayPosts: 45, recentJoiners: ["/images/avatars/avatar-2.jpg", "/images/avatars/avatar-3.jpg", "/images/avatars/avatar-1.jpg"] },
  { id: 13, name: "星座运势分析", cover: "/images/circles/circle-3.jpg", description: "十二星座每日运势分享", highlight: "每日星座运势更新，星盘解读教学", members: 8920, price: 0, category: "星座", ownerAvatar: "/images/experts/expert-1.jpg", owner: "星座达人", ownerTitle: "占星师", isVerified: false, tags: ["免费", "活跃"], rating: 4.6, todayPosts: 68, recentJoiners: ["/images/avatars/avatar-3.jpg", "/images/avatars/avatar-1.jpg", "/images/avatars/avatar-2.jpg"] },
  { id: 14, name: "佛学禅修静心", cover: "/images/circles/circle-1.jpg", description: "佛学经典解读，禅修入门指导", highlight: "心经金刚经解读，每日禅修打卡", members: 6780, price: 0, category: "佛学", ownerAvatar: "/images/experts/expert-2.jpg", owner: "净心居士", ownerTitle: "佛学爱好者", isVerified: true, tags: ["免费", "精华多"], rating: 4.9, todayPosts: 32, recentJoiners: ["/images/avatars/avatar-1.jpg", "/images/avatars/avatar-3.jpg", "/images/avatars/avatar-2.jpg"] },
  { id: 15, name: "古典诗词赏析", cover: "/images/circles/circle-2.jpg", description: "唐诗宋词元曲鉴赏交流", highlight: "每日一首经典诗词，品味古人智慧", members: 5230, price: 0, category: "国学经典", ownerAvatar: "/images/experts/expert-1.jpg", owner: "诗词大家", ownerTitle: "国学讲师", isVerified: true, tags: ["免费", "干货多"], rating: 4.7, todayPosts: 22, recentJoiners: ["/images/avatars/avatar-2.jpg", "/images/avatars/avatar-1.jpg", "/images/avatars/avatar-3.jpg"] },
  { id: 16, name: "书法练习打卡", cover: "/images/circles/circle-3.jpg", description: "每日书法练习，互相监督进步", highlight: "楷书行书草书教学，每日打卡互相进步", members: 2890, price: 28, category: "书法", ownerAvatar: "/images/experts/expert-2.jpg", owner: "墨香斋主", ownerTitle: "书法爱好者", isVerified: false, tags: ["进阶"], rating: 4.5, todayPosts: 18, recentJoiners: ["/images/avatars/avatar-3.jpg", "/images/avatars/avatar-2.jpg", "/images/avatars/avatar-1.jpg"] },
]

// 圈子分类
const circleCategories = [
  { id: "all", name: "全部" },
  { id: "bazi", name: "八字命理" },
  { id: "ziwei", name: "紫微斗数" },
  { id: "fengshui", name: "风水堪舆" },
  { id: "liuyao", name: "六爻占卜" },
  { id: "meihua", name: "梅花易数" },
  { id: "qimen", name: "奇门遁甲" },
  { id: "xiangshu", name: "相学" },
  { id: "dao", name: "道家文化" },
  { id: "guoxue", name: "国学经典" },
]

export default function CirclePlazaPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [myCircleTab, setMyCircleTab] = useState<"joined" | "created">("joined")
  const [hotExpanded, setHotExpanded] = useState(false)
  const [joinedCircles, setJoinedCircles] = useState<number[]>([1, 2, 3, 5])
  const aiSearch = useAISearch()

  const myCircles = myCircleTab === "joined" ? myJoinedCircles : myCreatedCircles
  const displayedHotCircles = hotExpanded ? hotCircles : hotCircles.slice(0, 5)

  const handleJoin = (circleId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setJoinedCircles(prev => 
      prev.includes(circleId) ? prev.filter(id => id !== circleId) : [...prev, circleId]
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      <AISearchModal isOpen={aiSearch.isOpen} onClose={aiSearch.close} context="圈子" />

      {/* 顶部搜索栏 */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E8E0D5]/50 safe-area-pt">
        <div className="flex items-center gap-2 px-4 h-14">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
            <input
              type="text"
              placeholder="搜索圈子"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-full bg-[#F2EFEA] text-sm text-[#2C2C2C] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-[#999999]" />
              </button>
            )}
          </div>
          <AISearchButton onClick={aiSearch.open} />
        </div>
      </header>
      
      {/* 分类标签 - 横向滚动 */}
      <div className="bg-[#FAF8F5] border-b border-[#E8E0D5]/50">
        <div className="flex gap-2 overflow-x-auto py-3 px-4 scrollbar-hide">
          {circleCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all flex-shrink-0",
                selectedCategory === cat.id
                  ? "bg-[#C41E3A] text-white shadow-sm"
                  : "bg-white text-[#666666] border border-[#E8E0D5] hover:border-[#C41E3A]/30"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        
        {/* ============================================ */}
        {/* 我的圈子 */}
        {/* ============================================ */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1 bg-[#F2EFEA] rounded-full p-0.5">
              <button
                onClick={() => setMyCircleTab("joined")}
                className={cn(
                  "px-3 py-1.5 text-[13px] font-medium rounded-full transition-all",
                  myCircleTab === "joined" ? "bg-white text-[#2C2C2C] shadow-sm" : "text-[#666666]"
                )}
              >
                我加入的
              </button>
              <button
                onClick={() => setMyCircleTab("created")}
                className={cn(
                  "px-3 py-1.5 text-[13px] font-medium rounded-full transition-all",
                  myCircleTab === "created" ? "bg-white text-[#2C2C2C] shadow-sm" : "text-[#666666]"
                )}
              >
                我创建的
              </button>
            </div>
            <Link href="/circles/mine" className="text-[12px] text-[#C41E3A] flex items-center font-medium">
              全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {myCircles.length > 0 ? (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {myCircles.map(circle => (
                <Link key={circle.id} href={`/circle/${circle.id}`} className="flex-shrink-0 w-[140px]">
                  <Card className="overflow-hidden border-0 rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-white active:scale-[0.98] transition-transform">
                    {/* 封面图 - 纯净无文字 */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img src={circle.cover} alt={circle.name} className="w-full h-full object-cover" />
                      {/* 未读消息红点保留在图片上 */}
                      {circle.unread > 0 && (
                        <div className="absolute top-2 right-2 min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#C41E3A] text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                          {circle.unread > 99 ? "99+" : circle.unread}
                        </div>
                      )}
                    </div>
                    {/* 信息区 - 所有文字在下方 */}
                    <div className="p-2.5">
                      <h4 className="text-[13px] font-bold text-[#2C2C2C] line-clamp-1">{circle.name}</h4>
                      <p className="text-[10px] text-[#999999] mt-1">{circle.members >= 1000 ? `${(circle.members / 1000).toFixed(1)}k` : circle.members} 成员</p>
                      <p className="text-[10px] text-[#666666] line-clamp-1 mt-1">{circle.lastPost}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center bg-[#F2EFEA] rounded-[12px]">
              <p className="text-[13px] text-[#666666]">
                {myCircleTab === "created" ? "你还没有创建任何圈子" : "你还没有加入任何圈子"}
              </p>
            </div>
          )}
        </section>

        {/* ============================================ */}
        {/* 创建圈子入口 - 内容醒目 */}
        {/* ============================================ */}
        <section className="mb-5">
          <Link href="/circles/create">
            <Card className="overflow-hidden border-2 border-[#C41E3A]/20 rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] bg-white relative active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-4 p-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C41E3A] to-[#E02D4A] flex items-center justify-center shadow-lg shadow-[#C41E3A]/25">
                  <Plus className="w-8 h-8 text-white" strokeWidth={3} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[17px] font-bold text-[#C41E3A]">创建你的圈子</h3>
                  <p className="text-[13px] text-[#666666] mt-0.5">打造专属国学交流社区，聚集志同道合的朋友</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#C41E3A]/10 flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-[#C41E3A]" />
                </div>
              </div>
            </Card>
          </Link>
        </section>

        {/* ============================================ */}
        {/* 热门圈子 - 大图卡片式展示 */}
        {/* ============================================ */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#C41E3A]" />
              <h2 className="text-[17px] font-bold text-[#2C2C2C]">热门圈子</h2>
            </div>
            <span className="text-[11px] text-[#999999] bg-[#F2EFEA] px-2 py-0.5 rounded-full">精选优质社群</span>
          </div>
          
          <CircleCardList 
            circles={displayedHotCircles as CircleData[]} 
            joinedIds={joinedCircles}
            onJoin={handleJoin}
            showRank={true}
          />
          
          {/* 展开/收起 */}
          {hotCircles.length > 5 && (
            <button
              onClick={() => setHotExpanded(!hotExpanded)}
              className="w-full mt-3 py-3 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#C41E3A] bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:bg-[#FAF8F5] transition-colors"
            >
              {hotExpanded ? "收起" : `查看更多热门圈子 (${hotCircles.length - 5})`}
              <ChevronDown className={cn("w-4 h-4 transition-transform", hotExpanded && "rotate-180")} />
            </button>
          )}
        </section>

        {/* ============================================ */}
        {/* 推荐圈子 - 双列瀑布流 */}
        {/* ============================================ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[#C9A96E]" />
            <h2 className="text-[17px] font-bold text-[#2C2C2C]">发现更多</h2>
          </div>
          
          <CircleCardList 
            circles={recommendCircles as CircleData[]} 
            joinedIds={joinedCircles}
            onJoin={handleJoin}
            variant="masonry"
          />
        </section>
      </div>

      <BottomNav />
    </div>
  )
}
