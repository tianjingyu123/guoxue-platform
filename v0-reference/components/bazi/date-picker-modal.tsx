"use client"

import { useState, useRef, useEffect } from "react"
import { X } from "lucide-react"

type CalendarMode = "solar" | "lunar" | "sizhu"

interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (date: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    mode: CalendarMode
  }) => void
  initialDate?: {
    year: number
    month: number
    day: number
    hour?: number
    minute?: number
  }
  initialMode?: CalendarMode
}

// 生成年份选项
const generateYears = () => Array.from({ length: 200 }, (_, i) => 1900 + i)
// 生成月份选项
const generateMonths = () => Array.from({ length: 12 }, (_, i) => i + 1)
// 生成日期选项
const generateDays = (year: number, month: number) => {
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => i + 1)
}
// 生成小时选项
const generateHours = () => Array.from({ length: 24 }, (_, i) => i)
// 生成分钟选项
const generateMinutes = () => Array.from({ length: 60 }, (_, i) => i)

// 十二时辰
const SHICHEN = ["子时", "丑时", "寅时", "卯时", "辰时", "巳时", "午时", "未时", "申时", "酉时", "戌时", "亥时"]

// 天干地支
const TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
const DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

// 滚轮选择器组件
function WheelPicker({
  options,
  value,
  onChange,
  renderOption,
}: {
  options: (number | string)[]
  value: number | string
  onChange: (v: number | string) => void
  renderOption?: (v: number | string) => string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemHeight = 40
  const visibleCount = 5

  const currentIndex = options.indexOf(value)

  useEffect(() => {
    if (containerRef.current && currentIndex >= 0) {
      containerRef.current.scrollTop = currentIndex * itemHeight
    }
  }, [currentIndex])

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop
      const index = Math.round(scrollTop / itemHeight)
      if (index >= 0 && index < options.length && options[index] !== value) {
        onChange(options[index])
      }
    }
  }

  return (
    <div className="relative h-[200px] overflow-hidden">
      {/* 选中高亮区域 */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-10 bg-secondary/50 rounded-lg pointer-events-none z-10" />
      {/* 渐变遮罩 */}
      <div className="absolute left-0 right-0 top-0 h-20 bg-gradient-to-b from-card to-transparent pointer-events-none z-20" />
      <div className="absolute left-0 right-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent pointer-events-none z-20" />
      {/* 滚动容器 */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{ scrollSnapType: "y mandatory" }}
      >
        {/* 上下填充 */}
        <div style={{ height: itemHeight * 2 }} />
        {options.map((opt) => (
          <div
            key={String(opt)}
            className={`h-10 flex items-center justify-center snap-center transition-all ${
              opt === value ? "text-foreground font-semibold text-lg" : "text-muted-foreground text-sm"
            }`}
            onClick={() => onChange(opt)}
          >
            {renderOption ? renderOption(opt) : String(opt)}
          </div>
        ))}
        <div style={{ height: itemHeight * 2 }} />
      </div>
    </div>
  )
}

export function DatePickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialDate,
  initialMode = "solar",
}: DatePickerModalProps) {
  const now = new Date()
  const [mode, setMode] = useState<CalendarMode>(initialMode)
  const [year, setYear] = useState(initialDate?.year ?? now.getFullYear())
  const [month, setMonth] = useState(initialDate?.month ?? now.getMonth() + 1)
  const [day, setDay] = useState(initialDate?.day ?? now.getDate())
  const [hour, setHour] = useState(initialDate?.hour ?? now.getHours())
  const [minute, setMinute] = useState(initialDate?.minute ?? 0)

  // 四柱模式的选择
  const [yearGanZhi, setYearGanZhi] = useState(0)
  const [monthGanZhi, setMonthGanZhi] = useState(0)
  const [dayGanZhi, setDayGanZhi] = useState(0)
  const [hourGanZhi, setHourGanZhi] = useState(0)

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm({
      year,
      month,
      day,
      hour,
      minute,
      mode,
    })
    onClose()
  }

  const years = generateYears()
  const months = generateMonths()
  const days = generateDays(year, month)
  const hours = generateHours()
  const minutes = generateMinutes()

  // 干支列表
  const ganzhiList = Array.from({ length: 60 }, (_, i) => `${TIANGAN[i % 10]}${DIZHI[i % 12]}`)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-card w-full rounded-t-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <button onClick={onClose} className="text-primary text-sm font-medium">
            取消
          </button>
          <span className="text-base font-semibold text-foreground">选择时间</span>
          <button onClick={handleConfirm} className="text-primary text-sm font-medium">
            确定
          </button>
        </div>

        {/* 模式切换 */}
        <div className="flex justify-center gap-2 px-4 py-3 border-b border-border/60">
          {([
            { key: "solar" as const, label: "公历" },
            { key: "lunar" as const, label: "农历" },
            { key: "sizhu" as const, label: "四柱" },
          ]).map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                mode === m.key ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 选择器 */}
        {mode !== "sizhu" ? (
          <div className="grid grid-cols-5 gap-1 px-2 py-4">
            <WheelPicker
              options={years}
              value={year}
              onChange={(v) => setYear(v as number)}
              renderOption={(v) => `${v}年`}
            />
            <WheelPicker
              options={months}
              value={month}
              onChange={(v) => setMonth(v as number)}
              renderOption={(v) => `${v}月`}
            />
            <WheelPicker
              options={days}
              value={day}
              onChange={(v) => setDay(v as number)}
              renderOption={(v) => `${v}日`}
            />
            <WheelPicker
              options={hours}
              value={hour}
              onChange={(v) => setHour(v as number)}
              renderOption={(v) => `${String(v).padStart(2, "0")}时`}
            />
            <WheelPicker
              options={minutes}
              value={minute}
              onChange={(v) => setMinute(v as number)}
              renderOption={(v) => `${String(v).padStart(2, "0")}分`}
            />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1 px-2 py-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">年柱</div>
              <WheelPicker
                options={ganzhiList}
                value={ganzhiList[yearGanZhi]}
                onChange={(v) => setYearGanZhi(ganzhiList.indexOf(v as string))}
              />
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">月柱</div>
              <WheelPicker
                options={ganzhiList}
                value={ganzhiList[monthGanZhi]}
                onChange={(v) => setMonthGanZhi(ganzhiList.indexOf(v as string))}
              />
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">日柱</div>
              <WheelPicker
                options={ganzhiList}
                value={ganzhiList[dayGanZhi]}
                onChange={(v) => setDayGanZhi(ganzhiList.indexOf(v as string))}
              />
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">时柱</div>
              <WheelPicker
                options={ganzhiList}
                value={ganzhiList[hourGanZhi]}
                onChange={(v) => setHourGanZhi(ganzhiList.indexOf(v as string))}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
