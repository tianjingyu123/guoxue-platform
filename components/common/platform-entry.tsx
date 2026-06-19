"use client"

/**
 * 平台入口卡片（峰值时刻 · 传播出口母版）
 *
 * 用户在高光时刻（成就证书 / 读后小结 / 勋章解锁 / 签到里程碑）截图分享时，
 * 让画面自然带上「扫码进入平台」的入口。解锁仪式与成就时刻浮层统一复用此组件，
 * 保证品牌入口的视觉与文案一致（引用 BRAND 常量）。
 */

import { QrCode } from "lucide-react"
import { BRAND } from "@/lib/brand"
import { cn } from "@/lib/utils"

interface PlatformEntryProps {
  /** 二维码图片地址（缺省显示占位图标） */
  qrCodeUrl?: string
  /** 配色风格：深色浮层(dark) 或 浅色卡面(light) */
  variant?: "dark" | "light"
  className?: string
}

export function PlatformEntry({ qrCodeUrl, variant = "dark", className }: PlatformEntryProps) {
  const isDark = variant === "dark"
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3",
        isDark ? "border-white/15 bg-white/5" : "border-[#c9a96e]/40 bg-[#f7f0e3]",
        className,
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
        {qrCodeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrCodeUrl || "/placeholder.svg"} alt="二维码" className="h-full w-full object-cover" />
        ) : (
          <QrCode className="h-8 w-8" style={{ color: "#2c2620" }} />
        )}
      </div>
      <div className="text-left">
        <p className={cn("text-[13px] font-medium", isDark ? "text-white" : "text-[#2c2620]")}>
          扫码加入{BRAND.name}
        </p>
        <p className={cn("text-[11px]", isDark ? "text-white/55" : "text-[#7a6f60]")}>
          {BRAND.qrGuide}
        </p>
      </div>
    </div>
  )
}
