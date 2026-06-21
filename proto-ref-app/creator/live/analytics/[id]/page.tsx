"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { 
  ChevronLeft, Eye, Users, Clock, TrendingUp, Heart, MessageCircle,
  Gift, ShoppingBag, Play, Download, Share2, BarChart3, PieChart,
  MapPin, Calendar, DollarSign, Target, Zap, Star, Upload, Lock,
  ArrowUp, ArrowDown, Minus
} from "lucide-react"
import { cn } from "@/lib/utils"

// 模拟直播数据
const liveData = {
  id: "1",
  title: "八字命理入门：如何快速解读四柱八字",
  cover: "",
  type: "knowledge",
  startTime: "2024-01-15 19:00",
  endTime: "2024-01-15 21:35",
  duration: "2小时35分钟",
  status: "ended",
}

// 核心数据
const coreStats = [
  { label: "总观看人数", value: "12,580", change: "+23%", trend: "up", icon: Eye },
  { label: "峰值在线", value: "3,256", change: "+15%", trend: "up", icon: Users },
  { label: "平均观看时长", value: "18分32秒", change: "+8%", trend: "up", icon: Clock },
  { label: "新增关注", value: "428", change: "+45%", trend: "up", icon: Heart },
  { label: "加入圈子", value: "156", change: "+32%", trend: "up", icon: Target },
  { label: "打赏收入", value: "¥2,680", change: "+18%", trend: "up", icon: Gift },
]

// 流量趋势数据（简化展示）
const trafficData = [
  { time: "19:00", value: 120 },
  { time: "19:15", value: 580 },
  { time: "19:30", value: 1200 },
  { time: "19:45", value: 2100 },
  { time: "20:00", value: 2850 },
  { time: "20:15", value: 3256 }, // 峰值
  { time: "20:30", value: 2980 },
  { time: "20:45", value: 2650 },
  { time: "21:00", value: 2200 },
  { time: "21:15", value: 1800 },
  { time: "21:30", value: 1200 },
]

// 观众画像
const audienceData = {
  gender: [
    { label: "男性", value: 42, color: "bg-blue-500" },
    { label: "女性", value: 55, color: "bg-pink-500" },
    { label: "未知", value: 3, color: "bg-gray-400" },
  ],
  age: [
    { label: "18-24", value: 15 },
    { label: "25-34", value: 38 },
    { label: "35-44", value: 28 },
    { label: "45-54", value: 14 },
    { label: "55+", value: 5 },
  ],
  region: [
    { name: "广东", value: 18 },
    { name: "北京", value: 15 },
    { name: "浙江", value: 12 },
    { name: "江苏", value: 10 },
    { name: "上海", value: 8 },
    { name: "其他", value: 37 },
  ],
  source: [
    { label: "首页推荐", value: 35, icon: "🏠" },
    { label: "关注列表", value: 28, icon: "❤️" },
    { label: "直播广场", value: 18, icon: "📺" },
    { label: "分享链接", value: 12, icon: "🔗" },
    { label: "搜索", value: 7, icon: "🔍" },
  ],
}

// 互动数据
const interactionData = {
  danmaku: 8650,
  likes: 58600,
  comments: 1280,
  shares: 456,
  gifts: [
    { name: "太极", count: 2580, amount: 2580 },
    { name: "梅花", count: 156, amount: 1560 },
    { name: "竹简", count: 28, amount: 1456 },
    { name: "罗盘", count: 12, amount: 1188 },
  ],
}

// 热词云数据
const wordCloud = [
  { word: "八字", size: "text-2xl", color: "text-primary" },
  { word: "命理", size: "text-xl", color: "text-violet-500" },
  { word: "四柱", size: "text-lg", color: "text-blue-500" },
  { word: "干货", size: "text-base", color: "text-amber-500" },
  { word: "老师好", size: "text-lg", color: "text-green-500" },
  { word: "学到了", size: "text-xl", color: "text-pink-500" },
  { word: "感谢", size: "text-base", color: "text-cyan-500" },
  { word: "收藏", size: "text-sm", color: "text-orange-500" },
  { word: "精彩", size: "text-base", color: "text-red-500" },
  { word: "厉害", size: "text-sm", color: "text-indigo-500" },
]

// 商品数据（电商直播）
const productStats = [
  { id: 1, name: "渊海子平精装版", clicks: 3560, orders: 128, amount: 6272, conversion: 3.6 },
  { id: 2, name: "专业罗盘", clicks: 2890, orders: 45, amount: 8910, conversion: 1.6 },
  { id: 3, name: "五帝钱套装", clicks: 2150, orders: 89, amount: 3382, conversion: 4.1 },
]

// 回放数据
const replayData = {
  playCount: 2580,
  playDuration: "平均12分钟",
  revenue: 0,
  isPublic: true,
  isPaid: false,
}

export default function LiveAnalyticsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [replayPublic, setReplayPublic] = useState(replayData.isPublic)
  const [replayPaid, setReplayPaid] = useState(replayData.isPaid)
  
  // 计算趋势图最大值用于归一化
  const maxTraffic = Math.max(...trafficData.map(d => d.value))

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-sm line-clamp-1">{liveData.title}</h1>
              <p className="text-xs text-muted-foreground">{liveData.startTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Download className="w-3.5 h-3.5 mr-1" />
              导出报告
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Share2 className="w-3.5 h-3.5 mr-1" />
              分享
            </Button>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start px-4 h-10 bg-transparent border-b border-border rounded-none overflow-x-auto">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">数据总览</TabsTrigger>
          <TabsTrigger value="traffic" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">流量分析</TabsTrigger>
          <TabsTrigger value="audience" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">观众画像</TabsTrigger>
          <TabsTrigger value="interaction" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">互动分析</TabsTrigger>
          <TabsTrigger value="replay" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">回放管理</TabsTrigger>
        </TabsList>

        {/* 数据总览 */}
        <TabsContent value="overview" className="mt-0 px-4 py-4 space-y-4">
          {/* 直播信息卡片 */}
          <Card className="p-4">
            <div className="flex gap-3">
              <div className="w-24 h-16 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Play className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {liveData.type === "knowledge" ? "知识授课" : "电商带货"}
                  </Badge>
                  <Badge className="text-[10px] bg-gray-500">已结束</Badge>
                </div>
                <p className="text-sm font-medium mt-1 line-clamp-1">{liveData.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  时长：{liveData.duration}
                </p>
              </div>
            </div>
          </Card>

          {/* 核心数据卡片 */}
          <div className="grid grid-cols-2 gap-3">
            {coreStats.map((stat) => (
              <Card key={stat.label} className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    stat.trend === "up" ? "bg-green-500/10" : stat.trend === "down" ? "bg-red-500/10" : "bg-gray-500/10"
                  )}>
                    <stat.icon className={cn(
                      "w-4 h-4",
                      stat.trend === "up" ? "text-green-500" : stat.trend === "down" ? "text-red-500" : "text-gray-500"
                    )} />
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-xs",
                  stat.trend === "up" ? "text-green-500" : stat.trend === "down" ? "text-red-500" : "text-muted-foreground"
                )}>
                  {stat.trend === "up" ? <ArrowUp className="w-3 h-3" /> : 
                   stat.trend === "down" ? <ArrowDown className="w-3 h-3" /> : 
                   <Minus className="w-3 h-3" />}
                  <span>较上场 {stat.change}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* 快速洞察 */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              AI复盘洞察
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-500/5 border border-green-500/20">
                <Star className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-400">
                  本场直播观看量较上场增长23%，20:15达到峰值3256人，建议在此时间段安排重点内容。
                </p>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  关注转化率达3.4%，高于平台均值2.1%。25-44岁用户占比66%，建议针对此人群优化内容。
                </p>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <TrendingUp className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  弹幕高频词"八字""命理"说明用户对核心主题高度关注，可考虑开设进阶系列课程。
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 流量分析 */}
        <TabsContent value="traffic" className="mt-0 px-4 py-4 space-y-4">
          {/* 流量趋势图 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                在线人数趋势
              </h3>
              <Badge variant="outline" className="text-[10px]">峰值 3,256</Badge>
            </div>
            
            {/* 简化的趋势图 */}
            <div className="h-40 flex items-end gap-1.5">
              {trafficData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className={cn(
                      "w-full rounded-t transition-all",
                      item.value === maxTraffic ? "bg-primary" : "bg-primary/40"
                    )}
                    style={{ height: `${(item.value / maxTraffic) * 100}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground transform -rotate-45 origin-top-left translate-y-2">
                    {item.time.split(":")[1]}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs text-muted-foreground">
              <span>19:00</span>
              <span>20:00</span>
              <span>21:00</span>
              <span>21:35</span>
            </div>
          </Card>

          {/* 关键时刻 */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">关键时刻</h3>
            <div className="space-y-3">
              {[
                { time: "19:05", event: "直播开始", desc: "120人进入直播间" },
                { time: "20:15", event: "峰值在线", desc: "在线人数达到3256人，正在讲解八字排盘基础" },
                { time: "20:45", event: "互动高峰", desc: "弹幕数量达到峰值，观众提问活跃" },
                { time: "21:30", event: "直播结束", desc: "累计观看12580人，平均时长18分32秒" },
              ].map((item, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {index < 3 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{item.time}</span>
                      <Badge variant="secondary" className="text-[10px]">{item.event}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* 观众画像 */}
        <TabsContent value="audience" className="mt-0 px-4 py-4 space-y-4">
          {/* 性别分布 */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <PieChart className="w-4 h-4 text-primary" />
              性别分布
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 via-pink-500 to-pink-500 p-1 relative">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {audienceData.gender.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", item.color)} />
                    <span className="text-xs flex-1">{item.label}</span>
                    <span className="text-xs font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* 年龄分布 */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">年龄分布</h3>
            <div className="space-y-3">
              {audienceData.age.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{item.label}岁</span>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                  <Progress value={item.value} className="h-2" />
                </div>
              ))}
            </div>
          </Card>

          {/* 地域分布 */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-primary" />
              地域Top5
            </h3>
            <div className="space-y-2">
              {audienceData.region.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    index === 0 ? "bg-amber-500 text-white" :
                    index === 1 ? "bg-gray-400 text-white" :
                    index === 2 ? "bg-amber-700 text-white" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {index + 1}
                  </span>
                  <span className="text-sm flex-1">{item.name}</span>
                  <span className="text-sm font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 来源渠道 */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">来源渠道</h3>
            <div className="grid grid-cols-2 gap-2">
              {audienceData.source.map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{item.label}</p>
                    <p className="text-sm font-bold">{item.value}%</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* 互动分析 */}
        <TabsContent value="interaction" className="mt-0 px-4 py-4 space-y-4">
          {/* 互动数据概览 */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "弹幕", value: interactionData.danmaku, icon: MessageCircle },
              { label: "点赞", value: interactionData.likes, icon: Heart },
              { label: "评论", value: interactionData.comments, icon: MessageCircle },
              { label: "分享", value: interactionData.shares, icon: Share2 },
            ].map((item) => (
              <Card key={item.label} className="p-2.5 text-center">
                <item.icon className="w-4 h-4 mx-auto text-muted-foreground" />
                <p className="text-sm font-bold mt-1">{item.value.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </Card>
            ))}
          </div>

          {/* 弹幕词云 */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">弹幕热词</h3>
            <div className="flex flex-wrap gap-2 justify-center py-4">
              {wordCloud.map((item, index) => (
                <span 
                  key={index}
                  className={cn("font-medium", item.size, item.color)}
                  style={{ transform: `rotate(${Math.random() * 10 - 5}deg)` }}
                >
                  {item.word}
                </span>
              ))}
            </div>
          </Card>

          {/* 打赏明细 */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-amber-500" />
              打赏明细
            </h3>
            <div className="space-y-2">
              {interactionData.gifts.map((gift, index) => (
                <div key={gift.name} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                  <span className="text-sm flex-1">{gift.name}</span>
                  <span className="text-xs text-muted-foreground">{gift.count}个</span>
                  <span className="text-sm font-bold text-amber-500">¥{gift.amount}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 商品点击与成交（电商直播） */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <ShoppingBag className="w-4 h-4 text-primary" />
              商品数据Top3
            </h3>
            <div className="space-y-3">
              {productStats.map((product, index) => (
                <div key={product.id} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                      index === 0 ? "bg-amber-500" : index === 1 ? "bg-gray-400" : "bg-amber-700"
                    )}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium flex-1 truncate">{product.name}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">点击</p>
                      <p className="text-sm font-medium">{product.clicks}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">下单</p>
                      <p className="text-sm font-medium">{product.orders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">成交</p>
                      <p className="text-sm font-medium text-primary">¥{product.amount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">转化率</p>
                      <p className="text-sm font-medium">{product.conversion}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* 回放管理 */}
        <TabsContent value="replay" className="mt-0 px-4 py-4 space-y-4">
          {/* 回放数据 */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Play className="w-4 h-4 text-primary" />
              回放数据
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xl font-bold">{replayData.playCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">播放次数</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xl font-bold">{replayData.playDuration}</p>
                <p className="text-xs text-muted-foreground">平均时长</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xl font-bold">¥{replayData.revenue}</p>
                <p className="text-xs text-muted-foreground">回放收益</p>
              </div>
            </div>
          </Card>

          {/* 回放设置 */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-sm">回放设置</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">公开回放</p>
                <p className="text-xs text-muted-foreground">允许所有用户观看直播回放</p>
              </div>
              <Switch checked={replayPublic} onCheckedChange={setReplayPublic} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">付费观看</p>
                <p className="text-xs text-muted-foreground">设置回放为付费内容</p>
              </div>
              <Switch checked={replayPaid} onCheckedChange={setReplayPaid} />
            </div>

            {replayPaid && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  付费价格将在保存后设置，建议定价区间：9.9-99元
                </p>
              </div>
            )}
          </Card>

          {/* 上架操作 */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">上架至</h3>
            
            <Button variant="outline" className="w-full justify-start h-auto py-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mr-3">
                <Upload className="w-5 h-5 text-violet-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">上架为付费课程</p>
                <p className="text-xs text-muted-foreground">将回放转为独立课程销售</p>
              </div>
            </Button>

            <Button variant="outline" className="w-full justify-start h-auto py-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">设为圈子专属</p>
                <p className="text-xs text-muted-foreground">仅圈子成员可观看回放</p>
              </div>
            </Button>
          </Card>

          {/* 回放预览 */}
          <Card className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
              <Play className="w-12 h-12 text-white/50" />
              <Badge className="absolute top-2 left-2 text-[10px]">回放</Badge>
              <span className="absolute bottom-2 right-2 text-xs text-white/70">{liveData.duration}</span>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium line-clamp-1">{liveData.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{liveData.startTime}</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
