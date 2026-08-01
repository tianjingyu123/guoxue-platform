<script setup lang="ts">
/**
 * 二十四节气（自 V0 app/jieqi/page.tsx 还原）
 * 结构：当前节气 Hero（三候进度 + 交节倒计时 + 数九三伏）→ 年份交节时刻表（按季分组）
 *      → 选中节气详情头 + 四模块 Tab（文化百科 / 节气养生 / 节气推荐 / 节气海报）→ 上/下节气快切
 *
 * 交节时刻由 jieqi-engine 真算（lunar-typescript，精确到分），不是查表近似。
 * 说明：本页是节气「工具」；pkg-solar-term 那个「节气仪式」是打卡运营页，两者不是一回事。
 */
import { ref, computed, onUnmounted } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import CultureModule from './components/culture-module.vue'
import HealthModule from './components/health-module.vue'
import RecommendModule from './components/recommend-module.vue'
import PosterModule from './components/poster-module.vue'
import { JIEQI_LIST, SEASON_META } from '@/pkg-paipan/lib/jieqi-data'
import { jieqiTableOfYear, currentJieqi, countdownText } from '@/pkg-paipan/lib/jieqi-engine'

// R4 合规：小程序端无占卜类目（节气本身是历法内容，标题保持一致即可）
const hdrTitle = '二十四节气'

const SEASONS = ['春', '夏', '秋', '冬'] as const
type ModuleKey = 'culture' | 'health' | 'recommend' | 'poster'
const MODULES: { key: ModuleKey; label: string; hint: string }[] = [
  { key: 'culture', label: '文化百科', hint: '物候 · 民俗 · 诗词 · 字源' },
  { key: 'health', label: '节气养生', hint: '饮食 · 起居 · 运动 · 情志' },
  { key: 'recommend', label: '节气推荐', hint: '好物 · 课程 · 素材' },
  { key: 'poster', label: '节气海报', hint: '一键生成分享图' },
]

const now = ref(new Date())
const timer = setInterval(() => (now.value = new Date()), 30000)
onUnmounted(() => clearInterval(timer))

const year = ref(new Date().getFullYear())
const selected = ref<string | null>(null)
const activeModule = ref<ModuleKey>('culture')

const cur = computed(() => currentJieqi(now.value))
const table = computed(() => jieqiTableOfYear(year.value))

const selectedName = computed(() => selected.value ?? cur.value?.current.name ?? '立春')
const detail = computed(() => JIEQI_LIST.find((j) => j.name === selectedName.value)!)
const detailMoment = computed(() => table.value.find((t) => t.name === selectedName.value))
const meta = computed(() => SEASON_META[detail.value.season])
const isCurrentTerm = computed(() => cur.value?.current.name === selectedName.value)
const dateLine = computed(() =>
  detailMoment.value
    ? `${detailMoment.value.dateText} ${detailMoment.value.weekText} ${detailMoment.value.timeText.slice(0, 5)}`
    : undefined,
)
const moduleHint = computed(() => MODULES.find((m) => m.key === activeModule.value)?.hint ?? '')

function seasonTerms(s: string) {
  return table.value.filter((t) => t.info.season === s)
}
function houLabel(i: number) {
  return i === 1 ? '初候' : i === 2 ? '二候' : '三候'
}
/** 候进度条颜色：已过=实色，当前=实色半透明，未到=淡色 */
function houBar(i: number): Record<string, string> {
  const c = cur.value
  if (!c) return {}
  const color = SEASON_META[c.current.info.season].color
  if (i + 1 < c.houIndex) return { backgroundColor: color }
  if (i + 1 === c.houIndex) return { backgroundColor: color, opacity: '0.75' }
  return { backgroundColor: color + '26' }
}

const prevTerm = computed(() => {
  const idx = JIEQI_LIST.findIndex((j) => j.name === selectedName.value)
  return JIEQI_LIST[(idx + 23) % 24]
})
const nextTerm = computed(() => {
  const idx = JIEQI_LIST.findIndex((j) => j.name === selectedName.value)
  return JIEQI_LIST[(idx + 1) % 24]
})
</script>

<template>
  <view class="page">
    <ToolHeader :title="hdrTitle" />

    <!-- 当前节气 Hero -->
    <view
      v-if="cur"
      class="hero"
      :style="{
        backgroundColor: SEASON_META[cur.current.info.season].bg,
        borderColor: SEASON_META[cur.current.info.season].color + '33',
      }"
    >
      <view class="hero-top">
        <view class="hero-l">
          <view class="hero-name-row">
            <text class="hero-name" :style="{ color: SEASON_META[cur.current.info.season].color }">
              {{ cur.current.name }}
            </text>
            <text class="hero-py">{{ cur.current.info.pinyin }}</text>
          </view>
          <text class="hero-meaning">{{ cur.current.info.meaning }}</text>
        </view>
        <view class="hero-r">
          <text class="hero-r-t">
            {{ cur.current.date.getFullYear() }}年{{ cur.current.dateText }}
            {{ cur.current.timeText.slice(0, 5) }} 交节
          </text>
          <text class="hero-r-t">
            第 <text class="b">{{ cur.dayIn }}</text> / {{ cur.dayTotal }} 天 · {{ houLabel(cur.houIndex) }}
          </text>
        </view>
      </view>

      <!-- 候进度 -->
      <view class="hou-row">
        <view v-for="(h, i) in cur.current.info.sanhou" :key="h.name" class="hou-col">
          <view class="hou-bar" :style="houBar(i)" />
          <text class="hou-name" :class="{ 'hou-name-on': i + 1 === cur.houIndex }">{{ h.name }}</text>
        </view>
      </view>

      <!-- 倒计时 -->
      <view class="cd">
        <text class="cd-l">
          距 <text class="b">{{ cur.next.name }}</text>（{{ cur.next.dateText }} {{ cur.next.timeText.slice(0, 5) }}）
        </text>
        <text class="cd-r" :style="{ color: SEASON_META[cur.current.info.season].color }">
          {{ countdownText(cur.msToNext) }}
        </text>
      </view>
      <text v-if="cur.shujiu || cur.sanfu" class="jiufu">
        <text v-if="cur.shujiu">数九：{{ cur.shujiu }}</text>
        <text v-if="cur.sanfu">三伏：{{ cur.sanfu }}</text>
      </text>
    </view>

    <!-- 年份节气表 -->
    <view class="sec">
      <view class="sec-hd">
        <text class="sec-t">{{ year }}年 交节时刻表</text>
        <view class="year-ctl">
          <view class="year-btn" @tap="year--"><text class="year-btn-t">−</text></view>
          <text class="year-num">{{ year }}</text>
          <view class="year-btn" @tap="year++"><text class="year-btn-t">＋</text></view>
        </view>
      </view>

      <view v-for="s in SEASONS" :key="s" class="season-row">
        <view class="season-tag" :style="{ backgroundColor: SEASON_META[s].bg, color: SEASON_META[s].color }">
          {{ s }}
        </view>
        <view class="terms">
          <view
            v-for="t in seasonTerms(s)"
            :key="t.name"
            class="term"
            :style="{
              backgroundColor:
                t.name === selectedName
                  ? SEASON_META[s].color
                  : cur && cur.current.name === t.name && year === cur.current.date.getFullYear()
                    ? SEASON_META[s].bg
                    : 'transparent',
              borderColor:
                t.name === selectedName || (cur && cur.current.name === t.name && year === cur.current.date.getFullYear())
                  ? SEASON_META[s].color
                  : '#e7e0d5',
            }"
            @tap="selected = t.name"
          >
            <text class="term-n" :class="{ 'term-on': t.name === selectedName }">{{ t.name }}</text>
            <text class="term-d" :class="{ 'term-on': t.name === selectedName }">{{ t.dateText }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 节气详情头 -->
    <view class="sec">
      <view class="detail" :style="{ backgroundColor: meta.bg, borderColor: meta.color + '33' }">
        <view class="detail-hd">
          <view class="detail-name-row">
            <text class="detail-name" :style="{ color: meta.color }">{{ detail.name }}</text>
            <text class="detail-sub">{{ detail.pinyin }} · {{ detail.season }}季 · {{ meta.desc }}</text>
          </view>
          <text class="detail-lon">太阳黄经 {{ detail.lon }}°</text>
        </view>
        <text class="detail-meaning">{{ detail.meaning }}</text>
        <text v-if="detailMoment" class="detail-moment">
          {{ year }}年交节：{{ detailMoment.dateText }}（{{ detailMoment.weekText }}）{{ detailMoment.timeText }}
          · 农历{{ detailMoment.lunarText }}
        </text>

        <view class="mods">
          <view
            v-for="m in MODULES"
            :key="m.key"
            class="mod"
            :style="
              activeModule === m.key
                ? { backgroundColor: meta.color, color: '#fff', borderColor: meta.color }
                : { backgroundColor: '#fff', color: '#3d2f22', borderColor: '#e7e0d5' }
            "
            @tap="activeModule = m.key"
          >
            {{ m.label }}
          </view>
        </view>
        <text class="mod-hint">{{ moduleHint }}</text>
      </view>
    </view>

    <!-- 模块内容 -->
    <view class="sec">
      <CultureModule
        v-if="activeModule === 'culture'"
        :detail="detail"
        :meta="meta"
        :is-current-term="isCurrentTerm"
        :cur-hou-index="cur?.houIndex"
      />
      <HealthModule v-else-if="activeModule === 'health'" :detail="detail" :meta="meta" />
      <RecommendModule v-else-if="activeModule === 'recommend'" :detail="detail" :meta="meta" />
      <PosterModule v-else :detail="detail" :meta="meta" :date-line="dateLine" />
    </view>

    <!-- 上/下节气快切 -->
    <view class="nav">
      <view class="nav-btn" @tap="selected = prevTerm.name"><text class="nav-t">‹ {{ prevTerm.name }}</text></view>
      <view class="nav-btn" @tap="selected = nextTerm.name"><text class="nav-t">{{ nextTerm.name }} ›</text></view>
    </view>

    <Disclaimer
      variant="custom"
      text="节气交节时刻依天文算法真算；养生与文化内容为传统民俗整理，仅供研习参考，不构成医疗建议。"
    />
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--bg-page, #faf8f5);
  padding-bottom: 40rpx;
}

/* Hero */
.hero {
  margin: 0 32rpx;
  padding: 28rpx;
  border: 1rpx solid;
  border-radius: 32rpx;
}
.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.hero-l {
  flex: 1;
}
.hero-name-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.hero-name {
  font-size: 56rpx;
  font-weight: 700;
}
.hero-py {
  font-size: 21rpx;
  color: #8a7a68;
}
.hero-meaning {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a7a68;
}
.hero-r {
  text-align: right;
  flex-shrink: 0;
}
.hero-r-t {
  display: block;
  font-size: 20rpx;
  line-height: 1.8;
  color: #8a7a68;
}
.b {
  font-weight: 700;
  color: #3d2f22;
}
.hou-row {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
}
.hou-col {
  flex: 1;
}
.hou-bar {
  height: 8rpx;
  border-radius: 999rpx;
}
.hou-name {
  display: block;
  margin-top: 8rpx;
  text-align: center;
  font-size: 19rpx;
  color: #8a7a68;
}
.hou-name-on {
  font-weight: 700;
  color: #3d2f22;
}
.cd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22rpx;
  padding: 16rpx 22rpx;
  border-radius: 20rpx;
  background: #fff;
}
.cd-l {
  font-size: 22rpx;
  color: #8a7a68;
}
.cd-r {
  font-size: 26rpx;
  font-weight: 700;
}
.jiufu {
  display: block;
  margin-top: 14rpx;
  text-align: center;
  font-size: 22rpx;
  font-weight: 500;
  color: #3d2f22;
}

/* 年表 */
.sec {
  margin: 28rpx 32rpx 0;
}
.sec-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.sec-t {
  font-size: 28rpx;
  font-weight: 700;
  color: #3d2f22;
}
.year-ctl {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.year-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 10rpx;
  background: rgba(180, 83, 9, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}
.year-btn-t {
  font-size: 26rpx;
  color: #fffbeb;
}
.year-num {
  width: 100rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
  color: #3d2f22;
}
.season-row {
  display: flex;
  align-items: stretch;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.season-tag {
  width: 56rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  font-size: 26rpx;
  font-weight: 700;
}
.terms {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.term {
  width: calc(33.33% - 8rpx);
  box-sizing: border-box;
  padding: 12rpx 6rpx;
  border: 1rpx solid;
  border-radius: 14rpx;
  text-align: center;
}
.term-n {
  display: block;
  font-size: 22rpx;
  font-weight: 700;
  color: #3d2f22;
}
.term-d {
  display: block;
  font-size: 19rpx;
  color: #8a7a68;
}
.term-on {
  color: #fff;
}

/* 详情头 */
.detail {
  padding: 28rpx;
  border: 1rpx solid;
  border-radius: 32rpx;
}
.detail-hd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.detail-name-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  flex: 1;
  min-width: 0;
}
.detail-name {
  font-size: 44rpx;
  font-weight: 700;
}
.detail-sub {
  font-size: 21rpx;
  color: #8a7a68;
}
.detail-lon {
  flex-shrink: 0;
  font-size: 20rpx;
  color: #8a7a68;
}
.detail-meaning {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #3d2f22;
}
.detail-moment {
  display: block;
  margin-top: 6rpx;
  font-size: 21rpx;
  color: #8a7a68;
}
.mods {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
}
.mod {
  flex: 1;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border: 1rpx solid;
  border-radius: 14rpx;
  font-size: 22rpx;
  font-weight: 700;
}
.mod-hint {
  display: block;
  margin-top: 12rpx;
  text-align: center;
  font-size: 20rpx;
  color: #8a7a68;
}

/* 上下节气 */
.nav {
  display: flex;
  justify-content: space-between;
  margin: 24rpx 32rpx 0;
}
.nav-btn {
  padding: 12rpx 24rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 999rpx;
  background: #fff;
}
.nav-t {
  font-size: 22rpx;
  font-weight: 500;
  color: #3d2f22;
}
</style>
