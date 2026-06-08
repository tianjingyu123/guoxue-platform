<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: live/horizontal</text>
    </view>
    ) => clearInterval(interval)
      }, [followSlide])
    
      // 模拟新消息
      useEffect(() => {
        const comments = ["学到了", "受益匪浅", "老师讲得好", "涨知识了", "感谢分享"]
        const users = ["玄学新人", "易道弟子", "国学迷", "命理初学", "风水爱好"]
        const interval = setInterval(() => {
          const newMsg = {
            id: Date.now().toString(),
            userName: users[Math.floor(Math.random() * users.length)],
            content: comments[Math.floor(Math.random() * comments.length)],
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          }
          setMessages(prev => [...prev.slice(-20), newMsg])
        }, 5000)
        return () => clearInterval(interval)
      }, [])
    
      const handleSendMessage = () => {
        if (!newMessage.trim()) return
        const msg = {
          id: Date.now().toString(),
          userName: "我",
          content: newMessage,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const mockRoom = {
const mockSlides = [
const initialQuestions = [
const initialMessages = [
const mockFiles = [
    const comments = ["学到了", "受益匪浅", "老师讲得好", "涨知识了", "感谢分享"]
    const users = ["玄学新人", "易道弟子", "国学迷", "命理初学", "风水爱好"]
      const newMsg = {
    const msg = {
    const q = {

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