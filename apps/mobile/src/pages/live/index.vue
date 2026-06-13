<script setup lang="ts">
import { ref, computed } from 'vue'

const tabs = ['全部', '知识授课', '电商带货', '关注的']
const activeTab = ref('全部')

const mockLives = [
  { id: '1', title: '八字命理入门：如何快速解读四柱八字', hostName: '易道先生', viewerCount: 12580, type: 'knowledge', status: 'live', orientation: 'horizontal' },
  { id: '2', title: '开光吉祥物专场：招财貔貅、转运葫芦', hostName: '福缘阁主', viewerCount: 8920, type: 'commerce', status: 'live', orientation: 'vertical' },
  { id: '3', title: '天然水晶手链专场直播', hostName: '晶缘坊', viewerCount: 5630, type: 'commerce', status: 'live', orientation: 'vertical' },
  { id: '4', title: '紫微斗数实战案例分析第三期', hostName: '紫微大师', viewerCount: 3280, type: 'knowledge', status: 'live', orientation: 'horizontal' },
  { id: '5', title: '今晚8点：风水布局与家居旺财秘诀', hostName: '风水堂主', viewerCount: 328, type: 'knowledge', status: 'upcoming', scheduledTime: '今晚 20:00', orientation: 'vertical' },
  { id: '6', title: '周易古籍珍藏版专场直播', hostName: '古籍书阁', viewerCount: 4150, type: 'commerce', status: 'live', orientation: 'vertical' },
  { id: '7', title: '奇门遁甲：预测学的巅峰之术', hostName: '奇门居士', viewerCount: 186, type: 'knowledge', status: 'upcoming', scheduledTime: '明天 14:00', orientation: 'vertical' },
  { id: '8', title: '手把手教你排八字命盘', hostName: '李命理', viewerCount: 2860, type: 'knowledge', status: 'live', orientation: 'horizontal' },
  { id: '9', title: '手工罗盘制作工艺展示与售卖', hostName: '匠心堂', viewerCount: 1520, type: 'commerce', status: 'live', orientation: 'vertical' },
  { id: '10', title: '道家符箓专场直播', hostName: '玄真道人', viewerCount: 980, type: 'commerce', status: 'live', orientation: 'vertical' },
]

const filteredLives = computed(() => {
  return mockLives.filter(live => {
    if (activeTab.value === '全部') return true
    if (activeTab.value === '知识授课') return live.type === 'knowledge'
    if (activeTab.value === '电商带货') return live.type === 'commerce'
    if (activeTab.value === '关注的') return false
    return true
  })
})

const livesNow = computed(() => filteredLives.value.filter(l => l.status === 'live'))
const livesUpcoming = computed(() => filteredLives.value.filter(l => l.status === 'upcoming'))

function formatViewers(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString()
}
function goLive(id: string) { uni.navigateTo({ url: `/pages/live/room?id=${id}` }) }
function goSearch() { uni.navigateTo({ url: '/pages/search/index' }) }
function goBack() { uni.navigateBack() }
</script>

<template>
  <view class="min-h-screen bg-background">

    <!-- 顶部导航 -->
    <view class="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b border-border">

      <!-- 标题栏 -->
      <view class="flex items-center justify-between h-12 px-4">
        <view class="w-9 h-9 flex items-center justify-center" @tap="goBack">
          <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </view>
        <text class="font-bold text-lg text-foreground">直播广场</text>
        <view class="w-9 h-9 flex items-center justify-center" @tap="goSearch">
          <svg class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </view>
      </view>

      <!-- 分类标签 -->
      <view class="flex items-center px-4 h-10 gap-6 border-t border-border/30">
        <view
          v-for="tab in tabs"
          :key="tab"
          class="relative py-2 text-sm whitespace-nowrap"
          :class="activeTab === tab ? 'text-primary font-semibold' : 'text-muted-foreground'"
          @tap="activeTab = tab"
        >
          <text>{{ tab }}</text>
          <view v-if="activeTab === tab" class="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full" />
        </view>
      </view>

    </view>

    <!-- 内容区域 -->
    <view class="pt-[88px] pb-8 px-4">

      <!-- 正在直播 -->
      <view v-if="livesNow.length > 0" class="mb-6">
        <view class="flex items-center gap-2 mb-3">
          <view class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
            </svg>
          </view>
          <text class="font-semibold text-foreground">正在直播</text>
          <text class="text-xs text-muted-foreground">({{ livesNow.length }})</text>
        </view>

        <!-- 混合布局 -->
        <view class="grid grid-cols-2 gap-2">
          <template v-for="live in livesNow" :key="live.id">
            <!-- 横屏独占一行 -->
            <view
              v-if="live.orientation === 'horizontal'"
              class="col-span-2 bg-card rounded-xl overflow-hidden"
              @tap="goLive(live.id)"
            >
              <view class="relative aspect-[16/9]">
                <image src="/static/placeholder.svg" />
                <view class="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary">
                  <view class="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                  <text class="text-[10px] font-medium text-primary-foreground">直播中</text>
                </view>
                <view class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <text class="text-white text-sm font-medium line-clamp-1 block">{{ live.title }}</text>
                  <view class="flex items-center justify-between mt-1">
                    <text class="text-white/80 text-xs">{{ live.hostName }}</text>
                    <view class="flex items-center gap-1">
                      <svg class="w-3 h-3 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      <text class="text-white/80 text-xs">{{ formatViewers(live.viewerCount) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 竖屏半列 -->
            <view
              v-else
              class="bg-card rounded-xl overflow-hidden"
              @tap="goLive(live.id)"
            >
              <view class="relative aspect-[9/16]">
                <image src="/static/placeholder.svg" />
                <view class="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary">
                  <view class="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                  <text class="text-[10px] font-medium text-primary-foreground">直播中</text>
                </view>
                <view class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <text class="text-white text-xs font-medium line-clamp-2 block">{{ live.title }}</text>
                  <text class="text-white/80 text-[10px] block mt-0.5">{{ live.hostName }}</text>
                  <view class="flex items-center gap-1 mt-1">
                    <svg class="w-3 h-3 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                    <text class="text-white/70 text-[10px]">{{ formatViewers(live.viewerCount) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </template>
        </view>
      </view>

      <!-- 直播预告 -->
      <view v-if="livesUpcoming.length > 0">
        <view class="flex items-center gap-2 mb-3">
          <text class="font-semibold text-foreground">直播预告</text>
          <text class="text-xs text-muted-foreground">({{ livesUpcoming.length }})</text>
        </view>

        <view class="grid grid-cols-2 gap-2">
          <view
            v-for="live in livesUpcoming"
            :key="live.id"
            class="bg-card rounded-xl overflow-hidden"
            @tap="goLive(live.id)"
          >
            <view class="relative aspect-[9/16]">
              <image src="/static/placeholder.svg" />
              <view class="absolute inset-0 bg-black/40" />
              <view class="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/50">
                <text class="text-[10px] text-white">{{ live.scheduledTime }}</text>
              </view>
              <view class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <text class="text-white text-xs font-medium line-clamp-2 block">{{ live.title }}</text>
                <text class="text-white/80 text-[10px] block mt-0.5">{{ live.hostName }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredLives.length === 0" class="flex flex-col items-center justify-center py-20">
        <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
          </svg>
        </view>
        <text class="text-muted-foreground text-sm">暂无相关直播</text>
      </view>

    </view>
  </view>
</template>
