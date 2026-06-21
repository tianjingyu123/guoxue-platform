"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Share2, Trophy, Crown, Medal, Award, Star, Users, Search, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Mock排行榜数据
const rankingData = {
  competitionId: "1",
  competitionTitle: "2024热卜杯·八字命理大赛",
  currentRound: "初赛",
  totalParticipants: 1286,
  promotedCount: 500,
  
  // 当前用户
  myRanking: {
    rank: 128,
    userId: "me",
    name: "我",
    avatar: "/images/users/me.jpg",
    score: 86,
    isPromoted: true,
  },
  
  // 前三名
  topThree: [
    { rank: 1, userId: "u1", name: "张易学", avatar: "/images/users/user-1.jpg", score: 98, isPromoted: true },
    { rank: 2, userId: "u2", name: "李命理", avatar: "/images/users/user-2.jpg", score: 96, isPromoted: true },
    { rank: 3, userId: "u3", name: "王八字", avatar: "/images/users/user-3.jpg", score: 95, isPromoted: true },
  ],
  
  // 完整排行榜
  rankings: [
    { rank: 1, userId: "u1", name: "张易学", avatar: "/images/users/user-1.jpg", score: 98, isPromoted: true },
    { rank: 2, userId: "u2", name: "李命理", avatar: "/images/users/user-2.jpg", score: 96, isPromoted: true },
    { rank: 3, userId: "u3", name: "王八字", avatar: "/images/users/user-3.jpg", score: 95, isPromoted: true },
    { rank: 4, userId: "u4", name: "赵玄机", avatar: "", score: 94, isPromoted: true },
    { rank: 5, userId: "u5", name: "钱国学", avatar: "", score: 93, isPromoted: true },
    { rank: 6, userId: "u6", name: "孙易经", avatar: "", score: 92, isPromoted: true },
    { rank: 7, userId: "u7", name: "周天干", avatar: "", score: 91, isPromoted: true },
    { rank: 8, userId: "u8", name: "吴地支", avatar: "", score: 90, isPromoted: true },
    { rank: 9, userId: "u9", name: "郑五行", avatar: "", score: 89, isPromoted: true },
    { rank: 10, userId: "u10", name: "王十神", avatar: "", score: 88, isPromoted: true },
    // ... 更多数据
  ],
}

export default function CompetitionResultPage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRankings = rankingData.rankings.filter(r => {
    if (activeTab === "promoted") return r.isPromoted
    if (activeTab === "eliminated") return !r.isPromoted
    return true
  }).filter(r => 
    r.name.includes(searchQuery)
  )

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-medium">排行榜</h1>
          <button>
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 赛事信息 */}
      <div className="bg-primary text-primary-foreground px-4 pb-6 pt-2">
        <p className="text-white/80 text-sm mb-1">{rankingData.competitionTitle}</p>
        <div className="flex items-center gap-3 text-sm">
          <Badge className="bg-white/20 text-white border-0">{rankingData.currentRound}</Badge>
          <span className="text-white/70">参赛 {rankingData.totalParticipants} 人</span>
          <span className="text-white/70">晋级 {rankingData.promotedCount} 人</span>
        </div>
      </div>

      {/* 前三名展示 */}
      <div className="px-4 -mt-2">
        <Card className="p-4">
          <div className="flex items-end justify-center gap-4">
            {/* 亚军 */}
            <div className="text-center flex-1">
              <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto mb-2 flex items-center justify-center relative">
                <Users className="w-6 h-6 text-gray-400" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                  <Medal className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="font-medium text-sm">{rankingData.topThree[1].name}</p>
              <p className="text-lg font-bold text-gray-500">{rankingData.topThree[1].score}</p>
            </div>
            
            {/* 冠军 */}
            <div className="text-center flex-1">
              <div className="w-20 h-20 rounded-full bg-amber-100 mx-auto mb-2 flex items-center justify-center relative">
                <Users className="w-8 h-8 text-amber-400" />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="font-bold">{rankingData.topThree[0].name}</p>
              <p className="text-2xl font-bold text-amber-500">{rankingData.topThree[0].score}</p>
            </div>
            
            {/* 季军 */}
            <div className="text-center flex-1">
              <div className="w-14 h-14 rounded-full bg-amber-50 mx-auto mb-2 flex items-center justify-center relative">
                <Users className="w-6 h-6 text-amber-300" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center">
                  <Award className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="font-medium text-sm">{rankingData.topThree[2].name}</p>
              <p className="text-lg font-bold text-amber-700">{rankingData.topThree[2].score}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 我的排名 */}
      {rankingData.myRanking && (
        <div className="px-4 mt-4">
          <Card className={cn(
            "p-4 border-2",
            rankingData.myRanking.isPromoted ? "border-green-300 bg-green-50/50" : "border-border"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                rankingData.myRanking.rank <= 3 ? "bg-amber-100 text-amber-600" :
                rankingData.myRanking.rank <= 10 ? "bg-primary/10 text-primary" :
                "bg-secondary text-muted-foreground"
              )}>
                {rankingData.myRanking.rank}
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">我的排名</p>
                <p className="text-sm text-muted-foreground">
                  超越了 {Math.round((1 - rankingData.myRanking.rank / rankingData.totalParticipants) * 100)}% 的选手
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">{rankingData.myRanking.score}</p>
                {rankingData.myRanking.isPromoted && (
                  <Badge className="bg-green-100 text-green-700 border-0">已晋级</Badge>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="px-4 mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索选手..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-9">
            <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
            <TabsTrigger value="promoted" className="text-xs">已晋级</TabsTrigger>
            <TabsTrigger value="eliminated" className="text-xs">未晋级</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 排行榜列表 */}
      <div className="px-4 mt-4">
        <Card>
          <div className="divide-y divide-border">
            {filteredRankings.map(item => (
              <div key={item.userId} className="flex items-center gap-3 p-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  item.rank === 1 ? "bg-amber-100 text-amber-600" :
                  item.rank === 2 ? "bg-gray-100 text-gray-600" :
                  item.rank === 3 ? "bg-amber-50 text-amber-700" :
                  item.rank <= 10 ? "bg-primary/10 text-primary" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {item.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{item.score}</p>
                  {item.isPromoted ? (
                    <span className="text-xs text-green-600">晋级</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">未晋级</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
