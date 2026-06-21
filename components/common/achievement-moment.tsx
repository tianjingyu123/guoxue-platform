"use client"

/**
 * 成就时刻仪式感浮层（峰值时刻母版）
 *
 * 用于"你做到了"的关键节点：首次结课、首次读完古籍等。
 * 渐现动效（克制，非煽情）+ 宣纸金边证书卡片（canvas）+ 可编辑 AI 感言 +
 * 保存/分享/继续 操作。后续成就解锁、签到里程碑可复用此母版。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Download, Share2, Pencil, Check, X, Loader2, ArrowRight } from "lucide-react"
import { renderAchievementCard } from "@/lib/achievement/render-card"
import { ACHIEVEMENT_META, ACHIEVEMENT_SIZE, type AchievementData } from "@/lib/types/achievement"
import { cn } from "@/lib/utils"
import { PlatformEntry } from "@/components/common/platform-entry"

interface AchievementMomentProps {
  open: boolean
  data: AchievementData
  /** 关闭 / 继续探索 */
  onClose: () => void
  /** 继续按钮文案与回调（如"继续探索古籍"） */
  continueLabel?: string
  onContinue?: () => void
  /** 读后小结允许编辑 AI 感言 */
  editableComment?: boolean
}

export function AchievementMoment({
  open,
  data,
  onClose,
  continueLabel,
  onContinue,
  editableComment = false,
}: AchievementMomentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(true)
  const [dataUrl, setDataUrl] = useState("")
  const [comment, setComment] = useState(data.aiComment)
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState("")

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })

  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    setDrawing(true)
    const { width, height } = ACHIEVEMENT_SIZE
    const scale = 2
    canvas.width = width * scale
    canvas.height = height * scale
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    const qrImage = data.qrCodeUrl ? await loadImage(data.qrCodeUrl) : null
    renderAchievementCard({ ctx, data: { ...data, aiComment: comment }, qrImage })
    setDrawing(false)
    setDataUrl(canvas.toDataURL("image/png"))
  }, [data, comment])

  // data 变化（切换不同证书/小结）时重置感言，避免常驻组件沿用上一次的旧值
  useEffect(() => {
    setComment(data.aiComment)
  }, [data.aiComment])

  useEffect(() => {
    if (open) draw()
  }, [open, draw])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 1800)
  }

  const handleSave = () => {
    if (!dataUrl) return
    const link = document.createElement("a")
    link.download = `${ACHIEVEMENT_META[data.type].sealTitle}-${data.subject}.png`
    link.href = dataUrl
    link.click()
    showToast("已保存到本地")
  }

  const handleShare = async () => {
    const text = `我在热卜国学${data.type === "certificate" ? `完成了《${data.subject}》` : `读完了《${data.subject}》`}，${comment}`
    if (navigator.share) {
      try {
        await navigator.share({ title: ACHIEVEMENT_META[data.type].sealTitle, text })
      } catch {
        /* 用户取消 */
      }
    } else {
      navigator.clipboard?.writeText(text)
      showToast("分享文案已复制")
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto bg-black/70 px-5 py-8 backdrop-blur-sm">
      {/* 关闭 */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
        aria-label="关闭"
      >
        <X className="h-5 w-5" />
      </button>

      {/* 仪式感标题（渐现） */}
      <div className="mb-5 animate-in fade-in slide-in-from-top-2 duration-700 text-center">
        <p className="font-serif text-[22px] font-bold text-white">
          {data.type === "certificate" ? "你做到了" : "书香盈袖"}
        </p>
        <p className="mt-1 text-[13px] text-white/70">
          {data.type === "certificate" ? "一段研习之旅，圆满落章" : "一卷古籍读罢，余味悠长"}
        </p>
      </div>

      {/* 证书卡片（渐现 + 缩放入场） */}
      <div className="relative animate-in fade-in zoom-in-95 duration-700">
        {drawing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/30">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-2xl"
          style={{ width: 300, height: (300 * ACHIEVEMENT_SIZE.height) / ACHIEVEMENT_SIZE.width }}
          role="img"
          aria-label={`${ACHIEVEMENT_META[data.type].sealTitle}卡片`}
        />
      </div>

      {/* 可编辑 AI 感言（读后小结） */}
      {editableComment && (
        <div className="mt-4 w-full max-w-[320px] animate-in fade-in duration-1000">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex w-full items-center justify-center gap-1.5 text-[13px] text-white/80 active:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              编辑读后感
            </button>
          ) : (
            <div className="rounded-xl bg-white/10 p-2.5">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                maxLength={50}
                className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-white placeholder:text-white/50 focus:outline-none"
                placeholder="写下你的一句话读后感…"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/50">{comment.length}/50</span>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[12px] text-white active:bg-white/30"
                >
                  <Check className="h-3 w-3" />
                  完成
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 进入平台入口（扫码引导）—— 分享传播时刻的品牌出口 */}
      <div className="mt-5 w-full max-w-[320px] animate-in fade-in duration-1000">
        <PlatformEntry qrCodeUrl={data.qrCodeUrl} variant="dark" />
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex w-full max-w-[320px] flex-col gap-2.5 animate-in fade-in duration-1000">
        <div className="flex gap-2.5">
          <button
            onClick={handleSave}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/10 py-3 text-[14px] font-medium text-white active:bg-white/20"
          >
            <Download className="h-4 w-4" />
            保存
          </button>
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-3 text-[14px] font-medium text-white active:opacity-90"
            style={{ background: "#c41e3a" }}
          >
            <Share2 className="h-4 w-4" />
            {ACHIEVEMENT_META[data.type].shareLabel}
          </button>
        </div>
        {continueLabel && (
          <button
            onClick={onContinue || onClose}
            className="flex items-center justify-center gap-1 py-2 text-[14px] text-white/80 active:text-white"
          >
            {continueLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-[13px] text-white">
          {toast}
        </div>
      )}
    </div>
  )
}
