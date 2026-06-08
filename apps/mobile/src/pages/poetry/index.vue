<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">诗词</text>
      <text class="v0-route">V0: poetry</text>
    </view>
        <view class="min-h-screen bg-gradient-to-b from-[#1a1815] to-[#0d0c0a]">
          <!--   -->
          <view class="sticky top-0 z-50 bg-[#1a1815]/95 backdrop-blur-sm border-b border-white/10">
            <view class="flex items-center gap-3 px-4 h-14">
              <Link href="/" class="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all">
                <ArrowLeft class="w-5 h-5 text-white" />
              </Link>
              
              <!--   -->
              <view class="flex-1 relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索诗词、诗人..."
                  class="pl-9 pr-4 h-9 bg-white/10 border-0 rounded-full text-sm text-white placeholder:text-white/50"
                />
              </view>
              
              <Button 
                variant="ghost" 
                size="icon" 
                class="flex-shrink-0 text-white hover:bg-white/10"
              >
                <Shuffle class="w-5 h-5" />
              </Button>
            </view>
          </view>
          
          <view class="px-4 py-5 space-y-6">
            <!--   -->
            <view>
              <view class="flex items-center gap-2 mb-3">
                <Calendar class="w-4 h-4 text-amber-400" />
                <text class="text-white/80 text-sm font-medium">每日一诗</text>
              </view>
              
              <Card class="bg-gradient-to-br from-[#2a2520] to-[#1a1815] border-white/10 p-5 relative overflow-hidden">
                <!--   -->
                <view class="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
                <view class="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl" />
                
                <view class="relative">
                  <!--   -->
                  <view class="flex items-start justify-between mb-4">
                    <view>
                      <Link href={`/poetry/${todayPoem.id}`}>
                        <text class="text-xl font-serif font-bold text-white mb-1 hover:text-amber-400 transition-colors">
                          {{ todayPoem.title }}
                        </text>
                      </Link>
                      <text class="text-white/60 text-sm">
                        〔{{ todayPoem.dynasty }}〕{{ todayPoem.author }}
                      </text>
                    </view>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      class="text-amber-400 hover:bg-amber-400/10"
                    >
                      <Volume2 class="w-5 h-5" />
                    </Button>
                  </view>
                  
                  <!--   -->
                  <view class="flex justify-center py-4">
                    <view class="writing-vertical-rl font-serif text-lg text-white/90 leading-loose tracking-wider h-36">
                      {todayPoem.content.split('\n').map((line, i) => (
                        <text key={{ i }} class="ml-4 first:ml-0">{{ line }}</text>
                      ))}
                    </view>
                  </view>
                  
                  <!--   -->
                  <view class="mt-4 p-3 bg-white/5 rounded-lg">
                    <text class="text-xs text-white/50 mb-1">译文</text>
                    <text class="text-sm text-white/70 leading-relaxed">{{ todayPoem.translation }}</text>
                  </view>
                  
                  <!--   -->
                  <view class="flex items-center justify-between mt-4">
                    <view class="flex gap-2">
                      {todayPoem.tags.map(tag => (
                        <Badge key={tag} variant="secondary" class="bg-white/10 text-white/70 border-0 text-xs">
                          {{ tag }}
                        </Badge>
                      ))}
                    </view>
                    
                    <view class="flex items-center gap-2">
                      <view class="v0-btn" 
                        @click={() => setIsLiked(!isLiked)}
                        class="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <Heart class={cn("w-4 h-4", isLiked ? "fill-red-500 text-red-500" : "text-white/60")} />
                        <text class="text-xs text-white/60">{{ (todayPoem.likes / 1000).toFixed(1) }}k</text>
                      </view>
                      <view class="v0-btn" 
                        @click={() => setIsBookmarked(!isBookmarked)}
                        class="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <Bookmark class={cn("w-4 h-4", isBookmarked ? "fill-amber-400 text-amber-400" : "text-white/60")} />
                      </view>
                    </view>
                  </view>
                </view>
              </Card>
            </view>
            
            <!--   -->
            <view>
              <view class="flex items-center justify-between mb-3">
                <text class="text-white/80 font-medium">分类浏览</text>
                <Link href="#" class="text-xs text-white/50 flex items-center">
                  全部 <ChevronRight class="w-4 h-4" />
                </Link>
              </view>
              
              <view class="space-y-3">
                
    <view v-for="(cat, index) in categories" :key="index"> (
                  <view key={cat.id} class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    <text class="flex-shrink-0 text-xs text-white/40 w-10 py-1.5">{{ cat.name }}</text>
                    {cat.items.map(item => (
                      <view class="v0-btn"
                        key={{ item }}
                        class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                      >
                        {{ item }}
                      </view>
                    ))}
                  </view>
                ))}
              </view>
            </view>
            
            <!--   -->
            <view>
              <view class="flex items-center justify-between mb-3">
                <view class="flex items-center gap-2">
                  <User class="w-4 h-4 text-amber-400" />
                  <text class="text-white/80 font-medium">著名诗人</text>
                </view>
                <Link href="#" class="text-xs text-white/50 flex items-center">
                  更多 <ChevronRight class="w-4 h-4" />
                </Link>
              </view>
              
              <view class="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                
    <view v-for="(poet, index) in poets" :key="index"> (
                  <Link key={poet.id} href={`/poetry/poet/${poet.id}`} class="flex-shrink-0">
                    <Card class="w-24 bg-white/5 border-white/10 p-3 text-center hover:bg-white/10 transition-colors">
                      <view class="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-amber-500/30 to-red-500/30 flex items-center justify-center mb-2">
                        <text class="font-serif font-bold text-lg text-white">{{ poet.avatar }}</text>
                      </view>
                      <text class="text-sm text-white font-medium">{{ poet.name }}</text>
                      <text class="text-[10px] text-white/50 mt-0.5">{{ poet.dynasty }} · {{ poet.poemCount }}首</text>
                    </Card>
                  </Link>
                ))}
              </view>
            </view>
            
            <!--   -->
            <view>
              <view class="flex items-center justify-between mb-3">
                <view class="flex items-center gap-2">
                  <TrendingUp class="w-4 h-4 text-amber-400" />
                  <text class="text-white/80 font-medium">热门诗词</text>
                </view>
                <Link href="#" class="text-xs text-white/50 flex items-center">
                  更多 <ChevronRight class="w-4 h-4" />
                </Link>
              </view>
              
              <view class="space-y-2">
                
    <view v-for="(poem, index) in poems" :key="index"> (
                  <Link key={poem.id} href={`/poetry/${poem.id}`}>
                    <Card class="flex items-center gap-3 p-3 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <!--   -->
                      <view class={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        index < 3 
                          ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white" 
                          : "bg-white/10 text-white/50"
                      )}>
                        {{ index + 1 }}
                      </view>
                      
                      <!--   -->
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2">
                          <text class="font-medium text-white text-sm">{{ poem.title }}</text>
                          <text class="text-xs text-white/50">〔{{ poem.dynasty }}〕{{ poem.author }}</text>
                        </view>
                        <text class="text-xs text-white/50 mt-0.5 truncate">{{ poem.preview }}</text>
                      </view>
                      
                      <!--   -->
                      <view class="flex items-center gap-1 text-white/40 flex-shrink-0">
                        <Heart class="w-3.5 h-3.5" />
                        <text class="text-xs">{{ (poem.likes / 1000).toFixed(1) }}k</text>
                      </view>
                    </Card>
                  </Link>
                ))}
              </view>
            </view>
            
            <!--   -->
            <view>
              <Card class="bg-gradient-to-br from-[var(--classics-ai)]/20 to-[var(--classics-ai)]/5 border-[var(--classics-ai)]/30 p-4">
                <view class="flex items-center gap-3">
                  <view class="w-10 h-10 rounded-full classics-ai-btn flex items-center justify-center flex-shrink-0">
                    <Sparkles class="w-5 h-5 text-white" />
                  </view>
                  <view class="flex-1">
                    <text class="font-medium text-white">AI诗词赏析</text>
                    <text class="text-xs text-white/60 mt-0.5">智能解读诗词意境与典故</text>
                  </view>
                  <ChevronRight class="w-5 h-5 text-white/50" />
                </view>
              </Card>
            </view>
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
const todayPoem = {
const poems = [
const poets = [
const categories = [

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