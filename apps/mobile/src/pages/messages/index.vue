<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">messages</text>
      <text class="v0-route">V0: messages</text>
    </view>
    <MessageCircle class="w-4 h-4 text-primary" />
        case "点赞":
          return <Heart class="w-4 h-4 text-pink-500" />
        case "关注":
          return <UserPlus class="w-4 h-4 text-accent" />
        case "加入圈子":
          return <UserPlus class="w-4 h-4 text-green-500" />
        case "课程上新":
          return <BookOpen class="w-4 h-4 text-primary" />
        case "直播预告":
          return <Radio class="w-4 h-4 text-red-500" />
        case "会员到期":
          return <Bell class="w-4 h-4 text-amber-500" />
        case "活动通知":
          return <Gift class="w-4 h-4 text-primary" />
        case "课程收益":
          return <Coins class="w-4 h-4 text-accent" />
        case "打赏收入":
          return <Gift class="w-4 h-4 text-pink-500" />
        case "分销收益":
          return <ShoppingBag class="w-4 h-4 text-green-500" />
        case "提现通知":
          return <Check class="w-4 h-4 text-green-500" />
        default:
          return <Bell class="w-4 h-4 text-muted-foreground" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const tabs = [

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