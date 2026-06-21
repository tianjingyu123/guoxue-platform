"use client"

import { useState } from "react"
import { ChevronRight, Smartphone, Lock, Shield, Eye, History, Bell, Moon, Type, Wifi, Trash2, FileText, Info } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ThemeSwitch } from "@/components/theme-switch"
import Link from "next/link"
import { cn } from "@/lib/utils"

// 设置项类型
type SettingItem = {
  icon: React.ElementType
  label: string
  type: "link" | "switch" | "select" | "action"
  value?: string | boolean
  options?: string[]
  action?: () => void
}

export default function SettingsPage() {
  // 账号安全
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  
  // 隐私设置
  const [showFavorites, setShowFavorites] = useState(true)
  const [recordHistory, setRecordHistory] = useState(true)
  
  // 通知设置
  const [pushEnabled, setPushEnabled] = useState(true)
  const [quietHours, setQuietHours] = useState("22:00-08:00")
  
  // 通用设置
  const [readingBg, setReadingBg] = useState("宣纸色")
  const [fontSize, setFontSize] = useState("中")
  const [autoPlay, setAutoPlay] = useState("仅Wi-Fi")
  
  // 缓存
  const [cacheSize] = useState("128.5MB")
  const [isClearing, setIsClearing] = useState(false)
  
  // 弹窗状态
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showSelectModal, setShowSelectModal] = useState<{
    title: string
    options: string[]
    current: string
    onSelect: (value: string) => void
  } | null>(null)

  const handleClearCache = () => {
    setIsClearing(true)
    setTimeout(() => {
      setIsClearing(false)
    }, 1500)
  }

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    // 执行退出登录逻辑
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between h-14 px-4">
  <BackButton fallbackPath="/profile" />
  <h1 className="font-semibold text-base text-foreground">设置</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {/* 账号与安全 */}
        <Card className="overflow-hidden bg-card">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">账号与安全</span>
          </div>
          <div className="divide-y divide-border">
            <SettingRow
              icon={Smartphone}
              label="手机号"
              value="138****8888"
              type="link"
              showArrow
            />
            <SettingRow
              icon={Lock}
              label="登录密码"
              value="修改"
              type="link"
              showArrow
            />
            <SettingRow
              icon={Shield}
              label="二次验证"
              type="switch"
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
            />
          </div>
        </Card>

        {/* 隐私设置 */}
        <Card className="overflow-hidden bg-card">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">隐私设置</span>
          </div>
          <div className="divide-y divide-border">
            <SettingRow
              icon={Eye}
              label="公开展示我的收藏"
              type="switch"
              checked={showFavorites}
              onCheckedChange={setShowFavorites}
            />
            <SettingRow
              icon={History}
              label="记录浏览历史"
              type="switch"
              checked={recordHistory}
              onCheckedChange={setRecordHistory}
            />
          </div>
        </Card>

        {/* 通知设置 */}
        <Card className="overflow-hidden bg-card">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">通知设置</span>
          </div>
          <div className="divide-y divide-border">
            <SettingRow
              icon={Bell}
              label="推送通知"
              type="switch"
              checked={pushEnabled}
              onCheckedChange={setPushEnabled}
            />
            <SettingRow
              icon={Moon}
              label="消息免打扰时段"
              value={quietHours}
              type="link"
              showArrow
              onClick={() => setShowSelectModal({
                title: "消息免打扰时段",
                options: ["关闭", "22:00-08:00", "23:00-07:00", "00:00-08:00"],
                current: quietHours,
                onSelect: setQuietHours
              })}
            />
          </div>
        </Card>

        {/* 外观主题 */}
        <Card className="overflow-hidden bg-card">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">外观主题</span>
          </div>
          <div className="px-4 py-3.5">
            <ThemeSwitch />
          </div>
        </Card>

        {/* 通用设置 */}
        <Card className="overflow-hidden bg-card">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">通用设置</span>
          </div>
          <div className="divide-y divide-border">
            <SettingRow
              icon={Eye}
              label="默认阅读背景"
              value={readingBg}
              type="link"
              showArrow
              onClick={() => setShowSelectModal({
                title: "默认阅读背景",
                options: ["宣纸色", "护眼黄", "夜间黑", "纯白"],
                current: readingBg,
                onSelect: setReadingBg
              })}
            />
            <SettingRow
              icon={Type}
              label="字体大小"
              value={fontSize}
              type="link"
              showArrow
              onClick={() => setShowSelectModal({
                title: "字体大小",
                options: ["小", "中", "大"],
                current: fontSize,
                onSelect: setFontSize
              })}
            />
            <SettingRow
              icon={Wifi}
              label="视频自动播放"
              value={autoPlay}
              type="link"
              showArrow
              onClick={() => setShowSelectModal({
                title: "视频自动播放",
                options: ["仅Wi-Fi", "始终", "关闭"],
                current: autoPlay,
                onSelect: setAutoPlay
              })}
            />
          </div>
        </Card>

        {/* 缓存管理 */}
        <Card className="overflow-hidden bg-card">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">缓存管理</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-sm text-foreground">缓存数据</span>
                <p className="text-xs text-muted-foreground mt-0.5">{isClearing ? "清理中..." : cacheSize}</p>
              </div>
            </div>
            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                isClearing
                  ? "bg-secondary text-muted-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              {isClearing ? "清理中" : "清理缓存"}
            </button>
          </div>
        </Card>

        {/* 关于我们 */}
        <Card className="overflow-hidden bg-card">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">关于我们</span>
          </div>
          <div className="divide-y divide-border">
            <SettingRow
              icon={FileText}
              label="用户协议"
              type="link"
              showArrow
            />
            <SettingRow
              icon={Shield}
              label="隐私政策"
              type="link"
              showArrow
            />
            <SettingRow
              icon={Info}
              label="版本号"
              value="v1.0.0"
              type="text"
            />
          </div>
        </Card>

        {/* 退出登录 */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3.5 text-center text-primary font-medium bg-card rounded-xl hover:bg-primary/5 transition-colors"
        >
          退出登录
        </button>
      </div>

      {/* 选择弹窗 */}
      {showSelectModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowSelectModal(null)}
          />
          <div className="relative w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="px-4 py-4 border-b border-border">
              <h3 className="font-semibold text-center text-foreground">{showSelectModal.title}</h3>
            </div>
            <div className="py-2">
              {showSelectModal.options.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    showSelectModal.onSelect(option)
                    setShowSelectModal(null)
                  }}
                  className={cn(
                    "w-full px-4 py-3.5 text-left text-sm transition-colors flex items-center justify-between",
                    option === showSelectModal.current
                      ? "text-primary bg-primary/5"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  {option}
                  {option === showSelectModal.current && (
                    <span className="text-primary">✓</span>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setShowSelectModal(null)}
                className="w-full py-3 text-center text-muted-foreground bg-secondary rounded-xl"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 退出确认弹窗 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative w-full max-w-sm bg-card rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <h3 className="font-semibold text-lg text-foreground">确认退出登录？</h3>
              <p className="text-sm text-muted-foreground mt-2">退出后将需要重新登录才能使用完整功能</p>
            </div>
            <div className="flex border-t border-border">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3.5 text-center text-foreground font-medium border-r border-border hover:bg-secondary transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3.5 text-center text-primary font-medium hover:bg-primary/5 transition-colors"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 设置项组件
function SettingRow({
  icon: Icon,
  label,
  value,
  type,
  checked,
  onCheckedChange,
  showArrow,
  onClick
}: {
  icon: React.ElementType
  label: string
  value?: string
  type: "link" | "switch" | "text" | "action"
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  showArrow?: boolean
  onClick?: () => void
}) {
  const content = (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {type === "switch" ? (
          <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
          />
        ) : (
          <>
            {value && (
              <span className="text-sm text-muted-foreground">{value}</span>
            )}
            {showArrow && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </>
        )}
      </div>
    </div>
  )

  if (type === "link" && onClick) {
    return (
      <button onClick={onClick} className="w-full hover:bg-secondary/50 transition-colors">
        {content}
      </button>
    )
  }

  if (type === "link" && !onClick) {
    return (
      <div className="hover:bg-secondary/50 transition-colors cursor-pointer">
        {content}
      </div>
    )
  }

  return content
}
