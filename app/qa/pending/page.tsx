'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Clock, AlertCircle, MessageSquare, Coins, User, ChevronRight } from 'lucide-react'
import { questionApi, type Question } from '@/lib/api'

export default function PendingAnswersPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    loadQuestions()
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const res = await questionApi.list({ status: 'pending' })
      setQuestions(res.data)
    } catch (error) {
      console.error('Failed to load questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeRemaining = (expireAt: string) => {
    const diff = new Date(expireAt).getTime() - now
    if (diff <= 0) return { text: '已过期', isUrgent: true, isExpired: true }
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours < 1) {
      return { text: `${minutes}分钟`, isUrgent: true, isExpired: false }
    } else if (hours < 24) {
      return { text: `${hours}小时${minutes}分钟`, isUrgent: true, isExpired: false }
    } else {
      const days = Math.floor(hours / 24)
      return { text: `${days}天${hours % 24}小时`, isUrgent: false, isExpired: false }
    }
  }

  const pendingQuestions = questions.filter(q => {
    const diff = new Date(q.expireAt).getTime() - now
    return diff > 0
  })

  const expiredQuestions = questions.filter(q => {
    const diff = new Date(q.expireAt).getTime() - now
    return diff <= 0
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold">待回答问题</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{pendingQuestions.length}</div>
              <div className="text-xs text-muted-foreground mt-1">待回答</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">
                {pendingQuestions.filter(q => getTimeRemaining(q.expireAt).isUrgent).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">即将过期</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ¥{pendingQuestions.reduce((sum, q) => sum + q.price, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">待赚取</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-24 mb-2" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
              </div>
              <div className="h-5 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">暂无待回答问题</p>
          <p className="text-sm text-muted-foreground">设置更合理的价格可获得更多提问</p>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Pending Questions */}
          {pendingQuestions.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                待回答 ({pendingQuestions.length})
              </h2>
              <div className="space-y-3">
                {pendingQuestions.map(question => {
                  const timeInfo = getTimeRemaining(question.expireAt)
                  return (
                    <div
                      key={question.id}
                      onClick={() => router.push(`/qa/${question.id}`)}
                      className={`bg-card rounded-2xl p-4 border transition-all active:scale-[0.98] ${
                        timeInfo.isUrgent ? 'border-red-200 bg-red-50/50' : 'border-transparent'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={question.asker.avatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-medium text-sm">{question.asker.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(question.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                            timeInfo.isUrgent 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-amber-100 text-amber-600'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>剩余 {timeInfo.text}</span>
                          </div>
                        </div>
                      </div>

                      {/* Question */}
                      <h3 className="font-medium mb-2 line-clamp-2">{question.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {question.content}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-primary font-semibold">
                            <Coins className="w-4 h-4" />
                            <span>¥{question.price}</span>
                          </div>
                          {question.isPublic ? (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              公开
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                              私密
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-primary text-sm">
                          <span>去回答</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Expired Questions */}
          {expiredQuestions.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                已过期 ({expiredQuestions.length})
              </h2>
              <div className="space-y-3">
                {expiredQuestions.map(question => (
                  <div
                    key={question.id}
                    className="bg-card rounded-2xl p-4 border border-transparent opacity-60"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={question.asker.avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover grayscale"
                        />
                        <div>
                          <div className="font-medium text-sm">{question.asker.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(question.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
                        已过期
                      </span>
                    </div>
                    <h3 className="font-medium mb-2 line-clamp-1">{question.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="line-through">¥{question.price}</span>
                      <span>·</span>
                      <span>已退款给提问者</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Tips */}
      <div className="p-4 pb-20">
        <div className="bg-amber-50 rounded-xl p-4">
          <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            温馨提示
          </h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>· 请在有效期内回答问题，过期将自动退款</li>
            <li>· 认真回答可获得好评，提升您的曝光度</li>
            <li>· 私密问答仅提问者可见，请放心回答</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
