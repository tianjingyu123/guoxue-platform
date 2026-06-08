<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">八字排盘</text>
      <text class="v0-route">V0: paipan/bazi</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/10">
            <view class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
              <Link href="/paipan" class="flex items-center gap-0.5 text-white/80 hover:text-white transition-colors">
                <ChevronLeft class="w-5 h-5" />
                <text class="text-sm">返回</text>
              </Link>
              <text class="text-base font-bold tracking-wider">热卜八字</text>
              <Link 
                href="/paipan/bazi/history" 
                class="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white hover:text-white transition-all text-sm font-medium cursor-pointer z-10"
              >
                <History class="w-4 h-4" />
                <text>记录</text>
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="max-w-lg mx-auto px-4 py-5 space-y-4">
            
            <!--   -->
            <view>
              <BaziInputForm />
            </view>
    
            <!--   -->
            <view>
              <InstantBazi />
            </view>
    
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