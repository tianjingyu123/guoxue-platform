"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, Clock, FileText, PenLine, Flame, TrendingUp, RefreshCw, ChevronRight } from "lucide-react"
import { courseApi, type LearningDashboard } from "@/lib/api"
import { cn } from "@/lib/utils"

// ── 模拟数据 ──────────────────────────────────────────────
const MOCK: LearningDashboard = {
  totalMinutes: 1240,
  totalCourses: 8,
  totalNotes: 36,
  totalWorks: 12,
  streak: 7,
  weeklyMinutes: 185,
  trend: Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return {
      date: d.toISOString().slice(0, 10),
      minutes: Math.floor(Math.random() * 90) + (i > 20 ? 30 : 5),
    }
  }),
  recentRecords: [
    { courseId: "1", courseTitle: "八字命理入门精讲", cover: "/images/courses/course-1.jpg", lessonTitle: "第三讲：天干地支详解", studyAt: "2024-01-15T14:30:00Z", duration: 45, progress: 68 },
    { courseId: "2", courseTitle: "紫微斗数基础课程", cover: "/images/courses/course-2.jpg", lessonTitle: "第一讲：命盘排列方法", studyAt: "2024-01-14T20:15:00Z", duration: 32, progress: 25 },
    { courseId: "3", courseTitle: "周易易经入门到精通", cover: "/images/courses/course-3.jpg", lessonTitle: "第八讲：六十四卦详解", studyAt: "2024-01-13T11:00:00Z", duration: 58, progress: 90 },
    { courseId: "1", courseTitle: "八字命理入门精讲", cover: "/images/courses/course-1.jpg", lessonTitle: "第二讲：阴阳五行基础", studyAt: "2024-01-12T16:45:00Z", duration: 41, progress: 55 },
  ],
}

// ── 工具函数 ──────────────────────────────────────────────
function fmtMinutes(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}小时${m > 0 ? m + "分" : ""}` : `${m}分钟`
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "今天"
  if (d === 1) return "昨天"
  return `${d}天前`
}

// ── 概览指标卡 ────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", color)}>
        {icon}
      </div>
      <div className="text-[22px] font-black text-[#2C2C2C] leading-none">{value}</div>
      <div className="text-[12px] text-[#999]">{label}</div>
      {sub && <div className="text-[11px] text-[#C41E3A] font-medium">{sub}</div>}
    </div>
  )
}

// ── 近30天趋势图（纯CSS柱状图）────────────────────────────
function TrendChart({ data }: { data: { date: string; minutes: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.minutes), 1)
  // 只显示后30条，每5天一个标签
  const labelIndices = [0, 6, 13, 20, 27, 29]
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[15px] font-bold text-[#2C2C2C]">近30天学习趋势</span>
        <div className="flex items-center gap-1 text-[12px] text-[#999]">
          <TrendingUp className="w-3.5 h-3.5 text-[#C41E3A]" />
          <span className="text-[#C41E3A] font-medium">本周 {fmtMinutes(data.slice(-7).reduce((s, d) => s + d.minutes, 0))}</span>
        </div>
      </div>

      {/* 柱状图区域 */}
      <div className="flex items-end gap-[2px] h-[80px] mb-2">
        {data.map((d, i) => {
          const pct = (d.minutes / maxVal) * 100
          const isToday = d.date === today
          const isWeekend = new Date(d.date).getDay() === 0 || new Date(d.date).getDay() === 6
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all",
                  isToday
                    ? "bg-[#C41E3A]"
                    : isWeekend
                    ? "bg-[#C9A96E]/60"
                    : "bg-[#C41E3A]/25"
                )}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
          )
        })}
      </div>

      {/* X轴标签 */}
      <div className="flex items-end" style={{ paddingLeft: 0 }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            {labelIndices.includes(i) && (
              <span className="text-[9px] text-[#999]">
                {i === 29 ? "今" : `${new Date(d.date).getMonth() + 1}/${new Date(d.date).getDate()}`}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F2EFEA]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#C41E3A]" />
          <span className="text-[11px] text-[#999]">今日</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#C41E3A]/25" />
          <span className="text-[11px] text-[#999]">工作日</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#C9A96E]/60" />
          <span className="text-[11px] text-[#999]">周末</span>
        </div>
      </div>
    </div>
  )
}

// ── 连续学习徽章 ──────────────────────────────────────────
function StreakBadge({ streak, weeklyMinutes }: { streak: number; weeklyMinutes: number }) {
  return (
    <div className="bg-gradient-to-r from-[#C41E3A] to-[#8B0000] rounded-2xl p-4 shadow-[0_4px_16px_rgba(196,30,58,0.3)] relative overflow-hidden">
      {/* 装饰背景 */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full" />
      <div className="absolute -right-2 -bottom-8 w-32 h-32 bg-white/5 rounded-full" />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-5 h-5 text-yellow-400" />
            <span className="text-[13px] text-white/80 font-medium">连续学习</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[36px] font-black text-white leading-none">{streak}</span>
            <span className="text-[14px] text-white/70">天</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] text-white/70 mb-1">本周学习</div>
          <div className="text-[20px] font-bold text-white">{fmtMinutes(weeklyMinutes)}</div>
        </div>
      </div>

      {/* 火焰进度格 */}
      <div className="flex gap-1.5 mt-3 relative z-10">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-1.5 rounded-full",
              i < streak % 7 ? "bg-yellow-400" : "bg-white/20"
            )}
          />
        ))}
      </div>
      <div className="text-[10px] text-white/50 mt-1 relative z-10">本周进度 {streak % 7}/7天</div>
    </div>
  )
}

// ── 最近学习记录卡片 ──────────────────────────────────────
function RecentCard({ record, onClick }: {
  record: LearningDashboard["recentRecords"][0]
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 border-b border-[#F2EFEA] last:border-0 active:bg-[#F9F6F2] transition-colors text-left"
    >
      {/* 封面 */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F2EFEA] flex-shrink-0 relative">
        <div className="w-full h-full bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-[#C41E3A]/50" />
        </div>
        {/* 进度圆环 */}
        <div className="absolute bottom-0.5 right-0.5">
          <svg className="w-5 h-5 -rotate-90">
            <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
            <circle
              cx="10" cy="10" r="8"
              fill="none"
              stroke="#C41E3A"
              strokeWidth="2"
              strokeDasharray={`${(record.progress / 100) * 50.3} 50.3`}
            />
          </svg>
        </div>
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[#2C2C2C] truncate">{record.courseTitle}</div>
        <div className="text-[11px] text-[#999] truncate mt-0.5">{record.lessonTitle}</div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] text-[#999]">{relativeTime(record.studyAt)}</span>
          <span className="text-[10px] text-[#999]">学习 {record.duration} 分钟</span>
          <span className="text-[10px] text-[#C41E3A] font-medium">进度 {record.progress}%</span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-[#CCC] flex-shrink-0" />
    </button>
  )
}

// ── 骨架屏 ────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] animate-pulse">
      <div className="h-14 bg-[#C41E3A]" />
      <div className="px-4 py-4 space-y-4">
        <div className="h-24 bg-white rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl" />)}
        </div>
        <div className="h-44 bg-white rounded-2xl" />
        <div className="h-48 bg-white rounded-2xl" />
      </div>
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────
function DashboardContent() {
  const router = useRouter()
  const [data, setData] = useState<LearningDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await courseApi.dashboard()
      setData(res ?? MOCK)
    } catch {
      setData(MOCK)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <DashboardSkeleton />

  const d = data!

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="bg-[#C41E3A] px-4 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <span className="text-[17px] font-bold text-white">学习看板</span>
        <button
          onClick={() => fetchData(true)}
          className={cn("w-8 h-8 flex items-center justify-center", refreshing && "animate-spin")}
        >
          <RefreshCw className="w-4.5 h-4.5 text-white" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 pb-10">
        {/* 连续学习徽章 */}
        <StreakBadge streak={d.streak} weeklyMinutes={d.weeklyMinutes} />

        {/* 四项概览统计 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Clock className="w-5 h-5 text-[#C41E3A]" />}
            label="累计学习"
            value={fmtMinutes(d.totalMinutes)}
            color="bg-[#C41E3A]/10"
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-[#4A90D9]" />}
            label="学习课程"
            value={`${d.totalCourses} 门`}
            sub="点击查看全部"
            color="bg-[#4A90D9]/10"
          />
          <StatCard
            icon={<PenLine className="w-5 h-5 text-[#C9A96E]" />}
            label="学习笔记"
            value={`${d.totalNotes} 篇`}
            color="bg-[#C9A96E]/10"
          />
          <StatCard
            icon={<FileText className="w-5 h-5 text-[#27AE60]" />}
            label="提交作业"
            value={`${d.totalWorks} 次`}
            color="bg-[#27AE60]/10"
          />
        </div>

        {/* 趋势图 */}
        <TrendChart data={d.trend} />

        {/* 最近学习记录 */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-[15px] font-bold text-[#2C2C2C]">最近学习</span>
            <button
              onClick={() => router.push("/mine/my-courses")}
              className="text-[12px] text-[#C41E3A] flex items-center gap-0.5"
            >
              全部课程 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-4 pb-2">
            {d.recentRecords.length === 0 ? (
              <div className="py-10 text-center text-[#999] text-[13px]">暂无学习记录</div>
            ) : (
              d.recentRecords.map((r, i) => (
                <RecentCard
                  key={i}
                  record={r}
                  onClick={() => router.push(`/courses/${r.courseId}/learn`)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LearningDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
