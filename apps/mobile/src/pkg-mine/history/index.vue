<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { goBack } from '@/utils/router'
import { apiGet } from '@/utils/request'
import {
  mineApi,
  historyTypeConfig,
  type HistoryGroup,
  type HistoryItem,
} from '@/lib/mine-data'

const loading = ref(true)
const error = ref('')
const groups = ref<HistoryGroup[]>([])

const retry = () => { error.value = ''; loadData() }
async function loadData() {
  loading.value = true; error.value = ''
  try { groups.value = await mineApi.getHistory() }
  catch (e) { error.value = (e as Error)?.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(loadData)

const totalCount = computed(() => groups.value.reduce((s, g) => s + g.items.length, 0))

function formatProgress(item: HistoryItem) {
  if (item.progress === undefined || !item.duration) return ''
  if (item.progress >= 100) return '已看完'
  const watched = Math.floor((item.progress / 100) * item.duration)
  return `已观看 ${Math.floor(watched / 60)} 分钟`
}
/** 跳原内容页（原为"开发中"toast）。
 * HistoryItem.id 是浏览记录 cuid 而非内容 id（adaptHistory 未透传 targetId）
 * → 首次点击时拉一次原始记录建 记录id→{targetType,targetId} 映射，用原始 targetType 判跳转 */
interface RawHistoryRow { id?: string | number; targetType?: string; targetId?: string }
let rawMapPromise: Promise<Map<string, { targetType: string; targetId: string }>> | null = null
function loadRawMap() {
  if (!rawMapPromise) {
    rawMapPromise = apiGet<{ items?: RawHistoryRow[] } | RawHistoryRow[]>('/users/history?page=1&pageSize=50')
      .then((res) => {
        const items = Array.isArray(res) ? res : (res?.items ?? [])
        return new Map(items.map((r) => [
          String(r.id),
          { targetType: String(r.targetType || '').toLowerCase(), targetId: String(r.targetId || '') },
        ]))
      })
      .catch(() => { rawMapPromise = null; return new Map<string, { targetType: string; targetId: string }>() })
  }
  return rawMapPromise
}
function contentUrl(type: string, id: string): string {
  return type === 'article' ? `/pkg-circle/articles/detail?id=${id}`
    : type === 'course' ? `/pkg-course/detail/index?id=${id}`
    : type === 'video' ? `/pkg-video/detail/index?id=${id}`
    : type === 'product' ? `/pkg-mall/product/detail?id=${id}`
    : type === 'live' ? `/pkg-live/watch/index?id=${id}`
    : type === 'circle' ? `/pkg-circle/circles/detail?id=${id}`
    : '' // post 无 circleId / classic·ebook·poetry·content 等无对应映射 → 保持提示
}
async function openItem(item: HistoryItem) {
  const raw = (await loadRawMap()).get(item.id)
  const url = raw && raw.targetId ? contentUrl(raw.targetType, raw.targetId) : ''
  if (!url) { uni.showToast({ title: '该内容暂不支持跳转', icon: 'none' }); return }
  uni.navigateTo({ url, fail: () => uni.showToast({ title: '打开失败', icon: 'none' }) })
}
</script>

<template>
  <view class="page">
    <app-nav-bar title="浏览历史" :back-size="40" />

    <!-- 加载/错误 -->
    <view v-if="loading" class="loading"><AppLoading /></view>
    <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
    <template v-else>
    <!-- 统计条 -->
    <view v-if="totalCount > 0" class="stat-bar">
      <view class="stat-cell">
        <AppIcon name="clock" :size="16" color="#8a8178" />
        <text class="stat-text">共 {{ totalCount }} 条记录</text>
      </view>
      <view class="stat-cell">
        <AppIcon name="calendar" :size="16" color="#8a8178" />
        <text class="stat-text">近30天</text>
      </view>
    </view>

    <!-- 空态 -->
    <view v-if="totalCount === 0" class="empty">
      <view class="empty-icon"><AppIcon name="clock" :size="44" color="#C9C2B6" /></view>
      <text class="empty-title">暂无浏览记录</text>
      <text class="empty-desc">去发现更多精彩内容吧</text>
      <view class="empty-btn" @tap="goBack"><text class="empty-btn-text">去逛逛</text></view>
    </view>

    <scroll-view v-else scroll-y class="scroll">
      <view v-for="group in groups" :key="group.date" class="group">
        <text class="group-label">{{ group.label }}</text>
        <view class="item-list">
          <view v-for="item in group.items" :key="item.id" class="item-wrap">
            <view
              class="item"
              @tap="openItem(item)"
            >
              <!-- 封面或图标 -->
              <view v-if="item.cover" class="cover">
                <image lazy-load class="cover-img" :src="item.cover" mode="aspectFill" />
                <view
                  v-if="item.progress !== undefined && item.progress < 100"
                  class="cover-prog"
                >
                  <view class="cover-prog-fill" :style="{ width: item.progress + '%' }" />
                </view>
                <view v-if="item.type === 'video'" class="cover-play">
                  <AppIcon name="play" :size="18" color="#fff" />
                </view>
              </view>
              <view
                v-else
                class="icon-box"
                :style="{ background: historyTypeConfig[item.type].color }"
              >
                <AppIcon :name="historyTypeConfig[item.type].icon" :size="26" color="#fff" />
              </view>

              <!-- 信息 -->
              <view class="item-body">
                <view class="item-title-row">
                  <text class="type-tag" :style="{ background: historyTypeConfig[item.type].color }">
                    {{ historyTypeConfig[item.type].label }}
                  </text>
                  <text class="item-title">{{ item.title }}</text>
                </view>
                <view class="item-meta">
                  <text class="item-time">{{ item.viewedAt }}</text>
                  <text
                    v-if="formatProgress(item)"
                    class="item-prog"
                    :class="{ done: item.progress! >= 100 }"
                  >· {{ formatProgress(item) }}</text>
                </view>
              </view>

              <!-- 继续按钮（仅未看完且有进度的项） -->
              <view
                v-if="item.progress !== undefined && item.progress < 100"
                class="continue-btn"
                @tap.stop="openItem(item)"
              >
                <text class="continue-text">继续</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="list-foot">仅展示近30天的浏览记录</view>
    </scroll-view>
    </template>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 三态 */
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
.nav-action { font-size: 28rpx; color: #EF4444; }

.stat-bar { display: flex; align-items: center; gap: 32rpx; padding: 18rpx 24rpx; background: #F2ECE1; }
.stat-cell { display: flex; align-items: center; gap: 8rpx; }
.stat-text { font-size: 24rpx; color: #8a8178; }

.empty { flex: 1; padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: #F2ECE1; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.empty-title { font-size: 28rpx; color: #6f6760; }
.empty-desc { font-size: 24rpx; color: #b8b0a4; }
.empty-btn { margin-top: 24rpx; padding: 18rpx 56rpx; background: var(--brand); border-radius: 999rpx; }
.empty-btn-text { font-size: 28rpx; color: #fff; }

.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }
.group { margin-bottom: 32rpx; }
.group-label { display: block; font-size: 26rpx; font-weight: 500; color: #8a8178; margin-bottom: 16rpx; }
.item-list { display: flex; flex-direction: column; gap: 16rpx; }
.item-wrap { position: relative; background: #fff; border-radius: 16rpx; overflow: hidden; }
.item { position: relative; z-index: 2; display: flex; gap: 20rpx; padding: 20rpx; align-items: center; background: #fff; transition: transform 0.25s ease; }
.cover { position: relative; width: 168rpx; height: 112rpx; border-radius: 12rpx; overflow: hidden; background: #F2ECE1; flex-shrink: 0; }
.cover-img { width: 100%; height: 100%; }
.cover-prog { position: absolute; left: 0; right: 0; bottom: 0; height: 6rpx; background: rgba(0,0,0,0.3); }
.cover-prog-fill { height: 100%; background: var(--brand); }
.cover-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.icon-box { width: 112rpx; height: 112rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12rpx; }
.item-title-row { display: flex; align-items: flex-start; gap: 12rpx; }
.type-tag { font-size: 20rpx; color: #fff; padding: 2rpx 12rpx; border-radius: 8rpx; flex-shrink: 0; }
.item-title { font-size: 26rpx; color: #2C2C2C; line-height: 1.5; flex: 1; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.item-meta { display: flex; align-items: center; gap: 10rpx; }
.item-time { font-size: 22rpx; color: #b8b0a4; }
.item-prog { font-size: 22rpx; color: #b8b0a4; }
.item-prog.done { color: #16a34a; }
.continue-btn { align-self: center; flex-shrink: 0; padding: 10rpx 24rpx; background: rgba(196,30,58,0.1); border-radius: 999rpx; }
.continue-text { font-size: 24rpx; color: var(--brand); }

.swipe-del { position: absolute; right: 0; top: 0; bottom: 0; width: 160rpx; z-index: 1; background: var(--brand); display: flex; align-items: center; justify-content: center; }

.list-foot { text-align: center; padding: 24rpx 0; font-size: 24rpx; color: #b8b0a4; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; display: flex; align-items: flex-end; }
.mask.center { align-items: center; justify-content: center; padding: 0 48rpx; }
.dialog { width: 100%; max-width: 560rpx; background: #fff; border-radius: 28rpx; padding: 44rpx 40rpx 32rpx; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; }
.dialog-icon { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.dialog-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 16rpx; }
.dialog-desc { font-size: 26rpx; color: #8a8178; text-align: center; line-height: 1.6; margin-bottom: 32rpx; }
.dialog-actions { display: flex; gap: 20rpx; width: 100%; }
.dialog-btn { flex: 1; height: 84rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.dialog-btn.ghost { background: #F2ECE1; }
.dialog-btn.solid { background: var(--brand); }
.dialog-btn-text { font-size: 28rpx; color: #2C2C2C; font-weight: 500; }
.solid-text { color: #fff; }
</style>
