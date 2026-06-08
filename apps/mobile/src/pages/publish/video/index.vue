<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">video</text>
      <text class="v0-route">V0: publish/video</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/publish" />
              <text class="font-semibold text-base text-foreground">编辑视频</text>
              <view class="v0-btn" 
                @click={{ handlePublish }}
                :disabled={{ !title.trim() }}
                class="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                发布
              </view>
            </view>
          </view>
    
          <view class="pb-20">
            <!--   -->
            <view class="relative aspect-[9/16] max-h-[50vh] bg-black mx-4 mt-4 rounded-xl overflow-hidden">
              <!--   -->
              <view class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary">
                <view class="text-center">
                  <view class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                    <Play class="w-8 h-8 text-white/60 ml-1" />
                  </view>
                  <text class="text-white/40 text-xs">视频预览区</text>
                </view>
              </view>
              
              <!--   -->
              <view class="v0-btn" 
                @click={() => setIsPlaying(!isPlaying)}
                class="absolute inset-0 flex items-center justify-center"
              >
                {!isPlaying && (
                  <view class="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
                    <Play class="w-8 h-8 text-white ml-1" />
                  </view>
                )}
              </view>
              
              <!--   -->
              <view class="v0-btn" 
                @click={() => setIsMuted(!isMuted)}
                class="absolute top-3 right-3 p-2 rounded-full bg-black/40"
              >
                <template v-if="isMuted">
    VolumeX class="w-4 h-4 text-white" /> : <Volume2 class="w-4 h-4 text-white" />}
              </view>
              
              <!--   -->
              {selectedFilter !== "none" && (
                <view class={`absolute inset-0 pointer-events-none ${
                  selectedFilter === "shuimo" ? "mix-blend-multiply bg-gradient-to-br from-transparent to-slate-300/30" :
                  selectedFilter === "xuanzhi" ? "bg-amber-50/20" :
                  selectedFilter === "guofeng" ? "bg-gradient-to-br from-red-900/10 to-amber-900/10" :
                  selectedFilter === "huaijiu" ? "sepia-[0.3]" :
                  ""
                }`} />
              )}
            </view>
    
            <!--   -->
            <view class="flex items-center justify-around px-4 py-4 border-b border-border">
              <view class="v0-btn" 
                @click={() => setActiveTab(activeTab === "trim" ? null : "trim")}
                class={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "trim" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Scissors class="w-5 h-5" />
                <text class="text-xs">裁剪</text>
              </view>
              <view class="v0-btn" 
                @click={() => setActiveTab(activeTab === "filter" ? null : "filter")}
                class={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "filter" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles class="w-5 h-5" />
                <text class="text-xs">滤镜</text>
              </view>
              <view class="v0-btn" 
                @click={() => setActiveTab(activeTab === "music" ? null : "music")}
                class={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "music" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Music class="w-5 h-5" />
                <text class="text-xs">音乐</text>
              </view>
              <view class="v0-btn" 
                @click={() => setActiveTab(activeTab === "cover" ? null : "cover")}
                class={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "cover" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ImageIcon class="w-5 h-5" />
                <text class="text-xs">封面</text>
              </view>
            </view>
    
            <!--   -->
            {activeTab === "trim" && (
              <view class="px-4 py-4 border-b border-border">
                <text class="text-sm text-muted-foreground mb-3">拖动滑块选择视频片段</text>
                <view class="relative h-12 bg-secondary rounded-lg overflow-hidden">
                  <!--   -->
                  <view class="absolute inset-0 flex">
                    {[...Array(10)].map((_, i) => (
                      <view key={i} class="flex-1 border-r border-border/30 bg-gradient-to-b from-muted-foreground/20 to-muted-foreground/10" />
                    ))}
                  </view>
                  <!--   -->
                  <view 
                    class="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary"
                    :style=" left: `${{ trimStart }}%`, right: `${{ 100 - trimEnd }}%` }}
                  />
                  <!--   -->
                  <view 
                    class="absolute top-0 bottom-0 w-4 bg-primary rounded-l cursor-ew-resize flex items-center justify-center"
                    :style=" left: `${{ trimStart }}%` }}
                  >
                    <view class="w-0.5 h-4 bg-white rounded" />
                  </view>
                  <!--   -->
                  <view 
                    class="absolute top-0 bottom-0 w-4 bg-primary rounded-r cursor-ew-resize flex items-center justify-center"
                    :style=" right: `${{ 100 - trimEnd }}%` }}
                  >
                    <view class="w-0.5 h-4 bg-white rounded" />
                  </view>
                </view>
                <view class="flex justify-between mt-2 text-xs text-muted-foreground">
                  <text>00:00</text>
                  <text>已选 {{ Math.round((trimEnd - trimStart) / 100 * 15) }}秒</text>
                  <text>00:15</text>
                </view>
              </view>
            )}
    
            {activeTab === "filter" && (
              <view class="px-4 py-4 border-b border-border">
                <view class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  
    <view v-for="(filter, index) in filters" :key="index"> (
                    <view class="v0-btn"
                      key={{ filter.id }}
                      @click={() => setSelectedFilter(filter.id)}
                      class="flex-shrink-0 flex flex-col items-center gap-2"
                    >
                      <view class={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedFilter === filter.id ? "border-primary" : "border-transparent"
                      }`}>
                        <view class={`w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center ${
                          filter.id === "shuimo" ? "from-slate-200 to-slate-400" :
                          filter.id === "xuanzhi" ? "from-amber-100 to-amber-200" :
                          filter.id === "guofeng" ? "from-red-100 to-amber-100" :
                          filter.id === "huaijiu" ? "from-yellow-100 to-orange-100" :
                          filter.id === "qingxin" ? "from-green-100 to-cyan-100" :
                          filter.id === "nuanyang" ? "from-orange-100 to-yellow-100" :
                          ""
                        }`}>
                          <Sparkles class="w-5 h-5 text-muted-foreground/40" />
                        </view>
                      </view>
                      <text class={`text-xs ${selectedFilter === filter.id ? "text-primary font-medium" : "text-muted-foreground"}`}>
                        {{ filter.name }}
                      </text>
                    </view>
                  ))}
                </view>
              </view>
            )}
    
            {activeTab === "music" && (
              <view class="px-4 py-4 border-b border-border max-h-48 overflow-y-auto">
                
    <view v-for="(music, index) in musicList" :key="index"> (
                  <view class="v0-btn"
                    key={{ music.id }}
                    @click={() => setSelectedMusic(String(music.id))}
                    class={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedMusic === String(music.id) ? "bg-primary/10" : "hover:bg-secondary"
                    }`}
                  >
                    <view class={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedMusic === String(music.id) ? "bg-primary" : "bg-secondary"
                    }`}>
                      <Music class={`w-5 h-5 ${selectedMusic === String(music.id) ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </view>
                    <view class="flex-1 text-left">
                      <text class={`text-sm ${selectedMusic === String(music.id) ? "text-primary font-medium" : "text-foreground"}`}>
                        {{ music.name }}
                      </text>
                      {music.artist && (
                        <text class="text-xs text-muted-foreground">{{ music.artist }} · {{ music.duration }}</text>
                      )}
                    </view>
                    {selectedMusic === String(music.id) && (
                      <Check class="w-5 h-5 text-primary" />
                    )}
                  </view>
                ))}
              </view>
            )}
    
            {activeTab === "cover" && (
              <view class="px-4 py-4 border-b border-border">
                <text class="text-sm text-muted-foreground mb-3">从视频中选择封面</text>
                <view class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  
    <view v-for="(frame, index) in coverFrames" :key="index"> (
                    <view class="v0-btn"
                      key={{ index }}
                      @click={() => setSelectedCover(index)}
                      class={`flex-shrink-0 w-16 aspect-[9/16] rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedCover === index ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <view class="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                        <text class="text-[10px] text-muted-foreground">{{ index + 1 }}</text>
                      </view>
                    </view>
                  ))}
                  <!--   -->
                  <view class="v0-btn" class="flex-shrink-0 w-16 aspect-[9/16] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                    <Plus class="w-4 h-4 text-muted-foreground" />
                    <text class="text-[10px] text-muted-foreground">上传</text>
                  </view>
                </view>
              </view>
            )}
    
            <!--   -->
            <view class="px-4 py-4 space-y-4">
              <!--   -->
              <view>
                <textarea
                  value={{ title }}
                  @change={(e) => setTitle(e.target.value)}
                  placeholder="添加视频标题和描述，让更多人发现你的作品..."
                  class="w-full h-20 p-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={{ 200 }}
                />
                <text class="text-right text-xs text-muted-foreground mt-1">{{ title.length }}/200</text>
              </view>
    
              <!--   -->
              <view>
                <text class="text-sm font-medium text-foreground mb-2">话题标签</text>
                <view class="flex flex-wrap gap-2 mb-2">
                  
    <view v-for="(topic, index) in topics" :key="index"> (
                    <Badge key={topic} variant="secondary" class="flex items-center gap-1 pl-2 pr-1 py-1">
                      #{{ topic }}
                      <view class="v0-btn" @click={() => removeTopic(topic)} class="p-0.5 rounded hover:bg-background/50">
                        <X class="w-3 h-3" />
                      </view>
                    </Badge>
                  ))}
                  {topics.length < 5 && (
                    <view class="flex items-center gap-1">
                      <text class="text-muted-foreground">#</text>
                      <input
                        type="text"
                        value={{ topicInput }}
                        @change={(e) => setTopicInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTopic(topicInput)}
                        placeholder="添加话题"
                        class="w-20 bg-transparent text-sm focus:outline-none"
                      />
                    </view>
                  )}
                </view>
                <view class="flex flex-wrap gap-2">
                  {hotTopics.filter(t => !topics.includes(t)).slice(0, 4).map(topic => (
                    <view class="v0-btn"
                      key={{ topic }}
                      @click={() => addTopic(topic)}
                      class="px-2 py-1 bg-secondary rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      #{{ topic }}
                    </view>
                  ))}
                </view>
              </view>
    
              <!--   -->
              <view class="v0-btn" class="w-full flex items-center justify-between p-3 bg-secondary rounded-xl">
                <view class="flex items-center gap-3">
                  <MapPin class="w-5 h-5 text-muted-foreground" />
                  <text class="text-sm text-foreground">{location || "添加位置"}</text>
                </view>
                <ChevronRight class="w-4 h-4 text-muted-foreground" />
              </view>
    
              <!--   -->
              <view class="v0-btn" 
                @click={() => setShowCircleSelect(true)}
                class="w-full flex items-center justify-between p-3 bg-secondary rounded-xl"
              >
                <view class="flex items-center gap-3">
                  <Users class="w-5 h-5 text-muted-foreground" />
                  <text class="text-sm text-foreground">
                    {selectedCircle ? selectedCircle.name : "选择发布圈子"}
                  </text>
                </view>
                <ChevronRight class="w-4 h-4 text-muted-foreground" />
              </view>
    
              <!--   -->
              <view class="v0-btn" 
                @click={() => setShowProductSelect(true)}
                class="w-full flex items-center justify-between p-3 bg-secondary rounded-xl"
              >
                <view class="flex items-center gap-3">
                  <ShoppingBag class="w-5 h-5 text-muted-foreground" />
                  <text class="text-sm text-foreground">
                    {linkedProducts.length > 0 ? `已选 ${linkedProducts.length} 件商品` : "关联商品（可选）"}
                  </text>
                </view>
                <ChevronRight class="w-4 h-4 text-muted-foreground" />
              </view>
    
              <!--   -->
              <view class="flex items-center justify-between p-3 bg-secondary rounded-xl">
                <view class="flex items-center gap-3">
                  {visibility === "public" ? (
                    <Eye class="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Lock class="w-5 h-5 text-muted-foreground" />
                  )}
                  <text class="text-sm text-foreground">谁可以看</text>
                </view>
                <view class="flex items-center gap-2">
                  <view class="v0-btn"
                    @click={() => setVisibility("public")}
                    class={`px-3 py-1 rounded-full text-xs transition-colors ${
                      visibility === "public" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                    }`}
                  >
                    公开
                  </view>
                  <view class="v0-btn"
                    @click={() => setVisibility("circle")}
                    class={`px-3 py-1 rounded-full text-xs transition-colors ${
                      visibility === "circle" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                    }`}
                  >
                    仅圈内
                  </view>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 safe-area-pb">
            <view class="v0-btn"
              @click={{ handlePublish }}
              :disabled={{ !title.trim() }}
              class="w-full py-3 bg-primary text-primary-foreground font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-primary/90"
            >
              发布视频
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
const filters = [
const musicList = [
const hotTopics = ["八字命理", "风水布局", "紫微斗数", "每日运势", "国学智慧", "传统文化"]
  const coverFrames = [0, 1, 2, 3, 4, 5, 6, 7]

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