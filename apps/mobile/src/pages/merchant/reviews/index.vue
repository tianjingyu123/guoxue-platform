<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/reviews</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center h-14 px-4">
              <Link href="/merchant/dashboard" class="mr-3">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="text-lg font-semibold">评价管理</text>
            </view>
          </view>
          
          <!--   -->
          <view class="p-4">
            <Card class="p-4">
              <view class="grid grid-cols-3 gap-4 text-center">
                <view>
                  <text class="text-2xl font-bold text-foreground">4.8</text>
                  <view class="flex items-center justify-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} class={cn("w-3 h-3", i <= 4 ? "fill-amber-400 text-amber-400" : "fill-amber-400/50 text-amber-400/50")} />
                    ))}
                  </view>
                  <text class="text-xs text-muted-foreground mt-1">店铺评分</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-foreground">{{ stats.all }}</text>
                  <text class="text-xs text-muted-foreground mt-1">总评价数</text>
                </view>
                <view>
                  <text class="text-2xl font-bold text-orange-600">{{ stats.pending }}</text>
                  <text class="text-xs text-muted-foreground mt-1">待回复</text>
                </view>
              </view>
            </Card>
          </view>
          
          <!--   -->
          <view class="px-4 pb-3">
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
              <TabsList class="w-full grid grid-cols-4 h-9">
                <TabsTrigger value="all" class="text-xs">全部</TabsTrigger>
                <TabsTrigger value="pending" class="text-xs">待回复({{ stats.pending }})</TabsTrigger>
                <TabsTrigger value="negative" class="text-xs">差评({{ stats.negative }})</TabsTrigger>
                <TabsTrigger value="hasImage" class="text-xs">有图</TabsTrigger>
              </TabsList>
            </Tabs>
          </view>
          
          <!--   -->
          <view class="px-4 space-y-3">
            
    <view v-for="(review, index) in filteredReviews" :key="index"> (
              <Card key={review.id} class="p-4">
                <!--   -->
                <view class="flex items-center gap-2 mb-3">
                  <view class="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <text>📦</text>
                  </view>
                  <view class="flex-1 min-w-0">
                    <text class="text-sm font-medium truncate">{{ review.productTitle }}</text>
                  </view>
                </view>
                
                <!--   -->
                <view class="space-y-2">
                  <view class="flex items-center gap-2">
                    <view class="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} class={cn(
                          "w-3.5 h-3.5",
                          i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted"
                        )} />
                      ))}
                    </view>
                    <text class="text-xs text-muted-foreground">{{ review.buyer }}</text>
                    <text class="text-xs text-muted-foreground">{{ review.createdAt }}</text>
                  </view>
                  
                  <text class="text-sm text-foreground">{{ review.content }}</text>
                  
                  {review.images.length > 0 && (
                    <view class="flex gap-2 mt-2">
                      {review.images.map((_, i) => (
                        <view key={i} class="w-16 h-16 rounded bg-muted flex items-center justify-center">
                          <text>🖼️</text>
                        </view>
                      ))}
                    </view>
                  )}
                </view>
                
                <!--   -->
                {review.replied && review.replyContent && (
                  <view class="mt-3 p-3 bg-muted/50 rounded-lg">
                    <view class="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Badge variant="secondary" class="text-[10px]">商家回复</Badge>
                      <text>{{ review.replyTime }}</text>
                    </view>
                    <text class="text-sm text-foreground">{{ review.replyContent }}</text>
                  </view>
                )}
                
                <!--   -->
                {replyingId === review.id && (
                  <view class="mt-3 space-y-2">
                    <Textarea 
                      placeholder="输入回复内容..." 
                      value={{ replyContent }}
                      @change={e => setReplyContent(e.target.value)}
                      rows={{ 3 }}
                    />
                    <view class="flex justify-end gap-2">
                      <Button variant="outline" size="sm" @click={() => setReplyingId(null)}>取消</Button>
                      <Button size="sm" @click={() => handleReply(review.id)}>发送回复</Button>
                    </view>
                  </view>
                )}
                
                <!--   -->
                {!review.replied && replyingId !== review.id && (
                  <view class="mt-3 pt-3 border-t border-border flex justify-end">
                    <Button size="sm" @click={() => setReplyingId(review.id)}>
                      <MessageSquare class="w-4 h-4 mr-1" />
                      回复
                    </Button>
                  </view>
                )}
              </Card>
            ))}
            
            {filteredReviews.length === 0 && (
              <view class="py-20 text-center">
                <text class="text-muted-foreground">暂无评价</text>
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
const reviews = [
  const stats = {

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