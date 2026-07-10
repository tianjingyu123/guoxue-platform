<script setup lang="ts">
import { computed } from 'vue'
import { COVER_PALETTE, type CoverColor } from '@/lib/classics-cover'

const props = withDefaults(defineProps<{
  title: string
  /** 朝代/作者等顶部小标签 */
  label?: string
  /** 底部副信息（作者） */
  footer?: string
  coverColor?: CoverColor
  /** 标题字号基准，竖排时按书名长度自适应缩放 */
  titleSize?: string
}>(), {
  coverColor: 'cream',
  titleSize: '36rpx',
})

const c = computed(() => COVER_PALETTE[props.coverColor])
const isLight = computed(() => props.coverColor === 'cream')
const cleanTitle = computed(() => (props.title || '').replace(/[《》]/g, ''))

// 超长书名截断，保证一列竖排始终落在封面内
const displayTitle = computed(() =>
  cleanTitle.value.length > 8 ? cleanTitle.value.slice(0, 7) + '…' : cleanTitle.value,
)
// 逐字拆分：用 flex column 逐字竖排替代 writing-mode
// （安卓微信 X5/老内核对 writing-mode 支持差；且 writing-mode 在小封面里会折成
//  多列、列序从右往左，书名视觉上变成"横排倒序"——错行混乱的根因）
const titleChars = computed(() => Array.from(displayTitle.value))

// 竖排题签：书名越长字号越小，保证单列竖排不溢出封面
// 题签统一为浅色纸签，题字固定用深墨色（仿真古籍贴签墨书）
const titleStyle = computed(() => {
  const base = parseFloat(props.titleSize) || 36
  const len = titleChars.value.length
  const scale = len <= 2 ? 1 : len <= 3 ? 0.88 : len <= 4 ? 0.76 : len <= 6 ? 0.62 : 0.5
  return { fontSize: `${Math.round(base * scale)}rpx` }
})

const labelStyle = computed(() => ({
  color: c.value.title,
  background: isLight.value ? 'rgba(90,67,38,0.10)' : 'rgba(255,255,255,0.16)',
}))
</script>

<template>
  <view
    class="flat-cover"
    :class="{ 'fc-light': isLight }"
    :style="{ background: `linear-gradient(155deg, ${c.from}, ${c.to})` }"
  >
    <!-- 3:4 比例撑高（padding-top 百分比方案，替代 aspect-ratio：老内核不支持 aspect-ratio 会塌陷变形） -->
    <view class="fc-ratio" />

    <!-- 绢面织物纹理 + 边缘光影（纯 CSS 渐变模拟，X5 兼容） -->
    <view class="fc-texture" />

    <!-- 左侧订口：深色书脊压边 + 订线 + 线装孔（线装书暗示） -->
    <view class="fc-spine">
      <view class="fc-thread" />
      <view class="fc-stitches">
        <view v-for="i in 4" :key="i" class="fc-stitch" />
      </view>
    </view>

    <view class="fc-body">
      <!-- 顶部小标签（朝代） -->
      <view v-if="label" class="fc-top">
        <text class="fc-label" :style="labelStyle">{{ label }}</text>
      </view>

      <!-- 右上竖排题签（古籍封面灵魂）：浅色纸签 + 双线框，逐字单列，永不折列 -->
      <view class="fc-plate-wrap">
        <view class="fc-plate">
          <view class="fc-plate-inner">
            <text
              v-for="(ch, i) in titleChars"
              :key="i"
              class="fc-char"
              :style="titleStyle"
            >{{ ch }}</text>
          </view>
        </view>
      </view>

      <!-- 底部作者 + 细装饰线 -->
      <view v-if="footer" class="fc-footer-wrap">
        <view class="fc-accent" :style="{ backgroundColor: c.accent }" />
        <text class="fc-footer" :style="{ color: c.sub }">{{ footer }}</text>
      </view>
    </view>

    <!-- 右下朱印点缀 -->
    <view class="fc-seal" />
  </view>
</template>

<style scoped lang="scss">
.flat-cover {
  position: relative;
  border-radius: 10rpx;
  overflow: hidden;
  /* 双层暖调投影：贴近实体书的浮起感 */
  box-shadow:
    0 6rpx 18rpx rgba(62, 40, 18, 0.20),
    0 2rpx 4rpx rgba(62, 40, 18, 0.14);
  box-sizing: border-box;
}
/* 3:4 竖版书封比例（相对宽度撑高，全内核兼容） */
.fc-ratio {
  padding-top: 133.34%;
}

/* ===== 绢面纹理层：细横织纹 + 左上柔光 + 四边内阴影包边（函套压边感） ===== */
.fc-texture {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 30% 16%, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0) 55%),
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.035) 0,
      rgba(255, 255, 255, 0.035) 3rpx,
      rgba(0, 0, 0, 0.035) 3rpx,
      rgba(0, 0, 0, 0.035) 6rpx
    );
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.16),
    inset 0 -4rpx 8rpx rgba(0, 0, 0, 0.18),
    inset -3rpx 0 6rpx rgba(0, 0, 0, 0.10);
  pointer-events: none;
}

/* ===== 左侧订口（书脊）：深色渐变压边 + 素色订线 + 4 个线装孔 ===== */
.fc-spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 15%;
  background: linear-gradient(
    90deg,
    rgba(28, 14, 4, 0.32),
    rgba(28, 14, 4, 0.14) 55%,
    rgba(28, 14, 4, 0) 100%
  );
  pointer-events: none;
}
.fc-thread {
  position: absolute;
  left: 58%;
  top: 0;
  bottom: 0;
  width: 2rpx;
  background: rgba(243, 232, 205, 0.42);
}
.fc-stitches {
  position: absolute;
  left: 58%;
  top: 9%;
  bottom: 9%;
  width: 2rpx; /* 与订线同轴，孔点自身居中溢出 */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}
.fc-stitch {
  width: 7rpx;
  height: 7rpx;
  margin-left: -2rpx;
  border-radius: 50%;
  background: #efe4c8;
  box-shadow: 0 0 2rpx rgba(0, 0, 0, 0.45);
  flex-shrink: 0;
}
/* 浅色（宣纸米色）封面：订线/孔改深棕，保证对比 */
.fc-light .fc-thread {
  background: rgba(122, 90, 48, 0.35);
}
.fc-light .fc-stitch {
  background: #8a6a42;
  box-shadow: none;
  opacity: 0.75;
}

.fc-body {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  padding: 12rpx 12rpx 12rpx 18%;
  box-sizing: border-box;
}
.fc-top {
  flex-shrink: 0;
}
.fc-label {
  display: inline-block;
  font-size: 18rpx;
  font-weight: 500;
  letter-spacing: 1rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
.fc-plate-wrap {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  min-height: 0;
  padding: 4rpx 4rpx 0 0;
}
/* 题签纸签：浅色仿宣纸底 + 深棕双线框 + 微投影，贴在封面右上（仿线装书贴签） */
.fc-plate {
  display: flex;
  max-height: 100%;
  padding: 4rpx;
  background: linear-gradient(180deg, #fbf7ec, #f0e7cf);
  border: 1rpx solid rgba(122, 90, 48, 0.5);
  border-radius: 4rpx;
  box-shadow: 0 2rpx 6rpx rgba(40, 25, 10, 0.25);
  overflow: hidden;
  box-sizing: border-box;
}
.fc-plate-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-height: 100%;
  padding: 8rpx 6rpx;
  border: 1rpx solid rgba(122, 90, 48, 0.28);
  border-radius: 2rpx;
  overflow: hidden;
  box-sizing: border-box;
}
.fc-char {
  font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  color: #3b2a17; /* 墨书题字：固定深墨色（纸签恒为浅色） */
  flex-shrink: 0;
}
.fc-footer-wrap {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.fc-accent {
  width: 24rpx;
  height: 2rpx;
  margin-bottom: 6rpx;
}
.fc-footer {
  font-size: 20rpx;
  max-width: 100%;
  padding-right: 26rpx; /* 让出右下朱印位 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
}
/* 右下朱印：一方小小的朱红印章点缀 */
.fc-seal {
  position: absolute;
  right: 12rpx;
  bottom: 12rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 3rpx;
  background: #b23a2a;
  opacity: 0.85;
  pointer-events: none;
}
</style>
