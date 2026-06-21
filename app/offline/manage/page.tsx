"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Wallet,
  CalendarCheck,
  Users,
  Percent,
  GraduationCap,
  QrCode,
  ShoppingBag,
  Receipt,
  Megaphone,
  UserCog,
  Settings,
  ChevronRight,
  Bell,
  Plus,
  MapPin,
  Gift,
  Share2,
  Award,
} from "lucide-react"

interface ManageStats {
  todayIncome: number
  incomeChange: number
  monthCourses: number
  totalStudents: number
  attendanceRate: number
  pendingOrders: number
  upcomingCheckins: number
}

interface UpcomingCourse {
  id: number
  title: string
  date: string
  time: string
  enrolled: number
  capacity: number
  status: "enrolling" | "today" | "full"
}

// 管理功能入口
const manageEntries = [
  { key: "courses", label: "课程管理", icon: GraduationCap, href: "/offline/manage/courses", color: "text-blue-600 bg-blue-50" },
  { key: "checkin", label: "签到核销", icon: QrCode, href: "/manage/checkin/1", color: "text-green-600 bg-green-50" },
  { key: "products", label: "商品管理", icon: ShoppingBag, href: "/offline/manage/products", color: "text-orange-600 bg-orange-50" },
  { key: "orders", label: "订单管理", icon: Receipt, href: "/offline/manage/orders", color: "text-purple-600 bg-purple-50" },
  { key: "teachers", label: "讲师预约", icon: Users, href: "/offline/teacher-booking", color: "text-rose-600 bg-rose-50" },
  { key: "marketing", label: "营销工具", icon: Megaphone, href: "/offline/manage/marketing", color: "text-amber-600 bg-amber-50" },
  { key: "students", label: "学员管理", icon: UserCog, href: "/offline/manage/students", color: "text-teal-600 bg-teal-50" },
  { key: "settlements", label: "收益结算", icon: Wallet, href: "/offline/settlements", color: "text-emerald-600 bg-emerald-50" },
  { key: "info", label: "驿站信息", icon: Settings, href: "/offline/manage/info", color: "text-slate-600 bg-slate-100" },
]

export default function OfflineManagePage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ManageStats | null>(null)
  const [courses, setCourses] = useState<UpcomingCourse[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        todayIncome: 3680,
        incomeChange: 12.5,
        monthCourses: 8,
        totalStudents: 326,
        attendanceRate: 92,
        pendingOrders: 3,
        upcomingCheckins: 1,
      })
      setCourses([
        { id: 1, title: "八字命理入门实战班（第12期）", date: "今天", time: "14:00", enrolled: 22, capacity: 30, status: "today" },
        { id: 2, title: "紫微斗数精讲班", date: "6月16日", time: "09:30", enrolled: 12, capacity: 12, status: "full" },
        { id: 3, title: "风水堪舆实战公益课", date: "6月18日", time: "14:00", enrolled: 8, capacity: 20, status: "enrolling" },
      ])
      setLoading(false)
    }, 700)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-muted/30 pb-10">
      {/* 顶部 */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" className="text-primary-foreground" />
          <h1 className="text-lg font-semibold">驿站工作台</h1>
          <Link href="/im/conversations" className="relative p-2">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400" />
          </Link>
        </div>

        {/* 驿站身份卡 */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">热卜国学·北京朝阳驿站</p>
              <p className="text-xs text-primary-foreground/70">驿站管理者 · 营业中</p>
            </div>
            <Link
              href="/offline/manage/info"
              className="px-3 py-1.5 rounded-full bg-primary-foreground/15 text-xs"
            >
              编辑信息
            </Link>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-5">
        {/* 核心数据 */}
        {loading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : stats ? (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground">今日收入（元）</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold">{stats.todayIncome.toLocaleString()}</span>
                  <span className="flex items-center text-xs text-green-600">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    {stats.incomeChange}%
                  </span>
                </div>
              </div>
              <Link href="/offline/settlements" className="text-sm text-primary flex items-center">
                明细 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
              <StatItem icon={CalendarCheck} label="本月开课" value={`${stats.monthCourses}`} unit="场" />
              <StatItem icon={Users} label="累计学员" value={`${stats.totalStudents}`} unit="人" />
              <StatItem icon={Percent} label="平均到课率" value={`${stats.attendanceRate}`} unit="%" />
            </div>
          </Card>
        ) : null}

        {/* 今日待办 */}
        {!loading && stats && (stats.upcomingCheckins > 0 || stats.pendingOrders > 0) && (
          <div className="flex gap-3">
            {stats.upcomingCheckins > 0 && (
              <Link href="/manage/checkin/1" className="flex-1">
                <Card className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">今日待核销</p>
                    <p className="text-xs text-muted-foreground">{stats.upcomingCheckins} 场课程</p>
                  </div>
                </Card>
              </Link>
            )}
            {stats.pendingOrders > 0 && (
              <Link href="/offline/manage/orders" className="flex-1">
                <Card className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">待处理订单</p>
                    <p className="text-xs text-muted-foreground">{stats.pendingOrders} 笔</p>
                  </div>
                </Card>
              </Link>
            )}
          </div>
        )}

        {/* 管理功能宫格 */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">运营管理</h2>
          <div className="grid grid-cols-4 gap-y-5">
            {manageEntries.map((entry) => {
              const Icon = entry.icon
              return (
                <Link key={entry.key} href={entry.href} className="flex flex-col items-center gap-1.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${entry.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-foreground">{entry.label}</span>
                </Link>
              )
            })}
          </div>
        </Card>

        {/* 近期课程 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">近期课程</h2>
            <Link
              href="/offline/manage/courses/create"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              创建课程
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">还没有课程，点击右上角创建第一节课</p>
            </div>
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/offline/manage/courses/${course.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center w-12 shrink-0">
                    <span className="text-xs text-muted-foreground">{course.date}</span>
                    <span className="text-sm font-medium">{course.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{course.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      报名 {course.enrolled}/{course.capacity} 人
                    </p>
                  </div>
                  {course.status === "today" && <Badge className="bg-green-500">今日开课</Badge>}
                  {course.status === "full" && <Badge variant="secondary">已满员</Badge>}
                  {course.status === "enrolling" && <Badge variant="outline">报名中</Badge>}
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* 线上推广权益（平台赠送的高级运营商身份，次于线下业务） */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">线上推广权益</h2>
              <Badge variant="secondary" className="gap-1 text-[#C9A96E] bg-[#C9A96E]/10 border-none">
                <Gift className="w-3 h-3" />
                平台赠送
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            作为驿站，您额外获赠「高级运营商」身份，享受更高的推广管理奖比例
          </p>

          {/* 管理奖比例 */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF8F5] mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 flex items-center justify-center">
              <Award className="w-5 h-5 text-[#C9A96E]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">高级管理奖</p>
              <p className="text-xs text-muted-foreground mt-0.5">名下站长收益分成</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-[#C9A96E]">15</span>
              <span className="text-sm text-[#C9A96E]">%</span>
            </div>
          </div>

          {/* 推广入口 */}
          <div className="grid grid-cols-3 gap-3">
            <Link href="/station/promote" className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-rose-600" />
              </div>
              <span className="text-xs text-foreground">推广中心</span>
            </Link>
            <Link href="/station/materials" className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs text-foreground">推广素材</span>
            </Link>
            <Link href="/operator/team" className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs text-foreground">我的团队</span>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  )
}

function StatItem({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: React.ElementType
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="flex flex-col items-center">
      <Icon className="w-4 h-4 text-muted-foreground mb-1" />
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <span className="text-[11px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  )
}
