"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Phone, Video, Check, Clock, Calendar, ChevronLeft, ChevronRight, Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 讲师数据
const expertData = {
  id: 1,
  name: "周易大师",
  avatar: "",
  title: "资深命理讲师",
  isVerified: true,
  rating: 4.9,
  consultCount: 1280,
  pricePerMinute: 10,
  minDuration: 15,
  maxDuration: 60,
}

// 生成未来14天的日期
const generateDates = () => {
  const dates = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push({
      date: date,
      dayOfWeek: ["日", "一", "二", "三", "四", "五", "六"][date.getDay()],
      dayOfMonth: date.getDate(),
      month: date.getMonth() + 1,
      isToday: i === 0,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    })
  }
  return dates
}

// 生成时段数据
const generateTimeSlots = (dateIndex: number) => {
  const slots = []
  const morningStart = 9
  const morningEnd = 12
  const afternoonStart = 14
  const afternoonEnd = 18
  const eveningStart = 19
  const eveningEnd = 21

  // 上午时段
  for (let hour = morningStart; hour < morningEnd; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const isOccupied = Math.random() < 0.3 // 30% 已占用
      slots.push({
        id: `${hour}:${minute.toString().padStart(2, "0")}`,
        time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        period: "上午",
        isAvailable: !isOccupied && dateIndex > 0, // 今天的已过时段不可用
        isOccupied,
      })
    }
  }

  // 下午时段
  for (let hour = afternoonStart; hour < afternoonEnd; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const isOccupied = Math.random() < 0.25
      slots.push({
        id: `${hour}:${minute.toString().padStart(2, "0")}`,
        time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        period: "下午",
        isAvailable: !isOccupied,
        isOccupied,
      })
    }
  }

  // 晚上时段
  for (let hour = eveningStart; hour < eveningEnd; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const isOccupied = Math.random() < 0.2
      slots.push({
        id: `${hour}:${minute.toString().padStart(2, "0")}`,
        time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        period: "晚上",
        isAvailable: !isOccupied,
        isOccupied,
      })
    }
  }

  return slots
}

export default function BookingPage() {
  const dates = generateDates()
  const [selectedDateIndex, setSelectedDateIndex] = useState(1) // 默认选明天
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [duration, setDuration] = useState(15) // 默认15分钟
  const [callType, setCallType] = useState<"audio" | "video">("audio")
  const [timeSlots, setTimeSlots] = useState(generateTimeSlots(1))
  const [isBooking, setIsBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  useEffect(() => {
    setTimeSlots(generateTimeSlots(selectedDateIndex))
    setSelectedSlot(null)
  }, [selectedDateIndex])

  const totalPrice = duration * expertData.pricePerMinute

  const handleBook = () => {
    setIsBooking(true)
    setTimeout(() => {
      setIsBooking(false)
      setBookingSuccess(true)
    }, 1500)
  }

  // 按时段分组
  const groupedSlots = {
    上午: timeSlots.filter(s => s.period === "上午"),
    下午: timeSlots.filter(s => s.period === "下午"),
    晚上: timeSlots.filter(s => s.period === "晚上"),
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">预约成功</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          已成功预约{dates[selectedDateIndex].month}月{dates[selectedDateIndex].dayOfMonth}日 {selectedSlot} 与{expertData.name}的{callType === "audio" ? "语音" : "视频"}连麦
        </p>
        <Card className="w-full max-w-sm p-4 mb-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">预约时间</span>
              <span className="text-foreground">{dates[selectedDateIndex].month}月{dates[selectedDateIndex].dayOfMonth}日 {selectedSlot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">连麦时长</span>
              <span className="text-foreground">{duration}分钟</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">预计费用</span>
              <span className="text-primary font-medium">{totalPrice}国学币</span>
            </div>
          </div>
        </Card>
        <div className="flex gap-3 w-full max-w-sm">
          <Link href="/reservations" className="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl text-center">
            查看预约
          </Link>
          <Link href="/" className="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl text-center">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton />
  <h1 className="font-semibold text-base text-foreground">预约连麦</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 讲师信息 */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14">
              <AvatarImage src={expertData.avatar} alt={expertData.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {expertData.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-foreground">{expertData.name}</span>
                {expertData.isVerified && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{expertData.title}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-muted-foreground">好评 {expertData.rating}</span>
                <span className="text-xs text-muted-foreground">咨询 {expertData.consultCount}次</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">{expertData.pricePerMinute}币</p>
              <p className="text-xs text-muted-foreground">/分钟</p>
            </div>
          </div>
        </Card>

        {/* 连麦类型 */}
        <div>
          <h2 className="font-medium text-sm text-foreground mb-3">连麦方式</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: "audio" as const, icon: Phone, label: "语音连麦", desc: "仅语音通话" },
              { type: "video" as const, icon: Video, label: "视频连麦", desc: "音视频通话" },
            ].map(item => (
              <button
                key={item.type}
                onClick={() => setCallType(item.type)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  callType === item.type
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  callType === item.type ? "bg-primary/20" : "bg-secondary"
                )}>
                  <item.icon className={cn("w-5 h-5", callType === item.type ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 日期选择 */}
        <div>
          <h2 className="font-medium text-sm text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            选择日期
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {dates.map((date, index) => (
              <button
                key={index}
                onClick={() => setSelectedDateIndex(index)}
                className={cn(
                  "flex-shrink-0 w-14 py-2 rounded-xl border-2 transition-all",
                  selectedDateIndex === index
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50",
                  date.isToday && selectedDateIndex !== index && "border-primary/50"
                )}
              >
                <p className={cn(
                  "text-[10px] mb-0.5",
                  selectedDateIndex === index ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {date.isToday ? "今天" : `周${date.dayOfWeek}`}
                </p>
                <p className={cn(
                  "text-lg font-bold",
                  selectedDateIndex === index ? "text-primary-foreground" : "text-foreground"
                )}>
                  {date.dayOfMonth}
                </p>
                <p className={cn(
                  "text-[10px]",
                  selectedDateIndex === index ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {date.month}月
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 时段选择 */}
        <div>
          <h2 className="font-medium text-sm text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            选择时段
          </h2>
          
          {Object.entries(groupedSlots).map(([period, slots]) => (
            <div key={period} className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">{period}</p>
              <div className="grid grid-cols-4 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    disabled={!slot.isAvailable}
                    onClick={() => setSelectedSlot(slot.time)}
                    className={cn(
                      "py-2 px-1 text-xs rounded-lg border transition-all",
                      slot.isOccupied && "bg-muted text-muted-foreground border-transparent cursor-not-allowed",
                      !slot.isAvailable && !slot.isOccupied && "bg-muted/50 text-muted-foreground/50 border-transparent cursor-not-allowed",
                      slot.isAvailable && selectedSlot !== slot.time && "bg-green-500/10 text-green-600 border-green-500/30 hover:border-green-500",
                      selectedSlot === slot.time && "bg-primary text-primary-foreground border-primary"
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* 图例 */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
              <span>可预约</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-muted" />
              <span>已占用</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>已选中</span>
            </div>
          </div>
        </div>

        {/* 时长选择 */}
        <div>
          <h2 className="font-medium text-sm text-foreground mb-3">连麦时长</h2>
          <div className="flex gap-2">
            {[15, 30, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => setDuration(mins)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all",
                  duration === mins
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:border-primary/50"
                )}
              >
                {mins}分钟
              </button>
            ))}
          </div>
        </div>

        {/* 提示 */}
        <Card className="p-3 bg-accent/5 border-accent/20">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>预约成功后，请在预约时间前5分钟进入等待室</p>
              <p>连麦按实际通话时长计费，未接通不扣费</p>
              <p>如需取消预约，请提前2小时操作</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="max-w-lg mx-auto px-4 py-3">
          {selectedSlot ? (
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm">
                <span className="text-muted-foreground">已选：</span>
                <span className="text-foreground font-medium">
                  {dates[selectedDateIndex].month}月{dates[selectedDateIndex].dayOfMonth}日 {selectedSlot}
                </span>
                <span className="text-muted-foreground"> · {duration}分钟</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">预估费用</span>
                <p className="text-lg font-bold text-primary">{totalPrice}币</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center mb-3">请选择预约时段</p>
          )}
          <button
            onClick={handleBook}
            disabled={!selectedSlot || isBooking}
            className={cn(
              "w-full py-3.5 rounded-xl text-sm font-medium transition-all",
              selectedSlot && !isBooking
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isBooking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                预约中...
              </span>
            ) : (
              "确认预约"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
