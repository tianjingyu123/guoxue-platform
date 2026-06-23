'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Smartphone,
  Mail,
  CreditCard,
  Shield,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Key,
} from 'lucide-react'

interface SecurityItem {
  id: string
  icon: React.ReactNode
  iconBg: string
  label: string
  value?: string
  status?: 'set' | 'unset' | 'verified' | 'unverified'
  href: string
  danger?: boolean
}

const mockProfile = {
  phone: '138****8888',
  email: 'u***@example.com',
  passwordUpdatedAt: '2024-09-15',
  payPasswordSet: true,
  realNameVerified: true,
  realName: '张*明',
}

export default function SecurityPage() {
  const router = useRouter()
  const [showDeactivateSheet, setShowDeactivateSheet] = useState(false)

  const loginItems: SecurityItem[] = [
    {
      id: 'password',
      icon: <Key size={18} className="text-white" />,
      iconBg: 'bg-blue-500',
      label: '登录密码',
      value: `上次修改 ${mockProfile.passwordUpdatedAt}`,
      status: 'set',
      href: '/mine/security/change-password',
    },
    {
      id: 'phone',
      icon: <Smartphone size={18} className="text-white" />,
      iconBg: 'bg-green-500',
      label: '手机号码',
      value: mockProfile.phone,
      status: 'set',
      href: '/mine/security/change-phone',
    },
    {
      id: 'email',
      icon: <Mail size={18} className="text-white" />,
      iconBg: 'bg-orange-500',
      label: '邮箱绑定',
      value: mockProfile.email || undefined,
      status: mockProfile.email ? 'set' : 'unset',
      href: '/mine/security/bind-email',
    },
  ]

  const paymentItems: SecurityItem[] = [
    {
      id: 'pay-password',
      icon: <CreditCard size={18} className="text-white" />,
      iconBg: 'bg-purple-500',
      label: '支付密码',
      status: mockProfile.payPasswordSet ? 'set' : 'unset',
      href: '/mine/security/pay-password',
    },
    {
      id: 'real-name',
      icon: <Shield size={18} className="text-white" />,
      iconBg: 'bg-[#C41E3A]',
      label: '实名认证',
      value: mockProfile.realNameVerified ? mockProfile.realName : undefined,
      status: mockProfile.realNameVerified ? 'verified' : 'unverified',
      href: '/mine/security/real-name',
    },
  ]

  const deviceItems: SecurityItem[] = [
    {
      id: 'devices',
      icon: <Monitor size={18} className="text-white" />,
      iconBg: 'bg-slate-500',
      label: '登录设备管理',
      value: '2 台设备已登录',
      href: '/mine/security/devices',
    },
  ]

  const renderStatusTag = (status?: SecurityItem['status'], value?: string) => {
    if (status === 'set' || status === 'verified') {
      return (
        <div className="flex items-center gap-1.5">
          {value && <span className="text-sm text-muted-foreground">{value}</span>}
          <span className="inline-flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
            <CheckCircle size={10} />
            {status === 'verified' ? '已认证' : '已设置'}
          </span>
        </div>
      )
    }
    if (status === 'unset' || status === 'unverified') {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
          <XCircle size={10} />
          {status === 'unverified' ? '未认证' : '未设置'}
        </span>
      )
    }
    if (value) {
      return <span className="text-sm text-muted-foreground">{value}</span>
    }
    return null
  }

  const renderGroup = (title: string, items: SecurityItem[]) => (
    <section className="mb-4">
      <h2 className="text-xs text-muted-foreground px-4 py-2 font-medium tracking-wide uppercase">
        {title}
      </h2>
      <div className="bg-card mx-4 rounded-2xl overflow-hidden shadow-sm divide-y divide-border/60">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(item.href)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
          >
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
              {item.icon}
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
            <div className="flex items-center gap-1.5">
              {renderStatusTag(item.status, item.value)}
              <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </section>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5] font-sans">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center h-14 px-4 gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted/60 transition-colors"
          >
            <ChevronLeft size={22} className="text-foreground" />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold text-foreground font-serif">
            账号安全
          </h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 安全评分卡片 */}
      <div className="mx-4 mt-4 mb-2">
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs mb-1">账号安全评分</p>
              <div className="flex items-end gap-1.5">
                <span className="text-3xl font-bold text-[#C9A96E]">82</span>
                <span className="text-white/60 text-sm mb-0.5">/ 100</span>
              </div>
              <p className="text-white/70 text-xs mt-1">安全级别：良好，建议完善实名认证</p>
            </div>
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke="#C9A96E" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 28 * 0.82} ${2 * Math.PI * 28}`}
                  strokeLinecap="round"
                />
              </svg>
              <Shield size={22} className="absolute inset-0 m-auto text-[#C9A96E]" />
            </div>
          </div>
          {/* 安全项状态指示 */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
            {[
              { label: '密码', done: true },
              { label: '手机', done: true },
              { label: '邮箱', done: true },
              { label: '支付', done: mockProfile.payPasswordSet },
              { label: '实名', done: mockProfile.realNameVerified },
            ].map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-0.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.done ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                  {item.done
                    ? <CheckCircle size={12} className="text-green-400" />
                    : <XCircle size={12} className="text-orange-400" />
                  }
                </div>
                <span className="text-white/50 text-[10px]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pb-8">
        {renderGroup('登录安全', loginItems)}
        {renderGroup('支付安全', paymentItems)}
        {renderGroup('设备管理', deviceItems)}

        {/* 账号注销 */}
        <section className="mb-4">
          <h2 className="text-xs text-muted-foreground px-4 py-2 font-medium tracking-wide uppercase">
            账号管理
          </h2>
          <div className="bg-card mx-4 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setShowDeactivateSheet(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50/60 active:bg-red-50 transition-colors text-left"
            >
              <span className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-500">注销账号</p>
                <p className="text-xs text-muted-foreground mt-0.5">注销后所有数据将被永久删除，不可恢复</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
            </button>
          </div>
        </section>

        {/* 安全提示 */}
        <div className="mx-4 bg-amber-50 border border-amber-200/60 rounded-2xl p-4">
          <div className="flex gap-2">
            <Lock size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">安全提示</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                平台工作人员绝不会索要您的账号密码或支付密码，请注意防范钓鱼欺诈，保护账号安全。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 注销确认弹窗 */}
      {showDeactivateSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeactivateSheet(false)} />
          <div className="relative w-full bg-card rounded-t-3xl px-5 pt-5 pb-safe-bottom">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground font-serif mb-1">确认注销账号？</h3>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                注销账号后，以下数据将被永久删除且无法恢复：
              </p>
            </div>
            <ul className="space-y-2 mb-6">
              {['个人资料、头像及所有内容', '圈子成员资格及圈主权限', '课程购买记录及学习进度', '钱包余额及积分将作废', '问答记录及悬赏奖励'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeactivateSheet(false)}
                className="flex-1 h-12 rounded-xl bg-muted text-foreground font-medium text-sm hover:bg-muted/80 transition-colors"
              >
                再想想
              </button>
              <button
                onClick={() => {
                  setShowDeactivateSheet(false)
                  router.push('/mine/delete-account')
                }}
                className="flex-1 h-12 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors"
              >
                继续注销
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3 pb-2">
              注销流程需要验证身份并等待7天冷静期
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
