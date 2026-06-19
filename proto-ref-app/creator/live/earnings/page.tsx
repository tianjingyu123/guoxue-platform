"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/common/back-button"
import {
  ArrowLeft, TrendingUp, TrendingDown, Gift, ShoppingBag,
  CreditCard, ChevronRight, Calendar, Download
} from "lucide-react"

type Range = "7d" | "30d" | "90d"

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "近7天" },
  { key: "30d", label: "近30天" },
  { key: "90d", label: "近90天" },
]

const statsByRange: Record<Range, { total: number; reward: number; goods: number; trend: number }> = {
  "7d":  { total: 3680, reward: 1280, goods: 2400, trend: 12.5 },
  "30d": { total: 18600, reward: 5400, goods: 13200, trend: 8.3 },
  "90d": { total: 52400, reward: 14800, goods: 37600, trend: -2.1 },
}

const records = [
  { id: "1", date: "2024-01-15", type: "reward", desc: "用户「星空」打赏", amount: 520, live: "八字命理精讲第12课" },
  { id: "2", date: "2024-01-15", type: "goods", desc: "带货成交：《渊海子平》", amount: 168, live: "八字命理精讲第12课" },
  { id: "3", date: "2024-01-14", type: "goods", desc: "带货成交：紫微斗数入门", amount: 88, live: "紫微斗数专题" },
  { id: "4", date: "2024-01-14", type: "reward", desc: "用户「山河」打赏", amount: 200, live: "紫微斗数专题" },
  { id: "5", date: "2024-01-13", type: "reward", desc: "用户「云上」打赏", amount: 360, live: "奇门遁甲入门" },
  { id: "6", date: "2024-01-12", type: "goods", desc: "带货成交：铜制罗盘", amount: 480, live: "风水堂第8课" },
  { id: "7", date: "2024-01-12", type: "reward", desc: "用户「墨言」打赏", desc2: "", amount: 100, live: "风水堂第8课" },
  { id: "8", date: "2024-01-11", type: "goods", desc: "带货成交：手抄本", amount: 240, live: "八字命理精讲第11课" },
]

export default function LiveEarningsPage() {
  const router = useRouter()
  const [range, setRange] = useState<Range>("30d")
  const [typeFilter, setTypeFilter] = useState<"all" | "reward" | "goods">("all")

  const stats = statsByRange[range]
  const filtered = records.filter(r => typeFilter === "all" || r.type === typeFilter)

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-base font-semibold text-foreground">直播收益</h1>
          </div>
          <button className="flex items-center gap-1 text-xs text-muted-foreground">
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 时间范围选择 */}
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "flex-1 py-1.5 rounded-full text-xs font-medium transition-colors",
                range === r.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* 收益总览卡片 */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">总收益（元）</p>
          <div className="flex items-end gap-2 mb-3">
            <p className="text-3xl font-black text-foreground">
              {stats.total.toLocaleString()}
            </p>
            <div className={cn(
              "flex items-center gap-0.5 pb-1 text-xs font-medium",
              stats.trend >= 0 ? "text-chart-4" : "text-destructive"
            )}>
              {stats.trend >= 0
                ? <TrendingUp className="w-3.5 h-3.5" />
                : <TrendingDown className="w-3.5 h-3.5" />
              }
              {Math.abs(stats.trend)}%
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Gift className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs text-muted-foreground">打赏收益</span>
              </div>
              <p className="text-lg font-bold text-foreground">¥{stats.reward.toLocaleString()}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">带货收益</span>
              </div>
              <p className="text-lg font-bold text-foreground">¥{stats.goods.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 提现入口 */}
        <button
          onClick={() => router.push("/videos/creator/withdraw")}
          className="w-full flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">可提现金额</p>
              <p className="text-xs text-muted-foreground">T+1 结算，最低100元可提</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-primary">¥{(stats.total * 0.7).toFixed(0)}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>

        {/* 明细列表 */}
        <div>
          {/* 筛选 */}
          <div className="flex gap-2 mb-3">
            {[
              { key: "all" as const, label: "全部" },
              { key: "reward" as const, label: "打赏" },
              { key: "goods" as const, label: "带货" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  typeFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map(record => (
              <div key={record.id} className="bg-card rounded-xl p-3.5 border border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      record.type === "reward" ? "bg-accent/15" : "bg-primary/10"
                    )}>
                      {record.type === "reward"
                        ? <Gift className="w-4 h-4 text-accent" />
                        : <ShoppingBag className="w-4 h-4 text-primary" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{record.desc}</p>
                      <p className="text-xs text-muted-foreground truncate">{record.live}</p>
                      <p className="text-xs text-muted-foreground">{record.date}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-chart-4 flex-shrink-0">+¥{record.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部安全区 */}
      <div className="h-8" />
    </div>
  )
}
