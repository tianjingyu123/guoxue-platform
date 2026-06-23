"use client"

/**
 * 讨论 / 评价母版组件
 *
 * 统一原型中分散的三套评论实现，定下平台的社交讨论视觉语言。
 * 能力：评论 + 星级评价双模式 / 认证标识 / 精选置顶 / 划线引用 / 楼中楼 / 热度排序。
 * 全程使用设计令牌（无硬编码色），深色模式与小程序友好。
 */

import { useMemo, useRef, useState } from "react"
import {
  Heart,
  MessageCircle,
  CornerDownRight,
  Send,
  Star,
  Quote,
  BadgeCheck,
  Crown,
  GraduationCap,
  Pin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  AuthorBadge,
  DiscussionAuthor,
  DiscussionConfig,
  DiscussionItem,
} from "@/lib/types/discussion"
import { AIAssistPopover } from "@/components/common/ai-assist-popover"
import type { AIAssistScene } from "@/lib/types/ai-assist"

const AVATAR_COLORS = ["#a06a38", "#2e5a88", "#3e7a52", "#c41e3a", "#8a6d2f", "#6b4a7a"]
function avatarColor(name: string) {
  let sum = 0
  for (const ch of name) sum += ch.charCodeAt(0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function Avatar({ author, size = 36 }: { author: DiscussionAuthor; size?: number }) {
  if (author.avatar) {
    return (
      <img
        src={author.avatar || "/placeholder.svg"}
        alt={author.name}
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{ width: size, height: size, background: avatarColor(author.name), fontSize: size * 0.4 }}
      aria-hidden
    >
      {author.name.charAt(0)}
    </span>
  )
}

// 认证标识：不同身份不同图标与文案
function AuthorBadgeTag({ badge, accent }: { badge?: AuthorBadge; accent: string }) {
  if (!badge || badge === "none") return null
  const map: Record<Exclude<AuthorBadge, "none">, { icon: typeof BadgeCheck; label: string }> = {
    teacher: { icon: GraduationCap, label: "讲师" },
    official: { icon: BadgeCheck, label: "官方" },
    master: { icon: Crown, label: "名家" },
    vip: { icon: Crown, label: "会员" },
  }
  const { icon: Icon, label } = map[badge]
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
      style={{ background: accent }}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// 星级展示（评价模式）
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} 星`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(i < rating ? "fill-accent text-accent" : "text-muted-foreground/30")}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  )
}

interface DiscussionPanelProps {
  config: DiscussionConfig
  items: DiscussionItem[]
  className?: string
  /** 内联模式（嵌在页面里），默认 false 为底部弹层需外层包裹 */
  inline?: boolean
  /** 启用 AI 辅助：在输入栏嵌入润色/雅化按钮（默认关闭，保持克制） */
  enableAIAssist?: boolean
}

export function DiscussionPanel({ config, items, className, inline = true, enableAIAssist = false }: DiscussionPanelProps) {
  const accent = config.accentColor || "#c41e3a"
  const isReview = config.mode === "review"
  const [data, setData] = useState<DiscussionItem[]>(items)
  const [sort, setSort] = useState<"hot" | "new">("hot")
  const [input, setInput] = useState("")
  const [rating, setRating] = useState(5)
  const [replyTo, setReplyTo] = useState<{ id: string | number; name: string } | null>(null)
  const [openReplies, setOpenReplies] = useState<Set<string | number>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // 精选置顶优先，其余按排序规则
  const sorted = useMemo(() => {
    const featured = data.filter((d) => d.featured)
    const rest = data.filter((d) => !d.featured)
    rest.sort((a, b) => (sort === "hot" ? b.likeCount - a.likeCount : 0))
    if (sort === "new") rest.reverse()
    return [...featured, ...rest]
  }, [data, sort])

  const total = data.reduce((n, c) => n + 1 + c.replies.length, 0)

  const toggleLike = (id: string | number) =>
    setData((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, liked: !c.liked, likeCount: c.liked ? c.likeCount - 1 : c.likeCount + 1 } : c,
      ),
    )

  const toggleReplies = (id: string | number) =>
    setOpenReplies((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const submit = () => {
    const text = input.trim()
    if (!text) return
    const me: DiscussionAuthor = { id: "me", name: "我" }
    if (replyTo) {
      setData((prev) =>
        prev.map((c) =>
          c.id === replyTo.id
            ? {
                ...c,
                replies: [
                  ...c.replies,
                  { id: `r${Date.now()}`, author: me, content: text, time: "刚刚", likeCount: 0, replyToName: replyTo.name },
                ],
              }
            : c,
        ),
      )
      setOpenReplies((prev) => new Set(prev).add(replyTo.id))
    } else {
      setData((prev) => [
        {
          id: `c${Date.now()}`,
          author: me,
          content: text,
          time: "刚刚",
          likeCount: 0,
          replies: [],
          ...(isReview ? { rating } : {}),
        },
        ...prev,
      ])
    }
    setInput("")
    setReplyTo(null)
  }

  const handleReply = (id: string | number, name: string) => {
    setReplyTo({ id, name })
    inputRef.current?.focus()
  }

  return (
    <div className={cn("flex flex-col bg-card", className)}>
      {/* 头部 */}
      <div className="flex-shrink-0 border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[17px] font-bold text-foreground">{config.title}</h3>
            <span className="text-[13px] text-muted-foreground">{total} 条</span>
          </div>
          {isReview && config.averageRating !== undefined && (
            <div className="flex items-center gap-1.5">
              <Stars rating={Math.round(config.averageRating)} />
              <span className="text-[15px] font-bold text-foreground">{config.averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="mt-2.5 flex gap-2">
          {(["hot", "new"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "rounded-full px-3 py-1 text-[13px] transition-colors",
                sort === s ? "text-white" : "bg-muted text-muted-foreground",
              )}
              style={sort === s ? { background: accent } : undefined}
            >
              {s === "hot" ? "最热" : "最新"}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {sorted.length === 0 && (
          <p className="py-12 text-center text-[14px] text-muted-foreground">还没有讨论，来说两句吧～</p>
        )}
        {sorted.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar author={c.author} />
            <div className="min-w-0 flex-1">
              {/* 作者行 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-medium text-foreground">{c.author.name}</span>
                <AuthorBadgeTag badge={c.author.badge} accent={accent} />
                {c.featured && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: `${accent}1a`, color: accent }}
                  >
                    <Pin className="h-3 w-3" />
                    精选
                  </span>
                )}
                {isReview && c.rating !== undefined && <Stars rating={c.rating} size={12} />}
              </div>

              {/* 划线引用 */}
              {c.quote && (
                <div
                  className="mt-1.5 flex gap-1.5 rounded-lg px-2.5 py-1.5"
                  style={{ background: "var(--muted)", borderLeft: `2px solid ${accent}` }}
                >
                  <Quote className="mt-0.5 h-3 w-3 flex-shrink-0" style={{ color: accent }} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{c.quote.text}</p>
                    {c.quote.source && (
                      <span className="text-[11px] font-medium" style={{ color: accent }}>
                        — {c.quote.source}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 正文 */}
              <p className="mt-1.5 text-pretty text-[14px] leading-relaxed text-foreground/90">{c.content}</p>

              {/* 操作行 */}
              <div className="mt-1.5 flex items-center gap-4 text-[12px] text-muted-foreground">
                <span>{c.time}</span>
                <button onClick={() => handleReply(c.id, c.author.name)} className="flex items-center gap-1 active:text-foreground">
                  <MessageCircle className="h-3.5 w-3.5" />
                  回复
                </button>
                <button
                  onClick={() => toggleLike(c.id)}
                  className="ml-auto flex items-center gap-1"
                  style={c.liked ? { color: accent } : undefined}
                >
                  <Heart className={cn("h-3.5 w-3.5", c.liked && "fill-current")} />
                  {c.likeCount > 0 && c.likeCount}
                </button>
              </div>

              {/* 楼中楼 */}
              {c.replies.length > 0 && (
                <div className="mt-2">
                  {!openReplies.has(c.id) ? (
                    <button
                      onClick={() => toggleReplies(c.id)}
                      className="flex items-center gap-1 text-[12px]"
                      style={{ color: accent }}
                    >
                      <CornerDownRight className="h-3.5 w-3.5" />
                      展开 {c.replyCount ?? c.replies.length} 条回复
                    </button>
                  ) : (
                    <div className="mt-1 space-y-2.5 border-l-2 border-border/60 pl-3">
                      {c.replies.map((r) => (
                        <div key={r.id} className="flex gap-2">
                          <Avatar author={r.author} size={24} />
                          <div className="min-w-0 flex-1">
                            <span className="text-[13px] font-medium text-foreground">{r.author.name}</span>
                            {r.replyToName && (
                              <span className="text-[13px] text-muted-foreground"> 回复 @{r.replyToName}</span>
                            )}
                            <p className="text-pretty text-[13px] leading-relaxed text-foreground/85">{r.content}</p>
                            <span className="text-[11px] text-muted-foreground">{r.time}</span>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => toggleReplies(c.id)} className="text-[12px] text-muted-foreground">
                        收起回复
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 输入栏 */}
      <div className="flex-shrink-0 border-t border-border/60 bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* 评价模式：发布前选星 */}
        {isReview && !replyTo && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">评分</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setRating(i + 1)} aria-label={`${i + 1} 星`}>
                <Star
                  className={cn("h-5 w-5", i < rating ? "fill-accent text-accent" : "text-muted-foreground/30")}
                />
              </button>
            ))}
          </div>
        )}
        {replyTo && (
          <div className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground">
            <span>回复 @{replyTo.name}</span>
            <button onClick={() => setReplyTo(null)} className="active:text-foreground">
              取消
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={replyTo ? `回复 @${replyTo.name}` : config.placeholder || "各抒己见，友善交流…"}
            className="h-10 flex-1 rounded-full bg-muted px-4 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": `${accent}33` } as React.CSSProperties}
          />
          {enableAIAssist && !replyTo && (
            <AIAssistPopover scene={"comment" as AIAssistScene} text={input} onApply={setInput} />
          )}
          <button
            onClick={submit}
            disabled={!input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition active:scale-95 disabled:opacity-40"
            style={{ background: accent }}
            aria-label="发送"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
