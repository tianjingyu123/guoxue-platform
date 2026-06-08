<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">notices</text>
      <text class="v0-route">V0: notices</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <BackButton fallbackPath="/profile" />
              <text class="text-lg font-semibold">平台公告</text>
              <view class="w-10" />
            </view>
            
            <!--   -->
            <view class="px-4 pb-3 overflow-x-auto">
              <view class="flex gap-2">
                
    <view v-for="(option, index) in filterOptions" :key="index"> (
                  <view class="v0-btn"
                    key={{ option.value }}
                    @click={() => setFilter(option.value)}
                    class={cn(
                      "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                      filter === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    {{ option.label }}
                  </view>
                ))}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            {loading ? (
              <DataStateLoading text="加载公告中..." />
            ) : error ? (
              <DataStateError message={{ error }} onRetry={() => loadData(1, filter)} />
            ) : notices.length === 0 ? (
              <DataStateEmpty title="暂无公告" description="当前没有任何公告信息" />
            ) : (
              
                
    <view v-for="(notice, index) in notices" :key="index"> (
                  <Link key={notice.id} href={`/notices/${notice.id}`}>
                    <Card class={cn(
                      "p-4 transition-all hover:shadow-md",
                      !notice.isRead && "border-l-2 border-l-primary"
                    )}>
                      <view class="flex items-start gap-3">
                        <!--   -->
                        {{ notice.cover && (
                          <image 
                            src={notice.cover }} 
                            alt=""
                            class="w-20 h-14 rounded object-cover flex-shrink-0"
                          />
                        )}
                        
                        <view class="flex-1 min-w-0">
                          <!--   -->
                          <view class="flex items-center gap-2 mb-1">
                            {notice.isPinned && (
                              <Pin class="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            )}
                            {!notice.isRead && (
                              <text class="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                            <text class={cn(
                              "font-medium text-sm line-clamp-1",
                              !notice.isRead && "text-foreground",
                              notice.isRead && "text-muted-foreground"
                            )}>
                              {{ notice.title }}
                            </text>
                          </view>
                          
                          <!--   -->
                          <text class="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {{ notice.summary }}
                          </text>
                          
                          <!--   -->
                          <view class="flex items-center justify-between">
                            <view class="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                class={cn("text-[10px] px-1.5 py-0", getNoticeTypeColor(notice.type))}
                              >
                                {{ getNoticeTypeLabel(notice.type) }}
                              </Badge>
                              <text class="text-[10px] text-muted-foreground">
                                {{ formatTime(notice.publishedAt) }}
                              </text>
                            </view>
                            <view class="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Eye class="w-3 h-3" />
                              <text>{notice.viewCount > 10000 ? `${(notice.viewCount / 10000).toFixed(1)}万` : notice.viewCount}</text>
                              <ChevronRight class="w-3 h-3 ml-1" />
                            </view>
                          </view>
                        </view>
                      </view>
                    </Card>
                  </Link>
                ))}
    
                <!--   -->
                {hasMore && (
                  <view class="v0-btn"
                    @click={{ handleLoadMore }}
                    :disabled={{ loadingMore }}
                    class="w-full py-3 text-sm text-muted-foreground flex items-center justify-center gap-2"
                  >
                    {loadingMore ? (
                      
                        <Loader2 class="w-4 h-4 animate-spin" />
                        加载中...
                      
                    ) : (
                      '点击加载更多'
                    )}
                  </view>
                )}
    
                {!hasMore && notices.length > 0 && (
                  <text class="text-center text-xs text-muted-foreground py-4">
                    已加载全部公告
                  </text>
                )}
              
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
const filterOptions: { value: NoticeType | 'all'; label: string }[] = [

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