"use client"

import { useState } from "react"
import Link from "next/link"
import { Star, ThumbsUp, ChevronDown, Image as ImageIcon, X } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 评价标签数据
const reviewTags = [
  { id: "all", label: "全部", count: 328 },
  { id: "quality", label: "质量好", count: 128 },
  { id: "texture", label: "有质感", count: 86 },
  { id: "value", label: "性价比高", count: 72 },
  { id: "packaging", label: "包装精美", count: 56 },
  { id: "delivery", label: "物流快", count: 42 },
  { id: "authentic", label: "正品保证", count: 38 },
]

// 评价数据
const reviews = [
  {
    id: 1,
    user: { name: "易学爱好者", avatar: "", level: "VIP会员" },
    rating: 5,
    content: "这本书内容非常详实，从基础到进阶都有涉及，适合各个阶段的学习者。印刷质量很好，纸张厚实，字迹清晰。配合排盘工具学习效果更佳！",
    images: ["", "", ""],
    spec: "精装版",
    time: "2024-01-15",
    likes: 56,
    tags: ["quality", "texture", "value"],
    reply: {
      content: "感谢您的认可！我们精选优质纸张，确保阅读体验。祝您学习愉快！",
      time: "2024-01-16"
    }
  },
  {
    id: 2,
    user: { name: "命理研究者", avatar: "", level: "圈主" },
    rating: 5,
    content: "作为从业多年的命理师，这本书的内容让我眼前一亮。理论扎实，案例丰富，是难得的好书。已经推荐给圈子里的学员了。",
    images: [""],
    spec: "典藏版",
    time: "2024-01-12",
    likes: 42,
    tags: ["quality", "authentic"],
    reply: null
  },
  {
    id: 3,
    user: { name: "国学新手", avatar: "", level: "" },
    rating: 4,
    content: "书的内容很好，就是对于完全零基础的人来说有点难度，需要配合入门课程一起学习。物流很快，包装完好。",
    images: [],
    spec: "平装版",
    time: "2024-01-10",
    likes: 18,
    tags: ["delivery", "packaging"],
    reply: {
      content: "感谢您的反馈！建议搭配我们的《八字入门课》一起学习，效果更佳哦~",
      time: "2024-01-11"
    }
  },
  {
    id: 4,
    user: { name: "传统文化爱好者", avatar: "", level: "VIP会员" },
    rating: 5,
    content: "包装很精美，书籍质量上乘，内容深入浅出，值得收藏！",
    images: ["", ""],
    spec: "精装版",
    time: "2024-01-08",
    likes: 35,
    tags: ["packaging", "quality", "texture"],
    reply: null
  },
  {
    id: 5,
    user: { name: "风水师小李", avatar: "", level: "讲师" },
    rating: 5,
    content: "专业书籍，内容考究，引经据典，是学习八字的必备参考书。强烈推荐！",
    images: [],
    spec: "典藏版",
    time: "2024-01-05",
    likes: 28,
    tags: ["quality", "authentic"],
    reply: null
  },
]

// 排序选项
const sortOptions = [
  { id: "default", label: "默认排序" },
  { id: "newest", label: "最新评价" },
  { id: "withImages", label: "有图优先" },
  { id: "mostLikes", label: "最多点赞" },
]

export default function ProductReviewsPage() {
  const [selectedTag, setSelectedTag] = useState("all")
  const [sortBy, setSortBy] = useState("default")
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [likedReviews, setLikedReviews] = useState<number[]>([])
  const [previewImage, setPreviewImage] = useState<{ reviewId: number; index: number } | null>(null)

  // 筛选评价
  const filteredReviews = reviews.filter(review => {
    if (selectedTag === "all") return true
    return review.tags.includes(selectedTag)
  })

  // 排序评价
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.time).getTime() - new Date(a.time).getTime()
      case "withImages":
        return b.images.length - a.images.length
      case "mostLikes":
        return b.likes - a.likes
      default:
        return 0
    }
  })

  const handleLike = (reviewId: number) => {
    setLikedReviews(prev => 
      prev.includes(reviewId) 
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    )
  }

  const goodRatePercent = 98
  const totalReviews = 328

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
  <div className="flex items-center justify-between px-4 h-12">
  <BackButton />
  <h1 className="font-semibold text-base text-foreground">商品评价</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 评价总览 */}
      <div className="px-4 py-5 bg-gradient-to-br from-accent/10 via-background to-primary/5">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{goodRatePercent}%</div>
            <div className="text-xs text-muted-foreground mt-1">好评率</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className="w-4 h-4 fill-accent text-accent" />
              ))}
              <span className="text-sm text-foreground ml-1">4.9</span>
            </div>
            <div className="text-sm text-muted-foreground">共 {totalReviews} 条评价</div>
          </div>
        </div>
      </div>

      {/* 评价标签筛选 */}
      <div className="px-4 py-3 border-b border-border overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {reviewTags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.id)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                selectedTag === tag.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              {tag.label}({tag.count})
            </button>
          ))}
        </div>
      </div>

      {/* 排序栏 */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-border">
        <span className="text-sm text-muted-foreground">
          共 {sortedReviews.length} 条评价
        </span>
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1 text-sm text-foreground"
          >
            {sortOptions.find(o => o.id === sortBy)?.label}
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              showSortMenu && "rotate-180"
            )} />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-8 z-20 w-28 bg-card rounded-lg shadow-lg border border-border overflow-hidden">
                {sortOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => { setSortBy(option.id); setShowSortMenu(false) }}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left hover:bg-secondary transition-colors",
                      sortBy === option.id ? "text-primary bg-primary/5" : "text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 评价列表 */}
      <div className="divide-y divide-border">
        {sortedReviews.map(review => (
          <div key={review.id} className="px-4 py-4">
            {/* 用户信息 */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-9 h-9">
                <AvatarImage src={review.user.avatar} alt={review.user.name} />
                <AvatarFallback className="bg-secondary text-foreground text-xs">
                  {review.user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{review.user.name}</span>
                  {review.user.level && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/20 text-accent border-0">
                      {review.user.level}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        className={cn(
                          "w-3 h-3",
                          star <= review.rating 
                            ? "fill-accent text-accent" 
                            : "fill-muted text-muted"
                        )} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{review.time}</span>
                </div>
              </div>
            </div>

            {/* 评价内容 */}
            <p className="text-sm text-foreground leading-relaxed mb-3">{review.content}</p>

            {/* 晒图 */}
            {review.images.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                {review.images.map((img, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-20 h-20 rounded-lg bg-secondary flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setPreviewImage({ reviewId: review.id, index })}
                  >
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                ))}
              </div>
            )}

            {/* 购买规格 */}
            <div className="text-xs text-muted-foreground mb-3">
              购买规格：{review.spec}
            </div>

            {/* 商家回复 */}
            {review.reply && (
              <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                    商家回复
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{review.reply.time}</span>
                </div>
                <p className="text-xs text-muted-foreground">{review.reply.content}</p>
              </div>
            )}

            {/* 点赞 */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => handleLike(review.id)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors",
                  likedReviews.includes(review.id)
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                <ThumbsUp className={cn(
                  "w-3.5 h-3.5",
                  likedReviews.includes(review.id) && "fill-primary"
                )} />
                {review.likes + (likedReviews.includes(review.id) ? 1 : 0)}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {sortedReviews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Star className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">暂无相关评价</p>
        </div>
      )}

      {/* 图片预览弹窗 */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors safe-area-pt z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="max-w-lg w-full aspect-square bg-secondary/20 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-white/40" />
            </div>
          </div>
          {/* 图片切换指示器 */}
          {(() => {
            const currentReview = reviews.find(r => r.id === previewImage.reviewId)
            if (!currentReview || currentReview.images.length <= 1) return null
            return (
              <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
                {currentReview.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setPreviewImage({ ...previewImage, index })}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      previewImage.index === index ? "bg-white" : "bg-white/30"
                    )}
                  />
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
