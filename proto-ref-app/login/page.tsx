"use client"

import { useState, useEffect, useCallback } from "react"
import { Phone, Lock, Eye, EyeOff, MessageCircle, Check, Loader2 } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { login, sendVerifyCode } from "@/lib/api/user"
import { useAuth } from "@/lib/hooks/useAuth"

export default function LoginPage() {
  const router = useRouter()
  const { setToken } = useAuth()
  const [loginType, setLoginType] = useState<"phone" | "password">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [error, setError] = useState("")

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 发送验证码
  const handleSendCode = useCallback(async () => {
    if (!phone || phone.length !== 11) {
      setError("请输入正确的手机号")
      return
    }
    
    setIsSendingCode(true)
    setError("")
    
    try {
      const response = await sendVerifyCode({ phone, type: 'login' })
      if (response.code === 200) {
        setCountdown(60)
      } else {
        setError(response.message || '发送失败，请重试')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setIsSendingCode(false)
    }
  }, [phone])

  // 登录
  const handleLogin = async () => {
    if (!agreedTerms) {
      setError("请先阅读并同意相关协议")
      return
    }
    
    // 验证输入
    if (!phone || phone.length !== 11) {
      setError("请输入正确的手机号")
      return
    }
    
    if (loginType === "phone" && (!code || code.length !== 6)) {
      setError("请输入6位验证码")
      return
    }
    
    if (loginType === "password" && (!password || password.length < 6)) {
      setError("密码不能少于6位")
      return
    }
    
    setError("")
    setIsLoading(true)
    
    try {
      const params = loginType === "phone" 
        ? { phone, code }
        : { phone, password }
      
      const response = await login(params)
      
      if (response.code === 200 && response.data) {
        // 存储 token
        setToken(response.data.token)
        // 跳转首页
        router.push("/")
      } else {
        setError(response.message || '登录失败，请重试')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 第三方登录
  const handleThirdPartyLogin = async (type: 'wechat' | 'apple') => {
    if (!agreedTerms) {
      setError("请先阅读并同意相关协议")
      return
    }
    
    // TODO: 实际项目中需要调用对应的第三方登录SDK
    // wechatLogin / appleLogin
    console.log(`Third party login: ${type}`)
    setError(`${type === 'wechat' ? '微信' : 'Apple'}登录功能开发中`)
  }

  const isPhoneValid = phone.length === 11
  const isCodeValid = code.length === 6
  const isPasswordValid = password.length >= 6
  const canSubmit = loginType === "phone" 
    ? isPhoneValid && isCodeValid && agreedTerms
    : isPhoneValid && isPasswordValid && agreedTerms

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部装饰 */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      
      {/* 返回按钮 */}
      <header className="relative z-10 flex items-center px-4 h-14 safe-area-pt">
        <BackButton />
      </header>

      <div className="flex-1 px-6 relative z-10">
        {/* Logo和标题 */}
        <div className="flex flex-col items-center pt-8 pb-10">
          <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl shadow-primary/20 mb-4">
            <img 
              src="/images/logo.jpg" 
              alt="热卜" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-serif">热卜国学</h1>
          <p className="text-sm text-muted-foreground mt-1">探寻东方智慧</p>
        </div>

        {/* 登录方式切换 */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => {
              setLoginType("phone")
              setError("")
            }}
            className={cn(
              "text-sm font-medium pb-2 border-b-2 transition-colors",
              loginType === "phone" 
                ? "text-primary border-primary" 
                : "text-muted-foreground border-transparent"
            )}
          >
            验证码登录
          </button>
          <button
            onClick={() => {
              setLoginType("password")
              setError("")
            }}
            className={cn(
              "text-sm font-medium pb-2 border-b-2 transition-colors",
              loginType === "password" 
                ? "text-primary border-primary" 
                : "text-muted-foreground border-transparent"
            )}
          >
            密码登录
          </button>
        </div>

        {/* 登录表单 */}
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

          {/* 验证码或密码 */}
          {loginType === "phone" ? (
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
                onClick={handleSendCode}
                disabled={countdown > 0 || !isPhoneValid || isSendingCode}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  countdown > 0 || !isPhoneValid || isSendingCode
                    ? "bg-secondary text-muted-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                {isSendingCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : (
                  "获取验证码"
                )}
              </button>
            </div>
          ) : (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                placeholder="请输入密码"
                className="w-full h-12 pl-12 pr-12 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
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
          )}

          {/* 错误提示 */}
          {error && (
            <p className="text-sm text-destructive px-1">{error}</p>
          )}

          {/* 忘记密码 */}
          {loginType === "password" && (
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-primary">
                忘记密码？
              </Link>
            </div>
          )}

          {/* 协议勾选 */}
          <div className="flex items-start gap-2 py-2">
            <button
              onClick={() => setAgreedTerms(!agreedTerms)}
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                agreedTerms 
                  ? "bg-primary border-primary" 
                  : "border-muted-foreground"
              )}
            >
              {agreedTerms && <Check className="w-3 h-3 text-primary-foreground" />}
            </button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              我已阅读并同意
              <Link href="/policy/user-agreement" className="text-primary">《用户服务协议》</Link>
              和
              <Link href="/policy/privacy-policy" className="text-primary">《隐私政策》</Link>
            </p>
          </div>

          {/* 登录按钮 */}
          <Button
            onClick={handleLogin}
            disabled={!canSubmit || isLoading}
            className="w-full h-12 rounded-xl text-base font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                登录中...
              </>
            ) : (
              "登录"
            )}
          </Button>

          {/* 注册入口 */}
          <p className="text-center text-sm text-muted-foreground">
            还没有账号？
            <Link href="/register" className="text-primary ml-1">立即注册</Link>
          </p>
        </div>

        {/* 第三方登录 */}
        <div className="mt-10">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative px-4 bg-background text-xs text-muted-foreground">
              其他登录方式
            </span>
          </div>

          <div className="flex items-center justify-center gap-8">
            {/* 微信登录 */}
            <button
              onClick={() => handleThirdPartyLogin("wechat")}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-[#07C160]/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#07C160]">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89a.506.506 0 0 1-.066-.032zm-2.853 2.973c.534 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.435-.982.97-.982zm4.844 0c.534 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.435-.982.969-.982z"/>
                </svg>
              </div>
              <span className="text-xs text-muted-foreground">微信</span>
            </button>

            {/* Apple登录 */}
            <button
              onClick={() => handleThirdPartyLogin("apple")}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-foreground">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
                </svg>
              </div>
              <span className="text-xs text-muted-foreground">Apple</span>
            </button>
          </div>
        </div>
      </div>

      {/* 底部安全提示 */}
      <div className="py-6 text-center safe-area-pb">
        <p className="text-xs text-muted-foreground">
          登录即代表您同意遵守平台规则，共建和谐社区
        </p>
      </div>
    </div>
  )
}
