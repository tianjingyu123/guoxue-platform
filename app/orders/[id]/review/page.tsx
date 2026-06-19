"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ArrowLeft, Star, Camera, X, Loader2 } from "lucide-react"

const ITEMS = [
  { id: "1", name: "《渊海子平》精装典藏版", cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80" },
  { id: "2", name: "紫微斗数入门教程", cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&q=80" },
]

const TAGS_BY_RATING: Record<number, string[]> = {
  5: ["正品保证", "包装精美", "物流很快", "与描述一致", "非常满意", "强烈推荐"],
  4: ["商品不错", "物流及时", "整体满意"],
  3: ["一般般", "与描述基本一致"],
  2: ["质量较差", "与描述不符"],
  1: ["质量很差", "货不对板", "不推荐"],
}

type ItemReview = { rating: number; tags: string[]; content: string }

export default function OrderReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [reviews, setReviews] = useState<Record<string, ItemReview>>(
    Object.fromEntries(ITEMS.map(i => [i.id, { rating: 0, tags: [], content: "" }]))
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hoverMap, setHoverMap] = useState<Record<string, number>>({})

  const setItemReview = (itemId: string, patch: Partial<ItemReview>) => {
    setReviews(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch }
    }))
  }

  const toggleTag = (itemId: string, tag: string) => {
    const current = reviews[itemId].tags
    setItemReview(itemId, {
      tags: current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
    })
  }

  const allRated = ITEMS.every(i => reviews[i.id].rating > 0)

  const handleSubmit = async () => {
    if (!allRated) return
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
        <h2 className="text-xl font-bold text-foreground">评价成功！</h2>
        <p className="text-sm text-muted-foreground">感谢您的宝贵意见，将帮助更多买家做出选择</p>
        <button
          onClick={() => router.push("/orders")}
          className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
        >
          查看全部订单
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
          <h1 className="text-base font-semibold ml-3 text-foreground">评价订单</h1>
          <span className="ml-1.5 text-xs text-muted-foreground">#{id}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {ITEMS.map((item, idx) => {
          const r = reviews[item.id]
          const display = hoverMap[item.id] || r.rating
          const tags = TAGS_BY_RATING[r.rating] ?? []
          const ratingLabels = ["", "很差", "较差", "一般", "不错", "非常好"]

          return (
            <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* 商品信息 */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.cover} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground line-clamp-2">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">商品 {idx + 1}/{ITEMS.length}</p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* 星级评分 */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">商品评分 <span className="text-destructive">*</span></p>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      {[1,2,3,4,5].map(s => (
                        <button
                          key={s}
                          onMouseEnter={() => setHoverMap(p => ({ ...p, [item.id]: s }))}
                          onMouseLeave={() => setHoverMap(p => ({ ...p, [item.id]: 0 }))}
                          onClick={() => { setItemReview(item.id, { rating: s, tags: [] }) }}
                          className="transition-transform active:scale-90"
                        >
                          <Star className={cn(
                            "w-8 h-8 transition-colors",
                            s <= display ? "text-accent fill-accent" : "text-muted-foreground"
                          )} />
                        </button>
                      ))}
                    </div>
                    {display > 0 && (
                      <span className={cn(
                        "text-sm font-semibold ml-1",
                        display >= 4 ? "text-chart-4" : display === 3 ? "text-muted-foreground" : "text-destructive"
                      )}>
                        {ratingLabels[display]}
                      </span>
                    )}
                  </div>
                </div>

                {/* 标签 */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(item.id, tag)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          r.tags.includes(tag)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* 文字 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">详细评价（选填）</span>
                    <span className="text-xs text-muted-foreground">{r.content.length}/200</span>
                  </div>
                  <textarea
                    placeholder="分享使用感受，帮助更多买家..."
                    value={r.content}
                    onChange={e => setItemReview(item.id, { content: e.target.value.slice(0, 200) })}
                    className="w-full min-h-[80px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* 上传图片（展示入口） */}
                <div className="flex items-center gap-2">
                  <button className="w-16 h-16 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground">
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px]">添加图片</span>
                  </button>
                  <p className="text-xs text-muted-foreground">最多添加 6 张图片</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 固定提交 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="p-4">
          {!allRated && (
            <p className="text-xs text-muted-foreground text-center mb-2">请为所有商品打分后提交</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={!allRated || submitting}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
              !allRated
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
