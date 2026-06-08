<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: manage/live/[id]/analytics</text>
    </view>
        <view class="min-h-screen bg-background pb-8">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
      <view class="flex items-center gap-3">
      <BackButton fallbackPath="/manage/live" />
      <text class="font-semibold text-base text-foreground">直播数据</text>
              </view>
              <view class="v0-btn" class="p-2 rounded-full hover:bg-secondary">
                <Calendar class="w-5 h-5 text-muted-foreground" />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3">
            <view class="v0-btn"
              @click={() => setShowSessionPicker(!showSessionPicker)}
              class="w-full flex items-center justify-between p-3 bg-card rounded-xl border border-border"
            >
              <view class="flex items-center gap-3">
                <view class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 class="w-5 h-5 text-primary" />
                </view>
                <view class="text-left">
                  <text class="text-sm font-medium text-foreground">{{ selectedSession.title }}</text>
                  <text class="text-xs text-muted-foreground">{{ selectedSession.date }}</text>
                </view>
              </view>
              <ChevronDown class={cn("w-5 h-5 text-muted-foreground transition-transform", showSessionPicker && "rotate-180")} />
            </view>
            
            <!--   -->
            {showSessionPicker && (
              <Card class="mt-2 divide-y divide-border overflow-hidden">
                
    <view v-for="(session, index) in liveSessionsData" :key="index"> (
                  <view class="v0-btn"
                    key={{ session.id }}
                    @click={() => { setSelectedSession(session); setShowSessionPicker(false) }}
                    class={cn(
                      "w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/50 transition-colors",
                      selectedSession.id === session.id && "bg-primary/5"
                    )}
                  >
                    <view class="flex-1">
                      <text class="text-sm font-medium text-foreground">{{ session.title }}</text>
                      <text class="text-xs text-muted-foreground">{{ session.date }} · {{ session.duration }}</text>
                    </view>
                    <Badge variant="outline" class={cn(
                      "text-[10px]",
                      session.type === "knowledge" ? "border-blue-500/30 text-blue-500" : "border-orange-500/30 text-orange-500"
                    )}>
                      {session.type === "knowledge" ? "知识" : "带货"}
                    </Badge>
                  </view>
                ))}
              </Card>
            )}
          </view>
    
          <!--   -->
          <view class="px-4 grid grid-cols-2 gap-3">
            <Card class="p-3">
              <view class="flex items-center gap-2 mb-2">
                <Users class="w-4 h-4 text-primary" />
                <text class="text-xs text-muted-foreground">总观看</text>
              </view>
              <text class="text-2xl font-bold text-foreground">{{ currentLiveData.totalViewers.toLocaleString() }}</text>
              <text class="text-xs text-muted-foreground mt-1">峰值 {{ currentLiveData.peakOnline }} 人</text>
            </Card>
            
            <Card class="p-3">
              <view class="flex items-center gap-2 mb-2">
                <Clock class="w-4 h-4 text-blue-500" />
                <text class="text-xs text-muted-foreground">直播时长</text>
              </view>
              <text class="text-2xl font-bold text-foreground">{{ currentLiveData.duration }}</text>
              <text class="text-xs text-muted-foreground mt-1">人均 {{ currentLiveData.avgWatchTime }}</text>
            </Card>
            
            <Card class="p-3">
              <view class="flex items-center gap-2 mb-2">
                <Gift class="w-4 h-4 text-accent" />
                <text class="text-xs text-muted-foreground">打赏收入</text>
              </view>
              <text class="text-2xl font-bold text-accent">{{ currentLiveData.tipsIncome.toLocaleString() }}<text class="text-sm font-normal ml-1">币</text></text>
              <text class="text-xs text-muted-foreground mt-1">约 ¥{{ currentLiveData.tipsRMB }}</text>
            </Card>
            
            <Card class="p-3">
              <view class="flex items-center gap-2 mb-2">
                <UserPlus class="w-4 h-4 text-green-500" />
                <text class="text-xs text-muted-foreground">新增关注</text>
              </view>
              <text class="text-2xl font-bold text-foreground">+{{ currentLiveData.newFollowers }}</text>
              <view class="flex items-center gap-1 mt-1">
                <TrendingUp class="w-3 h-3 text-green-500" />
                <text class="text-xs text-green-500">+12%</text>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-6">
            <text class="font-semibold text-sm text-foreground mb-3">在线人数趋势</text>
            <Card class="p-4">
              <view class="h-40 flex items-end gap-[2px]">
                {currentLiveData.trafficTrend.map((value, index) => (
                  <view
                    key={index}
                    class="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors cursor-pointer"
                    :style=" height: `${{ (value / maxTraffic) * 100 }}%` }}
                    title={`${value}人在线`}
                  />
                ))}
              </view>
              <view class="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                <text>19:00</text>
                <text>20:00</text>
                <text>21:00</text>
                <text>21:36</text>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-6">
            <text class="font-semibold text-sm text-foreground mb-3">流量来源</text>
            <Card class="p-4">
              <view class="flex items-center gap-4">
                <!--   -->
                <view class="relative w-24 h-24 flex-shrink-0">
                  <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                    {currentLiveData.trafficSources.reduce((acc, source, index) => {
                      const colors = ["#C53030", "#3182CE", "#38A169", "#D69E2E", "#805AD5"]
                      const startPercent = acc.total
                      const endPercent = startPercent + source.percent
                      const largeArc = source.percent > 50 ? 1 : 0
                      const startX = 50 + 40 * Math.cos(2 * Math.PI * startPercent / 100)
                      const startY = 50 + 40 * Math.sin(2 * Math.PI * startPercent / 100)
                      const endX = 50 + 40 * Math.cos(2 * Math.PI * endPercent / 100)
                      const endY = 50 + 40 * Math.sin(2 * Math.PI * endPercent / 100)
                      acc.paths.push(
                        <path
                          key={{ index }}
                          d={`M 50 50 L ${startX} ${{ startY }} A 40 40 0 ${{ largeArc }} 1 ${{ endX }} ${{ endY }} Z`}
                          fill={{ colors[index] }}
                          class="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      )
                      acc.total = endPercent
                      return acc
                    }, { paths: [] as JSX.Element[], total: 0 }).paths}
                  </svg>
                </view>
                <!--   -->
                <view class="flex-1 space-y-2">
                  {currentLiveData.trafficSources.map((source, index) => {
                    const colors = ["bg-primary", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"]
                    return (
                      <view key={{ source.source }} class="flex items-center justify-between text-xs">
                        <view class="flex items-center gap-2">
                          <view class={cn("w-2 h-2 rounded-full", colors[index])} />
                          <text class="text-muted-foreground">{{ source.source }}</text>
                        </view>
                        <text class="text-foreground font-medium">{{ source.percent }}%</text>
                      </view>
                    )
                  })}
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-6">
            <text class="font-semibold text-sm text-foreground mb-3">互动分析</text>
            <view class="grid grid-cols-2 gap-3">
              <Card class="p-3">
                <view class="flex items-center gap-2 mb-2">
                  <MessageCircle class="w-4 h-4 text-blue-500" />
                  <text class="text-xs text-muted-foreground">弹幕��数</text>
                </view>
                <text class="text-xl font-bold text-foreground">{{ currentLiveData.totalComments.toLocaleString() }}</text>
              </Card>
              <Card class="p-3">
                <view class="flex items-center gap-2 mb-2">
                  <HelpCircle class="w-4 h-4 text-accent" />
                  <text class="text-xs text-muted-foreground">问答次数</text>
                </view>
                <text class="text-xl font-bold text-foreground">{{ currentLiveData.qaCount }}</text>
              </Card>
            </view>
            
            <!--   -->
            <Card class="mt-3 p-4">
              <text class="text-xs text-muted-foreground mb-3">热门弹幕词</text>
              <view class="flex flex-wrap gap-2">
                {currentLiveData.hotWords.map((word, index) => (
                  <Badge 
                    key={word} 
                    variant="secondary"
                    class={cn(
                      "text-xs",
                      index < 3 && "bg-primary/10 text-primary border-primary/20"
                    )}
                  >
                    {{ word }}
                  </Badge>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          {salesData && (
            <view class="px-4 mt-6">
              <text class="font-semibold text-sm text-foreground mb-3">带货数据</text>
              <view class="grid grid-cols-2 gap-3 mb-3">
                <Card class="p-3">
                  <view class="flex items-center gap-2 mb-2">
                    <ShoppingBag class="w-4 h-4 text-orange-500" />
                    <text class="text-xs text-muted-foreground">成交订单</text>
                  </view>
                  <text class="text-xl font-bold text-foreground">{{ salesData.totalOrders }}</text>
                </Card>
                <Card class="p-3">
                  <view class="flex items-center gap-2 mb-2">
                    <TrendingUp class="w-4 h-4 text-green-500" />
                    <text class="text-xs text-muted-foreground">成交金额</text>
                  </view>
                  <text class="text-xl font-bold text-primary">¥{{ salesData.totalAmount.toLocaleString() }}</text>
                </Card>
              </view>
              
              <!--   -->
              <Card class="divide-y divide-border">
                <view class="p-3 flex items-center justify-between text-xs text-muted-foreground">
                  <text>商品</text>
                  <view class="flex items-center gap-6">
                    <text>点击</text>
                    <text>成交</text>
                    <text>转化率</text>
                  </view>
                </view>
                {salesData.products.map((product, index) => (
                  <view key={product.id} class="p-3 flex items-center justify-between">
                    <view class="flex items-center gap-2">
                      <text class={cn(
                        "w-5 h-5 rounded text-xs flex items-center justify-center font-medium",
                        index === 0 ? "bg-primary text-primary-foreground" :
                        index === 1 ? "bg-accent text-accent-foreground" :
                        index === 2 ? "bg-orange-500 text-white" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        {{ index + 1 }}
                      </text>
                      <text class="text-sm text-foreground">{{ product.name }}</text>
                    </view>
                    <view class="flex items-center gap-6 text-xs">
                      <text class="w-10 text-right text-muted-foreground">{{ product.clicks }}</text>
                      <text class="w-10 text-right text-foreground">{{ product.orders }}</text>
                      <text class="w-12 text-right text-primary font-medium">{{ product.rate }}%</text>
                    </view>
                  </view>
                ))}
              </Card>
            </view>
          )}
    
          <!--   -->
          <view class="px-4 mt-6">
            <text class="font-semibold text-sm text-foreground mb-3">观众画像</text>
            
            <!--   -->
            <Card class="p-4 mb-3">
              <text class="text-xs text-muted-foreground mb-3">性别分布</text>
              <view class="flex items-center gap-3">
                <view class="flex-1 h-3 rounded-full bg-secondary overflow-hidden flex">
                  <view 
                    class="h-full bg-blue-500" 
                    :style=" width: `${{ currentLiveData.audienceProfile.gender.male }}%` }}
                  />
                  <view 
                    class="h-full bg-pink-500" 
                    :style=" width: `${{ currentLiveData.audienceProfile.gender.female }}%` }}
                  />
                </view>
              </view>
              <view class="flex items-center justify-between mt-2 text-xs">
                <view class="flex items-center gap-1.5">
                  <view class="w-2 h-2 rounded-full bg-blue-500" />
                  <text class="text-muted-foreground">男 {{ currentLiveData.audienceProfile.gender.male }}%</text>
                </view>
                <view class="flex items-center gap-1.5">
                  <view class="w-2 h-2 rounded-full bg-pink-500" />
                  <text class="text-muted-foreground">女 {{ currentLiveData.audienceProfile.gender.female }}%</text>
                </view>
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 mb-3">
              <text class="text-xs text-muted-foreground mb-3">地域TOP5</text>
              <view class="space-y-2">
                {currentLiveData.audienceProfile.regions.slice(0, 5).map((region, index) => (
                  <view key={region.name} class="flex items-center gap-3">
                    <view class="flex items-center gap-2 w-16">
                      <MapPin class="w-3 h-3 text-muted-foreground" />
                      <text class="text-xs text-foreground">{{ region.name }}</text>
                    </view>
                    <view class="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <view 
                        class={cn("h-full rounded-full", index === 0 ? "bg-primary" : "bg-primary/60")}
                        :style=" width: `${{ region.percent * 3 }}%` }}
                      />
                    </view>
                    <text class="text-xs text-muted-foreground w-10 text-right">{{ region.percent }}%</text>
                  </view>
                ))}
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4">
              <text class="text-xs text-muted-foreground mb-3">兴趣偏好</text>
              <view class="flex flex-wrap gap-2">
                {currentLiveData.audienceProfile.interests.map(interest => (
                  <Badge key={interest} variant="outline" class="text-xs">
                    {{ interest }}
                  </Badge>
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
const liveSessionsData = [
const currentLiveData = {
const ecommerceSalesData = {
  const isEcommerce = selectedSession.type === "ecommerce"
                  const colors = ["#C53030", "#3182CE", "#38A169", "#D69E2E", "#805AD5"]
                const colors = ["bg-primary", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"]

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