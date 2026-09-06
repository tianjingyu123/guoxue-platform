<script setup lang="ts">
/**
 * 姓名解析记录（自 V0 app/xingming/history/page.tsx 还原）
 * 数据来自本地真实记录（../history），无记录即空态——不塞任何示例数据。
 */
import { ref, computed } from 'vue'
import { useNativePreviewPage } from '@/composables/useNativePreviewPage'
import ToolHeader from '@/components/paipan/tool-header.vue'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import { loadXingmingHistory, removeXingmingHistory, pinXingmingHistory } from '../history'

const records = ref<any[]>([])
function reload() {
  records.value = loadXingmingHistory()
}
const preview = useNativePreviewPage(reload, () => { records.value = [] })

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    keywords: [r.name, r.gender, r.birth, r.city ?? ''].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  if (!preview.allowed.value) return
  const r = vm.raw
  const payload = { name: r.name, gender: r.gender, birth: r.birth, city: r.city ?? '', district: r.district ?? '' }
  navigateTo(`/pkg-paipan2/xingming/result?payload=${encodeURIComponent(JSON.stringify(payload))}`)
}
function onPin(ids: string[]) {
  if (!preview.allowed.value) return
  const selected = [...ids]
  void preview.run(() => { pinXingmingHistory(selected); reload() })
}
function onDelete(ids: string[]) {
  if (!preview.allowed.value) return
  const selected = [...ids]
  void preview.run(() => { removeXingmingHistory(selected); reload() })
}
</script>

<template>
  <view v-if="!preview.allowed.value">
    <tool-header title="解析记录" />
    <text>{{ preview.checking.value ? '正在处理，请稍候' : '当前无法访问，请重新确认' }}</text>
    <button :disabled="preview.checking.value" @tap="preview.run()">重新确认</button>
  </view>
  <HistoryPage
    v-else
    title="解析记录"
    back-href="/paipan/xingming"
    :records="vms"
    search-placeholder="搜索姓名 / 出生时间"
    empty-text="暂无解析记录，解析后自动保存"
    cta-text="去解析"
    @pin="onPin"
    @delete="onDelete"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="line1">
        <text class="title">{{ rec.name }}</text>
        <text class="time">{{ formatRecordTime(rec.ts) }}</text>
      </view>
      <text class="badge">{{ rec.score }} 分</text>
      <text class="meta">
        {{ rec.gender }} · {{ rec.birth }}
        <text v-if="rec.city"> · {{ rec.city }}</text>
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
