"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Phone, GraduationCap, Calendar, Clock, MapPin, Users, X, RefreshCw, ChevronRight, Video, Mic } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 预约类型配置
const typeConfig = {
  call: { label: "连麦咨询", icon: Phone, color: "text-blue-500", bg: "bg-blue-500/10" },
  offline: { label: "线下课程", icon: GraduationCap, color: "text-green-500", bg: "bg-green-500/10" },
  schedule: { label: "讲师排期", icon: Calendar, color: "text-purple-500", bg: "bg-purple-500/10" },
}

// 状态配置
const statusConfig = {
  pending: { label: "待确认", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  confirmed: { label: "已确认", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  completed: { label: "已完成", color: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "已取消", color: "bg-red-500/10 text-red-500 border-red-500/20" },
}

// 模拟预约数据
const reservationsData = [
  {
    id: 1,
    type: "call" as const,
    title: "八字命理咨询",
    target: { name: "周易大师", avatar: "", isVerified: true },
    date: "2024-12-20",
    time: "14:00-14:30",
    duration: 30,
    status: "confirmed" as const,
    callType: "video",
    price: 150,
  },
  {
    id: 2,
    type: "offline" as const,
    title: "八字入门实战班",
    target: { name: "热卜学院·北京中心", avatar: "" },
    date: "2024-12-22",
    time: "09:00-12:00",
    location: "北京市朝阳区望京SOHO T1",
    status: "pending" as const,
    price: 299,
    seats: 1,
  },
  {
    id: 3,
    type: "schedule" as const,
    title: "紫微斗数专项咨询",
    target: { name: "张玄风", avatar: "", isVerified: true },
    date: "2024-12-25",
    time: "10:00-11:00",
    status: "pending" as const,
    price: 200,
  },
  {
    id: 4,
    type: "call" as const,
    title: "风水布局指导",
    target: { name: "陈风水", avatar: "", isVerified: true },
    date: "2024-12-15",
    time: "15:00-15:45",
    duration: 45,
    status: "completed" as const,
    callType: "audio",
    price: 180,
  },
  {
    id: 5,
    type: "offline" as const,
    title: "线下雅集·茶道与易理",
    target: { name: "热卜学院·上海中心", avatar: "" },
    date: "2024-12-10",
    time: "14:00-17:00",
    location: "上海市静安区南京西路1788号",
    status: "cancelled" as const,
    price: 0,
    cancelReason: "个人原因取消",
  },
]

const tabs = [
  { id: "all", label: "全部" },
  { id: "call", label: "连麦咨询" },
  { id: "offline", label: "线下课程" },
  { id: "schedule", label: "讲师排期" },
]

export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<number | null>(null)

  const filteredReservations = activeTab === "all" 
    ? reservationsData 
    : reservationsData.filter(r => r.type === activeTab)

  const handleCancel = (id: number) => {
    setSelectedReservation(id)
    setShowCancelModal(true)
  }

  const confirmCancel = () => {
    // 处理取消逻辑
    setShowCancelModal(false)
    setSelectedReservation(null)
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">我的预约</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 类型Tab */}
      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <div className="flex px-4 gap-2 py-3 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 预约列表 */}
      <div className="p-4 space-y-3">
        {filteredReservations.length > 0 ? (
          filteredReservations.map(reservation => {
            const typeInfo = typeConfig[reservation.type]
            const statusInfo = statusConfig[reservation.status]
            const TypeIcon = typeInfo.icon

            return (
              <Card key={reservation.id} className="overflow-hidden">
                {/* 卡片头部 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", typeInfo.bg)}>
                      <TypeIcon className={cn("w-4 h-4", typeInfo.color)} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{typeInfo.label}</span>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* 卡片内容 */}
                <div className="p-4">
                  <h3 className="font-semibold text-base text-foreground mb-3">{reservation.title}</h3>
                  
                  {/* 预约对象 */}
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={reservation.target.avatar} alt={reservation.target.name} />
                      <AvatarFallback className="bg-secondary text-foreground text-sm">
                        {reservation.target.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm text-foreground">{reservation.target.name}</span>
                        {(reservation.target as any).isVerified && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                        )}
                      </div>
                      {reservation.type === "call" && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {(reservation as any).callType === "video" ? (
                            <><Video className="w-3 h-3" /> 视频连麦</>
                          ) : (
                            <><Mic className="w-3 h-3" /> 语音连麦</>
                          )}
                          <span>· {(reservation as any).duration}分钟</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 时间地点信息 */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{reservation.date}</span>
                      <Clock className="w-4 h-4 flex-shrink-0 ml-2" />
                      <span>{reservation.time}</span>
                    </div>
                    {(reservation as any).location && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{(reservation as any).location}</span>
                      </div>
                    )}
                    {reservation.status === "cancelled" && (reservation as any).cancelReason && (
                      <div className="flex items-center gap-2 text-red-500 text-xs">
                        <X className="w-3 h-3" />
                        <span>取消原因：{(reservation as any).cancelReason}</span>
                      </div>
                    )}
                  </div>

                  {/* 价格 */}
                  {reservation.price > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">预约费用</span>
                      <span className="text-primary font-semibold">¥{reservation.price}</span>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="px-4 py-3 bg-secondary/30 border-t border-border flex items-center justify-end gap-3">
                  {(reservation.status === "pending" || reservation.status === "confirmed") && (
                    <>
                      <button 
                        onClick={() => handleCancel(reservation.id)}
                        className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        取消预约
                      </button>
                      {reservation.status === "confirmed" && reservation.type === "call" && (
                        <Link 
                          href={`/call/${reservation.id}`}
                          className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                        >
                          进入连麦
                        </Link>
                      )}
                      {reservation.status === "confirmed" && reservation.type === "offline" && (
                        <Link 
                          href={`/offline/courses/${reservation.id}`}
                          className="flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                        >
                          查看详情 <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                    </>
                  )}
                  {reservation.status === "completed" && (
                    <Link 
                      href={`/reservations/${reservation.id}`}
                      className="flex items-center gap-1 px-4 py-1.5 text-sm text-foreground hover:text-primary transition-colors"
                    >
                      查看详情 <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                  {reservation.status === "cancelled" && (
                    <button className="flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors">
                      <RefreshCw className="w-4 h-4" />
                      再次预约
                    </button>
                  )}
                </div>
              </Card>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">暂无预约记录</p>
            <p className="text-muted-foreground/70 text-xs mb-4">去找讲师咨询或报名线下课吧</p>
            <Link
              href="/experts"
              className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
            >
              找讲师咨询
            </Link>
          </div>
        )}
      </div>

      {/* 取消确认弹窗 */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-semibold text-lg text-foreground text-center mb-2">确认取消预约？</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              取消后预约费用将原路退回，如有疑问请联系客服
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
              >
                再想想
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors"
              >
                确认取消
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
