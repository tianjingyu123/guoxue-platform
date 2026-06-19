'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, User, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Mock data - 咨询列表
const mockInquiries = [
  {
    id: '1',
    productName: '《渊海子平》古籍影印本',
    customer: '张女士',
    status: 'unanswered',
    question: '请问这本书有电子版吗？能否快递到偏远地区？',
    time: '2024-01-20 14:30',
    replies: 0,
  },
  {
    id: '2',
    productName: '紫砂茶具套装',
    customer: '李先生',
    status: 'answered',
    question: '这套茶具是纯手工制作吗？有发票吗？',
    answer: '是的，全部由我们的手工艺人制作，购买时可提供发票。',
    time: '2024-01-20 10:15',
    replies: 1,
  },
  {
    id: '3',
    productName: '八字算命初学者套装',
    customer: '王女士',
    status: 'unanswered',
    question: '是否有退货政策？如果不满意可以退吗？',
    time: '2024-01-19 16:45',
    replies: 0,
  },
  {
    id: '4',
    productName: '国学经典诵读课程',
    customer: '陈先生',
    status: 'answered',
    question: '课程有效期是多久？可以重复学习吗？',
    answer: '课程一次购买终身有效，您可以随时重复学习。',
    time: '2024-01-19 09:20',
    replies: 2,
  },
  {
    id: '5',
    productName: '香道入门套装',
    customer: '赵女士',
    status: 'answered',
    question: '香道入门需要什么基础吗？',
    answer: '无需任何基础，我们的课程从零开始教学，包含详细的视频讲解。',
    time: '2024-01-18 14:10',
    replies: 1,
  },
]

const getStatusBadge = (status: string) => {
  if (status === 'answered') {
    return <Badge className="bg-green-100 text-green-800">已回答</Badge>
  }
  return <Badge className="bg-orange-100 text-orange-800">待回答</Badge>
}

export default function InquiriesPage() {
  const router = useRouter()
  const [inquiries, setInquiries] = useState(mockInquiries)
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('all')
  const [selectedInquiry, setSelectedInquiry] = useState<typeof mockInquiries[0] | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isReplying, setIsReplying] = useState(false)

  const filteredInquiries = inquiries.filter(inquiry =>
    filter === 'all' ? true : inquiry.status === filter
  )

  const unansweredCount = inquiries.filter(i => i.status === 'unanswered').length

  const handleReply = async () => {
    if (!replyText.trim() || !selectedInquiry) return
    
    setIsReplying(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setInquiries(inquiries.map(i =>
      i.id === selectedInquiry.id
        ? { ...i, status: 'answered' as const, answer: replyText, replies: i.replies + 1 }
        : i
    ))
    
    setSelectedInquiry(null)
    setReplyText('')
    setIsReplying(false)
  }

  if (selectedInquiry) {
    return (
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setSelectedInquiry(null)} className="p-1">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">咨询详情</h1>
            <div className="w-8" />
          </div>
        </div>

        <div className="pb-24">
          {/* 商品信息 */}
          <div className="mx-4 mt-4 p-4 bg-muted/50 rounded-xl">
            <div className="text-sm text-muted-foreground mb-1">商品</div>
            <div className="font-semibold text-foreground">{selectedInquiry.productName}</div>
          </div>

          {/* 客户信息 */}
          <div className="mx-4 mt-3 p-4 bg-card rounded-xl border border-border flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-foreground">{selectedInquiry.customer}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" /> {selectedInquiry.time}
              </div>
            </div>
            {getStatusBadge(selectedInquiry.status)}
          </div>

          {/* 问题 */}
          <div className="mx-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">客户问题</h3>
            <Card className="p-4">
              <p className="text-foreground leading-relaxed">{selectedInquiry.question}</p>
            </Card>
          </div>

          {/* 回复 */}
          {selectedInquiry.answer && (
            <div className="mx-4 mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">您的回复</h3>
              <Card className="p-4 bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-green-600 font-medium">已回复</span>
                </div>
                <p className="text-foreground leading-relaxed">{selectedInquiry.answer}</p>
              </Card>
            </div>
          )}

          {/* 回复表单 */}
          {selectedInquiry.status === 'unanswered' && (
            <div className="mx-4 mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">写回复</h3>
              <div className="space-y-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="请输入您的回复内容..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <Button
                  onClick={handleReply}
                  disabled={!replyText.trim() || isReplying}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isReplying ? '提交中...' : '提交回复'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">咨询管理</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="pb-20">
        {/* 统计 */}
        <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{inquiries.length}</div>
            <div className="text-xs text-muted-foreground mt-1">总咨询</div>
          </Card>
          <Card className="p-3 text-center border border-orange-200 bg-orange-50">
            <div className="text-2xl font-bold text-orange-600">{unansweredCount}</div>
            <div className="text-xs text-orange-700 mt-1">待回答</div>
          </Card>
          <Card className="p-3 text-center border border-green-200 bg-green-50">
            <div className="text-2xl font-bold text-green-600">
              {inquiries.filter(i => i.status === 'answered').length}
            </div>
            <div className="text-xs text-green-700 mt-1">已回答</div>
          </Card>
        </div>

        {/* 筛选 */}
        <div className="mx-4 mt-4 flex gap-2">
          {(['all', 'unanswered', 'answered'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all' ? '全部' : f === 'unanswered' ? '待回答' : '已回答'}
            </button>
          ))}
        </div>

        {/* 咨询列表 */}
        <div className="mx-4 mt-4">
          {filteredInquiries.length > 0 ? (
            <div className="space-y-2">
              {filteredInquiries.map(inquiry => (
                <button
                  key={inquiry.id}
                  onClick={() => setSelectedInquiry(inquiry)}
                  className="w-full p-4 rounded-xl border border-border hover:border-primary/30 bg-card transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground line-clamp-1">
                        {inquiry.productName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" /> {inquiry.customer}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {inquiry.time}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(inquiry.status)}
                  </div>
                  <p className="text-sm text-foreground/70 line-clamp-2">
                    {inquiry.question}
                  </p>
                  {inquiry.status === 'unanswered' && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                      <AlertCircle className="w-3 h-3" /> 待您回复
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MessageSquare className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-muted-foreground">暂无咨询</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
