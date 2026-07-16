<script setup lang="ts">
/**
 * 奇门起局记录（自 V0 app/qimen/history/page.tsx 还原）
 *
 * 🔴 原页是硬编码的 5 条假记录（求财运势/出行吉凶…），奇门起局根本不落盘。
 * 现在：数据全部来自本地真实记录（result 页起局成功即写入），无记录就是空态。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import {
  loadQimenHistory, removeQimenHistory, pinQimenHistory, groupQimenHistory,
  qimenGroups, type QimenHistoryItem,
} from '../qimen-history'

const PAN_LABEL: Record<string, string> = { zhuan: '转盘', fei: '飞盘' }

const records = ref<QimenHistoryItem[]>([])
const groupNames = ref<string[]>(qimenGroups.load())
function reload() {
  groupNames.value = qimenGroups.load()
  records.value = loadQimenHistory()
}
onShow(reload)

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    group: r.group,
    keywords: [r.matter, r.juLabel ?? '', r.zhiFu ?? '', r.zhiShiMen ?? '', r.jieQi ?? '', `${r.year}-${r.month}-${r.day}`].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  const r = vm.raw as QimenHistoryItem
  const q = [
    `matter=${encodeURIComponent(r.matter || '')}`,
    `year=${r.year}`, `month=${r.month}`, `day=${r.day}`, `hour=${r.hour}`, `minute=${r.minute ?? 0}`,
    `panMethod=${r.panMethod}`, `flyMethod=${r.flyMethod}`, `startMethod=${r.startMethod}`, `anganMethod=${r.anganMethod}`,
    r.customJu ? `customJu=${r.customJu}` : '',
    r.useTrueSolar ? `useTrueSolar=1&lat=${r.lat ?? 0}&lng=${r.lng ?? 0}` : '',
  ].filter(Boolean).join('&')
  navigateTo(`/paipan/qimen/result?${q}`)
}
function onPin(ids: string[]) { pinQimenHistory(ids); reload() }
function onDelete(ids: string[]) { removeQimenHistory(ids); reload() }
function onGroup(p: { ids: string[]; group: string }) { groupQimenHistory(p.ids, p.group); reload() }

function pad(n: number) {
  return String(n).padStart(2, '0')
}
</script>

<template>
  <HistoryPage
    title="起局记录"
    back-href="/paipan/qimen"
    :records="vms"
    :groups="groupNames"
    search-placeholder="搜索所问之事 / 局数 / 值符"
    empty-text="暂无起局记录，起局后自动保存"
    cta-text="去起局"
    @pin="onPin"
    @delete="onDelete"
    @group="onGroup"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="line1">
        <text class="matter">{{ rec.matter || '未填所问之事' }}</text>
        <text v-if="rec.group && rec.group !== '全部'" class="tag">{{ rec.group }}</text>
        <text class="time">{{ formatRecordTime(rec.ts) }}</text>
      </view>
      <view class="line2">
        <text class="ju">{{ rec.juLabel || '—' }}</text>
        <text class="pan">{{ PAN_LABEL[rec.panMethod] || rec.panMethod }}</text>
        <text v-if="rec.jieQi" class="jq">{{ rec.jieQi }}</text>
      </view>
      <text class="line3">
        起局 {{ rec.year }}-{{ pad(rec.month) }}-{{ pad(rec.day) }} {{ pad(rec.hour) }}:{{ pad(rec.minute ?? 0) }}
        <text v-if="rec.zhiFu"> · 值符{{ rec.zhiFu }}</text>
        <text v-if="rec.zhiShiMen"> · 值使{{ rec.zhiShiMen }}</text>
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
.matter {
  font-size: 28rpx;
  font-weight: 600;
  color: #3d2f22;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #f0ebe3;
  font-size: 20rpx;
  color: #8a7a68;
}
.time {
  font-size: 20rpx;
  color: #a89b8a;
}
.line2 {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 10rpx;
}
.ju {
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: rgba(196, 30, 58, 0.08);
  font-size: 22rpx;
  font-weight: 600;
  color: #c41e3a;
}
.pan,
.jq {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: #f5f1ea;
  font-size: 20rpx;
  color: #8a7a68;
}
.line3 {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #8a7a68;
}
</style>
