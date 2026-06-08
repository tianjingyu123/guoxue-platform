<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">通知</text>
      <text class="v0-route">V0: notifications</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b">
            <view class="flex items-center justify-between h-14 px-4">
              <view class="flex items-center gap-3">
                <Button variant="ghost" size="icon" @click={() => router.back()}>
                  <ArrowLeft class="w-5 h-5" />
                </Button>
                <text class="text-lg font-semibold">通知</text>
                {unreadCounts && unreadCounts.total > 0 && (
                  <text class="px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                    {unreadCounts.total > 99 ? '99+' : unreadCounts.total}
                  </text>
                )}
              </view>
              <view class="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  @click={{ handleRefresh }}
                  :disabled={{ refreshing }}
                >
                  <RefreshCw class={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  @click={{ handleMarkAllRead }}
                  :disabled={{ markingAllRead || !unreadCounts || unreadCounts.total === 0 }}
                >
                  <CheckCheck class="w-4 h-4 mr-1" />
                  全部已读
                </Button>
              </view>
            </view>
          </view>
    
          <!--   -->
          <DataState
            isLoading={{ loading }}
            error={{ error }}
            isEmpty={{ notifications.length === 0 }}
            emptyMessage="暂无通知"
            onRetry={() => fetchNotifications()}
          >
            <view class="divide-y">
              
    <view v-for="(notification, index) in notifications" :key="index"> (
                <view
                  key={notification.id}
                  class={`flex gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.isRead ? 'bg-primary/5' : ''
                  }`}
                  @click={() => handleMarkRead(notification)}
                >
                  <!--   -->
                  <view class={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    typeColors[notification.type]
                  }`}>
                    {{ notification.avatar ? (
                      <image 
                        src={notification.avatar }} 
                        alt="" 
                        class="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      getIcon(notification.category)
                    )}
                  </view>
    
                  <!--   -->
                  <view class="flex-1 min-w-0">
                    <view class="flex items-start justify-between gap-2">
                      <view class="flex items-center gap-2">
                        <text class={`font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {{ notification.title }}
                        </text>
                        {!notification.isRead && (
                          <text class="w-2 h-2 bg-destructive rounded-full shrink-0" />
                        )}
                      </view>
                      <text class="text-xs text-muted-foreground shrink-0">
                        {{ notification.time }}
                      </text>
                    </view>
                    <text class={`text-sm mt-1 line-clamp-2 ${
                      !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {{ notification.content }}
                    </text>
                    <text class="inline-block mt-2 px-2 py-0.5 text-xs bg-muted rounded">
                      {{ notification.category }}
                    </text>
                  </view>
                </view>
              ))}
            </view>
    
            <!--   -->
            {notifications.length > 0 && (
              <view class="py-8 text-center text-sm text-muted-foreground">
                已显示全部通知
              </view>
            )}
          </DataState>
    
          <!--   -->
          {loading && (
            <view class="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <view key={i} class="flex gap-3">
                  <Skeleton class="w-10 h-10 rounded-full shrink-0" />
                  <view class="flex-1 space-y-2">
                    <Skeleton class="h-4 w-1/3" />
                    <Skeleton class="h-4 w-full" />
                    <Skeleton class="h-4 w-16" />
                  </view>
                </view>
              ))}
            </view>
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
const notificationIcons: Record<string, React.ReactNode> = {
const typeColors: Record<MessageType, string> = {

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