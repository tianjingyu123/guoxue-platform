"use client"

import { useState, useRef, useEffect } from "react"
import { X, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaymentPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => Promise<boolean>
  amount?: number
  title?: string
}

export function PaymentPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  title = "请输入支付密码"
}: PaymentPasswordModalProps) {
  const [password, setPassword] = useState<string[]>(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockCountdown, setLockCountdown] = useState(0)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const MAX_ATTEMPTS = 5
  const LOCK_DURATION = 15 * 60 // 15分钟

  // 锁定倒计时
  useEffect(() => {
    if (lockCountdown > 0) {
      const timer = setTimeout(() => setLockCountdown(lockCountdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (isLocked && lockCountdown === 0) {
      setIsLocked(false)
      setAttempts(0)
    }
  }, [lockCountdown, isLocked])

  // 打开时聚焦
  useEffect(() => {
    if (isOpen && !isLocked) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [isOpen, isLocked])

  // 关闭时重置
  useEffect(() => {
    if (!isOpen) {
      setPassword(["", "", "", "", "", ""])
      setError("")
      setIsVerifying(false)
    }
  }, [isOpen])

  const handleInput = (index: number, value: string) => {
    if (isLocked || isVerifying) return
    if (!/^\d*$/.test(value)) return
    
    const newPassword = [...password]
    newPassword[index] = value.slice(-1)
    setPassword(newPassword)
    setError("")
    
    // 自动跳转下一格
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // 自动提交
    if (newPassword.every(p => p) && index === 5) {
      handleVerify(newPassword.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && index > 0 && !password[index]) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (pwd: string) => {
    setIsVerifying(true)
    try {
      const success = await onConfirm(pwd)
      if (!success) {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        
        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true)
          setLockCountdown(LOCK_DURATION)
          setError(`密码错误次数过多，请${Math.ceil(LOCK_DURATION / 60)}分钟后重试`)
        } else {
          setError(`支付密码错误，还可尝试${MAX_ATTEMPTS - newAttempts}次`)
        }
        setPassword(["", "", "", "", "", ""])
        setTimeout(() => inputRefs.current[0]?.focus(), 100)
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const formatLockTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div 
        className="w-full max-w-lg bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <h3 className="font-semibold text-base text-foreground">{title}</h3>
          <div className="w-9" />
        </div>

        {/* 内容 */}
        <div className="p-6">
          {/* 金额显示 */}
          {amount !== undefined && (
            <div className="text-center mb-6">
              <span className="text-muted-foreground text-sm">支付金额</span>
              <p className="text-3xl font-bold text-primary mt-1">
                ¥{amount.toFixed(2)}
              </p>
            </div>
          )}

          {/* 锁定状态 */}
          {isLocked ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-foreground font-medium mb-2">账户已临时锁定</p>
              <p className="text-muted-foreground text-sm mb-4">
                密码错误次数过多，请稍后重试
              </p>
              <div className="text-2xl font-mono text-primary">
                {formatLockTime(lockCountdown)}
              </div>
            </div>
          ) : (
            <>
              {/* 密码输入框 */}
              <div className="flex justify-center gap-3 mb-4">
                {password.map((value, index) => (
                  <input
                    key={index}
                    ref={el => { inputRefs.current[index] = el }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleInput(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isVerifying}
                    className={cn(
                      "w-12 h-14 text-center text-2xl font-bold bg-secondary rounded-xl border-2 transition-all outline-none",
                      value ? "border-primary" : "border-transparent",
                      "focus:border-primary focus:ring-2 focus:ring-primary/20",
                      isVerifying && "opacity-50"
                    )}
                  />
                ))}
              </div>

              {/* 错误提示 */}
              {error && (
                <p className="text-sm text-destructive text-center mb-4">{error}</p>
              )}

              {/* 验证中 */}
              {isVerifying && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">验证中...</span>
                </div>
              )}

              {/* 忘记密码 */}
              <div className="text-center mt-6">
                <button className="text-sm text-primary hover:underline">
                  忘记支付密码？
                </button>
              </div>
            </>
          )}
        </div>

        {/* 安全提示 */}
        <div className="px-6 pb-6 safe-area-pb">
          <p className="text-xs text-muted-foreground text-center">
            支付密码由您本人设置，热卜国学不会以任何形式索要
          </p>
        </div>
      </div>
    </div>
  )
}
