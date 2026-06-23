'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, AlertTriangle, Trash2, CreditCard, Gift, ShoppingBag, MessageCircle, Users, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'

const deleteReasons = [
  { id: 'not_useful', label: '不再使用该服务' },
  { id: 'privacy', label: '隐私安全考虑' },
  { id: 'found_better', label: '找到了更好的替代品' },
  { id: 'too_many_notifications', label: '通知太多' },
  { id: 'poor_experience', label: '使用体验不好' },
  { id: 'other', label: '其他原因' },
]

const dataToDelete = [
  { icon: MessageCircle, label: '帖子、评论、消息等内容', color: 'text-blue-500' },
  { icon: Users, label: '圈子、关注、粉丝关系', color: 'text-green-500' },
  { icon: ShoppingBag, label: '订单记录和购买历史', color: 'text-orange-500' },
  { icon: Gift, label: '积分、优惠券和会员权益', color: 'text-purple-500' },
  { icon: CreditCard, label: '钱包余额（需先提现）', color: 'text-red-500' },
]

export default function DeleteAccountPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedReason, setSelectedReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [verifyMethod, setVerifyMethod] = useState<'password' | 'code'>('password')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone] = useState('138****8888')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [confirmText, setConfirmText] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  // Mock user data
  const userData = {
    balance: 128.50,
    points: 2680,
    coupons: 5,
    memberDays: 180,
  }

  const sendCode = () => {
    if (countdown > 0) return
    // Mock send code
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

  const handleNextStep = () => {
    if (step === 1 && !agreed) return
    if (step === 2 && !selectedReason) return
    if (step === 3) {
      if (verifyMethod === 'password' && password.length < 6) return
      if (verifyMethod === 'code' && code.length !== 6) return
      setShowConfirmDialog(true)
      return
    }
    setStep(step + 1)
  }

  const handleDelete = async () => {
    if (confirmText !== '确认注销') return
    setLoading(true)
    // Mock delete account
    await new Promise(resolve => setTimeout(resolve, 2000))
    // Clear local storage and redirect
    localStorage.clear()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-medium">账号注销</h1>
          <div className="w-9" />
        </div>
        {/* Progress */}
        <div className="flex px-8 pb-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s < step ? 'bg-primary text-primary-foreground' :
                s === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {s < step ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 mx-2 ${s < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 pb-24">
        {/* Step 1: Notice */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-medium text-red-700">注销账号前请仔细阅读</h3>
                  <p className="text-sm text-red-600 mt-1">
                    账号注销后，以下数据将被永久删除且无法恢复
                  </p>
                </div>
              </div>
            </div>

            {/* Data to delete */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <h4 className="font-medium text-foreground">将被删除的数据</h4>
              {dataToDelete.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 py-2">
                  <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="text-sm text-foreground">{item.label}</span>
                  <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                </div>
              ))}
            </div>

            {/* Current assets */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h4 className="font-medium text-foreground mb-3">您当前的资产</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs text-orange-600">钱包余额</p>
                  <p className="text-lg font-bold text-orange-600">¥{userData.balance}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-purple-600">积分</p>
                  <p className="text-lg font-bold text-purple-600">{userData.points}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-green-600">优惠券</p>
                  <p className="text-lg font-bold text-green-600">{userData.coupons}张</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-600">会员剩余</p>
                  <p className="text-lg font-bold text-blue-600">{userData.memberDays}天</p>
                </div>
              </div>
              {userData.balance > 0 && (
                <p className="text-xs text-red-500 mt-3">
                  * 您的钱包余额尚有 ¥{userData.balance}，建议先提现后再注销
                </p>
              )}
            </div>

            {/* Cool down period */}
            <div className="bg-blue-50 rounded-2xl p-4">
              <h4 className="font-medium text-blue-700">7天冷静期</h4>
              <p className="text-sm text-blue-600 mt-1">
                提交注销申请后，账号将进入7天冷静期。期间登录即可撤销注销。
              </p>
            </div>

            {/* Agreement */}
            <label className="flex items-start gap-3 p-4 bg-card rounded-2xl border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                我已阅读并理解上述内容，确认要注销账号，并同意
                <button className="text-primary">《账号注销协议》</button>
              </span>
            </label>
          </div>
        )}

        {/* Step 2: Reason */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <h4 className="font-medium text-foreground mb-1">请告诉我们您注销的原因</h4>
              <p className="text-sm text-muted-foreground mb-4">您的反馈将帮助我们改进服务</p>
              <div className="space-y-2">
                {deleteReasons.map(reason => (
                  <label
                    key={reason.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      selectedReason === reason.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason.id}
                      checked={selectedReason === reason.id}
                      onChange={e => setSelectedReason(e.target.value)}
                      className="w-5 h-5 text-primary focus:ring-primary"
                    />
                    <span className="text-foreground">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedReason === 'other' && (
              <div className="bg-card rounded-2xl border border-border p-4">
                <label className="text-sm font-medium text-foreground">其他原因（选填）</label>
                <textarea
                  value={otherReason}
                  onChange={e => setOtherReason(e.target.value)}
                  placeholder="请输入您的原因..."
                  maxLength={200}
                  className="mt-2 w-full h-24 px-4 py-3 bg-muted rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{otherReason.length}/200</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Verify */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <h4 className="font-medium text-foreground mb-4">验证身份</h4>
              
              {/* Method toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setVerifyMethod('password')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    verifyMethod === 'password'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  密码验证
                </button>
                <button
                  onClick={() => setVerifyMethod('code')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    verifyMethod === 'code'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  短信验证
                </button>
              </div>

              {verifyMethod === 'password' ? (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">请输入登录密码</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="输入当前登录密码"
                      className="w-full h-12 px-4 pr-12 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    验证码将发送至 <span className="text-foreground font-medium">{phone}</span>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="输入6位验证码"
                      className="flex-1 h-12 px-4 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={sendCode}
                      disabled={countdown > 0}
                      className="px-4 h-12 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 rounded-2xl p-4">
              <p className="text-sm text-yellow-700">
                验证通过后，将进入最终确认步骤
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <button
          onClick={handleNextStep}
          disabled={
            (step === 1 && !agreed) ||
            (step === 2 && !selectedReason) ||
            (step === 3 && verifyMethod === 'password' && password.length < 6) ||
            (step === 3 && verifyMethod === 'code' && code.length !== 6)
          }
          className="w-full h-12 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === 3 ? '确认注销' : '下一步'}
        </button>
      </div>

      {/* Final Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm bg-card rounded-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">最终确认</h3>
              <p className="text-sm text-muted-foreground mt-2">
                请输入 <span className="text-red-500 font-medium">&quot;确认注销&quot;</span> 以继续
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={'请输入"确认注销"'}
                className="w-full h-12 mt-4 px-4 bg-muted rounded-xl text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {confirmText && confirmText !== '确认注销' && (
                <p className="text-xs text-red-500 mt-2">请输入正确的确认文字</p>
              )}
            </div>
            <div className="flex border-t border-border">
              <button
                onClick={() => {
                  setShowConfirmDialog(false)
                  setConfirmText('')
                }}
                className="flex-1 h-12 text-foreground font-medium"
              >
                取消
              </button>
              <div className="w-px bg-border" />
              <button
                onClick={handleDelete}
                disabled={confirmText !== '确认注销' || loading}
                className="flex-1 h-12 text-red-500 font-medium disabled:opacity-50"
              >
                {loading ? '处理中...' : '确认注销'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
