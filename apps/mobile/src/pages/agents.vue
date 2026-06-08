<template>
  <view class="page v0-page" data-v0-route="agents">
        <view class="min-h-screen bg-[#FAF8F5] pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-gradient-to-b from-[#C41E3A] to-[#A01530] pt-safe">
            <view class="px-4 pt-3 pb-4">
              <view class="flex items-center justify-between mb-3">
                <view class="flex items-center gap-2">
                  <text class="h1" class="text-[20px] font-bold text-white">智能体广场</text>
                  <text class="px-2 py-0.5 bg-white/20 rounded-full text-[11px] text-white/90 flex items-center gap-1">
                    <Zap class="w-3 h-3" />
                    {{ hotBots.length }}个在线
                  </text>
                </view>
                <Link href="/agents/history" class="text-[12px] text-white/80 flex items-center gap-1">
                  <Clock class="w-4 h-4" />
                  对话记录
                </Link>
              </view>
              
              <!--   -->
              <view class="relative">
                <view class="flex items-center bg-white rounded-xl px-3 py-2.5 shadow-lg">
                  <Search class="w-5 h-5 text-[#999] flex-shrink-0" />
                  <input
                    ref={{ searchRef }}
                    type="text"
                    value={{ searchQuery }}
                    @change={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索智能体或直接提问..."
                    class="flex-1 ml-2 text-[14px] bg-transparent outline-none text-[#333] placeholder:text-[#999]"
                  />
                  {searchQuery && (
                    <view class="v0-btn" @click={() => setSearchQuery("")} class="p-1">
                      <X class="w-4 h-4 text-[#999]" />
                    </view>
                  )}
                  <view class="w-px h-5 bg-[#E5E5E5] mx-2" />
                  <view class="v0-btn" 
                    @click={{ handleVoiceSearch }}
                    class="v0-class"
                  >
                    <Mic class="v0-class" />
                  </view>
                </view>
                {{ isListening && (
                  <view class="absolute inset-0 flex items-center justify-center bg-white rounded-xl">
                    <view class="flex items-center gap-2">
                      <view class="w-2 h-2 bg-[#C41E3A] rounded-full animate-bounce" :style="{ animationDelay: "0ms"  }} />
                      <view class="w-2 h-2 bg-[#C41E3A] rounded-full animate-bounce" :style="{ animationDelay: "150ms" }} />
                      <view class="w-2 h-2 bg-[#C41E3A] rounded-full animate-bounce" :style="{ animationDelay: "300ms" }} />
                      <text class="ml-2 text-[14px] text-[#666]">正在聆听...</text>
                    </view>
                  </view>
                )}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pt-4">
            <Link href="/agent/main" class="block">
              <view class="relative bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-2xl p-4 overflow-hidden">
                <view class="absolute top-0 right-0 w-32 h-32 bg-[#C41E3A]/20 rounded-full blur-3xl" />
                <view class="absolute bottom-0 left-0 w-24 h-24 bg-[#7C3AED]/20 rounded-full blur-2xl" />
                <view class="relative flex items-center gap-4">
                  <view class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C41E3A] to-[#7C3AED] flex items-center justify-center shadow-lg">
                    <Bot class="w-7 h-7 text-white" />
                  </view>
                  <view class="flex-1">
                    <view class="flex items-center gap-2">
                      <text class="h3" class="text-white font-bold text-[16px]">热卜智能助手</text>
                      <text class="px-1.5 py-0.5 bg-[#52C41A] text-white text-[10px] rounded">在线</text>
                    </view>
                    <text class="text-white/60 text-[12px] mt-1">有任何问题都可以问我，我来帮您解答</text>
                  </view>
                  <view class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <MessageCircle class="w-5 h-5 text-white" />
                  </view>
                </view>
              </view>
            </Link>
          </view>
    
          <!--   -->
          <view class="px-4 pt-5">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <Flame class="w-5 h-5 text-[#FF6B35]" />
                <text class="font-bold text-[#2C2C2C]">大家都在问</text>
              </view>
              <Link href="/agents/questions" class="text-[12px] text-[#999] flex items-center">
                更多 <ChevronRight class="w-4 h-4" />
              </Link>
            </view>
            <view class="space-y-2">
              {hotQuestions.slice(0, 3).map((q, index) => (
                <Link 
                  key={q.id} 
                  href={{ `/agent/${q.botId }}?q=${{ encodeURIComponent(q.question) }}`}
                  class="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
                >
                  <view class="v0-class">
                    {{ index + 1 }}
                  </view>
                  <view class="flex-1 min-w-0">
                    <text class="text-[13px] text-[#2C2C2C] line-clamp-1">{{ q.question }}</text>
                    <view class="flex items-center gap-2 mt-1">
                      <image src={{ q.botAvatar }} alt="" class="w-4 h-4 rounded" />
                      <text class="text-[11px] text-[#999]">{{ q.botName }}</text>
                      <text class="text-[11px] text-[#BBB]">·</text>
                      <text class="text-[11px] text-[#999]">{{ formatCount(q.views) }}浏览</text>
                    </view>
                  </view>
                  <ChevronRight class="w-4 h-4 text-[#CCC] flex-shrink-0" />
                </Link>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pt-5">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <TrendingUp class="w-5 h-5 text-[#C41E3A]" />
                <text class="font-bold text-[#2C2C2C]">智能体</text>
              </view>
              <Link href="/agents/ranking" class="flex items-center gap-1 text-[12px] text-[#C9A96E]">
                <Crown class="w-3.5 h-3.5" />
                热度榜
              </Link>
            </view>
    
            <!--   -->
            <view class="space-y-3">
              <view v-for="(bot, index) in displayBots" :key="index">
                <Link key={bot.id} href={{ `/agent/${bot.id }}`}>
                  <view class="bg-white rounded-2xl p-4 shadow-sm">
                    <view class="flex items-start gap-3">
                      <!--   -->
                      <view class="relative flex-shrink-0">
                        <view class="v0-class">
                          <image src={{ bot.avatar }} alt="" class="w-10 h-10" />
                        </view>
                        {{ index < 3 && (
                          <view class="v0-class">
                            {index + 1 }}
                          </view>
                        )}
                      </view>
                      
                      <!--   -->
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2">
                          <text class="h3" class="font-bold text-[15px] text-[#2C2C2C] truncate">{{ bot.name }}</text>
                          {{ bot.isOfficial && <Crown class="w-4 h-4 text-[#C9A96E] flex-shrink-0" /> }}
                          {{ bot.isNew && <text class="px-1.5 py-0.5 bg-[#52C41A] text-white text-[9px] rounded flex-shrink-0">NEW</text> }}
                        </view>
                        <text class="text-[12px] text-[#666] line-clamp-2 mt-1">{{ bot.description }}</text>
                        
                        <!--   -->
                        {bot.capabilities && bot.capabilities.length > 0 && (
                          <view class="flex items-center gap-1.5 mt-2 flex-wrap">
                            {bot.capabilities.slice(0, 3).map((cap, i) => (
                              <text key={i} class="px-2 py-0.5 bg-[#F5F0E8] text-[#8B7355] text-[10px] rounded-full">
                                {{ cap }}
                              </text>
                            ))}
                          </view>
                        )}
                        
                        <!--   -->
                        <view class="flex items-center gap-3 mt-2">
                          <view class="flex items-center gap-1">
                            <Star class="w-3.5 h-3.5 text-[#FFB800] fill-[#FFB800]" />
                            <text class="text-[12px] text-[#666]">{{ bot.rating }}</text>
                          </view>
                          <text class="text-[12px] text-[#999]">{{ formatCount(bot.useCount) }}次对话</text>
                          {{ bot.capabilities?.includes("语音对话") && (
                            <text class="flex items-center gap-0.5 text-[11px] text-[#7C3AED]">
                              <Volume2 class="w-3.5 h-3.5" />语音
                            </text>
                          ) }}
                        </view>
                      </view>
    
                      <!--   -->
                      <view class="v0-btn" 
                        @click={(e) => {
                          e.preventDefault()
                          router.push(`/agent/${bot.id}`)
                        }}
                        class="px-4 py-2 bg-[#C41E3A] text-white text-[13px] font-medium rounded-full flex-shrink-0"
                      >
                        对话
                      </view>
                    </view>
                  </view>
                </Link>
              ))}
            </view>
    
            <!--   -->
            {hotBots.length > 4 && (
              <view class="v0-btn"
                @click={() => setShowAllBots(!showAllBots)}
                class="w-full mt-3 py-2.5 bg-white rounded-xl text-[13px] text-[#666] flex items-center justify-center gap-1 shadow-sm"
              >
                {{ showAllBots ? "收起" : `查看全部${hotBots.length }}个智能体`}
                <ChevronDown class="v0-class" />
              </view>
            )}
          </view>
    
          <!--   -->
          <view class="h-8" />
    
          <BottomNav />
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: agents
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.v0-page {
  padding: 24rpx;
}

/* 按钮样式 */
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 列表项 */
.v0-li {
  padding: 24rpx;
  border-bottom: 1px solid #E8E0D5;
}

/* 分隔线 */
.hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>