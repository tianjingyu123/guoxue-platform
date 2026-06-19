"use client"

import { useState, useEffect } from "react"
import { 
  Settings, ChevronRight, BookOpen, Users, FileText, 
  Wallet, Ticket, Heart, Download, Clock, 
  HelpCircle, Crown, GraduationCap,
  Star, QrCode, Shield, 
  Award, Package,
  RefreshCw, Truck, Edit3, Coins, Play,
  Bell, CalendarCheck, Compass, Video, Radio, 
  MessageSquare, StickyNote, History, Gift, ClipboardList
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BottomNav } from "@/components/bottom-nav"
import { cn } from "@/lib/utils"
import Link from "next/link"

// 用户角色类型
type UserRole = "user" | "circle_owner" | "teacher" | "station_owner" | "streamer" | "creator"

// 用户数据
const userData = {
  name: "张三丰",
  avatar: "",
  bio: "易学爱好者 | 八字研习中",
  isVip: true,
  vipLevel: "黄金会员",
  vipExpiry: "2025-12-31",
  vipDaysLeft: 234,
  isVerified: true,
  roles: [
    { type: "circle_owner" as UserRole, name: "张氏命理研习社", id: 1 },
    { type: "teacher" as UserRole, name: "八字入门精讲", id: 1 },
    { type: "streamer" as UserRole, name: "直播间", id: 1 },
  ],
  // 消息通知
  messages: {
    system: 2,
    interaction: 5,
    transaction: 1,
  },
  // 签到数据
  checkIn: {
    todayChecked: false,
    continuousDays: 7,
    totalPoints: 350,
  },
  stats: {
    following: 128,
    followers: 1024,
    likes: 3680,
  },
  coins: 520,
  coupons: 3,
  points: 1280,
  orders: {
    pending: 2,
    shipped: 1,
    received: 3,
    refund: 0,
  },
  // 继续学习的课程
  continueLearning: {
    id: 1,
    title: "八字入门实战课",
    progress: 45,
    lastLesson: "第三章：天干地支详解",
  },
}

// 获取问候语
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 6) return "夜深了"
  if (hour < 12) return "早上好"
  if (hour < 14) return "中午好"
  if (hour < 18) return "下午好"
  return "晚上好"
}

// 角色配置
const roleConfig: Record<UserRole, { label: string; icon: typeof Users; color: string; bgColor: string }> = {
  user: { label: "普通用户", icon: Users, color: "text-muted-foreground", bgColor: "bg-muted/20" },
  circle_owner: { label: "圈主后台", icon: Crown, color: "text-[#C9A96E]", bgColor: "bg-[#C9A96E]/10" },
  teacher: { label: "讲师后台", icon: GraduationCap, color: "text-[#4A90D9]", bgColor: "bg-[#4A90D9]/10" },
  station_owner: { label: "站长后台", icon: Award, color: "text-[#52C41A]", bgColor: "bg-[#52C41A]/10" },
  streamer: { label: "主播中心", icon: Radio, color: "text-[#C41E3A]", bgColor: "bg-[#C41E3A]/10" },
  creator: { label: "创作中心", icon: Video, color: "text-[#722ED1]", bgColor: "bg-[#722ED1]/10" },
}

// 常用功能入口 - 根据业务重新排列
const quickFunctions = [
  { icon: Compass, label: "排盘记录", href: "/paipan", color: "text-[#C41E3A]" },
  { icon: BookOpen, label: "我的课程", href: "/learning", color: "text-[#4A90D9]" },
  { icon: Users, label: "我的圈子", href: "/my-circles", color: "text-[#722ED1]" },
  { icon: StickyNote, label: "我的笔记", href: "/ebook/notes", color: "text-[#C9A96E]" },
  { icon: Heart, label: "我的收藏", href: "/favorites", color: "text-[#C41E3A]" },
  { icon: FileText, label: "我的电子书", href: "/downloads", color: "text-[#52C41A]" },
  { icon: ClipboardList, label: "我的申请", href: "/mine/applications", color: "text-[#FA8C16]" },
  { icon: History, label: "浏览历史", href: "/history", color: "text-[#64748B]" },
  { icon: HelpCircle, label: "帮助中心", href: "/help", color: "text-[#999999]" },
]

// 猜你喜欢推荐
const recommendations = [
  { id: 1, type: "course", title: "紫微斗数入门精讲", price: 199, originalPrice: 399, tag: "热门" },
  { id: 2, type: "product", title: "专业罗盘套装", price: 298, originalPrice: 598, tag: "特惠" },
  { id: 3, type: "course", title: "六爻预测实战班", price: 299, originalPrice: 499, tag: "新课" },
  { id: 4, type: "product", title: "渊海子平精装版", price: 68, originalPrice: 128, tag: "" },
]

// 全部可开通角色（用户未拥有的显示"申请开通"）
const allRoleTypes: { type: UserRole; applyHref: string }[] = [
  { type: "circle_owner", applyHref: "/circles/create" },
  { type: "teacher", applyHref: "/institute/apply" },
  { type: "station_owner", applyHref: "/join/station" },
  { type: "streamer", applyHref: "/creator/live/console" },
]

export default function ProfilePage() {
  const [greeting, setGreeting] = useState("")
  // 身份切换确认弹窗：保存待切换的角色
  const [pendingRole, setPendingRole] = useState<{ type: UserRole; name: string; href: string } | null>(null)

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  // 计算用户尚未开通的角色（用于"申请开通"引导）
  const ownedTypes = new Set(userData.roles.map((r) => r.type))
  const availableToApply = allRoleTypes.filter((r) => !ownedTypes.has(r.type))

  // 订单状态配置
  const orderStatus = [
    { key: "pending", label: "待付款", icon: Wallet, count: userData.orders.pending, href: "/orders?status=pending" },
    { key: "shipped", label: "待发货", icon: Package, count: userData.orders.shipped, href: "/orders?status=shipped" },
    { key: "received", label: "待收货", icon: Truck, count: userData.orders.received, href: "/orders?status=received" },
    { key: "refund", label: "售后", icon: RefreshCw, count: userData.orders.refund, href: "/orders?status=refund" },
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* ===== 第一层：个人信息区 ===== */}
      <div className="relative">
        {/* 背景渐变 - 宣纸色系 */}
        <div className="absolute inset-0 h-48 bg-gradient-to-b from-[#F5F1EB] via-[#FAF8F5] to-[#FAF8F5]" />
        
        {/* 顶部操作栏 */}
        <div className="relative flex items-center justify-between px-4 pt-12 pb-2">
          <button className="p-2 rounded-full bg-white/60 backdrop-blur-sm">
            <QrCode className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            {/* 消息通知入口 */}
            <Link href="/im/conversations" className="relative p-2 rounded-full bg-white/60 backdrop-blur-sm">
              <Bell className="w-5 h-5 text-foreground" />
              {(userData.messages.system + userData.messages.interaction + userData.messages.transaction) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C41E3A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {userData.messages.system + userData.messages.interaction + userData.messages.transaction}
                </span>
              )}
            </Link>
            <Link href="/settings" className="p-2 rounded-full bg-white/60 backdrop-blur-sm">
              <Settings className="w-5 h-5 text-foreground" />
            </Link>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="relative px-4 pb-4">
          <div className="flex items-start gap-4">
            {/* 大头像 */}
            <Link href="/profile/edit">
              <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg">
                <AvatarImage src={userData.avatar} alt={userData.name} />
                <AvatarFallback className="bg-[#C41E3A] text-white text-2xl font-serif font-bold">
                  {userData.name[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
            
            <div className="flex-1 pt-1">
              {/* 问候语 */}
              <p className="text-xs text-muted-foreground mb-1">{greeting}，{userData.name}</p>
              
              {/* 昵称 + 认证标识 */}
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-bold text-foreground">{userData.name}</h1>
                {userData.isVerified && <Shield className="w-4 h-4 text-[#4A90D9]" />}
                {userData.isVip && (
                  <Badge className="bg-gradient-to-r from-[#C9A96E] to-[#D4B87D] text-white border-0 text-[10px] px-1.5">
                    <Crown className="w-3 h-3 mr-0.5" />
                    {userData.vipLevel}
                  </Badge>
                )}
              </div>
              
              {/* 数据行 */}
              <div className="flex items-center gap-4 mt-2">
                <Link href="/follows?tab=following" className="text-center">
                  <span className="text-base font-bold text-foreground">{userData.stats.following}</span>
                  <span className="text-xs text-muted-foreground ml-1">关注</span>
                </Link>
                <div className="w-px h-3 bg-border" />
                <Link href="/follows?tab=followers" className="text-center">
                  <span className="text-base font-bold text-foreground">{userData.stats.followers}</span>
                  <span className="text-xs text-muted-foreground ml-1">粉丝</span>
                </Link>
                <div className="w-px h-3 bg-border" />
                <Link href="/likes" className="text-center">
                  <span className="text-base font-bold text-foreground">{userData.stats.likes}</span>
                  <span className="text-xs text-muted-foreground ml-1">获赞</span>
                </Link>
              </div>
              
              {/* 编辑资料按钮 */}
              <Link href="/profile/edit">
                <Button variant="outline" size="sm" className="mt-3 h-7 text-xs px-3 rounded-full border-border bg-white">
                  <Edit3 className="w-3 h-3 mr-1" />
                  编辑资料
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 第二层：资产核心区 ===== */}
      <div className="px-4 mt-2">
        <Card className="overflow-hidden bg-gradient-to-r from-[#FAF8F5] to-[#F8F4EC] border border-[#C9A96E]/20 card-shadow">
          <div className="p-4">
            <div className="grid grid-cols-3 divide-x divide-[#C9A96E]/20">
              {/* 国学币 - 核心资产，金色大字突出 */}
              <Link href="/wallet" className="flex flex-col items-center py-1">
                <div className="flex items-center gap-1">
                  <Coins className="w-5 h-5 text-[#C9A96E]" />
                  <span className="text-3xl font-bold text-[#C9A96E] leading-none">{userData.coins}</span>
                </div>
                <span className="text-xs text-[#C9A96E]/90 font-medium mt-1.5">国学币</span>
              </Link>
              
              {/* 优惠券 */}
              <Link href="/coupons" className="flex flex-col items-center py-1">
                <div className="flex items-center gap-1">
                  <Ticket className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xl font-bold text-foreground leading-none">{userData.coupons}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1.5">优惠券</span>
              </Link>
              
              {/* 积分 */}
              <Link href="/points" className="flex flex-col items-center py-1">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xl font-bold text-foreground leading-none">{userData.points}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1.5">积分</span>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* ===== 第三层：订单与售后区 ===== */}
      <div className="px-4 mt-4">
        <Card className="bg-card border-0 card-shadow overflow-hidden">
          {/* 标题行 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-medium text-foreground">我的订单</h3>
            <Link href="/orders" className="flex items-center text-xs text-muted-foreground">
              查看全部订单 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {/* 订单状态4宫格 */}
          <div className="grid grid-cols-4 py-4">
            {orderStatus.map((item) => (
              <Link key={item.key} href={item.href} className="flex flex-col items-center gap-1.5 relative">
                <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-xs text-foreground">{item.label}</span>
                {item.count > 0 && (
                  <span className="absolute top-0 right-1/4 w-4 h-4 bg-[#C41E3A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* ===== 第四层：功能入口区 ===== */}
      <div className="px-4 mt-4">
        <Card className="bg-card border-0 card-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-medium text-foreground">常用功能</h3>
          </div>
          <div className="grid grid-cols-4 gap-y-4 py-4">
            {quickFunctions.map((item) => (
              <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                  <item.icon className={cn("w-5 h-5", item.color)} />
                </div>
                <span className="text-xs text-foreground">{item.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* ===== 第五层：身份切换区（仅多身份用户展示）===== */}
      {userData.roles.length > 0 && (
        <div className="px-4 mt-4">
          <Card className="bg-card border-0 card-shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-foreground">身份切换</h3>
              <span className="text-[10px] text-muted-foreground">点击进入对应管理后台</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {/* 已开通身份 - 点击弹确认 */}
              {userData.roles.map((role) => {
                const config = roleConfig[role.type]
                let href = ""
                switch (role.type) {
                  case "circle_owner": href = `/circle/${role.id}/settings`; break
                  case "teacher":      href = `/teacher/dashboard`; break
                  case "streamer":     href = `/creator/live/console`; break
                  case "creator":      href = `/videos/creator`; break
                  case "station_owner":href = `/mine/role-panels/station-master-panel`; break
                  default:             href = "/profile"
                }
                return (
                  <button
                    key={`${role.type}-${role.id}`}
                    onClick={() => setPendingRole({ type: role.type, name: role.name, href })}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.bgColor)}>
                      <config.icon className={cn("w-5 h-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{config.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{role.name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                )
              })}
            </div>

            {/* 未开通身份 - 申请开通引导 */}
            {availableToApply.length > 0 && (
              <div className="px-3 pb-3">
                <p className="text-[10px] text-muted-foreground mb-2 px-1">开通更多身份</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {availableToApply.map((r) => {
                    const config = roleConfig[r.type]
                    return (
                      <Link
                        key={r.type}
                        href={r.applyHref}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border border-dashed border-border hover:border-[#C41E3A]/40 hover:bg-[#C41E3A]/5 transition-colors"
                      >
                        <config.icon className={cn("w-4 h-4", config.color)} />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">申请{config.label.replace("后台", "").replace("中心", "")}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===== 身份切换确认弹窗 ===== */}
      {pendingRole && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8"
          onClick={() => setPendingRole(null)}
        >
          <div
            className="w-full max-w-xs bg-card rounded-2xl overflow-hidden card-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 text-center">
              <div className={cn("w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3", roleConfig[pendingRole.type].bgColor)}>
                {(() => {
                  const Icon = roleConfig[pendingRole.type].icon
                  return <Icon className={cn("w-6 h-6", roleConfig[pendingRole.type].color)} />
                })()}
              </div>
              <h4 className="font-medium text-foreground">切换到「{roleConfig[pendingRole.type].label}」</h4>
              <p className="text-xs text-muted-foreground mt-1.5">{pendingRole.name}</p>
              <p className="text-[11px] text-muted-foreground mt-2">将进入对应管理后台，确认切换？</p>
            </div>
            <div className="grid grid-cols-2 border-t border-border">
              <button
                onClick={() => setPendingRole(null)}
                className="py-3 text-sm text-muted-foreground hover:bg-secondary/30 transition-colors"
              >
                取消
              </button>
              <Link
                href={pendingRole.href}
                className="py-3 text-sm font-medium text-white bg-[#C41E3A] hover:bg-[#A01829] transition-colors text-center border-l border-border"
              >
                确认切换
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ===== 签到入口 ===== */}
      <div className="px-4 mt-4">
        <Link href="/check-in">
          <Card className="overflow-hidden bg-gradient-to-r from-[#C41E3A]/5 to-[#C9A96E]/5 border border-[#C41E3A]/20 card-shadow">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C41E3A] to-[#C9A96E] flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">每日签到</span>
                    {userData.checkIn.todayChecked ? (
                      <Badge className="bg-[#52C41A]/10 text-[#52C41A] border-0 text-[10px] px-1.5">已签到</Badge>
                    ) : (
                      <Badge className="bg-[#C41E3A] text-white border-0 text-[10px] px-1.5 animate-pulse">待签到</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    已连续签到 <span className="text-[#C41E3A] font-medium">{userData.checkIn.continuousDays}</span> 天，
                    累计 <span className="text-[#C9A96E] font-medium">{userData.checkIn.totalPoints}</span> 积分
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>
      </div>

      {/* ===== 继续学习卡片（有未完成课程时显示） ===== */}
      {userData.continueLearning && (
        <div className="px-4 mt-4">
          <Link href={`/learn/${userData.continueLearning.id}`}>
            <Card className="overflow-hidden bg-card border-0 card-shadow card-shadow-hover">
              <div className="p-3 flex items-center gap-3">
                {/* 课程封面 */}
                <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-[#C41E3A]/10 to-[#C9A96E]/10 flex items-center justify-center flex-shrink-0">
                  <Play className="w-6 h-6 text-[#C41E3A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">继续学习</p>
                  <h4 className="text-sm font-medium text-foreground truncate">{userData.continueLearning.title}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{userData.continueLearning.lastLesson}</p>
                </div>
                {/* 进度 */}
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-[#C41E3A]">{userData.continueLearning.progress}%</span>
                  <div className="w-12 h-1 bg-secondary rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-[#C41E3A] rounded-full"
                      style={{ width: `${userData.continueLearning.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* ===== 猜你喜欢 ===== */}
      <div className="px-4 mt-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-foreground">猜��喜欢</h3>
          <Link href="/discover" className="text-xs text-muted-foreground flex items-center">
            更多 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {recommendations.map((item) => (
            <Link 
              key={item.id} 
              href={item.type === "course" ? `/course/${item.id}` : `/mall/product/${item.id}`}
              className="flex-shrink-0 w-32"
            >
              <div className="aspect-[3/4] rounded-lg bg-gradient-to-br from-[#C41E3A]/5 to-[#C9A96E]/5 relative flex items-center justify-center card-shadow">
                {item.type === "course" ? (
                  <BookOpen className="w-8 h-8 text-[#C41E3A]/30" />
                ) : (
                  <Package className="w-8 h-8 text-[#C9A96E]/30" />
                )}
                {item.tag && (
                  <Badge className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 bg-[#C41E3A] text-white border-0">
                    {item.tag}
                  </Badge>
                )}
              </div>
              <p className="text-xs font-medium mt-2 line-clamp-2 leading-relaxed text-foreground">{item.title}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-sm font-bold text-[#C41E3A]">¥{item.price}</span>
                <span className="text-[10px] text-muted-foreground line-through">¥{item.originalPrice}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 会员到期提醒 */}
      {userData.isVip && userData.vipDaysLeft <= 30 && (
        <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto">
          <Card className="bg-gradient-to-r from-[#C9A96E] to-[#D4B87D] text-white p-3 flex items-center justify-between card-shadow">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              <span className="text-sm">会员还剩 {userData.vipDaysLeft} 天到期</span>
            </div>
            <Link href="/vip" className="px-3 py-1 bg-white text-[#C9A96E] rounded-full text-xs font-medium">
              立即续费
            </Link>
          </Card>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
