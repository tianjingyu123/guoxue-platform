"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Heart, MessageCircle, Eye, Share2, MoreHorizontal, Lock, Users } from "lucide-react"
import { 
  type CardVariant, 
  cardShell, 
  formatCount, 
  ImageGrid, 
  type ImageItem,
  AuthorRow,
  CircleSourceTag,
  TypeBadge,
} from "./primitives"

// ============================================================
// 文章/帖子统一卡片组件
// 支持多种展示形式：feed(瀑布流)、list(列表)、compact(紧凑)、featured(精选大图)
// 支持多种素材情况：无图、单图、多图(1-9张)
// ============================================================

export interface ContentCardData {
  id: number | string
  type: "article" | "post"
  title: string
  content?: string // 正文摘要
  // 图片相关 - 支持0-N张
  images?: ImageItem[]
  cover?: string // 兼容旧数据，单封面图
  coverRatio?: "horizontal" | "vertical" | "square"
  // 作者信息
  author?: {
    id?: string
    name: string
    avatar?: string
    title?: string // 头衔/认证
  }
  // 来源圈子
  circle?: {
    id: string
    name: string
    avatar?: string
  }
  // 统计数据
  views?: number
  likes?: number
  comments?: number
  shares?: number
  // 状态
  isLiked?: boolean
  isCollected?: boolean
  // 权限相关
  visibility?: "public" | "circle_only" // 公开/仅圈内
  paymentType?: "free" | "paid" | "member_free" // 免费/付费/圈内免费
  price?: number
  // 时间
  publishedAt?: string
  // 标签
  tags?: string[]
  // 是否精选/置顶
  isPinned?: boolean
  isFeatured?: boolean
}

// 卡片变体扩展
export type ContentCardVariant = CardVariant | "compact" | "featured" | "text-only"

export function ContentCard({
  data,
  variant = "feed",
  className,
  showCircle = true, // 是否显示来源圈子
  showAuthor = true, // 是否显示作者
  onImageClick,
}: {
  data: ContentCardData
  variant?: ContentCardVariant
  className?: string
  showCircle?: boolean
  showAuthor?: boolean
  onImageClick?: (index: number) => void
}) {
  const href = data.type === "article" ? `/articles/${data.id}` : `/post/${data.id}`
  
  // 处理图片数据 - 兼容旧数据格式
  const images: ImageItem[] = data.images || (data.cover ? [{ url: data.cover, ratio: data.coverRatio }] : [])
  const hasImages = images.length > 0
  const imageCount = images.length

  // ---------- 精选大图卡片（首页推荐位） ----------
  if (variant === "featured") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className={cn(cardShell, "relative overflow-hidden")}>
          {/* 大图背景 */}
          <div className="aspect-[16/9] relative">
            {hasImages ? (
              <img alt="图片" 
                src={images[0].url} 
                alt={data.title} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--brand)]/20 to-[var(--brand)]/5" />
            )}
            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {/* 内容 */}
            <div className="absolute inset-x-0 bottom-0 p-4">
              {/* 标签 */}
              <div className="flex items-center gap-2 mb-2">
                {data.isFeatured && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--brand)] text-white text-[10px] font-medium">
                    精选
                  </span>
                )}
                {data.circle && showCircle && (
                  <CircleSourceTag name={data.circle.name} avatar={data.circle.avatar} />
                )}
              </div>
              {/* 标题 */}
              <h3 className="text-lg font-bold text-white line-clamp-2 mb-2">{data.title}</h3>
              {/* 作者和统计 */}
              <div className="flex items-center justify-between">
                {showAuthor && data.author && (
                  <div className="flex items-center gap-2">
                    <img alt="图片" 
                      src={data.author.avatar || "/placeholder.svg"} 
                      alt="" 
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-sm text-white/90">{data.author.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-white/70 text-xs">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />{formatCount(data.views)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />{formatCount(data.likes)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 横向列表卡 ----------
  if (variant === "list") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className={cn(cardShell, "flex gap-3 p-3")}>
          {/* 左侧图片区 */}
          {hasImages && (
            <div className="w-[100px] flex-shrink-0">
              {imageCount === 1 ? (
                <div className="aspect-square rounded-lg overflow-hidden bg-[var(--surface-sunken)]">
                  <img src={images[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="aspect-square rounded-lg overflow-hidden bg-[var(--surface-sunken)] relative">
                  <img src={images[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {imageCount > 1 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px]">
                      {imageCount}图
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* 圈子来源 */}
              {data.circle && showCircle && (
                <div className="mb-1">
                  <CircleSourceTag name={data.circle.name} avatar={data.circle.avatar} />
                </div>
              )}
              {/* 标题 */}
              <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-clamp-2 leading-snug">
                {data.title}
              </h3>
              {/* 摘要 */}
              {data.content && !hasImages && (
                <p className="text-[12px] text-[var(--text-soft)] line-clamp-2 mt-1">{data.content}</p>
              )}
            </div>
            {/* 底部信息 */}
            <div className="flex items-center justify-between mt-2">
              {showAuthor && data.author && (
                <span className="text-[11px] text-[var(--text-soft)] truncate max-w-[100px]">
                  {data.author.name}
                </span>
              )}
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-soft)]">
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3" />{formatCount(data.views)}
                </span>
                <span className="flex items-center gap-0.5">
                  <Heart className={cn("w-3 h-3", data.isLiked && "fill-[var(--brand)] text-[var(--brand)]")} />
                  {formatCount(data.likes)}
                </span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 紧凑卡片（侧边栏、相关推荐） ----------
  if (variant === "compact") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className="flex gap-2 py-2 group">
          {hasImages && (
            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--surface-sunken)]">
              <img src={images[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-medium text-[var(--text-strong)] line-clamp-2 group-hover:text-[var(--brand)] transition-colors">
              {data.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-soft)]">
              <span>{formatCount(data.views)}阅读</span>
              {data.publishedAt && <span>{data.publishedAt}</span>}
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 纯文字卡片 ----------
  if (variant === "text-only") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className={cn(cardShell, "p-3")}>
          {/* 圈子和权限标签 */}
          <div className="flex items-center gap-2 mb-2">
            {data.circle && showCircle && (
              <CircleSourceTag name={data.circle.name} avatar={data.circle.avatar} />
            )}
            {data.visibility === "circle_only" && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500">
                <Lock className="w-2.5 h-2.5" />圈内
              </span>
            )}
          </div>
          {/* 标题 */}
          <h3 className="text-[15px] font-medium text-[var(--text-strong)] line-clamp-2 mb-2">{data.title}</h3>
          {/* 摘要 */}
          {data.content && (
            <p className="text-[13px] text-[var(--text-soft)] line-clamp-3 mb-3">{data.content}</p>
          )}
          {/* 作者和统计 */}
          <div className="flex items-center justify-between">
            {showAuthor && data.author && (
              <AuthorRow name={data.author.name} avatar={data.author.avatar} />
            )}
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-soft)]">
              <span className="flex items-center gap-0.5">
                <Heart className={cn("w-3 h-3", data.isLiked && "fill-[var(--brand)] text-[var(--brand)]")} />
                {formatCount(data.likes)}
              </span>
              <span className="flex items-center gap-0.5">
                <MessageCircle className="w-3 h-3" />{formatCount(data.comments)}
              </span>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 瀑布流/网格竖卡（默认 feed） ----------
  return (
    <Link href={href} className={cn("block break-inside-avoid mb-2", className)}>
      <article className={cn(cardShell, "overflow-hidden")}>
        {/* 图片区域 */}
        {hasImages ? (
          <div className="relative">
            {imageCount === 1 ? (
              // 单图 - 根据比例自适应
              <SingleImageCover image={images[0]} title={data.title} />
            ) : (
              // 多图 - 网格布局
              <div className="p-2 pb-0">
                <ImageGrid images={images} maxShow={4} onImageClick={onImageClick} />
              </div>
            )}
            {/* 类型角标 */}
            <TypeBadge type={data.type} />
            {/* 权限角标 */}
            {data.visibility === "circle_only" && (
              <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-black/35 backdrop-blur-md text-white/95 text-[10px]">
                <Lock className="w-2.5 h-2.5" />圈内
              </span>
            )}
          </div>
        ) : (
          // 无图 - 显示文字摘要背景
          <div className="aspect-[4/3] relative bg-gradient-to-br from-[var(--surface-sunken)] to-[var(--surface)] p-4 flex flex-col justify-end">
            <TypeBadge type={data.type} />
            <p className="text-[13px] text-[var(--text-soft)] line-clamp-4">{data.content || data.title}</p>
          </div>
        )}
        
        {/* 内容区 */}
        <div className="p-3">
          {/* 圈子来源 */}
          {data.circle && showCircle && (
            <div className="mb-1.5">
              <CircleSourceTag name={data.circle.name} avatar={data.circle.avatar} />
            </div>
          )}
          
          {/* 标题 */}
          <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-clamp-2 leading-snug mb-2">
            {data.title}
          </h3>
          
          {/* 作者行 */}
          {showAuthor && data.author && (
            <AuthorRow 
              name={data.author.name} 
              avatar={data.author.avatar}
              trailing={
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-soft)]">
                  <span className="flex items-center gap-0.5">
                    <Heart className={cn("w-3 h-3", data.isLiked && "fill-[var(--brand)] text-[var(--brand)]")} />
                    {formatCount(data.likes)}
                  </span>
                </div>
              }
            />
          )}
        </div>
      </article>
    </Link>
  )
}

// 单图封面组件 - 智能适配横竖版
function SingleImageCover({ image, title }: { image: ImageItem; title: string }) {
  const ratio = image.ratio || "square"
  
  // 横版图片 - 16:9
  if (ratio === "horizontal") {
    return (
      <div className="aspect-video relative overflow-hidden bg-[var(--surface-sunken)]">
        <img src={image.url} alt={title} className="w-full h-full object-cover" loading="lazy" />
      </div>
    )
  }
  
  // 竖版图片 - 3:4
  if (ratio === "vertical") {
    return (
      <div className="aspect-[3/4] relative overflow-hidden bg-[var(--surface-sunken)]">
        <img src={image.url} alt={title} className="w-full h-full object-cover" loading="lazy" />
      </div>
    )
  }
  
  // 方形图片 - 1:1
  return (
    <div className="aspect-square relative overflow-hidden bg-[var(--surface-sunken)]">
      <img src={image.url} alt={title} className="w-full h-full object-cover" loading="lazy" />
    </div>
  )
}

// ============================================================
// 导出便捷组件
// ============================================================
export function ArticleCard(props: Omit<Parameters<typeof ContentCard>[0], "data"> & { data: Omit<ContentCardData, "type"> }) {
  return <ContentCard {...props} data={{ ...props.data, type: "article" }} />
}

export function PostCard(props: Omit<Parameters<typeof ContentCard>[0], "data"> & { data: Omit<ContentCardData, "type"> }) {
  return <ContentCard {...props} data={{ ...props.data, type: "post" }} />
}
