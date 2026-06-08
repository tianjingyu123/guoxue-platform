<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">悬赏</text>
      <text class="v0-route">V0: bounty</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
                  <ChevronLeft class="w-6 h-6" />
                </view>
                <text class="text-lg font-semibold">悬赏广场</text>
              </view>
              <view class="v0-btn"
                @click={() => router.push('/bounty/create')}
                class="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium"
              >
                <Plus class="w-4 h-4" />
                发布悬赏
              </view>
            </view>
    
            <!--   -->
            <view class="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
              
    <view v-for="(tab, index) in STATUS_TABS" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.key }}
                  @click={() => setActiveTab(tab.key)}
                  class={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {{ tab.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-4">
            {loading ? (
              // Skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <view key={{ i }} class="bg-card rounded-2xl p-4 animate-pulse">
                  <view class="flex items-start gap-3">
                    <view class="w-10 h-10 rounded-full bg-muted" />
                    <view class="flex-1 space-y-2">
                      <view class="h-4 bg-muted rounded w-1/4" />
                      <view class="h-5 bg-muted rounded w-3/4" />
                      <view class="h-4 bg-muted rounded w-full" />
                    </view>
                  </view>
                </view>
              ))
            ) : bounties.length === 0 ? (
              <view class="text-center py-20">
                <view class="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <MessageSquare class="w-10 h-10 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground mb-4">暂无悬赏问题</text>
                <view class="v0-btn"
                  @click={() => router.push('/bounty/create')}
                  class="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm"
                >
                  发布悬赏
                </view>
              </view>
            ) : (
              bounties.map(bounty => {{ const statusConfig = STATUS_CONFIG[bounty.status]
                return (
                  <view
                    key={bounty.id }}
                    @click={() => router.push(`/bounty/${bounty.id}`)}
                    class="bg-card rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <!--   -->
                    <view class="flex items-start gap-3 mb-3">
                      <image
                        src={{ bounty.poster.avatar }}
                        alt={{ bounty.poster.name }}
                        class="w-10 h-10 rounded-full object-cover"
                      />
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2">
                          <text class="text-sm font-medium">{{ bounty.poster.name }}</text>
                          <text class="text-xs text-muted-foreground">{{ formatTime(bounty.createdAt) }}</text>
                        </view>
                        {bounty.category && (
                          <text class="text-xs text-muted-foreground">{{ bounty.category }}</text>
                        )}
                      </view>
                      <view class={`px-2 py-0.5 rounded-full text-xs ${statusConfig.bg} ${{ statusConfig.color }}`}>
                        {{ statusConfig.label }}
                      </view>
                    </view>
    
                    <!--   -->
                    <text class="font-medium mb-2 line-clamp-2">{{ bounty.title }}</text>
                    <text class="text-sm text-muted-foreground line-clamp-2 mb-3">{{ bounty.description }}</text>
    
                    <!--   -->
                    {bounty.tags && bounty.tags.length > 0 && (
                      <view class="flex flex-wrap gap-2 mb-3">
                        {bounty.tags.map(tag => (
                          <text key={tag} class="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                            #{{ tag }}
                          </text>
                        ))}
                      </view>
                    )}
    
                    <!--   -->
                    <view class="flex items-center justify-between pt-3 border-t border-border">
                      <view class="flex items-center gap-4 text-xs text-muted-foreground">
                        <view class="flex items-center gap-1">
                          <Eye class="w-3.5 h-3.5" />
                          <text>{{ bounty.viewCount }}</text>
                        </view>
                        <view class="flex items-center gap-1">
                          <MessageSquare class="w-3.5 h-3.5" />
                          <text>{{ bounty.answerCount }}个回答</text>
                        </view>
                        {bounty.status === 'open' && (
                          <view class="flex items-center gap-1 text-orange-500">
                            <Clock class="w-3.5 h-3.5" />
                            <text>{{ getRemainingTime(bounty.expireAt) }}</text>
                          </view>
                        )}
                      </view>
                      <view class="flex items-center gap-1 text-primary font-semibold">
                        <Coins class="w-4 h-4" />
                        <text>¥{{ bounty.amount }}</text>
                      </view>
                    </view>
                  </view>
                )
              })
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
const STATUS_TABS = [
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    const mockBounties: Bounty[] = [

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