<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">智能体</text>
      <text class="v0-route">V0: agent/[id]</text>
    </view>
        <Link href={`/course/${course.id}`} class="block">
          <Card class="flex gap-3 p-3 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10 hover:border-primary/30 transition-colors card-press">
            <view class="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
              <Play class="w-6 h-6 text-primary" />
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-start justify-between gap-2">
                <text class="text-sm font-medium text-foreground line-clamp-1">{{ course.title }}</text>
                <Badge variant="secondary" class="text-[10px] bg-primary/10 text-primary flex-shrink-0 border-0">推荐</Badge>
              </view>
              <text class="text-xs text-muted-foreground mt-0.5">{{ course.instructor }} · {{ course.students }}人已学</text>
              <view class="flex items-center gap-2 mt-1.5">
                <text class="text-sm font-bold text-primary">¥{{ course.price }}</text>
                <text class="text-xs text-muted-foreground line-through">¥{{ course.originalPrice }}</text>
                <view class="flex items-center gap-0.5 ml-auto">
                  <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
                  <text class="text-xs text-muted-foreground">{{ course.rating }}</text>
                </view>
              </view>
            </view>
          </Card>
        </Link>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const agentData = {
const quickQuestions = [
const recommendedCourses = [
const recommendedCircles = [
const recommendedProducts = [
  const topics = ["运势分析", "事业规划"]
    const welcomeMessage: Message = {
    const userMessage: Message = {
      const assistantMessage: Message = {
      const endCallMessage: Message = {

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