"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Search, CheckCircle, XCircle, Clock, Users, ChevronRight,
  Trophy, Filter, Download, AlertCircle, MoreHorizontal, Crown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// 报名状态配置
const registrationStatusConfig = {
  pending:  { label: "待审核", color: "bg-amber-100 text-amber-700",  dot: "bg-amber-400 animate-pulse" },
  approved: { label: "已通过", color: "bg-green-100 text-green-700",  dot: "bg-green-500" },
  rejected: { label: "未通过", color: "bg-red-100 text-red-600",      dot: "bg-red-400" },
}

// 晋级状态配置
const promotionStatusConfig = {
  promoted:   { label: "已晋级", color: "text-green-600 bg-green-50"  },
  eliminated: { label: "未晋级", color: "text-muted-foreground bg-secondary" },
  pending:    { label: "待公布", color: "text-amber-600 bg-amber-50"  },
}

// Mock 选手数据
const mockParticipants = [
  {
    id: "p001",
    no: "BZ20240001",
    name: "张易学",
    phone: "138****8001",
    group: "高手组",
    experience: "学习命理5年，擅长八字",
    registrationStatus: "pending" as const,
    registrationTime: "2024-03-20 14:32",
    score: null,
    rank: null,
    promotionStatus: "pending" as const,
  },
  {
    id: "p002",
    no: "BZ20240002",
    name: "李命理",
    phone: "139****8002",
    group: "进阶组",
    experience: "学习命理2年",
    registrationStatus: "approved" as const,
    registrationTime: "2024-03-19 09:15",
    score: 96,
    rank: 2,
    promotionStatus: "promoted" as const,
  },
  {
    id: "p003",
    no: "BZ20240003",
    name: "王八字",
    phone: "137****8003",
    group: "高手组",
    experience: "专业命理师",
    registrationStatus: "approved" as const,
    registrationTime: "2024-03-18 16:45",
    score: 72,
    rank: 156,
    promotionStatus: "eliminated" as const,
  },
  {
    id: "p004",
    no: "BZ20240004",
    name: "赵玄机",
    phone: "136****8004",
    group: "新手组",
    experience: "自学半年",
    registrationStatus: "rejected" as const,
    registrationTime: "2024-03-21 11:20",
    score: null,
    rank: null,
    promotionStatus: "pending" as const,
  },
  {
    id: "p005",
    no: "BZ20240005",
    name: "钱国学",
    phone: "135****8005",
    group: "进阶组",
    experience: "学习命理3年，参加过多次比赛",
    registrationStatus: "approved" as const,
    registrationTime: "2024-03-17 08:30",
    score: 88,
    rank: 45,
    promotionStatus: "promoted" as const,
  },
]

type Participant = typeof mockParticipants[0]

export default function ParticipantManagePage() {
  const params = useParams()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState("registration")
  const [searchQuery, setSearchQuery] = useState("")
  const [registrationFilter, setRegistrationFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [participants, setParticipants] = useState(mockParticipants)

  // 确认弹窗状态
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject" | "promote" | "eliminate"
    participant: Participant
  } | null>(null)

  // 统计数据
  const stats = {
    total: participants.length,
    pending: participants.filter(p => p.registrationStatus === "pending").length,
    approved: participants.filter(p => p.registrationStatus === "approved").length,
    promoted: participants.filter(p => p.promotionStatus === "promoted").length,
  }

  // 筛选
  const filtered = participants.filter(p => {
    const matchSearch = p.name.includes(searchQuery) || p.no.includes(searchQuery)
    if (activeTab === "registration") {
      return matchSearch && (registrationFilter === "all" || p.registrationStatus === registrationFilter)
    }
    // 参赛名单 Tab：仅显示已通过报名的
    return matchSearch && p.registrationStatus === "approved"
  })

  // 操作：审核通过
  const handleApprove = (id: string) => {
    setParticipants(prev => prev.map(p =>
      p.id === id ? { ...p, registrationStatus: "approved" as const } : p
    ))
    setConfirmAction(null)
  }

  // 操作：审核拒绝
  const handleReject = (id: string) => {
    setParticipants(prev => prev.map(p =>
      p.id === id ? { ...p, registrationStatus: "rejected" as const } : p
    ))
    setConfirmAction(null)
  }

  // 操作：设置晋级
  const handlePromote = (id: string, promote: boolean) => {
    setParticipants(prev => prev.map(p =>
      p.id === id
        ? { ...p, promotionStatus: promote ? "promoted" as const : "eliminated" as const }
        : p
    ))
    setConfirmAction(null)
  }

  const actionLabels = {
    approve:   { title: "确认通过报名？", desc: "通过后该选手将获得参赛资格并收到通知。", confirm: "确认通过", variant: "default" as const },
    reject:    { title: "确认拒绝报名？", desc: "拒绝后该选手将无法参加本次比赛，此操作可撤销。", confirm: "确认拒绝", variant: "destructive" as const },
    promote:   { title: "确认设为晋级？", desc: "将该选手标记为晋级，对方将收到晋级通知。", confirm: "确认晋级", variant: "default" as const },
    eliminate: { title: "确认设为未晋级？", desc: "将该选手标记为未晋级，请确认成绩无误。", confirm: "确认操作", variant: "destructive" as const },
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-medium">选手管理</h1>
          <button>
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 数据概览 */}
      <div className="bg-primary text-primary-foreground px-4 pb-5 pt-2">
        <div className="grid grid-cols-4 gap-2 text-center text-white">
          <div className="bg-white/10 rounded-xl py-3">
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-xs text-white/70">报名总数</p>
          </div>
          <div className="bg-white/10 rounded-xl py-3">
            <p className="text-xl font-bold text-amber-300">{stats.pending}</p>
            <p className="text-xs text-white/70">待审核</p>
          </div>
          <div className="bg-white/10 rounded-xl py-3">
            <p className="text-xl font-bold text-green-300">{stats.approved}</p>
            <p className="text-xs text-white/70">已通过</p>
          </div>
          <div className="bg-white/10 rounded-xl py-3">
            <p className="text-xl font-bold text-amber-300">{stats.promoted}</p>
            <p className="text-xs text-white/70">已晋级</p>
          </div>
        </div>
      </div>

      {/* Tab + 搜索 */}
      <div className="px-4 pt-4 space-y-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="registration" className="text-xs">
              报名审核
              {stats.pending > 0 && (
                <span className="ml-1.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] flex items-center justify-center">
                  {stats.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="participants" className="text-xs">参赛名单</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索姓名或编号..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 报名审核 Tab 的状态筛选 */}
        {activeTab === "registration" && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(["all", "pending", "approved", "rejected"] as const).map(status => (
              <button
                key={status}
                onClick={() => setRegistrationFilter(status)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors",
                  registrationFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {status === "all" ? "全部" :
                 status === "pending" ? `待审核 (${stats.pending})` :
                 status === "approved" ? "已通过" : "未通过"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 列表 */}
      <div className="px-4 mt-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无符合条件的选手</p>
          </div>
        ) : (
          filtered.map(participant => (
            <Card key={participant.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* 头像占位 */}
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {participant.name.slice(0, 1)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{participant.name}</p>
                      {participant.rank === 1 && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5">{participant.group}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{participant.no}</p>
                  </div>
                </div>

                {/* 操作菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 text-muted-foreground">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {participant.registrationStatus === "pending" && (
                      <>
                        <DropdownMenuItem
                          className="text-green-600"
                          onClick={() => setConfirmAction({ type: "approve", participant })}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />通过报名
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setConfirmAction({ type: "reject", participant })}
                        >
                          <XCircle className="w-4 h-4 mr-2" />拒绝报名
                        </DropdownMenuItem>
                      </>
                    )}
                    {participant.registrationStatus === "approved" && participant.promotionStatus === "pending" && (
                      <>
                        <DropdownMenuItem
                          className="text-green-600"
                          onClick={() => setConfirmAction({ type: "promote", participant })}
                        >
                          <Trophy className="w-4 h-4 mr-2" />设为晋级
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setConfirmAction({ type: "eliminate", participant })}
                        >
                          <XCircle className="w-4 h-4 mr-2" />设为未晋级
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* 报名信息 */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                  registrationStatusConfig[participant.registrationStatus].color
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", registrationStatusConfig[participant.registrationStatus].dot)} />
                  {registrationStatusConfig[participant.registrationStatus].label}
                </span>

                {participant.score !== null && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                    {participant.score} 分
                  </span>
                )}
                {participant.rank !== null && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">
                    排名 #{participant.rank}
                  </span>
                )}
                {participant.registrationStatus === "approved" && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs",
                    promotionStatusConfig[participant.promotionStatus].color
                  )}>
                    {promotionStatusConfig[participant.promotionStatus].label}
                  </span>
                )}
              </div>

              {/* 学习经历 */}
              {participant.experience && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{participant.experience}</p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {participant.registrationTime}
                </span>
                {/* 待审核时显示快捷操作按钮 */}
                {participant.registrationStatus === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmAction({ type: "reject", participant })}
                      className="px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium"
                    >
                      拒绝
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: "approve", participant })}
                      className="px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium"
                    >
                      通过
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 确认弹窗 */}
      {confirmAction && (
        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionLabels[confirmAction.type].title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                <p className="font-medium text-foreground mb-1">{confirmAction.participant.name}</p>
                {actionLabels[confirmAction.type].desc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmAction.type === "approve") handleApprove(confirmAction.participant.id)
                  else if (confirmAction.type === "reject") handleReject(confirmAction.participant.id)
                  else if (confirmAction.type === "promote") handlePromote(confirmAction.participant.id, true)
                  else handlePromote(confirmAction.participant.id, false)
                }}
                className={cn(
                  confirmAction.type === "reject" || confirmAction.type === "eliminate"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""
                )}
              >
                {actionLabels[confirmAction.type].confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
