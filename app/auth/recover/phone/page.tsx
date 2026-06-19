'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Smartphone, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Step = 'phone' | 'code' | 'reset'

export default function RecoverPhonePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isValidPhone = /^1[3-9]\d{9}$/.test(phone)

  const startCountdown = () => {
    setCountdown(60)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const sendCode = async () => {
    if (!isValidPhone) { setError('请输入有效的手机号'); return }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    startCountdown()
  }

  const verifyCode = async () => {
    if (code.length !== 6) { setError('请输入6位验证码'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    setStep('reset')
  }

  const resetPassword = async () => {
    if (newPwd.length < 6) { setError('密码至少6位'); return }
    if (newPwd !== confirmPwd) { setError('两次密码不一致'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">手机号找回密码</h1>
      </header>

      <div className="max-w-sm mx-auto px-6 pt-12">
        {/* 步骤指示 */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {(['phone', 'code', 'reset'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s === step ? 'bg-primary text-white'
                : ['phone', 'code', 'reset'].indexOf(s) < ['phone', 'code', 'reset'].indexOf(step)
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>{i + 1}</div>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">手机号码</label>
              <div className="flex gap-2">
                <span className="flex items-center justify-center px-3 border border-border rounded-lg text-sm text-foreground bg-muted">+86</span>
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  maxLength={11}
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
                  className="flex-1"
                />
              </div>
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>
            <Button
              onClick={async () => { await sendCode(); if (isValidPhone) setStep('code') }}
              disabled={!isValidPhone || loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />发送中…</> : '获取验证码'}
            </Button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              验证码已发送至 <span className="font-medium text-foreground">{phone}</span>
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">验证码</label>
              <Input
                type="text"
                placeholder="请输入6位验证码"
                maxLength={6}
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
              />
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={sendCode} disabled={countdown > 0 || loading} className="flex-shrink-0">
                {countdown > 0 ? `${countdown}s` : '重新获取'}
              </Button>
              <Button onClick={verifyCode} disabled={code.length !== 6 || loading} className="flex-1 bg-primary hover:bg-primary/90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '验证'}
              </Button>
            </div>
          </div>
        )}

        {step === 'reset' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">新密码</label>
              <Input
                type="password"
                placeholder="至少6位"
                value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setError('') }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">确认密码</label>
              <Input
                type="password"
                placeholder="再次输入新密码"
                value={confirmPwd}
                onChange={e => { setConfirmPwd(e.target.value); setError('') }}
              />
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>
            <Button onClick={resetPassword} disabled={!newPwd || !confirmPwd || loading} className="w-full bg-primary hover:bg-primary/90">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />重置中…</> : '确认重置'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

