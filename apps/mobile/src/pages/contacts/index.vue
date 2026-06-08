<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">contacts</text>
      <text class="v0-route">V0: contacts</text>
    </view>
        <view class="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors rounded-lg">
          <view class="relative">
            <Avatar class="w-11 h-11">
              <AvatarImage src={{ user.avatar }} alt={{ user.name }} />
              <AvatarFallback class="bg-secondary text-foreground text-sm">
                {{ user.name[0] }}
              </AvatarFallback>
            </Avatar>
            {user.isOnline && (
              <text class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </view>
          
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-1.5">
              <text class="font-medium text-sm text-foreground">{{ user.name }}</text>
              {user.isVerified && (
                <Badge variant="secondary" class="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">
                  V
                </Badge>
              )}
              {user.role && (
                <Badge variant="outline" class="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                  {{ user.role }}
                </Badge>
              )}
            </view>
            <text class="text-xs text-muted-foreground line-clamp-1 mt-0.5">{{ user.intro }}</text>
          </view>
          
          {showMessage && (
            <Link 
              href={`/chat/${user.id}`}
              class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <MessageCircle class="w-4 h-4" />
            </Link>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const contactGroups = [
const allUsers = [
const recommendedUsers = [

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