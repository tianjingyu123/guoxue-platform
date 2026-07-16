<script setup lang="ts">
/**
 * 智能封面：有真实图(src)则显示图，无图则按内容类型自动生成雅致封面
 * （国学风格渐变底 + 书法标题 + 分类印章），撑满父容器。
 * 用于内容封面普遍缺图时的优雅兜底，无需任何图片资源。
 *
 * 2026-07-15 v2（董事长走查反馈"满屏同色蓝块没设计感"）：
 * - 每类 4~5 个雅致色系按标题哈希轮换，同类内容不再千篇一律
 * - deco 模式 / 无标题：改为大号书法字水印（标题首二字或类型字），
 *   卡片下方已有标题的消费方传 deco 免封面内外标题重复；小尺寸缩略图不再是空色块
 * - 修复小容器内"图标+三行标题"上下溢出裁半个字：图标不再参与压缩、标题降为两行
 */
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

interface Props {
  src?: string | null
  title?: string
  /** poetry诗词 / classic古籍 / course课程 / ebook电子书 / circle圈子 / live直播 / product商品 / paipan工具 / default */
  type?: string
  /** 短视频专用：无封面图时用视频首帧兜底（发布未传封面 → 取视频第一帧作封面） */
  videoUrl?: string | null
  /** 生成兜底时是否在角落显示类型印章。默认关：避免与卡片自身角标(日期/LIVE/状态)重叠 */
  showSeal?: boolean
  /** 装饰模式：卡片下方已有标题时传 true——封面只出大字水印，不再重复完整标题 */
  deco?: boolean
  /** 水印字号(rpx)：小缩略图传小值(如 40)防溢出，hero 大图传大值(如 96)，默认 56 */
  decoSize?: number
}
const props = withDefaults(defineProps<Props>(), { src: '', title: '', type: 'default', videoUrl: '', showSeal: false, deco: false, decoSize: 56 })

// 各类型的配色系（多套按标题哈希轮换）+ 图标 + 印章标（雅致低饱和国学色）
const THEMES: Record<string, { grads: string[]; icon: string; label: string }> = {
  poetry: {
    grads: [
      'linear-gradient(135deg, #3a6b57, #1f3d31)',
      'linear-gradient(135deg, #4f7a6a, #2a4a3c)',
      'linear-gradient(135deg, #5b7a8c, #33495a)',
      'linear-gradient(135deg, #6d5a80, #3d3054)',
    ],
    icon: 'book-heart', label: '诗',
  },
  classic: {
    grads: [
      'linear-gradient(135deg, #8a5c3b, #573620)',
      'linear-gradient(135deg, #75503a, #452b1c)',
      'linear-gradient(135deg, #6e5a44, #3f3122)',
      'linear-gradient(135deg, #8a6d3b, #54401e)',
    ],
    icon: 'book-open', label: '古',
  },
  course: {
    grads: [
      'linear-gradient(135deg, #3e6390, #22405f)',
      'linear-gradient(135deg, #7a4b3a, #4a2b1f)',
      'linear-gradient(135deg, #3a6b57, #1f3d31)',
      'linear-gradient(135deg, #5b5a8f, #37365e)',
      'linear-gradient(135deg, #8a6d3b, #54401e)',
    ],
    icon: 'graduation-cap', label: '课',
  },
  ebook: {
    grads: [
      'linear-gradient(135deg, #556b3d, #313f21)',
      'linear-gradient(135deg, #4a6b5e, #294038)',
      'linear-gradient(135deg, #6b5f3d, #403820)',
    ],
    icon: 'book', label: '书',
  },
  circle: {
    grads: [
      'linear-gradient(135deg, #6d4f80, #3d2a54)',
      'linear-gradient(135deg, #59527e, #322d4e)',
      'linear-gradient(135deg, #7a4b5e, #4a2938)',
      'linear-gradient(135deg, #4f6b7a, #2b3f4a)',
    ],
    icon: 'users', label: '圈',
  },
  live: {
    grads: [
      'linear-gradient(135deg, #9c4150, #5c2230)',
      'linear-gradient(135deg, #8a4a3b, #52281f)',
      'linear-gradient(135deg, #7c3d5e, #471f38)',
    ],
    icon: 'radio', label: '播',
  },
  product: {
    grads: [
      'linear-gradient(135deg, #b0592f, #75371a)',
      'linear-gradient(135deg, #9c6a3a, #5e3c1d)',
      'linear-gradient(135deg, #8a5c3b, #573620)',
    ],
    icon: 'shopping-bag', label: '物',
  },
  video: {
    grads: [
      'linear-gradient(160deg, #3d4a5c, #232c38)',
      'linear-gradient(160deg, #4a3d5c, #2a2338)',
      'linear-gradient(160deg, #3d5c50, #22362e)',
      'linear-gradient(160deg, #5c463d, #362822)',
    ],
    icon: 'play', label: '视',
  },
  paipan: {
    grads: [
      'linear-gradient(135deg, #7c2d3e, #451722)',
      'linear-gradient(135deg, #4a3b63, #2a2140)',
    ],
    icon: 'compass', label: '占',
  },
  default: {
    grads: [
      'linear-gradient(135deg, #5a5750, #34322d)',
      'linear-gradient(135deg, #4a5568, #2d3748)',
      'linear-gradient(135deg, #6b5b73, #413546)',
    ],
    icon: 'landmark', label: '雅',
  },
}
const theme = computed(() => THEMES[props.type] || THEMES.default)
/** 标题哈希 → 同类多色系轮换（无标题恒取第一套，保持稳定） */
const grad = computed(() => {
  const g = theme.value.grads
  const t = props.title || ''
  if (!t) return g[0]
  let h = 0
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0
  return g[h % g.length]
})
const hasImg = computed(() => typeof props.src === 'string' && props.src.trim() !== '')
// 图片加载失败(URL失效/404)时翻到生成封面，避免留空框/破图标；src 变化(列表复用/换页)时重置重试
const imgError = ref(false)
watch(() => props.src, () => { imgError.value = false })
// 无封面图但有视频源 → 用视频首帧兜底（#t=0.5 让 H5 定位到第 0.5s 首帧，避免纯黑帧）
const hasVideoFrame = computed(() => !hasImg.value && typeof props.videoUrl === 'string' && props.videoUrl.trim() !== '')
const videoFrameSrc = computed(() => (props.videoUrl || '') + '#t=0.5')
/** 大字水印模式：deco 或无标题（小缩略图/卡下已有标题） */
const decoMode = computed(() => props.deco || !props.title)
/** 水印字：标题首二字（去书名号等标点）→ 类型字 → 雅 */
const decoChars = computed(() => {
  const clean = (props.title || '').replace(/[《》〈〉「」『』【】\s·、，。：;；!！?？~—-]/g, '')
  return clean.slice(0, 2) || theme.value.label || '雅'
})
</script>

<template>
  <image v-if="hasImg && !imgError" class="sc-full" :src="src as string" mode="aspectFill" @error="imgError = true" />
  <!-- 首帧兜底：无封面图但有视频源，取视频第一帧（静音·不自动播·不显控件） -->
  <video
    v-else-if="hasVideoFrame"
    class="sc-full"
    :src="videoFrameSrc"
    :controls="false"
    :show-center-play-btn="false"
    :show-play-btn="false"
    :show-fullscreen-btn="false"
    :enable-progress-gesture="false"
    :muted="true"
    :initial-time="0.5"
    object-fit="cover"
  />
  <view v-else class="sc-full sc-gen" :style="{ background: grad }">
    <!-- 国学底纹：柔和光晕 + 内描边 -->
    <view class="sc-pattern" />
    <view class="sc-frame" />
    <!-- 大字水印模式：书法二字，任何尺寸都成立（小缩略图不再空块，卡下有标题不再重复） -->
    <text v-if="decoMode" class="sc-deco serif" :style="{ fontSize: decoSize + 'rpx' }">{{ decoChars }}</text>
    <!-- 完整标题模式：图标 + 两行书法标题（图标不参与压缩，防小容器裁半字） -->
    <template v-else>
      <view class="sc-icon"><AppIcon :name="theme.icon" :size="34" color="rgba(255,255,255,0.82)" /></view>
      <text class="sc-title">{{ title }}</text>
    </template>
    <text v-if="showSeal && theme.label" class="sc-seal">{{ theme.label }}</text>
  </view>
</template>

<style scoped>
.sc-full { width: 100%; height: 100%; display: block; }
.sc-gen {
  position: relative;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12rpx;
  padding: 20rpx; overflow: hidden; box-sizing: border-box;
  min-height: 0;
}
/* 柔和光晕底纹 */
.sc-pattern {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    radial-gradient(circle at 22% 18%, rgba(255,255,255,0.10) 0%, transparent 42%),
    radial-gradient(circle at 82% 86%, rgba(255,255,255,0.07) 0%, transparent 42%);
}
/* 内描边(卷轴/册页感) */
.sc-frame {
  position: absolute; inset: 12rpx; pointer-events: none;
  border: 2rpx solid rgba(255,255,255,0.18); border-radius: 8rpx;
}
.serif { font-family: 'STKaiti', 'KaiTi', 'STSong', serif; }
/* 大字水印 */
.sc-deco {
  position: relative; z-index: 1;
  font-weight: 700; letter-spacing: 6rpx;
  color: rgba(255, 255, 255, 0.88);
  font-family: 'STKaiti', 'KaiTi', 'STSong', serif;
  text-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.28);
  white-space: nowrap;
}
.sc-icon { flex-shrink: 0; position: relative; z-index: 1; }
.sc-title {
  position: relative; z-index: 1; min-height: 0;
  font-size: 28rpx; font-weight: 600; color: #fff;
  text-align: center; line-height: 1.45; letter-spacing: 2rpx;
  font-family: 'STKaiti', 'KaiTi', 'STSong', serif;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.25);
}
/* 印章式分类标 */
.sc-seal {
  position: absolute; top: 20rpx; right: 20rpx; z-index: 1;
  min-width: 34rpx; padding: 6rpx 8rpx;
  border: 2rpx solid rgba(255,255,255,0.55); border-radius: 6rpx;
  font-size: 20rpx; line-height: 1.1; color: rgba(255,255,255,0.9);
  text-align: center; letter-spacing: 1rpx;
}
</style>
