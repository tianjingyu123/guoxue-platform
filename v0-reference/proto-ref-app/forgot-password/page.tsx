"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { Phone, Lock, Eye, EyeOff, MessageCircle, Check, ShieldCheck, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1:验证手机 2:设置新密码 3:成功
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // 密码强度
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, text: "", color: "" }
    let score = 0
    if (pwd.length >= 6) score++
    if (pwd.length >= 10) score++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[!@#$%^&*]/.test(pwd)) score++
    
    if (score <= 2) return { level: 1, text: "弱", color: "bg-destructive" }
    if (score <= 3) return { level: 2, text: "中", color: "bg-accent" }
    return { level: 3, text: "强", color: "bg-green-500" }
  }

  const passwordStrength = getPasswordStrength(password)

  // 发送验证码
  const sendCode = () => {
    if (!phone || phone.length !== 11) {
      setError("请输入正确的手机号")
      return
    }
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

  // 验证手机号
  const verifyPhone = async () => {
    if (code !== "123456") { // 模拟验证
      setError("验证码错误")
      return
    }
    setError("")
    setStep(2)
  }

  // 设置新密码
  const resetPassword = async () => {
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }
    if (password.length < 6) {
      setError("密码长度至少6位")
      return
    }
    
    setError("")
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsLoading(false)
    setStep(3)
  }

  const isPhoneValid = phone.length === 11
  const isCodeValid = code.length === 6
  const isPasswordValid = password.length >= 6 && password === confirmPassword

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部装饰 */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      
      {/* 返回按钮 */}
      <header className="relative z-10 flex items-center px-4 h-14 safe-area-pt">
        {step !== 3 && (
          <button 
            onClick={() => step === 1 ? router.back() : setStep(1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
      </header>

      <div className="flex-1 px-6 relative z-10">
        {/* 步骤指示 */}
        {step !== 3 && (
          <div className="flex items-center justify-center gap-2 py-6">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
              {step > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <div className={cn("w-12 h-0.5", step >= 2 ? "bg-primary" : "bg-secondary")} />
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
              {step > 2 ? <Check className="w-4 h-4" /> : "2"}
            </div>
          </div>
        )}

        {/* 步骤1：验证手机号 */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">找回密码</h1>
              <p className="text-sm text-muted-foreground mt-2">请验证您的手机号</p>
            </div>

            <div className="space-y-4">
              {/* 手机号 */}
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                    setError("")
                  }}
                  placeholder="请输入手机号"
                  className="w-full h-12 pl-12 pr-4 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* 验证码 */}
              <div className="relative">
                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    setError("")
                  }}
                  placeholder="请输入验证码"
                  className="w-full h-12 pl-12 pr-28 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={sendCode}
                  disabled={countdown > 0 || !isPhoneValid}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    countdown > 0 || !isPhoneValid
                      ? "bg-secondary text-muted-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {countdown > 0 ? `${countdown}s` : "获取验证码"}
                </button>
              </div>

              {error && <p className="text-sm text-destructive px-1">{error}</p>}

              <Button
                onClick={verifyPhone}
                disabled={!isPhoneValid || !isCodeValid}
                className="w-full h-12 rounded-xl text-base font-medium"
              >
                下一步
              </Button>
            </div>
          </div>
        )}

        {/* 步骤2：设置新密码 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">设置新密码</h1>
              <p className="text-sm text-muted-foreground mt-2">请设置6-20位新密码</p>
            </div>

            <div className="space-y-4">
              {/* 新密码 */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError("")
                    }}
                    placeholder="请输入新密码"
                    className="w-full h-12 pl-12 pr-12 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                
                {/* 密码强度 */}
                {password && (
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full",
                            i <= passwordStrength.level ? passwordStrength.color : "bg-secondary"
                          )}
                        />
                      ))}
                    </div>
                    <span className={cn(
                      "text-xs",
                      passwordStrength.level === 1 ? "text-destructive" :
                      passwordStrength.level === 2 ? "text-accent" : "text-green-500"
                    )}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  6-20位，建议包含数字和字母
                </p>
              </div>

              {/* 确认密码 */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setError("")
                  }}
                  placeholder="请再次输入新密码"
                  className="w-full h-12 pl-12 pr-12 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive px-1">两次输入的密码不一致</p>
              )}

              {error && <p className="text-sm text-destructive px-1">{error}</p>}

              <Button
                onClick={resetPassword}
                disabled={!isPasswordValid || isLoading}
                className="w-full h-12 rounded-xl text-base font-medium"
              >
                {isLoading ? "设置中..." : "确认设置"}
              </Button>
            </div>
          </div>
        )}

        {/* 步骤3：成功 */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center pt-20">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">密码重置成功</h1>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              您的密码已重置成功<br/>请使用新密码登录
            </p>
            
            <Button
              onClick={() => router.push("/login")}
              className="w-full h-12 rounded-xl text-base font-medium mt-8"
            >
              去登录
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
