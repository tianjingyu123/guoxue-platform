'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Image as ImageIcon, X, AlertCircle, Gift, Clock, Send } from 'lucide-react'
import { bountyApi, type Bounty } from '@/lib/api'

function AnswerBountyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bountyId = searchParams.get('id')
  
  const [bounty, setBounty] = useState<Bounty | null>(null)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (bountyId) {
      loadBounty()
    }
  }, [bountyId])

  const loadBounty = async () => {
    try {
      setLoading(true)
      // Mock data
      setBounty({
        id: bountyId!,
        title: '如何理解《易经》中的乾卦与坤卦的关系？',
        description: '最近在学习易经，对于乾卦和坤卦的关系有些困惑，希望有大师能够详细解答一下这两卦之间的联系和区别，以及在实际应用中如何把握。',
        amount: 100,
        status: 'open',
        poster: {
          id: '1',
          name: '学易新手',
          avatar: '/placeholder.svg?height=40&width=40'
        },
        answerCount: 3,
        viewCount: 156,
        category: '易经',
        tags: ['乾卦', '坤卦', '入门'],
        createdAt: '2024-01-15T10:00:00Z',
        expireAt: '2024-01-22T10:00:00Z'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    if (images.length + files.length > 9) {
      setError('最多上传9张图片')
      return
    }
    
    // Mock upload
    const newImages = Array.from(files).map((_, i) => 
      `/placeholder.svg?height=200&width=200&text=图片${images.length + i + 1}`
    )
    setImages([...images, ...newImages])
    setError('')
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('请输入回答内容')
      return
    }
    if (content.length < 20) {
      setError('回答内容至少20字')
      return
    }
    
    try {
      setSubmitting(true)
      setError('')
      await bountyApi.answer(bountyId!, content)
      router.push(`/bounty/${bountyId}?answered=true`)
    } catch {
      setError('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const getRemainingTime = () => {
    if (!bounty) return ''
    const now = new Date()
    const expire = new Date(bounty.expireAt)
    const diff = expire.getTime() - now.getTime()
    if (diff <= 0) return '已截止'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}天${hours}小时`
    return `${hours}小时`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="ml-2 font-medium">回答悬赏</span>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-24 bg-muted rounded-2xl" />
            <div className="h-48 bg-muted rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!bounty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">悬赏不存在</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="ml-2 font-medium">回答悬赏</span>
          </div>
          <span className="text-xs text-muted-foreground">{content.length}/2000</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Bounty Reference Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Gift className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-amber-600">¥{bounty.amount}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Clock className="w-3 h-3" />
              <span>剩余 {getRemainingTime()}</span>
            </div>
          </div>
          
          <h3 className="font-medium text-foreground mb-2 line-clamp-2">{bounty.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">{bounty.description}</p>
          
          <div className="flex items-center gap-2 mt-3">
            <img 
              src={bounty.poster.avatar} 
              alt={bounty.poster.name}
              className="w-5 h-5 rounded-full"
            />
            <span className="text-xs text-muted-foreground">{bounty.poster.name} 发布</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{bounty.answerCount} 人已回答</span>
          </div>
        </div>

        {/* Answer Input */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              我的回答
            </h4>
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= 2000) {
                  setContent(e.target.value)
                  setError('')
                }
              }}
              placeholder="请输入您的回答，至少20字...&#10;&#10;提示：详细、专业的回答更容易被采纳获得悬赏"
              className="w-full h-48 bg-muted/30 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          {/* Image Upload */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">添加配图（选填，最多9张）</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative w-20 h-20">
                  <img 
                    src={img} 
                    alt={`上传图片${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              
              {images.length < 9 && (
                <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <ImageIcon className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">{images.length}/9</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="font-medium text-blue-800 mb-2 text-sm">回答提示</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• 请认真回答问题，详细、专业的回答更容易被采纳</li>
            <li>• 回答被采纳后，您将获得全部悬赏金额</li>
            <li>• 如有多人回答，发布者将选择最佳答案采纳</li>
            <li>• 禁止发布违规内容，违者将被封禁</li>
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-inset-bottom">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            回答字数：<span className={content.length < 20 ? 'text-red-500' : 'text-green-500'}>{content.length}</span>/2000
          </span>
          <span className="text-sm">
            可获悬赏：<span className="text-amber-600 font-bold">¥{bounty.amount}</span>
          </span>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={submitting || content.length < 20}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>提交中...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>提交回答</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function AnswerBountyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center h-14 px-4">
            <div className="w-5 h-5 bg-muted rounded animate-pulse" />
            <span className="ml-4 font-medium">回答悬赏</span>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-32 bg-muted rounded-2xl" />
            <div className="h-64 bg-muted rounded-2xl" />
          </div>
        </div>
      </div>
    }>
      <AnswerBountyContent />
    </Suspense>
  )
}
