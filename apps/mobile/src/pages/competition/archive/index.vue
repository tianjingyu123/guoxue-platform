<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">比赛</text>
      <text class="v0-route">V0: competition/archive</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-50 bg-card border-b border-border">
            <view class="flex items-center justify-between px-4 h-11">
              <view class="v0-btn" @click={() => router.back()} class="flex items-center">
                <ArrowLeft class="w-5 h-5" />
              </view>
              <text class="font-medium">历届比赛档案</text>
              <view class="w-5" />
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 border-b border-border">
            <view class="flex gap-2">
              
    <view v-for="(year, index) in years" :key="index"> (
                <view class="v0-btn"
                  key={{ year.value }}
                  @click={() => setSelectedYear(year.value)}
                  class={cn(
                    "px-4 py-1.5 rounded-full text-sm transition-colors",
                    selectedYear === year.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {{ year.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4 space-y-4">
            
    <view v-for="(competition, index) in filteredData" :key="index"> (
              <Card key={competition.id} class="overflow-hidden">
                <!--   -->
                <view class="p-4">
                  <view class="flex items-start justify-between mb-2">
                    <view>
                      <Badge variant="secondary" class="mb-2">{{ competition.edition }}</Badge>
                      <text class="font-bold">{{ competition.title }}</text>
                    </view>
                    <text class="text-sm text-muted-foreground">{{ competition.year }}</text>
                  </view>
                  
                  <view class="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <text class="flex items-center gap-1">
                      <Calendar class="w-4 h-4" />
                      {{ competition.startTime }}
                    </text>
                    <text class="flex items-center gap-1">
                      <Users class="w-4 h-4" />
                      {{ competition.totalParticipants }}人参赛
                    </text>
                  </view>
    
                  <!--   -->
                  <view class="flex items-end justify-center gap-3 py-4 bg-gradient-to-b from-amber-50/50 to-transparent rounded-xl">
                    <!--   -->
                    <view class="text-center">
                      <view class="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-1 flex items-center justify-center">
                        <Medal class="w-5 h-5 text-gray-400" />
                      </view>
                      <text class="text-xs font-medium">{{ competition.topThree[1].name }}</text>
                      <text class="text-xs text-muted-foreground">{{ competition.topThree[1].score }}分</text>
                    </view>
                    
                    <!--   -->
                    <view class="text-center -mt-4">
                      <view class="w-16 h-16 rounded-full bg-amber-100 mx-auto mb-1 flex items-center justify-center">
                        <Crown class="w-7 h-7 text-amber-500" />
                      </view>
                      <text class="text-sm font-bold">{{ competition.topThree[0].name }}</text>
                      <text class="text-xs text-amber-600">{{ competition.topThree[0].score }}分</text>
                    </view>
                    
                    <!--   -->
                    <view class="text-center">
                      <view class="w-12 h-12 rounded-full bg-amber-50 mx-auto mb-1 flex items-center justify-center">
                        <Award class="w-5 h-5 text-amber-600" />
                      </view>
                      <text class="text-xs font-medium">{{ competition.topThree[2].name }}</text>
                      <text class="text-xs text-muted-foreground">{{ competition.topThree[2].score }}分</text>
                    </view>
                  </view>
    
                  <!--   -->
                  <view class="v0-btn"
                    @click={() => toggleExpand(competition.id)}
                    class="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground mt-3 pt-3 border-t border-border"
                  >
                    {expandedId === competition.id ? (
                      收起详情 <ChevronUp class="w-4 h-4" />
                    ) : (
                      查看详情 <ChevronDown class="w-4 h-4" />
                    )}
                  </view>
                </view>
    
                <!--   -->
                {expandedId === competition.id && (
                  <view class="px-4 pb-4 border-t border-border">
                    <view class="pt-4 space-y-4">
                      <!--   -->
                      <view>
                        <text class="font-medium text-sm mb-2 flex items-center gap-1">
                          <Star class="w-4 h-4 text-amber-500" />
                          精彩回顾
                        </text>
                        <view class="space-y-1">
                          {competition.highlights.map((highlight, i) => (
                            <view key={i} class="text-sm text-muted-foreground flex items-start gap-2">
                              <text class="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                              {{ highlight }}
                            </view>
                          ))}
                        </view>
                      </view>
    
                      <!--   -->
                      <view class="flex gap-3">
                        {competition.hasReplay && (
                          <Button variant="outline" class="flex-1">
                            <Play class="w-4 h-4 mr-2" />
                            观看回放
                          </Button>
                        )}
                        <Link href={`/competition/${competition.id}/result`} class="flex-1">
                          <Button variant="outline" class="w-full">
                            <Trophy class="w-4 h-4 mr-2" />
                            完整排名
                          </Button>
                        </Link>
                      </view>
                    </view>
                  </view>
                )}
              </Card>
            ))}
    
            {filteredData.length === 0 && (
              <view class="text-center py-12 text-muted-foreground">
                <Trophy class="w-12 h-12 mx-auto mb-3 opacity-30" />
                <text>暂无历届比赛记录</text>
              </view>
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
const archiveData = [
const years = [

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