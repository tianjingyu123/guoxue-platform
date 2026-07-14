<script setup lang="ts">
/**
 * 小六壬起课记录（自 V0 app/xiaoliuren/history/page.tsx 还原）
 * 数据来自本地真实记录（../xiaoliuren-history），无记录即空态——不塞任何示例数据。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import { loadXiaoliurenHistory, removeXiaoliurenHistory, pinXiaoliurenHistory } from '../xiaoliuren-history'

const SCHOOL_LABEL: Record<string, string> = { daojia: '道家', jiangshi: '江氏', jiangshi2: '江氏2' }

const records = ref<any[]>([])
function reload() {
  records.value = loadXiaoliurenHistory()
}
onShow(reload)

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    keywords: [r.matter, r.palace ?? '', `${r.year}-${r.month}-${r.day}`].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  const r = vm.raw
  navigateTo(`/pkg-paipan/xiaoliuren/index?replay=${encodeURIComponent(JSON.stringify(r))}`)
}
function onPin(ids: string[]) {
  pinXiaoliurenHistory(ids)
  reload()
}
function onDelete(ids: string[]) {
  removeXiaoliurenHistory(ids)
  reload()
}
</script>

<template>
  <HistoryPage
    title="起课记录"
    back-href="/paipan/xiaoliuren"
    :records="vms"
    search-placeholder="搜索所占之事 / 落宫"
    empty-text="暂无起课记录，起课后自动保存"
    @pin="onPin"
    @delete="onDelete"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="line1">
        <text class="title">{{ rec.matter || '未填所占之事' }}</text>
        <text class="time">{{ formatRecordTime(rec.ts) }}</text>
      </view>
      <text v-if="rec.palace" class="badge">{{ rec.palace }}</text>
      <text class="meta">
        {{ SCHOOL_LABEL[rec.school] || rec.school }} ·
        {{ rec.qikeMode === 'number' ? '报数 ' + rec.numbers : '时间起课' }} ·
        {{ rec.year }}-{{ String(rec.month).padStart(2, '0') }}-{{ String(rec.day).padStart(2, '0') }}
        {{ String(rec.hour).padStart(2, '0') }}:{{ String(rec.minute).padStart(2, '0') }}
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
