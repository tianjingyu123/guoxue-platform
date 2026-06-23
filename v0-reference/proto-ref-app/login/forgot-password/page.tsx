"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Phone, Shield, Lock, Eye, EyeOff, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { sendVerifyCode, resetPassword } from "@/lib/api/user"
import { toast } from "sonner"

// 密码强度等级
type PasswordStrength = 'weak' | 'medium' | 'strong'

// 密码强度检测
function checkPasswordStrength(password: string): { strength: PasswordStrength; score: number; checks: { label: string; passed: boolean }[] } {
  const checks = [
    { label: '至少8位字符', passed: password.length >= 8 },
    { label: '包含数字', passed: /\d/.test(password) },
    { label: '包含小写字母', passed: /[a-z]/.test(password) },
    { label: '包含大写字母', passed: /[A-Z]/.test(password) },
    { label: '包含特殊字符', passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ]
  
  const score = checks.filter(c => c.passed).length
  let strength: PasswordStrength = 'weak'
  if (score >= 4) strength = 'strong'
  else if (score >= 3) strength = 'medium'
  
  return { strength, score, checks }
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  
  // 步骤：1=输入手机号, 2=输入验证码, 3=设置新密码
  const [step, setStep] = useState(1)
  
  // 表单数据
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // UI状态
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  
  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])
  
  // 手机号格式校验
  const isValidPhone = /^1[3-9]\d{9}$/.test(phone)
  
  // 密码强度
  const passwordStrength = checkPasswordStrength(newPassword)
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword
  const canSubmitPassword = passwordStrength.score >= 3 && passwordsMatch
  
  // 发送验证码
  const handleSendCode = async () => {
    if (!isValidPhone || sendingCode || countdown > 0) return
    
    setSendingCode(true)
    try {
      const res = await sendVerifyCode({ phone, type: 'reset' })
      if (res.code === 200) {
        setCountdown(60)
        toast.success("验证码已发送")
        if (step === 1) {
          setStep(2)
        }
      } else {
        toast.error(res.message || "发送失败")
      }
    } catch {
      toast.error("发送失败，请重试")
    } finally {
      setSendingCode(false)
    }
  }
  
  // 验证码校验
  const handleVerifyCode = () => {
    if (code.length !== 6) {
      toast.error("请输入6位验证码")
      return
    }
    // 这里可以先调用接口验证验证码是否正确
    // 简化处理：直接进入下一步，在最后提交时一起验证
    setStep(3)
  }
  
  // 提交新密码
  const handleSubmit = async () => {
    if (!canSubmitPassword) return
    
    setLoading(true)
    try {
      const res = await resetPassword({
        phone,
        code,
        newPassword,
      })
      
      if (res.code === 200) {
        toast.success("密码重置成功")
        router.push("/login")
      } else {
        toast.error(res.message || "重置失败")
      }
    } catch {
      toast.error("重置失败，请重试")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#C9A96E]/10">
        <div className="flex items-center h-14 px-4">
          <button 
            onClick={() => {
              if (step > 1) {
                setStep(step - 1)
              } else {
                router.back()
              }
            }}
            className="p-2 -ml-2 text-[#333]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-lg font-medium text-[#333] pr-7">
            忘记密码
          </h1>
        </div>
      </header>
      
      {/* 步骤指示器 */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= s 
                  ? 'bg-[#C41E3A] text-white' 
                  : 'bg-[#E8E3D7] text-[#999]'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 mx-1 transition-colors ${
                  step > s ? 'bg-[#C41E3A]' : 'bg-[#E8E3D7]'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-[#666] mt-2 px-2">
          <span className={step >= 1 ? 'text-[#C41E3A]' : ''}>验证手机</span>
          <span className={step >= 2 ? 'text-[#C41E3A]' : ''}>输入验证码</span>
          <span className={step >= 3 ? 'text-[#C41E3A]' : ''}>设置密码</span>
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className="flex-1 px-6 py-4">
        {/* 步骤1：输入手机号 */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#C41E3A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-[#C41E3A]" />
              </div>
              <h2 className="text-xl font-medium text-[#333] mb-2">验证手机号</h2>
              <p className="text-sm text-[#666]">请输入注册时使用的手机号</p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="h-12 pl-4 pr-4 bg-white border-[#E8E3D7] focus:border-[#C41E3A] focus:ring-[#C41E3A]/20 text-[#333] placeholder:text-[#999]"
                />
              </div>
              
              {phone && !isValidPhone && (
                <p className="text-xs text-[#C41E3A]">请输入正确的手机号格式</p>
              )}
              
              <Button
                onClick={handleSendCode}
                disabled={!isValidPhone || sendingCode}
                className="w-full h-12 bg-[#C41E3A] hover:bg-[#A31830] text-white"
              >
                {sendingCode ? "发送中..." : "获取验证码"}
              </Button>
            </div>
          </div>
        )}
        
        {/* 步骤2：输入验证码 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#C41E3A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-[#C41E3A]" />
              </div>
              <h2 className="text-xl font-medium text-[#333] mb-2">输入验证码</h2>
              <p className="text-sm text-[#666]">验证码已发送至 {phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="请输入6位验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 pl-4 pr-24 bg-white border-[#E8E3D7] focus:border-[#C41E3A] focus:ring-[#C41E3A]/20 text-[#333] placeholder:text-[#999] text-center text-lg tracking-widest"
                />
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || sendingCode}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[#C41E3A] disabled:text-[#999]"
                >
                  {countdown > 0 ? `${countdown}s` : sendingCode ? "发送中" : "重新发送"}
                </button>
              </div>
              
              <Button
                onClick={handleVerifyCode}
                disabled={code.length !== 6}
                className="w-full h-12 bg-[#C41E3A] hover:bg-[#A31830] text-white"
              >
                下一步
              </Button>
            </div>
          </div>
        )}
        
        {/* 步骤3：设置新密码 */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#C41E3A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-[#C41E3A]" />
              </div>
              <h2 className="text-xl font-medium text-[#333] mb-2">设置新密码</h2>
              <p className="text-sm text-[#666]">请设置一个安全的新密码</p>
            </div>
            
            <div className="space-y-4">
              {/* 新密码 */}
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入新密码"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 pl-4 pr-12 bg-white border-[#E8E3D7] focus:border-[#C41E3A] focus:ring-[#C41E3A]/20 text-[#333] placeholder:text-[#999]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* 密码强度指示器 */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength.score >= level + 1
                            ? passwordStrength.strength === 'strong'
                              ? 'bg-green-500'
                              : passwordStrength.strength === 'medium'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            : 'bg-[#E8E3D7]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    passwordStrength.strength === 'strong' 
                      ? 'text-green-600' 
                      : passwordStrength.strength === 'medium' 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                  }`}>
                    密码强度：{passwordStrength.strength === 'strong' ? '强' : passwordStrength.strength === 'medium' ? '中' : '弱'}
                  </p>
                  <div className="space-y-1">
                    {passwordStrength.checks.map((check, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {check.passed ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <X className="w-3 h-3 text-[#999]" />
                        )}
                        <span className={check.passed ? 'text-green-600' : 'text-[#999]'}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 确认密码 */}
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="请确认新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 pl-4 pr-12 bg-white border-[#E8E3D7] focus:border-[#C41E3A] focus:ring-[#C41E3A]/20 text-[#333] placeholder:text-[#999]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999]"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-[#C41E3A]">两次输入的密码不一致</p>
              )}
              
              <Button
                onClick={handleSubmit}
                disabled={!canSubmitPassword || loading}
                className="w-full h-12 bg-[#C41E3A] hover:bg-[#A31830] text-white"
              >
                {loading ? "提交中..." : "确认重置"}
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* 底部提示 */}
      <div className="px-6 py-4 text-center">
        <button 
          onClick={() => router.push("/login")}
          className="text-sm text-[#C41E3A]"
        >
          返回登录
        </button>
      </div>
    </div>
  )
}
