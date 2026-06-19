"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Share2, RefreshCw, ChevronDown } from "lucide-react"
import { DatePickerModal } from "@/components/paipan/bazi/date-picker-modal"

type PanMethod = "zhuan" | "fei"
type FlyMethod = "yangshun" | "yinyang"
type StartMethod = "chaibu" | "maoshan" | "zhirun" | "custom"
type AnganMethod = "zhishi" | "dipan"

const JU_OPTIONS = [
  "阳遁1局", "阳遁2局", "阳遁3局", "阳遁4局", "阳遁5局", 
  "阳遁6局", "阳遁7局", "阳遁8局", "阳遁9局",
  "阴遁1局", "阴遁2局", "阴遁3局", "阴遁4局", "阴遁5局", 
  "阴遁6局", "阴遁7局", "阴遁8局", "阴遁9局"
]

export default function QimenPage() {
  const router = useRouter()
  
  // 表单状态
  const [matter, setMatter] = useState("")
  const [dateTime, setDateTime] = useState({ year: 2026, month: 5, day: 17, hour: 13, minute: 38 })
  const [panMethod, setPanMethod] = useState<PanMethod>("fei")
  const [flyMethod, setFlyMethod] = useState<FlyMethod>("yinyang")
  const [startMethod, setStartMethod] = useState<StartMethod>("chaibu")
  const [customJu, setCustomJu] = useState("阳遁1局")
  const [anganMethod, setAnganMethod] = useState<AnganMethod>("dipan")
  const [useTrueSolar, setUseTrueSolar] = useState(false)
  const [coordinates, setCoordinates] = useState({ lat: 38.93, lng: 115.42 })
  
  // 弹窗状态
  const [showJuPicker, setShowJuPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // 初始化当前时间
  useEffect(() => {
    const now = new Date()
    setDateTime({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes()
    })
  }, [])

  // 刷新时间
  const refreshTime = () => {
    const now = new Date()
    setDateTime({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes()
    })
  }

  // 格式化时间显示
  const formatDateTime = () => {
    return `${dateTime.year}年${dateTime.month}月${dateTime.day}日 ${String(dateTime.hour).padStart(2, '0')}时${String(dateTime.minute).padStart(2, '0')}分`
  }

  // 开始排盘
  const handleSubmit = () => {
    const params = new URLSearchParams({
      matter,
      year: String(dateTime.year),
      month: String(dateTime.month),
      day: String(dateTime.day),
      hour: String(dateTime.hour),
      minute: String(dateTime.minute),
      panMethod,
      flyMethod,
      startMethod,
      customJu: startMethod === "custom" ? customJu : "",
      anganMethod,
      trueSolar: String(useTrueSolar),
      lat: String(coordinates.lat),
      lng: String(coordinates.lng)
    })
    router.push(`/paipan/qimen/result?${params.toString()}`)
  }

  // 单选按钮组件 - 卡片式设计
  const RadioOption = ({ 
    selected, 
    onClick, 
    label 
  }: { 
    selected: boolean
    onClick: () => void
    label: string 
  }) => (
    <button 
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        selected 
          ? "bg-primary text-white shadow-sm" 
          : "bg-secondary/40 text-foreground hover:bg-secondary/70"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )

  // 复选框组件 - 开关式设计
  const CheckOption = ({ 
    checked, 
    onClick, 
    label,
    suffix
  }: { 
    checked: boolean
    onClick: () => void
    label: string
    suffix?: string
  }) => (
    <button 
      className="flex items-center gap-2"
      onClick={onClick}
    >
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      <span className="text-sm text-foreground">{label}</span>
      <div className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 ${checked ? "bg-primary" : "bg-secondary"}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </button>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <Link href="/paipan" className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </Link>
          <h1 className="text-base font-bold text-foreground">热卜奇门遁甲</h1>
          <div className="w-6" />
        </div>
      </header>

      {/* 标题横幅 */}
      <div className="bg-primary px-4 py-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white tracking-wide">奇门遁甲</h2>
        <button className="flex items-center gap-1 text-white/90 hover:text-white transition-colors">
          <Share2 className="w-4 h-4" />
          <span className="text-sm">分享</span>
        </button>
      </div>

      {/* 表单卡片 */}
      <main className="flex-1 px-4 -mt-2">
        <div className="bg-card rounded-2xl shadow-sm ring-1 ring-border/60 overflow-hidden">
          {/* 事项内容 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground shrink-0">事项内容</span>
              <input
                type="text"
                value={matter}
                onChange={(e) => setMatter(e.target.value)}
                placeholder="请输入事项(选填)"
                className="text-right text-sm text-muted-foreground placeholder:text-muted-foreground/50 bg-transparent outline-none flex-1 ml-4"
              />
            </div>
          </div>

          {/* 排盘时间 - 点击打开时间选择器 */}
          <div 
            className="px-4 py-4 border-b border-border/60 cursor-pointer hover:bg-secondary/20 transition-colors"
            onClick={() => setShowDatePicker(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">排盘时间</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); refreshTime(); }} 
                  className="p-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-foreground">{formatDateTime()}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* 排盘方式 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground shrink-0">排盘方式</span>
              <div className="flex items-center gap-2">
                <RadioOption 
                  selected={panMethod === "zhuan"} 
                  onClick={() => setPanMethod("zhuan")} 
                  label="转盘" 
                />
                <RadioOption 
                  selected={panMethod === "fei"} 
                  onClick={() => setPanMethod("fei")} 
                  label="飞盘" 
                />
              </div>
            </div>
          </div>

          {/* 飞宫方式 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground shrink-0">飞宫方式</span>
              <div className="flex items-center gap-2">
                <RadioOption 
                  selected={flyMethod === "yangshun"} 
                  onClick={() => setFlyMethod("yangshun")} 
                  label="阳顺阴逆" 
                />
                <RadioOption 
                  selected={flyMethod === "yinyang"} 
                  onClick={() => setFlyMethod("yinyang")} 
                  label="阴阳皆顺" 
                />
              </div>
            </div>
          </div>

          {/* 起局方式 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-foreground">起局方式</span>
              <div className="flex flex-wrap gap-2">
                <RadioOption 
                  selected={startMethod === "chaibu"} 
                  onClick={() => setStartMethod("chaibu")} 
                  label="拆补" 
                />
                <RadioOption 
                  selected={startMethod === "maoshan"} 
                  onClick={() => setStartMethod("maoshan")} 
                  label="茅山" 
                />
                <RadioOption 
                  selected={startMethod === "zhirun"} 
                  onClick={() => setStartMethod("zhirun")} 
                  label="置闰" 
                />
                <RadioOption 
                  selected={startMethod === "custom"} 
                  onClick={() => setStartMethod("custom")} 
                  label="自选局数" 
                />
              </div>
            </div>
          </div>

          {/* 自选局数下拉 */}
          {startMethod === "custom" && (
            <div className="px-4 py-3 border-b border-border/60 bg-secondary/20">
              <button 
                onClick={() => setShowJuPicker(true)}
                className="w-full flex items-center justify-between bg-card rounded-lg px-4 py-3 border border-border"
              >
                <span className="text-sm text-foreground">{customJu}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* 暗干起法 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground shrink-0">暗干起法</span>
              <div className="flex items-center gap-2">
                <RadioOption 
                  selected={anganMethod === "zhishi"} 
                  onClick={() => setAnganMethod("zhishi")} 
                  label="值使门起" 
                />
                <RadioOption 
                  selected={anganMethod === "dipan"} 
                  onClick={() => setAnganMethod("dipan")} 
                  label="门地盘起" 
                />
              </div>
            </div>
          </div>

          {/* 时间类型 */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground shrink-0">时间类型</span>
              <div className="flex items-center gap-2">
                {useTrueSolar && (
                  <span className="text-xs text-muted-foreground">
                    北纬{coordinates.lat}东经{coordinates.lng}
                  </span>
                )}
                <CheckOption 
                  checked={useTrueSolar} 
                  onClick={() => setUseTrueSolar(!useTrueSolar)} 
                  label="真太阳时" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 - 精致设计 */}
        <div className="mt-6 space-y-3 pb-8">
          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.99] transition-all"
          >
            开始排盘
          </button>
          <Link
            href="/paipan/qimen/history"
            className="block w-full py-4 bg-card text-primary font-bold text-base rounded-xl text-center border border-primary/30 hover:bg-primary/5 transition-all"
          >
            排盘记录
          </Link>
        </div>
      </main>

      {/* 时间选择器弹窗 */}
      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(date) => {
          setDateTime({
            year: date.year,
            month: date.month,
            day: date.day,
            hour: date.hour ?? dateTime.hour,
            minute: date.minute ?? dateTime.minute
          })
        }}
        initialDate={dateTime}
        initialMode="solar"
      />

      {/* 局数选择弹窗 */}
      {showJuPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowJuPicker(false)}>
          <div className="bg-card w-full rounded-t-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <button onClick={() => setShowJuPicker(false)} className="text-primary text-sm font-medium">取消</button>
              <span className="text-base font-semibold text-foreground">选择局数</span>
              <button 
                onClick={() => setShowJuPicker(false)} 
                className="text-primary text-sm font-medium"
              >
                确定
              </button>
            </div>
            {/* 选项列表 */}
            <div className="max-h-[50vh] overflow-y-auto">
              {JU_OPTIONS.map((ju) => (
                <button
                  key={ju}
                  onClick={() => {
                    setCustomJu(ju)
                    setShowJuPicker(false)
                  }}
                  className={`w-full py-4 text-center border-b border-border/60 last:border-b-0 transition-colors ${
                    customJu === ju 
                      ? "text-foreground font-semibold text-lg" 
                      : "text-muted-foreground"
                  }`}
                >
                  {ju}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
