<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">比赛</text>
      <text class="v0-route">V0: competition/[id]/dashboard</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-50 bg-primary text-primary-foreground">
            <view class="flex items-center justify-between px-4 h-11">
              <view class="v0-btn" @click={() => router.back()} class="flex items-center">
                <ArrowLeft class="w-5 h-5" />
              </view>
              <text class="font-medium">数据看板</text>
              <view class="v0-btn" @click={{ handleRefresh }} class={cn(isRefreshing && "animate-spin")}>
                <RefreshCw class="w-5 h-5" />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="bg-primary text-primary-foreground px-4 pb-4 pt-2">
            <text class="text-white/80 text-sm mb-1">{{ dashboardData.competitionTitle }}</text>
            <view class="flex items-center gap-2">
              <Badge class="bg-white/20 text-white border-0">
                {{ dashboardData.currentRound }}
              </Badge>
              <Badge class="bg-green-500 text-white border-0">
                进行中
              </Badge>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 -mt-2">
            <Card class="p-4">
              <view class="grid grid-cols-4 gap-3 text-center">
                <view>
                  <text class="text-2xl font-bold text-primary">{{ dashboardData.overview.totalRegistrations }}</text>
                  <text class="text-xs text-muted-foreground">报名人数</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-foreground">{{ dashboardData.overview.totalParticipants }}</text>
                  <text class="text-xs text-muted-foreground">参赛人数</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-green-600">{{ dashboardData.overview.completedRate }}%</text>
                  <text class="text-xs text-muted-foreground">完赛率</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-amber-600">{{ dashboardData.overview.avgScore }}</text>
                  <text class="text-xs text-muted-foreground">平均分</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
              <TabsList class="w-full grid grid-cols-3 h-9">
                <TabsTrigger value="overview" class="text-xs">数据概览</TabsTrigger>
                <TabsTrigger value="rounds" class="text-xs">赛程统计</TabsTrigger>
                <TabsTrigger value="live" class="text-xs">实时进度</TabsTrigger>
              </TabsList>
              
              <!--   -->
              <TabsContent value="overview" class="mt-4 space-y-4">
                <!--   -->
                <Card class="p-4">
                  <view class="flex items-center justify-between mb-4">
                    <text class="font-medium flex items-center gap-2">
                      <TrendingUp class="w-4 h-4 text-primary" />
                      报名趋势
                    </text>
                    <text class="text-xs text-muted-foreground">最近7天</text>
                  </view>
                  <view class="flex items-end gap-2 h-32">
                    {dashboardData.registrationTrend.map((item, index) => (
                      <view key={index} class="flex-1 flex flex-col items-center gap-1">
                        <view 
                          class="w-full bg-primary/80 rounded-t"
                          :style=" height: `${{ (item.count / maxTrendCount) * 100 }}%` }}
                        />
                        <text class="text-[10px] text-muted-foreground">{{ item.date.slice(3) }}</text>
                      </view>
                    ))}
                  </view>
                </Card>
    
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-4 flex items-center gap-2">
                    <PieChart class="w-4 h-4 text-primary" />
                    组别分布
                  </text>
                  <view class="space-y-3">
                    {dashboardData.groupDistribution.map(group => (
                      <view key={group.name}>
                        <view class="flex items-center justify-between text-sm mb-1">
                          <text>{{ group.name }}</text>
                          <text class="text-muted-foreground">{{ group.count }}人 ({{ group.percentage }}%)</text>
                        </view>
                        <view class="h-2 bg-secondary rounded-full overflow-hidden">
                          <view 
                            class={cn("h-full rounded-full", group.color)}
                            :style=" width: `${{ group.percentage }}%` }}
                          />
                        </view>
                      </view>
                    ))}
                  </view>
                </Card>
    
                <!--   -->
                <Card class="p-4">
                  <text class="font-medium mb-4 flex items-center gap-2">
                    <BarChart3 class="w-4 h-4 text-primary" />
                    分数分布
                  </text>
                  <view class="space-y-2">
                    {dashboardData.scoreDistribution.map(item => (
                      <view key={item.range} class="flex items-center gap-3">
                        <text class="text-sm w-16 text-muted-foreground">{{ item.range }}</text>
                        <view class="flex-1 h-6 bg-secondary rounded overflow-hidden">
                          <view 
                            class={cn(
                              "h-full rounded flex items-center justify-end px-2",
                              item.range.startsWith("9") ? "bg-green-500" :
                              item.range.startsWith("8") ? "bg-blue-500" :
                              item.range.startsWith("7") ? "bg-primary" :
                              item.range.startsWith("6") ? "bg-amber-500" :
                              "bg-red-400"
                            )}
                            :style=" width: `${{ item.percentage }}%`, minWidth: item.percentage > 5 ? 'auto' : '30px' }}
                          >
                            <text class="text-xs text-white font-medium">{{ item.count }}</text>
                          </view>
                        </view>
                        <text class="text-xs text-muted-foreground w-12 text-right">{{ item.percentage }}%</text>
                      </view>
                    ))}
                  </view>
                </Card>
              </TabsContent>
              
              <!--   -->
              <TabsContent value="rounds" class="mt-4 space-y-4">
                {dashboardData.roundsStatus.map((round, index) => (
                  <Card key={round.name} class="p-4">
                    <view class="flex items-center justify-between mb-3">
                      <view class="flex items-center gap-2">
                        <text class="font-medium">{{ round.name }}</text>
                        <Badge variant={
                          round.status === "ongoing" ? "default" :
                          round.status === "ended" ? "secondary" :
                          "outline"
                        }>
                          {round.status === "ongoing" ? "进行中" :
                           round.status === "ended" ? "已结束" : "未开始"}
                        </Badge>
                      </view>
                      <text class="text-xs text-muted-foreground">
                        {{ round.startTime }} - {{ round.endTime }}
                      </text>
                    </view>
                    
                    {round.status !== "upcoming" ? (
                      <view class="grid grid-cols-4 gap-3 text-center">
                        <view>
                          <text class="text-lg font-bold">{{ round.participants }}</text>
                          <text class="text-xs text-muted-foreground">参赛</text>
                        </view>
                        <view>
                          <text class="text-lg font-bold">{{ round.completed }}</text>
                          <text class="text-xs text-muted-foreground">完成</text>
                        </view>
                        <view>
                          <text class="text-lg font-bold">{{ round.avgScore }}</text>
                          <text class="text-xs text-muted-foreground">均分</text>
                        </view>
                        <view>
                          <text class="text-lg font-bold text-green-600">{{ round.passCount }}</text>
                          <text class="text-xs text-muted-foreground">晋级</text>
                        </view>
                      </view>
                    ) : (
                      <text class="text-sm text-muted-foreground text-center py-4">
                        比赛尚未开始
                      </text>
                    )}
                  </Card>
                ))}
              </TabsContent>
              
              <!--   -->
              <TabsContent value="live" class="mt-4 space-y-4">
                <Card class="p-4">
                  <text class="font-medium mb-4 flex items-center gap-2">
                    <Clock class="w-4 h-4 text-primary" />
                    实时答题进度
                  </text>
                  
                  <view class="space-y-4">
                    <view>
                      <view class="flex items-center justify-between text-sm mb-1">
                        <text class="flex items-center gap-1.5">
                          <text class="w-2 h-2 rounded-full bg-green-500" />
                          已完成
                        </text>
                        <text>{{ dashboardData.liveProgress.completed }}</text>
                      </view>
                      <Progress 
                        value={{ (dashboardData.liveProgress.completed / dashboardData.liveProgress.total) * 100 }} 
                        class="h-2"
                      />
                    </view>
                    
                    <view>
                      <view class="flex items-center justify-between text-sm mb-1">
                        <text class="flex items-center gap-1.5">
                          <text class="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          答题中
                        </text>
                        <text>{{ dashboardData.liveProgress.inProgress }}</text>
                      </view>
                      <Progress 
                        value={{ (dashboardData.liveProgress.inProgress / dashboardData.liveProgress.total) * 100 }} 
                        class="h-2"
                      />
                    </view>
                    
                    <view>
                      <view class="flex items-center justify-between text-sm mb-1">
                        <text class="flex items-center gap-1.5">
                          <text class="w-2 h-2 rounded-full bg-gray-300" />
                          未开始
                        </text>
                        <text>{{ dashboardData.liveProgress.notStarted }}</text>
                      </view>
                      <Progress 
                        value={{ (dashboardData.liveProgress.notStarted / dashboardData.liveProgress.total) * 100 }} 
                        class="h-2"
                      />
                    </view>
                  </view>
                  
                  <view class="mt-4 pt-4 border-t border-border">
                    <text class="text-sm text-muted-foreground text-center">
                      完成率: {{ Math.round((dashboardData.liveProgress.completed / dashboardData.liveProgress.total) * 100) }}%
                    </text>
                  </view>
                </Card>
    
                <!--   -->
                <view class="flex gap-3">
                  <Link href={`/competition/${params.id}/result`} class="flex-1">
                    <Button variant="outline" class="w-full">
                      <Eye class="w-4 h-4 mr-2" />
                      查看排行榜
                    </Button>
                  </Link>
                  <Button variant="outline" class="flex-1">
                    <Download class="w-4 h-4 mr-2" />
                    导出数据
                  </Button>
                </view>
              </TabsContent>
            </Tabs>
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
const dashboardData = {

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