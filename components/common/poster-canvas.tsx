"use client"

// 可复用国风海报预览组件（母版系统对外入口）。
// 任意场景只需传入 PosterData + 主题，即可渲染统一风格的分享海报。
// 暴露 onReady 回调返回 dataURL，供外层做保存/分享。

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { renderPoster, type PosterTheme } from "@/lib/poster/render-engine"
import { POSTER_SIZE } from "@/lib/poster/templates"
import { canvasUtils } from "@/lib/api/poster"
import type { PosterData } from "@/lib/types/poster"
import { cn } from "@/lib/utils"

interface PosterCanvasProps {
  data: PosterData
  theme: PosterTheme
  /** 渲染完成回调，返回图片 dataURL */
  onReady?: (dataUrl: string) => void
  className?: string
  /** 预览显示宽度（px），高度按比例 */
  displayWidth?: number
}

export function PosterCanvas({
  data,
  theme,
  onReady,
  className,
  displayWidth = 300,
}: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(true)

  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsDrawing(true)

    const { width, height } = POSTER_SIZE
    const scale = 2 // 高清 2x
    canvas.width = width * scale
    canvas.height = height * scale
    ctx.setTransform(scale, 0, 0, scale, 0, 0)

    // 并行加载图片资源（容错：失败则降级为占位）
    const [qrImage, coverImage, avatarImage] = await Promise.all([
      data.qrCodeUrl ? canvasUtils.loadImage(data.qrCodeUrl).catch(() => null) : Promise.resolve(null),
      data.coverImage ? canvasUtils.loadImage(data.coverImage).catch(() => null) : Promise.resolve(null),
      data.userAvatar ? canvasUtils.loadImage(data.userAvatar).catch(() => null) : Promise.resolve(null),
    ])

    renderPoster({ ctx, data, theme, width, height, qrImage, coverImage, avatarImage })

    setIsDrawing(false)
    onReady?.(canvas.toDataURL("image/png"))
  }, [data, theme, onReady])

  useEffect(() => {
    draw()
  }, [draw])

  const displayHeight = (displayWidth * POSTER_SIZE.height) / POSTER_SIZE.width

  return (
    <div className={cn("relative", className)}>
      {isDrawing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/40">
          <div className="text-center">
            <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin text-white" />
            <p className="text-sm text-white">生成中…</p>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-2xl"
        style={{ width: displayWidth, height: displayHeight }}
        aria-label={`${data.title} 分享海报`}
        role="img"
      />
    </div>
  )
}
