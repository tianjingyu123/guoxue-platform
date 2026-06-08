<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: live/[id]</text>
    </view>
    ) => clearInterval(interval)
      }, [])
    
      // 模拟系统消息
      useEffect(() => {
        let index = 0
        const interval = setInterval(() => {
          if (index < mockSystemMessages.length) {
            setSystemMessages((prev) => [...prev.slice(-1), mockSystemMessages[index]])
            index++
          } else {{ index = 0 }}
        }, 4000)
        return () => clearInterval(interval)
      }, [])
    
      // 自动收起顶部栏
      useEffect(() => {
        const timer = setTimeout(() => setHeaderCollapsed(true), 5000)
        return () => clearTimeout(timer)
      }, [])
    
      // 模拟实时已售通知（电商直播）
      useEffect(() => {
        if (!isCommerce) return
        const names = ["福气满满", "招财进宝", "玄学新人", "易道弟子", "国学传承", "命理初学", "紫微门人"]
        const interval = setInterval(() => {
          const randomUser = names[Math.floor(Math.random() * names.length)]
          const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)]
          const notification = {
            id: Date.now(),
            user: randomUser,
            product: randomProduct.name.slice(0, 8)
          }
          setSalesNotifications(prev => [...prev.slice(-2), notification])
          
          // 更新销量数字并触发动画
          const increment = Math.floor(Math.random() * 3) + 1
          setLiveSalesCount(prev => prev + increment)
          setSalesAnimating(true)
          setTimeout(() => setSalesAnimating(false), 600)
          
          // 3秒后移除通知
          setTimeout(() => {
            setSalesNotifications(prev => prev.filter(n => n.id !== notification.id))
          }, 3000)
        }, 4000)
        return () => clearInterval(interval)
      }, [isCommerce])
    
      const handleLike = () => {
        setLikeCount((prev) => prev + 1)
        // 添加浮动爱心动画
        const newHeart = { id: Date.now(), x: Math.random() * 40 - 20 }
        setFloatingHearts((prev) => [...prev, newHeart])
        setTimeout(() => {
          setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id))
        }, 1500)
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const mockLiveData = {
const mockSlides = [
const mockConnectedUsers = [
const mockProducts = [
const mockDanmaku = [
const mockSystemMessages = [
const mockRankList = [
const giftList = [
  const isKnowledge = live.type === "knowledge"
  const isCommerce = live.type === "commerce"

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