<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">积分中心</text>
      <text class="v0-route">V0: points</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">积分中心</text>
              <Link href="/points/history" class="text-sm text-primary">
                明细
              </Link>
            </view>
          </view>
    
          <DataState
            isLoading={{ loading }}
            isError={{ !!error }}
            isEmpty={{ !pointsInfo }}
            errorMessage={{ error || undefined }}
            onRetry={{ fetchData }}
          >
            <!--   -->
            <view class="px-4 pt-4">
              <Card class="relative overflow-hidden bg-gradient-to-br from-accent via-accent/80 to-yellow-600 p-5">
                <!--   -->
                <view class="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
                <view class="absolute -right-2 top-8 w-16 h-16 rounded-full bg-white/5" />
                
                <view class="relative z-10">
                  <view class="flex items-center gap-2 mb-2">
                    <Coins class="w-5 h-5 text-white/80" />
                    <text class="text-white/80 text-sm">我的积分</text>
                  </view>
                  <view class="text-4xl font-bold text-white mb-1">
                    {{ userPoints.toLocaleString() }}
                  </view>
                  <text class="text-white/70 text-xs">
                    100积分 = ¥1.00，可在兑换时抵扣
                  </text>
                  
                  <!--   -->
                  {pointsInfo && (
                    <view class="flex items-center gap-6 mt-4 pt-4 border-t border-white/20">
                      <view>
                        <text class="text-white/60 text-xs">累计获取</text>
                        <text class="text-white font-medium">{{ pointsInfo.totalEarned.toLocaleString() }}</text>
                      </view>
                      <view>
                        <text class="text-white/60 text-xs">累计使用</text>
                        <text class="text-white font-medium">{{ pointsInfo.totalSpent.toLocaleString() }}</text>
                      </view>
                      <view>
                        <text class="text-white/60 text-xs">今日获取</text>
                        <text class="text-white font-medium">+{{ pointsInfo.todayEarned }}</text>
                      </view>
                    </view>
                  )}
                </view>
              </Card>
            </view>
    
            <!--   -->
            <view class="px-4 mt-6">
              <view class="flex items-center justify-between mb-3">
                <text class="font-semibold text-base text-foreground">如何获取积分</text>
                <Link href="/points/tasks" class="text-xs text-muted-foreground flex items-center gap-1">
                  更多任务 <ChevronRight class="w-3 h-3" />
                </Link>
              </view>
              
              <Card class="divide-y divide-border">
                
    <view v-for="(task, index) in tasks" :key="index"> {
                  const Icon = iconMap[task.icon] || Calendar
                  return (
                    <view key={task.id} class="flex items-center justify-between p-3">
                      <view class="flex items-center gap-3">
                        <view class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                          <Icon class="w-5 h-5 text-accent" />
                        </view>
                        <view>
                          <view class="flex items-center gap-2">
                            <text class="text-sm font-medium text-foreground">{{ task.title }}</text>
                            <Badge variant="secondary" class="text-[10px] px-1.5 py-0 bg-accent/10 text-accent border-0">
                              +{{ task.points }}积分
                            </Badge>
                          </view>
                          <text class="text-xs text-muted-foreground mt-0.5">
                            {{ task.limit }}
                            {task.current !== undefined && ` (${task.current}/${{ task.max }})`}
                          </text>
                        </view>
                      </view>
                      
                      {task.completed ? (
                        <Badge variant="secondary" class="text-xs bg-green-500/10 text-green-500 border-0">
                          <CheckCircle class="w-3 h-3 mr-1" />
                          已完成
                        </Badge>
                      ) : (
                        <view class="v0-btn" class="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-primary/90 transition-colors">
                          {{ task.action }}
                        </view>
                      )}
                    </view>
                  )
                })}
              </Card>
            </view>
    
            <!--   -->
            <view class="px-4 mt-6">
              <view class="flex items-center justify-between mb-3">
                <text class="font-semibold text-base text-foreground">积分兑换</text>
                <Link href="/points/exchange" class="text-xs text-muted-foreground flex items-center gap-1">
                  全部商品 <ChevronRight class="w-3 h-3" />
                </Link>
              </view>
              
              <view class="grid grid-cols-2 gap-3">
                
    <view v-for="(item, index) in exchangeItems" :key="index"> {
                  const Icon = iconMap[item.icon] || Gift
                  const canExchange = userPoints >= item.points
                  
                  return (
                    <Card 
                      key={item.id}
                      class={`p-3 ${canExchange ? 'hover:bg-secondary/50 cursor-pointer' : 'opacity-60'}`}
                      @click={() => canExchange && handleExchange(item)}
                    >
                      <view class="flex items-center gap-2 mb-2">
                        <view class={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center ${item.color}`}>
                          <Icon class="w-4 h-4" />
                        </view>
                        <Badge variant="outline" class="text-[10px] px-1 py-0 border-muted-foreground/30 text-muted-foreground">
                          剩{{ item.stock }}
                        </Badge>
                      </view>
                      <text class="text-sm font-medium text-foreground">{{ item.title }}</text>
                      <view class="flex items-center justify-between mt-2">
                        <view class="flex items-center gap-1">
                          <Coins class="w-3.5 h-3.5 text-accent" />
                          <text class="text-sm font-medium text-accent">{{ item.points }}</text>
                        </view>
                        <view class="v0-btn" 
                          class={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                            canExchange 
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                              : 'bg-secondary text-muted-foreground'
                          }`}
                          :disabled={{ !canExchange }}
                        >
                          {canExchange ? '兑换' : '积分不足'}
                        </view>
                      </view>
                    </Card>
                  )
                })}
              </view>
            </view>
    
            <!--   -->
            <view class="px-4 mt-6">
              <view class="flex items-center justify-between mb-3">
                <text class="font-semibold text-base text-foreground">近期明细</text>
                <Link href="/points/history" class="text-xs text-muted-foreground flex items-center gap-1">
                  全部记录 <ChevronRight class="w-3 h-3" />
                </Link>
              </view>
              
              <Card class="divide-y divide-border">
                
    <view v-for="(item, index) in history" :key="index"> (
                  <view key={item.id} class="flex items-center justify-between p-3">
                    <view>
                      <text class="text-sm text-foreground">{{ item.title }}</text>
                      <text class="text-xs text-muted-foreground mt-0.5">{{ item.time }}</text>
                    </view>
                    <text class={`text-sm font-medium ${
                      item.type === 'earn' ? 'text-green-500' : 'text-primary'
                    }`}>
                      {item.points > 0 ? '+' : ''}{{ item.points }}
                    </text>
                  </view>
                ))}
              </Card>
            </view>
    
            <!--   -->
            <view class="px-4 mt-6">
              <Card class="p-3 bg-secondary/50">
                <text class="text-xs text-muted-foreground">
                  <text class="text-foreground">积分说明：</text>
                  积分可用于兑换优惠券、国学币、会员体验及实物礼品。积分有效期为获取后12个月，请及时使用。
                </text>
              </Card>
            </view>
          </DataState>
    
          <!--   -->
          {showExchangeModal && selectedItem && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <Card class="w-[85%] max-w-sm p-5 animate-in fade-in zoom-in-95 duration-200">
                {!exchangeSuccess ? (
                  
                    <view class="text-center mb-4">
                      <view class="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                        <Gift class="w-8 h-8 text-accent" />
                      </view>
                      <text class="font-semibold text-lg text-foreground">确认兑换</text>
                      <text class="text-sm text-muted-foreground mt-1">
                        使用 <text class="text-accent font-medium">{{ selectedItem.points }}积分</text> 兑换
                      </text>
                    </view>
                    
                    <Card class="p-3 bg-secondary/50 mb-4">
                      <text class="text-sm font-medium text-foreground text-center">{{ selectedItem.title }}</text>
                    </Card>
                    
                    <text class="text-xs text-muted-foreground text-center mb-4">
                      兑换后积分余额：{{ (userPoints - selectedItem.points).toLocaleString() }}
                    </text>
                    
                    <view class="flex gap-3">
                      <view class="v0-btn" 
                        @click={() => setShowExchangeModal(false)}
                        class="flex-1 py-2.5 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                      >
                        取消
                      </view>
                      <view class="v0-btn" 
                        @click={{ confirmExchange }}
                        class="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                      >
                        确认兑换
                      </view>
                    </view>
                  
                ) : (
                  <view class="text-center py-4">
                    <view class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle class="w-8 h-8 text-green-500" />
                    </view>
                    <text class="font-semibold text-lg text-foreground">兑换成功</text>
                    <text class="text-sm text-muted-foreground mt-1">
                      {{ selectedItem.title }} 已发放至您的账户
                    </text>
                  </view>
                )}
              </Card>
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {

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