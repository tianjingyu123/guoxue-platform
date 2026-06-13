<template>
  <view class="min-h-screen bg-background pb-20 sm:pb-6">
    <!-- 顶部导航 - 沉浸式古风设计 -->
    <header class="sticky top-0 z-50 bg-gradient-to-b from-[#f5f0e6] to-[#faf8f5] backdrop-blur-sm">
      <view class="flex items-center justify-between px-4 sm:px-6 h-12 sm:h-14 max-w-screen-xl mx-auto">
        <view @click="goBack" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm active:scale-95 transition-transform" aria-label="返回">
          <!-- ArrowLeft -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </view>
        <view class="flex items-center gap-1.5 sm:gap-2">
          <!-- Library -->
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/><path d="M8 11h6"/></svg>
          <text class="font-serif text-base sm:text-lg font-bold text-amber-900">古籍馆</text>
        </view>
        <view class="flex items-center gap-1">
          <view @click="goTo('/pages/classics/search')" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm active:scale-95 transition-transform" aria-label="搜索">
            <!-- Search -->
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </view>
          <view @click="goTo('/pages/classics/ai-assistant')" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full classics-ai-btn flex items-center justify-center shadow-sm active:scale-95 transition-transform" aria-label="AI助手">
            <!-- Sparkles -->
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M18 15l-1.5 3L21 19l-3 1.5L18 24l-1.5-3L12 19l3-1.5 1.5-3z"/></svg>
          </view>
        </view>
      </view>
    </header>

    <!-- 加载骨架 -->
    <main v-if="isLoading" class="max-w-screen-xl mx-auto p-4">
      <view class="animate-pulse space-y-4">
        <!-- 顶部骨架 -->
        <view class="sticky top-0 z-40 bg-white border-b border-border">
          <view class="flex items-center gap-3 px-4 h-14">
            <view class="w-8 h-8 rounded bg-secondary animate-pulse" />
            <view class="h-5 bg-secondary rounded w-16 animate-pulse" />
            <view class="flex-1" />
            <view class="w-8 h-8 rounded bg-secondary animate-pulse" />
            <view class="w-8 h-8 rounded bg-secondary animate-pulse" />
          </view>
        </view>
        <!-- 继续阅读骨架 -->
        <view class="px-4 py-4">
          <view class="h-4 bg-secondary rounded w-20 mb-3 animate-pulse" />
          <view class="flex gap-3 overflow-x-auto pb-1">
            <view v-for="i in 4" :key="i" class="flex-shrink-0 w-24">
              <view class="aspect-[3/4] rounded-lg bg-secondary animate-pulse" />
              <view class="mt-2 space-y-1">
                <view class="h-3 bg-secondary rounded w-full animate-pulse" />
                <view class="h-2.5 bg-secondary/60 rounded w-2/3 mx-auto animate-pulse" />
              </view>
            </view>
          </view>
        </view>
        <!-- 阅读统计骨架 -->
        <view class="px-4 pb-4">
          <view class="flex items-center gap-4 p-4 bg-white rounded-xl border border-border/60">
            <view class="flex-1 space-y-2">
              <view class="h-4 bg-secondary rounded w-20 animate-pulse" />
              <view class="h-8 bg-secondary rounded w-16 animate-pulse" />
            </view>
            <view class="flex gap-1">
              <view v-for="i in 7" :key="i" class="flex flex-col items-center gap-1">
                <view class="w-6 h-6 rounded bg-secondary animate-pulse" />
                <view class="h-2 bg-secondary/60 rounded w-3 animate-pulse" />
              </view>
            </view>
          </view>
        </view>
        <!-- 分类骨架 -->
        <view class="px-4 pb-4">
          <view class="grid grid-cols-4 gap-2">
            <view v-for="i in 4" :key="i" class="py-3 px-2 rounded-xl bg-secondary animate-pulse">
              <view class="w-5 h-5 bg-secondary/80 rounded mx-auto mb-1" />
              <view class="h-3 bg-secondary/80 rounded w-8 mx-auto mb-1" />
              <view class="h-2 bg-secondary/40 rounded w-12 mx-auto" />
            </view>
          </view>
        </view>
        <!-- 排行榜骨架 -->
        <view class="px-4 pb-4 space-y-2">
          <view v-for="i in 8" :key="i" class="flex items-center gap-3 p-2">
            <view class="w-6 h-6 rounded bg-secondary animate-pulse flex-shrink-0" />
            <view class="w-10 h-14 rounded bg-secondary animate-pulse flex-shrink-0" />
            <view class="flex-1 space-y-1.5">
              <view class="h-4 bg-secondary rounded w-3/4 animate-pulse" />
              <view class="h-3 bg-secondary/60 rounded w-1/2 animate-pulse" />
            </view>
          </view>
        </view>
      </view>
    </main>

    <!-- 主内容 -->
    <main v-else class="max-w-screen-xl mx-auto">
      <!-- 继续阅读 -->
      <section v-if="continueReadingData.length > 0" class="px-4 sm:px-6 pt-4 pb-2">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-1.5 sm:gap-2">
            <!-- BookOpen -->
            <svg class="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <text class="font-medium text-sm sm:text-base">继续阅读</text>
          </view>
          <view @click="goTo('/pages/classics/bookshelf')" class="text-xs sm:text-sm text-muted-foreground flex items-center active:opacity-70">
            <text>全部</text><text class="ml-0.5">›</text>
          </view>
        </view>
        <scroll-view scroll-x class="flex gap-3 sm:gap-4 pb-2" show-scrollbar="false">
          <view class="flex gap-3 sm:gap-4">
            <view v-for="book in continueReadingData" :key="book.id" @click="goTo('/pages/reader/' + book.id)" class="flex-shrink-0 touch-manipulation">
              <view class="w-[100px] sm:w-[120px] md:w-[140px] bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-border/40 shadow-sm active:scale-[0.98] transition-all">
                <!-- 封面区 -->
                <view class="p-2 sm:p-3 pb-0 flex justify-center">
                  <view :class="['w-14 h-[75px] sm:w-16 sm:h-[85px] rounded-[2px] overflow-hidden relative shadow-[2px_3px_8px_rgba(100,80,50,0.2)] border border-[#d0c0a0]/50', getCoverBg(book.coverColor)]">
                    <!-- 纸张纹理 -->
                    <view class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;)" />
                    <!-- 书脊 -->
                    <view class="absolute left-0 top-0 bottom-0 w-2 sm:w-2.5 bg-[#d4c4a8]">
                      <view class="absolute inset-y-2 left-1/2 -translate-x-1/2 flex flex-col justify-between">
                        <view v-for="i in 5" :key="i" class="w-0.5 h-0.5 rounded-full bg-[#3d3020]/25" />
                      </view>
                    </view>
                    <!-- 竖排书名 -->
                    <view class="absolute inset-0 left-2 sm:left-2.5 flex items-center justify-center">
                      <view class="writing-vertical-rl">
                        <text v-for="(char, i) in book.title.slice(0, 4).split('')" :key="i" class="text-[10px] sm:text-xs font-serif font-bold text-[#3d3225]">{{ char }}</text>
                      </view>
                    </view>
                  </view>
                </view>
                <!-- 信息区 -->
                <view class="p-2 sm:p-3 pt-2 space-y-1">
                  <text class="text-xs sm:text-sm font-medium truncate block text-center">{{ book.title }}</text>
                  <text class="text-[10px] sm:text-[11px] text-muted-foreground truncate block text-center">{{ book.dynasty }}·{{ book.author }}</text>
                  <!-- 进度条 -->
                  <view class="pt-1">
                    <view class="h-1 bg-secondary rounded-full overflow-hidden">
                      <view class="h-full bg-primary rounded-full transition-all" :style="{width: book.progress + '%'}" />
                    </view>
                    <text class="text-[9px] sm:text-[10px] text-primary block text-center mt-1">已读 {{ book.progress }}%</text>
                  </view>
                </view>
              </view>
            </view>
            <!-- 我的书架入口 -->
            <view @click="goTo('/pages/classics/bookshelf')" class="flex-shrink-0 touch-manipulation">
              <view class="w-[100px] sm:w-[120px] md:w-[140px] h-full min-h-[180px] rounded-xl sm:rounded-2xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1.5 text-muted-foreground active:border-primary/50 active:text-primary transition-colors">
                <!-- BookMarked -->
                <svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
                <text class="text-xs sm:text-sm">我的书架</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </section>

      <!-- 阅读统计卡片 -->
      <section class="px-4 sm:px-6 py-3">
        <view class="bg-white rounded-xl border border-border/60 p-4">
          <!-- 本周阅读 + 日历 -->
          <view class="flex items-center justify-between mb-3">
            <view>
              <text class="text-xs text-muted-foreground mb-1 block">本周阅读</text>
              <view class="flex items-baseline gap-1">
                <text class="text-2xl font-bold text-foreground">{{ readingStatsData.totalMinutes }}</text>
                <text class="text-sm text-muted-foreground">分钟</text>
              </view>
            </view>
            <!-- 7天打卡日历 -->
            <view class="flex gap-1.5">
              <view v-for="(day, index) in weekDays" :key="day" class="flex flex-col items-center gap-1">
                <view :class="['w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors', (readingStatsData.calendarData[index]?.hasRead ?? false) ? 'bg-amber-500 text-white' : 'bg-secondary text-muted-foreground']">
                  <text v-if="readingStatsData.calendarData[index]?.hasRead" class="text-white">
                    <!-- Check -->
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </text>
                  <text v-else class="text-xs">{{ day }}</text>
                </view>
                <text class="text-[10px] text-muted-foreground">{{ day }}</text>
              </view>
            </view>
          </view>

          <!-- 今日目标进度 -->
          <view class="mb-3 p-2.5 rounded-lg bg-secondary/50">
            <view class="flex items-center justify-between mb-1.5">
              <view class="flex items-center gap-1.5">
                <!-- Target -->
                <svg class="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                <text class="text-xs text-muted-foreground">今日目标</text>
              </view>
              <text class="text-xs font-medium">
                <text>{{ readingStatsData.todayMinutes }}/{{ readingStatsData.dailyGoal }}分钟</text>
                <text v-if="readingStatsData.todayMinutes >= readingStatsData.dailyGoal" class="ml-1 text-emerald-600">已达成!</text>
              </text>
            </view>
            <view class="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <view :class="['h-full rounded-full transition-all duration-500', goalReached ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-600']" :style="{width: goalProgress + '%'}" />
            </view>
          </view>

          <view class="flex items-center gap-6 text-sm">
            <text>
              <text class="text-muted-foreground">已读 </text>
              <text class="font-medium text-foreground">{{ readingStatsData.totalBooks }}</text>
              <text class="text-muted-foreground"> 本</text>
            </text>
            <view class="flex items-center gap-1">
              <!-- Flame -->
              <svg class="w-3.5 h-3.5 text-orange-500" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              <text class="text-muted-foreground">连续 </text>
              <text class="font-medium text-amber-600">{{ readingStatsData.streak }}</text>
              <text class="text-muted-foreground"> 天</text>
            </view>
          </view>
        </view>
      </section>

      <!-- 四库分类 -->
      <section class="px-4 sm:px-6 py-3">
        <view class="grid grid-cols-4 gap-2 sm:gap-3">
          <view v-for="cat in categoryNav" :key="cat.id" @click="toggleCategory(cat.id)" :class="['relative py-3 sm:py-4 px-2 rounded-xl text-center transition-all duration-200 touch-manipulation', activeCategory === cat.id ? 'shadow-lg scale-[1.02]' : 'active:scale-[0.98]']" :style="{ backgroundColor: activeCategory === cat.id ? cat.color : cat.lightColor, color: activeCategory === cat.id ? '#fff' : cat.color }">
            <!-- 分类图标 -->
            <view v-html="cat.icon" class="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1" :style="{ color: activeCategory === cat.id ? '#fff' : cat.color }" />
            <text class="text-xs sm:text-sm font-medium block">{{ cat.name }}</text>
            <text :class="['text-[10px] sm:text-xs mt-0.5 block', activeCategory === cat.id ? 'text-white/80' : 'opacity-70']">{{ cat.desc }}</text>
          </view>
        </view>
      </section>

      <!-- 专题书单 -->
      <section class="py-3">
        <view class="flex items-center justify-between px-4 sm:px-6 mb-3">
          <view class="flex items-center gap-1.5 sm:gap-2">
            <!-- BookMarked -->
            <svg class="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
            <text class="font-medium text-sm sm:text-base">经典书单</text>
          </view>
          <view @click="goTo('/pages/classics/collections')" class="text-xs sm:text-sm text-muted-foreground flex items-center active:opacity-70">
            <text>更多</text><text class="ml-0.5">›</text>
          </view>
        </view>
        <scroll-view scroll-x class="pb-2" show-scrollbar="false">
          <view class="flex gap-3 sm:gap-4 px-4 sm:px-6">
            <view v-for="list in bookLists" :key="list.id" @click="goTo('/pages/classics/collection/' + list.id)" class="flex-shrink-0 touch-manipulation active:scale-[0.99] transition-all">
              <view class="w-60 sm:w-72 md:w-80 overflow-hidden bg-white rounded-xl border border-border/50 hover:shadow-lg transition-all">
                <!-- 封面区域 -->
                <view :class="['h-20 sm:h-24 p-3 sm:p-4 border-b border-border/30', getCategoryBg(list.category)]">
                  <text :class="['font-serif font-bold text-sm sm:text-base', getCategoryText(list.category)]">{{ list.title }}</text>
                  <text class="text-[11px] sm:text-xs text-muted-foreground block mt-0.5">{{ list.desc }}</text>
                  <text class="bg-white/80 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded mt-1.5 sm:mt-2 inline-block">{{ list.count }}本</text>
                </view>
                <!-- 书籍预览 -->
                <view class="p-2.5 sm:p-3 flex items-center bg-white">
                  <view class="flex -space-x-1.5 sm:-space-x-2">
                    <view v-for="(book, i) in list.books.slice(0, 4)" :key="i" class="w-7 h-10 sm:w-8 sm:h-11 rounded-[2px] flex items-center justify-center shadow-sm border-2 border-white relative overflow-hidden bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0]">
                      <view class="absolute left-0 top-0 bottom-0 w-1 bg-[#d4c4a8]/30" />
                      <text class="text-[7px] sm:text-[8px] font-serif font-bold text-[#3d3225] ml-0.5">{{ book.slice(0, 2) }}</text>
                    </view>
                  </view>
                  <text class="text-muted-foreground ml-auto text-lg">›</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </section>

      <!-- 推荐榜 / 热度榜 -->
      <section class="py-3">
        <view class="flex items-center justify-between px-4 sm:px-6 mb-3">
          <view class="flex items-center gap-3 sm:gap-4">
            <text @click="rankingTab = 'recommend'" :class="['flex items-center gap-1 sm:gap-1.5 font-medium text-sm sm:text-base transition-colors', rankingTab === 'recommend' ? 'text-foreground' : 'text-muted-foreground']">
              <text class="font-serif">《推荐榜》</text>
            </text>
            <text @click="rankingTab = 'hot'" :class="['flex items-center gap-1 sm:gap-1.5 font-medium text-sm sm:text-base transition-colors', rankingTab === 'hot' ? 'text-foreground' : 'text-muted-foreground']">
              热度榜
            </text>
          </view>
          <view @click="goTo('/pages/classics/ranking')" class="text-xs sm:text-sm text-muted-foreground flex items-center active:opacity-70">
            <text>更多</text><text class="ml-0.5">›</text>
          </view>
        </view>

        <!-- 14种类型筛选 -->
        <view class="px-4 sm:px-6 mb-3">
          <scroll-view scroll-x class="flex gap-2 py-1" show-scrollbar="false">
            <view class="flex gap-2">
              <text v-for="t in typeFilters" :key="t.id" @click="activeType = t.id" :class="['flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors', activeType === t.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground active:bg-secondary/80']">
                {{ t.name }}
              </text>
            </view>
          </scroll-view>
        </view>

        <!-- 双列排行 -->
        <view class="px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1 sm:gap-y-2">
          <view v-for="(book, index) in rankingData.slice(0, 8)" :key="book.id" @click="goTo('/pages/classics/' + book.id)" class="flex items-center gap-2 sm:gap-3 py-2 sm:py-2.5 hover:bg-white/50 rounded-lg px-1 sm:px-2 -mx-1 sm:-mx-2 transition-colors touch-manipulation active:bg-white">
            <!-- 排名数字 -->
            <text :class="['w-4 sm:w-5 text-xs sm:text-sm font-bold tabular-nums text-center flex-shrink-0', index < 3 ? 'text-primary' : 'text-muted-foreground']">{{ index + 1 }}</text>
            <!-- 古书封面 -->
            <view class="w-9 h-12 sm:w-10 sm:h-[52px] rounded-[2px] overflow-hidden relative flex-shrink-0 shadow-sm border border-[#d0c0a0]/40 bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0]">
              <view class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#d4c4a8]">
                <view class="absolute inset-y-1.5 left-1/2 -translate-x-1/2 flex flex-col justify-between">
                  <view v-for="i in 4" :key="i" class="w-0.5 h-0.5 rounded-full bg-[#3d3020]/25" />
                </view>
              </view>
              <view class="absolute inset-0 left-1.5 flex items-center justify-center">
                <view class="writing-vertical-rl">
                  <text v-for="(char, i) in book.title.slice(0, 3).split('')" :key="i" class="text-[8px] font-serif font-bold text-[#3d3225]">{{ char }}</text>
                </view>
              </view>
            </view>
            <!-- 书籍信息 -->
            <view class="flex-1 min-w-0">
              <text class="text-sm sm:text-base font-medium truncate block">{{ book.title }}</text>
              <text class="text-[10px] sm:text-[11px] text-muted-foreground truncate block">{{ book.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 换一换按钮 -->
        <view class="px-4 sm:px-6 mt-2">
          <view @click="handleRefreshRanking" class="w-full py-2 sm:py-2.5 text-sm text-muted-foreground border border-border/60 rounded-lg flex items-center justify-center gap-1.5 active:scale-[0.99] active:bg-white transition-colors">
            <!-- RefreshCw -->
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            <text>换一换</text>
          </view>
        </view>
      </section>

      <!-- 播客讲书 -->
      <section class="py-3">
        <view class="flex items-center justify-between px-4 sm:px-6 mb-3">
          <view class="flex items-center gap-1.5 sm:gap-2">
            <!-- Headphones -->
            <svg class="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
            <text class="font-medium text-sm sm:text-base">播客讲书</text>
            <text class="text-[10px] sm:text-xs text-muted-foreground">轻松听播客，不用啃厚书</text>
          </view>
          <view @click="goTo('/pages/classics/audiobooks')" class="text-xs sm:text-sm text-muted-foreground flex items-center active:opacity-70">
            <text>更多</text><text class="ml-0.5">›</text>
          </view>
        </view>
        <scroll-view scroll-x class="pb-2" show-scrollbar="false">
          <view class="flex gap-3 sm:gap-4 px-4 sm:px-6">
            <view v-for="ab in audioBooks" :key="ab.id" @click="goTo('/pages/classics/' + ab.id + '/audio')" class="flex-shrink-0 touch-manipulation active:scale-[0.99] transition-all">
              <view class="flex gap-3 w-64 sm:w-72 md:w-80 p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-border/50 hover:shadow-md transition-all">
                <!-- 古书封面 -->
                <view class="w-14 h-[75px] sm:w-16 sm:h-[85px] rounded-[2px] overflow-hidden relative flex-shrink-0 shadow-[2px_3px_8px_rgba(100,80,50,0.15)] bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0] border border-[#d0c0a0]/50">
                  <view class="absolute left-0 top-0 bottom-0 w-2 sm:w-2.5 bg-[#d4c4a8]">
                    <view class="absolute inset-y-2 left-1/2 -translate-x-1/2 flex flex-col justify-between">
                      <view v-for="i in 5" :key="i" class="w-0.5 h-0.5 rounded-full bg-[#3d3020]/25" />
                    </view>
                  </view>
                  <view class="absolute inset-0 left-2 sm:left-2.5 flex items-center justify-center">
                    <view class="writing-vertical-rl">
                      <text v-for="(char, i) in ab.title.slice(0, 3).split('')" :key="i" class="text-[10px] font-serif font-bold text-[#3d3225]">{{ char }}</text>
                    </view>
                  </view>
                </view>
                <!-- 信息区 -->
                <view class="flex-1 min-w-0 flex flex-col justify-between">
                  <view>
                    <text class="font-medium text-sm sm:text-base block">{{ ab.title }}</text>
                    <text class="text-[11px] sm:text-xs text-muted-foreground block mt-0.5 line-clamp-2">{{ ab.desc }}</text>
                  </view>
                  <!-- 播放按钮 -->
                  <view class="flex items-center justify-end">
                    <view class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                      <!-- Play -->
                      <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </section>

      <!-- 精选古籍 -->
      <section class="py-3">
        <view class="flex items-center justify-between px-4 sm:px-6 mb-3">
          <text class="font-medium text-sm sm:text-base">精选古籍</text>
          <view class="flex items-center gap-0.5 sm:gap-1">
            <text @click="viewMode = 'grid'" :class="['p-1.5 sm:p-2 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-secondary' : 'active:bg-secondary/50']" aria-label="网格视图">
              <!-- Grid3X3 -->
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </text>
            <text @click="viewMode = 'list'" :class="['p-1.5 sm:p-2 rounded-lg transition-colors', viewMode === 'list' ? 'bg-secondary' : 'active:bg-secondary/50']" aria-label="列表视图">
              <!-- List -->
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </text>
          </view>
        </view>
        <view class="px-4 sm:px-6">
          <!-- 网格视图 -->
          <view v-if="viewMode === 'grid'" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            <view v-for="book in featuredBooks" :key="book.id" @click="goTo('/pages/classics/' + book.id)" class="group touch-manipulation">
              <view class="flex flex-col">
                <!-- 古籍封面 -->
                <view :class="['aspect-[3/4] rounded-[2px] sm:rounded-[3px] overflow-hidden relative border shadow-[3px_4px_12px_rgba(139,119,80,0.25)] group-active:scale-[0.98] transition-all duration-300', getCoverBg(book.coverColor), getCoverBorder(book.coverColor)]">
                  <!-- 纸张纹理 -->
                  <view class="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-multiply" style="background-image: url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E&quot;)" />
                  <!-- 纸张老化暗角 -->
                  <view class="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-black/[0.06]" />
                  <!-- 书脊 -->
                  <view :class="['absolute left-0 top-0 bottom-0 w-2.5 sm:w-3', getCoverSpine(book.coverColor)]">
                    <view class="absolute inset-y-3 sm:inset-y-4 left-1/2 -translate-x-1/2 flex flex-col justify-between items-center">
                      <view v-for="i in 7" :key="i" class="flex flex-col items-center">
                        <view class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#3d3020]/30 shadow-inner" />
                        <view v-if="i < 7" class="w-px h-2 sm:h-3 bg-[#4a3828]/20" />
                      </view>
                    </view>
                    <view class="absolute right-0 top-0 bottom-0 w-px bg-white/25" />
                    <view class="absolute left-0 top-0 bottom-0 w-px bg-black/10" />
                  </view>
                  <!-- 主内容区 -->
                  <view class="absolute inset-0 left-2.5 sm:left-3 flex flex-col">
                    <!-- 朝代印章 -->
                    <view class="pt-2 sm:pt-3 px-1 sm:px-2 flex justify-center">
                      <text class="text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0.5 rounded-[2px] bg-primary/10 text-primary/80 font-medium border border-primary/20">{{ book.dynasty }}</text>
                    </view>
                    <!-- 竖排书名 -->
                    <view class="flex-1 flex items-center justify-center px-0.5 sm:px-1 py-1 sm:py-2">
                      <view class="writing-vertical-rl flex flex-col items-center">
                        <text v-for="(char, i) in book.title.slice(0, 6).split('')" :key="i" class="font-serif font-bold leading-[1.3] tracking-[0.05em] text-sm sm:text-base md:text-lg text-[#3d3225]">{{ char }}</text>
                        <text v-if="book.title.length > 6" class="text-sm sm:text-base text-[#3d3225] opacity-50">…</text>
                      </view>
                    </view>
                    <!-- 作者 -->
                    <view class="pb-2 sm:pb-3 px-1 flex justify-center">
                      <text class="text-[8px] sm:text-[9px] text-[#3d3225] opacity-60 truncate max-w-full text-center leading-tight">{{ book.author }}</text>
                    </view>
                  </view>
                  <!-- AI标识 -->
                  <view v-if="book.hasAI" class="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 flex flex-col gap-0.5 sm:gap-1">
                    <view class="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                      <svg class="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M18 15l-1.5 3L21 19l-3 1.5L18 24l-1.5-3L12 19l3-1.5 1.5-3z"/></svg>
                    </view>
                  </view>
                </view>
                <!-- 封面下方信息 -->
                <view class="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
                  <text class="text-[11px] sm:text-xs font-medium truncate block text-center text-foreground">{{ book.title }}</text>
                  <!-- 标签组 -->
                  <view class="flex items-center justify-center gap-0.5 sm:gap-1 flex-wrap">
                    <text v-if="book.hasTranslation" class="text-[8px] sm:text-[9px] px-1 py-0 h-3 sm:h-3.5 inline-flex items-center border border-amber-400/60 text-amber-600 bg-amber-50/80 rounded">
                      译文
                    </text>
                    <text v-if="book.isFinePrint" class="text-[8px] sm:text-[9px] px-1 py-0 h-3 sm:h-3.5 inline-flex items-center border border-emerald-400/60 text-emerald-600 bg-emerald-50/80 rounded">
                      精校
                    </text>
                    <text v-if="book.isFree" class="text-[8px] sm:text-[9px] px-1 py-0 h-3 sm:h-3.5 inline-flex items-center bg-green-500 text-white rounded border-0">
                      免费
                    </text>
                  </view>
                  <!-- 阅读数 -->
                  <text class="text-[9px] sm:text-[10px] text-muted-foreground block text-center">
                    {{ book.reads >= 10000 ? (book.reads / 10000).toFixed(1) + '万人读' : book.reads + '人读' }}
                  </text>
                </view>
              </view>
            </view>
          </view>
          <!-- 列表视图 -->
          <view v-else class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <view v-for="book in featuredBooks" :key="book.id" @click="goTo('/pages/classics/' + book.id)" class="group touch-manipulation active:scale-[0.99] transition-all">
              <view class="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-200">
                <!-- 小封面 -->
                <view class="w-12 h-16 sm:w-14 sm:h-[75px] md:w-16 md:h-[85px] rounded-[2px] overflow-hidden relative flex-shrink-0 shadow-[2px_3px_8px_rgba(100,80,50,0.15)] border border-[#d0c0a0]/50" :class="getCoverBg(book.coverColor)">
                  <!-- 纸张纹理 -->
                  <view class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;)" />
                  <!-- 书脊 -->
                  <view :class="['absolute left-0 top-0 bottom-0 w-2 sm:w-2.5', getCoverSpine(book.coverColor)]">
                    <view class="absolute inset-y-2 left-1/2 -translate-x-1/2 flex flex-col justify-between">
                      <view v-for="i in 5" :key="i" class="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#3d3020]/25" />
                    </view>
                    <view class="absolute right-0 top-0 bottom-0 w-px bg-white/20" />
                  </view>
                  <!-- 竖排书名 -->
                  <view class="absolute inset-0 left-2 sm:left-2.5 flex items-center justify-center p-0.5">
                    <view class="writing-vertical-rl">
                      <text v-for="(char, i) in book.title.slice(0, 4).split('')" :key="i" class="text-[9px] sm:text-[10px] font-serif font-bold text-[#3d3225]">{{ char }}</text>
                    </view>
                  </view>
                  <!-- AI标识 -->
                  <view v-if="book.hasAI" class="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center">
                    <svg class="w-1.5 h-1.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M18 15l-1.5 3L21 19l-3 1.5L18 24l-1.5-3L12 19l3-1.5 1.5-3z"/></svg>
                  </view>
                </view>
                <!-- 信息区 -->
                <view class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <view>
                    <view class="flex items-start gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                      <text class="font-medium text-sm sm:text-base leading-snug truncate">{{ book.title }}</text>
                      <view class="flex gap-0.5 sm:gap-1 flex-shrink-0 flex-wrap">
                        <text v-if="book.hasTranslation" class="text-[8px] sm:text-[9px] px-1 py-0 h-3.5 sm:h-4 inline-flex items-center bg-amber-100 text-amber-700 rounded border-0">译文</text>
                        <text v-if="book.isFinePrint" class="text-[8px] sm:text-[9px] px-1 py-0 h-3.5 sm:h-4 inline-flex items-center bg-emerald-100 text-emerald-700 rounded border-0">精校</text>
                        <text v-if="book.isFree" class="text-[8px] sm:text-[9px] px-1 py-0 h-3.5 sm:h-4 inline-flex items-center bg-green-500 text-white rounded border-0">免费</text>
                      </view>
                    </view>
                    <text class="text-[11px] sm:text-xs text-muted-foreground block">[{{ book.dynasty }}] {{ book.author }}</text>
                    <text v-if="book.description" class="text-[11px] sm:text-xs text-muted-foreground/80 line-clamp-2 mt-1 leading-relaxed hidden sm:block">{{ book.description }}</text>
                  </view>
                  <!-- 底部统计 -->
                  <view class="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-muted-foreground mt-1 sm:mt-2">
                    <text class="flex items-center gap-0.5">
                      <text class="text-amber-500">★</text>{{ book.rating.toFixed(1) }}
                    </text>
                    <text>{{ book.reads >= 10000 ? (book.reads / 10000).toFixed(1) + '万人读' : book.reads + '人读' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </section>
    </main>

    <!-- AI助手悬浮按钮 -->
    <view @click="goTo('/pages/classics/ai-assistant')" class="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full classics-ai-btn flex items-center justify-center shadow-lg animate-ai-float active:scale-95 transition-transform" aria-label="AI助手">
      <!-- Sparkles -->
      <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M18 15l-1.5 3L21 19l-3 1.5L18 24l-1.5-3L12 19l3-1.5 1.5-3z"/></svg>
      <!-- 光晕效果 -->
      <view class="absolute inset-0 rounded-full bg-[var(--classics-ai)]/20 animate-ping" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

/* ====== 类型定义 ====== */
interface ContinueBook { id: string; title: string; author: string; dynasty: string; progress: number; hasAI: boolean; coverColor: string }
interface BookListItem { id: string; title: string; desc: string; count: number; category: string; books: string[] }
interface RankingBook { id: string; title: string; author: string; dynasty: string; desc: string; category: string; coverColor: string }
interface AudioBook { id: string; title: string; narrator: string; desc: string; coverColor: string }
interface FeaturedBook { id: string; title: string; author: string; dynasty: string; description: string; reads: number; rating: number; hasAI: boolean; hasTranslation: boolean; isFree: boolean; isFinePrint: boolean; coverColor: string }
interface CalendarDay { date: string; hasRead: boolean }
interface ReadingStats { totalMinutes: number; totalBooks: number; streak: number; dailyGoal: number; todayMinutes: number; calendarData: CalendarDay[] }
interface CategoryItem { id: string; name: string; desc: string; icon: string; color: string; lightColor: string }
interface TypeFilterItem { id: string; name: string }

/* ====== 数据 ====== */
const continueReadingData: ContinueBook[] = [
  { id: "1", title: "周易", author: "伏羲", dynasty: "周", progress: 32, hasAI: true, coverColor: "cream" },
  { id: "2", title: "道德经", author: "老子", dynasty: "春秋", progress: 68, hasAI: true, coverColor: "brown" },
  { id: "3", title: "黄帝内经", author: "佚名", dynasty: "战国", progress: 15, hasAI: true, coverColor: "green" },
]

const bookLists: BookListItem[] = [
  { id: "1", title: "国学经典必读", desc: "入门必备，经典永流传", count: 12, category: "jing", books: ["周易", "论语", "道德经", "孟子"] },
  { id: "2", title: "命理入门书单", desc: "八字命理学习路径", count: 8, category: "zi", books: ["滴天髓", "子平真诠", "穷通宝鉴", "三命通会"] },
  { id: "3", title: "道家养生典籍", desc: "修身养性，道法自然", count: 10, category: "zi", books: ["道德经", "庄子", "抱朴子", "黄庭经"] },
  { id: "4", title: "儒家经典选读", desc: "仁义礼智，修身齐家", count: 15, category: "jing", books: ["论语", "孟子", "大学", "中庸"] },
]

const rankingData: RankingBook[] = [
  { id: "1", title: "新唐书", author: "欧阳修", dynasty: "宋", desc: "历史·唐史新载", category: "lishi", coverColor: "cream" },
  { id: "2", title: "鬼谷子", author: "鬼谷子", dynasty: "战国", desc: "杂学之属·纵横谋略", category: "zajia", coverColor: "brown" },
  { id: "3", title: "萍居集", author: "某某", dynasty: "明", desc: "明洪武至崇祯·萍居逸事", category: "wenji", coverColor: "gray" },
  { id: "4", title: "素问入式运气", author: "佚名", dynasty: "宋", desc: "医家类·运气论奥", category: "zhongyi", coverColor: "green" },
  { id: "5", title: "阴符经·关尹子", author: "佚名", dynasty: "先秦", desc: "道家类·道法玄机", category: "daojia", coverColor: "blue" },
  { id: "6", title: "文选编珠", author: "佚名", dynasty: "唐", desc: "总集类·文选精粹", category: "wenji", coverColor: "cream" },
  { id: "7", title: "备急千金要方", author: "孙思邈", dynasty: "唐", desc: "中医·千金医方", category: "zhongyi", coverColor: "brown" },
  { id: "8", title: "道德经", author: "老子", dynasty: "春秋", desc: "道教·道法自然", category: "daojia", coverColor: "gray" },
]

const audioBooks: AudioBook[] = [
  { id: "1", title: "金瓶梅", narrator: "专业主播", desc: "兰陵笑笑生的《金瓶梅》是明代四大奇书之首...", coverColor: "cream" },
  { id: "2", title: "养鱼经", narrator: "古籍朗读", desc: "古人养鱼智慧，实用至今仍具启发", coverColor: "brown" },
  { id: "3", title: "数学", narrator: "学术讲解", desc: "算筹算事增生，密里匠心", coverColor: "blue" },
]

const featuredBooks: FeaturedBook[] = [
  { id: "1", title: "周易", author: "伏羲", dynasty: "周", description: "群经之首，大道之源。以阴阳变化解释万物运行规律。", reads: 128600, rating: 4.9, hasAI: true, hasTranslation: true, isFree: true, isFinePrint: true, coverColor: "cream" },
  { id: "2", title: "道德经", author: "老子", dynasty: "春秋", description: "道法自然，无为而治。道家学派创始人老子的哲学著作。", reads: 145600, rating: 4.9, hasAI: true, hasTranslation: true, isFree: true, isFinePrint: true, coverColor: "brown" },
  { id: "3", title: "滴天髓", author: "刘基", dynasty: "明", description: "八字命理经典，字字珠玑，论命精准。", reads: 86200, rating: 4.8, hasAI: true, hasTranslation: true, isFree: false, isFinePrint: false, coverColor: "gray" },
  { id: "4", title: "子平真诠", author: "沈孝瞻", dynasty: "清", description: "格局用神，系统阐述八字命理核心理论。", reads: 68500, rating: 4.9, hasAI: true, hasTranslation: true, isFree: false, isFinePrint: true, coverColor: "blue" },
  { id: "5", title: "黄帝内经", author: "佚名", dynasty: "战国", description: "中医学奠基之作，阐述人体与自然的关系。", reads: 98500, rating: 4.9, hasAI: true, hasTranslation: true, isFree: true, isFinePrint: true, coverColor: "green" },
  { id: "6", title: "论语", author: "孔子门人", dynasty: "春秋", description: "仁义礼智，修身齐家。儒家经典核心著作。", reads: 156800, rating: 4.9, hasAI: true, hasTranslation: true, isFree: true, isFinePrint: true, coverColor: "red" },
]

const readingStatsData: ReadingStats = {
  totalMinutes: 127,
  totalBooks: 8,
  streak: 5,
  dailyGoal: 30,
  todayMinutes: 18,
  calendarData: [
    { date: "2024-01-01", hasRead: true },
    { date: "2024-01-02", hasRead: true },
    { date: "2024-01-03", hasRead: false },
    { date: "2024-01-04", hasRead: true },
    { date: "2024-01-05", hasRead: true },
    { date: "2024-01-06", hasRead: true },
    { date: "2024-01-07", hasRead: false },
  ]
}

/* ====== 分类数据（含子标题 desc） ====== */
const categoryNav: CategoryItem[] = [
  { id: "jing", name: "经部", desc: "儒家经典", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`, color: "#c4820e", lightColor: "rgba(196,130,14,0.1)" },
  { id: "shi", name: "史部", desc: "历史典籍", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, color: "#3b82f6", lightColor: "rgba(59,130,246,0.1)" },
  { id: "zi", name: "子部", desc: "诸子百家", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`, color: "#8b5cf6", lightColor: "rgba(139,92,246,0.1)" },
  { id: "ji", name: "集部", desc: "文学作品", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`, color: "#10b981", lightColor: "rgba(16,185,129,0.1)" },
]

/* ====== 14种类型筛选（匹配V0） ====== */
const typeFilters: TypeFilterItem[] = [
  { id: "all", name: "全部" },
  { id: "lishi", name: "历史" },
  { id: "foxue", name: "佛学" },
  { id: "zhongyi", name: "中医" },
  { id: "shushu", name: "术数" },
  { id: "xiaoshuo", name: "小说" },
  { id: "shici", name: "诗词" },
  { id: "wenxue", name: "文学" },
  { id: "zhexue", name: "哲学" },
  { id: "yixue", name: "易学" },
  { id: "bingfa", name: "兵法" },
  { id: "keji", name: "科技" },
  { id: "daojiao", name: "道教" },
  { id: "dili", name: "地理" },
]

/* ====== 星期（用于日历） ====== */
const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

/* ====== 状态 ====== */
const isLoading = ref(true)
const activeCategory = ref("")
const activeType = ref("all")
const rankingTab = ref<"recommend" | "hot">("recommend")
const viewMode = ref<"grid" | "list">("list")

/* ====== 计算属性 ====== */
const goalProgress = computed(() => {
  const { todayMinutes, dailyGoal } = readingStatsData
  return dailyGoal > 0 ? Math.min(100, Math.round((todayMinutes / dailyGoal) * 100)) : 0
})

const goalReached = computed(() => readingStatsData.todayMinutes >= readingStatsData.dailyGoal)

/* ====== 生命周期 ====== */
onMounted(() => {
  setTimeout(() => { isLoading.value = false }, 600)
})

/* ====== 工具函数 ====== */
function getCoverBg(color: string): string {
  const map: Record<string, string> = {
    cream: 'bg-gradient-to-br from-[#f7f3e8] via-[#f2ead8] to-[#ebe3d0]',
    brown: 'bg-gradient-to-br from-[#e8dcc8] via-[#dfd0b8] to-[#d5c4a8]',
    blue: 'bg-gradient-to-br from-[#dce8f0] via-[#d0e0ec] to-[#c8d8e8]',
    green: 'bg-gradient-to-br from-[#e0ece0] via-[#d4e4d4] to-[#c8dcc8]',
    gray: 'bg-gradient-to-br from-[#ececea] via-[#e4e4e0] to-[#dcdcd8]',
    red: 'bg-gradient-to-br from-[#f0e0dc] via-[#e8d4d0] to-[#e0c8c4]',
  }
  return map[color] || map.cream
}

function getCoverBorder(color: string): string {
  const map: Record<string, string> = {
    cream: 'border-[#d8cbb0]',
    brown: 'border-[#c4a878]',
    blue: 'border-[#a0b8d0]',
    green: 'border-[#a0c0a0]',
    gray: 'border-[#c0c0b8]',
    red: 'border-[#d0a0a0]',
  }
  return map[color] || map.cream
}

function getCoverSpine(color: string): string {
  const map: Record<string, string> = {
    cream: 'bg-gradient-to-r from-[#c4b08a] via-[#d4c4a8] to-[#c8b898]',
    brown: 'bg-gradient-to-r from-[#8b7355] via-[#a08060] to-[#907050]',
    blue: 'bg-gradient-to-r from-[#6080a0] via-[#7090b0] to-[#6888a8]',
    green: 'bg-gradient-to-r from-[#5a7a5a] via-[#6a8a6a] to-[#608060]',
    gray: 'bg-gradient-to-r from-[#888884] via-[#989894] to-[#909088]',
    red: 'bg-gradient-to-r from-[#8b4040] via-[#a05050] to-[#904848]',
  }
  return map[color] || map.cream
}

function getCategoryBg(category: string): string {
  const map: Record<string, string> = {
    jing: 'bg-amber-50/80 border-amber-200/50',
    shi: 'bg-blue-50/80 border-blue-200/50',
    zi: 'bg-purple-50/80 border-purple-200/50',
    ji: 'bg-emerald-50/80 border-emerald-200/50',
  }
  return map[category] || map.jing
}

function getCategoryText(category: string): string {
  const map: Record<string, string> = {
    jing: 'text-amber-700',
    shi: 'text-blue-700',
    zi: 'text-purple-700',
    ji: 'text-emerald-700',
  }
  return map[category] || map.jing
}

function toggleCategory(id: string) {
  activeCategory.value = activeCategory.value === id ? "" : id
}

function handleRefreshRanking() {
  // TODO: refresh ranking data from API
}

function goBack() {
  uni.navigateBack()
}

function goTo(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
/* ====== CSS变量 ====== */
:root {
  --classics-jing: #c4820e;
  --classics-shi: #3b82f6;
  --classics-zi: #8b5cf6;
  --classics-ji: #10b981;
  --classics-ai: #7c3aed;
  --classics-card: #ffffff;
  --book-spine: #8b7355;
}

/* ====== Vertival writing for ancient book titles ====== */
.writing-vertical-rl {
  writing-mode: vertical-rl;
  -webkit-writing-mode: vertical-rl;
  text-orientation: mixed;
  -webkit-text-orientation: mixed;
}

/* ====== AI button gradient ====== */
.classics-ai-btn {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
}

/* ====== AI floating animation ====== */
.animate-ai-float {
  animation: aiFloat 3s ease-in-out infinite;
}

@keyframes aiFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* ====== Ping glow effect ====== */
.animate-ping {
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* ====== Hide scrollbar ====== */
scroll-view ::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

/* ====== Line clamp ====== */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ====== Active press feedback ====== */
.touch-manipulation {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* ====== Tabular numbers ====== */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
