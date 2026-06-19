"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Star, ThumbsUp, MessageSquare, Filter, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const reviews = [
  {
    id: "1",
    productTitle: "滴天髓精解",
    rating: 5,
    content: "书的质量很好，印刷清晰，内容详实，对于学习命理很有帮助。卖家发货也很快，包装仔细，好评！",
    images: [],
    buyer: "张***",
    createdAt: "2024-01-15 14:30",
    replied: false,
    hasImage: false,
  },
  {
    id: "2",
    productTitle: "子平真诠评注",
    rating: 4,
    content: "整体不错，但是有些地方注解不够详细，希望能有更多的案例分析。",
    images: [],
    buyer: "李***",
    createdAt: "2024-01-14 10:20",
    replied: true,
    replyContent: "感谢您的反馈，我们会在新版中增加更多案例分析，祝您学习愉快！",
    replyTime: "2024-01-14 15:00",
    hasImage: false,
  },
  {
    id: "3",
    productTitle: "文房四宝套装",
    rating: 5,
    content: "非常满意！毛笔质量很好，墨汁浓淡适中，宣纸手感细腻。送朋友的，他非常喜欢。",
    images: ["1", "2"],
    buyer: "王***",
    createdAt: "2024-01-13 09:00",
    replied: true,
    replyContent: "感谢您的支持与好评！欢迎再次光临~",
    replyTime: "2024-01-13 10:00",
    hasImage: true,
  },
  {
    id: "4",
    productTitle: "八字命理基础课",
    rating: 2,
    content: "课程内容比较基础，感觉不太适合有一定基础的人，希望能有进阶课程。",
    images: [],
    buyer: "赵***",
    createdAt: "2024-01-12 15:00",
    replied: false,
    hasImage: false,
  },
]

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  
  const filteredReviews = reviews.filter(r => {
    if (activeTab === "pending") return !r.replied
    if (activeTab === "replied") return r.replied
    if (activeTab === "negative") return r.rating <= 3
    if (activeTab === "hasImage") return r.hasImage
    return true
  })

  const stats = {
    all: reviews.length,
    pending: reviews.filter(r => !r.replied).length,
    negative: reviews.filter(r => r.rating <= 3).length,
  }

  const handleReply = (id: string) => {
    console.log("Reply to", id, replyContent)
    setReplyingId(null)
    setReplyContent("")
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center h-14 px-4">
          <Link href="/merchant/dashboard" className="mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">评价管理</h1>
        </div>
      </header>
      
      {/* 统计概览 */}
      <div className="p-4">
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">4.8</p>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={cn("w-3 h-3", i <= 4 ? "fill-amber-400 text-amber-400" : "fill-amber-400/50 text-amber-400/50")} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">店铺评分</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.all}</p>
              <p className="text-xs text-muted-foreground mt-1">总评价数</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground mt-1">待回复</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* 筛选标签 */}
      <div className="px-4 pb-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">待回复({stats.pending})</TabsTrigger>
            <TabsTrigger value="negative" className="text-xs">差评({stats.negative})</TabsTrigger>
            <TabsTrigger value="hasImage" className="text-xs">有图</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* 评价列表 */}
      <div className="px-4 space-y-3">
        {filteredReviews.map(review => (
          <Card key={review.id} className="p-4">
            {/* 商品信息 */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                <span>📦</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{review.productTitle}</p>
              </div>
            </div>
            
            {/* 评价内容 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={cn(
                      "w-3.5 h-3.5",
                      i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted"
                    )} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{review.buyer}</span>
                <span className="text-xs text-muted-foreground">{review.createdAt}</span>
              </div>
              
              <p className="text-sm text-foreground">{review.content}</p>
              
              {review.images.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {review.images.map((_, i) => (
                    <div key={i} className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                      <span>🖼️</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 商家回复 */}
            {review.replied && review.replyContent && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Badge variant="secondary" className="text-[10px]">商家回复</Badge>
                  <span>{review.replyTime}</span>
                </div>
                <p className="text-sm text-foreground">{review.replyContent}</p>
              </div>
            )}
            
            {/* 回复输入框 */}
            {replyingId === review.id && (
              <div className="mt-3 space-y-2">
                <Textarea 
                  placeholder="输入回复内容..." 
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setReplyingId(null)}>取消</Button>
                  <Button size="sm" onClick={() => handleReply(review.id)}>发送回复</Button>
                </div>
              </div>
            )}
            
            {/* 操作按钮 */}
            {!review.replied && replyingId !== review.id && (
              <div className="mt-3 pt-3 border-t border-border flex justify-end">
                <Button size="sm" onClick={() => setReplyingId(review.id)}>
                  <MessageSquare className="w-4 h-4 mr-1" />
                  回复
                </Button>
              </div>
            )}
          </Card>
        ))}
        
        {filteredReviews.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">暂无评价</p>
          </div>
        )}
      </div>
    </div>
  )
}
