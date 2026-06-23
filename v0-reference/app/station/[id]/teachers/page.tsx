"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Search, Plus, Calendar, MapPin, Clock, 
  Users, Star, MessageCircle, ChevronRight, Filter
} from "lucide-react"

// 邀约记录
const invitations = [
  { 
    id: 1, 
    teacher: { name: "张道源", avatar: "", title: "八字命理专家", rating: 4.9 },
    course: "八字实战精讲",
    date: "2024-04-15",
    time: "14:00-17:00",
    fee: 3000,
    status: "confirmed",
    attendees: 25,
  },
  { 
    id: 2, 
    teacher: { name: "李易卿", avatar: "", title: "紫微斗数研究员", rating: 4.8 },
    course: "紫微斗数入门",
    date: "2024-04-20",
    time: "09:00-12:00",
    fee: 2500,
    status: "pending",
    attendees: 0,
  },
  { 
    id: 3, 
    teacher: { name: "王文昌", avatar: "", title: "风水堪舆大师", rating: 4.7 },
    course: "阳宅风水实操",
    date: "2024-03-28",
    time: "14:00-17:00",
    fee: 3500,
    status: "completed",
    attendees: 32,
  },
]

// 发布的需求
const demands = [
  {
    id: 1,
    title: "八字命理高级课程",
    category: "八字命理",
    date: "2024-04-25",
    budget: "3000-5000",
    applications: 5,
    status: "open",
  },
  {
    id: 2,
    title: "风水实地考察",
    category: "风水堪舆",
    date: "2024-05-01",
    budget: "5000-8000",
    applications: 3,
    status: "open",
  },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "待确认", color: "bg-amber-500/10 text-amber-600" },
  confirmed: { label: "已确认", color: "bg-green-500/10 text-green-600" },
  completed: { label: "已完成", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "已取消", color: "bg-red-500/10 text-red-600" },
  open: { label: "招募中", color: "bg-blue-500/10 text-blue-600" },
}

const tabs = [
  { id: "invitations", label: "邀约记录" },
  { id: "demands", label: "我的需求" },
  { id: "schedule", label: "课程排期" },
  { id: "settlement", label: "费用结算" },
]

export default function StationTeacherPage() {
  const [activeTab, setActiveTab] = useState("invitations")
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Link href="/station/manage" className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-medium">老师邀约管理</span>
          </div>
          <Link href="/institute/teacher-pool">
            <Button size="sm" variant="ghost" className="text-primary">
              <Search className="w-4 h-4 mr-1" />
              找老师
            </Button>
          </Link>
        </div>
      </header>

      {/* 快捷操作 */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex gap-2">
          <Link href="/institute/teacher-pool" className="flex-1">
            <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-xs">浏览人才库</span>
            </Button>
          </Link>
          <Link href="/institute/teacher-demand/create" className="flex-1">
            <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
              <Plus className="w-5 h-5 text-primary" />
              <span className="text-xs">发布需求</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="sticky top-12 z-40 bg-background border-b border-border">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-4 py-4">
        {/* 邀约记录 */}
        {activeTab === "invitations" && (
          <div className="space-y-3">
            {invitations.map((item) => {
              const status = statusConfig[item.status]
              return (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={item.teacher.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {item.teacher.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{item.teacher.name}</p>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.teacher.title}</p>
                      <div className="mt-2 p-2 bg-secondary/30 rounded-lg">
                        <p className="text-sm font-medium">{item.course}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium text-primary">¥{item.fee}</span>
                        {item.status === "confirmed" && (
                          <span className="text-xs text-muted-foreground">{item.attendees}人报名</span>
                        )}
                        {item.status === "completed" && (
                          <span className="text-xs text-green-600">{item.attendees}人参与</span>
                        )}
                      </div>
                      {item.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="flex-1">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            联系老师
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500">
                            取消邀约
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* 我的需求 */}
        {activeTab === "demands" && (
          <div className="space-y-3">
            <Link href="/institute/teacher-demand/create">
              <Button className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                发布新需求
              </Button>
            </Link>
            {demands.map((item) => {
              const status = statusConfig[item.status]
              return (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.title}</p>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{item.category}</Badge>
                        <span>{item.date}</span>
                        <span>预算 ¥{item.budget}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-sm">
                      <span className="text-primary font-medium">{item.applications}</span>
                      <span className="text-muted-foreground"> 位老师申请</span>
                    </span>
                    <Button size="sm">查看申请</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* 课程排期 */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-medium mb-3">2024年4月</h3>
              <div className="space-y-2">
                {invitations.filter(i => i.status === "confirmed").map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <div className="w-12 text-center">
                      <p className="text-lg font-bold text-green-600">{item.date.split("-")[2]}</p>
                      <p className="text-[10px] text-green-600">周一</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.course}</p>
                      <p className="text-xs text-muted-foreground">{item.teacher.name} · {item.time}</p>
                    </div>
                    <Badge className="bg-green-500 text-white">{item.attendees}人</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* 费用结算 */}
        {activeTab === "settlement" && (
          <div className="space-y-4">
            {/* 待结算 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">待结算</h3>
                <span className="text-lg font-bold text-primary">¥3,000</span>
              </div>
              {invitations.filter(i => i.status === "confirmed").map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg mb-2">
                  <div>
                    <p className="text-sm font-medium">{item.course}</p>
                    <p className="text-xs text-muted-foreground">{item.teacher.name} · {item.date}</p>
                  </div>
                  <span className="font-medium">¥{item.fee}</span>
                </div>
              ))}
            </Card>

            {/* 已结算 */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">已结算记录</h3>
              {invitations.filter(i => i.status === "completed").map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm">{item.course}</p>
                    <p className="text-xs text-muted-foreground">{item.teacher.name} · {item.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">¥{item.fee}</p>
                    <p className="text-[10px] text-muted-foreground">已支付</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
