"use client"

import { useState, useMemo } from "react"
import { BackButton } from "@/components/common/back-button"
import { Eye, EyeOff, Check, AlertCircle, Loader2, X, Wifi } from "lucide-react"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [oldPasswordError, setOldPasswordError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [networkError, setNetworkError] = useState(false)

  // 密码强度计算
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { level: 0, text: "", color: "" }
    
    let score = 0
    if (newPassword.length >= 6) score++
    if (newPassword.length >= 10) score++
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) score++
    if (/\d/.test(newPassword)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) score++

    if (score <= 2) return { level: 1, text: "弱", color: "bg-red-500" }
    if (score <= 3) return { level: 2, text: "中", color: "bg-yellow-500" }
    return { level: 3, text: "强", color: "bg-green-500" }
  }, [newPassword])

  // 密码规则验证
  const passwordRules = useMemo(() => {
    return {
      length: newPassword.length >= 6 && newPassword.length <= 20,
      hasLetter: /[a-zA-Z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
    }
  }, [newPassword])

  const isPasswordValid = passwordRules.length && passwordRules.hasLetter && passwordRules.hasNumber
  const isConfirmMatch = confirmPassword === newPassword && confirmPassword.length > 0
  const canSubmit = oldPassword.length > 0 && isPasswordValid && isConfirmMatch && !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    
    setOldPasswordError("")
    setNetworkError(false)
    setIsSubmitting(true)

    // 模拟API请求
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 模拟旧密码验证（假设正确密码是123456）
    if (oldPassword !== "123456") {
      setOldPasswordError("原密码错误")
      setIsSubmitting(false)
      return
    }

    // 模拟成功
    setIsSubmitting(false)
    setIsSuccess(true)
  }

  // 成功页面
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
          <div className="flex items-center h-12 px-4">
            <BackButton fallbackPath="/settings" />
            <h1 className="flex-1 text-center font-semibold text-foreground pr-9">修改密码</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">密码修改成功</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            请重新登录以确保账号安全
          </p>
          <Link
            href="/login"
            className="w-full max-w-xs py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl text-center hover:bg-primary/90 transition-colors"
          >
            重新登录
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 网络错误提示 */}
      {networkError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 flex items-center justify-between safe-area-pt animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            <span className="text-sm">网络异常，请稍后重试</span>
          </div>
          <button onClick={() => setNetworkError(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center h-12 px-4">
          <BackButton fallbackPath="/settings" />
          <h1 className="flex-1 text-center font-semibold text-foreground pr-9">修改密码</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 旧密码 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            当前密码
          </label>
          <Card className="relative">
            <input
              type={showOldPassword ? "text" : "password"}
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value)
                setOldPasswordError("")
              }}
              placeholder="请输入当前密码"
              className={cn(
                "w-full bg-transparent px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none",
                oldPasswordError && "border-red-500"
              )}
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </Card>
          {oldPasswordError && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {oldPasswordError}
            </p>
          )}
        </div>

        {/* 新密码 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            新密码
          </label>
          <Card className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码"
              className="w-full bg-transparent px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </Card>
          
          {/* 密码强度条 */}
          {newPassword && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-muted-foreground">密码强度</span>
                <span className={cn(
                  "text-xs font-medium",
                  passwordStrength.level === 1 && "text-red-500",
                  passwordStrength.level === 2 && "text-yellow-500",
                  passwordStrength.level === 3 && "text-green-500"
                )}>
                  {passwordStrength.text}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      level <= passwordStrength.level ? passwordStrength.color : "bg-secondary"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* 密码规则 */}
          <div className="mt-3 space-y-1.5">
            <p className={cn(
              "text-xs flex items-center gap-1.5",
              passwordRules.length ? "text-green-500" : "text-muted-foreground"
            )}>
              {passwordRules.length ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current" />}
              6-20位字符
            </p>
            <p className={cn(
              "text-xs flex items-center gap-1.5",
              passwordRules.hasLetter ? "text-green-500" : "text-muted-foreground"
            )}>
              {passwordRules.hasLetter ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current" />}
              包含字母
            </p>
            <p className={cn(
              "text-xs flex items-center gap-1.5",
              passwordRules.hasNumber ? "text-green-500" : "text-muted-foreground"
            )}>
              {passwordRules.hasNumber ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current" />}
              包含数字
            </p>
          </div>
        </div>

        {/* 确认新密码 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            确认新密码
          </label>
          <Card className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              className={cn(
                "w-full bg-transparent px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none",
                confirmPassword && !isConfirmMatch && "border-red-500"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </Card>
          {confirmPassword && !isConfirmMatch && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              两次输入的密码不一致
            </p>
          )}
          {confirmPassword && isConfirmMatch && (
            <p className="mt-1.5 text-xs text-green-500 flex items-center gap-1">
              <Check className="w-3 h-3" />
              密码一致
            </p>
          )}
        </div>

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2",
            canSubmit
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
            "确认修改"
          )}
        </button>

        {/* 忘记密码入口 */}
        <div className="text-center">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            忘记原密码？
          </Link>
        </div>
      </div>
    </div>
  )
}
