"use client"

import { cn } from "@/lib/utils"

export type CoverColor = "cream" | "brown" | "blue" | "green" | "gray" | "red"

const colorConfig: Record<CoverColor, { bg: string; spine: string; text: string; border: string }> = {
  cream: {
    bg: "bg-gradient-to-br from-[#f7f3e8] via-[#f2ead8] to-[#e8dec6]",
    spine: "bg-gradient-to-r from-[#c4b08a] via-[#d4c4a8] to-[#c8b898]",
    text: "text-[#3d3225]",
    border: "border-[#d8cbb0]",
  },
  brown: {
    bg: "bg-gradient-to-br from-[#e8dcc8] via-[#dfd0b8] to-[#d0bc9a]",
    spine: "bg-gradient-to-r from-[#8b7355] via-[#a08060] to-[#907050]",
    text: "text-[#2d2418]",
    border: "border-[#c4a878]",
  },
  blue: {
    bg: "bg-gradient-to-br from-[#dce8f0] via-[#d0e0ec] to-[#c0d4e4]",
    spine: "bg-gradient-to-r from-[#6080a0] via-[#7090b0] to-[#6888a8]",
    text: "text-[#1e3348]",
    border: "border-[#a0b8d0]",
  },
  green: {
    bg: "bg-gradient-to-br from-[#e0ece0] via-[#d4e4d4] to-[#c2d8c2]",
    spine: "bg-gradient-to-r from-[#5a7a5a] via-[#6a8a6a] to-[#608060]",
    text: "text-[#1e2e1e]",
    border: "border-[#a0c0a0]",
  },
  gray: {
    bg: "bg-gradient-to-br from-[#ececea] via-[#e4e4e0] to-[#d6d6d0]",
    spine: "bg-gradient-to-r from-[#888884] via-[#989894] to-[#909088]",
    text: "text-[#2a2a28]",
    border: "border-[#c0c0b8]",
  },
  red: {
    bg: "bg-gradient-to-br from-[#f0e0dc] via-[#e8d4d0] to-[#dcbcb6]",
    spine: "bg-gradient-to-r from-[#8b4040] via-[#a05050] to-[#904848]",
    text: "text-[#3d1818]",
    border: "border-[#d0a0a0]",
  },
}

interface GuCoverProps {
  title: string
  coverColor?: CoverColor
  /** 封面宽度的 Tailwind 类，比例固定 3:4.3 */
  className?: string
  /** 竖排书名字号 */
  titleClassName?: string
  /** 装订孔数量 */
  stitches?: number
  maxChars?: number
}

/**
 * 放大版线装古书封面 - 用于书单/榜单的视觉主体
 * 还原书脊装订线、宣纸纹理、竖排书名，尺寸由 className 控制宽度
 */
export function GuCover({
  title,
  coverColor = "cream",
  className,
  titleClassName,
  stitches = 6,
  maxChars = 4,
}: GuCoverProps) {
  const colors = colorConfig[coverColor]
  const chars = title.split("").slice(0, maxChars)

  return (
    <div
      className={cn(
        "relative aspect-[3/4.3] rounded-[3px] overflow-hidden border shadow-[2px_4px_12px_rgba(100,80,50,0.22)]",
        colors.bg,
        colors.border,
        className,
      )}
    >
      {/* 宣纸纹理 */}
      <div
        className="absolute inset-0 opacity-[0.13] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* 边缘老化暗角 */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-black/[0.07]" />

      {/* 书脊 + 装订线 */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[14%] min-w-[10px]", colors.spine)}>
        <div className="absolute inset-y-[12%] left-1/2 -translate-x-1/2 flex flex-col justify-between items-center">
          {Array.from({ length: stitches }).map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-[#3d3020]/35 shadow-inner" />
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-px bg-white/25" />
      </div>

      {/* 竖排书名 - writing-mode 自然竖排，字符从上到下 */}
      <div className="absolute inset-0 left-[14%] flex items-center justify-center px-1">
        <p
          className={cn(
            "writing-vertical-rl text-center font-serif font-bold leading-[1.25] tracking-[0.05em]",
            colors.text,
            titleClassName ?? "text-base",
          )}
        >
          {chars.join("")}
        </p>
      </div>
    </div>
  )
}
