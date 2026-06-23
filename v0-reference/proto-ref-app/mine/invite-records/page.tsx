'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Users, UserCheck, CreditCard, Coins, Link2, QrCode, Copy, Share2, RefreshCw, Crown, Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { DataState } from '@/components/data-state'
import { getInviteStats, getInviteRecords, getInviteLinkInfo, regenerateInviteLink, getInviteStatusText, getInviteStatusColor } from '@/lib/api/invite'
import type { InviteStats, InviteRecord, InviteLinkInfo } from '@/lib/types/invite'

export default function InviteRecordsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<InviteStats | null>(null)
  const [records, setRecords] = useState<InviteRecord[]>([])
  const [linkInfo, setLinkInfo] = useState<InviteLinkInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'registered' | 'paid' | 'vip'>('all')
  const [showLinkSheet, setShowLinkSheet] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, recordsRes, linkRes] = await Promise.all([
        getInviteStats(),
        getInviteRecords(1, 50, filter),
        getInviteLinkInfo(),
      ])
      if (statsRes.code === 200) setStats(statsRes.data)
      if (recordsRes.code === 200) setRecords(recordsRes.data.list)
      if (linkRes.code === 200) setLinkInfo(linkRes.data)
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!linkInfo) return
    try {
      await navigator.clipboard.writeText(linkInfo.inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleRegenerateLink = async () => {
    setRegenerating(true)
    try {
      const res = await regenerateInviteLink()
      if (res.code === 200) {
        setLinkInfo(res.data)
      }
    } finally {
      setRegenerating(false)
    }
  }

  const statItems = stats ? [
    { label: '邀请人数', value: stats.totalInvited, icon: Users, color: 'text-blue-600' },
    { label: '已注册', value: stats.registeredCount, icon: UserCheck, color: 'text-green-600' },
    { label: '已付费', value: stats.paidCount, icon: CreditCard, color: 'text-purple-600' },
    { label: '总收益', value: `¥${stats.totalEarnings.toFixed(2)}`, icon: Coins, color: 'text-amber-600' },
  ] : []

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#C9A96E]/20">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6 text-[#2D2A26]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2D2A26]">邀请记录</h1>
          <button onClick={() => setShowLinkSheet(true)} className="p-1">
            <Share2 className="w-5 h-5 text-[#C41E3A]" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 统计卡片 */}
        <DataState
          loading={loading}
          error={error}
          empty={!stats}
          skeleton={
            <Card className="bg-gradient-to-br from-[#C41E3A] to-[#A01830]">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="text-center">
                      <Skeleton className="h-8 w-16 mx-auto mb-1 bg-white/20" />
                      <Skeleton className="h-3 w-12 mx-auto bg-white/20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          }
        >
          <Card className="bg-gradient-to-br from-[#C41E3A] to-[#A01830] border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-2">
                {statItems.map((item, index) => (
                  <div key={index} className="text-center">
                    <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-white/20 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-lg font-bold text-white">{item.value}</p>
                    <p className="text-xs text-white/70">{item.label}</p>
                  </div>
                ))}
              </div>
              
              {/* 待结算提示 */}
              {stats && stats.pendingEarnings > 0 && (
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                  <span className="text-sm text-white/80">待结算收益</span>
                  <span className="text-sm font-semibold text-[#C9A96E]">¥{stats.pendingEarnings.toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </DataState>

        {/* 邀请链接快捷入口 */}
        <Card className="border-[#C9A96E]/30">
          <CardContent className="p-3">
            <button
              onClick={() => setShowLinkSheet(true)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#C41E3A]/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-[#C41E3A]" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#2D2A26]">我的邀请链接</p>
                  <p className="text-xs text-muted-foreground">
                    邀请码：{linkInfo?.inviteCode || '---'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        {/* 筛选 */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="w-full bg-white border border-[#C9A96E]/30">
            <TabsTrigger value="all" className="flex-1 text-sm data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white">
              全部
            </TabsTrigger>
            <TabsTrigger value="registered" className="flex-1 text-sm data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white">
              已注册
            </TabsTrigger>
            <TabsTrigger value="paid" className="flex-1 text-sm data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white">
              已付费
            </TabsTrigger>
            <TabsTrigger value="vip" className="flex-1 text-sm data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white">
              会员
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 邀请记录列表 */}
        <DataState
          loading={loading}
          error={error}
          empty={records.length === 0}
          emptyMessage="暂无邀请记录"
          skeleton={
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-[#C9A96E]/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          <div className="space-y-3">
            {records.map((record) => (
              <Card key={record.id} className="border-[#C9A96E]/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={record.invitee.avatar} />
                      <AvatarFallback className="bg-[#C41E3A]/10 text-[#C41E3A]">
                        {record.invitee.nickname.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#2D2A26] truncate">
                          {record.invitee.nickname}
                        </span>
                        {record.status === 'vip' && (
                          <Crown className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{record.invitee.phone}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        注册：{record.registeredAt}
                      </p>
                      {record.paidAt && (
                        <p className="text-xs text-muted-foreground">
                          首付：{record.paidAt} · 累计 ¥{record.paidAmount}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={`${getInviteStatusColor(record.status)} border-current`}
                      >
                        {getInviteStatusText(record.status)}
                      </Badge>
                      {record.commission > 0 && (
                        <p className="text-sm font-semibold text-[#C41E3A] mt-2">
                          +¥{record.commission.toFixed(2)}
                        </p>
                      )}
                      {record.pendingCommission > 0 && (
                        <p className="text-xs text-muted-foreground">
                          待结算 ¥{record.pendingCommission.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DataState>
      </div>

      {/* 邀请链接弹窗 */}
      <Sheet open={showLinkSheet} onOpenChange={setShowLinkSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-[#2D2A26]">邀请好友</SheetTitle>
          </SheetHeader>
          
          <div className="py-6 space-y-6">
            {/* 二维码 */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl border border-[#C9A96E]/30 shadow-sm">
                {linkInfo?.qrCodeUrl ? (
                  <img
                    src={linkInfo.qrCodeUrl}
                    alt="邀请二维码"
                    className="w-40 h-40"
                  />
                ) : (
                  <div className="w-40 h-40 bg-gray-100 flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            
            {/* 邀请码 */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">我的邀请码</p>
              <p className="text-2xl font-bold text-[#C41E3A] tracking-wider">
                {linkInfo?.inviteCode || '---'}
              </p>
            </div>
            
            {/* 邀请链接 */}
            <div className="bg-[#FAF8F5] rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">邀请链接</p>
              <p className="text-sm text-[#2D2A26] break-all">
                {linkInfo?.inviteLink || '---'}
              </p>
            </div>
            
            {/* 操作按钮 */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="border-[#C9A96E] text-[#C9A96E]"
                onClick={handleRegenerateLink}
                disabled={regenerating}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                重新生成
              </Button>
              <Button
                className="bg-[#C41E3A] hover:bg-[#A01830] text-white"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    复制链接
                  </>
                )}
              </Button>
            </div>
            
            {/* 邀请规则 */}
            <div className="pt-4 border-t border-[#C9A96E]/20">
              <p className="text-xs text-muted-foreground text-center">
                好友通过链接注册并付费后，您将获得相应佣金奖励
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
