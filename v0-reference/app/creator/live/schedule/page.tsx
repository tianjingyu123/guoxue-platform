"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { 
  ChevronLeft, ChevronRight, Plus, Calendar, Clock, Eye, 
  MoreHorizontal, Copy, Trash2, Edit3, Upload, Download,
  Radio, BookOpen, ShoppingBag, Users, FileSpreadsheet,
  CalendarDays, List, Filter, Search
} from "lucide-react"

// 模拟场次数据
const mockSchedules = [
  {
    id: 1,
    title: "八字命理入门第一课：天干地支基础",
    date: "2026-05-12",
    time: "20:00",
    duration: 90,
    type: "knowledge",
    status: "scheduled",
    seriesName: "八字命理入门系列",
    seriesIndex: 1,
    seriesTotal: 8,
    viewerEstimate: 500,
  },
  {
    id: 2,
    title: "八字命理入门第二课：五行生克制化",
    date: "2026-05-14",
    time: "20:00",
    duration: 90,
    type: "knowledge",
    status: "scheduled",
    seriesName: "八字命理入门系列",
    seriesIndex: 2,
    seriesTotal: 8,
    viewerEstimate: 500,
  },
  {
    id: 3,
    title: "开光吉祥物专场直播",
    date: "2026-05-15",
    time: "19:30",
    duration: 120,
    type: "commerce",
    status: "scheduled",
    seriesName: null,
    seriesIndex: null,
    seriesTotal: null,
    viewerEstimate: 800,
  },
  {
    id: 4,
    title: "八字命理入门第三课：十神详解",
    date: "2026-05-19",
    time: "20:00",
    duration: 90,
    type: "knowledge",
    status: "scheduled",
    seriesName: "八字命理入门系列",
    seriesIndex: 3,
    seriesTotal: 8,
    viewerEstimate: 500,
  },
  {
    id: 5,
    title: "风水布局答疑专场",
    date: "2026-05-10",
    time: "20:00",
    duration: 60,
    type: "knowledge",
    status: "completed",
    seriesName: null,
    seriesIndex: null,
    seriesTotal: null,
    viewerEstimate: 300,
    actualViewers: 428,
  },
  {
    id: 6,
    title: "紫微斗数基础课",
    date: "2026-05-08",
    time: "19:00",
    duration: 90,
    type: "knowledge",
    status: "completed",
    seriesName: "紫微斗数入门系列",
    seriesIndex: 1,
    seriesTotal: 6,
    viewerEstimate: 400,
    actualViewers: 512,
  },
]

// 获取当月日历数据
function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay()
  const totalDays = lastDay.getDate()
  
  const days: (number | null)[] = []
  
  // 填充月初空白
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }
  
  // 填充日期
  for (let i = 1; i <= totalDays; i++) {
    days.push(i)
  }
  
  return days
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// 状态配置
const statusConfig = {
  scheduled: { label: "待开播", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  live: { label: "直播中", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  completed: { label: "已结束", color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
  cancelled: { label: "已取消", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
}

export default function LiveSchedulePage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)) // 2026年5月
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<typeof mockSchedules[0] | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month])
  
  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"]
  
  // 获取某日期的场次
  const getSchedulesForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return mockSchedules.filter(s => s.date === dateStr)
  }
  
  // 过滤场次列表
  const filteredSchedules = useMemo(() => {
    return mockSchedules.filter(s => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false
      if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (selectedDate && s.date !== selectedDate) return false
      return true
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [filterStatus, searchQuery, selectedDate])
  
  // 切换月份
  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1))
    setSelectedDate(null)
  }
  
  // 复制场次
  const handleCopy = (schedule: typeof mockSchedules[0]) => {
    // 实际应用中会调用API复制场次
    console.log("复制场次:", schedule.id)
  }
  
  // 删除场次
  const handleDelete = (schedule: typeof mockSchedules[0]) => {
    setSelectedSchedule(schedule)
    setShowDeleteDialog(true)
  }
  
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">直播排期管理</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              导入
            </Button>
            <Button size="sm" onClick={() => router.push("/creator/live/create")}>
              <Plus className="w-4 h-4 mr-1.5" />
              新建场次
            </Button>
          </div>
        </div>
      </div>
      
      {/* 视图切换 & 筛选 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          {/* 视图切换 */}
          <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                viewMode === "calendar" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              <CalendarDays className="w-4 h-4" />
              日历
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              <List className="w-4 h-4" />
              列表
            </button>
          </div>
          
          {/* 搜索 */}
          <div className="flex-1 max-w-xs relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索直播..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        
        {/* 状态筛选 */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {[
            { key: "all", label: "全部" },
            { key: "scheduled", label: "待开播" },
            { key: "live", label: "直播中" },
            { key: "completed", label: "已结束" },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setFilterStatus(item.key)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors",
                filterStatus === item.key 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* 日历视图 */}
      {viewMode === "calendar" && (
        <div className="px-4 py-4">
          {/* 月份切换 */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">{year}年{monthNames[month]}</h2>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* 星期头部 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* 日历格子 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }
              
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const schedules = getSchedulesForDate(day)
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === "2026-05-10" // 模拟今天
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={cn(
                    "aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-colors relative",
                    isSelected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-secondary",
                    isToday && !isSelected && "bg-accent"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary"
                  )}>
                    {day}
                  </span>
                  
                  {/* 场次指示点 */}
                  {schedules.length > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {schedules.slice(0, 3).map((s, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            s.status === "scheduled" ? "bg-blue-500" :
                            s.status === "live" ? "bg-red-500" :
                            "bg-gray-400"
                          )}
                        />
                      ))}
                      {schedules.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{schedules.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          
          {/* 选中日期的场次列表 */}
          {selectedDate && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium mb-3">
                {formatDate(selectedDate)} 的直播 ({filteredSchedules.length}场)
              </h3>
              {filteredSchedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">当日暂无直播排期</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/creator/live/create")}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    新建场次
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSchedules.map(schedule => (
                    <ScheduleCard 
                      key={schedule.id} 
                      schedule={schedule} 
                      onEdit={() => router.push(`/creator/live/create?id=${schedule.id}`)}
                      onCopy={() => handleCopy(schedule)}
                      onDelete={() => handleDelete(schedule)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* 列表视图 */}
      {viewMode === "list" && (
        <div className="px-4 py-4">
          {/* 统计概览 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {mockSchedules.filter(s => s.status === "scheduled").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">待开播</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {mockSchedules.filter(s => s.status === "live").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">直播中</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-gray-600">
                {mockSchedules.filter(s => s.status === "completed").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">已结束</p>
            </Card>
          </div>
          
          {/* 场次列表 */}
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无直播排期</p>
              <Button className="mt-4" onClick={() => router.push("/creator/live/create")}>
                <Plus className="w-4 h-4 mr-1.5" />
                创建第一场直播
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSchedules.map(schedule => (
                <ScheduleCard 
                  key={schedule.id} 
                  schedule={schedule} 
                  showDate
                  onEdit={() => router.push(`/creator/live/create?id=${schedule.id}`)}
                  onCopy={() => handleCopy(schedule)}
                  onDelete={() => handleDelete(schedule)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* 新建场次对话框 */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建直播场次</DialogTitle>
            <DialogDescription>选择创建方式</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <button
              onClick={() => {
                setShowNewDialog(false)
                router.push("/creator/live/create")
              }}
              className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <Plus className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">单场直播</p>
              <p className="text-xs text-muted-foreground mt-1">创建独立直播场次</p>
            </button>
            <button
              onClick={() => {
                setShowNewDialog(false)
                router.push("/creator/live/create?series=true")
              }}
              className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <CalendarDays className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">系列直播</p>
              <p className="text-xs text-muted-foreground mt-1">批量创建多场直播</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 导入对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量导入场次</DialogTitle>
            <DialogDescription>通过Excel文件批量导入直播排期</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* 下载模板 */}
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <span className="text-sm">排期导入模板.xlsx</span>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4 mr-1.5" />
                下载模板
              </Button>
            </div>
            
            {/* 上传区域 */}
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">点击或拖拽文件到此处</p>
              <p className="text-xs text-muted-foreground">支持 .xlsx, .xls 格式，单次最多100条</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>取消</Button>
            <Button>开始导入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除直播「{selectedSchedule?.title}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={() => {
              console.log("删除场次:", selectedSchedule?.id)
              setShowDeleteDialog(false)
            }}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 场次卡片组件
function ScheduleCard({ 
  schedule, 
  showDate = false,
  onEdit,
  onCopy,
  onDelete,
}: { 
  schedule: typeof mockSchedules[0]
  showDate?: boolean
  onEdit: () => void
  onCopy: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const status = statusConfig[schedule.status as keyof typeof statusConfig]
  
  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* 封面占位 */}
        <div className="w-24 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 relative">
          {schedule.type === "knowledge" ? (
            <BookOpen className="w-6 h-6 text-primary/50" />
          ) : (
            <ShoppingBag className="w-6 h-6 text-primary/50" />
          )}
          {/* 系列标签 */}
          {schedule.seriesName && (
            <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/60 text-white text-[8px]">
              {schedule.seriesIndex}/{schedule.seriesTotal}
            </span>
          )}
        </div>
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-medium line-clamp-1">{schedule.title}</h3>
              {schedule.seriesName && (
                <p className="text-[10px] text-muted-foreground truncate">{schedule.seriesName}</p>
              )}
            </div>
            <Badge variant="outline" className={cn("flex-shrink-0 text-[10px]", status.color)}>
              {status.label}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {showDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(schedule.date)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {schedule.time}
            </span>
            <span>{schedule.duration}分钟</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {schedule.status === "completed" ? schedule.actualViewers : `预计${schedule.viewerEstimate}`}
            </span>
          </div>
        </div>
        
        {/* 操作菜单 */}
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-32 bg-popover border border-border rounded-lg shadow-lg py-1">
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  编辑
                </button>
                <button
                  onClick={() => { onCopy(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  复制
                </button>
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
