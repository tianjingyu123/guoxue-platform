"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, Share2, Trophy, Crown, Star, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"

// Mock海报数据
const posterData = {
  competitionId: "1",
  competitionTitle: "2024热卜杯·八字命理大赛",
  roundName: "初赛",
  participantName: "张三",
  avatar: "/images/users/me.jpg",
  rank: 128,
  score: 86,
  totalParticipants: 1286,
  promotedTo: "复赛",
  qrCodeUrl: "https://rebu.com/competition/1",
}

export default function CompetitionPosterPage() {
  const params = useParams()
  const router = useRouter()

  const beatPercentage = Math.round((1 - posterData.rank / posterData.totalParticipants) * 100)

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-transparent">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-medium text-white">专属海报</h1>
          <div className="w-8" />
        </div>
      </header>

      {/* 海报预览 */}
      <div className="px-6 py-4">
        <div className="relative bg-gradient-to-br from-primary via-primary to-primary/90 rounded-2xl overflow-hidden shadow-2xl">
          {/* 装饰元素 */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-1/2" />
          
          {/* 装饰星星 */}
          <Star className="absolute top-8 left-8 w-4 h-4 text-amber-300/50" />
          <Star className="absolute top-16 right-12 w-3 h-3 text-amber-300/30" />
          <Star className="absolute bottom-32 left-12 w-3 h-3 text-amber-300/40" />
          
          <div className="relative p-6 text-white">
            {/* 顶部标签 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-300" />
                <span className="text-sm font-medium">热卜国学</span>
              </div>
              <span className="px-3 py-1 bg-amber-400/20 rounded-full text-xs text-amber-300">
                {posterData.roundName}晋级
              </span>
            </div>
            
            {/* 赛事名称 */}
            <h2 className="text-lg font-bold mb-6 leading-tight">
              {posterData.competitionTitle}
            </h2>
            
            {/* 用户信息卡片 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-amber-300" />
                </div>
                <div>
                  <p className="text-xl font-bold">{posterData.participantName}</p>
                  <p className="text-white/70 text-sm">成功晋级{posterData.promotedTo}</p>
                </div>
              </div>
              
              {/* 数据展示 */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-bold text-amber-300">{posterData.rank}</p>
                  <p className="text-xs text-white/70">排名</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-bold">{posterData.score}</p>
                  <p className="text-xs text-white/70">得分</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-400">{beatPercentage}%</p>
                  <p className="text-xs text-white/70">超越选手</p>
                </div>
              </div>
            </div>
            
            {/* 宣传语 */}
            <p className="text-center text-white/80 text-sm mb-6">
              国学高手齐聚，实战见真章！
            </p>
            
            {/* 底部：二维码和信息 */}
            <div className="flex items-center justify-between pt-4 border-t border-white/20">
              <div>
                <p className="text-xs text-white/60">扫码加入比赛</p>
                <p className="text-sm font-medium">热卜国学平台</p>
              </div>
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                <QrCode className="w-12 h-12 text-gray-800" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="px-6 pb-6 space-y-3">
        <Button className="w-full bg-white text-primary hover:bg-white/90">
          <Download className="w-4 h-4 mr-2" />
          保存到相册
        </Button>
        <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">
          <Share2 className="w-4 h-4 mr-2" />
          分享到微信
        </Button>
      </div>
    </div>
  )
}
