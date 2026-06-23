"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { Search, Radio } from "lucide-react"
import { LiveCard } from "@/components/live/live-card"
import { cn } from "@/lib/utils"
import Link from "next/link"

const tabs = ["全部", "知识授课", "电商带货", "关注的"]

// 模拟直播数据 - 区分横竖屏
// 知识授课(OBS横屏) / 电商带货(手机竖屏)
const mockLives = [
  // 横屏 - 知识授课
  {
    id: "1",
    title: "八字命理入门：如何快速解读四柱八字",
    cover: "/images/live/live-h1.jpg",
    hostName: "易道先生",
    hostAvatar: "/images/experts/expert-1.jpg",
    viewerCount: 12580,
    type: "knowledge" as const,
    status: "live" as const,
    orientation: "horizontal" as const,
    priceType: "free" as const,
  },
  // 竖屏 - 电商带货
  {
    id: "2",
    title: "开光吉祥物专场：招财貔貅、转运葫芦",
    cover: "/images/live/live-2.jpg",
    hostName: "福缘阁主",
    hostAvatar: "/images/experts/expert-2.jpg",
    viewerCount: 8920,
    type: "commerce" as const,
    status: "live" as const,
    orientation: "vertical" as const,
    priceType: "free" as const,
    productCount: 12,
  },
  // 竖屏 - 电商带货
  {
    id: "3",
    title: "天然水晶手链专场直播",
    cover: "/images/live/live-3.jpg",
    hostName: "晶缘坊",
    hostAvatar: "",
    viewerCount: 5630,
    type: "commerce" as const,
    status: "live" as const,
    orientation: "vertical" as const,
    priceType: "free" as const,
    productCount: 8,
  },
  // 横屏 - 知识授课（付费）
  {
    id: "4",
    title: "紫微斗数实战案例分析第三期",
    cover: "/images/live/live-h1.jpg",
    hostName: "紫微大师",
    hostAvatar: "/images/experts/expert-1.jpg",
    viewerCount: 3280,
    type: "knowledge" as const,
    status: "live" as const,
    orientation: "horizontal" as const,
    priceType: "paid" as const,
    price: 99,
    circleFree: true,
  },
  // 竖屏 - 预约
  {
    id: "5",
    title: "今晚8点：风水布局与家居旺财秘诀",
    cover: "/images/live/live-1.jpg",
    hostName: "风水堂主",
    hostAvatar: "",
    viewerCount: 328,
    type: "knowledge" as const,
    status: "upcoming" as const,
    scheduledTime: "今晚 20:00",
    orientation: "vertical" as const,
    priceType: "free" as const,
  },
  // 竖屏 - 电商
  {
    id: "6",
    title: "周易古籍珍藏版专场直播",
    cover: "/images/live/live-2.jpg",
    hostName: "古籍书阁",
    hostAvatar: "",
    viewerCount: 4150,
    type: "commerce" as const,
    status: "live" as const,
    orientation: "vertical" as const,
    priceType: "free" as const,
    productCount: 15,
  },
  // 竖屏 - 预约（付费）
  {
    id: "7",
    title: "奇门遁甲：预测学的巅峰之术",
    cover: "/images/live/live-3.jpg",
    hostName: "奇门居士",
    hostAvatar: "",
    viewerCount: 186,
    type: "knowledge" as const,
    status: "upcoming" as const,
    scheduledTime: "明天 14:00",
    orientation: "vertical" as const,
    priceType: "paid" as const,
    price: 168,
  },
  // 横屏 - 知识授课
  {
    id: "8",
    title: "手把手教你排八字命盘",
    cover: "/images/live/live-h1.jpg",
    hostName: "李命理",
    hostAvatar: "/images/experts/expert-2.jpg",
    viewerCount: 2860,
    type: "knowledge" as const,
    status: "live" as const,
    orientation: "horizontal" as const,
    priceType: "free" as const,
  },
  // 竖屏 - 电商
  {
    id: "9",
    title: "手工罗盘制作工艺展示与售卖",
    cover: "/images/live/live-1.jpg",
    hostName: "匠心堂",
    hostAvatar: "",
    viewerCount: 1520,
    type: "commerce" as const,
    status: "live" as const,
    orientation: "vertical" as const,
    priceType: "free" as const,
    productCount: 6,
  },
  // 竖屏 - 电商
  {
    id: "10",
    title: "道家符箓专场直播",
    cover: "/images/live/live-2.jpg",
    hostName: "玄真道人",
    hostAvatar: "",
    viewerCount: 980,
    type: "commerce" as const,
    status: "live" as const,
    orientation: "vertical" as const,
    priceType: "free" as const,
    productCount: 9,
  },
]

export default function LivePlazaPage() {
  const [activeTab, setActiveTab] = useState("全部")

  // 筛选直播
  const filteredLives = mockLives.filter((live) => {
    if (activeTab === "全部") return true
    if (activeTab === "知识授课") return live.type === "knowledge"
    if (activeTab === "电商带货") return live.type === "commerce"
    if (activeTab === "关注的") return false
    return true
  })

  // 分离直播中和预告
  const livesNow = filteredLives.filter((l) => l.status === "live")
  const livesUpcoming = filteredLives.filter((l) => l.status === "upcoming")

  // 混合排列渲染 - 横屏独占一行，竖屏双列
  const renderMixedLayout = (lives: typeof mockLives) => {
    const result: React.ReactNode[] = []
    let i = 0
    
    while (i < lives.length) {
      const current = lives[i]
      
      if (current.orientation === "horizontal") {
        // 横屏卡片独占一行
        result.push(
          <div key={current.id} className="col-span-2">
            <LiveCard {...current} />
          </div>
        )
        i++
      } else {
        // 竖屏卡片，尝试配对
        const next = lives[i + 1]
        
        if (next && next.orientation === "vertical") {
          // 两个竖屏卡片并排
          result.push(
            <LiveCard key={current.id} {...current} />
          )
          result.push(
            <LiveCard key={next.id} {...next} />
          )
          i += 2
        } else {
          // 单个竖屏卡片
          result.push(
            <LiveCard key={current.id} {...current} />
          )
          i++
        }
      }
    }
    
    return result
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto">
          {/* 标题栏 */}
          <div className="flex items-center justify-between h-12 px-4">
            <BackButton />
            <h1 className="font-serif font-bold text-lg text-foreground">直播广场</h1>
            <Link href="/search" className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
              <Search className="w-5 h-5 text-muted-foreground" />
            </Link>
          </div>

          {/* 分类导航 - 下划线风格 */}
          <div className="flex items-center px-4 h-10 gap-6 border-t border-border/30">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative py-2 text-sm transition-all whitespace-nowrap",
                  activeTab === tab
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="pt-[88px] pb-8 px-4 max-w-lg mx-auto">
        {/* 正在直播 */}
        {livesNow.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#C41E3A]">
                <Radio className="w-3 h-3 text-white" />
              </div>
              <h2 className="font-serif font-semibold text-foreground">正在直播</h2>
              <span className="text-xs text-muted-foreground">({livesNow.length})</span>
            </div>
            {/* 混合排列网格 - 统一8px间距 */}
            <div className="grid grid-cols-2 gap-2">
              {renderMixedLayout(livesNow)}
            </div>
          </section>
        )}

        {/* 直播预告 */}
        {livesUpcoming.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-serif font-semibold text-foreground">直播预告</h2>
              <span className="text-xs text-muted-foreground">({livesUpcoming.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {renderMixedLayout(livesUpcoming)}
            </div>
          </section>
        )}

        {/* 空状态 */}
        {filteredLives.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Radio className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">暂无相关直播</p>
          </div>
        )}
      </main>
    </div>
  )
}
