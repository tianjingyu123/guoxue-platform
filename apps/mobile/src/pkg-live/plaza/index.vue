<script setup lang="ts">
/** 直播广场页 - 从原型 app/live/page.tsx 迁移 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import LiveCard from '@/components/live/live-card.vue'
import { goBack, navigateTo } from '@/utils/router'
import { liveTabs, liveList, type LiveItem } from '@/lib/live-data'

const activeTab = ref<string>('全部')

const filtered = computed<LiveItem[]>(() => {
  return liveList.filter((live) => {
    if (activeTab.value === '全部') return true
    if (activeTab.value === '知识授课') return live.type === 'knowledge'
    if (activeTab.value === '电商带货') return live.type === 'commerce'
    if (activeTab.value === '关注的') return false
    return true
  })
})

const livesNow = computed(() => filtered.value.filter((l) => l.status === 'live'))
const livesUpcoming = computed(() => filtered.value.filter((l) => l.status === 'upcoming'))

function onSearch() {
  navigateTo('/search')
}
</script>

<template>
  <view class="page">
    <!-- 固定头部 -->
    <view class="header">
      <view class="title-bar">
        <view
          class="nav-back"
          @tap="goBack"
        >
          <AppIcon
            name="chevron-left"
            :size="88"
            color="#2c2c2c"
          />
        </view>
        <text class="nav-title">
          直播广场
        </text>
        <view
          class="nav-search"
          @tap="onSearch"
        >
          <AppIcon
            name="search"
            :size="80"
            color="#666666"
          />
        </view>
      </view>
      <!-- 分类 tabs（下划线风格） -->
      <view class="tabs">
        <view
          v-for="tab in liveTabs"
          :key="tab"
          class="tab"
          :class="activeTab === tab && 'tab-on'"
          @tap="activeTab = tab"
        >
          <text class="tab-txt">
            {{ tab }}
          </text>
          <view
            v-if="activeTab === tab"
            class="tab-line"
          />
        </view>
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view
      scroll-y
      class="content"
    >
      <!-- 正在直播 -->
      <view
        v-if="livesNow.length > 0"
        class="section"
      >
        <view class="sec-head">
          <view class="radio-dot">
            <AppIcon
              name="radio"
              :size="48"
              color="#ffffff"
            />
          </view>
          <text class="sec-title">
            正在直播
          </text>
          <text class="sec-count">
            ({{ livesNow.length }})
          </text>
        </view>
        <view class="grid">
          <view
            v-for="live in livesNow"
            :key="live.id"
            class="grid-item"
            :class="live.orientation === 'horizontal' && 'span-2'"
          >
            <LiveCard :data="live" />
          </view>
        </view>
      </view>

      <!-- 直播预告 -->
      <view
        v-if="livesUpcoming.length > 0"
        class="section"
      >
        <view class="sec-head">
          <text class="sec-title">
            直播预告
          </text>
          <text class="sec-count">
            ({{ livesUpcoming.length }})
          </text>
        </view>
        <view class="grid">
          <view
            v-for="live in livesUpcoming"
            :key="live.id"
            class="grid-item"
            :class="live.orientation === 'horizontal' && 'span-2'"
          >
            <LiveCard :data="live" />
          </view>
        </view>
      </view>

      <!-- 空态 -->
      <view
        v-if="filtered.length === 0"
        class="empty"
      >
        <view class="empty-icon">
          <AppIcon
            name="radio"
            :size="128"
            color="#999999"
          />
        </view>
        <text class="empty-txt">
          暂无相关直播
        </text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--surface-sunken); }

/* 头部 */
.header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20rpx); border-bottom: 2rpx solid var(--border, #ebe6de); }
.title-bar { display: flex; align-items: center; justify-content: space-between; height: 96rpx; padding: 0 24rpx; }
.nav-back, .nav-search { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; }
.nav-search { margin-right: -8rpx; }
.nav-title { font-family: var(--font-serif); font-weight: 700; font-size: 36rpx; color: #2c2c2c; }
.tabs { display: flex; align-items: center; height: 80rpx; padding: 0 24rpx; gap: 48rpx; border-top: 2rpx solid rgba(235, 230, 222, 0.3); }
.tab { position: relative; display: flex; align-items: center; height: 100%; }
.tab-txt { font-size: 28rpx; color: #666666; white-space: nowrap; }
.tab-on .tab-txt { color: var(--brand); font-weight: 600; }
.tab-line { position: absolute; left: 0; right: 0; bottom: 12rpx; height: 6rpx; background: var(--brand); border-radius: 999rpx; }

/* 内容 */
.content { position: absolute; top: 0; left: 0; right: 0; bottom: 0; padding: 176rpx 24rpx 64rpx; box-sizing: border-box; }
.section { margin-bottom: 48rpx; }
.sec-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.radio-dot { display: flex; align-items: center; justify-content: center; width: 40rpx; height: 40rpx; border-radius: 999rpx; background: var(--brand); }
.sec-title { font-family: var(--font-serif); font-weight: 600; font-size: 30rpx; color: #2c2c2c; }
.sec-count { font-size: 22rpx; color: #999999; }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; align-items: start; }
.grid-item { min-width: 0; }
.span-2 { grid-column: span 2; }

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; }
.empty-icon { display: flex; align-items: center; justify-content: center; width: 160rpx; height: 160rpx; border-radius: 999rpx; background: #ffffff; margin-bottom: 32rpx; }
.empty-txt { font-size: 28rpx; color: #999999; }
</style>
