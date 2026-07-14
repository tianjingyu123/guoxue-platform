<script setup lang="ts">
/**
 * 周易起名记录（自 V0 app/qiming/history/page.tsx 还原）
 * 数据来自本地真实记录（../store），无记录即空态——不塞任何示例数据。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import { loadQimingHistory, removeQimingHistory, pinQimingHistory } from '../store'

const STYLE_LABEL: Record<string, string> = { classic: '诗词经典', steady: '沉稳大气', fresh: '清新雅致', auspicious: '寓意吉祥' }

const records = ref<any[]>([])
function reload() {
  records.value = loadQimingHistory()
}
onShow(reload)

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    keywords: [r.surname, r.gender, r.birth, r.style, r.fixChar ?? ''].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  const r = vm.raw
  const { id: _id, ts: _ts, pinned: _p, group: _g, dateText: _d, ...params } = r
  navigateTo(`/pkg-paipan2/qiming/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
function onPin(ids: string[]) {
  pinQimingHistory(ids)
  reload()
}
function onDelete(ids: string[]) {
  removeQimingHistory(ids)
  reload()
}
</script>

<template>
  <HistoryPage
    title="起名记录"
    back-href="/paipan/qiming"
    :records="vms"
    search-placeholder="搜索姓氏 / 风格 / 出生时间"
    empty-text="暂无起名记录，起名后自动保存"
    @pin="onPin"
    @delete="onDelete"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="line1">
        <text class="title">{{ rec.surname }}姓 · {{ rec.nameType === 'single' ? '单字名' : '双字名' }}</text>
        <text class="time">{{ formatRecordTime(rec.ts) }}</text>
      </view>
      <text class="badge">{{ STYLE_LABEL[rec.style] || rec.style }}</text>
      <text class="meta">
        {{ rec.gender }} · {{ rec.birth }}
        <text v-if="rec.fixChar"> · 定字「{{ rec.fixChar }}」</text>
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
