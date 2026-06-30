<script setup lang="ts">
/** 传统模式视图——对应原型 TraditionalMode */
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SectionTitle from './section-title.vue'
import ClassicsSection from './classics-section.vue'
import { wuxingColorClass, wuxingBgClass, getGanZhi, GAN_SHI_SHEN, ZHI_SHI_SHEN } from '@/lib/bazi-constants'

// data 为排盘结果聚合对象（四柱/大运/流年/神煞等多层嵌套，属排盘域算法产物），保留 any 不收敛对外契约
const props = defineProps<{ data: any }>()
const emit = defineEmits<{ (e: 'edit'): void }>()

const showAllShenSha = ref(false)
const expandedDaYun = ref<number | null>(null)

const COLS = ['year', 'month', 'day', 'hour'] as const
const COL_NAMES = ['年柱', '月柱', '日柱', '时柱']
// 自坐行后端无每柱数据 → 移除（不造假）；保留 纳音/地势/空亡
const naYinRows = [
  { label: '纳音', key: 'naYin' }, { label: '地势', key: 'diShi' },
  { label: '空亡', key: 'kongWang' },
] as const

function daYunYears(idx: number) {
  const start = props.data.daYun[idx].year
  return Array.from({ length: 10 }, (_, i) => {
    const y = start + i
    const { gan, zhi } = getGanZhi(y)
    return { year: y, gan, zhi, ganShen: GAN_SHI_SHEN[gan], zhiShen: ZHI_SHI_SHEN[zhi], age: y - (props.data.birthYear || 1983) }
  })
}
</script>

<template>
  <view class="tm">
    <!-- 基本信息 -->
    <view class="card">
      <view class="info-head">
        <text class="info-item"><text class="info-k">名称：</text>{{ data.name }}</text>
        <text class="info-item"><text class="info-k">性别：</text>{{ data.gender }}</text>
        <text class="info-item"><text class="info-k">生肖：</text>{{ data.zodiac }}</text>
      </view>
      <view class="info-row">
        <text class="info-k shrink">日期</text>
        <text class="info-v">{{ data.solarDate }}（{{ data.lunarDate }}）</text>
        <view class="info-edit" @tap="emit('edit')"><app-icon name="pencil" :size="26" color="#9ca3af" /></view>
      </view>
      <view v-if="data.realSolarTime" class="info-row">
        <text class="info-k shrink">真太阳时</text><text class="info-soft">{{ data.realSolarTime }}</text>
      </view>
      <view v-if="data.jieQi" class="info-row no-bd">
        <text class="info-k shrink">节气</text><text class="info-soft">{{ data.jieQi }}</text>
      </view>
    </view>

    <!-- 四柱主表 -->
    <view class="card">
      <view class="t-head">
        <text class="t-h t-h-label">四柱</text>
        <text v-for="(n, i) in COL_NAMES" :key="n" class="t-h" :class="{ 'is-brand': i === 2 }">{{ n }}</text>
      </view>
      <!-- 十神 -->
      <view class="t-row">
        <text class="t-c t-label">十神</text>
        <text v-for="k in COLS" :key="k" class="t-c soft">{{ data.siZhu[k].shiShen }}</text>
      </view>
      <!-- 干支 -->
      <view class="t-row ganzhi">
        <text class="t-c t-label">{{ data.qianKun }}</text>
        <view v-for="k in COLS" :key="k" class="t-c">
          <text class="gz-char" :class="wuxingColorClass[data.siZhu[k].gan]">{{ data.siZhu[k].gan }}</text>
          <text class="gz-char" :class="wuxingColorClass[data.siZhu[k].zhi]">{{ data.siZhu[k].zhi }}</text>
        </view>
      </view>
      <!-- 藏干 -->
      <view class="t-row">
        <text class="t-c t-label">藏干</text>
        <view v-for="k in COLS" :key="k" class="t-c cang">
          <view class="cang-gan">
            <text v-for="(c, i) in data.siZhu[k].cangGan" :key="i" class="cang-char" :class="wuxingColorClass[c.gan]">{{ c.gan }}</text>
          </view>
          <view class="cang-shen">
            <text v-for="(c, i) in data.siZhu[k].cangGan" :key="i" class="cang-shen-t">{{ c.shen }}</text>
          </view>
        </view>
      </view>
      <!-- 纳音/地势/自坐/空亡 -->
      <view v-for="row in naYinRows" :key="row.label" class="t-row">
        <text class="t-c t-label">{{ row.label }}</text>
        <text v-for="k in COLS" :key="k" class="t-c soft">{{ data.siZhu[k][row.key] }}</text>
      </view>
      <!-- 神煞 -->
      <view class="t-row">
        <text class="t-c t-label">神煞</text>
        <text v-for="k in COLS" :key="k" class="t-c soft xs">{{ data.shenSha[k].slice(0, 2).join('、') }}{{ data.shenSha[k].length > 2 ? '...' : '' }}</text>
      </view>
      <view class="t-expand" @tap="showAllShenSha = !showAllShenSha">
        <text class="t-expand-text">{{ showAllShenSha ? '收起神煞' : '展开全部神煞' }}</text>
        <app-icon :name="showAllShenSha ? 'chevron-up' : 'chevron-down'" :size="26" color="#c41e3a" />
      </view>
      <view v-if="showAllShenSha" class="ss-all">
        <view v-for="(k, ci) in COLS" :key="k" class="ss-col">
          <text class="ss-col-h">{{ COL_NAMES[ci] }}</text>
          <text v-for="(s, si) in data.shenSha[k]" :key="si" class="ss-item">{{ s }}</text>
        </view>
      </view>
    </view>

    <!-- 胎元/命宫/身宫 -->
    <view class="card">
      <view class="t-head">
        <text class="t-h">胎元</text><text class="t-h">命宫</text><text class="t-h">身宫</text><text class="t-h">旺相休囚死</text>
      </view>
      <view class="t-row palace">
        <view v-for="(g, i) in [data.taiYuan, data.mingGong, data.shenGong]" :key="i" class="t-c">
          <text class="palace-char" :class="wuxingColorClass[g.gan]">{{ g.gan }}</text><text class="palace-char" :class="wuxingColorClass[g.zhi]">{{ g.zhi }}</text>
        </view>
        <view class="t-c">
          <view class="wx-wrap">
            <text v-for="([el, st]) in Object.entries(data.wuxingState)" :key="el" class="wx-tag" :class="wuxingBgClass[el]">{{ el }}{{ st }}</text>
          </view>
        </view>
      </view>
      <view class="t-row nayin">
        <text class="t-c xs soft">{{ data.taiYuan.naYin }}</text>
        <text class="t-c xs soft">{{ data.mingGong.naYin }}</text>
        <text class="t-c xs soft">{{ data.shenGong.naYin }}</text>
        <text class="t-c" />
      </view>
    </view>

    <!-- 起运 -->
    <view class="card qiyun"><text class="qiyun-text">{{ data.qiYun }}</text></view>

    <!-- 大运 -->
    <view class="card">
      <section-title title="大运"><template #extra><text class="hint">点击展开流年</text></template></section-title>
      <view class="dy-table">
        <view class="dy-row dy-years">
          <text v-for="(d, i) in data.daYun" :key="i" class="dy-c year">{{ d.year }}</text>
        </view>
        <view class="dy-row">
          <view v-for="(d, i) in data.daYun" :key="i" class="dy-c click" :class="{ active: d.active, sel: expandedDaYun === i }" @tap="expandedDaYun = expandedDaYun === i ? null : i">
            <text class="dy-char" :class="wuxingColorClass[d.gan]">{{ d.gan }}</text><text class="dy-shen">{{ d.shiShen }}</text>
          </view>
        </view>
        <view class="dy-row">
          <view v-for="(d, i) in data.daYun" :key="i" class="dy-c click" :class="{ active: d.active, sel: expandedDaYun === i }" @tap="expandedDaYun = expandedDaYun === i ? null : i">
            <text class="dy-char" :class="wuxingColorClass[d.zhi]">{{ d.zhi }}</text><text class="dy-shen">{{ d.shiShenZhi }}</text>
          </view>
        </view>
      </view>
      <view v-if="expandedDaYun !== null" class="dy-detail">
        <view class="dy-detail-head">
          <text class="dy-detail-title">{{ data.daYun[expandedDaYun].year }}-{{ data.daYun[expandedDaYun].year + 9 }} 流年</text>
          <text class="dy-collapse" @tap="expandedDaYun = null">收起</text>
        </view>
        <view class="dy-grid">
          <view v-for="(item, i) in daYunYears(expandedDaYun)" :key="i" class="dy-cell">
            <text class="dy-cell-year">{{ item.year }}</text>
            <view><text class="dy-cell-char" :class="wuxingColorClass[item.gan]">{{ item.gan }}</text><text class="dy-shen">{{ item.ganShen }}</text></view>
            <view><text class="dy-cell-char" :class="wuxingColorClass[item.zhi]">{{ item.zhi }}</text><text class="dy-shen">{{ item.zhiShen }}</text></view>
            <text class="dy-cell-age">{{ item.age }}岁</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 流年 -->
    <view class="card">
      <section-title title="流年" />
      <view class="dy-table">
        <view class="dy-row dy-years"><text v-for="(n, i) in data.liuNian" :key="i" class="dy-c year">{{ n.year }}</text></view>
        <view class="dy-row">
          <view v-for="(n, i) in data.liuNian" :key="i" class="dy-c" :class="{ active: n.active }">
            <text class="dy-char sm" :class="wuxingColorClass[n.gan]">{{ n.gan }}</text><text class="dy-shen">{{ n.shiShen }}</text>
          </view>
        </view>
        <view class="dy-row">
          <view v-for="(n, i) in data.liuNian" :key="i" class="dy-c" :class="{ active: n.active }">
            <text class="dy-char sm" :class="wuxingColorClass[n.zhi]">{{ n.zhi }}</text><text class="dy-shen">{{ n.shiShenZhi }}</text>
          </view>
        </view>
        <view class="dy-row dy-years"><text v-for="(n, i) in data.liuNian" :key="i" class="dy-c year" :class="{ active: n.active }">{{ n.age }}岁</text></view>
      </view>
    </view>

    <classics-section />

    <view class="ai-btn"><app-icon name="sparkles" :size="36" color="#ffffff" /><text class="ai-btn-text">AI辅助分析</text></view>

  </view>
</template>

<style scoped lang="scss">
.tm { padding: 20rpx; display: flex; flex-direction: column; gap: 16rpx; }
.card { background: var(--card); border-radius: 16rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); overflow: hidden; }
.info-head { display: flex; gap: 32rpx; padding: 20rpx 24rpx; border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.info-item { font-size: 26rpx; color: var(--text-ink); }
.info-k { color: var(--brand); font-weight: 500; }
.info-row { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 24rpx; border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); font-size: 26rpx; }
.info-row.no-bd { border-bottom: none; }
.shrink { flex-shrink: 0; }
.info-v { color: var(--text-ink); }
.info-soft { color: var(--text-soft); }
.info-edit { margin-left: auto; padding: 4rpx; }
/* 表格通用 */
.t-head { display: flex; background: rgba(196,30,58,0.05); }
.t-h { flex: 1; text-align: center; padding: 16rpx 0; font-size: 26rpx; font-weight: 600; color: var(--text-ink); }
.t-h-label, .t-label { color: var(--brand); }
.t-h-label { flex: 0 0 92rpx; }
.t-row { display: flex; align-items: stretch; border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.t-c { flex: 1; text-align: center; padding: 12rpx 0; font-size: 26rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.t-label { flex: 0 0 92rpx; font-weight: 500; }
.soft { color: var(--text-soft); }
.xs { font-size: 20rpx; }
.ganzhi { background: rgba(0,0,0,0.02); }
.gz-char { font-size: 48rpx; font-weight: 900; line-height: 1.15; }
.cang { padding: 12rpx 0; }
.cang-gan { display: flex; justify-content: center; gap: 2rpx; }
.cang-char { font-size: 26rpx; font-weight: 700; }
.cang-shen { display: flex; justify-content: center; gap: 2rpx; }
.cang-shen-t { font-size: 18rpx; color: var(--text-soft); }
.t-expand { display: flex; align-items: center; justify-content: center; gap: 6rpx; padding: 16rpx 0; border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.t-expand-text { font-size: 22rpx; color: var(--brand); }
.ss-all { border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); background: rgba(0,0,0,0.02); padding: 20rpx 24rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; }
.ss-col { text-align: center; }
.ss-col-h { display: block; color: var(--brand); font-size: 22rpx; font-weight: 600; margin-bottom: 8rpx; }
.ss-item { display: block; color: var(--text-soft); font-size: 22rpx; line-height: 1.6; }
/* 胎元命宫 */
.palace-char { font-size: 36rpx; font-weight: 900; }
.nayin .t-c { border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.wx-wrap { display: flex; flex-wrap: wrap; justify-content: center; gap: 6rpx; }
.wx-tag { padding: 2rpx 10rpx; border-radius: 6rpx; font-size: 20rpx; font-weight: 600; }
/* 起运 */
.qiyun { padding: 20rpx 24rpx; }
.qiyun-text { font-size: 26rpx; color: var(--text-soft); }
.hint { font-size: 22rpx; color: var(--text-soft); }
/* 大运/流年表 */
.dy-table { width: 100%; }
.dy-row { display: flex; }
.dy-c { flex: 1; text-align: center; padding: 4rpx 0; display: flex; align-items: center; justify-content: center; }
.dy-c.year { font-size: 20rpx; color: var(--text-soft); padding-top: 8rpx; }
.dy-c.click { cursor: pointer; }
.dy-c.active { background: rgba(196,30,58,0.08); }
.dy-c.sel { background: rgba(0,0,0,0.04); }
.dy-char { font-size: 40rpx; font-weight: 900; line-height: 1; }
.dy-char.sm { font-size: 34rpx; }
.dy-shen { font-size: 18rpx; color: var(--text-soft); vertical-align: top; margin-left: 1rpx; }
.dy-detail { border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding: 20rpx; background: rgba(0,0,0,0.02); }
.dy-detail-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.dy-detail-title { font-size: 22rpx; color: var(--text-ink); font-weight: 500; }
.dy-collapse { font-size: 22rpx; color: var(--brand); }
.dy-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12rpx; }
.dy-cell { background: var(--card); border-radius: 8rpx; padding: 12rpx 0; text-align: center; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.dy-cell-year { font-size: 20rpx; color: var(--text-soft); }
.dy-cell-char { font-size: 30rpx; font-weight: 700; }
.dy-cell-age { font-size: 20rpx; color: var(--text-soft); margin-top: 2rpx; }
/* AI按钮 */
.ai-btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 24rpx; background: var(--brand); border-radius: 16rpx; box-shadow: 0 2rpx 6rpx rgba(196,30,58,0.15); }
.ai-btn-text { font-size: 28rpx; font-weight: 500; color: #fff; }
</style>
