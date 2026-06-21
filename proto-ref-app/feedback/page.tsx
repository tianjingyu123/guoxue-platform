"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Camera, X, Check, Clock, MessageCircle,
  Bug, Lightbulb, HelpCircle, AlertTriangle, ChevronRight
} from "lucide-react"

// 反馈类型
const feedbackTypes = [
  { id: "bug", label: "问题反馈", icon: Bug, color: "text-red-500", bgColor: "bg-red-500/10" },
  { id: "suggestion", label: "功能建议", icon: Lightbulb, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { id: "complaint", label: "投诉举报", icon: AlertTriangle, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { id: "other", label: "其他问题", icon: HelpCircle, color: "text-blue-500", bgColor: "bg-blue-500/10" },
]

// 历史反馈
const historyFeedbacks = [
  { 
    id: 1, 
    type: "bug", 
    title: "课程视频播放卡顿", 
    content: "在观看八字入门课程时，视频经常卡顿...",
    time: "2024-03-15",
    status: "resolved",
    reply: "感谢您的反馈，我们已优化视频服务器，请您再试试。"
  },
  { 
    id: 2, 
    type: "suggestion", 
    title: "建议增加离线下载功能", 
    content: "希望能支持课程视频离线下载...",
    time: "2024-03-10",
    status: "processing",
    reply: null
  },
  { 
    id: 3, 
    type: "other", 
    title: "如何申请成为讲师", 
    content: "想了解成为平台讲师的条件...",
    time: "2024-02-28",
    status: "resolved",
    reply: "您好，您可以在研究院页面查看讲师申请条件和流程。"
  },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "bg-amber-500/10 text-amber-600" },
  processing: { label: "处理中", color: "bg-blue-500/10 text-blue-600" },
  resolved: { label: "已解决", color: "bg-green-500/10 text-green-600" },
}

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit")
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [contact, setContact] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!selectedType || !content.trim()) return
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
    }, 1500)
  }

  const resetForm = () => {
    setSelectedType(null)
    setContent("")
    setContact("")
    setImages([])
    setSubmitted(false)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-medium">意见反馈</span>
          </div>
        </div>
      </header>

      {/* Tab切换 */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("submit")}
          className={cn(
            "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "submit"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent"
          )}
        >
          提交反馈
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "history"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent"
          )}
        >
          我的反馈
        </button>
      </div>

      {/* 提交反馈 */}
      {activeTab === "submit" && (
        <div className="px-4 py-4">
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">提交成功</h3>
              <p className="text-sm text-muted-foreground mb-6">
                感谢您的反馈，我们会尽快处理
              </p>
              <Button onClick={resetForm}>继续反馈</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 反馈类型 */}
              <div>
                <p className="text-sm font-medium mb-2">反馈类型</p>
                <div className="grid grid-cols-2 gap-2">
                  {feedbackTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border-2 transition-all",
                        selectedType === type.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", type.bgColor)}>
                        <type.icon className={cn("w-4 h-4", type.color)} />
                      </div>
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 反馈内容 */}
              <div>
                <p className="text-sm font-medium mb-2">详细描述 <span className="text-red-500">*</span></p>
                <Textarea
                  placeholder="请详细描述您遇到的问题或建议，我们会认真处理每一条反馈..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{content.length}/500</p>
              </div>

              {/* 上传图片 */}
              <div>
                <p className="text-sm font-medium mb-2">上传截图（选填）</p>
                <div className="flex gap-2 flex-wrap">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length < 4 && (
                    <button className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-muted-foreground/50 transition-colors">
                      <Camera className="w-5 h-5" />
                      <span className="text-[10px]">添加图片</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">最多上传4张图片</p>
              </div>

              {/* 联系方式 */}
              <div>
                <p className="text-sm font-medium mb-2">联系方式（选填）</p>
                <Input
                  placeholder="手机号或邮箱，方便我们与您联系"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>

              {/* 提交按钮 */}
              <Button
                className="w-full"
                disabled={!selectedType || !content.trim() || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "提交中..." : "提交反馈"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 历史反馈 */}
      {activeTab === "history" && (
        <div className="px-4 py-4 space-y-3">
          {historyFeedbacks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无反馈记录</p>
            </div>
          ) : (
            historyFeedbacks.map((item) => {
              const type = feedbackTypes.find(t => t.id === item.type)
              const status = statusConfig[item.status]
              return (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", type?.bgColor)}>
                      {type && <type.icon className={cn("w-5 h-5", type.color)} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{item.title}</p>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">{item.time}</p>
                      
                      {/* 回复 */}
                      {item.reply && (
                        <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                          <p className="text-xs text-primary font-medium mb-1">官方回复</p>
                          <p className="text-xs text-muted-foreground">{item.reply}</p>
                        </div>
                      )}
                      
                      {item.status === "processing" && (
                        <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">
                          <Clock className="w-3 h-3" />
                          <span>工作人员正在处理中，请耐心等待</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
