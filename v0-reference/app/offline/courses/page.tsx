"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  ChevronDown,
  Search,
  Filter,
  Building2
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { 
  getOfflineCourseList, 
  getStationList,
  getCourseStatusLabel, 
  getCourseStatusColor,
  type OfflineCourseListParams 
} from "@/lib/api/offline"
import type { OfflineCourse, Station } from "@/lib/types/offline"

// 日期筛选选项
const dateFilterOptions: { value: OfflineCourseListParams['dateFilter']; label: string }[] = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
]

export default function OfflineCoursesPage() {
  const [courses, setCourses] = useState<OfflineCourse[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStation, setSelectedStation] = useState<number | undefined>()
  const [dateFilter, setDateFilter] = useState<OfflineCourseListParams['dateFilter']>('all')
  const [showStationPicker, setShowStationPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [keyword, setKeyword] = useState("")

  // 加载驿站列表
  useEffect(() => {
    async function loadStations() {
      const res = await getStationList()
      if (res.code === 200 && res.data) {
        setStations(res.data.list)
      }
    }
    loadStations()
  }, [])

  // 加载课程列表
  useEffect(() => {
    async function loadCourses() {
      setLoading(true)
      const res = await getOfflineCourseList({
        stationId: selectedStation,
        dateFilter,
        keyword: keyword || undefined,
      })
      if (res.code === 200 && res.data) {
        setCourses(res.data.list)
      }
      setLoading(false)
    }
    loadCourses()
  }, [selectedStation, dateFilter, keyword])

  const selectedStationName = selectedStation 
    ? stations.find(s => s.id === selectedStation)?.name || '选择驿站'
    : '全部驿站'

  const selectedDateLabel = dateFilterOptions.find(d => d.value === dateFilter)?.label || '全部时间'

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/offline" />
          <h1 className="font-semibold">线下课程</h1>
          <div className="w-8" />
        </div>

        {/* 搜索栏 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索课程、讲师..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
          {/* 驿站筛选 */}
          <button
            onClick={() => {
              setShowStationPicker(!showStationPicker)
              setShowDatePicker(false)
            }}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
              selectedStation ? "bg-primary text-primary-foreground" : "bg-secondary"
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="max-w-[100px] truncate">{selectedStationName}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* 日期筛选 */}
          <button
            onClick={() => {
              setShowDatePicker(!showDatePicker)
              setShowStationPicker(false)
            }}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
              dateFilter !== 'all' ? "bg-primary text-primary-foreground" : "bg-secondary"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{selectedDateLabel}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 驿站选择下拉 */}
        {showStationPicker && (
          <div className="absolute left-0 right-0 bg-background border-b border-border shadow-lg max-h-64 overflow-y-auto z-40">
            <button
              onClick={() => {
                setSelectedStation(undefined)
                setShowStationPicker(false)
              }}
              className={cn(
                "w-full px-4 py-3 text-left text-sm border-b border-border/50 hover:bg-secondary/50",
                !selectedStation && "text-primary font-medium"
              )}
            >
              全部驿站
            </button>
            {stations.map(station => (
              <button
                key={station.id}
                onClick={() => {
                  setSelectedStation(station.id)
                  setShowStationPicker(false)
                }}
                className={cn(
                  "w-full px-4 py-3 text-left text-sm border-b border-border/50 hover:bg-secondary/50",
                  selectedStation === station.id && "text-primary font-medium"
                )}
              >
                <div className="font-medium">{station.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{station.address}</div>
              </button>
            ))}
          </div>
        )}

        {/* 日期选择下拉 */}
        {showDatePicker && (
          <div className="absolute left-0 right-0 bg-background border-b border-border shadow-lg z-40">
            {dateFilterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setDateFilter(option.value)
                  setShowDatePicker(false)
                }}
                className={cn(
                  "w-full px-4 py-3 text-left text-sm border-b border-border/50 hover:bg-secondary/50",
                  dateFilter === option.value && "text-primary font-medium"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 课程列表 */}
      <main className="px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="w-28 h-20 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Calendar className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">暂无课程</p>
            <p className="text-sm text-muted-foreground/70">
              {keyword ? '没有找到匹配的课程' : '该时间段暂无线下课程安排'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map(course => (
              <Link key={course.id} href={`/offline/courses/${course.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex gap-3 p-3">
                    {/* 封面 */}
                    <div className="relative w-28 h-20 flex-shrink-0">
                      <img
                        src={course.cover}
                        alt={course.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {course.price === 0 && (
                        <Badge className="absolute top-1 left-1 bg-green-500 text-white text-[10px] px-1.5">
                          免费
                        </Badge>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-sm line-clamp-1">{course.title}</h3>
                        <Badge className={cn("text-[10px] px-1.5 flex-shrink-0", getCourseStatusColor(course.status))}>
                          {getCourseStatusLabel(course.status)}
                        </Badge>
                      </div>

                      {/* 讲师 */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={course.instructor.avatar} />
                          <AvatarFallback className="text-[8px]">
                            {course.instructor.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {course.instructor.name}
                        </span>
                        {course.instructor.title && (
                          <span className="text-[10px] text-muted-foreground/70">
                            · {course.instructor.title}
                          </span>
                        )}
                      </div>

                      {/* 时间地点 */}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-1.5">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(course.startTime).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{course.stationName}</span>
                        </span>
                      </div>

                      {/* 价格和人数 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          {course.price > 0 ? (
                            <>
                              <span className="text-primary font-semibold text-sm">
                                ¥{course.price}
                              </span>
                              {course.originalPrice && course.originalPrice > course.price && (
                                <span className="text-[10px] text-muted-foreground line-through">
                                  ¥{course.originalPrice}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-green-600 font-semibold text-sm">免费</span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span>{course.currentParticipants}/{course.maxParticipants}人</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 标签 */}
                  {course.tags && course.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 px-3 pb-3">
                      {course.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 点击遮罩关闭下拉 */}
      {(showStationPicker || showDatePicker) && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => {
            setShowStationPicker(false)
            setShowDatePicker(false)
          }} 
        />
      )}
    </div>
  )
}
