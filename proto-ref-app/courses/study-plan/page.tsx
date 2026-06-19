"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, Target, Flame, CheckCircle2, Circle, Clock,
  Plus, Pencil, Trash2, GripVertical, Check, X, BookOpen,
  TrendingUp, Calendar, Award
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── 类型定义 ─────────────────────────────────
interface StudyGoal {
  daysPerWeek: number   // 每周学习天数 1-7
  minutesPerDay: number // 每日目标时长（分钟）
}

interface PlannedCourse {
  id: string
  courseId: string
  title: string
  cover: string
  totalLessons: number
  completedLessons: number
  scheduledDays: number[] // 0=周日 1=周一 ... 6=周六
  order: number
}

interface DailyTask {
  id: string
  courseId: string
  title: string
  lessonTitle: string
  duration: number // 分钟
  isDone: boolean
  date: string // YYYY-MM-DD
}

// ─── Mock 数据（等待后端API） ──────────────────
const MOCK_GOAL: StudyGoal = { daysPerWeek: 5, minutesPerDay: 30 }

const MOCK_COURSES: PlannedCourse[] = [
  {
    id: "pc1", courseId: "c1",
    title: "八字命理入门精讲",
    cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=120&h=80&fit=crop",
    totalLessons: 32, completedLessons: 12,
    scheduledDays: [1, 3, 5], order: 0,
  },
  {
    id: "pc2", courseId: "c2",
    title: "紫微斗数基础课",
    cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=120&h=80&fit=crop",
    totalLessons: 24, completedLessons: 6,
    scheduledDays: [2, 4], order: 1,
  },
  {
    id: "pc3", courseId: "c3",
    title: "周易易经入门",
    cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=120&h=80&fit=crop",
    totalLessons: 18, completedLessons: 0,
    scheduledDays: [6], order: 2,
  },
]

const WEEK_LABELS = ["日", "一", "二", "三", "四", "五", "六"]
const TODAY = new Date()
const todayStr = TODAY.toISOString().slice(0, 10)
const todayDay = TODAY.getDay()

// 打卡记录数据（过去30天）
const generateCheckInData = () => {
  const data: { [key: string]: number } = {}
  for (let i = 0; i < 30; i++) {
    const date = new Date(TODAY)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)
    // 模拟打卡数据：0=未打卡, 1=少量, 2=中等, 3=大量
    const rand = Math.random()
    if (rand > 0.3) {
      data[dateStr] = rand > 0.8 ? 3 : rand > 0.6 ? 2 : 1
    }
  }
  return data
}

const MOCK_CHECKIN_DATA = generateCheckInData()

// ─── 生成今日任务 ──────────────────────────────
function generateTodayTasks(courses: PlannedCourse[]): DailyTask[] {
  return courses
    .filter(c => c.scheduledDays.includes(todayDay))
    .map(c => ({
      id: `task-${c.courseId}`,
      courseId: c.courseId,
      title: c.title,
      lessonTitle: `第 ${c.completedLessons + 1} 课`,
      duration: 30,
      isDone: false,
      date: todayStr,
    }))
}

// ─── 组件：打卡日历热力图 ────────────────────────
function CheckInCalendar({ data }: { data: { [key: string]: number } }) {
  // 生成过去4周的日期
  const weeks: Date[][] = []
  const startDate = new Date(TODAY)
  startDate.setDate(startDate.getDate() - 27) // 从28天前开始
  // 对齐到周日
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  for (let w = 0; w < 4; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + w * 7 + d)
      week.push(date)
    }
    weeks.push(week)
  }
  
  const getIntensityColor = (level: number) => {
    switch (level) {
      case 0: return "bg-[#F2EFEA]"
      case 1: return "bg-[#FFE5E5]"
      case 2: return "bg-[#FF9999]"
      case 3: return "bg-[#C41E3A]"
      default: return "bg-[#F2EFEA]"
    }
  }
  
  const totalDays = Object.values(data).filter(v => v > 0).length
  
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#C41E3A]/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#C41E3A]" />
          </div>
          <span className="text-[15px] font-semibold text-[#2C2C2C]">打卡日历</span>
        </div>
        <span className="text-[12px] text-[#999999]">近30天打卡 <span className="text-[#C41E3A] font-medium">{totalDays}</span> 天</span>
      </div>
      
      {/* 星期标签 */}
      <div className="flex mb-2">
        <div className="w-6" />
        {WEEK_LABELS.map((label, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-[#999999]">{label}</div>
        ))}
      </div>
      
      {/* 热力图网格 */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex items-center">
            <div className="w-6 text-[10px] text-[#999999]">
              {week[0].getMonth() + 1}月
            </div>
            {week.map((date, di) => {
              const dateStr = date.toISOString().slice(0, 10)
              const level = data[dateStr] || 0
              const isToday = dateStr === todayStr
              const isFuture = date > TODAY
              
              return (
                <div key={di} className="flex-1 flex justify-center">
                  <div 
                    className={cn(
                      "w-6 h-6 rounded-md transition-colors",
                      isFuture ? "bg-transparent" : getIntensityColor(level),
                      isToday && "ring-2 ring-[#C41E3A] ring-offset-1"
                    )}
                    title={`${dateStr}: ${level > 0 ? "已打卡" : "未打卡"}`}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
      
      {/* 图例 */}
      <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-[#999999]">
        <span>少</span>
        <div className="w-3 h-3 rounded bg-[#F2EFEA]" />
        <div className="w-3 h-3 rounded bg-[#FFE5E5]" />
        <div className="w-3 h-3 rounded bg-[#FF9999]" />
        <div className="w-3 h-3 rounded bg-[#C41E3A]" />
        <span>多</span>
      </div>
    </div>
  )
}

// ─── 组件：目标设置卡片 ────────────────────────
function GoalCard({
  goal, onEdit,
}: { goal: StudyGoal; onEdit: () => void }) {
  const pct = Math.min(100, Math.round((goal.daysPerWeek / 7) * 100))
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#C41E3A]/10 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-[#C41E3A]" />
          </div>
          <span className="text-[15px] font-semibold text-[#2C2C2C]">学习目标</span>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-[12px] text-[#C41E3A] font-medium"
        >
          <Pencil className="w-3.5 h-3.5" /> 编辑
        </button>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 text-center bg-[#FAF8F5] rounded-xl py-3">
          <div className="text-[28px] font-black text-[#C41E3A] leading-none">{goal.daysPerWeek}</div>
          <div className="text-[11px] text-[#999] mt-1">天 / 周</div>
        </div>
        <div className="flex-1 text-center bg-[#FAF8F5] rounded-xl py-3">
          <div className="text-[28px] font-black text-[#C9A96E] leading-none">{goal.minutesPerDay}</div>
          <div className="text-[11px] text-[#999] mt-1">分钟 / 天</div>
        </div>
        <div className="flex-1 text-center bg-[#FAF8F5] rounded-xl py-3">
          <div className="text-[28px] font-black text-[#4A90D9] leading-none">
            {goal.daysPerWeek * goal.minutesPerDay}
          </div>
          <div className="text-[11px] text-[#999] mt-1">分钟 / 周</div>
        </div>
      </div>

      {/* 周计划指示格 */}
      <div className="flex gap-1.5">
        {WEEK_LABELS.map((label, i) => {
          const isToday = i === todayDay
          const planned = i !== 0 && i <= goal.daysPerWeek
          return (
            <div
              key={i}
              className={cn(
                "flex-1 h-8 rounded-md flex flex-col items-center justify-center gap-0.5 transition-all",
                isToday
                  ? "bg-[#C41E3A] text-white"
                  : planned
                    ? "bg-[#C41E3A]/10 text-[#C41E3A]"
                    : "bg-[#F2EFEA] text-[#BBBBBB]"
              )}
            >
              <span className="text-[9px] font-medium">{label}</span>
              {planned && !isToday && <div className="w-1 h-1 rounded-full bg-[#C41E3A]/50" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 组件：今日任务卡片 ────────────────────────
function TodayTaskCard({
  tasks, onToggle,
}: { tasks: DailyTask[]; onToggle: (id: string) => void }) {
  const doneCount = tasks.filter(t => t.isDone).length
  const totalMin = tasks.reduce((s, t) => s + t.duration, 0)
  const doneMin = tasks.filter(t => t.isDone).reduce((s, t) => s + t.duration, 0)

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-4 overflow-hidden">
      {/* 标题行 */}
      <div className="px-4 pt-4 pb-3 border-b border-[#F2EFEA]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <span className="text-[15px] font-semibold text-[#2C2C2C]">今日任务</span>
              <span className="text-[12px] text-[#999] ml-2">
                {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}
              </span>
            </div>
          </div>
          <div className="text-[13px] font-bold text-[#C41E3A]">
            {doneCount}/{tasks.length}
          </div>
        </div>
        {/* 进度条 */}
        <div className="mt-2.5 h-1.5 bg-[#F2EFEA] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] rounded-full transition-all duration-500"
            style={{ width: tasks.length ? `${(doneCount / tasks.length) * 100}%` : "0%" }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#999]">计划 {totalMin} 分钟</span>
          <span className="text-[10px] text-[#C41E3A]">已完成 {doneMin} 分钟</span>
        </div>
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[#BBBBBB]">
          今日没有安排学习任务
        </div>
      ) : (
        <div className="divide-y divide-[#F5F0E8]">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => onToggle(task.id)}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#FAF8F5] transition-colors text-left"
            >
              {task.isDone
                ? <CheckCircle2 className="w-5 h-5 text-[#52C41A] flex-shrink-0" />
                : <Circle className="w-5 h-5 text-[#DDDDDD] flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className={cn("text-[13px] font-medium truncate", task.isDone && "line-through text-[#BBBBBB]")}>
                  {task.title}
                </div>
                <div className="text-[11px] text-[#999] mt-0.5">{task.lessonTitle}</div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#BBBBBB] flex-shrink-0">
                <Clock className="w-3 h-3" />
                {task.duration}分钟
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 组件：课程时间线卡片 ──────────────────────
function CourseTimeline({
  courses,
  draggingId,
  onDragStart,
  onDragOver,
  onDrop,
  onRemove,
  onAdd,
}: {
  courses: PlannedCourse[]
  draggingId: string | null
  onDragStart: (id: string) => void
  onDragOver: (id: string) => void
  onDrop: () => void
  onRemove: (id: string) => void
  onAdd: () => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F2EFEA]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#4A90D9]/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#4A90D9]" />
          </div>
          <span className="text-[15px] font-semibold text-[#2C2C2C]">课程安排</span>
        </div>
        <button
          onClick={onAdd}
          className="w-7 h-7 bg-[#C41E3A]/10 rounded-full flex items-center justify-center"
        >
          <Plus className="w-4 h-4 text-[#C41E3A]" />
        </button>
      </div>

      {courses.length === 0 ? (
        <button
          onClick={onAdd}
          className="w-full py-10 flex flex-col items-center gap-2 text-[#BBBBBB]"
        >
          <BookOpen className="w-8 h-8" />
          <span className="text-[13px]">还没有安排课程，点击添加</span>
        </button>
      ) : (
        <div className="divide-y divide-[#F5F0E8]">
          {courses.map((course, idx) => {
            const pct = Math.round((course.completedLessons / course.totalLessons) * 100)
            const isDragging = draggingId === course.id
            return (
              <div
                key={course.id}
                draggable
                onDragStart={() => onDragStart(course.id)}
                onDragOver={e => { e.preventDefault(); onDragOver(course.id) }}
                onDrop={onDrop}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-all",
                  isDragging && "opacity-40 bg-[#FAF8F5]"
                )}
              >
                {/* 拖拽把手 */}
                <GripVertical className="w-4 h-4 text-[#DDDDDD] flex-shrink-0 cursor-grab active:cursor-grabbing" />

                {/* 封面 */}
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#F2EFEA]">
                  <img src={course.cover} alt={course.title} className="w-full h-full object-cover" />
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#2C2C2C] truncate">{course.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {/* 进度 */}
                    <div className="flex-1 h-1.5 bg-[#F2EFEA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#BBBBBB] flex-shrink-0">{pct}%</span>
                  </div>
                  {/* 计划日 */}
                  <div className="flex gap-1 mt-1.5">
                    {WEEK_LABELS.map((l, i) => (
                      <span
                        key={i}
                        className={cn(
                          "text-[9px] w-4 h-4 rounded flex items-center justify-center font-medium",
                          course.scheduledDays.includes(i)
                            ? "bg-[#C41E3A] text-white"
                            : "bg-[#F2EFEA] text-[#CCCCCC]"
                        )}
                      >{l}</span>
                    ))}
                  </div>
                </div>

                {/* 删除 */}
                <button
                  onClick={() => onRemove(course.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#DDDDDD] active:text-red-400 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── 组件：目标编辑弹窗 ────────────────────────
function GoalEditor({
  goal, onSave, onClose,
}: { goal: StudyGoal; onSave: (g: StudyGoal) => void; onClose: () => void }) {
  const [days, setDays] = useState(goal.daysPerWeek)
  const [minutes, setMinutes] = useState(goal.minutesPerDay)
  const minuteOptions = [15, 20, 30, 45, 60, 90, 120]

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl px-4 pt-4 pb-8 safe-area-bottom">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[16px] font-bold text-[#2C2C2C]">设置学习目标</span>
          <button onClick={onClose}><X className="w-5 h-5 text-[#999]" /></button>
        </div>

        {/* 每周天数 */}
        <div className="mb-4">
          <div className="text-[13px] text-[#666] mb-2">每周学习天数</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all",
                  days === d
                    ? "bg-[#C41E3A] text-white shadow-[0_4px_12px_rgba(196,30,58,0.3)]"
                    : "bg-[#F2EFEA] text-[#666]"
                )}
              >{d}</button>
            ))}
          </div>
        </div>

        {/* 每日时长 */}
        <div className="mb-6">
          <div className="text-[13px] text-[#666] mb-2">每日学习时长</div>
          <div className="flex flex-wrap gap-2">
            {minuteOptions.map(m => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[13px] font-bold transition-all",
                  minutes === m
                    ? "bg-[#C41E3A] text-white shadow-[0_4px_12px_rgba(196,30,58,0.3)]"
                    : "bg-[#F2EFEA] text-[#666]"
                )}
              >{m >= 60 ? `${m / 60}小时` : `${m}分钟`}</button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { onSave({ daysPerWeek: days, minutesPerDay: minutes }); onClose() }}
          className="w-full py-3.5 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white font-bold rounded-xl text-[15px] shadow-[0_4px_16px_rgba(196,30,58,0.35)]"
        >
          保存目标
        </button>
      </div>
    </div>
  )
}

// ─── 主页面 ───────────────────────────────────
export default function StudyPlanPage() {
  const router = useRouter()

  // 从 localStorage 读取或使用 mock 数据
  const [goal, setGoal] = useState<StudyGoal>(MOCK_GOAL)
  const [courses, setCourses] = useState<PlannedCourse[]>(MOCK_COURSES)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // 初始化：从 localStorage 读取
  useEffect(() => {
    try {
      const savedGoal = localStorage.getItem("study_goal")
      const savedCourses = localStorage.getItem("study_courses")
      const savedTasks = localStorage.getItem(`study_tasks_${todayStr}`)
      if (savedGoal) setGoal(JSON.parse(savedGoal))
      if (savedCourses) setCourses(JSON.parse(savedCourses))
      if (savedTasks) setTasks(JSON.parse(savedTasks))
      else setTasks(generateTodayTasks(savedCourses ? JSON.parse(savedCourses) : MOCK_COURSES))
    } catch {
      setTasks(generateTodayTasks(MOCK_COURSES))
    }
  }, [])

  const saveGoal = (g: StudyGoal) => {
    setGoal(g)
    localStorage.setItem("study_goal", JSON.stringify(g))
  }

  const toggleTask = (id: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, isDone: !t.isDone } : t)
      localStorage.setItem(`study_tasks_${todayStr}`, JSON.stringify(next))
      return next
    })
  }

  const removeCourse = (id: string) => {
    setCourses(prev => {
      const next = prev.filter(c => c.id !== id)
      localStorage.setItem("study_courses", JSON.stringify(next))
      return next
    })
  }

  // 拖拽排序
  const handleDrop = () => {
    if (!draggingId || !dragOverId || draggingId === dragOverId) {
      setDraggingId(null); setDragOverId(null); return
    }
    setCourses(prev => {
      const arr = [...prev]
      const fromIdx = arr.findIndex(c => c.id === draggingId)
      const toIdx = arr.findIndex(c => c.id === dragOverId)
      const [item] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, item)
      const reordered = arr.map((c, i) => ({ ...c, order: i }))
      localStorage.setItem("study_courses", JSON.stringify(reordered))
      return reordered
    })
    setDraggingId(null); setDragOverId(null)
  }

  // 完成度统计
  const doneCount = tasks.filter(t => t.isDone).length
  const streak = 7 // TODO: 从后端获取

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 导航栏 */}
      <div className="sticky top-0 z-10 bg-[#C41E3A] text-white">
        <div className="flex items-center h-14 px-4 gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="flex-1 text-[17px] font-bold">学习计划</span>
          <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5 text-orange-300" />
            <span className="text-[12px] font-bold">{streak}天连续</span>
          </div>
        </div>
      </div>

      {/* 完成度统计条 */}
      <div className="bg-gradient-to-r from-[#C41E3A] to-[#9B0B28] px-4 pb-5 pt-1">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-white/80">今日完成</span>
              <span className="text-[12px] text-white font-bold">{doneCount}/{tasks.length} 项</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A96E] rounded-full transition-all duration-500"
                style={{ width: tasks.length ? `${(doneCount / tasks.length) * 100}%` : "0%" }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-[24px] font-black text-[#C9A96E] leading-none">
              {tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0}%
            </div>
            <div className="text-[10px] text-white/60 mt-0.5">完成率</div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* 打卡日历热力图 */}
        <CheckInCalendar data={MOCK_CHECKIN_DATA} />
        
        {/* 目标卡片 */}
        <GoalCard goal={goal} onEdit={() => setShowGoalEditor(true)} />

        {/* 今日任务 */}
        <TodayTaskCard tasks={tasks} onToggle={toggleTask} />

        {/* 课程时间线 */}
        <CourseTimeline
          courses={courses}
          draggingId={draggingId}
          onDragStart={setDraggingId}
          onDragOver={setDragOverId}
          onDrop={handleDrop}
          onRemove={removeCourse}
          onAdd={() => router.push("/courses-list")}
        />

        {/* 底部去选课提示 */}
        <div className="mt-2 mb-8 text-center">
          <span className="text-[12px] text-[#BBBBBB]">从</span>
          <button
            onClick={() => router.push("/courses-list")}
            className="text-[12px] text-[#C41E3A] font-medium mx-1"
          >课程广场</button>
          <span className="text-[12px] text-[#BBBBBB]">添加更多课程到学习计划</span>
        </div>
      </div>

      {/* 目标编辑弹窗 */}
      {showGoalEditor && (
        <GoalEditor
          goal={goal}
          onSave={saveGoal}
          onClose={() => setShowGoalEditor(false)}
        />
      )}
    </div>
  )
}
