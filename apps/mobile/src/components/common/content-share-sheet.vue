<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import { shareLink } from '@/utils/share'

type ShareKind = 'classic' | 'article' | 'video' | 'live' | 'course' | 'product' | 'circle' | 'station' | 'activity' | 'agent' | 'tool'

const props = withDefaults(defineProps<{
  visible: boolean
  kind?: ShareKind
  title: string
  summary?: string
  meta?: string
  cover?: string
  url: string
  posterEnabled?: boolean
}>(), {
  kind: 'article',
  summary: '',
  meta: '',
  cover: '',
  posterEnabled: true,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'poster'): void
}>()

useOverlayScrollLock(
  () => props.visible,
  {
    onEscape: () => emit('close'),
    focusContainerSelector: '.css-sheet',
    initialFocusSelector: '.css-close',
  },
)

const kindInfo = computed(() => {
  const map: Record<ShareKind, { label: string; glyph: string; gradient: string }> = {
    classic: { label: '经典古籍', glyph: '典', gradient: 'linear-gradient(145deg, #474852, #25262d)' },
    article: { label: '精选文章', glyph: '文', gradient: 'linear-gradient(145deg, #9e543f, #6f3028)' },
    video: { label: '短视频', glyph: '映', gradient: 'linear-gradient(145deg, #42556d, #263747)' },
    live: { label: '直播内容', glyph: '播', gradient: 'linear-gradient(145deg, #9f433b, #682b27)' },
    course: { label: '精品课程', glyph: '课', gradient: 'linear-gradient(145deg, #856147, #583a2b)' },
    product: { label: '严选好物', glyph: '物', gradient: 'linear-gradient(145deg, #957047, #62472e)' },
    circle: { label: '兴趣圈子', glyph: '圈', gradient: 'linear-gradient(145deg, #52677c, #314655)' },
    station: { label: '主题分站', glyph: '站', gradient: 'linear-gradient(145deg, #7f5743, #4d342b)' },
    activity: { label: '精选活动', glyph: '惠', gradient: 'linear-gradient(145deg, #a9413d, #6e292d)' },
    agent: { label: 'AI 学伴', glyph: '智', gradient: 'linear-gradient(145deg, #376fc6, #7740bd)' },
    tool: { label: '国学工具', glyph: '术', gradient: 'linear-gradient(145deg, #4d7766, #2f5548)' },
  }
  return map[props.kind]
})

async function shareFriend() {
  // #ifdef APP-PLUS
  (uni as any).share({
    provider: 'weixin',
    scene: 'WXSceneSession',
    type: 0,
    title: props.title,
    summary: props.summary,
    href: props.url,
    imageUrl: props.cover || undefined,
    success: () => emit('close'),
    fail: () => { void shareMore() },
  })
  return
  // #endif

  // #ifdef H5
  const ok = await shareLink({ title: props.title, text: props.summary, url: props.url })
  if (ok) emit('close')
  // #endif

  // #ifndef APP-PLUS
  // #ifndef H5
  await shareMore()
  // #endif
  // #endif
}

async function shareTimeline() {
  // #ifdef APP-PLUS
  (uni as any).share({
    provider: 'weixin',
    scene: 'WXSceneTimeline',
    type: 0,
    title: props.title,
    summary: props.summary,
    href: props.url,
    imageUrl: props.cover || undefined,
    success: () => emit('close'),
    fail: () => uni.showToast({ title: '未完成分享', icon: 'none' }),
  })
  return
  // #endif

  // #ifdef MP-WEIXIN
  uni.showToast({ title: '请点右上角“分享到朋友圈”', icon: 'none' })
  return
  // #endif

  // #ifdef H5
  emit('poster')
  emit('close')
  uni.showToast({ title: '保存海报后可发布朋友圈', icon: 'none' })
  // #endif

  // #ifndef APP-PLUS
  // #ifndef MP-WEIXIN
  // #ifndef H5
  await shareMore()
  // #endif
  // #endif
  // #endif
}

async function shareMore() {
  // #ifdef APP-PLUS
  try {
    await new Promise<void>((resolve, reject) => {
      plus.share.sendWithSystem(
        {
          type: 'web',
          title: props.title,
          content: props.summary || props.title,
          href: props.url,
          thumbs: props.cover ? [props.cover] : undefined,
        },
        () => resolve(),
        (error) => reject(error),
      )
    })
    emit('close')
    return
  } catch { /* 系统分享不可用时继续走正式链接兜底 */ }
  // #endif
  const ok = await shareLink({ title: props.title, text: props.summary, url: props.url })
  if (ok) emit('close')
}

function openPoster() {
  emit('poster')
  emit('close')
}

function copyUrl() {
  uni.setClipboardData({
    data: props.url,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'none' })
      emit('close')
    },
    fail: () => uni.showToast({ title: '复制失败，请稍后重试', icon: 'none' }),
  })
}

function activateOnKeyboard(event: KeyboardEvent, action: () => void | Promise<void>) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}
</script>

<template>
  <view v-if="visible" class="css-mask" role="dialog" aria-modal="true" aria-label="分享内容" @tap="emit('close')" @touchmove.self.prevent>
    <view class="css-sheet" tabindex="-1" @tap.stop @touchmove.stop>
      <view class="css-grip" />
      <view class="css-head">
        <view>
          <text class="css-kicker">分享这份内容</text>
          <text class="css-hint">对方打开即可看到完整内容</text>
        </view>
        <view
          class="css-close"
          role="button"
          aria-label="关闭分享面板"
          tabindex="0"
          @tap="emit('close')"
          @keydown="activateOnKeyboard($event, () => emit('close'))"
        >
          <app-icon name="x-circle" :size="32" color="#77716a" />
        </view>
      </view>

      <view class="css-preview">
        <image v-if="cover" class="css-cover" :src="cover" mode="aspectFill" />
        <view v-else class="css-cover css-cover--generated" :style="{ background: kindInfo.gradient }">
          <view class="css-orbit" />
          <text class="css-glyph">{{ kindInfo.glyph }}</text>
        </view>
        <view class="css-copy">
          <text class="css-type">{{ kindInfo.label }}</text>
          <text class="css-title">{{ title }}</text>
          <text v-if="summary" class="css-summary">{{ summary }}</text>
          <text v-if="meta" class="css-meta">{{ meta }}</text>
        </view>
      </view>

      <view class="css-actions" :class="{ 'css-actions--compact': !posterEnabled }">
        <!-- #ifdef MP-WEIXIN -->
        <button class="css-action css-action--button" open-type="share">
          <view class="css-action-icon css-action-icon--wechat">
            <app-icon name="message-circle" :size="40" color="#ffffff" />
          </view>
          <text class="css-action-label">微信好友</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view
          class="css-action"
          role="button"
          aria-label="分享到微信好友"
          tabindex="0"
          @tap="shareFriend"
          @keydown="activateOnKeyboard($event, shareFriend)"
        >
          <view class="css-action-icon css-action-icon--wechat">
            <app-icon name="message-circle" :size="40" color="#ffffff" />
          </view>
          <text class="css-action-label">微信好友</text>
        </view>
        <!-- #endif -->

        <view
          class="css-action"
          role="button"
          aria-label="分享到朋友圈"
          tabindex="0"
          @tap="shareTimeline"
          @keydown="activateOnKeyboard($event, shareTimeline)"
        >
          <view class="css-action-icon css-action-icon--moments">
            <view class="css-moments-ring"><view class="css-moments-dot" /></view>
          </view>
          <text class="css-action-label">朋友圈</text>
        </view>

        <view
          v-if="posterEnabled"
          class="css-action"
          role="button"
          aria-label="生成分享海报"
          tabindex="0"
          @tap="openPoster"
          @keydown="activateOnKeyboard($event, openPoster)"
        >
          <view class="css-action-icon css-action-icon--poster">
            <app-icon name="image" :size="40" color="#ffffff" />
          </view>
          <text class="css-action-label">分享海报</text>
        </view>

        <view
          class="css-action"
          role="button"
          aria-label="分享到更多平台"
          tabindex="0"
          @tap="shareMore"
          @keydown="activateOnKeyboard($event, shareMore)"
        >
          <view class="css-action-icon css-action-icon--more">
            <app-icon name="more-horizontal" :size="40" color="#ffffff" />
          </view>
          <text class="css-action-label">更多平台</text>
        </view>

        <view
          class="css-action"
          role="button"
          aria-label="复制分享链接"
          tabindex="0"
          @tap="copyUrl"
          @keydown="activateOnKeyboard($event, copyUrl)"
        >
          <view class="css-action-icon css-action-icon--link">
            <app-icon name="link-2" :size="40" color="#ffffff" />
          </view>
          <text class="css-action-label">复制链接</text>
        </view>
      </view>

      <text class="css-footnote">不同终端会调用各自支持的分享能力，不会在未完成时提示成功。</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.css-mask {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: flex;
  align-items: flex-end;
  background: rgba(32, 29, 25, 0.38);
  backdrop-filter: blur(6rpx);
  -webkit-backdrop-filter: blur(6rpx);
  animation: css-fade 180ms ease-out;
}
.css-sheet {
  width: 100%;
  padding: 14rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  border-radius: 34rpx 34rpx 0 0;
  background: #fbf8f2;
  box-shadow: 0 -20rpx 60rpx rgba(43, 35, 25, 0.18);
  animation: css-rise 280ms cubic-bezier(.2, .75, .2, 1);
}
.css-grip {
  width: 64rpx;
  height: 7rpx;
  margin: 0 auto 22rpx;
  border-radius: 999rpx;
  background: #d9d0c2;
}
.css-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22rpx;
}
.css-kicker {
  display: block;
  font-family: var(--font-serif);
  font-size: 34rpx;
  font-weight: 700;
  color: #2c2925;
}
.css-hint {
  display: block;
  margin-top: 4rpx;
  font-size: 23rpx;
  color: #8a8177;
}
.css-close {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f0ebe3;
}
.css-preview {
  display: flex;
  min-height: 176rpx;
  padding: 14rpx;
  border: 1rpx solid rgba(167, 142, 103, 0.25);
  border-radius: 22rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(65, 49, 31, 0.07);
}
.css-cover {
  flex: 0 0 148rpx;
  width: 148rpx;
  height: 148rpx;
  border-radius: 16rpx;
}
.css-cover--generated {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.css-orbit {
  position: absolute;
  width: 96rpx;
  height: 96rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}
.css-orbit::after {
  content: '';
  position: absolute;
  left: -6rpx;
  top: 40rpx;
  width: 9rpx;
  height: 9rpx;
  border-radius: 50%;
  background: #f1d399;
}
.css-glyph {
  position: relative;
  font-family: var(--font-serif);
  font-size: 48rpx;
  color: #ffffff;
}
.css-copy {
  min-width: 0;
  flex: 1;
  padding: 2rpx 8rpx 2rpx 20rpx;
}
.css-type {
  display: inline-flex;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  color: #946b31;
  background: #f6eddb;
}
.css-title {
  display: -webkit-box;
  margin-top: 8rpx;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  font-family: var(--font-serif);
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2925;
}
.css-summary {
  display: -webkit-box;
  margin-top: 5rpx;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 23rpx;
  line-height: 1.45;
  color: #6f6961;
}
.css-meta {
  display: block;
  margin-top: 6rpx;
  overflow: hidden;
  font-size: 21rpx;
  color: #a0968c;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.css-actions {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12rpx;
  margin-top: 30rpx;
}
.css-actions--compact { grid-template-columns: repeat(4, 1fr); }
.css-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.css-action--button {
  padding: 0;
  border: 0;
  line-height: 1;
  background: transparent;
}
.css-action--button::after { border: 0; }
.css-action-icon {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 26rpx;
  box-shadow: 0 8rpx 20rpx rgba(50, 42, 34, 0.12);
}
.css-action-icon--wechat { background: #2fbd68; }
.css-action-icon--moments { background: #4d8e72; }
.css-action-icon--poster { background: #b07b43; }
.css-action-icon--more { background: #765d86; }
.css-action-icon--link { background: #5d6c80; }
.css-action-label {
  font-size: 23rpx;
  color: #4d4944;
}
.css-moments-ring {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #ffffff;
  border-radius: 50%;
  position: relative;
}
.css-moments-ring::before,
.css-moments-ring::after {
  content: '';
  position: absolute;
  inset: 5rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.72);
  transform: rotate(45deg);
}
.css-moments-dot {
  position: absolute;
  left: 13rpx;
  top: 13rpx;
  width: 7rpx;
  height: 7rpx;
  border-radius: 50%;
  background: #ffffff;
}
.css-footnote {
  display: block;
  margin-top: 26rpx;
  text-align: center;
  font-size: 20rpx;
  color: #a39a90;
}
@keyframes css-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes css-rise {
  from { transform: translateY(24rpx); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .css-mask,
  .css-sheet { animation: none; }
}
</style>
