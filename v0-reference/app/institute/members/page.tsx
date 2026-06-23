"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Search, Crown, Award, Users, Star, 
  MessageCircle, BookOpen, Video, MapPin, Filter,
  ChevronRight, BadgeCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// 成员职位类型
type MemberRole = "dean" | "vice_dean" | "secretary" | "member"

// 成员数据
interface InstituteMember {
  id: number
  name: string
  avatar: string
  role: MemberRole
  title: string // 擅长领域
  circleName: string
  circleMembers: number
  joinDate: string
  contributions: number // 分享次数
  isOnlineTeacher: boolean // 是否入选人才库
  location?: string
}

// 职位配置（院长金色 / 副院长银色 / 秘书长蓝色）
const roleConfig: Record<MemberRole, { label: string; color: string; bgColor: string; order: number }> = {
  dean: { label: "院长", color: "text-amber-600", bgColor: "bg-amber-100", order: 1 },
  vice_dean: { label: "副院长", color: "text-slate-500", bgColor: "bg-slate-100", order: 2 },
  secretary: { label: "秘书长", color: "text-blue-600", bgColor: "bg-blue-100", order: 3 },
  member: { label: "成员", color: "text-muted-foreground", bgColor: "bg-muted", order: 4 },
}

// 模拟数据
const mockMembers: InstituteMember[] = [
  { 
    id: 1, name: "张道玄", avatar: "", role: "dean", title: "八字命理", 
    circleName: "玄学命理研习社", circleMembers: 3280, joinDate: "2022-01-01",
    contributions: 48, isOnlineTeacher: true, location: "北京"
  },
  { 
    id: 2, name: "李易安", avatar: "", role: "secretary", title: "紫微斗数", 
    circleName: "紫微斗数研究会", circleMembers: 2150, joinDate: "2022-03-15",
    contributions: 36, isOnlineTeacher: true, location: "上海"
  },
  { 
    id: 3, name: "王明德", avatar: "", role: "secretary", title: "风水堪舆", 
    circleName: "风水地理学社", circleMembers: 1860, joinDate: "2022-02-20",
    contributions: 32, isOnlineTeacher: true, location: "广州"
  },
  { 
    id: 4, name: "陈太极", avatar: "", role: "vice_dean", title: "易经占卜", 
    circleName: "周易研习圈", circleMembers: 1520, joinDate: "2022-06-10",
    contributions: 28, isOnlineTeacher: true, location: "成都"
  },
  { 
    id: 5, name: "刘玄机", avatar: "", role: "vice_dean", title: "六爻预测", 
    circleName: "六爻占卦研究会", circleMembers: 1380, joinDate: "2022-08-05",
    contributions: 24, isOnlineTeacher: false, location: "杭州"
  },
  { 
    id: 6, name: "赵无极", avatar: "", role: "vice_dean", title: "奇门遁甲", 
    circleName: "奇门遁甲学社", circleMembers: 1260, joinDate: "2022-09-12",
    contributions: 22, isOnlineTeacher: true, location: "南京"
  },
  { 
    id: 7, name: "孙易理", avatar: "", role: "member", title: "梅花易数", 
    circleName: "梅花易数研习社", circleMembers: 980, joinDate: "2023-01-20",
    contributions: 18, isOnlineTeacher: false, location: "武汉"
  },
  { 
    id: 8, name: "周天师", avatar: "", role: "member", title: "面相手相", 
    circleName: "相学研究会", circleMembers: 1120, joinDate: "2023-03-08",
    contributions: 16, isOnlineTeacher: true, location: "西安"
  },
  { 
    id: 9, name: "吴玄真", avatar: "", role: "member", title: "起名择日", 
    circleName: "姓名学研习社", circleMembers: 860, joinDate: "2023-05-15",
    contributions: 14, isOnlineTeacher: false, location: "重庆"
  },
  { 
    id: 10, name: "郑易心", avatar: "", role: "member", title: "八字命理", 
    circleName: "命理实战研究会", circleMembers: 720, joinDate: "2023-07-22",
    contributions: 12, isOnlineTeacher: false, location: "天津"
  },
]

// 筛选选项
const filterOptions = [
  { id: "all", label: "全部" },
  { id: "leadership", label: "管理层" },
  { id: "teacher", label: "人才库" },
]

export default function InstituteMembersPage() {
  const [searchKeyword, setSearchKeyword] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  
  // 筛选和排序成员
  const filteredMembers = mockMembers
    .filter(m => {
      if (activeFilter === "leadership") {
        return m.role === "dean" || m.role === "vice_dean" || m.role === "secretary"
      }
      if (activeFilter === "teacher") {
        return m.isOnlineTeacher
      }
      return true
    })
    .filter(m => {
      if (!searchKeyword) return true
      return m.name.includes(searchKeyword) || m.title.includes(searchKeyword)
    })
    .sort((a, b) => roleConfig[a.role].order - roleConfig[b.role].order)

  // 统计数据
  const stats = {
    total: mockMembers.length,
    leadership: mockMembers.filter(m => m.role !== "member").length,
    teachers: mockMembers.filter(m => m.isOnlineTeacher).length,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/institute" className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">研究院成员</h1>
          </div>
          <Badge variant="secondary" className="text-xs">
            {stats.total}人
          </Badge>
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索成员姓名或擅长领域"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9 bg-secondary/30 border-0"
          />
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-xl bg-gold/10">
            <p className="text-lg font-bold text-gold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">总成员</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-operator/10">
            <p className="text-lg font-bold text-operator">{stats.leadership}</p>
            <p className="text-[10px] text-muted-foreground">管理层</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-success/10">
            <p className="text-lg font-bold text-success">{stats.teachers}</p>
            <p className="text-[10px] text-muted-foreground">入选人才库</p>
          </div>
        </div>
      </div>

      {/* 筛选Tab */}
      <div className="px-4 py-2 flex gap-2">
        {filterOptions.map(opt => (
          <Button
            key={opt.id}
            variant={activeFilter === opt.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(opt.id)}
            className={cn(
              "rounded-full text-xs",
              activeFilter === opt.id && "bg-primary text-primary-foreground"
            )}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* 成员列表 */}
      <div className="px-4 py-3 space-y-3">
        {filteredMembers.map(member => {
          const config = roleConfig[member.role]
          return (
            <Link href={`/institute/members/${member.id}`} key={member.id}>
              <Card className="p-3 hover:bg-secondary/30 transition-colors">
                <div className="flex gap-3">
                  {/* 头像 */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/20 to-gold/20 flex items-center justify-center text-lg font-bold text-gold">
                      {member.name.slice(0, 1)}
                    </div>
                    {member.role !== "member" && (
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                        config.bgColor
                      )}>
                        {member.role === "dean" ? (
                          <Crown className={cn("w-3 h-3", config.color)} />
                        ) : member.role === "vice_dean" ? (
                          <Award className={cn("w-3 h-3", config.color)} />
                        ) : (
                          <Star className={cn("w-3 h-3", config.color)} />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{member.name}</span>
                      <Badge className={cn("text-[10px] px-1.5 py-0", config.bgColor, config.color)}>
                        {config.label}
                      </Badge>
                      {member.isOnlineTeacher && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-success/10 text-success">
                          人才库
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      擅长：{member.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {member.circleName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        分享{member.contributions}次
                      </span>
                      {member.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {member.location}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* 申请入口 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Link href="/institute/member-apply">
          <Button className="w-full bg-gradient-to-r from-gold to-gold hover:from-gold hover:to-[#7A6548]">
            申请加入研究院
          </Button>
        </Link>
      </div>

      {/* 底部占位 */}
      <div className="h-20" />
    </div>
  )
}
