'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, CheckCircle2, Clock, XCircle, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type CertStatus = 'none' | 'pending' | 'approved' | 'rejected'

export default function TeacherCertificationPage() {
  const router = useRouter()
  const [status] = useState<CertStatus>('none')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    realName: '', idCard: '', specialty: '', experience: '', bio: '',
    cert1: '', cert2: '',
  })

  const updateForm = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(false)
    setStep(3)
  }

  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">认证已通过</h2>
        <p className="text-sm text-muted-foreground">您已是平台认证讲师，享有专属权益。</p>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center">
        <Clock className="w-16 h-16 text-orange-500 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">审核中</h2>
        <p className="text-sm text-muted-foreground">您的认证申请正在审核中，预计 3-5 个工作日完成。</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">讲师认证</h1>
      </header>

      {/* Progress */}
      <div className="flex items-center px-6 pt-5 pb-4 gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center flex-1">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
            )}>{s}</div>
            {s < 3 && <div className={cn('flex-1 h-0.5 mx-1', step > s ? 'bg-primary' : 'bg-muted')} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between px-6 mb-6 text-xs text-muted-foreground">
        <span>基本信息</span>
        <span>资质证明</span>
        <span>完成</span>
      </div>

      {step === 1 && (
        <div className="px-4 pb-24 space-y-4">
          {[
            { key: 'realName',   label: '真实姓名', placeholder: '请输入真实姓名' },
            { key: 'idCard',     label: '身份证号', placeholder: '请输入18位身份证号' },
            { key: 'specialty',  label: '专业领域', placeholder: '如：八字命理、风水堪舆' },
            { key: 'experience', label: '从业年限', placeholder: '如：5年' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{f.label}</label>
              <Input
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={e => updateForm(f.key, e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">个人简介</label>
            <textarea
              placeholder="请介绍您的专业背景、教学经验和研究成果"
              value={form.bio}
              onChange={e => updateForm('bio', e.target.value)}
              className="w-full min-h-[100px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4">
            <Button
              onClick={() => setStep(2)}
              disabled={!form.realName || !form.specialty}
              className="w-full bg-primary hover:bg-primary/90 h-11"
            >
              下一步
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="px-4 pb-24 space-y-4">
          <p className="text-xs text-muted-foreground mb-2">请上传专业资质证书，支持 JPG、PNG 格式，单张不超过 5MB。</p>
          {[
            { key: 'cert1', label: '资质证书 1（必填）' },
            { key: 'cert2', label: '资质证书 2（选填）' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{f.label}</label>
              <div className={cn(
                'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer',
                form[f.key as keyof typeof form] ? 'border-primary/50 bg-primary/5' : 'border-border'
              )}>
                {form[f.key as keyof typeof form] ? (
                  <><FileText className="w-8 h-8 text-primary" /><p className="text-sm text-primary font-medium">已上传</p></>
                ) : (
                  <><Upload className="w-8 h-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">点击上传证书图片</p></>
                )}
                <input type="file" accept="image/*" className="sr-only" onChange={() => updateForm(f.key, 'uploaded')} />
              </div>
            </div>
          ))}
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4 flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">上一步</Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 h-11"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />提交中…</> : '提交申请'}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">申请已提交</h2>
          <p className="text-sm text-muted-foreground mb-8">
            您的讲师认证申请已收到，我们将在 3-5 个工作日内完成审核，结果将通过站内通知告知您。
          </p>
          <Button onClick={() => router.push('/')} className="w-full bg-primary hover:bg-primary/90">返回首页</Button>
        </div>
      )}
    </div>
  )
}
