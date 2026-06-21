'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ChevronLeft, Share2, Eye, Heart, Clock, CheckCircle, XCircle, 
  AlertCircle, MessageCircle, Lock, Star, Users, Send
} from 'lucide-react'
import { questionApi, type QuestionDetail, type PeekUser } from '@/lib/api'

export default function QuestionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const questionId = params.id as string

  const [question, setQuestion] = useState<QuestionDetail | null>(null)
  const [peekUsers, setPeekUsers] = useState<PeekUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isAnswerer, setIsAnswerer] = useState(false)
  const [isAsker, setIsAsker] = useState(false)
  const [hasPeeked, setHasPeeked] = useState(false)
  const [showPeekModal, setShowPeekModal] = useState(false)
  const [showAnswerModal, setShowAnswerModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showRateModal, setShowRateModal] = useState(false)
  const [answerContent, setAnswerContent] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rating, setRating] = useState(5)
  const [ratingComment, setRatingComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [questionData, peekUsersData] = await Promise.all([
          questionApi.detail(questionId),
          questionApi.getPeekUsers(questionId)
        ])
        setQuestion(questionData)
        setPeekUsers(peekUsersData)
        // Mock: check if current user is answerer/asker
        setIsAnswerer(questionData.answerer?.id === 'current-user')
        setIsAsker(questionData.asker.id === 'current-user')
        setHasPeeked(questionData.isPaid)
      } catch (error) {
        console.error('Failed to fetch question:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [questionId])

  const handlePeek = async () => {
    if (!question) return
    setSubmitting(true)
    try {
      await questionApi.peek(questionId)
      setHasPeeked(true)
      setShowPeekModal(false)
      // Refresh question to get answer
      const updated = await questionApi.detail(questionId)
      setQuestion(updated)
    } catch (error) {
      console.error('Failed to peek:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnswer = async () => {
    if (!answerContent.trim()) return
    setSubmitting(true)
    try {
      await questionApi.answer(questionId, answerContent, question?.isPublic || false)
      setShowAnswerModal(false)
      const updated = await questionApi.detail(questionId)
      setQuestion(updated)
    } catch (error) {
      console.error('Failed to answer:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setSubmitting(true)
    try {
      await questionApi.reject(questionId, rejectReason)
      setShowRejectModal(false)
      router.back()
    } catch (error) {
      console.error('Failed to reject:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRate = async () => {
    setSubmitting(true)
    try {
      await questionApi.rate(questionId, rating, ratingComment)
      setShowRateModal(false)
      const updated = await questionApi.detail(questionId)
      setQuestion(updated)
    } catch (error) {
      console.error('Failed to rate:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'answered':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: '已回答' }
      case 'expired':
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50', label: '已过期' }
      case 'refunded':
        return { icon: XCircle, color: 'text-orange-500', bg: 'bg-orange-50', label: '已退款' }
      default:
        return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', label: '待回答' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="h-40 bg-muted rounded-2xl animate-pulse" />
          <div className="h-60 bg-muted rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">问答不存在</p>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(question.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="font-medium">问答详情</span>
          <button className="p-1 -mr-1">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Question Section */}
      <div className="p-4">
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          {/* Status Badge */}
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.bg} ${statusConfig.color} mb-3`}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusConfig.label}</span>
          </div>

          {/* Asker Info */}
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={question.asker.avatar} 
              alt={question.asker.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">{question.asker.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(question.createdAt).toLocaleDateString('zh-CN', { 
                  month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">¥{question.price}</p>
              <p className="text-xs text-muted-foreground">提问费</p>
            </div>
          </div>

          {/* Question Content */}
          <h1 className="text-lg font-bold mb-2">{question.title}</h1>
          <p className="text-muted-foreground leading-relaxed">{question.content}</p>

          {/* Tags */}
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {question.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-muted text-xs rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {question.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {question.likeCount}
            </span>
            {question.circleName && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {question.circleName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Answer Section */}
      <div className="px-4">
        <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
          {/* Answerer Header */}
          {question.answerer && (
            <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <img 
                src={question.answerer.avatar} 
                alt={question.answerer.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{question.answerer.name}</p>
                  {question.answerer.title && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      {question.answerer.title}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {question.status === 'answered' ? '已回答' : '待回答'}
                </p>
              </div>
            </div>
          )}

          {/* Answer Content */}
          <div className="p-4">
            {question.status === 'answered' && question.answer ? (
              <>
                {/* Show answer if asker, answerer, or has peeked */}
                {(isAsker || isAnswerer || hasPeeked) ? (
                  <div>
                    <p className="leading-relaxed whitespace-pre-wrap">{question.answer}</p>
                    {question.answeredAt && (
                      <p className="text-xs text-muted-foreground mt-4">
                        回答于 {new Date(question.answeredAt).toLocaleDateString('zh-CN', {
                          month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    )}

                    {/* Rating */}
                    {question.rating ? (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-4 h-4 ${star <= question.rating! ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} 
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">提问者评价</span>
                        </div>
                        {question.ratingComment && (
                          <p className="text-sm text-muted-foreground">{question.ratingComment}</p>
                        )}
                      </div>
                    ) : isAsker ? (
                      <button
                        onClick={() => setShowRateModal(true)}
                        className="mt-4 w-full py-2 border border-primary text-primary rounded-xl text-sm font-medium"
                      >
                        评价此回答
                      </button>
                    ) : null}
                  </div>
                ) : (
                  /* Peek to view */
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-medium mb-2">付费围观查看答案</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      支付 <span className="text-primary font-bold">¥1</span> 即可查看完整回答
                    </p>
                    <button
                      onClick={() => setShowPeekModal(true)}
                      className="px-8 py-2 bg-gradient-to-r from-primary to-primary/80 text-white rounded-full text-sm font-medium"
                    >
                      立即围观
                    </button>
                  </div>
                )}
              </>
            ) : question.status === 'pending' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>
                <p className="font-medium mb-2">等待回答中</p>
                <p className="text-sm text-muted-foreground">
                  剩余 {Math.ceil((new Date(question.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} 天过期
                </p>
              </div>
            ) : question.status === 'expired' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium mb-2">问题已过期</p>
                <p className="text-sm text-muted-foreground">答主未在规定时间内回答</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-orange-500" />
                </div>
                <p className="font-medium mb-2">已退款</p>
                <p className="text-sm text-muted-foreground">答主拒绝了此问题</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Peek Users */}
      {peekUsers.length > 0 && question.status === 'answered' && (
        <div className="px-4 mt-4">
          <div className="bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                围观用户
              </h3>
              <span className="text-sm text-muted-foreground">{peekUsers.length}人</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {peekUsers.slice(0, 10).map((user) => (
                <img 
                  key={user.id}
                  src={user.avatar}
                  alt={user.name}
                  title={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ))}
              {peekUsers.length > 10 && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  +{peekUsers.length - 10}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      {isAnswerer && question.status === 'pending' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3">
          <button
            onClick={() => setShowRejectModal(true)}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-medium"
          >
            拒绝回答
          </button>
          <button
            onClick={() => setShowAnswerModal(true)}
            className="flex-1 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-medium"
          >
            开始回答
          </button>
        </div>
      )}

      {/* Peek Modal */}
      {showPeekModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPeekModal(false)} />
          <div className="relative bg-background rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom">
            <h3 className="text-lg font-bold mb-4 text-center">确认围观</h3>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-primary mb-2">¥1</p>
              <p className="text-sm text-muted-foreground">支付后即可查看完整回答</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPeekModal(false)}
                className="flex-1 py-3 border rounded-xl font-medium"
              >
                取消
              </button>
              <button
                onClick={handlePeek}
                disabled={submitting}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
              >
                {submitting ? '支付中...' : '确认支付'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Answer Modal */}
      {showAnswerModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAnswerModal(false)} />
          <div className="relative bg-background rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom">
            <h3 className="text-lg font-bold mb-4">回答问题</h3>
            <textarea
              value={answerContent}
              onChange={(e) => setAnswerContent(e.target.value)}
              placeholder="请输入您的回答..."
              className="w-full h-40 p-4 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {answerContent.length}/2000
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowAnswerModal(false)}
                className="flex-1 py-3 border rounded-xl font-medium"
              >
                取消
              </button>
              <button
                onClick={handleAnswer}
                disabled={submitting || !answerContent.trim()}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
              >
                {submitting ? '提交中...' : '提交回答'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-background rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom">
            <h3 className="text-lg font-bold mb-4">拒绝原因</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请说明拒绝回答的原因..."
              className="w-full h-24 p-4 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground mt-2">
              拒绝后，提问者将收到全额退款
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-3 border rounded-xl font-medium"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !rejectReason.trim()}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {submitting ? '提交中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Modal */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRateModal(false)} />
          <div className="relative bg-background rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom">
            <h3 className="text-lg font-bold mb-4 text-center">评价回答</h3>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)}>
                  <Star 
                    className={`w-8 h-8 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} 
                  />
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="写下您的评价（选填）"
              className="w-full h-24 p-4 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRateModal(false)}
                className="flex-1 py-3 border rounded-xl font-medium"
              >
                取消
              </button>
              <button
                onClick={handleRate}
                disabled={submitting}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
              >
                {submitting ? '提交中...' : '提交评价'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
