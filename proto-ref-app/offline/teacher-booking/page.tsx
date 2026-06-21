"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Star, 
  Calendar, 
  Clock, 
  MapPin,
  CheckCircle,
  X,
  ChevronRight,
  User,
  MessageSquare,
  CreditCard,
  History
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { 
  getStationTeachers,
  getTeacherAvailability,
  createTeacherBooking,
  getMyTeacherBookings,
  cancelTeacherBooking,
  getBookingStatusLabel,
  getBookingStatusColor,
} from "@/lib/api/offline"
import type { Teacher, DateAvailability, TimeSlot, TeacherBooking } from "@/lib/types/offline"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// 加载骨架屏
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      </header>
      <div className="p-4 space-y-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="w-20 h-28 rounded-lg flex-shrink-0" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  )
}

function TeacherBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stationId = Number(searchParams.get('stationId')) || 1
  const preselectedTeacherId = searchParams.get('teacherId')
  
  const [activeTab, setActiveTab] = useState<'booking' | 'records'>('booking')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [availability, setAvailability] = useState<DateAvailability[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [bookings, setBookings] = useState<TeacherBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  
  // 当前月份
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  
  // 加载讲师列表
  useEffect(() => {
    async function loadTeachers() {
      setLoading(true)
      try {
        const res = await getStationTeachers(stationId)
        if (res.code === 200 && res.data) {
          setTeachers(res.data)
          // 预选讲师
          if (preselectedTeacherId) {
            const teacher = res.data.find(t => t.id === Number(preselectedTeacherId))
            if (teacher) setSelectedTeacher(teacher)
          } else if (res.data.length > 0) {
            setSelectedTeacher(res.data.find(t => t.isAvailable) || res.data[0])
          }
        }
      } finally {
        setLoading(false)
      }
    }
    loadTeachers()
  }, [stationId, preselectedTeacherId])
  
  // 加载讲师可用时间
  useEffect(() => {
    async function loadAvailability() {
      if (!selectedTeacher) return
      try {
        const res = await getTeacherAvailability(selectedTeacher.id, stationId, currentMonth)
        if (res.code === 200 && res.data) {
          setAvailability(res.data)
          // 自动选择第一个有空闲的日期
          const firstAvailable = res.data.find(d => d.hasAvailableSlots)
          if (firstAvailable && !selectedDate) {
            setSelectedDate(firstAvailable.date)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadAvailability()
  }, [selectedTeacher, stationId, currentMonth])
  
  // 加载预约记录
  useEffect(() => {
    if (activeTab === 'records') {
      loadBookings()
    }
  }, [activeTab])
  
  async function loadBookings() {
    setBookingsLoading(true)
    try {
      const res = await getMyTeacherBookings()
      if (res.code === 200 && res.data) {
        setBookings(res.data.list)
      }
    } finally {
      setBookingsLoading(false)
    }
  }
  
  // 当前选择日期的时段
  const currentSlots = useMemo(() => {
    const dateData = availability.find(d => d.date === selectedDate)
    return dateData?.slots || []
  }, [availability, selectedDate])
  
  // 计算费用
  const totalPrice = selectedSlot?.price || 0
  
  // 提交预约
  async function handleSubmit() {
    if (!selectedTeacher || !selectedDate || !selectedSlot || !topic.trim()) return
    
    setSubmitting(true)
    try {
      const res = await createTeacherBooking({
        teacherId: selectedTeacher.id,
        stationId,
        date: selectedDate,
        slotId: selectedSlot.id,
        topic: topic.trim(),
        description: description.trim() || undefined,
      })
      if (res.code === 200 && res.data?.success) {
        setShowSuccess(true)
      }
    } finally {
      setSubmitting(false)
    }
  }
  
  // 取消预约
  async function handleCancelBooking(bookingId: number) {
    if (!confirm('确定要取消这个预约吗？')) return
    try {
      const res = await cancelTeacherBooking(bookingId)
      if (res.code === 200) {
        loadBookings()
      }
    } catch (e) {
      console.error(e)
    }
  }
  
  // 切换月份
  function changeMonth(delta: number) {
    const [year, month] = currentMonth.split('-').map(Number)
    const newDate = new Date(year, month - 1 + delta, 1)
    setCurrentMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`)
    setSelectedDate('')
    setSelectedSlot(null)
  }
  
  // 格式化月份显示
  function formatMonth(monthStr: string) {
    const [year, month] = monthStr.split('-')
    return `${year}年${month}月`
  }
  
  // 格式化日期显示
  function formatDateDisplay(dateStr: string) {
    const date = new Date(dateStr)
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    return {
      day: date.getDate(),
      weekday: `周${weekdays[date.getDay()]}`,
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="w-20 h-28 rounded-lg flex-shrink-0" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">预约讲师</h1>
          </div>
        </div>
      </header>
      
      {/* Tab 切换 */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('booking')}
          className={cn(
            "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'booking'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          )}
        >
          预约咨询
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={cn(
            "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'records'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          )}
        >
          我的预约
        </button>
      </div>
      
      {activeTab === 'booking' ? (
        <div className="p-4 space-y-6">
          {/* 讲师选择 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">选择讲师</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {teachers.map(teacher => (
                <button
                  key={teacher.id}
                  onClick={() => {
                    if (teacher.isAvailable) {
                      setSelectedTeacher(teacher)
                      setSelectedDate('')
                      setSelectedSlot(null)
                    }
                  }}
                  disabled={!teacher.isAvailable}
                  className={cn(
                    "flex-shrink-0 w-20 rounded-lg p-2 border transition-all text-center",
                    selectedTeacher?.id === teacher.id
                      ? "border-primary bg-primary/5"
                      : "border-border",
                    !teacher.isAvailable && "opacity-50"
                  )}
                >
                  <div className="relative mx-auto w-12 h-12 rounded-full overflow-hidden bg-muted mb-2">
                    <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" />
                    {!teacher.isAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-xs text-white">休息</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">{teacher.name}</p>
                  <p className="text-xs text-primary">¥{teacher.hourlyRate}/时</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* 讲师简介 */}
          {selectedTeacher && (
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  <img src={selectedTeacher.avatar} alt={selectedTeacher.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{selectedTeacher.name}</h4>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {selectedTeacher.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {selectedTeacher.rating}
                    </span>
                    <span>{selectedTeacher.reviewCount}评价</span>
                    <span>{selectedTeacher.bookingCount}次预约</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTeacher.specialties.map((s, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                {selectedTeacher.introduction}
              </p>
            </div>
          )}
          
          {/* 日期选择 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">选择日期</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => changeMonth(-1)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium min-w-[80px] text-center">
                  {formatMonth(currentMonth)}
                </span>
                <button 
                  onClick={() => changeMonth(1)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {availability.map(dateData => {
                const { day, weekday } = formatDateDisplay(dateData.date)
                const isSelected = selectedDate === dateData.date
                const isToday = dateData.date === new Date().toISOString().split('T')[0]
                
                return (
                  <button
                    key={dateData.date}
                    onClick={() => {
                      if (dateData.hasAvailableSlots) {
                        setSelectedDate(dateData.date)
                        setSelectedSlot(null)
                      }
                    }}
                    disabled={!dateData.hasAvailableSlots}
                    className={cn(
                      "flex-shrink-0 w-14 py-2 rounded-lg border text-center transition-all",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : dateData.hasAvailableSlots
                          ? "border-border hover:border-primary/50"
                          : "border-border opacity-40"
                    )}
                  >
                    <p className={cn(
                      "text-xs mb-1",
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {isToday ? '今天' : weekday}
                    </p>
                    <p className="text-lg font-semibold">{day}</p>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* 时段选择 */}
          {selectedDate && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">选择时段</h3>
              <div className="grid grid-cols-3 gap-2">
                {currentSlots.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => slot.isAvailable && setSelectedSlot(slot)}
                    disabled={!slot.isAvailable}
                    className={cn(
                      "py-3 rounded-lg border text-center transition-all",
                      selectedSlot?.id === slot.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : slot.isAvailable
                          ? "border-border hover:border-primary/50"
                          : "border-border bg-muted/50 opacity-40"
                    )}
                  >
                    <p className="text-sm font-medium">
                      {slot.startTime}-{slot.endTime}
                    </p>
                    {slot.isAvailable ? (
                      <p className={cn(
                        "text-xs mt-1",
                        selectedSlot?.id === slot.id ? "text-primary-foreground/80" : "text-primary"
                      )}>
                        ¥{slot.price}
                      </p>
                    ) : (
                      <p className="text-xs mt-1 text-muted-foreground">已约满</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* 咨询信息 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                咨询主题 <span className="text-destructive">*</span>
              </label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="如：八字命理咨询、事业发展规划..."
                maxLength={50}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                补充说明（选填）
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请简要描述您想咨询的问题..."
                rows={3}
                maxLength={200}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {bookingsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">暂无预约记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(booking => (
                <div key={booking.id} className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                        <img src={booking.teacher.avatar} alt={booking.teacher.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.teacher.name}</p>
                        <p className="text-xs text-muted-foreground">{booking.teacher.title}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded",
                      getBookingStatusColor(booking.status)
                    )}>
                      {getBookingStatusLabel(booking.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{booking.date} {booking.startTime}-{booking.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{booking.stationName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="w-4 h-4" />
                      <span>{booking.topic}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-primary font-medium">¥{booking.price}</span>
                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        取消预约
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* 底部预约栏 */}
      {activeTab === 'booking' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">预约费用</p>
              <p className="text-xl font-bold text-primary">
                ¥{totalPrice}
                <span className="text-sm font-normal text-muted-foreground">/小时</span>
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!selectedTeacher || !selectedDate || !selectedSlot || !topic.trim() || submitting}
              className="min-w-[120px]"
            >
              {submitting ? '提交中...' : '立即预约'}
            </Button>
          </div>
        </div>
      )}
      
      {/* 预约成功弹窗 */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-2xl p-6 mx-4 w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">预约成功</h3>
            <p className="text-sm text-muted-foreground mb-1">
              {selectedTeacher?.name} · {selectedDate}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {selectedSlot?.startTime}-{selectedSlot?.endTime}
            </p>
            
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => {
                  setShowSuccess(false)
                  setActiveTab('records')
                  loadBookings()
                }}
              >
                查看我的预约
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setShowSuccess(false)
                  setSelectedSlot(null)
                  setTopic('')
                  setDescription('')
                }}
              >
                继续预约
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeacherBookingPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TeacherBookingContent />
    </Suspense>
  )
}
