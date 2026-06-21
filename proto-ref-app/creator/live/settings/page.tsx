"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Bell, Shield, Video, Wallet, ChevronRight, Upload, Loader2
} from "lucide-react"
import { Input } from "@/components/ui/input"

const notifyKeys = [
  { key: "newViewer", label: "新观众进入", desc: "有新观众进入直播间时通知" },
  { key: "reward", label: "打赏提醒", desc: "收到打赏时通知" },
  { key: "comment", label: "评论提醒", desc: "新评论时通知" },
  { key: "order", label: "带货成交", desc: "带货商品成交时通知" },
]

const privacyKeys = [
  { key: "allowComment", label: "允许评论", desc: "观众可在直播中发表评论" },
  { key: "allowGift", label: "允许打赏", desc: "观众可在直播中打赏" },
  { key: "showViewCount", label: "显示观看人数", desc: "在直播间展示观看人数" },
  { key: "autoRecord", label: "自动录制回放", desc: "直播结束后自动生成回放" },
]

export default function LiveSettingsPage() {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    name: "国学命理讲堂",
    desc: "专注八字、紫微、奇门等传统命理学的讲解与传播",
    cover: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&q=80",
  })
  const [notify, setNotify] = useState({
    newViewer: true,
    reward: true,
    comment: false,
    order: true,
  })
  const [privacy, setPrivacy] = useState({
    allowComment: true,
    allowGift: true,
    showViewCount: true,
    autoRecord: true,
  })

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center px-4 h-12">
          <button onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-semibold ml-3 text-foreground">直播设置</h1>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* 直播间信息 */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">直播间信息</p>
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            {/* 封面 */}
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile.cover} alt="" className="w-full h-full object-cover" />
                </div>
                <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Upload className="w-3 h-3 text-primary-foreground" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">直播间封面</p>
                <p className="text-xs text-muted-foreground">建议 16:9 比例，不超过 2MB</p>
              </div>
            </div>

            {/* 名称 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">直播间名称</label>
              <Input
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                className="bg-background"
              />
            </div>

            {/* 简介 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">直播间简介</label>
                <span className="text-xs text-muted-foreground">{profile.desc.length}/100</span>
              </div>
              <textarea
                value={profile.desc}
                onChange={e => setProfile(p => ({ ...p, desc: e.target.value.slice(0, 100) }))}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </section>

        {/* 通知设置 */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">通知设置</p>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {notifyKeys.map(n => (
              <div key={n.key} className="flex items-center justify-between p-4">
                <div className="flex items-start gap-2.5">
                  <Bell className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotify(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof prev] }))}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3",
                    notify[n.key as keyof typeof notify] ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-all",
                    notify[n.key as keyof typeof notify] ? "right-0.5" : "left-0.5"
                  )} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 隐私与互动 */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">隐私与互动</p>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {privacyKeys.map(p => (
              <div key={p.key} className="flex items-center justify-between p-4">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPrivacy(prev => ({ ...prev, [p.key]: !prev[p.key as keyof typeof prev] }))}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3",
                    privacy[p.key as keyof typeof privacy] ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-all",
                    privacy[p.key as keyof typeof privacy] ? "right-0.5" : "left-0.5"
                  )} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 快捷入口 */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">更多设置</p>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            <button onClick={() => router.push("/creator/live/team")} className="flex items-center justify-between w-full p-4">
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">团队管理</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => router.push("/creator/live/earnings")} className="flex items-center justify-between w-full p-4">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">收益设置</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </section>
      </div>

      {/* 固定保存按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="p-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2",
              saved ? "bg-chart-4 text-primary-foreground" : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saved ? "已保存" : saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </div>
      <div className="h-20" />
    </div>
  )
}
