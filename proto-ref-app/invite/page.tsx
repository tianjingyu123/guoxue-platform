"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Share2, Image, Copy, Check, Gift, Users, Crown, ChevronRight, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 邀请码
const inviteCode = "REBU2024"

// 已邀请好友数据
const invitedFriends = [
  { id: 1, name: "张三", avatar: "", registerTime: "2024-03-15 14:30", status: "registered" as const },
  { id: 2, name: "李四", avatar: "", registerTime: "2024-03-14 09:20", status: "registered" as const },
  { id: 3, name: "王五", avatar: "", registerTime: "2024-03-13 16:45", status: "pending" as const },
  { id: 4, name: "赵六", avatar: "", registerTime: "2024-03-12 11:00", status: "registered" as const },
]

// 排行榜数据
const leaderboard = [
  { rank: 1, name: "周易大师", avatar: "", count: 128 },
  { rank: 2, name: "张玄风", avatar: "", count: 96 },
  { rank: 3, name: "陈风水", avatar: "", count: 72 },
  { rank: 4, name: "李易安", avatar: "", count: 58 },
  { rank: 5, name: "王命理", avatar: "", count: 45 },
]

export default function InvitePage() {
  const [copied, setCopied] = useState(false)
  const [showPoster, setShowPoster] = useState(false)
  const [leaderboardTab, setLeaderboardTab] = useState<"today" | "total">("total")

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareLink = () => {
    const shareUrl = `https://rebu.com/register?invite=${inviteCode}`
    if (navigator.share) {
      navigator.share({
        title: "热卜国学邀请你加入",
        text: "我在热卜国学发现了很多有趣的国学内容，邀请你一起来学习！",
        url: shareUrl,
      })
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert("链接已复制，快去分享给好友吧！")
    }
  }

  const registeredCount = invitedFriends.filter(f => f.status === "registered").length

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-12">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">邀请好友</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 邀请奖励说明卡片 */}
      <div className="px-4 pt-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent p-5">
          {/* 装饰图案 */}
          <div className="absolute -right-6 -top-6 w-24 h-24 opacity-10">
            <Gift className="w-full h-full text-white" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">邀请好友，双方有礼</h2>
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              邀请1位好友注册，双方各得<span className="font-bold text-accent-foreground"> 7天会员体验</span>。
              <br />多邀多得，上不封顶。
            </p>
            
            {/* 我的邀请数据 */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{invitedFriends.length}</p>
                <p className="text-xs text-white/70">已邀请</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{registeredCount}</p>
                <p className="text-xs text-white/70">已注册</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{registeredCount * 7}</p>
                <p className="text-xs text-white/70">获得天数</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 邀请方式区 */}
      <div className="px-4 pt-6">
        <h3 className="font-semibold text-sm text-foreground mb-3">邀请方式</h3>
        
        <div className="grid grid-cols-3 gap-3">
          {/* 分享邀请链接 */}
          <button 
            onClick={handleShareLink}
            className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-foreground font-medium">分享链接</span>
          </button>

          {/* 生成邀请海报 */}
          <button 
            onClick={() => setShowPoster(true)}
            className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:border-accent/50 hover:bg-secondary/50 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Image className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs text-foreground font-medium">生成海报</span>
          </button>

          {/* 复制邀请码 */}
          <button 
            onClick={handleCopyCode}
            className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:border-green-500/50 hover:bg-secondary/50 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5 text-green-500" />
              )}
            </div>
            <span className="text-xs text-foreground font-medium">
              {copied ? "已复制" : "复制邀请码"}
            </span>
          </button>
        </div>

        {/* 邀请码展示 */}
        <Card className="mt-4 p-4 bg-secondary/30 border-dashed">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">我的邀请码</p>
              <p className="text-xl font-bold text-primary tracking-widest mt-1">{inviteCode}</p>
            </div>
            <button 
              onClick={handleCopyCode}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              {copied ? "已复制" : "复制"}
            </button>
          </div>
        </Card>
      </div>

      {/* 邀请排行榜 */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-sm text-foreground">邀请排行榜</h3>
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-full p-0.5">
            <button
              onClick={() => setLeaderboardTab("today")}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                leaderboardTab === "today"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              今日
            </button>
            <button
              onClick={() => setLeaderboardTab("total")}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                leaderboardTab === "total"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              累计
            </button>
          </div>
        </div>

        <Card className="divide-y divide-border">
          {leaderboard.map((user, index) => (
            <div key={user.rank} className="flex items-center gap-3 p-3">
              {/* 排名 */}
              <div className="w-6 text-center">
                {user.rank <= 3 ? (
                  <span className={cn(
                    "text-lg font-bold",
                    user.rank === 1 && "text-yellow-500",
                    user.rank === 2 && "text-gray-400",
                    user.rank === 3 && "text-orange-400"
                  )}>
                    {user.rank}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">{user.rank}</span>
                )}
              </div>
              
              <Avatar className="w-9 h-9">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-secondary text-foreground text-xs">
                  {user.name[0]}
                </AvatarFallback>
              </Avatar>
              
              <span className="flex-1 text-sm font-medium text-foreground">{user.name}</span>
              
              <div className="text-right">
                <span className="text-sm font-semibold text-primary">{user.count}</span>
                <span className="text-xs text-muted-foreground ml-1">人</span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* 已邀请好友列表 */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">已邀请好友</h3>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {invitedFriends.length}人
            </Badge>
          </div>
          <Link href="/invite/history" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            全部记录 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {invitedFriends.length > 0 ? (
          <Card className="divide-y divide-border">
            {invitedFriends.map((friend) => (
              <div key={friend.id} className="flex items-center gap-3 p-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={friend.avatar} alt={friend.name} />
                  <AvatarFallback className="bg-secondary text-foreground text-sm">
                    {friend.name[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{friend.name}</p>
                  <p className="text-xs text-muted-foreground">{friend.registerTime}</p>
                </div>
                
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] px-2 py-0.5 border-0",
                    friend.status === "registered" 
                      ? "bg-green-500/10 text-green-500" 
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {friend.status === "registered" ? "已注册" : "待激活"}
                </Badge>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">还没有邀请好友</p>
            <p className="text-xs text-muted-foreground/70 mt-1">快去分享邀请链接吧</p>
          </Card>
        )}
      </div>

      {/* 邀请海报弹窗 */}
      {showPoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm">
            {/* 海报预览 */}
            <Card className="overflow-hidden">
              <div className="aspect-[9/16] bg-gradient-to-br from-primary via-primary/80 to-accent relative">
                {/* 海报内容 */}
                <div className="absolute inset-0 flex flex-col items-center justify-between p-6">
                  {/* 顶部 */}
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl font-bold text-white">卜</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">热卜国学</h3>
                    <p className="text-sm text-white/80 mt-1">探索易学智慧</p>
                  </div>
                  
                  {/* 中间 */}
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white mb-2">邀请你一起学习国学</p>
                    <p className="text-sm text-white/80">注册即送7天会员体验</p>
                  </div>
                  
                  {/* 底部二维码 */}
                  <div className="bg-white rounded-xl p-4 text-center">
                    <div className="w-24 h-24 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-xs text-muted-foreground">二维码</span>
                    </div>
                    <p className="text-xs text-muted-foreground">长按识别二维码</p>
                    <p className="text-[10px] text-muted-foreground mt-1">邀请码: {inviteCode}</p>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* 操作按钮 */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowPoster(false)}
                className="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  alert("海报已保存到相册")
                  setShowPoster(false)
                }}
                className="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                保存海报
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
