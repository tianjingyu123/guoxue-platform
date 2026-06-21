"use client"

import { useState, useEffect, useRef } from "react"
import { Trash2 } from "lucide-react"

interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (date: { 
    year: number; month: number; day: number; hour: number | null; minute: number | null; 
    isLunar: boolean;
    sizhu?: { yearGan: string; yearZhi: string; monthGan: string; monthZhi: string; dayGan: string; dayZhi: string; hourGan: string; hourZhi: string }
  }) => void
  initialDate?: { year: number; month: number; day: number; hour: number; minute: number }
  initialMode?: "solar" | "lunar" | "sizhu"
}

// 生成年份列表 1900-2100
const years = Array.from({ length: 201 }, (_, i) => 1900 + i)
const months = Array.from({ length: 12 }, (_, i) => i + 1)
const hours = ["未知", ...Array.from({ length: 24 }, (_, i) => i)]
const minutes = ["未知", ...Array.from({ length: 60 }, (_, i) => i)]

// 农历月份（简写）
const lunarMonthsShort = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"]
const lunarMonths = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"]
const lunarDays = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", 
                   "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
                   "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"]

// 天干地支
const tianGan = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
const diZhi = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

// 天干五行颜色
const tianGanColors: Record<string, string> = {
  "甲": "text-green-600", "乙": "text-green-600",     // 木
  "丙": "text-red-500", "丁": "text-red-500",         // 火
  "戊": "text-amber-600", "己": "text-amber-600",     // 土
  "庚": "text-yellow-600", "辛": "text-yellow-600",   // 金
  "壬": "text-blue-500", "癸": "text-blue-500",       // 水
}

// 地支五行颜色
const diZhiColors: Record<string, string> = {
  "寅": "text-green-600", "卯": "text-green-600",     // 木
  "巳": "text-red-500", "午": "text-red-500",         // 火
  "辰": "text-amber-600", "戌": "text-amber-600", "丑": "text-amber-600", "未": "text-amber-600", // 土
  "申": "text-yellow-600", "酉": "text-yellow-600",   // 金
  "亥": "text-blue-500", "子": "text-blue-500",       // 水
}

// 获取某月的天数
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// 滚轮选择器组件
function WheelPicker({ 
  items, 
  selectedIndex, 
  onSelect,
  renderItem
}: { 
  items: (string | number)[]
  selectedIndex: number
  onSelect: (index: number) => void
  renderItem?: (item: string | number) => string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemHeight = 50

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = selectedIndex * itemHeight
    }
  }, [selectedIndex])

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop
      const newIndex = Math.round(scrollTop / itemHeight)
      if (newIndex !== selectedIndex && newIndex >= 0 && newIndex < items.length) {
        onSelect(newIndex)
      }
    }
  }

  return (
    <div className="flex-1">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[150px] overflow-y-auto scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        <div className="h-[50px]" />
        {items.map((item, index) => (
          <div
            key={index}
            onClick={() => {
              onSelect(index)
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
              }
            }}
            className={`h-[50px] flex items-center justify-center cursor-pointer transition-all duration-150 ${
              index === selectedIndex 
                ? "text-2xl font-bold text-gray-900" 
                : Math.abs(index - selectedIndex) === 1
                  ? "text-base text-gray-300"
                  : "text-sm text-gray-200"
            }`}
            style={{ scrollSnapAlign: 'center' }}
          >
            {renderItem ? renderItem(item) : item}
          </div>
        ))}
        <div className="h-[50px]" />
      </div>
    </div>
  )
}

export function DatePickerModal({ isOpen, onClose, onConfirm, initialDate, initialMode = "solar" }: DatePickerModalProps) {
  const [mode, setMode] = useState<"solar" | "lunar" | "sizhu">(initialMode)
  const [year, setYear] = useState(initialDate?.year || 1990)
  const [month, setMonth] = useState(initialDate?.month || 1)
  const [day, setDay] = useState(initialDate?.day || 1)
  const [hour, setHour] = useState<number | "未知">(initialDate?.hour ?? "未知")
  const [minute, setMinute] = useState<number | "未知">(initialDate?.minute ?? "未知")
  const [useDST, setUseDST] = useState(false)
  
  // 四柱选择状态
  const [sizhu, setSizhu] = useState({
    yearGan: "", yearZhi: "",
    monthGan: "", monthZhi: "",
    dayGan: "", dayZhi: "",
    hourGan: "", hourZhi: ""
  })
  const [activeColumn, setActiveColumn] = useState<"year" | "month" | "day" | "hour">("year")
  const [activeRow, setActiveRow] = useState<"gan" | "zhi">("gan")

  // 获取当前月的天数
  const daysInMonth = getDaysInMonth(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // 设置为今天
  const setToday = () => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
    setDay(now.getDate())
    setHour(now.getHours())
    setMinute(now.getMinutes())
  }

  // 清除四柱
  const clearSizhu = () => {
    setSizhu({
      yearGan: "", yearZhi: "",
      monthGan: "", monthZhi: "",
      dayGan: "", dayZhi: "",
      hourGan: "", hourZhi: ""
    })
  }

  // 选择天干或地支
  const selectGanZhi = (char: string, isGan: boolean) => {
    const key = `${activeColumn}${isGan ? 'Gan' : 'Zhi'}` as keyof typeof sizhu
    setSizhu(prev => ({ ...prev, [key]: char }))
    
    // 自动切换到下一个位置
    if (isGan) {
      setActiveRow("zhi")
    } else {
      // 移动到下一列
      if (activeColumn === "year") setActiveColumn("month")
      else if (activeColumn === "month") setActiveColumn("day")
      else if (activeColumn === "day") setActiveColumn("hour")
      setActiveRow("gan")
    }
  }

  const handleConfirm = () => {
    if (mode === "sizhu") {
      onConfirm({
        year: 0, month: 0, day: 0, hour: null, minute: null,
        isLunar: false,
        sizhu
      })
    } else {
      onConfirm({
        year,
        month,
        day,
        hour: hour === "未知" ? null : hour,
        minute: minute === "未知" ? null : minute,
        isLunar: mode === "lunar"
      })
    }
    onClose()
  }

  // 格式化显示的日期
  const formatDisplayDate = () => {
    if (mode === "sizhu") {
      return "四柱排盘"
    }
    const hourStr = hour === "未知" ? "未知时" : `${hour}时`
    const minuteStr = minute === "未知" ? "" : `${minute}分`
    if (mode === "lunar") {
      return `农历:${year}年${lunarMonths[month - 1]}${lunarDays[day - 1]} ${hourStr}${minuteStr}`
    }
    return `公历:${year}年${month}月${day}日 ${hourStr}${minuteStr}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      {/* 选择器面板 */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl overflow-hidden animate-slide-up">
        {/* 顶部显示区域 */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="text-center text-base font-medium text-gray-800 mb-4">
            {formatDisplayDate()}
          </div>
          
          {/* 模式切换 + 今日按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex bg-gray-100 rounded-full p-0.5">
              {[
                { key: "solar", label: "公历" },
                { key: "lunar", label: "农历" },
                { key: "sizhu", label: "四柱" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setMode(item.key as typeof mode)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                    mode === item.key
                      ? "bg-white text-gray-900 shadow-sm font-medium"
                      : "text-gray-500"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            
            {mode !== "sizhu" && (
              <button
                onClick={setToday}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-sm font-medium text-gray-600">今</span>
              </button>
            )}
            
            <button
              onClick={handleConfirm}
              className="px-5 py-2 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              确定
            </button>
          </div>
        </div>

        {/* 四柱模式 */}
        {mode === "sizhu" ? (
          <div className="px-4 py-4">
            {/* 四柱显示区域 */}
            <div className="flex mb-3">
              <div className="text-xs text-gray-400 w-16 text-center">年柱</div>
              <div className="text-xs text-gray-400 w-16 text-center">月柱</div>
              <div className="text-xs text-gray-400 w-16 text-center">日柱</div>
              <div className="text-xs text-gray-400 w-16 text-center">时柱</div>
            </div>
            
            {/* 四柱输入框 */}
            <div className="flex gap-2 mb-4">
              {(["year", "month", "day", "hour"] as const).map((col) => (
                <div key={col} className="flex flex-col gap-1">
                  <button
                    onClick={() => { setActiveColumn(col); setActiveRow("gan"); }}
                    className={`w-14 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all ${
                      activeColumn === col && activeRow === "gan"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 bg-gray-50"
                    } ${sizhu[`${col}Gan` as keyof typeof sizhu] ? tianGanColors[sizhu[`${col}Gan` as keyof typeof sizhu]] : "text-gray-300"}`}
                  >
                    {sizhu[`${col}Gan` as keyof typeof sizhu] || ""}
                  </button>
                  <button
                    onClick={() => { setActiveColumn(col); setActiveRow("zhi"); }}
                    className={`w-14 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all ${
                      activeColumn === col && activeRow === "zhi"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 bg-gray-50"
                    } ${sizhu[`${col}Zhi` as keyof typeof sizhu] ? diZhiColors[sizhu[`${col}Zhi` as keyof typeof sizhu]] : "text-gray-300"}`}
                  >
                    {sizhu[`${col}Zhi` as keyof typeof sizhu] || ""}
                  </button>
                </div>
              ))}
            </div>

            {/* ���找范围 + 清除 */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs text-gray-400">查找范围：1801~2099年</span>
              <button 
                onClick={clearSizhu}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清除
              </button>
            </div>

            {/* 四柱反查结果 - 当四柱填写完整时显示 */}
            {sizhu.yearGan && sizhu.yearZhi && sizhu.monthGan && sizhu.monthZhi && 
             sizhu.dayGan && sizhu.dayZhi && sizhu.hourGan && sizhu.hourZhi ? (
              <div className="space-y-2.5 mb-3 max-h-[220px] overflow-y-auto">
                {/* 模拟反查结果 - 实际使用时需要接入真实计算 */}
                {[
                  { solar: "2016-03-06 16:00:00", lunar: "2016年正月廿八 申时" },
                  { solar: "1956-03-21 16:00:00", lunar: "1956年二月初十 申时" },
                ].map((result, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      // 选择此日期
                      const [datePart, timePart] = result.solar.split(" ")
                      const [y, m, d] = datePart.split("-").map(Number)
                      const [h] = timePart.split(":").map(Number)
                      setYear(y)
                      setMonth(m)
                      setDay(d)
                      setHour(h)
                      setMinute(0)
                      setMode("solar")
                    }}
                    className="w-full p-3.5 bg-gray-50 rounded-xl text-left hover:bg-primary/5 transition-colors border border-gray-100 hover:border-primary/20"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 w-10">阳历：</span>
                      <span className="text-gray-900 font-medium">{result.solar}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1.5">
                      <span className="text-gray-400 w-10">阴历：</span>
                      <span className="text-gray-900 font-medium">{result.lunar}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* 天干键盘 */}
                {activeRow === "gan" && (
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {tianGan.map((gan) => (
                      <button
                        key={gan}
                        onClick={() => selectGanZhi(gan, true)}
                        className={`h-12 rounded-lg border border-gray-200 text-xl font-bold transition-all hover:border-gray-300 hover:bg-gray-50 ${tianGanColors[gan]}`}
                      >
                        {gan}
                      </button>
                    ))}
                  </div>
                )}

                {/* 地支键盘 */}
                {activeRow === "zhi" && (
                  <div className="grid grid-cols-6 gap-2 mb-2">
                    {diZhi.map((zhi) => (
                      <button
                        key={zhi}
                        onClick={() => selectGanZhi(zhi, false)}
                        className={`h-12 rounded-lg border border-gray-200 text-xl font-bold transition-all hover:border-gray-300 hover:bg-gray-50 ${diZhiColors[zhi]}`}
                      >
                        {zhi}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* 公历/农历滚轮选择区域 */
          <div className="relative px-4 py-4">
            {/* 选中行高亮背景 */}
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[50px] bg-gray-50/70 rounded-xl pointer-events-none" />
            
            {/* 滚轮 */}
            <div className="flex relative">
              <WheelPicker
                items={years}
                selectedIndex={years.indexOf(year)}
                onSelect={(index) => setYear(years[index])}
              />
              <WheelPicker
                items={mode === "lunar" ? lunarMonthsShort : months}
                selectedIndex={month - 1}
                onSelect={(index) => setMonth(index + 1)}
                renderItem={(item) => mode === "lunar" ? String(item) : `${item}`}
              />
              <WheelPicker
                items={mode === "lunar" ? lunarDays.slice(0, daysInMonth) : days}
                selectedIndex={Math.min(day - 1, daysInMonth - 1)}
                onSelect={(index) => setDay(index + 1)}
                renderItem={(item) => String(item)}
              />
              <WheelPicker
                items={hours}
                selectedIndex={hour === "未知" ? 0 : (hour as number) + 1}
                onSelect={(index) => setHour(index === 0 ? "未知" : index - 1)}
                renderItem={(item) => item === "未知" ? "未知" : `${String(item).padStart(2, '0')}`}
              />
              <WheelPicker
                items={minutes}
                selectedIndex={minute === "未知" ? 0 : (minute as number) + 1}
                onSelect={(index) => setMinute(index === 0 ? "未知" : index - 1)}
                renderItem={(item) => item === "未知" ? "未知" : `${String(item).padStart(2, '0')}`}
              />
            </div>
          </div>
        )}

        {/* 底部选项 */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">夏令时</span>
            <button
              onClick={() => setUseDST(!useDST)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                useDST ? "bg-primary" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  useDST ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
