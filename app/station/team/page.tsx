'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  Wallet, 
  Percent,
  Search,
  Filter,
  Share2,
  ChevronRight,
  Clock,
  Trophy,
  Medal,
  Star,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  QrCode
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataState } from '@/components/data-state'
import { 
  getTeamManagementData, 
  getTeamMembers, 
  getTeamLeaderboard,
  getTeamActivities,
  getTeamSuccessCases,
  generateInviteLink,
  getMemberDetail,
  getActivityTypeName,
  getActivityTypeIcon
} from '@/lib/api/team'
import type { 
  TeamManagementData, 
  TeamMember, 
  LeaderboardItem,
  TeamActivity,
  TeamSuccessCase
} from '@/lib/types/team'

export default function TeamManagementPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('members')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TeamManagementData | null>(null)
  
  // 成员列表
  const [members, setMembers] = useState<TeamMember[]>([])
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [memberSort, setMemberSort] = useState<'commission' | 'inviteCount' | 'joinDate'>('commission')
  
  // 排行榜
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'week' | 'month' | 'all'>('month')
  const [myRank, setMyRank] = useState<number | undefined>()
  
  // 动态
  const [activities, setActivities] = useState<TeamActivity[]>([])
  
  // 成功案例
  const [successCases, setSuccessCases] = useState<TeamSuccessCase[]>([])
  
  // 邀请弹窗
  const [showInvite, setShowInvite] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteQrcode, setInviteQrcode] = useState('')
  
  // 成员详情弹窗
  const [showMemberDetail, setShowMemberDetail] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [memberDetailData, setMemberDetailData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'members') {
      loadMembers()
    } else if (activeTab === 'leaderboard') {
      loadLeaderboard()
    } else if (activeTab === 'activities') {
      loadActivities()
    } else if (activeTab === 'cases') {
      loadSuccessCases()
    }
  }, [activeTab, memberFilter, memberSort, leaderboardPeriod])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getTeamManagementData()
      if (res.code === 200) {
        setData(res.data)
      } else {
        setError(res.message)
      }
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    const res = await getTeamMembers(1, 20, memberFilter, memberSort)
    if (res.code === 200) {
      setMembers(res.data.list)
    }
  }

  const loadLeaderboard = async () => {
    const res = await getTeamLeaderboard('commission', leaderboardPeriod)
    if (res.code === 200) {
      setLeaderboard(res.data.list)
      setMyRank(res.data.myRank)
    }
  }

  const loadActivities = async () => {
    const res = await getTeamActivities()
    if (res.code === 200) {
      setActivities(res.data.list)
    }
  }

  const loadSuccessCases = async () => {
    const res = await getTeamSuccessCases()
    if (res.code === 200) {
      setSuccessCases(res.data)
    }
  }

  const handleInvite = async () => {
    const res = await generateInviteLink()
    if (res.code === 200) {
      setInviteLink(res.data.link)
      setInviteQrcode(res.data.qrcode)
      setShowInvite(true)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    alert('链接已复制')
  }

  const handleViewMember = async (member: TeamMember) => {
    setSelectedMember(member)
    setShowMemberDetail(true)
    const res = await getMemberDetail(member.id)
    if (res.code === 200) {
      setMemberDetailData(res.data)
    }
  }

  // 排行榜前三样式
  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-white'
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
    return 'bg-muted text-muted-foreground'
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">团队管理</h1>
          </div>
          <Button 
            size="sm" 
            className="bg-primary text-primary-foreground"
            onClick={handleInvite}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            邀请下级
          </Button>
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!data}
        onRetry={loadData}
      >
        {data && (
          <div className="pb-20">
            {/* 概览卡片 */}
            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Users className="w-4 h-4" />
                    <span>团队总人数</span>
                  </div>
                  <div className="text-2xl font-bold">{data.overview.totalMembers}</div>
                  <div className="text-xs text-green-600 mt-1">
                    本月新增 +{data.overview.newMembersThisMonth}
                  </div>
                </div>
                <div className="bg-background rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Wallet className="w-4 h-4" />
                    <span>累计佣金</span>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {data.overview.totalCommission.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">元</div>
                </div>
                <div className="bg-background rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Percent className="w-4 h-4" />
                    <span>提成比例</span>
                  </div>
                  <div className="text-2xl font-bold">{data.overview.commissionRate}%</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.overview.myLevel}
                  </div>
                </div>
                <div className="bg-background rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>升级进度</span>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ 
                          width: `${Math.min((data.overview.totalCommission / data.overview.nextLevelRequirement) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      距下一等级还需 {(data.overview.nextLevelRequirement - data.overview.totalCommission).toFixed(0)} 元
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab 切换 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid grid-cols-4 mx-4">
                <TabsTrigger value="members">成员</TabsTrigger>
                <TabsTrigger value="leaderboard">排行榜</TabsTrigger>
                <TabsTrigger value="activities">动态</TabsTrigger>
                <TabsTrigger value="cases">案例</TabsTrigger>
              </TabsList>

              {/* 成员列表 */}
              <TabsContent value="members" className="mt-4 px-4">
                {/* 筛选栏 */}
                <div className="flex items-center gap-2 mb-4">
                  <Select value={memberFilter} onValueChange={(v: any) => setMemberFilter(v)}>
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="active">活跃</SelectItem>
                      <SelectItem value="inactive">不活跃</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={memberSort} onValueChange={(v: any) => setMemberSort(v)}>
                    <SelectTrigger className="w-28 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commission">按佣金</SelectItem>
                      <SelectItem value="inviteCount">按邀请数</SelectItem>
                      <SelectItem value="joinDate">按加入时间</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 成员列表 */}
                <div className="space-y-3">
                  {members.map(member => (
                    <div 
                      key={member.id}
                      className="bg-card rounded-xl p-4 border cursor-pointer active:bg-accent/50"
                      onClick={() => handleViewMember(member)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.nickname[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{member.nickname}</span>
                            <Badge variant="secondary" className="text-xs">
                              {member.levelIcon} {member.level}
                            </Badge>
                            {member.status === 'inactive' && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                不活跃
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {member.phone} · 加入于 {member.joinDate}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>
                              佣金 <span className="text-primary font-medium">{member.totalCommission.toFixed(2)}</span>
                            </span>
                            <span>
                              邀请 <span className="font-medium">{member.inviteCount}</span> 人
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}

                  {members.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>暂无团队成员</p>
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={handleInvite}
                      >
                        立即邀请下级
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 排行榜 */}
              <TabsContent value="leaderboard" className="mt-4 px-4">
                {/* 周期选择 */}
                <div className="flex gap-2 mb-4">
                  {(['week', 'month', 'all'] as const).map(period => (
                    <Button
                      key={period}
                      variant={leaderboardPeriod === period ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLeaderboardPeriod(period)}
                    >
                      {period === 'week' ? '本周' : period === 'month' ? '本月' : '总榜'}
                    </Button>
                  ))}
                </div>

                {/* 排行榜列表 */}
                <div className="space-y-3">
                  {leaderboard.map(item => (
                    <div 
                      key={item.userId}
                      className={`rounded-xl p-4 ${item.rank <= 3 ? 'bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-primary' : 'bg-card border'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(item.rank)}`}>
                          {item.rank}
                        </div>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={item.avatar} />
                          <AvatarFallback>{item.nickname[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{item.nickname}</span>
                            {getRankIcon(item.rank)}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.level}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{item.value.toFixed(2)}</div>
                          <div className="text-xs flex items-center justify-end gap-1">
                            {item.change > 0 ? (
                              <>
                                <ArrowUpRight className="w-3 h-3 text-green-600" />
                                <span className="text-green-600">+{item.change}</span>
                              </>
                            ) : item.change < 0 ? (
                              <>
                                <ArrowDownRight className="w-3 h-3 text-red-500" />
                                <span className="text-red-500">{item.change}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 我的排名 */}
                  {myRank && (
                    <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="text-sm text-muted-foreground mb-1">我的排名</div>
                      <div className="text-2xl font-bold">第 {myRank} 名</div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 团队动态 */}
              <TabsContent value="activities" className="mt-4 px-4">
                <div className="relative">
                  {/* 时间线 */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

                  <div className="space-y-4">
                    {activities.map(activity => (
                      <div key={activity.id} className="relative pl-12">
                        {/* 时间点 */}
                        <div className="absolute left-3 top-1 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs">
                          {getActivityTypeIcon(activity.type)}
                        </div>

                        <div className="bg-card rounded-xl p-4 border">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={activity.userAvatar} />
                              <AvatarFallback>{activity.userNickname[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div>
                                <span className="font-medium">{activity.userNickname}</span>
                                <span className="text-muted-foreground ml-2">{activity.content}</span>
                              </div>
                              {activity.amount && (
                                <div className="text-primary font-medium mt-1">
                                  +{activity.amount.toFixed(2)} 元
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {activity.createdAt}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {activities.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>暂无团队动态</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* 成功案例 */}
              <TabsContent value="cases" className="mt-4 px-4">
                <div className="space-y-4">
                  {successCases.map(caseItem => (
                    <div key={caseItem.id} className="bg-card rounded-xl p-4 border">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={caseItem.avatar} />
                          <AvatarFallback>{caseItem.nickname[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{caseItem.nickname}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-primary/10 text-primary">
                              {caseItem.achievement}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              加入 {caseItem.duration}
                            </span>
                          </div>
                        </div>
                      </div>
                      <h3 className="font-medium mb-2">{caseItem.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {caseItem.description}
                      </p>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <span className="text-sm text-muted-foreground">
                          累计收益
                        </span>
                        <span className="text-primary font-bold">
                          {caseItem.totalEarnings.toFixed(2)} 元
                        </span>
                      </div>
                    </div>
                  ))}

                  {successCases.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>暂无成功案例</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DataState>

      {/* 邀请弹窗 */}
      <Sheet open={showInvite} onOpenChange={setShowInvite}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>邀请下级</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-6">
            {/* 二维码 */}
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center">
                {inviteQrcode ? (
                  <img src={inviteQrcode} alt="邀请二维码" className="w-full h-full object-contain p-4" />
                ) : (
                  <QrCode className="w-24 h-24 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">扫码加入我的团队</p>
            </div>

            {/* 链接 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">邀请链接</div>
              <div className="flex gap-2">
                <Input 
                  value={inviteLink} 
                  readOnly 
                  className="flex-1 bg-muted"
                />
                <Button onClick={handleCopyLink}>
                  <Copy className="w-4 h-4 mr-1" />
                  复制
                </Button>
              </div>
            </div>

            {/* 分享按钮 */}
            <Button className="w-full" size="lg">
              <Share2 className="w-4 h-4 mr-2" />
              分享邀请海报
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 成员详情弹窗 */}
      <Sheet open={showMemberDetail} onOpenChange={setShowMemberDetail}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-auto">
          <SheetHeader>
            <SheetTitle>成员详情</SheetTitle>
          </SheetHeader>
          {selectedMember && (
            <div className="py-4 space-y-4">
              {/* 成员信息 */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedMember.avatar} />
                  <AvatarFallback>{selectedMember.nickname[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-lg">{selectedMember.nickname}</div>
                  <Badge variant="secondary">{selectedMember.levelIcon} {selectedMember.level}</Badge>
                  <div className="text-sm text-muted-foreground mt-1">
                    加入于 {selectedMember.joinDate}
                  </div>
                </div>
              </div>

              {/* 业绩数据 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-card rounded-xl border">
                  <div className="text-2xl font-bold text-primary">
                    {selectedMember.totalCommission.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">累计佣金</div>
                </div>
                <div className="text-center p-3 bg-card rounded-xl border">
                  <div className="text-2xl font-bold">
                    {selectedMember.thisMonthCommission.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">本月佣金</div>
                </div>
                <div className="text-center p-3 bg-card rounded-xl border">
                  <div className="text-2xl font-bold">{selectedMember.inviteCount}</div>
                  <div className="text-xs text-muted-foreground">邀请人数</div>
                </div>
              </div>

              {/* 近期订单 */}
              {memberDetailData?.recentOrders && (
                <div>
                  <h3 className="font-medium mb-3">近期推广订单</h3>
                  <div className="space-y-2">
                    {memberDetailData.recentOrders.map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                        <div>
                          <div className="text-sm">订单金额 {order.amount} 元</div>
                          <div className="text-xs text-muted-foreground">{order.time}</div>
                        </div>
                        <div className="text-primary font-medium">+{order.commission.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 邀请的成员 */}
              {memberDetailData?.invitedMembers && memberDetailData.invitedMembers.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">邀请的成员</h3>
                  <div className="flex flex-wrap gap-3">
                    {memberDetailData.invitedMembers.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={m.avatar} />
                          <AvatarFallback>{m.nickname[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{m.nickname}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
