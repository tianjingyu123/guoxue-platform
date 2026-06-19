"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, ChevronRight, ChevronDown } from "lucide-react"
import { DatePickerModal } from "./date-picker-modal"
import { LocationPickerModal } from "./location-picker-modal"

export function BaziInputForm() {
  const router = useRouter()
  
  // 表单状态
  const [customerName, setCustomerName] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  const [birthYear, setBirthYear] = useState(1990)
  const [birthMonth, setBirthMonth] = useState(1)
  const [birthDay, setBirthDay] = useState(1)
  const [birthHour, setBirthHour] = useState(12)
  const [birthMinute, setBirthMinute] = useState(0)
  const [birthPlace, setBirthPlace] = useState("")
  const [trueSolar, setTrueSolar] = useState(true)
  const [earlyLateZi, setEarlyLateZi] = useState(false)
  const [daylightSaving, setDaylightSaving] = useState(false)
  
  // 弹窗状态
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPlacePicker, setShowPlacePicker] = useState(false)

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
      gender: gender === "male" ? "男" : "女",
      year: String(birthYear),
      month: String(birthMonth),
      day: String(birthDay),
      hour: String(birthHour),
      minute: String(birthMinute),
      place: birthPlace,
      trueSolar: String(trueSolar),
      earlyLateZi: String(earlyLateZi),
      daylightSaving: String(daylightSaving),
    })
    router.push(`/paipan/bazi/result?${params.toString()}`)
  }

  return (
    <>
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
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 space-y-3">
        <button
          onClick={handleSubmit}
          className="w-full py-4 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.99] transition-all"
        >
          开始排盘
        </button>
      </div>

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
    </>
  )
}
