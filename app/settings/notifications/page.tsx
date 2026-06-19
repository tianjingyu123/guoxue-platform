"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Bell, BellOff, MessageCircle, Heart, Users, 
  ShoppingBag, Video, Calendar, Coins, Clock, Moon, Volume2,
  Smartphone, Mail
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export default function NotificationSettingsPage() {
  // 总开关
  const [pushEnabled, setPushEnabled] = useState(true)
  
  // 互动通知
  const [notifyComment, setNotifyComment] = useState(true)
  const [notifyLike, setNotifyLike] = useState(true)
  const [notifyFollow, setNotifyFollow] = useState(true)
  const [notifyMention, setNotifyMention] = useState(true)
  const [notifyMessage, setNotifyMessage] = useState(true)
  
  // 内容通知
  const [notifyCircleUpdate, setNotifyCircleUpdate] = useState(true)
  const [notifyLiveStart, setNotifyLiveStart] = useState(true)
  const [notifyCourseUpdate, setNotifyCourseUpdate] = useState(true)
  const [notifyActivityRemind, setNotifyActivityRemind] = useState(true)
  
  // 交易通知
  const [notifyOrder, setNotifyOrder] = useState(true)
  const [notifyIncome, setNotifyIncome] = useState(true)
  const [notifyExpiry, setNotifyExpiry] = useState(true)
  
  // 系统通知
  const [notifySystem, setNotifySystem] = useState(true)
  const [notifyPromotion, setNotifyPromotion] = useState(false)
  
  // 免打扰
  const [quietModeEnabled, setQuietModeEnabled] = useState(true)
  const [quietStart, setQuietStart] = useState("22:00")
  const [quietEnd, setQuietEnd] = useState("08:00")

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">通知设置</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 总开关 */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                pushEnabled ? "bg-primary/10" : "bg-muted"
              )}>
                {pushEnabled ? (
                  <Bell className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">接收推送通知</p>
                <p className="text-xs text-muted-foreground">
                  {pushEnabled ? "已开启，将收到各类通知提醒" : "已关闭，将不会收到任何推送"}
                </p>
              </div>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
          </div>
        </Card>

        {/* 以下设置在总开关关闭时禁用 */}
        <div className={cn(!pushEnabled && "opacity-50 pointer-events-none")}>
          {/* 互动通知 */}
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border">
              <span className="text-xs text-muted-foreground font-medium">互动通知</span>
            </div>
            <div className="divide-y divide-border">
              <NotifyRow
                icon={MessageCircle}
                title="评论通知"
                description="有人评论您的内容时通知"
                checked={notifyComment}
                onChange={setNotifyComment}
              />
              <NotifyRow
                icon={Heart}
                title="点赞通知"
                description="有人点赞您的内容时通知"
                checked={notifyLike}
                onChange={setNotifyLike}
              />
              <NotifyRow
                icon={Users}
                title="关注通知"
                description="有人关注您时通知"
                checked={notifyFollow}
                onChange={setNotifyFollow}
              />
              <NotifyRow
                icon={MessageCircle}
                title="@提及通知"
                description="有人@您时通知"
                checked={notifyMention}
                onChange={setNotifyMention}
              />
              <NotifyRow
                icon={MessageCircle}
                title="私信通知"
                description="收到私信时通知"
                checked={notifyMessage}
                onChange={setNotifyMessage}
              />
            </div>
          </Card>

          {/* 内容通知 */}
          <Card className="overflow-hidden mt-4">
            <div className="px-4 py-2.5 border-b border-border">
              <span className="text-xs text-muted-foreground font-medium">内容更新</span>
            </div>
            <div className="divide-y divide-border">
              <NotifyRow
                icon={Users}
                title="圈子更新"
                description="关注的圈子有新内容时通知"
                checked={notifyCircleUpdate}
                onChange={setNotifyCircleUpdate}
              />
              <NotifyRow
                icon={Video}
                title="直播开播"
                description="预约的直播开播时通知"
                checked={notifyLiveStart}
                onChange={setNotifyLiveStart}
              />
              <NotifyRow
                icon={Smartphone}
                title="课程更新"
                description="订阅的课程有新章节时通知"
                checked={notifyCourseUpdate}
                onChange={setNotifyCourseUpdate}
              />
              <NotifyRow
                icon={Calendar}
                title="活动提醒"
                description="报名的活动即将开始时通知"
                checked={notifyActivityRemind}
                onChange={setNotifyActivityRemind}
              />
            </div>
          </Card>

          {/* 交易通知 */}
          <Card className="overflow-hidden mt-4">
            <div className="px-4 py-2.5 border-b border-border">
              <span className="text-xs text-muted-foreground font-medium">交易通知</span>
            </div>
            <div className="divide-y divide-border">
              <NotifyRow
                icon={ShoppingBag}
                title="订单通知"
                description="订单状态变更时通知（发货、完成等）"
                checked={notifyOrder}
                onChange={setNotifyOrder}
              />
              <NotifyRow
                icon={Coins}
                title="收益通知"
                description="有新收益到账时通知"
                checked={notifyIncome}
                onChange={setNotifyIncome}
              />
              <NotifyRow
                icon={Clock}
                title="到期提醒"
                description="会员、圈子等即将到期时通知"
                checked={notifyExpiry}
                onChange={setNotifyExpiry}
                important
              />
            </div>
          </Card>

          {/* 系统通知 */}
          <Card className="overflow-hidden mt-4">
            <div className="px-4 py-2.5 border-b border-border">
              <span className="text-xs text-muted-foreground font-medium">系统通知</span>
            </div>
            <div className="divide-y divide-border">
              <NotifyRow
                icon={Bell}
                title="系统消息"
                description="平台公告、安全提醒等重要通知"
                checked={notifySystem}
                onChange={setNotifySystem}
              />
              <NotifyRow
                icon={Mail}
                title="营销推广"
                description="优惠活动、新功能推荐等"
                checked={notifyPromotion}
                onChange={setNotifyPromotion}
              />
            </div>
          </Card>

          {/* 免打扰模式 */}
          <Card className="overflow-hidden mt-4">
            <div className="px-4 py-2.5 border-b border-border">
              <span className="text-xs text-muted-foreground font-medium">免打扰模式</span>
            </div>
            <div className="divide-y divide-border">
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-operator/10 flex items-center justify-center">
                    <Moon className="w-4 h-4 text-operator" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">开启免打扰</p>
                    <p className="text-[10px] text-muted-foreground">在指定时间段内不接收推送通知</p>
                  </div>
                </div>
                <Switch checked={quietModeEnabled} onCheckedChange={setQuietModeEnabled} />
              </div>
              
              {quietModeEnabled && (
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 ml-11">
                    <p className="text-sm text-muted-foreground">免打扰时段</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TimeSelect value={quietStart} onChange={setQuietStart} />
                    <span className="text-muted-foreground">-</span>
                    <TimeSelect value={quietEnd} onChange={setQuietEnd} />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 提示 */}
        <p className="text-[10px] text-muted-foreground text-center px-4">
          关闭通知后，您仍可在消息中心查看相关消息
        </p>
      </div>
    </div>
  )
}

// 通知设置行
function NotifyRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  important,
}: {
  icon: React.ElementType
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  important?: boolean
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          important ? "bg-amber-500/10" : "bg-primary/10"
        )}>
          <Icon className={cn("w-4 h-4", important ? "text-amber-500" : "text-primary")} />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium">{title}</p>
            {important && (
              <span className="text-[10px] text-amber-500 font-medium">重要</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// 时间选择器
function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const times = [
    "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
  ]
  
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs bg-secondary border-0 rounded-md px-2 py-1 text-foreground"
    >
      {times.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  )
}
