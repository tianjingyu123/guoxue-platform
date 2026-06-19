"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Users, Clock, Share2, ChevronRight } from "lucide-react"

interface GroupMember {
  id: number
  name: string
  avatar?: string
}

interface GroupBuyInfo {
  id: number
  groupPrice: number
  originalPrice: number
  requiredMembers: number
  currentMembers: number
  members: GroupMember[]
  endTime: Date
  isHost?: boolean
}

interface GroupBuyCardProps {
  productId: number
  productName: string
  productImage?: string
  groupPrice: number
  originalPrice: number
  requiredMembers: number
  activeGroups?: GroupBuyInfo[]
  className?: string
  onStartGroup?: () => void
  onJoinGroup?: (groupId: number) => void
}

// 倒计时Hook
function useCountdown(endTime: Date) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculate = () => {
      const diff = endTime.getTime() - Date.now()
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 }
      return {
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      }
    }
    setTimeLeft(calculate())
    const timer = setInterval(() => setTimeLeft(calculate()), 1000)
    return () => clearInterval(timer)
  }, [endTime])

  return timeLeft
}

// 拼团商品卡片（在商品/课程详情页展示）
export function GroupBuyProductCard({ 
  productName, 
  groupPrice, 
  originalPrice, 
  requiredMembers, 
  activeGroups = [],
  onStartGroup,
  onJoinGroup,
  className 
}: GroupBuyCardProps) {
  return (
    <Card className={cn("p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent", className)}>
      {/* 顶部标题 */}
      <div className="flex items-center gap-2 mb-3">
        <Badge className="bg-primary text-primary-foreground border-0 px-2 py-0.5">
          <Users className="w-3 h-3 mr-1" />
          {requiredMembers}人拼团
        </Badge>
        <span className="text-xs text-muted-foreground">更优惠</span>
      </div>

      {/* 价格对比 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-[10px] text-muted-foreground mb-1">拼团价</p>
          <p className="text-xl font-bold text-primary">¥{groupPrice}</p>
        </div>
        <div className="flex-1 p-3 rounded-lg bg-secondary">
          <p className="text-[10px] text-muted-foreground mb-1">单独购买</p>
          <p className="text-xl font-bold text-muted-foreground">¥{originalPrice}</p>
        </div>
      </div>

      {/* 正在进行的拼团 */}
      {activeGroups.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-muted-foreground">正在拼团</p>
          {activeGroups.slice(0, 2).map((group) => (
            <GroupProgressCard key={group.id} group={group} onJoin={() => onJoinGroup?.(group.id)} />
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1 border-primary text-primary hover:bg-primary/10"
          onClick={onStartGroup}
        >
          发起拼团
        </Button>
        <Button className="flex-1" onClick={onStartGroup}>
          ¥{groupPrice} 去拼团
        </Button>
      </div>
    </Card>
  )
}

// 拼团进度卡片（显示当前拼团状态）
interface GroupProgressCardProps {
  group: GroupBuyInfo
  onJoin?: () => void
  showDetail?: boolean
}

export function GroupProgressCard({ group, onJoin, showDetail = false }: GroupProgressCardProps) {
  const { hours, minutes, seconds } = useCountdown(group.endTime)
  const remainingSlots = group.requiredMembers - group.currentMembers

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
      {/* 成员头像 */}
      <div className="flex -space-x-2">
        {group.members.map((member) => (
          <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
            <AvatarImage src={member.avatar} />
            <AvatarFallback className="text-[10px] bg-primary/10">{member.name[0]}</AvatarFallback>
          </Avatar>
        ))}
        {/* 空位 */}
        {[...Array(remainingSlots)].map((_, i) => (
          <div key={`empty-${i}`} className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 bg-secondary flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground">?</span>
          </div>
        ))}
      </div>

      {/* 拼团信息 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs">
          还差<span className="text-primary font-bold mx-1">{remainingSlots}</span>人成团
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>剩余 {hours}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
        </div>
      </div>

      {/* 参团按钮 */}
      <Button size="sm" className="h-8 px-4 text-xs" onClick={onJoin}>
        去参团
      </Button>
    </div>
  )
}

// 拼团详情弹窗内容
interface GroupDetailProps {
  group: GroupBuyInfo
  productName: string
  productImage?: string
  groupPrice: number
  originalPrice: number
  onJoin?: () => void
  onInvite?: () => void
}

export function GroupDetailContent({ 
  group, 
  productName, 
  productImage, 
  groupPrice, 
  originalPrice,
  onJoin,
  onInvite
}: GroupDetailProps) {
  const { hours, minutes, seconds } = useCountdown(group.endTime)
  const remainingSlots = group.requiredMembers - group.currentMembers
  const isInGroup = group.members.some(m => m.isHost)

  return (
    <div className="p-4 space-y-4">
      {/* 拼团进度 */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-3">
          还差<span className="text-primary font-bold text-lg mx-1">{remainingSlots}</span>人成团
        </p>
        
        {/* 成员头像 */}
        <div className="flex justify-center -space-x-3 mb-3">
          {group.members.map((member) => (
            <div key={member.id} className="relative">
              <Avatar className="w-14 h-14 border-3 border-background">
                <AvatarImage src={member.avatar} />
                <AvatarFallback className="text-sm bg-primary/10">{member.name[0]}</AvatarFallback>
              </Avatar>
              {member.isHost && (
                <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] px-1 py-0 bg-primary border-0">
                  团长
                </Badge>
              )}
            </div>
          ))}
          {[...Array(remainingSlots)].map((_, i) => (
            <div key={`empty-${i}`} className="w-14 h-14 rounded-full border-3 border-dashed border-muted-foreground/30 bg-secondary flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground/30" />
            </div>
          ))}
        </div>

        {/* 倒计时 */}
        <div className="flex items-center justify-center gap-1 text-sm">
          <Clock className="w-4 h-4 text-red-500" />
          <span className="text-muted-foreground">剩余</span>
          <span className="px-2 py-0.5 bg-red-500 text-white font-bold rounded">{String(hours).padStart(2, '0')}</span>
          <span className="text-red-500 font-bold">:</span>
          <span className="px-2 py-0.5 bg-red-500 text-white font-bold rounded">{String(minutes).padStart(2, '0')}</span>
          <span className="text-red-500 font-bold">:</span>
          <span className="px-2 py-0.5 bg-red-500 text-white font-bold rounded">{String(seconds).padStart(2, '0')}</span>
        </div>
      </div>

      {/* 价格对比 */}
      <div className="flex items-center justify-center gap-6 py-3 border-y border-border">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">拼团价</p>
          <p className="text-2xl font-bold text-primary">¥{groupPrice}</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">单独购买</p>
          <p className="text-lg text-muted-foreground line-through">¥{originalPrice}</p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-2">
        {isInGroup ? (
          <Button className="w-full h-12" onClick={onInvite}>
            <Share2 className="w-4 h-4 mr-2" />
            邀请好友参团
          </Button>
        ) : (
          <Button className="w-full h-12" onClick={onJoin}>
            参与拼团
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={onJoin}>
          我要开新团
        </Button>
      </div>
    </div>
  )
}

export default GroupBuyProductCard
