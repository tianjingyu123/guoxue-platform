"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Phone, MessageCircle } from "lucide-react"

interface Student {
  id: string
  name: string
  avatar?: string
  phone: string
  courseCount: number
  totalSpent: number
  level: "new" | "regular" | "vip"
  lastVisit: string
}

const mockStudents: Student[] = [
  { id: "s1", name: "李明远", phone: "138****5678", courseCount: 5, totalSpent: 4980, level: "vip", lastVisit: "今天" },
  { id: "s2", name: "王静怡", phone: "139****1234", courseCount: 2, totalSpent: 1260, level: "regular", lastVisit: "2天前" },
  { id: "s3", name: "张伟", phone: "137****8899", courseCount: 1, totalSpent: 299, level: "new", lastVisit: "1周前" },
  { id: "s4", name: "陈芳", phone: "136****4321", courseCount: 3, totalSpent: 2860, level: "regular", lastVisit: "3天前" },
]

const levelMap = {
  new: { label: "新学员", cls: "bg-info/10 text-info" },
  regular: { label: "活跃", cls: "bg-success/10 text-success" },
  vip: { label: "VIP", cls: "bg-primary/10 text-primary" },
}

export default function StudentManagePage() {
  const [keyword, setKeyword] = useState("")
  const list = mockStudents.filter((s) => s.name.includes(keyword) || s.phone.includes(keyword))

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-card px-4 py-3 border-b border-border">
        <BackButton />
        <h1 className="text-base font-semibold">学员管理</h1>
      </header>

      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold">{mockStudents.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">学员总数</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-primary">{mockStudents.filter((s) => s.level === "vip").length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">VIP学员</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-success">
            ¥{mockStudents.reduce((s, x) => s + x.totalSpent, 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">累计消费</p>
        </Card>
      </div>

      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索学员姓名或手机号"
            className="pl-9"
          />
        </div>
      </div>

      <div className="px-4 mt-3 space-y-3">
        {list.map((student) => (
          <Card key={student.id} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-11 h-11">
                <AvatarImage src={student.avatar || "/placeholder.svg"} alt={student.name} />
                <AvatarFallback>{student.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{student.name}</span>
                  <Badge className={`${levelMap[student.level].cls} text-[10px]`}>{levelMap[student.level].label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {student.phone} · 最近到访 {student.lastVisit}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  报名 {student.courseCount} 门 · 消费 ¥{student.totalSpent.toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center" aria-label="拨打电话">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center" aria-label="发送消息">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">未找到匹配的学员</p>}
      </div>
    </div>
  )
}
