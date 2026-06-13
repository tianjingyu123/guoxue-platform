<template>
  <view class="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border" style="padding-bottom: env(safe-area-inset-bottom)">
    <view class="flex items-end h-14">
      <view
        v-for="tab in tabs"
        :key="tab.id"
        class="flex-1 flex flex-col items-center justify-end pb-1 gap-0.5"
        @tap="handleTab(tab)"
      >
        <!-- 排盘中心（太极凸起按钮）-->
        <view v-if="tab.id === 'paipan'" class="flex flex-col items-center -mt-5">
          <view
            class="w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-0.5"
            :class="activeTab === 'paipan' ? 'opacity-100' : 'opacity-90'"
          >
            <TaijiSvg :size="56" />
          </view>
          <text class="text-[10px]" :class="activeTab === 'paipan' ? 'text-primary font-medium' : 'text-muted-foreground'">排盘</text>
        </view>

        <!-- 普通 Tab -->
        <template v-else>
          <view class="w-6 h-6 flex items-center justify-center">
            <!-- 首页 -->
            <svg v-if="tab.id === 'home'" class="w-5 h-5" :class="activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <!-- 圈子 -->
            <svg v-else-if="tab.id === 'circle'" class="w-5 h-5" :class="activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <!-- 发现 -->
            <svg v-else-if="tab.id === 'discover'" class="w-5 h-5" :class="activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
            <!-- 我的 -->
            <svg v-else-if="tab.id === 'profile'" class="w-5 h-5" :class="activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </view>
          <text class="text-[10px]" :class="activeTab === tab.id ? 'text-primary font-medium' : 'text-muted-foreground'">{{ tab.label }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import TaijiSvg from '@/components/base/TaijiSvg.vue'

withDefaults(defineProps<{ activeTab?: string }>(), { activeTab: 'home' })

const tabs = [
  { id: 'home',    label: '首页',  href: '/pages/index/index' },
  { id: 'circle',  label: '圈子',  href: '/pages/circle/index' },
  { id: 'paipan',  label: '排盘',  href: '/pages/paipan/index' },
  { id: 'discover',label: '发现',  href: '/pages/discover/index' },
  { id: 'profile', label: '我的',  href: '/pages/profile/index' },
]

function handleTab(tab: typeof tabs[0]) {
  if (typeof uni !== 'undefined') uni.switchTab({ url: tab.href })
  else window.location.href = tab.href
}
</script>
