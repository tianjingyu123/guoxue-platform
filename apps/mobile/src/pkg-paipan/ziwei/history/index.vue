<script setup lang="ts">
/**
 * 紫微斗数排盘记录（自 V0 app/ziwei/history/page.tsx 还原）
 * 数据来自本地真实记录（../ziwei-history），无记录即空态——不塞任何示例数据。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import { loadZiweiHistory, removeZiweiHistory, pinZiweiHistory, shichenLabel } from '../ziwei-history'

const records = ref<any[]>([])
function reload() {
  records.value = loadZiweiHistory()
}
onShow(reload)

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    keywords: [r.name, r.gender, `${r.y}-${r.m}-${r.d}`, r.city ?? ''].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  const r = vm.raw
  const q = [
    `name=${encodeURIComponent(r.name)}`, `gender=${encodeURIComponent(r.gender)}`,
    `y=${r.y}`, `m=${r.m}`, `d=${r.d}`, `hour=${r.hour}`, `minute=${r.minute ?? 0}`,
    r.city ? `city=${encodeURIComponent(r.city)}` : '',
    r.lng !== undefined ? `lng=${r.lng}` : '',
    r.useTrueSolar ? 'useTrueSolar=1' : '',
  ].filter(Boolean).join('&')
  navigateTo(`/pkg-paipan/ziwei/result?${q}`)
}
function onPin(ids: string[]) {
  pinZiweiHistory(ids)
  reload()
}
function onDelete(ids: string[]) {
  removeZiweiHistory(ids)
  reload()
}
</script>

<template>
  <HistoryPage
    title="排盘记录"
    back-href="/paipan/ziwei"
    :records="vms"
    search-placeholder="搜索姓名 / 出生年月 / 城市"
    empty-text="暂无排盘记录，排盘后自动保存"
    @pin="onPin"
    @delete="onDelete"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="line1">
        <text class="title">{{ rec.name || '未命名' }}</text>
        <text class="time">{{ formatRecordTime(rec.ts) }}</text>
      </view>
      <text class="badge">{{ rec.gender }}命</text>
      <text class="meta">
        {{ rec.y }}年{{ rec.m }}月{{ rec.d }}日 {{ shichenLabel(rec.hour) }}
        <text v-if="rec.city"> · {{ rec.city }}</text>
        <text v-if="rec.useTrueSolar"> · 真太阳时</text>
      </text>
    </template>
  </HistoryPage>
</template>

<style scoped lang="scss">
.line1 {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.title {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 600;
  color: #3d2f22;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.time {
  flex-shrink: 0;
  font-size: 20rpx;
  color: #a89b8a;
}
.summary {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #6b5d4d;
}
.meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8a7a68;
}
.badge {
  display: inline-block;
  margin-top: 10rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: rgba(196, 30, 58, 0.08);
  font-size: 22rpx;
  font-weight: 600;
  color: #c41e3a;
}
</style>
