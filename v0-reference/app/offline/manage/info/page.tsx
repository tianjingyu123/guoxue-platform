"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ImagePlus, MapPin, Phone, Clock, Plus, X } from "lucide-react"

const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

export default function StationInfoPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: "热卜国学·北京朝阳驿站",
    phone: "010-88888888",
    address: "北京市朝阳区建国路88号SOHO现代城A座1208室",
    open: "09:00",
    close: "21:00",
    description: "热卜国学北京旗舰驿站，环境优雅，设施齐全，提供八字、风水、紫微等专业课程培训及一对一咨询服务。",
  })
  const [openDays, setOpenDays] = useState<string[]>(["周一", "周二", "周三", "周四", "周五", "周六", "周日"])
  const [photos, setPhotos] = useState<string[]>(["", ""])

  const update = (key: keyof typeof form, value: string) => setForm((p) => ({ ...p, [key]: value }))
  const toggleDay = (day: string) =>
    setOpenDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("请填写驿站名称")
      return
    }
    toast.success("驿站信息已保存")
    setTimeout(() => router.push("/offline/manage"), 800)
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/offline/manage" />
          <h1 className="text-lg font-semibold">驿站信息</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Logo 与封面 */}
        <Card className="p-4">
          <label className="text-sm font-medium">驿站封面 / 环境照片</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                {photo ? (
                  <img src={photo || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImagePlus className="w-6 h-6" />
                  </div>
                )}
                <button
                  onClick={() => setPhotos((p) => p.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {photos.length < 9 && (
              <button
                onClick={() => setPhotos((p) => [...p, ""])}
                className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}
          </div>
        </Card>

        {/* 基本信息 */}
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">驿站名称</label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-muted-foreground" /> 联系电话
            </label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-muted-foreground" /> 驿站地址
            </label>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} className="mt-2" />
            <button className="mt-2 text-xs text-primary">在地图上标注位置 ›</button>
          </div>
        </Card>

        {/* 营业时间 */}
        <Card className="p-4 space-y-3">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" /> 营业时间
          </label>
          <div className="flex items-center gap-3">
            <Input type="time" value={form.open} onChange={(e) => update("open", e.target.value)} />
            <span className="text-muted-foreground">至</span>
            <Input type="time" value={form.close} onChange={(e) => update("close", e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {weekDays.map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs border",
                  openDays.includes(day)
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </Card>

        {/* 简介 */}
        <Card className="p-4">
          <label className="text-sm font-medium">驿站简介</label>
          <Textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-2 min-h-28"
          />
        </Card>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <Button className="w-full" onClick={handleSave}>
          保存
        </Button>
      </div>
    </div>
  )
}
