"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Share2, ChevronRight } from "lucide-react"
import { DatePickerModal } from "@/components/paipan/bazi/date-picker-modal"
import { LocationPickerModal } from "@/components/paipan/bazi/location-picker-modal"

export default function YangpanPage() {
  const router = useRouter()
  
  // 表单状态
  const [customerName, setCustomerName] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  const [birthYear, setBirthYear] = useState(1990)
  const [birthMonth, setBirthMonth] = useState(1)
  const [birthDay, setBirthDay] = useState(1)
  const [birthHour, setBirthHour] = useState(12)
  const [birthMinute, setBirthMinute] = useState(0)
  const [panMethod, setPanMethod] = useState<"zhuan" | "fei">("zhuan")
  const [jigongMethod, setJigongMethod] = useState<"kungong" | "yanggenyin">("kungong")
  const [startMethod, setStartMethod] = useState<"chaibu" | "maoshan" | "zhirun">("chaibu")
  const [anganMethod, setAnganMethod] = useState<"zhishi" | "dipan">("zhishi")
  const [birthPlace, setBirthPlace] = useState("")
  const [lat, setLat] = useState(39.9)
  const [lng, setLng] = useState(116.4)
  const [trueSolar, setTrueSolar] = useState(true)
  const [earlyLateZi, setEarlyLateZi] = useState(false)
  const [daylightSaving, setDaylightSaving] = useState(false)
  
  // 弹窗状态
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPlacePicker, setShowPlacePicker] = useState(false)
  const [showSizhuCheck, setShowSizhuCheck] = useState(false)

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

  // 开关组件
  const SwitchOption = ({ 
    checked, 
    onClick, 
    label 
  }: { 
    checked: boolean
    onClick: () => void
    label: string 
  }) => (
    <button className="flex items-center gap-2" onClick={onClick}>
      <div className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 ${checked ? "bg-primary" : "bg-secondary"}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </button>
  )

  const handleSubmit = () => {
    const params = new URLSearchParams({
      name: customerName,
      gender,
      year: String(birthYear),
      month: String(birthMonth),
      day: String(birthDay),
      hour: String(birthHour),
      minute: String(birthMinute),
      panMethod,
      jigongMethod,
      startMethod,
      anganMethod,
      place: birthPlace,
      lat: String(lat),
      lng: String(lng),
      trueSolar: String(trueSolar),
      earlyLateZi: String(earlyLateZi),
      daylightSaving: String(daylightSaving),
    })
    router.push(`/paipan/yangpan/result?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <Link href="/paipan" className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-base font-bold">阳盘命理奇门</h1>
          <div className="w-6" />
        </div>
      </header>

      {/* 标题横幅 */}
      <div className="bg-primary px-4 py-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">阳盘命理奇门</h2>
        <button className="flex items-center gap-1 text-white/90 hover:text-white">
          <Share2 className="w-4 h-4" />
          <span className="text-sm">分享</span>
        </button>
      </div>

      {/* 表单内容 */}
      <main className="flex-1 px-3 py-4">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* 客户名称 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">客户名称</span>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="请输入客户名称(选填)"
                className="text-sm text-right bg-transparent border-none outline-none placeholder:text-muted-foreground w-48"
              />
            </div>
          </div>

          {/* 选择性别 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">选择性别</span>
              <div className="flex items-center gap-2">
                <RadioOption selected={gender === "male"} onClick={() => setGender("male")} label="男" />
                <RadioOption selected={gender === "female"} onClick={() => setGender("female")} label="女" />
              </div>
            </div>
          </div>

          {/* 出生时间 */}
          <div className="px-4 py-4 border-b border-border/60">
            <button 
              className="flex items-center justify-between w-full"
              onClick={() => setShowDatePicker(true)}
            >
              <span className="text-sm font-medium text-foreground">出生时间</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">
                  {birthYear}年{birthMonth}月{birthDay}日 {birthHour}时{birthMinute}分
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          </div>

          {/* 排盘方式 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">排盘方式</span>
              <div className="flex items-center gap-2">
                <RadioOption selected={panMethod === "zhuan"} onClick={() => setPanMethod("zhuan")} label="转盘" />
                <RadioOption selected={panMethod === "fei"} onClick={() => setPanMethod("fei")} label="飞盘" />
              </div>
            </div>
          </div>

          {/* 寄宫方式 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">寄宫方式</span>
              <div className="flex items-center gap-2">
                <RadioOption selected={jigongMethod === "kungong"} onClick={() => setJigongMethod("kungong")} label="坤宫" />
                <RadioOption selected={jigongMethod === "yanggenyin"} onClick={() => setJigongMethod("yanggenyin")} label="阳艮阴坤" />
              </div>
            </div>
          </div>

          {/* 起局方式 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-foreground">起局方式</span>
              <div className="flex flex-wrap gap-2">
                <RadioOption selected={startMethod === "chaibu"} onClick={() => setStartMethod("chaibu")} label="拆补" />
                <RadioOption selected={startMethod === "maoshan"} onClick={() => setStartMethod("maoshan")} label="茅山" />
                <RadioOption selected={startMethod === "zhirun"} onClick={() => setStartMethod("zhirun")} label="置闰" />
              </div>
            </div>
          </div>

          {/* 暗干起法 */}
          <div className="px-4 py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">暗干起法</span>
              <div className="flex items-center gap-2">
                <RadioOption selected={anganMethod === "zhishi"} onClick={() => setAnganMethod("zhishi")} label="值使门起" />
                <RadioOption selected={anganMethod === "dipan"} onClick={() => setAnganMethod("dipan")} label="门地盘起" />
              </div>
            </div>
          </div>

          {/* 出生地点 */}
          <div className="px-4 py-4 border-b border-border/60">
            <button 
              className="flex items-center justify-between w-full"
              onClick={() => setShowPlacePicker(true)}
            >
              <span className="text-sm font-medium text-foreground">出生地点</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">
                  {birthPlace || "请选择出生地点"}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          </div>

          {/* 底部选项 */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <SwitchOption checked={trueSolar} onClick={() => setTrueSolar(!trueSolar)} label="真太阳时" />
                <SwitchOption checked={earlyLateZi} onClick={() => setEarlyLateZi(!earlyLateZi)} label="早晚子时" />
                <SwitchOption checked={daylightSaving} onClick={() => setDaylightSaving(!daylightSaving)} label="夏令时" />
              </div>
              <button 
                onClick={() => setShowSizhuCheck(true)}
                className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors"
              >
                四柱反查
              </button>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="mt-6 space-y-3 pb-8">
          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.99] transition-all"
          >
            开始排盘
          </button>
          <Link
            href="/paipan/yangpan/history"
            className="block w-full py-4 bg-card text-primary font-bold text-base rounded-xl text-center border border-primary/30 hover:bg-primary/5 transition-all"
          >
            排盘记录
          </Link>
        </div>
      </main>

      {/* 四柱反查弹窗 */}
      {showSizhuCheck && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl animate-scale-in">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-bold text-center">四柱反查</h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                通过已知的四柱八字反推出生时间
              </p>
              <div className="grid grid-cols-4 gap-2">
                {["年柱", "月柱", "日柱", "时柱"].map((label) => (
                  <div key={label} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{label}</div>
                    <input className="w-full h-10 rounded-lg border border-border text-center text-lg font-bold" placeholder="甲子" />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 flex gap-2">
              <button onClick={() => setShowSizhuCheck(false)} className="flex-1 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary/50 transition-colors">取消</button>
              <button onClick={() => setShowSizhuCheck(false)} className="flex-1 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">确定</button>
            </div>
          </div>
        </div>
      )}

      {/* 日期选择器 */}
      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(date) => {
          setBirthYear(date.year)
          setBirthMonth(date.month)
          setBirthDay(date.day)
          setBirthHour(date.hour)
          setBirthMinute(date.minute)
          setShowDatePicker(false)
        }}
        initialDate={{
          year: birthYear,
          month: birthMonth,
          day: birthDay,
          hour: birthHour,
          minute: birthMinute
        }}
        initialMode="solar"
      />

      {/* 地点选择器 */}
      <LocationPickerModal
        isOpen={showPlacePicker}
        onClose={() => setShowPlacePicker(false)}
        onConfirm={(location) => {
          setBirthPlace(`${location.province} ${location.city} ${location.district}`)
          setShowPlacePicker(false)
        }}
      />
    </div>
  )
}
