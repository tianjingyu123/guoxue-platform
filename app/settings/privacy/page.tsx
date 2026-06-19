"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Eye, EyeOff, Users, MessageCircle, MapPin,
  Clock, Shield, UserX, Lock, Globe, Heart
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { BreadcrumbNav } from "@/components/common/breadcrumb-nav"

// 隐私设置项
interface PrivacySetting {
  id: string
  icon: React.ElementType
  title: string
  description: string
  type: "switch" | "select"
  value: boolean | string
  options?: { label: string; value: string }[]
}

export default function PrivacySettingsPage() {
  // 可见性设置
  const [showOnlineStatus, setShowOnlineStatus] = useState(true)
  const [showLastSeen, setShowLastSeen] = useState(true)
  const [showLocation, setShowLocation] = useState(false)
  const [showFavorites, setShowFavorites] = useState(true)
  const [showFollowing, setShowFollowing] = useState(true)
  
  // 互动设置
  const [whoCanMessage, setWhoCanMessage] = useState("everyone")
  const [whoCanComment, setWhoCanComment] = useState("everyone")
  const [whoCanSeeCircle, setWhoCanSeeCircle] = useState("members")
  
  // 其他设置
  const [recordHistory, setRecordHistory] = useState(true)
  const [personalizedRecommend, setPersonalizedRecommend] = useState(true)

  const messageOptions = [
    { label: "所有人", value: "everyone" },
    { label: "仅关注的人", value: "following" },
    { label: "关闭私信", value: "none" },
  ]

  const commentOptions = [
    { label: "所有人", value: "everyone" },
    { label: "仅关注的人", value: "following" },
    { label: "关闭评论", value: "none" },
  ]

  const circleOptions = [
    { label: "所有人可见", value: "everyone" },
    { label: "仅成员可见", value: "members" },
    { label: "仅自己可见", value: "private" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">隐私设置</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 面包屑导航 */}
        <BreadcrumbNav className="mb-2" />
        
        {/* 可见性设置 */}
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">个人信息可见性</span>
          </div>
          <div className="divide-y divide-border">
            <SettingRow
              icon={Globe}
              title="显示在线状态"
              description="其他用户可以看到您是否在线"
              checked={showOnlineStatus}
              onChange={setShowOnlineStatus}
            />
            <SettingRow
              icon={Clock}
              title="显示最后上线时间"
              description="其他用户可以看到您的最后活跃时间"
              checked={showLastSeen}
              onChange={setShowLastSeen}
            />
            <SettingRow
              icon={MapPin}
              title="显示位置信息"
              description="在内容中显示您的地理位置"
              checked={showLocation}
              onChange={setShowLocation}
            />
            <SettingRow
              icon={Heart}
              title="公开收藏夹"
              description="其他用户可以查看您的收藏内容"
              checked={showFavorites}
              onChange={setShowFavorites}
            />
            <SettingRow
              icon={Users}
              title="公开关注列表"
              description="其他用户可以查看您关注的人"
              checked={showFollowing}
              onChange={setShowFollowing}
            />
          </div>
        </Card>

        {/* 互动设置 */}
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">互动权限</span>
          </div>
          <div className="divide-y divide-border">
            <SelectRow
              icon={MessageCircle}
              title="谁可以私信我"
              value={whoCanMessage}
              options={messageOptions}
              onChange={setWhoCanMessage}
            />
            <SelectRow
              icon={MessageCircle}
              title="谁可以评论我"
              value={whoCanComment}
              options={commentOptions}
              onChange={setWhoCanComment}
            />
            <SelectRow
              icon={Users}
              title="我加入的圈子"
              value={whoCanSeeCircle}
              options={circleOptions}
              onChange={setWhoCanSeeCircle}
            />
          </div>
        </Card>

        {/* 黑名单 */}
        <Card className="overflow-hidden">
          <Link href="/settings/blacklist">
            <div className="px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <UserX className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">黑名单管理</p>
                  <p className="text-[10px] text-muted-foreground">已拉黑 3 人</p>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </div>
          </Link>
        </Card>

        {/* 其他隐私 */}
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">其他</span>
          </div>
          <div className="divide-y divide-border">
            <SettingRow
              icon={Clock}
              title="记录浏览历史"
              description="记录您浏览过的内容，方便回顾"
              checked={recordHistory}
              onChange={setRecordHistory}
            />
            <SettingRow
              icon={Eye}
              title="个性化推荐"
              description="基于您的兴趣推荐相关内容"
              checked={personalizedRecommend}
              onChange={setPersonalizedRecommend}
            />
          </div>
        </Card>

        {/* 提示 */}
        <p className="text-[10px] text-muted-foreground text-center px-4">
          隐私设置修改后立即生效，部分设置可能需要刷新页面查看效果
        </p>
      </div>
    </div>
  )
}

// 开关设置行
function SettingRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ElementType
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// 选择设置行
function SelectRow({
  icon: Icon,
  title,
  value,
  options,
  onChange,
}: {
  icon: React.ElementType
  title: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const currentLabel = options.find(o => o.value === value)?.label || ""

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <p className="text-sm font-medium">{title}</p>
        </div>
        <button 
          onClick={() => setOpen(!open)}
          className="text-xs text-muted-foreground flex items-center gap-1"
        >
          {currentLabel}
          <ArrowLeft className={cn("w-3 h-3 transition-transform", open ? "rotate-90" : "-rotate-90")} />
        </button>
      </div>
      {open && (
        <div className="mt-2 ml-11 flex flex-wrap gap-2">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs transition-colors",
                value === opt.value 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
