'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Shield, Phone, CheckCircle } from 'lucide-react'

type Mode = 'set' | 'change' | 'forget'
type Step = 'enter_old' | 'enter_new' | 'confirm_new' | 'verify_phone' | 'done'

// 仿微信6位密码格子组件
function PinInput({
  value,
  onChange,
  autoFocus = false,
  disabled = false,
  hasError = false,
}: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  disabled?: boolean
  hasError?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [autoFocus])

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 6)
          onChange(v)
        }}
        disabled={disabled}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        style={{ fontSize: 0 }}
      />
      <div className={`flex border rounded-xl overflow-hidden ${hasError ? 'border-destructive' : 'border-border'}`}>
        {digits.map((d, i) => (
          <div
            key={i}
            className={`flex-1 h-14 flex items-center justify-center text-2xl font-bold relative
              ${i > 0 ? 'border-l border-border' : ''}
              ${!disabled ? 'bg-card' : 'bg-muted'}
            `}
          >
            {d ? (
              <span className="w-3 h-3 rounded-full bg-foreground block" />
            ) : (
              value.length === i && (
                <span className="w-0.5 h-6 bg-primary animate-pulse block" />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PaymentPasswordPage() {
  const router = useRouter()

  // 模拟：用户已设置过支付密码
  const [hasPaymentPwd] = useState(true)
  const [mode] = useState<Mode>(hasPaymentPwd ? 'change' : 'set')

  // 步骤状态
  const [step, setStep] = useState<Step>(
    !hasPaymentPwd ? 'enter_new' : 'enter_old'
  )

  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const triggerError = (msg: string) => {
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  const startCountdown = () => {
    setCountdown(60)
    const t = setInterval(() => {
      setCountdown(v => {
        if (v <= 1) { clearInterval(t); return 0 }
        return v - 1
      })
    }, 1000)
  }

  const handleSendCode = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    startCountdown()
    setError('')
  }

  const handleForget = () => {
    setStep('verify_phone')
    setOldPin('')
    setError('')
  }

  // 步骤推进
  const advance = useCallback(async () => {
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    setLoading(false)

    if (step === 'enter_old') {
      if (oldPin.length < 6) { triggerError('请输入完整的6位密码'); return }
      // 模拟验证旧密码
      if (oldPin !== '123456') { setOldPin(''); triggerError('密码错误，请重试'); return }
      setStep('enter_new')
    } else if (step === 'enter_new') {
      if (newPin.length < 6) { triggerError('请输入完整的6位新密码'); return }
      setStep('confirm_new')
    } else if (step === 'confirm_new') {
      if (confirmPin.length < 6) { triggerError('请输入完整的确认密码'); return }
      if (confirmPin !== newPin) { setConfirmPin(''); triggerError('两次密码不一致，请重新输入'); return }
      setStep('done')
    } else if (step === 'verify_phone') {
      if (smsCode.length < 6) { triggerError('请输入6位验证码'); return }
      setStep('enter_new')
    }
  }, [step, oldPin, newPin, confirmPin, smsCode])

  // PIN 自动推进
  useEffect(() => {
    if (step === 'enter_old' && oldPin.length === 6) advance()
    if (step === 'enter_new' && newPin.length === 6) advance()
    if (step === 'confirm_new' && confirmPin.length === 6) advance()
  }, [oldPin, newPin, confirmPin, step, advance])

  const stepTitles: Record<Step, string> = {
    enter_old: '验证当前支付密码',
    enter_new: '设置新支付密码',
    confirm_new: '再次确认新密码',
    verify_phone: '验证手机号',
    done: '设置成功',
  }

  const stepSubtitles: Record<Step, string> = {
    enter_old: '请输入当前6位支付密码',
    enter_new: mode === 'set' ? '请设置6位数字支付密码' : '请输入新的6位支付密码',
    confirm_new: '请再次输入新支付密码',
    verify_phone: '通过手机验证码重置支付密码',
    done: mode === 'set' ? '支付密码设置成功' : '支付密码修改成功',
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 导航栏 */}
      <header className="flex items-center h-14 px-4 border-b border-border bg-card">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-foreground">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-foreground pr-6">
          {mode === 'set' ? '设置支付密码' : '修改支付密码'}
        </h1>
      </header>

      <div className="flex-1 px-6 pt-10 pb-8 flex flex-col">
        {step !== 'done' ? (
          <>
            {/* 步骤进度 */}
            {mode === 'change' && (
              <div className="flex items-center justify-center gap-2 mb-8">
                {(['enter_old', 'enter_new', 'confirm_new'] as Step[]).map((s, idx) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${step === s
                        ? 'bg-primary text-primary-foreground'
                        : ['enter_new', 'confirm_new'].includes(step) && idx === 0
                          ? 'bg-primary/20 text-primary'
                          : step === 'confirm_new' && idx === 1
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    {idx < 2 && <div className={`w-8 h-0.5 ${idx < (['enter_old', 'enter_new', 'confirm_new'] as Step[]).indexOf(step) ? 'bg-primary' : 'bg-muted'}`} />}
                  </div>
                ))}
              </div>
            )}

            {/* 标题 */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{stepTitles[step]}</h2>
              <p className="text-sm text-muted-foreground mt-1">{stepSubtitles[step]}</p>
            </div>

            {/* 验证手机号 */}
            {step === 'verify_phone' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">手机号</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="请输入手机号"
                      className="flex-1 h-12 px-4 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleSendCode}
                      disabled={countdown > 0}
                      className="h-12 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                    >
                      {countdown > 0 ? `${countdown}s` : '发送验证码'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">验证码</label>
                  <input
                    type="tel"
                    value={smsCode}
                    onChange={e => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="请输入6位验证码"
                    maxLength={6}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <button
                  onClick={advance}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold mt-2"
                >
                  {loading ? '验证中...' : '下一步'}
                </button>
              </div>
            ) : (
              /* 密码格子 */
              <div className={`space-y-2 ${shake ? 'animate-bounce' : ''}`}>
                {step === 'enter_old' && (
                  <PinInput
                    value={oldPin}
                    onChange={v => { setOldPin(v); setError('') }}
                    autoFocus
                    disabled={loading}
                    hasError={!!error}
                  />
                )}
                {step === 'enter_new' && (
                  <PinInput
                    value={newPin}
                    onChange={v => { setNewPin(v); setError('') }}
                    autoFocus
                    disabled={loading}
                    hasError={!!error}
                  />
                )}
                {step === 'confirm_new' && (
                  <PinInput
                    value={confirmPin}
                    onChange={v => { setConfirmPin(v); setError('') }}
                    autoFocus
                    disabled={loading}
                    hasError={!!error}
                  />
                )}

                {error && (
                  <p className="text-sm text-destructive text-center pt-1">{error}</p>
                )}

                {loading && (
                  <p className="text-sm text-muted-foreground text-center pt-1">验证中...</p>
                )}
              </div>
            )}

            {/* 忘记密码（仅验证旧密码步骤显示） */}
            {step === 'enter_old' && (
              <button
                onClick={handleForget}
                className="text-primary text-sm text-center mt-6 w-full"
              >
                忘记支付密码？
              </button>
            )}

            {/* 提示 */}
            <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-xs text-amber-700 leading-5">
                支付密码为6位数字，用于支付订单、转账等敏感操作。请勿设置与登录密码相同的数字组合，避免使用生日、连续数字等。
              </p>
            </div>
          </>
        ) : (
          /* 成功态 */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {mode === 'set' ? '支付密码设置成功' : '支付密码修改成功'}
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              您的支付密码已{mode === 'set' ? '设置' : '更新'}，下次支付时将使用新密码验证
            </p>
            <button
              onClick={() => router.back()}
              className="w-full max-w-xs h-12 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              完成
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
