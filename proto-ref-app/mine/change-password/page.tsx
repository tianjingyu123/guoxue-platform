'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Eye, EyeOff, Lock, CheckCircle, XCircle } from 'lucide-react'

// --------------- helpers ---------------

function calcStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 1) return { score: 1, label: '弱', color: 'bg-red-500' }
  if (score <= 2) return { score: 2, label: '较弱', color: 'bg-orange-400' }
  if (score <= 3) return { score: 3, label: '中', color: 'bg-yellow-400' }
  if (score <= 4) return { score: 4, label: '强', color: 'bg-green-400' }
  return { score: 5, label: '极强', color: 'bg-green-600' }
}

interface Rule {
  label: string
  pass: (pwd: string) => boolean
}

const rules: Rule[] = [
  { label: '长度至少 8 位', pass: (p) => p.length >= 8 },
  { label: '包含大写字母', pass: (p) => /[A-Z]/.test(p) },
  { label: '包含数字', pass: (p) => /[0-9]/.test(p) },
  { label: '包含特殊符号', pass: (p) => /[^A-Za-z0-9]/.test(p) },
]

// --------------- sub-components ---------------

function PasswordInput({
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggleShow,
  error,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div
        className={`flex items-center gap-2 px-4 h-12 rounded-xl border bg-background transition-colors ${
          error ? 'border-red-500' : 'border-border focus-within:border-primary'
        }`}
      >
        <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button type="button" onClick={onToggleShow} className="text-muted-foreground hover:text-foreground transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// --------------- main page ---------------

export default function ChangePasswordPage() {
  const router = useRouter()

  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const strength = calcStrength(newPwd)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  function validate() {
    const errs: Record<string, string> = {}
    if (!oldPwd) errs.oldPwd = '请输入当前密码'
    if (!newPwd) errs.newPwd = '请输入新密码'
    else if (newPwd.length < 8) errs.newPwd = '密码长度至少 8 位'
    else if (newPwd === oldPwd) errs.newPwd = '新密码不能与当前密码相同'
    if (!confirmPwd) errs.confirmPwd = '请确认新密码'
    else if (confirmPwd !== newPwd) errs.confirmPwd = '两次输入的密码不一致'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 1200))
      showToast('密码修改成功', 'success')
      setTimeout(() => router.back(), 1000)
    } catch {
      showToast('修改失败，请稍后重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  const allRulesPass = rules.every((r) => r.pass(newPwd))

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* nav */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E8E3DB]">
        <div className="flex items-center h-14 px-4 gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-base text-foreground font-serif">修改密码</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6 max-w-md mx-auto w-full">
        {/* tip */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 leading-relaxed">
          为保护账号安全，修改密码后所有设备将重新登录。请妥善保管新密码。
        </div>

        {/* form */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <PasswordInput
            label="当前密码"
            placeholder="请输入当前登录密码"
            value={oldPwd}
            onChange={setOldPwd}
            show={showOld}
            onToggleShow={() => setShowOld((v) => !v)}
            error={errors.oldPwd}
          />

          <PasswordInput
            label="新密码"
            placeholder="请设置新密码"
            value={newPwd}
            onChange={setNewPwd}
            show={showNew}
            onToggleShow={() => setShowNew((v) => !v)}
            error={errors.newPwd}
          />

          {/* strength bar */}
          {newPwd.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">密码强度</span>
                <span
                  className={
                    strength.score <= 2
                      ? 'text-orange-500'
                      : strength.score === 3
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }
                >
                  {strength.label}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i <= strength.score ? strength.color : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <PasswordInput
            label="确认新密码"
            placeholder="请再次输入新密码"
            value={confirmPwd}
            onChange={setConfirmPwd}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((v) => !v)}
            error={errors.confirmPwd}
          />
        </div>

        {/* rules checklist */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-2.5">
          <p className="text-sm font-medium text-foreground">密码要求</p>
          {rules.map((rule) => {
            const pass = newPwd.length > 0 && rule.pass(newPwd)
            const touched = newPwd.length > 0
            return (
              <div key={rule.label} className="flex items-center gap-2 text-sm">
                {touched ? (
                  pass ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                )}
                <span className={touched && pass ? 'text-green-600' : 'text-muted-foreground'}>
                  {rule.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* submit */}
      <div className="sticky bottom-0 bg-[#FAF8F5] border-t border-[#E8E3DB] px-4 py-4 safe-area-bottom">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-[#C41E3A] text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity"
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {loading ? '提交中...' : '确认修改'}
        </button>
      </div>

      {/* toast */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
