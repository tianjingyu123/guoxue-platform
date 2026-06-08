<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">聊天</text>
      <text class="v0-route">V0: chat</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton />
              
              <view class="flex items-center gap-2">
                <text class="font-semibold text-lg text-foreground">消息</text>
                {totalUnread > 0 && (
                  <Badge variant="destructive" class="h-5 min-w-5 text-xs px-1.5">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </Badge>
                )}
              </view>
    
              <view class="flex items-center gap-1">
                <view class="v0-btn" 
                  @click={() => setShowSearch(!showSearch)}
                  class="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <Search class="w-5 h-5 text-muted-foreground" />
                </view>
                <Link 
                  href="/chat/new"
                  class="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <Plus class="w-5 h-5 text-muted-foreground" />
                </Link>
              </view>
            </view>
    
            <!--   -->
            {showSearch && (
              <view class="px-4 pb-3">
                <view class="relative">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={{ searchQuery }}
                    @change={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索联系人"
                    autoFocus
                    class="w-full h-10 pl-10 pr-4 rounded-full bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </view>
              </view>
            )}
          </view>
    
          <!--   -->
          <view class="divide-y divide-border">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  class="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <!--   -->
                  <view class="relative flex-shrink-0">
                    <Avatar class="w-12 h-12">
                      <AvatarImage src={{ conv.avatar }} alt={{ conv.name }} />
                      <AvatarFallback class={cn(
                        "text-sm font-medium",
                        conv.type === "group" ? "bg-accent/20 text-accent" : "bg-primary/10 text-primary"
                      )}>
                        {conv.type === "group" ? (
                          <Users class="w-5 h-5" />
                        ) : (
                          conv.name[0]
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <!--   -->
                    {conv.type === "private" && conv.isOnline && (
                      <view class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </view>
    
                  <!--   -->
                  <view class="flex-1 min-w-0">
                    <view class="flex items-center justify-between mb-0.5">
                      <view class="flex items-center gap-2">
                        <text class="font-medium text-sm text-foreground truncate">
                          {{ conv.name }}
                        </text>
                        {conv.type === "private" && conv.role && (
                          <Badge 
                            variant="secondary" 
                            class={cn(
                              "text-[10px] px-1.5 py-0 border-0",
                              conv.role === "讲师" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                            )}
                          >
                            {{ conv.role }}
                          </Badge>
                        )}
                        {conv.type === "group" && (
                          <text class="text-[10px] text-muted-foreground">
                            ({{ conv.memberCount }})
                          </text>
                        )}
                      </view>
                      <text class="text-xs text-muted-foreground flex-shrink-0">
                        {{ conv.time }}
                      </text>
                    </view>
                    <view class="flex items-center justify-between">
                      <text class="text-sm text-muted-foreground truncate pr-2">
                        {{ conv.lastMessage }}
                      </text>
                      {conv.unread > 0 && (
                        <Badge 
                          variant="destructive" 
                          class="h-5 min-w-5 text-xs px-1.5 flex-shrink-0"
                        >
                          {conv.unread > 99 ? "99+" : conv.unread}
                        </Badge>
                      )}
                    </view>
                  </view>
                </Link>
              ))
            ) : (
              /* 空状态 */
              <view class="flex flex-col items-center justify-center py-20 px-4">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <MessageCircle class="w-10 h-10 text-muted-foreground" />
                </view>
                <text class="text-base font-medium text-foreground mb-1">
                  {searchQuery ? "未找到相关会话" : "暂无消息"}
                </text>
                <text class="text-sm text-muted-foreground text-center mb-4">
                  {searchQuery ? "换个关键词试试" : "快去和圈友们交流吧"}
                </text>
                {!searchQuery && (
                  <Link
                    href="/chat/new"
                    class="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                  >
                    发起聊天
                  </Link>
                )}
              </view>
            )}
          </view>
    
          <!--   -->
            {filteredConversations.length > 0 && (
              <view class="p-4 pb-24">
                <view class="flex items-center justify-between mb-3">
                  <text class="font-medium text-sm text-foreground">猜你喜欢</text>
                  <Link href="/discover" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    更多 <ChevronRight class="w-3 h-3" />
                  </Link>
                </view>
                <view class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  
    <view v-for="(item, index) in recommendations" :key="index"> (
                    <Link
                      key={item.id}
                      href={item.type === "circle" ? `/circle/${{ item.id }}` : `/course/${{ item.id }}`}
                      class="flex-shrink-0 w-36"
                    >
                      <Card class="overflow-hidden hover:bg-secondary/50 transition-colors">
                        <view class="aspect-[4/3] bg-secondary flex items-center justify-center">
                          {item.type === "circle" ? (
                            <Users class="w-8 h-8 text-primary/60" />
                          ) : (
                            <BookOpen class="w-8 h-8 text-accent/60" />
                          )}
                        </view>
                        <view class="p-2">
                          <text class="text-xs font-medium text-foreground line-clamp-1">{{ item.name }}</text>
                          <text class="text-[10px] text-muted-foreground mt-0.5">
                            {item.type === "circle" 
                              ? `${{ item.members }} 成员` 
                              : `${{ item.students }} 人学习`
                            }
                          </text>
                          {item.type === "course" && (
                            <text class="text-xs text-primary font-medium mt-1">¥{{ item.price }}</text>
                          )}
                        </view>
                      </Card>
                    </Link>
                  ))}
                </view>
              </view>
            )}
    
          <!--   -->
          {filteredConversations.length > 0 && (
            <view class="fixed bottom-6 right-4">
              <Link
                href="/chat/new"
                class="flex items-center justify-center w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
              >
                <Plus class="w-6 h-6 text-primary-foreground" />
              </Link>
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
const conversations = [
const recommendations = [

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