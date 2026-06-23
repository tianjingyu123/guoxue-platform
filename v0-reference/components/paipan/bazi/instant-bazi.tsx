"use client"

import { useState, useEffect } from "react"
import { Zap } from "lucide-react"

// 天干地支数据
const shiChen = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

// 五行颜色
const wuXingColors: Record<string, string> = {
  "甲": "text-emerald-600", "乙": "text-emerald-600",
  "丙": "text-red-500", "丁": "text-red-500",
  "戊": "text-amber-600", "己": "text-amber-600",
  "庚": "text-slate-500", "辛": "text-slate-500",
  "壬": "text-blue-500", "癸": "text-blue-500",
  "寅": "text-emerald-600", "卯": "text-emerald-600",
  "巳": "text-red-500", "午": "text-red-500",
  "辰": "text-amber-600", "戌": "text-amber-600", "丑": "text-amber-600", "未": "text-amber-600",
  "申": "text-slate-500", "酉": "text-slate-500",
  "亥": "text-blue-500", "子": "text-blue-500",
}

function getWuXingColor(char: string): string {
  return wuXingColors[char] || "text-gray-800"
}

export function InstantBazi() {
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  
  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 示例四柱数据
  const pillars = {
    year: { gan: "丙", zhi: "午" },
    month: { gan: "癸", zhi: "巳" },
    day: { gan: "庚", zhi: "寅" },
    hour: { gan: "丙", zhi: "戌" }
  }

  // 获取当前时辰
  const hour = currentTime?.getHours() ?? 12
  const shiChenIndex = Math.floor((hour + 1) % 24 / 2)
  const currentShiChen = shiChen[shiChenIndex]

  const formatTime = (date: Date | null) => {
    if (!date) return "--:--:--"
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  const handleInstantPaipan = () => {
    console.log("即时排盘", currentTime)
  }

  // 服务端渲染时显示占位符
  if (!mounted) {
    return (
      <div className="bg-card rounded-2xl shadow-sm ring-1 ring-border/60 overflow-hidden">
        <div className="px-4 py-2.5 bg-gradient-to-r from-secondary to-card border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-indigo to-indigo/80 rounded-full" />
            <span className="text-sm font-medium text-foreground/80">即时排盘</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-border" />
            <span>加载中...</span>
          </div>
        </div>
        <div className="p-4 h-[140px] flex items-center justify-center">
          <div className="text-gray-400 text-sm">正在加载...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm ring-1 ring-border/60 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-secondary to-card border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-gradient-to-b from-indigo to-indigo/80 rounded-full" />
          <span className="text-sm font-medium text-foreground/80">即时排盘</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>实时更新</span>
        </div>
      </div>

      <div className="p-4 flex items-center gap-5">
        {/* 左侧：四柱显示 */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            {[
              { label: "年", ...pillars.year },
              { label: "月", ...pillars.month },
              { label: "日", ...pillars.day },
              { label: "时", ...pillars.hour }
            ].map((pillar, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] text-gray-400 mb-1">{pillar.label}</div>
                <div className="bg-secondary/50 rounded-lg px-2.5 py-1.5 ring-1 ring-border/60">
                  <div className={`text-lg font-bold leading-tight ${getWuXingColor(pillar.gan)}`}>{pillar.gan}</div>
                  <div className={`text-lg font-bold leading-tight ${getWuXingColor(pillar.zhi)}`}>{pillar.zhi}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>农历：2026年四月初一 {currentShiChen}时</div>
            <div>公历：{currentTime ? `${currentTime.getFullYear()}年${String(currentTime.getMonth() + 1).padStart(2, '0')}月${String(currentTime.getDate()).padStart(2, '0')}日` : '--'} {formatTime(currentTime)}</div>
          </div>
        </div>

        {/* 右侧：时辰显示和按钮 */}
        <div className="text-center flex flex-col items-center">
          <div className="mb-3">
            <div className="text-3xl font-bold text-foreground">{currentShiChen}时</div>
            <div className="text-lg font-medium text-indigo tabular-nums">{formatTime(currentTime)}</div>
          </div>
          <button
            onClick={handleInstantPaipan}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-primary/90 rounded-full shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all"
          >
            <Zap className="w-4 h-4" />
            即时排盘
          </button>
        </div>
      </div>
    </div>
  )
}
