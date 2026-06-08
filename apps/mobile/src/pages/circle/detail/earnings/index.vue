<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circle/[id]/earnings</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/circle/1/home" />
              <text class="font-semibold text-base text-foreground">圈子收益</text>
              <Link href="/circles/1/earnings/detail" class="text-sm text-primary">
                全部明细
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="p-4">
            <Card class="relative overflow-hidden bg-gradient-to-br from-accent via-accent/90 to-primary p-5">
              <!--   -->
              <view class="absolute -right-8 -top-8 w-32 h-32 opacity-10">
                <svg viewBox="0 0 100 100" class="w-full h-full fill-current text-white">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2" />
                </svg>
              </view>
              
              <view class="relative z-10">
                <view class="flex items-center gap-2 mb-1">
                  <text class="text-white/80 text-sm">累计收入</text>
                  <Info class="w-3.5 h-3.5 text-white/60" />
                </view>
                <text class="text-3xl font-bold text-white mb-4">
                  ¥{earningsData.totalEarnings.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                </text>
                
                <view class="grid grid-cols-2 gap-4">
                  <view>
                    <text class="text-white/70 text-xs mb-1">本月收入</text>
                    <view class="flex items-center gap-2">
                      <text class="text-lg font-semibold text-white">
                        ¥{{ earningsData.monthlyEarnings.toLocaleString() }}
                      </text>
                      <Badge class={cn(
                        "text-[10px] px-1.5 py-0 border-0",
                        earningsData.monthlyChange >= 0 
                          ? "bg-green-500/30 text-green-200" 
                          : "bg-red-500/30 text-red-200"
                      )}>
                        {earningsData.monthlyChange >= 0 ? (
                          <TrendingUp class="w-3 h-3 mr-0.5" />
                        ) : (
                          <TrendingDown class="w-3 h-3 mr-0.5" />
                        )}
                        {{ Math.abs(earningsData.monthlyChange) }}%
                      </Badge>
                    </view>
                  </view>
                  <view>
                    <text class="text-white/70 text-xs mb-1">可提现余额</text>
                    <text class="text-lg font-semibold text-white">
                      ¥{{ earningsData.withdrawable.toLocaleString() }}
                    </text>
                  </view>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-4">
            <Card class="p-4">
              <text class="font-semibold text-sm text-foreground mb-4">收入来源</text>
              
              <view class="flex gap-6">
                <!--   -->
                <view class="relative w-24 h-24 flex-shrink-0">
                  <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                    {earningsData.sources.reduce((acc, source, index) => {
                      const prevPercent = earningsData.sources.slice(0, index).reduce((sum, s) => sum + s.percent, 0)
                      const dashArray = `${source.percent * 2.83} ${{ 283 - source.percent * 2.83 }}`
                      const dashOffset = -prevPercent * 2.83
                      
                      acc.push(
                        <circle
                          key={{ source.type }}
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          strokeWidth="10"
                          class={source.color.replace("bg-", "stroke-")}
                          strokeDasharray={{ dashArray }}
                          strokeDashoffset={{ dashOffset }}
                        />
                      )
                      return acc
                    }, [] as React.ReactNode[])}
                  </svg>
                  <view class="absolute inset-0 flex flex-col items-center justify-center">
                    <text class="text-xs text-muted-foreground">总计</text>
                    <text class="text-sm font-semibold text-foreground">
                      ¥{{ (earningsData.totalEarnings / 10000).toFixed(1) }}万
                    </text>
                  </view>
                </view>
                
                <!--   -->
                <view class="flex-1 space-y-2">
                  {earningsData.sources.map(source => (
                    <view key={source.type} class="flex items-center justify-between">
                      <view class="flex items-center gap-2">
                        <view class={cn("w-2.5 h-2.5 rounded-full", source.color)} />
                        <text class="text-xs text-muted-foreground">{{ source.name }}</text>
                      </view>
                      <view class="flex items-center gap-2">
                        <text class="text-xs font-medium text-foreground">
                          ¥{{ source.amount.toLocaleString() }}
                        </text>
                        <text class="text-[10px] text-muted-foreground w-10 text-right">
                          {{ source.percent }}%
                        </text>
                      </view>
                    </view>
                  ))}
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-4">
            <Card class="p-4">
              <view class="flex items-center justify-between mb-4">
                <text class="font-semibold text-sm text-foreground">收入趋势</text>
                <view class="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar class="w-3.5 h-3.5" />
                  近30天
                </view>
              </view>
              
              <!--   -->
              <view class="flex items-end justify-between gap-2 h-24">
                {earningsData.trend.map((item, index) => (
                  <view key={index} class="flex-1 flex flex-col items-center gap-1">
                    <view 
                      class="w-full bg-gradient-to-t from-accent to-accent/60 rounded-t transition-all hover:from-primary hover:to-primary/60"
                      :style=" height: `${{ (item.amount / maxAmount) * 100 }}%` }}
                    />
                    <text class="text-[10px] text-muted-foreground">{item.day.split("/")[1]}</text>
                  </view>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-4">
            <view class="flex items-center justify-between mb-3">
              <text class="font-semibold text-sm text-foreground">收益明细</text>
              <view class="v0-btn" 
                @click={() => setShowFilter(!showFilter)}
                class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Filter class="w-3.5 h-3.5" />
                筛选
              </view>
            </view>
            
            <!--   -->
            {showFilter && (
              <view class="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                
    <view v-for="(type, index) in filterTypes" :key="index"> (
                  <view class="v0-btn"
                    key={{ type.id }}
                    @click={() => setFilterType(type.id)}
                    class={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                      filterType === type.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {{ type.name }}
                  </view>
                ))}
              </view>
            )}
            
            <Card class="divide-y divide-border">
              {filteredDetails.length > 0 ? (
                filteredDetails.map(detail => (
                  <view key={detail.id} class="flex items-center gap-3 p-3">
                    <view class={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      getTypeColor(detail.type)
                    )}>
                      {{ getTypeIcon(detail.type) }}
                    </view>
                    <view class="flex-1 min-w-0">
                      <text class="text-sm text-foreground line-clamp-1">{{ detail.desc }}</text>
                      <text class="text-xs text-muted-foreground mt-0.5">{{ detail.time }}</text>
                    </view>
                    <text class="text-sm font-medium text-green-500">
                      +¥{{ detail.amount }}
                    </text>
                  </view>
                ))
              ) : (
                <view class="py-12 text-center">
                  <text class="text-muted-foreground text-sm">暂无相关记录</text>
                </view>
              )}
            </Card>
            
            {filteredDetails.length > 0 && (
              <Link 
                href="/circles/1/earnings/detail"
                class="flex items-center justify-center gap-1 mt-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                查看全部明细 <ChevronRight class="w-4 h-4" />
              </Link>
            )}
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="px-4 py-3">
              <!--   -->
              {earningsData.withdrawable < earningsData.minWithdraw && (
                <text class="text-xs text-muted-foreground text-center mb-2">
                  满¥{{ earningsData.minWithdraw }}可提现，还差¥{{ (earningsData.minWithdraw - earningsData.withdrawable).toFixed(2) }}
                </text>
              )}
              
              <view class="flex items-center gap-3">
                <view class="flex-1">
                  <text class="text-xs text-muted-foreground">可提现余额</text>
                  <text class="text-lg font-bold text-foreground">
                    ¥{{ earningsData.withdrawable.toLocaleString() }}
                  </text>
                </view>
                <Link
                  href="/withdraw"
                  class={cn(
                    "flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-colors",
                    earningsData.withdrawable >= earningsData.minWithdraw
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Wallet class="w-4 h-4" />
                  申请提现
                </Link>
              </view>
            </view>
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
const earningsData = {
  const filterTypes = [
  const filteredDetails = filterType === "all" 

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