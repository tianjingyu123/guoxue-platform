'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Shield, Lock, Phone, CreditCard, Trash2,
  Bell, BookOpen, Radio, MessageSquare, Settings2,
  EyeOff, UserX, Eye, History, HardDrive, Type, Moon,
  HelpCircle, Info, LogOut, Check
} from 'lucide-react'

interface SwitchItem {
  key: string
  label: string
  icon: React.ReactNode
  value: boolean
}

interface SelectItem {
  key: string
  label: string
  icon: React.ReactNode
  value: string
  options: { label: string; value: string }[]
}

export default function SettingsPage() {
  const router = useRouter()

  // 通知开关
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    message: true,
    course: true,
    live: false,
    interact: true,
    system: true,
  })

  // 通用设置
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [darkMode, setDarkMode] = useState<'system' | 'light' | 'dark'>('system')
  const [cacheSize] = useState('47.3 MB')

  // 隐私设置
  const [collectVisible, setCollectVisible] = useState<'public' | 'friends' | 'private'>('public')
  const [historyVisible, setHistoryVisible] = useState(true)

  // 弹窗
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false)
  const [showFontDialog, setShowFontDialog] = useState(false)
  const [showDarkDialog, setShowDarkDialog] = useState(false)
  const [showCollectDialog, setShowCollectDialog] = useState(false)

  const [cacheCleared, setCacheCleared] = useState(false)

  const handleClearCache = () => {
    setCacheCleared(true)
    setShowClearCacheDialog(false)
    setTimeout(() => setCacheCleared(false), 3000)
  }

  const handleLogout = () => {
    setShowLogoutDialog(false)
    router.push('/login')
  }

  const collectOptions = [
    { label: '公开', value: 'public' },
    { label: '仅好友', value: 'friends' },
    { label: '仅自己', value: 'private' },
  ]
  const fontOptions = [
    { label: '小', value: 'small' },
    { label: '中（推荐）', value: 'medium' },
    { label: '大', value: 'large' },
  ]
  const darkOptions = [
    { label: '跟随系统', value: 'system' },
    { label: '浅色模式', value: 'light' },
    { label: '深色模式', value: 'dark' },
  ]

  const notifItems: SwitchItem[] = [
    { key: 'message', label: '新消息通知', icon: <Bell size={18} />, value: notifications.message },
    { key: 'course', label: '课程提醒', icon: <BookOpen size={18} />, value: notifications.course },
    { key: 'live', label: '直播提醒', icon: <Radio size={18} />, value: notifications.live },
    { key: 'interact', label: '互动提醒', icon: <MessageSquare size={18} />, value: notifications.interact },
    { key: 'system', label: '系统通知', icon: <Settings2 size={18} />, value: notifications.system },
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-[#2C2C2C]">
            <ChevronLeft size={22} />
          </button>
          <h1 className="flex-1 text-center font-semibold text-[#2C2C2C] font-serif">设置</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pb-8 space-y-4 pt-4">

        {/* 账号安全 */}
        <Section title="账号安全">
          <RowLink icon={<Shield size={18} className="text-[#C41E3A]" />} label="账号安全中心" badge="安全分 82" badgeColor="text-amber-600" onClick={() => router.push('/mine/security')} />
          <RowLink icon={<Lock size={18} className="text-[#666]" />} label="修改密码" sub="上次修改：30天前" onClick={() => router.push('/mine/change-password')} />
          <RowLink icon={<Phone size={18} className="text-[#666]" />} label="修改手机号" sub="138****8888" onClick={() => router.push('/mine/change-phone')} />
          <RowLink icon={<CreditCard size={18} className="text-[#666]" />} label="支付密码" sub="已设置" onClick={() => router.push('/mine/payment-password')} />
          <RowLink
            icon={<Trash2 size={18} className="text-red-500" />}
            label="账号注销"
            labelColor="text-red-500"
            hideCaret
            onClick={() => router.push('/mine/delete-account')}
          />
        </Section>

        {/* 通知设置 */}
        <Section title="通知设置">
          {notifItems.map((item, i) => (
            <div
              key={item.key}
              className={`flex items-center gap-3 px-4 py-3.5 bg-white ${i < notifItems.length - 1 ? 'border-b border-[#E8E3DB]' : ''}`}
            >
              <span className="text-[#999]">{item.icon}</span>
              <span className="flex-1 text-[#2C2C2C] text-sm">{item.label}</span>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${item.value ? 'bg-[#C41E3A]' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.value ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </Section>

        {/* 隐私设置 */}
        <Section title="隐私设置">
          <RowLink icon={<UserX size={18} className="text-[#666]" />} label="黑名单管理" onClick={() => router.push('/mine/blacklist')} />
          <RowLink
            icon={<Eye size={18} className="text-[#666]" />}
            label="谁可以看我的收藏"
            sub={collectOptions.find(o => o.value === collectVisible)?.label}
            onClick={() => setShowCollectDialog(true)}
          />
          <div className="flex items-center gap-3 px-4 py-3.5 bg-white">
            <EyeOff size={18} className="text-[#999]" />
            <span className="flex-1 text-[#2C2C2C] text-sm">浏览记录可见</span>
            <button
              onClick={() => setHistoryVisible(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${historyVisible ? 'bg-[#C41E3A]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${historyVisible ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <RowLink icon={<History size={18} className="text-[#666]" />} label="清除浏览历史" onClick={() => {}} />
        </Section>

        {/* 通用 */}
        <Section title="通用">
          <RowLink
            icon={<HardDrive size={18} className="text-[#666]" />}
            label="清除缓存"
            sub={cacheCleared ? '已清除' : cacheSize}
            subColor={cacheCleared ? 'text-green-500' : 'text-[#999]'}
            hideCaret={false}
            onClick={() => setShowClearCacheDialog(true)}
          />
          <RowLink
            icon={<Type size={18} className="text-[#666]" />}
            label="字体大小"
            sub={fontOptions.find(o => o.value === fontSize)?.label}
            onClick={() => setShowFontDialog(true)}
          />
          <RowLink
            icon={<Moon size={18} className="text-[#666]" />}
            label="深色模式"
            sub={darkOptions.find(o => o.value === darkMode)?.label}
            onClick={() => setShowDarkDialog(true)}
          />
        </Section>

        {/* 其他 */}
        <Section title="其他">
          <RowLink icon={<HelpCircle size={18} className="text-[#666]" />} label="帮助与反馈" onClick={() => router.push('/feedback')} />
          <RowLink icon={<Info size={18} className="text-[#666]" />} label="关于我们" sub="v3.2.1" onClick={() => router.push('/about')} />
        </Section>

        {/* 退出登录 */}
        <div className="px-4">
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full py-3.5 bg-white rounded-2xl text-red-500 font-medium text-sm shadow-sm active:scale-98 transition-transform"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 退出登录弹窗 */}
      {showLogoutDialog && (
        <Dialog onClose={() => setShowLogoutDialog(false)}>
          <p className="text-[#2C2C2C] font-semibold text-base text-center">确认退出登录？</p>
          <p className="text-[#999] text-sm text-center mt-1">退出后需重新登录才能使用完整功能</p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowLogoutDialog(false)} className="flex-1 py-2.5 rounded-xl border border-[#E8E3DB] text-[#666] text-sm">取消</button>
            <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">退出登录</button>
          </div>
        </Dialog>
      )}

      {/* 清除缓存弹窗 */}
      {showClearCacheDialog && (
        <Dialog onClose={() => setShowClearCacheDialog(false)}>
          <p className="text-[#2C2C2C] font-semibold text-base text-center">清除缓存</p>
          <p className="text-[#999] text-sm text-center mt-1">将清除 <span className="text-[#C41E3A] font-medium">{cacheSize}</span> 的缓存数据</p>
          <p className="text-[#999] text-xs text-center mt-1">不影响账号数据和下载内容</p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowClearCacheDialog(false)} className="flex-1 py-2.5 rounded-xl border border-[#E8E3DB] text-[#666] text-sm">取消</button>
            <button onClick={handleClearCache} className="flex-1 py-2.5 rounded-xl bg-[#C41E3A] text-white text-sm font-medium">确认清除</button>
          </div>
        </Dialog>
      )}

      {/* 字体大小弹窗 */}
      {showFontDialog && (
        <OptionDialog
          title="字体大小"
          options={fontOptions}
          value={fontSize}
          onChange={(v) => setFontSize(v as typeof fontSize)}
          onClose={() => setShowFontDialog(false)}
        />
      )}

      {/* 深色模式弹窗 */}
      {showDarkDialog && (
        <OptionDialog
          title="深色模式"
          options={darkOptions}
          value={darkMode}
          onChange={(v) => setDarkMode(v as typeof darkMode)}
          onClose={() => setShowDarkDialog(false)}
        />
      )}

      {/* 收藏可见性弹窗 */}
      {showCollectDialog && (
        <OptionDialog
          title="谁可以看我的收藏"
          options={collectOptions}
          value={collectVisible}
          onChange={(v) => setCollectVisible(v as typeof collectVisible)}
          onClose={() => setShowCollectDialog(false)}
        />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-4 mb-2 text-xs text-[#999] font-medium">{title}</p>
      <div className="bg-white divide-y divide-[#E8E3DB] overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function RowLink({
  icon, label, sub, labelColor, subColor, badge, badgeColor, hideCaret = false, onClick
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  labelColor?: string
  subColor?: string
  badge?: string
  badgeColor?: string
  hideCaret?: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[#FAF8F5] transition-colors">
      <span className="text-[#999]">{icon}</span>
      <span className={`flex-1 text-sm ${labelColor || 'text-[#2C2C2C]'}`}>{label}</span>
      {badge && <span className={`text-xs ${badgeColor || 'text-[#999]'}`}>{badge}</span>}
      {sub && <span className={`text-xs ${subColor || 'text-[#999]'}`}>{sub}</span>}
      {!hideCaret && <ChevronRight size={16} className="text-[#C9A96E] shrink-0" />}
    </button>
  )
}

function Dialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 pb-8"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function OptionDialog({
  title, options, value, onChange, onClose
}: {
  title: string
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-center text-sm text-[#999] py-3 border-b border-[#E8E3DB]">{title}</p>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { onChange(opt.value); onClose() }}
            className="w-full flex items-center justify-between px-6 py-4 border-b border-[#E8E3DB] last:border-0 active:bg-[#FAF8F5]"
          >
            <span className={`text-sm ${value === opt.value ? 'text-[#C41E3A] font-medium' : 'text-[#2C2C2C]'}`}>{opt.label}</span>
            {value === opt.value && <Check size={16} className="text-[#C41E3A]" />}
          </button>
        ))}
        <button onClick={onClose} className="w-full py-4 text-sm text-[#999] mt-1 border-t-4 border-[#FAF8F5]">
          取消
        </button>
      </div>
    </div>
  )
}
