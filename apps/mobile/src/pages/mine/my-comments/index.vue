<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/my-comments</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">我的评论</text>
              <view class="flex items-center gap-2">
                {comments.length > 0 && (
                  <view class="v0-btn" 
                    @click={() => {
                      setIsEditMode(!isEditMode)
                      setSelectedIds([])
                      setSwipedId(null)
                    }}
                    class="text-sm text-primary"
                  >
                    {isEditMode ? "完成" : "管理"}
                  </view>
                )}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="p-4">
            <DataState
              isLoading={{ loading }}
              isError={{ !!error }}
              isEmpty={{ comments.length === 0 }}
              errorMessage={{ error || undefined }}
              emptyMessage="暂无评论记录"
              onRetry={{ fetchData }}
            >
              <view class="space-y-3">
                
    <view v-for="(comment, index) in comments" :key="index"> {
                  const Icon = typeIcons[comment.target.type]
                  const isSwiped = swipedId === comment.id
                  
                  return (
                    <view key={comment.id} class="flex items-stretch gap-3">
                      <!--   -->
                      {isEditMode && (
                        <view class="v0-btn"
                          @click={() => toggleSelect(comment.id)}
                          class={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 self-center transition-colors",
                            selectedIds.includes(comment.id)
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {selectedIds.includes(comment.id) && <Check class="w-4 h-4 text-primary-foreground" />}
                        </view>
                      )}
    
                      <!--   -->
                      <view class="flex-1 relative overflow-hidden rounded-xl">
                        <view 
                          class={cn(
                            "transition-transform duration-200",
                            isSwiped && !isEditMode && "-translate-x-20"
                          )}
                          @click={() => !isEditMode && handleSwipe(comment.id)}
                        >
                          <Card class="p-4">
                            <!--   -->
                            <text class="text-sm text-foreground line-clamp-2 mb-3">
                              {{ comment.content }}
                            </text>
    
                            <!--   -->
                            <Link 
                              href={{ getTargetUrl(comment.target.type, comment.target.id) }}
                              @click={(e) => e.stopPropagation()}
                              class="block"
                            >
                              <view class="flex gap-3 p-3 bg-secondary/50 rounded-lg hover:bg-secondary/80 transition-colors">
                                <!--   -->
                                {comment.target.cover ? (
                                  <view class="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                                    <Image
                                      src={{ comment.target.cover }}
                                      alt={{ comment.target.title }}
                                      width={{ 56 }}
                                      height={{ 56 }}
                                      class="w-full h-full object-cover"
                                    />
                                  </view>
                                ) : (
                                  <view class="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                    <Icon class="w-6 h-6 text-muted-foreground/60" />
                                  </view>
                                )}
    
                                <!--   -->
                                <view class="flex-1 min-w-0">
                                  <view class="flex items-center gap-2 mb-1">
                                    <Badge class={cn("text-[10px] px-1.5 py-0", typeColors[comment.target.type])}>
                                      {{ getTargetTypeName(comment.target.type) }}
                                    </Badge>
                                  </view>
                                  <text class="text-sm font-medium text-foreground line-clamp-1">
                                    {{ comment.target.title }}
                                  </text>
                                </view>
    
                                <ChevronRight class="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
                              </view>
                            </Link>
    
                            <!--   -->
                            <view class="flex items-center justify-between mt-3 pt-3 border-t border-border">
                              <text class="text-xs text-muted-foreground">{{ comment.createdAt }}</text>
                              <view class="flex items-center gap-4">
                                <text class="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Heart class="w-3.5 h-3.5" />
                                  {{ comment.likeCount }}
                                </text>
                                <text class="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MessageCircle class="w-3.5 h-3.5" />
                                  {{ comment.replyCount }}
                                </text>
                                {comment.hasReply && (
                                  <Badge variant="secondary" class="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                                    有回复
                                  </Badge>
                                )}
                              </view>
                            </view>
                          </Card>
                        </view>
    
                        <!--   -->
                        {!isEditMode && (
                          <view class="v0-btn"
                            @click={() => handleDeleteOne(comment.id)}
                            class={cn(
                              "absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center transition-opacity",
                              isSwiped ? "opacity-100" : "opacity-0 pointer-events-none"
                            )}
                          >
                            <view class="flex flex-col items-center gap-1 text-destructive-foreground">
                              <Trash2 class="w-5 h-5" />
                              <text class="text-xs">删除</text>
                            </view>
                          </view>
                        )}
                      </view>
                    </view>
                  )
                })}
              </view>
            </DataState>
          </view>
    
          <!--   -->
          {isEditMode && selectedIds.length > 0 && (
            <view class="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
              <view class="flex items-center justify-between">
                <view class="v0-btn" 
                  @click={() => setSelectedIds(comments.map(c => c.id))}
                  class="text-sm text-primary"
                >
                  全选
                </view>
                <view class="v0-btn"
                  @click={{ handleBatchDelete }}
                  class="flex items-center gap-2 px-6 py-2 bg-destructive text-destructive-foreground rounded-full text-sm"
                >
                  <Trash2 class="w-4 h-4" />
                  删除 ({{ selectedIds.length }})
                </view>
              </view>
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
const typeIcons: Record<CommentTargetType, React.ComponentType<{ className?: string }>> = {
const typeColors: Record<CommentTargetType, string> = {

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