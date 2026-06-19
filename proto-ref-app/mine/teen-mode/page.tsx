'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Shield, Clock, Moon, Filter, Lock, AlertCircle, Check, ChevronRight, HelpCircle } from 'lucide-react'

interface TeenModeSettings {
  enabled: boolean
  dailyLimit: number
  customLimit?: number
  restrictedStartHour: number
  restrictedEndHour: number
  autoNightMode: boolean
  filterLevel: 'strict' | 'moderate'
  hasPassword: boolean
}

export default function TeenModePage() {
  const router = useRouter()
  const [settings, setSettings] = useState<TeenModeSettings>({
    enabled: false,
    dailyLimit: 40,
    restrictedStartHour: 22,
    restrictedEndHour: 6,
    autoNightMode: true,
    filterLevel: 'moderate',
    hasPassword: false,
  })
  const [loading, setLoading] = useState(true)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [showTimeLimitSheet, setShowTimeLimitSheet] = useState(false)
  const [showTimeRangeSheet, setShowTimeRangeSheet] = useState(false)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [password, setPassword] = useState(['', '', '', ''])
  const [confirmPassword, setConfirmPassword] = useState(['', '', '', ''])
  const [passwordStep, setPasswordStep] = useState<'set' | 'confirm'>('set')
  const [verifyPassword, setVerifyPassword] = useState(['', '', '', ''])
  const [idCard, setIdCard] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettings({
        enabled: false,
        dailyLimit: 40,
        restrictedStartHour: 22,
        restrictedEndHour: 6,
        autoNightMode: true,
        filterLevel: 'moderate',
        hasPassword: false,
      })
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const timeLimitOptions = [
    { value: 15, label: '15分钟' },
    { value: 30, label: '30分钟' },
    { value: 40, label: '40分钟（默认）' },
    { value: 60, label: '60分钟' },
    { value: 90, label: '90分钟' },
    { value: 120, label: '120分钟' },
    { value: -1, label: '自定义' },
  ]

  const filterLevels = [
    { value: 'strict', label: '严格', desc: '仅显示适合青少年的教育内容' },
    { value: 'moderate', label: '适中', desc: '过滤不适内容，保留大部分功能' },
  ]

  const handleToggleMode = () => {
    if (settings.enabled) {
      setShowVerifyModal(true)
    } else {
      if (!settings.hasPassword) {
        setShowPasswordModal(true)
        setPasswordStep('set')
      } else {
        setSettings(prev => ({ ...prev, enabled: true }))
      }
    }
  }

  const handlePasswordInput = (index: number, value: string, type: 'set' | 'confirm' | 'verify') => {
    if (!/^\d*$/.test(value)) return
    
    const newPassword = type === 'set' ? [...password] : type === 'confirm' ? [...confirmPassword] : [...verifyPassword]
    newPassword[index] = value.slice(-1)
    
    if (type === 'set') {
      setPassword(newPassword)
      if (value && index < 3) {
        const nextInput = document.getElementById(`pwd-${index + 1}`)
        nextInput?.focus()
      }
      if (newPassword.every(p => p !== '') && index === 3) {
        setPasswordStep('confirm')
        setConfirmPassword(['', '', '', ''])
        setTimeout(() => document.getElementById('confirm-0')?.focus(), 100)
      }
    } else if (type === 'confirm') {
      setConfirmPassword(newPassword)
      if (value && index < 3) {
        const nextInput = document.getElementById(`confirm-${index + 1}`)
        nextInput?.focus()
      }
      if (newPassword.every(p => p !== '') && index === 3) {
        if (newPassword.join('') === password.join('')) {
          setSettings(prev => ({ ...prev, enabled: true, hasPassword: true }))
          setShowPasswordModal(false)
          setPassword(['', '', '', ''])
          setConfirmPassword(['', '', '', ''])
          setPasswordStep('set')
        } else {
          setConfirmPassword(['', '', '', ''])
          setTimeout(() => document.getElementById('confirm-0')?.focus(), 100)
        }
      }
    } else {
      setVerifyPassword(newPassword)
      if (value && index < 3) {
        const nextInput = document.getElementById(`verify-${index + 1}`)
        nextInput?.focus()
      }
      if (newPassword.every(p => p !== '') && index === 3) {
        setSettings(prev => ({ ...prev, enabled: false }))
        setShowVerifyModal(false)
        setVerifyPassword(['', '', '', ''])
      }
    }
  }

  const handleResetPassword = () => {
    if (idCard.length === 18) {
      setSettings(prev => ({ ...prev, hasPassword: false }))
      setShowResetModal(false)
      setIdCard('')
      setShowPasswordModal(true)
      setPasswordStep('set')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    router.back()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-12 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">青少年模式</h1>
          <button onClick={() => setShowResetModal(true)} className="text-sm text-primary">
            忘记密码
          </button>
        </div>
      </div>

      {/* Banner */}
      <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl text-white">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">守护青少年健康成长</h2>
            <p className="text-sm text-white/80 mt-1">
              开启后将限制使用时长、屏蔽不适内容，为青少年营造绿色健康的学习环境
            </p>
          </div>
        </div>
      </div>

      {/* Main Toggle */}
      <div className="mx-4 mt-4 bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.enabled ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">青少年模式</p>
              <p className="text-xs text-muted-foreground">{settings.enabled ? '已开启保护' : '点击开启'}</p>
            </div>
          </div>
          <button
            onClick={handleToggleMode}
            className={`w-12 h-7 rounded-full transition-colors ${settings.enabled ? 'bg-blue-500' : 'bg-muted'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className={`mx-4 mt-4 space-y-4 transition-opacity ${settings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        {/* Time Limit */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="font-medium text-sm text-muted-foreground">使用时长限制</p>
          </div>
          <button
            onClick={() => setShowTimeLimitSheet(true)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium">每日使用时长</p>
                <p className="text-xs text-muted-foreground">超时后需输入密码继续</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary font-medium">{settings.dailyLimit}分钟</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        </div>

        {/* Time Range */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="font-medium text-sm text-muted-foreground">使用时段限制</p>
          </div>
          <button
            onClick={() => setShowTimeRangeSheet(true)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium">禁止使用时段</p>
                <p className="text-xs text-muted-foreground">该时段内无法使用App</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary font-medium">
                {settings.restrictedStartHour}:00 - {settings.restrictedEndHour}:00
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <p className="text-sm">夜间自动开启深色模式</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, autoNightMode: !prev.autoNightMode }))}
              className={`w-12 h-7 rounded-full transition-colors ${settings.autoNightMode ? 'bg-blue-500' : 'bg-muted'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.autoNightMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Content Filter */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="font-medium text-sm text-muted-foreground">内容过滤</p>
          </div>
          <button
            onClick={() => setShowFilterSheet(true)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                <Filter className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium">内容过滤级别</p>
                <p className="text-xs text-muted-foreground">控制可见内容范围</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary font-medium">
                {settings.filterLevel === 'strict' ? '严格' : '适中'}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        </div>

        {/* Password */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="font-medium text-sm text-muted-foreground">监护密码</p>
          </div>
          <button
            onClick={() => {
              setShowPasswordModal(true)
              setPasswordStep('set')
            }}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium">修改监护密码</p>
                <p className="text-xs text-muted-foreground">用于关闭模式或延长时间</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${settings.hasPassword ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                {settings.hasPassword ? '已设置' : '未设置'}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-900 text-sm">温馨提示</p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1">
                <li>• 开启后部分功能将受限，如直播打赏、商城购物等</li>
                <li>• 内容将过滤为适合青少年观看的教育类内容</li>
                <li>• 使用时长达到限制后需输入监护密码解锁</li>
                <li>• 忘记密码可通过监护人身份证验证重置</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-center">
              {passwordStep === 'set' ? '设置监护密码' : '确认监护密码'}
            </h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              {passwordStep === 'set' ? '请设置4位数字密码' : '请再次输入密码确认'}
            </p>
            
            <div className="flex justify-center gap-3 mt-6">
              {(passwordStep === 'set' ? password : confirmPassword).map((digit, index) => (
                <input
                  key={index}
                  id={passwordStep === 'set' ? `pwd-${index}` : `confirm-${index}`}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handlePasswordInput(index, e.target.value, passwordStep)}
                  className="w-12 h-14 text-center text-2xl font-bold bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPassword(['', '', '', ''])
                  setConfirmPassword(['', '', '', ''])
                  setPasswordStep('set')
                }}
                className="flex-1 h-11 border border-border rounded-xl text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-center">验证监护密码</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              关闭青少年模式需要验证监护密码
            </p>
            
            <div className="flex justify-center gap-3 mt-6">
              {verifyPassword.map((digit, index) => (
                <input
                  key={index}
                  id={`verify-${index}`}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handlePasswordInput(index, e.target.value, 'verify')}
                  className="w-12 h-14 text-center text-2xl font-bold bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button
              onClick={() => {
                setShowVerifyModal(false)
                setShowResetModal(true)
              }}
              className="w-full text-sm text-primary mt-4"
            >
              忘记密码？
            </button>

            <button
              onClick={() => {
                setShowVerifyModal(false)
                setVerifyPassword(['', '', '', ''])
              }}
              className="w-full h-11 mt-4 border border-border rounded-xl text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 justify-center">
              <HelpCircle className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold">身份验证</h3>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              请输入监护人身份证号码重置密码
            </p>
            
            <input
              type="text"
              value={idCard}
              onChange={e => setIdCard(e.target.value.slice(0, 18))}
              placeholder="请输入18位身份证号"
              className="w-full h-12 mt-4 px-4 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowResetModal(false)
                  setIdCard('')
                }}
                className="flex-1 h-11 border border-border rounded-xl text-sm"
              >
                取消
              </button>
              <button
                onClick={handleResetPassword}
                disabled={idCard.length !== 18}
                className="flex-1 h-11 bg-primary text-primary-foreground rounded-xl text-sm disabled:opacity-50"
              >
                验证并重置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Limit Sheet */}
      {showTimeLimitSheet && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowTimeLimitSheet(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
              <h3 className="font-semibold text-center">选择每日使用时长</h3>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {timeLimitOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    if (option.value > 0) {
                      setSettings(prev => ({ ...prev, dailyLimit: option.value }))
                      setShowTimeLimitSheet(false)
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl ${settings.dailyLimit === option.value ? 'bg-primary/10' : 'bg-muted'}`}
                >
                  <span>{option.label}</span>
                  {settings.dailyLimit === option.value && <Check className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Time Range Sheet */}
      {showTimeRangeSheet && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowTimeRangeSheet(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
              <h3 className="font-semibold text-center">设置禁止使用时段</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground text-center mb-2">开始时间</p>
                  <select
                    value={settings.restrictedStartHour}
                    onChange={e => setSettings(prev => ({ ...prev, restrictedStartHour: parseInt(e.target.value) }))}
                    className="w-full h-12 px-4 bg-muted rounded-xl text-center appearance-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <span className="text-muted-foreground mt-6">至</span>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground text-center mb-2">结束时间</p>
                  <select
                    value={settings.restrictedEndHour}
                    onChange={e => setSettings(prev => ({ ...prev, restrictedEndHour: parseInt(e.target.value) }))}
                    className="w-full h-12 px-4 bg-muted rounded-xl text-center appearance-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => setShowTimeRangeSheet(false)}
                className="w-full h-12 mt-6 bg-primary text-primary-foreground rounded-xl font-medium"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Level Sheet */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowFilterSheet(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
              <h3 className="font-semibold text-center">内容过滤级别</h3>
            </div>
            <div className="p-4 space-y-3">
              {filterLevels.map(level => (
                <button
                  key={level.value}
                  onClick={() => {
                    setSettings(prev => ({ ...prev, filterLevel: level.value as 'strict' | 'moderate' }))
                    setShowFilterSheet(false)
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl ${settings.filterLevel === level.value ? 'bg-primary/10 border-2 border-primary' : 'bg-muted border-2 border-transparent'}`}
                >
                  <div className="text-left">
                    <p className="font-medium">{level.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{level.desc}</p>
                  </div>
                  {settings.filterLevel === level.value && <Check className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
