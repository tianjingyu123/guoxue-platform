<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circles/[id]/publish</text>
    </view>
        <view class="min-h-screen bg-foreground">
          <!--   -->
          <view class="sticky top-0 z-50 bg-foreground/95 backdrop-blur-lg border-b border-white/10">
            <view class="flex items-center h-14 px-4">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <ChevronLeft class="w-5 h-5 text-white" />
              </view>
              <text class="flex-1 text-center font-semibold text-white">发布内容</text>
              <view class="w-9" />
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            <view class="bg-foreground rounded-2xl p-4">
              <view class="flex items-center gap-3">
                <image alt="图片" 
                  src={circle.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${circleId}`} 
                  alt={{ circle.name }}
                  class="w-12 h-12 rounded-xl"
                />
                <view class="flex-1">
                  <text class="font-medium text-white">{{ circle.name }}</text>
                  <text class="text-xs text-white/50">{{ circle.members.toLocaleString() }} 成员</text>
                </view>
                <text class={`text-xs px-2 py-1 rounded ${
                  circle.role === 'owner' ? 'bg-gold/20 text-gold' : 'bg-info/20 text-info'
                }`}>
                  {circle.role === 'owner' ? '圈主' : '管理员'}
                </text>
              </view>
            </view>
    
            <!--   -->
            {!selectedType ? (
              <view class="bg-foreground rounded-2xl p-4">
                <text class="text-sm font-medium text-white mb-4">选择内容类型</text>
                <view class="space-y-3">
                  
    <view v-for="(type, index) in contentTypes" :key="index"> (
                    <view class="v0-btn"
                      key={{ type.id }}
                      @click={() => handleTypeSelect(type)}
                      class="w-full p-4 rounded-xl border border-white/10 bg-white/5 flex items-center gap-4 hover:bg-white/10 transition-all active:scale-[0.98]"
                    >
                      <view class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <type.icon class="w-6 h-6 text-primary" />
                      </view>
                      <view class="flex-1 text-left">
                        <text class="font-medium text-white">{{ type.name }}</text>
                        <text class="text-xs text-white/50 mt-0.5">{{ type.description }}</text>
                      </view>
                      <ChevronRight class="w-5 h-5 text-white/30" />
                    </view>
                  ))}
                </view>
              </view>
            ) : (
              // 根据选择的类型显示对应表单
              selectedType === 'article' ? (
                <ArticleForm circleId={{ circleId }} circleName={{ circle.name }} onBack={() => setSelectedType(null)} />
              ) : selectedType === 'course' ? (
                <CourseForm circleId={{ circleId }} circleName={{ circle.name }} onBack={() => setSelectedType(null)} />
              ) : null
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
const contentTypes = [
    const newErrors: Record<string, string> = {}
    const newErrors: Record<string, string> = {}

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