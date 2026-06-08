<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">topic</text>
      <text class="v0-route">V0: topic/[tag]</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
      <view class="flex items-center justify-between px-4 h-14">
      <BackButton />
      <text class="font-semibold text-base text-foreground">话题</text>
              <view class="v0-btn" class="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
                <Share2 class="w-5 h-5 text-foreground" />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-5 border-b border-border">
            <view class="flex items-start justify-between gap-4">
              <view class="flex-1">
                <view class="flex items-center gap-2 mb-2">
                  <view class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Hash class="w-5 h-5 text-primary" />
                  </view>
                  <text class="text-xl font-bold text-foreground">#{{ topicData.tag }}#</text>
                </view>
                <text class="text-sm text-muted-foreground mb-3">{{ topicData.description }}</text>
                <view class="flex items-center gap-4 text-sm">
                  <text class="text-foreground">
                    <text class="font-semibold">{{ topicData.contentCount.toLocaleString() }}</text>
                    <text class="text-muted-foreground ml-1">篇内容</text>
                  </text>
                  <text class="text-foreground">
                    <text class="font-semibold">{{ topicData.followCount.toLocaleString() }}</text>
                    <text class="text-muted-foreground ml-1">人关注</text>
                  </text>
                </view>
              </view>
              <view class="v0-btn"
                @click={{ handleFollow }}
                class={cn(
                  "flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  isFollowed
                    ? "bg-secondary text-muted-foreground"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {isFollowed ? (
                  
                    <Check class="w-4 h-4" />
                    已关注
                  
                ) : (
                  
                    <Plus class="w-4 h-4" />
                    关注
                  
                )}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 flex items-center justify-between border-b border-border">
            <view class="relative">
              <view class="v0-btn"
                @click={() => setShowSortMenu(!showSortMenu)}
                class="flex items-center gap-1 text-sm text-foreground"
              >
                {sortBy === "latest" ? "最新发布" : "最受欢迎"}
                <ChevronDown class={cn("w-4 h-4 transition-transform", showSortMenu && "rotate-180")} />
              </view>
              {showSortMenu && (
                
                  <view class="fixed inset-0 z-40" @click={() => setShowSortMenu(false)} />
                  <view class="absolute top-full left-0 mt-1 w-28 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50">
                    <view class="v0-btn"
                      @click={() => { setSortBy("latest"); setShowSortMenu(false) }}
                      class={cn(
                        "w-full px-4 py-2.5 text-left text-sm transition-colors",
                        sortBy === "latest" ? "text-primary bg-primary/5" : "text-foreground hover:bg-secondary"
                      )}
                    >
                      最新发布
                    </view>
                    <view class="v0-btn"
                      @click={() => { setSortBy("hot"); setShowSortMenu(false) }}
                      class={cn(
                        "w-full px-4 py-2.5 text-left text-sm transition-colors",
                        sortBy === "hot" ? "text-primary bg-primary/5" : "text-foreground hover:bg-secondary"
                      )}
                    >
                      最受欢迎
                    </view>
                  </view>
                
              )}
            </view>
            <view class="v0-btn"
              @click={{ handleRefresh }}
              :disabled={{ isRefreshing }}
              class="text-sm text-primary"
            >
              {isRefreshing ? "刷新中..." : "刷新"}
            </view>
          </view>
    
          <!--   -->
          <view class="divide-y divide-border">
            {sortedContent.length > 0 ? (
              sortedContent.map((item) => (
                <Link
                  key={item.id}
                  href={
                    item.type === "article" ? `/article/${{ item.id }}` :
                    item.type === "video" ? `/video/${{ item.id }}` :
                    `/post/${{ item.id }}`
                  }
                  class="block"
                >
                  {item.type === "article" && (
                    <Card class="p-4 rounded-none border-0 hover:bg-secondary/30 transition-colors">
                      <view class="flex gap-3">
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center gap-2 mb-1.5">
                            <Badge variant="secondary" class="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-500 border-0">
                              <FileText class="w-3 h-3 mr-0.5" />
                              文章
                            </Badge>
                          </view>
                          <text class="font-medium text-sm text-foreground line-clamp-2 mb-1.5">{{ item.title }}</text>
                          <text class="text-xs text-muted-foreground line-clamp-2 mb-2">{{ item.excerpt }}</text>
                          <view class="flex items-center justify-between">
                            <view class="flex items-center gap-2">
                              <Avatar class="w-5 h-5">
                                <AvatarImage src={{ item.author.avatar }} />
                                <AvatarFallback class="text-[10px]">{{ item.author.name[0] }}</AvatarFallback>
                              </Avatar>
                              <text class="text-xs text-muted-foreground">{{ item.author.name }}</text>
                              {item.author.isVerified && (
                                <Badge variant="secondary" class="text-[8px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                              )}
                            </view>
                            <view class="flex items-center gap-3 text-xs text-muted-foreground">
                              <text class="flex items-center gap-1">
                                <Heart class="w-3 h-3" /> {{ item.likes }}
                              </text>
                              <text class="flex items-center gap-1">
                                <MessageCircle class="w-3 h-3" /> {{ item.comments }}
                              </text>
                              <text>{{ item.time }}</text>
                            </view>
                          </view>
                        </view>
                        <view class="w-24 h-16 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center">
                          <FileText class="w-6 h-6 text-muted-foreground/40" />
                        </view>
                      </view>
                    </Card>
                  )}
    
                  {item.type === "post" && (
                    <Card class="p-4 rounded-none border-0 hover:bg-secondary/30 transition-colors">
                      <view class="flex items-center gap-2 mb-2">
                        <Avatar class="w-8 h-8">
                          <AvatarImage src={{ item.author.avatar }} />
                          <AvatarFallback class="text-xs">{{ item.author.name[0] }}</AvatarFallback>
                        </Avatar>
                        <view>
                          <view class="flex items-center gap-1.5">
                            <text class="text-sm font-medium text-foreground">{{ item.author.name }}</text>
                            {item.author.isVerified && (
                              <Badge variant="secondary" class="text-[8px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                            )}
                          </view>
                          <text class="text-[10px] text-muted-foreground">{{ item.time }}</text>
                        </view>
                        <Badge variant="secondary" class="ml-auto text-[10px] px-1.5 py-0 bg-green-500/10 text-green-500 border-0">
                          <MessageSquare class="w-3 h-3 mr-0.5" />
                          帖子
                        </Badge>
                      </view>
                      <text class="text-sm text-foreground mb-3 line-clamp-3">{{ item.content }}</text>
                      {item.images && item.images.length > 0 && (
                        <view class={cn(
                          "grid gap-1 mb-3",
                          item.images.length === 1 && "grid-cols-1",
                          item.images.length === 2 && "grid-cols-2",
                          item.images.length >= 3 && "grid-cols-3"
                        )}>
                          {item.images.slice(0, 3).map((img, idx) => (
                            <view key={idx} class="aspect-square rounded-lg bg-secondary flex items-center justify-center relative">
                              <MessageSquare class="w-6 h-6 text-muted-foreground/40" />
                              {idx === 2 && item.images && item.images.length > 3 && (
                                <view class="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                  <text class="text-white text-sm font-medium">+{{ item.images.length - 3 }}</text>
                                </view>
                              )}
                            </view>
                          ))}
                        </view>
                      )}
                      <view class="flex items-center gap-4 text-xs text-muted-foreground">
                        <text class="flex items-center gap-1">
                          <Heart class="w-3.5 h-3.5" /> {{ item.likes }}
                        </text>
                        <text class="flex items-center gap-1">
                          <MessageCircle class="w-3.5 h-3.5" /> {{ item.comments }}
                        </text>
                      </view>
                    </Card>
                  )}
    
                  {item.type === "video" && (
                    <Card class="p-4 rounded-none border-0 hover:bg-secondary/30 transition-colors">
                      <view class="flex gap-3">
                        <view class="w-32 aspect-[9/16] rounded-lg bg-secondary flex-shrink-0 relative flex items-center justify-center">
                          <Video class="w-8 h-8 text-muted-foreground/40" />
                          <view class="absolute inset-0 flex items-center justify-center">
                            <view class="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                              <Play class="w-5 h-5 text-white fill-white ml-0.5" />
                            </view>
                          </view>
                          <view class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                            {{ item.duration }}
                          </view>
                        </view>
                        <view class="flex-1 min-w-0 flex flex-col">
                          <Badge variant="secondary" class="self-start text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-500 border-0 mb-1.5">
                            <Video class="w-3 h-3 mr-0.5" />
                            视频
                          </Badge>
                          <text class="font-medium text-sm text-foreground line-clamp-2 mb-auto">{{ item.title }}</text>
                          <view class="flex items-center gap-2 mt-2">
                            <Avatar class="w-5 h-5">
                              <AvatarImage src={{ item.author.avatar }} />
                              <AvatarFallback class="text-[10px]">{{ item.author.name[0] }}</AvatarFallback>
                            </Avatar>
                            <text class="text-xs text-muted-foreground">{{ item.author.name }}</text>
                            {item.author.isVerified && (
                              <Badge variant="secondary" class="text-[8px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                            )}
                          </view>
                          <view class="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                            <text class="flex items-center gap-1">
                              <Heart class="w-3 h-3" /> {{ item.likes }}
                            </text>
                            <text class="flex items-center gap-1">
                              <Eye class="w-3 h-3" /> {{ item.views }}
                            </text>
                            <text>{{ item.time }}</text>
                          </view>
                        </view>
                      </view>
                    </Card>
                  )}
                </Link>
              ))
            ) : (
              <view class="flex flex-col items-center justify-center py-20 px-4">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Hash class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground text-sm text-center mb-4">
                  还没有相关内容<text>
    </text> />成为第一个发布的人吧
                </text>
                <Link
                  href="/publish"
                  class="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                >
                  去发布
                </Link>
              </view>
            )}
          </view>
    
          <!--   -->
          {sortedContent.length > 0 && (
            <view class="flex items-center justify-center py-6">
              <view class="v0-btn"
                @click={{ handleLoadMore }}
                :disabled={{ isLoadingMore }}
                class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLoadingMore ? (
                  
                    <Loader2 class="w-4 h-4 animate-spin" />
                    加载中...
                  
                ) : (
                  "点击加载更多"
                )}
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
const topicData = {
const contentList = [

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