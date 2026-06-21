"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  ChevronLeft, Search, Star, Users, BookOpen, BadgeCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  getInstructors,
  getInstructorLevelLabel,
  getInstructorLevelColor,
} from "@/lib/api/institute"
import type { Instructor, InstructorLevel } from "@/lib/types/institute"

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

const levelFilters: { id: InstructorLevel | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "master", label: "大师" },
  { id: "expert", label: "专家" },
  { id: "senior", label: "高级" },
  { id: "junior", label: "讲师" },
]

const specialtyFilters = ["全部", "八字命理", "紫微斗数", "风水堪舆", "易经占卜", "六爻预测", "奇门遁甲"]

function InstructorsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "")
  const [activeLevel, setActiveLevel] = useState<InstructorLevel | "all">("all")
  const [activeSpecialty, setActiveSpecialty] = useState("全部")

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel, activeSpecialty])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getInstructors({
        level: activeLevel === "all" ? undefined : activeLevel,
        specialty: activeSpecialty === "全部" ? undefined : activeSpecialty,
        keyword: keyword.trim() || undefined,
      })
      if (res.code === 200) setInstructors(res.data.list)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">讲师广场</h1>
        </div>
        {/* 搜索 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索讲师、擅长领域"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              className="pl-9 pr-16 bg-secondary/30 border-0"
            />
            <Button size="sm" onClick={loadData} className="absolute right-1 top-1/2 -translate-y-1/2 h-7">
              搜索
            </Button>
          </div>
        </div>
      </header>

      {/* 级别筛选 */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {levelFilters.map((f) => (
          <Button
            key={f.id}
            variant={activeLevel === f.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveLevel(f.id)}
            className="rounded-full text-xs flex-shrink-0"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* 领域筛选 */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {specialtyFilters.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSpecialty(s)}
            className={cn(
              "px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors",
              activeSpecialty === s ? "bg-primary/10 text-primary font-medium" : "bg-muted text-muted-foreground"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="px-4 space-y-3">
        {loading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : instructors.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">未找到符合条件的讲师</p>
          </div>
        ) : (
          instructors.map((ins) => (
            <div
              key={ins.id}
              onClick={() => router.push(`/institute/instructors/${ins.id}`)}
              className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex gap-3">
                <div className="relative flex-shrink-0">
                  <Image src={ins.avatar || "/placeholder.svg"} alt={ins.name} width={56} height={56} className="rounded-full object-cover" />
                  {ins.verified && (
                    <BadgeCheck className="absolute -bottom-1 -right-1 w-5 h-5 text-primary bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{ins.name}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded", getInstructorLevelColor(ins.level))}>
                      {getInstructorLevelLabel(ins.level)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{ins.title}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ins.specialties.slice(0, 3).map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ins.studentCount}学员</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{ins.courseCount}课程</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" />{ins.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function InstructorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <InstructorsContent />
    </Suspense>
  )
}
