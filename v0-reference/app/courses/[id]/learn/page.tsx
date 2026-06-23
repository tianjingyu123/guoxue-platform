"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Play, CheckCircle, Lock, BookOpen, MessageCircle, FileText, Clock, ChevronDown, ChevronUp, Send, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Mock data
const mockCourse = {
  id: "1",
  title: "八字命理入门到精通",
  cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
  instructor: { id: "1", name: "李明远", avatar: "https://i.pravatar.cc/100?img=11", title: "资深命理师" },
  totalLessons: 32,
  totalDuration: 1920,
}

const mockProgress = {
  courseId: "1",
  completedLessons: ["l1", "l2", "l3", "l4", "l5"],
  totalLessons: 32,
  progressPercent: 15,
  lastLesson: { id: "l6", chapterId: "c2", title: "天干地支的阴阳属性" },
  studyTime: 180,
}

const mockChapters = [
  {
    id: "c1",
    title: "第一章 八字基础概念",
    duration: 180,
    isFree: true,
    lessons: [
      { id: "l1", title: "什么是八字命理", duration: 15, isFree: true, isCompleted: true },
      { id: "l2", title: "八字的起源与发展", duration: 18, isFree: true, isCompleted: true },
      { id: "l3", title: "四柱八字的构成", duration: 20, isFree: true, isCompleted: true },
    ],
  },
  {
    id: "c2",
    title: "第二章 天干地支详解",
    duration: 240,
    isFree: false,
    lessons: [
      { id: "l4", title: "十天干基础", duration: 25, isFree: false, isCompleted: true },
      { id: "l5", title: "十二地支基础", duration: 25, isFree: false, isCompleted: true },
      { id: "l6", title: "天干地支的阴阳属性", duration: 22, isFree: false, isCompleted: false },
      { id: "l7", title: "干支的五行属性", duration: 28, isFree: false, isCompleted: false },
    ],
  },
  {
    id: "c3",
    title: "第三章 排盘方法",
    duration: 300,
    isFree: false,
    lessons: [
      { id: "l8", title: "年柱的推算", duration: 30, isFree: false, isCompleted: false },
      { id: "l9", title: "月柱的推算", duration: 32, isFree: false, isCompleted: false },
      { id: "l10", title: "日柱的推算", duration: 28, isFree: false, isCompleted: false },
    ],
  },
]

const mockNotes = [
  { id: "n1", content: "八字由年、月、日、时四柱组成，每柱包含天干地支，共八个字。", chapterId: "c1", chapterTitle: "第一章 八字基础概念", lessonTitle: "四柱八字的构成", createdAt: "2024-01-15" },
  { id: "n2", content: "十天干：甲乙丙丁戊己庚辛壬癸。其中甲丙戊庚壬为阳干，乙丁己辛癸为阴干。", chapterId: "c2", chapterTitle: "第二章 天干地支详解", lessonTitle: "十天干基础", timestamp: 320, createdAt: "2024-01-16" },
  { id: "n3", content: "十二地支：子丑寅卯辰巳午未申酉戌亥。对应十二生肖。", chapterId: "c2", chapterTitle: "第二章 天干地支详解", lessonTitle: "十二地支基础", timestamp: 180, createdAt: "2024-01-16" },
]

const mockQuestions = [
  { id: "q1", content: "请问老师，为什么说八字中日柱最重要？", author: { id: "u1", name: "学习者小王", avatar: "https://i.pravatar.cc/100?img=33" }, chapterTitle: "第一章", createdAt: "2024-01-18", answers: 3, isAnswered: true },
  { id: "q2", content: "天干地支的阴阳划分有什么实际应用意义？", author: { id: "u2", name: "命理新手", avatar: "https://i.pravatar.cc/100?img=44" }, chapterTitle: "第二章", createdAt: "2024-01-17", answers: 5, isAnswered: true },
  { id: "q3", content: "如何判断一个八字的五行是否平衡？", author: { id: "u3", name: "易学爱好者", avatar: "https://i.pravatar.cc/100?img=55" }, chapterTitle: "第三章", createdAt: "2024-01-16", answers: 0, isAnswered: false },
]

// 进度环组件
function ProgressRing({ percent, size = 80, strokeWidth = 6 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8E3DB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#C41E3A"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[16px] font-bold text-[#C41E3A]">{percent}%</span>
      </div>
    </div>
  )
}

// 章节列表项
function ChapterItem({ 
  chapter, 
  isExpanded, 
  onToggle, 
  onLessonClick 
}: { 
  chapter: typeof mockChapters[0]
  isExpanded: boolean
  onToggle: () => void
  onLessonClick: (lessonId: string) => void
}) {
  const completedCount = chapter.lessons?.filter(l => l.isCompleted).length || 0
  const totalCount = chapter.lessons?.length || 0
  const isCompleted = completedCount === totalCount && totalCount > 0

  return (
    <div className="border-b border-[#E8E3DB] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between active:bg-[#F5F0E8] transition-colors"
      >
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <div className="w-6 h-6 rounded-full bg-[#C41E3A]/10 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-[#C41E3A]" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#E8E3DB] flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#666]">{completedCount}/{totalCount}</span>
            </div>
          )}
          <div className="text-left">
            <h3 className="text-[14px] font-medium text-[#2C2C2C]">{chapter.title}</h3>
            <p className="text-[12px] text-[#999]">{totalCount}节 · {chapter.duration}分钟</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#999]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#999]" />
        )}
      </button>

      {isExpanded && chapter.lessons && (
        <div className="bg-[#FAFAFA] px-4 pb-2">
          {chapter.lessons.map((lesson, idx) => (
            <button
              key={lesson.id}
              onClick={() => onLessonClick(lesson.id)}
              className="w-full py-2.5 flex items-center gap-3 border-b border-[#E8E3DB]/50 last:border-b-0 active:bg-[#F0EBE3] transition-colors"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {lesson.isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-[#C41E3A]" />
                ) : !chapter.isFree && !lesson.isFree ? (
                  <Lock className="w-4 h-4 text-[#999]" />
                ) : (
                  <Play className="w-4 h-4 text-[#666]" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className={cn(
                  "text-[13px]",
                  lesson.isCompleted ? "text-[#999]" : "text-[#2C2C2C]"
                )}>
                  {idx + 1}. {lesson.title}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {lesson.isFree && (
                  <span className="text-[10px] text-[#52c41a] bg-[#52c41a]/10 px-1.5 py-0.5 rounded">试看</span>
                )}
                <span className="text-[11px] text-[#999]">{lesson.duration}分钟</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// 笔记项
function NoteItem({ note }: { note: typeof mockNotes[0] }) {
  return (
    <Card className="p-3 border-0 shadow-sm bg-white rounded-lg">
      <div className="flex items-start gap-2 mb-2">
        <FileText className="w-4 h-4 text-[#C9A96E] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-[12px] text-[#C41E3A]">{note.chapterTitle}</p>
          <p className="text-[11px] text-[#999]">{note.lessonTitle} {note.timestamp && `· ${Math.floor(note.timestamp / 60)}:${(note.timestamp % 60).toString().padStart(2, '0')}`}</p>
        </div>
      </div>
      <p className="text-[13px] text-[#2C2C2C] leading-relaxed pl-6">{note.content}</p>
      <p className="text-[11px] text-[#999] mt-2 pl-6">{note.createdAt}</p>
    </Card>
  )
}

// 问答项
function QuestionItem({ question }: { question: typeof mockQuestions[0] }) {
  return (
    <Card className="p-3 border-0 shadow-sm bg-white rounded-lg">
      <div className="flex items-start gap-2.5">
        <img src={question.author.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-medium text-[#2C2C2C]">{question.author.name}</span>
            <span className="text-[11px] text-[#999]">{question.createdAt}</span>
          </div>
          <p className="text-[13px] text-[#2C2C2C] leading-relaxed mb-2">{question.content}</p>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#999]">{question.chapterTitle}</span>
            <span className="text-[11px] text-[#C41E3A]">{question.answers}条回答</span>
            {question.isAnswered && (
              <span className="text-[10px] text-white bg-[#52c41a] px-1.5 py-0.5 rounded">已解答</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// 提问弹窗
function AskQuestionModal({ isOpen, onClose, onSubmit }: { isOpen: boolean; onClose: () => void; onSubmit: (content: string) => void }) {
  const [content, setContent] = useState("")

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="w-full bg-white rounded-t-2xl p-4 pb-8 animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-[#2C2C2C]">我要提问</h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-[#999]" />
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="请输入您的问题..."
          className="w-full h-32 p-3 bg-[#F5F0E8] rounded-lg text-[14px] text-[#2C2C2C] placeholder:text-[#999] resize-none focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/30"
        />
        <button
          onClick={() => {
            if (content.trim()) {
              onSubmit(content)
              setContent("")
              onClose()
            }
          }}
          disabled={!content.trim()}
          className={cn(
            "w-full mt-4 py-3 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all",
            content.trim()
              ? "bg-[#C41E3A] text-white active:bg-[#A01830]"
              : "bg-[#E8E3DB] text-[#999]"
          )}
        >
          <Send className="w-4 h-4" />
          提交问题
        </button>
      </div>
    </div>
  )
}

// 骨架屏
function LearnSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-white p-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#E8E3DB]" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-[#E8E3DB] rounded w-3/4" />
            <div className="h-4 bg-[#E8E3DB] rounded w-1/2" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-white rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function CourseLearnPage() {
  const params = useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"catalog" | "notes" | "questions">("catalog")
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set(["c1", "c2"]))
  const [showAskModal, setShowAskModal] = useState(false)

  useEffect(() => {
    // Simulate API loading
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev)
      next.has(chapterId) ? next.delete(chapterId) : next.add(chapterId)
      return next
    })
  }

  const handleLessonClick = (lessonId: string) => {
    router.push(`/courses/${params.id}/player?lesson=${lessonId}`)
  }

  const handleAskQuestion = (content: string) => {
    // TODO: Call courseApi.askQuestion
    console.log("Ask question:", content)
  }

  if (isLoading) return <LearnSkeleton />

  const tabs = [
    { id: "catalog", label: "目录", icon: BookOpen, count: mockChapters.length },
    { id: "notes", label: "笔记", icon: FileText, count: mockNotes.length },
    { id: "questions", label: "问答", icon: MessageCircle, count: mockQuestions.length },
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center px-4 h-11">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="flex-1 text-center text-[16px] font-medium text-[#2C2C2C] truncate px-4">
            {mockCourse.title}
          </h1>
          <div className="w-6" />
        </div>
      </div>

      {/* 课程信息 + 进度 */}
      <div className="bg-white p-4 border-b border-[#E8E3DB]">
        <div className="flex items-center gap-4">
          <ProgressRing percent={mockProgress.progressPercent} />
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-[#2C2C2C] mb-1">{mockCourse.title}</h2>
            <div className="flex items-center gap-2 mb-2">
              <img src={mockCourse.instructor.avatar} alt="" className="w-5 h-5 rounded-full" />
              <span className="text-[12px] text-[#666]">{mockCourse.instructor.name}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#999]">
              <span>已学 {mockProgress.completedLessons.length}/{mockProgress.totalLessons} 节</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.floor(mockProgress.studyTime / 60)}小时{mockProgress.studyTime % 60}分钟
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="bg-white border-b border-[#E8E3DB] sticky top-11 z-30">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-[#C41E3A] text-[#C41E3A]"
                  : "border-transparent text-[#666]"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-[13px] font-medium">{tab.label}</span>
              <span className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-full",
                activeTab === tab.id ? "bg-[#C41E3A]/10" : "bg-[#F5F0E8]"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="p-4">
        {/* 目录 Tab */}
        {activeTab === "catalog" && (
          <Card className="overflow-hidden border-0 shadow-sm bg-white rounded-xl">
            {mockChapters.map(chapter => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                isExpanded={expandedChapters.has(chapter.id)}
                onToggle={() => toggleChapter(chapter.id)}
                onLessonClick={handleLessonClick}
              />
            ))}
          </Card>
        )}

        {/* 笔记 Tab */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            {mockNotes.length > 0 ? (
              mockNotes.map(note => <NoteItem key={note.id} note={note} />)
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-[#E8E3DB] mx-auto mb-3" />
                <p className="text-[14px] text-[#999]">暂无笔记</p>
                <p className="text-[12px] text-[#BBB] mt-1">学习时可以随时记录笔记</p>
              </div>
            )}
          </div>
        )}

        {/* 问答 Tab */}
        {activeTab === "questions" && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAskModal(true)}
              className="w-full py-3 bg-white rounded-xl border border-dashed border-[#C41E3A] text-[#C41E3A] text-[13px] font-medium flex items-center justify-center gap-2 active:bg-[#C41E3A]/5"
            >
              <MessageCircle className="w-4 h-4" />
              我要提问
            </button>
            {mockQuestions.map(question => (
              <QuestionItem key={question.id} question={question} />
            ))}
          </div>
        )}
      </div>

      {/* 底部继续学习按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 pb-8">
        <button
          onClick={() => handleLessonClick(mockProgress.lastLesson?.id || "l1")}
          className="w-full py-3 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white text-[15px] font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#C41E3A]/30 active:scale-[0.98] transition-all"
        >
          <Play className="w-5 h-5" fill="white" />
          继续学习 · {mockProgress.lastLesson?.title}
        </button>
      </div>

      {/* 提问弹窗 */}
      <AskQuestionModal
        isOpen={showAskModal}
        onClose={() => setShowAskModal(false)}
        onSubmit={handleAskQuestion}
      />
    </div>
  )
}
