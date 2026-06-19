'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Monitor, Download, ExternalLink, ChevronRight, CheckCircle2, Settings, Wifi, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    step: 1,
    title: '下载并安装 OBS Studio',
    desc: 'OBS Studio 是免费开源的直播推流软件，支持 Windows / macOS / Linux。',
    action: '前往官网下载',
    icon: <Download className="w-5 h-5" />,
  },
  {
    step: 2,
    title: '添加视频和音频来源',
    desc: '在 OBS「来源」面板中添加「显示器采集」或「视频采集设备」，再添加「音频输入采集」。',
    action: null,
    icon: <Video className="w-5 h-5" />,
  },
  {
    step: 3,
    title: '配置推流设置',
    desc: '打开「设置」→「推流」，选择「自定义」，填写平台推流地址和推流码。',
    action: null,
    icon: <Settings className="w-5 h-5" />,
  },
  {
    step: 4,
    title: '填写推流地址',
    desc: '在智玄平台「开始直播」页面获取您的专属推流地址和推流码，填入 OBS 对应字段。',
    action: '获取我的推流码',
    icon: <Wifi className="w-5 h-5" />,
  },
  {
    step: 5,
    title: '调整编码参数（推荐设置）',
    desc: '「输出」→「视频编码器」选 x264，码率 2500-4000 Kbps，分辨率 1280×720，帧率 30fps。',
    action: null,
    icon: <Monitor className="w-5 h-5" />,
  },
]

const REQUIREMENTS = [
  { label: 'CPU', value: 'i5 / Ryzen 5 及以上' },
  { label: '内存', value: '8GB RAM 及以上' },
  { label: '上传网速', value: '≥ 6Mbps（推荐10Mbps）' },
  { label: '操作系统', value: 'Windows 10 / macOS 10.15+' },
]

const FAQ = [
  { q: '推流码在哪里找？', a: '进入「开始直播」页面 → 点击「获取推流码」按钮即可查看和复制。' },
  { q: '直播卡顿怎么办？', a: '降低码率至 2000Kbps，关闭其他占用网络的程序，或联系运营商检查网络质量。' },
  { q: 'OBS 显示推流失败？', a: '检查推流地址是否正确，推流码是否已过期，防火墙是否阻止了 OBS 的网络请求。' },
]

export default function OBSGuidePage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">OBS 推流教程</h1>
      </header>

      <div className="px-4 pt-4 pb-20 space-y-6">
        {/* Hero */}
        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
            <Monitor className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold mb-0.5">OBS Studio 直播推流</h2>
            <p className="text-sm text-slate-300">适合知识授课类横屏直播，画质清晰稳定</p>
          </div>
        </div>

        {/* Steps */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">配置步骤</h2>
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={step.step} className="flex gap-3 p-4 bg-card border border-border rounded-xl">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                  {i < STEPS.length - 1 && <div className="w-0.5 flex-1 bg-border min-h-[16px]" />}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{step.desc}</p>
                  {step.action && (
                    <button className="flex items-center gap-1 text-xs text-primary font-medium">
                      {step.action} <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">推荐硬件配置</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {REQUIREMENTS.map((r, i) => (
              <div key={r.label} className={cn('flex items-center justify-between px-4 py-3 text-sm', i > 0 && 'border-t border-border')}>
                <span className="text-muted-foreground">{r.label}</span>
                <span className="text-foreground font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">常见问题</h2>
          <div className="space-y-3">
            {FAQ.map(f => (
              <div key={f.q} className="p-4 bg-card border border-border rounded-xl">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium flex-shrink-0">Q</span>
                  <p className="text-sm font-medium text-foreground">{f.q}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">A</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={() => router.push('/live/create')} className="w-full bg-primary hover:bg-primary/90 h-12 text-base">
          开始直播
        </Button>
      </div>
    </div>
  )
}
