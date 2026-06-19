"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import {
  ChevronLeft, Star, Users, BookOpen, BadgeCheck, Award,
  GraduationCap, Briefcase, Calendar, Heart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getInstructorDetail,
  followInstructor,
  getInstructorLevelLabel,
  getInstructorLevelColor,
} from "@/lib/api/institute"
import type { InstructorDetail } from "@/lib/types/institute"

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

export default function InstructorDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<InstructorDetail | null>(null)
  const [following, setFollowing] = useState(false)
  const [tab, setTab] = useState<"intro" | "courses" | "reviews">("intro")

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getInstructorDetail(id)
      if (res.code === 200) {
        setDetail(res.data)
        setFollowing(!!res.data.isFollowing)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    setFollowing((v) => !v)
    try {
      await followInstructor(id)
    } catch {
      setFollowing((v) => !v)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (!detail) return null

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">讲师详情</h1>
        </div>
      </header>

      {/* 头部信息 */}
      <div className="px-4 py-4">
        <div className="flex gap-4">
          <div className="relative flex-shrink-0">
            <Image src={detail.avatar || "/placeholder.svg"} alt={detail.name} width={72} height={72} className="rounded-full object-cover" />
            {detail.verified && (
              <BadgeCheck className="absolute -bottom-1 -right-1 w-5 h-5 text-primary bg-white rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{detail.name}</h2>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded", getInstructorLevelColor(detail.level))}>
                {getInstructorLevelLabel(detail.level)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{detail.title}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {detail.specialties.map((s) => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-muted/30 rounded-xl">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{detail.studentCount}</div>
            <div className="text-[10px] text-muted-foreground">学员</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{detail.courseCount}</div>
            <div className="text-[10px] text-muted-foreground">课程</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary flex items-center justify-center gap-0.5">
              <Star className="w-4 h-4 text-amber-500" />{detail.rating}
            </div>
            <div className="text-[10px] text-muted-foreground">{detail.reviewCount}条评价</div>
          </div>
        </div>
      </div>

      {/* Tab */}
      <div className="sticky top-[57px] z-10 bg-background border-b border-border flex">
        {([["intro", "简介"], ["courses", "课程"], ["reviews", "评价"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
              tab === key ? "text-primary border-primary" : "text-muted-foreground border-transparent"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {tab === "intro" && (
          <>
            <section>
              <h3 className="font-semibold mb-2">个人简介</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{detail.introduction}</p>
            </section>
            {detail.education && detail.education.length > 0 && (
              <section>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" />学术背景</h3>
                <ul className="space-y-1">
                  {detail.education.map((e, i) => (
                    <li key={i} className="text-sm text-muted-foreground">· {e}</li>
                  ))}
                </ul>
              </section>
            )}
            {detail.experience && detail.experience.length > 0 && (
              <section>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" />从业经历</h3>
                <ul className="space-y-1">
                  {detail.experience.map((e, i) => (
                    <li key={i} className="text-sm text-muted-foreground">· {e}</li>
                  ))}
                </ul>
              </section>
            )}
            {detail.certificates && detail.certificates.length > 0 && (
              <section>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Award className="w-4 h-4 text-primary" />资质证书</h3>
                <div className="space-y-2">
                  {detail.certificates.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm">
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.issuer} · {c.year}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {tab === "courses" && (
          <div className="space-y-3">
            {detail.featuredCourses && detail.featuredCourses.length > 0 ? (
              detail.featuredCourses.map((c) => (
                <div key={c.id} className="flex gap-3 p-3 bg-card border border-border rounded-xl">
                  <Image src={c.cover || "/placeholder.svg"} alt={c.title} width={80} height={60} className="rounded-lg object-cover w-20 h-16" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2">{c.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.studentCount}</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" />{c.rating}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无公开课程</p>
              </div>
            )}
          </div>
        )}

        {tab === "reviews" && (
          <div className="space-y-3">
            {detail.reviews && detail.reviews.length > 0 ? (
              detail.reviews.map((r) => (
                <div key={r.id} className="p-3 bg-card border border-border rounded-xl">
                  <div className="flex items-center gap-2">
                    <Image src={r.user.avatar || "/placeholder.svg"} alt={r.user.name} width={32} height={32} className="rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.user.name}</p>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("w-3 h-3", i < r.rating ? "text-amber-500 fill-amber-500" : "text-muted")} />
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{r.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{r.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无评价</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 flex gap-3">
        <Button variant="outline" onClick={handleFollow} className={cn(following && "text-primary border-primary")}>
          <Heart className={cn("w-4 h-4 mr-1", following && "fill-primary")} />
          {following ? "已关注" : "关注"}
        </Button>
        <Button className="flex-1" onClick={() => router.push(`/offline/teacher-booking?instructorId=${id}`)}>
          <Calendar className="w-4 h-4 mr-1" />
          预约授课
        </Button>
      </div>
    </div>
  )
}
