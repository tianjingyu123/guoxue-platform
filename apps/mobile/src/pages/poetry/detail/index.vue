<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">诗词</text>
      <text class="v0-route">V0: poetry/[id]</text>
    </view>
        <view class="min-h-screen bg-gradient-to-b from-[#1a1815] to-[#0d0c0a] pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-[#1a1815]/95 backdrop-blur-sm border-b border-white/10">
            <view class="flex items-center justify-between px-4 h-14">
              <Link href="/poetry" class="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all">
                <ArrowLeft class="w-5 h-5 text-white" />
              </Link>
              <text class="font-serif font-medium text-white">诗词详情</text>
              <Button variant="ghost" size="icon" class="p-1.5 -mr-1.5 text-white hover:bg-white/10">
                <Share2 class="w-5 h-5" />
              </Button>
            </view>
          </view>
          
          <view class="px-4 py-6 space-y-6">
            <!--   -->
            <view class="text-center">
              <!--   -->
              <text class="text-2xl font-serif font-bold text-white mb-2">{{ poemDetail.title }}</text>
              <text class="text-white/60">
                〔{{ poemDetail.dynasty }}〕{{ poemDetail.author }}
              </text>
              
              <!--   -->
              <view class="flex items-center justify-center gap-4 mt-4">
                <view class="v0-btn" 
                  @click={() => setIsPlaying(!isPlaying)}
                  class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                >
                  <template v-if="isPlaying">
    VolumeX class="w-4 h-4" /> : <Volume2 class="w-4 h-4" />}
                  <text class="text-sm">{isPlaying ? '停止' : '朗读'}</text>
                </view>
                <view class="v0-btn" 
                  @click={() => setShowPinyin(!showPinyin)}
                  class={cn(
                    "px-4 py-2 rounded-full text-sm transition-colors",
                    showPinyin 
                      ? "bg-white/20 text-white" 
                      : "bg-white/10 text-white/60 hover:bg-white/15"
                  )}
                >
                  拼音
                </view>
              </view>
              
              <!--   -->
              <view class="mt-8 py-6 flex flex-col items-center gap-3">
                {poemDetail.content.map((item, index) => (
                  <view key={index} class="text-center">
                    {showPinyin && (
                      <text class="text-xs text-white/40 mb-1 tracking-wider">{{ item.pinyin }}</text>
                    )}
                    <text class="text-xl sm:text-2xl font-serif text-white tracking-widest leading-relaxed">
                      {{ item.line }}
                    </text>
                  </view>
                ))}
              </view>
              
              <!--   -->
              <view class="flex flex-wrap justify-center gap-2 mt-4">
                {poemDetail.tags.map(tag => (
                  <Badge key={tag} variant="secondary" class="bg-white/10 text-white/70 border-0">
                    {{ tag }}
                  </Badge>
                ))}
              </view>
              
              <!--   -->
              <view class="flex items-center justify-center gap-6 mt-6">
                <view class="v0-btn" 
                  @click={() => setIsLiked(!isLiked)}
                  class="flex flex-col items-center gap-1"
                >
                  <view class={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isLiked ? "bg-red-500/20" : "bg-white/10"
                  )}>
                    <Heart class={cn("w-5 h-5", isLiked ? "fill-red-500 text-red-500" : "text-white/60")} />
                  </view>
                  <text class="text-xs text-white/50">{{ (poemDetail.likes / 1000).toFixed(1) }}k</text>
                </view>
                
                <view class="v0-btn" 
                  @click={() => setIsBookmarked(!isBookmarked)}
                  class="flex flex-col items-center gap-1"
                >
                  <view class={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isBookmarked ? "bg-amber-500/20" : "bg-white/10"
                  )}>
                    {isBookmarked ? (
                      <BookmarkCheck class="w-5 h-5 text-amber-400" />
                    ) : (
                      <Bookmark class="w-5 h-5 text-white/60" />
                    )}
                  </view>
                  <text class="text-xs text-white/50">{{ (poemDetail.collections / 1000).toFixed(1) }}k</text>
                </view>
                
                <view class="v0-btn" 
                  @click={{ handleCopy }}
                  class="flex flex-col items-center gap-1"
                >
                  <view class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    {copied ? (
                      <Check class="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy class="w-5 h-5 text-white/60" />
                    )}
                  </view>
                  <text class="text-xs text-white/50">{copied ? '已复制' : '复制'}</text>
                </view>
              </view>
            </view>
            
            <!--   -->
            <Card class="bg-white/5 border-white/10 p-4">
              <text class="font-medium text-white mb-2 flex items-center gap-2">
                <BookOpen class="w-4 h-4 text-amber-400" />
                译文
              </text>
              <text class="text-sm text-white/70 leading-relaxed">{{ poemDetail.translation }}</text>
            </Card>
            
            <!--   -->
            <Card class="bg-white/5 border-white/10 overflow-hidden">
              <view class="v0-btn" 
                @click={() => setShowNotes(!showNotes)}
                class="w-full flex items-center justify-between p-4"
              >
                <text class="font-medium text-white flex items-center gap-2">
                  <MessageSquare class="w-4 h-4 text-amber-400" />
                  注释
                </text>
                <ChevronDown class={cn(
                  "w-5 h-5 text-white/50 transition-transform",
                  showNotes && "rotate-180"
                )} />
              </view>
              {showNotes && (
                <view class="px-4 pb-4 space-y-3">
                  {poemDetail.notes.map((note, index) => (
                    <view key={index} class="flex gap-2">
                      <Badge class="bg-amber-500/20 text-amber-400 border-0 text-xs flex-shrink-0">
                        {{ note.word }}
                      </Badge>
                      <text class="text-sm text-white/60">{{ note.note }}</text>
                    </view>
                  ))}
                </view>
              )}
            </Card>
            
            <!--   -->
            <Card class="bg-white/5 border-white/10 p-4">
              <text class="font-medium text-white mb-3 flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-amber-400" />
                赏析
              </text>
              <text class="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                {{ poemDetail.appreciation }}
              </text>
            </Card>
            
            <!--   -->
            <Card class="bg-white/5 border-white/10 p-4">
              <Link href={`/poetry/poet/${poemDetail.authorId}`} class="flex items-center gap-3">
                <view class="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/30 to-red-500/30 flex items-center justify-center flex-shrink-0">
                  <text class="font-serif font-bold text-xl text-white">{{ poemDetail.authorInfo.name[0] }}</text>
                </view>
                <view class="flex-1 min-w-0">
                  <view class="flex items-center gap-2">
                    <text class="font-medium text-white">{{ poemDetail.authorInfo.name }}</text>
                    <Badge variant="secondary" class="bg-amber-500/20 text-amber-400 border-0 text-xs">
                      {{ poemDetail.authorInfo.title }}
                    </Badge>
                  </view>
                  <text class="text-xs text-white/50 mt-0.5">
                    {{ poemDetail.authorInfo.dynasty }} · {{ poemDetail.authorInfo.years }} · {{ poemDetail.authorInfo.poemCount }}首
                  </text>
                  <text class="text-sm text-white/60 mt-1 line-clamp-2">{{ poemDetail.authorInfo.intro }}</text>
                </view>
                <ChevronRight class="w-5 h-5 text-white/40 flex-shrink-0" />
              </Link>
            </Card>
            
            <!--   -->
            <view>
              <view class="flex items-center justify-between mb-3">
                <text class="text-white/80 font-medium">相关诗词</text>
                <Link href="#" class="text-xs text-white/50 flex items-center">
                  更多 <ChevronRight class="w-4 h-4" />
                </Link>
              </view>
              
              <view class="space-y-2">
                {poemDetail.relatedPoems.map(poem => (
                  <Link key={poem.id} href={`/poetry/${poem.id}`}>
                    <Card class="flex items-center gap-3 p-3 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <view class="flex-1 min-w-0">
                        <text class="font-medium text-white text-sm">{{ poem.title }}</text>
                        <text class="text-xs text-white/50 mt-0.5 truncate">{{ poem.preview }}</text>
                      </view>
                      <text class="text-xs text-white/40">{{ poem.author }}</text>
                    </Card>
                  </Link>
                ))}
              </view>
            </view>
            
            <!--   -->
            <Card class="bg-gradient-to-br from-[var(--classics-ai)]/20 to-[var(--classics-ai)]/5 border-[var(--classics-ai)]/30 p-4">
              <view class="flex items-center gap-3">
                <view class="w-10 h-10 rounded-full classics-ai-btn flex items-center justify-center flex-shrink-0">
                  <Sparkles class="w-5 h-5 text-white" />
                </view>
                <view class="flex-1">
                  <text class="font-medium text-white">AI深度解析</text>
                  <text class="text-xs text-white/60 mt-0.5">探索更多意境与典故</text>
                </view>
                <Button size="sm" class="classics-ai-btn border-0">
                  开始解析
                </Button>
              </view>
            </Card>
          </view>
          
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-[#1a1815]/95 backdrop-blur-sm border-t border-white/10 px-4 py-3 z-50">
            <view class="flex items-center gap-3 max-w-screen-lg mx-auto">
              <Button 
                variant="outline" 
                class="flex-1 h-11 border-white/20 text-white hover:bg-white/10"
              >
                <Volume2 class="w-4 h-4 mr-1.5" />
                听读
              </Button>
              <Button 
                class="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <BookOpen class="w-4 h-4 mr-1.5" />
                背诵练习
              </Button>
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
const poemDetail = {

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