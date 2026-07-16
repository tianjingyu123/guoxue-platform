<script setup lang="ts">
/**
 * 阴盘奇门起局记录（自 V0 app/yinpan/history/page.tsx 还原）
 * 数据来自本地真实记录（../yinpan-history），无记录即空态——不塞任何示例数据。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import { loadYinpanHistory, removeYinpanHistory, pinYinpanHistory } from '../yinpan-history'

const records = ref<any[]>([])
function reload() {
  records.value = loadYinpanHistory()
}
onShow(reload)

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    keywords: [r.params.matter, r.summary].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  const r = vm.raw
  navigateTo(`/pkg-paipan/yinpan/result?payload=${encodeURIComponent(JSON.stringify(r.params))}`)
}
function onPin(ids: string[]) {
  pinYinpanHistory(ids)
  reload()
}
function onDelete(ids: string[]) {
  removeYinpanHistory(ids)
  reload()
}
</script>

<template>
  <HistoryPage
    title="起局记录"
    back-href="/paipan/yinpan"
    :records="vms"
    search-placeholder="搜索所问之事 / 局数"
    empty-text="暂无起局记录，起局后自动保存"
    cta-text="去起局"
    @pin="onPin"
    @delete="onDelete"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="line1">
        <text class="title">{{ rec.params.matter || '未填所问之事' }}</text>
        <text class="time">{{ formatRecordTime(rec.ts) }}</text>
      </view>
      <text class="summary">{{ rec.summary }}</text>
      <text class="meta">
        起局 {{ rec.params.year }}-{{ String(rec.params.month).padStart(2, '0') }}-{{ String(rec.params.day).padStart(2, '0') }}
        {{ String(rec.params.hour).padStart(2, '0') }}:{{ String(rec.params.minute).padStart(2, '0') }}
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
