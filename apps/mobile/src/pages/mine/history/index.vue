<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/history</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <ChevronLeft class="w-5 h-5" />
              </view>
              <text class="font-semibold">浏览历史</text>
              {totalCount > 0 ? (
                <view class="v0-btn" 
                  @click={() => setShowClearConfirm(true)}
                  class="text-sm text-red-500"
                >
                  清空
                </view>
              ) : (
                <view class="w-10" />
              )}
            </view>
          </view>
    
          <!--   -->
          {totalCount > 0 && (
            <view class="px-4 py-3 bg-muted/50 flex items-center gap-4 text-sm">
              <view class="flex items-center gap-1.5 text-muted-foreground">
                <Clock class="w-4 h-4" />
                <text>共 {{ totalCount }} 条记录</text>
              </view>
              <view class="flex items-center gap-1.5 text-muted-foreground">
                <Calendar class="w-4 h-4" />
                <text>近30天</text>
              </view>
            </view>
          )}
    
          <!--   -->
          {loading ? (
            <view class="p-4 space-y-6">
              {[1, 2].map(g => (
                <view key={g} class="space-y-3">
                  <view class="h-5 w-16 bg-muted rounded animate-pulse" />
                  {[1, 2, 3].map(i => (
                    <view key={i} class="flex gap-3 animate-pulse">
                      <view class="w-24 h-16 bg-muted rounded-lg" />
                      <view class="flex-1 space-y-2">
                        <view class="h-4 bg-muted rounded w-3/4" />
                        <view class="h-3 bg-muted rounded w-1/2" />
                      </view>
                    </view>
                  ))}
                </view>
              ))}
            </view>
          ) : historyGroups.length === 0 ? (
            <view class="flex flex-col items-center justify-center py-20">
              <view class="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <Clock class="w-10 h-10 text-muted-foreground" />
              </view>
              <text class="text-muted-foreground mb-2">暂无浏览记录</text>
              <text class="text-sm text-muted-foreground">去发现更多精彩内容吧</text>
              <view class="v0-btn" 
                @click={() => router.push('/')}
                class="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm"
              >
                去逛逛
              </view>
            </view>
          ) : (
            <view class="pb-safe">
              
    <view v-for="(group, index) in historyGroups" :key="index"> (
                <view key={group.date} class="mb-6">
                  <!--   -->
                  <view class="px-4 py-2 sticky top-14 bg-background/95 backdrop-blur-sm z-[5]">
                    <text class="text-sm font-medium text-muted-foreground">{{ group.label }}</text>
                  </view>
    
                  <!--   -->
                  <view class="px-4 space-y-3">
                    {group.items.map(item => {
                      const config = typeConfig[item.type]
                      const Icon = config.icon
                      const isDeleting = deletingId === item.id
    
                      return (
                        <view 
                          key={item.id}
                          class={`relative overflow-hidden transition-all duration-300 ${
                            isDeleting ? 'translate-x-[-80px]' : ''
                          }`}
                        >
                          <view 
                            class="flex gap-3 bg-card rounded-xl p-3 cursor-pointer active:bg-muted/50 transition-colors"
                            @click={() => !isDeleting && handleItemClick(item)}
                            onTouchStart={() => setDeletingId(item.id)}
                          >
                            <!--   -->
                            {item.cover ? (
                              <view class="relative w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                <image src={{ item.cover }} alt="" class="w-full h-full object-cover" />
                                {item.progress !== undefined && item.progress < 100 && (
                                  <view class="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                                    <view 
                                      class="h-full bg-primary"
                                      :style=" width: `${{ item.progress }}%` }}
                                    />
                                  </view>
                                )}
                                {item.type === 'video' && (
                                  <view class="absolute inset-0 flex items-center justify-center">
                                    <view class="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                                      <Play class="w-4 h-4 text-white fill-white" />
                                    </view>
                                  </view>
                                )}
                              </view>
                            ) : (
                              <view class={`w-16 h-16 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                                <Icon class="w-6 h-6 text-white" />
                              </view>
                            )}
    
                            <!--   -->
                            <view class="flex-1 min-w-0">
                              <view class="flex items-start gap-2">
                                <text class={`text-xs px-1.5 py-0.5 rounded ${config.color} text-white flex-shrink-0`}>
                                  {{ config.label }}
                                </text>
                                <text class="text-sm font-medium line-clamp-2 flex-1">{{ item.title }}</text>
                              </view>
                              <view class="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <text>{{ item.viewedAt }}</text>
                                {item.progress !== undefined && item.duration && (
                                  
                                    <text>·</text>
                                    <text class={item.progress >= 100 ? 'text-green-500' : ''}>
                                      {{ formatProgress(item.progress, item.duration) }}
                                    </text>
                                  
                                )}
                              </view>
                            </view>
    
                            <!--   -->
                            {item.progress !== undefined && item.progress < 100 && (
                              <view class="v0-btn" 
                                class="self-center px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-full flex-shrink-0"
                                @click={(e) => {
                                  e.stopPropagation()
                                  handleItemClick(item)
                                }}
                              >
                                继续
                              </view>
                            )}
                          </view>
    
                          <!--   -->
                          <view class="v0-btn"
                            class="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center text-white"
                            :style=" transform: isDeleting ? 'translateX(0)' : 'translateX(100%)' }}
                            @click={() => handleDelete(item.id)}
                          >
                            <Trash2 class="w-5 h-5" />
                          </view>
                        </view>
                      )
                    })}
                  </view>
                </view>
              ))}
    
              <!--   -->
              <view class="text-center py-6 text-sm text-muted-foreground">
                仅展示近30天的浏览记录
              </view>
            </view>
          )}
    
          <!--   -->
          {showClearConfirm && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click={() => setShowClearConfirm(false)}>
              <view class="bg-card rounded-2xl w-[80%] max-w-sm overflow-hidden" @click={e => e.stopPropagation()}>
                <view class="p-6 text-center">
                  <view class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 class="w-7 h-7 text-red-500" />
                  </view>
                  <text class="font-semibold text-lg mb-2">清空浏览历史</text>
                  <text class="text-sm text-muted-foreground">
                    确定要清空所有浏览记录吗？此操作不可恢复
                  </text>
                </view>
                <view class="flex border-t border-border">
                  <view class="v0-btn"
                    class="flex-1 py-3.5 text-muted-foreground"
                    @click={() => setShowClearConfirm(false)}
                  >
                    取消
                  </view>
                  <view class="v0-btn"
                    class="flex-1 py-3.5 text-red-500 font-medium border-l border-border"
                    @click={{ handleClearAll }}
                  >
                    清空
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {deletingId && (
            <view 
              class="fixed inset-0 z-[1]"
              @click={() => setDeletingId(null)}
            />
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const typeConfig = {
    const routes: Record<string, string> = {

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