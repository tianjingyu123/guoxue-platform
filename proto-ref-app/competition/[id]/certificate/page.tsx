"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, Share2, Award, Calendar, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Mock证书数据
const certificateData = {
  id: "cert-001",
  competitionId: "1",
  competitionTitle: "2024热卜杯·八字命理大赛",
  roundName: "初赛",
  participantName: "张三",
  rank: 128,
  award: "优秀选手",
  score: 86,
  certificateNo: "RBBS2024-0128",
  issueDate: "2024-04-08",
  validUntil: "永久有效",
}

export default function CertificatePage() {
  const params = useParams()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-transparent">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-medium">电子证书</h1>
          <button className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 证书展示 */}
      <div className="px-4 py-6">
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-amber-50 border-2 border-amber-200">
          {/* 装饰边框 */}
          <div className="absolute inset-2 border-2 border-amber-300/50 rounded-lg pointer-events-none" />
          <div className="absolute inset-4 border border-amber-200/50 rounded pointer-events-none" />
          
          {/* 角落装饰 */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-400" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-400" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-amber-400" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-400" />
          
          <div className="relative p-8 text-center">
            {/* 证书标题 */}
            <div className="mb-6">
              <Award className="w-12 h-12 text-amber-500 mx-auto mb-2" />
              <h1 className="text-2xl font-bold text-amber-800 tracking-widest">荣 誉 证 书</h1>
              <p className="text-sm text-amber-600 mt-1">CERTIFICATE OF HONOR</p>
            </div>
            
            {/* 获奖信息 */}
            <div className="space-y-4 text-gray-800">
              <p className="text-lg">
                兹证明 <span className="text-2xl font-bold text-primary mx-2 border-b-2 border-primary px-2">{certificateData.participantName}</span> 同志
              </p>
              
              <p className="text-lg leading-relaxed">
                在 <span className="font-medium text-amber-700">{certificateData.competitionTitle}</span> 中
              </p>
              
              <p className="text-lg">
                以 <span className="text-xl font-bold text-primary">{certificateData.score}</span> 分的成绩
              </p>
              
              <p className="text-lg">
                获得 <span className="text-xl font-bold text-amber-600">{certificateData.award}</span> 称号
              </p>
              
              <p className="text-lg">
                排名第 <span className="text-xl font-bold text-primary">{certificateData.rank}</span> 名
              </p>
            </div>
            
            {/* 特此证明 */}
            <p className="text-gray-600 mt-6">特此证明</p>
            
            {/* 签发信息 */}
            <div className="mt-8 flex items-end justify-between px-4">
              <div className="text-left">
                <p className="text-sm text-gray-500">证书编号</p>
                <p className="font-mono text-sm">{certificateData.certificateNo}</p>
              </div>
              
              <div className="text-center">
                {/* 印章区域 */}
                <div className="w-20 h-20 mx-auto border-4 border-red-500 rounded-full flex items-center justify-center">
                  <span className="text-red-500 text-xs font-bold text-center leading-tight">
                    热卜<br/>国学平台
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-500">签发日期</p>
                <p className="text-sm">{certificateData.issueDate}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 证书信息 */}
      <div className="px-4 mb-4">
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">赛事名称</p>
              <p className="font-medium">{certificateData.competitionTitle}</p>
            </div>
            <div>
              <p className="text-muted-foreground">获奖等级</p>
              <p className="font-medium text-amber-600">{certificateData.award}</p>
            </div>
            <div>
              <p className="text-muted-foreground">证书编号</p>
              <p className="font-mono">{certificateData.certificateNo}</p>
            </div>
            <div>
              <p className="text-muted-foreground">有效期</p>
              <p className="font-medium">{certificateData.validUntil}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="px-4 pb-6 space-y-3">
        <Button className="w-full">
          <Download className="w-4 h-4 mr-2" />
          保存为图片
        </Button>
        <Button variant="outline" className="w-full">
          <Share2 className="w-4 h-4 mr-2" />
          分享证书
        </Button>
      </div>
    </div>
  )
}
