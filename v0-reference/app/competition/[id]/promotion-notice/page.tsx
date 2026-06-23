"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Share2, Trophy, Crown, Star, Calendar, Clock, MapPin, Sparkles, Download, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Mock晋级数据
const promotionData = {
  competitionId: "1",
  competitionTitle: "2024热卜杯·八字命理大赛",
  currentRound: "初赛",
  nextRound: "复赛",
  
  // 选手信息
  participant: {
    name: "张三",
    avatar: "/images/users/me.jpg",
    participantNo: "BZ20240128",
    rank: 128,
    score: 86,
    totalParticipants: 1286,
  },
  
  // 下一轮比赛信息
  nextRoundInfo: {
    name: "复赛",
    type: "case", // quiz答题, case案例, live直播
    startTime: "2024-04-15 09:00",
    endTime: "2024-04-20 18:00",
    description: "真实案例分析，提交书面报告",
    format: "提交案例分析报告",
    requirements: [
      "报告字数不少于3000字",
      "需包含案例背景、分析过程、结论三部分",
      "4月20日18:00前提交",
    ],
    tips: [
      "建议提前准备素材",
      "注意时间管理，避免最后时刻提交",
      "报告需原创，禁止抄袭",
    ],
  },
}

// 庆祝粒子组件
function Confetti() {
  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-10vh) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece { animation: confettiFall linear infinite; }
      `}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti-piece absolute w-2 h-2 rounded-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              backgroundColor: ['#C41E3A', '#C9A96E', '#4A90D9', '#E67E22', '#27AE60'][i % 5],
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </>
  )
}

export default function PromotionNoticePage() {
  const params = useParams()
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background">
      {showConfetti && <Confetti />}
      
      {/* 顶部操作 */}
      <header className="sticky top-0 z-40 bg-transparent">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <button className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 庆祝动画区域 */}
      <div className="text-center pt-8 pb-6 px-4">
        {/* 装饰星星 */}
        <div className="relative inline-block mb-4">
          <Sparkles className="absolute -top-2 -left-4 w-6 h-6 text-amber-400 animate-pulse" />
          <Sparkles className="absolute -top-4 right-0 w-4 h-4 text-amber-300 animate-pulse delay-300" />
          <Sparkles className="absolute bottom-0 -right-4 w-5 h-5 text-amber-500 animate-pulse delay-500" />
          
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200">
            <Crown className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-amber-600 mb-2">恭喜晋级！</h1>
        <p className="text-muted-foreground">您已成功晋级{promotionData.nextRound}</p>
      </div>

      {/* 赛事信息 */}
      <div className="px-4 mb-4">
        <Badge className="bg-primary/10 text-primary border-0">
          <Trophy className="w-3 h-3 mr-1" />
          {promotionData.competitionTitle}
        </Badge>
      </div>

      {/* 选手信息卡片 */}
      <div className="px-4 mb-4">
        <Card className="p-4 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
              <span className="text-2xl font-bold text-amber-600">
                {promotionData.participant.name.slice(0, 1)}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">{promotionData.participant.name}</p>
              <p className="text-sm text-muted-foreground">参赛编号: {promotionData.participant.participantNo}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-amber-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{promotionData.participant.rank}</p>
              <p className="text-xs text-muted-foreground">排名</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{promotionData.participant.score}</p>
              <p className="text-xs text-muted-foreground">得分</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {Math.round((1 - promotionData.participant.rank / promotionData.participant.totalParticipants) * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">超越选手</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 下一轮比赛信息 */}
      <div className="px-4 mb-4">
        <Card className="p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {promotionData.nextRoundInfo.name}赛程安排
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">比赛时间</p>
                <p className="font-medium">{promotionData.nextRoundInfo.startTime} - {promotionData.nextRoundInfo.endTime}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Trophy className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">比赛形式</p>
                <p className="font-medium">{promotionData.nextRoundInfo.format}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-secondary rounded-xl">
            <p className="text-sm font-medium mb-2">比赛要求</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {promotionData.nextRoundInfo.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* 温馨提示 */}
      <div className="px-4 mb-6">
        <Card className="p-4 bg-amber-50 border-amber-200">
          <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-1">
            <Star className="w-4 h-4" />
            温馨提示
          </h3>
          <ul className="text-sm text-amber-700 space-y-1">
            {promotionData.nextRoundInfo.tips.map((tip, i) => (
              <li key={i}>• {tip}</li>
            ))}
          </ul>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="px-4 pb-6 space-y-3">
        <Link href={`/competition/${params.id}/poster`}>
          <Button className="w-full" variant="default">
            <Download className="w-4 h-4 mr-2" />
            生成专属海报
          </Button>
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/competition/${params.id}/result`}>
            <Button variant="outline" className="w-full">查看排行榜</Button>
          </Link>
          <Link href={`/competition/${params.id}`}>
            <Button variant="outline" className="w-full">查看赛程</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
