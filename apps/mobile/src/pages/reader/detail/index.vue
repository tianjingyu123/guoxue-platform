<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">reader</text>
      <text class="v0-route">V0: reader/[id]</text>
    </view>
        <view class={cn("min-h-screen flex flex-col", currentTheme.bg)}>
          <!--   -->
          {showHeader && (
            <view class="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 safe-area-pt">
              <view class="max-w-3xl mx-auto flex items-center justify-between">
                <view class="flex items-center gap-3">
                  <Link href="/">
                    <Button variant="ghost" size="icon" class="w-9 h-9">
                      <ChevronLeft class="w-5 h-5" />
                    </Button>
                  </Link>
                  <view>
                    <text class="font-serif font-medium text-foreground">{{ bookContent.title }}</text>
                    <text class="text-xs text-muted-foreground">阅读进度 {{ progress }}%</text>
                  </view>
                </view>
                <view class="flex items-center gap-1">
                  <Button variant="ghost" size="icon" class={cn("w-9 h-9", showAudioPlayer && "text-primary")} @click={() => setShowAudioPlayer(!showAudioPlayer)}>
                    <Headphones class="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" class={cn("w-9 h-9", showAIChat && "text-purple-500")} @click={() => setShowAIChat(!showAIChat)}>
                    <Sparkles class="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" class="w-9 h-9">
                    <Bookmark class="w-5 h-5" />
                  </Button>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showAudioPlayer && (
            <view class="fixed top-[60px] left-0 right-0 z-40 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 shadow-lg">
              <view class="max-w-3xl mx-auto">
                <view class="flex items-center gap-3">
                  <view class="v0-btn" @click={() => setIsPlaying(!isPlaying)} class="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <template v-if="isPlaying">
    PauseCircle class="w-6 h-6" /> : <PlayCircle class="w-6 h-6" />}
                  </view>
                  <view class="flex-1 min-w-0">
                    <text class="text-xs font-medium truncate mb-1">卷一·论五行生克</text>
                    <view class="flex items-center gap-2">
                      <text class="text-[10px] opacity-80">02:34</text>
                      <view class="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <view class="h-full w-1/3 bg-white rounded-full" />
                      </view>
                      <text class="text-[10px] opacity-80">08:15</text>
                    </view>
                  </view>
                  <view class="v0-btn" @click={() => setPlaybackSpeed(playbackSpeed >= 2 ? 0.5 : playbackSpeed + 0.25)} class="px-2 py-1 text-xs bg-white/20 rounded flex-shrink-0">
                    {{ playbackSpeed }}x
                  </view>
                  <view class="v0-btn" @click={() => setShowAudioPlayer(false)} class="p-1 flex-shrink-0">
                    <X class="w-4 h-4" />
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showAIChat && (
            <view class="fixed inset-0 z-50 bg-black/50" @click={() => setShowAIChat(false)}>
              <view class="absolute bottom-0 left-0 right-0 h-[70vh] bg-card rounded-t-2xl flex flex-col" @click={e => e.stopPropagation()}>
                <view class="flex items-center justify-between p-4 border-b border-border">
                  <view class="flex items-center gap-2">
                    <view class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                      <Sparkles class="w-4 h-4 text-white" />
                    </view>
                    <view>
                      <text class="font-medium text-sm">古籍智能助手</text>
                      <text class="text-[10px] text-muted-foreground">AI解读 · 白话翻译 · 智能问答</text>
                    </view>
                  </view>
                  <view class="v0-btn" @click={() => setShowAIChat(false)}><X class="w-5 h-5" /></view>
                </view>
                <view class="flex-1 overflow-y-auto p-4 space-y-3">
                  
    <view v-for="(msg, idx) in aiMessages" :key="idx"> (
                    <view key={idx} class={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
                      {msg.role === "ai" && (
                        <view class="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex-shrink-0 flex items-center justify-center">
                          <Sparkles class="w-3.5 h-3.5 text-white" />
                        </view>
                      )}
                      <view class={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                        <text class="whitespace-pre-line">{{ msg.content }}</text>
                      </view>
                    </view>
                  ))}
                </view>
                <view class="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-t border-border">
                  {["翻译本章", "解释五行", "总结要点", "提出问题"].map(q => (
                    <view class="v0-btn" key={{ q }} @click={() => setAiInput(q)} class="flex-shrink-0 px-3 py-1.5 bg-secondary rounded-full text-xs hover:bg-secondary/80">
                      {{ q }}
                    </view>
                  ))}
                </view>
                <view class="p-4 border-t border-border">
                  <view class="flex gap-2">
                    <input
                      type="text"
                      value={{ aiInput }}
                      @change={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendAIMessage()}
                      placeholder="问我任何关于本书的问题..."
                      class="flex-1 h-10 px-4 bg-secondary rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <view class="v0-btn" @click={{ sendAIMessage }} class="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Send class="w-4 h-4" />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          <view 
            class={cn(
              "flex-1 px-4 md:px-8 py-20 max-w-3xl mx-auto w-full",
              showHeader ? "pt-24" : "pt-8",
              isVertical && "h-screen overflow-x-auto"
            )}
            @click={() => {
              setShowHeader(!showHeader)
              if (showMenu) setShowMenu(false)
            }}
            onMouseUp={{ handleTextSelect }}
          >
            <view 
              class={cn(
                "font-serif leading-relaxed reader-selection",
                currentTheme.text,
                isVertical && "vertical-text h-full"
              )}
              :style=" 
                fontSize: `${{ fontSize }}px`, 
                lineHeight: lineHeight,
              }}
            >
              <text class="text-xl font-bold mb-6 text-center">卷一·论五行生克</text>
              {bookContent.content.split('\n\n').map((paragraph, index) => (
                <text key={{ index }} class="mb-4 text-justify indent-8">
                  {{ paragraph }}
                </text>
              ))}
            </view>
    
            <!--   -->
            {showTranslation && (
              <view class="mt-8 p-4 bg-secondary/50 rounded-lg border border-border">
                <view class="flex items-center justify-between mb-3">
                  <Badge variant="secondary" class="bg-primary/20 text-primary">AI白话翻译</Badge>
                  <Button variant="ghost" size="icon" class="w-7 h-7" @click={() => setShowTranslation(false)}>
                    <X class="w-4 h-4" />
                  </Button>
                </view>
                <text class="text-sm text-muted-foreground leading-relaxed">
                  所谓五行，就是金、木、水、火、土这五种基本元素。它们相互生成的规律是：金生水，水生木，木生火，火生土，土生金。它们相互克制的规律是：金克木，木克土，土克水，水克火，火克金。
                </text>
              </view>
            )}
          </view>
    
          <!--   -->
          {showTextMenu && selectedText && (
            <view class="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-xl p-2 flex items-center gap-1">
              <Button variant="ghost" size="sm" class="h-9 px-3 gap-2">
                <Highlighter class="w-4 h-4 text-yellow-500" />
                <text class="text-xs">划线</text>
              </Button>
              <Button variant="ghost" size="sm" class="h-9 px-3 gap-2">
                <PenLine class="w-4 h-4 text-primary" />
                <text class="text-xs">笔记</text>
              </Button>
              <Button variant="ghost" size="sm" class="h-9 px-3 gap-2">
                <Search class="w-4 h-4 text-accent" />
                <text class="text-xs">查词</text>
              </Button>
              <Button variant="ghost" size="sm" class="h-9 px-3 gap-2">
                <MessageSquare class="w-4 h-4 text-blue-400" />
                <text class="text-xs">翻译</text>
              </Button>
              <Button variant="ghost" size="sm" class="h-9 px-3 gap-2">
                <Copy class="w-4 h-4" />
                <text class="text-xs">复制</text>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                class="w-7 h-7 ml-1"
                @click={() => { setShowTextMenu(false); setSelectedText("") }}
              >
                <X class="w-4 h-4" />
              </Button>
            </view>
          )}
    
          <!--   -->
          <view class="v0-btn" 
            @click={(e) => { e.stopPropagation(); setShowAITools(!showAITools) }}
            class="fixed bottom-24 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center z-40"
          >
            <BookOpen class="w-5 h-5" />
          </view>
    
          <!--   -->
          {showAITools && (
            <view class="fixed bottom-40 right-4 z-50 bg-card border border-border rounded-xl shadow-xl p-3 w-48">
              <view class="grid grid-cols-2 gap-2">
                {[
                  { icon: MessageSquare, label: "文白翻译", action: () => setShowTranslation(true) },
                  { icon: Search, label: "智能查词" },
                  { icon: Type, label: "一键句读" },
                  { icon: Users, label: "人物图谱" },
                  { icon: Volume2, label: "AI听书" },
                ].map((tool) => (
                  <view class="v0-btn" 
                    key={{ tool.label }}
                    @click={() => { tool.action?.(); setShowAITools(false) }}
                    class="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <tool.icon class="w-5 h-5 text-primary" />
                    <text class="text-xs text-foreground">{{ tool.label }}</text>
                  </view>
                ))}
              </view>
            </view>
          )}
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="max-w-3xl mx-auto flex items-center justify-around h-14">
              <view class="v0-btn" 
                @click={(e) => { e.stopPropagation(); setShowChapters(!showChapters); setShowSettings(false); setShowBookmarks(false); setShowNotes(false) }}
                class={cn("flex flex-col items-center gap-0.5 p-2", showChapters && "text-primary")}
              >
                <List class="w-5 h-5" />
                <text class="text-[10px]">目录</text>
              </view>
              <view class="v0-btn" 
                @click={(e) => { e.stopPropagation(); setShowBookmarks(!showBookmarks); setShowSettings(false); setShowChapters(false); setShowNotes(false) }}
                class={cn("flex flex-col items-center gap-0.5 p-2", showBookmarks && "text-primary")}
              >
                <Bookmark class="w-5 h-5" />
                <text class="text-[10px]">书签</text>
              </view>
              <view class="v0-btn" 
                @click={(e) => { e.stopPropagation(); setShowNotes(!showNotes); setShowSettings(false); setShowChapters(false); setShowBookmarks(false) }}
                class={cn("flex flex-col items-center gap-0.5 p-2", showNotes && "text-primary")}
              >
                <PenLine class="w-5 h-5" />
                <text class="text-[10px]">笔记</text>
              </view>
              <view class="v0-btn" 
                @click={(e) => { e.stopPropagation(); setTheme(theme === 'dark' ? 'paper' : 'dark') }}
                class="flex flex-col items-center gap-0.5 p-2"
              >
                {theme === 'dark' ? <Sun class="w-5 h-5" /> : <Moon class="w-5 h-5" />}
                <text class="text-[10px]">{theme === 'dark' ? '日间' : '夜间'}</text>
              </view>
              <view class="v0-btn" 
                @click={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setShowChapters(false); setShowBookmarks(false); setShowNotes(false) }}
                class={cn("flex flex-col items-center gap-0.5 p-2", showSettings && "text-primary")}
              >
                <Settings class="w-5 h-5" />
                <text class="text-[10px]">设置</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          {showChapters && (
            <view class="fixed bottom-14 left-0 right-0 z-40 bg-card border-t border-border max-h-[60vh] overflow-y-auto safe-area-pb">
              <view class="max-w-3xl mx-auto p-4">
                <text class="font-medium text-foreground mb-3">章节目录</text>
                <view class="space-y-1">
                  {bookContent.chapters.map((chapter) => (
                    <view class="v0-btn" 
                      key={{ chapter.id }}
                      class={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                        chapter.current 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {{ chapter.title }}
                      {chapter.current && <Badge variant="secondary" class="ml-2 text-[10px]">当前</Badge>}
                    </view>
                  ))}
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showBookmarks && (
            <view class="fixed bottom-14 left-0 right-0 z-40 bg-card border-t border-border max-h-[60vh] overflow-y-auto safe-area-pb">
              <view class="max-w-3xl mx-auto p-4">
                <text class="font-medium text-foreground mb-3">我的书签</text>
                {bookmarks.length > 0 ? (
                  <view class="space-y-2">
                    
    <view v-for="(bookmark, index) in bookmarks" :key="index"> (
                      <view key={bookmark.id} class="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                        <Bookmark class="w-4 h-4 text-primary mt-0.5" />
                        <view class="flex-1">
                          <text class="text-sm font-medium text-foreground">{{ bookmark.chapter }}</text>
                          <text class="text-xs text-muted-foreground">{{ bookmark.position }}</text>
                          {bookmark.note && <text class="text-xs text-accent mt-1">{{ bookmark.note }}</text>}
                        </view>
                      </view>
                    ))}
                  </view>
                ) : (
                  <text class="text-sm text-muted-foreground text-center py-8">暂无书签</text>
                )}
              </view>
            </view>
          )}
    
          <!--   -->
          {showNotes && (
            <view class="fixed bottom-14 left-0 right-0 z-40 bg-card border-t border-border max-h-[60vh] overflow-y-auto safe-area-pb">
              <view class="max-w-3xl mx-auto p-4">
                <text class="font-medium text-foreground mb-3">划线与笔记</text>
                {notes.length > 0 ? (
                  <view class="space-y-2">
                    
    <view v-for="(note, index) in notes" :key="index"> (
                      <view key={note.id} class="p-3 rounded-lg bg-secondary/50">
                        <text class={cn(
                          "text-sm font-medium",
                          note.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-200' : 'bg-green-500/20 text-green-200',
                          "px-1 rounded inline"
                        )}>
                          {{ note.text }}
                        </text>
                        <text class="text-xs text-muted-foreground mt-2">{{ note.note }}</text>
                      </view>
                    ))}
                  </view>
                ) : (
                  <text class="text-sm text-muted-foreground text-center py-8">暂无笔记</text>
                )}
              </view>
            </view>
          )}
    
          <!--   -->
          {showSettings && (
            <view class="fixed bottom-14 left-0 right-0 z-40 bg-card border-t border-border safe-area-pb">
              <view class="max-w-3xl mx-auto p-4 space-y-5">
                <!--   -->
                <view>
                  <text class="text-xs text-muted-foreground mb-2">背景主题</text>
                  <view class="flex gap-2">
                    
    <view v-for="(t, index) in themes" :key="index"> (
                      <view class="v0-btn"
                        key={{ t.id }}
                        @click={() => setTheme(t.id)}
                        class={cn(
                          "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                          t.bg,
                          t.text,
                          theme === t.id ? "ring-2 ring-primary" : "opacity-70"
                        )}
                      >
                        {{ t.name }}
                      </view>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                <view>
                  <text class="text-xs text-muted-foreground mb-2">字号</text>
                  <view class="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="icon"
                      @click={() => setFontSize(Math.max(14, fontSize - 2))}
                    >
                      <Minus class="w-4 h-4" />
                    </Button>
                    <view class="flex-1 h-2 bg-secondary rounded-full relative">
                      <view 
                        class="absolute left-0 top-0 h-full bg-primary rounded-full"
                        :style=" width: `${{ ((fontSize - 14) / 12) * 100 }}%` }}
                      />
                    </view>
                    <Button 
                      variant="outline" 
                      size="icon"
                      @click={() => setFontSize(Math.min(26, fontSize + 2))}
                    >
                      <Plus class="w-4 h-4" />
                    </Button>
                    <text class="text-sm text-muted-foreground w-8">{{ fontSize }}</text>
                  </view>
                </view>
    
                <!--   -->
                <view>
                  <text class="text-xs text-muted-foreground mb-2">行距</text>
                  <view class="flex gap-2">
                    {[1.5, 1.8, 2, 2.2].map((h) => (
                      <view class="v0-btn"
                        key={{ h }}
                        @click={() => setLineHeight(h)}
                        class={cn(
                          "flex-1 py-2 rounded-lg text-sm border transition-all",
                          lineHeight === h 
                            ? "border-primary bg-primary/10 text-primary" 
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {{ h }}
                      </view>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between">
                  <text class="text-sm text-foreground">竖排阅读</text>
                  <view class="v0-btn"
                    @click={() => setIsVertical(!isVertical)}
                    class={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      isVertical ? "bg-primary" : "bg-secondary"
                    )}
                  >
                    <view class={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                      isVertical ? "right-1" : "left-1"
                    )} />
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
const bookContent = {
const themes: { id: ThemeType; name: string; bg: string; text: string }[] = [
  const bookmarks = [
  const notes = [

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