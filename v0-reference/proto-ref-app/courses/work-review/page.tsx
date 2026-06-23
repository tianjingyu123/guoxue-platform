"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Clock, CheckCircle, XCircle, ChevronRight, Search, Filter, Star, MessageSquare, Image as ImageIcon, Send, RotateCcw, Users, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

// 评语模板
const commentTemplates = [
  { id: "1", label: "优秀", text: "作业完成得非常出色，理解深入，表达清晰，继续保持！" },
  { id: "2", label: "良好", text: "整体完成较好，对知识点有一定理解，建议进一步深入学习。" },
  { id: "3", label: "合格", text: "基本完成作业要求，但理解还不够深入，请结合课程内容再次复习。" },
  { id: "4", label: "需改进", text: "作业存在一些问题，请根据批注重新修改后提交。" },
]

// 快捷分数
const quickScores = [100, 90, 80, 70, 60]

// Mock数据
const mockSubmissions = [
  {
    id: "1",
    student: { id: "s1", name: "张三", avatar: "" },
    chapterId: "c1",
    chapterTitle: "第一章：八字基础",
    content: "通过本章学习，我了解到八字命理的核心是以出生时间为基础，用天干地支来表示。天干有十个：甲、乙、丙、丁、戊、己、庚、辛、壬、癸；地支有十二个：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。\n\n八字中最重要的是日主，代表命主本人。通过分析日主与其他七个字的关系，可以推断一个人的性格特点和命运走向。",
    images: ["/images/courses/work-1.jpg", "/images/courses/work-2.jpg"],
    submittedAt: "2024-01-15 14:30",
    status: "pending" as const,
    wordCount: 156,
  },
  {
    id: "2",
    student: { id: "s2", name: "李四", avatar: "" },
    chapterId: "c1",
    chapterTitle: "第一章：八字基础",
    content: "八字命理学习心得：天干地支是基础，需要熟练掌握。日主很重要，是分析的核心。",
    images: [],
    submittedAt: "2024-01-15 15:20",
    status: "pending" as const,
    wordCount: 42,
  },
  {
    id: "3",
    student: { id: "s3", name: "王五", avatar: "" },
    chapterId: "c2",
    chapterTitle: "第二章：五行生克",
    content: "五行相生：木生火、火生土、土生金、金生水、水生木。五行相克：木克土、土克水、水克火、火克金、金克木。这些关系在八字分析中非常重要。",
    images: ["/images/courses/work-3.jpg"],
    submittedAt: "2024-01-14 10:15",
    status: "graded" as const,
    wordCount: 78,
  },
]

// 骨架屏
function ReviewSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-14 bg-white border-b border-[#E8E3DB]" />
      <div className="p-4 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#F2EFEA]" />
              <div className="flex-1">
                <div className="h-4 bg-[#F2EFEA] rounded w-20 mb-2" />
                <div className="h-3 bg-[#F2EFEA] rounded w-32" />
              </div>
            </div>
            <div className="h-16 bg-[#F2EFEA] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// 作业列表项
function WorkItem({ 
  work, 
  isSelected, 
  onSelect 
}: { 
  work: typeof mockSubmissions[0]
  isSelected: boolean
  onSelect: () => void 
}) {
  return (
    <div 
      onClick={onSelect}
      className={cn(
        "bg-white rounded-xl p-4 cursor-pointer transition-all",
        isSelected 
          ? "ring-2 ring-[#C41E3A] shadow-lg" 
          : "hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20 flex items-center justify-center">
            <span className="text-sm font-medium text-[#C41E3A]">
              {work.student.name.charAt(0)}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-[#2C2C2C]">{work.student.name}</div>
            <div className="text-xs text-[#999999]">{work.chapterTitle}</div>
          </div>
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          work.status === 'pending' ? "bg-orange-50 text-orange-600" :
          work.status === 'graded' ? "bg-green-50 text-green-600" :
          "bg-red-50 text-red-600"
        )}>
          {work.status === 'pending' ? '待批改' : work.status === 'graded' ? '已批改' : '已退回'}
        </div>
      </div>
      
      <p className="text-sm text-[#666666] line-clamp-2 mb-2">{work.content}</p>
      
      <div className="flex items-center justify-between text-xs text-[#999999]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {work.wordCount}字
          </span>
          {work.images.length > 0 && (
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {work.images.length}图
            </span>
          )}
        </div>
        <span>{work.submittedAt}</span>
      </div>
    </div>
  )
}

// 批改面板
function ReviewPanel({ 
  work, 
  onSubmit, 
  onClose 
}: { 
  work: typeof mockSubmissions[0]
  onSubmit: (data: { score: number; comment: string; suggestions: string[]; status: 'graded' | 'returned' }) => void
  onClose: () => void
}) {
  const [score, setScore] = useState(80)
  const [comment, setComment] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [newSuggestion, setNewSuggestion] = useState("")
  const [selectedText, setSelectedText] = useState("")
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const addSuggestion = () => {
    if (newSuggestion.trim()) {
      setSuggestions([...suggestions, newSuggestion.trim()])
      setNewSuggestion("")
    }
  }

  const removeSuggestion = (index: number) => {
    setSuggestions(suggestions.filter((_, i) => i !== index))
  }

  const applyTemplate = (text: string) => {
    setComment(text)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* 学生作业内容 */}
      <div className="p-4 border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20 flex items-center justify-center">
              <span className="text-xs font-medium text-[#C41E3A]">
                {work.student.name.charAt(0)}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-[#2C2C2C]">{work.student.name}</span>
              <span className="text-xs text-[#999999] ml-2">{work.submittedAt}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#999999] text-sm">收起</button>
        </div>
        
        <div className="bg-[#FAF8F5] rounded-lg p-3 mb-3">
          <p 
            className="text-sm text-[#2C2C2C] whitespace-pre-wrap select-text"
            onMouseUp={() => {
              const selection = window.getSelection()?.toString()
              if (selection) setSelectedText(selection)
            }}
          >
            {work.content}
          </p>
          {selectedText && (
            <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
              <div className="text-xs text-yellow-700 mb-1">选中文字：</div>
              <div className="text-sm text-yellow-800">{selectedText}</div>
              <button 
                onClick={() => {
                  setNewSuggestion(`"${selectedText}" - `)
                  setSelectedText("")
                }}
                className="mt-2 text-xs text-[#C41E3A]"
              >
                添加为修改建议
              </button>
            </div>
          )}
        </div>
        
        {work.images.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {work.images.map((img, idx) => (
              <div 
                key={idx} 
                className="w-16 h-16 rounded-lg bg-[#F2EFEA] overflow-hidden cursor-pointer"
                onClick={() => setPreviewImage(img)}
              >
                <div className="w-full h-full flex items-center justify-center text-[#999999]">
                  <ImageIcon className="w-6 h-6" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 批改区域 */}
      <div className="p-4 space-y-4">
        {/* 分数 */}
        <div>
          <label className="text-sm font-medium text-[#2C2C2C] mb-2 block">评分</label>
          <div className="flex items-center gap-4">
            <input 
              type="number" 
              value={score}
              onChange={(e) => setScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-20 h-10 text-center text-xl font-bold text-[#C41E3A] border-2 border-[#C41E3A]/30 rounded-lg focus:border-[#C41E3A] outline-none"
            />
            <div className="flex gap-2">
              {quickScores.map(s => (
                <button 
                  key={s}
                  onClick={() => setScore(s)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm transition-all",
                    score === s 
                      ? "bg-[#C41E3A] text-white" 
                      : "bg-[#F2EFEA] text-[#666666] hover:bg-[#E8E3DB]"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 评语模板 */}
        <div>
          <label className="text-sm font-medium text-[#2C2C2C] mb-2 block">快捷评语</label>
          <div className="flex gap-2 flex-wrap">
            {commentTemplates.map(t => (
              <button 
                key={t.id}
                onClick={() => applyTemplate(t.text)}
                className="px-3 py-1 rounded-full text-xs bg-[#F2EFEA] text-[#666666] hover:bg-[#C41E3A]/10 hover:text-[#C41E3A] transition-all"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 评语输入 */}
        <div>
          <label className="text-sm font-medium text-[#2C2C2C] mb-2 block">教师评语</label>
          <textarea 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="请输入评语..."
            className="w-full h-24 p-3 text-sm border border-[#E8E3DB] rounded-lg resize-none focus:border-[#C41E3A] outline-none"
          />
        </div>

        {/* 修改建议 */}
        <div>
          <label className="text-sm font-medium text-[#2C2C2C] mb-2 block">修改建议（选中作业文字可快速添加）</label>
          <div className="space-y-2 mb-2">
            {suggestions.map((s, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg text-sm text-red-700">
                <span className="flex-1">{s}</span>
                <button onClick={() => removeSuggestion(idx)} className="text-red-400 hover:text-red-600">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text"
              value={newSuggestion}
              onChange={(e) => setNewSuggestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSuggestion()}
              placeholder="输入修改建议..."
              className="flex-1 h-9 px-3 text-sm border border-[#E8E3DB] rounded-lg focus:border-[#C41E3A] outline-none"
            />
            <button 
              onClick={addSuggestion}
              className="px-3 h-9 bg-[#F2EFEA] text-[#666666] rounded-lg text-sm hover:bg-[#E8E3DB]"
            >
              添加
            </button>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-2">
          <button 
            onClick={() => onSubmit({ score, comment, suggestions, status: 'returned' })}
            className="flex-1 h-11 border-2 border-[#C41E3A] text-[#C41E3A] rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            退回修改
          </button>
          <button 
            onClick={() => onSubmit({ score, comment, suggestions, status: 'graded' })}
            className="flex-1 h-11 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            提交批改
          </button>
        </div>
      </div>

      {/* 图片预览 */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <div className="w-full h-full flex items-center justify-center p-8">
            <div className="bg-[#F2EFEA] rounded-lg w-64 h-64 flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-[#999999]" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 主组件内容
function WorkReviewPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get('courseId') || '1'
  
  const [isLoading, setIsLoading] = useState(true)
  const [submissions, setSubmissions] = useState<typeof mockSubmissions>([])
  const [selectedWork, setSelectedWork] = useState<typeof mockSubmissions[0] | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all')
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // 模拟加载
    setTimeout(() => {
      setSubmissions(mockSubmissions)
      setIsLoading(false)
    }, 500)
  }, [])

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'all') return true
    return s.status === filter
  })

  const pendingCount = submissions.filter(s => s.status === 'pending').length

  const handleReview = (data: { score: number; comment: string; suggestions: string[]; status: 'graded' | 'returned' }) => {
    if (!selectedWork) return
    // TODO: 调用API courseApi.reviewWork(selectedWork.id, data)
    setSubmissions(submissions.map(s => 
      s.id === selectedWork.id ? { ...s, status: data.status } : s
    ))
    setSelectedWork(null)
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  if (isLoading) return <ReviewSkeleton />

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 导航栏 */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1">
              <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
            </button>
            <span className="font-medium text-[#2C2C2C]">作业批改</span>
          </div>
          <button 
            onClick={() => setBatchMode(!batchMode)}
            className={cn(
              "px-3 py-1 rounded-full text-sm",
              batchMode ? "bg-[#C41E3A] text-white" : "bg-[#F2EFEA] text-[#666666]"
            )}
          >
            {batchMode ? '取消批量' : '批量批改'}
          </button>
        </div>
      </div>

      {/* 统计和筛选 */}
      <div className="px-4 py-3 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-[#999999]" />
              <span className="text-sm text-[#666666]">共 {submissions.length} 份作业</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-600">{pendingCount} 份待批改</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'graded'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm transition-all",
                filter === f 
                  ? "bg-[#C41E3A] text-white" 
                  : "bg-[#F2EFEA] text-[#666666]"
              )}
            >
              {f === 'all' ? '全部' : f === 'pending' ? '待批改' : '已批改'}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {selectedWork ? (
          <ReviewPanel 
            work={selectedWork} 
            onSubmit={handleReview}
            onClose={() => setSelectedWork(null)}
          />
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-[#F2EFEA] flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-[#999999]" />
                </div>
                <p className="text-[#999999]">暂无作业</p>
              </div>
            ) : (
              filteredSubmissions.map(work => (
                <div key={work.id} className="relative">
                  {batchMode && (
                    <button
                      onClick={() => toggleSelect(work.id)}
                      className={cn(
                        "absolute -left-2 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10",
                        selectedIds.has(work.id) 
                          ? "bg-[#C41E3A] border-[#C41E3A]" 
                          : "bg-white border-[#E8E3DB]"
                      )}
                    >
                      {selectedIds.has(work.id) && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </button>
                  )}
                  <WorkItem 
                    work={work}
                    isSelected={selectedWork?.id === work.id}
                    onSelect={() => !batchMode && work.status === 'pending' && setSelectedWork(work)}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 批量操作栏 */}
      {batchMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 safe-area-bottom">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#666666]">已选 {selectedIds.size} 份</span>
            <button className="px-6 py-2 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white rounded-full text-sm font-medium">
              批量批改
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 导出
export default function WorkReviewPage() {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <WorkReviewPageContent />
    </Suspense>
  )
}
