<script setup lang="ts">
/**
 * 品牌印章（视觉签名系统批0 · 全站唯一印章真源）。
 * - variant="zhu" 朱文：印泥红渐变底 + 白楷字 + 细内框（默认，用于确认/成就时刻）
 * - variant="bai" 白文：纸底红字红框（清淡，用于空态/水印类场景）
 * - 四字走田字格（右上→右下→左上→左下，循印章读序）；1~3 字竖排居中
 * - stamped 为 true 时播放盖章入场（seal-stamp-in，见 signature.scss，一次性 0.42s）
 * 🔴 纪律：印章=仪式与身份，禁当普通图标/按钮装饰满屏用。
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** 章面文字，最多取前 4 字 */
  chars?: string
  /** 边长，单位 rpx */
  size?: number
  /** 朱文 zhu（红底白字）| 白文 bai（纸底红字） */
  variant?: 'zhu' | 'bai'
  /** 盖章入场动效 */
  stamped?: boolean
}>(), {
  chars: '热卜',
  size: 120,
  variant: 'zhu',
  stamped: false,
})

const charList = computed(() => Array.from(props.chars).slice(0, 4))
const isFour = computed(() => charList.value.length === 4)

const rootStyle = computed(() => ({
  width: `${props.size}rpx`,
  height: `${props.size}rpx`,
  borderRadius: `${Math.round(props.size * 0.1)}rpx`,
}))

/* 字号随边长与字数缩放：田字格每格小一号，竖排/单字大一号 */
const charStyle = computed(() => {
  const ratio = isFour.value ? 0.32 : charList.value.length === 1 ? 0.52 : 0.36
  return { fontSize: `${Math.round(props.size * ratio)}rpx` }
})
</script>

<template>
  <view
    class="brand-seal"
    :class="[`brand-seal--${variant}`, { 'seal-stamp-in': stamped }]"
    :style="rootStyle"
  >
    <!-- 细内框（朱文白线 / 白文红线） -->
    <view class="brand-seal__frame" />
    <view class="brand-seal__grid" :class="{ 'brand-seal__grid--four': isFour }">
      <text
        v-for="(c, i) in charList"
        :key="i"
        class="brand-seal__char"
        :style="charStyle"
      >{{ c }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.brand-seal {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  /* 楷体优先，无楷体端回退宋体系（H5 安卓多无楷体，宋体亦有金石气，可接受） */
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', var(--font-serif, serif);
}

/* 朱文：印泥红渐变底 + 白字 */
.brand-seal--zhu {
  background: var(--seal-gradient);
  box-shadow: 0 4rpx 16rpx rgba(196, 30, 58, 0.28);
  .brand-seal__frame { border: 2rpx solid rgba(255, 255, 255, 0.55); }
  .brand-seal__char { color: #fff; }
}

/* 白文：纸底红字 */
.brand-seal--bai {
  background: var(--xuan-paper, #faf8f5);
  border: 3rpx solid rgba(196, 30, 58, 0.75);
  .brand-seal__frame { border: 2rpx solid rgba(196, 30, 58, 0.35); }
  .brand-seal__char { color: var(--gugong-red, #c41e3a); }
}

/* 细内框：距边 7% 的第二道线，印章的"格"感 */
.brand-seal__frame {
  position: absolute;
  inset: 7%;
  border-radius: inherit;
  pointer-events: none;
}

/* 1~3 字：竖排居中 */
.brand-seal__grid {
  position: relative;
  width: 86%;
  height: 86%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 四字田字格：column + wrap-reverse → 首列在右（右上→右下→左上→左下，循印章读序） */
.brand-seal__grid--four {
  flex-wrap: wrap-reverse;
  align-items: stretch;
  justify-content: center;
  .brand-seal__char {
    width: 50%;
    height: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.brand-seal__char {
  line-height: 1;
  font-weight: 600;
  text-align: center;
}
</style>
