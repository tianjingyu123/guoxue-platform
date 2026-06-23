'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ChevronLeft, Share2, Clock, Eye, MessageCircle, Award, 
  ThumbsUp, CheckCircle, AlertCircle, Gift, User, Send
} from 'lucide-react'
import { bountyApi, type BountyDetail, type BountyAnswer } from '@/lib/api'

export default function BountyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bountyId = params.id as string
  
  const [bounty, setBounty] = useState<BountyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAnswerForm, setShowAnswerForm] = useState(false)
  const [answerContent, setAnswerContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentUserId] = useState('user-123') // Mock current user

  useEffect(() => {
    loadBounty()
  }, [bountyId])

  const loadBounty = async () => {
    setLoading(true)
    try {
      // Mock data
      const mockBounty: BountyDetail = {
        id: bountyId,
        title: '如何理解《易经》中的"元亨利贞"？',
        description: '想深入了解《易经》乾卦中"元亨利贞"四德的含义',
        content: '我最近在学习《易经》，对于乾卦的"元亨利贞"这四个字理解不深。\n\n1. 这四个字分别代表什么意思？\n2. 它们之间有什么内在联系？\n3. 在实际生活中如何运用这四德？\n\n希望能得到详细的解答，最好能结合具体案例说明。',
        amount: 50,
        status: 'open',
        poster: { id: 'user-456', name: '国学爱好者', avatar: '' },
        answerCount: 3,
        viewCount: 128,
        category: '易经研究',
        tags: ['易经', '乾卦', '四德'],
        createdAt: '2024-01-15T10:00:00Z',
        expireAt: '2024-01-22T10:00:00Z',
        answers: [
          {
            id: 'answer-1',
            content: '"元亨利贞"是《易经》乾卦的卦辞，被称为"四德"。\n\n**元**：开始、首创、生长之德。代表万物之始，是创造的源动力。\n\n**亨**：通达、顺利、亨通之德。代表事物发展顺畅，如日中天。\n\n**利**：有利、适宜、收获之德。代表成熟收获，获得利益。\n\n**贞**：正固、坚守、纯正之德。代表守正不阿，坚持正道。\n\n这四德代表了事物发展的四个阶段，也是为人处世的四种品德。',
            author: { id: 'user-789', name: '周易大师', avatar: '', title: '易学讲师' },
            likes: 24,
            isLiked: false,
            isAccepted: false,
            createdAt: '2024-01-15T14:30:00Z'
          },
          {
            id: 'answer-2',
            content: '简单来说，元是创始，亨是通达，利是和谐，贞是正固。这四个字概括了天道运行和人生处世的基本原则。',
            author: { id: 'user-101', name: '传统文化研究者', avatar: '' },
            likes: 8,
            isLiked: true,
            isAccepted: false,
            createdAt: '2024-01-16T09:00:00Z'
          }
        ]
      }
      setBounty(mockBounty)
    } catch (error) {
      console.error('Failed to load bounty:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!answerContent.trim() || answerContent.length < 20) return
    setSubmitting(true)
    try {
      await bountyApi.answer(bountyId, answerContent)
      setAnswerContent('')
      setShowAnswerForm(false)
      loadBounty()
    } catch (error) {
      console.error('Failed to submit answer:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcceptAnswer = async (answerId: string) => {
    try {
      await bountyApi.accept(bountyId, answerId)
      loadBounty()
    } catch (error) {
      console.error('Failed to accept answer:', error)
    }
  }

  const handleLikeAnswer = async (answerId: string) => {
    try {
      await bountyApi.likeAnswer(bountyId, answerId)
      if (bounty) {
        setBounty({
          ...bounty,
          answers: bounty.answers.map(a => 
            a.id === answerId 
              ? { ...a, isLiked: !a.isLiked, likes: a.isLiked ? a.likes - 1 : a.likes + 1 }
              : a
          )
        })
      }
    } catch (error) {
      console.error('Failed to like answer:', error)
    }
  }

  const handleSettle = async () => {
    try {
      await bountyApi.settle(bountyId)
      loadBounty()
    } catch (error) {
      console.error('Failed to settle:', error)
    }
  }

  const handleRefund = async () => {
    try {
      await bountyApi.refund(bountyId)
      loadBounty()
    } catch (error) {
      console.error('Failed to refund:', error)
    }
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      open: { label: '进行中', color: 'text-green-600', bg: 'bg-green-50' },
      answered: { label: '已回答', color: 'text-blue-600', bg: 'bg-blue-50' },
      resolved: { label: '已解决', color: 'text-primary', bg: 'bg-primary/10' },
      expired: { label: '已过期', color: 'text-muted-foreground', bg: 'bg-muted' },
      cancelled: { label: '已取消', color: 'text-muted-foreground', bg: 'bg-muted' }
    }
    return configs[status] || configs.open
  }

  const getRemainingTime = (expireAt: string) => {
    const diff = new Date(expireAt).getTime() - Date.now()
    if (diff <= 0) return '已过期'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `剩余 ${days} 天 ${hours} 小时`
    return `剩余 ${hours} 小时`
  }

  const isPoster = bounty?.poster.id === currentUserId
  const hasAnswered = bounty?.answers.some(a => a.author.id === currentUserId)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-medium">悬赏详情</span>
            <div className="w-9" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!bounty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">悬赏不存在或已删除</p>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(bounty.status)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-muted rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium">悬赏详情</span>
          <button className="p-2 -mr-2 hover:bg-muted rounded-full">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bounty Info */}
      <div className="p-4 space-y-4">
        {/* Amount & Status */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-600" />
              <span className="text-2xl font-bold text-amber-600">¥{bounty.amount}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          {bounty.status === 'open' && (
            <div className="flex items-center gap-1 text-sm text-amber-700">
              <Clock className="w-4 h-4" />
              <span>{getRemainingTime(bounty.expireAt)}</span>
            </div>
          )}
        </div>

        {/* Poster */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            {bounty.poster.avatar ? (
              <img src={bounty.poster.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{bounty.poster.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(bounty.createdAt).toLocaleDateString('zh-CN')} 发布
            </p>
          </div>
        </div>

        {/* Title & Content */}
        <div>
          <h1 className="text-lg font-semibold mb-3">{bounty.title}</h1>
          <div className="text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {bounty.content}
          </div>
        </div>

        {/* Tags */}
        {bounty.tags && bounty.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {bounty.tags.map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {bounty.viewCount} 浏览
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            {bounty.answerCount} 回答
          </span>
        </div>
      </div>

      {/* Answers */}
      <div className="mt-2 bg-background">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-medium">
            全部回答 <span className="text-muted-foreground">({bounty.answers.length})</span>
          </h2>
        </div>

        {bounty.answers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>暂无回答，快来抢答吧</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {bounty.answers.map((answer) => (
              <div key={answer.id} className="p-4">
                {/* Answer Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center flex-shrink-0">
                    {answer.author.avatar ? (
                      <img src={answer.author.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{answer.author.name}</span>
                      {answer.author.title && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded">
                          {answer.author.title}
                        </span>
                      )}
                      {answer.isAccepted && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-600 text-xs rounded">
                          <CheckCircle className="w-3 h-3" />
                          已采纳
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(answer.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                {/* Answer Content */}
                <div className="text-foreground/80 whitespace-pre-wrap leading-relaxed mb-3">
                  {answer.content}
                </div>

                {/* Answer Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleLikeAnswer(answer.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      answer.isLiked 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{answer.likes}</span>
                  </button>

                  {isPoster && bounty.status === 'open' && !answer.isAccepted && !bounty.acceptedAnswerId && (
                    <button
                      onClick={() => handleAcceptAnswer(answer.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm"
                    >
                      <Award className="w-4 h-4" />
                      采纳答案
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Answer Form Modal */}
      {showAnswerForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-background rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <button 
                onClick={() => setShowAnswerForm(false)}
                className="text-muted-foreground"
              >
                取消
              </button>
              <span className="font-medium">写回答</span>
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || answerContent.length < 20}
                className="text-primary font-medium disabled:opacity-50"
              >
                {submitting ? '提交中...' : '提交'}
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="请输入您的回答，至少20字..."
                className="w-full h-48 p-3 bg-muted rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {answerContent.length}/2000
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-bottom">
        {isPoster ? (
          // Poster actions
          <div className="flex gap-3">
            {bounty.status === 'open' && bounty.acceptedAnswerId && (
              <button
                onClick={handleSettle}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
              >
                结算悬赏
              </button>
            )}
            {bounty.status === 'expired' && bounty.answers.length === 0 && (
              <button
                onClick={handleRefund}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-medium"
              >
                申请退款
              </button>
            )}
            {bounty.status === 'open' && !bounty.acceptedAnswerId && (
              <button
                onClick={() => router.push('/qa')}
                className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium"
              >
                查看更多回答
              </button>
            )}
          </div>
        ) : (
          // Answerer actions
          <div className="flex gap-3">
            {bounty.status === 'open' && !hasAnswered && (
              <button
                onClick={() => setShowAnswerForm(true)}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                我要回答
              </button>
            )}
            {hasAnswered && (
              <div className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl font-medium text-center">
                已提交回答
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
