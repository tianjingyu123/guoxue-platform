"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Building2, Users, TrendingUp, Gift, Wallet, Copy, Check, 
  QrCode, Award, Link2, MoreHorizontal, Plus, ChevronRight, Crown, Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// 运营商数据
const operatorData = {
  name: "国学推广联盟",
  level: "金牌运营商",
  joinDate: "2024-01-15",
  // 名额
  quota: {
    total: 6,
    used: 1, // 自用
    sold: 3, // 已售
    available: 2, // 可售
  },
  // 团队
  team: {
    total: 3,
    thisMonth: 1,
  },
  // 收益
  earnings: {
    total: 32680,
    thisMonth: 5680,
    pending: 1280,
    teamBonus: 8600, // 团队奖励
    quotaSales: 2997, // 名额销售收入 (3 * 999)
  },
  // 数据
  stats: {
    totalUsers: 580,
    thisMonthUsers: 86,
    conversionRate: 12.5,
  },
}

// 团队成员
const teamMembers = [
  { 
    id: 1, 
    name: "易学驿站", 
    avatar: "", 
    joinDate: "2024-03-15",
    status: "active",
    users: 128,
    earnings: 3680,
    myBonus: 184, // 我的团队奖励
  },
  { 
    id: 2, 
    name: "国学小站", 
    avatar: "", 
    joinDate: "2024-05-20",
    status: "active",
    users: 86,
    earnings: 2560,
    myBonus: 128,
  },
  { 
    id: 3, 
    name: "命理之家", 
    avatar: "", 
    joinDate: "2024-06-01",
    status: "pending", // 待激活
    users: 0,
    earnings: 0,
    myBonus: 0,
  },
]

// 名额记录
const quotaRecords = [
  { id: 1, type: "self", name: "自用", date: "2024-01-15", status: "active" },
  { id: 2, type: "sold", name: "易学驿站", date: "2024-03-15", price: 999, status: "active" },
  { id: 3, type: "sold", name: "国学小站", date: "2024-05-20", price: 999, status: "active" },
  { id: 4, type: "sold", name: "命理之家", date: "2024-06-01", price: 999, status: "pending" },
]

export default function OperatorDashboardPage() {
  const [activeTab, setActiveTab] = useState("team")
  const [copied, setCopied] = useState(false)

  const inviteLink = "https://rebu.com/join/station?ref=OP12345"

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-operator text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-medium">运营商中心</h1>
          <Link href="/operator/settings" className="p-2 -mr-2 rounded-full hover:bg-white/10">
            <MoreHorizontal className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* 运营商信息头部 */}
      <div className="bg-gradient-to-b from-operator to-operator/80 text-white px-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{operatorData.name}</h2>
            <Badge className="bg-white/20 text-white border-0 text-[10px]">
              <Crown className="w-3 h-3 mr-1" />
              {operatorData.level}
            </Badge>
          </div>
        </div>

        {/* 名额状态 */}
        <Card className="bg-white/10 backdrop-blur-sm border-0 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-sm">分站名额</span>
            <Link href="/operator/quota" className="text-xs text-white/60 flex items-center">
              管理 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold">{operatorData.quota.total}</p>
              <p className="text-[10px] text-white/60">总名额</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{operatorData.quota.used}</p>
              <p className="text-[10px] text-white/60">自用</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{operatorData.quota.sold}</p>
              <p className="text-[10px] text-white/60">已售</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gold">{operatorData.quota.available}</p>
              <p className="text-[10px] text-white/60">可售</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 数据概览 */}
      <div className="px-4 -mt-2">
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 累计收益 */}
            <div className="p-3 bg-gradient-to-br from-primary/5 to-gold/5 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">累计收益</span>
              </div>
              <p className="text-xl font-bold text-primary">
                ¥{operatorData.earnings.total.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                本月 +¥{operatorData.earnings.thisMonth}
              </p>
            </div>
            
            {/* 团队人数 */}
            <div className="p-3 bg-gradient-to-br from-operator/5 to-info/5 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-operator" />
                <span className="text-xs text-muted-foreground">团队站长</span>
              </div>
              <p className="text-xl font-bold text-operator">
                {operatorData.team.total}人
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                本月 +{operatorData.team.thisMonth}人
              </p>
            </div>

            {/* 名额销售收入 */}
            <div className="p-3 bg-gradient-to-br from-gold/5 to-success/5 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-gold" />
                <span className="text-xs text-muted-foreground">名额销售</span>
              </div>
              <p className="text-xl font-bold text-gold">
                ¥{operatorData.earnings.quotaSales.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                已售 {operatorData.quota.sold} 个名额
              </p>
            </div>

            {/* 团队奖励 */}
            <div className="p-3 bg-gradient-to-br from-success/5 to-info/5 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">团队奖励</span>
              </div>
              <p className="text-xl font-bold text-success">
                ¥{operatorData.earnings.teamBonus.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                下级站长分佣5%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 推广链接 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-operator" />
            站长招募链接
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2 bg-secondary/50 rounded-lg text-xs text-muted-foreground truncate">
              {inviteLink}
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleCopy}
              className="flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button size="sm" className="bg-operator hover:bg-operator/90 flex-shrink-0">
              <QrCode className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            通过此链接注册的站长将加入您的团队，您可获得5%团队奖励
          </p>
        </Card>
      </div>

      {/* Tab切换 */}
      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 h-10">
            <TabsTrigger value="team">团队管理</TabsTrigger>
            <TabsTrigger value="quota">名额记录</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 团队列表 */}
      {activeTab === "team" && (
        <div className="px-4 mt-4 space-y-3">
          {/* 运营管理快捷入口 */}
          <div className="grid grid-cols-3 gap-2">
            <Link href="/station/team">
              <Card className="p-3 flex flex-col items-center gap-1 hover:bg-secondary/50 transition-colors">
                <Users className="w-5 h-5 text-operator" />
                <span className="text-xs">团队详情</span>
              </Card>
            </Link>
            <Link href="/operator/dormant">
              <Card className="p-3 flex flex-col items-center gap-1 hover:bg-secondary/50 transition-colors">
                <Clock className="w-5 h-5 text-amber-500" />
                <span className="text-xs">沉寂预警</span>
              </Card>
            </Link>
            <Link href="/operator/analysis">
              <Card className="p-3 flex flex-col items-center gap-1 hover:bg-secondary/50 transition-colors">
                <TrendingUp className="w-5 h-5 text-info" />
                <span className="text-xs">业绩分析</span>
              </Card>
            </Link>
          </div>
          {teamMembers.map(member => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{member.name}</h4>
                    <Badge className={cn(
                      "text-[10px]",
                      member.status === "active" 
                        ? "bg-success/10 text-success" 
                        : "bg-amber-100 text-amber-700"
                    )}>
                      {member.status === "active" ? "已激活" : "待激活"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    加入于 {member.joinDate}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>查看详情</DropdownMenuItem>
                    <DropdownMenuItem>联系站长</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {member.status === "active" && (
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                  <div className="text-center">
                    <p className="text-sm font-bold">{member.users}</p>
                    <p className="text-[10px] text-muted-foreground">用户数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-success">¥{member.earnings}</p>
                    <p className="text-[10px] text-muted-foreground">产生收益</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-operator">¥{member.myBonus}</p>
                    <p className="text-[10px] text-muted-foreground">我的奖励</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
          
          {operatorData.quota.available > 0 && (
            <Link href="/operator/invite">
              <Card className="p-4 border-dashed border-2 border-operator/30 bg-operator/5 flex items-center justify-center gap-2 text-operator">
                <Plus className="w-5 h-5" />
                <span className="font-medium">邀请新站长（剩余{operatorData.quota.available}个名额）</span>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* 名额记录 */}
      {activeTab === "quota" && (
        <div className="px-4 mt-4 space-y-3">
          {quotaRecords.map(record => (
            <Card key={record.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  record.type === "self" ? "bg-operator/10" : "bg-gold/10"
                )}>
                  {record.type === "self" ? (
                    <Building2 className="w-5 h-5 text-operator" />
                  ) : (
                    <Gift className="w-5 h-5 text-gold" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{record.name}</span>
                    <Badge className={cn(
                      "text-[10px]",
                      record.status === "active"
                        ? "bg-success/10 text-success"
                        : "bg-amber-100 text-amber-700"
                    )}>
                      {record.status === "active" ? "已激活" : "待激活"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {record.type === "self" ? "自用名额" : "售出名额"} · {record.date}
                  </p>
                </div>
                {record.type === "sold" && record.price && (
                  <span className="text-sm font-bold text-gold">+¥{record.price}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
