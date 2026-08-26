<script setup lang="ts">
/**
 * 八宅排盘·入口页（自 V0 app/bazhai/page.tsx 还原）
 * 表单：客户名称 / 住宅坐向（二十四山，实时预览宅卦）/ 命主性别与出生年份（选填，实时预览命卦）
 *       / 宅命相配预览。
 * 排盘后跳结果页本地重算；排盘记录本地存储（key: rebu:bazhai-history，上限 50，内嵌卡）。
 * 取舍：V0 独立 history 页砍成入口页内嵌历史卡（与太乙/大六壬批次范式一致）；
 *       V0 底部弹层选择器换 uni-app 原生 picker（selector），出生年份加「暂不填写」项保持选填语义。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { MOUNTAINS } from '@/pkg-paipan3/lib/xuankong-data'
import { sittingGua, mingGua, GUA_INFO, groupName } from '@/pkg-paipan3/lib/bazhai-data'
import {
  loadBazhaiHistory,
  clearBazhaiHistory,
  formatHistoryTime,
  type BazhaiParams,
  type BazhaiHistoryItem,
  type BazhaiGender,
} from './bazhai-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '八宅排盘'
// #ifdef MP-WEIXIN
hdrTitle = '八宅文化研究'
// #endif

const CURRENT_YEAR = new Date().getFullYear()

function shanxiangLabel(i: number): string {
  return `${MOUNTAINS[i]}山${MOUNTAINS[(i + 12) % 24]}向`
}

// ── 表单 ──
const customer = ref('')
const sittingIdx = ref<number | null>(null)
const gender = ref<BazhaiGender>('male')
const birthYear = ref<number | null>(null)

// picker 选项：坐向带宅卦标注；年份首项「暂不填写」保持选填语义
const SHANXIANG_LABELS = MOUNTAINS.map((_, i) => {
  const g = sittingGua(i)
  return `${shanxiangLabel(i)}（${g}宅·${groupName(g)}）`
})
const YEAR_LIST = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i)
const YEAR_LABELS = ['暂不填写', ...YEAR_LIST.map((y) => `${y}年`)]

function onSittingChange(e: { detail: { value: string | number } }) {
  sittingIdx.value = Number(e.detail.value)
}
function onYearChange(e: { detail: { value: string | number } }) {
  const idx = Number(e.detail.value)
  birthYear.value = idx === 0 ? null : YEAR_LIST[idx - 1]
}

// ── 实时预览 ──
const zhai = computed(() => (sittingIdx.value !== null ? sittingGua(sittingIdx.value) : null))
const ming = computed(() => (birthYear.value !== null ? mingGua(birthYear.value, gender.value) : null))
const matched = computed(() =>
  zhai.value && ming.value ? GUA_INFO[zhai.value].group === GUA_INFO[ming.value].group : null,
)

// ── 排盘记录 ──
const history = ref<BazhaiHistoryItem[]>([])
onShow(() => {
  history.value = loadBazhaiHistory()
})

function onClearHistory() {
  uni.showModal({
    title: '清空记录',
    content: '确定清空全部排盘记录？',
    success: (res) => {
      if (res.confirm) {
        clearBazhaiHistory()
        history.value = []
      }
    },
  })
}

function openRecord(h: BazhaiHistoryItem) {
  navigateTo(`/pkg-paipan3/bazhai/result?payload=${encodeURIComponent(JSON.stringify(h.params))}`)
}

// ── 开始排盘 ──
function handleSubmit() {
  if (sittingIdx.value === null) {
    uni.showToast({ title: '请先选择住宅坐向', icon: 'none' })
    return
  }
  const params: BazhaiParams = {
    customer: customer.value.trim().slice(0, 20),
    sitting: sittingIdx.value,
    gender: gender.value,
    birthYear: birthYear.value ?? 0,
  }
  navigateTo(`/pkg-paipan3/bazhai/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header history-href="/paipan/bazhai/history" :title="hdrTitle" subtitle="大游年起星 · 东西四宅" share />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <paper-card padding="none">
          <!-- 客户名称 -->
          <view class="row row-bd">
            <text class="row-label">客户名称<text class="row-opt">（选填）</text></text>
            <input
              v-model="customer"
              class="name-input"
              type="text"
              :maxlength="20"
              placeholder="请输入客户名称"
              placeholder-class="input-ph"
            >
          </view>

          <!-- 住宅坐向 -->
          <view class="row-col row-bd">
            <view class="row-line">
              <text class="row-label">住宅坐向</text>
              <picker mode="selector" :range="SHANXIANG_LABELS" :value="sittingIdx ?? 0" @change="onSittingChange">
                <view class="sel-btn" :class="{ 'sel-btn-on': sittingIdx !== null }">
                  <text class="sel-btn-text" :class="{ 'sel-btn-text-off': sittingIdx === null }">
                    {{ sittingIdx === null ? '选择山向' : shanxiangLabel(sittingIdx) }}
                  </text>
                  <app-icon name="chevron-down" :size="26" color="var(--text-soft)" />
                </view>
              </picker>
            </view>
            <text v-if="zhai" class="row-preview">{{ zhai }}宅 · {{ groupName(zhai) }}宅 · 坐{{ GUA_INFO[zhai].dirShort }}</text>
          </view>

          <!-- 命主信息 -->
          <view class="row-col row-bd">
            <view class="row-line">
              <text class="row-label">命主信息</text>
              <view class="ctrl-group">
                <view class="chips">
                  <view class="chip" :class="{ 'chip-on': gender === 'male' }" @tap="gender = 'male'">
                    <text class="chip-text" :class="{ 'chip-text-on': gender === 'male' }">男</text>
                  </view>
                  <view class="chip" :class="{ 'chip-on': gender === 'female' }" @tap="gender = 'female'">
                    <text class="chip-text" :class="{ 'chip-text-on': gender === 'female' }">女</text>
                  </view>
                </view>
                <picker
                  mode="selector"
                  :range="YEAR_LABELS"
                  :value="birthYear === null ? 0 : YEAR_LIST.indexOf(birthYear) + 1"
                  @change="onYearChange"
                >
                  <view class="sel-btn" :class="{ 'sel-btn-on': birthYear !== null }">
                    <text class="sel-btn-text" :class="{ 'sel-btn-text-off': birthYear === null }">
                      {{ birthYear === null ? '出生年份(选填)' : `${birthYear}年` }}
                    </text>
                    <app-icon name="chevron-down" :size="26" color="var(--text-soft)" />
                  </view>
                </picker>
              </view>
            </view>
            <text v-if="ming" class="row-preview">{{ ming }}命 · {{ groupName(ming) }}命</text>
            <text class="row-hint">命卦以出生年份定（立春为岁首，年初出生者请留意）。填写后可分析宅命相配与个人吉方。</text>
          </view>

          <!-- 宅命预览 -->
          <view v-if="zhai && ming" class="match-row">
            <text class="match-text">{{ groupName(zhai) }}宅 × {{ groupName(ming) }}命</text>
            <view class="match-badge" :class="matched ? 'match-good' : 'match-bad'">
              <text class="match-badge-text" :class="matched ? 'match-good-t' : 'match-bad-t'">
                {{ matched ? '宅命相配' : '宅命不配' }}
              </text>
            </view>
          </view>
        </paper-card>

        <!-- 开始排盘 -->
        <view class="submit" @tap="handleSubmit">
          <app-icon name="compass" :size="32" color="#ffffff" />
          <text class="submit-text">开始排盘</text>
        </view>

        <!-- 排盘记录（V0 独立 history 页砍成内嵌卡） -->
        <view v-if="history.length" class="his-sec">
          <section-title title="排盘记录" subtitle="点击重看盘面，最近 50 条">
            <template #action>
              <view class="his-clear" @tap="onClearHistory">
                <text class="his-clear-text">清空</text>
              </view>
            </template>
          </section-title>
          <paper-card padding="none">
            <view
              v-for="(h, i) in history"
              :key="h.ts"
              class="his-item"
              :class="{ 'row-bd': i < history.length - 1 }"
              @tap="openRecord(h)"
            >
              <view class="his-main">
                <view class="his-line1">
                  <text class="his-topic">{{ h.params.customer || '未填写' }}</text>
                  <text class="his-summary">{{ h.summary }}</text>
                </view>
                <text class="his-date">{{ formatHistoryTime(h.ts) }}</text>
              </view>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </paper-card>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="八宅游年为传统堪舆学说，所示方位吉凶仅供文化研究与参考，切勿迷信。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 28rpx; }

/* 表单行 */
.row { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; padding: 30rpx 32rpx; }
.row-col { display: flex; flex-direction: column; gap: 14rpx; padding: 30rpx 32rpx; }
.row-line { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; }
.row-bd { border-bottom: 1rpx solid var(--line); }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.row-opt { font-size: 22rpx; font-weight: 400; color: var(--text-soft); }
.row-preview { text-align: right; font-size: 22rpx; color: var(--text-soft); }
.row-hint { font-size: 22rpx; line-height: 1.6; color: rgba(153, 153, 153, 0.8); }
.name-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }
.input-ph { color: rgba(153, 153, 153, 0.5); }

/* 选择按钮 */
.sel-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  border: 2rpx solid var(--line);
  background: var(--bg-paper);
}
.sel-btn:active { background: rgba(0, 0, 0, 0.02); }
.sel-btn-on { border-color: rgba(196, 30, 58, 0.5); }
.sel-btn-text { font-size: 26rpx; color: var(--text-ink); }
.sel-btn-text-off { color: var(--text-soft); }

/* 性别 chips */
.ctrl-group { display: flex; align-items: center; gap: 16rpx; }
.chips { display: flex; border-radius: 16rpx; border: 2rpx solid var(--line); overflow: hidden; }
.chip { padding: 16rpx 28rpx; background: var(--bg-paper); }
.chip-on { background: var(--brand); }
.chip-text { font-size: 26rpx; color: var(--text-soft); }
.chip-text-on { color: #fff; font-weight: 500; }

/* 宅命预览 */
.match-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  background: rgba(0, 0, 0, 0.025);
}
.match-text { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
.match-badge { padding: 4rpx 16rpx; border-radius: 999rpx; }
.match-badge-text { font-size: 22rpx; font-weight: 600; }
.match-good { background: rgba(47, 157, 106, 0.1); }
.match-good-t { color: #2f9d6a; }
.match-bad { background: rgba(196, 30, 58, 0.1); }
.match-bad-t { color: var(--brand); }

/* 开始排盘 */
.submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 30rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
}
.submit:active { transform: scale(0.99); }
.submit-text { font-size: 32rpx; font-weight: 700; color: #fff; }

/* 排盘记录 */
.his-sec { display: flex; flex-direction: column; gap: 20rpx; }
.his-clear { padding: 8rpx 24rpx; border-radius: 999rpx; border: 2rpx solid var(--line); }
.his-clear-text { font-size: 24rpx; color: var(--text-soft); }
.his-item {
  display: flex; align-items: center; justify-content: space-between; gap: 20rpx;
  padding: 24rpx 32rpx;
}
.his-item:active { background: rgba(0, 0, 0, 0.02); }
.his-main { display: flex; flex-direction: column; gap: 6rpx; min-width: 0; flex: 1; }
.his-line1 { display: flex; align-items: center; gap: 16rpx; min-width: 0; }
.his-topic {
  font-size: 28rpx; font-weight: 500; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.his-summary { font-family: Georgia, 'Songti SC', serif; font-size: 24rpx; color: var(--brand); flex-shrink: 0; }
.his-date { font-size: 22rpx; color: var(--text-soft); }
</style>
