"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ImagePlus, X, Camera, Image as ImageIcon, Send, FileText, Clock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { courseApi, uploadApi, type WorkRequirement } from "@/lib/api"

// 骨架屏
function WorkSubmitSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-12 bg-white border-b border-[#E8E3DB]" />
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-[#E8E3DB] rounded w-1/2" />
          <div className="h-4 bg-[#E8E3DB] rounded w-full" />
          <div className="h-4 bg-[#E8E3DB] rounded w-3/4" />
        </div>
        <div className="animate-pulse h-40 bg-[#E8E3DB] rounded-xl" />
        <div className="animate-pulse h-24 bg-[#E8E3DB] rounded-xl" />
      </div>
    </div>
  )
}

// 主组件内容
function WorkSubmitContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chapterId = searchParams.get("chapterId") || "1"
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [requirement, setRequirement] = useState<WorkRequirement | null>(null)
  const [content, setContent] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 模拟数据
  const mockRequirement: WorkRequirement = {
    id: "1",
    title: "八字命理基础练习",
    description: "请根据本章节所学内容，分析以下八字命盘的五行分布，并写出你的解读思路。要求：\n1. 分析命盘五行强弱\n2. 找出命主的喜用神\n3. 简要分析命主性格特点\n\n提示：可以参考课程中的案例分析方法，结合自己的理解进行作答。",
    chapterTitle: "第三章：五行生克与喜用神",
    courseTitle: "八字命理入门精讲",
    deadline: "2024-12-31 23:59",
    maxImages: 9,
    minWords: 100,
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        // const data = await courseApi.getWorkRequirement(chapterId)
        // setRequirement(data)
        setRequirement(mockRequirement)
      } catch (error) {
        console.error("Failed to load work requirement:", error)
        setRequirement(mockRequirement)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [chapterId])

  // 处理图片选择
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    const maxImages = requirement?.maxImages || 9
    const remainingSlots = maxImages - images.length
    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    
    if (filesToUpload.length === 0) {
      toast.error(`最多上传${maxImages}张图片`)
      return
    }

    setUploading(true)
    try {
      // 模拟上传，实际调用 uploadApi.images(filesToUpload)
      // const result = await uploadApi.images(filesToUpload)
      // setImages(prev => [...prev, ...result.urls])
      
      // 模拟：生成本地预览URL
      const newUrls = filesToUpload.map(file => URL.createObjectURL(file))
      setImages(prev => [...prev, ...newUrls])
    } catch (error) {
      console.error("Upload failed:", error)
      toast.error("图片上传失败，请重试")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // 删除图片
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  // 提交作业
  const handleSubmit = async () => {
    if (!requirement) return
    
    // 校验
    if (content.length < requirement.minWords) {
      toast.error(`作业内容至少需要${requirement.minWords}字`)
      return
    }

    setSubmitting(true)
    try {
      await courseApi.submitWork(chapterId, content, images)
      toast.success("作业提交成功！")
      router.back()
    } catch (error) {
      console.error("Submit failed:", error)
      toast.error("提交失败，请重试")
    } finally {
      setSubmitting(false)
    }
  }

  const wordCount = content.length
  const canSubmit = requirement && wordCount >= requirement.minWords && !submitting

  if (isLoading) {
    return <WorkSubmitSkeleton />
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="text-base font-semibold text-[#2C2C2C]">提交作业</h1>
          <div className="w-6" />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 作业信息卡片 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E8E3DB]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#C41E3A]/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-[#C41E3A]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold text-[#2C2C2C] mb-1">
                {requirement?.title}
              </h2>
              <p className="text-[12px] text-[#999999] mb-2">
                {requirement?.courseTitle} · {requirement?.chapterTitle}
              </p>
              {requirement?.deadline && (
                <div className="flex items-center gap-1 text-[12px] text-[#FF6B35]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>截止时间：{requirement.deadline}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 作业要求 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E8E3DB]">
          <h3 className="text-[14px] font-semibold text-[#2C2C2C] mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-[#C9A96E]" />
            作业要求
          </h3>
          <p className="text-[13px] text-[#666666] leading-relaxed whitespace-pre-line">
            {requirement?.description}
          </p>
        </div>

        {/* 文字输入区 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E8E3DB] overflow-hidden">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请在此输入你的作业内容..."
            className="w-full h-48 p-4 text-[14px] text-[#2C2C2C] placeholder:text-[#CCCCCC] resize-none focus:outline-none bg-transparent"
          />
          <div className="px-4 py-2 border-t border-[#E8E3DB] flex items-center justify-between">
            <span className={cn(
              "text-[12px]",
              wordCount < (requirement?.minWords || 100) ? "text-[#FF6B35]" : "text-[#999999]"
            )}>
              {wordCount}/{requirement?.minWords || 100}字（最少）
            </span>
          </div>
        </div>

        {/* 图片上传区 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E8E3DB]">
          <h3 className="text-[14px] font-semibold text-[#2C2C2C] mb-3 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-[#C9A96E]" />
            添加图片
            <span className="text-[12px] font-normal text-[#999999]">
              （{images.length}/{requirement?.maxImages || 9}）
            </span>
          </h3>
          
          <div className="grid grid-cols-3 gap-2">
            {/* 已上传图片 */}
            {images.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-[#F5F0E8]">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            
            {/* 添加图片按钮 */}
            {images.length < (requirement?.maxImages || 9) && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg border-2 border-dashed border-[#E8E3DB] flex flex-col items-center justify-center gap-1 hover:border-[#C41E3A] hover:bg-[#C41E3A]/5 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-[#C41E3A] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-[#999999]" />
                    <span className="text-[10px] text-[#999999]">添加图片</span>
                  </>
                )}
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* 底部提交按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 pb-safe">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "w-full h-12 rounded-full flex items-center justify-center gap-2 text-[15px] font-semibold transition-all",
            canSubmit
              ? "bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white shadow-lg"
              : "bg-[#E8E3DB] text-[#999999]"
          )}
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              提交中...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              提交作业
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// 导出组件
export default function WorkSubmitPage() {
  return (
    <Suspense fallback={<WorkSubmitSkeleton />}>
      <WorkSubmitContent />
    </Suspense>
  )
}
