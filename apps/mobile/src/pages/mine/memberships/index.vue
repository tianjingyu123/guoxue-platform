<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/memberships</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center justify-between h-12 px-4">
              <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
                <ChevronLeft class="w-5 h-5" />
              </view>
              <text class="font-semibold text-base">我的权益</text>
              <Link href="/notifications?type=expiry" class="p-1 relative">
                <Bell class="w-5 h-5" />
                {expiringCount > 0 && (
                  <text class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {{ expiringCount }}
                  </text>
                )}
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="p-4">
            <Card class="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 p-4">
              <view class="flex items-center justify-between mb-3">
                <text class="font-medium">权益概览</text>
                <Link href="/orders/center" class="text-xs text-primary flex items-center gap-1">
                  订单记录 <ChevronRight class="w-3 h-3" />
                </Link>
              </view>
              <view class="grid grid-cols-4 gap-2 text-center">
                <view class="v0-btn" 
                  @click={() => setFilter("all")}
                  class={cn(
                    "py-2 rounded-lg transition-colors",
                    filter === "all" ? "bg-primary/20" : "bg-white/50"
                  )}
                >
                  <text class="text-lg font-bold text-foreground">{{ stats.total }}</text>
                  <text class="text-[10px] text-muted-foreground">全部权益</text>
                </view>
                <view class="v0-btn" 
                  @click={() => setFilter("active")}
                  class={cn(
                    "py-2 rounded-lg transition-colors",
                    filter === "active" ? "bg-green-100" : "bg-white/50"
                  )}
                >
                  <text class="text-lg font-bold text-green-600">{{ stats.active }}</text>
                  <text class="text-[10px] text-muted-foreground">正常</text>
                </view>
                <view class="v0-btn" 
                  @click={() => setFilter("expiring")}
                  class={cn(
                    "py-2 rounded-lg transition-colors",
                    filter === "expiring" ? "bg-amber-100" : "bg-white/50"
                  )}
                >
                  <text class="text-lg font-bold text-amber-600">{{ stats.expiring }}</text>
                  <text class="text-[10px] text-muted-foreground">即将到期</text>
                </view>
                <view class="v0-btn" 
                  @click={() => setFilter("expired")}
                  class={cn(
                    "py-2 rounded-lg transition-colors",
                    filter === "expired" ? "bg-red-100" : "bg-white/50"
                  )}
                >
                  <text class="text-lg font-bold text-red-600">{{ stats.expired }}</text>
                  <text class="text-[10px] text-muted-foreground">已过期</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-24 space-y-3">
            {filteredMemberships.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Gift class="w-12 h-12 mb-3 opacity-30" />
                <text class="text-sm">暂无权益</text>
                <Link href="/vip">
                  <Button variant="outline" size="sm" class="mt-4">
                    开通会员
                  </Button>
                </Link>
              </view>
            ) : (
              filteredMemberships.map((membership) => {{ const Icon = membership.icon
                const status = statusConfig[membership.status]
                const isExpiring = membership.daysLeft <= 30 && membership.daysLeft > 0
                
                return (
                  <Card key={membership.id }} class={cn("overflow-hidden", membership.bgColor)}>
                    <!--   -->
                    <view class="flex items-center justify-between p-3 border-b border-border/50">
                      <view class="flex items-center gap-2">
                        <view class={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          membership.color.replace("text-", "bg-").replace("]", "/20]")
                        )}>
                          <Icon class={cn("w-4 h-4", membership.color)} />
                        </view>
                        <view>
                          <text class="font-medium text-sm">{{ membership.name }}</text>
                          <text class="text-[10px] text-muted-foreground">
                            {{ membership.startDate }} ~ {{ membership.expireDate }}
                          </text>
                        </view>
                      </view>
                      <Badge class={cn("text-[10px]", status.bgColor, status.color)}>
                        {{ status.label }}
                      </Badge>
                    </view>
    
                    <!--   -->
                    <view class="p-3">
                      <view class="flex items-center justify-between mb-2">
                        <view class="flex items-center gap-1">
                          <Clock class="w-3.5 h-3.5 text-muted-foreground" />
                          <text class="text-xs text-muted-foreground">剩余有效期</text>
                        </view>
                        <text class={cn(
                          "text-sm font-bold",
                          isExpiring ? "text-amber-600" : membership.color
                        )}>
                          {membership.daysLeft > 0 ? `${membership.daysLeft}天` : "已过期"}
                        </text>
                      </view>
    
                      <!--   -->
                      <view class="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <view 
                          class={cn(
                            "h-full rounded-full transition-all",
                            isExpiring ? "bg-amber-500" : membership.color.replace("text-", "bg-")
                          )}
                          :style=" 
                            width: `${{ Math.min(100, Math.max(0, (membership.daysLeft / 365) * 100)) }}%` 
                          }}
                        />
                      </view>
    
                      <!--   -->
                      <view class="flex flex-wrap gap-1.5 mt-3">
                        {membership.benefits.slice(0, 4).map((benefit, i) => (
                          <text 
                            key={i}
                            class="px-2 py-0.5 rounded-full bg-white/60 text-[10px] text-muted-foreground"
                          >
                            {{ benefit }}
                          </text>
                        ))}
                      </view>
                    </view>
    
                    <!--   -->
                    <view class="flex items-center justify-between p-3 border-t border-border/50 bg-white/30">
                      <!--   -->
                      <view class="flex items-center gap-2">
                        <Switch
                          :checked={{ membership.autoRenew }}
                          onCheckedChange={() => toggleAutoRenew(membership.id)}
                          class="scale-75"
                        />
                        <text class="text-xs text-muted-foreground">
                          {membership.autoRenew ? "自动续费已开启" : "自动续费"}
                        </text>
                      </view>
    
                      <!--   -->
                      <view class="flex items-center gap-2">
                        <view class="text-right mr-2">
                          <text class="text-xs text-muted-foreground">续费价格</text>
                          <text class="font-bold text-primary">
                            ¥{{ membership.price }}
                            {membership.originalPrice && (
                              <text class="text-[10px] text-muted-foreground line-through ml-1">
                                ¥{{ membership.originalPrice }}
                              </text>
                            )}
                          </text>
                        </view>
                        <Link href={`/renew?type=${membership.type}&id=${{ membership.id }}`}>
                          <Button 
                            size="sm" 
                            class={cn(
                              "h-8",
                              isExpiring 
                                ? "bg-amber-500 hover:bg-amber-600" 
                                : "bg-primary hover:bg-primary/90"
                            )}
                          >
                            <RefreshCw class="w-3.5 h-3.5 mr-1" />
                            {isExpiring ? "立即续费" : "续费"}
                          </Button>
                        </Link>
                      </view>
                    </view>
    
                    <!--   -->
                    {isExpiring && (
                      <view class="flex items-center gap-2 px-3 py-2 bg-amber-50 border-t border-amber-100">
                        <AlertTriangle class="w-4 h-4 text-amber-500" />
                        <text class="text-xs text-amber-600">
                          您的权益将在{{ membership.daysLeft }}天后到期，续费可享受连续优惠
                        </text>
                      </view>
                    )}
                  </Card>
                )
              })
            )}
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const mockMemberships: Membership[] = [
const statusConfig: Record<MembershipStatus, { label: string; color: string; bgColor: string }> = {
  const stats = {
  const filteredMemberships = filter === "all" 

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