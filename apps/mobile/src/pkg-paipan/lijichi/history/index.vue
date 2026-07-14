<script setup lang="ts">
/**
 * 立极尺记录（自 V0 app/lijichi/history/page.tsx 还原）
 * 数据来自本地真实记录（../lijichi-history），无记录即空态——不塞任何示例数据。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import { loadLijichiHistory, removeLijichiHistory, pinLijichiHistory } from '../lijichi-history'

const records = ref<any[]>([])
function reload() {
  records.value = loadLijichiHistory()
}
onShow(reload)

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    keywords: [r.client, r.shanxiang, r.note ?? ''].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  const r = vm.raw
  const params: Record<string, unknown> = { customer: r.client === '未命名' ? '' : r.client, sitting: r.sitting }
  if (typeof r.heading === 'number') params.heading = r.heading
  if (r.plate) params.plate = r.plate
  if (r.note) params.note = r.note
  navigateTo(`/pkg-paipan/lijichi/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
function onPin(ids: string[]) {
  pinLijichiHistory(ids)
  reload()
}
function onDelete(ids: string[]) {
  removeLijichiHistory(ids)
  reload()
}
</script>

<template>
  <HistoryPage
    title="测量记录"
    back-href="/paipan/lijichi"
    :records="vms"
    search-placeholder="搜索客户 / 坐山朝向 / 笔记"
    empty-text="暂无测量记录，在盘面页点「保存」后出现"
    @pin="onPin"
    @delete="onDelete"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="line1">
        <text class="title">{{ rec.client }}</text>
        <text class="time">{{ formatRecordTime(rec.ts) }}</text>
      </view>
      <text class="badge">{{ rec.shanxiang }}</text>
      <text class="meta">
        {{ rec.dateText }}
        <text v-if="typeof rec.heading === 'number'"> · {{ rec.heading }}°</text>
      </text>
      <text v-if="rec.note" class="summary">{{ rec.note }}</text>
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
