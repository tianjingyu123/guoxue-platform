'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, CheckCircle, AlertCircle, Home, UserPlus, X, ArrowLeft, FileText } from 'lucide-react'

function DeleteAccountResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') || 'pending' // pending | completed
  const expireTime = searchParams.get('expire') // ISO timestamp

  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Calculate countdown for cooling-off period
  useEffect(() => {
    if (status !== 'pending' || !expireTime) return

    const targetTime = new Date(expireTime).getTime()

    const updateCountdown = () => {
      const now = Date.now()
      const diff = targetTime - now

      if (diff <= 0) {
        // Cooling period ended, redirect to completed
        router.replace('/mine/delete-account-result?status=completed')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdown({ days, hours, minutes, seconds })
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)

    return () => clearInterval(timer)
  }, [status, expireTime, router])

  const handleCancelDeletion = async () => {
    setCancelling(true)
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      router.replace('/mine/settings')
    } catch {
      setCancelling(false)
    }
  }

  const handleCloseApp = () => {
    // Clear all local data
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }
    // In a real app, this would close the app or redirect to a goodbye page
    window.location.href = 'about:blank'
  }

  // Pending state - Cooling-off period
  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between h-14 px-4">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-semibold">注销申请</h1>
            <div className="w-9" />
          </div>
        </div>

        <div className="flex flex-col items-center px-6 pt-16 pb-8">
          {/* Icon */}
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-6">
            <Clock className="w-12 h-12 text-blue-500" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground mb-2">注销申请已提交</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            您的账号将在7天冷静期后正式注销
          </p>

          {/* Countdown */}
          <div className="w-full bg-blue-50 rounded-2xl p-6 mb-6">
            <p className="text-sm text-blue-600 text-center mb-4">冷静期剩余时间</p>
            <div className="flex justify-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-blue-600">{countdown.days}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">天</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-blue-600">{String(countdown.hours).padStart(2, '0')}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">时</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-blue-600">{String(countdown.minutes).padStart(2, '0')}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">分</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-blue-600">{String(countdown.seconds).padStart(2, '0')}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">秒</span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="w-full bg-amber-50 rounded-xl p-4 mb-8">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-medium mb-1">冷静期内您可以：</p>
                <ul className="space-y-1 text-amber-600">
                  <li>重新登录账号撤销注销申请</li>
                  <li>正常使用所有功能</li>
                  <li>冷静期结束后账号将被永久注销</li>
                </ul>
              </div>
            </div>
          </div>

          {/* What will happen */}
          <div className="w-full bg-card rounded-xl border border-border p-4 mb-8">
            <h3 className="font-medium text-foreground mb-3">注销后将发生</h3>
            <div className="space-y-3">
              {[
                { icon: '📝', text: '个人资料、发布内容将被删除' },
                { icon: '💰', text: '账户余额将被清零且不可恢复' },
                { icon: '🎁', text: '会员权益、优惠券将作废' },
                { icon: '📱', text: '手机号可重新注册新账号' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="w-full space-y-3">
            <button
              onClick={() => setShowCancelDialog(true)}
              className="w-full h-12 bg-[#C41E3A] text-white rounded-xl font-medium"
            >
              撤销注销申请
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full h-12 bg-muted text-foreground rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              返回首页
            </button>
            <button
              onClick={() => router.push('/customer-service')}
              className="w-full h-12 text-muted-foreground text-sm flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              了解注销详情
            </button>
          </div>
        </div>

        {/* Cancel Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-2xl p-6 mx-6 max-w-sm w-full">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">撤销注销申请</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  确定要撤销注销申请吗？撤销后账号将恢复正常状态。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelDialog(false)}
                    disabled={cancelling}
                    className="flex-1 h-11 bg-muted text-foreground rounded-xl font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCancelDeletion}
                    disabled={cancelling}
                    className="flex-1 h-11 bg-green-500 text-white rounded-xl font-medium"
                  >
                    {cancelling ? '处理中...' : '确定撤销'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Completed state - Account deleted
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-center h-14 px-4">
          <h1 className="font-semibold">账号注销</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
            <X className="w-6 h-6 text-gray-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-foreground mb-2">账号已注销</h2>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
          所有数据将按隐私政策处理，感谢您一直以来的使用与支持
        </p>

        {/* Info Card */}
        <div className="w-full bg-card rounded-xl border border-border p-4 mb-8">
          <h3 className="font-medium text-foreground mb-3">注销完成说明</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>您的个人数据已按照隐私政策进行处理</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>账户余额已按规定处理完毕</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>该手机号可用于注册新账号</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>原账号数据无法恢复</span>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="w-full bg-blue-50 rounded-xl p-4 mb-8">
          <p className="text-sm text-blue-700 text-center">
            如果您愿意告诉我们离开的原因，可以
            <button className="text-blue-600 font-medium underline mx-1">
              填写反馈问卷
            </button>
            帮助我们改进服务
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={() => router.push('/login?action=register')}
            className="w-full h-12 bg-[#C41E3A] text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            重新注册账号
          </button>
          <button
            onClick={handleCloseApp}
            className="w-full h-12 bg-muted text-foreground rounded-xl font-medium"
          >
            关闭应用
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          如有问题请联系客服：400-xxx-xxxx
        </p>
      </div>
    </div>
  )
}

export default function DeleteAccountResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#C41E3A] border-t-transparent rounded-full" />
      </div>
    }>
      <DeleteAccountResultContent />
    </Suspense>
  )
}
