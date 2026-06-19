"use client"

import { useState, Suspense, useRef } from "react"
import { BackButton } from "@/components/common/back-button"
import { Camera, CheckCircle, X, FileText, User, MessageSquare, Loader2, ImagePlus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { submitReport, getReportTypeLabel } from "@/lib/api/report"
import type { ReportType, ReportTargetType } from "@/lib/types/report"

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

// 举报类型
const reportTypes: { id: ReportType; label: string; description: string }[] = [
  { id: "inappropriate", label: "违规内容", description: "违反平台规定或法律法规的内容" },
  { id: "pornography", label: "色情低俗", description: "包含色情、低俗或不雅内容" },
  { id: "spam", label: "垃圾广告", description: "发布垃圾信息或恶意推广广告" },
  { id: "inducement", label: "诱导分享", description: "诱导用户分享、关注或点击" },
  { id: "copyright", label: "侵权内容", description: "侵犯他人知识产权或原创内容" },
  { id: "harassment", label: "骚扰辱骂", description: "对他人进行骚扰、辱骂或人身攻击" },
  { id: "fraud", label: "欺诈行为", description: "存在欺诈、诈骗或虚假宣传" },
  { id: "other", label: "其他问题", description: "其他需要举报的违规行为" },
]

// 模拟被举报对象数据
const reportTargets = {
  post: {
    type: "post",
    title: "这篇文章存在问题内容...",
    content: "这里是被举报内容的摘要片段，可能包含违规信息...",
    author: "某用户",
    avatar: "",
    time: "2小时前",
  },
  user: {
    type: "user",
    name: "某用户",
    avatar: "",
    description: "这是一个可能存在问题的用户账号",
  },
  comment: {
    type: "comment",
    content: "这是一条可能违规的评论内容...",
    author: "评论者",
    avatar: "",
    time: "1小时前",
  },
}

function ReportPageContent() {
  const searchParams = useSearchParams()
  const targetType = (searchParams.get("type") || searchParams.get("targetType") || "post") as ReportTargetType
  const targetId = Number(searchParams.get("targetId") || 0)
  const targetTitle = searchParams.get("targetTitle") || ""
  const target = reportTargets[targetType as keyof typeof reportTargets] || reportTargets.post

  const [selectedType, setSelectedType] = useState<ReportType | null>(null)
  const [reason, setReason] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: string[] = []
    const maxImages = 4 - images.length

    Array.from(files).slice(0, maxImages).forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        newImages.push(url)
      }
    })

    setImages(prev => [...prev, ...newImages])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.error('请选择举报类型')
      return
    }
    
    setIsSubmitting(true)
    try {
      const response = await submitReport({
        targetType,
        targetId,
        reportType: selectedType,
        reason: reason.trim() || getReportTypeLabel(selectedType),
        evidence: images.length > 0 ? images : undefined,
      })

      if (response.code === 200) {
        setShowSuccess(true)
      } else {
        toast.error(response.message || '提交失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = selectedType && (selectedType !== "other" || reason.trim().length > 0)

  // 成功提示弹窗
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">举报已提交</h2>
          <p className="text-sm text-muted-foreground mb-6">
            感谢你的举报，我们将在24小时内核实处理。如有需要，我们会通过站内信与你联系。
          </p>
          <Link 
            href="/"
            className="inline-flex items-center justify-center w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            返回首页
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <BackButton />
          <h1 className="font-semibold text-base text-foreground">举报</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 pb-24 space-y-6">
        {/* 举报对象摘要区 */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">举报对象</h2>
          <Card className="p-4 bg-secondary/30">
            {target.type === "user" ? (
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={target.avatar} alt={target.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{target.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">用户</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{target.description}</p>
                </div>
              </div>
            ) : target.type === "comment" ? (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{target.author}</span>
                    <span className="text-xs text-muted-foreground">{target.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{target.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {target.author?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{target.author}</span>
                    <span className="text-xs text-muted-foreground">{target.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{target.content}</p>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* 举报类型选择区 */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            举报类型 <span className="text-primary">*</span>
          </h2>
          <div className="space-y-2">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                  selectedType === type.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className="text-left">
                  <p className="font-medium text-sm text-foreground">{type.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  selectedType === type.id
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {selectedType === type.id && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 理由描述区 */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            详细说明 {selectedType === "other" && <span className="text-primary">*</span>}
          </h2>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请详细描述举报理由，便于我们快速处理"
            className="w-full h-32 p-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {reason.length}/500
          </p>
        </section>

        {/* 图片/截图上传区 */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            上传截图 <span className="text-xs text-muted-foreground/70">(可选，最多4张)</span>
          </h2>
          <div className="flex gap-3 flex-wrap">
            {images.map((img, index) => (
              <div key={index} className="relative w-20 h-20">
                <img
                  src={img}
                  alt={`截图${index + 1}`}
                  className="w-full h-full rounded-lg object-cover"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
              >
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">添加图片</span>
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
          <p className="text-xs text-muted-foreground mt-2">
            支持 JPG、PNG 格式，建议上传清晰的违规截图
          </p>
        </section>

        {/* 提示说明 */}
        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-accent font-medium">温馨提示：</span>
            请如实填写举报信息，恶意举报将影响你的信誉分。我们将在24小时内处理你的举报，处理结果会通过站内信通知。
          </p>
        </div>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="max-w-lg mx-auto p-4">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className={cn(
              "w-full h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
              canSubmit && !isSubmitting
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                提交中...
              </>
            ) : (
              "提交举报"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReportPageContent />
    </Suspense>
  )
}
