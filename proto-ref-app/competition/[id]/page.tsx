"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, Share2, Trophy, Users, Calendar, Clock, ChevronRight, Crown, Medal, Award, 
  Flame, Star, MapPin, BookOpen, CheckCircle, Circle, Play, FileText, Gift, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// 赛事详情Mock数据
const competitionDetail = {
  id: "1",
  title: "2024热卜杯·八字命理大赛",
  cover: "/images/competition/comp-1.jpg",
  type: "platform",
  status: "registering",
  startTime: "2024-04-01",
  endTime: "2024-04-30",
  registrationDeadline: "2024-03-25",
  registrationFee: 0, // 0为免费
  participants: 1286,
  maxParticipants: 2000,
  description: `
    为发掘和培养八字命理领域的实战高手，热卜平台特举办本届八字命理大赛。
    本次比赛采用线上+线下相结合的形式，通过初赛、复赛、决赛三轮角逐，选拔出真正具有实战能力的命理高手。
    获奖选手将获得丰厚奖金、平台认证、课程推广等多重福利。
  `,
  organizer: "热卜平台",
  circle: null,
  isJoined: false,
  
  // 赛程安排
  rounds: [
    {
      id: "r1",
      name: "初赛",
      type: "quiz", // quiz答题, case案例, live直播
      status: "upcoming", // upcoming, ongoing, ended
      startTime: "2024-04-01 09:00",
      endTime: "2024-04-07 18:00",
      description: "线上答题，100道选择题，限时90分钟",
      passRule: "前500名晋级复赛",
      icon: FileText,
    },
    {
      id: "r2",
      name: "复赛",
      type: "case",
      status: "upcoming",
      startTime: "2024-04-15 09:00",
      endTime: "2024-04-20 18:00",
      description: "真实案例分析，提交书面报告",
      passRule: "专家评审，前50名晋级决赛",
      icon: BookOpen,
    },
    {
      id: "r3",
      name: "决赛",
      type: "live",
      status: "upcoming",
      startTime: "2024-04-28 14:00",
      endTime: "2024-04-28 18:00",
      description: "直播PK，现场盲排实战",
      passRule: "评委打分，决出冠亚季军",
      icon: Play,
    },
  ],
  
  // 奖品设置
  prizes: [
    { rank: 1, title: "冠军", reward: "奖金10000元 + 平台金牌认证 + 首页推荐位1个月", icon: Crown, color: "text-amber-500" },
    { rank: 2, title: "亚军", reward: "奖金5000元 + 平台银牌认证 + 课程推广资格", icon: Medal, color: "text-gray-400" },
    { rank: 3, title: "季军", reward: "奖金3000元 + 平台铜牌认证", icon: Award, color: "text-amber-700" },
    { rank: "4-10", title: "优秀奖", reward: "奖金500元 + 优秀选手认证", icon: Star, color: "text-primary" },
    { rank: "11-50", title: "入围奖", reward: "平台会员1个月 + 参赛证书", icon: Gift, color: "text-muted-foreground" },
  ],
  
  // 比赛规则
  rules: [
    "参赛者需完成实名认证",
    "每人限报名一次，不可重复参赛",
    "初赛答题期间不得切换页面，否则视为作弊",
    "复赛案例分析需为原创，禁止抄袭",
    "决赛直播期间需保持网络稳定",
    "获奖者需配合平台进行赛后经验分享",
    "平台对本次比赛拥有最终解释权",
  ],
  
  // 评委/嘉宾
  judges: [
    { id: "j1", name: "周易大师", avatar: "/images/experts/expert-1.jpg", title: "资深命理师" },
    { id: "j2", name: "陈风水", avatar: "/images/experts/expert-2.jpg", title: "易学研究员" },
    { id: "j3", name: "李玄机", avatar: "/images/experts/expert-3.jpg", title: "八字名师" },
  ],
  
  // 当前排行榜（报名阶段显示报名排名）
  rankings: [
    { rank: 1, userId: "u1", name: "张**", avatar: "/images/users/user-1.jpg", score: null },
    { rank: 2, userId: "u2", name: "李**", avatar: "/images/users/user-2.jpg", score: null },
    { rank: 3, userId: "u3", name: "王**", avatar: "/images/users/user-3.jpg", score: null },
  ],
}

const statusConfig = {
  registering: { label: "报名中", color: "bg-green-500" },
  ongoing: { label: "进行中", color: "bg-primary" },
  ended: { label: "已结束", color: "bg-gray-400" },
  upcoming: { label: "即将开始", color: "bg-amber-500" },
}

export default function CompetitionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("intro")
  const competition = competitionDetail
  
  const progress = (competition.participants / competition.maxParticipants) * 100

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-medium">赛事详情</h1>
          <button onClick={() => router.push(`/competition/${params.id}/poster`)}>
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 赛事头图 */}
      <div className="relative h-48 bg-gradient-to-br from-primary via-primary to-primary/80 overflow-hidden">
        {competition.cover ? (
          <img
            src={competition.cover}
            alt={competition.title}
            className="w-full h-full object-cover opacity-80"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="w-24 h-24 text-white/20" />
          </div>
        )}
        
        {/* 状态和类型 */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Badge className={cn("border-0 text-white", statusConfig[competition.status as keyof typeof statusConfig].color)}>
            {statusConfig[competition.status as keyof typeof statusConfig].label}
          </Badge>
          <Badge className="bg-white/20 text-white border-0">
            平台赛事
          </Badge>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <Card className="mx-4 -mt-8 relative z-10 p-4">
        <h1 className="text-lg font-bold text-foreground mb-2">{competition.title}</h1>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-primary" />
            {competition.organizer}
          </span>
        </div>
        
        {/* 报名进度 */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">报名人数</span>
            <span className="font-medium">{competition.participants}/{competition.maxParticipants}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* 时间信息 */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">比赛时间</p>
              <p className="font-medium">{competition.startTime} - {competition.endTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">报名截止</p>
              <p className="font-medium text-primary">{competition.registrationDeadline}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab切换 */}
      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-10">
            <TabsTrigger value="intro">介绍</TabsTrigger>
            <TabsTrigger value="schedule">赛程</TabsTrigger>
            <TabsTrigger value="prizes">奖品</TabsTrigger>
            <TabsTrigger value="ranking">排行</TabsTrigger>
          </TabsList>
          
          {/* 介绍 */}
          <TabsContent value="intro" className="mt-4 space-y-4">
            <Card className="p-4">
              <h3 className="font-medium mb-2">赛事简介</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {competition.description}
              </p>
            </Card>
            
            {/* 评委阵容 */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">评委阵容</h3>
              <div className="flex gap-4">
                {competition.judges.map(judge => (
                  <div key={judge.id} className="text-center">
                    <div className="w-14 h-14 rounded-full bg-secondary mx-auto mb-1 flex items-center justify-center">
                      <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">{judge.name}</p>
                    <p className="text-xs text-muted-foreground">{judge.title}</p>
                  </div>
                ))}
              </div>
            </Card>
            
            {/* 比赛规则 */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">比赛规则</h3>
              <ul className="space-y-2">
                {competition.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {rule}
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>
          
          {/* 赛程 */}
          <TabsContent value="schedule" className="mt-4">
            <div className="space-y-3">
              {competition.rounds.map((round, index) => (
                <Card key={round.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      round.status === "ended" ? "bg-green-100 text-green-600" :
                      round.status === "ongoing" ? "bg-primary/10 text-primary" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      <round.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{round.name}</h4>
                        <Badge variant={round.status === "ongoing" ? "default" : "secondary"} className="text-xs">
                          {round.status === "ended" ? "已结束" : round.status === "ongoing" ? "进行中" : "未开始"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{round.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {round.startTime}
                        </span>
                      </div>
                      <p className="text-xs text-primary mt-2">{round.passRule}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* 奖品 */}
          <TabsContent value="prizes" className="mt-4">
            <div className="space-y-3">
              {competition.prizes.map((prize, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      index === 0 ? "bg-amber-100" : index === 1 ? "bg-gray-100" : index === 2 ? "bg-amber-50" : "bg-secondary"
                    )}>
                      <prize.icon className={cn("w-6 h-6", prize.color)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{prize.title}</span>
                        <span className="text-xs text-muted-foreground">第{prize.rank}名</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{prize.reward}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* 排行榜 */}
          <TabsContent value="ranking" className="mt-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">当前排行</h3>
                <Link href={`/competition/${competition.id}/result`} className="text-sm text-primary">
                  查看完整榜单
                </Link>
              </div>
              
              <div className="space-y-3">
                {competition.rankings.map((item, index) => (
                  <div key={item.userId} className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 ? "bg-amber-100 text-amber-600" :
                      index === 1 ? "bg-gray-100 text-gray-600" :
                      index === 2 ? "bg-amber-50 text-amber-700" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {item.rank}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                    </div>
                    {item.score !== null && (
                      <span className="font-bold text-primary">{item.score}分</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 底部报名按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">报名费</p>
            <p className="text-lg font-bold text-primary">
              {competition.registrationFee === 0 ? "免费" : `¥${competition.registrationFee}`}
            </p>
          </div>
          {competition.isJoined ? (
            <Button className="flex-1" variant="secondary" disabled>
              已报名
            </Button>
          ) : (
            <Link href={`/competition/${competition.id}/register`} className="flex-1">
              <Button className="w-full">
                立即报名
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
