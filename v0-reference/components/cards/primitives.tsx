"use client"

import { cn } from "@/lib/utils"
import { Eye, Heart, Star, Play } from "lucide-react"
import type { ReactNode } from "react"

// ============================================================
// 全平台卡片视觉 DNA - 所有内容卡片共享的统一原语
// 任何页面的商品/课程/直播/智能体卡片都必须复用这些原语，
// 以保证圆角、阴影、比例、角标、价格、作者行全平台一致。
// ============================================================

// ---------- 卡片形态变体 ----------
// feed: 瀑布流/网格竖卡（首页、发现页、商城、课程列表）
// list: 横向卡（搜索结果、我的收藏、历史）
// rail: 横滑小卡（推荐栏、详情页关联推荐）
// rank: 榜单卡（带排名徽章）
export type CardVariant = "feed" | "list" | "rail" | "rank"

// ---------- 封面比例归一化 ----------
// 全平台只允许 3:4(竖) 与 1:1(方) 两种。
// 用户上传的任意尺寸（横图 16:9 / 4:3、手机随手拍）统一 object-cover
// 居中裁切进这两种标准框，杜绝拉伸变形与瀑布流高度乱跳。
export type NormalRatio = "3:4" | "1:1"
export function normalizeRatio(coverRatio?: string): NormalRatio {
  if (coverRatio === "16:9" || coverRatio === "4:3" || coverRatio === "1:1") return "1:1"
  return "3:4"
}
export const ratioClass: Record<NormalRatio, string> = {
  "3:4": "aspect-[3/4]",
  "1:1": "aspect-square",
}

// ---------- 图片项（内容卡片的图片数据，支持横/竖/方比例） ----------
export type ImageItem = {
  url: string
  ratio?: "horizontal" | "vertical" | "square"
}

// ---------- 统一卡片容器样式 ----------
export const cardShell = cn(
  "overflow-hidden bg-[var(--surface)] rounded-2xl transition-all duration-300",
  "shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)]",
  "active:scale-[0.98] card-press",
)

// ---------- 数字格式化 ----------
export function formatCount(num?: number): string {
  if (!num) return "0"
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return num.toLocaleString()
}

// ---------- 封面图（统一裁切 + 占位底色 + 防拉伸） ----------
export function CardCover({
  src,
  alt,
  ratio = "3:4",
  className,
  children,
}: {
  src?: string
  alt?: string
  ratio?: NormalRatio
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={cn("relative overflow-hidden bg-[var(--surface-sunken)]", ratioClass[ratio], className)}>
      {src ? (
        <img
          src={src || "/placeholder.svg"}
          alt={alt || ""}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.04]"
        />
      ) : null}
      {children}
    </div>
  )
}

// ---------- 类型角标（统一低对比玻璃拟态） ----------
const typeLabels: Record<string, string> = {
  live: "直播",
  course: "课程",
  product: "好物",
  agent: "智能体",
  video: "视频",
  article: "文章",
  ebook: "古籍",
  circle: "圈子",
}
export function TypeBadge({ type, className }: { type: string; className?: string }) {
  const label = typeLabels[type]
  if (!label) return null
  return (
    <span
      className={cn(
        "absolute top-2 left-2 z-10 text-[10px] px-2 py-0.5 rounded-full",
        "text-white/95 font-medium tracking-wide bg-black/35 backdrop-blur-md",
        className,
      )}
    >
      {label}
    </span>
  )
}

// ---------- 高转化标（仅秒杀/直播/热销/免费等关键促销，醒目红） ----------
type HotKind = "seckill" | "live" | "hot" | "free" | "new"
const hotConfig: Record<HotKind, { label: string; cls: string }> = {
  seckill: { label: "秒杀", cls: "bg-[var(--danger)] text-white" },
  live: { label: "直播中", cls: "bg-[var(--brand)] text-white" },
  hot: { label: "热销", cls: "bg-[var(--brand)] text-white" },
  free: { label: "免费", cls: "bg-[var(--success)] text-white" },
  new: { label: "新品", cls: "bg-black/35 backdrop-blur-md text-white/95" },
}
export function HotBadge({ kind, className }: { kind: HotKind; className?: string }) {
  const cfg = hotConfig[kind]
  if (!cfg) return null
  const isLive = kind === "live"
  return (
    <span
      className={cn(
        "absolute top-2 right-2 z-10 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium",
        cfg.cls,
        isLive && "live-indicator",
        className,
      )}
    >
      {isLive && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
      {cfg.label}
    </span>
  )
}

// ---------- 价格（统一红色等宽，原价划线） ----------
export function PriceTag({
  price,
  originalPrice,
  size = "md",
  free,
}: {
  price?: number
  originalPrice?: number
  size?: "sm" | "md"
  free?: boolean
}) {
  if (free) {
    return <span className="text-[13px] font-bold text-[var(--success)]">免费</span>
  }
  if (price == null) return null
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-[var(--brand)] font-bold text-[11px]">¥</span>
      <span className={cn("text-[var(--brand)] font-bold font-mono", size === "md" ? "text-[16px]" : "text-[14px]")}>
        {price}
      </span>
      {originalPrice ? (
        <span className="text-[11px] text-[var(--text-soft)] line-through ml-0.5">¥{originalPrice}</span>
      ) : null}
    </span>
  )
}

// ---------- 作者行（头像 + 名字） ----------
export function AuthorRow({
  name,
  avatar,
  trailing,
}: {
  name?: string
  avatar?: string
  trailing?: ReactNode
}) {
  if (!name) return null
  return (
    <div className="flex items-center justify-between gap-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="w-4 h-4 rounded-full bg-[var(--text-soft)]/20 overflow-hidden flex items-center justify-center flex-shrink-0">
          {avatar ? (
            <img src={avatar || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[8px] text-[var(--text)]">{name.charAt(0)}</span>
          )}
        </div>
        <span className="text-[11px] text-[var(--text)] truncate">{name}</span>
      </div>
      {trailing}
    </div>
  )
}

// ---------- 统计行图标（浏览/点赞/评分） ----------
export function StatViews({ value }: { value?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-[var(--text-soft)]">
      <Eye className="w-3 h-3" />
      {formatCount(value)}
    </span>
  )
}
export function StatLikes({ value }: { value?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-[var(--text-soft)]">
      <Heart className="w-3 h-3" />
      {formatCount(value)}
    </span>
  )
}
export function StatRating({ value }: { value?: number }) {
  if (value == null) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-[var(--text)]">
      <Star className="w-3 h-3 text-[var(--gold)] fill-[var(--gold)]" />
      {value}
    </span>
  )
}

// ---------- 视频播放浮层 ----------
export function PlayOverlay({ duration }: { duration?: string }) {
  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
      </div>
      {duration ? (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
          {duration}
        </div>
      ) : null}
    </>
  )
}

// ---------- 榜单排名徽章 ----------
export function RankBadge({ rank }: { rank: number }) {
  const top3 = rank <= 3
  const colors = ["", "bg-[#E8B339] text-white", "bg-[#B8B8C0] text-white", "bg-[#C9885B] text-white"]
  return (
    <span
      className={cn(
        "flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-bold flex-shrink-0",
        top3 ? colors[rank] : "bg-[var(--surface-sunken)] text-[var(--text-soft)]",
      )}
    >
      {rank}
    </span>
  )
}

// ---------- 来源圈子标签（帖子/文章卡显示「来自 XX 圈」） ----------
export function CircleSourceTag({
  name,
  avatar,
  className,
}: {
  name: string
  avatar?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full",
        "bg-[var(--surface-sunken)] text-[var(--text-soft)] text-[10px] max-w-[140px]",
        className,
      )}
    >
      <span className="w-3.5 h-3.5 rounded-full overflow-hidden bg-[var(--brand)]/15 flex items-center justify-center flex-shrink-0">
        {avatar ? (
          <img src={avatar || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[7px] text-[var(--brand)]">{name.charAt(0)}</span>
        )}
      </span>
      <span className="truncate">{name}</span>
    </span>
  )
}

// ---------- 多图网格（1-9 张，统一裁切，超出显示 +N） ----------
export function ImageGrid({
  images,
  maxShow = 9,
  onImageClick,
}: {
  images: ImageItem[]
  maxShow?: number
  onImageClick?: (index: number) => void
}) {
  if (!images.length) return null
  const shown = images.slice(0, maxShow)
  const remaining = images.length - shown.length
  // 单图占满，2/4 图两列，其余三列（朋友圈式九宫格）
  const cols = shown.length === 1 ? 1 : shown.length === 2 || shown.length === 4 ? 2 : 3
  const gridColsClass = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3"
  return (
    <div className={cn("grid gap-1", gridColsClass)}>
      {shown.map((img, i) => {
        const isLast = i === shown.length - 1 && remaining > 0
        return (
          <button
            key={i}
            type="button"
            onClick={
              onImageClick
                ? (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onImageClick(i)
                  }
                : undefined
            }
            className={cn(
              "relative overflow-hidden bg-[var(--surface-sunken)] rounded-lg",
              cols === 1 ? "aspect-video" : "aspect-square",
            )}
          >
            <img src={img.url || "/placeholder.svg"} alt="" loading="lazy" className="w-full h-full object-cover" />
            {isLast ? (
              <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-medium">
                +{remaining}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
