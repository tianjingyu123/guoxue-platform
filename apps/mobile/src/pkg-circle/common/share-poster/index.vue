<template>
  <view class="poster-page">
    <!-- 加载态 -->
    <view v-if="isLoading || !posterData" class="poster-loading">
      <view class="poster-loading__spinner" />
      <text class="poster-loading__text">加载中…</text>
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="navbar__inner">
          <view class="navbar__btn" @tap="goBack">
            <AppIcon name="x-circle" :size="44" color="#ffffff" />
          </view>
          <text class="navbar__title">{{ typeTitle }}</text>
          <view class="navbar__btn navbar__btn--placeholder" />
        </view>
      </view>

      <!-- 海报预览区 -->
      <scroll-view scroll-y class="poster-scroll">
        <view class="poster-preview">
          <!-- 可视海报卡片（与 canvas 同构，用于展示） -->
          <view class="poster-card" :style="{ background: activeTheme.bg }">
            <view class="poster-card__border" :style="{ borderColor: activeTheme.accent }">
              <view class="poster-card__tag" :style="{ background: activeTheme.accent, color: activeTheme.headerStyle === 'dark' ? activeTheme.bg : '#ffffff' }">
                {{ posterData.tag }}
              </view>
              <text class="poster-card__title" :style="{ color: activeTheme.gold }">{{ posterData.title }}</text>
              <view class="poster-card__divider" :style="{ background: activeTheme.accent }" />
              <text class="poster-card__subtitle" :style="{ color: activeTheme.ink }">{{ posterData.subtitle }}</text>
              <text class="poster-card__desc" :style="{ color: activeTheme.sub }">{{ posterData.desc }}</text>

              <view class="poster-card__footer">
                <view class="poster-card__author">
                  <image lazy-load :src="posterData.authorAvatar" class="poster-card__avatar" mode="aspectFill" />
                  <view class="poster-card__author-info">
                    <text class="poster-card__author-name" :style="{ color: activeTheme.ink }">{{ posterData.author }}</text>
                    <text class="poster-card__author-from" :style="{ color: activeTheme.sub }">来自 {{ BRAND.name }}</text>
                  </view>
                </view>
                <!-- 品牌朱印 + 二维码（印章与 canvas 导出版同构·drawSealOnCanvas） -->
                <view class="poster-card__stamp-area">
                  <view class="poster-card__seal">
                    <brand-seal :chars="sealChars" :size="96" />
                  </view>
                  <!-- 预览区二维码：与导出图同源（都按 data.link 现画），避免"看到的和存下来的不一致" -->
                  <view class="poster-card__qr">
                    <canvas canvas-id="previewQr" id="previewQr" class="poster-card__qr-img" />
                    <text class="poster-card__qr-label" :style="{ color: activeTheme.sub }">{{ posterData.qrLabel }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 离屏 canvas：真实绘制并导出 -->
          <canvas
            canvas-id="posterCanvas"
            id="posterCanvas"
            class="poster-canvas"
            :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
          />
        </view>
      </scroll-view>

      <!-- 底部操作面板 -->
      <view class="panel">
        <!-- 风格选择 -->
        <view class="panel__section">
          <text class="panel__label">选择风格</text>
          <view class="theme-list">
            <view
              v-for="(theme, idx) in POSTER_THEMES"
              :key="theme.id"
              class="theme-item"
              :class="{ 'theme-item--active': themeIndex === idx }"
              :style="{ background: theme.bg }"
              @tap="themeIndex = idx"
            >
              <text class="theme-item__name" :style="{ color: theme.headerStyle === 'dark' ? theme.gold : theme.ink }">
                {{ theme.name }}
              </text>
              <view v-if="themeIndex === idx" class="theme-item__check">
                <AppIcon name="check" :size="20" color="#ffffff" />
              </view>
            </view>
          </view>
        </view>

        <!-- 分享文案 -->
        <view class="panel__section">
          <text class="panel__label">分享文案</text>
          <view class="tone-tabs">
            <view
              v-for="(t, i) in SHARE_TONES"
              :key="t.tone"
              class="tone-tab"
              :class="{ 'tone-tab--active': toneIndex === i }"
              @tap="toneIndex = i"
            >
              {{ t.label }}
            </view>
          </view>
          <view class="tone-text">
            <text class="tone-text__content">{{ currentTone }}</text>
            <view class="tone-text__copy" @tap="copyTone">
              <AppIcon name="copy" :size="32" color="rgba(255,255,255,0.6)" />
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="actions" :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20rpx)' }">
          <view class="action-btn action-btn--outline" :class="{ 'action-btn--disabled': isSaving }" @tap="handleSave">
            <view v-if="isSaving" class="action-btn__spinner" />
            <AppIcon v-else name="download" :size="36" color="#ffffff" />
            <text class="action-btn__txt">保存到相册</text>
          </view>
          <view class="action-btn action-btn--primary" @tap="handleShare">
            <AppIcon name="share-2" :size="36" color="#ffffff" />
            <text class="action-btn__txt">立即分享</text>
          </view>
        </view>
      </view>
    </template>

    <ContentShareSheet
      v-if="posterData"
      :visible="showShareSheet"
      :kind="shareKind"
      :title="posterData.title"
      :summary="posterData.desc"
      :meta="[posterData.subtitle, posterData.author].filter(Boolean).join(' · ')"
      :url="posterData.link"
      @close="showShareSheet = false"
      @poster="handleSave"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import BrandSeal from '@/components/common/brand-seal.vue'
import ContentShareSheet from '@/components/common/content-share-sheet.vue'
import {
  POSTER_THEMES,
  SHARE_TONES,
  getPosterData,
  getPosterTypeTitle,
  recordPosterShare,
  type PosterType,
  type PosterData,
} from '@/pkg-circle/lib/poster-data'
import { BRAND } from '@/lib/brand'
import { drawQrToCanvas } from '@/utils/qrcode'
import { goBack as platformGoBack } from '@/utils/router'
import { useShare } from '@/composables/useShare'

const statusBarHeight = ref(0)
const posterType = ref<PosterType>('invite')
/** 🔴 原为 number：圈子/文章 id 是 uuid，Number() 会得到 NaN → 真连后拿不到任何内容 */
const targetId = ref<string | undefined>(undefined)
/** 仅 type=post 需要（后端帖子详情端点要 circleId + postId） */
const circleId = ref<string | undefined>(undefined)

const isLoading = ref(true)
const posterData = ref<PosterData | null>(null)
const themeIndex = ref(0)
const toneIndex = ref(0)
const isSaving = ref(false)
const posterTempPath = ref('')
const showShareSheet = ref(false)
const { toAppMessage, toTimeline } = useShare()

// canvas 逻辑尺寸（px，比例 3:4）
const canvasW = 300
const canvasH = 420

const typeTitle = computed(() => getPosterTypeTitle(posterType.value))
/** 印面文字：品牌名前二字（nameShort 缺省时回退全名取前二字） */
const sealChars = computed(() => Array.from(BRAND.nameShort || BRAND.name).slice(0, 2).join(''))
const activeTheme = computed(() => POSTER_THEMES[themeIndex.value])
const currentTone = computed(() =>
  posterData.value ? SHARE_TONES[toneIndex.value].build(posterData.value.title) : '',
)
const shareKind = computed(() => {
  const kinds = {
    invite: 'circle',
    circle: 'circle',
    post: 'article',
    article: 'article',
    video: 'video',
    live: 'live',
    product: 'product',
    course: 'course',
    classic: 'classic',
  } as const
  return kinds[posterType.value]
})
const miniSharePath = computed(() => {
  const id = encodeURIComponent(targetId.value || '')
  const circle = encodeURIComponent(circleId.value || '')
  const paths: Record<PosterType, string> = {
    invite: '/pages/index/index',
    circle: `/pkg-circle/circles/detail?id=${id}`,
    post: `/pkg-circle/circles/post?id=${id}&circleId=${circle}`,
    article: `/pkg-circle/articles/detail?id=${id}`,
    video: `/pkg-video/detail/index?id=${id}`,
    live: `/pkg-live/watch/index?id=${id}`,
    product: `/pkg-mall/product/detail?id=${id}`,
    course: `/pkg-course/detail/index?id=${id}`,
    classic: `/pkg-classics/detail/index?id=${id}`,
  }
  return paths[posterType.value]
})

onLoad((q) => {
  if (q?.type) posterType.value = q.type as PosterType
  if (q?.targetId) targetId.value = String(q.targetId)
  if (q?.circleId) circleId.value = String(q.circleId)
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  loadData()
})

const loadError = ref('')

async function loadData() {
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await getPosterData(posterType.value, targetId.value, circleId.value)
    if (res.code === 200 && res.data) {
      posterData.value = res.data
      setTimeout(() => drawPoster(), 100)
    }
  } catch (e) {
    // 绝不回退成假数据：错误的海报会被用户发到朋友圈
    loadError.value = (e as Error)?.message || '内容加载失败，请重试'
    uni.showToast({ title: loadError.value, icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

function drawPoster() {
  const data = posterData.value
  if (!data) return
  const theme = activeTheme.value
  const ctx = uni.createCanvasContext('posterCanvas')
  const W = canvasW
  const H = canvasH

  // 背景
  ctx.setFillStyle(theme.bg)
  ctx.fillRect(0, 0, W, H)

  // 边框
  ctx.setStrokeStyle(theme.accent)
  ctx.setLineWidth(1.5)
  ctx.strokeRect(16, 16, W - 32, H - 32)

  // 标签
  ctx.setFillStyle(theme.accent)
  ctx.fillRect(32, 36, 56, 24)
  ctx.setFillStyle(theme.headerStyle === 'dark' ? theme.bg : '#ffffff')
  ctx.setFontSize(13)
  ctx.setTextAlign('center')
  ctx.fillText(data.tag, 60, 53)

  // 标题
  ctx.setFillStyle(theme.gold)
  ctx.setFontSize(24)
  ctx.setTextAlign('left')
  wrapText(ctx, data.title, 32, 100, W - 64, 32, 2)

  // 分隔线
  ctx.setFillStyle(theme.accent)
  ctx.fillRect(32, 150, 40, 2)

  // 副标题
  ctx.setFillStyle(theme.ink)
  ctx.setFontSize(15)
  ctx.fillText(data.subtitle, 32, 180)

  // 描述
  ctx.setFillStyle(theme.sub)
  ctx.setFontSize(12)
  wrapText(ctx, data.desc, 32, 208, W - 64, 20, 3)

  // 底部作者
  ctx.setFillStyle(theme.sub)
  ctx.setFontSize(11)
  if (data.author) ctx.fillText(data.author, 32, H - 60)
  ctx.fillText(`来自 ${BRAND.name}`, 32, H - 42)

  /* 真二维码（2026-07-14 补）：原代码注释写「底部二维码 + 作者」，但只画了作者文字 ——
   * 导出的海报根本没有二维码，用户发出去别人连扫都没得扫，分享零转化。
   * 现按 data.link 用 uqrcodejs 现画指向真实内容的码（失败静默降级，不影响存图）。 */
  const QR = 72
  drawQrToCanvas(ctx, data.link, W - 32 - QR, H - 32 - QR, QR, { padding: 4 })

  /* 品牌朱印（视觉签名批1）：与预览区 brand-seal 同构，画在二维码左侧、底边对齐——
   * 预览 96rpx=48px、间距 12px，绝不与二维码/作者行重叠 */
  const SEAL = 48
  drawSealOnCanvas(ctx, sealChars.value, W - 32 - QR - 12 - SEAL, H - 32 - SEAL, SEAL)

  ctx.draw(false, () => {
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId: 'posterCanvas',
        success: (r) => {
          posterTempPath.value = r.tempFilePath
        },
        fail: () => {},
      })
    }, 150)
  })

  // 预览区的小二维码（与导出图同一 link，保证所见即所存）
  const pctx = uni.createCanvasContext('previewQr')
  drawQrToCanvas(pctx, data.link, 0, 0, 56, { padding: 2 })
  pctx.draw()
}

// 重绘随主题切换
watch(themeIndex, () => {
  if (posterData.value) drawPoster()
})

/**
 * canvas 版品牌朱印：与预览区 brand-seal.vue（variant=zhu）同构复刻——
 * 印泥红圆角方印面 + 距边 7% 白细内框 + 白楷竖排二字，保证「所见即所存」。
 * 圆角用 lineTo+arc 拼四角（uni 各端 canvas 均支持，不依赖 arcTo/roundRect）。
 */
function drawSealOnCanvas(ctx: UniApp.CanvasContext, chars: string, x: number, y: number, size: number) {
  const list = Array.from(chars).slice(0, 2)
  if (!list.length) return
  const r = Math.round(size * 0.1)
  // 圆角方形印面（印泥红取 --seal-gradient 中值，小尺寸下渐变差异不可见）
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + size - r, y)
  ctx.arc(x + size - r, y + r, r, -Math.PI / 2, 0)
  ctx.lineTo(x + size, y + size - r)
  ctx.arc(x + size - r, y + size - r, r, 0, Math.PI / 2)
  ctx.lineTo(x + r, y + size)
  ctx.arc(x + r, y + size - r, r, Math.PI / 2, Math.PI)
  ctx.lineTo(x, y + r)
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
  ctx.closePath()
  ctx.setFillStyle('#c41e3a')
  ctx.fill()
  // 白细内框（距边 7%，印章的"格"感）
  const inset = size * 0.07
  ctx.setStrokeStyle('rgba(255,255,255,0.55)')
  ctx.setLineWidth(1)
  ctx.strokeRect(x + inset, y + inset, size - inset * 2, size - inset * 2)
  // 白楷竖排字（楷体 fallback 与组件一致；MP 端忽略 font 时降级默认字体，可接受）
  const fs = Math.round(size * (list.length === 1 ? 0.52 : 0.36))
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(fs)
  ctx.font = `600 ${fs}px "Kaiti SC", STKaiti, KaiTi, serif`
  ctx.setTextAlign('center')
  const cx = x + size / 2
  if (list.length === 1) {
    ctx.fillText(list[0], cx, y + size * 0.5 + fs * 0.35)
  } else {
    // 双字竖排：上下两格中心 30% / 70%，baseline 按字高 0.35 微调至视觉居中
    ctx.fillText(list[0], cx, y + size * 0.3 + fs * 0.35)
    ctx.fillText(list[1], cx, y + size * 0.7 + fs * 0.35)
  }
  ctx.setTextAlign('left') // 还原对齐，避免污染后续绘制
}

function wrapText(
  ctx: UniApp.CanvasContext,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const chars = text.split('')
  let line = ''
  let lines = 0
  let curY = y
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY)
      line = chars[i]
      curY += lineHeight
      lines++
      if (lines >= maxLines - 1) {
        // 最后一行处理省略
        let rest = chars.slice(i).join('')
        while (ctx.measureText(rest + '…').width > maxWidth && rest.length > 1) {
          rest = rest.slice(0, -1)
        }
        if (chars.slice(i).join('').length > rest.length) rest += '…'
        ctx.fillText(rest, x, curY)
        return
      }
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, curY)
}

function goBack() {
  platformGoBack()
}

function copyTone() {
  uni.setClipboardData({
    data: currentTone.value,
    success: () => uni.showToast({ title: '文案已复制', icon: 'none' }),
  })
}

async function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  // #ifdef H5
  try {
    if (posterTempPath.value) {
      const a = document.createElement('a')
      a.download = `${BRAND.nameShort}-${typeTitle.value}-${Date.now()}.png`
      a.href = posterTempPath.value
      a.click()
    }
    uni.showToast({ title: '海报已保存', icon: 'success' })
    await recordPosterShare(posterType.value, targetId.value, 'save')
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    isSaving.value = false
  }
  // #endif
  // #ifndef H5
  uni.saveImageToPhotosAlbum({
    filePath: posterTempPath.value,
    success: async () => {
      uni.showToast({ title: '海报已保存', icon: 'success' })
      await recordPosterShare(posterType.value, targetId.value, 'save')
    },
    fail: () => uni.showToast({ title: '保存失败', icon: 'none' }),
    complete: () => { isSaving.value = false },
  })
  // #endif
}

async function handleShare() {
  showShareSheet.value = true
  await recordPosterShare(posterType.value, targetId.value, 'share')
}

onShareAppMessage(() => toAppMessage({
  title: posterData.value?.title || BRAND.name,
  summary: posterData.value?.desc,
  path: miniSharePath.value,
}))

onShareTimeline(() => toTimeline({
  title: posterData.value?.title || BRAND.name,
  summary: posterData.value?.desc,
  path: miniSharePath.value,
}))

onMounted(() => {})
</script>

<style scoped>
.poster-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

/* 加载态 */
.poster-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.poster-loading__spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.2);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 24rpx;
}
.poster-loading__text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 顶栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(26, 26, 26, 0.85);
  backdrop-filter: blur(10rpx);
}
.navbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 16rpx;
}
.navbar__btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.navbar__btn--placeholder {
  opacity: 0;
}
.navbar__title {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 预览区 */
.poster-scroll {
  flex: 1;
  overflow: hidden;
}
.poster-preview {
  display: flex;
  justify-content: center;
  padding: 32rpx 48rpx;
}
.poster-card {
  width: 600rpx;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.4);
}
.poster-card__border {
  margin: 28rpx;
  border: 2rpx solid;
  border-radius: 8rpx;
  padding: 36rpx 32rpx;
  min-height: 760rpx;
  display: flex;
  flex-direction: column;
}
.poster-card__tag {
  align-self: flex-start;
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  border-radius: 6rpx;
  margin-bottom: 36rpx;
}
.poster-card__title {
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.3;
}
.poster-card__divider {
  width: 72rpx;
  height: 4rpx;
  margin: 24rpx 0;
}
.poster-card__subtitle {
  font-size: 28rpx;
  font-weight: 500;
  margin-bottom: 20rpx;
}
.poster-card__desc {
  font-size: 24rpx;
  line-height: 1.7;
  flex: 1;
}
.poster-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 36rpx;
}
.poster-card__author {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.poster-card__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
}
.poster-card__author-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.poster-card__author-name {
  font-size: 26rpx;
  font-weight: 600;
}
.poster-card__author-from {
  font-size: 20rpx;
}
/* 印章+二维码组：印章底边与二维码图对齐（二维码下方还有 label，故印章抬起 label 高度） */
.poster-card__stamp-area {
  display: flex;
  align-items: flex-end;
  gap: 24rpx;
}
.poster-card__seal {
  margin-bottom: 34rpx;
}
.poster-card__qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.poster-card__qr-img {
  width: 120rpx;
  height: 120rpx;
  background: #ffffff;
  border-radius: 8rpx;
  padding: 6rpx;
  box-sizing: border-box;
}
.poster-card__qr-label {
  font-size: 18rpx;
}

/* 离屏 canvas（隐藏在视图外但需可绘制） */
.poster-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
}

/* 底部面板 */
.panel {
  background: rgba(26, 26, 26, 0.95);
  border-top: 2rpx solid rgba(255, 255, 255, 0.08);
}
.panel__section {
  padding: 24rpx 32rpx 0;
}
.panel__label {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16rpx;
}
.theme-list {
  display: flex;
  gap: 20rpx;
}
.theme-item {
  flex: 1;
  position: relative;
  border: 3rpx solid rgba(255, 255, 255, 0.15);
  border-radius: 12rpx;
  padding: 24rpx 0;
  text-align: center;
}
.theme-item--active {
  border-color: var(--brand);
}
.theme-item__name {
  font-size: 26rpx;
  font-weight: 500;
}
.theme-item__check {
  position: absolute;
  right: -8rpx;
  top: -8rpx;
  width: 36rpx;
  height: 36rpx;
  background: var(--brand);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 文案 */
.tone-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.tone-tab {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
}
.tone-tab--active {
  background: var(--brand);
  color: #ffffff;
}
.tone-text {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}
.tone-text__content {
  flex: 1;
  font-size: 24rpx;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.9);
}
.tone-text__copy {
  flex-shrink: 0;
  padding-top: 4rpx;
}

/* 操作按钮 */
.actions {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 32rpx 20rpx;
}
.action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.action-btn--outline {
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}
.action-btn--primary {
  background: var(--brand);
}
.action-btn--disabled {
  opacity: 0.6;
}
.action-btn__txt {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 500;
}
.action-btn__spinner {
  width: 36rpx;
  height: 36rpx;
  border: 5rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>
