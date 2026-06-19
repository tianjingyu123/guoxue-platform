import { cn } from "@/lib/utils"

export type EbookCoverColor = "blue" | "green" | "purple" | "brown" | "red" | "teal"

// 电子书平面封面配色 - 知识感渐变，与古籍馆 FlatCover 同源设计语言
const COVER: Record<EbookCoverColor, { from: string; to: string }> = {
  blue: { from: "#3b6fd4", to: "#27488f" },
  green: { from: "#3f8560", to: "#27543b" },
  purple: { from: "#6d5bb0", to: "#473a85" },
  brown: { from: "#a06a38", to: "#6f4521" },
  red: { from: "#c8324c", to: "#9e1b30" },
  teal: { from: "#2f8a8a", to: "#1d5c5c" },
}

/** 把详情页用的十六进制颜色映射回色名，保证跨页一致 */
export function ebookColorFromHex(hex?: string): EbookCoverColor {
  switch (hex) {
    case "#1e3a5f": return "blue"
    case "#1a4731": return "green"
    case "#4a1942": return "purple"
    case "#3d1f00": return "brown"
    default: return "blue"
  }
}

interface FlatBookCoverProps {
  title: string
  author?: string
  color: EbookCoverColor
  className?: string
  titleClassName?: string
}

/** 电子书平面书封 - 苹果 Books 风，纯平面渐变 + 横排可控标题 */
export function FlatBookCover({ title, author, color, className, titleClassName }: FlatBookCoverProps) {
  const c = COVER[color]
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl shadow-md flex flex-col justify-between p-2.5",
        className,
      )}
      style={{ background: `linear-gradient(150deg, ${c.from}, ${c.to})` }}
    >
      <span />
      <h3
        className={cn(
          "font-serif font-bold text-white leading-tight tracking-wide text-pretty line-clamp-3",
          titleClassName ?? "text-[15px]",
        )}
      >
        {title}
      </h3>
      <div>
        <span className="block w-6 h-px mb-1 bg-white/40" />
        {author ? <p className="text-[10px] text-white/70 truncate">{author}</p> : null}
      </div>
    </div>
  )
}
