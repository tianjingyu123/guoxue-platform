"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Crown, Award, Star, Search, Check, Calendar,
  RotateCw, History, X, Info,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type LeaderRole = "dean" | "vice_dean" | "secretary"

const roleConfig: Record<LeaderRole, { label: string; color: string; bg: string; icon: typeof Crown; limit: string }> = {
  dean: { label: "院长", color: "text-amber-600", bg: "bg-amber-100", icon: Crown, limit: "1名" },
  vice_dean: { label: "副院长", color: "text-slate-500", bg: "bg-slate-100", icon: Award, limit: "若干名" },
  secretary: { label: "秘书长", color: "text-blue-600", bg: "bg-blue-100", icon: Star, limit: "1名或若干名" },
}

interface CurrentLeader {
  id: number
  name: string
  role: LeaderRole
  appointedAt: string
  termEnd: string
}

interface AppointHistory {
  id: number
  name: string
  role: LeaderRole
  term: string
  status: "active" | "expired"
}

const currentLeaders: CurrentLeader[] = [
  { id: 1, name: "张道玄", role: "dean", appointedAt: "2024-01-01", termEnd: "2024-12-31" },
  { id: 4, name: "陈太极", role: "vice_dean", appointedAt: "2024-01-01", termEnd: "2024-12-31" },
  { id: 2, name: "李易安", role: "secretary", appointedAt: "2024-01-01", termEnd: "2024-12-31" },
]

const candidates = [
  { id: 7, name: "孙易理", title: "梅花易数", contributions: 18 },
  { id: 8, name: "周天师", title: "面相手相", contributions: 16 },
  { id: 9, name: "吴玄真", title: "起名择日", contributions: 14 },
  { id: 10, name: "郑易心", title: "八字命理", contributions: 12 },
]

const history: AppointHistory[] = [
  { id: 1, name: "张道玄", role: "dean", term: "2024年度", status: "active" },
  { id: 2, name: "王明德", role: "dean", term: "2023年度", status: "expired" },
  { id: 3, name: "陈太极", role: "vice_dean", term: "2024年度", status: "active" },
  { id: 4, name: "刘玄机", role: "secretary", term: "2023年度", status: "expired" },
]

export default function InstituteAppointPage() {
  const [keyword, setKeyword] = useState("")
  const [selectedMember, setSelectedMember] = useState<typeof candidates[0] | null>(null)
  const [selectedRole, setSelectedRole] = useState<LeaderRole>("vice_dean")
  const [termEnd, setTermEnd] = useState("2025-12-31")
  const [showConfirm, setShowConfirm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [leaders, setLeaders] = useState(currentLeaders)
  const [revokeTarget, setRevokeTarget] = useState<CurrentLeader | null>(null)

  const filtered = candidates.filter(c => !keyword || c.name.includes(keyword) || c.title.includes(keyword))

  const handleAppoint = () => {
    if (!selectedMember) return
    setLeaders(prev => [
      ...prev,
      { id: selectedMember.id, name: selectedMember.name, role: selectedRole, appointedAt: new Date().toISOString().slice(0, 10), termEnd },
    ])
    setShowConfirm(false)
    setSelectedMember(null)
  }

  const handleRevoke = () => {
    if (!revokeTarget) return
    setLeaders(prev => prev.filter(l => !(l.id === revokeTarget.id && l.role === revokeTarget.role)))
    setRevokeTarget(null)
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-20 bg-operator text-white">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Link href="/mine/institute/admin" className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-medium">管理层任命</span>
          </div>
          <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 text-xs">
            <History className="w-4 h-4" />历史
          </button>
        </div>
      </header>

      {/* 说明 */}
      <div className="mx-4 mt-4 bg-blue-50 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          管理层由平台直接任命，每年轮岗一次。被任命者将在研究院内获得对应角色标签与荣誉，并参与年度岗位分红。
        </p>
      </div>

      {/* 现任管理层 */}
      <section className="px-4 mt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-operator" />
          现任管理层
          <span className="text-xs text-muted-foreground font-normal">（2024年度）</span>
        </h3>
        <div className="space-y-2">
          {leaders.map((l) => {
            const cfg = roleConfig[l.role]
            const Icon = cfg.icon
            return (
              <Card key={`${l.id}-${l.role}`} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-11 h-11">
                      <AvatarFallback className={cn(cfg.bg, cfg.color)}>{l.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-white")}>
                      <Icon className={cn("w-3 h-3", cfg.color)} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{l.name}</span>
                      <Badge className={cn("text-[10px]", cfg.bg, cfg.color)}>{cfg.label}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />任期至 {l.termEnd}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => setRevokeTarget(l)}>
                    撤销
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* 新任命 */}
      <section className="px-4 mt-6">
        <h3 className="font-semibold mb-3">发起新任命</h3>

        {/* 1. 选角色 */}
        <p className="text-xs text-muted-foreground mb-2">1. 选择角色</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(Object.keys(roleConfig) as LeaderRole[]).map((r) => {
            const cfg = roleConfig[r]
            const Icon = cfg.icon
            return (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                className={cn(
                  "p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                  selectedRole === r ? "border-operator bg-operator/5" : "border-border"
                )}
              >
                <Icon className={cn("w-5 h-5", cfg.color)} />
                <span className="text-xs font-medium">{cfg.label}</span>
                <span className="text-[10px] text-muted-foreground">{cfg.limit}</span>
              </button>
            )
          })}
        </div>

        {/* 2. 选成员 */}
        <p className="text-xs text-muted-foreground mb-2">2. 选择成员</p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索成员姓名或领域" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9" />
        </div>
        <div className="space-y-2 mb-4">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedMember(c)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                selectedMember?.id === c.id ? "border-operator bg-operator/5" : "border-border"
              )}
            >
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-operator/10 text-operator">{c.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">擅长{c.title} · 分享{c.contributions}次</p>
              </div>
              {selectedMember?.id === c.id && <Check className="w-5 h-5 text-operator" />}
            </button>
          ))}
        </div>

        {/* 3. 设任期 */}
        <p className="text-xs text-muted-foreground mb-2">3. 设置任期到期日（轮岗时间）</p>
        <Input type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} className="mb-4" />

        <Button
          className="w-full bg-operator hover:bg-operator/90"
          disabled={!selectedMember}
          onClick={() => setShowConfirm(true)}
        >
          确认任命
        </Button>
      </section>

      {/* 任命确认弹窗 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认任命</DialogTitle>
            <DialogDescription>任命结果经平台审核后生效，被任命者将收到通知</DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="py-2 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">成员</span><span>{selectedMember.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">任命角色</span><span className={roleConfig[selectedRole].color}>{roleConfig[selectedRole].label}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">任期至</span><span>{termEnd}</span></div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">取消</Button>
            <Button onClick={handleAppoint} className="flex-1 bg-operator hover:bg-operator/90">确认任命</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 撤销确认弹窗 */}
      <Dialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>撤销任命</DialogTitle>
            <DialogDescription>
              确认撤销 {revokeTarget?.name} 的{revokeTarget && roleConfig[revokeTarget.role].label}职务？该成员的角色标签将被移除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRevokeTarget(null)} className="flex-1">取消</Button>
            <Button onClick={handleRevoke} className="flex-1 bg-red-500 hover:bg-red-600">
              <X className="w-4 h-4 mr-1" />确认撤销
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 历史记录弹窗 */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>历史任命记录</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-80 overflow-y-auto">
            {history.map((h) => {
              const cfg = roleConfig[h.role]
              return (
                <div key={h.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className={cn(cfg.bg, cfg.color)}>{h.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{h.name}</span>
                      <Badge className={cn("text-[10px]", cfg.bg, cfg.color)}>{cfg.label}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{h.term}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", h.status === "active" ? "text-green-600 border-green-300" : "text-muted-foreground")}>
                    {h.status === "active" ? "在任" : "已卸任"}
                  </Badge>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
