'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle, Plus, AlertTriangle } from 'lucide-react'

interface BoundAccount {
  provider: 'wechat' | 'qq' | 'apple'
  isBound: boolean
  accountInfo?: string
  boundAt?: string
}

const providerConfig = {
  wechat: {
    name: '微信',
    color: '#07C160',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.032zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
      </svg>
    ),
  },
  qq: {
    name: 'QQ',
    color: '#12B7F5',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.281 1.025.114 0 .902-.484 1.748-2.072 0 0-.18 2.197 1.904 3.967 0 0-1.77.495-1.77 1.182 0 .686 4.078.43 6.29 0 2.239.425 6.287.687 6.287 0 0-.688-1.768-1.182-1.768-1.182 2.085-1.77 1.905-3.967 1.905-3.967.845 1.588 1.634 2.072 1.746 2.072.111 0 .283-.36.283-1.025 0-2.514-2.166-6.954-2.166-6.954V9.325C18.29 3.364 14.268 2 12.003 2z"/>
      </svg>
    ),
  },
  apple: {
    name: 'Apple ID',
    color: '#000000',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
      </svg>
    ),
  },
}

export default function BindAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<BoundAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [unbindTarget, setUnbindTarget] = useState<BoundAccount | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // Mock data
    setTimeout(() => {
      setAccounts([
        { provider: 'wechat', isBound: true, accountInfo: 'wx_user***89', boundAt: '2024-01-15' },
        { provider: 'qq', isBound: false },
        { provider: 'apple', isBound: true, accountInfo: 'user***@icloud.com', boundAt: '2024-03-20' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const handleBind = (provider: 'wechat' | 'qq' | 'apple') => {
    // Mock OAuth redirect
    alert(`即将跳转到${providerConfig[provider].name}授权页面`)
  }

  const handleUnbind = async () => {
    if (!unbindTarget) return
    setProcessing(true)
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setAccounts(prev => prev.map(acc => 
      acc.provider === unbindTarget.provider 
        ? { ...acc, isBound: false, accountInfo: undefined, boundAt: undefined }
        : acc
    ))
    setProcessing(false)
    setUnbindTarget(null)
  }

  const boundCount = accounts.filter(a => a.isBound).length

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center h-14 px-4">
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 text-center">
              <div className="h-5 w-32 bg-muted rounded mx-auto animate-pulse" />
            </div>
            <div className="w-8" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">第三方账号</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Tip Card */}
      <div className="p-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">绑定提示</p>
              <p className="text-xs text-amber-700 mt-1">
                绑定第三方账号后，可使用该账号快速登录。解绑后将无法使用该方式登录，请确保已绑定其他登录方式。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>已绑定 {boundCount}/3 个账号</span>
          {boundCount >= 2 && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">账号安全</span>
          )}
        </div>
      </div>

      {/* Account List */}
      <div className="px-4 space-y-3">
        {accounts.map(account => {
          const config = providerConfig[account.provider]
          return (
            <div
              key={account.provider}
              className="bg-card rounded-2xl p-4 border border-border"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: config.color }}
                >
                  {config.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{config.name}</span>
                    {account.isBound && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        已绑定
                      </span>
                    )}
                  </div>
                  {account.isBound ? (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {account.accountInfo}
                      <span className="ml-2 text-xs">绑定于 {account.boundAt}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      未绑定，绑定后可快速登录
                    </p>
                  )}
                </div>

                {/* Action */}
                {account.isBound ? (
                  <button
                    onClick={() => setUnbindTarget(account)}
                    className="px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  >
                    解绑
                  </button>
                ) : (
                  <button
                    onClick={() => handleBind(account.provider)}
                    className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg text-white transition-colors"
                    style={{ backgroundColor: config.color }}
                  >
                    <Plus className="w-4 h-4" />
                    绑定
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Benefits */}
      <div className="p-4 mt-4">
        <h3 className="text-sm font-medium text-foreground mb-3">绑定后可享受</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🚀', title: '快速登录', desc: '一键授权登录' },
            { icon: '🔐', title: '账号安全', desc: '多重验证保护' },
            { icon: '📱', title: '多端同步', desc: '数据云端同步' },
            { icon: '🎁', title: '专属福利', desc: '绑定送积分' },
          ].map((benefit, index) => (
            <div key={index} className="bg-muted/50 rounded-xl p-3">
              <span className="text-xl">{benefit.icon}</span>
              <p className="text-sm font-medium mt-1">{benefit.title}</p>
              <p className="text-xs text-muted-foreground">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Unbind Confirm Modal */}
      {unbindTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setUnbindTarget(null)} />
          <div className="relative bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 animate-in slide-in-from-bottom duration-300">
            <h3 className="text-lg font-semibold text-center">确认解绑</h3>
            
            <div className="mt-4 p-4 bg-red-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: providerConfig[unbindTarget.provider].color }}
                >
                  {providerConfig[unbindTarget.provider].icon}
                </div>
                <div>
                  <p className="font-medium">{providerConfig[unbindTarget.provider].name}</p>
                  <p className="text-sm text-muted-foreground">{unbindTarget.accountInfo}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">解绑后：</p>
              <ul className="text-sm text-red-600 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full" />
                  无法使用该账号登录
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full" />
                  请确保已绑定手机号或其他账号
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full" />
                  解绑后可重新绑定
                </li>
              </ul>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setUnbindTarget(null)}
                className="flex-1 py-3 border border-border rounded-xl font-medium"
              >
                取消
              </button>
              <button
                onClick={handleUnbind}
                disabled={processing}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {processing ? '解绑中...' : '确认解绑'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
