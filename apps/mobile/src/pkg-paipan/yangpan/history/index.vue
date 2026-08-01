<script setup lang="ts">
/**
 * 阳盘命理奇门 · 排盘记录（自 V0 app/yangpan/history/page.tsx 还原）
 *
 * 🔴 原页是硬编码的 6 条假记录（张先生/李女士…），阳盘排完根本不落盘。
 * 现在：数据全部来自本地真实记录（result 页排盘成功即写入），无记录就是空态。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import {
  loadYangpanHistory, removeYangpanHistory, pinYangpanHistory, groupYangpanHistory,
  yangpanGroups, type YangpanHistoryItem,
} from '../yangpan-history'

const records = ref<YangpanHistoryItem[]>([])
const groupNames = ref<string[]>(yangpanGroups.load())
function reload() {
  groupNames.value = yangpanGroups.load()
  records.value = loadYangpanHistory()
}
onShow(reload)

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    group: r.group,
    keywords: [r.name, r.juLabel ?? '', r.zhiFu ?? '', r.zhiShiMen ?? '', r.place ?? '', `${r.year}-${r.month}-${r.day}`].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  const r = vm.raw as YangpanHistoryItem
  const q = [
    `name=${encodeURIComponent(r.name)}`, `gender=${r.gender}`,
    `year=${r.year}`, `month=${r.month}`, `day=${r.day}`, `hour=${r.hour}`, `minute=${r.minute ?? 0}`,
    `panMethod=${r.panMethod}`, `jigongMethod=${r.jigongMethod}`,
    `startMethod=${r.startMethod}`, `anganMethod=${r.anganMethod}`,
    r.place ? `place=${encodeURIComponent(r.place)}` : '',
    r.trueSolar ? 'trueSolar=1' : '',
  ].filter(Boolean).join('&')
  navigateTo(`/paipan/yangpan/result?${q}`)
}
function onPin(ids: string[]) { pinYangpanHistory(ids); reload() }
function onDelete(ids: string[]) { removeYangpanHistory(ids); reload() }
function onGroup(p: { ids: string[]; group: string }) { groupYangpanHistory(p.ids, p.group); reload() }

function pad(n: number) {
  return String(n).padStart(2, '0')
}
</script>

<template>
  <HistoryPage
    title="排盘记录"
    back-href="/paipan/yangpan"
    :records="vms"
    :groups="groupNames"
    search-placeholder="搜索姓名 / 局数 / 值符"
    empty-text="暂无排盘记录，排盘后自动保存"
    @pin="onPin"
    @delete="onDelete"
    @group="onGroup"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="row">
        <view :class="['avatar', rec.gender === 'female' ? 'av-f' : 'av-m']">
          {{ rec.gender === 'female' ? '女' : '男' }}
        </view>
        <view class="main">
          <view class="line1">
            <text class="name">{{ rec.name }}</text>
            <text v-if="rec.group && rec.group !== '全部'" class="tag">{{ rec.group }}</text>
            <text class="time">{{ formatRecordTime(rec.ts) }}</text>
          </view>
          <text class="birth">
            {{ rec.year }}年{{ pad(rec.month) }}月{{ pad(rec.day) }}日 {{ pad(rec.hour) }}:{{ pad(rec.minute ?? 0) }}
            <text v-if="rec.place"> · {{ rec.place }}</text>
          </text>
          <view class="line2">
            <text v-if="rec.juLabel" class="ju">{{ rec.juLabel }}</text>
            <text v-if="rec.zhiFu" class="meta">值符{{ rec.zhiFu }}</text>
            <text v-if="rec.zhiShiMen" class="meta">值使{{ rec.zhiShiMen }}</text>
          </view>
        </view>
      </view>
    </template>
  </HistoryPage>
</template>

<style scoped lang="scss">
.row {
  display: flex;
  gap: 20rpx;
}
.avatar {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
  border-radius: 50%;
  text-align: center;
  line-height: 64rpx;
  font-size: 24rpx;
  color: #fff;
}
.av-m { background: #33628c; }
.av-f { background: #b5432a; }
.main {
  flex: 1;
  min-width: 0;
}
.line1 {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.name {
  font-size: 28rpx;
  font-weight: 600;
  color: #3d2f22;
}
.tag {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #f0ebe3;
  font-size: 20rpx;
  color: #8a7a68;
}
.time {
  margin-left: auto;
  font-size: 20rpx;
  color: #a89b8a;
}
.birth {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a7a68;
}
.line2 {
  display: flex;
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
.meta {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: #f5f1ea;
  font-size: 20rpx;
  color: #8a7a68;
}
</style>
