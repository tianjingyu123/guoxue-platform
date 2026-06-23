"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Star, Image as ImageIcon, MessageSquare, ThumbsUp, X } from "lucide-react"
import { shopApi, type ProductReview } from "@/lib/api"

// Mock数据
const mockReviews: ProductReview[] = [
  {
    id: "1",
    user: { id: "u1", name: "张**", avatar: "/placeholder.svg" },
    rating: 5,
    content: "这本书讲解非常详细，从基础到进阶都有涉及，特别适合入门学习。印刷质量很好，纸张手感不错，物流也很快，非常满意的一次购物体验！",
    images: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
    skuName: "精装典藏版",
    createdAt: "2024-01-15",
    likes: 128,
  },
  {
    id: "2",
    user: { id: "u2", name: "李**", avatar: "/placeholder.svg" },
    rating: 5,
    content: "内容很好，讲解清晰易懂，推荐购买！",
    skuName: "平装版",
    createdAt: "2024-01-14",
    likes: 56,
  },
  {
    id: "3",
    user: { id: "u3", name: "王**", avatar: "/placeholder.svg" },
    rating: 4,
    content: "整体还不错，就是有些章节感觉可以再详细一点。",
    images: ["/placeholder.svg"],
    skuName: "精装典藏版",
    createdAt: "2024-01-13",
    likes: 23,
  },
  {
    id: "4",
    user: { id: "u4", name: "赵**", avatar: "/placeholder.svg" },
    rating: 3,
    content: "内容一般，和预期有差距。",
    skuName: "平装版",
    createdAt: "2024-01-12",
    likes: 5,
  },
]

const mockStats = {
  average: 4.8,
  total: 1256,
  distribution: [
    { stars: 5, count: 980, percent: 78 },
    { stars: 4, count: 188, percent: 15 },
    { stars: 3, count: 50, percent: 4 },
    { stars: 2, count: 25, percent: 2 },
    { stars: 1, count: 13, percent: 1 },
  ],
  withImages: 368,
}

type FilterType = 'all' | 'good' | 'medium' | 'bad' | 'images'

function ReviewsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('productId')
  
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true)
      try {
        if (productId) {
          const res = await shopApi.listReviews(productId)
          setReviews(res.data || mockReviews)
        } else {
          setReviews(mockReviews)
        }
      } catch {
        setReviews(mockReviews)
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [productId, filter])

  const filteredReviews = reviews.filter(r => {
    if (filter === 'good') return r.rating >= 4
    if (filter === 'medium') return r.rating === 3
    if (filter === 'bad') return r.rating <= 2
    if (filter === 'images') return r.images && r.images.length > 0
    return true
  })

  const filterTabs: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: '全部', count: mockStats.total },
    { key: 'good', label: '好评', count: mockStats.distribution[0].count + mockStats.distribution[1].count },
    { key: 'medium', label: '中评', count: mockStats.distribution[2].count },
    { key: 'bad', label: '差评', count: mockStats.distribution[3].count + mockStats.distribution[4].count },
    { key: 'images', label: '有图', count: mockStats.withImages },
  ]

  const openImagePreview = (images: string[], index: number) => {
    setPreviewImages(images)
    setPreviewIndex(index)
    setPreviewImage(images[index])
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
        </button>
        <span className="text-lg font-semibold text-[#2C2C2C]">商品评价</span>
      </div>

      {/* 评分概览 */}
      <div className="bg-white m-4 rounded-2xl p-4 shadow-sm">
        <div className="flex items-start gap-6">
          {/* 平均分 */}
          <div className="text-center">
            <div className="text-4xl font-bold text-[#C41E3A]">{mockStats.average}</div>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[1,2,3,4,5].map(i => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i <= Math.round(mockStats.average) ? 'text-[#C9A96E] fill-[#C9A96E]' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <div className="text-xs text-[#999999] mt-1">{mockStats.total}条评价</div>
          </div>
          
          {/* 星级分布 */}
          <div className="flex-1 space-y-1.5">
            {mockStats.distribution.map(d => (
              <div key={d.stars} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-[#666666]">{d.stars}星</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C9A96E] to-[#E8D5B0] rounded-full transition-all"
                    style={{ width: `${d.percent}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[#999999]">{d.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 筛选Tab */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 transition-all ${
                filter === tab.key
                  ? 'bg-[#C41E3A] text-white'
                  : 'bg-white text-[#666666] border border-[#E8E3DB]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={filter === tab.key ? 'text-white/80' : 'text-[#999999]'}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 评价列表 */}
      <div className="px-4 pb-20 space-y-3">
        {loading ? (
          // 骨架屏
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="w-20 h-4 bg-gray-200 rounded mb-1" />
                  <div className="w-16 h-3 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-4 bg-gray-200 rounded" />
                <div className="w-3/4 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-[#999999]">暂无相关评价</p>
          </div>
        ) : (
          filteredReviews.map(review => (
            <div key={review.id} className="bg-white rounded-2xl p-4 shadow-sm">
              {/* 用户信息 */}
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={review.user.avatar}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="font-medium text-[#2C2C2C]">{review.user.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i <= review.rating ? 'text-[#C9A96E] fill-[#C9A96E]' : 'text-gray-300'}`}
                      />
                    ))}
                    {review.skuName && (
                      <span className="text-xs text-[#999999] ml-2">{review.skuName}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-[#999999]">{review.createdAt}</span>
              </div>

              {/* 评价内容 */}
              <p className="text-sm text-[#666666] leading-relaxed mb-3">{review.content}</p>

              {/* 晒图 */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                  {review.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt=""
                      onClick={() => openImagePreview(review.images!, idx)}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ))}
                </div>
              )}

              {/* 底部操作 */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E8E3DB]">
                <button className="flex items-center gap-1 text-xs text-[#999999] hover:text-[#C41E3A] transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  <span>有用 ({review.likes})</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 图片预览 */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          {previewImages.length > 1 && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
              {previewImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewImage(img)
                    setPreviewIndex(idx)
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === previewIndex ? 'bg-white w-4' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReviewsPageContent />
    </Suspense>
  )
}
