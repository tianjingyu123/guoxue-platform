"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Zap, Wrench, Shield, Clock, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { getLatestUpgradeNotice, markUpgradeNoticeRead, getUpgradeItemLabel } from "@/lib/api/notice"
import type { UpgradeNotice, UpgradeItem, UpgradeItemType } from "@/lib/types/notice"

// 图标映射
const iconMap: Record<UpgradeItemType, React.ReactNode> = {
  feature: <Sparkles className="w-4 h-4" />,
  optimization: <Zap className="w-4 h-4" />,
  fix: <Wrench className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
}

// 颜色映射
const colorMap: Record<UpgradeItemType, { text: string; bg: string }> = {
  feature: { text: 'text-primary', bg: 'bg-primary/10' },
  optimization: { text: 'text-blue-600', bg: 'bg-blue-50' },
  fix: { text: 'text-green-600', bg: 'bg-green-50' },
  security: { text: 'text-amber-600', bg: 'bg-amber-50' },
}

// 升级项组件
function UpgradeItemCard({ item }: { item: UpgradeItem }) {
  const colors = colorMap[item.type]
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", colors.bg, colors.text)}>
        {iconMap[item.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
        )}
      </div>
    </div>
  )
}

// 升级项分组组件
function UpgradeSection({ 
  title, 
  items, 
  type 
}: { 
  title: string
  items: UpgradeItem[]
  type: UpgradeItemType 
}) {
  if (items.length === 0) return null
  const colors = colorMap[type]
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-6 h-6 rounded flex items-center justify-center", colors.bg, colors.text)}>
          {iconMap[type]}
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <span className={cn("text-xs px-1.5 py-0.5 rounded", colors.bg, colors.text)}>
          {items.length}
        </span>
      </div>
      <div className="space-y-1 pl-2">
        {items.map((item, index) => (
          <UpgradeItemCard key={index} item={item} />
        ))}
      </div>
    </div>
  )
}

export default function UpgradeNoticePage() {
  const router = useRouter()
  const [notice, setNotice] = useState<UpgradeNotice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [countdown, setCountdown] = useState(0)
  const [canClose, setCanClose] = useState(false)

  // 加载升级公告
  useEffect(() => {
    async function loadNotice() {
      try {
        const response = await getLatestUpgradeNotice()
        if (response.code === 200 && response.data) {
          setNotice(response.data)
          // 如果是强制模式，设置倒计时
          if (response.data.mode === 'forced' && response.data.forcedCountdown) {
            setCountdown(response.data.forcedCountdown)
            setCanClose(false)
          } else {
            setCanClose(true)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadNotice()
  }, [])

  // 倒计时逻辑
  useEffect(() => {
    if (countdown <= 0) {
      setCanClose(true)
      return
    }
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanClose(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [countdown])

  // 关闭处理
  const handleClose = useCallback(async () => {
    if (!canClose || !notice) return
    
    await markUpgradeNoticeRead(notice.id)
    router.back()
  }, [canClose, notice, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-lg text-muted-foreground mb-6">暂无新版本公告</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm"
        >
          返回
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-primary/5 to-background">
      {/* 顶部装饰背景 */}
      <div className="relative h-48 overflow-hidden">
        {/* 装饰图案 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-20 h-20 border-2 border-primary rounded-full" />
          <div className="absolute top-12 right-8 w-12 h-12 border border-primary rounded-full" />
          <div className="absolute bottom-8 left-1/4 w-8 h-8 bg-primary rounded-full" />
          <div className="absolute top-20 right-1/3 w-6 h-6 bg-primary/50 rounded-full" />
        </div>
        
        {/* Logo和版本 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">热卜</span>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">版本更新</p>
            <p className="text-2xl font-bold text-primary">v{notice.version}</p>
            {notice.versionName && (
              <p className="text-sm text-muted-foreground mt-1">{notice.versionName}</p>
            )}
          </div>
        </div>
        
        {/* 关闭按钮（非强制模式或倒计时结束） */}
        {canClose ? (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        ) : (
          <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
            <span className="text-sm font-medium text-foreground">{countdown}</span>
          </div>
        )}
      </div>

      {/* 主要内容区 */}
      <div className="px-4 pb-24 -mt-6">
        <div className="bg-card rounded-2xl shadow-lg p-5">
          {/* 标题 */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-foreground mb-2">{notice.title}</h1>
            {notice.subtitle && (
              <p className="text-sm text-muted-foreground">{notice.subtitle}</p>
            )}
          </div>

          {/* 维护时间提示 */}
          {notice.maintenanceStart && notice.maintenanceEnd && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <div className="flex items-center gap-2 text-amber-700">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">系统维护时间</span>
              </div>
              <p className="text-sm text-amber-600 mt-1 pl-6">
                {notice.maintenanceStart} ~ {notice.maintenanceEnd}
              </p>
              <p className="text-xs text-amber-500 mt-1 pl-6">
                维护期间部分功能可能无法使用，请提前做好准备
              </p>
            </div>
          )}

          {/* 新功能 */}
          <UpgradeSection
            title="新功能"
            items={notice.features}
            type="feature"
          />

          {/* 优化 */}
          <UpgradeSection
            title="体验优化"
            items={notice.optimizations}
            type="optimization"
          />

          {/* 修复 */}
          <UpgradeSection
            title="问题修复"
            items={notice.fixes}
            type="fix"
          />

          {/* 发布时间 */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              发布于 {notice.publishedAt}
            </p>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={handleClose}
          disabled={!canClose}
          className={cn(
            "w-full py-3.5 rounded-full text-base font-medium flex items-center justify-center gap-2 transition-all",
            canClose
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {canClose ? (
            <>
              <Check className="w-5 h-5" />
              我知道了
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              请等待 {countdown} 秒
            </>
          )}
        </button>
      </div>
    </div>
  )
}
