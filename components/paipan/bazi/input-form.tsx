"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, MapPin, Clock, Folder } from "lucide-react"
import { DatePickerModal } from "./date-picker-modal"
import { LocationPickerModal } from "./location-picker-modal"
import { GroupPickerModal } from "./group-picker-modal"

type Gender = "male" | "female"

export function BaziInputForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [gender, setGender] = useState<Gender>("male")
  const [birthDate, setBirthDate] = useState({ year: 1990, month: 1, day: 1, hour: 12, minute: 0, isLunar: false })
  const [birthPlace, setBirthPlace] = useState({ province: "", city: "", district: "", timezone: "北京时间" })
  const [group, setGroup] = useState("全部")
  const [useTrueSolarTime, setUseTrueSolarTime] = useState(true)
  const [useEarlyZiHour, setUseEarlyZiHour] = useState(false)
  const [useDaylightSaving, setUseDaylightSaving] = useState(false)
  const [saveRecord, setSaveRecord] = useState(true)

  // 弹窗状态
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showGroupPicker, setShowGroupPicker] = useState(false)

  // 格式化显示日期
  const formatBirthDate = () => {
    const hourStr = birthDate.hour !== null ? `${String(birthDate.hour).padStart(2, '0')}:${String(birthDate.minute || 0).padStart(2, '0')}` : "未知时"
    return `${birthDate.year}-${String(birthDate.month).padStart(2, '0')}-${String(birthDate.day).padStart(2, '0')} ${hourStr}`
  }

  // 格式化显示地点
  const formatBirthPlace = () => {
    if (!birthPlace.province) return "请选择出生地点"
    if (birthPlace.province === "未知地") return "未知地 北京时间"
    return `${birthPlace.city} ${birthPlace.district}`
  }

  // 计算真太阳时信息
  const trueSolarTimeInfo = {
    time: formatBirthDate(),
    longitude: "东经116.42",
    latitude: "北纬39.93"
  }

  const handleSubmit = () => {
    const params = new URLSearchParams({
      name: name || "未知",
      gender: gender === "male" ? "男" : "女",
      year: String(birthDate.year),
      month: String(birthDate.month),
      day: String(birthDate.day),
      hour: String(birthDate.hour),
      minute: String(birthDate.minute),
      isLunar: String(birthDate.isLunar),
      province: birthPlace.province,
      city: birthPlace.city,
      district: birthPlace.district,
      trueSolar: String(useTrueSolarTime),
      earlyZi: String(useEarlyZiHour),
      dst: String(useDaylightSaving),
    })
    router.push(`/paipan/bazi/result?${params.toString()}`)
  }

  return (
    <>
      <div className="bg-card rounded-2xl shadow-sm ring-1 ring-border/60 overflow-hidden">
        {/* 姓名输入 */}
        <div className="px-4 py-3.5 border-b border-border/60">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名（选填）"
              className="text-right text-sm text-muted-foreground placeholder:text-muted-foreground/50 bg-transparent outline-none flex-1 ml-4"
            />
          </div>
        </div>

        {/* 性别选择 */}
        <div className="px-4 py-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">性别</span>
            <div className="flex items-center bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setGender("male")}
                className={`px-6 py-1.5 text-sm font-medium rounded-md transition-all ${
                  gender === "male"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                男
              </button>
              <button
                onClick={() => setGender("female")}
                className={`px-6 py-1.5 text-sm font-medium rounded-md transition-all ${
                  gender === "female"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                女
              </button>
            </div>
          </div>
        </div>

        {/* 出生时间 */}
        <div className="px-4 py-3.5 border-b border-border/60">
          <button 
            onClick={() => setShowDatePicker(true)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-light flex items-center justify-center">
                <Clock className="w-4 h-4 text-indigo" />
              </div>
              <span className="text-sm font-medium text-foreground">
                出生时间
                <span className="text-xs text-primary ml-0.5">*</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground group-hover:text-indigo transition-colors">
              <span className="text-sm">{formatBirthDate()}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* 出生地区 */}
        <div className="px-4 py-3.5 border-b border-border/60">
          <button 
            onClick={() => setShowLocationPicker(true)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-light flex items-center justify-center">
                <MapPin className="w-4 h-4 text-indigo" />
              </div>
              <span className="text-sm font-medium text-foreground">出生地区</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground group-hover:text-indigo transition-colors">
              <span className="text-sm">{formatBirthPlace()}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* 分组 */}
        <div className="px-4 py-3.5 border-b border-border/60">
          <button 
            onClick={() => setShowGroupPicker(true)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-light flex items-center justify-center">
                <Folder className="w-4 h-4 text-indigo" />
              </div>
              <span className="text-sm font-medium text-foreground">分组</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground group-hover:text-indigo transition-colors">
              <span className="text-sm">{group}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* 时间选项 */}
        <div className="px-4 py-3 border-b border-border/60 bg-secondary/40">
          <div className="flex items-center gap-6">
            {/* 真太阳时 */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <div 
                onClick={() => setUseTrueSolarTime(!useTrueSolarTime)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  useTrueSolarTime ? "border-primary bg-primary" : "border-border bg-card"
                }`}
              >
                {useTrueSolarTime && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                  </svg>
                )}
              </div>
              <span className="text-xs text-muted-foreground">真太阳时</span>
            </label>

            {/* 早晚子时 */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <div 
                onClick={() => setUseEarlyZiHour(!useEarlyZiHour)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  useEarlyZiHour ? "border-primary bg-primary" : "border-border bg-card"
                }`}
              >
                {useEarlyZiHour && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                  </svg>
                )}
              </div>
              <span className="text-xs text-muted-foreground">早晚子时</span>
            </label>

            {/* 夏令时 */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <div 
                onClick={() => setUseDaylightSaving(!useDaylightSaving)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  useDaylightSaving ? "border-primary bg-primary" : "border-border bg-card"
                }`}
              >
                {useDaylightSaving && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                  </svg>
                )}
              </div>
              <span className="text-xs text-muted-foreground">夏令时</span>
            </label>
          </div>
        </div>

        {/* 真太阳时信息 + 保存开关 */}
        <div className="px-4 py-3 flex items-center justify-between bg-secondary/20">
          <div className="text-xs text-muted-foreground/70 space-y-0.5">
            <div>真太阳时：{trueSolarTimeInfo.time}</div>
            <div>地址经纬：{trueSolarTimeInfo.latitude} {trueSolarTimeInfo.longitude}</div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-muted-foreground">保存</span>
            <div 
              onClick={() => setSaveRecord(!saveRecord)}
              className={`w-11 h-6 rounded-full transition-all relative shadow-inner ${
                saveRecord ? "bg-primary" : "bg-border"
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                saveRecord ? "translate-x-6" : "translate-x-1"
              }`} />
            </div>
          </label>
        </div>

        {/* 开始排盘按钮 */}
        <div className="p-4 bg-card">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.99] transition-all"
          >
            开始排盘
          </button>
        </div>
      </div>

      {/* 时间选择器弹窗 */}
      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(date) => {
          setBirthDate({
            year: date.year,
            month: date.month,
            day: date.day,
            hour: date.hour ?? 12,
            minute: date.minute ?? 0,
            isLunar: date.isLunar
          })
        }}
        initialDate={{ 
          year: birthDate.year, 
          month: birthDate.month, 
          day: birthDate.day, 
          hour: birthDate.hour, 
          minute: birthDate.minute 
        }}
        initialMode="solar"
      />

      {/* 地区选择器弹窗 */}
      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onConfirm={(location) => {
          setBirthPlace(location)
        }}
        initialLocation={birthPlace.province ? birthPlace : undefined}
      />

      {/* 分组选择器弹窗 */}
      <GroupPickerModal
        isOpen={showGroupPicker}
        onClose={() => setShowGroupPicker(false)}
        onConfirm={(selectedGroup) => {
          setGroup(selectedGroup)
        }}
        initialGroup={group}
      />
    </>
  )
}
