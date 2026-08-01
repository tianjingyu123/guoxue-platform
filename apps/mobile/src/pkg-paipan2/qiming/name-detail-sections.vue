<script setup lang="ts">
/**
 * 姓名详解分析主体（共享组件）——自 V0 components/qiming/name-detail-sections.tsx 还原
 * 供「起名·名字详批」与「姓名解析」复用：
 * 八字契合 / 音律 / 字形音义 / 三才五格 / 三才配置 / 五格分析 / 数理卦象 / 姓名卦象 / 生肖 / 重名 / 合规FAQ
 * 取舍：V0 三才配置 SVG 同心圆图 → 定位 view 圆环还原（小程序端无内联 SVG）
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import type { NameDetail, GeInfo } from '@/pkg-paipan2/lib/qiming-data'

const props = defineProps<{ detail: NameDetail }>()

const c = computed(() => props.detail.candidate)

/** 吉凶配色：吉绿 / 凶朱 / 其余琥珀 */
function luckColor(luck: string): string {
  if (luck.includes('吉') && !luck.includes('不')) return '#15803d'
  if (luck.includes('凶') || luck.includes('不')) return 'var(--brand)'
  return '#b45309'
}

const geList = computed<[string, GeInfo][]>(() => [
  ['天格', props.detail.sancaiWuge.tianGe],
  ['人格', props.detail.sancaiWuge.renGe],
  ['地格', props.detail.sancaiWuge.diGe],
  ['外格', props.detail.sancaiWuge.waiGe],
  ['总格', props.detail.sancaiWuge.zongGe],
])

/** 五格分析/数理卦象顺序（V0：天/地/人/外/总） */
const geListAlt = computed<[string, GeInfo][]>(() => [
  ['天格', props.detail.sancaiWuge.tianGe],
  ['地格', props.detail.sancaiWuge.diGe],
  ['人格', props.detail.sancaiWuge.renGe],
  ['外格', props.detail.sancaiWuge.waiGe],
  ['总格', props.detail.sancaiWuge.zongGe],
])

const centerChars = computed(() => c.value.chars.map((ch) => ch.char).join(' '))
const centerWx = computed(() => c.value.chars.map((ch) => `[${ch.wuxing}]`).join(' '))

/** 姓名卦爻画：从下到上 → 展示时上爻在前 */
const guaLinesTopFirst = computed(() => [...props.detail.mingGua.lines].reverse())
</script>

<template>
  <view class="nds">
    <!-- 八字契合（喜用补益，引古籍） -->
    <view class="sec sec-amber">
      <view class="sec-hd">
        <app-icon name="sparkles" :size="28" color="#b45309" />
        <text class="sec-title sec-title-amber">八字契合</text>
      </view>
      <text class="sec-p">{{ detail.baziFit.note }}</text>
      <view class="quote-line quote-line-amber">
        <text class="quote-text">《{{ detail.baziFit.source }}》：「{{ detail.baziFit.quote }}」</text>
      </view>
    </view>

    <!-- 音律 -->
    <view class="sec">
      <view class="sec-hd">
        <app-icon name="music" :size="28" color="var(--brand)" />
        <text class="sec-title">音律分析</text>
      </view>
      <text class="tone-line">声调：<text class="tone-strong">{{ detail.yinlv.tonePattern }}</text></text>
      <text class="sec-p">{{ detail.yinlv.note }}</text>
      <view class="homophone">
        <text class="homophone-text">谐音检查：{{ detail.yinlv.homophone }}</text>
      </view>
    </view>

    <!-- 字形音义（逐字拼音/繁体/五行 + 姓氏来源 + 字义内涵 + 名言诗句） -->
    <view class="sec">
      <view class="sec-hd">
        <app-icon name="pen-tool" :size="28" color="var(--brand)" />
        <text class="sec-title">字形音义</text>
      </view>
      <text class="sec-p">{{ detail.zixing.note }}</text>
      <view class="ce-list">
        <view v-for="(ce, i) in detail.charExplains" :key="i" class="ce-item" :class="{ 'ce-item-first': i === 0 }">
          <view class="ce-hd">
            <view class="ce-char-box"><text class="ce-char">{{ ce.char }}</text></view>
            <text class="ce-meta">拼音【{{ ce.pinyin }}】 繁体【{{ ce.traditional }}】 五行【{{ ce.wuxing }}】</text>
          </view>
          <text class="sec-p ce-meaning">{{ ce.meaning }}</text>
          <view v-if="ce.poems.length > 0" class="ce-poems">
            <text v-for="(p, j) in ce.poems" :key="j" class="ce-poem">「{{ p.quote }}」—— {{ p.source }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 三才五格（同心圆图 + 五格表） -->
    <view class="sec">
      <text class="sec-title">三才五格</text>

      <!-- 三才配置图（定位 view 圆环替代 V0 SVG） -->
      <view class="sc-fig">
        <view class="sc-ring sc-ring-outer" />
        <view class="sc-ring sc-ring-inner" />
        <view class="sc-center">
          <text class="sc-center-chars">{{ centerChars }}</text>
          <text class="sc-center-wx">{{ centerWx }}</text>
        </view>
        <view class="sc-label sc-label-tian">
          <text class="sc-label-name">天才</text>
          <text class="sc-label-wx">[{{ detail.sancaiWuge.sancai[0] }}]</text>
        </view>
        <view class="sc-label sc-label-di">
          <text class="sc-label-name">地才</text>
          <text class="sc-label-wx">[{{ detail.sancaiWuge.sancai[2] }}]</text>
        </view>
        <view class="sc-label sc-label-ren">
          <text class="sc-label-name">人才</text>
          <text class="sc-label-wx">[{{ detail.sancaiWuge.sancai[1] }}]</text>
        </view>
      </view>

      <view class="ge-grid">
        <view v-for="[label, g] in geList" :key="label" class="ge-cell">
          <text class="ge-cell-label">{{ label }}</text>
          <text class="ge-cell-value">{{ g.value }}</text>
          <text class="ge-cell-wx">{{ g.wuxing }}</text>
          <text class="ge-cell-luck" :style="{ color: luckColor(g.luck) }">{{ g.luck }}</text>
        </view>
      </view>
      <text class="sc-conf">三才配置：<text class="sc-conf-strong">{{ detail.sancaiWuge.sancai }}</text>（{{ detail.sancaiWuge.sancaiLuck }}）</text>
      <text class="sec-p">{{ detail.sancaiWuge.sancaiNote }}</text>
    </view>

    <!-- 三才配置运势 -->
    <view class="sec">
      <text class="sec-title">三才配置</text>
      <view class="para-list">
        <text v-for="(f, i) in detail.sancaiWuge.sancaiFortunes" :key="i" class="sec-p">
          <text class="p-strong">{{ f.label }}：</text>{{ f.text }}<text class="p-luck" :style="{ color: luckColor(f.luck) }">（{{ f.luck }}）</text>
        </text>
      </view>
    </view>

    <!-- 五格分析 -->
    <view class="sec">
      <text class="sec-title">五格分析</text>
      <view class="para-list">
        <text v-for="[label, g] in geListAlt" :key="label" class="sec-p">
          <text class="p-strong">{{ label }}：</text>{{ g.judgment }}<text class="p-luck" :style="{ color: luckColor(g.luck) }">（{{ g.luck }}）</text>
        </text>
      </view>
    </view>

    <!-- 数理卦象 -->
    <view class="sec">
      <text class="sec-title">数理卦象</text>
      <view class="para-list">
        <template v-for="[label, g] in geListAlt" :key="label">
          <text v-if="g.gua" class="sec-p">
            <text class="p-strong">{{ label }}：</text><text class="p-gua">{{ g.gua.name }}</text>，{{ g.gua.note }}<text class="p-luck" :style="{ color: luckColor(g.gua.luck) }">（{{ g.gua.luck }}）</text>
          </text>
        </template>
      </view>
    </view>

    <!-- 姓名卦象（本命卦） -->
    <view class="sec">
      <text class="sec-title">姓名卦象</text>
      <view class="mg-body">
        <view class="mg-main">
          <text class="mg-name">本命卦是：{{ detail.mingGua.name }}。</text>
          <text class="mg-poem-label">诗曰：</text>
          <text v-for="(line, i) in detail.mingGua.poem" :key="i" class="mg-poem-line">{{ line }}</text>
          <text class="sec-p mg-note">{{ detail.mingGua.note }}</text>
        </view>
        <view class="mg-gua">
          <view class="mg-lines">
            <template v-for="(yang, i) in guaLinesTopFirst" :key="i">
              <view v-if="yang" class="mg-yao mg-yao-yang" />
              <view v-else class="mg-yao-yin">
                <view class="mg-yao-half" />
                <view class="mg-yao-half" />
              </view>
            </template>
          </view>
          <text class="mg-gua-name">{{ detail.mingGua.name }}</text>
        </view>
      </view>
    </view>

    <!-- 生肖宜忌 -->
    <view class="sec">
      <view class="sx-hd">
        <text class="sec-title">生肖用字</text>
        <view
          class="sx-badge"
          :class="detail.shengxiao.luck === '宜' ? 'sx-badge-good' : detail.shengxiao.luck === '忌' ? 'sx-badge-bad' : 'sx-badge-flat'"
        >
          <text class="sx-badge-text">{{ detail.shengxiao.luck }}</text>
        </view>
      </view>
      <text class="sec-p">{{ detail.shengxiao.note }}</text>
    </view>

    <!-- 重名热度 -->
    <view class="sec">
      <view class="sec-hd">
        <app-icon name="book-open" :size="28" color="var(--brand)" />
        <text class="sec-title">重名热度</text>
      </view>
      <text class="sec-p">{{ detail.duplicateNote }}</text>
    </view>

    <!-- 合规提示 -->
    <view class="faq">
      <text class="faq-q">三才五格及姓名卦象有全都是吉的吗？</text>
      <text class="faq-a">{{ detail.complianceNote }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.nds { display: flex; flex-direction: column; gap: 24rpx; }

/* ── 区块卡 ── */
.sec {
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  padding: 24rpx;
}
.sec-amber { border-color: rgba(245, 158, 11, 0.4); }
.sec-hd { display: flex; align-items: center; gap: 12rpx; }
.sec-title {
  font-size: 28rpx; font-weight: 700; color: var(--text-ink);
}
.sec-title-amber { color: #92400e; }
.sec-p { display: block; margin-top: 12rpx; font-size: 24rpx; line-height: 1.75; color: var(--text-ink); }

.quote-line { margin-top: 12rpx; padding-top: 12rpx; }
.quote-line-amber { border-top: 1rpx dashed rgba(245, 158, 11, 0.3); }
.quote-text {
  font-family: Georgia, 'Songti SC', serif;
  font-size: 20rpx; color: var(--text-soft); line-height: 1.6;
}

/* ── 音律 ── */
.tone-line { display: block; margin-top: 12rpx; font-size: 24rpx; color: var(--text-soft); }
.tone-strong { color: var(--text-ink); font-weight: 500; }
.homophone { margin-top: 12rpx; border-radius: 12rpx; background: rgba(21, 128, 61, 0.06); padding: 12rpx 16rpx; }
.homophone-text { font-size: 22rpx; line-height: 1.7; color: #15803d; }

/* ── 字形音义 ── */
.ce-list { margin-top: 20rpx; display: flex; flex-direction: column; gap: 24rpx; }
.ce-item { border-top: 1rpx dashed var(--line); padding-top: 20rpx; }
.ce-item-first { border-top: none; padding-top: 0; }
.ce-hd { display: flex; align-items: center; gap: 16rpx; }
.ce-char-box {
  width: 64rpx; height: 64rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12rpx; background: var(--brand);
}
.ce-char { font-family: Georgia, 'Songti SC', serif; font-size: 36rpx; font-weight: 700; color: #fff; }
.ce-meta { font-size: 22rpx; color: var(--text-soft); }
.ce-meaning { margin-top: 12rpx; }
.ce-poems { margin-top: 12rpx; display: flex; flex-direction: column; gap: 8rpx; }
.ce-poem { font-family: Georgia, 'Songti SC', serif; font-size: 22rpx; line-height: 1.6; color: var(--text-soft); }

/* ── 三才配置图 ── */
.sc-fig { position: relative; margin: 20rpx auto 0; width: 440rpx; height: 300rpx; }
.sc-ring { position: absolute; border: 1rpx solid rgba(245, 158, 11, 0.4); border-radius: 50%; }
.sc-ring-outer { width: 272rpx; height: 272rpx; left: 84rpx; top: 14rpx; }
.sc-ring-inner { width: 184rpx; height: 184rpx; left: 128rpx; top: 58rpx; }
.sc-center {
  position: absolute; left: 84rpx; top: 14rpx; width: 272rpx; height: 272rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx;
}
.sc-center-chars { font-family: Georgia, 'Songti SC', serif; font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.sc-center-wx { font-size: 18rpx; color: var(--text-soft); }
.sc-label { position: absolute; display: flex; align-items: baseline; gap: 4rpx; }
.sc-label-tian { top: 0; left: 0; right: 0; justify-content: center; }
.sc-label-di { left: 0; bottom: 24rpx; }
.sc-label-ren { right: 0; bottom: 24rpx; }
.sc-label-name { font-size: 24rpx; font-weight: 700; color: var(--text-ink); }
.sc-label-wx { font-size: 18rpx; color: var(--text-soft); }

/* ── 五格表 ── */
.ge-grid { margin-top: 8rpx; display: flex; gap: 12rpx; }
.ge-cell {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2rpx;
  border: 1rpx solid var(--line); border-radius: 12rpx; padding: 12rpx 4rpx;
}
.ge-cell-label { font-size: 20rpx; color: var(--text-soft); }
.ge-cell-value { font-family: Georgia, 'Songti SC', serif; font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.ge-cell-wx { font-size: 20rpx; color: var(--text-soft); }
.ge-cell-luck { font-size: 20rpx; font-weight: 700; }
.sc-conf { display: block; margin-top: 16rpx; font-size: 24rpx; color: var(--text-soft); }
.sc-conf-strong { font-weight: 700; color: var(--text-ink); }

/* ── 断语段落 ── */
.para-list { margin-top: 12rpx; display: flex; flex-direction: column; gap: 16rpx; }
.para-list .sec-p { margin-top: 0; }
.p-strong { font-weight: 700; }
.p-luck { font-weight: 700; }
.p-gua { font-family: Georgia, 'Songti SC', serif; font-weight: 700; color: #92400e; }

/* ── 姓名卦象 ── */
.mg-body { margin-top: 16rpx; display: flex; align-items: flex-start; gap: 24rpx; }
.mg-main { min-width: 0; flex: 1; }
.mg-name { display: block; font-size: 24rpx; font-weight: 700; color: var(--text-ink); }
.mg-poem-label { display: block; margin-top: 8rpx; font-size: 22rpx; color: var(--text-soft); }
.mg-poem-line { display: block; font-family: Georgia, 'Songti SC', serif; font-size: 24rpx; line-height: 1.75; color: var(--text-ink); }
.mg-note { margin-top: 12rpx; }
.mg-gua { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.mg-lines { display: flex; flex-direction: column; gap: 8rpx; }
.mg-yao { width: 96rpx; height: 12rpx; border-radius: 4rpx; }
.mg-yao-yang { background: rgba(44, 36, 32, 0.8); }
.mg-yao-yin { width: 96rpx; display: flex; justify-content: space-between; }
.mg-yao-half { width: 40rpx; height: 12rpx; border-radius: 4rpx; background: rgba(44, 36, 32, 0.8); }
.mg-gua-name { font-family: Georgia, 'Songti SC', serif; font-size: 22rpx; font-weight: 700; color: #b45309; }

/* ── 生肖 ── */
.sx-hd { display: flex; align-items: center; justify-content: space-between; }
.sx-badge { border-radius: 999rpx; padding: 4rpx 16rpx; }
.sx-badge-good { background: rgba(21, 128, 61, 0.08); }
.sx-badge-good .sx-badge-text { color: #15803d; }
.sx-badge-bad { background: rgba(196, 30, 58, 0.1); }
.sx-badge-bad .sx-badge-text { color: var(--brand); }
.sx-badge-flat { background: rgba(0, 0, 0, 0.05); }
.sx-badge-flat .sx-badge-text { color: var(--text-soft); }
.sx-badge-text { font-size: 20rpx; font-weight: 700; }

/* ── 合规FAQ ── */
.faq {
  border: 1rpx solid rgba(245, 158, 11, 0.3);
  background: rgba(255, 251, 235, 0.5);
  border-radius: 16rpx; padding: 24rpx;
}
.faq-q { display: block; font-size: 24rpx; font-weight: 700; color: #92400e; }
.faq-a { display: block; margin-top: 8rpx; font-size: 22rpx; line-height: 1.7; color: var(--text-soft); }
</style>
