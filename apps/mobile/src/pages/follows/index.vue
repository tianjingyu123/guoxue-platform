<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">follows</text>
      <text class="v0-route">V0: follows</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
      <BackButton fallbackPath="/profile" />
      <text class="font-semibold text-base text-foreground">社交关系</text>
              <view class="w-9" />
            </view>
    
            <!--   -->
            <view class="flex border-b border-border">
              <view class="v0-btn"
                @click={() => setActiveTab("following")}
                class={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  activeTab === "following" ? "text-primary" : "text-muted-foreground"
                )}
              >
                关注 {{ followingCount }}
                {activeTab === "following" && (
                  <view class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
                )}
              </view>
              <view class="v0-btn"
                @click={() => setActiveTab("followers")}
                class={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  activeTab === "followers" ? "text-primary" : "text-muted-foreground"
                )}
              >
                粉丝 {{ followerCount }}
                {activeTab === "followers" && (
                  <view class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
                )}
              </view>
            </view>
    
            <!--   -->
            <view class="px-4 py-3">
              <view class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索用户"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  class="w-full h-9 pl-9 pr-4 rounded-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="divide-y divide-border">
            {filteredList.length > 0 ? (
              filteredList.map((user) => (
                <view key={user.id} class="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                  <!--   -->
                  <Link href={`/user/${user.id}`} class="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar class="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={{ user.avatar }} alt={{ user.name }} />
                      <AvatarFallback class="bg-primary/10 text-primary text-sm">
                        {{ user.name[0] }}
                      </AvatarFallback>
                    </Avatar>
    
                    <!--   -->
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-1">
                        <text class="font-medium text-sm text-foreground truncate">{{ user.name }}</text>
                        {user.isVerified && (
                          <BadgeCheck class="w-4 h-4 text-accent flex-shrink-0" />
                        )}
                      </view>
                      <text class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{{ user.bio }}</text>
                    </view>
                  </Link>
    
                  <!--   -->
                  <Button
                    variant={followingState[user.id] ? "outline" : "default"}
                    size="sm"
                    @click={() => toggleFollow(user.id)}
                    class={cn(
                      "h-8 px-4 text-xs font-medium rounded-full flex-shrink-0",
                      followingState[user.id] 
                        ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/5" 
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {followingState[user.id] ? (
                      
                        <UserMinus class="w-3.5 h-3.5 mr-1" />
                        已关注
                      
                    ) : (
                      
                        <UserPlus class="w-3.5 h-3.5 mr-1" />
                        {activeTab === "followers" ? "回关" : "关注"}
                      
                    )}
                  </Button>
                </view>
              ))
            ) : (
              /* 空状态 */
              <view class="flex flex-col items-center justify-center py-20 px-8">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Users class="w-10 h-10 text-muted-foreground/50" />
                </view>
                <text class="text-muted-foreground text-sm text-center">
                  {searchQuery ? (
                    "没有找到相关用户"
                  ) : activeTab === "following" ? (
                    "还没有关注任何人"
                  ) : (
                    "还没有粉丝"
                  )}
                </text>
                {!searchQuery && (
                  <Link href="/discover">
                    <Button variant="outline" size="sm" class="mt-4 rounded-full">
                      {activeTab === "following" ? "去发现更多用户" : "分享内容吸引粉丝"}
                    </Button>
                  </Link>
                )}
              </view>
            )}
          </view>
    
          <!--   -->
          <view class="h-8" />
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const followingUsers = [
const followerUsers = [
    const state: Record<number, boolean> = {}
  const currentList = activeTab === "following" ? followingUsers : followerUsers

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