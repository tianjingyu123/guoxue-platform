'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Step = 'input' | 'sent'

export default function RecoverEmailPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('input')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = async () => {
    if (!isValidEmail) {
      setError('请输入有效的邮箱地址')
      return
    }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setStep('sent')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">邮箱找回密码</h1>
      </header>

      <div className="max-w-sm mx-auto px-6 pt-12">
        {step === 'input' ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground text-center mb-2">验证您的邮箱</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">
              输入注册时使用的邮箱，我们将发送重置密码链接
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">邮箱地址</label>
                <Input
                  type="email"
                  placeholder="请输入邮箱"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className={error ? 'border-destructive' : ''}
                />
                {error && <p className="text-xs text-destructive mt-1">{error}</p>}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!email || loading}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />发送中…</>
                  : '发送重置链接'
                }
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">邮件已发送</h2>
            <p className="text-sm text-muted-foreground mb-2">
              重置密码邮件已发送至
            </p>
            <p className="text-sm font-medium text-foreground mb-8">{email}</p>
            <p className="text-xs text-muted-foreground mb-8">
              请查收邮件并点击链接重置密码。链接30分钟内有效。如未收到请检查垃圾邮件文件夹。
            </p>
            <Button variant="outline" onClick={() => setStep('input')} className="w-full mb-3">
              重新发送
            </Button>
            <Button onClick={() => router.push('/login')} className="w-full bg-primary hover:bg-primary/90">
              返回登录
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

