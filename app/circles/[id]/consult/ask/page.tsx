'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, MessageSquare, Eye, ThumbsUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Mock data - 咨询问答列表
const mockQuestions = [
  {
    id: '1',
    title: '如何通过八字看一个人的财运？',
    content: '我想了解如何从八字命盘中看出一个人的财运好坏，有什么关键要素吗？',
    asker: '张女士',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40',
    views: 1250,
    likes: 85,
    answers: 12,
    status: 'answered',
    time: '2024-01-20 14:30',
  },
  {
    id: '2',
    title: '紫微斗数和八字哪个准确率更高？',
    content: '想对比一下两种算命方法的准确率，求推荐。',
    asker: '李先生',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40',
    views: 850,
    likes: 62,
    answers: 8,
    status: 'answered',
    time: '2024-01-20 10:15',
  },
  {
    id: '3',
    title: '流年大运是如何计算的？',
    content: '请问流年大运的计算方法，以及如何才能准确的判断出一个人的吉凶祸福。',
    asker: '王女士',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40',
    views: 620,
    likes: 45,
    answers: 5,
    status: 'unanswered',
    time: '2024-01-20 09:45',
  },
]

export default function CircleConsultAskPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState(mockQuestions)
  const [showNewQuestion, setShowNewQuestion] = useState(false)
  const [newQuestion, setNewQuestion] = useState({ title: '', content: '' })

  const handlePostQuestion = () => {
    if (newQuestion.title.trim() && newQuestion.content.trim()) {
      setShowNewQuestion(false)
      setNewQuestion({ title: '', content: '' })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">咨询问答</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="pb-24">
        {/* 提问按钮 */}
        <div className="mx-4 mt-4">
          <Button
            onClick={() => setShowNewQuestion(true)}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            提出问题
          </Button>
        </div>

        {/* 新问题表单 */}
        {showNewQuestion && (
          <div className="mx-4 mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="问题标题"
                value={newQuestion.title}
                onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <textarea
                placeholder="详细描述您的问题..."
                value={newQuestion.content}
                onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewQuestion(false)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handlePostQuestion}
                  disabled={!newQuestion.title.trim() || !newQuestion.content.trim()}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4 mr-1" />
                  发送
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 问题列表 */}
        <div className="mx-4 mt-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">热门问题</h2>
          <div className="space-y-2">
            {questions.map(question => (
              <button
                key={question.id}
                onClick={() => router.push(`/circles/1/consult/questions/${question.id}`)}
                className="w-full p-4 rounded-xl border border-border hover:border-primary/30 bg-card transition-all text-left"
              >
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={question.avatar}
                    alt={question.asker}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {question.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {question.content}
                    </p>
                  </div>
                  {question.status === 'unanswered' && (
                    <Badge className="bg-orange-100 text-orange-800 text-xs">待答</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{question.asker} • {question.time}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {question.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {question.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {question.answers}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
