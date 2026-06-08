<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">notice</text>
      <text class="v0-route">V0: notice</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/settings" />
              <text class="font-semibold text-base text-foreground">平台公告</text>
              {unreadCount > 0 ? (
                <view class="v0-btn" 
                  @click={{ handleMarkAllRead }}
                  class="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  全部已读
                </view>
              ) : (
                <view class="w-12" />
              )}
            </view>
    
            <!--   -->
            <view class="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
              
    <view v-for="(tab, index) in tabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveTab(tab.id)}
                  class={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ tab.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pt-4">
            {filteredNotices.length > 0 ? (
              <view class="space-y-3">
                
    <view v-for="(notice, index) in filteredNotices" :key="index"> {
                  const config = noticeTypeConfig[notice.type as keyof typeof noticeTypeConfig]
                  const Icon = config.icon
                  
                  return (
                    <Link
                      key={notice.id}
                      href={`/notice/${notice.id}`}
                      @click={() => handleNoticeClick(notice.id)}
                    >
                      <Card class={cn(
                        "p-4 transition-colors",
                        !notice.isRead && "bg-primary/5 border-primary/20"
                      )}>
                        <view class="flex gap-3">
                          <!--   -->
                          <Avatar class="w-10 h-10 flex-shrink-0">
                            <AvatarFallback class={{ config.color }}>
                              <Icon class="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
    
                          <!--   -->
                          <view class="flex-1 min-w-0">
                            <view class="flex items-start gap-2 mb-1">
                              {notice.isTop && (
                                <Badge variant="destructive" class="text-[10px] px-1 py-0 flex-shrink-0">
                                  置顶
                                </Badge>
                              )}
                              <text class={cn(
                                "text-sm line-clamp-1",
                                !notice.isRead ? "font-semibold text-foreground" : "font-medium text-foreground"
                              )}>
                                {{ notice.title }}
                              </text>
                            </view>
                            <text class="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {{ notice.summary }}
                            </text>
                            <view class="flex items-center justify-between">
                              <text class="text-[10px] text-muted-foreground/70">
                                {{ notice.publishTime }}
                              </text>
                              {notice.isRead ? (
                                <text class="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                                  <Check class="w-3 h-3" />
                                  已读
                                </text>
                              ) : (
                                <text class="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </view>
                          </view>
    
                          <!--   -->
                          <ChevronRight class="w-4 h-4 text-muted-foreground flex-shrink-0 mt-3" />
                        </view>
                      </Card>
                    </Link>
                  )
                })}
              </view>
            ) : (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Bell class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground text-sm">暂无公告</text>
              </view>
            )}
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const noticeTypeConfig = {
const noticeList = [
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