<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: live/preview</text>
    </view>
    ) => clearInterval(timer)
      }, [room?.startTime])
    
      const handleBook = async () => {
        if (bookLoading) return
        setBookLoading(true)
        
        // 乐观更新
        const newBooked = !isBooked
        setIsBooked(newBooked)
        setBookedCount(prev => newBooked ? prev + 1 : prev - 1)
        
        try {
          if (newBooked) {
            await liveApi.book(roomId)
          } else {{ await liveApi.unbook(roomId) }}
        } catch (error) {
          // 回滚
          setIsBooked(!newBooked)
          setBookedCount(prev => newBooked ? prev - 1 : prev + 1)
        } finally {
          setBookLoading(false)
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const mockRoom: LiveRoomDetail = {

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