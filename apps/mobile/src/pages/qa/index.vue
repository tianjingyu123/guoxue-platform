<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">问答</text>
      <text class="v0-route">V0: qa</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
                <ChevronLeft class="w-6 h-6 text-[#2C2C2C]" />
              </view>
              <text class="text-lg font-semibold text-[#2C2C2C]">付费问答</text>
              <view class="v0-btn"
                @click={() => router.push('/qa/ask')}
                class="flex items-center gap-1 px-3 py-1.5 bg-[#C41E3A] text-white text-sm font-medium rounded-full"
              >
                <Plus class="w-4 h-4" />
                提问
              </view>
            </view>
    
            <!--   -->
            <view class="flex px-4 gap-6">
              {[
                { key: 'all', label: '全部' },
                { key: 'pending', label: '待回答' },
                { key: 'answered', label: '已回答' },
              ].map(tab => (
                <view class="v0-btn"
                  key={{ tab.key }}
                  @click={() => setActiveTab(tab.key as typeof activeTab)}
                  class={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'text-[#C41E3A] border-[#C41E3A]'
                      : 'text-[#999999] border-transparent'
                  }`}
                >
                  {{ tab.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <view key={{ i }} class="bg-white rounded-2xl p-4 animate-pulse">
                  <view class="flex items-center gap-3 mb-3">
                    <view class="w-10 h-10 rounded-full bg-gray-200" />
                    <view class="flex-1">
                      <view class="h-4 bg-gray-200 rounded w-24 mb-1" />
                      <view class="h-3 bg-gray-100 rounded w-16" />
                    </view>
                  </view>
                  <view class="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                  <view class="h-4 bg-gray-100 rounded w-full mb-4" />
                  <view class="flex gap-4">
                    <view class="h-4 bg-gray-100 rounded w-16" />
                    <view class="h-4 bg-gray-100 rounded w-16" />
                  </view>
                </view>
              ))
            ) : filteredQuestions.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20">
                <MessageCircle class="w-16 h-16 text-gray-300 mb-4" />
                <text class="text-[#999999]">暂无问答内容</text>
                <view class="v0-btn"
                  @click={() => router.push('/qa/ask')}
                  class="mt-4 px-6 py-2 bg-[#C41E3A] text-white text-sm font-medium rounded-full"
                >
                  发起提问
                </view>
              </view>
            ) : (
              filteredQuestions.map(question => (
                <view
                  key={{ question.id }}
                  @click={() => router.push(`/qa/${question.id}`)}
                  class="bg-white rounded-2xl p-4 cursor-pointer active:bg-gray-50 transition-colors"
                >
                  <!--   -->
                  <view class="flex items-center justify-between mb-3">
                    <view class="flex items-center gap-3">
                      <view class="w-10 h-10 rounded-full bg-gradient-to-br from-[#C41E3A] to-[#E85A6B] flex items-center justify-center text-white font-medium">
                        {{ question.asker.name[0] }}
                      </view>
                      <view>
                        <text class="text-sm font-medium text-[#2C2C2C]">{{ question.asker.name }}</text>
                        <text class="text-xs text-[#999999]">{{ formatTime(question.createdAt) }}</text>
                      </view>
                    </view>
                    <view class={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[question.status].bg} ${{ statusConfig[question.status].color }}`}>
                      {{ statusConfig[question.status].label }}
                    </view>
                  </view>
    
                  <!--   -->
                  <text class="text-base font-medium text-[#2C2C2C] mb-2 line-clamp-2">
                    {{ question.title }}
                  </text>
    
                  <!--   -->
                  <view class="flex items-center gap-2 mb-3">
                    <text class="px-2 py-0.5 bg-[#FFF4E5] text-[#C9A96E] text-xs font-medium rounded">
                      ¥{{ question.price }}
                    </text>
                    {question.circleName && (
                      <text class="px-2 py-0.5 bg-[#F5F5F5] text-[#666666] text-xs rounded">
                        {{ question.circleName }}
                      </text>
                    )}
                    {!question.isPublic && (
                      <text class="px-2 py-0.5 bg-gray-100 text-[#999999] text-xs rounded">
                        私密
                      </text>
                    )}
                  </view>
    
                  <!--   -->
                  {question.answerer && (
                    <view class="flex items-center gap-2 p-3 bg-[#FAF8F5] rounded-xl mb-3">
                      <view class="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A96E] to-[#DFC296] flex items-center justify-center text-white text-sm font-medium">
                        {{ question.answerer.name[0] }}
                      </view>
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2">
                          <text class="text-sm font-medium text-[#2C2C2C]">{{ question.answerer.name }}</text>
                          {question.answerer.title && (
                            <text class="text-xs text-[#C9A96E]">{{ question.answerer.title }}</text>
                          )}
                        </view>
                        {question.answerPreview && (
                          <text class="text-xs text-[#666666] line-clamp-1 mt-0.5">{{ question.answerPreview }}</text>
                        )}
                      </view>
                      <ChevronRight class="w-4 h-4 text-[#999999] flex-shrink-0" />
                    </view>
                  )}
    
                  <!--   -->
                  <view class="flex items-center justify-between text-xs text-[#999999]">
                    <view class="flex items-center gap-4">
                      <text class="flex items-center gap-1">
                        <Eye class="w-3.5 h-3.5" />
                        {{ question.viewCount }}
                      </text>
                      <text class="flex items-center gap-1">
                        <Heart class="w-3.5 h-3.5" />
                        {{ question.likeCount }}
                      </text>
                    </view>
                    {question.status === 'pending' && (
                      <text class="flex items-center gap-1 text-orange-500">
                        <Clock class="w-3.5 h-3.5" />
                        {{ getTimeRemaining(question.expireAt) }}
                      </text>
                    )}
                  </view>
                </view>
              ))
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
const statusConfig: Record<QuestionStatus, { label: string; color: string; bg: string }> = {

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