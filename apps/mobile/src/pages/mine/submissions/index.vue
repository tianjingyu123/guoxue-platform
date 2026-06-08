<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/submissions</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E8E3DB]">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <ArrowLeft class="w-5 h-5 text-[#2C2C2C]" />
              </view>
              <text class="text-lg font-semibold text-[#2C2C2C]">我的投稿</text>
              <view class="v0-btn" 
                @click={{ handleRefresh }}
                class="p-2 -mr-2"
                :disabled={{ refreshing }}
              >
                <RefreshCw class={`w-5 h-5 text-[#666666] ${refreshing ? 'animate-spin' : ''}`} />
              </view>
            </view>
    
            <!--   -->
            <view class="flex px-4 gap-2 pb-3">
              
    <view v-for="(tab, index) in tabs" :key="index"> {
                const Icon = tab.icon
                const isActive = activeTab === tab.key
                return (
                  <view class="v0-btn"
                    key={{ tab.key }}
                    @click={() => setActiveTab(tab.key as typeof activeTab)}
                    class={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                      isActive
                        ? 'bg-[#C41E3A] text-white'
                        : 'bg-white text-[#666666] border border-[#E8E3DB]'
                    }`}
                  >
                    <Icon class="w-4 h-4" />
                    <text>{{ tab.label }}</text>
                    {tab.key && (
                      <text class={`text-xs ${isActive ? 'text-white/80' : 'text-[#999999]'}`}>
                        {{ counts[tab.key as keyof typeof counts] }}
                      </text>
                    )}
                  </view>
                )
              })}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            {loading ? (
              // Skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <view key={{ i }} class="bg-white rounded-2xl p-4 animate-pulse">
                  <view class="flex gap-3">
                    <view class="w-20 h-14 bg-[#E8E3DB] rounded-lg" />
                    <view class="flex-1">
                      <view class="h-4 bg-[#E8E3DB] rounded w-3/4 mb-2" />
                      <view class="h-3 bg-[#E8E3DB] rounded w-1/2" />
                    </view>
                  </view>
                </view>
              ))
            ) : submissions.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
                  <FileText class="w-8 h-8 text-[#999999]" />
                </view>
                <text class="text-[#999999] mb-4">暂无投稿记录</text>
                <view class="v0-btn"
                  @click={() => router.push('/editor')}
                  class="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
                >
                  去投稿
                </view>
              </view>
            ) : (
              submissions.map((item) => {{ const statusConfig = getStatusConfig(item.status)
                const StatusIcon = statusConfig.icon
                
                return (
                  <view
                    key={item.id }}
                    class="bg-white rounded-2xl overflow-hidden shadow-sm"
                  >
                    <view class="p-4">
                      <view class="flex gap-3">
                        <!--   -->
                        {item.cover && (
                          <view class="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#F5F5F5]">
                            <image
                              src={{ item.cover }}
                              alt=""
                              class="w-full h-full object-cover"
                            />
                          </view>
                        )}
                        
                        <!--   -->
                        <view class="flex-1 min-w-0">
                          <text class="font-medium text-[#2C2C2C] line-clamp-2 mb-1">
                            {{ item.title }}
                          </text>
                          <view class="flex items-center gap-2 text-xs text-[#999999]">
                            <text>投稿至 {{ item.targetPosition }}</text>
                            <text>·</text>
                            <text>{{ formatDate(item.submittedAt) }}</text>
                          </view>
                        </view>
    
                        <!--   -->
                        <view class={`flex items-center gap-1 px-2 py-1 rounded-full text-xs flex-shrink-0 ${statusConfig.color}`}>
                          <StatusIcon class="w-3 h-3" />
                          <text>{{ statusConfig.label }}</text>
                        </view>
                      </view>
    
                      <!--   -->
                      {item.status === 'approved' && (item.views || item.likes) && (
                        <view class="flex items-center gap-4 mt-3 pt-3 border-t border-[#F5F5F5]">
                          {item.views !== undefined && (
                            <view class="flex items-center gap-1 text-sm text-[#666666]">
                              <Eye class="w-4 h-4" />
                              <text>{{ item.views }}</text>
                            </view>
                          )}
                          {item.likes !== undefined && (
                            <view class="flex items-center gap-1 text-sm text-[#666666]">
                              <Heart class="w-4 h-4" />
                              <text>{{ item.likes }}</text>
                            </view>
                          )}
                          <view class="flex-1" />
                          <view class="v0-btn"
                            @click={() => router.push(`/articles/${item.id}`)}
                            class="flex items-center gap-1 text-sm text-[#C41E3A]"
                          >
                            <text>查看详情</text>
                            <ChevronRight class="w-4 h-4" />
                          </view>
                        </view>
                      )}
    
                      <!--   -->
                      {item.status === 'rejected' && item.rejectReason && (
                        <view class="mt-3 pt-3 border-t border-[#F5F5F5]">
                          <view class="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                            <AlertCircle class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <view class="flex-1">
                              <text class="text-sm text-red-600 font-medium mb-1">未通过原因</text>
                              <text class="text-sm text-red-500/80">{{ item.rejectReason }}</text>
                            </view>
                          </view>
                          <view class="v0-btn"
                            @click={() => handleResubmit(item.id)}
                            class="w-full mt-3 py-2.5 bg-gradient-to-r from-[#C41E3A] to-[#E85050] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <Edit3 class="w-4 h-4" />
                            <text>修改并重新投稿</text>
                          </view>
                        </view>
                      )}
    
                      <!--   -->
                      {item.status === 'pending' && (
                        <view class="mt-3 pt-3 border-t border-[#F5F5F5]">
                          <view class="flex items-center gap-2 text-sm text-amber-600">
                            <view class="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <text>预计1-3个工作日内完成审核</text>
                          </view>
                        </view>
                      )}
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
  const tabs = [
  const counts = {

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