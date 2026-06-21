"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar, Clock, MapPin, Users, Video, Tag, Share2, ChevronRight,
} from "lucide-react"
import {
  getInstituteEvents, enrollEvent, cancelEventEnrollment,
  getEventTypeLabel, getEventTypeColor, getEventStatusLabel, getEventStatusColor,
} from "@/lib/api/institute"
import type { InstituteEvent } from "@/lib/types/institute"
import { cn } from "@/lib/utils"

export default function InstituteEventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = Number(params.id)

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<InstituteEvent | null>(null)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await getInstituteEvents()
        if (res.code === 200 && res.data) {
          const found = res.data.list.find((e) => e.id === eventId) ?? null
          setEvent(found)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventId])

  const handleEnroll = async () => {
    if (!event) return
    setEnrolling(true)
    try {
      if (event.isEnrolled) {
        const res = await cancelEventEnrollment(event.id)
        if (res.code === 200) {
          setEvent({ ...event, isEnrolled: false, currentParticipants: Math.max(0, event.currentParticipants - 1) })
        }
      } else {
        const res = await enrollEvent(event.id)
        if (res.code === 200) {
          setEvent({ ...event, isEnrolled: true, currentParticipants: event.currentParticipants + 1 })
        }
      }
    } finally {
      setEnrolling(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-52 w-full" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 px-4 py-3 backdrop-blur">
          <BackButton />
          <h1 className="font-medium">活动详情</h1>
        </header>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Calendar className="mb-3 h-12 w-12 opacity-40" />
          <p className="text-sm">活动不存在或已下架</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/institute/events")}>
            返回活动列表
          </Button>
        </div>
      </div>
    )
  }

  const isFull = event.maxParticipants != null && event.currentParticipants >= event.maxParticipants
  const canEnroll = event.status === "enrolling" || event.status === "upcoming"

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 封面 */}
      <div className="relative h-52 w-full bg-muted">
        {event.cover && (
          <img src={event.cover || "/placeholder.svg"} alt={event.title} className="h-full w-full object-cover" crossOrigin="anonymous" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
          <BackButton className="bg-black/30 text-white hover:bg-black/40" />
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white">
            <Share2 className="h-4 w-4" />
          </button>
        </header>
        <div className="absolute bottom-3 left-4 flex gap-2">
          <Badge className={cn("text-[11px]", getEventTypeColor(event.type))}>{getEventTypeLabel(event.type)}</Badge>
          <Badge className={cn("text-[11px]", getEventStatusColor(event.status))}>{getEventStatusLabel(event.status)}</Badge>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {/* 标题与价格 */}
        <Card className="p-4">
          <h1 className="text-lg font-semibold text-balance">{event.title}</h1>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-operator" />
              <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              {event.isOnline ? <Video className="h-4 w-4 text-operator" /> : <MapPin className="h-4 w-4 text-operator" />}
              <span>{event.isOnline ? "线上活动" : event.location || "线下活动"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-operator" />
              <span>
                已报名 {event.currentParticipants}
                {event.maxParticipants ? ` / ${event.maxParticipants}` : ""} 人
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2 border-t pt-3">
            {event.price > 0 ? (
              <>
                <span className="text-xl font-bold text-operator">¥{event.price}</span>
                {event.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">¥{event.originalPrice}</span>
                )}
              </>
            ) : (
              <span className="text-xl font-bold text-green-600">免费</span>
            )}
          </div>
        </Card>

        {/* 主讲人 */}
        {event.speakers?.length > 0 && (
          <Card className="p-4">
            <h2 className="mb-3 font-medium">主讲嘉宾</h2>
            <div className="space-y-3">
              {event.speakers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/institute/instructors/${s.id}`)}
                  className="flex w-full items-center gap-3"
                >
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={s.avatar || "/placeholder.svg"} alt={s.name} />
                    <AvatarFallback>{s.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.title}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* 活动简介 */}
        {event.description && (
          <Card className="p-4">
            <h2 className="mb-2 font-medium">活动介绍</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{event.description}</p>
          </Card>
        )}

        {/* 标签 */}
        {event.tags && event.tags.length > 0 && (
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {event.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[11px]">
                  <Tag className="mr-1 h-3 w-3" />
                  {t}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* 底部报名栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{getEventStatusLabel(event.status)}</span>
        </div>
        <Button
          className="flex-1 bg-operator hover:bg-operator/90"
          disabled={enrolling || !canEnroll || (isFull && !event.isEnrolled)}
          onClick={handleEnroll}
        >
          {enrolling
            ? "处理中..."
            : event.isEnrolled
              ? "取消报名"
              : isFull
                ? "名额已满"
                : !canEnroll
                  ? "报名已结束"
                  : "立即报名"}
        </Button>
      </div>
    </div>
  )
}
