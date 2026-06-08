<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/invite-records</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#C9A96E]/20">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="v0-btn" @click={() => router.back()} class="p-1">
                <ChevronLeft class="w-6 h-6 text-[#2D2A26]" />
              </view>
              <text class="text-lg font-semibold text-[#2D2A26]">邀请记录</text>
              <view class="v0-btn" @click={() => setShowLinkSheet(true)} class="p-1">
                <Share2 class="w-5 h-5 text-[#C41E3A]" />
              </view>
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            <DataState
              loading={{ loading }}
              error={{ error }}
              empty={{ !stats }}
              skeleton={
                <Card class="bg-gradient-to-br from-[#C41E3A] to-[#A01830]">
                  <CardContent class="p-4">
                    <view class="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <view key={i} class="text-center">
                          <Skeleton class="h-8 w-16 mx-auto mb-1 bg-white/20" />
                          <Skeleton class="h-3 w-12 mx-auto bg-white/20" />
                        </view>
                      ))}
                    </view>
                  </CardContent>
                </Card>
              }
            >
              <Card class="bg-gradient-to-br from-[#C41E3A] to-[#A01830] border-0 shadow-lg">
                <CardContent class="p-4">
                  <view class="grid grid-cols-4 gap-2">
                    
    <view v-for="(item, index) in statItems" :key="index"> (
                      <view key={index} class="text-center">
                        <view class="w-8 h-8 mx-auto mb-1 rounded-full bg-white/20 flex items-center justify-center">
                          <item.icon class="w-4 h-4 text-white" />
                        </view>
                        <text class="text-lg font-bold text-white">{{ item.value }}</text>
                        <text class="text-xs text-white/70">{{ item.label }}</text>
                      </view>
                    ))}
                  </view>
                  
                  <!--   -->
                  {stats && stats.pendingEarnings > 0 && (
                    <view class="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                      <text class="text-sm text-white/80">待结算收益</text>
                      <text class="text-sm font-semibold text-[#C9A96E]">¥{{ stats.pendingEarnings.toFixed(2) }}</text>
                    </view>
                  )}
                </CardContent>
              </Card>
            </DataState>
    
            <!--   -->
            <Card class="border-[#C9A96E]/30">
              <CardContent class="p-3">
                <view class="v0-btn"
                  @click={() => setShowLinkSheet(true)}
                  class="w-full flex items-center justify-between"
                >
                  <view class="flex items-center gap-3">
                    <view class="w-10 h-10 rounded-lg bg-[#C41E3A]/10 flex items-center justify-center">
                      <Link2 class="w-5 h-5 text-[#C41E3A]" />
                    </view>
                    <view class="text-left">
                      <text class="font-medium text-[#2D2A26]">我的邀请链接</text>
                      <text class="text-xs text-muted-foreground">
                        邀请码：{linkInfo?.inviteCode || '---'}
                      </text>
                    </view>
                  </view>
                  <ChevronRight class="w-5 h-5 text-muted-foreground" />
                </view>
              </CardContent>
            </Card>
    
            <!--   -->
            <Tabs value={{ filter }} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList class="w-full bg-white border border-[#C9A96E]/30">
                <TabsTrigger value="all" class="flex-1 text-sm data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white">
                  全部
                </TabsTrigger>
                <TabsTrigger value="registered" class="flex-1 text-sm data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white">
                  已注册
                </TabsTrigger>
                <TabsTrigger value="paid" class="flex-1 text-sm data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white">
                  已付费
                </TabsTrigger>
                <TabsTrigger value="vip" class="flex-1 text-sm data-[state=active]:bg-[#C41E3A] data-[state=active]:text-white">
                  会员
                </TabsTrigger>
              </TabsList>
            </Tabs>
    
            <!--   -->
            <DataState
              loading={{ loading }}
              error={{ error }}
              empty={{ records.length === 0 }}
              emptyMessage="暂无邀请记录"
              skeleton={
                <view class="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} class="border-[#C9A96E]/30">
                      <CardContent class="p-4">
                        <view class="flex items-start gap-3">
                          <Skeleton class="w-10 h-10 rounded-full" />
                          <view class="flex-1 space-y-2">
                            <Skeleton class="h-4 w-24" />
                            <Skeleton class="h-3 w-32" />
                          </view>
                          <Skeleton class="h-5 w-16" />
                        </view>
                      </CardContent>
                    </Card>
                  ))}
                </view>
              }
            >
              <view class="space-y-3">
                
    <view v-for="(record, index) in records" :key="index"> (
                  <Card key={record.id} class="border-[#C9A96E]/30">
                    <CardContent class="p-4">
                      <view class="flex items-start gap-3">
                        <Avatar class="w-10 h-10">
                          <AvatarImage src={{ record.invitee.avatar }} />
                          <AvatarFallback class="bg-[#C41E3A]/10 text-[#C41E3A]">
                            {{ record.invitee.nickname.charAt(0) }}
                          </AvatarFallback>
                        </Avatar>
                        
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center gap-2">
                            <text class="font-medium text-[#2D2A26] truncate">
                              {{ record.invitee.nickname }}
                            </text>
                            {record.status === 'vip' && (
                              <Crown class="w-4 h-4 text-amber-500" />
                            )}
                          </view>
                          <text class="text-xs text-muted-foreground">{{ record.invitee.phone }}</text>
                          <text class="text-xs text-muted-foreground mt-1">
                            注册：{{ record.registeredAt }}
                          </text>
                          {record.paidAt && (
                            <text class="text-xs text-muted-foreground">
                              首付：{{ record.paidAt }} · 累计 ¥{{ record.paidAmount }}
                            </text>
                          )}
                        </view>
                        
                        <view class="text-right">
                          <Badge
                            variant="outline"
                            class={`${getInviteStatusColor(record.status)} border-current`}
                          >
                            {{ getInviteStatusText(record.status) }}
                          </Badge>
                          {record.commission > 0 && (
                            <text class="text-sm font-semibold text-[#C41E3A] mt-2">
                              +¥{{ record.commission.toFixed(2) }}
                            </text>
                          )}
                          {record.pendingCommission > 0 && (
                            <text class="text-xs text-muted-foreground">
                              待结算 ¥{{ record.pendingCommission.toFixed(2) }}
                            </text>
                          )}
                        </view>
                      </view>
                    </CardContent>
                  </Card>
                ))}
              </view>
            </DataState>
          </view>
    
          <!--   -->
          <Sheet open={{ showLinkSheet }} onOpenChange={{ setShowLinkSheet }}>
            <SheetContent side="bottom" class="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle class="text-[#2D2A26]">邀请好友</SheetTitle>
              </SheetHeader>
              
              <view class="py-6 space-y-6">
                <!--   -->
                <view class="flex justify-center">
                  <view class="p-4 bg-white rounded-xl border border-[#C9A96E]/30 shadow-sm">
                    {{ linkInfo?.qrCodeUrl ? (
                      <image
                        src={linkInfo.qrCodeUrl }}
                        alt="邀请二维码"
                        class="w-40 h-40"
                      />
                    ) : (
                      <view class="w-40 h-40 bg-gray-100 flex items-center justify-center">
                        <QrCode class="w-12 h-12 text-gray-400" />
                      </view>
                    )}
                  </view>
                </view>
                
                <!--   -->
                <view class="text-center">
                  <text class="text-sm text-muted-foreground mb-1">我的邀请码</text>
                  <text class="text-2xl font-bold text-[#C41E3A] tracking-wider">
                    {linkInfo?.inviteCode || '---'}
                  </text>
                </view>
                
                <!--   -->
                <view class="bg-[#FAF8F5] rounded-lg p-3">
                  <text class="text-xs text-muted-foreground mb-1">邀请链接</text>
                  <text class="text-sm text-[#2D2A26] break-all">
                    {linkInfo?.inviteLink || '---'}
                  </text>
                </view>
                
                <!--   -->
                <view class="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    class="border-[#C9A96E] text-[#C9A96E]"
                    @click={{ handleRegenerateLink }}
                    :disabled={{ regenerating }}
                  >
                    <RefreshCw class={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                    重新生成
                  </Button>
                  <Button
                    class="bg-[#C41E3A] hover:bg-[#A01830] text-white"
                    @click={{ handleCopyLink }}
                  >
                    {copied ? (
                      
                        <Check class="w-4 h-4 mr-2" />
                        已复制
                      
                    ) : (
                      
                        <Copy class="w-4 h-4 mr-2" />
                        复制链接
                      
                    )}
                  </Button>
                </view>
                
                <!--   -->
                <view class="pt-4 border-t border-[#C9A96E]/20">
                  <text class="text-xs text-muted-foreground text-center">
                    好友通过链接注册并付费后，您将获得相应佣金奖励
                  </text>
                </view>
              </view>
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