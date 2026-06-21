"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, ChevronRight, ShoppingBag, Play, Loader2 } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 模拟推荐数据
const recommendations = [
  { id: 1, type: "course", title: "六爻预测实战班", price: 299, originalPrice: 599, image: "", sales: 1280 },
  { id: 2, type: "product", title: "开光貔貅手链", price: 168, originalPrice: 268, image: "", sales: 856 },
  { id: 3, type: "course", title: "风水布局入门", price: 99, originalPrice: 199, image: "", sales: 2100 },
  { id: 4, type: "product", title: "紫檀木手串", price: 388, originalPrice: 588, image: "", sales: 432 },
]

// 加载状态
function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">正在加载...</p>
      </div>
    </div>
  )
}

// 主要内容组件
function PaymentResultContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get("status") || "success"
  const orderId = searchParams.get("orderId") || "RB20240315001234"
  const amount = searchParams.get("amount") || "299.00"
  const reason = searchParams.get("reason") || "余额不足"
  
  const isSuccess = status === "success"
  
  const [showContent, setShowContent] = useState(false)
  
  useEffect(() => {
    // 延迟显示内容，增加动画效果
    const timer = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <BackButton />
          <h1 className="font-semibold text-base text-foreground">
            {isSuccess ? "支付成功" : "支付失败"}
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-lg mx-auto pb-8">
        {/* 结果状态区 */}
        <div className={cn(
          "flex flex-col items-center py-10 px-6 transition-all duration-500",
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          {/* 状态图标 */}
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mb-4",
            isSuccess ? "bg-green-500/10" : "bg-destructive/10"
          )}>
            {isSuccess ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : (
              <XCircle className="w-12 h-12 text-destructive" />
            )}
          </div>
          
          {/* 状态标题 */}
          <h2 className={cn(
            "text-xl font-bold mb-2",
            isSuccess ? "text-green-500" : "text-destructive"
          )}>
            {isSuccess ? "支付成功" : "支付失败"}
          </h2>
          
          {/* 订单信息/失败原因 */}
          {isSuccess ? (
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-foreground">¥{amount}</p>
              <p className="text-sm text-muted-foreground">订单号：{orderId}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{reason}</p>
              <p className="text-xs text-muted-foreground mt-1">订单号：{orderId}</p>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className={cn(
          "px-4 flex gap-3 transition-all duration-500 delay-150",
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          {isSuccess ? (
            <>
              <Link 
                href={`/orders/${orderId}`}
                className="flex-1 py-3 bg-primary text-primary-foreground text-center font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                查看订单
              </Link>
              <Link 
                href="/"
                className="flex-1 py-3 bg-secondary text-foreground text-center font-medium rounded-xl hover:bg-secondary/80 transition-colors"
              >
                继续逛逛
              </Link>
            </>
          ) : (
            <>
              <Link 
                href="/checkout"
                className="flex-1 py-3 bg-primary text-primary-foreground text-center font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                重新支付
              </Link>
              <Link 
                href="/checkout?changePayment=true"
                className="flex-1 py-3 bg-secondary text-foreground text-center font-medium rounded-xl hover:bg-secondary/80 transition-colors"
              >
                更换支付方式
              </Link>
            </>
          )}
        </div>

        {/* 订单详情卡片（成功时显示） */}
        {isSuccess && (
          <div className={cn(
            "px-4 mt-6 transition-all duration-500 delay-200",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <Card className="p-4 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">订单已提交</p>
                    <p className="text-xs text-muted-foreground mt-0.5">预计3-5个工作日内发货</p>
                  </div>
                </div>
                <Link href={`/orders/${orderId}`} className="text-primary text-sm flex items-center gap-1">
                  详情 <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </Card>
          </div>
        )}

        {/* 推荐区 */}
        <div className={cn(
          "px-4 mt-8 transition-all duration-500 delay-300",
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base text-foreground">
              {isSuccess ? "购买了此商品的人也买了" : "热门内容推荐"}
            </h3>
            <Link href="/discover" className="text-sm text-primary flex items-center gap-1">
              更多 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 推荐商品列表 */}
          <div className="grid grid-cols-2 gap-3">
            {recommendations.map((item) => (
              <Link 
                key={item.id} 
                href={item.type === "course" ? `/course/${item.id}` : `/mall/product/${item.id}`}
              >
                <Card className="overflow-hidden bg-card hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="aspect-[4/3] bg-secondary flex items-center justify-center relative">
                    {item.type === "course" ? (
                      <>
                        <Play className="w-8 h-8 text-muted-foreground/50" />
                        <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] px-1.5">
                          课程
                        </Badge>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-8 h-8 text-muted-foreground/50" />
                        <Badge className="absolute top-2 left-2 bg-accent/90 text-foreground text-[10px] px-1.5">
                          商品
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h4 className="font-medium text-sm text-foreground line-clamp-1">{item.title}</h4>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-primary font-bold text-sm">¥{item.price}</span>
                      <span className="text-xs text-muted-foreground line-through">¥{item.originalPrice}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sales}人已购</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="px-4 mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            如有疑问请联系客服：400-888-8888
          </p>
        </div>
      </main>
    </div>
  )
}

// 使用Suspense包裹导出
export default function PaymentResultPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PaymentResultContent />
    </Suspense>
  )
}
