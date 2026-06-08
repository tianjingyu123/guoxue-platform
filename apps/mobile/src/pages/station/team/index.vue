<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">分站管理</text>
      <text class="v0-route">V0: station/team</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="flex items-center gap-3">
                <Button variant="ghost" size="icon" @click={() => router.back()}>
                  <ArrowLeft class="w-5 h-5" />
                </Button>
                <text class="text-lg font-semibold">团队管理</text>
              </view>
              <Button 
                size="sm" 
                class="bg-primary text-primary-foreground"
                @click={{ handleInvite }}
              >
                <UserPlus class="w-4 h-4 mr-1" />
                邀请下级
              </Button>
            </view>
          </view>
    
          <DataState
            loading={{ loading }}
            error={{ error }}
            empty={{ !data }}
            onRetry={{ loadData }}
          >
            {data && (
              <view class="pb-20">
                <!--   -->
                <view class="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
                  <view class="grid grid-cols-2 gap-3">
                    <view class="bg-background rounded-xl p-4 shadow-sm">
                      <view class="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                        <Users class="w-4 h-4" />
                        <text>团队总人数</text>
                      </view>
                      <view class="text-2xl font-bold">{{ data.overview.totalMembers }}</view>
                      <view class="text-xs text-green-600 mt-1">
                        本月新增 +{{ data.overview.newMembersThisMonth }}
                      </view>
                    </view>
                    <view class="bg-background rounded-xl p-4 shadow-sm">
                      <view class="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                        <Wallet class="w-4 h-4" />
                        <text>累计佣金</text>
                      </view>
                      <view class="text-2xl font-bold text-primary">
                        {{ data.overview.totalCommission.toFixed(2) }}
                      </view>
                      <view class="text-xs text-muted-foreground mt-1">元</view>
                    </view>
                    <view class="bg-background rounded-xl p-4 shadow-sm">
                      <view class="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                        <Percent class="w-4 h-4" />
                        <text>提成比例</text>
                      </view>
                      <view class="text-2xl font-bold">{{ data.overview.commissionRate }}%</view>
                      <view class="text-xs text-muted-foreground mt-1">
                        {{ data.overview.myLevel }}
                      </view>
                    </view>
                    <view class="bg-background rounded-xl p-4 shadow-sm">
                      <view class="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                        <TrendingUp class="w-4 h-4" />
                        <text>升级进度</text>
                      </view>
                      <view class="mt-2">
                        <view class="h-2 bg-muted rounded-full overflow-hidden">
                          <view 
                            class="h-full bg-primary rounded-full transition-all"
                            :style=" 
                              width: `${{ Math.min((data.overview.totalCommission / data.overview.nextLevelRequirement) * 100, 100) }}%` 
                            }}
                          />
                        </view>
                        <view class="text-xs text-muted-foreground mt-1">
                          距下一等级还需 {{ (data.overview.nextLevelRequirement - data.overview.totalCommission).toFixed(0) }} 元
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
    
                <!--   -->
                <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }} class="mt-4">
                  <TabsList class="grid grid-cols-4 mx-4">
                    <TabsTrigger value="members">成员</TabsTrigger>
                    <TabsTrigger value="leaderboard">排行榜</TabsTrigger>
                    <TabsTrigger value="activities">动态</TabsTrigger>
                    <TabsTrigger value="cases">案例</TabsTrigger>
                  </TabsList>
    
                  <!--   -->
                  <TabsContent value="members" class="mt-4 px-4">
                    <!--   -->
                    <view class="flex items-center gap-2 mb-4">
                      <Select value={{ memberFilter }} onValueChange={(v: any) => setMemberFilter(v)}>
                        <SelectTrigger class="w-24 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部</SelectItem>
                          <SelectItem value="active">活跃</SelectItem>
                          <SelectItem value="inactive">不活跃</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={{ memberSort }} onValueChange={(v: any) => setMemberSort(v)}>
                        <SelectTrigger class="w-28 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="commission">按佣金</SelectItem>
                          <SelectItem value="inviteCount">按邀请数</SelectItem>
                          <SelectItem value="joinDate">按加入时间</SelectItem>
                        </SelectContent>
                      </Select>
                    </view>
    
                    <!--   -->
                    <view class="space-y-3">
                      
    <view v-for="(member, index) in members" :key="index"> (
                        <view 
                          key={member.id}
                          class="bg-card rounded-xl p-4 border cursor-pointer active:bg-accent/50"
                          @click={() => handleViewMember(member)}
                        >
                          <view class="flex items-start gap-3">
                            <Avatar class="w-12 h-12">
                              <AvatarImage src={{ member.avatar }} />
                              <AvatarFallback>{{ member.nickname[0] }}</AvatarFallback>
                            </Avatar>
                            <view class="flex-1 min-w-0">
                              <view class="flex items-center gap-2">
                                <text class="font-medium truncate">{{ member.nickname }}</text>
                                <Badge variant="secondary" class="text-xs">
                                  {{ member.levelIcon }} {{ member.level }}
                                </Badge>
                                {member.status === 'inactive' && (
                                  <Badge variant="outline" class="text-xs text-muted-foreground">
                                    不活跃
                                  </Badge>
                                )}
                              </view>
                              <view class="text-sm text-muted-foreground mt-1">
                                {{ member.phone }} · 加入于 {{ member.joinDate }}
                              </view>
                              <view class="flex items-center gap-4 mt-2 text-sm">
                                <text>
                                  佣金 <text class="text-primary font-medium">{{ member.totalCommission.toFixed(2) }}</text>
                                </text>
                                <text>
                                  邀请 <text class="font-medium">{{ member.inviteCount }}</text> 人
                                </text>
                              </view>
                            </view>
                            <ChevronRight class="w-5 h-5 text-muted-foreground" />
                          </view>
                        </view>
                      ))}
    
                      {members.length === 0 && (
                        <view class="text-center py-12 text-muted-foreground">
                          <Users class="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <text>暂无团队成员</text>
                          <Button 
                            variant="link" 
                            class="mt-2"
                            @click={{ handleInvite }}
                          >
                            立即邀请下级
                          </Button>
                        </view>
                      )}
                    </view>
                  </TabsContent>
    
                  <!--   -->
                  <TabsContent value="leaderboard" class="mt-4 px-4">
                    <!--   -->
                    <view class="flex gap-2 mb-4">
                      {(['week', 'month', 'all'] as const).map(period => (
                        <Button
                          key={{ period }}
                          variant={leaderboardPeriod === period ? 'default' : 'outline'}
                          size="sm"
                          @click={() => setLeaderboardPeriod(period)}
                        >
                          {period === 'week' ? '本周' : period === 'month' ? '本月' : '总榜'}
                        </Button>
                      ))}
                    </view>
    
                    <!--   -->
                    <view class="space-y-3">
                      
    <view v-for="(item, index) in leaderboard" :key="index"> (
                        <view 
                          key={item.userId}
                          class={`rounded-xl p-4 ${item.rank <= 3 ? 'bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-primary' : 'bg-card border'}`}
                        >
                          <view class="flex items-center gap-3">
                            <view class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(item.rank)}`}>
                              {{ item.rank }}
                            </view>
                            <Avatar class="w-10 h-10">
                              <AvatarImage src={{ item.avatar }} />
                              <AvatarFallback>{{ item.nickname[0] }}</AvatarFallback>
                            </Avatar>
                            <view class="flex-1 min-w-0">
                              <view class="flex items-center gap-2">
                                <text class="font-medium truncate">{{ item.nickname }}</text>
                                {{ getRankIcon(item.rank) }}
                              </view>
                              <view class="text-xs text-muted-foreground">{{ item.level }}</view>
                            </view>
                            <view class="text-right">
                              <view class="font-bold text-primary">{{ item.value.toFixed(2) }}</view>
                              <view class="text-xs flex items-center justify-end gap-1">
                                {item.change > 0 ? (
                                  
                                    <ArrowUpRight class="w-3 h-3 text-green-600" />
                                    <text class="text-green-600">+{{ item.change }}</text>
                                  
                                ) : item.change < 0 ? (
                                  
                                    <ArrowDownRight class="w-3 h-3 text-red-500" />
                                    <text class="text-red-500">{{ item.change }}</text>
                                  
                                ) : (
                                  <text class="text-muted-foreground">-</text>
                                )}
                              </view>
                            </view>
                          </view>
                        </view>
                      ))}
    
                      <!--   -->
                      {myRank && (
                        <view class="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                          <view class="text-sm text-muted-foreground mb-1">我的排名</view>
                          <view class="text-2xl font-bold">第 {{ myRank }} 名</view>
                        </view>
                      )}
                    </view>
                  </TabsContent>
    
                  <!--   -->
                  <TabsContent value="activities" class="mt-4 px-4">
                    <view class="relative">
                      <!--   -->
                      <view class="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
    
                      <view class="space-y-4">
                        
    <view v-for="(activity, index) in activities" :key="index"> (
                          <view key={activity.id} class="relative pl-12">
                            <!--   -->
                            <view class="absolute left-3 top-1 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs">
                              {{ getActivityTypeIcon(activity.type) }}
                            </view>
    
                            <view class="bg-card rounded-xl p-4 border">
                              <view class="flex items-start gap-3">
                                <Avatar class="w-10 h-10">
                                  <AvatarImage src={{ activity.userAvatar }} />
                                  <AvatarFallback>{{ activity.userNickname[0] }}</AvatarFallback>
                                </Avatar>
                                <view class="flex-1">
                                  <view>
                                    <text class="font-medium">{{ activity.userNickname }}</text>
                                    <text class="text-muted-foreground ml-2">{{ activity.content }}</text>
                                  </view>
                                  {activity.amount && (
                                    <view class="text-primary font-medium mt-1">
                                      +{{ activity.amount.toFixed(2) }} 元
                                    </view>
                                  )}
                                  <view class="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                    <Clock class="w-3 h-3" />
                                    {{ activity.createdAt }}
                                  </view>
                                </view>
                              </view>
                            </view>
                          </view>
                        ))}
    
                        {activities.length === 0 && (
                          <view class="text-center py-12 text-muted-foreground">
                            <Clock class="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <text>暂无团队动态</text>
                          </view>
                        )}
                      </view>
                    </view>
                  </TabsContent>
    
                  <!--   -->
                  <TabsContent value="cases" class="mt-4 px-4">
                    <view class="space-y-4">
                      
    <view v-for="(caseItem, index) in successCases" :key="index"> (
                        <view key={caseItem.id} class="bg-card rounded-xl p-4 border">
                          <view class="flex items-start gap-3 mb-3">
                            <Avatar class="w-12 h-12">
                              <AvatarImage src={{ caseItem.avatar }} />
                              <AvatarFallback>{{ caseItem.nickname[0] }}</AvatarFallback>
                            </Avatar>
                            <view>
                              <view class="font-medium">{{ caseItem.nickname }}</view>
                              <view class="flex items-center gap-2 mt-1">
                                <Badge class="bg-primary/10 text-primary">
                                  {{ caseItem.achievement }}
                                </Badge>
                                <text class="text-xs text-muted-foreground">
                                  加入 {{ caseItem.duration }}
                                </text>
                              </view>
                            </view>
                          </view>
                          <text class="font-medium mb-2">{{ caseItem.title }}</text>
                          <text class="text-sm text-muted-foreground line-clamp-2">
                            {{ caseItem.description }}
                          </text>
                          <view class="flex items-center justify-between mt-4 pt-3 border-t">
                            <text class="text-sm text-muted-foreground">
                              累计收益
                            </text>
                            <text class="text-primary font-bold">
                              {{ caseItem.totalEarnings.toFixed(2) }} 元
                            </text>
                          </view>
                        </view>
                      ))}
    
                      {successCases.length === 0 && (
                        <view class="text-center py-12 text-muted-foreground">
                          <Star class="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <text>暂无成功案例</text>
                        </view>
                      )}
                    </view>
                  </TabsContent>
                </Tabs>
              </view>
            )}
          </DataState>
    
          <!--   -->
          <Sheet open={{ showInvite }} onOpenChange={{ setShowInvite }}>
            <SheetContent side="bottom" class="h-auto max-h-[80vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>邀请下级</SheetTitle>
              </SheetHeader>
              <view class="py-6 space-y-6">
                <!--   -->
                <view class="flex flex-col items-center">
                  <view class="w-48 h-48 bg-muted rounded-xl flex items-center justify-center">
                    {{ inviteQrcode ? (
                      <image src={inviteQrcode }} alt="邀请二维码" class="w-full h-full object-contain p-4" />
                    ) : (
                      <QrCode class="w-24 h-24 text-muted-foreground" />
                    )}
                  </view>
                  <text class="text-sm text-muted-foreground mt-2">扫码加入我的团队</text>
                </view>
    
                <!--   -->
                <view class="space-y-2">
                  <view class="text-sm font-medium">邀请链接</view>
                  <view class="flex gap-2">
                    <Input 
                      value={{ inviteLink }} 
                      readOnly 
                      class="flex-1 bg-muted"
                    />
                    <Button @click={{ handleCopyLink }}>
                      <Copy class="w-4 h-4 mr-1" />
                      复制
                    </Button>
                  </view>
                </view>
    
                <!--   -->
                <Button class="w-full" size="lg">
                  <Share2 class="w-4 h-4 mr-2" />
                  分享邀请海报
                </Button>
              </view>
            </SheetContent>
          </Sheet>
    
          <!--   -->
          <Sheet open={{ showMemberDetail }} onOpenChange={{ setShowMemberDetail }}>
            <SheetContent side="bottom" class="h-[80vh] rounded-t-2xl overflow-auto">
              <SheetHeader>
                <SheetTitle>成员详情</SheetTitle>
              </SheetHeader>
              {selectedMember && (
                <view class="py-4 space-y-4">
                  <!--   -->
                  <view class="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <Avatar class="w-16 h-16">
                      <AvatarImage src={{ selectedMember.avatar }} />
                      <AvatarFallback>{{ selectedMember.nickname[0] }}</AvatarFallback>
                    </Avatar>
                    <view>
                      <view class="font-medium text-lg">{{ selectedMember.nickname }}</view>
                      <Badge variant="secondary">{{ selectedMember.levelIcon }} {{ selectedMember.level }}</Badge>
                      <view class="text-sm text-muted-foreground mt-1">
                        加入于 {{ selectedMember.joinDate }}
                      </view>
                    </view>
                  </view>
    
                  <!--   -->
                  <view class="grid grid-cols-3 gap-3">
                    <view class="text-center p-3 bg-card rounded-xl border">
                      <view class="text-2xl font-bold text-primary">
                        {{ selectedMember.totalCommission.toFixed(0) }}
                      </view>
                      <view class="text-xs text-muted-foreground">累计佣金</view>
                    </view>
                    <view class="text-center p-3 bg-card rounded-xl border">
                      <view class="text-2xl font-bold">
                        {{ selectedMember.thisMonthCommission.toFixed(0) }}
                      </view>
                      <view class="text-xs text-muted-foreground">本月佣金</view>
                    </view>
                    <view class="text-center p-3 bg-card rounded-xl border">
                      <view class="text-2xl font-bold">{{ selectedMember.inviteCount }}</view>
                      <view class="text-xs text-muted-foreground">邀请人数</view>
                    </view>
                  </view>
    
                  <!--   -->
                  {memberDetailData?.recentOrders && (
                    <view>
                      <text class="font-medium mb-3">近期推广订单</text>
                      <view class="space-y-2">
                        {memberDetailData.recentOrders.map((order: any) => (
                          <view key={order.id} class="flex items-center justify-between p-3 bg-card rounded-lg border">
                            <view>
                              <view class="text-sm">订单金额 {{ order.amount }} 元</view>
                              <view class="text-xs text-muted-foreground">{{ order.time }}</view>
                            </view>
                            <view class="text-primary font-medium">+{{ order.commission.toFixed(2) }}</view>
                          </view>
                        ))}
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  {memberDetailData?.invitedMembers && memberDetailData.invitedMembers.length > 0 && (
                    <view>
                      <text class="font-medium mb-3">邀请的成员</text>
                      <view class="flex flex-wrap gap-3">
                        {memberDetailData.invitedMembers.map((m: any) => (
                          <view key={m.id} class="flex items-center gap-2 px-3 py-2 bg-muted rounded-full">
                            <Avatar class="w-6 h-6">
                              <AvatarImage src={{ m.avatar }} />
                              <AvatarFallback>{{ m.nickname[0] }}</AvatarFallback>
                            </Avatar>
                            <text class="text-sm">{{ m.nickname }}</text>
                          </view>
                        ))}
                      </view>
                    </view>
                  )}
                </view>
              )}
            </SheetContent>
          </Sheet>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据


async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>