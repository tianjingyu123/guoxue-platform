"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { 
  Calendar, Users, Clock, TrendingUp, TrendingDown,
  Gift, UserPlus, MessageCircle, HelpCircle, ShoppingBag, Eye,
  ChevronDown, MapPin, BarChart3
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 直播场次数据
const liveSessionsData = [
  { id: 1, title: "八字命理入门直播课", date: "2024-01-15 19:00", duration: "2:35:42", viewers: 1280, type: "knowledge" },
  { id: 2, title: "风水开运好物分享", date: "2024-01-12 20:00", duration: "1:48:30", viewers: 856, type: "ecommerce" },
  { id: 3, title: "紫微斗数答疑专场", date: "2024-01-08 19:30", duration: "2:12:15", viewers: 1024, type: "knowledge" },
]

// 当前直播数据
const currentLiveData = {
  id: 1,
  title: "八字命理入门直播课",
  date: "2024-01-15 19:00-21:36",
  type: "knowledge",
  // 核心指标
  totalViewers: 1280,
  peakOnline: 486,
  duration: "2:35:42",
  avgWatchTime: "18:32",
  tipsIncome: 2860,
  tipsRMB: 286,
  newFollowers: 128,
  // 流量趋势（每5分钟一个点）
  trafficTrend: [120, 180, 245, 320, 380, 420, 486, 465, 430, 410, 385, 350, 320, 290, 260, 230, 200, 180, 160, 140, 120, 100, 85, 70, 56, 42, 30, 20, 15, 10],
  // 流量来源
  trafficSources: [
    { source: "首页推荐", count: 512, percent: 40 },
    { source: "关注进入", count: 384, percent: 30 },
    { source: "圈子入口", count: 192, percent: 15 },
    { source: "搜索", count: 128, percent: 10 },
    { source: "分享", count: 64, percent: 5 },
  ],
  // 互动数据
  totalComments: 3568,
  qaCount: 45,
  hotWords: ["八字", "命理", "运势", "财运", "婚姻", "事业", "流年", "大运", "日主", "十神"],
  // 带货数据（电商直播才有）
  salesData: null,
  // 观众画像
  audienceProfile: {
    gender: { male: 35, female: 65 },
    regions: [
      { name: "广东", percent: 18 },
      { name: "北京", percent: 12 },
      { name: "上海", percent: 10 },
      { name: "江苏", percent: 8 },
      { name: "浙江", percent: 7 },
      { name: "其他", percent: 45 },
    ],
    interests: ["八字命理", "风水堪舆", "紫微斗数", "国学经典", "养生文化"],
  },
}

// 电商直播带货数据
const ecommerceSalesData = {
  totalOrders: 156,
  totalAmount: 28600,
  products: [
    { id: 1, name: "开运水晶手链", clicks: 680, orders: 68, amount: 6800, rate: 10 },
    { id: 2, name: "罗盘风水摆件", clicks: 420, orders: 42, amount: 12600, rate: 10 },
    { id: 3, name: "《渊海子平》古籍", clicks: 380, orders: 38, amount: 7600, rate: 10 },
    { id: 4, name: "紫檀木佛珠", clicks: 280, orders: 8, amount: 1600, rate: 2.9 },
  ],
}

export default function LiveAnalyticsPage() {
  const [selectedSession, setSelectedSession] = useState(liveSessionsData[0])
  const [showSessionPicker, setShowSessionPicker] = useState(false)
  
  // 根据直播类型决定是否显示带货数据
  const isEcommerce = selectedSession.type === "ecommerce"
  const salesData = isEcommerce ? ecommerceSalesData : null
  
  // 流量趋势最大值
  const maxTraffic = Math.max(...currentLiveData.trafficTrend)

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
  <div className="flex items-center gap-3">
  <BackButton fallbackPath="/manage/live" />
  <h1 className="font-semibold text-base text-foreground">直播数据</h1>
          </div>
          <button className="p-2 rounded-full hover:bg-secondary">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* 直播场次选择 */}
      <div className="px-4 py-3">
        <button
          onClick={() => setShowSessionPicker(!showSessionPicker)}
          className="w-full flex items-center justify-between p-3 bg-card rounded-xl border border-border"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{selectedSession.title}</p>
              <p className="text-xs text-muted-foreground">{selectedSession.date}</p>
            </div>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", showSessionPicker && "rotate-180")} />
        </button>
        
        {/* 场次下拉列表 */}
        {showSessionPicker && (
          <Card className="mt-2 divide-y divide-border overflow-hidden">
            {liveSessionsData.map(session => (
              <button
                key={session.id}
                onClick={() => { setSelectedSession(session); setShowSessionPicker(false) }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/50 transition-colors",
                  selectedSession.id === session.id && "bg-primary/5"
                )}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{session.title}</p>
                  <p className="text-xs text-muted-foreground">{session.date} · {session.duration}</p>
                </div>
                <Badge variant="outline" className={cn(
                  "text-[10px]",
                  session.type === "knowledge" ? "border-blue-500/30 text-blue-500" : "border-orange-500/30 text-orange-500"
                )}>
                  {session.type === "knowledge" ? "知识" : "带货"}
                </Badge>
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* 核心指标卡片 */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">总观看</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{currentLiveData.totalViewers.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">峰值 {currentLiveData.peakOnline} 人</p>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">直播时长</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{currentLiveData.duration}</p>
          <p className="text-xs text-muted-foreground mt-1">人均 {currentLiveData.avgWatchTime}</p>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">打赏收入</span>
          </div>
          <p className="text-2xl font-bold text-accent">{currentLiveData.tipsIncome.toLocaleString()}<span className="text-sm font-normal ml-1">币</span></p>
          <p className="text-xs text-muted-foreground mt-1">约 ¥{currentLiveData.tipsRMB}</p>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">新增关注</span>
          </div>
          <p className="text-2xl font-bold text-foreground">+{currentLiveData.newFollowers}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-500">+12%</span>
          </div>
        </Card>
      </div>

      {/* 流量趋势图 */}
      <div className="px-4 mt-6">
        <h2 className="font-semibold text-sm text-foreground mb-3">在线人数趋势</h2>
        <Card className="p-4">
          <div className="h-40 flex items-end gap-[2px]">
            {currentLiveData.trafficTrend.map((value, index) => (
              <div
                key={index}
                className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors cursor-pointer"
                style={{ height: `${(value / maxTraffic) * 100}%` }}
                title={`${value}人在线`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <span>19:00</span>
            <span>20:00</span>
            <span>21:00</span>
            <span>21:36</span>
          </div>
        </Card>
      </div>

      {/* 流量来源 */}
      <div className="px-4 mt-6">
        <h2 className="font-semibold text-sm text-foreground mb-3">流量来源</h2>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            {/* 环形图 */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {currentLiveData.trafficSources.reduce((acc, source, index) => {
                  const colors = ["#C53030", "#3182CE", "#38A169", "#D69E2E", "#805AD5"]
                  const startPercent = acc.total
                  const endPercent = startPercent + source.percent
                  const largeArc = source.percent > 50 ? 1 : 0
                  const startX = 50 + 40 * Math.cos(2 * Math.PI * startPercent / 100)
                  const startY = 50 + 40 * Math.sin(2 * Math.PI * startPercent / 100)
                  const endX = 50 + 40 * Math.cos(2 * Math.PI * endPercent / 100)
                  const endY = 50 + 40 * Math.sin(2 * Math.PI * endPercent / 100)
                  acc.paths.push(
                    <path
                      key={index}
                      d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`}
                      fill={colors[index]}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  )
                  acc.total = endPercent
                  return acc
                }, { paths: [] as JSX.Element[], total: 0 }).paths}
              </svg>
            </div>
            {/* 图例 */}
            <div className="flex-1 space-y-2">
              {currentLiveData.trafficSources.map((source, index) => {
                const colors = ["bg-primary", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"]
                return (
                  <div key={source.source} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", colors[index])} />
                      <span className="text-muted-foreground">{source.source}</span>
                    </div>
                    <span className="text-foreground font-medium">{source.percent}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* 互动分析 */}
      <div className="px-4 mt-6">
        <h2 className="font-semibold text-sm text-foreground mb-3">互动分析</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">弹幕��数</span>
            </div>
            <p className="text-xl font-bold text-foreground">{currentLiveData.totalComments.toLocaleString()}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">问答次数</span>
            </div>
            <p className="text-xl font-bold text-foreground">{currentLiveData.qaCount}</p>
          </Card>
        </div>
        
        {/* 热词云 */}
        <Card className="mt-3 p-4">
          <p className="text-xs text-muted-foreground mb-3">热门弹幕词</p>
          <div className="flex flex-wrap gap-2">
            {currentLiveData.hotWords.map((word, index) => (
              <Badge 
                key={word} 
                variant="secondary"
                className={cn(
                  "text-xs",
                  index < 3 && "bg-primary/10 text-primary border-primary/20"
                )}
              >
                {word}
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      {/* 带货数据（电商直播） */}
      {salesData && (
        <div className="px-4 mt-6">
          <h2 className="font-semibold text-sm text-foreground mb-3">带货数据</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">成交订单</span>
              </div>
              <p className="text-xl font-bold text-foreground">{salesData.totalOrders}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">成交金额</span>
              </div>
              <p className="text-xl font-bold text-primary">¥{salesData.totalAmount.toLocaleString()}</p>
            </Card>
          </div>
          
          {/* 商品讲解排行 */}
          <Card className="divide-y divide-border">
            <div className="p-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>商品</span>
              <div className="flex items-center gap-6">
                <span>点击</span>
                <span>成交</span>
                <span>转化率</span>
              </div>
            </div>
            {salesData.products.map((product, index) => (
              <div key={product.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-5 h-5 rounded text-xs flex items-center justify-center font-medium",
                    index === 0 ? "bg-primary text-primary-foreground" :
                    index === 1 ? "bg-accent text-accent-foreground" :
                    index === 2 ? "bg-orange-500 text-white" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {index + 1}
                  </span>
                  <span className="text-sm text-foreground">{product.name}</span>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <span className="w-10 text-right text-muted-foreground">{product.clicks}</span>
                  <span className="w-10 text-right text-foreground">{product.orders}</span>
                  <span className="w-12 text-right text-primary font-medium">{product.rate}%</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* 观众画像 */}
      <div className="px-4 mt-6">
        <h2 className="font-semibold text-sm text-foreground mb-3">观众画像</h2>
        
        {/* 性别分布 */}
        <Card className="p-4 mb-3">
          <p className="text-xs text-muted-foreground mb-3">性别分布</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden flex">
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${currentLiveData.audienceProfile.gender.male}%` }}
              />
              <div 
                className="h-full bg-pink-500" 
                style={{ width: `${currentLiveData.audienceProfile.gender.female}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">男 {currentLiveData.audienceProfile.gender.male}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-pink-500" />
              <span className="text-muted-foreground">女 {currentLiveData.audienceProfile.gender.female}%</span>
            </div>
          </div>
        </Card>
        
        {/* 地域分布 */}
        <Card className="p-4 mb-3">
          <p className="text-xs text-muted-foreground mb-3">地域TOP5</p>
          <div className="space-y-2">
            {currentLiveData.audienceProfile.regions.slice(0, 5).map((region, index) => (
              <div key={region.name} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-16">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-foreground">{region.name}</span>
                </div>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", index === 0 ? "bg-primary" : "bg-primary/60")}
                    style={{ width: `${region.percent * 3}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{region.percent}%</span>
              </div>
            ))}
          </div>
        </Card>
        
        {/* 兴趣标签 */}
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-3">兴趣偏好</p>
          <div className="flex flex-wrap gap-2">
            {currentLiveData.audienceProfile.interests.map(interest => (
              <Badge key={interest} variant="outline" className="text-xs">
                {interest}
              </Badge>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
