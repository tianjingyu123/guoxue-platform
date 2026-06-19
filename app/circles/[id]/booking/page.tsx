"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Star, Clock, Calendar, MessageSquare, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { circleApi, type Expert, type TimeSlot } from "@/lib/api"

// Mock数据
const mockExperts: Expert[] = [
  { id: "1", name: "张明远", avatar: "/placeholder.svg", title: "资深命理师", specialty: ["八字", "紫微"], pricePerMinute: 5, rating: 4.9, sessions: 328, available: true },
  { id: "2", name: "李易风", avatar: "/placeholder.svg", title: "风水大师", specialty: ["风水", "择日"], pricePerMinute: 8, rating: 4.8, sessions: 156, available: true },
  { id: "3", name: "王国学", avatar: "/placeholder.svg", title: "易学研究员", specialty: ["周易", "六爻"], pricePerMinute: 6, rating: 4.7, sessions: 89, available: false },
]

const mockSlots: TimeSlot[] = [
  { id: "1", startTime: "09:00", endTime: "09:30", available: true, duration: 30 },
  { id: "2", startTime: "09:30", endTime: "10:00", available: false, duration: 30 },
  { id: "3", startTime: "10:00", endTime: "10:30", available: true, duration: 30 },
  { id: "4", startTime: "10:30", endTime: "11:00", available: true, duration: 30 },
  { id: "5", startTime: "14:00", endTime: "14:30", available: true, duration: 30 },
  { id: "6", startTime: "14:30", endTime: "15:00", available: true, duration: 30 },
  { id: "7", startTime: "15:00", endTime: "15:30", available: false, duration: 30 },
  { id: "8", startTime: "15:30", endTime: "16:00", available: true, duration: 30 },
]

// 骨架屏
function BookingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-14 bg-white" />
      <div className="p-4 space-y-4">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-32 h-40 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mt-6" />
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

// 日历组件
function CalendarPicker({ 
  selectedDate, 
  onSelect 
}: { 
  selectedDate: Date
  onSelect: (date: Date) => void 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []
    
    // 填充月初空白
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }
    // 填充日期
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }
  
  const days = getDaysInMonth(currentMonth)
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"]
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }
  
  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }
  
  const isPast = (date: Date) => {
    return date < today
  }

  return (
    <div className="bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2">
          <ChevronLeft className="w-5 h-5 text-[#666666]" />
        </button>
        <span className="font-medium text-[#2C2C2C]">
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </span>
        <button onClick={nextMonth} className="p-2">
          <ChevronRight className="w-5 h-5 text-[#666666]" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-[#999999] py-1">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => (
          <div key={i} className="aspect-square flex items-center justify-center">
            {date ? (
              <button
                onClick={() => !isPast(date) && onSelect(date)}
                disabled={isPast(date)}
                className={`w-9 h-9 rounded-full text-sm flex items-center justify-center transition-colors ${
                  isSelected(date)
                    ? "bg-[#C41E3A] text-white"
                    : isPast(date)
                    ? "text-[#CCCCCC] cursor-not-allowed"
                    : "text-[#2C2C2C] hover:bg-[#FAF8F5]"
                }`}
              >
                {date.getDate()}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [experts, setExperts] = useState<Expert[]>([])
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [duration, setDuration] = useState(30)
  const [topic, setTopic] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [bookingResult, setBookingResult] = useState<{ bookingId: string } | null>(null)

  useEffect(() => {
    loadExperts()
  }, [circleId])

  useEffect(() => {
    if (selectedExpert) {
      loadSlots()
    }
  }, [selectedExpert, selectedDate])

  const loadExperts = async () => {
    setLoading(true)
    try {
      const data = await circleApi.getExperts(circleId)
      setExperts(data)
      if (data.length > 0) {
        setSelectedExpert(data.find(e => e.available) || data[0])
      }
    } catch {
      setExperts(mockExperts)
      setSelectedExpert(mockExperts[0])
    } finally {
      setLoading(false)
    }
  }

  const loadSlots = async () => {
    if (!selectedExpert) return
    try {
      const dateStr = selectedDate.toISOString().split("T")[0]
      const data = await circleApi.getExpertSlots(circleId, selectedExpert.id, dateStr)
      setSlots(data)
    } catch {
      setSlots(mockSlots)
    }
    setSelectedSlot(null)
  }

  const calculatePrice = () => {
    if (!selectedExpert) return 0
    return selectedExpert.pricePerMinute * duration
  }

  const handleSubmit = async () => {
    if (!selectedExpert || !selectedSlot || !topic.trim()) return
    
    setSubmitting(true)
    try {
      const dateStr = selectedDate.toISOString().split("T")[0]
      const result = await circleApi.createBooking(circleId, {
        expertId: selectedExpert.id,
        date: dateStr,
        slotId: selectedSlot.id,
        topic,
        duration,
      })
      setBookingResult(result)
      setShowSuccess(true)
    } catch {
      // Mock成功
      setBookingResult({ bookingId: "mock-booking-123" })
      setShowSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  const addToCalendar = () => {
    if (!selectedExpert || !selectedSlot) return
    const dateStr = selectedDate.toISOString().split("T")[0]
    const startDateTime = `${dateStr}T${selectedSlot.startTime}:00`
    const title = encodeURIComponent(`连麦咨询 - ${selectedExpert.name}`)
    const details = encodeURIComponent(`主题：${topic}`)
    
    // 使用Google日历链接
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime.replace(/[-:]/g, "")}/${startDateTime.replace(/[-:]/g, "")}&details=${details}`
    window.open(calendarUrl, "_blank")
  }

  if (loading) return <BookingSkeleton />

  // 预约成功页面
  if (showSuccess && selectedExpert && selectedSlot) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-[#2C2C2C] mb-2">预约成功</h2>
          <p className="text-[#666666] text-center mb-6">我们已向专家发送通知，请准时参加</p>
          
          <div className="w-full bg-white rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C41E3A] to-[#E85A6B] flex items-center justify-center text-white font-medium">
                {selectedExpert.name[0]}
              </div>
              <div>
                <p className="font-medium text-[#2C2C2C]">{selectedExpert.name}</p>
                <p className="text-sm text-[#999999]">{selectedExpert.title}</p>
              </div>
            </div>
            <div className="border-t border-[#E8E3DB] pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#999999]">日期</span>
                <span className="text-[#2C2C2C]">{selectedDate.toLocaleDateString("zh-CN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#999999]">时间</span>
                <span className="text-[#2C2C2C]">{selectedSlot.startTime} - {selectedSlot.endTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#999999]">咨询主题</span>
                <span className="text-[#2C2C2C]">{topic}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#999999]">费用</span>
                <span className="text-[#C41E3A] font-medium">¥{calculatePrice()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <button
            onClick={addToCalendar}
            className="w-full py-3 rounded-xl border border-[#C41E3A] text-[#C41E3A] font-medium flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            添加到日历
          </button>
          <button
            onClick={() => router.push(`/circles/${circleId}`)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C41E3A] to-[#E85A6B] text-white font-medium"
          >
            返回圈子
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="font-medium text-[#2C2C2C]">连麦预约</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 选择专家 */}
        <section>
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">选择专家</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {experts.map(expert => (
              <button
                key={expert.id}
                onClick={() => expert.available && setSelectedExpert(expert)}
                disabled={!expert.available}
                className={`flex-shrink-0 w-32 rounded-xl p-3 border-2 transition-all ${
                  selectedExpert?.id === expert.id
                    ? "border-[#C41E3A] bg-red-50"
                    : expert.available
                    ? "border-transparent bg-white"
                    : "border-transparent bg-gray-100 opacity-60"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C41E3A] to-[#E85A6B] mx-auto mb-2 flex items-center justify-center text-white font-medium text-lg">
                  {expert.name[0]}
                </div>
                <p className="font-medium text-[#2C2C2C] text-sm text-center truncate">{expert.name}</p>
                <p className="text-xs text-[#999999] text-center truncate">{expert.title}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-[#C9A96E] fill-[#C9A96E]" />
                  <span className="text-xs text-[#666666]">{expert.rating}</span>
                </div>
                <p className="text-center mt-2">
                  <span className="text-[#C41E3A] font-bold">¥{expert.pricePerMinute}</span>
                  <span className="text-xs text-[#999999]">/分钟</span>
                </p>
                {!expert.available && (
                  <p className="text-xs text-center text-[#999999] mt-1">暂不可约</p>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 选择日期 */}
        <section>
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">选择日期</h3>
          <CalendarPicker selectedDate={selectedDate} onSelect={setSelectedDate} />
        </section>

        {/* 选择时段 */}
        <section>
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">选择时段</h3>
          <div className="bg-white rounded-xl p-4">
            {slots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => slot.available && setSelectedSlot(slot)}
                    disabled={!slot.available}
                    className={`py-2 rounded-lg text-sm transition-colors ${
                      selectedSlot?.id === slot.id
                        ? "bg-[#C41E3A] text-white"
                        : slot.available
                        ? "bg-[#FAF8F5] text-[#2C2C2C] hover:bg-red-50"
                        : "bg-gray-100 text-[#CCCCCC] cursor-not-allowed line-through"
                    }`}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#999999] py-4">该日期暂无可用时段</p>
            )}
          </div>
        </section>

        {/* 咨询时长 */}
        <section>
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">咨询时长</h3>
          <div className="flex gap-3">
            {[15, 30, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => setDuration(mins)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                  duration === mins
                    ? "bg-[#C41E3A] text-white"
                    : "bg-white text-[#2C2C2C]"
                }`}
              >
                {mins}分钟
              </button>
            ))}
          </div>
        </section>

        {/* 咨询主题 */}
        <section>
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">咨询主题</h3>
          <div className="bg-white rounded-xl p-4">
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="请简要描述您想咨询的问题..."
              rows={3}
              className="w-full resize-none text-sm text-[#2C2C2C] placeholder:text-[#CCCCCC] outline-none"
            />
            <div className="flex items-center gap-2 pt-2 border-t border-[#E8E3DB]">
              <MessageSquare className="w-4 h-4 text-[#999999]" />
              <span className="text-xs text-[#999999]">专家将根据您的主题提前准备</span>
            </div>
          </div>
        </section>

        {/* 费用预览 */}
        {selectedExpert && (
          <section className="bg-white rounded-xl p-4">
            <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">费用预览</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">单价</span>
                <span className="text-[#2C2C2C]">¥{selectedExpert.pricePerMinute}/分钟</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">时长</span>
                <span className="text-[#2C2C2C]">{duration}分钟</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-[#E8E3DB]">
                <span className="text-[#2C2C2C] font-medium">合计</span>
                <span className="text-[#C41E3A] font-bold text-lg">¥{calculatePrice()}</span>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#999999]" />
            <span className="text-sm text-[#666666]">
              {selectedSlot 
                ? `${selectedDate.toLocaleDateString("zh-CN")} ${selectedSlot.startTime}`
                : "请选择时段"
              }
            </span>
          </div>
          <div className="text-right">
            <span className="text-[#999999] text-sm">需支付</span>
            <span className="text-[#C41E3A] font-bold text-xl ml-1">¥{calculatePrice()}</span>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!selectedExpert || !selectedSlot || !topic.trim() || submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C41E3A] to-[#E85A6B] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              预约中...
            </>
          ) : (
            "立即预约"
          )}
        </button>
      </div>
    </div>
  )
}
