"use client"

import { useState, useMemo } from "react"
import { X, Heart, MessageCircle, CornerDownRight, Send } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CommentReply {
  id: string
  user: string
  content: string
  time: string
  likes: number
}

export interface ClassicComment {
  id: string
  user: string
  content: string
  time: string
  likes: number
  liked?: boolean
  /** 关联的章节名，整书评论可不填 */
  chapter?: string
  replies: CommentReply[]
}

/** 根据用户名取稳定的头像底色，沿用古籍馆分类色系 */
const AVATAR_COLORS = ["#a06a38", "#2e5a88", "#3e7a52", "#c41e3a", "#8a6d2f", "#6b4a7a"]
function avatarColor(name: string) {
  let sum = 0
  for (const ch of name) sum += ch.charCodeAt(0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full text-white font-medium flex-shrink-0"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.4 }}
      aria-hidden
    >
      {name.charAt(0)}
    </span>
  )
}

interface CommentSheetProps {
  open: boolean
  onClose: () => void
  /** 讨论标题，如书名或「本章」 */
  title: string
  /** book = 整本书讨论，chapter = 章节讨论 */
  scope?: "book" | "chapter"
  /** 初始评论数据 */
  initialComments: ClassicComment[]
  /** 强调色（点赞/最热/发送按钮），默认古籍馆故宫红；电子书传蓝、诗词传金 */
  accentColor?: string
  /** 讨论类型自定义文案，默认「书友讨论 / 本章讨论」 */
  bookLabel?: string
  chapterLabel?: string
}

export function CommentSheet({
  open,
  onClose,
  title,
  scope = "book",
  initialComments,
  accentColor = "#c41e3a",
  bookLabel = "书友讨论",
  chapterLabel = "本章讨论",
}: CommentSheetProps) {
  const [comments, setComments] = useState<ClassicComment[]>(initialComments)
  const [sort, setSort] = useState<"hot" | "new">("hot")
  const [input, setInput] = useState("")
  const [replyTo, setReplyTo] = useState<{ id: string; user: string } | null>(null)
  const [openReplies, setOpenReplies] = useState<Set<string>>(new Set())

  const sorted = useMemo(() => {
    const list = [...comments]
    return sort === "hot" ? list.sort((a, b) => b.likes - a.likes) : list.slice().reverse()
  }, [comments, sort])

  const total = comments.reduce((n, c) => n + 1 + c.replies.length, 0)

  const toggleLike = (id: string) =>
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c)),
    )

  const toggleReplies = (id: string) =>
    setOpenReplies((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const submit = () => {
    const text = input.trim()
    if (!text) return
    if (replyTo) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === replyTo.id
            ? { ...c, replies: [...c.replies, { id: `r${Date.now()}`, user: "我", content: text, time: "刚刚", likes: 0 }] }
            : c,
        ),
      )
      setOpenReplies((prev) => new Set(prev).add(replyTo.id))
    } else {
      setComments((prev) => [
        ...prev,
        { id: `c${Date.now()}`, user: "我", content: text, time: "刚刚", likes: 0, replies: [] },
      ])
    }
    setInput("")
    setReplyTo(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`${title}讨论`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[82vh] flex flex-col rounded-t-3xl bg-card shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* 头部 */}
        <div className="flex-shrink-0 px-5 pt-3 pb-2 border-b border-border/60">
          <div className="mx-auto w-9 h-1 rounded-full bg-muted-foreground/25 mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="text-[17px] font-bold text-foreground">{scope === "chapter" ? chapterLabel : bookLabel}</h3>
              <span className="text-[13px] text-muted-foreground">{total} 条</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center active:bg-muted" aria-label="关闭">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2 mt-2.5">
            {(["hot", "new"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "text-[13px] px-3 py-1 rounded-full transition-colors",
                  sort === s ? "text-white" : "bg-muted text-muted-foreground",
                )}
                style={sort === s ? { background: accentColor } : undefined}
              >
                {s === "hot" ? "最热" : "最新"}
              </button>
            ))}
          </div>
        </div>

        {/* 评论列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5">
          {sorted.length === 0 && (
            <p className="text-center text-[14px] text-muted-foreground py-12">还没有评论，来说两句吧～</p>
          )}
          {sorted.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar name={c.user} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-foreground">{c.user}</span>
                  {c.chapter && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[120px]">
                      {c.chapter}
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-foreground/90 leading-relaxed mt-1 text-pretty">{c.content}</p>
                <div className="flex items-center gap-4 mt-1.5 text-[12px] text-muted-foreground">
                  <span>{c.time}</span>
                  <button
                    onClick={() => setReplyTo({ id: c.id, user: c.user })}
                    className="flex items-center gap-1 active:text-foreground"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />回复
                  </button>
                  <button
                    onClick={() => toggleLike(c.id)}
                    className="flex items-center gap-1 ml-auto"
                    style={c.liked ? { color: accentColor } : undefined}
                  >
                    <Heart className={cn("w-3.5 h-3.5", c.liked && "fill-current")} />
                    {c.likes > 0 && c.likes}
                  </button>
                </div>

                {/* 回复 */}
                {c.replies.length > 0 && (
                  <div className="mt-2">
                    {!openReplies.has(c.id) ? (
                      <button
                        onClick={() => toggleReplies(c.id)}
                        className="flex items-center gap-1 text-[12px]"
                        style={{ color: accentColor }}
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                        展开 {c.replies.length} 条回复
                      </button>
                    ) : (
                      <div className="space-y-2.5 pl-3 border-l-2 border-border/60 mt-1">
                        {c.replies.map((r) => (
                          <div key={r.id} className="flex gap-2">
                            <Avatar name={r.user} size={24} />
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-medium text-foreground">{r.user}</span>
                              <p className="text-[13px] text-foreground/85 leading-relaxed text-pretty">{r.content}</p>
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
        <div className="flex-shrink-0 border-t border-border/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-card">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 text-[12px] text-muted-foreground">
              <span>回复 @{replyTo.user}</span>
              <button onClick={() => setReplyTo(null)} className="active:text-foreground">取消</button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={replyTo ? `回复 @${replyTo.user}` : "各抒己见，友善交流…"}
              className="flex-1 h-10 px-4 rounded-full bg-muted text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-full text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
              style={{ background: accentColor }}
              aria-label="发送"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
