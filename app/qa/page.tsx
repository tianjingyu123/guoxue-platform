"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, MessageCircle, Clock, Eye, Heart, ChevronRight } from "lucide-react"

type QuestionStatus = 'pending' | 'answered' | 'expired' | 'refunded'

interface Question {
  id: string
  title: string
  content: string
  price: number
  status: QuestionStatus
  asker: { id: string; name: string; avatar: string }
  answerer?: { id: string; name: string; avatar: string; title?: string }
  answerPreview?: string
  isPublic: boolean
  isPaid: boolean
  viewCount: number
  likeCount: number
  circleName?: string
  createdAt: string
  answeredAt?: string
  expireAt: string
}

const statusConfig: Record<QuestionStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待回答', color: 'text-orange-600', bg: 'bg-orange-50' },
  answered: { label: '已回答', color: 'text-green-600', bg: 'bg-green-50' },
  expired: { label: '已过期', color: 'text-gray-500', bg: 'bg-gray-100' },
  refunded: { label: '已退款', color: 'text-red-600', bg: 'bg-red-50' },
}

export default function QuestionsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'answered'>('all')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setTimeout(() => {
      setQuestions([
        {
          id: '1',
          title: '八字中的正官与七杀有什么区别？',
          content: '我在学习八字命理时，对正官和七杀的区别不太理解，请问它们在命局中分别代表什么？',
          price: 50,
          status: 'answered',
          asker: { id: 'u1', name: '易学新手', avatar: '/avatars/user1.jpg' },
          answerer: { id: 'a1', name: '张大师', avatar: '/avatars/master1.jpg', title: '八字命理专家' },
          answerPreview: '正官与七杀都是克我者，但性质截然不同。正官是异性相克，代表正当的约束、规范...',
          isPublic: true,
          isPaid: true,
          viewCount: 1280,
          likeCount: 89,
          circleName: '八字命理研究',
          createdAt: '2024-01-15T10:00:00Z',
          answeredAt: '2024-01-15T14:30:00Z',
          expireAt: '2024-01-22T10:00:00Z',
        },
        {
          id: '2',
          title: '如何判断流年大运的吉凶？',
          content: '请教一下，在八字排盘后，如何分析流年和大运对命局的影响？',
          price: 88,
          status: 'pending',
          asker: { id: 'u2', name: '命理爱好者', avatar: '/avatars/user2.jpg' },
          answerer: { id: 'a2', name: '李老师', avatar: '/avatars/master2.jpg', title: '周易研究员' },
          isPublic: true,
          isPaid: true,
          viewCount: 356,
          likeCount: 12,
          circleName: '周易预测',
          createdAt: '2024-01-16T09:00:00Z',
          expireAt: '2024-01-23T09:00:00Z',
        },
        {
          id: '3',
          title: '梅花易数起卦的时间问题',
          content: '梅花易数起卦时，是用北京时间还是当地真太阳时？',
          price: 30,
          status: 'answered',
          asker: { id: 'u3', name: '国学迷', avatar: '/avatars/user3.jpg' },
          answerer: { id: 'a3', name: '王先生', avatar: '/avatars/master3.jpg', title: '梅花易数传承人' },
          answerPreview: '这是一个很好的问题。在传统梅花易数中，起卦使用的是当地真太阳时...',
          isPublic: false,
          isPaid: false,
          viewCount: 520,
          likeCount: 45,
          createdAt: '2024-01-14T16:00:00Z',
          answeredAt: '2024-01-14T20:00:00Z',
          expireAt: '2024-01-21T16:00:00Z',
        },
      ])
      setLoading(false)
    }, 800)
  }, [activeTab])

  const filteredQuestions = questions.filter(q => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return q.status === 'pending'
    if (activeTab === 'answered') return q.status === 'answered'
    return true
  })

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  const getTimeRemaining = (expireAt: string) => {
    const expire = new Date(expireAt)
    const now = new Date()
    const diff = expire.getTime() - now.getTime()
    if (diff <= 0) return '已过期'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 24) return `${hours}小时后过期`
    const days = Math.floor(hours / 24)
    return `${days}天后过期`
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">付费问答</h1>
          <button
            onClick={() => router.push('/qa/ask')}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#C41E3A] text-white text-sm font-medium rounded-full"
          >
            <Plus className="w-4 h-4" />
            提问
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-6">
          {[
            { key: 'all', label: '全部' },
            { key: 'pending', label: '待回答' },
            { key: 'answered', label: '已回答' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-[#C41E3A] border-[#C41E3A]'
                  : 'text-[#999999] border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-16" />
                </div>
              </div>
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full mb-4" />
              <div className="flex gap-4">
                <div className="h-4 bg-gray-100 rounded w-16" />
                <div className="h-4 bg-gray-100 rounded w-16" />
              </div>
            </div>
          ))
        ) : filteredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-[#999999]">暂无问答内容</p>
            <button
              onClick={() => router.push('/qa/ask')}
              className="mt-4 px-6 py-2 bg-[#C41E3A] text-white text-sm font-medium rounded-full"
            >
              发起提问
            </button>
          </div>
        ) : (
          filteredQuestions.map(question => (
            <div
              key={question.id}
              onClick={() => router.push(`/qa/${question.id}`)}
              className="bg-white rounded-2xl p-4 cursor-pointer active:bg-gray-50 transition-colors"
            >
              {/* Asker Info */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C41E3A] to-[#E85A6B] flex items-center justify-center text-white font-medium">
                    {question.asker.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C2C2C]">{question.asker.name}</p>
                    <p className="text-xs text-[#999999]">{formatTime(question.createdAt)}</p>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[question.status].bg} ${statusConfig[question.status].color}`}>
                  {statusConfig[question.status].label}
                </div>
              </div>

              {/* Question Content */}
              <h3 className="text-base font-medium text-[#2C2C2C] mb-2 line-clamp-2">
                {question.title}
              </h3>

              {/* Price & Circle */}
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-[#FFF4E5] text-[#C9A96E] text-xs font-medium rounded">
                  ¥{question.price}
                </span>
                {question.circleName && (
                  <span className="px-2 py-0.5 bg-[#F5F5F5] text-[#666666] text-xs rounded">
                    {question.circleName}
                  </span>
                )}
                {!question.isPublic && (
                  <span className="px-2 py-0.5 bg-gray-100 text-[#999999] text-xs rounded">
                    私密
                  </span>
                )}
              </div>

              {/* Answerer */}
              {question.answerer && (
                <div className="flex items-center gap-2 p-3 bg-[#FAF8F5] rounded-xl mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A96E] to-[#DFC296] flex items-center justify-center text-white text-sm font-medium">
                    {question.answerer.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#2C2C2C]">{question.answerer.name}</span>
                      {question.answerer.title && (
                        <span className="text-xs text-[#C9A96E]">{question.answerer.title}</span>
                      )}
                    </div>
                    {question.answerPreview && (
                      <p className="text-xs text-[#666666] line-clamp-1 mt-0.5">{question.answerPreview}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#999999] flex-shrink-0" />
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-[#999999]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {question.viewCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    {question.likeCount}
                  </span>
                </div>
                {question.status === 'pending' && (
                  <span className="flex items-center gap-1 text-orange-500">
                    <Clock className="w-3.5 h-3.5" />
                    {getTimeRemaining(question.expireAt)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
