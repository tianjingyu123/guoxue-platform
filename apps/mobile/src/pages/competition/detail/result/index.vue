<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">比赛</text>
      <text class="v0-route">V0: competition/[id]/result</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-50 bg-primary text-primary-foreground">
            <view class="flex items-center justify-between px-4 h-11">
              <view class="v0-btn" @click={() => router.back()} class="flex items-center">
                <ArrowLeft class="w-5 h-5" />
              </view>
              <text class="font-medium">排行榜</text>
              <view class="v0-btn">
                <Share2 class="w-5 h-5" />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="bg-primary text-primary-foreground px-4 pb-6 pt-2">
            <text class="text-white/80 text-sm mb-1">{{ rankingData.competitionTitle }}</text>
            <view class="flex items-center gap-3 text-sm">
              <Badge class="bg-white/20 text-white border-0">{{ rankingData.currentRound }}</Badge>
              <text class="text-white/70">参赛 {{ rankingData.totalParticipants }} 人</text>
              <text class="text-white/70">晋级 {{ rankingData.promotedCount }} 人</text>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 -mt-2">
            <Card class="p-4">
              <view class="flex items-end justify-center gap-4">
                <!--   -->
                <view class="text-center flex-1">
                  <view class="w-14 h-14 rounded-full bg-gray-100 mx-auto mb-2 flex items-center justify-center relative">
                    <Users class="w-6 h-6 text-gray-400" />
                    <view class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                      <Medal class="w-4 h-4 text-white" />
                    </view>
                  </view>
                  <text class="font-medium text-sm">{{ rankingData.topThree[1].name }}</text>
                  <text class="text-lg font-bold text-gray-500">{{ rankingData.topThree[1].score }}</text>
                </view>
                
                <!--   -->
                <view class="text-center flex-1">
                  <view class="w-20 h-20 rounded-full bg-amber-100 mx-auto mb-2 flex items-center justify-center relative">
                    <Users class="w-8 h-8 text-amber-400" />
                    <view class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center">
                      <Crown class="w-5 h-5 text-white" />
                    </view>
                  </view>
                  <text class="font-bold">{{ rankingData.topThree[0].name }}</text>
                  <text class="text-2xl font-bold text-amber-500">{{ rankingData.topThree[0].score }}</text>
                </view>
                
                <!--   -->
                <view class="text-center flex-1">
                  <view class="w-14 h-14 rounded-full bg-amber-50 mx-auto mb-2 flex items-center justify-center relative">
                    <Users class="w-6 h-6 text-amber-300" />
                    <view class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center">
                      <Award class="w-4 h-4 text-white" />
                    </view>
                  </view>
                  <text class="font-medium text-sm">{{ rankingData.topThree[2].name }}</text>
                  <text class="text-lg font-bold text-amber-700">{{ rankingData.topThree[2].score }}</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          {rankingData.myRanking && (
            <view class="px-4 mt-4">
              <Card class={cn(
                "p-4 border-2",
                rankingData.myRanking.isPromoted ? "border-green-300 bg-green-50/50" : "border-border"
              )}>
                <view class="flex items-center gap-3">
                  <view class={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                    rankingData.myRanking.rank <= 3 ? "bg-amber-100 text-amber-600" :
                    rankingData.myRanking.rank <= 10 ? "bg-primary/10 text-primary" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {{ rankingData.myRanking.rank }}
                  </view>
                  <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users class="w-6 h-6 text-primary" />
                  </view>
                  <view class="flex-1">
                    <text class="font-medium">我的排名</text>
                    <text class="text-sm text-muted-foreground">
                      超越了 {{ Math.round((1 - rankingData.myRanking.rank / rankingData.totalParticipants) * 100) }}% 的选手
                    </text>
                  </view>
                  <view class="text-right">
                    <text class="text-xl font-bold text-primary">{{ rankingData.myRanking.score }}</text>
                    {rankingData.myRanking.isPromoted && (
                      <Badge class="bg-green-100 text-green-700 border-0">已晋级</Badge>
                    )}
                  </view>
                </view>
              </Card>
            </view>
          )}
    
          <!--   -->
          <view class="px-4 mt-4 space-y-3">
            <view class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索选手..."
                value={{ searchQuery }}
                @change={(e) => setSearchQuery(e.target.value)}
                class="pl-9"
              />
            </view>
            
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
              <TabsList class="w-full grid grid-cols-3 h-9">
                <TabsTrigger value="all" class="text-xs">全部</TabsTrigger>
                <TabsTrigger value="promoted" class="text-xs">已晋级</TabsTrigger>
                <TabsTrigger value="eliminated" class="text-xs">未晋级</TabsTrigger>
              </TabsList>
            </Tabs>
          </view>
    
          <!--   -->
          <view class="px-4 mt-4">
            <Card>
              <view class="divide-y divide-border">
                
    <view v-for="(item, index) in filteredRankings" :key="index"> (
                  <view key={item.userId} class="flex items-center gap-3 p-3">
                    <view class={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      item.rank === 1 ? "bg-amber-100 text-amber-600" :
                      item.rank === 2 ? "bg-gray-100 text-gray-600" :
                      item.rank === 3 ? "bg-amber-50 text-amber-700" :
                      item.rank <= 10 ? "bg-primary/10 text-primary" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {{ item.rank }}
                    </view>
                    <view class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Users class="w-5 h-5 text-muted-foreground" />
                    </view>
                    <view class="flex-1">
                      <text class="font-medium text-sm">{{ item.name }}</text>
                    </view>
                    <view class="text-right">
                      <text class="font-bold">{{ item.score }}</text>
                      {item.isPromoted ? (
                        <text class="text-xs text-green-600">晋级</text>
                      ) : (
                        <text class="text-xs text-muted-foreground">未晋级</text>
                      )}
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
const rankingData = {

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