<script setup lang="ts">
/**
 * 小六壬排盘——自 V0 app/xiaoliuren/page.tsx（入口表单）+ app/xiaoliuren/result/page.tsx（推算展示）还原
 * 单页两相：input 起课表单 → result 六宫盘展示（V0 为两个路由，此处合并，减少注册页面）
 * 取舍：历史记录/笔记/AI 解析本批不还原；分享走 tool-header 内置分享
 */
import { ref, computed } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'
import { formatJieqiRange } from '@/lib/paipan/jieqi'
import {
  PALACES, GRID_ORDER, PALACE_WX, WX_TEXT, WX_BAR, GAN_WX, ZHI_WX,
  PALACE_INFO, LIUQIN_INFO, LIUSHEN_INFO, RISHI_DUAN,
  getSizhu, getKong, getLunar, paiPan,
  type PalaceResult,
} from './xiaoliuren-data'

type SchoolType = 'daojia' | 'jiangshi' | 'jiangshi2'
type QikeMode = 'time' | 'number'

const QIKE_MODES: { value: QikeMode; label: string }[] = [
  { value: 'time', label: '时间起课' },
  { value: 'number', label: '报数起课' },
]

const phase = ref<'input' | 'result'>('input')

const matter = ref('')
const now = new Date()
const dateTime = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
})
const school = ref<SchoolType>('daojia')
const qikeMode = ref<QikeMode>('time')
const numbers = ref('')
const showModePicker = ref(false)

function pad(n: number) { return String(n).padStart(2, '0') }

function refreshTime() {
  const t = new Date()
  dateTime.value = {
    year: t.getFullYear(),
    month: t.getMonth() + 1,
    day: t.getDate(),
    hour: t.getHours(),
    minute: t.getMinutes(),
  }
}

const dateStr = computed(() => `${dateTime.value.year}-${pad(dateTime.value.month)}-${pad(dateTime.value.day)}`)
const timeStr = computed(() => `${pad(dateTime.value.hour)}:${pad(dateTime.value.minute)}`)

function onDateChange(e: { detail: { value: string } }) {
  const [y, m, d] = e.detail.value.split('-').map(Number)
  dateTime.value = { ...dateTime.value, year: y, month: m, day: d }
}
function onTimeChange(e: { detail: { value: string } }) {
  const [h, mi] = e.detail.value.split(':').map(Number)
  dateTime.value = { ...dateTime.value, hour: h, minute: mi }
}

/** 报数解析：逗号/空格分隔的 1~3 个正整数 */
function parseNumbers(raw: string): number[] {
  return raw.split(/[,，\s]+/).filter((n) => /^\d+$/.test(n)).map(Number).filter((n) => n > 0)
}
const numbersValid = computed(() => qikeMode.value !== 'number' || parseNumbers(numbers.value).length > 0)

function handleSubmit() {
  if (!numbersValid.value) return
  selectedPalace.value = null
  phase.value = 'result'
}

// ─── 结果相 ───
const selectedPalace = ref<number | null>(null)

const sizhu = computed(() => {
  const t = dateTime.value
  return getSizhu(t.year, t.month, t.day, t.hour, t.minute)
})
const lunar = computed(() => getLunar(dateTime.value.year, dateTime.value.month, dateTime.value.day))
const numbersArr = computed(() => {
  if (qikeMode.value !== 'number') return null
  const list = parseNumbers(numbers.value)
  return list.length > 0 ? list : null
})

const result = computed(() =>
  paiPan({
    school: school.value,
    lunarMonth: lunar.value.m,
    lunarDay: lunar.value.d,
    hourNum: sizhu.value.hour.zi + 1,
    numbers: numbersArr.value,
    sizhu: sizhu.value,
  }),
)

const schoolLabel = computed(() => (school.value === 'daojia' ? '道家' : school.value === 'jiangshi' ? '江氏' : '江氏2'))
const modeDetail = computed(() =>
  qikeMode.value === 'number'
    ? `(${(numbersArr.value || []).join('+')})`
    : `(${lunar.value.text || '公历' + dateTime.value.month + '月' + dateTime.value.day + '日'}+${sizhu.value.hour.g}${sizhu.value.hour.z}时)`,
)
const dateText = computed(() => {
  const t = dateTime.value
  const base = `${t.year}年${pad(t.month)}月${pad(t.day)}日 ${pad(t.hour)}:${pad(t.minute)}`
  return lunar.value.text ? `${base}（${lunar.value.text}）` : base
})
const jieqiText = computed(() => {
  const t = dateTime.value
  return formatJieqiRange(new Date(t.year, t.month - 1, t.day, t.hour, t.minute))
})
const duanText = computed(() => RISHI_DUAN[`${PALACES[result.value.dayPalace]}+${PALACES[result.value.hourPalace]}`] || '')
const sel = computed<PalaceResult | null>(() => (selectedPalace.value !== null ? result.value.palaces[selectedPalace.value] : null))

const gridPalaces = computed(() => GRID_ORDER.map((idx) => ({ idx, p: result.value.palaces[idx] })))

function togglePalace(idx: number) {
  selectedPalace.value = selectedPalace.value === idx ? null : idx
}

function handleBack() {
  if (phase.value === 'result') { phase.value = 'input'; return }
  navigateBack()
}
</script>

<template>
  <view class="page">
    <tool-header
      :title="phase === 'input' ? '小六壬排盘' : '热卜小六壬'"
      subtitle="掐指一算 · 六宫定吉凶"
      share
      share-title="小六壬排盘"
      @back="handleBack"
    />

    <scroll-view
      scroll-y
      class="body"
    >
      <!-- ═══ 起课表单 ═══ -->
      <view
        v-if="phase === 'input'"
        class="inner"
      >
        <paper-card padding="none">
          <!-- 事项内容 -->
          <view class="row">
            <text class="row-label">
              事项内容
            </text>
            <input
              v-model="matter"
              class="row-input"
              placeholder="请输入事项(选填)"
              placeholder-class="ph"
            >
          </view>

          <!-- 排盘时间 -->
          <view class="row">
            <view class="row-label-group">
              <text class="row-label">
                排盘时间
              </text>
              <view
                class="refresh-btn"
                @tap="refreshTime"
              >
                <app-icon
                  name="refresh-cw"
                  :size="28"
                  color="var(--text-soft)"
                />
              </view>
            </view>
            <view class="dt-pickers">
              <picker
                mode="date"
                :value="dateStr"
                @change="onDateChange"
              >
                <view class="dt-chip">
                  <text class="dt-chip-text">
                    {{ dateTime.year }}年{{ dateTime.month }}月{{ dateTime.day }}日
                  </text>
                  <app-icon
                    name="chevron-down"
                    :size="26"
                    color="var(--text-soft)"
                  />
                </view>
              </picker>
              <picker
                mode="time"
                :value="timeStr"
                @change="onTimeChange"
              >
                <view class="dt-chip">
                  <text class="dt-chip-text">
                    {{ timeStr }}
                  </text>
                  <app-icon
                    name="chevron-down"
                    :size="26"
                    color="var(--text-soft)"
                  />
                </view>
              </picker>
            </view>
          </view>

          <!-- 排盘类型 -->
          <view class="row">
            <text class="row-label">
              排盘类型
            </text>
            <view class="radio-group">
              <view
                class="radio"
                :class="{ 'radio-on': school === 'daojia' }"
                @tap="school = 'daojia'"
              >
                <text
                  class="radio-text"
                  :class="{ 'radio-text-on': school === 'daojia' }"
                >
                  道家
                </text>
              </view>
              <view
                class="radio"
                :class="{ 'radio-on': school === 'jiangshi' }"
                @tap="school = 'jiangshi'"
              >
                <text
                  class="radio-text"
                  :class="{ 'radio-text-on': school === 'jiangshi' }"
                >
                  江氏
                </text>
              </view>
              <view
                class="radio"
                :class="{ 'radio-on': school === 'jiangshi2' }"
                @tap="school = 'jiangshi2'"
              >
                <text
                  class="radio-text"
                  :class="{ 'radio-text-on': school === 'jiangshi2' }"
                >
                  江氏2
                </text>
              </view>
            </view>
          </view>

          <!-- 起课方式 -->
          <view class="row">
            <text class="row-label">
              起课方式
            </text>
            <view
              class="mode-btn"
              @tap="showModePicker = true"
            >
              <text class="mode-btn-text">
                {{ qikeMode === 'time' ? '时间起课' : '报数起课' }}
              </text>
              <app-icon
                name="chevron-down"
                :size="28"
                color="var(--text-soft)"
              />
            </view>
          </view>

          <!-- 起课数字（报数起课时显示） -->
          <view
            v-if="qikeMode === 'number'"
            class="row"
          >
            <text class="row-label">
              起课数字
            </text>
            <input
              v-model="numbers"
              class="row-input"
              placeholder="如：3 8 15（1~3个数）"
              placeholder-class="ph"
            >
          </view>

          <view class="note">
            <text class="note-text">
              注：江氏采用日六神排法，江氏2采用活六神排法
            </text>
          </view>
        </paper-card>

        <view
          class="submit"
          :class="{ 'submit-disabled': !numbersValid }"
          @tap="handleSubmit"
        >
          <text class="submit-text">
            开始排盘
          </text>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="小六壬为传统民俗掐指推算法，结果仅供传统文化研习参考，不构成任何预测或建议。"
        />
      </view>

      <!-- ═══ 排盘结果 ═══ -->
      <view
        v-else
        class="inner"
      >
        <!-- 信息表 -->
        <view class="info-table">
          <view class="info-row">
            <text class="info-label">
              事项
            </text>
            <view class="info-value">
              <input
                v-model="matter"
                class="info-matter-input"
                placeholder="点击填写"
                placeholder-class="ph"
              >
            </view>
          </view>
          <view class="info-row">
            <text class="info-label">
              方式
            </text>
            <view class="info-value">
              <text class="info-strong">
                {{ schoolLabel }}-{{ qikeMode === 'number' ? '报数起课' : '时间起课' }}
              </text>
              <text class="info-detail">
                {{ modeDetail }}
              </text>
            </view>
          </view>
          <view class="info-row">
            <text class="info-label">
              日期
            </text>
            <view class="info-value">
              <text class="info-text">
                {{ dateText }}
              </text>
            </view>
          </view>
          <view class="info-row">
            <text class="info-label">
              节气
            </text>
            <view class="info-value">
              <text class="info-detail">
                {{ jieqiText }}
              </text>
            </view>
          </view>
          <view class="info-row">
            <text class="info-label">
              四柱
            </text>
            <view class="pillars">
              <view
                v-for="(pk, pi) in [sizhu.year, sizhu.month, sizhu.day, sizhu.hour]"
                :key="pi"
                class="pillar"
                :class="{ 'pillar-last': pi === 3 }"
              >
                <text class="pillar-name">
                  {{ ['年柱', '月柱', '日柱', '时柱'][pi] }}
                </text>
                <text
                  class="pillar-char"
                  :style="{ color: WX_TEXT[GAN_WX[pk.g]] }"
                >
                  {{ pk.g }}
                </text>
                <text
                  class="pillar-char"
                  :style="{ color: WX_TEXT[ZHI_WX[pk.z]] }"
                >
                  {{ pk.z }}
                </text>
              </view>
            </view>
          </view>
          <view class="info-row info-row-last">
            <text class="info-label">
              空亡
            </text>
            <view class="pillars">
              <view
                v-for="(pk, pi) in [sizhu.year, sizhu.month, sizhu.day, sizhu.hour]"
                :key="pi"
                class="pillar pillar-kong"
                :class="{ 'pillar-last': pi === 3 }"
              >
                <text class="kong-text">
                  {{ getKong(pk.gi, pk.zi) }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 落宫速览 -->
        <view class="quick-glance">
          <text class="qg-item">
            月落<text class="qg-strong">
              {{ PALACES[result.monthPalace] }}
            </text>
          </text>
          <text class="qg-dot">
            ·
          </text>
          <text class="qg-item">
            日落<text class="qg-strong">
              {{ PALACES[result.dayPalace] }}
            </text>
          </text>
          <text class="qg-dot">
            ·
          </text>
          <text class="qg-item">
            时落<text class="qg-strong">
              {{ PALACES[result.hourPalace] }}
            </text>
          </text>
        </view>

        <!-- 六宫盘 -->
        <view class="palace-grid">
          <view
            v-for="{ idx, p } in gridPalaces"
            :key="idx"
            class="palace-cell"
            :class="{ 'palace-cell-on': selectedPalace === idx }"
            @tap="togglePalace(idx)"
          >
            <view class="pc-body">
              <view class="pc-line">
                <text class="pc-shen">
                  {{ p.liushen }}
                </text>
                <text
                  class="pc-star"
                  :style="p.starKong ? {} : { color: WX_TEXT[p.star.charAt(1)] || 'var(--text-ink)' }"
                >
                  {{ p.star }}
                </text>
              </view>
              <view class="pc-mid">
                <view class="pc-gz-row">
                  <text
                    class="pc-gz"
                    :style="{ color: WX_TEXT[GAN_WX[p.gan]] }"
                  >
                    {{ p.gan }}<text class="pc-gz-wx">
                      ({{ GAN_WX[p.gan] }})
                    </text>
                  </text>
                </view>
                <view class="pc-line">
                  <text
                    class="pc-gz"
                    :style="{ color: WX_TEXT[ZHI_WX[p.zhi]] }"
                  >
                    {{ p.zhi }}<text class="pc-gz-wx">
                      ({{ ZHI_WX[p.zhi] }})
                    </text>
                  </text>
                  <text class="pc-qin">
                    {{ p.qin }}
                  </text>
                </view>
              </view>
              <view class="pc-line">
                <text class="pc-name">
                  {{ p.name }}
                </text>
                <text class="pc-markers">
                  {{ p.markers.join(' ') }}
                </text>
              </view>
            </view>
            <view
              class="pc-bar"
              :style="{ background: WX_BAR[PALACE_WX[p.name]] }"
            >
              <text class="pc-bar-text">
                {{ PALACE_WX[p.name] }}
              </text>
            </view>
          </view>
        </view>
        <text class="grid-hint">
          点击宫位查看解释
        </text>

        <!-- 日时断 -->
        <view
          v-if="duanText"
          class="duan"
        >
          <text class="duan-label">
            日时断：
          </text>
          <text class="duan-text">
            {{ duanText }}
          </text>
        </view>

        <!-- 宫位解释（点击展开） -->
        <view
          v-if="sel"
          class="explain"
        >
          <view class="explain-block">
            <text class="explain-title">
              {{ sel.name }}：
            </text>
            <text class="explain-text">
              {{ PALACE_INFO[sel.name].meta }}
            </text>
            <view class="explain-jue">
              <text class="explain-jue-label">
                诀曰：
              </text>
              <text class="explain-text">
                {{ PALACE_INFO[sel.name].jue }}
              </text>
            </view>
          </view>
          <view class="explain-block explain-block-bordered">
            <text class="explain-title">
              {{ sel.qin }}：
            </text>
            <text class="explain-text">
              {{ LIUQIN_INFO[sel.qin] }}
            </text>
          </view>
          <view class="explain-block explain-block-bordered">
            <text class="explain-title">
              {{ sel.liushen }}：
            </text>
            <text class="explain-text">
              {{ LIUSHEN_INFO[sel.liushen] }}
            </text>
          </view>
        </view>

        <!-- 重新排盘 -->
        <view
          class="reset-btn"
          @tap="phase = 'input'"
        >
          <text class="reset-btn-text">
            重新排盘
          </text>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="小六壬为传统民俗掐指推算法，结果仅供传统文化研习参考，不构成任何预测或建议。"
        />
      </view>
    </scroll-view>

    <!-- 起课方式选择（底部弹层） -->
    <view
      v-if="showModePicker"
      class="sheet-mask"
      @tap="showModePicker = false"
    >
      <view
        class="sheet"
        @tap.stop
      >
        <view class="sheet-hdr">
          <text
            class="sheet-cancel"
            @tap="showModePicker = false"
          >
            取消
          </text>
          <text class="sheet-title">
            起课方式
          </text>
          <text
            class="sheet-ok"
            @tap="showModePicker = false"
          >
            确定
          </text>
        </view>
        <view
          v-for="m in QIKE_MODES"
          :key="m.value"
          class="sheet-opt"
          :class="{ 'sheet-opt-on': qikeMode === m.value }"
          @tap="qikeMode = m.value; showModePicker = false"
        >
          <text
            class="sheet-opt-text"
            :class="{ 'sheet-opt-text-on': qikeMode === m.value }"
          >
            {{ m.label }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }
.inner { padding: 24rpx 24rpx 48rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* ── 表单行 ── */
.row {
  display: flex; align-items: center; justify-content: space-between; gap: 24rpx;
  padding: 30rpx 32rpx; border-bottom: 1rpx solid var(--line);
}
.row-label { flex-shrink: 0; font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
.row-label-group { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.refresh-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.row-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); }
.ph { color: var(--text-soft); opacity: 0.6; }

.dt-pickers { display: flex; align-items: center; gap: 12rpx; }
.dt-chip {
  display: flex; align-items: center; gap: 4rpx;
  padding: 12rpx 16rpx; border-radius: 12rpx; background: rgba(0, 0, 0, 0.04);
}
.dt-chip-text { font-size: 26rpx; color: var(--text-ink); }

.radio-group { display: flex; align-items: center; gap: 16rpx; }
.radio { padding: 12rpx 24rpx; border-radius: 16rpx; background: rgba(0, 0, 0, 0.04); }
.radio-on { background: var(--brand); box-shadow: 0 2rpx 8rpx rgba(196, 30, 58, 0.25); }
.radio-text { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.radio-text-on { color: #fff; }

.mode-btn {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; border-radius: 16rpx; background: rgba(0, 0, 0, 0.04);
}
.mode-btn-text { font-size: 26rpx; color: var(--text-ink); }

.note { padding: 20rpx 32rpx 28rpx; }
.note-text { font-size: 22rpx; color: var(--text-soft); line-height: 1.6; }

.submit {
  margin-top: 8rpx; padding: 30rpx;
  background: linear-gradient(90deg, var(--brand), rgba(196, 30, 58, 0.9));
  border-radius: 20rpx; box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.3);
}
.submit-disabled { opacity: 0.5; pointer-events: none; }
.submit-text { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }

/* ── 信息表 ── */
.info-table { border: 1rpx solid var(--line); border-radius: 16rpx; overflow: hidden; background: var(--card); }
.info-row { display: flex; align-items: stretch; border-bottom: 1rpx solid var(--line); }
.info-row-last { border-bottom: none; }
.info-label {
  flex-shrink: 0; width: 128rpx; padding: 18rpx 24rpx;
  font-size: 26rpx; font-weight: 500; color: #b45309;
}
.info-value { flex: 1; display: flex; align-items: center; flex-wrap: wrap; gap: 6rpx; padding: 18rpx 16rpx 18rpx 0; }
.info-matter-input { width: 100%; font-size: 26rpx; color: var(--text-ink); }
.info-strong { font-size: 26rpx; font-weight: 600; color: var(--text-ink); }
.info-detail { font-size: 22rpx; color: var(--text-soft); }
.info-text { font-size: 26rpx; color: var(--text-ink); }

.pillars { flex: 1; display: flex; }
.pillar {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx;
  padding: 10rpx 0 14rpx; border-right: 1rpx solid var(--line);
}
.pillar-last { border-right: none; }
.pillar-kong { padding: 14rpx 0; justify-content: center; }
.pillar-name { font-size: 22rpx; color: #b45309; }
.pillar-char { font-size: 38rpx; font-weight: 700; line-height: 1.3; }
.kong-text { font-size: 26rpx; color: var(--text-soft); }

/* ── 落宫速览 ── */
.quick-glance { display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.qg-item { font-size: 24rpx; color: var(--text-soft); }
.qg-strong { color: var(--brand); font-weight: 600; }
.qg-dot { font-size: 24rpx; color: var(--text-soft); }

/* ── 六宫盘 ── */
.palace-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  border: 1rpx solid rgba(0, 0, 0, 0.4); border-radius: 8rpx; overflow: hidden;
  margin-top: -8rpx;
}
.palace-cell { display: flex; flex-direction: column; border: 1rpx solid rgba(0, 0, 0, 0.4); background: var(--card); }
.palace-cell-on { background: #fce7ea; }
.pc-body {
  flex: 1; min-height: 280rpx; padding: 20rpx 18rpx;
  display: flex; flex-direction: column; justify-content: space-between; gap: 14rpx;
}
.pc-line { display: flex; align-items: center; justify-content: space-between; }
.pc-shen { font-size: 30rpx; font-weight: 500; color: var(--text-ink); }
.pc-star { font-size: 30rpx; font-weight: 500; color: var(--text-ink); }
.pc-mid { display: flex; flex-direction: column; gap: 14rpx; }
.pc-gz-row { display: flex; }
.pc-gz { font-size: 30rpx; font-weight: 500; }
.pc-gz-wx { font-size: 22rpx; }
.pc-qin { font-size: 28rpx; color: var(--text-ink); }
.pc-name { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.pc-markers { font-size: 26rpx; color: var(--text-ink); }
.pc-bar { padding: 8rpx 0; }
.pc-bar-text { display: block; text-align: center; font-size: 26rpx; font-weight: 500; color: #fff; }
.grid-hint { text-align: center; font-size: 24rpx; color: var(--text-soft); opacity: 0.8; margin-top: -8rpx; }

/* ── 日时断 / 宫位解释 ── */
.duan { font-size: 28rpx; line-height: 1.7; }
.duan-label { font-size: 28rpx; font-weight: 600; color: #b45309; }
.duan-text { font-size: 28rpx; color: var(--text-ink); }

.explain { border-top: 1rpx solid var(--line); padding-top: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.explain-block { line-height: 1.7; }
.explain-block-bordered { border-top: 1rpx solid var(--line); padding-top: 24rpx; }
.explain-title { font-size: 28rpx; font-weight: 600; color: var(--brand); }
.explain-text { font-size: 28rpx; color: var(--text-ink); line-height: 1.7; }
.explain-jue { margin-top: 10rpx; }
.explain-jue-label { font-size: 28rpx; color: var(--text-soft); }

.reset-btn {
  padding: 28rpx; background: var(--card); border: 1rpx solid rgba(196, 30, 58, 0.3); border-radius: 20rpx;
}
.reset-btn-text { display: block; text-align: center; font-size: 30rpx; font-weight: 700; color: var(--brand); }

/* ── 底部弹层 ── */
.sheet-mask {
  position: fixed; top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(0, 0, 0, 0.4); z-index: 100;
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%; background: var(--card);
  border-radius: 24rpx 24rpx 0 0; overflow: hidden;
  animation: sheet-up 0.25s ease;
  padding-bottom: env(safe-area-inset-bottom);
}
@keyframes sheet-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.sheet-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx; border-bottom: 1rpx solid var(--line);
}
.sheet-cancel { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.sheet-ok { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.sheet-opt { padding: 30rpx 0; text-align: center; border-bottom: 1rpx solid var(--line); }
.sheet-opt:last-child { border-bottom: none; }
.sheet-opt-on { background: rgba(196, 30, 58, 0.05); }
.sheet-opt-text { font-size: 28rpx; color: var(--text-soft); }
.sheet-opt-text-on { font-size: 32rpx; font-weight: 600; color: var(--brand); }
</style>
