"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Search, QrCode, Phone, Users, CheckCircle2, Clock, Download } from "lucide-react"

interface Enrollee {
  id: number
  name: string
  avatar: string
  phone: string
  enrollTime: string
  paid: boolean
  checkedIn: boolean
}

export default function ManageCourseEnrollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState("")
  const [filter, setFilter] = useState<"all" | "checked" | "unchecked">("all")
  const [enrollees, setEnrollees] = useState<Enrollee[]>([])
  const [courseTitle, setCourseTitle] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setCourseTitle("八字命理入门实战班（第12期）")
      setEnrollees([
        { id: 1, name: "云中鹤", avatar: "", phone: "138****8888", enrollTime: "06-10 14:22", paid: true, checkedIn: true },
        { id: 2, name: "紫薇仙子", avatar: "", phone: "139****6666", enrollTime: "06-10 16:05", paid: true, checkedIn: true },
        { id: 3, name: "易学初学者", avatar: "", phone: "137****1234", enrollTime: "06-11 09:30", paid: true, checkedIn: false },
        { id: 4, name: "玄机子", avatar: "", phone: "136****4321", enrollTime: "06-11 20:18", paid: true, checkedIn: false },
        { id: 5, name: "问道", avatar: "", phone: "135****5678", enrollTime: "06-12 11:42", paid: false, checkedIn: false },
      ])
      setLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [id])

  const checkedCount = enrollees.filter((e) => e.checkedIn).length
  const filtered = enrollees
    .filter((e) => (filter === "all" ? true : filter === "checked" ? e.checkedIn : !e.checkedIn))
    .filter((e) => (keyword ? e.name.includes(keyword) || e.phone.includes(keyword) : true))

  return (
    <div className="min-h-screen bg-muted/30 pb-10">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/offline/manage/courses" />
          <h1 className="text-lg font-semibold">报名管理</h1>
          <button className="p-2 text-muted-foreground">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* 课程统计 */}
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (
          <Card className="p-4">
            <p className="text-sm font-medium line-clamp-1">{courseTitle}</p>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Stat icon={Users} value={enrollees.length} label="总报名" />
              <Stat icon={CheckCircle2} value={checkedCount} label="已签到" highlight />
              <Stat icon={Clock} value={enrollees.length - checkedCount} label="未签到" />
            </div>
            <Link
              href={`/manage/checkin/${id}`}
              className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              <QrCode className="w-4 h-4" /> 扫码核销签到
            </Link>
          </Card>
        )}

        {/* 搜索与筛选 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索学员姓名或手机号"
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {([
            { value: "all", label: "全部" },
            { value: "checked", label: "已签到" },
            { value: "unchecked", label: "未签到" },
          ] as const).map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm",
                filter === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 学员列表 */}
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="mt-3 text-sm">没有符合条件的学员</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => (
              <Card key={e.id} className="p-3 flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={e.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{e.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{e.name}</span>
                    {!e.paid && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">待支付</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">报名于 {e.enrollTime}</p>
                </div>
                <a href={`tel:${e.phone}`} className="p-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                </a>
                {e.checkedIn ? (
                  <Badge className="bg-green-500 text-white gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 已到
                  </Badge>
                ) : (
                  <Badge variant="secondary">未到</Badge>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
  highlight,
}: {
  icon: React.ElementType
  value: number
  label: string
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <Icon className={cn("w-4 h-4 mb-1", highlight ? "text-green-600" : "text-muted-foreground")} />
      <span className={cn("text-xl font-bold", highlight && "text-green-600")}>{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}
