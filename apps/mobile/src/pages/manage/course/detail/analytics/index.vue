<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">管理</text>
      <text class="v0-route">V0: manage/course/[id]/analytics</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
      <view class="flex items-center gap-3">
      <BackButton fallbackPath="/manage/course" />
      <text class="font-semibold text-foreground">课程数据</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 space-y-3">
            <!--   -->
            <view class="relative">
              <view class="v0-btn"
                @click={() => setShowCourseDropdown(!showCourseDropdown)}
                class="w-full flex items-center justify-between px-4 py-3 bg-card rounded-xl border border-border"
              >
                <text class="font-medium text-foreground">{{ selectedCourse.name }}</text>
                <ChevronDown class={cn("w-5 h-5 text-muted-foreground transition-transform", showCourseDropdown && "rotate-180")} />
              </view>
              {showCourseDropdown && (
                <view class="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                  
    <view v-for="(course, index) in courses" :key="index"> (
                    <view class="v0-btn"
                      key={{ course.id }}
                      @click={() => { setSelectedCourse(course); setShowCourseDropdown(false) }}
                      class={cn(
                        "w-full px-4 py-3 text-left text-sm hover:bg-secondary transition-colors",
                        selectedCourse.id === course.id && "bg-primary/10 text-primary"
                      )}
                    >
                      {{ course.name }}
                    </view>
                  ))}
                </view>
              )}
            </view>
            
            <!--   -->
            <view class="flex gap-2 overflow-x-auto scrollbar-hide">
              
    <view v-for="(range, index) in dateRanges" :key="index"> (
                <view class="v0-btn"
                  key={{ range }}
                  @click={() => setSelectedRange(range)}
                  class={cn(
                    "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                    selectedRange === range
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ range }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 grid grid-cols-2 gap-3">
            {[
              { label: "累计销量", value: analyticsData.totalSales.toLocaleString(), unit: "人", growth: analyticsData.salesGrowth, icon: Users, color: "text-primary" },
              { label: "累计收入", value: (analyticsData.totalRevenue / 100).toLocaleString(), unit: "元", growth: analyticsData.revenueGrowth, icon: DollarSign, color: "text-accent" },
              { label: "在学人数", value: analyticsData.activeStudents.toLocaleString(), unit: "人", growth: analyticsData.activeGrowth, icon: BookOpen, color: "text-blue-500" },
              { label: "完课率", value: analyticsData.completionRate.toString(), unit: "%", growth: analyticsData.completionGrowth, icon: Target, color: "text-green-500" },
            ].map((item, index) => {{ const Icon = item.icon
              return (
                <Card key={index }} class="p-4">
                  <view class="flex items-center justify-between mb-2">
                    <text class="text-xs text-muted-foreground">{{ item.label }}</text>
                    <Icon class={cn("w-4 h-4", item.color)} />
                  </view>
                  <view class="flex items-baseline gap-1">
                    <text class="text-2xl font-bold text-foreground">{{ item.value }}</text>
                    <text class="text-sm text-muted-foreground">{{ item.unit }}</text>
                  </view>
                  <view class="flex items-center gap-1 mt-1">
                    {item.growth >= 0 ? (
                      <TrendingUp class="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown class="w-3 h-3 text-red-500" />
                    )}
                    <text class={cn("text-xs", item.growth >= 0 ? "text-green-500" : "text-red-500")}>
                      {item.growth >= 0 ? "+" : ""}{{ item.growth }}%
                    </text>
                    <text class="text-xs text-muted-foreground">环比</text>
                  </view>
                </Card>
              )
            })}
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <view class="flex items-center justify-between mb-4">
                <text class="font-semibold text-foreground">销售趋势</text>
                <view class="flex gap-1 p-0.5 bg-secondary rounded-lg">
                  <view class="v0-btn"
                    @click={() => setTrendType("sales")}
                    class={cn(
                      "px-3 py-1 text-xs rounded-md transition-colors",
                      trendType === "sales" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    销量
                  </view>
                  <view class="v0-btn"
                    @click={() => setTrendType("revenue")}
                    class={cn(
                      "px-3 py-1 text-xs rounded-md transition-colors",
                      trendType === "revenue" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    收入
                  </view>
                </view>
              </view>
              <view class="h-40 flex items-end gap-2">
                {analyticsData.salesTrend.map((day, index) => {
                  const value = trendType === "sales" ? day.sales : day.revenue / 100
                  const height = (value / maxSales) * 100
                  return (
                    <view key={{ index }} class="flex-1 flex flex-col items-center gap-1">
                      <text class="text-[10px] text-muted-foreground">
                        {trendType === "sales" ? day.sales : `¥${{ (day.revenue / 100).toFixed(0) }}`}
                      </text>
                      <view
                        class="w-full bg-primary/80 rounded-t-sm transition-all"
                        :style=" height: `${{ height }}%` }}
                      />
                      <text class="text-[10px] text-muted-foreground">{{ day.date }}</text>
                    </view>
                  )
                })}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-semibold text-foreground mb-4">学员学习进度</text>
              <view class="space-y-3">
                {analyticsData.funnel.map((stage, index) => (
                  <view key={index}>
                    <view class="flex items-center justify-between mb-1">
                      <text class="text-sm text-foreground">{{ stage.stage }}</text>
                      <view class="flex items-center gap-2">
                        <text class="text-sm font-medium text-foreground">{{ stage.count }}</text>
                        <text class="text-xs text-muted-foreground">({{ stage.percent }}%)</text>
                      </view>
                    </view>
                    <view class="h-2 bg-secondary rounded-full overflow-hidden">
                      <view
                        class="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                        :style=" width: `${{ stage.percent }}%` }}
                      />
                    </view>
                  </view>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <text class="font-semibold text-foreground mb-4">章节完课率</text>
              <view class="space-y-3">
                {analyticsData.chapters.map((chapter, index) => (
                  <view key={index}>
                    <view class="flex items-center justify-between mb-1">
                      <text class="text-xs text-muted-foreground line-clamp-1 flex-1">{{ chapter.name }}</text>
                      <text class={cn(
                        "text-xs font-medium ml-2",
                        chapter.rate >= 80 ? "text-green-500" : chapter.rate >= 60 ? "text-accent" : "text-red-500"
                      )}>
                        {{ chapter.rate }}%
                      </text>
                    </view>
                    <view class="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <view
                        class={cn(
                          "h-full rounded-full transition-all",
                          chapter.rate >= 80 ? "bg-green-500" : chapter.rate >= 60 ? "bg-accent" : "bg-red-500"
                        )}
                        :style=" width: `${{ chapter.rate }}%` }}
                      />
                    </view>
                  </view>
                ))}
              </view>
              <text class="text-xs text-muted-foreground mt-3">
                提示：第6章流失率较高，建议优化内容或增加互动
              </text>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card class="p-4">
              <view class="flex items-center justify-between mb-4">
                <text class="font-semibold text-foreground">学员评分</text>
                <view class="flex items-center gap-1">
                  <Star class="w-4 h-4 text-accent fill-accent" />
                  <text class="font-bold text-foreground">4.8</text>
                  <text class="text-xs text-muted-foreground">({analyticsData.ratings.reduce((a, b) => a + b.count, 0)}条)</text>
                </view>
              </view>
              <view class="space-y-2">
                {analyticsData.ratings.map((rating) => (
                  <view key={rating.stars} class="flex items-center gap-2">
                    <text class="text-xs text-muted-foreground w-8">{{ rating.stars }}星</text>
                    <view class="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <view
                        class="h-full bg-accent rounded-full"
                        :style=" width: `${{ rating.percent }}%` }}
                      />
                    </view>
                    <text class="text-xs text-muted-foreground w-12 text-right">{{ rating.count }}</text>
                  </view>
                ))}
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <view class="flex items-center justify-between mb-3">
              <text class="font-semibold text-foreground">最近评价</text>
              <Link href="/manage/course/1/reviews" class="flex items-center gap-1 text-xs text-muted-foreground">
                全部评价 <ChevronRight class="w-3 h-3" />
              </Link>
            </view>
            <view class="space-y-3">
              {analyticsData.reviews.map(review => (
                <Card key={review.id} class="p-3">
                  <view class="flex items-start gap-3">
                    <Avatar class="w-9 h-9">
                      <AvatarImage src={{ review.avatar }} alt={{ review.user }} />
                      <AvatarFallback class="bg-secondary text-foreground text-xs">
                        {{ review.user[0] }}
                      </AvatarFallback>
                    </Avatar>
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center justify-between">
                        <text class="text-sm font-medium text-foreground">{{ review.user }}</text>
                        <text class="text-xs text-muted-foreground">{{ review.time }}</text>
                      </view>
                      <view class="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={{ i }}
                            class={cn(
                              "w-3 h-3",
                              i < review.rating ? "text-accent fill-accent" : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </view>
                      <text class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ review.content }}</text>
                    </view>
                  </view>
                </Card>
              ))}
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
const courses = [
const analyticsData = {
const dateRanges = ["今日", "近7天", "近30天", "近90天", "自定义"]
              const value = trendType === "sales" ? day.sales : day.revenue / 100

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