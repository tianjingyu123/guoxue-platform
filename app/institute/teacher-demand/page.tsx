"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Plus, MapPin, Users, Calendar, Clock,
  ChevronRight, Filter, CheckCircle2, XCircle, MessageCircle,
  Building2, BookOpen, Coins, Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// 需求状态
type DemandStatus = "recruiting" | "matched" | "confirmed" | "completed" | "cancelled"

interface TeacherDemand {
  id: number
  stationName: string
  stationAvatar: string
  stationLocation: string
  title: string
  specialty: string
  date: string
  duration: string
  studentCount: number
  budget: { min: number; max: number }
  status: DemandStatus
  applicants: number
  description: string
  requirements: string[]
  createdAt: string
}

// 状态配置
const statusConfig: Record<DemandStatus, { label: string; color: string; bgColor: string }> = {
  recruiting: { label: "招募中", color: "text-success", bgColor: "bg-success/10" },
  matched: { label: "已匹配", color: "text-info", bgColor: "bg-info/10" },
  confirmed: { label: "已确认", color: "text-operator", bgColor: "bg-operator/10" },
  completed: { label: "已完成", color: "text-muted-foreground", bgColor: "bg-muted" },
  cancelled: { label: "已取消", color: "text-red-500", bgColor: "bg-red-500/10" },
}

// 模拟数据
const mockDemands: TeacherDemand[] = [
  {
    id: 1,
    stationName: "北京国学驿站",
    stationAvatar: "",
    stationLocation: "北京·朝阳区",
    title: "八字命理高级班授课老师",
    specialty: "八字命理",
    date: "2024-04-15 至 2024-04-17",
    duration: "3天/18课时",
    studentCount: 30,
    budget: { min: 15000, max: 25000 },
    status: "recruiting",
    applicants: 5,
    description: "招募资深八字命理老师，为高级班学员授课，要求有丰富的实战经验和教学经验。",
    requirements: ["5年以上授课经验", "研究院成员优先", "可提供往期课程录像"],
    createdAt: "2024-03-18"
  },
  {
    id: 2,
    stationName: "上海易学馆",
    stationAvatar: "",
    stationLocation: "上海·静安区",
    title: "紫微斗数入门班讲师",
    specialty: "紫微斗数",
    date: "2024-04-20 至 2024-04-21",
    duration: "2天/12课时",
    studentCount: 25,
    budget: { min: 8000, max: 12000 },
    status: "recruiting",
    applicants: 3,
    description: "招募紫微斗数讲师，负责入门班教学，需要有系统的教学大纲。",
    requirements: ["3年以上授课经验", "有完整教学体系", "善于与学员互动"],
    createdAt: "2024-03-20"
  },
  {
    id: 3,
    stationName: "广州玄学堂",
    stationAvatar: "",
    stationLocation: "广州·天河区",
    title: "风水堪舆实地教学",
    specialty: "风水堪舆",
    date: "2024-05-01 至 2024-05-03",
    duration: "3天实地考察",
    studentCount: 15,
    budget: { min: 20000, max: 35000 },
    status: "matched",
    applicants: 8,
    description: "组织风水实地考察教学，需要老师带队讲解真实案例。",
    requirements: ["高级讲师", "本地有多个可考察案例", "配合度高"],
    createdAt: "2024-03-15"
  },
  {
    id: 4,
    stationName: "成都周易学社",
    stationAvatar: "",
    stationLocation: "成都·武侯区",
    title: "易经基础班周末课程",
    specialty: "易经占卜",
    date: "2024-04-06、07、13、14",
    duration: "4天/24课时",
    studentCount: 40,
    budget: { min: 12000, max: 18000 },
    status: "confirmed",
    applicants: 6,
    description: "周末易经基础课程，面向零基础学员。",
    requirements: ["教学经验丰富", "课程内容通俗易懂", "周末时间充裕"],
    createdAt: "2024-03-10"
  },
]

// Tab选项
const tabs = [
  { id: "all", label: "全部" },
  { id: "recruiting", label: "招募中" },
  { id: "matched", label: "已匹配" },
  { id: "completed", label: "已完成" },
]

export default function TeacherDemandPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [viewMode, setViewMode] = useState<"station" | "teacher">("teacher") // 视角：驿站/老师

  // 筛选需求
  const filteredDemands = mockDemands.filter(demand => {
    if (activeTab === "all") return true
    return demand.status === activeTab
  })

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/institute/teacher-pool" className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">课程需求大厅</h1>
          </div>
          {/* 视角切换 */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <Button
              variant={viewMode === "teacher" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("teacher")}
              className="rounded-none text-xs h-7"
            >
              老师视角
            </Button>
            <Button
              variant={viewMode === "station" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("station")}
              className="rounded-none text-xs h-7"
            >
              驿站视角
            </Button>
          </div>
        </div>
      </header>

      {/* Tab切换 */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-b border-border">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-full text-xs flex-shrink-0",
              activeTab === tab.id && "bg-primary text-primary-foreground"
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 需求列表 */}
      <div className="px-4 py-3 space-y-3">
        {filteredDemands.map(demand => {
          const status = statusConfig[demand.status]
          return (
            <Link href={`/institute/demands/${demand.id}`} key={demand.id}>
              <Card className="p-3 hover:bg-secondary/30 transition-colors">
                {/* 驿站信息 */}
                <div className="flex items-center gap-2 pb-2 border-b border-border mb-2">
                  <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{demand.stationName}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {demand.stationLocation}
                    </p>
                  </div>
                  <Badge className={cn("text-[10px]", status.bgColor, status.color)}>
                    {status.label}
                  </Badge>
                </div>

                {/* 需求内容 */}
                <h3 className="font-medium text-foreground">{demand.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{demand.description}</p>

                {/* 标签 */}
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="secondary" className="text-[10px]">{demand.specialty}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{demand.duration}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{demand.studentCount}人班</Badge>
                </div>

                {/* 底部信息 */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {demand.date.split(" ")[0]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {demand.applicants}人申请
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground">预算 </span>
                    <span className="text-sm font-medium text-primary">
                      ¥{(demand.budget.min / 1000).toFixed(0)}k-{(demand.budget.max / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>

                {/* 老师视角：申请按钮 */}
                {viewMode === "teacher" && demand.status === "recruiting" && (
                  <Button size="sm" className="w-full mt-3 text-xs">
                    申请授课
                  </Button>
                )}
              </Card>
            </Link>
          )
        })}
      </div>

      {/* 驿站视角：发布需求按钮 */}
      {viewMode === "station" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Link href="/institute/demands/create">
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              发布课程需求
            </Button>
          </Link>
        </div>
      )}

      {viewMode === "station" && <div className="h-20" />}
    </div>
  )
}
