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
import { computed, ref, watch, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { cdnImage } from '@/utils/image'

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
  /** 纯底纹模式：只出国学渐变底纹，不出任何文字(水印/标题)。
   *  用于卡片自身已有居中播放按钮 + 卡底标题时，避免生成封面文字撞按钮/重复标题 */
  plain?: boolean
}
const props = withDefaults(defineProps<Props>(), { src: '', title: '', type: 'default', videoUrl: '', showSeal: false, deco: false, decoSize: 56, plain: false })

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
// 视频首帧也可能因源失效/CORS/格式不支持而失败；失败后继续落到生成封面，兜底链不中断
const videoError = ref(false)
// 视频数据尚未解码时不能直接暴露原生 video 的黑底；首帧真正可绘制前继续展示生成封面。
const videoFrameReady = ref(false)
// 图片加载完成渐显（消除硬闪）：初始 false → @load 置 true 触发 content-fade-in
const imgLoaded = ref(false)
watch(
  () => [props.src, props.videoUrl],
  () => {
    imgError.value = false
    imgLoaded.value = false
    videoError.value = false
    videoFrameReady.value = false
  },
)
// H5 真懒加载：uni <image lazy-load> 只在小程序生效，H5/App 是 no-op → 深滚全站封面 eager 撑爆内存。
// 用 IntersectionObserver 监听：视口外不给 image 赋真实 src（displaySrc 返回空），进入视口(提前一屏)才赋真 src。
// inView：H5 初始 false（等观察器放行）；小程序/App 恒 true（保留 image 原生 lazy-load，行为不变）。
const inView = ref(false)
// #ifndef H5
inView.value = true
// #endif
// image 实际拿到的 src：仅当有图且已进视口才给真值，否则空（元素仍在、opacity:0，作为观察目标不显破图）。
// COS 图追加 imageMogr2 缩略(480 宽·webp)：列表封面原图实测 101.6KB → 裁剪后 12.2KB（utils/image.ts）
const displaySrc = computed(() => (hasImg.value && inView.value ? cdnImage(props.src as string, 480) : ''))
// @error 兜底守卫：懒加载未进视口时 src 为空不算真失败，避免误翻生成封面（破坏兜底链）
function onImgError() {
  if (!displaySrc.value) return
  imgError.value = true
}
// #ifdef H5
let io: any = null
onMounted(() => {
  const inst = getCurrentInstance()
  // 提前一屏(200px)预加载，避免滚到才白；scoped 到本组件实例，.sc-full 在图/视频/生成封面各分支都存在，恒可观察
  io = uni.createIntersectionObserver(inst as any)
  io.relativeToViewport({ top: 200, bottom: 200 }).observe('.sc-full', (res: any) => {
    if (res.intersectionRatio > 0) {
      inView.value = true
      if (io) io.disconnect()
      io = null
    }
  })
})
onUnmounted(() => {
  if (io) io.disconnect()
  io = null
})
// #endif
// 无封面图或封面加载失败，但有可用视频源 → 用视频首帧兜底。
// #t=0.001 让 H5 解码并绘制第一个可显示帧；不取 0.5s，严格保持“视频第一帧”口径。
const hasVideoFrame = computed(() =>
  (!hasImg.value || imgError.value)
  && !videoError.value
  && typeof props.videoUrl === 'string'
  && props.videoUrl.trim() !== '',
)
const videoFrameSrc = computed(() => {
  const src = (props.videoUrl || '').trim()
  if (!src || src.includes('#')) return src
  return `${src}#t=0.001`
})
// 视频首帧同样纳入 inView 懒加载门（照 image 分支 displaySrc 模式）：
// 此前 video 分支不受门控，视口外的卡片一挂载就给 mp4 真 src 直接拉流——深滚列表多路视频并发下载。
// 未进视口时给空 src（元素仍在，作为观察目标），进视口才赋真值开始取首帧。
const displayVideoSrc = computed(() => (hasVideoFrame.value && inView.value ? videoFrameSrc.value : ''))
// 懒加载未进入视口时 video 的 src 暂为空，部分 H5 内核会立刻派发 error；
// 只有真实视频地址已经赋值后才记为失败，避免深滚卡片提前退回文字占位。
function onVideoError() {
  if (!displayVideoSrc.value) return
  videoError.value = true
  videoFrameReady.value = false
}
function onVideoFrameReady() {
  if (!displayVideoSrc.value) return
  videoFrameReady.value = true
}
/** 大字水印模式：deco 或无标题（小缩略图/卡下已有标题） */
const decoMode = computed(() => props.deco || !props.title)
/** 水印字：标题首二字（去书名号等标点）→ 类型字 → 雅 */
const decoChars = computed(() => {
  const clean = (props.title || '').replace(/[《》〈〉「」『』【】\s·、，。：;；!！?？~—-]/g, '')
  return clean.slice(0, 2) || theme.value.label || '雅'
})
</script>

<template>
  <image v-if="hasImg && !imgError" class="sc-full" :class="{ 'content-fade-in': imgLoaded }" :style="imgLoaded ? '' : 'opacity:0'" :src="displaySrc" mode="aspectFill" lazy-load @load="imgLoaded = true" @error="onImgError" />
  <!-- 首帧兜底：无封面图或封面加载失败时取视频第一帧（静音·不自动播·不显控件） -->
  <view v-else-if="hasVideoFrame" class="sc-full sc-video-frame">
    <!-- 首帧解码前先给用户完整的国学封面，不暴露原生 video 黑屏；解码成功后渐显真实第一帧。 -->
    <view class="sc-full sc-gen sc-video-fallback" :style="{ background: grad }">
      <view class="sc-pattern" />
      <view class="sc-frame" />
      <text v-if="!plain" class="sc-deco serif" :style="{ fontSize: decoSize + 'rpx' }">{{ decoChars }}</text>
    </view>
    <!--
      App-Plus 的原生 video 会脱离 WebView 普通层级：即使 opacity:0，仍可能显示黑色原生层并吞掉父卡片点击。
      App 端保留上方生成封面；真实播放只在详情页的同层播放器中进行。H5/小程序继续用视频首帧兜底。
    -->
    <!-- #ifndef APP-PLUS -->
    <video
      class="sc-full sc-video-el"
      :class="{ 'sc-video-el--ready': videoFrameReady }"
      :src="displayVideoSrc"
      preload="auto"
      :controls="false"
      :show-center-play-btn="false"
      :show-play-btn="false"
      :show-fullscreen-btn="false"
      :enable-progress-gesture="false"
      :muted="true"
      :initial-time="0"
      object-fit="cover"
      @loadeddata="onVideoFrameReady"
      @canplay="onVideoFrameReady"
      @error="onVideoError"
    />
    <!-- #endif -->
  </view>
  <view v-else class="sc-full sc-gen" :style="{ background: grad }">
    <!-- 国学底纹：柔和光晕 + 内描边 -->
    <view class="sc-pattern" />
    <view class="sc-frame" />
    <!-- 纯底纹模式(plain)：不出任何文字，只留渐变底纹，避免撞卡片播放按钮/重复卡底标题 -->
    <!-- 大字水印模式：书法二字，任何尺寸都成立（小缩略图不再空块，卡下有标题不再重复） -->
    <text v-if="!plain && decoMode" class="sc-deco serif" :style="{ fontSize: decoSize + 'rpx' }">{{ decoChars }}</text>
    <!-- 完整标题模式：图标 + 两行书法标题（图标不参与压缩，防小容器裁半字） -->
    <template v-else-if="!plain">
      <view class="sc-icon"><AppIcon :name="theme.icon" :size="34" color="rgba(255,255,255,0.82)" /></view>
      <text class="sc-title">{{ title }}</text>
    </template>
    <text v-if="showSeal && theme.label" class="sc-seal">{{ theme.label }}</text>
  </view>
</template>

<style scoped>
.sc-full { width: 100%; height: 100%; display: block; }
.sc-video-frame { position: relative; overflow: hidden; }
.sc-video-fallback { position: absolute; inset: 0; }
.sc-video-el {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.24s ease;
}
.sc-video-el--ready { opacity: 1; }
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
@media (prefers-reduced-motion: reduce) {
  .sc-video-el { transition: none; }
}
</style>
