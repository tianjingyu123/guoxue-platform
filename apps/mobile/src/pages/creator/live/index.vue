<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: creator/live</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="flex items-center gap-3">
                <BackButton fallbackPath="/profile" />
                <text class="font-semibold text-base text-foreground">直播管理</text>
              </view>
              <view class="flex items-center gap-2">
                <view class="v0-btn" class="p-2 rounded-full hover:bg-secondary transition-colors">
                  <Bell class="w-5 h-5 text-muted-foreground" />
                </view>
                <view class="v0-btn" class="p-2 rounded-full hover:bg-secondary transition-colors">
                  <Settings class="w-5 h-5 text-muted-foreground" />
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <view class="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              
    <view v-for="(stat, index) in statsData" :key="index"> {
                const Icon = stat.icon
                return (
                  <Card 
                    key={stat.id}
                    class={cn(
                      "flex-shrink-0 w-28 p-3 border-0 bg-gradient-to-br text-white",
                      stat.color
                    )}
                  >
                    <Icon class="w-5 h-5 opacity-80 mb-2" />
                    <view class="text-xl font-bold">{{ stat.value }}<text class="text-sm font-normal opacity-80">{{ stat.unit }}</text></view>
                    <view class="text-xs opacity-80 mt-0.5">{{ stat.label }}</view>
                  </Card>
                )
              })}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 mb-4">
            <Button 
              @click={() => router.push("/creator/live/create")}
              class="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20"
            >
              <Plus class="w-5 h-5 mr-2" />
              创建直播
            </Button>
            
            <!--   -->
            <view class="grid grid-cols-3 gap-3 mt-3">
              <Card class="p-3 flex flex-col items-center gap-1.5 cursor-pointer hover:bg-secondary/50 transition-colors">
                <view class="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <BookOpen class="w-5 h-5 text-blue-500" />
                </view>
                <text class="text-xs text-muted-foreground">知识授课</text>
              </Card>
              <Card class="p-3 flex flex-col items-center gap-1.5 cursor-pointer hover:bg-secondary/50 transition-colors">
                <view class="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <ShoppingBag class="w-5 h-5 text-orange-500" />
                </view>
                <text class="text-xs text-muted-foreground">电商带货</text>
              </Card>
              <Card class="p-3 flex flex-col items-center gap-1.5 cursor-pointer hover:bg-secondary/50 transition-colors">
                <view class="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Radio class="w-5 h-5 text-purple-500" />
                </view>
                <text class="text-xs text-muted-foreground">快速开播</text>
              </Card>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4">
            <!--   -->
            <view class="flex items-center gap-1 mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
              
    <view v-for="(tab, index) in tabs" :key="index"> {
                const count = tab.key === "all" 
                  ? liveList.length 
                  : liveList.filter(item => item.status === tab.key).length
                return (
                  <view class="v0-btn"
                    key={{ tab.key }}
                    @click={() => setActiveTab(tab.key)}
                    class={cn(
                      "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      activeTab === tab.key 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {{ tab.label }}
                    {count > 0 && (
                      <text class={cn(
                        "ml-1.5 text-xs",
                        activeTab === tab.key ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {{ count }}
                      </text>
                    )}
                  </view>
                )
              })}
            </view>
    
            <!--   -->
            {filteredList.length > 0 ? (
              <view class="space-y-3">
                
    <view v-for="(item, index) in filteredList" :key="index"> {
                  const status = statusConfig[item.status as keyof typeof statusConfig]
                  const isLive = item.status === "live"
                  
                  return (
                    <Card 
                      key={{ item.id }}
                      class={cn(
                        "overflow-hidden",
                        isLive && "ring-2 ring-red-500/30"
                      )}
                    >
                      <view class="flex gap-3 p-3">
                        <!--   -->
                        <view class="relative w-28 h-20 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                          {{ item.cover ? (
                            <image src={item.cover }} alt={{ item.title }} class="w-full h-full object-cover" />
                          ) : (
                            <view class="w-full h-full flex items-center justify-center">
                              <Video class="w-8 h-8 text-muted-foreground/30" />
                            </view>
                          )}
                          <!--   -->
                          <Badge 
                            class={cn(
                              "absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 border-0",
                              status.color, "text-white"
                            )}
                          >
                            <template v-if="isLive">
    text class="w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse" />}
                            {{ status.label }}
                          </Badge>
                          <!--   -->
                          <Badge 
                            variant="secondary"
                            class="absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0 bg-black/50 text-white border-0"
                          >
                            {item.type === "knowledge" ? "知识" : "带货"}
                          </Badge>
                        </view>
    
                        <!--   -->
                        <view class="flex-1 min-w-0 flex flex-col justify-between">
                          <view>
                            <text class="font-medium text-sm line-clamp-2">{{ item.title }}</text>
                            {item.scheduledTime && (
                              <view class="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Calendar class="w-3 h-3" />
                                <text>{{ item.scheduledTime }}</text>
                              </view>
                            )}
                          </view>
                          
                          <!--   -->
                          <view class="flex items-center gap-3 text-xs text-muted-foreground">
                            {item.status === "preview" ? (
                              
                                <text class="flex items-center gap-1">
                                  <Bell class="w-3 h-3" />
                                  {{ item.previewCount }}人预约
                                </text>
                              
                            ) : item.status !== "draft" && (
                              
                                <text class="flex items-center gap-1">
                                  <Eye class="w-3 h-3" />
                                  {{ formatNumber(item.viewers) }}
                                </text>
                                <text class="flex items-center gap-1">
                                  <Clock class="w-3 h-3" />
                                  {{ item.duration }}
                                </text>
                                {item.income > 0 && (
                                  <text class="flex items-center gap-1 text-amber-600">
                                    <Gift class="w-3 h-3" />
                                    ¥{{ item.income }}
                                  </text>
                                )}
                              
                            )}
                          </view>
                        </view>
    
                        <!--   -->
                        <view class="flex flex-col items-end justify-between">
                          <view class="v0-btn" 
                            @click={() => setShowActions(showActions === item.id ? null : item.id)}
                            class="p-1.5 rounded-full hover:bg-secondary"
                          >
                            <MoreHorizontal class="w-5 h-5 text-muted-foreground" />
                          </view>
                          
                          {isLive ? (
                            <Button size="sm" class="h-7 text-xs bg-red-500 hover:bg-red-600">
                              <Play class="w-3 h-3 mr-1" />
                              进入直播
                            </Button>
                          ) : item.status === "preview" ? (
                            <Button size="sm" variant="outline" class="h-7 text-xs">
                              <Edit3 class="w-3 h-3 mr-1" />
                              编辑
                            </Button>
                          ) : item.status === "draft" ? (
                            <Button size="sm" class="h-7 text-xs">
                              继续编辑
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" class="h-7 text-xs text-muted-foreground">
                              <BarChart2 class="w-3 h-3 mr-1" />
                              数据
                            </Button>
                          )}
                        </view>
                      </view>
    
                      <!--   -->
                      {showActions === item.id && (
                        <view class="flex items-center justify-end gap-2 px-3 pb-3 pt-0 border-t border-border mt-2 pt-2">
                          <Button size="sm" variant="ghost" class="h-8 text-xs">
                            <Edit3 class="w-3.5 h-3.5 mr-1" />
                            编辑
                          </Button>
                          <Button size="sm" variant="ghost" class="h-8 text-xs">
                            <BarChart2 class="w-3.5 h-3.5 mr-1" />
                            数据详情
                          </Button>
                          <Button size="sm" variant="ghost" class="h-8 text-xs text-red-500 hover:text-red-600">
                            <Trash2 class="w-3.5 h-3.5 mr-1" />
                            删除
                          </Button>
                        </view>
                      )}
                    </Card>
                  )
                })}
              </view>
            ) : (
              /* 空状态 */
              <view class="flex flex-col items-center justify-center py-16">
                <view class="w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                  <Video class="w-16 h-16 text-muted-foreground/30" />
                </view>
                <text class="text-lg font-medium text-foreground mb-2">暂无直播记录</text>
                <text class="text-sm text-muted-foreground text-center mb-6">
                  开始你的第一场直播，与粉丝实时互动
                </text>
                <Button 
                  @click={() => router.push("/creator/live/create")}
                  class="bg-gradient-to-r from-primary to-accent"
                >
                  <Plus class="w-4 h-4 mr-2" />
                  创建直播
                </Button>
              </view>
            )}
          </view>
    
          <!--   -->
          <view class="fixed bottom-6 right-4 z-30">
            <Button 
              size="lg"
              class="h-14 w-14 rounded-full shadow-lg shadow-red-500/30 bg-gradient-to-br from-red-500 to-pink-500 hover:opacity-90"
              @click={() => {}}
            >
              <Radio class="w-6 h-6" />
            </Button>
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
const statsData = [
const statusConfig = {
const liveList = [
const tabs = [
  const filteredList = activeTab === "all" 
            const count = tab.key === "all" 
              const isLive = item.status === "live"

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