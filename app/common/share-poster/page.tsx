"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { X, Download, Share2, Check, Loader2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getPosterData,
  recordPosterShare,
  getPosterTypeTitle,
} from "@/lib/api/poster"
import { PosterCanvas } from "@/components/common/poster-canvas"
import { POSTER_THEMES } from "@/lib/poster/templates"
import { SHARE_TONES } from "@/lib/brand"
import type { PosterType, PosterData } from "@/lib/types/poster"

function SharePosterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const type = (searchParams.get("type") || "invite") as PosterType
  const targetId = searchParams.get("targetId") ? Number(searchParams.get("targetId")) : undefined

  const [isLoading, setIsLoading] = useState(true)
  const [posterData, setPosterData] = useState<PosterData | null>(null)
  const [themeIndex, setThemeIndex] = useState(0)
  const [posterUrl, setPosterUrl] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [toneIndex, setToneIndex] = useState(0)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const dataRes = await getPosterData(type, targetId)
        if (dataRes.code === 200 && dataRes.data) {
          setPosterData(dataRes.data)
        }
      } catch {
        toast.error("加载失败")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [type, targetId])

  const handleReady = useCallback((url: string) => {
    setPosterUrl(url)
  }, [])

  const handleSave = async () => {
    if (!posterUrl) return
    setIsSaving(true)
    try {
      const link = document.createElement("a")
      link.download = `热卜-${getPosterTypeTitle(type)}-${Date.now()}.png`
      link.href = posterUrl
      link.click()
      await recordPosterShare(type, targetId, "save")
      toast.success("海报已保存")
    } catch {
      toast.error("保存失败")
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = async () => {
    if (!posterUrl) return
    try {
      const response = await fetch(posterUrl)
      const blob = await response.blob()
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "poster.png", { type: "image/png" })] })) {
        const file = new File([blob], "分享海报.png", { type: "image/png" })
        await navigator.share({ title: getPosterTypeTitle(type), files: [file] })
        await recordPosterShare(type, targetId, "share")
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        toast.success("海报已复制到剪贴板")
        await recordPosterShare(type, targetId, "copy")
      }
    } catch {
      toast.error("分享失败，请长按海报保存")
    }
  }

  if (isLoading || !posterData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-900">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-white" />
          <p className="text-white/70">加载中…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-900">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={() => router.back()} className="text-white" aria-label="关闭">
            <X className="h-6 w-6" />
          </button>
          <h1 className="font-medium text-white">{getPosterTypeTitle(type)}</h1>
          <div className="w-6" />
        </div>
      </header>

      {/* 海报预览区 */}
      <div className="flex flex-1 items-center justify-center px-6 py-4">
        <PosterCanvas
          data={posterData}
          theme={POSTER_THEMES[themeIndex]}
          onReady={handleReady}
          displayWidth={300}
        />
      </div>

      {/* 模板（主题）选择 */}
      <div className="px-4 pb-4">
        <p className="mb-2 text-sm text-white/70">选择风格</p>
        <div className="flex gap-3">
          {POSTER_THEMES.map((theme, index) => (
            <button
              key={theme.id}
              onClick={() => setThemeIndex(index)}
              className={cn(
                "relative flex-1 rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all",
                themeIndex === index
                  ? "border-primary text-white"
                  : "border-white/15 text-white/60",
              )}
              style={{ background: theme.bg }}
            >
              <span style={{ color: theme.headerStyle === "dark" ? theme.gold : theme.ink }}>
                {theme.name}
              </span>
              {themeIndex === index && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 分享文案风格（3.2 节：文化感文案，非诱导式） */}
      <div className="px-4 pb-4">
        <p className="mb-2 text-sm text-white/70">分享文案</p>
        <div className="mb-2 flex gap-2">
          {SHARE_TONES.map((t, i) => (
            <button
              key={t.tone}
              onClick={() => setToneIndex(i)}
              className={cn(
                "rounded-full px-3 py-1 text-[13px] transition-colors",
                toneIndex === i ? "bg-primary text-white" : "bg-white/10 text-white/60",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2.5">
          <p className="flex-1 text-pretty text-[13px] leading-relaxed text-white/90">
            {SHARE_TONES[toneIndex].build(posterData.title)}
          </p>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(SHARE_TONES[toneIndex].build(posterData.title))
              toast.success("文案已复制")
            }}
            className="flex-shrink-0 text-white/60 active:text-white"
            aria-label="复制文案"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="safe-area-bottom border-t border-white/10 bg-neutral-900/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-12 flex-1 border-white/20 text-white hover:bg-white/10"
            onClick={handleSave}
            disabled={!posterUrl || isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
            保存到相册
          </Button>
          <Button
            className="h-12 flex-1 bg-primary hover:bg-primary/90"
            onClick={handleShare}
            disabled={!posterUrl}
          >
            <Share2 className="mr-2 h-5 w-5" />
            立即分享
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SharePosterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-900">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      }
    >
      <SharePosterContent />
    </Suspense>
  )
}
