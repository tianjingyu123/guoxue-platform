<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商城</text>
      <text class="v0-route">V0: mall/product/[id]/reviews</text>
    </view>
        <view class="min-h-screen bg-background pb-4">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
      <view class="flex items-center justify-between px-4 h-12">
      <BackButton />
      <text class="font-semibold text-base text-foreground">商品评价</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-5 bg-gradient-to-br from-accent/10 via-background to-primary/5">
            <view class="flex items-center gap-6">
              <view class="text-center">
                <view class="text-4xl font-bold text-primary">{{ goodRatePercent }}%</view>
                <view class="text-xs text-muted-foreground mt-1">好评率</view>
              </view>
              <view class="flex-1">
                <view class="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} class="w-4 h-4 fill-accent text-accent" />
                  ))}
                  <text class="text-sm text-foreground ml-1">4.9</text>
                </view>
                <view class="text-sm text-muted-foreground">共 {{ totalReviews }} 条评价</view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 border-b border-border overflow-x-auto scrollbar-hide">
            <view class="flex gap-2">
              
    <view v-for="(tag, index) in reviewTags" :key="index"> (
                <view class="v0-btn"
                  key={{ tag.id }}
                  @click={() => setSelectedTag(tag.id)}
                  class={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    selectedTag === tag.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  )}
                >
                  {{ tag.label }}({{ tag.count }})
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-2 flex items-center justify-between border-b border-border">
            <text class="text-sm text-muted-foreground">
              共 {{ sortedReviews.length }} 条评价
            </text>
            <view class="relative">
              <view class="v0-btn"
                @click={() => setShowSortMenu(!showSortMenu)}
                class="flex items-center gap-1 text-sm text-foreground"
              >
                {sortOptions.find(o => o.id === sortBy)?.label}
                <ChevronDown class={cn(
                  "w-4 h-4 transition-transform",
                  showSortMenu && "rotate-180"
                )} />
              </view>
              {showSortMenu && (
                
                  <view class="fixed inset-0 z-10" @click={() => setShowSortMenu(false)} />
                  <view class="absolute right-0 top-8 z-20 w-28 bg-card rounded-lg shadow-lg border border-border overflow-hidden">
                    
    <view v-for="(option, index) in sortOptions" :key="index"> (
                      <view class="v0-btn"
                        key={{ option.id }}
                        @click={() => { setSortBy(option.id); setShowSortMenu(false) }}
                        class={cn(
                          "w-full px-3 py-2 text-sm text-left hover:bg-secondary transition-colors",
                          sortBy === option.id ? "text-primary bg-primary/5" : "text-foreground"
                        )}
                      >
                        {{ option.label }}
                      </view>
                    ))}
                  </view>
                
              )}
            </view>
          </view>
    
          <!--   -->
          <view class="divide-y divide-border">
            
    <view v-for="(review, index) in sortedReviews" :key="index"> (
              <view key={review.id} class="px-4 py-4">
                <!--   -->
                <view class="flex items-center gap-3 mb-3">
                  <Avatar class="w-9 h-9">
                    <AvatarImage src={{ review.user.avatar }} alt={{ review.user.name }} />
                    <AvatarFallback class="bg-secondary text-foreground text-xs">
                      {{ review.user.name[0] }}
                    </AvatarFallback>
                  </Avatar>
                  <view class="flex-1">
                    <view class="flex items-center gap-2">
                      <text class="font-medium text-sm text-foreground">{{ review.user.name }}</text>
                      {review.user.level && (
                        <Badge variant="secondary" class="text-[10px] px-1.5 py-0 bg-accent/20 text-accent border-0">
                          {{ review.user.level }}
                        </Badge>
                      )}
                    </view>
                    <view class="flex items-center gap-2 mt-0.5">
                      <view class="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            class={cn(
                              "w-3 h-3",
                              star <= review.rating 
                                ? "fill-accent text-accent" 
                                : "fill-muted text-muted"
                            )} 
                          />
                        ))}
                      </view>
                      <text class="text-xs text-muted-foreground">{{ review.time }}</text>
                    </view>
                  </view>
                </view>
    
                <!--   -->
                <text class="text-sm text-foreground leading-relaxed mb-3">{{ review.content }}</text>
    
                <!--   -->
                {review.images.length > 0 && (
                  <view class="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                    {review.images.map((img, index) => (
                      <view
                        key={index}
                        class="flex-shrink-0 w-20 h-20 rounded-lg bg-secondary flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        @click={() => setPreviewImage({ reviewId: review.id, index })}
                      >
                        <ImageIcon class="w-6 h-6 text-muted-foreground/40" />
                      </view>
                    ))}
                  </view>
                )}
    
                <!--   -->
                <view class="text-xs text-muted-foreground mb-3">
                  购买规格：{{ review.spec }}
                </view>
    
                <!--   -->
                {review.reply && (
                  <view class="bg-secondary/50 rounded-lg p-3 mb-3">
                    <view class="flex items-center gap-2 mb-1">
                      <Badge variant="outline" class="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                        商家回复
                      </Badge>
                      <text class="text-[10px] text-muted-foreground">{{ review.reply.time }}</text>
                    </view>
                    <text class="text-xs text-muted-foreground">{{ review.reply.content }}</text>
                  </view>
                )}
    
                <!--   -->
                <view class="flex items-center justify-end">
                  <view class="v0-btn"
                    @click={() => handleLike(review.id)}
                    class={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors",
                      likedReviews.includes(review.id)
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ThumbsUp class={cn(
                      "w-3.5 h-3.5",
                      likedReviews.includes(review.id) && "fill-primary"
                    )} />
                    {review.likes + (likedReviews.includes(review.id) ? 1 : 0)}
                  </view>
                </view>
              </view>
            ))}
          </view>
    
          <!--   -->
          {sortedReviews.length === 0 && (
            <view class="flex flex-col items-center justify-center py-16">
              <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Star class="w-8 h-8 text-muted-foreground" />
              </view>
              <text class="text-muted-foreground text-sm">暂无相关评价</text>
            </view>
          )}
    
          <!--   -->
          {previewImage && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
              <view class="v0-btn"
                @click={() => setPreviewImage(null)}
                class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors safe-area-pt z-10"
              >
                <X class="w-6 h-6 text-white" />
              </view>
              <view class="w-full h-full flex items-center justify-center p-4">
                <view class="max-w-lg w-full aspect-square bg-secondary/20 rounded-xl flex items-center justify-center">
                  <ImageIcon class="w-16 h-16 text-white/40" />
                </view>
              </view>
              <!--   -->
              {(() => {
                const currentReview = reviews.find(r => r.id === previewImage.reviewId)
                if (!currentReview || currentReview.images.length <= 1) return null
                return (
                  <view class="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
                    {currentReview.images.map((_, index) => (
                      <view class="v0-btn"
                        key={{ index }}
                        @click={() => setPreviewImage({ ...previewImage, index })}
                        class={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          previewImage.index === index ? "bg-white" : "bg-white/30"
                        )}
                      />
                    ))}
                  </view>
                )
              })()}
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
const reviewTags = [
const reviews = [
const sortOptions = [

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