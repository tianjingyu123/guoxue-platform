"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Check, AlertCircle, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function ChangePhonePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: 验证当前手机, 2: 绑定新手机, 3: 成功
  const currentPhone = "138****8888"
  
  // 第一步状态
  const [currentCode, setCurrentCode] = useState("")
  const [currentCodeError, setCurrentCodeError] = useState("")
  const [currentCountdown, setCurrentCountdown] = useState(0)
  const [currentSending, setCurrentSending] = useState(false)
  const [currentVerifying, setCurrentVerifying] = useState(false)
  
  // 第二步状态
  const [newPhone, setNewPhone] = useState("")
  const [newCode, setNewCode] = useState("")
  const [newCodeError, setNewCodeError] = useState("")
  const [newCountdown, setNewCountdown] = useState(0)
  const [newSending, setNewSending] = useState(false)
  const [newVerifying, setNewVerifying] = useState(false)
  const [phoneExistsModal, setPhoneExistsModal] = useState(false)
  
  // 倒计时处理
  useEffect(() => {
    if (currentCountdown > 0) {
      const timer = setTimeout(() => setCurrentCountdown(currentCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [currentCountdown])
  
  useEffect(() => {
    if (newCountdown > 0) {
      const timer = setTimeout(() => setNewCountdown(newCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [newCountdown])
  
  // 成功后自动返回
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        window.history.back()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [step])
  
  // 发送当前手机验证码
  const sendCurrentCode = async () => {
    setCurrentSending(true)
    setCurrentCodeError("")
    // 模拟发送
    await new Promise(resolve => setTimeout(resolve, 1000))
    setCurrentSending(false)
    setCurrentCountdown(60)
  }
  
  // 验证当前手机
  const verifyCurrentPhone = async () => {
    if (currentCode.length !== 6) return
    
    setCurrentVerifying(true)
    setCurrentCodeError("")
    // 模拟验证
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 模拟验证结果
    if (currentCode === "123456") {
      setStep(2)
    } else if (currentCode === "000000") {
      setCurrentCodeError("验证码已过期，请重新获取")
    } else {
      setCurrentCodeError("验证码错误，请重新输入")
    }
    setCurrentVerifying(false)
  }
  
  // 发送新手机验证码
  const sendNewCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(newPhone)) return
    
    setNewSending(true)
    setNewCodeError("")
    // 模拟发送
    await new Promise(resolve => setTimeout(resolve, 1000))
    setNewSending(false)
    setNewCountdown(60)
  }
  
  // 绑定新手机
  const bindNewPhone = async () => {
    if (newCode.length !== 6 || !/^1[3-9]\d{9}$/.test(newPhone)) return
    
    setNewVerifying(true)
    setNewCodeError("")
    // 模拟验证
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 模拟不同结果
    if (newPhone === "13900001111") {
      // 手机号已被绑定
      setPhoneExistsModal(true)
      setNewVerifying(false)
      return
    }
    
    if (newCode === "123456") {
      setStep(3)
    } else if (newCode === "000000") {
      setNewCodeError("验证码已过期，请重新获取")
    } else {
      setNewCodeError("验证码错误，请重新输入")
    }
    setNewVerifying(false)
  }
  
  // 成功页面
  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
          <div className="flex items-center h-12 px-4">
            <BackButton fallbackPath="/settings" />
            <h1 className="flex-1 text-center font-semibold text-base text-foreground pr-9">修改手机号</h1>
          </div>
        </header>
        
        <main className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-in zoom-in-50 duration-300">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">手机号修改成功</h2>
          <p className="text-sm text-muted-foreground mb-1">新手机号：{newPhone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}</p>
          <p className="text-xs text-muted-foreground">3秒后自动返回设置页...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center h-12 px-4">
          <BackButton fallbackPath="/settings" />
          <h1 className="flex-1 text-center font-semibold text-base text-foreground pr-9">修改手机号</h1>
        </div>
      </header>
      
      {/* 步骤指示器 */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
              {step > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <span className={cn("text-sm", step >= 1 ? "text-foreground" : "text-muted-foreground")}>
              验证身份
            </span>
          </div>
          <div className={cn("w-12 h-0.5", step >= 2 ? "bg-primary" : "bg-secondary")} />
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
              2
            </div>
            <span className={cn("text-sm", step >= 2 ? "text-foreground" : "text-muted-foreground")}>
              绑定新号
            </span>
          </div>
        </div>
      </div>
      
      <main className="px-4 pb-24">
        {/* 第一步：验证当前手机号 */}
        {step === 1 && (
          <Card className="p-5">
            <h3 className="font-medium text-foreground mb-1">验证当前手机号</h3>
            <p className="text-sm text-muted-foreground mb-6">为保障账号安全，请先验证当前绑定的手机号</p>
            
            {/* 当前手机号显示 */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1.5 block">当前手机号</label>
              <div className="h-12 px-4 rounded-xl bg-secondary flex items-center">
                <span className="text-foreground font-medium">{currentPhone}</span>
              </div>
            </div>
            
            {/* 验证码输入 */}
            <div className="mb-6">
              <label className="text-xs text-muted-foreground mb-1.5 block">验证码</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  maxLength={6}
                  value={currentCode}
                  onChange={(e) => {
                    setCurrentCode(e.target.value.replace(/\D/g, ""))
                    setCurrentCodeError("")
                  }}
                  placeholder="请输入6位验证码"
                  className={cn(
                    "flex-1 h-12 px-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none border-2 transition-colors",
                    currentCodeError ? "border-destructive" : "border-transparent focus:border-primary"
                  )}
                />
                <button
                  onClick={sendCurrentCode}
                  disabled={currentCountdown > 0 || currentSending}
                  className={cn(
                    "px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                    currentCountdown > 0 || currentSending
                      ? "bg-secondary text-muted-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {currentSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : currentCountdown > 0 ? (
                    `${currentCountdown}s`
                  ) : (
                    "获取验证码"
                  )}
                </button>
              </div>
              {currentCodeError && (
                <p className="flex items-center gap-1 text-xs text-destructive mt-2">
                  <AlertCircle className="w-3 h-3" />
                  {currentCodeError}
                </p>
              )}
            </div>
            
            {/* 下一步按钮 */}
            <button
              onClick={verifyCurrentPhone}
              disabled={currentCode.length !== 6 || currentVerifying}
              className={cn(
                "w-full h-12 rounded-xl font-medium transition-colors flex items-center justify-center gap-2",
                currentCode.length === 6 && !currentVerifying
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {currentVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
              下一步
            </button>
          </Card>
        )}
        
        {/* 第二步：绑定新手机号 */}
        {step === 2 && (
          <Card className="p-5">
            <h3 className="font-medium text-foreground mb-1">绑定新手机号</h3>
            <p className="text-sm text-muted-foreground mb-6">请输入您要绑定的新手机号</p>
            
            {/* 新手机号输入 */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1.5 block">新手机号</label>
              <input
                type="tel"
                maxLength={11}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="请输入新手机号"
                className="w-full h-12 px-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none border-2 border-transparent focus:border-primary transition-colors"
              />
            </div>
            
            {/* 验证码输入 */}
            <div className="mb-6">
              <label className="text-xs text-muted-foreground mb-1.5 block">验证码</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  maxLength={6}
                  value={newCode}
                  onChange={(e) => {
                    setNewCode(e.target.value.replace(/\D/g, ""))
                    setNewCodeError("")
                  }}
                  placeholder="请输入6位验证码"
                  className={cn(
                    "flex-1 h-12 px-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none border-2 transition-colors",
                    newCodeError ? "border-destructive" : "border-transparent focus:border-primary"
                  )}
                />
                <button
                  onClick={sendNewCode}
                  disabled={newCountdown > 0 || newSending || !/^1[3-9]\d{9}$/.test(newPhone)}
                  className={cn(
                    "px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                    newCountdown > 0 || newSending || !/^1[3-9]\d{9}$/.test(newPhone)
                      ? "bg-secondary text-muted-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {newSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : newCountdown > 0 ? (
                    `${newCountdown}s`
                  ) : (
                    "获取验证码"
                  )}
                </button>
              </div>
              {newCodeError && (
                <p className="flex items-center gap-1 text-xs text-destructive mt-2">
                  <AlertCircle className="w-3 h-3" />
                  {newCodeError}
                </p>
              )}
            </div>
            
            {/* 确认绑定按钮 */}
            <button
              onClick={bindNewPhone}
              disabled={newCode.length !== 6 || !/^1[3-9]\d{9}$/.test(newPhone) || newVerifying}
              className={cn(
                "w-full h-12 rounded-xl font-medium transition-colors flex items-center justify-center gap-2",
                newCode.length === 6 && /^1[3-9]\d{9}$/.test(newPhone) && !newVerifying
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {newVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
              确认绑定
            </button>
            
            {/* 返回上一步 */}
            <button
              onClick={() => {
                setStep(1)
                setCurrentCode("")
                setCurrentCodeError("")
              }}
              className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              返回上一步
            </button>
          </Card>
        )}
      </main>
      
      {/* 手机号已被绑定弹窗 */}
      {phoneExistsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <Card className="w-full max-w-sm p-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-center font-semibold text-foreground mb-2">手机号已被绑定</h3>
            <p className="text-center text-sm text-muted-foreground mb-5">
              该手机号已被其他账号绑定，请更换其他手机号或找回原账号。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPhoneExistsModal(false)
                  setNewPhone("")
                  setNewCode("")
                }}
                className="flex-1 h-10 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
              >
                更换手机号
              </button>
              <Link
                href="/auth/recover"
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
              >
                找回原账号
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
