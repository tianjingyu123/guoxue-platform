<template>
  <view class="bazi-card">
    <!-- 命主信息 -->
    <view class="owner-info" v-if="input">
      <text class="owner-name">{{ input.name || '命主' }}</text>
      <text class="owner-meta">{{ input.gender }} · 属{{ shengXiao }} · {{ lunarDate }}</text>
    </view>

    <!-- 四柱八字 -->
    <view class="sizhu-section">
      <view class="section-title">四柱八字</view>
      <view class="sizhu-grid">
        <view v-for="(zhu, key) in siZhu" :key="key" class="sizhu-col">
          <text class="pillar-label">{{ pillarLabels[key] }}</text>
          <text class="pillar-gan" :class="'wuxing-' + ganWuxing(zhu.gan)">{{ zhu.gan }}</text>
          <text class="pillar-zhi" :class="'wuxing-' + zhiWuxing(zhu.zhi)">{{ zhu.zhi }}</text>
          <text class="pillar-shishen">{{ zhu.ganShiShen }}</text>
          <view class="pillar-canggan" v-if="zhu.cangGan?.length">
            <text v-for="(cg, i) in zhu.cangGan" :key="i" class="canggan-item">
              {{ cg.gan }}{{ cg.shiShen }}
            </text>
          </view>
          <text class="pillar-nayin" v-if="zhu.nayin">{{ zhu.nayin }}</text>
        </view>
      </view>
      <view class="kongwang-tag" v-if="kongWang">
        <text>空亡: {{ kongWang }}</text>
      </view>
    </view>

    <!-- 起运信息 -->
    <view class="qiyun-section" v-if="qiYun">
      <view class="section-title">起运</view>
      <view class="qiyun-info">
        <view class="qiyun-row"><text class="qlabel">起运年</text><text class="qval">{{ qiYun.startYear }}年 ({{ qiYun.startAge }}岁)</text></view>
        <view class="qiyun-row"><text class="qlabel">交运</text><text class="qval">{{ qiYun.jiaoYunGan }}年{{ qiYun.jiaoYunMonth }}月{{ qiYun.jiaoYunDay }}日</text></view>
        <view class="qiyun-row"><text class="qlabel">说明</text><text class="qval">{{ qiYun.desc }}</text></view>
      </view>
      <!-- 大运简表 -->
      <view class="dayun-scroll" v-if="qiYun.daYun?.length">
        <scroll-view scroll-x class="dayun-list">
          <view v-for="(dy, i) in qiYun.daYun" :key="i" class="dayun-item">
            <text class="dayun-age">{{ dy.startAge }}-{{ dy.endAge }}岁</text>
            <text class="dayun-ganzhi">{{ dy.ganZhi }}</text>
            <text class="dayun-shishen">{{ dy.ganShiShen }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 格局 + 五行 -->
    <view class="geju-section" v-if="geJu || wuXingEnergy">
      <view class="section-title">格局·五行</view>
      <view class="geju-card" v-if="geJu">
        <view class="geju-header">
          <text class="geju-name">{{ geJu.name }}</text>
          <text class="geju-type" :class="geJu.type">{{ geJu.type === 'zheng' ? '正格' : '变格' }}</text>
        </view>
        <view class="geju-shen">
          <text class="geju-item">用神: {{ geJu.yongShen }}</text>
          <text class="geju-item">喜神: {{ geJu.xiShen }}</text>
          <text class="geju-item">忌神: {{ geJu.jiShen }}</text>
        </view>
        <text class="geju-desc">{{ geJu.desc }}</text>
      </view>
      <view class="wuxing-bars" v-if="wuXingEnergy">
        <view v-for="wx in wuxingList" :key="wx.key" class="wx-row">
          <text class="wx-label">{{ wx.label }}</text>
          <view class="wx-bar-bg"><view class="wx-bar-fill" :class="'wx-' + wx.key" :style="{ width: wuXingEnergy[wx.key] + '%' }" /></view>
          <text class="wx-val">{{ wuXingEnergy[wx.key] }}%</text>
        </view>
        <text class="wx-desc">{{ wuXingEnergy.desc }}</text>
      </view>
    </view>

    <!-- 神煞 -->
    <view class="shensha-section" v-if="shenSha?.length">
      <view class="section-title">神煞</view>
      <view class="shensha-grid">
        <view v-for="(s, i) in shenSha" :key="i" class="shensha-item" :class="s.type">
          <text class="shensha-name">{{ s.name }}</text>
          <text class="shensha-desc">{{ s.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 分析提示 -->
    <view class="fenxi-section" v-if="hasFenXi">
      <view class="section-title">分析提示</view>
      <view class="fenxi-tags">
        <template v-if="fenXiTiShi.ganHe?.length">
          <text class="fenxi-tag tag-he">天干合: {{ fenXiTiShi.ganHe.join('、') }}</text>
        </template>
        <template v-if="fenXiTiShi.liuHe?.length">
          <text class="fenxi-tag tag-he">地支六合: {{ fenXiTiShi.liuHe.join('、') }}</text>
        </template>
        <template v-if="fenXiTiShi.sanHe?.length">
          <text class="fenxi-tag tag-sanhe">三合: {{ fenXiTiShi.sanHe.join('、') }}</text>
        </template>
        <template v-if="fenXiTiShi.sanHui?.length">
          <text class="fenxi-tag tag-sanhe">三会: {{ fenXiTiShi.sanHui.join('、') }}</text>
        </template>
        <template v-if="fenXiTiShi.liuChong?.length">
          <text class="fenxi-tag tag-chong">六冲: {{ fenXiTiShi.liuChong.join('、') }}</text>
        </template>
        <template v-if="fenXiTiShi.liuHai?.length">
          <text class="fenxi-tag tag-hai">六害: {{ fenXiTiShi.liuHai.join('、') }}</text>
        </template>
        <template v-if="fenXiTiShi.sanXing?.length">
          <text class="fenxi-tag tag-xing">三刑: {{ fenXiTiShi.sanXing.join('、') }}</text>
        </template>
        <template v-if="fenXiTiShi.ziXing?.length">
          <text class="fenxi-tag tag-xing">自刑: {{ fenXiTiShi.ziXing.join('、') }}</text>
        </template>
        <template v-if="fenXiTiShi.anHe?.length">
          <text class="fenxi-tag tag-anhe">暗合: {{ fenXiTiShi.anHe.join('、') }}</text>
        </template>
        <template v-if="fenXiTiShi.xiangPo?.length">
          <text class="fenxi-tag tag-hai">相破: {{ fenXiTiShi.xiangPo.join('、') }}</text>
        </template>
        <template v-if="fenXiTiShi.anJue?.length">
          <text class="fenxi-tag tag-anhe">暗绝: {{ fenXiTiShi.anJue.join('、') }}</text>
        </template>
      </view>
    </view>

    <!-- 参考宫位 -->
    <view class="ref-pillars" v-if="taiYuan || mingGong || shenGong">
      <view class="section-title">参考</view>
      <view class="ref-row">
        <view class="ref-item" v-if="taiYuan">
          <text class="ref-label">胎元</text>
          <text class="ref-val">{{ taiYuan.gan }}{{ taiYuan.zhi }}</text>
          <text class="ref-nayin">{{ taiYuan.nayin }}</text>
        </view>
        <view class="ref-item" v-if="mingGong">
          <text class="ref-label">命宫</text>
          <text class="ref-val">{{ mingGong.gan }}{{ mingGong.zhi }}</text>
          <text class="ref-nayin">{{ mingGong.nayin }}</text>
        </view>
        <view class="ref-item" v-if="shenGong">
          <text class="ref-label">身宫</text>
          <text class="ref-val">{{ shenGong.gan }}{{ shenGong.zhi }}</text>
          <text class="ref-nayin">{{ shenGong.nayin }}</text>
        </view>
      </view>
    </view>

    <!-- 时间校正 -->
    <view class="time-correction" v-if="taiYangShi || daylightSaving">
      <view class="section-title">时间校正</view>
      <text v-if="taiYangShi" class="correction-text">真太阳时: {{ taiYangShi.desc }}</text>
      <text v-if="daylightSaving" class="correction-text">夏令时: {{ daylightSaving.desc }}</text>
    </view>

    <!-- 自坐 -->
    <view class="zizuo-section" v-if="ziZuo">
      <view class="section-title">自坐</view>
      <text class="zizuo-text">{{ ziZuo.riGan }}坐{{ ziZuo.riZhi }} — {{ ziZuo.shiShen }} · {{ ziZuo.desc }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  data: Record<string, any>
}

const props = defineProps<Props>()

const input = computed(() => props.data?.input)
const siZhu = computed(() => props.data?.siZhu || {})
const qiYun = computed(() => props.data?.qiYun)
const kongWang = computed(() => props.data?.kongWang)
const shengXiao = computed(() => props.data?.shengXiao)
const lunarDate = computed(() => props.data?.lunarDate)
const taiYuan = computed(() => props.data?.taiYuan)
const mingGong = computed(() => props.data?.mingGong)
const shenGong = computed(() => props.data?.shenGong)
const wangXiang = computed(() => props.data?.wangXiang)
const fenXiTiShi = computed(() => props.data?.fenXiTiShi || {})
const shenSha = computed(() => props.data?.shenSha || [])
const geJu = computed(() => props.data?.geJu)
const wuXingEnergy = computed(() => props.data?.wuXingEnergy)
const taiYangShi = computed(() => props.data?.taiYangShi)
const daylightSaving = computed(() => props.data?.daylightSaving)
const ziZuo = computed(() => props.data?.ziZuo)

const hasFenXi = computed(() => {
  const f = fenXiTiShi.value
  return f && Object.values(f).some((arr: any) => arr?.length)
})

const pillarLabels: Record<string, string> = { nian: '年柱', yue: '月柱', ri: '日柱', shi: '时柱' }

const wuxingList = [
  { key: 'mu', label: '木' },
  { key: 'huo', label: '火' },
  { key: 'tu', label: '土' },
  { key: 'jin', label: '金' },
  { key: 'shui', label: '水' },
]

function ganWuxing(gan: string): string {
  const m: Record<string, string> = { 甲: 'mu', 乙: 'mu', 丙: 'huo', 丁: 'huo', 戊: 'tu', 己: 'tu', 庚: 'jin', 辛: 'jin', 壬: 'shui', 癸: 'shui' }
  return m[gan] || ''
}

function zhiWuxing(zhi: string): string {
  const m: Record<string, string> = { 子: 'shui', 丑: 'tu', 寅: 'mu', 卯: 'mu', 辰: 'tu', 巳: 'huo', 午: 'huo', 未: 'tu', 申: 'jin', 酉: 'jin', 戌: 'tu', 亥: 'shui' }
  return m[zhi] || ''
}
</script>

<style scoped>
.bazi-card { padding: 16rpx 0; }

.owner-info { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; background: linear-gradient(135deg, #5a3a1a, #8b6914); border-radius: 16rpx; margin-bottom: 24rpx; }
.owner-name { font-size: 36rpx; font-weight: bold; color: #fff; }
.owner-meta { font-size: 24rpx; color: rgba(255,255,255,0.8); }

.section-title { font-size: 28rpx; font-weight: 600; color: #3C2415; margin-bottom: 16rpx; padding-left: 8rpx; border-left: 4rpx solid #8b6914; }

/* 四柱 */
.sizhu-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.sizhu-grid { display: flex; }
.sizhu-col { flex: 1; text-align: center; border-right: 1rpx solid #f0ebe0; }
.sizhu-col:last-child { border-right: none; }
.pillar-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.pillar-gan { font-size: 44rpx; font-weight: bold; display: block; line-height: 1.4; font-family: 'Noto Serif SC', serif; }
.pillar-zhi { font-size: 44rpx; font-weight: bold; display: block; line-height: 1.4; font-family: 'Noto Serif SC', serif; }
.pillar-shishen { font-size: 22rpx; color: #8b6914; display: block; margin-top: 4rpx; }
.pillar-canggan { display: flex; flex-direction: column; gap: 2rpx; margin-top: 6rpx; }
.canggan-item { font-size: 18rpx; color: #8b6914; }
.pillar-nayin { font-size: 18rpx; color: #999; display: block; margin-top: 4rpx; }

.wuxing-mu { color: #4CAF50; }
.wuxing-huo { color: #F44336; }
.wuxing-tu { color: #FF9800; }
.wuxing-jin { color: #FFC107; }
.wuxing-shui { color: #2196F3; }

.kongwang-tag { text-align: center; margin-top: 16rpx; }
.kongwang-tag text { font-size: 22rpx; color: #C9A96E; background: #FEF3C7; padding: 6rpx 20rpx; border-radius: 16rpx; }

/* 起运 */
.qiyun-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.qiyun-info { margin-bottom: 16rpx; }
.qiyun-row { display: flex; gap: 16rpx; margin-bottom: 8rpx; }
.qlabel { font-size: 24rpx; color: #999; width: 80rpx; flex-shrink: 0; }
.qval { font-size: 24rpx; color: #3C2415; }
.dayun-scroll { margin-top: 8rpx; }
.dayun-list { display: flex; gap: 12rpx; white-space: nowrap; padding-bottom: 8rpx; }
.dayun-item { flex-shrink: 0; text-align: center; padding: 12rpx 20rpx; background: #F5F0E8; border-radius: 12rpx; min-width: 100rpx; }
.dayun-age { font-size: 18rpx; color: #999; display: block; }
.dayun-ganzhi { font-size: 28rpx; font-weight: bold; color: #3C2415; display: block; font-family: 'Noto Serif SC', serif; }
.dayun-shishen { font-size: 20rpx; color: #8b6914; display: block; }

/* 格局 */
.geju-section { margin-bottom: 16rpx; }
.geju-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.geju-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.geju-name { font-size: 32rpx; font-weight: bold; color: #3C2415; }
.geju-type { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.geju-type.zheng { background: #E8F5E9; color: #2E7D32; }
.geju-type.bian { background: #FFF3E0; color: #E65100; }
.geju-shen { display: flex; gap: 16rpx; margin-bottom: 8rpx; }
.geju-item { font-size: 22rpx; color: #8b6914; }
.geju-desc { font-size: 24rpx; color: #666; line-height: 1.6; display: block; margin-top: 8rpx; }

/* 五行 */
.wuxing-bars { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.wx-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.wx-label { font-size: 24rpx; color: #3C2415; width: 40rpx; }
.wx-bar-bg { flex: 1; height: 16rpx; background: #f0ebe0; border-radius: 8rpx; overflow: hidden; }
.wx-bar-fill { height: 100%; border-radius: 8rpx; }
.wx-bar-fill.wx-mu { background: #4CAF50; }
.wx-bar-fill.wx-huo { background: #F44336; }
.wx-bar-fill.wx-tu { background: #FF9800; }
.wx-bar-fill.wx-jin { background: #FFC107; }
.wx-bar-fill.wx-shui { background: #2196F3; }
.wx-val { font-size: 20rpx; color: #999; width: 60rpx; text-align: right; }
.wx-desc { font-size: 22rpx; color: #999; text-align: center; margin-top: 8rpx; display: block; }

/* 神煞 */
.shensha-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.shensha-grid { display: flex; flex-wrap: wrap; gap: 10rpx; }
.shensha-item { padding: 10rpx 18rpx; border-radius: 12rpx; }
.shensha-item.ji { background: #E8F5E9; }
.shensha-item.xiong { background: #FFF3E0; }
.shensha-name { font-size: 22rpx; font-weight: 600; display: block; }
.shensha-item.ji .shensha-name { color: #2E7D32; }
.shensha-item.xiong .shensha-name { color: #E65100; }
.shensha-desc { font-size: 18rpx; color: #999; display: block; }

/* 分析提示 */
.fenxi-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.fenxi-tags { display: flex; flex-wrap: wrap; gap: 10rpx; }
.fenxi-tag { font-size: 22rpx; padding: 8rpx 16rpx; border-radius: 12rpx; line-height: 1.5; }
.tag-he { background: #E3F2FD; color: #1565C0; }
.tag-sanhe { background: #E8F5E9; color: #2E7D32; }
.tag-chong { background: #FFF3E0; color: #E65100; }
.tag-hai { background: #FCE4EC; color: #C62828; }
.tag-xing { background: #F3E5F5; color: #6A1B9A; }
.tag-anhe { background: #E0F7FA; color: #00695C; }

/* 参考 */
.ref-pillars { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.ref-row { display: flex; gap: 16rpx; }
.ref-item { flex: 1; text-align: center; }
.ref-label { font-size: 20rpx; color: #999; display: block; }
.ref-val { font-size: 32rpx; font-weight: bold; color: #3C2415; font-family: 'Noto Serif SC', serif; display: block; margin: 4rpx 0; }
.ref-nayin { font-size: 20rpx; color: #8b6914; display: block; }

.time-correction { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.correction-text { font-size: 24rpx; color: #666; display: block; margin-bottom: 4rpx; }

.zizuo-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.zizuo-text { font-size: 24rpx; color: #666; }
</style>
