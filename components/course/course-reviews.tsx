"use client"

import { Star, ChevronRight, ThumbsUp } from "lucide-react"

interface Review {
  id: string
  userName: string
  userAvatar: string
  rating: number
  content: string
  date: string
  likes: number
}

interface CourseReviewsProps {
  averageRating: number
  totalReviews: number
  reviews: Review[]
}

export function CourseReviews({ averageRating, totalReviews, reviews }: CourseReviewsProps) {
  return (
    <div className="p-4 bg-card border-b border-border">
      {/* 标题和查看全部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground">学员评价</h3>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="font-semibold text-foreground">{averageRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({totalReviews}条)</span>
          </div>
        </div>
        <button className="flex items-center gap-0.5 text-sm text-primary">
          <span>全部</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      {/* 评价列表 */}
      <div className="space-y-4">
        {reviews.slice(0, 3).map((review) => (
          <div key={review.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
            <div className="flex items-start gap-3">
              {/* 用户头像 */}
              <img
                src={review.userAvatar}
                alt={review.userName}
                className="w-9 h-9 rounded-full object-cover"
              />
              
              <div className="flex-1 min-w-0">
                {/* 用户名和评分 */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">
                    {review.userName}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i}
                        className={`w-3 h-3 ${
                          i < review.rating 
                            ? "fill-accent text-accent" 
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* 评价内容 */}
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {review.content}
                </p>
                
                {/* 日期和点赞 */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground/70">
                    {review.date}
                  </span>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{review.likes}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
