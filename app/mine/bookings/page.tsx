"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Phone, MapPin, User, Calendar, Clock, X, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { DataState } from "@/components/data-state"
import { 
  getBookings, 
  cancelBooking, 
  getBookingTypeName, 
  getBookingStatusName, 
  getBookingStatusStyle,
  generateCalendarEvent 
} from "@/lib/api/bookings"
import type { BookingItem, BookingType } from "@/lib/types/bookings"

// 骨架屏组件
function BookingSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-5 bg-gray-200 rounded w-20" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-40 mb-1" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
        <div className="h-6 bg-gray-200 rounded w-16" />
      </div>
    </div>
  )
}

// 预约类型图标
function BookingTypeIcon({ type }: { type: BookingType }) {
  const iconClass = "w-5 h-5"
  switch (type) {
    case 'call':
      return <Phone className={`${iconClass} text-blue-500`} />
    case 'offline_course':
      return <MapPin className={`${iconClass} text-green-500`} />
    case 'instructor':
      return <User className={`${iconClass} text-purple-500`} />
    default:
      return <Calendar className={iconClass} />
  }
}

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<'all' | BookingType>('all')
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const type = activeTab === 'all' ? undefined : activeTab
      const res = await getBookings(1, 50, type)
      if (res.code === 200) {
        setBookings(res.data.list)
      } else {
        setError(res.message || '加载失败')
      }
    } catch (e) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab])

  // 处理取消预约
  const handleCancelBooking = async () => {
    if (!selectedBooking) return
    setCancelling(true)
    try {
      const res = await cancelBooking(selectedBooking.id)
      if (res.code === 200) {
        toast.success("取消成功", { description: "预约已取消" })
        // 更新本地状态
        setBookings(prev => prev.map(b => 
          b.id === selectedBooking.id ? { ...b, status: 'cancelled', canCancel: false } : b
        ))
      } else {
        toast.error("取消失败", { description: res.message })
      }
    } catch (e) {
      toast.error("取消失败", { description: "网络错误" })
    } finally {
      setCancelling(false)
      setCancelDialogOpen(false)
      setSelectedBooking(null)
    }
  }

  // 添加到日历
  const handleAddToCalendar = (booking: BookingItem) => {
    const event = generateCalendarEvent(booking)
    
    // 创建并下载 ICS 文件
    const blob = new Blob([event.icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `预约-${booking.target.name}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success("已生成日历文件", { description: "请用日历应用打开导入" })
  }

  // Tab 配置
  const tabs = [
    { value: 'all', label: '全部' },
    { value: 'call', label: '连麦咨询' },
    { value: 'offline_course', label: '线下课程' },
    { value: 'instructor', label: '讲师排期' }
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/profile" className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">预约记录</h1>
          <div className="w-6" />
        </div>
        
        {/* Tab 切换 */}
        <div className="px-4 pb-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full bg-gray-100 p-1 rounded-lg">
              {tabs.map(tab => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="flex-1 text-sm data-[state=active]:bg-white data-[state=active]:text-[#C41E3A]"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 预约列表 */}
      <div className="p-4">
        <DataState
          loading={loading}
          error={error}
          empty={bookings.length === 0}
          emptyMessage="暂无预约记录"
          onRetry={loadData}
          skeleton={
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <BookingSkeleton key={i} />)}
            </div>
          }
        >
          <div className="space-y-3">
            {bookings.map(booking => {
              const statusStyle = getBookingStatusStyle(booking.status)
              const isActive = booking.status === 'pending' || booking.status === 'confirmed'
              
              return (
                <div 
                  key={booking.id}
                  className={`bg-white rounded-xl p-4 ${!isActive ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* 头像/图标 */}
                    {booking.target.avatar ? (
                      <img 
                        src={booking.target.avatar} 
                        alt={booking.target.name}
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <BookingTypeIcon type={booking.type} />
                      </div>
                    )}
                    
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {getBookingTypeName(booking.type)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                          {getBookingStatusName(booking.status)}
                        </span>
                      </div>
                      
                      <h3 className="font-medium text-gray-900 truncate">{booking.target.name}</h3>
                      {booking.target.title && (
                        <p className="text-sm text-gray-500 truncate">{booking.target.title}</p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {booking.bookingTime}
                        </span>
                        {booking.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {booking.duration}分钟
                          </span>
                        )}
                      </div>
                      
                      {booking.location && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {booking.location}
                        </p>
                      )}
                      
                      {booking.remark && (
                        <p className="text-xs text-gray-400 mt-1">备注：{booking.remark}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  {isActive && (
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => handleAddToCalendar(booking)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        添加到日历
                      </Button>
                      {booking.canCancel && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setSelectedBooking(booking)
                            setCancelDialogOpen(true)
                          }}
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          取消预约
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </DataState>
      </div>

      {/* 取消确认弹窗 */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-[320px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消预约？</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBooking && (
                <>
                  <span className="block">预约对象：{selectedBooking.target.name}</span>
                  <span className="block">预约时间：{selectedBooking.bookingTime}</span>
                  {selectedBooking.cancelDeadline && (
                    <span className="block text-amber-600">
                      取消截止：{selectedBooking.cancelDeadline}
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>再想想</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="bg-red-500 hover:bg-red-600"
            >
              {cancelling ? "取消中..." : "确认取消"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
