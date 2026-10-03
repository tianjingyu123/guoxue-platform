<script setup lang="ts">
/**
 * 玄空飞星排盘记录（自 V0 app/xuankong/history/page.tsx 还原）
 * 数据来自本地真实记录（../xuankong-history），无记录即空态——不塞任何示例数据。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import { loadXuankongHistory, removeXuankongHistory, pinXuankongHistory } from '../xuankong-history'

const records = ref<any[]>([])
function reload() {
  records.value = loadXuankongHistory()
}
onShow(reload)

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    keywords: [r.params.customer, r.summary].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  const r = vm.raw
  navigateTo(`/pkg-paipan/xuankong/result?payload=${encodeURIComponent(JSON.stringify(r.params))}`)
}
function onPin(ids: string[]) {
  pinXuankongHistory(ids)
  reload()
}
function onDelete(ids: string[]) {
  removeXuankongHistory(ids)
  reload()
}
</script>

<template>
  <HistoryPage
    title="排盘记录"
    back-href="/paipan/xuankong"
    :records="vms"
    search-placeholder="搜索客户 / 坐山 / 格局"
    empty-text="暂无排盘记录，排盘后自动保存"
    @pin="onPin"
    @delete="onDelete"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="line1">
        <text class="title">{{ rec.params.customer || '未命名客户' }}</text>
        <text class="time">{{ formatRecordTime(rec.ts) }}</text>
      </view>
      <text class="summary">{{ rec.summary }}</text>
      <text class="meta">{{ rec.params.ti ? '替卦' : '下卦' }} · {{ rec.params.period }} 运</text>
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
