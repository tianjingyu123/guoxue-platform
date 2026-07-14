<script setup lang="ts">
/**
 * 八字合盘·入口页（自 V0 app/hepan/page.tsx 还原）
 * 表单：合盘场景（婚恋/合伙/亲子/朋友）+ 甲乙双方（姓名 / 性别 / 生辰）。
 * 合盘后跳结果页本地重算（lib/hepan-engine，零后端依赖）；记录本地存储（key: rebu:hepan-history，上限 50）。
 *
 * 取舍：
 * 1. V0 采集「出生地区」但引擎 buildPerson 固定传 useTrueSolar:false，city 不参与任何计算——
 *    采集一个不影响结果的字段会误导用户，故砍掉地区选择器。
 * 2. V0 独立 history 页砍成入口页内嵌历史卡（与玄空/太乙/大六壬批次范式一致）。
 * 3. 与 pkg-paipan/couple/*（邀 TA 授权测缘分的裂变功能）是两个独立工具：
 *    couple 出于隐私红线永远拿不到对方生辰，本工具是从业者当场录入双方生辰的排盘工具。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import DatePickerModal from '@/components/bazi/date-picker-modal.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { HEPAN_SCENES } from '@/pkg-paipan/lib/hepan-data'
import { toSolarSafe } from '@/pkg-paipan/lib/date-convert'
import {
  loadHepanHistory,
  clearHepanHistory,
  formatPersonTime,
  type HepanParams,
  type HepanPersonParams,
  type HepanHistoryItem,
} from './hepan-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案，路由/逻辑不变）
let hdrTitle = '八字合盘'
// #ifdef MP-WEIXIN
hdrTitle = '合婚文化研究'
// #endif

const sceneKey = ref('marriage')
const scene = computed(() => HEPAN_SCENES.find((s) => s.key === sceneKey.value) ?? HEPAN_SCENES[0])

function mkPerson(gender: '男' | '女'): HepanPersonParams {
  return { name: '', gender, year: 1992, month: 8, day: 16, hour: 10, minute: 30 }
}

const personA = ref<HepanPersonParams>(mkPerson('男'))
const personB = ref<HepanPersonParams>(mkPerson('女'))

// 日期弹窗：双方共用一个实例，用 dateTarget 写回
const showDatePicker = ref(false)
const dateTarget = ref<'a' | 'b'>('a')

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function birthText(p: HepanPersonParams): string {
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}

const editingPerson = computed(() => (dateTarget.value === 'a' ? personA.value : personB.value))

function openDatePicker(target: 'a' | 'b') {
  dateTarget.value = target
  showDatePicker.value = true
}

function onDateConfirm(d: {
  year: number; month: number; day: number
  hour: number | null; minute: number | null; isLunar?: boolean
}) {
  const target = dateTarget.value === 'a' ? personA : personB
  const hour = d.hour ?? target.value.hour
  const minute = d.minute ?? target.value.minute
  // 农历输入归一为公历：computeBazi 入参恒为公历，否则农历数字会被当公历排四柱
  const { date, ok } = toSolarSafe({ year: d.year, month: d.month, day: d.day, hour, minute, isLunar: d.isLunar })
  if (!ok) {
    uni.showToast({ title: '农历日期无效，请重新选择', icon: 'none' })
    return
  }
  target.value = { ...target.value, ...date }
}

// ── 排盘记录 ──
const history = ref<HepanHistoryItem[]>([])
onShow(() => {
  history.value = loadHepanHistory()
})

function onClearHistory() {
  uni.showModal({
    title: '清空记录',
    content: '确定清空全部合盘记录？',
    success: (res) => {
      if (res.confirm) {
        clearHepanHistory()
        history.value = []
      }
    },
  })
}

function sceneLabelOf(key: string): string {
  return HEPAN_SCENES.find((s) => s.key === key)?.label ?? key
}

function openRecord(h: HepanHistoryItem) {
  navigateTo(`/pkg-paipan/hepan/result?payload=${encodeURIComponent(JSON.stringify(h.params))}`)
}

// ── 开始合盘 ──
function handleSubmit() {
  const params: HepanParams = {
    scene: sceneKey.value,
    a: { ...personA.value, name: personA.value.name.trim().slice(0, 20) },
    b: { ...personB.value, name: personB.value.name.trim().slice(0, 20) },
  }
  navigateTo(`/pkg-paipan/hepan/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header history-href="/paipan/hepan/history" :title="hdrTitle" subtitle="双人四柱 · 五维合参" share />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <!-- 合盘场景 -->
        <view class="sec">
          <section-title title="合盘场景" subtitle="不同场景取用不同的十神与神煞法度" />
          <view class="scene-grid">
            <view
              v-for="s in HEPAN_SCENES"
              :key="s.key"
              class="scene-card"
              :class="{ 'scene-on': sceneKey === s.key }"
              @tap="sceneKey = s.key"
            >
              <view class="scene-head">
                <text class="scene-label" :class="{ 'scene-label-on': sceneKey === s.key }">{{ s.label }}</text>
                <view v-if="sceneKey === s.key" class="scene-check">
                  <app-icon name="check" :size="20" color="#ffffff" />
                </view>
              </view>
              <text class="scene-desc">{{ s.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 甲方 -->
        <view class="sec">
          <section-title :title="scene.roleA" subtitle="姓名选填，性别与生辰必填" />
          <paper-card padding="none">
            <view class="row row-bd">
              <text class="row-label">姓名<text class="row-opt">（选填）</text></text>
              <input
                v-model="personA.name"
                class="name-input"
                type="text"
                :maxlength="20"
                placeholder="请输入姓名"
                placeholder-class="input-ph"
              >
            </view>
            <view class="row row-bd">
              <text class="row-label">性别</text>
              <view class="seg">
                <view class="seg-btn" :class="{ 'seg-on': personA.gender === '男' }" @tap="personA.gender = '男'">
                  <text class="seg-text" :class="{ 'seg-text-on': personA.gender === '男' }">男</text>
                </view>
                <view class="seg-btn" :class="{ 'seg-on': personA.gender === '女' }" @tap="personA.gender = '女'">
                  <text class="seg-text" :class="{ 'seg-text-on': personA.gender === '女' }">女</text>
                </view>
              </view>
            </view>
            <view class="row row-tap" @tap="openDatePicker('a')">
              <text class="row-label">出生时间</text>
              <view class="row-value">
                <text class="row-value-text">{{ birthText(personA) }}</text>
                <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
              </view>
            </view>
          </paper-card>
        </view>

        <!-- 乙方 -->
        <view class="sec">
          <section-title :title="scene.roleB" subtitle="姓名选填，性别与生辰必填" />
          <paper-card padding="none">
            <view class="row row-bd">
              <text class="row-label">姓名<text class="row-opt">（选填）</text></text>
              <input
                v-model="personB.name"
                class="name-input"
                type="text"
                :maxlength="20"
                placeholder="请输入姓名"
                placeholder-class="input-ph"
              >
            </view>
            <view class="row row-bd">
              <text class="row-label">性别</text>
              <view class="seg">
                <view class="seg-btn" :class="{ 'seg-on': personB.gender === '男' }" @tap="personB.gender = '男'">
                  <text class="seg-text" :class="{ 'seg-text-on': personB.gender === '男' }">男</text>
                </view>
                <view class="seg-btn" :class="{ 'seg-on': personB.gender === '女' }" @tap="personB.gender = '女'">
                  <text class="seg-text" :class="{ 'seg-text-on': personB.gender === '女' }">女</text>
                </view>
              </view>
            </view>
            <view class="row row-tap" @tap="openDatePicker('b')">
              <text class="row-label">出生时间</text>
              <view class="row-value">
                <text class="row-value-text">{{ birthText(personB) }}</text>
                <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
              </view>
            </view>
          </paper-card>
        </view>

        <!-- 开始合盘 -->
        <view class="submit" @tap="handleSubmit">
          <app-icon name="heart" :size="32" color="#ffffff" />
          <text class="submit-text">开始合盘</text>
        </view>

        <!-- 合盘记录（V0 独立 history 页砍成内嵌卡） -->
        <view v-if="history.length" class="his-sec">
          <section-title title="合盘记录" subtitle="点击重看盘面，最近 50 条">
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
                  <text class="his-topic">
                    {{ h.params.a.name || '甲方' }} × {{ h.params.b.name || '乙方' }}
                  </text>
                  <text class="his-summary">{{ h.summary }}</text>
                </view>
                <text class="his-date">
                  {{ sceneLabelOf(h.params.scene) }} · {{ formatPersonTime(h.params.a) }} / {{ formatPersonTime(h.params.b) }}
                </text>
              </view>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </paper-card>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="八字合盘为传统命理学说，所示契合分数与断语仅供文化研究与参考，不构成任何婚恋、合作决策建议。"
        />
      </view>
    </scroll-view>

    <!-- 日期选择弹窗（双方共用，dateTarget 决定写回哪一方） -->
    <date-picker-modal
      :open="showDatePicker"
      :initial-date="editingPerson"
      initial-mode="solar"
      @close="showDatePicker = false"
      @confirm="onDateConfirm"
    />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 28rpx; }
.sec { display: flex; flex-direction: column; gap: 20rpx; }

/* 场景 2×2 */
.scene-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.scene-card {
  padding: 24rpx;
  border-radius: 20rpx;
  border: 2rpx solid var(--line);
  background: var(--card);
}
.scene-card:active { background: rgba(0, 0, 0, 0.02); }
.scene-on { border-color: var(--brand); background: rgba(196, 30, 58, 0.04); }
.scene-head { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; }
.scene-label { font-size: 28rpx; font-weight: 600; color: var(--text-ink); }
.scene-label-on { color: var(--brand); }
.scene-check {
  width: 32rpx; height: 32rpx; border-radius: 50%;
  background: var(--brand);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.scene-desc { display: block; margin-top: 8rpx; font-size: 20rpx; color: var(--text-soft); line-height: 1.4; }

/* 表单行 */
.row { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; padding: 30rpx 32rpx; }
.row-bd { border-bottom: 1rpx solid var(--line); }
.row-tap:active { background: rgba(0, 0, 0, 0.02); }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.row-opt { font-size: 22rpx; font-weight: 400; color: var(--text-soft); }
.row-value { display: flex; align-items: center; gap: 6rpx; min-width: 0; }
.row-value-text { font-size: 28rpx; color: var(--text-ink); }
.name-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }
.input-ph { color: rgba(153, 153, 153, 0.5); }

/* 性别分段器 */
.seg { display: flex; border-radius: 16rpx; border: 2rpx solid var(--line); overflow: hidden; }
.seg-btn { padding: 14rpx 40rpx; background: var(--bg-paper); }
.seg-on { background: var(--brand); }
.seg-text { font-size: 26rpx; color: var(--text-soft); }
.seg-text-on { color: #fff; font-weight: 600; }

/* 开始合盘 */
.submit {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 30rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
}
.submit:active { transform: scale(0.99); }
.submit-text { font-size: 32rpx; font-weight: 700; color: #fff; }

/* 合盘记录 */
.his-sec { display: flex; flex-direction: column; gap: 20rpx; }
.his-clear { padding: 8rpx 24rpx; border-radius: 999rpx; border: 2rpx solid var(--line); }
.his-clear-text { font-size: 24rpx; color: var(--text-soft); }
.his-item { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 24rpx 32rpx; }
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
