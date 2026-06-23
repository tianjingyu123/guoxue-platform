"use client"

import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"

// 天干
const TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
// 地支
const DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

// 五行颜色映射
const wuxingColors: Record<string, string> = {
  "甲": "text-wuxing-wood", "乙": "text-wuxing-wood",
  "丙": "text-wuxing-fire", "丁": "text-wuxing-fire",
  "戊": "text-wuxing-earth", "己": "text-wuxing-earth",
  "庚": "text-wuxing-metal", "辛": "text-wuxing-metal",
  "壬": "text-wuxing-water", "癸": "text-wuxing-water",
  "子": "text-wuxing-water", "丑": "text-wuxing-earth",
  "寅": "text-wuxing-wood", "卯": "text-wuxing-wood",
  "辰": "text-wuxing-earth", "巳": "text-wuxing-fire",
  "午": "text-wuxing-fire", "未": "text-wuxing-earth",
  "申": "text-wuxing-metal", "酉": "text-wuxing-metal",
  "戌": "text-wuxing-earth", "亥": "text-wuxing-water",
}

// 简化的干支计算
function getGanZhi(year: number, month: number, day: number, hour: number) {
  // 年柱（简化计算）
  const yearGanIndex = (year - 4) % 10
  const yearZhiIndex = (year - 4) % 12
  
  // 月柱（简化）
  const monthGanIndex = ((year - 4) * 2 + month) % 10
  const monthZhiIndex = (month + 1) % 12
  
  // 日柱（简化 - 实际需要复杂计算）
  const dayOffset = Math.floor((year - 1900) * 365.25 + (month - 1) * 30.4375 + day)
  const dayGanIndex = (dayOffset + 6) % 10
  const dayZhiIndex = dayOffset % 12
  
  // 时柱
  const hourZhiIndex = Math.floor((hour + 1) / 2) % 12
  const hourGanIndex = (dayGanIndex * 2 + hourZhiIndex) % 10
  
  return {
    year: { gan: TIANGAN[yearGanIndex], zhi: DIZHI[yearZhiIndex] },
    month: { gan: TIANGAN[monthGanIndex], zhi: DIZHI[monthZhiIndex] },
    day: { gan: TIANGAN[dayGanIndex], zhi: DIZHI[dayZhiIndex] },
    hour: { gan: TIANGAN[hourGanIndex], zhi: DIZHI[hourZhiIndex] },
  }
}

export function InstantBazi() {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const ganzhi = getGanZhi(
    currentTime.getFullYear(),
    currentTime.getMonth() + 1,
    currentTime.getDate(),
    currentTime.getHours()
  )

  const formatTime = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
  }

  const refreshTime = () => {
    setCurrentTime(new Date())
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <span className="text-sm font-semibold text-foreground">即时排盘</span>
        <button 
          onClick={refreshTime}
          className="flex items-center gap-1 text-primary text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          刷新
        </button>
      </div>

      {/* 当前时间 */}
      <div className="px-4 py-2 border-b border-border/60 bg-secondary/30">
        <span className="text-sm text-muted-foreground">{formatTime(currentTime)}</span>
      </div>

      {/* 四柱显示 */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          {/* 年柱 */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">年柱</div>
            <div className="bg-secondary/50 rounded-lg py-3">
              <span className={`text-2xl font-black block leading-tight ${wuxingColors[ganzhi.year.gan]}`}>{ganzhi.year.gan}</span>
              <span className={`text-2xl font-black block leading-tight ${wuxingColors[ganzhi.year.zhi]}`}>{ganzhi.year.zhi}</span>
            </div>
          </div>
          
          {/* 月柱 */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">月柱</div>
            <div className="bg-secondary/50 rounded-lg py-3">
              <span className={`text-2xl font-black block leading-tight ${wuxingColors[ganzhi.month.gan]}`}>{ganzhi.month.gan}</span>
              <span className={`text-2xl font-black block leading-tight ${wuxingColors[ganzhi.month.zhi]}`}>{ganzhi.month.zhi}</span>
            </div>
          </div>
          
          {/* 日柱 */}
          <div>
            <div className="text-xs text-primary font-medium mb-1">日柱</div>
            <div className="bg-primary/10 rounded-lg py-3 ring-2 ring-primary/30">
              <span className={`text-2xl font-black block leading-tight ${wuxingColors[ganzhi.day.gan]}`}>{ganzhi.day.gan}</span>
              <span className={`text-2xl font-black block leading-tight ${wuxingColors[ganzhi.day.zhi]}`}>{ganzhi.day.zhi}</span>
            </div>
          </div>
          
          {/* 时柱 */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">时柱</div>
            <div className="bg-secondary/50 rounded-lg py-3">
              <span className={`text-2xl font-black block leading-tight ${wuxingColors[ganzhi.hour.gan]}`}>{ganzhi.hour.gan}</span>
              <span className={`text-2xl font-black block leading-tight ${wuxingColors[ganzhi.hour.zhi]}`}>{ganzhi.hour.zhi}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
