<!--
  S3 · 主推位选品库半屏面板
  从 S2 点某板块「+」拉起，选内容锁定到该板块主推位。
  ★关键口径：首页面板分类 Tab 按平台板块分（课堂/商城/圈子…），绝不是八字/六爻等排盘工具分类。
-->
<template>
  <view class="mask" @tap="emitClose">
    <view class="sheet" @tap.stop>
      <view class="handle"></view>

      <!-- 头部：标题 + 关闭 -->
      <view class="sheet-head">
        <view class="head-row">
          <text class="sheet-title">{{ board === 'home' ? '首页主推位 · 选择内容' : '选择' + boardLabel }}</text>
          <view class="close-btn" @tap="emitClose"><text>×</text></view>
        </view>

        <!-- 搜索框 -->
        <view class="search-bar">
          <text class="search-ic">🔍</text>
          <input
            class="search-input"
            v-model="keyword"
            :placeholder="searchPlaceholder"
            placeholder-class="ph"
            confirm-type="search"
            @input="onSearchInput"
          />
        </view>

        <!-- 分类 Tab（仅首页/直播显示） -->
        <scroll-view v-if="tabs.length" scroll-x class="tab-row">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="tab-pill"
            :class="{ active: activeTab === t.key }"
            @tap="switchTab(t.key)"
          >
            <text>{{ t.label }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 提示条 -->
      <view class="tip-bar" :class="{ live: board === 'live' }">
        <text>{{ tipText }}</text>
      </view>

      <!-- 列表 -->
      <scroll-view scroll-y class="sheet-list">
        <view v-if="loading" class="list-state"><text>加载中…</text></view>
        <template v-else-if="items.length">
          <view
            v-for="item in items"
            :key="item.contentType + ':' + item.id"
            class="list-item"
            :class="{ locked: isLocked(item) }"
            @tap="toggle(item)"
          >
            <view class="item-cover" :style="coverStyle(item)">
              <text v-if="!item.cover" class="cover-char">{{ firstChar(item.title) }}</text>
              <text v-if="item.liveStatus" class="live-badge" :class="item.liveStatus">
                {{ item.liveStatus === 'live' ? 'LIVE' : '预约' }}
              </text>
            </view>
            <view class="item-info">
              <text class="item-title">{{ item.title }}</text>
              <view class="item-meta">
                <text v-if="board === 'home'" class="type-tag">{{ typeLabel(item.contentType) }}</text>
                <text v-if="item.price != null && item.price > 0" class="item-price">¥{{ item.price }}</text>
                <text v-if="item.viewerCount != null" class="item-view">{{ item.viewerCount }} 人观看</text>
              </view>
            </view>
            <text v-if="isLocked(item)" class="locked-tag">已锁定</text>
            <view v-else class="item-check" :class="{ checked: selected.has(item.id) }">
              <text v-if="selected.has(item.id)" class="check-ic">✓</text>
            </view>
          </view>
        </template>
        <!-- 空态 -->
        <view v-else class="empty-list">
          <view class="empty-circle"></view>
          <text class="empty-t">{{ board === 'live' ? '暂无正在直播或预约直播' : '暂无可选内容' }}</text>
          <text class="empty-d">{{ board === 'live' ? '请稍后再来选择' : '换个分类或关键词试试' }}</text>
        </view>
      </scroll-view>

      <!-- 底部确认 -->
      <view class="sheet-foot">
        <text v-if="board === 'live' && selected.size" class="live-note">直播结束后此主推位将自动清空</text>
        <view class="confirm-btn" :class="{ disabled: selected.size === 0 }" @tap="onConfirm">
          <text>{{ selected.size ? `确认锁定（已选 ${selected.size}）` : '确认锁定' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  pinnedApi,
  HOME_FILTER_TABS,
  LIVE_STATUS_TABS,
  CONTENT_TYPE_LABEL,
  type PinnedContentBrief,
} from '@/lib/station-pinned-data'

const props = defineProps<{
  stationId: string
  board: string
  boardLabel: string
  availableSlots: number
  lockedOther: string[]
}>()

const emit = defineEmits<{
  (e: 'confirm', items: PinnedContentBrief[]): void
  (e: 'close'): void
}>()

const COVER_GRADIENTS = [
  'linear-gradient(135deg,#8B2D3B,#C41E3A)',
  'linear-gradient(135deg,#4A5D6B,#6E8496)',
  'linear-gradient(135deg,#B8924F,#C9A96E)',
  'linear-gradient(135deg,#5A6B4A,#7D9166)',
  'linear-gradient(135deg,#6B4A5A,#96688A)',
  'linear-gradient(135deg,#3E4A5B,#566A82)',
]

const loading = ref(true)
const items = ref<PinnedContentBrief[]>([])
const selected = ref<Set<string>>(new Set())
const selectedItems = ref<Map<string, PinnedContentBrief>>(new Map())
const keyword = ref('')
const activeTab = ref(props.board === 'live' ? '' : 'all')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const tabs = computed(() => {
  if (props.board === 'home') return HOME_FILTER_TABS
  if (props.board === 'live') return LIVE_STATUS_TABS
  return []
})

const searchPlaceholder = computed(() => {
  if (props.board === 'home') return '搜索全站内容'
  if (props.board === 'live') return '搜索直播间'
  return `搜索${props.boardLabel}名称`
})

const tipText = computed(() => {
  if (props.board === 'live') return '仅显示正在直播和预约直播；直播结束后主推位自动下架'
  if (props.board === 'home') return `首页可锁定任意类别内容 · 还可选 ${remaining.value} 个主推位`
  return `还可选 ${remaining.value} 个主推位（当前板块空位数）`
})

const remaining = computed(() => Math.max(0, props.availableSlots - selected.value.size))

function isLocked(item: PinnedContentBrief): boolean {
  return props.lockedOther.includes(item.id)
}
function firstChar(t: string): string {
  return (t || '·').trim().charAt(0)
}
function typeLabel(t: string): string {
  return CONTENT_TYPE_LABEL[t] || ''
}
function coverStyle(item: PinnedContentBrief) {
  if (item.cover) return { backgroundImage: `url(${item.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  let h = 0
  for (let i = 0; i < item.id.length; i++) h = (h << 5) - h + item.id.charCodeAt(i)
  return { backgroundImage: COVER_GRADIENTS[Math.abs(h) % COVER_GRADIENTS.length] }
}

async function loadList() {
  loading.value = true
  try {
    const query: Record<string, string> = { board: props.board }
    if (props.board === 'home') query.filterBoard = activeTab.value
    if (props.board === 'live') query.status = activeTab.value
    if (keyword.value.trim()) query.q = keyword.value.trim()
    const res = await pinnedApi.getCatalog(props.stationId, query as any)
    items.value = res.items || []
  } catch (e) {
    items.value = []
    uni.showToast({ title: (e as Error)?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function switchTab(key: string) {
  if (activeTab.value === key) return
  activeTab.value = key
  loadList()
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadList(), 300)
}

function toggle(item: PinnedContentBrief) {
  if (isLocked(item)) return
  if (selected.value.has(item.id)) {
    selected.value.delete(item.id)
    selectedItems.value.delete(item.id)
  } else {
    if (selected.value.size >= props.availableSlots) {
      uni.showToast({ title: `最多再选 ${props.availableSlots} 个`, icon: 'none' })
      return
    }
    selected.value.add(item.id)
    selectedItems.value.set(item.id, item)
  }
  // 触发响应式更新
  selected.value = new Set(selected.value)
}

function onConfirm() {
  if (selected.value.size === 0) return
  emit('confirm', Array.from(selectedItems.value.values()))
}

function emitClose() {
  emit('close')
}

onMounted(loadList)
</script>

<style scoped>
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.48);
  z-index: 900;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.sheet {
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  max-height: 76vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.24s ease;
}
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
.handle {
  width: 72rpx;
  height: 8rpx;
  background: #d8d2c8;
  border-radius: 999rpx;
  margin: 18rpx auto 0;
  flex-shrink: 0;
}

/* 头部 */
.sheet-head {
  padding: 22rpx 32rpx 0;
  flex-shrink: 0;
}
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.close-btn {
  width: 54rpx;
  height: 54rpx;
  border-radius: 50%;
  background: #f5f2ec;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn text {
  font-size: 34rpx;
  color: #9b9691;
  line-height: 1;
}

/* 搜索 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #f5f2ec;
  border-radius: 999rpx;
  padding: 0 26rpx;
  height: 72rpx;
  margin-top: 20rpx;
}
.search-ic {
  font-size: 26rpx;
}
.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #2c2c2c;
}
.ph {
  color: #b8b2aa;
}

/* Tab */
.tab-row {
  white-space: nowrap;
  margin-top: 18rpx;
  border-bottom: 1rpx solid #ece7df;
}
.tab-pill {
  display: inline-block;
  padding: 16rpx 26rpx;
  font-size: 25rpx;
  color: #9b9691;
  border-bottom: 4rpx solid transparent;
}
.tab-pill.active {
  color: #c41e3a;
  font-weight: 600;
  border-bottom-color: #c41e3a;
}

/* 提示条 */
.tip-bar {
  background: rgba(201, 169, 110, 0.12);
  padding: 14rpx 32rpx;
  flex-shrink: 0;
}
.tip-bar text {
  font-size: 21rpx;
  color: #97794a;
}
.tip-bar.live {
  background: rgba(196, 30, 58, 0.06);
}
.tip-bar.live text {
  color: #c41e3a;
}

/* 列表 */
.sheet-list {
  flex: 1;
  padding: 0 32rpx;
}
.list-state,
.empty-list {
  padding: 90rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.list-state text {
  font-size: 25rpx;
  color: #9b9691;
}
.empty-circle {
  width: 132rpx;
  height: 132rpx;
  border-radius: 50%;
  background: #f5f2ec;
}
.empty-t {
  font-size: 28rpx;
  font-weight: 600;
  color: #6e6e73;
}
.empty-d {
  font-size: 24rpx;
  color: #9b9691;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f2ec;
}
.list-item.locked {
  opacity: 0.45;
}
.item-cover {
  width: 108rpx;
  height: 108rpx;
  border-radius: 15rpx;
  flex-shrink: 0;
  position: relative;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
}
.cover-char {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 44rpx;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Songti SC', serif;
}
.live-badge {
  margin: 6rpx;
  font-size: 18rpx;
  font-weight: 600;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
.live-badge.live {
  background: #c41e3a;
  color: #fff;
}
.live-badge.scheduled {
  background: rgba(201, 169, 110, 0.2);
  color: #97794a;
}
.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.item-title {
  font-size: 28rpx;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.type-tag {
  font-size: 19rpx;
  color: #fff;
  background: #c9a96e;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
}
.item-price {
  font-size: 24rpx;
  color: #c41e3a;
  font-weight: 600;
}
.item-view {
  font-size: 22rpx;
  color: #9b9691;
}
.locked-tag {
  font-size: 22rpx;
  color: #9b9691;
  flex-shrink: 0;
}
.item-check {
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  border: 3rpx solid #d8d2c8;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.item-check.checked {
  background: #c41e3a;
  border-color: #c41e3a;
}
.check-ic {
  color: #fff;
  font-size: 26rpx;
  line-height: 1;
}

/* 底部 */
.sheet-foot {
  padding: 20rpx 32rpx calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #ece7df;
  background: #fff;
  flex-shrink: 0;
}
.live-note {
  display: block;
  text-align: center;
  font-size: 21rpx;
  color: #9b9691;
  margin-bottom: 14rpx;
}
.confirm-btn {
  height: 92rpx;
  background: #c41e3a;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-btn text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}
.confirm-btn.disabled {
  background: #d8d2c8;
}
</style>
