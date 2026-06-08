<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circle/[id]/analytics</text>
    </view>
        <view class="min-h-screen bg-background pb-8">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="flex items-center gap-3">
                <BackButton fallbackPath="/circle/1/home" />
                <text class="font-semibold text-lg text-foreground">圈子数据</text>
              </view>
              
              <!--   -->
              <view class="relative">
                <view class="v0-btn" 
                  @click={() => setShowDatePicker(!showDatePicker)}
                  class="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-lg text-sm text-foreground"
                >
                  {dateRanges.find(r => r.id === dateRange)?.label}
                  <ChevronDown class="w-4 h-4" />
                </view>
                {showDatePicker && (
                  
                    <view class="fixed inset-0 z-40" @click={() => setShowDatePicker(false)} />
                    <view class="absolute right-0 top-full mt-1 w-32 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50">
                      
    <view v-for="(range, index) in dateRanges" :key="index"> (
                        <view class="v0-btn"
                          key={{ range.id }}
                          @click={() => { setDateRange(range.id); setShowDatePicker(false) }}
                          class={cn(
                            "w-full px-3 py-2 text-sm text-left hover:bg-secondary transition-colors",
                            dateRange === range.id ? "bg-primary/10 text-primary" : "text-foreground"
                          )}
                        >
                          {{ range.label }}
                        </view>
                      ))}
                    </view>
                  
                )}
              </view>
            </view>
          </view>
    
          <view class="p-4 space-y-6">
            <!--   -->
            <view class="grid grid-cols-2 gap-3">
              <!--   -->
              <Card class="p-4">
                <view class="flex items-center gap-2 mb-2">
                  <view class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users class="w-4 h-4 text-primary" />
                  </view>
                  <text class="text-xs text-muted-foreground">总成员数</text>
                </view>
                <text class="text-2xl font-bold text-foreground">{{ coreMetrics.totalMembers.value.toLocaleString() }}</text>
                <view class={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  coreMetrics.totalMembers.trend === "up" ? "text-green-500" : "text-red-500"
                )}>
                  {coreMetrics.totalMembers.trend === "up" ? <TrendingUp class="w-3 h-3" /> : <TrendingDown class="w-3 h-3" />}
                  {{ coreMetrics.totalMembers.change }}%
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <view class="flex items-center gap-2 mb-2">
                  <view class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <UserPlus class="w-4 h-4 text-accent" />
                  </view>
                  <text class="text-xs text-muted-foreground">新增成员</text>
                </view>
                <text class="text-2xl font-bold text-foreground">{{ coreMetrics.newMembers.value }}</text>
                <view class={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  coreMetrics.newMembers.trend === "up" ? "text-green-500" : "text-red-500"
                )}>
                  {coreMetrics.newMembers.trend === "up" ? <TrendingUp class="w-3 h-3" /> : <TrendingDown class="w-3 h-3" />}
                  {{ coreMetrics.newMembers.change }}%
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <view class="flex items-center gap-2 mb-2">
                  <view class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Activity class="w-4 h-4 text-blue-500" />
                  </view>
                  <text class="text-xs text-muted-foreground">活跃成员</text>
                </view>
                <text class="text-2xl font-bold text-foreground">{{ coreMetrics.activeMembers.value }}</text>
                <view class={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  coreMetrics.activeMembers.trend === "up" ? "text-green-500" : "text-red-500"
                )}>
                  {coreMetrics.activeMembers.trend === "up" ? <TrendingUp class="w-3 h-3" /> : <TrendingDown class="w-3 h-3" />}
                  {{ Math.abs(coreMetrics.activeMembers.change) }}%
                </view>
              </Card>
    
              <!--   -->
              <Card class="p-4">
                <view class="flex items-center gap-2 mb-2">
                  <view class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign class="w-4 h-4 text-green-500" />
                  </view>
                  <text class="text-xs text-muted-foreground">本月收入</text>
                </view>
                <text class="text-2xl font-bold text-foreground">¥{{ coreMetrics.monthlyRevenue.value.toLocaleString() }}</text>
                <view class={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  coreMetrics.monthlyRevenue.trend === "up" ? "text-green-500" : "text-red-500"
                )}>
                  {coreMetrics.monthlyRevenue.trend === "up" ? <TrendingUp class="w-3 h-3" /> : <TrendingDown class="w-3 h-3" />}
                  {{ coreMetrics.monthlyRevenue.change }}%
                </view>
              </Card>
            </view>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-semibold text-sm text-foreground mb-4">成员增长趋势</text>
              <view class="flex items-end gap-2 h-32">
                
    <view v-for="(item, index) in memberGrowthData" :key="index"> (
                  <view key={index} class="flex-1 flex flex-col items-center gap-1">
                    <text class="text-[10px] text-muted-foreground">{{ item.value }}</text>
                    <view 
                      class="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                      :style=" height: `${{ (item.value / maxGrowth) * 100 }}%` }}
                    />
                    <text class="text-[10px] text-muted-foreground">{{ item.day }}</text>
                  </view>
                ))}
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-semibold text-sm text-foreground mb-4">内容互动概览</text>
              <view class="grid grid-cols-3 gap-4">
                {Object.entries(contentStats).map(([key, stat]) => (
                  <view key={key} class="text-center">
                    <text class="text-xl font-bold text-foreground">{{ stat.value.toLocaleString() }}</text>
                    <text class="text-xs text-muted-foreground mt-1">{{ stat.label }}</text>
                  </view>
                ))}
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-semibold text-sm text-foreground mb-4">收入来源分布</text>
              <view class="flex items-center gap-6">
                <!--   -->
                <view class="relative w-24 h-24 flex-shrink-0">
                  <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                    {revenueSourceData.reduce((acc, item, index) => {
                      const offset = acc.offset
                      acc.elements.push(
                        <circle
                          key={index}
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke={["oklch(0.55 0.2 25)", "oklch(0.75 0.15 75)", "#3b82f6", "#a855f7", "#22c55e"][index]}
                          strokeWidth="4"
                          strokeDasharray={`${item.percent} ${{ 100 - item.percent }}`}
                          strokeDashoffset={{ -offset }}
                        />
                      )
                      acc.offset += item.percent
                      return acc
                    }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                  </svg>
                </view>
                <!--   -->
                <view class="flex-1 space-y-2">
                  
    <view v-for="(item, index) in revenueSourceData" :key="index"> (
                    <view key={index} class="flex items-center justify-between text-xs">
                      <view class="flex items-center gap-2">
                        <view class={cn("w-2 h-2 rounded-full", item.color)} />
                        <text class="text-muted-foreground">{{ item.name }}</text>
                      </view>
                      <text class="text-foreground font-medium">¥{{ item.value.toLocaleString() }}</text>
                    </view>
                  ))}
                </view>
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <view class="flex items-center justify-between mb-4">
                <text class="font-semibold text-sm text-foreground">热门内容 Top5</text>
                <Link href="/circles/1/analytics/contents" class="text-xs text-primary">查看全部</Link>
              </view>
              <view class="space-y-3">
                
    <view v-for="(item, index) in hotContents" :key="index"> (
                  <view key={item.id} class="flex items-start gap-3">
                    <view class={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                      index < 3 ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                    )}>
                      {{ index + 1 }}
                    </view>
                    <view class="flex-1 min-w-0">
                      <text class="text-sm text-foreground line-clamp-1">{{ item.title }}</text>
                      <view class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" class="text-[10px] px-1 py-0">
                          {item.type === "article" ? "文章" : "帖子"}
                        </Badge>
                        <text class="flex items-center gap-0.5">
                          <Heart class="w-3 h-3" /> {{ item.likes }}
                        </text>
                        <text class="flex items-center gap-0.5">
                          <MessageCircle class="w-3 h-3" /> {{ item.comments }}
                        </text>
                      </view>
                    </view>
                  </view>
                ))}
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <view class="flex items-center justify-between mb-4">
                <text class="font-semibold text-sm text-foreground">活跃成员榜</text>
                <Link href="/circles/1/members" class="text-xs text-primary">查看全部</Link>
              </view>
              <view class="space-y-3">
                
    <view v-for="(member, index) in activeMembers" :key="index"> (
                  <view key={member.id} class="flex items-center gap-3">
                    <view class={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                      index < 3 ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                    )}>
                      {index === 0 ? <Crown class="w-3 h-3" /> : index + 1}
                    </view>
                    <Avatar class="w-8 h-8">
                      <AvatarImage src={{ member.avatar }} alt={{ member.name }} />
                      <AvatarFallback class="bg-secondary text-foreground text-xs">
                        {{ member.name[0] }}
                      </AvatarFallback>
                    </Avatar>
                    <view class="flex-1 min-w-0">
                      <text class="text-sm text-foreground">{{ member.name }}</text>
                      <text class="text-xs text-muted-foreground">
                        发帖 {{ member.posts }} · 互动 {{ member.interactions }}
                      </text>
                    </view>
                    <view class="text-right">
                      <text class="text-sm font-medium text-accent">{{ member.contribution }}</text>
                      <text class="text-[10px] text-muted-foreground">贡献值</text>
                    </view>
                  </view>
                ))}
              </view>
            </Card>
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
const dateRanges = [
const coreMetrics = {
const memberGrowthData = [
const contentStats = {
const hotContents = [
const activeMembers = [
const revenueSourceData = [

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