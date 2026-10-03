<script setup lang="ts">
/**
 * 八字合盘记录（自 V0 app/hepan/history/page.tsx 还原）
 * 数据来自本地真实记录（../hepan-history），无记录即空态——不塞任何示例数据。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import { loadHepanHistory, removeHepanHistory, pinHepanHistory } from '../hepan-history'

const SCENE_LABEL: Record<string, string> = { marriage: '婚恋合盘', business: '合作合盘', parent: '亲子合盘', friend: '朋友合盘' }

const records = ref<any[]>([])
function reload() {
  records.value = loadHepanHistory()
}
onShow(reload)

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    keywords: [r.params.a.name, r.params.b.name, r.summary].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  const r = vm.raw
  navigateTo(`/pkg-paipan/hepan/result?payload=${encodeURIComponent(JSON.stringify(r.params))}`)
}
function onPin(ids: string[]) {
  pinHepanHistory(ids)
  reload()
}
function onDelete(ids: string[]) {
  removeHepanHistory(ids)
  reload()
}
</script>

<template>
  <HistoryPage
    title="合盘记录"
    back-href="/paipan/hepan"
    :records="vms"
    search-placeholder="搜索姓名 / 合盘结论"
    empty-text="暂无合盘记录，合盘后自动保存"
    cta-text="去合盘"
    @pin="onPin"
    @delete="onDelete"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="line1">
        <text class="title">{{ rec.params.a.name || '甲方' }} ✕ {{ rec.params.b.name || '乙方' }}</text>
        <text class="time">{{ formatRecordTime(rec.ts) }}</text>
      </view>
      <text class="summary">{{ rec.summary }}</text>
      <text class="meta">{{ SCENE_LABEL[rec.params.scene] || rec.params.scene }}</text>
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
