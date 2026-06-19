"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Trophy, Crown, Users, BookOpen, 
  ShoppingBag, Star, TrendingUp, Eye, Heart, Flame
} from "lucide-react"

// 排行榜分类
const categories = [
  { id: "circles", label: "圈子榜", icon: Users },
  { id: "creators", label: "创作者榜", icon: Crown },
  { id: "courses", label: "课程榜", icon: BookOpen },
  { id: "products", label: "商品榜", icon: ShoppingBag },
  { id: "rising", label: "新星榜", icon: TrendingUp },
]

// 圈子排行
const circleRanks = [
  { id: 1, name: "八字命理研习社", avatar: "", members: 12680, growth: 1280, owner: "张道源" },
  { id: 2, name: "紫微斗数交流圈", avatar: "", members: 9856, growth: 856, owner: "李易卿" },
  { id: 3, name: "风水堪舆实战派", avatar: "", members: 8234, growth: 623, owner: "王文昌" },
  { id: 4, name: "易经智慧学堂", avatar: "", members: 7156, growth: 512, owner: "陈玄风" },
  { id: 5, name: "六爻预测研究会", avatar: "", members: 6023, growth: 389, owner: "周易安" },
]

// 创作者排行
const creatorRanks = [
  { id: 1, name: "张道源", avatar: "", title: "八字命理专家", followers: 28600, likes: 156800, articles: 326 },
  { id: 2, name: "李易卿", avatar: "", title: "紫微斗数研究员", followers: 21500, likes: 128600, articles: 245 },
  { id: 3, name: "王文昌", avatar: "", title: "风水堪舆大师", followers: 18900, likes: 98500, articles: 189 },
  { id: 4, name: "陈玄风", avatar: "", title: "易经学者", followers: 15600, likes: 86200, articles: 156 },
  { id: 5, name: "周易安", avatar: "", title: "六爻占卜师", followers: 12800, likes: 72300, articles: 128 },
]

// 课程排行
const courseRanks = [
  { id: 1, name: "八字入门到精通", cover: "", teacher: "张道源", students: 12680, rating: 4.9, price: 299 },
  { id: 2, name: "紫微斗数实战班", cover: "", teacher: "李易卿", students: 8956, rating: 4.8, price: 399 },
  { id: 3, name: "阳宅风水精讲", cover: "", teacher: "王文昌", students: 7234, rating: 4.9, price: 499 },
  { id: 4, name: "易经六十四卦详解", cover: "", teacher: "陈玄风", students: 6156, rating: 4.7, price: 199 },
  { id: 5, name: "六爻预测从零开始", cover: "", teacher: "周易安", students: 5023, rating: 4.8, price: 249 },
]

// 商品排行
const productRanks = [
  { id: 1, name: "滴天髓精解", cover: "", sales: 3268, rating: 4.9, price: 68 },
  { id: 2, name: "子平真诠评注", cover: "", sales: 2856, rating: 4.8, price: 88 },
  { id: 3, name: "专业排盘罗盘", cover: "", sales: 2134, rating: 4.9, price: 298 },
  { id: 4, name: "穷通宝鉴白话解", cover: "", sales: 1956, rating: 4.7, price: 58 },
  { id: 5, name: "三命通会全套", cover: "", sales: 1623, rating: 4.8, price: 168 },
]

// 新星榜
const risingRanks = [
  { id: 1, name: "小易说命理", avatar: "", joinDays: 30, followers: 3680, growth: 2800 },
  { id: 2, name: "玄学新视角", avatar: "", joinDays: 45, followers: 2856, growth: 2100 },
  { id: 3, name: "紫微探秘", avatar: "", joinDays: 28, followers: 2234, growth: 1800 },
  { id: 4, name: "易学入门君", avatar: "", joinDays: 35, followers: 1956, growth: 1500 },
  { id: 5, name: "风水小课堂", avatar: "", joinDays: 42, followers: 1623, growth: 1200 },
]

// 获取排名样式
function getRankStyle(rank: number) {
  if (rank === 1) return { bg: "bg-amber-500", text: "text-white" }
  if (rank === 2) return { bg: "bg-gray-400", text: "text-white" }
  if (rank === 3) return { bg: "bg-amber-700", text: "text-white" }
  return { bg: "bg-muted", text: "text-muted-foreground" }
}

export default function RankingsPage() {
  const [activeCategory, setActiveCategory] = useState("circles")
  const [timeRange, setTimeRange] = useState<"week" | "month" | "total">("week")

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="flex items-center px-4 h-12">
          <Link href="/" className="p-1 mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <span className="font-medium">热卜榜单</span>
          </div>
        </div>
      </header>

      {/* 分类Tab */}
      <div className="sticky top-12 z-40 bg-background border-b border-border">
        <div className="flex overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeCategory === cat.id
                  ? "text-amber-600 border-amber-500"
                  : "text-muted-foreground border-transparent"
              )}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 时间筛选 */}
      <div className="px-4 py-3 flex justify-end">
        <div className="flex items-center gap-1 bg-secondary rounded-full p-0.5">
          {[
            { id: "week", label: "本周" },
            { id: "month", label: "本月" },
            { id: "total", label: "总榜" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeRange(item.id as typeof timeRange)}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                timeRange === item.id
                  ? "bg-amber-500 text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 排行榜内容 */}
      <div className="px-4 space-y-3">
        {/* 圈子榜 */}
        {activeCategory === "circles" && circleRanks.map((item, index) => {
          const rank = index + 1
          const style = getRankStyle(rank)
          return (
            <Card key={item.id} className={cn("p-4", rank <= 3 && "border-amber-200 bg-amber-50/50")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", style.bg, style.text)}>
                  {rank}
                </div>
                <Avatar className="w-12 h-12 rounded-xl">
                  <AvatarImage src={item.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary rounded-xl">
                    {item.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">圈主：{item.owner}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-600">{(item.members / 1000).toFixed(1)}k</p>
                  <p className="text-[10px] text-green-500">+{item.growth}</p>
                </div>
              </div>
            </Card>
          )
        })}

        {/* 创作者榜 */}
        {activeCategory === "creators" && creatorRanks.map((item, index) => {
          const rank = index + 1
          const style = getRankStyle(rank)
          return (
            <Card key={item.id} className={cn("p-4", rank <= 3 && "border-amber-200 bg-amber-50/50")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", style.bg, style.text)}>
                  {rank}
                </div>
                <Avatar className="w-12 h-12">
                  <AvatarImage src={item.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {item.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Users className="w-3 h-3" />
                      {(item.followers / 1000).toFixed(1)}k
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Heart className="w-3 h-3" />
                      {(item.likes / 1000).toFixed(1)}k
                    </span>
                    <span className="flex items-center gap-0.5">
                      <BookOpen className="w-3 h-3" />
                      {item.articles}篇
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}

        {/* 课程榜 */}
        {activeCategory === "courses" && courseRanks.map((item, index) => {
          const rank = index + 1
          const style = getRankStyle(rank)
          return (
            <Card key={item.id} className={cn("p-4", rank <= 3 && "border-amber-200 bg-amber-50/50")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", style.bg, style.text)}>
                  {rank}
                </div>
                <div className="w-16 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.teacher}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{item.students}人学习</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                      <Star className="w-3 h-3 fill-current" />
                      {item.rating}
                    </span>
                  </div>
                </div>
                <p className="font-bold text-primary">¥{item.price}</p>
              </div>
            </Card>
          )
        })}

        {/* 商品榜 */}
        {activeCategory === "products" && productRanks.map((item, index) => {
          const rank = index + 1
          const style = getRankStyle(rank)
          return (
            <Card key={item.id} className={cn("p-4", rank <= 3 && "border-amber-200 bg-amber-50/50")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", style.bg, style.text)}>
                  {rank}
                </div>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{item.sales}人购买</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                      <Star className="w-3 h-3 fill-current" />
                      {item.rating}
                    </span>
                  </div>
                </div>
                <p className="font-bold text-primary">¥{item.price}</p>
              </div>
            </Card>
          )
        })}

        {/* 新星榜 */}
        {activeCategory === "rising" && risingRanks.map((item, index) => {
          const rank = index + 1
          const style = getRankStyle(rank)
          return (
            <Card key={item.id} className={cn("p-4", rank <= 3 && "border-amber-200 bg-amber-50/50")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", style.bg, style.text)}>
                  {rank}
                </div>
                <Avatar className="w-12 h-12">
                  <AvatarImage src={item.avatar} />
                  <AvatarFallback className="bg-green-500/10 text-green-600">
                    {item.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    <Badge className="bg-green-500/10 text-green-600 text-[10px]">
                      <Flame className="w-3 h-3 mr-0.5" />
                      新星
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">入驻{item.joinDays}天</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">+{item.growth}</p>
                  <p className="text-[10px] text-muted-foreground">{item.followers}粉丝</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
