<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">post</text>
      <text class="v0-route">V0: post/[id]</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-12">
              <BackButton fallbackPath={`/circle/${post.circleId}/home`} />
              <text class="font-medium text-base text-foreground">帖子详情</text>
              <view class="relative">
                <view class="v0-btn" 
                  @click={() => setShowMoreMenu(!showMoreMenu)}
                  class="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <MoreHorizontal class="w-5 h-5 text-foreground" />
                </view>
                
                <!--   -->
                {showMoreMenu && (
                  
                    <view class="fixed inset-0 z-40" @click={() => setShowMoreMenu(false)} />
                    <view class="absolute right-0 top-full mt-1 w-36 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50">
                      {isAdmin && (
                        
                          <view class="v0-btn" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                            <Star class="w-4 h-4 text-accent" />
                            {post.isEssence ? "取消加精" : "设为精华"}
                          </view>
                          <view class="v0-btn" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                            <Pin class="w-4 h-4 text-primary" />
                            {post.isPinned ? "取消置顶" : "置顶帖子"}
                          </view>
                          <view class="v0-btn" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-destructive hover:bg-secondary transition-colors">
                            <Trash2 class="w-4 h-4" />
                            删除帖子
                          </view>
                        
                      )}
                      {!isAdmin && (
                        <view class="v0-btn" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-destructive hover:bg-secondary transition-colors">
                          举报
                        </view>
                      )}
                    </view>
                  
                )}
              </view>
            </view>
          </view>
    
          <view class="pt-12">
            <!--   -->
            <view class="p-4 border-b border-border">
              <!--   -->
              <view class="flex items-center gap-3 mb-4">
                <Link href={`/user/${post.author.id}`}>
                  <Avatar class="w-11 h-11">
                    <AvatarImage src={{ post.author.avatar }} alt={{ post.author.name }} />
                    <AvatarFallback class="bg-secondary text-foreground">
                      {{ post.author.name[0] }}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <view class="flex-1">
                  <view class="flex items-center gap-2">
                    <text class="font-medium text-sm text-foreground">{{ post.author.name }}</text>
                    {post.author.isVerified && (
                      <Badge variant="secondary" class="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                    )}
                    <Badge variant="outline" class={cn("text-[10px] px-1.5 py-0", getRoleBadgeStyle(post.author.role))}>
                      {{ post.author.role }}
                    </Badge>
                  </view>
                  <text class="text-xs text-muted-foreground mt-0.5">{{ post.publishTime }}</text>
                </view>
                <!--   -->
                <view class="flex items-center gap-1">
                  {post.isEssence && (
                    <Badge class="text-[10px] px-1.5 py-0 bg-accent text-white border-0">精华</Badge>
                  )}
                  {post.isPinned && (
                    <Badge class="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground border-0">置顶</Badge>
                  )}
                </view>
              </view>
    
              <!--   -->
              <view class="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-4">
                {{ post.content }}
              </view>
    
              <!--   -->
              {post.images && post.images.length > 0 && (
                <view class={cn(
                  "grid gap-2 mb-4",
                  post.images.length === 1 ? "grid-cols-1" : 
                  post.images.length === 2 ? "grid-cols-2" : "grid-cols-3"
                )}>
                  {post.images.map((img, index) => (
                    <view 
                      key={img.id}
                      class={cn(
                        "relative bg-secondary rounded-lg overflow-hidden cursor-pointer",
                        post.images.length === 1 ? "aspect-video" : "aspect-square"
                      )}
                      @click={() => setSelectedImage(index)}
                    >
                      <view class="absolute inset-0 flex items-center justify-center">
                        <ImageIcon class="w-8 h-8 text-muted-foreground/40" />
                      </view>
                    </view>
                  ))}
                </view>
              )}
    
              <!--   -->
              {post.video && (
                <view class="relative aspect-video bg-secondary rounded-lg overflow-hidden mb-4">
                  <view class="absolute inset-0 flex items-center justify-center">
                    <view class="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                      <Play class="w-6 h-6 text-primary fill-primary ml-1" />
                    </view>
                  </view>
                </view>
              )}
    
              <!--   -->
              {post.files && post.files.length > 0 && (
                <view class="space-y-2 mb-4">
                  {post.files.map(file => (
                    <Card key={file.id} class="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors cursor-pointer">
                      <view class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText class="w-5 h-5 text-primary" />
                      </view>
                      <view class="flex-1 min-w-0">
                        <text class="text-sm font-medium text-foreground truncate">{{ file.name }}</text>
                        <text class="text-xs text-muted-foreground">{{ file.size }}</text>
                      </view>
                      <Download class="w-5 h-5 text-muted-foreground" />
                    </Card>
                  ))}
                </view>
              )}
    
              <!--   -->
              {post.tags && post.tags.length > 0 && (
                <view class="flex flex-wrap gap-2 mb-4">
                  {post.tags.map(tag => (
                    <Link 
                      key={tag}
                      href={`/circles/${post.circleId}/home?tag=${{ tag }}`}
                      class="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full hover:bg-primary/20 transition-colors"
                    >
                      <Hash class="w-3 h-3" />
                      {{ tag }}
                    </Link>
                  ))}
                </view>
              )}
    
              <!--   -->
              <view class="flex items-center gap-4 text-xs text-muted-foreground">
                <text>{{ post.likes }} 点赞</text>
                <text>{{ post.comments }} 评论</text>
                <text>{{ post.collects }} 收藏</text>
              </view>
            </view>
    
            <!--   -->
            <view class="p-4">
              <text class="font-semibold text-base text-foreground mb-4">
                全部评论 ({{ post.comments }})
              </text>
    
              {comments.length === 0 ? (
                <view class="flex flex-col items-center justify-center py-12">
                  <MessageCircle class="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <text class="text-sm text-muted-foreground">暂无评论，来发表第一条吧</text>
                </view>
              ) : (
                <view class="space-y-4">
                  
    <view v-for="(comment, index) in comments" :key="index"> (
                    <view key={comment.id} class="border-b border-border pb-4 last:border-0">
                      <!--   -->
                      <view class="flex gap-3">
                        <Link href={`/user/${comment.author.id}`}>
                          <Avatar class="w-9 h-9">
                            <AvatarImage src={{ comment.author.avatar }} alt={{ comment.author.name }} />
                            <AvatarFallback class="bg-secondary text-foreground text-xs">
                              {{ comment.author.name[0] }}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center gap-2 mb-1">
                            <text class="font-medium text-sm text-foreground">{{ comment.author.name }}</text>
                            {comment.author.role !== "成员" && (
                              <Badge variant="outline" class={cn("text-[10px] px-1 py-0", getRoleBadgeStyle(comment.author.role))}>
                                {{ comment.author.role }}
                              </Badge>
                            )}
                            <text class="text-xs text-muted-foreground">{{ comment.time }}</text>
                          </view>
                          <text class="text-sm text-foreground mb-2">{{ comment.content }}</text>
                          <view class="flex items-center gap-4">
                            <view class="v0-btn" 
                              @click={() => handleCommentLike(comment.id)}
                              class={cn(
                                "flex items-center gap-1 text-xs transition-colors",
                                comment.isLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <ThumbsUp class={cn("w-3.5 h-3.5", comment.isLiked && "fill-primary")} />
                              {{ comment.likes > 0 && comment.likes }}
                            </view>
                            <view class="v0-btn" 
                              @click={() => {
                                setReplyTo({ id: comment.id, name: comment.author.name })
                                setShowInputFocus(true)
                              }}
                              class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              回复
                            </view>
                          </view>
    
                          <!--   -->
                          {comment.replies.length > 0 && (
                            <view class="mt-3 pl-3 border-l-2 border-border space-y-3">
                              {(expandedReplies.includes(comment.id) ? comment.replies : comment.replies.slice(0, 2)).map(reply => (
                                <view key={reply.id} class="text-sm">
                                  <view class="flex items-center gap-2 mb-1">
                                    <text class="font-medium text-foreground">{{ reply.author.name }}</text>
                                    {reply.author.role !== "成员" && (
                                      <Badge variant="outline" class={cn("text-[10px] px-1 py-0", getRoleBadgeStyle(reply.author.role))}>
                                        {{ reply.author.role }}
                                      </Badge>
                                    )}
                                    <text class="text-xs text-muted-foreground">{{ reply.time }}</text>
                                  </view>
                                  <text class="text-foreground">
                                    <text class="text-primary">@{{ reply.replyTo }}</text>{" "}
                                    {{ reply.content }}
                                  </text>
                                </view>
                              ))}
                              {comment.hasMoreReplies && comment.totalReplies > 2 && (
                                <view class="v0-btn"
                                  @click={() => toggleReplies(comment.id)}
                                  class="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                  {expandedReplies.includes(comment.id) ? (
                                    收起 <ChevronUp class="w-3 h-3" />
                                  ) : (
                                    展开更多回复 ({{ comment.totalReplies - 2 }}) <ChevronDown class="w-3 h-3" />
                                  )}
                                </view>
                              )}
                            </view>
                          )}
                        </view>
                      </view>
                    </view>
                  ))}
                </view>
              )}
            </view>
          </view>
    
          <!--   -->
          {selectedImage !== null && post.images && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
              <view class="v0-btn" 
                @click={() => setSelectedImage(null)}
                class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors safe-area-pt z-10"
              >
                <X class="w-6 h-6 text-white" />
              </view>
              <view class="w-full h-full flex items-center justify-center p-4">
                <view class="max-w-lg w-full aspect-square bg-secondary/20 rounded-xl flex flex-col items-center justify-center">
                  <ImageIcon class="w-16 h-16 text-white/40 mb-3" />
                  <text class="text-white/60 text-sm">
                    {post.images[selectedImage]?.caption || "图片预览"}
                  </text>
                </view>
              </view>
              <view class="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
                {post.images.map((_, index) => (
                  <view class="v0-btn"
                    key={{ index }}
                    @click={() => setSelectedImage(index)}
                    class={`w-2 h-2 rounded-full transition-colors ${
                      selectedImage === index ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </view>
            </view>
          )}
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb z-30">
            <view class="flex items-center gap-2 px-4 h-14">
              <!--   -->
              <view class="v0-btn" 
                @click={{ handleLike }}
                class={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-full transition-all",
                  post.isLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Heart class={cn("w-5 h-5 transition-transform", post.isLiked && "fill-primary scale-110")} />
                <text class="text-xs">{{ post.likes }}</text>
              </view>
    
              <!--   -->
              <view class="v0-btn" 
                @click={{ handleCollect }}
                class={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-full transition-all",
                  post.isCollected ? "text-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Bookmark class={cn("w-5 h-5 transition-transform", post.isCollected && "fill-accent scale-110")} />
                <text class="text-xs">{{ post.collects }}</text>
              </view>
    
              <!--   -->
              <view 
                class="flex-1 flex items-center gap-2 px-4 py-2 bg-secondary rounded-full cursor-text"
                @click={() => setShowInputFocus(true)}
              >
                <text class="text-sm text-muted-foreground">
                  {replyTo ? `回复 @${replyTo.name}` : "说点什么..."}
                </text>
              </view>
    
              <!--   -->
              <view class="v0-btn" class="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <Share2 class="w-5 h-5" />
              </view>
            </view>
          </view>
    
          <!--   -->
          {showInputFocus && (
            <view class="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" @click={() => { setShowInputFocus(false); setReplyTo(null) }}>
              <view 
                class="bg-card border-t border-border p-4 safe-area-pb animate-in slide-in-from-bottom duration-200"
                @click={e => e.stopPropagation()}
              >
                {replyTo && (
                  <view class="flex items-center justify-between mb-2">
                    <text class="text-xs text-muted-foreground">回复 @{{ replyTo.name }}</text>
                    <view class="v0-btn" @click={() => setReplyTo(null)} class="text-xs text-primary">取消回复</view>
                  </view>
                )}
                <view class="flex items-end gap-2">
                  <textarea
                    value={{ commentInput }}
                    @change={e => setCommentInput(e.target.value)}
                    placeholder={replyTo ? `回复 @${replyTo.name}...` : "说点什么..."}
                    class="flex-1 min-h-[80px] max-h-[160px] px-4 py-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                  <view class="v0-btn"
                    @click={{ handleSendComment }}
                    :disabled={{ !commentInput.trim() }}
                    class={cn(
                      "p-3 rounded-full transition-colors",
                      commentInput.trim() 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Send class="w-5 h-5" />
                  </view>
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
const postData = {
const commentsData = [
  const userRole = "圈主" // 可以是 "圈主" | "管理员" | "成员"
  const isAdmin = userRole === "圈主" || userRole === "管理员"
    const newComment = {

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