"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronRight, Upload, X, Clock, AlertCircle, CheckCircle, FileText, Image as ImageIcon, Loader2 } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 可申诉订单数据
const appealableOrders = [
  { id: "20240115001", title: "《渊海子平》精装典藏版", price: 168, image: "", time: "2024-01-15 14:30", status: "已完成" },
  { id: "20240112003", title: "八字命理入门课程", price: 299, image: "", time: "2024-01-12 09:15", status: "已完成" },
  { id: "20240108002", title: "开运水晶手串", price: 388, image: "", time: "2024-01-08 16:45", status: "已完成" },
]

// 申诉类型
const appealTypes = [
  { id: "not_received", label: "未收到货", desc: "付款后长时间未收到商品" },
  { id: "wrong_item", label: "货不对版", desc: "收到的商品与描述不符" },
  { id: "quality_issue", label: "质量问题", desc: "商品存在质量缺陷" },
  { id: "false_ad", label: "虚假宣传", desc: "商品宣传与实际不符" },
  { id: "other", label: "其他问题", desc: "其他交易相关问题" },
]

// 申诉状态时间线
const appealTimeline = [
  { status: "submitted", label: "申诉已提交", time: "2024-01-20 10:30", completed: true },
  { status: "reviewing", label: "平台审核中", time: "预计1-3个工作日", completed: true, current: true },
  { status: "processing", label: "平台介入处理", time: "", completed: false },
  { status: "completed", label: "处理完成", time: "", completed: false },
]

export default function AppealPage() {
  const [step, setStep] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [appealId, setAppealId] = useState("")

  const handleImageUpload = () => {
    if (images.length < 5) {
      setImages([...images, `img_${Date.now()}`])
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!selectedOrder || !selectedType || !reason.trim()) return
    
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setAppealId(`AP${Date.now().toString().slice(-10)}`)
      setIsSubmitted(true)
    }, 1500)
  }

  const canProceedStep2 = selectedOrder !== null
  const canProceedStep3 = selectedType !== null
  const canSubmit = reason.trim().length >= 10

  // 已提交状态 - 显示申诉进度
  if (isSubmitted) {
    const selectedOrderData = appealableOrders.find(o => o.id === selectedOrder)
    const selectedTypeData = appealTypes.find(t => t.id === selectedType)
    
    return (
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton fallbackPath="/orders" />
  <h1 className="font-semibold text-base text-foreground">申诉详情</h1>
            <div className="w-9" />
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* 申诉成功卡片 */}
          <Card className="p-6 text-center bg-gradient-to-br from-accent/10 to-primary/5">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-lg font-bold text-foreground">申诉已提交</h2>
            <p className="text-sm text-muted-foreground mt-1">申诉编号：{appealId}</p>
          </Card>

          {/* 申诉状态进度 */}
          <Card className="p-4">
            <h3 className="font-medium text-sm text-foreground mb-4">处理进度</h3>
            <div className="space-y-0">
              {appealTimeline.map((item, index) => (
                <div key={item.status} className="flex gap-3">
                  {/* 时间线 */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                      item.completed 
                        ? item.current ? "bg-primary" : "bg-accent" 
                        : "bg-secondary"
                    )}>
                      {item.completed ? (
                        item.current ? (
                          <Clock className="w-3 h-3 text-primary-foreground" />
                        ) : (
                          <Check className="w-3 h-3 text-white" />
                        )
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    {index < appealTimeline.length - 1 && (
                      <div className={cn(
                        "w-0.5 h-12 my-1",
                        item.completed ? "bg-accent" : "bg-border"
                      )} />
                    )}
                  </div>
                  {/* 内容 */}
                  <div className="pb-6">
                    <p className={cn(
                      "font-medium text-sm",
                      item.completed ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {item.label}
                    </p>
                    {item.time && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 申诉内容摘要 */}
          <Card className="p-4">
            <h3 className="font-medium text-sm text-foreground mb-3">申诉内容</h3>
            
            {/* 订单信息 */}
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg mb-3">
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-1">{selectedOrderData?.title}</p>
                <p className="text-xs text-muted-foreground">订单号：{selectedOrder}</p>
              </div>
            </div>

            {/* 申诉类型 */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">申诉类型</span>
                <span className="text-foreground">{selectedTypeData?.label}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground">申诉理由</span>
                <p className="text-foreground mt-1">{reason}</p>
              </div>
              {images.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground">上传凭证</span>
                  <div className="flex gap-2 mt-2">
                    {images.map((_, index) => (
                      <div key={index} className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 温馨提示 */}
          <Card className="p-4 bg-secondary/30">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>1. 平台将在1-3个工作日内完成审核</p>
                <p>2. 处理结果将通过消息通知推送给您</p>
                <p>3. 如有疑问，可联系在线客服</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton fallbackPath="/orders" />
  <h1 className="font-semibold text-base text-foreground">交易申诉</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 步骤指示器 */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= s 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground"
              )}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={cn(
                  "w-20 h-1 mx-2",
                  step > s ? "bg-primary" : "bg-secondary"
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>选择订单</span>
          <span>申诉类型</span>
          <span>填写详情</span>
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="px-4">
        {/* 步骤1：选择订单 */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">请选择需要申诉的订单</p>
            {appealableOrders.map((order) => (
              <Card
                key={order.id}
                className={cn(
                  "p-4 cursor-pointer transition-all",
                  selectedOrder === order.id 
                    ? "ring-2 ring-primary bg-primary/5" 
                    : "hover:bg-secondary/50"
                )}
                onClick={() => setSelectedOrder(order.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground line-clamp-1">{order.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">订单号：{order.id}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-primary font-medium">¥{order.price}</span>
                      <Badge variant="secondary" className="text-[10px]">{order.status}</Badge>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    selectedOrder === order.id 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground/30"
                  )}>
                    {selectedOrder === order.id && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 步骤2：选择申诉类型 */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">请选择申诉类型</p>
            {appealTypes.map((type) => (
              <Card
                key={type.id}
                className={cn(
                  "p-4 cursor-pointer transition-all",
                  selectedType === type.id 
                    ? "ring-2 ring-primary bg-primary/5" 
                    : "hover:bg-secondary/50"
                )}
                onClick={() => setSelectedType(type.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-foreground">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.desc}</p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    selectedType === type.id 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground/30"
                  )}>
                    {selectedType === type.id && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 步骤3：填写申诉详情 */}
        {step === 3 && (
          <div className="space-y-4">
            {/* 申诉理由 */}
            <div>
              <label className="text-sm font-medium text-foreground">
                申诉理由 <span className="text-primary">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请详细描述问题，至少10个字..."
                className="w-full mt-2 p-3 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{reason.length}/500</p>
            </div>

            {/* 上传凭证 */}
            <div>
              <label className="text-sm font-medium text-foreground">上传凭证（选填，最多5张）</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((_, index) => (
                  <div key={index} className="relative w-20 h-20 rounded-lg bg-secondary flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-primary-foreground" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button
                    onClick={handleImageUpload}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">上传</span>
                  </button>
                )}
              </div>
            </div>

            {/* 温馨提示 */}
            <Card className="p-3 bg-secondary/30">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  请上传与申诉相关的凭证图片，如聊天记录、商品照片等，有助于加快处理速度。
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 safe-area-pb">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
            >
              上一步
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep2 : !canProceedStep3}
              className={cn(
                "flex-1 py-3 text-sm font-medium rounded-xl transition-colors",
                (step === 1 ? canProceedStep2 : canProceedStep3)
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={cn(
                "flex-1 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2",
                canSubmit && !isSubmitting
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  提交中...
                </>
              ) : (
                "提交申诉"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
