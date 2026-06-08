<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">earnings</text>
      <text class="v0-route">V0: earnings</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">推广收益</text>
              <view class="w-9" />
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            <Card class="p-5 bg-gradient-to-br from-accent via-accent/90 to-primary/80 border-0 text-white relative overflow-hidden">
              <!--   -->
              <view class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
              <view class="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5" />
              
              <view class="relative z-10">
                <text class="text-sm text-white/80">累计收益</text>
                <view class="flex items-baseline gap-1 mt-2">
                  <text class="text-sm">¥</text>
                  <text class="text-4xl font-bold tracking-tight">{totalEarnings.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</text>
                </view>
                
                <view class="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                  <view>
                    <text class="text-xs text-white/70">可提现余额</text>
                    <text class="text-lg font-semibold mt-0.5">¥{withdrawableBalance.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</text>
                  </view>
                  <Link 
                    href="/earnings/withdraw"
                    class="px-5 py-2 bg-white text-accent font-medium text-sm rounded-full hover:bg-white/90 transition-colors"
                  >
                    提现
                  </Link>
                </view>
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4 bg-card">
              <view class="flex items-center justify-between mb-4">
                <text class="font-semibold text-foreground">收入来源</text>
                <Link href="/earnings/breakdown" class="text-xs text-muted-foreground flex items-center gap-0.5">
                  详情 <ChevronRight class="w-3.5 h-3.5" />
                </Link>
              </view>
              
              <!--   -->
              <view class="flex items-center gap-6">
                <!--   -->
                <view class="relative w-28 h-28 flex-shrink-0">
                  <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                    {incomeSourcesData.reduce((acc, source, index) => {
                      const prevOffset = acc.offset
                      const circumference = 2 * Math.PI * 40
                      const strokeDasharray = (source.percentage / 100) * circumference
                      const strokeDashoffset = -prevOffset
                      
                      acc.elements.push(
                        <circle
                          key={source.name}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={`hsl(var(--${index === 0 ? "primary" : index === 1 ? "accent" : "muted-foreground"}))`}
                          strokeWidth="12"
                          strokeDasharray={`${strokeDasharray} ${{ circumference }}`}
                          strokeDashoffset={{ strokeDashoffset }}
                          class={cn(
                            index === 0 && "stroke-primary",
                            index === 1 && "stroke-accent",
                            index === 2 && "stroke-emerald-500",
                            index === 3 && "stroke-blue-500",
                            index === 4 && "stroke-purple-500"
                          )}
                        />
                      )
                      acc.offset += strokeDasharray
                      return acc
                    }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                  </svg>
                  <view class="absolute inset-0 flex flex-col items-center justify-center">
                    <CircleDollarSign class="w-6 h-6 text-accent" />
                  </view>
                </view>
                
                <!--   -->
                <view class="flex-1 space-y-2">
                  {incomeSourcesData.slice(0, 4).map((source) => (
                    <view key={source.name} class="flex items-center justify-between text-sm">
                      <view class="flex items-center gap-2">
                        <view class={cn("w-2.5 h-2.5 rounded-full", source.color)} />
                        <text class="text-muted-foreground">{{ source.name }}</text>
                      </view>
                      <text class="font-medium text-foreground">{{ source.percentage }}%</text>
                    </view>
                  ))}
                  {incomeSourcesData.length > 4 && (
                    <text class="text-xs text-muted-foreground">+{{ incomeSourcesData.length - 4 }}项其他收入</text>
                  )}
                </view>
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4 bg-card">
              <view class="flex items-center justify-between mb-4">
                <text class="font-semibold text-foreground">近7天收益趋势</text>
                <view class="flex items-center gap-1 text-emerald-500 text-xs">
                  <TrendingUp class="w-3.5 h-3.5" />
                  <text>+12.5%</text>
                </view>
              </view>
              
              <!--   -->
              <view class="flex items-end justify-between gap-2 h-32">
                
    <view v-for="(item, index) in trendData" :key="index"> (
                  <view key={item.day} class="flex-1 flex flex-col items-center gap-2">
                    <view class="w-full flex flex-col items-center">
                      <text class="text-[10px] text-muted-foreground mb-1">
                        {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : item.amount}
                      </text>
                      <view 
                        class={cn(
                          "w-full rounded-t-sm transition-all",
                          index === trendData.length - 2 ? "bg-accent" : "bg-primary/60"
                        )}
                        :style=" height: `${{ (item.amount / maxTrendAmount) * 80 }}px` }}
                      />
                    </view>
                    <text class="text-[10px] text-muted-foreground">{{ item.day }}</text>
                  </view>
                ))}
              </view>
            </Card>
    
            <!--   -->
            <view>
              <view class="flex items-center justify-between mb-3">
                <text class="font-semibold text-foreground">收入明细</text>
                <view class="v0-btn" 
                  @click={() => setShowFilterSheet(true)}
                  class="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Filter class="w-3.5 h-3.5" />
                  筛选
                </view>
              </view>
              
              <!--   -->
              <view class="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                
    <view v-for="(filter, index) in filters" :key="index"> (
                  <view class="v0-btn"
                    key={{ filter.id }}
                    @click={() => setActiveFilter(filter.id)}
                    class={cn(
                      "px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors",
                      activeFilter === filter.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {{ filter.label }}
                  </view>
                ))}
              </view>
              
              <!--   -->
              <view class="space-y-2">
                
    <view v-for="(record, index) in filteredRecords" :key="index"> {
                  const Icon = record.icon
                  return (
                    <Card key={record.id} class="p-3 bg-card hover:bg-secondary/50 transition-colors">
                      <view class="flex items-center gap-3">
                        <view class={cn("w-10 h-10 rounded-xl flex items-center justify-center", record.color)}>
                          <Icon class="w-5 h-5" />
                        </view>
                        <view class="flex-1 min-w-0">
                          <text class="text-sm text-foreground line-clamp-1">{{ record.title }}</text>
                          <text class="text-xs text-muted-foreground mt-0.5">{{ record.time }}</text>
                        </view>
                        <text class="text-base font-semibold text-emerald-500">
                          +¥{{ record.amount.toFixed(2) }}
                        </text>
                      </view>
                    </Card>
                  )
                })}
              </view>
              
              <!--   -->
              <view class="v0-btn" class="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
                查看全部记录
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 safe-area-pb">
            <view class="max-w-lg mx-auto flex items-center gap-3">
              <Link 
                href="/earnings/records"
                class="flex-1 py-3 text-center text-sm font-medium text-foreground bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
              >
                全部明细
              </Link>
              <Link 
                href="/earnings/withdraw"
                class="flex-1 py-3 text-center text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Wallet class="w-4 h-4" />
                申请提现
              </Link>
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
const incomeSourcesData = [
const incomeRecords = [
const trendData = [
  const filters = [
  const filteredRecords = activeFilter === "all" 

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