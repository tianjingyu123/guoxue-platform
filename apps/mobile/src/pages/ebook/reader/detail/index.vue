<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">电子书</text>
      <text class="v0-route">V0: ebook/reader/[id]</text>
    </view>
        <view class={cn("min-h-screen transition-colors duration-300", themeConfig[theme].bg)}>
          <!--   -->
          <view 
            class={cn(
              "fixed top-0 left-0 right-0 z-50 transition-transform duration-300",
              showControls ? "translate-y-0" : "-translate-y-full",
              theme === "dark" ? "bg-[#242220]/95" : "bg-white/95",
              "backdrop-blur-sm border-b",
              theme === "dark" ? "border-[#3d3a37]" : "border-gray-200"
            )}
          >
            <view class="flex items-center justify-between px-4 h-14">
              <Link 
                href="/ebook/1" 
                class={cn(
                  "p-1.5 -ml-1.5 rounded-lg transition-all",
                  theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
              >
                <ArrowLeft class="w-5 h-5" />
              </Link>
              
              <text class={cn("font-medium text-sm truncate max-w-[50%]", themeConfig[theme].text)}>
                {{ chapterContent.title }}
              </text>
              
              <view class="flex items-center gap-1">
                <view class="v0-btn" 
                  @click={() => setIsBookmarked(!isBookmarked)}
                  class={cn(
                    "p-2 rounded-lg transition-all",
                    theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"
                  )}
                >
                  {isBookmarked ? (
                    <BookmarkCheck class="w-5 h-5 text-[var(--classics-jing)]" />
                  ) : (
                    <Bookmark class="w-5 h-5" />
                  )}
                </view>
                <view class="v0-btn" 
                  class={cn(
                    "p-2 rounded-lg transition-all",
                    theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"
                  )}
                >
                  <MoreVertical class="w-5 h-5" />
                </view>
              </view>
            </view>
          </view>
          
          <!--   -->
          <view 
            ref={{ contentRef }}
            @click={{ handleContentClick }}
            class="px-5 sm:px-8 md:px-12 lg:px-20 py-20 max-w-3xl mx-auto"
          >
            <view>
              <text 
                class={cn(
                  "font-serif font-bold text-xl sm:text-2xl mb-6 text-center",
                  themeConfig[theme].text
                )}
              >
                {{ chapterContent.title }}
              </text>
              
              <view 
                class={cn(
                  "font-serif whitespace-pre-line",
                  themeConfig[theme].text
                )}
                :style=" 
                  fontSize: `${{ fontSize }}px`,
                  lineHeight: lineHeight,
                }}
              >
                {{ chapterContent.content }}
              </view>
            </view>
            
            <!--   -->
            <view class="flex items-center justify-between mt-12 pt-6 border-t border-[var(--classics-border)]">
              <Button 
                variant="outline" 
                class="gap-1"
                disabled
              >
                <ChevronLeft class="w-4 h-4" />
                上一章
              </Button>
              <text class={cn("text-sm", themeConfig[theme].secondary)}>1 / 7</text>
              <Button 
                variant="outline" 
                class="gap-1"
              >
                下一章
                <ChevronRight class="w-4 h-4" />
              </Button>
            </view>
          </view>
          
          <!--   -->
          <view 
            class={cn(
              "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300",
              showControls ? "translate-y-0" : "translate-y-full",
              theme === "dark" ? "bg-[#242220]/95" : "bg-white/95",
              "backdrop-blur-sm border-t",
              theme === "dark" ? "border-[#3d3a37]" : "border-gray-200"
            )}
          >
            <!--   -->
            <view class="px-4 pt-3">
              <view class="flex items-center gap-3">
                <text class={cn("text-xs w-8", themeConfig[theme].secondary)}>{{ progress }}%</text>
                <Slider
                  value={{ [progress] }}
                  onValueChange={(v) => setProgress(v[0])}
                  max={{ 100 }}
                  step={{ 1 }}
                  class="flex-1"
                />
                <text class={cn("text-xs w-12 text-right", themeConfig[theme].secondary)}>32/320</text>
              </view>
            </view>
            
            <!--   -->
            <view class="flex items-center justify-around py-3">
              <view class="v0-btn" 
                @click={() => { closeAllPanels(); setShowMenu(true); }}
                class={cn(
                  "flex flex-col items-center gap-1 px-4 py-1",
                  themeConfig[theme].secondary
                )}
              >
                <List class="w-5 h-5" />
                <text class="text-[10px]">目录</text>
              </view>
              
              <view class="v0-btn" 
                @click={() => { closeAllPanels(); setShowSettings(true); }}
                class={cn(
                  "flex flex-col items-center gap-1 px-4 py-1",
                  themeConfig[theme].secondary
                )}
              >
                <Settings class="w-5 h-5" />
                <text class="text-[10px]">设置</text>
              </view>
              
              <view class="v0-btn" 
                class={cn(
                  "flex flex-col items-center gap-1 px-4 py-1",
                  themeConfig[theme].secondary
                )}
              >
                <MessageSquare class="w-5 h-5" />
                <text class="text-[10px]">笔记</text>
              </view>
              
              <view class="v0-btn" 
                class={cn(
                  "flex flex-col items-center gap-1 px-4 py-1",
                  themeConfig[theme].secondary
                )}
              >
                <Share2 class="w-5 h-5" />
                <text class="text-[10px]">分享</text>
              </view>
            </view>
          </view>
          
          <!--   -->
          {showMenu && (
            
              <view 
                class="fixed inset-0 bg-black/40 z-50"
                @click={{ closeAllPanels }}
              />
              <view 
                class={cn(
                  "fixed left-0 top-0 bottom-0 w-72 z-50 overflow-y-auto",
                  theme === "dark" ? "bg-[#1a1815]" : "bg-white"
                )}
              >
                <view class={cn(
                  "sticky top-0 px-4 py-4 border-b",
                  theme === "dark" ? "bg-[#1a1815] border-[#3d3a37]" : "bg-white border-gray-200"
                )}>
                  <text class={cn("font-medium", themeConfig[theme].text)}>目录</text>
                </view>
                <view class="py-2">
                  
    <view v-for="(chapter, index) in chapters" :key="index"> (
                    <view class="v0-btn"
                      key={{ chapter.id }}
                      class={cn(
                        "w-full text-left px-4 py-3 text-sm transition-colors",
                        chapter.current 
                          ? "bg-[var(--classics-jing)]/10 text-[var(--classics-jing)] font-medium" 
                          : cn(themeConfig[theme].text, "hover:bg-secondary/50")
                      )}
                      @click={{ closeAllPanels }}
                    >
                      {{ chapter.title }}
                    </view>
                  ))}
                </view>
              </view>
            
          )}
          
          <!--   -->
          {showSettings && (
            
              <view 
                class="fixed inset-0 bg-black/40 z-50"
                @click={{ closeAllPanels }}
              />
              <view 
                class={cn(
                  "fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl",
                  theme === "dark" ? "bg-[#1a1815]" : "bg-white"
                )}
              >
                <view class="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
                <view class="p-5 space-y-5">
                  <!--   -->
                  <view>
                    <text class={cn("text-sm font-medium mb-3", themeConfig[theme].text)}>字体大小</text>
                    <view class="flex items-center gap-4">
                      <view class="v0-btn" 
                        @click={() => setFontSize(Math.max(14, fontSize - 2))}
                        class={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          theme === "dark" ? "bg-white/10" : "bg-gray-100"
                        )}
                      >
                        <Minus class="w-4 h-4" />
                      </view>
                      <view class="flex-1 text-center">
                        <text class={cn("text-lg font-medium", themeConfig[theme].text)}>{{ fontSize }}</text>
                      </view>
                      <view class="v0-btn" 
                        @click={() => setFontSize(Math.min(28, fontSize + 2))}
                        class={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          theme === "dark" ? "bg-white/10" : "bg-gray-100"
                        )}
                      >
                        <Plus class="w-4 h-4" />
                      </view>
                    </view>
                  </view>
                  
                  <!--   -->
                  <view>
                    <text class={cn("text-sm font-medium mb-3", themeConfig[theme].text)}>行间距</text>
                    <view class="flex gap-2">
                      {[1.5, 1.8, 2.0, 2.2].map(lh => (
                        <view class="v0-btn"
                          key={{ lh }}
                          @click={() => setLineHeight(lh)}
                          class={cn(
                            "flex-1 py-2 rounded-lg text-sm transition-all",
                            lineHeight === lh
                              ? "bg-[var(--classics-jing)] text-white"
                              : theme === "dark" ? "bg-white/10" : "bg-gray-100"
                          )}
                        >
                          {{ lh }}
                        </view>
                      ))}
                    </view>
                  </view>
                  
                  <!--   -->
                  <view>
                    <text class={cn("text-sm font-medium mb-3", themeConfig[theme].text)}>阅读主题</text>
                    <view class="flex gap-3">
                      <view class="v0-btn"
                        @click={() => setTheme("light")}
                        class={cn(
                          "flex-1 py-3 rounded-lg flex items-center justify-center gap-2 border-2 transition-all",
                          theme === "light" 
                            ? "border-[var(--classics-jing)] bg-white" 
                            : "border-transparent bg-white"
                        )}
                      >
                        <Sun class="w-4 h-4 text-amber-500" />
                        <text class="text-sm text-gray-800">日间</text>
                      </view>
                      <view class="v0-btn"
                        @click={() => setTheme("sepia")}
                        class={cn(
                          "flex-1 py-3 rounded-lg flex items-center justify-center gap-2 border-2 transition-all",
                          theme === "sepia" 
                            ? "border-[var(--classics-jing)] bg-[#f5f0e5]" 
                            : "border-transparent bg-[#f5f0e5]"
                        )}
                      >
                        <Type class="w-4 h-4 text-[#8b7355]" />
                        <text class="text-sm text-[#5c4a3a]">护眼</text>
                      </view>
                      <view class="v0-btn"
                        @click={() => setTheme("dark")}
                        class={cn(
                          "flex-1 py-3 rounded-lg flex items-center justify-center gap-2 border-2 transition-all",
                          theme === "dark" 
                            ? "border-[var(--classics-jing)] bg-[#1a1815]" 
                            : "border-transparent bg-[#1a1815]"
                        )}
                      >
                        <Moon class="w-4 h-4 text-gray-400" />
                        <text class="text-sm text-gray-300">夜间</text>
                      </view>
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
const chapterContent = {
const chapters = [
  const themeConfig = {

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