'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Star, MessageCircle, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { questionApi } from '@/lib/api'

interface Answerer {
  id: string
  name: string
  avatar: string
  title: string
  expertise: string[]
  price: number
  responseTime: string
  answerCount: number
  rating: number
  description: string
}

function AskQuestionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const answererId = searchParams.get('answerer')

  const [answerer, setAnswerer] = useState<Answerer | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [viewPrice, setViewPrice] = useState(0)
  const [expireDays, setExpireDays] = useState(3)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({})

  useEffect(() => {
    // Mock answerer data
    setAnswerer({
      id: answererId || '1',
      name: '张道长',
      avatar: '/placeholder.svg?height=80&width=80',
      title: '易学研究会会长',
      expertise: ['八字命理', '风水堪舆', '六爻预测'],
      price: 99,
      responseTime: '24小时内',
      answerCount: 1234,
      rating: 4.9,
      description: '从事易学研究三十余年，精通八字、六爻、风水等传统术数',
    })
  }, [answererId])

  const viewPriceOptions = [0, 1, 3, 5, 10]
  const expireOptions = [
    { value: 1, label: '1天' },
    { value: 3, label: '3天' },
    { value: 7, label: '7天' },
  ]

  const totalPrice = answerer ? answerer.price : 0

  const validate = () => {
    const newErrors: { title?: string; content?: string } = {}
    if (!title.trim()) {
      newErrors.title = '请输入问题标题'
    } else if (title.length < 5) {
      newErrors.title = '标题至少5个字'
    }
    if (!content.trim()) {
      newErrors.content = '请输入问题详情'
    } else if (content.length < 20) {
      newErrors.content = '问题详情至少20个字'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || !answerer) return

    setIsSubmitting(true)
    try {
      const result = await questionApi.ask({
        title,
        content,
        price: answerer.price,
        answererId: answerer.id,
        isPublic,
        expireDays,
      })
      if (result.success) {
        router.push(`/qa/${result.questionId}?pay=1`)
      }
    } catch {
      // Handle error
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!answerer) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-48 bg-muted rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-muted rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">发起提问</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Answerer Card */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <div className="flex gap-4">
            <img
              src={answerer.avatar}
              alt={answerer.name}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg">{answerer.name}</h2>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                  {answerer.title}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {answerer.description}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {answerer.rating}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {answerer.answerCount}次回答
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {answerer.responseTime}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {answerer.expertise.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-muted-foreground">提问价格</span>
            <span className="text-xl font-bold text-primary">¥{answerer.price}</span>
          </div>
        </div>

        {/* Question Title */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium">问题标题</label>
            <span className="text-xs text-muted-foreground">{title.length}/50</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            placeholder="一句话描述你的问题"
            className={`w-full px-3 py-2 rounded-lg border ${
              errors.title ? 'border-destructive' : 'border-border'
            } bg-background focus:outline-none focus:ring-2 focus:ring-primary/20`}
          />
          {errors.title && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Question Content */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium">问题详情</label>
            <span className="text-xs text-muted-foreground">{content.length}/500</span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder="请详细描述你的问题，包括相关背景信息，以便答主更好地为你解答..."
            rows={6}
            className={`w-full px-3 py-2 rounded-lg border ${
              errors.content ? 'border-destructive' : 'border-border'
            } bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none`}
          />
          {errors.content && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.content}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            提示：提问越详细，答主回答越精准
          </p>
        </div>

        {/* Public/Private Toggle */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">允许围观</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                开启后其他用户可付费查看回答
              </p>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                isPublic ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isPublic ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {isPublic && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">围观价格</span>
                <span className="text-sm text-muted-foreground">选择后可获得分成</span>
              </div>
              <div className="flex gap-2">
                {viewPriceOptions.map((price) => (
                  <button
                    key={price}
                    onClick={() => setViewPrice(price)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewPrice === price
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {price === 0 ? '免费' : `¥${price}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expire Time */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <h3 className="font-medium mb-3">回答期限</h3>
          <div className="flex gap-2">
            {expireOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setExpireDays(option.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  expireDays === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            答主将在{expireDays}天内回答，超时未回答将全额退款
          </p>
        </div>

        {/* Tips */}
        <div className="bg-amber-50 rounded-2xl p-4">
          <h3 className="font-medium text-amber-800 mb-2">温馨提示</h3>
          <ul className="text-xs text-amber-700 space-y-1">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>提问后，答主将在约定时间内回复</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>回答后您可对回答进行评分</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>开启围观后，每次围观您可获得分成</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>超时未回答将自动全额退款</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-inset-bottom">
        <div className="flex items-center justify-between mb-3">
          <span className="text-muted-foreground">需支付</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary">¥{totalPrice}</span>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              提交中...
            </>
          ) : (
            <>
              <Users className="w-5 h-5" />
              提交并支付
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function AskQuestionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-48 bg-muted rounded-2xl" />
        </div>
      </div>
    }>
      <AskQuestionContent />
    </Suspense>
  )
}
