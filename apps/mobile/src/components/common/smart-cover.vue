<script setup lang="ts">
/**
 * 智能封面：有真实图(src)则显示图，无图则按内容类型自动生成雅致封面
 * （国学风格渐变底 + 书法标题 + 分类印章），撑满父容器。
 * 用于内容封面普遍缺图时的优雅兜底，无需任何图片资源。
 */
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

interface Props {
  src?: string | null
  title?: string
  /** poetry诗词 / classic古籍 / course课程 / ebook电子书 / circle圈子 / live直播 / product商品 / default */
  type?: string
  /** 短视频专用：无封面图时用视频首帧兜底（发布未传封面 → 取视频第一帧作封面） */
  videoUrl?: string | null
  /** 生成兜底时是否在角落显示类型印章。默认关：中心图标+标题已表意，且避免与卡片自身角标(日期/LIVE/状态)重叠 */
  showSeal?: boolean
}
const props = withDefaults(defineProps<Props>(), { src: '', title: '', type: 'default', videoUrl: '', showSeal: false })

// 各类型的配色系 + 图标 + 印章标（雅致低饱和国学色）
const THEMES: Record<string, { grad: string; icon: string; label: string }> = {
  poetry:  { grad: 'linear-gradient(135deg, #3a6b57, #1f3d31)', icon: 'book-heart',     label: '诗词' },
  classic: { grad: 'linear-gradient(135deg, #8a5c3b, #573620)', icon: 'book-open',      label: '古籍' },
  course:  { grad: 'linear-gradient(135deg, #3e6390, #22405f)', icon: 'graduation-cap', label: '课程' },
  ebook:   { grad: 'linear-gradient(135deg, #556b3d, #313f21)', icon: 'book',           label: '书' },
  circle:  { grad: 'linear-gradient(135deg, #6d4f80, #3d2a54)', icon: 'users',          label: '圈' },
  live:    { grad: 'linear-gradient(135deg, #9c4150, #5c2230)', icon: 'radio',          label: '直播' },
  product: { grad: 'linear-gradient(135deg, #b0592f, #75371a)', icon: 'shopping-bag',   label: '' },
  default: { grad: 'linear-gradient(135deg, #5a5750, #34322d)', icon: 'image',          label: '' },
}
const theme = computed(() => THEMES[props.type] || THEMES.default)
const hasImg = computed(() => typeof props.src === 'string' && props.src.trim() !== '')
// 图片加载失败(URL失效/404)时翻到生成封面，避免留空框/破图标；src 变化(列表复用/换页)时重置重试
const imgError = ref(false)
watch(() => props.src, () => { imgError.value = false })
// 无封面图但有视频源 → 用视频首帧兜底（#t=0.5 让 H5 定位到第 0.5s 首帧，避免纯黑帧）
const hasVideoFrame = computed(() => !hasImg.value && typeof props.videoUrl === 'string' && props.videoUrl.trim() !== '')
const videoFrameSrc = computed(() => (props.videoUrl || '') + '#t=0.5')
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
  <view v-else class="sc-full sc-gen" :style="{ background: theme.grad }">
    <!-- 国学底纹：柔和光晕 + 角落纹样 -->
    <view class="sc-pattern" />
    <view class="sc-frame" />
    <AppIcon :name="theme.icon" :size="38" color="rgba(255,255,255,0.82)" />
    <text v-if="title" class="sc-title">{{ title }}</text>
    <text v-if="showSeal && theme.label" class="sc-seal">{{ theme.label }}</text>
  </view>
</template>

<style scoped>
.sc-full { width: 100%; height: 100%; display: block; }
.sc-gen {
  position: relative;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 14rpx;
  padding: 28rpx; overflow: hidden; box-sizing: border-box;
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
  position: absolute; inset: 16rpx; pointer-events: none;
  border: 2rpx solid rgba(255,255,255,0.18); border-radius: 8rpx;
}
.sc-title {
  position: relative; z-index: 1;
  font-size: 30rpx; font-weight: 600; color: #fff;
  text-align: center; line-height: 1.45; letter-spacing: 2rpx;
  font-family: 'STKaiti', 'KaiTi', 'STSong', serif;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
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
