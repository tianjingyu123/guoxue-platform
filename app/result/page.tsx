"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { Check, X, AlertCircle, ChevronRight, BookOpen, ShoppingBag, Users, ArrowLeft, Sparkles, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

// 结果类型配置
const resultConfigs: Record<string, {
  success: { title: string; description: string; primaryBtn: { text: string; href: string }; secondaryBtn?: { text: string; href: string } };
  failed: { title: string; description: string; primaryBtn: { text: string; href: string }; secondaryBtn?: { text: string; href: string } };
}> = {
  payment: {
    success: {
      title: "支付成功",
      description: "订单已支付完成，我们已开始为您准备商品",
      primaryBtn: { text: "查看订单", href: "/orders" },
      secondaryBtn: { text: "继续逛逛", href: "/mall" },
    },
    failed: {
      title: "支付失败",
      description: "余额不足，请充值后重试",
      primaryBtn: { text: "重新支付", href: "/checkout" },
      secondaryBtn: { text: "返回首页", href: "/" },
    },
  },
  enroll: {
    success: {
      title: "报名成功",
      description: "您已成功报名，请准时参加课程",
      primaryBtn: { text: "查看详情", href: "/reservations" },
      secondaryBtn: { text: "返回首页", href: "/" },
    },
    failed: {
      title: "报名失败",
      description: "名额已满，请选择其他场次",
      primaryBtn: { text: "重新报名", href: "/offline/courses/1" },
      secondaryBtn: { text: "返回首页", href: "/" },
    },
  },
  submit: {
    success: {
      title: "提交成功",
      description: "您的申请已提交，我们将在1-3个工作日内审核",
      primaryBtn: { text: "查看进度", href: "/mine/submissions" },
      secondaryBtn: { text: "返回首页", href: "/" },
    },
    failed: {
      title: "提交失败",
      description: "网络异常，请稍后重试",
      primaryBtn: { text: "重新提交", href: "" },
      secondaryBtn: { text: "返回首页", href: "/" },
    },
  },
  verify: {
    success: {
      title: "认证成功",
      description: "您的实名认证已通过审核",
      primaryBtn: { text: "返回设置", href: "/settings" },
      secondaryBtn: { text: "返回首页", href: "/" },
    },
    failed: {
      title: "认证失败",
      description: "证件信息不清晰，请重新上传",
      primaryBtn: { text: "重新认证", href: "/verification" },
      secondaryBtn: { text: "返回首页", href: "/" },
    },
  },
  join: {
    success: {
      title: "加入成功",
      description: "欢迎加入圈子，开始您的学习之旅",
      primaryBtn: { text: "进入圈子", href: "/circle/1/home" },
      secondaryBtn: { text: "继续发现", href: "/circle" },
    },
    failed: {
      title: "加入失败",
      description: "支付未完成，请重试",
      primaryBtn: { text: "重新加入", href: "/circle/1" },
      secondaryBtn: { text: "返回首页", href: "/" },
    },
  },
  purchase: {
    success: {
      title: "购买成功",
      description: "课程已解锁，立即开始学习吧",
      primaryBtn: { text: "开始学习", href: "/learn/1" },
      secondaryBtn: { text: "查看订单", href: "/orders" },
    },
    failed: {
      title: "购买失败",
      description: "支付过程中出现问题，请重试",
      primaryBtn: { text: "重新购买", href: "/course/1" },
      secondaryBtn: { text: "返回首页", href: "/" },
    },
  },
}

// 推荐数据
const recommendations = [
  { id: 1, type: "course", title: "紫微斗数精讲", price: 299, image: "", students: 856 },
  { id: 2, type: "course", title: "八字进阶实战", price: 399, image: "", students: 1024 },
  { id: 3, type: "circle", title: "风水堪舆学院", members: 2560, image: "" },
]

function ResultPageContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "payment"
  const status = searchParams.get("status") || "success"
  const orderId = searchParams.get("orderId") || "20260509" + Math.random().toString().slice(2, 8)
  const customTitle = searchParams.get("title")
  const customDesc = searchParams.get("desc")
  
  const [showAnimation, setShowAnimation] = useState(false)
  
  const config = resultConfigs[type] || resultConfigs.payment
  const resultData = status === "success" ? config.success : config.failed
  
  useEffect(() => {
    setShowAnimation(true)
  }, [])

  const isSuccess = status === "success"

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton />
          <h1 className="font-semibold text-base text-foreground">操作结果</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-6">
        {/* 结果图标和信息 */}
        <div className="flex flex-col items-center text-center pt-8 pb-6">
          {/* 动画图标 */}
          <div className={cn(
            "relative w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-500",
            showAnimation ? "scale-100 opacity-100" : "scale-50 opacity-0",
            isSuccess 
              ? "bg-green-500/10" 
              : "bg-destructive/10"
          )}>
            {/* 脉动环 */}
            <div className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-30",
              isSuccess ? "bg-green-500" : "bg-destructive"
            )} style={{ animationDuration: "1.5s", animationIterationCount: 2 }} />
            
            {/* 图标 */}
            {isSuccess ? (
              <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
            ) : (
              <X className="w-10 h-10 text-destructive" strokeWidth={3} />
            )}
          </div>

          {/* 标题 */}
          <h2 className={cn(
            "text-xl font-bold mb-2 transition-all duration-500 delay-100",
            showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            isSuccess ? "text-green-600" : "text-destructive"
          )}>
            {customTitle || resultData.title}
          </h2>

          {/* 描述 */}
          <p className={cn(
            "text-sm text-muted-foreground max-w-xs transition-all duration-500 delay-200",
            showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}>
            {customDesc || resultData.description}
          </p>

          {/* 订单号（成功时显示） */}
          {isSuccess && orderId && (
            <div className={cn(
              "mt-4 px-4 py-2 bg-secondary rounded-lg transition-all duration-500 delay-300",
              showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}>
              <p className="text-xs text-muted-foreground">
                订单号：<span className="text-foreground font-mono">{orderId}</span>
              </p>
            </div>
          )}

          {/* 失败原因详情（失败时显示） */}
          {!isSuccess && (
            <Card className={cn(
              "mt-4 p-4 bg-destructive/5 border-destructive/20 transition-all duration-500 delay-300",
              showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-destructive">失败原因</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {customDesc || resultData.description}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* 操作按钮 */}
        <div className={cn(
          "space-y-3 transition-all duration-500 delay-400",
          showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}>
          <Link
            href={resultData.primaryBtn.href || "/"}
            className={cn(
              "flex items-center justify-center w-full h-12 rounded-xl font-medium text-sm transition-colors",
              isSuccess 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {resultData.primaryBtn.text}
          </Link>
          
          {resultData.secondaryBtn && (
            <Link
              href={resultData.secondaryBtn.href || "/"}
              className="flex items-center justify-center w-full h-12 rounded-xl font-medium text-sm bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            >
              {resultData.secondaryBtn.text}
            </Link>
          )}
        </div>

        {/* 推荐区（成功时显示） */}
        {isSuccess && (
          <div className={cn(
            "mt-8 transition-all duration-500 delay-500",
            showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="font-medium text-sm text-foreground">猜你喜欢</span>
              </div>
              <Link href="/discover" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                更多 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {recommendations.map((item) => (
                <Link
                  key={item.id}
                  href={item.type === "course" ? `/course/${item.id}` : `/circle/${item.id}`}
                >
                  <Card className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
                    <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      {item.type === "course" ? (
                        <BookOpen className="w-6 h-6 text-accent/60" />
                      ) : (
                        <Users className="w-6 h-6 text-primary/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {item.type === "course" ? "课程" : "圈子"}
                        </Badge>
                        <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.type === "course" 
                          ? `${item.students}人学习` 
                          : `${item.members}成员`
                        }
                      </p>
                      {item.type === "course" && item.price && (
                        <p className="text-sm text-primary font-medium mt-1">¥{item.price}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 帮助入口（失败时显示） */}
        {!isSuccess && (
          <div className={cn(
            "mt-8 text-center transition-all duration-500 delay-500",
            showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}>
            <p className="text-sm text-muted-foreground mb-2">遇到问题？</p>
            <Link href="/help" className="text-sm text-primary hover:underline">
              联系客服获取帮助
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResultPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResultPageContent />
    </Suspense>
  )
}
