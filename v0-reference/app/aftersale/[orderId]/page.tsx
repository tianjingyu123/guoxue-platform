"use client"

import { useState } from "react"
import Link from "next/link"
import { Camera, X, Check, Clock, Package, Truck, CreditCard, ChevronRight, Copy, AlertCircle } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 订单商品数据
const orderProduct = {
  id: 1,
  name: "《渊海子平》精装典藏版",
  spec: "精装版·红色",
  price: 168,
  quantity: 1,
  image: "",
  maxRefund: 168,
}

// 售后类型
const aftersaleTypes = [
  { id: "refund_only", label: "仅退款", desc: "无需退货，直接退款", icon: CreditCard },
  { id: "return_refund", label: "退货退款", desc: "需寄回商品，收到后退款", icon: Package },
  { id: "exchange", label: "换货", desc: "商品有问题，申请换货", icon: Truck },
]

// 售后原因
const aftersaleReasons = [
  { id: "quality", label: "质量问题" },
  { id: "mismatch", label: "与描述不符" },
  { id: "wrong", label: "发错货" },
  { id: "unwanted", label: "不想要了" },
  { id: "damage", label: "商品破损" },
  { id: "other", label: "其他原因" },
]

// 售后进度步骤
const aftersaleSteps = [
  { id: 1, label: "提交申请", status: "completed", time: "2026-05-09 14:30" },
  { id: 2, label: "商家审核", status: "current", time: "" },
  { id: 3, label: "退货地址", status: "pending", time: "" },
  { id: 4, label: "用户寄回", status: "pending", time: "" },
  { id: 5, label: "商家收货", status: "pending", time: "" },
  { id: 6, label: "退款到账", status: "pending", time: "" },
]

export default function AftersalePage({ params }: { params: { orderId: string } }) {
  const [step, setStep] = useState<"form" | "success" | "tracking">("form")
  const [selectedType, setSelectedType] = useState("")
  const [selectedReason, setSelectedReason] = useState("")
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 模拟上传图片
  const handleAddImage = () => {
    if (images.length < 3) {
      setImages([...images, `image_${images.length + 1}`])
    }
  }

  // 删除图片
  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  // 提交申请
  const handleSubmit = async () => {
    if (!selectedType || !selectedReason) return
    setIsSubmitting(true)
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setStep("success")
  }

  // 申请表单
  if (step === "form") {
    return (
      <div className="min-h-screen bg-background pb-24">
        {/* 顶部导航 */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton fallbackPath="/orders" />
  <h1 className="font-semibold text-base text-foreground">申请售后</h1>
            <div className="w-9" />
          </div>
        </header>

        <div className="pt-14 p-4 space-y-4">
          {/* 商品信息 */}
          <Card className="p-3">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2">{orderProduct.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{orderProduct.spec}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-primary font-medium">¥{orderProduct.price}</span>
                  <span className="text-xs text-muted-foreground">x{orderProduct.quantity}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* 选择售后类型 */}
          <Card className="p-4">
            <h3 className="font-medium text-sm text-foreground mb-3">选择售后类型</h3>
            <div className="space-y-2">
              {aftersaleTypes.map(type => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                      selectedType === type.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      selectedType === type.id ? "bg-primary/10" : "bg-secondary"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        selectedType === type.id ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={cn(
                        "text-sm font-medium",
                        selectedType === type.id ? "text-primary" : "text-foreground"
                      )}>{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.desc}</p>
                    </div>
                    {selectedType === type.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          {/* 选择售后原因 */}
          <Card className="p-4">
            <h3 className="font-medium text-sm text-foreground mb-3">选择原因</h3>
            <div className="flex flex-wrap gap-2">
              {aftersaleReasons.map(reason => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm transition-all",
                    selectedReason === reason.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  )}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </Card>

          {/* 退款金额 */}
          {(selectedType === "refund_only" || selectedType === "return_refund") && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">可退金额</span>
                <span className="text-xl font-bold text-primary">¥{orderProduct.maxRefund.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                系统已自动计算可退金额（含商品金额，不含运费）
              </p>
            </Card>
          )}

          {/* 问题描述 */}
          <Card className="p-4">
            <h3 className="font-medium text-sm text-foreground mb-3">问题描述</h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请详细描述您遇到的问题，有助于我们更快处理"
              className="w-full h-24 px-3 py-2 text-sm bg-secondary rounded-xl border-0 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/200</p>
          </Card>

          {/* 上传凭证 */}
          <Card className="p-4">
            <h3 className="font-medium text-sm text-foreground mb-3">上传凭证（最多3张）</h3>
            <div className="flex gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative w-20 h-20 rounded-lg bg-secondary">
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <button
                  onClick={handleAddImage}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-muted-foreground/50 transition-colors"
                >
                  <Camera className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">上传</span>
                </button>
              )}
            </div>
          </Card>

          {/* 提示 */}
          <div className="flex items-start gap-2 px-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              提交申请后，商家将在24小时内审核。如审核通过，请按指引操作。
            </p>
          </div>
        </div>

        {/* 底部提交按钮 */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
          <div className="p-4">
            <button
              onClick={handleSubmit}
              disabled={!selectedType || !selectedReason || isSubmitting}
              className={cn(
                "w-full py-3.5 rounded-xl font-medium text-base transition-all",
                selectedType && selectedReason && !isSubmitting
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isSubmitting ? "提交中..." : "提交申请"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 提交成功
  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">申请已提交</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          商家将在24小时内处理您的申请<br />请留意消息通知
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => setStep("tracking")}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            查看进度
          </button>
          <Link
            href="/orders"
            className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-medium text-center"
          >
            返回订单
          </Link>
        </div>
      </div>
    )
  }

  // 售后进度跟踪
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton fallbackPath="/orders" />
  <h1 className="font-semibold text-base text-foreground">售后进度</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="pt-14 p-4 space-y-4">
        {/* 当前状态 */}
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 via-background to-background border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">商家审核中</h3>
              <p className="text-xs text-muted-foreground mt-0.5">预计24小时内处理完毕</p>
            </div>
          </div>
        </Card>

        {/* 进度时间轴 */}
        <Card className="p-4">
          <h3 className="font-medium text-sm text-foreground mb-4">处理进度</h3>
          <div className="relative">
            {aftersaleSteps.map((s, index) => (
              <div key={s.id} className="flex gap-3 pb-6 last:pb-0">
                {/* 时间轴线 */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                    s.status === "completed" ? "bg-green-500" :
                    s.status === "current" ? "bg-amber-500" : "bg-secondary"
                  )}>
                    {s.status === "completed" ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : s.status === "current" ? (
                      <Clock className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  {index < aftersaleSteps.length - 1 && (
                    <div className={cn(
                      "w-0.5 h-full min-h-[24px] mt-1",
                      s.status === "completed" ? "bg-green-500" : "bg-border"
                    )} />
                  )}
                </div>
                {/* 内容 */}
                <div className="flex-1 pt-0.5">
                  <p className={cn(
                    "text-sm font-medium",
                    s.status === "completed" ? "text-green-500" :
                    s.status === "current" ? "text-amber-500" : "text-muted-foreground"
                  )}>{s.label}</p>
                  {s.time && (
                    <p className="text-xs text-muted-foreground mt-0.5">{s.time}</p>
                  )}
                  {s.status === "current" && (
                    <p className="text-xs text-muted-foreground mt-0.5">处理中...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 退货地址（审核通过后显示） */}
        <Card className="p-4 opacity-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm text-foreground">退货地址</h3>
            <Badge variant="secondary" className="text-[10px]">待审核通过</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            商家审核通过后，将显示退货地址信息
          </p>
        </Card>

        {/* 申请信息 */}
        <Card className="p-4">
          <h3 className="font-medium text-sm text-foreground mb-3">申请信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">售后类型</span>
              <span className="text-foreground">退货退款</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">申请原因</span>
              <span className="text-foreground">质量问题</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">退款金额</span>
              <span className="text-primary font-medium">¥{orderProduct.maxRefund.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">申请时间</span>
              <span className="text-foreground">2026-05-09 14:30</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">售后单号</span>
              <div className="flex items-center gap-2">
                <span className="text-foreground">AS202605091430001</span>
                <button className="p-1 hover:bg-secondary rounded">
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* 商品信息 */}
        <Card className="p-3">
          <div className="flex gap-3">
            <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground line-clamp-1">{orderProduct.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{orderProduct.spec}</p>
              <p className="text-xs text-muted-foreground">x{orderProduct.quantity}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 底部操作 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex gap-3 p-4">
          <button className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-medium">
            撤销申请
          </button>
          <Link 
            href="/help"
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-center"
          >
            联系客服
          </Link>
        </div>
      </div>
    </div>
  )
}
