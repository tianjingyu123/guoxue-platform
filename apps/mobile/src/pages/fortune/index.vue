<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">运势</text>
      <text class="v0-route">V0: fortune</text>
    </view>
        <DataState
          isLoading={{ loading && !fortune }}
          error={{ error }}
          isEmpty={{ !fortune }}
          emptyMessage="暂无运势数据"
          onRetry={() => loadFortune(currentDate)}
          loadingComponent={{ renderSkeleton() }}
        >
          {fortune && (
            <view class="min-h-screen bg-gradient-to-b from-red-50 to-background">
              <!--   -->
              <view class="sticky top-0 z-10 bg-gradient-to-b from-red-50 to-transparent pt-safe">
                <view class="flex items-center justify-between p-4">
                  <Link href="/">
                    <Button variant="ghost" size="icon">
                      <ChevronLeft class="w-5 h-5" />
                    </Button>
                  </Link>
                  <view class="flex items-center gap-2">
                    <Sparkles class="w-5 h-5 text-primary" />
                    <text class="font-medium">每日运势</text>
                  </view>
                  <view class="w-10" />
                </view>
              </view>
    
              <view class="p-4 space-y-6">
                <!--   -->
                <view class="flex items-center justify-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    @click={() => changeDate(-1)}
                    class="rounded-full"
                  >
                    <ChevronLeft class="w-5 h-5" />
                  </Button>
                  <view class="text-center">
                    <text class="text-lg font-semibold">{{ formatFortuneDate(currentDate) }}</text>
                    <text class="text-sm text-muted-foreground">
                      {{ fortune.lunarDate }} {{ fortune.weekday }}
                    </text>
                  </view>
                  <Button
                    variant="ghost"
                    size="icon"
                    @click={() => changeDate(1)}
                    class="rounded-full"
                  >
                    <ChevronRight class="w-5 h-5" />
                  </Button>
                </view>
    
                <!--   -->
                <view class="flex flex-col items-center">
                  <view class="relative w-40 h-40">
                    <!--   -->
                    <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        class="text-secondary"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${fortune.overallScore * 2.83} 283`}
                        class="text-primary transition-all duration-1000"
                      />
                    </svg>
                    <!--   -->
                    <view class="absolute inset-0 flex flex-col items-center justify-center">
                      <text class="text-4xl font-bold text-primary">{{ fortune.overallScore }}</text>
                      <text class={cn(
                        "text-lg font-medium mt-1",
                        getFortuneLevelInfo(fortune.overallLevel).color
                      )}>
                        {{ getFortuneLevelInfo(fortune.overallLevel).label }}
                      </text>
                    </view>
                  </view>
                  <text class="text-sm text-muted-foreground mt-3 text-center max-w-xs">
                    {{ fortune.overallSummary }}
                  </text>
                </view>
    
                <!--   -->
                <view class="flex gap-3">
                  <!--   -->
                  <Card class="flex-1 border-green-200 bg-green-50/50">
                    <CardContent class="p-4">
                      <view class="flex items-center gap-2 mb-2">
                        <text class="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                          宜
                        </text>
                        <text class="text-sm font-medium text-green-700">今日宜</text>
                      </view>
                      <view class="flex flex-wrap gap-1.5">
                        {fortune.yiji.yi.map((item, i) => (
                          <text key={i} class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                            {{ item }}
                          </text>
                        ))}
                      </view>
                    </CardContent>
                  </Card>
                  <!--   -->
                  <Card class="flex-1 border-red-200 bg-red-50/50">
                    <CardContent class="p-4">
                      <view class="flex items-center gap-2 mb-2">
                        <text class="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-medium">
                          忌
                        </text>
                        <text class="text-sm font-medium text-red-700">今日忌</text>
                      </view>
                      <view class="flex flex-wrap gap-1.5">
                        {fortune.yiji.ji.map((item, i) => (
                          <text key={i} class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                            {{ item }}
                          </text>
                        ))}
                      </view>
                    </CardContent>
                  </Card>
                </view>
    
                <!--   -->
                <view>
                  <text class="text-base font-semibold mb-3">分类运势</text>
                  <view class="grid grid-cols-2 gap-3">
                    {fortune.categories.map((cat) => {
                      const colors = categoryColors[cat.category] || categoryColors.career
                      const levelInfo = getFortuneLevelInfo(cat.level)
                      return (
                        <Card 
                          key={cat.category} 
                          class={cn("border", colors.ring.replace('ring', 'border'))}
                        >
                          <CardContent class="p-3">
                            <view class="flex items-center gap-2 mb-2">
                              <view class={cn("w-8 h-8 rounded-lg flex items-center justify-center", colors.bg, colors.text)}>
                                {{ categoryIcons[cat.category] }}
                              </view>
                              <view>
                                <text class="text-sm font-medium">{{ cat.categoryName }}</text>
                                <text class={cn("text-xs", levelInfo.color)}>{{ cat.score }}分</text>
                              </view>
                            </view>
                            <text class="text-xs text-muted-foreground line-clamp-1">{{ cat.summary }}</text>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </view>
                </view>
    
                <!--   -->
                <Card class="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                  <CardContent class="p-4">
                    <text class="text-sm font-semibold text-amber-800 mb-3">今日幸运</text>
                    <view class="grid grid-cols-2 gap-3 text-sm">
                      <view class="flex items-center gap-2">
                        <text class="text-amber-600">幸运色:</text>
                        <text class="font-medium">{{ fortune.luckyColor }}</text>
                      </view>
                      <view class="flex items-center gap-2">
                        <text class="text-amber-600">幸运数:</text>
                        <text class="font-medium">{{ fortune.luckyNumber }}</text>
                      </view>
                      <view class="flex items-center gap-2">
                        <text class="text-amber-600">吉方位:</text>
                        <text class="font-medium">{{ fortune.luckyDirection }}</text>
                      </view>
                      <view class="flex items-center gap-2">
                        <text class="text-amber-600">吉时:</text>
                        <text class="font-medium">{{ fortune.luckyTime }}</text>
                      </view>
                    </view>
                  </CardContent>
                </Card>
    
                <!--   -->
                <Link href={`/fortune/detail?date=${currentDate}`}>
                  <Button class="w-full" size="lg">
                    查看详细解读
                    <ArrowRight class="w-4 h-4 ml-2" />
                  </Button>
                </Link>
    
                <!--   -->
                {fortune.tips && fortune.tips.length > 0 && (
                  <Card class="border-dashed">
                    <CardContent class="p-4">
                      <text class="text-sm font-semibold mb-2">今日提醒</text>
                      <view class="space-y-1">
                        {fortune.tips.map((tip, i) => (
                          <view key={i} class="text-xs text-muted-foreground flex items-start gap-2">
                            <text class="text-primary mt-0.5">•</text>
                            {{ tip }}
                          </view>
                        ))}
                      </view>
                    </CardContent>
                  </Card>
                )}
              </view>
            </view>
          )}
        </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const categoryIcons: Record<string, React.ReactNode> = {
const categoryColors: Record<string, { bg: string; text: string; ring: string }> = {

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