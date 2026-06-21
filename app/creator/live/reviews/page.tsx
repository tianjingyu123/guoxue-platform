"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ArrowLeft, Star, MessageSquare, Flag, ChevronDown } from "lucide-react"

type Filter = "all" | "5" | "4" | "3" | "replied" | "pending"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "5", label: "5星" },
  { key: "4", label: "4星" },
  { key: "3", label: "3星及以下" },
  { key: "pending", label: "待回复" },
  { key: "replied", label: "已回复" },
]

const DIST = [
  { star: 5, pct: 72, count: 184 },
  { star: 4, pct: 18, count: 46 },
  { star: 3, pct: 6,  count: 15 },
  { star: 2, pct: 2,  count: 6 },
  { star: 1, pct: 2,  count: 4 },
]

const reviews = [
  { id: "1", user: "山河客", avatar: "", rating: 5, content: "讲得非常细致，八字命盘分析深入浅出，对我帮助很大！", live: "八字命理精讲第12课", time: "2天前", reply: "感谢支持！希望对你有所帮助。", flagged: false },
  { id: "2", user: "星空旅人", avatar: "", rating: 5, content: "老师解盘思路清晰，案例丰富，值得反复观看。", live: "紫微斗数专题", time: "3天前", reply: null, flagged: false },
  { id: "3", user: "云上墨", avatar: "", rating: 4, content: "内容很好，就是有些地方讲得稍快，建议放慢一点。", live: "紫微斗数专题", time: "4天前", reply: "感谢建议，后续会注意节奏。", flagged: false },
  { id: "4", user: "问道者", avatar: "", rating: 3, content: "普通，没太多新意，期望更深入的内容。", live: "奇门遁甲入门", time: "5天前", reply: null, flagged: false },
  { id: "5", user: "墨言先生", avatar: "", rating: 5, content: "这是我看过的最好的命理直播，强烈推荐！", live: "风水堂第8课", time: "1周前", reply: null, flagged: false },
]

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={cn("w-3 h-3", s <= rating ? "text-accent fill-accent" : "text-muted-foreground")} />
      ))}
    </div>
  )
}

export default function LiveReviewsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("all")
  const [replyId, setReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replies, setReplies] = useState<Record<string, string>>(
    Object.fromEntries(reviews.filter(r => r.reply).map(r => [r.id, r.reply!]))
  )

  const totalCount = DIST.reduce((s, d) => s + d.count, 0)
  const avgRating = (DIST.reduce((s, d) => s + d.star * d.count, 0) / totalCount).toFixed(1)

  const filtered = reviews.filter(r => {
    if (filter === "all") return true
    if (filter === "pending") return !replies[r.id]
    if (filter === "replied") return !!replies[r.id]
    return String(r.rating) === filter
  })

  const submitReply = (id: string) => {
    if (!replyText.trim()) return
    setReplies(prev => ({ ...prev, [id]: replyText }))
    setReplyId(null)
    setReplyText("")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center px-4 h-12">
          <button onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-semibold ml-3 text-foreground">直播评价</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 统计卡片 */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex gap-4">
            <div className="text-center flex-shrink-0">
              <p className="text-4xl font-black text-accent">{avgRating}</p>
              <StarRow rating={Math.round(Number(avgRating))} />
              <p className="text-xs text-muted-foreground mt-1">{totalCount} 条评价</p>
            </div>
            <div className="flex-1 space-y-1">
              {DIST.map(d => (
                <div key={d.star} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Star className="w-3 h-3 text-accent fill-accent flex-shrink-0" />
                  <span>{d.star}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="w-6 text-right">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 筛选胶囊 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 评价列表 */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无符合条件的评价</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(review => (
              <div
                key={review.id}
                className={cn(
                  "bg-card rounded-xl p-4 border",
                  review.flagged ? "border-accent/60" : "border-border"
                )}
              >
                {/* 用户信息 */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground flex-shrink-0">
                      {review.user[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{review.user}</p>
                      <StarRow rating={review.rating} />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{review.time}</span>
                </div>

                <p className="text-sm text-foreground mb-1.5">{review.content}</p>
                <p className="text-xs text-muted-foreground mb-3">场次：{review.live}</p>

                {/* 已有回复 */}
                {replies[review.id] && (
                  <div className="bg-muted rounded-lg p-2.5 mb-2">
                    <p className="text-xs text-muted-foreground mb-0.5">我的回复：</p>
                    <p className="text-xs text-foreground">{replies[review.id]}</p>
                  </div>
                )}

                {/* 回复输入框 */}
                {replyId === review.id && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      placeholder="输入回复内容..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="w-full min-h-[72px] px-3 py-2 text-xs bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setReplyId(null); setReplyText("") }}
                        className="flex-1 py-1.5 text-xs text-muted-foreground bg-muted rounded-lg"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => submitReply(review.id)}
                        className="flex-1 py-1.5 text-xs text-primary-foreground bg-primary rounded-lg"
                      >
                        发布回复
                      </button>
                    </div>
                  </div>
                )}

                {/* 操作区 */}
                {replyId !== review.id && (
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      onClick={() => { setReplyId(review.id); setReplyText("") }}
                      className="flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {replies[review.id] ? "修改回复" : "回复"}
                    </button>
                    <button className={cn("flex items-center gap-1 text-xs", review.flagged ? "text-accent" : "text-muted-foreground")}>
                      <Flag className="w-3.5 h-3.5" />
                      标记
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  )
}
