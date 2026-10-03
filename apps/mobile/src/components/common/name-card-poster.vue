<script setup lang="ts">
/**
 * 从业者名片海报弹层（课-P2 · 通用可复用组件）
 * canvas 绘制：品牌头「热卜国学·从业者名片」+ 头像占位（姓名首字）+ 姓名
 * + 认证头衔文字 chip + 服务简介截断 + 真二维码（utils/qrcode·扫码进名片页带 ref 归因）
 * 范式对齐 pkg-poetry/solar-term 成就卡（uni 旧接口 canvas + 保存相册 + 原生分享按钮）。
 * 通用契约：props { name, title, intro, link } —— 讲师/达人/站长复用，角色差异由调用方拼 title。
 * 铁律：二维码/绘制任一步失败静默降级（无码也能保存基础名片），不阻塞不报错。
 */
import { ref, watch, getCurrentInstance, nextTick } from 'vue'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import { drawQrToCanvas } from '@/utils/qrcode'
import { BRAND } from '@/lib/brand'

const props = withDefaults(defineProps<{
  /** 弹层可见性（v-if 由父层控制亦可，此处内部 v-if visible） */
  visible: boolean
  /** 从业者姓名/昵称（头像占位取首字） */
  name: string
  /** 认证头衔/等级文字（如「研究院签约讲师 · 国学讲师」，空则不画 chip） */
  title?: string
  /** 服务简介（自动换行截断，空则不画） */
  intro?: string
  /** 二维码内容 = 名片页 H5 链接（调用方负责 withRef 带归因） */
  link: string
  /** 二维码配文（默认「扫码找 TA 咨询/学习」） */
  qrCaption?: string
  /**
   * 招牌数据条（品牌海报模式·如讲师「N 门课 / N 位学员 / 评分」）。
   * 传则画三列数据条并自动增高画布；不传（默认）= 纯名片，行为与课-P2 原版一致。
   */
  stats?: Array<{ num: string; label: string }>
}>(), { title: '', intro: '', qrCaption: '扫码找 TA 咨询/学习' })

const emit = defineEmits<{ (e: 'close'): void }>()
useOverlayScrollLock(
  () => props.visible,
  {
    onEscape: () => emit('close'),
    focusContainerSelector: '.card-modal',
    initialFocusSelector: '.card-close',
  },
)

const instance = getCurrentInstance()?.proxy
const saving = ref(false)
// 有招牌数据条（品牌海报）时增高画布容纳数据条（1:1.5），纯名片保持原比例 1:1.4
const cardRatio = (props.stats?.length ?? 0) > 0 ? 1.5 : 1.4
const canvasW = ref(300)
const canvasH = ref(Math.round(300 * cardRatio))

// 画布尺寸随屏宽（与 solar-term 卡一致：260~320）
try {
  const info = uni.getSystemInfoSync()
  const w = Math.min(320, Math.max(260, (info.windowWidth || 375) - 100))
  canvasW.value = Math.round(w)
  canvasH.value = Math.round(w * cardRatio)
} catch {
  /* 取不到系统信息用默认尺寸 */
}

watch(() => props.visible, (v) => {
  if (v) nextTick(() => setTimeout(drawCard, 60))
})

function onClose() { emit('close') }

function activateOnKeyboard(event: KeyboardEvent, action: () => void | Promise<void>) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}

// ───────── canvas 绘制 ─────────

function drawCard() {
  try {
    const W = canvasW.value
    const H = canvasH.value
    const ctx = uni.createCanvasContext('nameCardPoster', instance)

    // 背景（暖纸色）
    ctx.setFillStyle('#faf3e6')
    ctx.fillRect(0, 0, W, H)

    // 品牌头（暖褐色块）
    const headH = 76
    ctx.setFillStyle('#8b5a2b')
    ctx.fillRect(0, 0, W, headH)
    ctx.setFillStyle('rgba(255,255,255,0.9)')
    ctx.setFontSize(13)
    ctx.setTextAlign('center')
    ctx.fillText(`${BRAND.name} · 从业者名片`, W / 2, 44)

    // 头像占位：骑跨品牌头下缘的圆（姓名首字）
    const avatarR = 34
    const avatarCy = headH + 14
    ctx.setFillStyle('#ffffff')
    ctx.beginPath()
    ctx.arc(W / 2, avatarCy, avatarR + 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.setFillStyle('#fdf3e7')
    ctx.beginPath()
    ctx.arc(W / 2, avatarCy, avatarR, 0, Math.PI * 2)
    ctx.fill()
    ctx.setFillStyle('#c09a5f')
    ctx.setFontSize(30)
    ctx.setTextAlign('center')
    ctx.fillText((props.name || '师')[0], W / 2, avatarCy + 11)

    // 姓名
    ctx.setFillStyle('#2d2a26')
    ctx.setFontSize(24)
    ctx.fillText(props.name || '从业者', W / 2, avatarCy + avatarR + 40)

    // 认证头衔 chip（金底白字·有则画）
    let cursorY = avatarCy + avatarR + 58
    if (props.title) {
      ctx.setFontSize(13)
      const tw = Math.min(ctx.measureText(props.title).width + 32, W - 48)
      ctx.setFillStyle('#b5843f')
      roundRect(ctx, W / 2 - tw / 2, cursorY, tw, 28, 14)
      ctx.fill()
      ctx.setFillStyle('#ffffff')
      ctx.fillText(props.title, W / 2, cursorY + 19)
      cursorY += 48
    } else {
      cursorY += 12
    }

    // 招牌数据条（品牌海报模式·三列「数值/标签」·有则画并推进 cursorY）
    const stats = props.stats || []
    if (stats.length) {
      const items = stats.slice(0, 3)
      const rowY = cursorY
      const colW = (W - 48) / items.length
      items.forEach((it, i) => {
        const cx = 24 + colW * i + colW / 2
        ctx.setTextAlign('center')
        ctx.setFillStyle('#b5843f')
        ctx.setFontSize(21)
        ctx.fillText(it.num, cx, rowY + 20)
        ctx.setFillStyle('#9a8b73')
        ctx.setFontSize(11)
        ctx.fillText(it.label, cx, rowY + 40)
        if (i > 0) {
          // 列间竖分隔线
          ctx.setFillStyle('#e6d9c2')
          ctx.fillRect(24 + colW * i, rowY + 2, 1, 38)
        }
      })
      cursorY += 62
    }

    // 二维码（右下角·失败静默降级）
    const qrSize = 84
    const qrX = W - qrSize - 20
    const qrY = H - qrSize - 44
    const hasQr = drawQrToCanvas(ctx, props.link, qrX, qrY, qrSize, {
      caption: props.qrCaption,
      captionColor: '#b09a7c',
    })

    // 服务简介（有二维码时左对齐让位，否则居中）
    if (props.intro) {
      ctx.setFillStyle('#6b5b45')
      ctx.setFontSize(13)
      if (hasQr) {
        ctx.setTextAlign('left')
        // 品牌海报（有数据条）时简介收窄至二维码左缘并限 2 行，避免压二维码；纯名片保持原宽/3 行
        const introW = stats.length ? qrX - 24 - 14 : W - 48
        const introLines = stats.length ? 2 : 3
        drawWrapped(ctx, props.intro, 24, cursorY + 16, introW, 22, introLines)
      } else {
        ctx.setTextAlign('center')
        drawWrapped(ctx, props.intro, W / 2, cursorY + 16, W - 56, 22, 3)
      }
    }

    // 左下角 slogan（与二维码错位）
    ctx.setTextAlign('left')
    ctx.setFillStyle('#b09a7c')
    ctx.setFontSize(11)
    ctx.fillText('传道授业 · 咨询学习', 24, H - 28)
    ctx.setTextAlign('center')

    ctx.draw()
  } catch {
    /* 绘制失败静默降级：弹层仍可关闭，不阻塞页面 */
  }
}

function roundRect(ctx: UniApp.CanvasContext, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

/** 逐字换行 + 行数截断（末行超出补省略号），与 solar-term 卡同范式 */
function drawWrapped(ctx: UniApp.CanvasContext, text: string, cx: number, top: number, maxW: number, lineH: number, maxLines: number) {
  const chars = (text || '').split('')
  const lines: string[] = []
  let line = ''
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = ch
      if (lines.length === maxLines - 1) break
    } else {
      line = test
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  const consumed = lines.join('').length
  if (consumed < chars.length && lines.length) {
    let last = lines[lines.length - 1]
    while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1)
    lines[lines.length - 1] = last + '…'
  }
  lines.forEach((l, i) => ctx.fillText(l, cx, top + i * lineH))
}

// ───────── 保存相册（防重复） ─────────

function onSaveCard() {
  if (saving.value) return
  saving.value = true
  uni.canvasToTempFilePath({
    canvasId: 'nameCardPoster',
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
        fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' }),
        complete: () => { saving.value = false },
      })
    },
    fail: () => {
      uni.showToast({ title: '名片生成失败，请重试', icon: 'none' })
      saving.value = false
    },
  }, instance)
}
</script>

<template>
  <view v-if="visible" class="overlay" @tap="onClose" @touchmove.self.prevent>
    <view class="card-modal" role="dialog" aria-modal="true" aria-label="从业者名片海报"
      tabindex="-1" @tap.stop @touchmove.stop>
      <view class="card-canvas-wrap">
        <canvas
          canvas-id="nameCardPoster"
          class="card-canvas"
          :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
        />
      </view>
      <view class="card-actions">
        <!-- 原生分享（小程序生效·页面侧 onShareAppMessage 已带 ref 归因） -->
        <button class="card-btn share" open-type="share"><text class="card-btn-txt">分享给好友</text></button>
        <view class="card-btn save" :class="{ disabled: saving }"
          role="button" :aria-disabled="saving" tabindex="0"
          @tap="onSaveCard" @keydown="activateOnKeyboard($event, onSaveCard)">
          <text class="card-btn-txt">{{ saving ? '保存中...' : '保存到相册' }}</text>
        </view>
      </view>
      <text class="card-close" role="button" tabindex="0"
        @tap="onClose" @keydown="activateOnKeyboard($event, onClose)">关闭</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28rpx;
}
.card-canvas-wrap {
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 48rpx rgba(0, 0, 0, 0.3);
  background: #faf3e6;
}
.card-canvas { display: block; }
.card-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.card-btn {
  padding: 18rpx 44rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  line-height: 1.2;
  &::after { border: none; }
  &.share { background: #8b5a2b; }
  &.save { background: #b5843f; }
  &.disabled { opacity: 0.6; }
}
.card-btn-txt { font-size: 27rpx; color: #ffffff; font-weight: 500; }
.card-close {
  font-size: 27rpx;
  color: rgba(255, 255, 255, 0.85);
  padding: 12rpx 40rpx;
}
</style>
