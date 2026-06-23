"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { AlertTriangle, BookOpen, Crown, Coins, Users, TrendingUp, FileText, Check, X, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 注销须知项
const deleteWarnings = [
  { icon: "👤", title: "个人资料和认证信息", description: "头像、昵称、实名认证等信息将被清除" },
  { icon: "📚", title: "购买的课程、电子书、会员权益", description: "已购内容将无法再访问" },
  { icon: "🪙", title: "国学币余额", description: "剩余国学币将作废，不予退还" },
  { icon: "👥", title: "圈子管理权限", description: "您创建的圈子将被转让或解散" },
  { icon: "💰", title: "推广收益", description: "未提现余额将作废" },
  { icon: "📝", title: "所有发布的内容", description: "帖子、文章、评论等将被删除" },
]

// 模拟用户数据
const userData = {
  phone: "138****8888",
  hasUnfinishedOrders: false, // 改为true可测试有未完成订单的情况
  coinBalance: 280,
  circleCount: 2,
  contentCount: 36,
}

export default function DeleteAccountPage() {
  const [step, setStep] = useState<"notice" | "verify" | "success">("notice")
  const [verifyCode, setVerifyCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [codeError, setCodeError] = useState("")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [keepContent, setKeepContent] = useState(false)

  // 发送验证码
  const handleSendCode = async () => {
    if (countdown > 0) return
    setIsSending(true)
    setCodeError("")
    
    // 模拟发送
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSending(false)
    setCountdown(60)
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 提交注销申请
  const handleSubmit = async () => {
    // 检查是否有未完成订单
    if (userData.hasUnfinishedOrders) {
      setShowOrderModal(true)
      return
    }
    
    setShowConfirmModal(true)
  }

  // 确认注销
  const handleConfirmDelete = async () => {
    setShowConfirmModal(false)
    setIsSubmitting(true)
    
    // 模拟验证
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (verifyCode !== "123456") {
      setCodeError("验证码错误，请重新输入")
      setIsSubmitting(false)
      return
    }
    
    setIsSubmitting(false)
    setStep("success")
  }

  // 注销须知页面
  if (step === "notice") {
    return (
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
          <div className="flex items-center justify-between px-4 h-14">
            <BackButton fallbackPath="/settings" />
            <h1 className="font-semibold text-base text-foreground">账号注销</h1>
            <div className="w-9" />
          </div>
        </header>

        <div className="p-4 pb-24">
          {/* 警告提示 */}
          <Card className="p-4 bg-destructive/10 border-destructive/20 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-semibold text-destructive">注销账号须知</h2>
                <p className="text-sm text-destructive/80 mt-1">
                  注销账号后，以下数据将永久清空且无法恢复
                </p>
              </div>
            </div>
          </Card>

          {/* 注销须知列表 */}
          <Card className="divide-y divide-border">
            {deleteWarnings.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-4">
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <X className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              </div>
            ))}
          </Card>

          {/* 当前账号数据 */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-foreground mb-2">您当前的账号数据</h3>
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-accent">{userData.coinBalance}</p>
                  <p className="text-xs text-muted-foreground">国学币余额</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{userData.circleCount}</p>
                  <p className="text-xs text-muted-foreground">管理的圈子</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{userData.contentCount}</p>
                  <p className="text-xs text-muted-foreground">发布的内容</p>
                </div>
              </div>
            </Card>
          </div>

          {/* 内容处理选项 */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-foreground mb-2">内容处理方式</h3>
            <Card className="p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-foreground">保留已发布内容</p>
                  <p className="text-xs text-muted-foreground">您的帖子和文章将匿名保留</p>
                </div>
                <button
                  onClick={() => setKeepContent(!keepContent)}
                  className={cn(
                    "w-12 h-7 rounded-full transition-colors relative",
                    keepContent ? "bg-primary" : "bg-secondary"
                  )}
                >
                  <span className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    keepContent ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </label>
            </Card>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
          <button
            onClick={() => setStep("verify")}
            className="w-full py-3 bg-destructive text-destructive-foreground text-sm font-medium rounded-xl hover:bg-destructive/90 transition-colors"
          >
            我已了解，继续注销
          </button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            注销前请确保已提现全部收益
          </p>
        </div>
      </div>
    )
  }

  // 验证页面
  if (step === "verify") {
    return (
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => setStep("notice")} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-semibold text-base text-foreground">身份验证</h1>
            <div className="w-9" />
          </div>
        </header>

        <div className="p-4">
          {/* 验证说明 */}
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">🔐</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">验证您的手机号</p>
                <p className="text-xs text-muted-foreground">我们需要验证您的身份以确保账号安全</p>
              </div>
            </div>
          </Card>

          {/* 手机号显示 */}
          <div className="mb-6">
            <label className="text-sm text-muted-foreground mb-2 block">当前绑定手机号</label>
            <div className="py-3 px-4 bg-secondary rounded-xl text-foreground font-medium">
              {userData.phone}
            </div>
          </div>

          {/* 验证码输入 */}
          <div className="mb-6">
            <label className="text-sm text-muted-foreground mb-2 block">短信验证码</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => {
                  setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  setCodeError("")
                }}
                placeholder="请输入6位验证码"
                className={cn(
                  "flex-1 py-3 px-4 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary",
                  codeError && "ring-2 ring-destructive"
                )}
              />
              <button
                onClick={handleSendCode}
                disabled={countdown > 0 || isSending}
                className={cn(
                  "px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                  countdown > 0 || isSending
                    ? "bg-secondary text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : (
                  "获取验证码"
                )}
              </button>
            </div>
            {codeError && (
              <p className="text-xs text-destructive mt-2">{codeError}</p>
            )}
          </div>

          {/* 提示 */}
          <Card className="p-4 bg-amber-500/10 border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-600">
                <p className="font-medium">注销后将有7天冷静期</p>
                <p className="mt-1 text-amber-600/80">
                  在此期间若再次登录，注销申请将自动撤销。7天后账号将被永久删除。
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* 底部按钮 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
          <button
            onClick={handleSubmit}
            disabled={verifyCode.length !== 6 || isSubmitting}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2",
              verifyCode.length === 6
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            确认注销
          </button>
        </div>

        {/* 二次确认弹窗 */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">确定要注销账号吗？</h3>
                <p className="text-sm text-muted-foreground">
                  注销后您的所有数据将在7天冷静期后被永久删除，此操作不可撤销。
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                >
                  再想想
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-destructive text-destructive-foreground text-sm font-medium rounded-xl hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  确认注销
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* 未完成订单弹窗 */}
        {showOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">无法注销账号</h3>
                <p className="text-sm text-muted-foreground">
                  您有未完成的订单，请先处理完毕后再申请注销。
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                >
                  取消
                </button>
                <Link
                  href="/orders"
                  className="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors text-center"
                >
                  查看订单
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // 成功页面
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">注销申请已提交</h2>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-8">
        您的账号将于7天后正式注销。在此期间若再次登录，注销申请将自动撤销。
      </p>
      
      <Card className="w-full max-w-sm p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg">📅</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">7天冷静期</p>
            <p className="text-xs text-muted-foreground">
              预计注销时间：{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("zh-CN")}
            </p>
          </div>
        </div>
      </Card>
      
      <Link
        href="/"
        className="w-full max-w-sm py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors text-center block"
      >
        返回首页
      </Link>
    </div>
  )
}
