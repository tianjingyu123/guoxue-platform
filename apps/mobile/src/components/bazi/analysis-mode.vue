<script setup lang="ts">
/** 分析模式视图——对应原型 AnalysisMode */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SectionTitle from './section-title.vue'
import ClassicsSection from './classics-section.vue'
import { wuxingColorClass, wuxingBgClass, GANS, ZHIS, GAN_SHI_SHEN, ZHI_SHI_SHEN, ZHI_CANG_GAN, generateLiuNian } from '@/lib/bazi-constants'

// data 为排盘结果聚合对象（四柱/大运/流年/神煞等多层嵌套，属排盘域算法产物），保留 any 不收敛对外契约
const props = defineProps<{ data: any }>()
const emit = defineEmits<{ (e: 'edit'): void }>()

const COLS = ['year', 'month', 'day', 'hour'] as const
const COL_NAMES = ['年柱', '月柱', '日柱', '时柱']
const LIUYUE_ZHI = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑']

const selectedDaYun = ref(4)
const selectedLiuNian = ref(0)
const selectedLiuYue = ref(4)
const selectedLiuRi = ref(16)

const dynamicLiuNian = computed(() => {
  const dy = props.data.daYun[selectedDaYun.value]
  if (!dy) return props.data.liuNian
  return generateLiuNian(dy.year, 10, props.data.birthYear || 1983)
})
const liuYueData = computed(() => Array.from({ length: 12 }, (_, i) => {
  const gan = GANS[i % 10]; const zhi = LIUYUE_ZHI[i]
  return { month: i + 1, gan, zhi, shiShen: GAN_SHI_SHEN[gan], shiShenZhi: ZHI_SHI_SHEN[zhi] }
}))
const liuRiData = computed(() => Array.from({ length: 31 }, (_, i) => ({ day: i + 1, gan: GANS[i % 10], zhi: ZHIS[i % 12] })))

const currentDaYun = computed(() => props.data.daYun[selectedDaYun.value])
const currentLiuNian = computed(() => dynamicLiuNian.value[selectedLiuNian.value] || dynamicLiuNian.value[0])
const currentLiuYue = computed(() => liuYueData.value[selectedLiuYue.value])
const currentLiuRi = computed(() => liuRiData.value[selectedLiuRi.value])

function selectDaYun(idx: number) {
  selectedDaYun.value = idx
  const dy = props.data.daYun[idx]
  const ln = generateLiuNian(dy.year, 10, props.data.birthYear || 1983)
  const cur = ln.findIndex((n) => n.year === new Date().getFullYear())
  selectedLiuNian.value = cur >= 0 ? cur : 0
}
function cangOf(zhi: string) { return ZHI_CANG_GAN[zhi] || [] }
const emptyTail = computed(() => (10 - (liuRiData.value.length % 10)) % 10)
function diZhiCls(r: string) {
  return r.includes('冲') || r.includes('刑') || r.includes('害') ? 'wxb-fire' : 'wxb-earth'
}
</script>

<template>
  <view class="am">
    <!-- 基本信息 -->
    <view class="card info">
      <text class="info-text"><text class="info-k">名称：</text>{{ data.name }}<text class="info-k ml">性别：</text>{{ data.gender }}<text class="ml">出生于{{ data.solarDate }}（{{ data.lunarDate }}）</text></text>
      <view class="info-edit" @tap="emit('edit')"><app-icon name="pencil" :size="26" color="#9ca3af" /></view>
    </view>

    <!-- 八柱总表（横向滚动） -->
    <view class="card">
      <scroll-view scroll-x class="x-scroll">
        <view class="bz-table">
          <view class="bz-head">
            <text class="bz-h bz-h-narrow" />
            <text v-for="(n, i) in COL_NAMES" :key="n" class="bz-h" :class="{ 'is-brand': i === 2 }">{{ n }}</text>
            <text class="bz-h bz-h-sub">大运</text><text class="bz-h bz-h-sub">流年</text><text class="bz-h bz-h-sub">流月</text><text class="bz-h bz-h-sub">流日</text>
          </view>
          <!-- 十神 -->
          <view class="bz-row soft xs">
            <text class="bz-c narrow">十神</text>
            <text v-for="k in COLS" :key="k" class="bz-c">{{ data.siZhu[k].shiShen }}</text>
            <text class="bz-c sub">{{ currentDaYun.shiShen }}</text><text class="bz-c sub">{{ currentLiuNian.shiShen }}</text>
            <text class="bz-c sub">{{ GAN_SHI_SHEN[currentLiuYue.gan] }}</text><text class="bz-c sub">{{ GAN_SHI_SHEN[currentLiuRi.gan] }}</text>
          </view>
          <!-- 天干 -->
          <view class="bz-row tint">
            <text class="bz-c narrow brand xs">{{ data.qianKun }}</text>
            <text v-for="k in COLS" :key="k" class="bz-c bz-gz" :class="wuxingColorClass[data.siZhu[k].gan]">{{ data.siZhu[k].gan }}</text>
            <text class="bz-c sub bz-gz" :class="wuxingColorClass[currentDaYun.gan]">{{ currentDaYun.gan }}</text>
            <text class="bz-c sub bz-gz" :class="wuxingColorClass[currentLiuNian.gan]">{{ currentLiuNian.gan }}</text>
            <text class="bz-c sub bz-gz" :class="wuxingColorClass[currentLiuYue.gan]">{{ currentLiuYue.gan }}</text>
            <text class="bz-c sub bz-gz" :class="wuxingColorClass[currentLiuRi.gan]">{{ currentLiuRi.gan }}</text>
          </view>
          <!-- 地支 -->
          <view class="bz-row tint">
            <text class="bz-c narrow" />
            <text v-for="k in COLS" :key="k" class="bz-c bz-gz" :class="wuxingColorClass[data.siZhu[k].zhi]">{{ data.siZhu[k].zhi }}</text>
            <text class="bz-c sub bz-gz" :class="wuxingColorClass[currentDaYun.zhi]">{{ currentDaYun.zhi }}</text>
            <text class="bz-c sub bz-gz" :class="wuxingColorClass[currentLiuNian.zhi]">{{ currentLiuNian.zhi }}</text>
            <text class="bz-c sub bz-gz" :class="wuxingColorClass[currentLiuYue.zhi]">{{ currentLiuYue.zhi }}</text>
            <text class="bz-c sub bz-gz" :class="wuxingColorClass[currentLiuRi.zhi]">{{ currentLiuRi.zhi }}</text>
          </view>
          <!-- 藏干 -->
          <view class="bz-row xs">
            <text class="bz-c narrow brand">藏干</text>
            <view v-for="k in COLS" :key="k" class="bz-c cang">
              <view class="cang-gan"><text v-for="(c, i) in data.siZhu[k].cangGan" :key="i" class="cang-char" :class="wuxingColorClass[c.gan]">{{ c.gan }}</text></view>
              <view class="cang-shen"><text v-for="(c, i) in data.siZhu[k].cangGan" :key="i" class="cang-shen-t">{{ c.shen }}</text></view>
            </view>
            <view v-for="(item, idx) in [currentDaYun, currentLiuNian, currentLiuYue, currentLiuRi]" :key="idx" class="bz-c sub cang">
              <view class="cang-gan"><text v-for="(c, i) in cangOf(item.zhi)" :key="i" class="cang-char" :class="wuxingColorClass[c.gan]">{{ c.gan }}</text></view>
              <view class="cang-shen"><text v-for="(c, i) in cangOf(item.zhi)" :key="i" class="cang-shen-t">{{ c.shen }}</text></view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 干支关系提示 -->
    <view class="card">
      <section-title title="提示" />
      <view class="rel">
        <view class="rel-row"><text v-for="(r, i) in data.relations.tianGan" :key="i" class="rel-tag wxb-wood">【{{ r }}】</text></view>
        <view class="rel-row"><text v-for="(r, i) in data.relations.diZhi" :key="i" class="rel-tag" :class="diZhiCls(r)">【{{ r }}】</text></view>
        <view class="rel-row"><text v-for="(r, i) in data.relations.zhengZhu" :key="i" class="rel-tag wxb-water">【{{ r }}】</text></view>
      </view>
    </view>

    <!-- 大运选择 -->
    <view class="card">
      <section-title title="大运"><template #extra><text class="hint">点击选择</text></template></section-title>
      <view class="sel-table">
        <view class="sel-row years"><text v-for="(d, i) in data.daYun" :key="i" class="sel-c">{{ d.year }}</text></view>
        <view class="sel-row">
          <view v-for="(d, i) in data.daYun" :key="i" class="sel-c click" :class="{ selp: selectedDaYun === i, active: d.active }" @tap="selectDaYun(i)">
            <text class="sel-char" :class="selectedDaYun === i ? 'c-brand' : wuxingColorClass[d.gan]">{{ d.gan }}</text><text class="sel-shen">{{ d.shiShen }}</text>
          </view>
        </view>
        <view class="sel-row">
          <view v-for="(d, i) in data.daYun" :key="i" class="sel-c click" :class="{ selp: selectedDaYun === i, active: d.active }" @tap="selectDaYun(i)">
            <text class="sel-char" :class="selectedDaYun === i ? 'c-brand' : wuxingColorClass[d.zhi]">{{ d.zhi }}</text><text class="sel-shen">{{ d.shiShenZhi }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 流年 -->
    <view class="card">
      <section-title title="流年"><template #extra><text class="hint">{{ data.daYun[selectedDaYun]?.year }}-{{ data.daYun[selectedDaYun]?.year + 9 }}</text></template></section-title>
      <view class="sel-table">
        <view class="sel-row years"><text v-for="(n, i) in dynamicLiuNian" :key="i" class="sel-c">{{ n.year }}</text></view>
        <view class="sel-row">
          <view v-for="(n, i) in dynamicLiuNian" :key="i" class="sel-c click" :class="{ selw: selectedLiuNian === i, active: n.active }" @tap="selectedLiuNian = i">
            <text class="sel-char sm" :class="selectedLiuNian === i ? 'c-water' : wuxingColorClass[n.gan]">{{ n.gan }}</text><text class="sel-shen">{{ n.shiShen }}</text>
          </view>
        </view>
        <view class="sel-row">
          <view v-for="(n, i) in dynamicLiuNian" :key="i" class="sel-c click" :class="{ selw: selectedLiuNian === i, active: n.active }" @tap="selectedLiuNian = i">
            <text class="sel-char sm" :class="selectedLiuNian === i ? 'c-water' : wuxingColorClass[n.zhi]">{{ n.zhi }}</text><text class="sel-shen">{{ n.shiShenZhi }}</text>
          </view>
        </view>
        <view class="sel-row years"><text v-for="(n, i) in dynamicLiuNian" :key="i" class="sel-c" :class="{ selw: selectedLiuNian === i }">{{ n.age }}岁</text></view>
      </view>
    </view>

    <!-- 流月 -->
    <view class="card">
      <section-title title="流月" />
      <view class="sel-table">
        <view class="sel-row years"><text v-for="(m, i) in liuYueData" :key="i" class="sel-c">{{ m.month }}月</text></view>
        <view class="sel-row">
          <view v-for="(m, i) in liuYueData" :key="i" class="sel-c click" :class="{ sele: selectedLiuYue === i }" @tap="selectedLiuYue = i">
            <text class="sel-char sm" :class="selectedLiuYue === i ? 'c-earth' : wuxingColorClass[m.gan]">{{ m.gan }}</text><text class="sel-shen">{{ m.shiShen }}</text>
          </view>
        </view>
        <view class="sel-row">
          <view v-for="(m, i) in liuYueData" :key="i" class="sel-c click" :class="{ sele: selectedLiuYue === i }" @tap="selectedLiuYue = i">
            <text class="sel-char sm" :class="selectedLiuYue === i ? 'c-earth' : wuxingColorClass[m.zhi]">{{ m.zhi }}</text><text class="sel-shen">{{ m.shiShenZhi }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 流日 -->
    <view class="card">
      <section-title title="流日" />
      <view class="lr-grid">
        <view v-for="(d, i) in liuRiData" :key="i" class="lr-cell" :class="{ selp: selectedLiuRi === i }" @tap="selectedLiuRi = i">
          <text class="lr-day">{{ d.day }}</text>
          <text class="lr-char" :class="selectedLiuRi === i ? 'c-brand' : wuxingColorClass[d.gan]">{{ d.gan }}</text>
          <text class="lr-char" :class="selectedLiuRi === i ? 'c-brand' : wuxingColorClass[d.zhi]">{{ d.zhi }}</text>
        </view>
        <view v-for="i in emptyTail" :key="'e' + i" class="lr-cell lr-empty" />
      </view>
    </view>

    <!-- 五行状态 -->
    <view class="card pad">
      <text class="blk-title">五行状态</text>
      <view class="wx-around">
        <text v-for="([el, st]) in Object.entries(data.wuxingState)" :key="el" class="wx-tag-lg" :class="wuxingBgClass[el]">{{ el }}{{ st }}</text>
      </view>
    </view>

    <!-- 四柱神煞 -->
    <view class="card">
      <section-title title="四柱神煞" />
      <view class="ss-list">
        <view v-for="k in COLS" :key="k" class="ss-line">
          <view class="ss-gz"><text class="ss-gz-char" :class="wuxingColorClass[data.siZhu[k].gan]">{{ data.siZhu[k].gan }}</text><text class="ss-gz-char" :class="wuxingColorClass[data.siZhu[k].zhi]">{{ data.siZhu[k].zhi }}</text></view>
          <text class="ss-text">{{ data.shenSha[k].join('、') }}</text>
        </view>
      </view>
    </view>

    <!-- 大运/流年神煞 -->
    <view class="card">
      <section-title title="大运神煞" />
      <view class="ss-single">
        <view class="ss-gz"><text class="ss-gz-char" :class="wuxingColorClass[currentDaYun.gan]">{{ currentDaYun.gan }}</text><text class="ss-gz-char" :class="wuxingColorClass[currentDaYun.zhi]">{{ currentDaYun.zhi }}</text></view>
        <text class="ss-text">天乙贵人、太极贵人、德秀贵人、文昌贵人、天德秀贵</text>
      </view>
    </view>
    <view class="card">
      <section-title title="流年神煞" />
      <view class="ss-single">
        <view class="ss-gz"><text class="ss-gz-char" :class="wuxingColorClass[currentLiuNian.gan]">{{ currentLiuNian.gan }}</text><text class="ss-gz-char" :class="wuxingColorClass[currentLiuNian.zhi]">{{ currentLiuNian.zhi }}</text></view>
        <text class="ss-text">德秀贵人、将星、桃花、血刃、羊刃</text>
      </view>
    </view>

    <classics-section />

    <view class="btn-pair">
      <view class="pair-btn brand"><app-icon name="sparkles" :size="36" color="#ffffff" /><text class="pair-text">AI辅助分析</text></view>
      <view class="pair-btn accent"><text class="pair-text">命理奇门局</text></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.am { padding: 20rpx; display: flex; flex-direction: column; gap: 16rpx; }
.card { background: var(--card); border-radius: 16rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); overflow: hidden; }
.card.pad { padding: 20rpx 24rpx; }
.info { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.info-text { font-size: 26rpx; color: var(--text-ink); }
.info-k { color: var(--brand); font-weight: 500; }
.ml { margin-left: 16rpx; }
.info-edit { padding: 4rpx; }
.x-scroll { width: 100%; }
.bz-table { min-width: 1120rpx; }
.bz-head { display: flex; background: rgba(196,30,58,0.05); }
.bz-h { flex: 1; text-align: center; padding: 12rpx 0; font-size: 26rpx; font-weight: 600; color: var(--text-ink); }
.bz-h-narrow { flex: 0 0 72rpx; }
.bz-h-sub { background: rgba(0,0,0,0.04); }
.is-brand, .brand { color: var(--brand); }
.bz-row { display: flex; align-items: stretch; border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.bz-c { flex: 1; text-align: center; padding: 6rpx 0; font-size: 26rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.bz-c.narrow { flex: 0 0 72rpx; }
.bz-c.sub { background: rgba(0,0,0,0.03); }
.bz-gz { font-size: 40rpx; font-weight: 900; }
.tint { background: rgba(0,0,0,0.02); }
.soft { color: var(--text-soft); }
.xs { font-size: 20rpx; }
.cang { padding: 8rpx 0; }
.cang-gan { display: flex; justify-content: center; gap: 2rpx; }
.cang-char { font-size: 24rpx; font-weight: 700; }
.cang-shen { display: flex; justify-content: center; gap: 2rpx; }
.cang-shen-t { font-size: 18rpx; color: var(--text-soft); }
/* 关系 */
.rel { padding: 0 24rpx 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.rel-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
.rel-tag { padding: 2rpx 12rpx; border-radius: 6rpx; font-size: 22rpx; font-weight: 600; }
.hint { font-size: 22rpx; color: var(--text-soft); }
/* 选择表 */
.sel-table { width: 100%; }
.sel-row { display: flex; }
.sel-c { flex: 1; text-align: center; padding: 2rpx 0; font-size: 20rpx; color: var(--text-soft); display: flex; align-items: center; justify-content: center; }
.sel-row.years .sel-c { padding-top: 4rpx; }
.sel-c.click { cursor: pointer; }
.sel-c.active { background: rgba(196,30,58,0.05); }
.sel-c.selp { background: rgba(196,30,58,0.1); }
.sel-c.selw { background: rgba(26,111,199,0.1); }
.sel-c.sele { background: rgba(184,134,11,0.1); }
.sel-char { font-size: 36rpx; font-weight: 900; }
.sel-char.sm { font-size: 32rpx; }
.sel-shen { font-size: 18rpx; color: var(--text-soft); vertical-align: top; margin-left: 1rpx; }
.c-brand { color: var(--brand); }
.c-water { color: var(--wuxing-water); }
.c-earth { color: var(--wuxing-earth); }
/* 流日 */
.lr-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 2rpx; padding: 6rpx; background: var(--border, rgba(0,0,0,0.08)); }
.lr-cell { background: var(--card); padding: 2rpx 0; text-align: center; display: flex; flex-direction: column; align-items: center; }
.lr-cell.selp { background: rgba(196,30,58,0.1); }
.lr-cell.lr-empty { background: var(--card); }
.lr-day { font-size: 18rpx; color: var(--text-soft); }
.lr-char { font-size: 24rpx; font-weight: 700; }
/* 五行状态 */
.blk-title { display: block; font-size: 28rpx; font-weight: 600; color: var(--text-ink); margin-bottom: 16rpx; }
.wx-around { display: flex; justify-content: space-around; }
.wx-tag-lg { padding: 6rpx 20rpx; border-radius: 6rpx; font-size: 28rpx; font-weight: 600; }
/* 神煞 */
.ss-list { padding: 0 24rpx 20rpx; display: flex; flex-direction: column; gap: 12rpx; }
.ss-line, .ss-single { display: flex; align-items: flex-start; gap: 16rpx; }
.ss-single { padding: 0 24rpx 20rpx; }
.ss-gz { flex-shrink: 0; width: 80rpx; display: flex; gap: 4rpx; }
.ss-gz-char { font-size: 28rpx; font-weight: 700; }
.ss-text { font-size: 22rpx; color: var(--text-soft); line-height: 1.6; flex: 1; }
/* 按钮 */
.btn-pair { display: flex; gap: 16rpx; }
.pair-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 24rpx; border-radius: 16rpx; }
.pair-btn.brand { background: var(--brand); }
.pair-btn.accent { background: var(--accent, #c9a96e); }
.pair-text { font-size: 28rpx; font-weight: 500; color: #fff; }
</style>
