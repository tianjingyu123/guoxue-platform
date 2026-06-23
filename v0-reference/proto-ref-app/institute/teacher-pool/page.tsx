"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Search, Star, MapPin, Users, Video, Calendar,
  Filter, ChevronRight, BadgeCheck, Award, BookOpen, Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// 老师等级
type TeacherLevel = "senior" | "intermediate" | "junior"

interface OfflineTeacher {
  id: number
  name: string
  avatar: string
  level: TeacherLevel
  specialty: string[] // 擅长领域
  location: string
  rating: number
  coursesCount: number // 授课次数
  studentsCount: number // 累计学员
  price: { min: number; max: number } // 课时费范围
  available: boolean // 是否可约
  nextAvailable?: string // 最近可约时间
  intro: string
  tags: string[]
}

// 等级配置
const levelConfig: Record<TeacherLevel, { label: string; color: string; bgColor: string }> = {
  senior: { label: "高级讲师", color: "text-gold", bgColor: "bg-gold/10" },
  intermediate: { label: "中级讲师", color: "text-info", bgColor: "bg-info/10" },
  junior: { label: "初级讲师", color: "text-success", bgColor: "bg-success/10" },
}

// 模拟数据
const mockTeachers: OfflineTeacher[] = [
  {
    id: 1, name: "张道玄", avatar: "", level: "senior",
    specialty: ["八字命理", "六爻预测"],
    location: "北京", rating: 4.9, coursesCount: 128, studentsCount: 3680,
    price: { min: 3000, max: 8000 }, available: true,
    intro: "从事命理研究30余年，师承多位名家，擅长八字格局分析和六爻实战预测。",
    tags: ["理论扎实", "案例丰富", "通俗易懂"]
  },
  {
    id: 2, name: "李易安", avatar: "", level: "senior",
    specialty: ["紫微斗数", "星象占卜"],
    location: "上海", rating: 4.8, coursesCount: 96, studentsCount: 2850,
    price: { min: 2500, max: 6000 }, available: true,
    intro: "紫微斗数传承人，深耕斗数研究20年，独创「易安飞星派」。",
    tags: ["体系完整", "实战派", "答疑耐心"]
  },
  {
    id: 3, name: "王明德", avatar: "", level: "senior",
    specialty: ["风水堪舆", "阳宅布局"],
    location: "广州", rating: 4.9, coursesCount: 86, studentsCount: 2160,
    price: { min: 5000, max: 15000 }, available: false, nextAvailable: "2024-04-15",
    intro: "玄空风水第四代传人，实地考察案例超过500例。",
    tags: ["实地教学", "案例真实", "经验丰富"]
  },
  {
    id: 4, name: "陈太极", avatar: "", level: "intermediate",
    specialty: ["易经占卜", "梅花易数"],
    location: "成都", rating: 4.7, coursesCount: 62, studentsCount: 1580,
    price: { min: 1500, max: 4000 }, available: true,
    intro: "易经研究15年，擅长将复杂理论简单化，适合初学者入门。",
    tags: ["入门首选", "讲解清晰", "互动性强"]
  },
  {
    id: 5, name: "赵无极", avatar: "", level: "intermediate",
    specialty: ["奇门遁甲", "大六壬"],
    location: "南京", rating: 4.6, coursesCount: 48, studentsCount: 1260,
    price: { min: 2000, max: 5000 }, available: true,
    intro: "奇门遁甲实战派代表，注重理论与实践结合。",
    tags: ["实战为主", "案例教学", "思路清晰"]
  },
  {
    id: 6, name: "周天师", avatar: "", level: "junior",
    specialty: ["面相手相", "体相学"],
    location: "西安", rating: 4.5, coursesCount: 32, studentsCount: 860,
    price: { min: 1000, max: 2500 }, available: true,
    intro: "相学研究10年，擅长面相、手相、体相综合分析。",
    tags: ["细致入微", "实用性强", "性价比高"]
  },
]

// 筛选选项
const specialties = ["全部", "八字命理", "紫微斗数", "风水堪舆", "易经占卜", "奇门遁甲", "面相手相"]
const cities = ["全部", "北京", "上海", "广州", "成都", "南京", "西安"]

export default function TeacherPoolPage() {
  const [searchKeyword, setSearchKeyword] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("全部")
  const [selectedCity, setSelectedCity] = useState("全部")
  const [showFilter, setShowFilter] = useState(false)

  // 筛选老师
  const filteredTeachers = mockTeachers.filter(teacher => {
    if (selectedSpecialty !== "全部" && !teacher.specialty.includes(selectedSpecialty)) return false
    if (selectedCity !== "全部" && teacher.location !== selectedCity) return false
    if (searchKeyword && !teacher.name.includes(searchKeyword) && !teacher.specialty.some(s => s.includes(searchKeyword))) return false
    return true
  })

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/institute" className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">线下老师人才库</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowFilter(!showFilter)}
            className={cn(showFilter && "text-primary")}
          >
            <Filter className="w-4 h-4 mr-1" />
            筛选
          </Button>
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索老师姓名或擅长领域"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9 bg-secondary/30 border-0"
          />
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilter && (
        <div className="px-4 py-3 border-b border-border space-y-3 bg-secondary/20">
          <div>
            <p className="text-xs text-muted-foreground mb-2">擅长领域</p>
            <div className="flex flex-wrap gap-2">
              {specialties.map(s => (
                <Button
                  key={s}
                  variant={selectedSpecialty === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSpecialty(s)}
                  className="text-xs h-7 rounded-full"
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">所在城市</p>
            <div className="flex flex-wrap gap-2">
              {cities.map(c => (
                <Button
                  key={c}
                  variant={selectedCity === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCity(c)}
                  className="text-xs h-7 rounded-full"
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>共 {filteredTeachers.length} 位老师</span>
        <span>{filteredTeachers.filter(t => t.available).length} 位可约</span>
      </div>

      {/* 老师列表 */}
      <div className="px-4 py-2 space-y-3">
        {filteredTeachers.map(teacher => {
          const level = levelConfig[teacher.level]
          return (
            <Link href={`/institute/teachers/${teacher.id}`} key={teacher.id}>
              <Card className="p-3 hover:bg-secondary/30 transition-colors">
                <div className="flex gap-3">
                  {/* 头像 */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gold/20 to-gold/20 flex items-center justify-center text-xl font-bold text-gold">
                      {teacher.name.slice(0, 1)}
                    </div>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                      level.bgColor, level.color
                    )}>
                      {level.label.slice(0, 2)}
                    </div>
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{teacher.name}</span>
                      <BadgeCheck className="w-4 h-4 text-info" />
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs">{teacher.rating}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-1">
                      {teacher.specialty.map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {teacher.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        授课{teacher.coursesCount}次
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {teacher.studentsCount}学员
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs">
                        <span className="text-muted-foreground">课时费 </span>
                        <span className="text-primary font-medium">¥{teacher.price.min}-{teacher.price.max}</span>
                      </span>
                      {teacher.available ? (
                        <Badge className="text-[10px] bg-success/10 text-success">可预约</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-muted text-muted-foreground">
                          {teacher.nextAvailable}可约
                        </Badge>
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

      {/* 驿站入口 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Link href="/institute/teacher-demand">
          <Button className="w-full" variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            我是驿站，发布课程需求
          </Button>
        </Link>
      </div>

      <div className="h-20" />
    </div>
  )
}
