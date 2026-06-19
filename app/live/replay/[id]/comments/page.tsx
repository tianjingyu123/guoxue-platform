"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ArrowLeft, Star, Loader2 } from "lucide-react"

const ASPECTS = [
  { key: "content", label: "内容质量" },
  { key: "interaction", label: "互动体验" },
  { key: "audio", label: "音画质量" },
  { key: "value", label: "价值感受" },
]

const TAGS_BY_RATING: Record<number, string[]> = {
  5: ["内容丰富", "讲解清晰", "互动活跃", "干货满满", "值得反复看", "强烈推荐"],
  4: ["内容不错", "讲解清楚", "收获较大", "整体满意"],
  3: ["一般般", "内容普通", "有待提高"],
  2: ["讲解不清", "内容较少", "互动较少"],
  1: ["内容差", "浪费时间", "不推荐"],
}

export default function ReplayCommentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [aspectRatings, setAspectRatings] = useState<Record<string, number>>({})
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const displayRating = hoverRating || rating
  const ratingLabels = ["", "很差", "较差", "一般", "不错", "非常好"]
  const currentTags = TAGS_BY_RATING[rating] ?? []

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async () => {
    if (rating === 0) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 900))
    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-chart-4/15 flex items-center justify-center mb-2">
          <Star className="w-8 h-8 text-chart-4 fill-chart-4" />
        </div>
        <h2 className="text-xl font-bold text-foreground">感谢您的评价！</h2>
        <p className="text-sm text-muted-foreground">您的反馈帮助我们持续改进直播质量</p>
        <button
          onClick={() => router.back()}
          className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
        >
          返回回放
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center px-4 h-12">
          <button onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-semibold ml-3 text-foreground">评价回放</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 直播信息 */}
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="text-xs text-muted-foreground mb-1">您正在评价</p>
          <p className="text-base font-semibold text-foreground">八字命理精讲系列</p>
          <p className="text-xs text-muted-foreground mt-0.5">直播回放 #{id}</p>
        </div>

        {/* 整体评分 */}
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-3">整体评分</p>
          <div className="flex justify-center gap-3 mb-2">
            {[1,2,3,4,5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => { setRating(s); setSelectedTags([]) }}
                className="transition-transform active:scale-90"
              >
                <Star className={cn(
                  "w-10 h-10 transition-colors",
                  s <= displayRating ? "text-accent fill-accent" : "text-muted-foreground"
                )} />
              </button>
            ))}
          </div>
          {displayRating > 0 && (
            <p className={cn(
              "text-sm font-semibold transition-colors",
              displayRating >= 4 ? "text-chart-4" : displayRating === 3 ? "text-muted-foreground" : "text-destructive"
            )}>
              {ratingLabels[displayRating]}
            </p>
          )}
        </div>

        {/* 维度评分 */}
        {rating > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <p className="text-sm font-medium text-foreground">细项评分</p>
            {ASPECTS.map(a => (
              <div key={a.key} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{a.label}</span>
                <div className="flex gap-1.5">
                  {[1,2,3,4,5].map(s => (
                    <button
                      key={s}
                      onClick={() => setAspectRatings(prev => ({ ...prev, [a.key]: s }))}
                    >
                      <Star className={cn(
                        "w-5 h-5 transition-colors",
                        s <= (aspectRatings[a.key] ?? 0) ? "text-accent fill-accent" : "text-muted-foreground"
                      )} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 标签选择 */}
        {rating > 0 && currentTags.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2.5">选择标签（可多选）</p>
            <div className="flex flex-wrap gap-2">
              {currentTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    selectedTags.includes(tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 文字评价 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-foreground">文字评价（选填）</p>
            <span className="text-xs text-muted-foreground">{content.length}/300</span>
          </div>
          <textarea
            placeholder="分享您对这次直播的感受和建议..."
            value={content}
            onChange={e => setContent(e.target.value.slice(0, 300))}
            className="w-full min-h-[100px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* 固定提交 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="p-4">
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
              rating === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "提交中..." : "提交评价"}
          </button>
        </div>
      </div>
      <div className="h-20" />
    </div>
  )
}
