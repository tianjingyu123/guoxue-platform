<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppError from '@/components/common/app-error.vue'
import LiveCard from '@/components/live/live-card.vue'
import { navigateTo } from '@/utils/router'
import { liveTabs, liveList, type LiveItem } from '@/lib/live-data'

const activeTab = ref<string>('全部')
const loading = ref(true)
const error = ref('')
const dataReady = ref(false)

const filtered = computed<LiveItem[]>(() => {
  if (!dataReady.value) return []
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

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    await new Promise(r => setTimeout(r, 300))
    dataReady.value = true
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function onSearch() { navigateTo('/pages/search/index') }

onMounted(() => loadData())
</script>

<template>
  <view class="page">
    <app-nav-bar title="直播广场" background="rgba(255,255,255,0.95)">
      <template #right>
        <view class="nav-search" @tap="onSearch">
          <AppIcon name="search" :size="40" color="#666666" />
        </view>
      </template>
    </app-nav-bar>

    <!-- 分类 tabs -->
    <view class="tabs">
      <view v-for="tab in liveTabs" :key="tab" class="tab" :class="activeTab === tab && 'tab-on'" @tap="activeTab = tab">
        <text class="tab-txt">{{ tab }}</text>
        <view v-if="activeTab === tab" class="tab-line" />
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="pl-skeleton">
      <view v-for="i in 4" :key="i" class="sk-card" />
    </view>

    <!-- 错误 -->
    <app-error v-else-if="error" :desc="error" @retry="loadData" />

    <!-- 内容区 -->
    <scroll-view v-else scroll-y class="content">
      <view v-if="livesNow.length > 0" class="section">
        <view class="sec-head">
          <view class="radio-dot"><AppIcon name="radio" :size="24" color="#ffffff" /></view>
          <text class="sec-title">正在直播</text>
          <text class="sec-count">({{ livesNow.length }})</text>
        </view>
        <view class="grid">
          <view v-for="live in livesNow" :key="live.id" class="grid-item" :class="live.orientation === 'horizontal' && 'span-2'">
            <LiveCard :data="live" />
          </view>
        </view>
      </view>

      <view v-if="livesUpcoming.length > 0" class="section">
        <view class="sec-head">
          <text class="sec-title">直播预告</text>
          <text class="sec-count">({{ livesUpcoming.length }})</text>
        </view>
        <view class="grid">
          <view v-for="live in livesUpcoming" :key="live.id" class="grid-item" :class="live.orientation === 'horizontal' && 'span-2'">
            <LiveCard :data="live" />
          </view>
        </view>
      </view>

      <view v-if="filtered.length === 0" class="empty">
        <view class="empty-icon"><AppIcon name="radio" :size="64" color="#999999" /></view>
        <text class="empty-txt">暂无相关直播</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--surface-sunken); }

.nav-search { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; margin-right: -8rpx; }
.tabs { display: flex; align-items: center; height: 80rpx; padding: 0 24rpx; gap: 48rpx; border-bottom: 2rpx solid var(--border, #ebe6de); background: rgba(255, 255, 255, 0.95); position: sticky; top: 0; z-index: 49; }
/* 骨架 */
.pl-skeleton { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; padding: 24rpx; padding-top: 120rpx; }
.sk-card { height: 360rpx; border-radius: 20rpx; background: #f0ebe3; animation: sk-pulse 1.5s infinite; }
@keyframes sk-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
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
