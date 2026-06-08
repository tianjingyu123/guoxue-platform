<template>
  <view class="page v0-page" data-v0-route="bounty/my">
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <ChevronLeft class="w-5 h-5" />
              </view>
              <text class="h1" class="font-semibold">我的悬赏</text>
              <view class="w-9" />
            </view>
    
            <!--   -->
            <view class="flex border-b border-border">
              {{ [
                { key: 'posted' , label: '我发布的' }},
                { key: 'answered' , label: '我回答的' },
              ].map(tab => (
                <view class="v0-btn"
                  key={{ tab.key }}
                  @click={() => setActiveTab(tab.key)}
                  class="v0-class"`}
                >
                  {{ tab.label }}
                  {{ activeTab === tab.key && (
                    <view class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
                  ) }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          {{ !loading && bounties.length > 0 && (
            <view class="p-4">
              <view class="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
                <view class="flex items-center gap-2 mb-3">
                  <Gift class="w-5 h-5" />
                  <text class="font-medium">{activeTab === 'posted' ? '发布统计' : '回答统计' }}</text>
                </view>
                <view class="grid grid-cols-4 gap-2">
                  <view class="text-center">
                    <view class="text-2xl font-bold">{{ stats.total }}</view>
                    <view class="text-xs text-white/80">总数</view>
                  </view>
                  <view class="text-center">
                    <view class="text-2xl font-bold">{{ stats.open }}</view>
                    <view class="text-xs text-white/80">进行中</view>
                  </view>
                  <view class="text-center">
                    <view class="text-2xl font-bold">{{ stats.resolved }}</view>
                    <view class="text-xs text-white/80">已解决</view>
                  </view>
                  <view class="text-center">
                    <view class="text-2xl font-bold">¥{{ stats.totalAmount }}</view>
                    <view class="text-xs text-white/80">{{ activeTab === 'posted' ? '总投入' : '总收益' }}</view>
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          <view class="px-4 pb-20">
            {loading ? (
              <view class="space-y-4 mt-4">
                {[1, 2, 3].map(i => (
                  <view key={i} class="animate-pulse">
                    <view class="bg-card rounded-2xl p-4 space-y-3">
                      <view class="flex items-center gap-2">
                        <view class="h-5 w-16 bg-muted rounded-full" />
                        <view class="h-4 w-20 bg-muted rounded" />
                      </view>
                      <view class="h-5 w-3/4 bg-muted rounded" />
                      <view class="h-4 w-full bg-muted rounded" />
                      <view class="flex justify-between">
                        <view class="h-4 w-24 bg-muted rounded" />
                        <view class="h-8 w-20 bg-muted rounded-lg" />
                      </view>
                    </view>
                  </view>
                ))}
              </view>
            ) : bounties.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Gift class="w-10 h-10 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground mb-4">
                  {{ activeTab === 'posted' ? '还没有发布过悬赏' : '还没有回答过悬赏' }}
                </text>
                {activeTab === 'posted' && (
                  <view class="v0-btn"
                    @click={() => router.push('/bounty/create')}
                    class="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium"
                  >
                    发布悬赏
                  </view>
                )}
              </view>
            ) : (
              <view class="space-y-4 mt-4">
                <view v-for="bounty in bounties" :key="bounty.id || index">{
                  const config = statusConfig[bounty.status] || statusConfig.open
                  const StatusIcon = config.icon
                  
                  return (
                    <view
                      key={bounty.id}
                      @click={() => router.push(`/bounty/${bounty.id}`)}
                      class="bg-card rounded-2xl p-4 shadow-sm border border-border/50 active:scale-[0.98] transition-transform"
                    >
                      <!--   -->
                      <view class="flex items-center justify-between mb-3">
                        <view class="v0-class" ${{ config.color }}`}>
                          <StatusIcon class="w-3.5 h-3.5" />
                          {{ config.label }}
                        </view>
                        <view class="flex items-center gap-1 text-amber-600">
                          <Gift class="w-4 h-4" />
                          <text class="font-bold">¥{{ bounty.amount }}</text>
                        </view>
                      </view>
    
                      <!--   -->
                      <text class="h3" class="font-medium text-foreground mb-2 line-clamp-2">{{ bounty.title }}</text>
    
                      <!--   -->
                      <text class="text-sm text-muted-foreground line-clamp-2 mb-3">{{ bounty.description }}</text>
    
                      <!--   -->
                      <view class="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        {{ activeTab === 'posted' ? (
                          
                            <text class="flex items-center gap-1">
                              <MessageSquare class="w-3.5 h-3.5" />
                              {bounty.answerCount }}个回答
                            </text>
                            {{ bounty.status === 'open' && (
                              <text class="flex items-center gap-1 text-orange-500">
                                <Clock class="w-3.5 h-3.5" />
                                {getRemainTime(bounty.expireAt) }}
                              </text>
                            )}
                          
                        ) : (
                          
                            <text>{{ formatTimeAgo(bounty.createdAt) }}回答</text>
                            {{ bounty.status === 'resolved' && (
                              <text class="flex items-center gap-1 text-green-600">
                                <CheckCircle class="w-3.5 h-3.5" />
                                已被采纳
                              </text>
                            ) }}
                          
                        )}
                      </view>
    
                      <!--   -->
                      {activeTab === 'posted' && (
                        <view class="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                          {bounty.status === 'answered' && (
                            <view class="v0-btn"
                              @click={(e) => handleSettle(bounty.id, e)}
                              class="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium"
                            >
                              <Wallet class="w-4 h-4" />
                              结算悬赏
                            </view>
                          )}
                          {(bounty.status === 'expired' || bounty.status === 'cancelled') && (
                            <view class="v0-btn"
                              @click={(e) => handleRepost(bounty.id, e)}
                              class="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                            >
                              <RefreshCw class="w-4 h-4" />
                              重新发布
                            </view>
                          )}
                          {{ bounty.status === 'open' && bounty.answerCount === 0 && (
                            <text class="text-xs text-muted-foreground">等待回答中...</text>
                          ) }}
                          {bounty.status === 'open' && bounty.answerCount > 0 && (
                            <view class="v0-btn"
                              @click={(e) => { e.stopPropagation(); router.push(`/bounty/${bounty.id}`) }}
                              class="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium"
                            >
                              查看回答
                            </view>
                          )}
                        </view>
                      )}
                    </view>
                  )
                })}
    
                <!--   -->
                {hasMore && (
                  <view class="v0-btn"
                    @click={() => loadBounties(true)}
                    class="w-full py-3 text-sm text-muted-foreground"
                  >
                    加载更多
                  </view>
                )}
              </view>
            )}
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: bounty/my
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.v0-page {
  padding: 24rpx;
}

/* 按钮样式 */
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 列表项 */
.v0-li {
  padding: 24rpx;
  border-bottom: 1px solid #E8E0D5;
}

/* 分隔线 */
.hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>