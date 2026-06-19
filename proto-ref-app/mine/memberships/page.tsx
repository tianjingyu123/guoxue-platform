"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, ChevronRight, Crown, Users, Building2, GraduationCap,
  Clock, AlertTriangle, CheckCircle, Gift, Sparkles, Bell, RefreshCw,
  ChevronDown, LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"

// ============================================
// 权益类型定义
// ============================================
type MembershipType = "vip" | "circle" | "station" | "institute"
type MembershipStatus = "active" | "expiring" | "expired"

interface Membership {
  id: string
  type: MembershipType
  name: string
  icon: typeof Crown
  color: string
  bgColor: string
  status: MembershipStatus
  startDate: string
  expireDate: string
  daysLeft: number
  price: number // 续费价格
  originalPrice?: number
  autoRenew: boolean
  benefits: string[]
}

// ============================================
// Mock 权益数据
// ============================================
const mockMemberships: Membership[] = [
  {
    id: "vip-1",
    type: "vip",
    name: "热卜国学VIP会员",
    icon: Crown,
    color: "text-gold",
    bgColor: "bg-gradient-to-r from-gold/20 to-gold/5",
    status: "active",
    startDate: "2024-01-08",
    expireDate: "2025-01-08",
    daysLeft: 186,
    price: 365,
    originalPrice: 588,
    autoRenew: true,
    benefits: ["排盘工具无限使用", "课程专属折扣", "专属客服", "去广告"]
  },
  {
    id: "circle-1",
    type: "circle",
    name: "八字命理研习社",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-gradient-to-r from-primary/20 to-primary/5",
    status: "expiring",
    startDate: "2024-01-14",
    expireDate: "2025-01-14",
    daysLeft: 28,
    price: 199,
    autoRenew: false,
    benefits: ["圈内免费内容", "专属直播", "圈内问答", "交流群"]
  },
  {
    id: "circle-2",
    type: "circle",
    name: "紫微斗数学习班",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-gradient-to-r from-primary/20 to-primary/5",
    status: "active",
    startDate: "2024-03-01",
    expireDate: "2025-03-01",
    daysLeft: 268,
    price: 299,
    autoRenew: true,
    benefits: ["系统课程", "案例分析", "作业点评", "1v1答疑"]
  },
  {
    id: "station-1",
    type: "station",
    name: "分站站长资格",
    icon: Building2,
    color: "text-success",
    bgColor: "bg-gradient-to-r from-success/20 to-success/5",
    status: "active",
    startDate: "2023-12-20",
    expireDate: "2024-12-20",
    daysLeft: 45,
    price: 999,
    autoRenew: false,
    benefits: ["专属分站页面", "推广分佣", "自购返佣", "品牌展示"]
  },
  {
    id: "institute-1",
    type: "institute",
    name: "研究院成员",
    icon: GraduationCap,
    color: "text-operator",
    bgColor: "bg-gradient-to-r from-operator/20 to-operator/5",
    status: "active",
    startDate: "2023-12-15",
    expireDate: "2024-12-15",
    daysLeft: 40,
    price: 10000,
    autoRenew: false,
    benefits: ["内部交流", "线下活动", "资源对接", "保证金可退"]
  },
]

// ============================================
// 状态配置
// ============================================
const statusConfig: Record<MembershipStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: "正常", color: "text-green-600", bgColor: "bg-green-50" },
  expiring: { label: "即将到期", color: "text-amber-600", bgColor: "bg-amber-50" },
  expired: { label: "已过期", color: "text-red-600", bgColor: "bg-red-50" },
}

// ============================================
// 主组件
// ============================================
export default function MyMembershipsPage() {
  const router = useRouter()
  const [memberships, setMemberships] = useState(mockMemberships)
  const [filter, setFilter] = useState<"all" | MembershipStatus>("all")
  // 已展开"管理订阅"的会员卡片（退出入口深藏于此，需主动点开）
  const [manageOpen, setManageOpen] = useState<string | null>(null)

  // 统计数据
  const stats = {
    total: memberships.length,
    active: memberships.filter(m => m.status === "active").length,
    expiring: memberships.filter(m => m.status === "expiring").length,
    expired: memberships.filter(m => m.status === "expired").length,
  }

  // 筛选
  const filteredMemberships = filter === "all" 
    ? memberships 
    : memberships.filter(m => m.status === filter)

  // 切换自动续费
  const toggleAutoRenew = (id: string) => {
    setMemberships(prev => prev.map(m => 
      m.id === id ? { ...m, autoRenew: !m.autoRenew } : m
    ))
  }

  // 即将到期提醒（30天内）
  const expiringCount = memberships.filter(m => m.daysLeft <= 30 && m.daysLeft > 0).length

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-base">我的权益</h1>
          <Link href="/notifications?type=expiry" className="p-1 relative">
            <Bell className="w-5 h-5" />
            {expiringCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                {expiringCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* 统计卡片 */}
      <div className="p-4">
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">权益概��</h2>
            <Link href="/orders/center" className="text-xs text-primary flex items-center gap-1">
              订单记录 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <button 
              onClick={() => setFilter("all")}
              className={cn(
                "py-2 rounded-lg transition-colors",
                filter === "all" ? "bg-primary/20" : "bg-white/50"
              )}
            >
              <p className="text-lg font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">全部权益</p>
            </button>
            <button 
              onClick={() => setFilter("active")}
              className={cn(
                "py-2 rounded-lg transition-colors",
                filter === "active" ? "bg-green-100" : "bg-white/50"
              )}
            >
              <p className="text-lg font-bold text-green-600">{stats.active}</p>
              <p className="text-[10px] text-muted-foreground">正常</p>
            </button>
            <button 
              onClick={() => setFilter("expiring")}
              className={cn(
                "py-2 rounded-lg transition-colors",
                filter === "expiring" ? "bg-amber-100" : "bg-white/50"
              )}
            >
              <p className="text-lg font-bold text-amber-600">{stats.expiring}</p>
              <p className="text-[10px] text-muted-foreground">即将到期</p>
            </button>
            <button 
              onClick={() => setFilter("expired")}
              className={cn(
                "py-2 rounded-lg transition-colors",
                filter === "expired" ? "bg-red-100" : "bg-white/50"
              )}
            >
              <p className="text-lg font-bold text-red-600">{stats.expired}</p>
              <p className="text-[10px] text-muted-foreground">已过期</p>
            </button>
          </div>
        </Card>
      </div>

      {/* 权益列表 */}
      <main className="px-4 pb-24 space-y-3">
        {filteredMemberships.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Gift className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无权益</p>
            <Link href="/vip">
              <Button variant="outline" size="sm" className="mt-4">
                开通会员
              </Button>
            </Link>
          </div>
        ) : (
          filteredMemberships.map((membership) => {
            const Icon = membership.icon
            const status = statusConfig[membership.status]
            const isExpiring = membership.daysLeft <= 30 && membership.daysLeft > 0
            
            return (
              <Card key={membership.id} className={cn("overflow-hidden", membership.bgColor)}>
                {/* 头部 */}
                <div className="flex items-center justify-between p-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      membership.color.replace("text-", "bg-").replace("]", "/20]")
                    )}>
                      <Icon className={cn("w-4 h-4", membership.color)} />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{membership.name}</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {membership.startDate} ~ {membership.expireDate}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px]", status.bgColor, status.color)}>
                    {status.label}
                  </Badge>
                </div>

                {/* 有效期 */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">剩余有效期</span>
                    </div>
                    <span className={cn(
                      "text-sm font-bold",
                      isExpiring ? "text-amber-600" : membership.color
                    )}>
                      {membership.daysLeft > 0 ? `${membership.daysLeft}天` : "已过期"}
                    </span>
                  </div>

                  {/* 进度条 */}
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        isExpiring ? "bg-amber-500" : membership.color.replace("text-", "bg-")
                      )}
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (membership.daysLeft / 365) * 100))}%` 
                      }}
                    />
                  </div>

                  {/* 权益说明 */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {membership.benefits.slice(0, 4).map((benefit, i) => (
                      <span 
                        key={i}
                        className="px-2 py-0.5 rounded-full bg-white/60 text-[10px] text-muted-foreground"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 底部操作 */}
                <div className="flex items-center justify-between p-3 border-t border-border/50 bg-white/30">
                  {/* 自动续费开关 */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={membership.autoRenew}
                      onCheckedChange={() => toggleAutoRenew(membership.id)}
                      className="scale-75"
                    />
                    <span className="text-xs text-muted-foreground">
                      {membership.autoRenew ? "自动续费已开启" : "自动续费"}
                    </span>
                  </div>

                  {/* 续费按钮 */}
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <p className="text-xs text-muted-foreground">续费价格</p>
                      <p className="font-bold text-primary">
                        ¥{membership.price}
                        {membership.originalPrice && (
                          <span className="text-[10px] text-muted-foreground line-through ml-1">
                            ¥{membership.originalPrice}
                          </span>
                        )}
                      </p>
                    </div>
                    <Link href={`/renew?type=${membership.type}&id=${membership.id}`}>
                      <Button 
                        size="sm" 
                        className={cn(
                          "h-8",
                          isExpiring 
                            ? "bg-amber-500 hover:bg-amber-600" 
                            : "bg-primary hover:bg-primary/90"
                        )}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        {isExpiring ? "立即续费" : "续费"}
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* 即将到期警告 */}
                {isExpiring && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-t border-amber-100">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-amber-600">
                      您的权益将在{membership.daysLeft}天后到期，续费可享受连续优惠
                    </span>
                  </div>
                )}

                {/* 管理订阅（退出入口深藏于此，弱化处理，仅圈子会员） */}
                {membership.type === "circle" && (
                  <div className="border-t border-border/40 bg-white/20">
                    <button
                      onClick={() => setManageOpen(manageOpen === membership.id ? null : membership.id)}
                      className="w-full flex items-center justify-center gap-1 py-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      管理订阅
                      <ChevronDown className={cn("w-3 h-3 transition-transform", manageOpen === membership.id && "rotate-180")} />
                    </button>
                    {manageOpen === membership.id && (
                      <div className="px-3 pb-3 pt-1">
                        <p className="text-[11px] text-muted-foreground/70 leading-relaxed mb-2">
                          退出后将失去圈内全部权益与内容访问，已用时长按天计费，剩余部分可申请退款。
                        </p>
                        <button
                          onClick={() => router.push(`/circles/${membership.id.replace("circle-", "")}/exit`)}
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 underline underline-offset-2 hover:text-[#C41E3A]"
                        >
                          <LogOut className="w-3 h-3" />
                          申请退出并退款
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </main>
    </div>
  )
}
