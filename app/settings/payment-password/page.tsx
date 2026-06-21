"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Check, Shield, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function PaymentPasswordPage() {
  const [step, setStep] = useState<"verify" | "set" | "confirm" | "success">("verify")
  const [isModifying, setIsModifying] = useState(true) // true = 修改密码，false = 首次设置
  const [phone] = useState("138****8888")
  const [verifyCode, setVerifyCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [password, setPassword] = useState<string[]>(["", "", "", "", "", ""])
  const [confirmPassword, setConfirmPassword] = useState<string[]>(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const passwordRefs = useRef<(HTMLInputElement | null)[]>([])
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([])

  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendCode = () => {
    if (countdown > 0) return
    setCountdown(60)
  }

  const handleVerifyCode = () => {
    if (verifyCode.length !== 6) {
      setError("请输入6位验证码")
      return
    }
    if (verifyCode !== "123456") {
      setError("验证码错误")
      return
    }
    setError("")
    setStep("set")
  }

  const handlePasswordInput = (index: number, value: string, isConfirm: boolean = false) => {
    if (!/^\d*$/.test(value)) return
    
    const newPassword = isConfirm ? [...confirmPassword] : [...password]
    newPassword[index] = value.slice(-1)
    
    if (isConfirm) {
      setConfirmPassword(newPassword)
    } else {
      setPassword(newPassword)
    }
    setError("")
    
    // 自动跳转下一格
    if (value && index < 5) {
      const refs = isConfirm ? confirmRefs : passwordRefs
      refs.current[index + 1]?.focus()
    }
    
    // 自动检测完成
    if (!isConfirm && newPassword.every(p => p) && index === 5) {
      setTimeout(() => setStep("confirm"), 100)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm: boolean = false) => {
    if (e.key === "Backspace" && index > 0) {
      const currentValue = isConfirm ? confirmPassword[index] : password[index]
      if (!currentValue) {
        const refs = isConfirm ? confirmRefs : passwordRefs
        refs.current[index - 1]?.focus()
      }
    }
  }

  const handleConfirmPassword = () => {
    const pwd = password.join("")
    const confirmPwd = confirmPassword.join("")
    
    if (confirmPwd.length !== 6) {
      setError("请输入完整的6位密码")
      return
    }
    
    if (pwd !== confirmPwd) {
      setError("两次输入的密码不一致")
      setConfirmPassword(["", "", "", "", "", ""])
      confirmRefs.current[0]?.focus()
      return
    }
    
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setStep("success")
    }, 1500)
  }

  // 聚焦到第一个空位
  useEffect(() => {
    if (step === "set") {
      passwordRefs.current[0]?.focus()
    } else if (step === "confirm") {
      confirmRefs.current[0]?.focus()
    }
  }, [step])

  // 渲染密码输入框
  const renderPasswordInputs = (values: string[], refs: React.MutableRefObject<(HTMLInputElement | null)[]>, isConfirm: boolean = false) => (
    <div className="flex justify-center gap-3">
      {values.map((value, index) => (
        <input
          key={index}
          ref={el => { refs.current[index] = el }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handlePasswordInput(index, e.target.value, isConfirm)}
          onKeyDown={(e) => handleKeyDown(index, e, isConfirm)}
          className={cn(
            "w-12 h-14 text-center text-2xl font-bold bg-secondary rounded-xl border-2 transition-all outline-none",
            value ? "border-primary" : "border-transparent",
            "focus:border-primary focus:ring-2 focus:ring-primary/20"
          )}
        />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/settings" />
          <h1 className="font-semibold text-base text-foreground">
            {isModifying ? "修改支付密码" : "设置支付密码"}
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4">
        {/* 验证身份 */}
        {step === "verify" && isModifying && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">验证身份</h2>
              <p className="text-sm text-muted-foreground mt-1">
                为保障账号安全，请验证您的手机号
              </p>
            </div>

            <Card className="p-4">
              <div className="text-center mb-4">
                <span className="text-muted-foreground text-sm">验证码将发送至</span>
                <span className="text-foreground font-medium ml-2">{phone}</span>
              </div>
              
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="请输入验证码"
                  value={verifyCode}
                  onChange={(e) => {
                    setVerifyCode(e.target.value.replace(/\D/g, ""))
                    setError("")
                  }}
                  className="flex-1 h-12 px-4 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className={cn(
                    "px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                    countdown > 0
                      ? "bg-secondary text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {countdown > 0 ? `${countdown}s` : "获取验证码"}
                </button>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center mb-4">{error}</p>
              )}

              <button
                onClick={handleVerifyCode}
                disabled={verifyCode.length !== 6}
                className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步
              </button>
            </Card>
          </div>
        )}

        {/* 设置密码 */}
        {step === "set" && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">设置支付密码</h2>
              <p className="text-sm text-muted-foreground mt-1">
                请输入6位数字密码
              </p>
            </div>

            <Card className="p-6">
              {renderPasswordInputs(password, passwordRefs)}
              
              <p className="text-xs text-muted-foreground text-center mt-4">
                支付密码用于支付验证，请勿使用生日或简单数字
              </p>
            </Card>
          </div>
        )}

        {/* 确认密码 */}
        {step === "confirm" && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">确认支付密码</h2>
              <p className="text-sm text-muted-foreground mt-1">
                请再次输入密码确认
              </p>
            </div>

            <Card className="p-6">
              {renderPasswordInputs(confirmPassword, confirmRefs, true)}
              
              {error && (
                <p className="text-sm text-destructive text-center mt-4">{error}</p>
              )}

              <button
                onClick={handleConfirmPassword}
                disabled={isLoading || confirmPassword.some(p => !p)}
                className="w-full py-3 mt-6 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    设置中...
                  </>
                ) : (
                  "确认设置"
                )}
              </button>

              <button
                onClick={() => {
                  setStep("set")
                  setPassword(["", "", "", "", "", ""])
                  setConfirmPassword(["", "", "", "", "", ""])
                  setError("")
                }}
                className="w-full py-3 mt-2 text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                返回上一步
              </button>
            </Card>
          </div>
        )}

        {/* 设置成功 */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-in zoom-in-50 duration-300">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">支付密码设置成功</h2>
            <p className="text-sm text-muted-foreground mb-8">您可以使用支付密码进行安全支付</p>
            
            <Link
              href="/settings"
              className="px-8 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              返回设置
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
