<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circle/[id]/home</text>
    </view>
              <view class="p-4 pb-24">
                <!--   -->
                <view class="flex items-center gap-3 mb-3">
                  <view class="v0-btn" 
                    @click={() => setSortBy("latest")}
                    class={cn(
                      "text-sm transition-colors",
                      sortBy === "latest" ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    最新发布
                  </view>
                  <text class="text-muted-foreground/30">|</text>
                  <view class="v0-btn" 
                    @click={() => setSortBy("reply")}
                    class={cn(
                      "text-sm transition-colors",
                      sortBy === "reply" ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    最新回复
                  </view>
                </view>
                {{ posts.map(renderPostCard) }}
              </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const circleData = {
const contentTabs = [
const posts = [
const courses = [
const articles = [
const videos = [
const lives = [
const products = [

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