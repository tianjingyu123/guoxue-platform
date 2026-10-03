<script setup lang="ts">
/**
 * 节气 · 海报生成（自 V0 components/jieqi/poster-module.tsx 还原）
 * 750×1000 canvas，专属版 / 讲师版两版；绘制逻辑（背景/色块/内描边/大字/菱形/换行文案/落款/印章）
 * 与 V0 逐行对齐，仅把 DOM canvas 换成本项目 canvas 适配层。
 * 取舍：V0 用 a.download 下载 PNG；小程序无从下载 → canvasToTempFilePath + 存相册（H5 下同样可存）。
 */
import { ref, watch, nextTick, getCurrentInstance } from 'vue'
import { renderToCanvas } from '@/utils/canvas/adapter'
import type { JieqiInfo } from '@/pkg-paipan/lib/jieqi-data'
import { posterCopy } from '@/pkg-paipan/lib/jieqi-recommend'

const props = defineProps<{
  detail: JieqiInfo
  meta: { color: string; bg: string; desc: string }
  /** 交节日期文案，如「2月4日 星期二 10:42」 */
  dateLine?: string
}>()

const instance = getCurrentInstance()?.proxy
type Variant = 'personal' | 'lecturer'
const VARIANTS: { key: Variant; label: string }[] = [
  { key: 'personal', label: '专属版' },
  { key: 'lecturer', label: '讲师版' },
]

const variant = ref<Variant>('personal')
const lecturerName = ref('')
const rendering = ref(false)
let canvasNode: any = null

const W = 750
const H = 1000

/** 自动换行绘制，返回结束 y（与 V0 wrapText 同实现） */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const chars = Array.from(text)
  let line = ''
  let curY = y
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line, x, curY)
      line = ch
      curY += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, curY)
  return curY
}

function paint(ctx: CanvasRenderingContext2D) {
  const copy = posterCopy(props.detail.name, variant.value)
  const { color, bg, desc } = props.meta

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = color
  ctx.fillRect(0, 0, W, 12)

  ctx.strokeStyle = `${color}55`
  ctx.lineWidth = 2
  ctx.strokeRect(40, 48, W - 80, H - 96)

  ctx.textAlign = 'center'

  ctx.fillStyle = color
  ctx.font = "bold 120px 'Songti SC', serif"
  ctx.fillText(props.detail.name, W / 2, 240)

  ctx.fillStyle = '#6b6459'
  ctx.font = '30px sans-serif'
  ctx.fillText(`${props.detail.pinyin}  ·  ${props.detail.season}季 · ${desc}`, W / 2, 300)

  if (props.dateLine) {
    ctx.fillStyle = '#8a8377'
    ctx.font = '26px sans-serif'
    ctx.fillText(props.dateLine, W / 2, 348)
  }

  // 分隔菱形
  ctx.fillStyle = color
  ctx.save()
  ctx.translate(W / 2, 392)
  ctx.rotate(Math.PI / 4)
  ctx.fillRect(-7, -7, 14, 14)
  ctx.restore()

  ctx.fillStyle = '#3a352d'
  ctx.font = "bold 40px 'Songti SC', serif"
  let y = 470
  y = wrapText(ctx, copy.headline, W / 2, y, W - 160, 58)

  ctx.font = '30px sans-serif'
  ctx.fillStyle = '#5a5347'
  y += 70
  for (const p of copy.points.filter(Boolean)) {
    y = wrapText(ctx, p, W / 2, y, W - 180, 46)
    y += 54
  }

  ctx.fillStyle = color
  ctx.font = "bold 32px 'Songti SC', serif"
  const footer =
    variant.value === 'lecturer' && lecturerName.value.trim()
      ? `${lecturerName.value.trim()} · ${copy.footer}`
      : copy.footer
  ctx.fillText(footer, W / 2, H - 120)

  // 底部印章圆
  ctx.beginPath()
  ctx.arc(W / 2, H - 200, 34, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = color
  ctx.font = "bold 26px 'Songti SC', serif"
  ctx.fillText('节气', W / 2, H - 191)
}

async function draw() {
  rendering.value = true
  try {
    await nextTick()
    const handle = await renderToCanvas('#jieqi-poster', { width: W, height: H }, (ctx) => paint(ctx), instance)
    canvasNode = handle.canvas
  } catch {
    // 画布未就绪不阻断页面
  } finally {
    rendering.value = false
  }
}

watch(
  () => [props.detail.name, variant.value, lecturerName.value, props.dateLine],
  () => draw(),
  { immediate: true },
)

/** 保存到相册（V0 是浏览器下载 PNG；小程序无从下载，改存相册） */
function save() {
  if (!canvasNode) return
  uni.canvasToTempFilePath({
    canvas: canvasNode,
    success: (res: any) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '海报已保存到相册', icon: 'success' }),
        fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' }),
      })
    },
    fail: () => uni.showToast({ title: '生成图片失败', icon: 'none' }),
  } as any, instance as any)
}
</script>

<template>
  <view class="pm" :style="{ backgroundColor: meta.bg, borderColor: meta.color + '33' }">
    <text class="h3">节气海报生成</text>
    <text class="hint">一键生成「{{ detail.name }}」专属海报，可保存分享</text>

    <view class="tabs">
      <view
        v-for="v in VARIANTS"
        :key="v.key"
        class="tab"
        :style="variant === v.key ? { backgroundColor: meta.color, color: '#fff' } : {}"
        @tap="variant = v.key"
      >
        {{ v.label }}
      </view>
    </view>

    <input
      v-if="variant === 'lecturer'"
      v-model="lecturerName"
      class="name-input"
      type="text"
      placeholder="输入讲师/机构署名（可选）"
      placeholder-class="ph"
    />

    <view class="preview" :style="{ borderColor: meta.color + '33' }">
      <canvas id="jieqi-poster" canvas-id="jieqi-poster" type="2d" class="canvas" />
    </view>

    <view class="save-btn" :style="{ backgroundColor: meta.color, opacity: rendering ? 0.5 : 1 }" @tap="save">
      <text class="save-btn-t">{{ rendering ? '生成中…' : '保存海报到相册' }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.pm {
  padding: 28rpx;
  border: 1rpx solid;
  border-radius: 32rpx;
}
.h3 {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3d2f22;
}
.hint {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #8a7a68;
}
.tabs {
  display: flex;
  gap: 10rpx;
  margin-top: 20rpx;
  padding: 8rpx;
  border-radius: 20rpx;
  background: #fff;
}
.tab {
  flex: 1;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border-radius: 14rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #8a7a68;
}
.name-input {
  margin-top: 14rpx;
  height: 72rpx;
  padding: 0 20rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 14rpx;
  background: #fff;
  font-size: 26rpx;
  color: #3d2f22;
}
.ph {
  color: #b0a494;
}
.preview {
  margin-top: 20rpx;
  border: 1rpx solid;
  border-radius: 20rpx;
  overflow: hidden;
  background: #fff;
}
.canvas {
  display: block;
  width: 100%;
  height: 840rpx;
}
.save-btn {
  margin-top: 20rpx;
  height: 84rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.save-btn-t {
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
}
</style>
