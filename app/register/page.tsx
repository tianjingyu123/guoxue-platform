'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Check, Phone, Lock, User, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'verify' | 'password'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // 发送验证码
  const sendCode = () => {
    if (countdown > 0 || !phone || phone.length !== 11) return
    
    // TODO: 调用发送验证码API
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
    
    setStep('verify')
  }

  // 验证验证码
  const verifyCode = () => {
    if (code.length !== 6) return
    // TODO: 调用验证API
    setStep('password')
  }

  // 完成注册
  const handleRegister = async () => {
    if (!password || password !== confirmPassword || !nickname || !agreed) return
    
    setIsLoading(true)
    try {
      // TODO: 调用注册API
      await new Promise(resolve => setTimeout(resolve, 1500))
      router.push('/login?registered=true')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center gap-3 px-4 h-14">
          <button 
            onClick={() => {
              if (step === 'phone') router.back()
              else if (step === 'verify') setStep('phone')
              else setStep('verify')
            }}
            className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-semibold text-lg text-foreground">注册账号</h1>
        </div>
      </header>

      {/* 进度指示器 */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {['phone', 'verify', 'password'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step === s 
                  ? "bg-primary text-white" 
                  : index < ['phone', 'verify', 'password'].indexOf(step)
                    ? "bg-success text-white"
                    : "bg-secondary text-muted-foreground"
              )}>
                {index < ['phone', 'verify', 'password'].indexOf(step) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 2 && (
                <div className={cn(
                  "w-16 h-0.5 mx-2",
                  index < ['phone', 'verify', 'password'].indexOf(step) 
                    ? "bg-success" 
                    : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>输入手机号</span>
          <span>验证身份</span>
          <span>设置密码</span>
        </div>
      </div>

      {/* 表单内容 */}
      <main className="flex-1 px-6 py-4">
        {/* 步骤1: 输入手机号 */}
        {step === 'phone' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">输入手机号</h2>
              <p className="text-sm text-muted-foreground">我们将发送验证码到您的手机</p>
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="pl-10 h-12"
              />
            </div>

            <Button 
              onClick={sendCode}
              disabled={phone.length !== 11}
              className="w-full h-12"
            >
              获取验证码
            </Button>
          </div>
        )}

        {/* 步骤2: 输入验证码 */}
        {step === 'verify' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">输入验证码</h2>
              <p className="text-sm text-muted-foreground">
                验证码已发送至 {phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
              </p>
            </div>

            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="请输入6位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="pl-10 h-12 tracking-[0.5em] text-center"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {countdown > 0 ? `${countdown}秒后可重发` : '没有收到验证码？'}
              </span>
              <button
                onClick={sendCode}
                disabled={countdown > 0}
                className={cn(
                  "text-primary font-medium",
                  countdown > 0 && "text-muted-foreground"
                )}
              >
                重新发送
              </button>
            </div>

            <Button 
              onClick={verifyCode}
              disabled={code.length !== 6}
              className="w-full h-12"
            >
              下一步
            </Button>
          </div>
        )}

        {/* 步骤3: 设置密码 */}
        {step === 'password' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">完善信息</h2>
              <p className="text-sm text-muted-foreground">设置您的昵称和登录密码</p>
            </div>

            {/* 昵称 */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="请输入昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                className="pl-10 h-12"
              />
            </div>

            {/* 密码 */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="请设置密码（6-20位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* 确认密码 */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 h-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* 密码不一致提示 */}
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-danger">两次输入的密码不一致</p>
            )}

            {/* 协议勾选 */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked as boolean)}
                className="mt-0.5"
              />
              <label htmlFor="agree" className="text-sm text-muted-foreground leading-relaxed">
                我已阅读并同意
                <Link href="/terms" className="text-primary mx-1">《用户协议》</Link>
                和
                <Link href="/privacy" className="text-primary mx-1">《隐私政策》</Link>
              </label>
            </div>

            <Button 
              onClick={handleRegister}
              disabled={!password || password.length < 6 || password !== confirmPassword || !nickname || !agreed || isLoading}
              className="w-full h-12"
            >
              {isLoading ? '注册中...' : '完成注册'}
            </Button>
          </div>
        )}

        {/* 底部链接 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            已有账号？
            <Link href="/login" className="text-primary font-medium ml-1">
              立即登录
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
