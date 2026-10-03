<script setup lang="ts">
/**
 * 八字排盘记录（自 V0 app/bazi/history/page.tsx 还原）
 *
 * 🔴 原页是硬编码的 6 条假记录（孙哥儿子/王雷/老段女儿…），而八字排完根本不落盘。
 * 现在：数据全部来自本地真实记录（result 页排盘成功即写入），无记录就是空态。
 * 能力：搜索（姓名/四柱/出生年月）+ 分组标签 + 置顶 + 批量删除/分组。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HistoryPage, { type HistoryVM } from '@/components/paipan/history-page.vue'
import { navigateTo } from '@/utils/router'
import { formatRecordTime } from '@/lib/paipan/history-core'
import {
  loadBaziHistory, removeBaziHistory, pinBaziHistory, groupBaziHistory,
  baziGroups, type BaziHistoryItem,
} from '../bazi-history'

// 天干地支 → 五行配色（沿用原页配色）
const tianGanColors: Record<string, string> = {
  甲: 'wx-wood', 乙: 'wx-wood', 丙: 'wx-fire', 丁: 'wx-fire',
  戊: 'wx-earth', 己: 'wx-earth', 庚: 'wx-metal', 辛: 'wx-metal',
  壬: 'wx-water', 癸: 'wx-water',
}
const diZhiColors: Record<string, string> = {
  子: 'wx-water', 丑: 'wx-earth', 寅: 'wx-wood', 卯: 'wx-wood',
  辰: 'wx-earth', 巳: 'wx-fire', 午: 'wx-fire', 未: 'wx-earth',
  申: 'wx-metal', 酉: 'wx-metal', 戌: 'wx-earth', 亥: 'wx-water',
}
function colorOf(ch: string): string {
  return tianGanColors[ch] || diZhiColors[ch] || ''
}

const records = ref<BaziHistoryItem[]>([])
const groupNames = ref<string[]>(baziGroups.load())
function reload() {
  groupNames.value = baziGroups.load()
  records.value = loadBaziHistory()
}
onShow(reload)

function pillarChars(r: BaziHistoryItem): string[] {
  const p = r.pillars
  if (!p) return []
  return [p.yearGan, p.yearZhi, p.monthGan, p.monthZhi, p.dayGan, p.dayZhi, p.hourGan, p.hourZhi]
}

const vms = computed<HistoryVM[]>(() =>
  records.value.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    group: r.group,
    keywords: [r.name, r.gender, `${r.year}`, `${r.month}`, `${r.day}`, r.city ?? '', ...pillarChars(r)].join(' '),
    raw: r,
  })),
)

function open(vm: HistoryVM) {
  const r = vm.raw as BaziHistoryItem
  const q = [
    `name=${encodeURIComponent(r.name)}`, `gender=${encodeURIComponent(r.gender)}`,
    `year=${r.year}`, `month=${r.month}`, `day=${r.day}`, `hour=${r.hour}`, `minute=${r.minute}`,
  ]
  // 带 serverId：result 页据此复用原后端 PaipanRecord，不再每次重开都 createRecord 新建（记录膨胀+点评挂错盘）
  if (r.serverId) q.push(`id=${encodeURIComponent(r.serverId)}`)
  navigateTo(`/paipan/bazi/result?${q.join('&')}`)
}
function onPin(ids: string[]) { pinBaziHistory(ids); reload() }
function onDelete(ids: string[]) { removeBaziHistory(ids); reload() }
function onGroup(p: { ids: string[]; group: string }) { groupBaziHistory(p.ids, p.group); reload() }
</script>

<template>
  <HistoryPage
    title="排盘记录"
    back-href="/paipan/bazi"
    :records="vms"
    :groups="groupNames"
    search-placeholder="搜索姓名 / 四柱 / 出生年月"
    empty-text="暂无排盘记录，排盘后自动保存"
    @pin="onPin"
    @delete="onDelete"
    @group="onGroup"
    @open="open"
  >
    <template #card="{ rec }">
      <view class="row">
        <view :class="['avatar', rec.gender === '女' ? 'av-f' : 'av-m']">{{ rec.gender }}</view>
        <view class="main">
          <view class="line1">
            <text class="name">{{ rec.name }}</text>
            <text v-if="rec.group && rec.group !== '全部'" class="tag">{{ rec.group }}</text>
            <text class="time">{{ formatRecordTime(rec.ts) }}</text>
          </view>
          <text class="birth">
            {{ rec.year }}年{{ rec.month }}月{{ rec.day }}日
            {{ String(rec.hour).padStart(2, '0') }}:{{ String(rec.minute).padStart(2, '0') }}
            <text v-if="rec.city"> · {{ rec.city }}</text>
          </text>
          <view v-if="rec.pillars" class="pillars">
            <text v-for="(ch, i) in pillarChars(rec)" :key="i" :class="['gz', colorOf(ch)]">{{ ch }}</text>
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
.pillars {
  display: flex;
  gap: 8rpx;
  margin-top: 10rpx;
}
.gz {
  width: 40rpx;
  height: 40rpx;
  border-radius: 6rpx;
  text-align: center;
  line-height: 40rpx;
  font-size: 24rpx;
  background: #f5f1ea;
  color: #3d2f22;
}
.wx-wood { background: rgba(63, 125, 58, 0.12); color: #3f7d3a; }
.wx-fire { background: rgba(181, 67, 42, 0.12); color: #b5432a; }
.wx-earth { background: rgba(138, 109, 59, 0.12); color: #8a6d3b; }
.wx-metal { background: rgba(168, 116, 44, 0.12); color: #a8742c; }
.wx-water { background: rgba(51, 98, 140, 0.12); color: #33628c; }
</style>
