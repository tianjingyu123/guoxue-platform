<script setup lang="ts">
/**
 * 【万年历子组件】日视图 · 传统老黄历/撕历形制（自 V0 components/yijing/wannianli/day-view.tsx 还原）
 * 朱砂红头栏 + 中央大字日号 + 干支纪年 + 朱印 + 宜忌红黑套印双栏
 * + 冲煞/值神 + 五行穿衣/五方吉神/倒计时/节气物候/四柱/五行
 * + 可展开专业区（黄历详解/九宫飞星/时辰/方位/神煞/彭祖百忌）。
 * 取舍：V0"历史上的今天"来自 mock 假数据 → 砍掉；
 *       朱印印文取当日第一条宜事（V0 硬编码"宜嫁娶"是假数据）；
 *       语音播报仅 H5 端（Web Speech），其余端提示暂不支持。
 *
 * 🔴 2026-07-14 补回 V0 的宜忌联动：点一条「宜」/「忌」→ 跳择日并带入该事项。
 *    此前连同择日 tab 一起被砍了，黄历看到「宜嫁娶」却无从查「哪天更宜嫁娶」——
 *    而这恰是老黄历最常见的用法。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import { buildAlmanac } from '@/pkg-paipan/lib/wannianli-engine'
import GanzhiPillar from './ganzhi-pillar.vue'
import WuxingBar from './wuxing-bar.vue'
import LuckTimeline from './luck-timeline.vue'
import DirectionCompass from './direction-compass.vue'
import StatTile from './stat-tile.vue'
import WuxingDressCard from './wuxing-dress-card.vue'
import CountdownList from './countdown-list.vue'
import AlmanacTable from './almanac-table.vue'
import FlyingStarGrid from './flying-star-grid.vue'

const props = defineProps<{
  date: Date
}>()

const emit = defineEmits<{
  (e: 'change-date', d: Date): void
  /** 点宜/忌某一项 → 跳择日查「哪天更宜此事」 */
  (e: 'pick-yiji', term: string): void
}>()

const proOpen = ref(true)
const vernacularOpen = ref(false)
const speaking = ref(false)

const bundle = computed(() => buildAlmanac(props.date))
const d = computed(() => bundle.value.day)

/** 朱印印文：取当日第一条宜事 */
const sealChars = computed(() => {
  const first = d.value.yi[0]?.text
  return (first ? `宜${first}` : '黄历').slice(0, 3).split('')
})

const vernacularYi = computed(() => bundle.value.vernacularYiJi.filter((v) => v.type === 'yi'))
const vernacularJi = computed(() => bundle.value.vernacularYiJi.filter((v) => v.type === 'ji'))

function shiftDay(delta: number) {
  const next = new Date(props.date)
  next.setDate(next.getDate() + delta)
  emit('change-date', next)
}

/** 语音播报（H5 端 Web Speech，失败静默复位；其余端提示） */
function handleSpeak() {
  if (speaking.value) return
  // #ifdef H5
  const text = `今日${d.value.lunarDate}，${d.value.ganZhiLine}。宜：${d.value.yi.map((y) => y.text).join('、')}。忌：${d.value.ji.map((j) => j.text).join('、')}。`
  speaking.value = true
  try {
    const synth = window.speechSynthesis
    if (synth) {
      synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'zh-CN'
      u.onend = () => { speaking.value = false }
      u.onerror = () => { speaking.value = false }
      synth.speak(u)
    } else {
      setTimeout(() => { speaking.value = false }, 1500)
    }
  } catch {
    setTimeout(() => { speaking.value = false }, 1500)
  }
  // #endif
  // #ifndef H5
  uni.showToast({ title: '当前端暂不支持语音播报', icon: 'none' })
  // #endif
}
</script>

<template>
  <view class="dv">
    <!-- ===== 老黄历主页（撕历形制） ===== -->
    <view class="calendar-card">
      <!-- 朱砂红头栏 -->
      <view class="cal-head">
        <view class="cal-nav" @tap="shiftDay(-1)">
          <app-icon name="chevron-left" :size="40" color="#ffffff" />
        </view>
        <view class="cal-head-center">
          <text class="cal-head-title">黄　历</text>
          <text class="cal-head-year">{{ d.solarYearLabel }} 年</text>
        </view>
        <view class="cal-nav" @tap="shiftDay(1)">
          <app-icon name="chevron-right" :size="40" color="#ffffff" />
        </view>
      </view>

      <!-- 中央大字区 -->
      <view class="cal-main">
        <!-- 朱印：右上角 -->
        <view class="seal">
          <view class="seal-inner">
            <text v-for="(ch, i) in sealChars" :key="i" class="seal-char">{{ ch }}</text>
          </view>
        </view>

        <!-- 公历月 + 星期 -->
        <view class="cal-month-row">
          <text class="cal-month">{{ d.solarMonthLabel }}</text>
          <text class="cal-weekday">{{ d.weekday }}</text>
        </view>

        <!-- 大字日号 + 农历 -->
        <view class="cal-day-row">
          <text class="cal-day-num">{{ d.solarDayNum }}</text>
          <view class="cal-lunar">
            <text class="cal-lunar-date">农历{{ d.lunarDate }}</text>
            <text class="cal-lunar-year">{{ d.lunarYear }}</text>
          </view>
        </view>

        <!-- 干支纪年整行 + 黄帝纪元 -->
        <view class="cal-ganzhi">
          <text class="cal-ganzhi-line">{{ d.ganZhiLine }}</text>
          <text class="cal-huangdi">{{ bundle.huangdiEra }}</text>
        </view>

        <!-- 距节气提示 -->
        <view v-if="d.jiRi" class="cal-jiri">
          <text class="cal-jiri-text">【 {{ d.jiRi }} 】</text>
        </view>
      </view>

      <!-- 宜 / 忌 红黑套印双栏（点任一项 → 择日查「哪天更宜此事」） -->
      <view class="yiji">
        <view class="yiji-col yiji-col-line">
          <view class="yiji-head">
            <view class="yiji-badge yiji-badge-yi"><text class="yiji-badge-text">宜</text></view>
            <text class="yiji-hint">点事项择吉日</text>
          </view>
          <view class="yiji-items">
            <text
              v-for="item in d.yi"
              :key="item.text"
              class="yiji-item yiji-item-tap"
              @tap="emit('pick-yiji', item.text)"
            >{{ item.text }}</text>
          </view>
        </view>
        <view class="yiji-col">
          <view class="yiji-head">
            <view class="yiji-badge yiji-badge-ji"><text class="yiji-badge-text">忌</text></view>
            <text class="yiji-hint">点事项择吉日</text>
          </view>
          <view class="yiji-items">
            <text
              v-for="item in d.ji"
              :key="item.text"
              class="yiji-item yiji-item-tap"
              @tap="emit('pick-yiji', item.text)"
            >{{ item.text }}</text>
          </view>
        </view>
      </view>

      <!-- 冲煞 / 值神 底栏 -->
      <view class="cs-bar">
        <view class="cs-cell cs-cell-line">
          <text class="cs-label">冲煞</text>
          <text class="cs-value cs-value-bad">{{ d.chongSha }}</text>
        </view>
        <view class="cs-cell">
          <text class="cs-label">值神</text>
          <text class="cs-value cs-value-brand">{{ d.zhiShen }}</text>
        </view>
      </view>

      <!-- 操作行：语音播报 / 白话文宜忌 -->
      <view class="op-bar">
        <view class="op-btn op-btn-line" @tap="handleSpeak">
          <app-icon name="volume-2" :size="32" color="var(--brand)" />
          <text class="op-text">{{ speaking ? '播报中…' : '语音播报' }}</text>
        </view>
        <view class="op-btn" @tap="vernacularOpen = true">
          <app-icon name="book-open" :size="32" color="var(--brand)" />
          <text class="op-text">白话宜忌</text>
        </view>
      </view>
    </view>

    <!-- 吉神 / 凶神 -->
    <view class="gods">
      <stat-tile label="吉神宜趋" :value="d.jiShen" tone="good" align="left" />
      <stat-tile label="凶神宜忌" :value="d.xiongShen" tone="bad" align="left" />
    </view>

    <!-- 五行穿衣 · 今日吉色 -->
    <paper-card padding="lg">
      <view class="sec-title"><section-title title="五行穿衣" subtitle="每日五行穿搭 · 配色对了更顺遂" /></view>
      <wuxing-dress-card :items="bundle.wuxingDress" />
    </paper-card>

    <!-- 五方吉神 -->
    <paper-card padding="lg">
      <view class="sec-title"><section-title title="五方吉神" subtitle="喜福财贵 · 方位所在" /></view>
      <view class="aus-grid">
        <view v-for="g in bundle.auspiciousGods" :key="g.name" class="aus-item">
          <text class="aus-name">{{ g.name }}</text>
          <text class="aus-dir">{{ g.direction }}</text>
        </view>
      </view>
    </paper-card>

    <!-- 节假日倒计时 -->
    <paper-card padding="lg">
      <view class="sec-title-sm"><section-title title="节假日倒计时" subtitle="传统佳节 · 就在前方" /></view>
      <countdown-list :items="bundle.holidayCountdowns" />
    </paper-card>

    <!-- 24节气 · 72候 -->
    <paper-card padding="lg">
      <view class="sec-title"><section-title title="节气物候" subtitle="廿四节气 · 七十二候" /></view>
      <view class="pheno">
        <view class="pheno-head">
          <text class="pheno-term">{{ bundle.currentPhenology.term }}</text>
          <text class="pheno-phase">{{ bundle.currentPhenology.phase }} · {{ bundle.currentPhenology.name }}</text>
        </view>
        <text class="pheno-desc">{{ bundle.currentPhenology.desc }}</text>
      </view>
      <countdown-list :items="bundle.solarTermCountdowns" />
    </paper-card>

    <!-- 四柱 -->
    <paper-card padding="lg">
      <view class="sec-title"><section-title title="今日四柱" subtitle="干支 · 五行 · 十神" /></view>
      <view class="pillars">
        <ganzhi-pillar v-for="p in d.pillars" :key="p.label" :pillar="p" detailed :highlight="p.label === '日柱'" />
      </view>
    </paper-card>

    <!-- 五行 -->
    <paper-card padding="lg">
      <view class="sec-title"><section-title title="五行分布" subtitle="今日天地之气强弱" /></view>
      <wuxing-bar :data="d.wuxing" />
    </paper-card>

    <!-- ===== 专业区开关 ===== -->
    <view class="pro-toggle" @tap="proOpen = !proOpen">
      <view class="pro-toggle-left">
        <app-icon name="scroll-text" :size="32" color="var(--gold)" />
        <text class="pro-toggle-text">专业排盘详情</text>
        <view class="pro-tag">
          <app-icon name="crown" :size="24" color="var(--gold)" />
          <text class="pro-tag-text">专业版</text>
        </view>
      </view>
      <view class="pro-chevron" :class="{ 'pro-chevron-open': proOpen }">
        <app-icon name="chevron-down" :size="40" color="var(--text-soft)" />
      </view>
    </view>

    <view v-if="proOpen" class="pro-body">
      <!-- 老黄历详解表格 -->
      <paper-card padding="lg">
        <view class="sec-title"><section-title title="今日黄历详解" subtitle="值神 · 神煞 · 彭祖百忌" /></view>
        <almanac-table :rows="bundle.almanacRows" />
      </paper-card>

      <!-- 九宫飞星 -->
      <paper-card padding="lg">
        <view class="sec-title"><section-title title="九宫飞星" subtitle="流年 / 流月 / 流日 / 流时" /></view>
        <flying-star-grid :charts="bundle.flyingStarCharts" />
      </paper-card>

      <!-- 时辰吉凶 -->
      <paper-card padding="lg">
        <view class="sec-title-sm"><section-title title="十二时辰吉凶" /></view>
        <luck-timeline :hours="d.hours" />
      </paper-card>

      <!-- 时辰民俗征兆（玉匣记） -->
      <paper-card padding="lg">
        <view class="sec-title"><section-title title="时辰民俗征兆" subtitle="玉匣记 · 眼跳耳热之应" /></view>
        <view class="omens">
          <view v-for="omen in bundle.hourOmens" :key="omen.name" class="omen-row">
            <text class="omen-name">{{ omen.name }}</text>
            <text class="omen-meaning">{{ omen.meaning }}</text>
          </view>
        </view>
      </paper-card>

      <!-- 方位 -->
      <paper-card padding="lg">
        <view class="sec-title"><section-title title="今日方位" subtitle="吉神 / 凶煞 方位分布" /></view>
        <view class="compass-wrap">
          <direction-compass :directions="d.directions" center-label="今日" />
        </view>
      </paper-card>

      <!-- 神煞详情 -->
      <paper-card padding="lg">
        <view class="sec-title"><section-title title="神煞 · 星宿" /></view>
        <view class="shensha-grid">
          <stat-tile label="二十八宿" :value="d.ershiba" />
          <stat-tile label="建除十二神" :value="d.jianChu" />
          <stat-tile label="九星" :value="d.jiuXing" />
          <stat-tile label="空亡" :value="d.kongWang" />
          <view class="shensha-wide">
            <stat-tile label="胎神占方" :value="d.taiShen" align="left" />
          </view>
        </view>
      </paper-card>

      <!-- 彭祖百忌 -->
      <paper-card padding="lg">
        <view class="sec-title"><section-title title="彭祖百忌" /></view>
        <view class="pengzu">
          <view v-for="line in d.pengZu" :key="line" class="pengzu-row">
            <view class="pengzu-dot" />
            <text class="pengzu-text">{{ line }}</text>
          </view>
        </view>
      </paper-card>
    </view>

    <!-- 白话文宜忌弹层 -->
    <view v-if="vernacularOpen" class="sheet-mask" @tap="vernacularOpen = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">宜忌白话文</text>
          <view class="sheet-close" @tap="vernacularOpen = false">
            <app-icon name="x" :size="36" color="var(--text-soft)" />
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view class="vern-group">
            <view class="vern-head">
              <view class="yiji-badge yiji-badge-yi yiji-badge-sm"><text class="yiji-badge-text yiji-badge-text-sm">宜</text></view>
              <text class="vern-hint">今日所宜 · 通俗解释</text>
            </view>
            <view v-for="v in vernacularYi" :key="v.term" class="vern-item vern-item-yi">
              <text class="vern-term">{{ v.term }}</text>
              <text class="vern-plain">{{ v.plain }}</text>
            </view>
          </view>
          <view class="vern-group">
            <view class="vern-head">
              <view class="yiji-badge yiji-badge-ji yiji-badge-sm"><text class="yiji-badge-text yiji-badge-text-sm">忌</text></view>
              <text class="vern-hint">今日所忌 · 通俗解释</text>
            </view>
            <view v-for="v in vernacularJi" :key="v.term" class="vern-item vern-item-ji">
              <text class="vern-term">{{ v.term }}</text>
              <text class="vern-plain">{{ v.plain }}</text>
            </view>
          </view>
          <view class="sheet-safe" />
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
$good: #2f9d6a;
$gold-line: rgba(201, 169, 110, 0.5);
$gold-soft: rgba(201, 169, 110, 0.15);

.dv {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding: 32rpx 32rpx 48rpx;
}

/* ===== 老黄历主卡 ===== */
.calendar-card {
  overflow: hidden;
  border-radius: 32rpx;
  border: 4rpx solid rgba(196, 30, 58, 0.7);
  background: var(--card);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
}
.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--brand);
  padding: 20rpx 32rpx;
}
.cal-nav {
  padding: 8rpx;
  border-radius: 12rpx;
  &:active { opacity: 0.8; }
}
.cal-head-center { display: flex; flex-direction: column; align-items: center; }
.cal-head-title {
  font-family: $serif;
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: #ffffff;
}
.cal-head-year {
  margin-top: 4rpx;
  font-size: 22rpx;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.9);
}
.cal-main {
  position: relative;
  padding: 32rpx 32rpx 40rpx;
  background: var(--bg-paper);
}
/* 朱印（无 writing-mode：单字竖排堆叠） */
.seal {
  position: absolute;
  right: 32rpx;
  top: 24rpx;
  transform: rotate(-4deg);
}
.seal-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 108rpx;
  height: 108rpx;
  border-radius: 12rpx;
  border: 4rpx solid var(--brand);
  box-shadow: inset 0 0 0 6rpx var(--bg-paper), inset 0 0 0 8rpx var(--brand);
}
.seal-char {
  font-family: $serif;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.05;
  color: var(--brand);
}
.cal-month-row { display: flex; align-items: center; gap: 24rpx; }
.cal-month { font-family: $serif; font-size: 28rpx; font-weight: 700; color: var(--brand); }
.cal-weekday { font-family: $serif; font-size: 28rpx; color: var(--text); }
.cal-day-row { margin-top: 8rpx; display: flex; align-items: flex-end; gap: 32rpx; }
.cal-day-num {
  font-family: $serif;
  font-size: 176rpx;
  font-weight: 900;
  line-height: 1;
  color: var(--brand);
}
.cal-lunar { display: flex; flex-direction: column; padding-bottom: 16rpx; }
.cal-lunar-date { font-family: $serif; font-size: 48rpx; font-weight: 700; color: var(--text-ink); }
.cal-lunar-year { margin-top: 8rpx; font-family: $serif; font-size: 28rpx; color: var(--text); }
.cal-ganzhi {
  margin-top: 24rpx;
  border-top: 1rpx solid $gold-line;
  border-bottom: 1rpx solid $gold-line;
  padding: 16rpx 0;
  text-align: center;
}
.cal-ganzhi-line {
  display: block;
  font-family: $serif;
  font-size: 32rpx;
  letter-spacing: 0.05em;
  color: var(--text-ink);
}
.cal-huangdi { display: block; margin-top: 4rpx; font-family: $serif; font-size: 24rpx; color: var(--text); }
.cal-jiri { margin-top: 16rpx; text-align: center; }
.cal-jiri-text { font-family: $serif; font-size: 24rpx; color: var(--brand); }

/* 宜忌双栏 */
.yiji { display: flex; border-top: 4rpx solid rgba(196, 30, 58, 0.7); }
.yiji-col { flex: 1; padding: 32rpx; }
.yiji-col-line { border-right: 1rpx solid $gold-line; }
.yiji-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.yiji-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
}
.yiji-badge-sm { width: 48rpx; height: 48rpx; border-radius: 8rpx; }
.yiji-badge-yi { background: $good; }
.yiji-badge-ji { background: var(--brand); }
.yiji-badge-text { font-family: $serif; font-size: 36rpx; font-weight: 700; color: #ffffff; }
.yiji-badge-text-sm { font-size: 28rpx; }
.yiji-hint { font-family: $serif; font-size: 24rpx; color: var(--text-soft); }
.yiji-items { display: flex; flex-wrap: wrap; column-gap: 24rpx; row-gap: 12rpx; }
.yiji-item { font-family: $serif; font-size: 30rpx; line-height: 1.6; color: var(--text-ink); }
/* 可点：虚线下划线做暗示（不加会让人以为只是文字） */
.yiji-item-tap { border-bottom: 1rpx dashed rgba(196, 30, 58, 0.35); padding-bottom: 2rpx; }

/* 冲煞 / 值神 */
.cs-bar { display: flex; border-top: 1rpx solid $gold-line; background: rgba(240, 235, 229, 0.4); }
.cs-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx 0;
}
.cs-cell-line { border-right: 1rpx solid rgba(201, 169, 110, 0.4); }
.cs-label { font-family: $serif; font-size: 28rpx; color: var(--text-soft); }
.cs-value { font-family: $serif; font-size: 28rpx; font-weight: 700; }
.cs-value-bad { color: var(--brand); }
.cs-value-brand { color: var(--brand); }

/* 操作行 */
.op-bar { display: flex; border-top: 1rpx solid $gold-line; }
.op-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx 0;
  &:active { background: rgba(201, 169, 110, 0.12); }
}
.op-btn-line { border-right: 1rpx solid rgba(201, 169, 110, 0.4); }
.op-text { font-family: $serif; font-size: 28rpx; color: var(--brand); }

/* 吉神 / 凶神 */
.gods { display: flex; flex-direction: column; gap: 24rpx; }

/* 区块标题间距（paper-card 内） */
.sec-title { margin-bottom: 28rpx; }
.sec-title-sm { margin-bottom: 16rpx; }

/* 五方吉神 */
.aus-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16rpx; }
.aus-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  border-radius: 16rpx;
  background: rgba(201, 169, 110, 0.12);
  padding: 20rpx 0;
  text-align: center;
}
.aus-name { font-family: $serif; font-size: 28rpx; font-weight: 700; color: var(--brand); }
.aus-dir { font-family: $serif; font-size: 28rpx; color: var(--text-ink); }

/* 节气物候 */
.pheno { margin-bottom: 24rpx; border-radius: 16rpx; background: rgba(201, 169, 110, 0.12); padding: 24rpx; }
.pheno-head { display: flex; align-items: baseline; gap: 16rpx; }
.pheno-term { font-family: $serif; font-size: 32rpx; font-weight: 700; color: var(--brand); }
.pheno-phase { font-family: $serif; font-size: 28rpx; color: var(--text); }
.pheno-desc { display: block; margin-top: 12rpx; font-family: $serif; font-size: 28rpx; line-height: 1.7; color: var(--text); }

/* 四柱 */
.pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }

/* 专业区 */
.pro-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 20rpx;
  border: 1rpx solid rgba(201, 169, 110, 0.4);
  background: rgba(201, 169, 110, 0.18);
  padding: 24rpx 32rpx;
}
.pro-toggle-left { display: flex; align-items: center; gap: 16rpx; }
.pro-toggle-text { font-family: $serif; font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.pro-tag {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  border-radius: 999rpx;
  border: 1rpx solid $gold-line;
  background: $gold-soft;
  padding: 4rpx 16rpx;
}
.pro-tag-text { font-size: 24rpx; font-weight: 500; color: var(--gold-foreground); }
.pro-chevron { transition: transform 0.2s; }
.pro-chevron-open { transform: rotate(180deg); }
.pro-body { display: flex; flex-direction: column; gap: 32rpx; }

/* 时辰民俗征兆 */
.omens { display: flex; flex-direction: column; gap: 16rpx; }
.omen-row { display: flex; align-items: baseline; gap: 16rpx; }
.omen-name { flex-shrink: 0; font-family: $serif; font-size: 28rpx; font-weight: 700; color: var(--gold); }
.omen-meaning { font-family: $serif; font-size: 28rpx; line-height: 1.6; color: var(--text); }

/* 方位 */
.compass-wrap { display: flex; justify-content: center; }

/* 神煞 */
.shensha-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24rpx; }
.shensha-wide { grid-column: 1 / -1; }

/* 彭祖百忌 */
.pengzu { display: flex; flex-direction: column; gap: 16rpx; }
.pengzu-row { display: flex; align-items: flex-start; gap: 16rpx; }
.pengzu-dot {
  margin-top: 16rpx;
  width: 12rpx;
  height: 12rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--gold);
}
.pengzu-text { font-family: $serif; font-size: 28rpx; line-height: 1.7; color: var(--text-ink); }

/* 白话宜忌弹层 */
.sheet-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.sheet {
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  border-radius: 32rpx 32rpx 0 0;
  background: var(--card);
  overflow: hidden;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.sheet-title { font-family: $serif; font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.sheet-close { padding: 8rpx; }
.sheet-body { flex: 1; min-height: 0; padding: 32rpx; box-sizing: border-box; }
.sheet-safe { height: env(safe-area-inset-bottom); }
.vern-group { margin-bottom: 32rpx; }
.vern-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.vern-hint { font-family: $serif; font-size: 28rpx; color: var(--text-soft); }
.vern-item { margin-bottom: 20rpx; border-radius: 16rpx; padding: 24rpx; }
.vern-item-yi { background: rgba(47, 157, 106, 0.1); }
.vern-item-ji { background: rgba(196, 30, 58, 0.08); }
.vern-term { font-family: $serif; font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.vern-plain { display: block; margin-top: 8rpx; font-family: $serif; font-size: 28rpx; line-height: 1.7; color: var(--text); }
</style>
