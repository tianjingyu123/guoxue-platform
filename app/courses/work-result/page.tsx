"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Image as ImageIcon, X, ZoomIn, RefreshCw, FileText, Star, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { courseApi, type WorkResult } from "@/lib/api"

// 骨架屏
function ResultSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E8E3DB]">
        <div className="h-14 px-4 flex items-center">
          <div className="w-8 h-8 bg-[#E8E3DB] rounded-full animate-pulse" />
          <div className="flex-1 mx-4 h-5 bg-[#E8E3DB] rounded animate-pulse" />
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="h-32 bg-white rounded-xl animate-pulse" />
        <div className="h-48 bg-white rounded-xl animate-pulse" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

// 图片预览弹窗
function ImagePreview({ 
  images, 
  currentIndex, 
  onClose, 
  onPrev, 
  onNext 
}: { 
  images: string[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button 
        className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
        onClick={onClose}
      >
        <X className="w-6 h-6 text-white" />
      </button>
      
      <img 
        src={images[currentIndex]} 
        alt="" 
        className="max-w-[90vw] max-h-[80vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      
      {images.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center rotate-180"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  )
}

// 主组件内容
function WorkResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workId = searchParams.get("id") || "1"
  
  const [work, setWork] = useState<WorkResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  
  // Mock数据
  const mockWork: WorkResult = {
    id: workId,
    chapterId: "ch1",
    chapterTitle: "第一章：八字基础入门",
    courseId: "1",
    courseTitle: "八字命理入门精讲",
    content: "通过本章学习，我对八字命理有了初步的认识。八字由年柱、月柱、日柱、时柱组成，每柱包含一个天干和一个地支。天干有甲、乙、丙、丁、戊、己、庚、辛、壬、癸十个，地支有子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥十二个。\n\n八字的排列遵循一定的规则，首先要确定出生的年、月、日、时，然后根据万年历查出对应的干支。日主是命主本人，通过分析日主与其他七字的关系，可以推断命主的性格、运势等。",
    images: [
      "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop",
    ],
    submittedAt: "2024-01-15 14:30",
    status: "graded",
    score: 85,
    maxScore: 100,
    teacherComment: "作业完成得很好！对八字的基本概念理解准确，举例也很恰当。建议在后续学习中多练习排盘，加深对天干地支的记忆。",
    suggestions: [
      "建议补充五行生克关系的说明",
      "可以尝试分析自己的八字加深理解",
    ],
    gradedAt: "2024-01-16 09:15",
    gradedBy: {
      id: "t1",
      name: "周易大师",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=teacher1",
    },
    canResubmit: true,
  }
  
  useEffect(() => {
    const loadWork = async () => {
      setIsLoading(true)
      try {
        // const data = await courseApi.getWorkDetail(workId)
        // setWork(data)
        await new Promise(resolve => setTimeout(resolve, 500))
        setWork(mockWork)
      } catch {
        setWork(mockWork)
      } finally {
        setIsLoading(false)
      }
    }
    loadWork()
  }, [workId])
  
  const handleResubmit = () => {
    router.push(`/courses/work-submit?chapterId=${work?.chapterId}`)
  }
  
  const getStatusInfo = (status: WorkResult['status']) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, text: '批改中', color: 'text-orange-500', bg: 'bg-orange-50' }
      case 'graded':
        return { icon: CheckCircle, text: '已批改', color: 'text-green-600', bg: 'bg-green-50' }
      case 'returned':
        return { icon: AlertCircle, text: '已退回', color: 'text-red-500', bg: 'bg-red-50' }
    }
  }
  
  const getScoreColor = (score: number, max: number) => {
    const percent = score / max
    if (percent >= 0.9) return 'text-green-600'
    if (percent >= 0.7) return 'text-blue-600'
    if (percent >= 0.6) return 'text-orange-500'
    return 'text-red-500'
  }
  
  if (isLoading) {
    return <ResultSkeleton />
  }
  
  if (!work) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <FileText className="w-16 h-16 text-[#999] mb-4" />
        <p className="text-[#666]">作业不存在</p>
        <button 
          onClick={() => router.back()}
          className="mt-4 px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
        >
          返回
        </button>
      </div>
    )
  }
  
  const statusInfo = getStatusInfo(work.status)
  const StatusIcon = statusInfo.icon
  
  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E8E3DB]">
        <div className="h-14 px-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="text-base font-semibold text-[#2C2C2C]">作业批改结果</h1>
          <div className="w-8" />
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* 状态卡片 */}
        <div className={cn("rounded-xl p-4", statusInfo.bg)}>
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", 
              work.status === 'graded' ? 'bg-green-100' : work.status === 'pending' ? 'bg-orange-100' : 'bg-red-100'
            )}>
              <StatusIcon className={cn("w-6 h-6", statusInfo.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-lg font-semibold", statusInfo.color)}>{statusInfo.text}</span>
                {work.status === 'graded' && work.score !== undefined && (
                  <span className={cn("text-2xl font-bold", getScoreColor(work.score, work.maxScore))}>
                    {work.score}<span className="text-sm font-normal text-[#999]">/{work.maxScore}分</span>
                  </span>
                )}
              </div>
              <p className="text-sm text-[#666] mt-1">{work.courseTitle} · {work.chapterTitle}</p>
            </div>
          </div>
          
          {work.status === 'pending' && (
            <div className="mt-4 p-3 bg-white/60 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                <span className="text-sm text-orange-600">教师正在批改中，请耐心等待...</span>
              </div>
            </div>
          )}
        </div>
        
        {/* 批改结果（仅已批改显示） */}
        {work.status === 'graded' && work.gradedBy && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#E8E3DB] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#C41E3A]" />
              <span className="font-medium text-[#2C2C2C]">教师评语</span>
            </div>
            <div className="p-4">
              {/* 教师信息 */}
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={work.gradedBy.avatar} 
                  alt={work.gradedBy.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-[#2C2C2C]">{work.gradedBy.name}</p>
                  <p className="text-xs text-[#999]">批改于 {work.gradedAt}</p>
                </div>
              </div>
              
              {/* 评语内容 */}
              <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">
                {work.teacherComment}
              </p>
              
              {/* 修改建议 */}
              {work.suggestions && work.suggestions.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-xs font-medium text-red-600 mb-2">修改建议：</p>
                  <ul className="space-y-1">
                    {work.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 我的提交 */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[#E8E3DB] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C9A96E]" />
              <span className="font-medium text-[#2C2C2C]">我的提交</span>
            </div>
            <span className="text-xs text-[#999]">{work.submittedAt}</span>
          </div>
          <div className="p-4">
            {/* 文字内容 */}
            <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">
              {work.content}
            </p>
            
            {/* 图片 */}
            {work.images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {work.images.map((img, index) => (
                  <div 
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden bg-[#F5F0E8] relative group cursor-pointer"
                    onClick={() => setPreviewIndex(index)}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-active:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* 评分详情（如果有） */}
        {work.status === 'graded' && work.score !== undefined && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#E8E3DB] flex items-center gap-2">
              <Star className="w-4 h-4 text-[#C9A96E]" />
              <span className="font-medium text-[#2C2C2C]">评分详情</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  <div className={cn("text-5xl font-bold", getScoreColor(work.score, work.maxScore))}>
                    {work.score}
                  </div>
                  <div className="text-sm text-[#999] mt-1">满分 {work.maxScore} 分</div>
                </div>
              </div>
              
              {/* 评分进度条 */}
              <div className="mt-2">
                <div className="h-2 bg-[#E8E3DB] rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      work.score / work.maxScore >= 0.9 ? 'bg-green-500' :
                      work.score / work.maxScore >= 0.7 ? 'bg-blue-500' :
                      work.score / work.maxScore >= 0.6 ? 'bg-orange-500' : 'bg-red-500'
                    )}
                    style={{ width: `${(work.score / work.maxScore) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-[#999]">
                  <span>0</span>
                  <span>60及格</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 底部操作栏 */}
      {work.canResubmit && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 pb-safe">
          <button
            onClick={handleResubmit}
            className="w-full py-3 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white text-base font-semibold rounded-full flex items-center justify-center gap-2 shadow-lg"
          >
            <RefreshCw className="w-5 h-5" />
            重新提交
          </button>
        </div>
      )}
      
      {/* 图片预览 */}
      {previewIndex !== null && (
        <ImagePreview
          images={work.images}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onPrev={() => setPreviewIndex(prev => prev !== null ? (prev - 1 + work.images.length) % work.images.length : 0)}
          onNext={() => setPreviewIndex(prev => prev !== null ? (prev + 1) % work.images.length : 0)}
        />
      )}
    </div>
  )
}

// 导出页面
export default function WorkResultPage() {
  return (
    <Suspense fallback={<ResultSkeleton />}>
      <WorkResultContent />
    </Suspense>
  )
}
