<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/received-comments</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-50 bg-[#C41E3A] text-white">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="v0-btn" @click={() => router.back()} class="p-1">
                <ChevronLeft class="w-6 h-6" />
              </view>
              <text class="text-lg font-semibold">收到的评论</text>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <view class="v0-btn" class="p-1 relative">
                    <Filter class="w-5 h-5" />
                    {filter === 'unreplied' && (
                      <text class="absolute -top-1 -right-1 w-2 h-2 bg-[#C9A96E] rounded-full" />
                    )}
                  </view>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    @click={() => setFilter('all')}
                    class={filter === 'all' ? 'text-[#C41E3A]' : ''}
                  >
                    全部评论
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    @click={() => setFilter('unreplied')}
                    class={filter === 'unreplied' ? 'text-[#C41E3A]' : ''}
                  >
                    未回复 {unrepliedCount > 0 && `(${unrepliedCount})`}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </view>
            
            <!--   -->
            <view class="flex gap-2 px-4 pb-3">
              <Badge 
                variant={filter === 'all' ? 'default' : 'outline'}
                class={`cursor-pointer ${
                  filter === 'all' 
                    ? 'bg-white text-[#C41E3A]' 
                    : 'bg-transparent border-white/50 text-white/80'
                }`}
                @click={() => setFilter('all')}
              >
                全部
              </Badge>
              <Badge 
                variant={filter === 'unreplied' ? 'default' : 'outline'}
                class={`cursor-pointer ${
                  filter === 'unreplied' 
                    ? 'bg-white text-[#C41E3A]' 
                    : 'bg-transparent border-white/50 text-white/80'
                }`}
                @click={() => setFilter('unreplied')}
              >
                待回复 {unrepliedCount > 0 && `(${unrepliedCount})`}
              </Badge>
            </view>
          </view>
    
          <!--   -->
          <DataState
            loading={{ loading }}
            error={{ error }}
            empty={{ comments.length === 0 }}
            loadingSkeleton={{ renderSkeleton() }}
            emptyIcon={<MessageCircle class="w-12 h-12 text-gray-300" />}
            emptyText={filter === 'unreplied' ? '暂无待回复的评论' : '暂无新评论'}
            onRetry={() => fetchComments(1)}
          >
            <view class="p-4 space-y-3 pb-20">
              
    <view v-for="(comment, index) in comments" :key="index"> (
                <view 
                  key={comment.id} 
                  class={`bg-white rounded-lg p-4 ${!comment.isReplied ? 'border-l-4 border-[#C41E3A]' : ''}`}
                >
                  <!--   -->
                  <view class="flex gap-3">
                    <Avatar class="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={{ comment.commenter.avatar }} />
                      <AvatarFallback class="bg-[#C41E3A]/10 text-[#C41E3A]">
                        {{ comment.commenter.nickname.slice(0, 1) }}
                      </AvatarFallback>
                    </Avatar>
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2 flex-wrap">
                        <text class="font-medium text-gray-900">
                          {{ comment.commenter.nickname }}
                        </text>
                        {comment.commenter.level && (
                          <Badge variant="outline" class="text-xs text-[#C9A96E] border-[#C9A96E]/30">
                            Lv.{{ comment.commenter.level }}
                          </Badge>
                        )}
                        {!comment.isReplied && (
                          <Badge class="bg-[#C41E3A] text-white text-xs">
                            待回复
                          </Badge>
                        )}
                      </view>
                      
                      <!--   -->
                      <text class="text-gray-700 mt-2 text-sm leading-relaxed">
                        {{ comment.content }}
                      </text>
                      
                      <!--   -->
                      <text class="text-xs text-gray-400 mt-2">
                        {{ comment.createdAt }}
                      </text>
                      
                      <!--   -->
                      <view 
                        class="mt-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        @click={() => handleGoToContent(comment)}
                      >
                        <text class="text-xs text-gray-500 mb-1">
                          评论了我的{{ getTargetTypeName(comment.myContent.type) }}
                        </text>
                        <text class="text-sm text-gray-700 line-clamp-1">
                          {{ comment.myContent.title }}
                        </text>
                      </view>
                      
                      <!--   -->
                      {comment.myReply && (
                        <view class="mt-3 p-3 bg-[#C41E3A]/5 rounded-lg border-l-2 border-[#C41E3A]">
                          <text class="text-xs text-[#C41E3A] mb-1">我的回复</text>
                          <text class="text-sm text-gray-700">
                            {{ comment.myReply.content }}
                          </text>
                          <text class="text-xs text-gray-400 mt-1">
                            {{ comment.myReply.createdAt }}
                          </text>
                        </view>
                      )}
                      
                      <!--   -->
                      <view class="flex gap-2 mt-3">
                        {!comment.isReplied && (
                          <Button 
                            size="sm" 
                            class="bg-[#C41E3A] hover:bg-[#A01830] text-white"
                            @click={() => handleOpenReply(comment)}
                          >
                            <MessageCircle class="w-4 h-4 mr-1" />
                            回复
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          class="border-[#C9A96E] text-[#C9A96E] hover:bg-[#C9A96E]/10"
                          @click={() => handleGoToContent(comment)}
                        >
                          查看原文
                        </Button>
                      </view>
                    </view>
                  </view>
                </view>
              ))}
              
              <!--   -->
              {hasMore && (
                <view class="flex justify-center pt-4">
                  <Button 
                    variant="outline" 
                    @click={{ handleLoadMore }}
                    :disabled={{ loadingMore }}
                    class="border-[#C41E3A] text-[#C41E3A]"
                  >
                    {loadingMore ? '加载中...' : '加载更多'}
                  </Button>
                </view>
              )}
              
              {!hasMore && comments.length > 0 && (
                <text class="text-center text-gray-400 text-sm py-4">
                  已显示全部评论
                </text>
              )}
            </view>
          </DataState>
    
          <!--   -->
          <Dialog open={{ replyDialogOpen }} onOpenChange={{ setReplyDialogOpen }}>
            <DialogContent class="sm:max-w-md">
              <DialogHeader>
                <DialogTitle class="flex items-center justify-between">
                  <text>回复评论</text>
                  <view class="v0-btn" 
                    @click={() => setReplyDialogOpen(false)}
                    class="text-gray-400 hover:text-gray-600"
                  >
                    <X class="w-5 h-5" />
                  </view>
                </DialogTitle>
              </DialogHeader>
              
              {replyingComment && (
                <view class="space-y-4">
                  <!--   -->
                  <view class="p-3 bg-gray-50 rounded-lg">
                    <view class="flex items-center gap-2 mb-2">
                      <Avatar class="w-6 h-6">
                        <AvatarImage src={{ replyingComment.commenter.avatar }} />
                        <AvatarFallback class="text-xs">
                          {{ replyingComment.commenter.nickname.slice(0, 1) }}
                        </AvatarFallback>
                      </Avatar>
                      <text class="text-sm font-medium">
                        {{ replyingComment.commenter.nickname }}
                      </text>
                    </view>
                    <text class="text-sm text-gray-600 line-clamp-3">
                      {{ replyingComment.content }}
                    </text>
                  </view>
                  
                  <!--   -->
                  <Textarea
                    placeholder="写下你的回复..."
                    value={{ replyContent }}
                    @change={e => setReplyContent(e.target.value)}
                    rows={{ 4 }}
                    class="resize-none focus:border-[#C41E3A] focus:ring-[#C41E3A]/20"
                  />
                  
                  <text class="text-xs text-gray-400 text-right">
                    {{ replyContent.length }}/500
                  </text>
                </view>
              )}
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  @click={() => setReplyDialogOpen(false)}
                >
                  取消
                </Button>
                <Button 
                  class="bg-[#C41E3A] hover:bg-[#A01830] text-white"
                  @click={{ handleSubmitReply }}
                  :disabled={{ !replyContent.trim() || replying }}
                >
                  {replying ? (
                    '发送中...'
                  ) : (
                    
                      <Send class="w-4 h-4 mr-1" />
                      发送
                    
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据


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