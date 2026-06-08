<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">错误页面</text>
      <text class="v0-route">V0: error/maintenance</text>
    </view>
    ) => clearInterval(timer)
      }, [info?.estimatedEndTime])
    
      // 检查维护状态
      const checkStatus = useCallback(async () => {
        setChecking(true)
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // 模拟：随机决定是否维护结束
        const isStillMaintaining = Math.random() > 0.3
        
        if (!isStillMaintaining) {
          router.replace('/')
        } else {{ setChecking(false) }}
      }, [router])
    
      // 定期自动检查
      useEffect(() => {
        const timer = setInterval(() => {
          if (!checking) {
            checkStatus()
          }
        }, 60000) // 每分钟检查一次
        return () => clearInterval(timer)
      }, [checking, checkStatus])
    
      if (loading) {
        return (
          <view class="min-h-screen bg-background flex items-center justify-center">
            <view class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const mockMaintenanceInfo: MaintenanceInfo = {

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