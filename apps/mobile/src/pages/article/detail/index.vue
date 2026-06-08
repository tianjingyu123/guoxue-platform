<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">文章详情</text>
      <text class="v0-route">V0: article/[id]</text>
    </view>
        <Card class="p-4 my-4 bg-secondary/30 border-border/50">
          <view class="flex items-start gap-3">
            <view class="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Users class="w-6 h-6 text-primary" />
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="font-semibold text-foreground">{{ data.name }}</text>
                <Badge variant="secondary" class="text-[10px] bg-primary/10 text-primary border-0">圈子</Badge>
              </view>
              <text class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ data.description }}</text>
              <view class="flex items-center justify-between mt-3">
                <text class="text-xs text-muted-foreground">{{ data.memberCount }} 成员</text>
                <view class="v0-btn"
                  @click={() => setJoined(!joined)}
                  class={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-full transition-all",
                    joined
                      ? "bg-secondary text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {joined ? "已加入" : "加入圈子"}
                </view>
              </view>
            </view>
          </view>
        </Card>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const articleData = {

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