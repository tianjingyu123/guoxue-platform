'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, Ban } from 'lucide-react'

const allowed = [
  '分享原创命理知识和学习心得',
  '提出有建设性的命理问题和讨论',
  '分享真实的学习经历和体验',
  '参与友好的国学文化交流',
  '尊重他人，文明互动',
]

const prohibited = [
  '发布封建迷信、宣扬不科学内容',
  '对他人进行人身攻击或辱骂',
  '未经授权转载他人内容',
  '发布广告、营销或诈骗信息',
  '散布谣言或虚假信息',
  '涉及政治敏感话题',
  '发布色情、暴力等违规内容',
]

const punishments = [
  { level: '一级',   color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', desc: '口头警告，提醒规范行为' },
  { level: '二级',   color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', desc: '删除违规内容，限制发言 24 小时' },
  { level: '三级',   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    desc: '禁言 7 天，扣除积分' },
  { level: '封号',   color: 'text-gray-100',   bg: 'bg-gray-700',  border: 'border-gray-600',   desc: '情节严重者永久封禁账号' },
]

export default function CommunityRulesPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">社区规范</h1>
      </header>

      <div className="px-4 py-6 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">社区规范</h2>
            <p className="text-xs text-muted-foreground">维护健康的国学文化交流环境</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          儒布社区是国学爱好者学习与交流的家园。为维护良好的社区环境，请所有成员遵守以下规范。
        </p>

        {/* Allowed */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-foreground">鼓励的行为</h3>
          </div>
          <div className="space-y-2">
            {allowed.map(item => (
              <div key={item} className="flex items-start gap-2.5 p-2.5 bg-green-50 border border-green-100 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prohibited */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Ban className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">禁止的行为</h3>
          </div>
          <div className="space-y-2">
            {prohibited.map(item => (
              <div key={item} className="flex items-start gap-2.5 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                <Ban className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Punishment */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-foreground">违规处理</h3>
          </div>
          <div className="space-y-2">
            {punishments.map(p => (
              <div key={p.level} className={`flex items-center gap-3 p-3 rounded-xl border ${p.bg} ${p.border}`}>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${p.bg} ${p.color} border ${p.border} flex-shrink-0`}>
                  {p.level}
                </span>
                <p className={`text-sm ${p.level === '封号' ? 'text-gray-100' : 'text-foreground'}`}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          遇到违规内容，请使用举报功能。感谢您共同维护社区环境。
        </p>
      </div>
    </div>
  )
}
