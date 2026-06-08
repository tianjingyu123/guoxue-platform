<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">邀请有礼</text>
      <text class="v0-route">V0: invite</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-12">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">邀请好友</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pt-4">
            <Card class="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent p-5">
              <!--   -->
              <view class="absolute -right-6 -top-6 w-24 h-24 opacity-10">
                <Gift class="w-full h-full text-white" />
              </view>
              
              <view class="relative z-10">
                <view class="flex items-center gap-2 mb-2">
                  <Sparkles class="w-5 h-5 text-white" />
                  <text class="text-lg font-bold text-white">邀请好友，双方有礼</text>
                </view>
                <text class="text-sm text-white/90 leading-relaxed">
                  邀请1位好友注册，双方各得<text class="font-bold text-accent-foreground"> 7天会员体验</text>。
                  <text>
    </text> />多邀多得，上不封顶。
                </text>
                
                <!--   -->
                <view class="flex items-center gap-6 mt-4 pt-4 border-t border-white/20">
                  <view class="text-center">
                    <text class="text-2xl font-bold text-white">{{ invitedFriends.length }}</text>
                    <text class="text-xs text-white/70">已邀请</text>
                  </view>
                  <view class="text-center">
                    <text class="text-2xl font-bold text-white">{{ registeredCount }}</text>
                    <text class="text-xs text-white/70">已注册</text>
                  </view>
                  <view class="text-center">
                    <text class="text-2xl font-bold text-white">{{ registeredCount * 7 }}</text>
                    <text class="text-xs text-white/70">获得天数</text>
                  </view>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pt-6">
            <text class="font-semibold text-sm text-foreground mb-3">邀请方式</text>
            
            <view class="grid grid-cols-3 gap-3">
              <!--   -->
              <view class="v0-btn" 
                @click={{ handleShareLink }}
                class="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all"
              >
                <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Share2 class="w-5 h-5 text-primary" />
                </view>
                <text class="text-xs text-foreground font-medium">分享链接</text>
              </view>
    
              <!--   -->
              <view class="v0-btn" 
                @click={() => setShowPoster(true)}
                class="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:border-accent/50 hover:bg-secondary/50 transition-all"
              >
                <view class="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Image class="w-5 h-5 text-accent" />
                </view>
                <text class="text-xs text-foreground font-medium">生成海报</text>
              </view>
    
              <!--   -->
              <view class="v0-btn" 
                @click={{ handleCopyCode }}
                class="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:border-green-500/50 hover:bg-secondary/50 transition-all"
              >
                <view class="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  {copied ? (
                    <Check class="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy class="w-5 h-5 text-green-500" />
                  )}
                </view>
                <text class="text-xs text-foreground font-medium">
                  {copied ? "已复制" : "复制邀请码"}
                </text>
              </view>
            </view>
    
            <!--   -->
            <Card class="mt-4 p-4 bg-secondary/30 border-dashed">
              <view class="flex items-center justify-between">
                <view>
                  <text class="text-xs text-muted-foreground">我的邀请码</text>
                  <text class="text-xl font-bold text-primary tracking-widest mt-1">{{ inviteCode }}</text>
                </view>
                <view class="v0-btn" 
                  @click={{ handleCopyCode }}
                  class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {copied ? "已复制" : "复制"}
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pt-6">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <Crown class="w-4 h-4 text-accent" />
                <text class="font-semibold text-sm text-foreground">邀请排行榜</text>
              </view>
              <view class="flex items-center gap-1 bg-secondary rounded-full p-0.5">
                <view class="v0-btn"
                  @click={() => setLeaderboardTab("today")}
                  class={cn(
                    "px-3 py-1 text-xs rounded-full transition-colors",
                    leaderboardTab === "today"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  今日
                </view>
                <view class="v0-btn"
                  @click={() => setLeaderboardTab("total")}
                  class={cn(
                    "px-3 py-1 text-xs rounded-full transition-colors",
                    leaderboardTab === "total"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  累计
                </view>
              </view>
            </view>
    
            <Card class="divide-y divide-border">
              
    <view v-for="(user, index) in leaderboard" :key="index"> (
                <view key={user.rank} class="flex items-center gap-3 p-3">
                  <!--   -->
                  <view class="w-6 text-center">
                    {user.rank <= 3 ? (
                      <text class={cn(
                        "text-lg font-bold",
                        user.rank === 1 && "text-yellow-500",
                        user.rank === 2 && "text-gray-400",
                        user.rank === 3 && "text-orange-400"
                      )}>
                        {{ user.rank }}
                      </text>
                    ) : (
                      <text class="text-sm text-muted-foreground">{{ user.rank }}</text>
                    )}
                  </view>
                  
                  <Avatar class="w-9 h-9">
                    <AvatarImage src={{ user.avatar }} alt={{ user.name }} />
                    <AvatarFallback class="bg-secondary text-foreground text-xs">
                      {{ user.name[0] }}
                    </AvatarFallback>
                  </Avatar>
                  
                  <text class="flex-1 text-sm font-medium text-foreground">{{ user.name }}</text>
                  
                  <view class="text-right">
                    <text class="text-sm font-semibold text-primary">{{ user.count }}</text>
                    <text class="text-xs text-muted-foreground ml-1">人</text>
                  </view>
                </view>
              ))}
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pt-6">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <Users class="w-4 h-4 text-primary" />
                <text class="font-semibold text-sm text-foreground">已邀请好友</text>
                <Badge variant="secondary" class="text-[10px] px-1.5 py-0">
                  {{ invitedFriends.length }}人
                </Badge>
              </view>
              <Link href="/invite/history" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                全部记录 <ChevronRight class="w-3 h-3" />
              </Link>
            </view>
    
            {invitedFriends.length > 0 ? (
              <Card class="divide-y divide-border">
                
    <view v-for="(friend, index) in invitedFriends" :key="index"> (
                  <view key={friend.id} class="flex items-center gap-3 p-3">
                    <Avatar class="w-10 h-10">
                      <AvatarImage src={{ friend.avatar }} alt={{ friend.name }} />
                      <AvatarFallback class="bg-secondary text-foreground text-sm">
                        {{ friend.name[0] }}
                      </AvatarFallback>
                    </Avatar>
                    
                    <view class="flex-1 min-w-0">
                      <text class="text-sm font-medium text-foreground">{{ friend.name }}</text>
                      <text class="text-xs text-muted-foreground">{{ friend.registerTime }}</text>
                    </view>
                    
                    <Badge 
                      variant="secondary" 
                      class={cn(
                        "text-[10px] px-2 py-0.5 border-0",
                        friend.status === "registered" 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {friend.status === "registered" ? "已注册" : "待激活"}
                    </Badge>
                  </view>
                ))}
              </Card>
            ) : (
              <Card class="p-8 text-center">
                <view class="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                  <Users class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="text-sm text-muted-foreground">还没有邀请好友</text>
                <text class="text-xs text-muted-foreground/70 mt-1">快去分享邀请链接吧</text>
              </Card>
            )}
          </view>
    
          <!--   -->
          {showPoster && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <view class="w-full max-w-sm">
                <!--   -->
                <Card class="overflow-hidden">
                  <view class="aspect-[9/16] bg-gradient-to-br from-primary via-primary/80 to-accent relative">
                    <!--   -->
                    <view class="absolute inset-0 flex flex-col items-center justify-between p-6">
                      <!--   -->
                      <view class="text-center">
                        <view class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                          <text class="text-2xl font-bold text-white">卜</text>
                        </view>
                        <text class="text-xl font-bold text-white">热卜国学</text>
                        <text class="text-sm text-white/80 mt-1">探索易学智慧</text>
                      </view>
                      
                      <!--   -->
                      <view class="text-center">
                        <text class="text-lg font-semibold text-white mb-2">邀请你一起学习国学</text>
                        <text class="text-sm text-white/80">注册即送7天会员体验</text>
                      </view>
                      
                      <!--   -->
                      <view class="bg-white rounded-xl p-4 text-center">
                        <view class="w-24 h-24 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-2">
                          <text class="text-xs text-muted-foreground">二维码</text>
                        </view>
                        <text class="text-xs text-muted-foreground">长按识别二维码</text>
                        <text class="text-[10px] text-muted-foreground mt-1">邀请码: {{ inviteCode }}</text>
                      </view>
                    </view>
                  </view>
                </Card>
                
                <!--   -->
                <view class="flex gap-3 mt-4">
                  <view class="v0-btn"
                    @click={() => setShowPoster(false)}
                    class="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    取消
                  </view>
                  <view class="v0-btn"
                    @click={() => {
                      alert("海报已保存到相册")
                      setShowPoster(false)
                    }}
                    class="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    保存海报
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
const inviteCode = "REBU2024"
const invitedFriends = [
const leaderboard = [

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