"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Plus, Users, Calendar, QrCode, ChevronRight, GraduationCap } from "lucide-react"

type CourseStatus = "all" | "enrolling" | "ongoing" | "ended" | "draft"

interface ManageCourse {
  id: number
  title: string
  cover: string
  date: string
  time: string
  enrolled: number
  capacity: number
  price: number
  isFree: boolean
  status: Exclude<CourseStatus, "all">
}

const statusTabs: { value: CourseStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "enrolling", label: "报名中" },
  { value: "ongoing", label: "进行中" },
  { value: "ended", label: "已结束" },
  { value: "draft", label: "草稿" },
]

const statusConfig: Record<Exclude<CourseStatus, "all">, { label: string; className: string }> = {
  enrolling: { label: "报名中", className: "bg-green-500 text-white" },
  ongoing: { label: "进行中", className: "bg-blue-500 text-white" },
  ended: { label: "已结束", className: "bg-muted text-muted-foreground" },
  draft: { label: "草稿", className: "bg-amber-100 text-amber-700" },
}

export default function ManageCoursesPage() {
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<CourseStatus>("all")
  const [courses, setCourses] = useState<ManageCourse[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setCourses([
        { id: 1, title: "八字命理入门实战班（第12期）", cover: "/images/courses/bazi.jpg", date: "2026-06-14", time: "14:00", enrolled: 22, capacity: 30, price: 299, isFree: false, status: "enrolling" },
        { id: 2, title: "紫微斗数精讲班", cover: "/images/courses/ziwei.jpg", date: "2026-06-16", time: "09:30", enrolled: 12, capacity: 12, price: 599, isFree: false, status: "enrolling" },
        { id: 3, title: "风水堪舆实战公益课", cover: "/images/courses/fengshui.jpg", date: "2026-06-10", time: "14:00", enrolled: 18, capacity: 20, price: 0, isFree: true, status: "ongoing" },
        { id: 4, title: "国学经典导读（第3期）", cover: "/images/courses/guoxue.jpg", date: "2026-05-28", time: "19:00", enrolled: 25, capacity: 25, price: 199, isFree: false, status: "ended" },
        { id: 5, title: "梅花易数研修班（待发布）", cover: "/images/courses/meihua.jpg", date: "2026-06-25", time: "14:00", enrolled: 0, capacity: 20, price: 399, isFree: false, status: "draft" },
      ])
      setLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  const filtered = activeStatus === "all" ? courses : courses.filter((c) => c.status === activeStatus)

  return (
    <div className="min-h-screen bg-muted/30 pb-10">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/offline/manage" />
          <h1 className="text-lg font-semibold">课程管理</h1>
          <Link href="/offline/manage/courses/create" className="p-2 text-primary">
            <Plus className="w-5 h-5" />
          </Link>
        </div>
        {/* 状态筛选 */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                activeStatus === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="mt-3 text-muted-foreground">该状态下暂无课程</p>
            <Link
              href="/offline/manage/courses/create"
              className="inline-flex items-center gap-1 mt-4 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm"
            >
              <Plus className="w-4 h-4" />
              创建课程
            </Link>
          </div>
        ) : (
          filtered.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              <div className="flex gap-3 p-3">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                  <img src={course.cover || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
                  <Badge className={cn("absolute top-1 left-1 text-[10px] px-1.5 py-0", statusConfig[course.status].className)}>
                    {statusConfig[course.status].label}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="text-sm font-medium line-clamp-2">{course.title}</h3>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {course.date} {course.time}
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span className={cn(course.enrolled >= course.capacity && "text-orange-500")}>
                        {course.enrolled}/{course.capacity}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {course.isFree ? "公益课" : `¥${course.price}`}
                    </span>
                  </div>
                </div>
              </div>
              {/* 操作栏 */}
              <div className="flex border-t divide-x">
                <Link
                  href={`/offline/manage/courses/${course.id}`}
                  className="flex-1 py-2.5 text-center text-sm text-muted-foreground flex items-center justify-center gap-1"
                >
                  报名列表 <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                {(course.status === "enrolling" || course.status === "ongoing") && (
                  <Link
                    href={`/manage/checkin/${course.id}`}
                    className="flex-1 py-2.5 text-center text-sm text-primary flex items-center justify-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" /> 签到核销
                  </Link>
                )}
                <Link
                  href={`/offline/manage/courses/create?edit=${course.id}`}
                  className="flex-1 py-2.5 text-center text-sm text-muted-foreground"
                >
                  编辑
                </Link>
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  )
}
