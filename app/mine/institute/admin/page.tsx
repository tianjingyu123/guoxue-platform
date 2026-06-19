"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Users, TrendingUp, Calendar, Wallet, 
  Search, Check, X, Clock, AlertTriangle, ChevronRight,
  UserCheck, UserX, Star, Award, Settings
} from "lucide-react"

// 管理层数据
const adminData = {
  role: "院长",
  name: "张道源",
  stats: {
    totalMembers: 128,
    pendingApprovals: 5,
    monthlyActivities: 12,
    totalIncome: 1280000,
    monthIncome: 86000,
    pendingRefunds: 3,
  }
}

// 待审核申请
const pendingApprovals = [
  { id: 1, name: "李明轩", avatar: "", applyTime: "2024-03-15", circleName: "紫微研习社", circleMembers: 256, reason: "深耕紫微斗数研究10年" },
  { id: 2, name: "王德华", avatar: "", applyTime: "2024-03-14", circleName: "风水堪舆圈", circleMembers: 189, reason: "希望与同行交流切磋" },
  { id: 3, name: "陈易卿", avatar: "", applyTime: "2024-03-13", circleName: "易经占卜社", circleMembers: 312, reason: "愿为平台贡献师资力量" },
]

// 保证金退还申请
const refundApprovals = [
  { id: 1, name: "赵启明", avatar: "", applyTime: "2024-03-10", taskCompletion: 100, amount: 10000 },
  { id: 2, name: "钱学礼", avatar: "", applyTime: "2024-03-08", taskCompletion: 95, amount: 10000 },
]

// 成员列表
const memberList = [
  { id: 1, name: "李明轩", avatar: "", role: "member", joinTime: "2024-01-15", taskProgress: 85, expiryDays: 280 },
  { id: 2, name: "王德华", avatar: "", role: "vice_dean", joinTime: "2023-06-20", taskProgress: 100, expiryDays: 120 },
  { id: 3, name: "陈易卿", avatar: "", role: "member", joinTime: "2024-02-01", taskProgress: 60, expiryDays: 320 },
  { id: 4, name: "周文昌", avatar: "", role: "secretary", joinTime: "2023-03-10", taskProgress: 100, expiryDays: 45 },
]

// 收益分配规则与可分配金额
const distributableAmount = 86000
const distributionRules = [
  { label: "平台", pct: 50 },
  { label: "研究院运营", pct: 30 },
  { label: "管理层分红", pct: 10 },
  { label: "优秀老师奖励", pct: 10 },
]

// 活动排期
const scheduledActivities = [
  { id: 1, month: "3月", day: "18", title: "八字命理进阶专题讲座", type: "线上直播", speaker: "张道玄", time: "20:00", enrolled: 326, status: "报名中" },
  { id: 2, month: "3月", day: "25", title: "风水堪舆线下交流会", type: "线下交流", speaker: "王明德", time: "14:00", enrolled: 48, status: "报名中" },
  { id: 3, month: "3月", day: "12", title: "紫微斗数实战答疑", type: "线上直播", speaker: "李易安", time: "19:30", enrolled: 215, status: "进行中" },
  { id: 4, month: "2月", day: "28", title: "年度国学文化大会", type: "大型活动", speaker: "研究院", time: "09:00", enrolled: 580, status: "已结束" },
]

const tabs = [
  { id: "overview", label: "概览" },
  { id: "approvals", label: "申请审核" },
  { id: "members", label: "成员管理" },
  { id: "activities", label: "活动管理" },
  { id: "finance", label: "财务管理" },
]

const roleLabels: Record<string, { label: string; color: string }> = {
  dean: { label: "院长", color: "bg-amber-500 text-white" },
  vice_dean: { label: "副院长", color: "bg-slate-400 text-white" },
  secretary: { label: "秘书长", color: "bg-blue-500 text-white" },
  member: { label: "成员", color: "bg-muted text-muted-foreground" },
}

export default function InstituteAdminPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [showDistributeDialog, setShowDistributeDialog] = useState(false)
  const [distributed, setDistributed] = useState(false)

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-operator text-white">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Link href="/mine/institute" className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-medium">研究院管理后台</span>
          </div>
          <Badge className="bg-white/20 text-white border-0">{adminData.role}</Badge>
        </div>
      </header>

      {/* 数据概览卡片 */}
      <div className="px-4 py-4 bg-gradient-to-b from-operator to-operator/80">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{adminData.stats.totalMembers}</p>
            <p className="text-[10px] text-white/70">总成员</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{adminData.stats.pendingApprovals}</p>
            <p className="text-[10px] text-white/70">待审核</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{adminData.stats.monthlyActivities}</p>
            <p className="text-[10px] text-white/70">本月活动</p>
          </div>
        </div>
        <div className="mt-3 bg-white/10 backdrop-blur rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/70">研究院总收入</p>
              <p className="text-xl font-bold text-white">¥{(adminData.stats.totalIncome / 10000).toFixed(1)}万</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/70">本月收入</p>
              <p className="text-lg font-medium text-white">+¥{adminData.stats.monthIncome.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="sticky top-12 z-40 bg-background border-b border-border">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "text-operator border-operator"
                  : "text-muted-foreground border-transparent"
              )}
            >
              {tab.label}
              {tab.id === "approvals" && adminData.stats.pendingApprovals > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0">
                  {adminData.stats.pendingApprovals}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-4 py-4">
        {/* 概览 */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* 待处理事项 */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">待处理事项</h3>
              <div className="space-y-2">
                <button onClick={() => setActiveTab("approvals")} className="w-full text-left">
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-sm">入会申请待审核</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500 text-white">{adminData.stats.pendingApprovals}</Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
                <button onClick={() => setActiveTab("approvals")} className="w-full text-left">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-sm">保证金退还申请</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500 text-white">{adminData.stats.pendingRefunds}</Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              </div>
            </Card>

            {/* 快捷入口 */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">快捷操作</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Award, label: "管理层任命", href: "/mine/institute/admin/appoint" },
                  { icon: Users, label: "成员管理", tab: "members" },
                  { icon: Calendar, label: "发布活动", tab: "activities" },
                  { icon: Star, label: "推荐老师", href: "/institute/teacher-pool" },
                ].map((item, i) =>
                  item.href ? (
                    <Link
                      key={i}
                      href={item.href}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-operator/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-operator" />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={i}
                      onClick={() => item.tab && setActiveTab(item.tab)}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-operator/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-operator" />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </button>
                  )
                )}
              </div>
            </Card>

            {/* 即将到期成员 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">即将到期成员</h3>
                <span className="text-xs text-muted-foreground">30天内</span>
              </div>
              <div className="space-y-2">
                {memberList.filter(m => m.expiryDays <= 60).map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-operator/10 text-operator text-xs">
                          {member.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name}</span>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      {member.expiryDays}天后到期
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* 申请审核 */}
        {activeTab === "approvals" && (
          <div className="space-y-4">
            {/* 入会申请 */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                入会申请
                <Badge className="bg-amber-500 text-white">{pendingApprovals.length}</Badge>
              </h3>
              <div className="space-y-3">
                {pendingApprovals.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={item.avatar} />
                        <AvatarFallback className="bg-operator/10 text-operator">
                          {item.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{item.name}</p>
                          <span className="text-[10px] text-muted-foreground">{item.applyTime}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          圈子：{item.circleName} · {item.circleMembers}成员
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          申请理由：{item.reason}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" className="flex-1 bg-operator hover:bg-operator/90">
                            <Check className="w-4 h-4 mr-1" />
                            通过
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <X className="w-4 h-4 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 保证金退还申请 */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                保证金退还申请
                <Badge className="bg-green-500 text-white">{refundApprovals.length}</Badge>
              </h3>
              <div className="space-y-3">
                {refundApprovals.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={item.avatar} />
                        <AvatarFallback className="bg-green-500/10 text-green-600">
                          {item.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{item.name}</p>
                          <Badge className="bg-green-500/10 text-green-600">
                            任务完成 {item.taskCompletion}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          申请时间：{item.applyTime}
                        </p>
                        <p className="text-sm font-medium text-green-600 mt-1">
                          退还金额：¥{item.amount.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                            <Check className="w-4 h-4 mr-1" />
                            审批通过
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            查看详情
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 成员管理 */}
        {activeTab === "members" && (
          <div className="space-y-4">
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索成员姓名"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 成员列表 */}
            <div className="space-y-2">
              {memberList.map((member) => {
                const roleInfo = roleLabels[member.role]
                return (
                  <Card key={member.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-operator/10 text-operator">
                          {member.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.name}</p>
                          <Badge className={cn("text-[10px]", roleInfo.color)}>
                            {roleInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>入会：{member.joinTime}</span>
                          <span>任务：{member.taskProgress}%</span>
                        </div>
                        {/* 任务进度条 */}
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              member.taskProgress >= 80 ? "bg-green-500" :
                              member.taskProgress >= 50 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${member.taskProgress}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        {member.expiryDays <= 30 ? (
                          <Badge variant="outline" className="text-red-500 border-red-300 text-[10px]">
                            {member.expiryDays}天
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{member.expiryDays}天</span>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* 活动管理 */}
        {activeTab === "activities" && (
          <div className="space-y-4">
            <Link href="/institute/events">
              <Button className="w-full bg-operator hover:bg-operator/90">
                <Calendar className="w-4 h-4 mr-2" />
                发布新活动
              </Button>
            </Link>

            {/* 活动排期 */}
            <div>
              <h3 className="font-medium mb-3">活动排期</h3>
              <div className="space-y-2">
                {scheduledActivities.map((a) => (
                  <Card key={a.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-operator/10 flex-shrink-0">
                        <span className="text-[10px] text-operator">{a.month}</span>
                        <span className="text-lg font-bold text-operator leading-none">{a.day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm line-clamp-1">{a.title}</p>
                          <Badge className={cn(
                            "text-[10px] flex-shrink-0",
                            a.status === "进行中" ? "bg-green-500 text-white" :
                            a.status === "报名中" ? "bg-operator text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {a.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {a.type} · 主讲 {a.speaker}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.time}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{a.enrolled}人报名</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 财务管理 */}
        {activeTab === "finance" && (
          <div className="space-y-4">
            {/* 收支概览 */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">本月收支</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-xl">
                  <p className="text-xs text-green-600">收入</p>
                  <p className="text-xl font-bold text-green-600">+¥86,000</p>
                  <p className="text-[10px] text-muted-foreground mt-1">保证金 ¥50,000 · 其他 ¥36,000</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <p className="text-xs text-red-600">支出</p>
                  <p className="text-xl font-bold text-red-600">-¥32,000</p>
                  <p className="text-[10px] text-muted-foreground mt-1">退款 ¥20,000 · 奖励 ¥12,000</p>
                </div>
              </div>
            </Card>

            {/* 分配规则与操作 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">本月收益分配</h3>
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">待分配</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                可分配金额 <span className="text-foreground font-medium">¥{distributableAmount.toLocaleString()}</span>，按下列比例分配
              </p>
              <div className="space-y-2 text-sm">
                {distributionRules.map((rule) => (
                  <div key={rule.label} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                    <span>{rule.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        ¥{Math.round(distributableAmount * rule.pct / 100).toLocaleString()}
                      </span>
                      <span className="font-medium">{rule.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                className="w-full mt-4 bg-operator hover:bg-operator/90"
                disabled={distributed}
                onClick={() => setShowDistributeDialog(true)}
              >
                {distributed ? "本月已分配" : "执行本月分配"}
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* 收益分配确认弹窗 */}
      <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认执行分配</DialogTitle>
            <DialogDescription>
              将按规则分配本月可分配收益 ¥{distributableAmount.toLocaleString()}，分配后不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 text-sm">
            {distributionRules.map((rule) => (
              <div key={rule.label} className="flex justify-between">
                <span className="text-muted-foreground">{rule.label}（{rule.pct}%）</span>
                <span className="font-medium">¥{Math.round(distributableAmount * rule.pct / 100).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDistributeDialog(false)} className="flex-1">取消</Button>
            <Button
              onClick={() => { setDistributed(true); setShowDistributeDialog(false) }}
              className="flex-1 bg-operator hover:bg-operator/90"
            >
              确认分配
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
