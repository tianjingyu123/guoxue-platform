<template>
  <view class="min-h-screen bg-background">
    <!-- ==================== 加载骨架屏 ==================== -->
    <view v-if="isLoading" class="pt-[88px] pb-20">
      <!-- Banner骨架 -->
      <view class="mx-4 mt-2 mb-3">
        <view class="h-36 bg-[#E8E0D5] rounded-xl animate-pulse" />
      </view>
      <!-- 快捷入口骨架 -->
      <view class="mx-4 mb-4">
        <view class="grid grid-cols-5 gap-y-3">
          <view v-for="i in 10" :key="i" class="flex flex-col items-center gap-1.5 animate-pulse">
            <view class="w-12 h-12 bg-[#E8E0D5] rounded-xl" />
            <view class="w-8 h-2 bg-[#E8E0D5] rounded mt-1" />
          </view>
        </view>
      </view>
      <!-- Feed骨架 - 双列交错 -->
      <view class="flex gap-3 px-4">
        <view class="flex-1 space-y-3">
          <view v-for="i in 3" :key="'l'+i" class="bg-white rounded-[10px] overflow-hidden animate-pulse shadow-sm">
            <view :class="i % 2 === 0 ? 'aspect-[3/4]' : 'aspect-video'" class="bg-[#E8E0D5]" />
            <view class="p-3 space-y-2">
              <view class="h-4 bg-[#E8E0D5] rounded w-full" />
              <view class="h-4 bg-[#E8E0D5] rounded w-2/3" />
              <view class="flex items-center gap-2 pt-1">
                <view class="w-5 h-5 bg-[#E8E0D5] rounded-full" />
                <view class="h-3 bg-[#E8E0D5] rounded w-16" />
              </view>
            </view>
          </view>
        </view>
        <view class="flex-1 space-y-3">
          <view v-for="i in 3" :key="'r'+i" class="bg-white rounded-[10px] overflow-hidden animate-pulse shadow-sm">
            <view :class="i % 2 === 0 ? 'aspect-video' : 'aspect-[4/5]'" class="bg-[#E8E0D5]" />
            <view class="p-3 space-y-2">
              <view class="h-4 bg-[#E8E0D5] rounded w-full" />
              <view class="h-4 bg-[#E8E0D5] rounded w-3/4" />
              <view class="flex items-center gap-2 pt-1">
                <view class="w-5 h-5 bg-[#E8E0D5] rounded-full" />
                <view class="h-3 bg-[#E8E0D5] rounded w-10" />
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ==================== 实际内容 ==================== -->
    <template v-else>
      <view class="max-w-lg mx-auto relative">
        <!-- ========== AppHeader：固定顶部 ========== -->
        <view class="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm">
          <view class="max-w-lg mx-auto">
            <!-- 搜索栏 + 通知 -->
            <view class="flex items-center gap-3 h-12 px-4">
              <view class="flex-1" @click="goSearch">
                <view class="relative flex items-center h-8 px-3 rounded-full bg-secondary border border-border">
                  <text class="text-muted-foreground text-base"></text>
                  <view class="flex items-center gap-0.5 px-1 py-0.5 mx-1.5 rounded-full bg-violet-100">
                    <text class="text-xs text-violet-500">✦</text>
                  </view>
                  <text class="text-[13px] text-muted-foreground truncate">搜索内容...</text>
                </view>
              </view>
              <!-- 消息铃铛 -->
              <view class="relative p-2" @click="goMessages">
                <text class="text-foreground text-xl"></text>
                <view v-if="hasUnread" class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
              </view>
            </view>
            <!-- Tab导航栏 -->
            <view class="flex items-center h-10 px-4 border-b border-border">
              <view class="flex-1 flex items-center gap-6">
                <view v-for="tab in tabs" :key="tab.name" class="relative" @click="activeTab = tab.name">
                  <text :class="activeTab === tab.name ? 'text-primary' : 'text-muted-foreground'" class="py-2 text-[15px] font-semibold whitespace-nowrap block">{{ tab.name }}</text>
                  <view v-if="activeTab === tab.name" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-primary rounded-full" />
                </view>
              </view>
              <view class="p-1.5" @click="goCreate">
                <text class="text-muted-foreground text-lg"></text>
              </view>
            </view>
          </view>
        </view>

        <!-- ========== 主内容区 ========== -->
        <view class="overflow-y-auto pt-[88px]">
          <!-- Banner轮播 -->
          <view class="relative mx-4 mt-2 mb-3 rounded-xl overflow-hidden">
            <view
              class="relative h-36 overflow-hidden rounded-xl"
              @touchstart="onBannerTouchStart"
              @touchend="onBannerTouchEnd"
            >
              <view
                v-for="(banner, index) in banners"
                :key="banner.id"
                class="absolute inset-0 transition-all duration-300 ease-out"
                :class="bannerTransition(index)"
                @click="navigateTo(banner.link)"
              >
                <image :src="banner.image" mode="aspectFill" class="w-full h-full" />
                <!-- 渐变遮罩 + 标题 -->
                <view class="absolute inset-0" style="background: linear-gradient(to top, rgba(0,0,0,0.5), transparent, transparent)" />
                <view class="absolute bottom-3 left-4 right-12">
                  <text class="text-white text-sm font-medium line-clamp-1">{{ banner.title }}</text>
                </view>
              </view>
            </view>
            <!-- 指示器 -->
            <view v-if="banners.length > 1" class="absolute bottom-2 right-3 flex items-center gap-1">
              <view
                v-for="(_, index) in banners"
                :key="index"
                @click="goBanner(index)"
                :class="index === bannerCurrent ? 'w-4 bg-white' : 'w-1.5 bg-white/50'"
                class="h-1.5 rounded-full transition-all duration-300"
              />
            </view>
          </view>

          <!-- 10宫格功能入口 -->
          <view class="mx-4 mb-4">
            <view class="grid grid-cols-5 gap-y-3">
              <view
                v-for="entry in quickEntries"
                :key="entry.id"
                class="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                @click="navigateTo(entry.link)"
              >
                <!-- 图标容器 -->
                <view :class="[entry.bgColor, 'relative w-12 h-12 rounded-xl flex items-center justify-center']">
                  <text :class="entry.color" class="text-xl">{{ entry.icon }}</text>
                  <!-- 角标 -->
                  <view
                    v-if="entry.badge"
                    :class="entry.badge === 'AI' ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white' : 'bg-primary text-white'"
                    class="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  >
                    {{ entry.badge }}
                  </view>
                </view>
                <text class="text-[11px] text-[#333] font-medium">{{ entry.name }}</text>
              </view>
            </view>
          </view>

          <!-- AI推荐Feed流 -->
          <view class="bg-background min-h-screen relative pb-24">
            <!-- 下拉刷新指示器 -->
            <view v-if="isRefreshing" class="fixed top-[88px] inset-x-0 z-30 flex items-center justify-center py-3">
              <view class="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md">
                <text class="text-accent text-sm">⟳</text>
                <text class="text-[13px] text-muted-foreground">正在刷新...</text>
              </view>
            </view>

            <!-- 内容区 -->
            <view class="px-[5px]">
              <!-- 排盘引导大卡 - 全宽展示 -->
              <view class="mt-1.5 mb-[6px]" @click="navigateTo('/paipan')">
                <view class="overflow-hidden rounded-2xl active:scale-[0.99] transition-transform relative"
                  style="background: linear-gradient(135deg, #FAF3E8 0%, #FDF8F0 40%, #FAF3E8 100%); border: 1px solid rgba(201,169,110,0.35); box-shadow: 0 2px 16px rgba(201,169,110,0.15);"
                >
                  <view class="relative px-4 py-3.5 flex items-center gap-4">
                    <!-- 装饰八卦背景 -->
                    <view class="absolute right-3 top-1/2 -translate-y-1/2 opacity-[0.06]">
                      <text class="text-8xl text-accent"></text>
                    </view>
                    <!-- 太极图标 -->
                    <view class="w-[52px] h-[52px] rounded-2xl flex items-center justify-center flex-shrink-0"
                      style="background: linear-gradient(135deg, #C9A96E, #B8985F)"
                    >
                      <text class="text-3xl text-[#FAF8F5]"></text>
                    </view>
                    <!-- 文案 -->
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2 mb-0.5">
                        <text class="font-serif font-bold text-[17px] text-foreground">排盘工具</text>
                        <text class="px-1.5 py-0.5 rounded-[4px] bg-primary/10 text-primary text-[9px] font-medium">免费使用</text>
                      </view>
                      <text class="text-[12px] text-[#667] mb-2 block">易学工具大全，算法精准，功能全面</text>
                      <view class="flex items-center gap-1.5">
                        <text v-for="t in ['八字', '紫微', '六爻', '奇门']" :key="t"
                          class="px-2 py-0.5 rounded-full bg-white/70 text-[10px] text-accent border border-accent/25 font-medium"
                        >{{ t }}</text>
                      </view>
                    </view>
                    <!-- CTA按钮 -->
                    <view class="flex items-center gap-1 px-3.5 py-2 rounded-full text-white text-[13px] font-medium flex-shrink-0"
                      style="background: #C41E3A; box-shadow: 0 3px 12px rgba(196,30,58,0.25);"
                    >
                      <text>立即体验</text>
                      <text class="text-sm">›</text>
                    </view>
                  </view>
                </view>
              </view>

              <!-- Feed卡片列表 - 瀑布流双列 -->
              <view class="flex gap-[6px]">
                <view class="flex-1 space-y-[6px]">
                  <template v-for="item in leftColumn" :key="item.id">
                    <view class="break-inside-avoid" @click="goFeedDetail(item)">
                      <!-- 竖版视觉卡片（课程/商品/直播/视频/古籍） -->
                      <view v-if="['course','product','live','video','ebook'].includes(item.type)"
                        class="overflow-hidden bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all duration-300"
                        :class="item.type === 'live' && item.isLive ? 'ring-1 ring-primary/40' : ''"
                      >
                        <!-- 封面 -->
                        <view :class="item.coverRatio === '16:9' || item.coverRatio === '4:3' ? 'aspect-square' : 'aspect-[3/4]'" class="relative overflow-hidden bg-[#F2EFEA]">
                          <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="absolute inset-0 w-full h-full" />
                          <view v-else class="absolute inset-0 bg-gradient-to-br from-[#F2EFEA] to-[#EAE5DC] flex items-center justify-center">
                            <text class="text-accent/40 text-2xl"></text>
                          </view>
                          <!-- 类型角标 -->
                          <text class="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/35 backdrop-blur-md text-white/95 font-medium">{{ typeLabel(item.type) }}</text>
                          <!-- 直播中 -->
                          <view v-if="item.type === 'live' && item.isLive" class="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px]">
                            <view class="w-1.5 h-1.5 bg-white rounded-full" />
                            <text>直播中</text>
                          </view>
                          <view v-if="item.type === 'live' && !item.isLive && item.time" class="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px]">
                            <text>🕐</text>
                            <text>{{ item.time }}</text>
                          </view>
                          <!-- 商品标签 -->
                          <view v-if="item.type === 'product' && item.tag"
                            :class="item.tag === '秒杀' ? 'bg-red-500' : item.tag === '热销' ? 'bg-primary' : 'bg-black/35 backdrop-blur-md'"
                            class="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                          >{{ item.tag }}</view>
                          <!-- 视频播放按钮 -->
                          <view v-if="item.type === 'video'" class="absolute inset-0 flex items-center justify-center">
                            <view class="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <text class="text-white text-xl">▶</text>
                            </view>
                          </view>
                          <view v-if="item.type === 'video' && item.duration" class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-sm bg-black/60 text-white text-[9px] font-mono">{{ item.duration }}</view>
                          <!-- 观看数 -->
                          <view v-if="item.type === 'live'" class="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-black/50 text-white text-[9px]">
                            <text></text>
                            <text>{{ item.isLive ? item.viewers : item.reservations }}</text>
                          </view>
                          <!-- 古籍 -->
                          <view v-if="item.type === 'ebook'" class="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-[#92715A]/80 text-white text-[9px]">
                            <text></text>
                            <text>免费阅读</text>
                          </view>
                        </view>
                        <!-- 信息区 -->
                        <view class="p-2.5">
                          <text class="text-[14px] font-medium text-foreground line-clamp-2 leading-[1.5] mb-1.5 block">{{ item.title }}</text>
                          <!-- 价格 -->
                          <view v-if="item.type === 'course' || item.type === 'product'" class="flex items-baseline gap-1.5 mb-1.5">
                            <text class="text-[16px] font-bold text-primary font-mono">¥{{ item.price }}</text>
                            <text v-if="item.originalPrice" class="text-[11px] text-muted-foreground line-through">¥{{ item.originalPrice }}</text>
                          </view>
                          <!-- 古籍信息 -->
                          <view v-if="item.type === 'ebook'" class="flex items-center gap-2 mb-1.5 text-[11px] text-[#92715A]">
                            <text class="flex items-center gap-0.5"> {{ item.readers }}人读过</text>
                            <text class="flex items-center gap-0.5">🔖 {{ item.chapters }}章</text>
                          </view>
                          <!-- 底部 -->
                          <view class="flex items-center justify-between">
                            <text v-if="item.type === 'course'" class="text-[11px] text-[#667]">{{ item.students }}人已学</text>
                            <text v-else-if="item.type === 'product'" class="text-[11px] text-[#667]">已售{{ item.sales }}</text>
                            <view v-else class="flex items-center gap-1">
                              <view class="w-4 h-4 rounded-full bg-[#999]/20 flex items-center justify-center">
                                <text class="text-[8px] text-[#667]">{{ (item.authorAvatar || item.author || '').charAt(0) }}</text>
                              </view>
                              <text class="text-[11px] text-[#667] truncate max-w-[68px]">{{ item.author }}</text>
                            </view>
                            <!-- 点赞 -->
                            <view v-if="item.type === 'video'" class="flex items-center gap-0.5 text-[11px] text-muted-foreground" @click.stop="toggleLike(item.id)">
                              <text :class="liked.has(item.id) ? 'text-primary' : ''" class="text-sm"></text>
                              <text>{{ (item.likes || 0) + (liked.has(item.id) ? 1 : 0) }}</text>
                            </view>
                          </view>
                        </view>
                      </view>

                      <!-- 文章卡片（竖版图） -->
                      <view v-else-if="item.type === 'article' && item.cover"
                        class="overflow-hidden bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all duration-300"
                      >
                        <view :class="item.coverRatio === '16:9' || item.coverRatio === '4:3' ? 'aspect-square' : 'aspect-[3/4]'" class="relative overflow-hidden bg-[#F2EFEA]">
                          <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="absolute inset-0 w-full h-full" />
                          <text class="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/35 backdrop-blur-md text-white/95 font-medium">文章</text>
                        </view>
                        <view class="p-2.5">
                          <text class="text-[14px] font-bold text-foreground line-clamp-2 leading-snug mb-1.5 font-serif block">{{ item.title }}</text>
                          <text v-if="item.excerpt" class="text-[12px] text-[#667] line-clamp-2 leading-relaxed mb-2 block">{{ item.excerpt }}</text>
                          <view class="flex items-center justify-between">
                            <view class="flex items-center gap-1">
                              <view class="w-4 h-4 rounded-full bg-[#999]/20 flex items-center justify-center">
                                <text class="text-[8px] text-[#667]">{{ (item.authorAvatar || item.author || '').charAt(0) }}</text>
                              </view>
                              <text class="text-[11px] text-[#667]">{{ item.author }}</text>
                            </view>
                            <text class="text-[11px] text-muted-foreground flex items-center gap-0.5"> {{ item.likes }}</text>
                          </view>
                        </view>
                      </view>

                      <!-- 纯文字卡片 -->
                      <view v-else-if="item.type === 'article' || item.type === 'post'"
                        class="overflow-hidden bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all duration-300"
                      >
                        <view class="p-3.5">
                          <view class="flex items-center justify-between mb-2">
                            <text class="text-[9px] px-1.5 py-0.5 rounded-sm bg-black/35 text-white font-medium">{{ typeLabel(item.type) }}</text>
                            <view class="flex items-center gap-1">
                              <view class="w-4 h-4 rounded-full bg-[#999]/20 flex items-center justify-center">
                                <text class="text-[8px] text-[#667]">{{ (item.authorAvatar || item.author || '').charAt(0) }}</text>
                              </view>
                              <text class="text-[11px] text-[#667] truncate max-w-[56px]">{{ item.author }}</text>
                            </view>
                          </view>
                          <text class="text-[15px] font-bold text-foreground line-clamp-3 leading-snug mb-1.5 font-serif block">{{ item.title }}</text>
                          <text v-if="item.excerpt || item.content" class="text-[13px] text-[#667] line-clamp-5 leading-[1.75] mb-2.5 block">{{ item.excerpt || item.content }}</text>
                          <view class="flex items-center gap-4 pt-2 border-t border-border/60">
                            <text class="flex items-center gap-1 text-[11px] text-muted-foreground"> {{ item.likes }}</text>
                            <text class="flex items-center gap-1 text-[11px] text-muted-foreground"> {{ item.comments }}</text>
                          </view>
                        </view>
                      </view>

                      <!-- 圈子卡片 -->
                      <view v-else-if="item.type === 'circle'"
                        class="overflow-hidden bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all duration-300"
                      >
                        <view class="aspect-[4/3] relative overflow-hidden bg-[#F2EFEA]">
                          <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="absolute inset-0 w-full h-full" />
                          <view class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <view class="absolute bottom-2 left-3 right-3">
                            <view class="flex items-center gap-1">
                              <text class="text-white text-sm font-bold">{{ item.circleName }}</text>
                              <text v-if="item.isVerified" class="text-accent text-xs"></text>
                            </view>
                            <view class="flex items-center gap-2 mt-1">
                              <text v-for="tag in (item.tags || [])" :key="tag" class="text-[9px] px-1.5 py-0.5 rounded-full bg-white/20 text-white">{{ tag }}</text>
                            </view>
                          </view>
                        </view>
                        <view class="p-2.5">
                          <text class="text-[12px] text-[#667] line-clamp-2 mb-2 block">{{ item.content }}</text>
                          <view class="flex items-center justify-between">
                            <view class="flex items-center gap-1">
                              <text class="text-[11px] text-[#667]"> {{ item.members }}</text>
                              <text class="text-[11px] text-[#667]"> {{ item.todayPosts || 0 }}今日</text>
                            </view>
                            <text v-if="item.price" class="text-[11px] text-primary font-medium">¥{{ item.price }}/月</text>
                          </view>
                        </view>
                      </view>
                    </view>
                  </template>
                </view>

                <view class="flex-1 space-y-[6px]">
                  <template v-for="item in rightColumn" :key="item.id">
                    <!-- 复用与左列相同的卡片渲染 -->
                    <view class="break-inside-avoid" @click="goFeedDetail(item)">
                      <!-- 竖版视觉卡片 -->
                      <view v-if="['course','product','live','video','ebook'].includes(item.type)"
                        class="overflow-hidden bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all duration-300"
                        :class="item.type === 'live' && item.isLive ? 'ring-1 ring-primary/40' : ''"
                      >
                        <view :class="item.coverRatio === '16:9' || item.coverRatio === '4:3' ? 'aspect-square' : 'aspect-[3/4]'" class="relative overflow-hidden bg-[#F2EFEA]">
                          <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="absolute inset-0 w-full h-full" />
                          <view v-else class="absolute inset-0 bg-gradient-to-br from-[#F2EFEA] to-[#EAE5DC] flex items-center justify-center">
                            <text class="text-accent/40 text-2xl"></text>
                          </view>
                          <text class="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/35 backdrop-blur-md text-white/95 font-medium">{{ typeLabel(item.type) }}</text>
                          <view v-if="item.type === 'live' && item.isLive" class="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px]">
                            <view class="w-1.5 h-1.5 bg-white rounded-full" /><text>直播中</text>
                          </view>
                          <view v-if="item.type === 'live' && !item.isLive && item.time" class="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px]">
                            <text>🕐</text><text>{{ item.time }}</text>
                          </view>
                          <view v-if="item.type === 'product' && item.tag"
                            :class="item.tag === '秒杀' ? 'bg-red-500' : item.tag === '热销' ? 'bg-primary' : 'bg-black/35 backdrop-blur-md'"
                            class="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                          >{{ item.tag }}</view>
                          <view v-if="item.type === 'video'" class="absolute inset-0 flex items-center justify-center">
                            <view class="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <text class="text-white text-xl">▶</text>
                            </view>
                          </view>
                          <view v-if="item.type === 'video' && item.duration" class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-sm bg-black/60 text-white text-[9px] font-mono">{{ item.duration }}</view>
                          <view v-if="item.type === 'live'" class="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-black/50 text-white text-[9px]">
                            <text></text><text>{{ item.isLive ? item.viewers : item.reservations }}</text>
                          </view>
                          <view v-if="item.type === 'ebook'" class="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-[#92715A]/80 text-white text-[9px]">
                            <text></text><text>免费阅读</text>
                          </view>
                        </view>
                        <view class="p-2.5">
                          <text class="text-[14px] font-medium text-foreground line-clamp-2 leading-[1.5] mb-1.5 block">{{ item.title }}</text>
                          <view v-if="item.type === 'course' || item.type === 'product'" class="flex items-baseline gap-1.5 mb-1.5">
                            <text class="text-[16px] font-bold text-primary font-mono">¥{{ item.price }}</text>
                            <text v-if="item.originalPrice" class="text-[11px] text-muted-foreground line-through">¥{{ item.originalPrice }}</text>
                          </view>
                          <view v-if="item.type === 'ebook'" class="flex items-center gap-2 mb-1.5 text-[11px] text-[#92715A]">
                            <text> {{ item.readers }}人读过</text>
                            <text>🔖 {{ item.chapters }}章</text>
                          </view>
                          <view class="flex items-center justify-between">
                            <text v-if="item.type === 'course'" class="text-[11px] text-[#667]">{{ item.students }}人已学</text>
                            <text v-else-if="item.type === 'product'" class="text-[11px] text-[#667]">已售{{ item.sales }}</text>
                            <view v-else class="flex items-center gap-1">
                              <view class="w-4 h-4 rounded-full bg-[#999]/20 flex items-center justify-center">
                                <text class="text-[8px] text-[#667]">{{ (item.authorAvatar || item.author || '').charAt(0) }}</text>
                              </view>
                              <text class="text-[11px] text-[#667] truncate max-w-[68px]">{{ item.author }}</text>
                            </view>
                            <view v-if="item.type === 'video'" class="flex items-center gap-0.5 text-[11px] text-muted-foreground" @click.stop="toggleLike(item.id)">
                              <text :class="liked.has(item.id) ? 'text-primary' : ''" class="text-sm"></text>
                              <text>{{ (item.likes || 0) + (liked.has(item.id) ? 1 : 0) }}</text>
                            </view>
                          </view>
                        </view>
                      </view>

                      <!-- 文章竖版 -->
                      <view v-else-if="item.type === 'article' && item.cover"
                        class="overflow-hidden bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all duration-300"
                      >
                        <view :class="item.coverRatio === '16:9' || item.coverRatio === '4:3' ? 'aspect-square' : 'aspect-[3/4]'" class="relative overflow-hidden bg-[#F2EFEA]">
                          <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="absolute inset-0 w-full h-full" />
                          <text class="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/35 backdrop-blur-md text-white/95 font-medium">文章</text>
                        </view>
                        <view class="p-2.5">
                          <text class="text-[14px] font-bold text-foreground line-clamp-2 leading-snug mb-1.5 font-serif block">{{ item.title }}</text>
                          <text v-if="item.excerpt" class="text-[12px] text-[#667] line-clamp-2 leading-relaxed mb-2 block">{{ item.excerpt }}</text>
                          <view class="flex items-center justify-between">
                            <view class="flex items-center gap-1">
                              <view class="w-4 h-4 rounded-full bg-[#999]/20 flex items-center justify-center">
                                <text class="text-[8px] text-[#667]">{{ (item.authorAvatar || item.author || '').charAt(0) }}</text>
                              </view>
                              <text class="text-[11px] text-[#667]">{{ item.author }}</text>
                            </view>
                            <text class="text-[11px] text-muted-foreground flex items-center gap-0.5"> {{ item.likes }}</text>
                          </view>
                        </view>
                      </view>

                      <!-- 纯文字 -->
                      <view v-else-if="item.type === 'article' || item.type === 'post'"
                        class="overflow-hidden bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all duration-300"
                      >
                        <view class="p-3.5">
                          <view class="flex items-center justify-between mb-2">
                            <text class="text-[9px] px-1.5 py-0.5 rounded-sm bg-black/35 text-white font-medium">{{ typeLabel(item.type) }}</text>
                            <view class="flex items-center gap-1">
                              <view class="w-4 h-4 rounded-full bg-[#999]/20 flex items-center justify-center">
                                <text class="text-[8px] text-[#667]">{{ (item.authorAvatar || item.author || '').charAt(0) }}</text>
                              </view>
                              <text class="text-[11px] text-[#667] truncate max-w-[56px]">{{ item.author }}</text>
                            </view>
                          </view>
                          <text class="text-[15px] font-bold text-foreground line-clamp-3 leading-snug mb-1.5 font-serif block">{{ item.title }}</text>
                          <text v-if="item.excerpt || item.content" class="text-[13px] text-[#667] line-clamp-5 leading-[1.75] mb-2.5 block">{{ item.excerpt || item.content }}</text>
                          <view class="flex items-center gap-4 pt-2 border-t border-border/60">
                            <text class="flex items-center gap-1 text-[11px] text-muted-foreground"> {{ item.likes }}</text>
                            <text class="flex items-center gap-1 text-[11px] text-muted-foreground"> {{ item.comments }}</text>
                          </view>
                        </view>
                      </view>

                      <!-- 圈子 -->
                      <view v-else-if="item.type === 'circle'"
                        class="overflow-hidden bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-all duration-300"
                      >
                        <view class="aspect-[4/3] relative overflow-hidden bg-[#F2EFEA]">
                          <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="absolute inset-0 w-full h-full" />
                          <view class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <view class="absolute bottom-2 left-3 right-3">
                            <view class="flex items-center gap-1">
                              <text class="text-white text-sm font-bold">{{ item.circleName }}</text>
                              <text v-if="item.isVerified" class="text-accent text-xs"></text>
                            </view>
                            <view class="flex items-center gap-2 mt-1">
                              <text v-for="tag in (item.tags || [])" :key="tag" class="text-[9px] px-1.5 py-0.5 rounded-full bg-white/20 text-white">{{ tag }}</text>
                            </view>
                          </view>
                        </view>
                        <view class="p-2.5">
                          <text class="text-[12px] text-[#667] line-clamp-2 mb-2 block">{{ item.content }}</text>
                          <view class="flex items-center justify-between">
                            <view class="flex items-center gap-1">
                              <text class="text-[11px] text-[#667]"> {{ item.members }}</text>
                              <text class="text-[11px] text-[#667]"> {{ item.todayPosts || 0 }}今日</text>
                            </view>
                            <text v-if="item.price" class="text-[11px] text-primary font-medium">¥{{ item.price }}/月</text>
                          </view>
                        </view>
                      </view>
                    </view>
                  </template>
                </view>
              </view>

              <!-- 加载更多 / 底部 -->
              <view class="py-6 text-center">
                <view v-if="loadingMore" class="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
                  <text class="text-accent animate-spin">⟳</text>
                  <text>正在加载更多精彩内容...</text>
                </view>
                <text v-else-if="hasMore" class="text-[13px] text-muted-foreground py-2 block" @click="loadMore">加载更多...</text>
                <view v-else class="flex items-center justify-center gap-3 text-[13px] text-muted-foreground">
                  <view class="w-10 h-px bg-[#E8E0D5]" />
                  <text>已经到底了</text>
                  <view class="w-10 h-px bg-[#E8E0D5]" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- ========== FloatingAssistant 悬浮助手 ========== -->
        <view class="fixed right-[12px] bottom-[70px] z-40 flex flex-col items-center gap-2">
          <!-- 回到顶部 -->
          <view
            v-if="showBackTop"
            class="w-[24px] h-[24px] rounded-full bg-white/95 flex items-center justify-center shadow-md transition-all duration-200"
            @click="scrollToTop"
          >
            <text class="text-muted-foreground text-sm">↑</text>
          </view>
          <!-- 智能客服 -->
          <view
            class="w-[28px] h-[28px] rounded-full bg-white/95 flex items-center justify-center shadow-md transition-all duration-200"
            @click="navigateTo('/chat')"
          >
            <text class="text-primary text-sm"></text>
          </view>
        </view>

        <!-- ========== BottomNav 底部导航 ========== -->
        <view class="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border" style="padding-bottom: env(safe-area-inset-bottom, 0px)">
          <view class="flex items-center justify-around h-[56px] max-w-lg mx-auto">
            <view v-for="tab in bottomTabs" :key="tab.id"
              class="flex flex-col items-center justify-center gap-0.5 w-16 h-full"
              @click="navigateTo(tab.href)"
            >
              <!-- 排盘中心 - 凸起设计 -->
              <template v-if="tab.id === 'paipan'">
                <view class="flex flex-col items-center -mt-5">
                  <view :class="bottomActive === tab.id ? 'shadow-[0_2px_12px_rgba(196,30,58,0.25)]' : ''"
                    class="relative w-[44px] h-[44px] flex items-center justify-center rounded-full bg-white shadow-md"
                  >
                    <text class="text-[32px] text-primary"></text>
                  </view>
                  <text :class="bottomActive === tab.id ? 'text-primary' : 'text-muted-foreground'" class="text-[11px] mt-1 font-bold">{{ tab.label }}</text>
                </view>
              </template>
              <template v-else>
                <text :class="bottomActive === tab.id ? 'text-primary' : 'text-muted-foreground'" class="text-[22px]">{{ tab.icon }}</text>
                <text :class="bottomActive === tab.id ? 'text-primary' : 'text-muted-foreground'" class="text-[11px] font-bold">{{ tab.label }}</text>
              </template>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// ==================== 加载状态 ====================
const isLoading = ref(true)
const hasUnread = ref(true)

// ==================== Tab导航 ====================
const activeTab = ref('推荐')
const tabs = [
  { name: '推荐', href: '/' },
  { name: '关注', href: '/' },
  { name: '热门', href: '/' },
  { name: '直播', href: '/live' },
  { name: '同城', href: '/' },
]

// ==================== 底部导航 ====================
const bottomActive = ref('home')
const bottomTabs = [
  { id: 'home', label: '首页', icon: '🏠', href: '/pages/index/index' },
  { id: 'circle', label: '圈子', icon: '', href: '/pages/circles/index' },
  { id: 'paipan', label: '排盘', icon: '', href: '/pages/paipan/index' },
  { id: 'discover', label: '发现', icon: '', href: '/pages/discover/index' },
  { id: 'profile', label: '我的', icon: '', href: '/pages/profile/index' },
]

// ==================== Banner轮播 ====================
interface BannerItem {
  id: string
  image: string
  title: string
  link: string
}

const banners = ref<BannerItem[]>([
  { id: '1', image: '/images/banners/banner-1.png', title: '八字命理入门精讲 限时优惠', link: '/pages/courses-list/index' },
  { id: '2', image: '/images/banners/banner-2.png', title: '大师直播：2024下半年运势解读', link: '/pages/live/index' },
  { id: '3', image: '/images/banners/banner-3.png', title: '新人专享 首单立减50元', link: '/pages/mall/index' },
])

const bannerCurrent = ref(0)
const isTransitioning = ref(false)
let bannerTimer: ReturnType<typeof setInterval> | null = null
let touchStartX = 0

const goBanner = (index: number) => {
  if (isTransitioning.value) return
  isTransitioning.value = true
  bannerCurrent.value = index
  setTimeout(() => isTransitioning.value = false, 300)
}

const nextBanner = () => {
  goBanner((bannerCurrent.value + 1) % banners.value.length)
}

const prevBanner = () => {
  goBanner((bannerCurrent.value - 1 + banners.value.length) % banners.value.length)
}

const onBannerTouchStart = (e: UniApp.TouchEvent) => {
  touchStartX = e.touches[0].clientX
  if (bannerTimer) clearInterval(bannerTimer)
}

const onBannerTouchEnd = (e: UniApp.TouchEvent) => {
  const diff = touchStartX - e.changedTouches[0].clientX
  if (Math.abs(diff) > 50) {
    diff > 0 ? nextBanner() : prevBanner()
  }
  startBannerAutoPlay()
}

const startBannerAutoPlay = () => {
  if (bannerTimer) clearInterval(bannerTimer)
  bannerTimer = setInterval(nextBanner, 4000)
}

const bannerTransition = (index: number) => {
  if (index === bannerCurrent.value) return 'opacity-100 translate-x-0'
  if (index < bannerCurrent.value) return 'opacity-0 -translate-x-full'
  return 'opacity-0 translate-x-full'
}

// ==================== 10宫格功能入口 ====================
interface QuickEntryItem {
  id: string
  name: string
  icon: string
  link: string
  color: string
  bgColor: string
  badge?: string
}

const quickEntries: QuickEntryItem[] = [
  { id: 'courses', name: '课程', icon: '🎓', link: '/pages/courses-list/index', color: 'text-[#4A90D9]', bgColor: 'bg-[#4A90D9]/10' },
  { id: 'circles', name: '圈子', icon: '', link: '/pages/circles/index', color: 'text-success', bgColor: 'bg-success/10' },
  { id: 'classics', name: '古籍馆', icon: '', link: '/pages/classics/home/index', color: 'text-accent', bgColor: 'bg-accent/10' },
  { id: 'mall', name: '商城', icon: '', link: '/pages/mall/index', color: 'text-primary', bgColor: 'bg-primary/10', badge: '热' },
  { id: 'live', name: '直播', icon: '📡', link: '/pages/live/index', color: 'text-[#E74C3C]', bgColor: 'bg-[#E74C3C]/10' },
  { id: 'fortune', name: '运势', icon: '🧭', link: '/pages/fortune/index', color: 'text-[#9B59B6]', bgColor: 'bg-[#9B59B6]/10' },
  { id: 'paipan', name: '排盘', icon: '🔲', link: '/pages/paipan/index', color: 'text-info', bgColor: 'bg-info/10' },
  { id: 'agents', name: '智能体', icon: '🤖', link: '/pages/agents/index', color: 'text-operator', bgColor: 'bg-operator/10', badge: 'AI' },
  { id: 'poetry', name: '诗词', icon: '', link: '/pages/poetry/index', color: 'text-live', bgColor: 'bg-live/10' },
  { id: 'more', name: '更多', icon: '⋯', link: '/pages/discover/index', color: 'text-ink-soft', bgColor: 'bg-[#666]/10' },
]

// ==================== Feed流数据 ====================
interface FeedItem {
  id: number
  type: string
  title: string
  author: string
  authorAvatar: string
  cover?: string | null
  coverRatio?: string
  price?: number
  originalPrice?: number
  students?: number
  sales?: number
  viewers?: number
  reservations?: number
  isLive?: boolean
  time?: string
  duration?: string
  plays?: string
  likes?: number
  comments?: number
  excerpt?: string
  content?: string
  tag?: string
  readers?: number
  chapters?: number
  circleName?: string
  members?: number
  todayPosts?: number
  tags?: string[]
  isVerified?: boolean
  rating?: number
}

const feedItems: FeedItem[] = [
  { id: 1, type: 'course', title: '八字入门实战课：从零开始学命理', author: '周易大师', authorAvatar: '周', price: 199, originalPrice: 399, students: 2860, cover: '/images/feed/course-1.jpg', coverRatio: '3:4' },
  { id: 2, type: 'live', title: '八字看2026下半年运势走向', author: '周易大师', authorAvatar: '周', viewers: 1280, isLive: true, cover: '/images/feed/live-1.jpg', coverRatio: '3:4' },
  { id: 3, type: 'article', title: '八字食神制杀格局详解与实例分析', author: '张玄风', authorAvatar: '张', likes: 328, comments: 56, excerpt: '食神制杀是八字中常见的贵格之一，具有文武双全的特点。通过实例来详细分析格局的形成条件和断语要点。', cover: '/images/feed/article-1.jpg', coverRatio: '3:4' },
  { id: 4, type: 'product', title: '《渊海子平》精装典藏版', author: '', authorAvatar: '', price: 68, originalPrice: 128, sales: 1280, tag: '热销', cover: '/images/feed/product-1.jpg', coverRatio: '3:4' },
  { id: 5, type: 'circle', title: '', author: '张玄风', authorAvatar: '', circleName: '八字研习社', content: '每日案例解析，从入门到精通的八字学习社区', members: 12800, likes: 42, comments: 18, cover: '/images/circles/circle-1.jpg', coverRatio: '4:3', price: 0, rating: 4.9, tags: ['活跃', '干货多'], isVerified: true, todayPosts: 56 },
  { id: 7, type: 'ebook', title: '《滴天髓》白话精解', author: '古籍研究院', authorAvatar: '古', readers: 8560, chapters: 32, cover: '/images/feed/ebook-1.jpg', coverRatio: '3:4' },
  { id: 8, type: 'live', title: '手把手教你排八字命盘', author: '李命理', authorAvatar: '李', viewers: 856, isLive: true, cover: '/images/feed/live-horizontal.jpg', coverRatio: '16:9' },
  { id: 9, type: 'video', title: '3分钟看懂十二地支含义', author: '国学小课堂', authorAvatar: '国', duration: '03:21', plays: '8.5万', likes: 1256, cover: '/images/feed/video-1.jpg', coverRatio: '3:4' },
  { id: 10, type: 'article', title: '从易经看人生的三个重要阶段', author: '国学研究院', authorAvatar: '国', likes: 425, comments: 78, excerpt: '易经告诉我们，人生可分为三个重要阶段：少年为乾，壮年为坤，晚年为泰。理解这些帮助把握人生节奏。', cover: '/images/feed/live-horizontal.jpg', coverRatio: '16:9' },
  { id: 11, type: 'course', title: '紫微斗数命盘解读进阶班', author: '张玄风', authorAvatar: '张', price: 299, originalPrice: 599, students: 1560, cover: '/images/feed/course-2.jpg', coverRatio: '3:4' },
  { id: 12, type: 'article', title: '为什么八字中财星不一定代表有钱', author: '命理研究院', authorAvatar: '命', likes: 856, comments: 124, excerpt: '很多人一看到八字中有财星就觉得会发财，但财星代表的是你能掌控的资源和机会，而非直接金钱收入。今天深入分析财星的真正含义和应用方法。', cover: null },
  { id: 13, type: 'product', title: '专业堪舆罗盘套装', author: '', authorAvatar: '', price: 298, originalPrice: 498, sales: 860, tag: '新品', cover: '/images/feed/product-2.jpg', coverRatio: '3:4' },
  { id: 14, type: 'video', title: '五行相生相克的本质原理详解', author: '易学研究', authorAvatar: '易', duration: '08:42', plays: '3.2万', likes: 1890, cover: '/images/feed/live-horizontal.jpg', coverRatio: '16:9' },
  { id: 15, type: 'circle', title: '', author: '六爻居士', authorAvatar: '', circleName: '六爻预测实战', content: '铜钱起卦、断卦技法，实战案例每日更新', members: 3280, likes: 35, comments: 22, cover: '/images/circles/circle-2.jpg', coverRatio: '4:3', price: 58, rating: 4.7, tags: ['进阶', '实战派'], isVerified: true, ownerTitle: '六爻研究者', todayPosts: 28 },
  { id: 16, type: 'post', title: '请教：甲木日主酉月身弱如何调整', author: '易学新人', authorAvatar: '易', likes: 42, comments: 28, content: '我的八字甲木日主，生在酉月，地支有申酉戌三会金局，这样的命局是不是身弱财旺？应该怎么调整？求各位老师指点！', cover: null },
  { id: 17, type: 'article', title: '梅花易数预测实例深度分析', author: '梅花居士', authorAvatar: '梅', likes: 312, comments: 45, excerpt: '梅花易数以简洁著称，但其中蕴含的道理极为深刻。通过这个预测实例看看如何运用时间起卦法进行日常占断。', cover: '/images/feed/article-1.jpg', coverRatio: '3:4' },
  { id: 18, type: 'course', title: '风水堪舆入门精讲', author: '陈风水', authorAvatar: '陈', price: 168, originalPrice: 299, students: 980, cover: '/images/feed/course-3.jpg', coverRatio: '3:4' },
  { id: 19, type: 'live', title: '紫微斗数十二宫位详解直播', author: '紫微大师', authorAvatar: '紫', time: '明天19:30', reservations: 520, isLive: false, cover: '/images/feed/live-horizontal.jpg', coverRatio: '16:9' },
  { id: 20, type: 'product', title: '开运水晶手链套装', author: '', authorAvatar: '', price: 158, originalPrice: 258, sales: 2680, tag: '秒杀', cover: '/images/feed/product-3.jpg', coverRatio: '3:4' },
]

// ==================== Feed交互状态 ====================
const liked = ref<Set<number>>(new Set())
const isRefreshing = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const showBackTop = ref(false)
let scrollTimer: ReturnType<typeof setTimeout> | null = null

// 双列分配
const leftColumn = ref<FeedItem[]>([])
const rightColumn = ref<FeedItem[]>([])

// 分配feed到两列（交错分配，模拟瀑布流）
const distributeFeed = () => {
  leftColumn.value = []
  rightColumn.value = []
  const visible = feedItems.filter(() => true)
  visible.forEach((item, idx) => {
    if (idx % 2 === 0) {
      leftColumn.value.push(item)
    } else {
      rightColumn.value.push(item)
    }
  })
}

const typeLabel = (type: string): string => {
  const map: Record<string, string> = {
    live: '直播', article: '文章', post: '帖子',
    course: '课程', product: '好物', video: '视频',
    circle: '圈子', ebook: '古籍',
  }
  return map[type] || type
}

const toggleLike = (id: number) => {
  const n = new Set(liked.value)
  n.has(id) ? n.delete(id) : n.add(id)
  liked.value = n
}

const loadMore = () => {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  setTimeout(() => {
    loadingMore.value = false
    hasMore.value = false
  }, 1000)
}

const handleRefresh = () => {
  isRefreshing.value = true
  setTimeout(() => {
    isRefreshing.value = false
  }, 1500)
}

const scrollToTop = () => {
  uni.pageScrollTo({ scrollTop: 0, duration: 300 })
}

const onPageScroll = (e: { scrollTop: number }) => {
  showBackTop.value = e.scrollTop > 1800
}

// ==================== 导航 ====================
const navigateTo = (url: string) => {
  if (url.startsWith('/pages/')) {
    // Tab页使用switchTab，其他页面使用navigateTo
    const tabPages = ['/pages/index/index', '/pages/circles/index', '/pages/paipan/index', '/pages/discover/index', '/pages/profile/index']
    if (tabPages.includes(url)) {
      uni.switchTab({ url })
    } else {
      uni.navigateTo({ url })
    }
  } else if (url.startsWith('/')) {
    uni.navigateTo({ url })
  }
}

const goSearch = () => navigateTo('/pages/search/index')
const goMessages = () => navigateTo('/pages/messages/index')
const goCreate = () => navigateTo('/pages/create/index')

const goFeedDetail = (item: FeedItem) => {
  const routes: Record<string, string> = {
    course: `/pages/course/detail?id=${item.id}`,
    live: `/pages/live/detail?id=${item.id}`,
    video: `/pages/video/detail?id=${item.id}`,
    ebook: `/pages/classics/detail?id=${item.id}`,
    product: `/pages/mall/product-detail?id=${item.id}`,
    article: `/pages/article/detail?id=${item.id}`,
    post: `/pages/post/detail?id=${item.id}`,
    circle: `/pages/circles/detail?id=${item.id}`,
  }
  navigateTo(routes[item.type] || `/pages/article/detail?id=${item.id}`)
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 模拟加载
  setTimeout(() => {
    isLoading.value = false
    distributeFeed()
  }, 800)

  // 启动Banner自动播放
  startBannerAutoPlay()

  // 监听滚动
  uni.onPageScroll?.(onPageScroll)
})

onUnmounted(() => {
  if (bannerTimer) clearInterval(bannerTimer)
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
