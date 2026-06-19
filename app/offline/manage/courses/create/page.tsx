"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Calendar, MapPin, Users, GraduationCap, ChevronRight, ImagePlus, Info } from "lucide-react"

function CreateCourseContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const editId = searchParams.get("edit")
  const isEdit = !!editId

  const [courseType, setCourseType] = useState<"paid" | "free">("paid")
  const [seriesType, setSeriesType] = useState<"single" | "series">("single")
  const [form, setForm] = useState({
    title: "",
    cover: "",
    instructor: "",
    date: "",
    time: "",
    duration: "",
    capacity: "",
    price: "",
    address: "热卜国学·北京朝阳驿站",
    description: "",
  })

  const update = (key: keyof typeof form, value: string) => setForm((p) => ({ ...p, [key]: value }))

  const handleSubmit = (asDraft: boolean) => {
    if (!form.title.trim()) {
      toast.error("请填写课程名称")
      return
    }
    if (!asDraft && !form.instructor) {
      toast.error("请选择授课讲师")
      return
    }
    toast.success(asDraft ? "已保存为草稿" : isEdit ? "课程已更新" : "课程已提交，等待平台审核")
    setTimeout(() => router.push("/offline/manage/courses"), 800)
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/offline/manage/courses" />
          <h1 className="text-lg font-semibold">{isEdit ? "编辑课程" : "创建课程"}</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* 封面 */}
        <Card className="p-4">
          <label className="text-sm font-medium">课程封面</label>
          <button className="mt-2 w-full aspect-[2/1] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
            <ImagePlus className="w-8 h-8 mb-1" />
            <span className="text-xs">点击上传封面图（建议 2:1）</span>
          </button>
        </Card>

        {/* 基本信息 */}
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">课程名称</label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="如：八字命理入门实战班（第12期）"
              className="mt-2"
            />
          </div>

          {/* 课程类型 */}
          <div>
            <label className="text-sm font-medium">课程类型</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => setCourseType("paid")}
                className={cn(
                  "py-2.5 rounded-lg text-sm border",
                  courseType === "paid" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                )}
              >
                收费课程
              </button>
              <button
                onClick={() => setCourseType("free")}
                className={cn(
                  "py-2.5 rounded-lg text-sm border",
                  courseType === "free" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                )}
              >
                公益课程（免费）
              </button>
            </div>
          </div>

          {courseType === "paid" && (
            <div>
              <label className="text-sm font-medium">课程价格（元）</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="0.00"
                className="mt-2"
              />
            </div>
          )}

          {/* 排期类型 */}
          <div>
            <label className="text-sm font-medium">排期类型</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => setSeriesType("single")}
                className={cn(
                  "py-2.5 rounded-lg text-sm border",
                  seriesType === "single" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                )}
              >
                单次课
              </button>
              <button
                onClick={() => setSeriesType("series")}
                className={cn(
                  "py-2.5 rounded-lg text-sm border",
                  seriesType === "series" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                )}
              >
                系列课（多节排期）
              </button>
            </div>
          </div>
        </Card>

        {/* 讲师选择 */}
        <Card className="p-4">
          <label className="text-sm font-medium">授课讲师</label>
          <button
            onClick={() => router.push("/institute/teacher-pool?select=1")}
            className="mt-2 w-full flex items-center justify-between p-3 rounded-lg border border-border"
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span className={cn("text-sm", !form.instructor && "text-muted-foreground")}>
                {form.instructor || "从研究院讲师库选择"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>讲师由平台文化研究院统一管理，您可从签约讲师库中选择或填写外部讲师信息。</span>
          </div>
        </Card>

        {/* 时间地点 */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="w-4 h-4 text-primary" /> 上课时间
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
            <Input type="time" value={form.time} onChange={(e) => update("time", e.target.value)} />
          </div>
          <Input
            value={form.duration}
            onChange={(e) => update("duration", e.target.value)}
            placeholder="课程时长，如：1天（8课时）"
          />
          <div className="flex items-center gap-2 text-sm font-medium pt-2">
            <MapPin className="w-4 h-4 text-primary" /> 上课地点
          </div>
          <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
          <div className="flex items-center gap-2 text-sm font-medium pt-2">
            <Users className="w-4 h-4 text-primary" /> 人数上限
          </div>
          <Input
            type="number"
            value={form.capacity}
            onChange={(e) => update("capacity", e.target.value)}
            placeholder="如：30"
          />
        </Card>

        {/* 课程介绍 */}
        <Card className="p-4">
          <label className="text-sm font-medium">课程介绍</label>
          <Textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="介绍课程内容、适合人群、学习收获等"
            className="mt-2 min-h-32"
          />
        </Card>
      </main>

      {/* 底部操作 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => handleSubmit(true)}>
          存为草稿
        </Button>
        <Button className="flex-1" onClick={() => handleSubmit(false)}>
          {isEdit ? "保存修改" : "提交审核"}
        </Button>
      </div>
    </div>
  )
}

export default function CreateCoursePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CreateCourseContent />
    </Suspense>
  )
}
