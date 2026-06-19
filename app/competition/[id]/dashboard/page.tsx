"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Users, Trophy, TrendingUp, Clock, CheckCircle, AlertCircle, 
  BarChart3, PieChart, Download, RefreshCw, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Mock数据看板数据
const dashboardData = {
  competitionId: "1",
  competitionTitle: "2024热卜杯·八字命理大赛",
  status: "ongoing",
  currentRound: "初赛",
  
  // 概览数据
  overview: {
    totalRegistrations: 1286,
    totalParticipants: 1156, // 实际参赛
    promotedCount: 500,
    completedRate: 89.7, // 完赛率
    avgScore: 72.5,
  },
  
  // 报名趋势（最近7天）
  registrationTrend: [
    { date: "03-18", count: 45 },
    { date: "03-19", count: 68 },
    { date: "03-20", count: 92 },
    { date: "03-21", count: 156 },
    { date: "03-22", count: 234 },
    { date: "03-23", count: 312 },
    { date: "03-24", count: 379 },
  ],
  
  // 组别分布
  groupDistribution: [
    { name: "新手组", count: 456, percentage: 35.5, color: "bg-blue-500" },
    { name: "进阶组", count: 512, percentage: 39.8, color: "bg-green-500" },
    { name: "高手组", count: 318, percentage: 24.7, color: "bg-amber-500" },
  ],
  
  // 各赛程状态
  roundsStatus: [
    { 
      name: "初赛", 
      status: "ongoing",
      startTime: "2024-04-01",
      endTime: "2024-04-07",
      participants: 1156,
      completed: 892,
      avgScore: 72.5,
      passLine: 70,
      passCount: 586,
    },
    { 
      name: "复赛", 
      status: "upcoming",
      startTime: "2024-04-15",
      endTime: "2024-04-20",
      participants: 0,
      completed: 0,
      avgScore: 0,
      passLine: 80,
      passCount: 0,
    },
    { 
      name: "决赛", 
      status: "upcoming",
      startTime: "2024-04-28",
      endTime: "2024-04-28",
      participants: 0,
      completed: 0,
      avgScore: 0,
      passLine: 0,
      passCount: 0,
    },
  ],
  
  // 实时答题进度（初赛进行中时）
  liveProgress: {
    total: 1156,
    inProgress: 124,
    completed: 892,
    notStarted: 140,
  },
  
  // 分数分布
  scoreDistribution: [
    { range: "90-100", count: 45, percentage: 5 },
    { range: "80-89", count: 156, percentage: 17.5 },
    { range: "70-79", count: 385, percentage: 43.2 },
    { range: "60-69", count: 198, percentage: 22.2 },
    { range: "0-59", count: 108, percentage: 12.1 },
  ],
}

export default function CompetitionDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const maxTrendCount = Math.max(...dashboardData.registrationTrend.map(t => t.count))

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-medium">数据看板</h1>
          <button onClick={handleRefresh} className={cn(isRefreshing && "animate-spin")}>
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 赛事信息 */}
      <div className="bg-primary text-primary-foreground px-4 pb-4 pt-2">
        <p className="text-white/80 text-sm mb-1">{dashboardData.competitionTitle}</p>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/20 text-white border-0">
            {dashboardData.currentRound}
          </Badge>
          <Badge className="bg-green-500 text-white border-0">
            进行中
          </Badge>
        </div>
      </div>

      {/* 核心数据卡片 */}
      <div className="px-4 -mt-2">
        <Card className="p-4">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{dashboardData.overview.totalRegistrations}</p>
              <p className="text-xs text-muted-foreground">报名人数</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{dashboardData.overview.totalParticipants}</p>
              <p className="text-xs text-muted-foreground">参赛人数</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{dashboardData.overview.completedRate}%</p>
              <p className="text-xs text-muted-foreground">完赛率</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{dashboardData.overview.avgScore}</p>
              <p className="text-xs text-muted-foreground">平均分</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab切换 */}
      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-9">
            <TabsTrigger value="overview" className="text-xs">数据概览</TabsTrigger>
            <TabsTrigger value="rounds" className="text-xs">赛程统计</TabsTrigger>
            <TabsTrigger value="live" className="text-xs">实时进度</TabsTrigger>
          </TabsList>
          
          {/* 数据概览 */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* 报名趋势 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  报名趋势
                </h3>
                <span className="text-xs text-muted-foreground">最近7天</span>
              </div>
              <div className="flex items-end gap-2 h-32">
                {dashboardData.registrationTrend.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-primary/80 rounded-t"
                      style={{ height: `${(item.count / maxTrendCount) * 100}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">{item.date.slice(3)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 组别分布 */}
            <Card className="p-4">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                组别分布
              </h3>
              <div className="space-y-3">
                {dashboardData.groupDistribution.map(group => (
                  <div key={group.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{group.name}</span>
                      <span className="text-muted-foreground">{group.count}人 ({group.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", group.color)}
                        style={{ width: `${group.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 分数分布 */}
            <Card className="p-4">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                分数分布
              </h3>
              <div className="space-y-2">
                {dashboardData.scoreDistribution.map(item => (
                  <div key={item.range} className="flex items-center gap-3">
                    <span className="text-sm w-16 text-muted-foreground">{item.range}</span>
                    <div className="flex-1 h-6 bg-secondary rounded overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded flex items-center justify-end px-2",
                          item.range.startsWith("9") ? "bg-green-500" :
                          item.range.startsWith("8") ? "bg-blue-500" :
                          item.range.startsWith("7") ? "bg-primary" :
                          item.range.startsWith("6") ? "bg-amber-500" :
                          "bg-red-400"
                        )}
                        style={{ width: `${item.percentage}%`, minWidth: item.percentage > 5 ? 'auto' : '30px' }}
                      >
                        <span className="text-xs text-white font-medium">{item.count}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
          
          {/* 赛程统计 */}
          <TabsContent value="rounds" className="mt-4 space-y-4">
            {dashboardData.roundsStatus.map((round, index) => (
              <Card key={round.name} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{round.name}</h3>
                    <Badge variant={
                      round.status === "ongoing" ? "default" :
                      round.status === "ended" ? "secondary" :
                      "outline"
                    }>
                      {round.status === "ongoing" ? "进行中" :
                       round.status === "ended" ? "已结束" : "未开始"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {round.startTime} - {round.endTime}
                  </span>
                </div>
                
                {round.status !== "upcoming" ? (
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold">{round.participants}</p>
                      <p className="text-xs text-muted-foreground">参赛</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{round.completed}</p>
                      <p className="text-xs text-muted-foreground">完成</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{round.avgScore}</p>
                      <p className="text-xs text-muted-foreground">均分</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{round.passCount}</p>
                      <p className="text-xs text-muted-foreground">晋级</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    比赛尚未开始
                  </p>
                )}
              </Card>
            ))}
          </TabsContent>
          
          {/* 实时进度 */}
          <TabsContent value="live" className="mt-4 space-y-4">
            <Card className="p-4">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                实时答题进度
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      已完成
                    </span>
                    <span>{dashboardData.liveProgress.completed}</span>
                  </div>
                  <Progress 
                    value={(dashboardData.liveProgress.completed / dashboardData.liveProgress.total) * 100} 
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      答题中
                    </span>
                    <span>{dashboardData.liveProgress.inProgress}</span>
                  </div>
                  <Progress 
                    value={(dashboardData.liveProgress.inProgress / dashboardData.liveProgress.total) * 100} 
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                      未开始
                    </span>
                    <span>{dashboardData.liveProgress.notStarted}</span>
                  </div>
                  <Progress 
                    value={(dashboardData.liveProgress.notStarted / dashboardData.liveProgress.total) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  完成率: {Math.round((dashboardData.liveProgress.completed / dashboardData.liveProgress.total) * 100)}%
                </p>
              </div>
            </Card>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Link href={`/competition/${params.id}/participants`} className="flex-1">
                <Button variant="outline" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  选手管理
                </Button>
              </Link>
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                导出数据
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
