"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Search, Trophy, Users, Calendar, Crown, Medal, Award, Flame, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// 赛事状态配置
const statusConfig = {
  registering: { label: "报名中", color: "bg-green-500 text-white", dot: "bg-green-400 animate-pulse" },
  ongoing: { label: "进行中", color: "bg-primary text-white", dot: "bg-primary animate-pulse" },
  ended: { label: "已结束", color: "bg-gray-400 text-white", dot: "bg-gray-400" },
  upcoming: { label: "即将开始", color: "bg-amber-500 text-white", dot: "bg-amber-400" },
}

// 赛事类型配置
const typeConfig = {
  platform: { label: "平台赛事", color: "text-primary bg-primary/10" },
  circle: { label: "圈子赛事", color: "text-amber-600 bg-amber-50" },
  joint: { label: "联合主办", color: "text-purple-600 bg-purple-50" },
}

// Mock 赛事数据
const competitions = [
  {
    id: "1",
    title: "2024热卜杯·八字命理大赛",
    cover: "/images/competition/comp-1.jpg",
    type: "platform",
    status: "registering",
    startTime: "2024-04-01",
    endTime: "2024-04-30",
    registrationDeadline: "2024-03-25",
    participants: 1286,
    maxParticipants: 2000,
    prizes: ["冠军奖金10000元", "亚军5000元", "季军3000元"],
    rounds: ["初赛(线上答题)", "复赛(案例分析)", "决赛(直播PK)"],
    circle: null,
    organizer: "热卜平台",
    isHot: true,
    tags: ["八字", "命理", "实战"],
  },
  {
    id: "2",
    title: "紫微斗数实战挑战赛",
    cover: "/images/competition/comp-2.jpg",
    type: "circle",
    status: "ongoing",
    startTime: "2024-03-15",
    endTime: "2024-04-15",
    registrationDeadline: "2024-03-10",
    participants: 568,
    maxParticipants: 800,
    prizes: ["冠军免费入圈1年", "前10名获专属认证"],
    rounds: ["初赛(基础测试)", "决赛(盲排比拼)"],
    circle: { id: "c1", name: "紫微斗数研习社", cover: "/images/circles/circle-1.jpg" },
    organizer: "紫微斗数研习社",
    isHot: false,
    tags: ["紫微", "斗数"],
  },
  {
    id: "3",
    title: "第三届风水布局设计大赛",
    cover: "/images/competition/comp-3.jpg",
    type: "joint",
    status: "upcoming",
    startTime: "2024-05-01",
    endTime: "2024-06-30",
    registrationDeadline: "2024-04-25",
    participants: 326,
    maxParticipants: 1000,
    prizes: ["总奖金池50000元", "优秀作品平台展示"],
    rounds: ["作品提交", "专家评审", "公众投票"],
    circle: { id: "c2", name: "玄空风水学院", cover: "/images/circles/circle-2.jpg" },
    organizer: "热卜平台 × 玄空风水学院",
    isHot: true,
    tags: ["风水", "设计", "实战"],
  },
  {
    id: "4",
    title: "易经六十四卦知识竞赛",
    cover: "/images/competition/comp-4.jpg",
    type: "circle",
    status: "ended",
    startTime: "2024-02-01",
    endTime: "2024-02-28",
    registrationDeadline: "2024-01-25",
    participants: 892,
    maxParticipants: 1000,
    prizes: ["冠军获大师1v1指导"],
    rounds: ["初赛", "复赛", "决赛"],
    circle: { id: "c3", name: "易经研习堂", cover: "/images/circles/circle-3.jpg" },
    organizer: "易经研习堂",
    isHot: false,
    tags: ["易经", "六十四卦"],
    winner: { name: "张易学", avatar: "/images/users/user-1.jpg" },
  },
]

// 分类标签
const categories = [
  { id: "all", label: "全部" },
  { id: "bazi", label: "八字命理" },
  { id: "ziwei", label: "紫微斗数" },
  { id: "fengshui", label: "风水堪舆" },
  { id: "yijing", label: "易经占卜" },
  { id: "qiming", label: "起名择日" },
]

export default function CompetitionCenterPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading] = useState(false)

  // 筛选赛事
  const filteredCompetitions = competitions.filter(comp => {
    const matchesTab = activeTab === "all" || comp.status === activeTab
    const matchesSearch = comp.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  // 热门赛事（用于顶部轮播展示）
  const hotCompetitions = competitions.filter(c => c.isHot && c.status !== "ended")

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-11">
          <Link href="/" className="flex items-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-medium">赛事中心</h1>
          <Link href="/competition/archive" className="text-sm opacity-80">
            往期
          </Link>
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索赛事名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>
      </div>

      {/* 热门赛事横幅 */}
      {hotCompetitions.length > 0 && (
        <div className="px-4 py-4">
          <Link href={`/competition/${hotCompetitions[0].id}`}>
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-white p-4">
              {/* 装饰元素 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-white/20 text-white border-0">
                    <Flame className="w-3 h-3 mr-1" />
                    热门赛事
                  </Badge>
                  <Badge className={cn("border-0", statusConfig[hotCompetitions[0].status as keyof typeof statusConfig].color)}>
                    {statusConfig[hotCompetitions[0].status as keyof typeof statusConfig].label}
                  </Badge>
                </div>
                
                <h2 className="text-lg font-bold mb-1">{hotCompetitions[0].title}</h2>
                <p className="text-white/80 text-sm mb-3">
                  {hotCompetitions[0].organizer} · {hotCompetitions[0].participants}人已报名
                </p>
                
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    {hotCompetitions[0].prizes[0]}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-white/70">
                    报名截止: {hotCompetitions[0].registrationDeadline}
                  </span>
                  <Button size="sm" className="bg-white text-primary hover:bg-white/90">
                    立即报名
                  </Button>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* 分类标签 */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 状态Tab */}
      <div className="px-4 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
            <TabsTrigger value="registering" className="text-xs">报名中</TabsTrigger>
            <TabsTrigger value="ongoing" className="text-xs">进行中</TabsTrigger>
            <TabsTrigger value="ended" className="text-xs">已结束</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 赛事列表 */}
      <div className="px-4 py-2 space-y-4">
        {isLoading ? (
          // 骨架屏
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="h-36 bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-5 bg-muted rounded-full w-16" />
                  <div className="h-5 bg-muted rounded-full w-12" />
                </div>
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </Card>
          ))
        ) : filteredCompetitions.length > 0 ? (
          filteredCompetitions.map(comp => (
            <CompetitionCard key={comp.id} competition={comp} />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无相关赛事</p>
          </div>
        )}
      </div>
    </div>
  )
}

// 赛事卡片组件
function CompetitionCard({ competition }: { competition: typeof competitions[0] }) {
  const status = statusConfig[competition.status as keyof typeof statusConfig]
  const type = typeConfig[competition.type as keyof typeof typeConfig]

  return (
    <Link href={`/competition/${competition.id}`}>
      <Card className="overflow-hidden active:scale-[0.99] transition-transform">
        {/* 封面图 */}
        <div className="relative h-36 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
          {competition.cover ? (
            <img
              src={competition.cover}
              alt={competition.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="w-16 h-16 text-primary/20" />
            </div>
          )}
          
          {/* 状态标签 */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge className={cn("border-0", status.color)}>
              <span className={cn("w-1.5 h-1.5 rounded-full mr-1", status.dot)} />
              {status.label}
            </Badge>
            <Badge className={cn("border-0", type.color)}>
              {type.label}
            </Badge>
          </div>
          
          {/* 已结束显示冠军 */}
          {competition.status === "ended" && competition.winner && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 px-2 py-1 bg-black/60 rounded-full">
              <Crown className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-white">冠军: {competition.winner.name}</span>
            </div>
          )}
        </div>
        
        {/* 内容区 */}
        <div className="p-4">
          <h3 className="font-bold text-foreground mb-2 line-clamp-1">{competition.title}</h3>
          
          {/* 主办方 */}
          <div className="flex items-center gap-2 mb-3">
            {competition.circle ? (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                  <Users className="w-3 h-3 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{competition.organizer}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-3 h-3 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{competition.organizer}</span>
              </div>
            )}
          </div>
          
          {/* 标签 */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {competition.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-secondary text-xs text-muted-foreground rounded">
                {tag}
              </span>
            ))}
          </div>
          
          {/* 赛事信息 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {competition.participants}/{competition.maxParticipants}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {competition.startTime}
              </span>
            </div>
            
            {competition.status === "registering" && (
              <Button size="sm" className="h-7 text-xs">
                立即报名
              </Button>
            )}
            {competition.status === "ongoing" && (
              <span className="text-primary font-medium">查看详情</span>
            )}
            {competition.status === "ended" && (
              <span className="text-muted-foreground">查看结果</span>
            )}
          </div>
          
          {/* 奖品预览 */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs">
              <Medal className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground truncate">{competition.prizes[0]}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
