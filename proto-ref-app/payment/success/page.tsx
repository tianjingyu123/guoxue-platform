"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, ChevronRight, Gift, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PaymentSuccessRecommend } from "@/components/marketing/marketing-slot"

// 模拟订单数据
const mockOrderData = {
  orderId: "2024011012345678",
  productName: "八字命理学入门到精通",
  productType: "course",
  amount: 199,
  payTime: "2024-01-10 15:30:28",
}

// 模拟推荐商品
const recommendProducts = [
  { id: "2", name: "紫微斗数命盘解读", price: 299, originalPrice: 599 },
  { id: "3", name: "风水堪舆入门精讲", price: 168, originalPrice: 299 },
  { id: "4", name: "六爻预测实战教程", price: 128, originalPrice: 258 },
  { id: "5", name: "奇门遁甲入门课程", price: 199, originalPrice: 399 },
]

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId") || mockOrderData.orderId

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部成功状态 */}
      <div className="bg-gradient-to-b from-green-500 to-green-600 px-4 pt-12 pb-12 text-white text-center">
        {/* 小Logo */}
        <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-3 shadow-lg">
          <img src="/images/logo.jpg" alt="热卜" className="w-full h-full object-cover" />
        </div>
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2">支付成功</h1>
        <p className="text-white/80 text-sm">感谢你选择热卜国学</p>
      </div>

      {/* 订单信息 */}
      <div className="px-4 -mt-6">
        <Card className="p-4">
          <h2 className="font-medium text-foreground mb-3">订单信息</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">商品名称</span>
              <span className="text-foreground">{mockOrderData.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">订单编号</span>
              <span className="text-foreground font-mono text-xs">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">支付金额</span>
              <span className="text-primary font-bold">¥{mockOrderData.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">支付时间</span>
              <span className="text-foreground">{mockOrderData.payTime}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="px-4 mt-4 flex gap-3">
        <Link href="/orders" className="flex-1">
          <Button variant="outline" className="w-full">查看订单</Button>
        </Link>
        <Link href={mockOrderData.productType === "course" ? `/learn/${mockOrderData.orderId}` : "/"} className="flex-1">
          <Button className="w-full">开始学习</Button>
        </Link>
      </div>

      {/* 营销位：支付成功页 - 关联商品推荐 + 优惠券发放 */}
      <div className="px-4 mt-6">
        <PaymentSuccessRecommend 
          products={recommendProducts}
          coupon={{ amount: 20, threshold: 199 }}
        />
      </div>

      {/* 更多服务入口 */}
      <div className="px-4 mt-6 pb-8">
        <Card className="divide-y divide-border">
          <Link href="/coupons" className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">我的优惠券</p>
                <p className="text-xs text-muted-foreground">3张可用券待使用</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <Link href="/" className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">返回首页</p>
                <p className="text-xs text-muted-foreground">发现更多精彩内容</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        </Card>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
