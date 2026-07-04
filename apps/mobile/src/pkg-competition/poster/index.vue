<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="goBack"><app-icon name="arrow-left" :size="20" color="#fff" /></view>
        <text class="nav-title">分享海报</text>
        <view class="nav-btn" />
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">加载中...</text>
    </view>

    <!-- error -->
    <view v-else-if="error" class="state">
      <app-icon name="alert-circle" :size="44" color="#d1d5db" />
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @click="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
        <view class="canvas-wrap">
          <canvas
            canvas-id="posterCanvas"
            class="poster-canvas"
            :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
          />
        </view>
        <text class="hint">长按或点击下方按钮保存海报到相册分享</text>
        <view class="safe-bottom" />
      </scroll-view>

      <!-- 底部操作 -->
      <view class="footer" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
        <view class="footer-btn" :class="{ disabled: submitting }" @click="onSave">
          <app-icon name="download" :size="16" color="#fff" />
          <text class="footer-btn-txt">{{ submitting ? '保存中...' : '保存到相册' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'
import { withRef } from '@/utils/referral'
import { drawQrToCanvas } from '@/utils/qrcode'
import { BRAND } from '@/lib/brand'
import {
  competitionApi, promotionLabel,
  type Competition, type Registration, type Ranking,
} from '@/lib/competition-data'

const instance = getCurrentInstance()?.proxy

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44 - 70)

// 竖版海报逻辑像素（适配后写入 px）
const canvasW = ref(300)
const canvasH = ref(450)

const compId = ref('')
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

const comp = ref<Competition | null>(null)
const myRank = ref<Ranking | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [c, reg, rk] = await Promise.all([
      competitionApi.detail(compId.value).catch(() => null),
      competitionApi.myRegistration(compId.value).catch(() => null),
      competitionApi.rankings(compId.value).catch(() => ({ items: [] as Ranking[] })),
    ])
    if (!c) throw new Error('赛事不存在')
    comp.value = c
    // 找我的成绩（可能为 null）：按报名 userId 命中排名
    const items: Ranking[] = (rk as { items: Ranking[] }).items || []
    const myUserId = (reg as Registration | null)?.userId
    myRank.value = myUserId ? (items.find((r) => r.userId === myUserId) || null) : null
    await nextTick()
    setTimeout(draw, 50)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

/** 绘制竖版分享海报 */
function draw() {
  const c = comp.value
  if (!c) return
  const W = canvasW.value
  const H = canvasH.value
  const ctx = uni.createCanvasContext('posterCanvas', instance)

  // 背景
  ctx.setFillStyle('#fdf6ed')
  ctx.fillRect(0, 0, W, H)

  // ── 顶部红色块 ──
  const headH = 132
  ctx.setFillStyle('#c41e3a')
  ctx.fillRect(0, 0, W, headH)
  // 平台名
  ctx.setFillStyle('rgba(255,255,255,0.85)')
  ctx.setFontSize(12)
  ctx.setTextAlign('center')
  ctx.fillText(`${BRAND.name}传统文化平台`, W / 2, 34)
  // 赛事名（最多两行）
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(20)
  drawWrapped(ctx, c.title, W / 2, 70, W - 48, 28, 2)

  // ── 中部白底卡 ──
  const cardX = 24
  const cardY = headH + 24
  const cardW = W - 48
  const cardH = 150
  ctx.setFillStyle('#ffffff')
  roundRect(ctx, cardX, cardY, cardW, cardH, 12)
  ctx.fill()

  ctx.setTextAlign('center')
  if (myRank.value) {
    // 名次
    ctx.setFillStyle('#c41e3a')
    ctx.setFontSize(34)
    ctx.fillText(`第 ${myRank.value.rank} 名`, W / 2, cardY + 56)
    // 荣誉
    ctx.setFillStyle('#8B0000')
    ctx.setFontSize(18)
    ctx.fillText(promotionLabel[myRank.value.status], W / 2, cardY + 92)
    // 得分
    ctx.setFillStyle('#6b7280')
    ctx.setFontSize(14)
    ctx.fillText(`得分 ${myRank.value.score}`, W / 2, cardY + 122)
  } else {
    ctx.setFillStyle('#c41e3a')
    ctx.setFontSize(20)
    ctx.fillText('我正在参赛', W / 2, cardY + 64)
    ctx.setFillStyle('#6b7280')
    ctx.setFontSize(15)
    ctx.fillText('邀你同台竞技', W / 2, cardY + 98)
  }

  // ── 底部真二维码（赛事详情落地链接·带 ref 归因·失败静默降级） ──
  const qrSize = 88
  const qrX = (W - qrSize) / 2
  const qrY = H - qrSize - 28 // 锚定底部：下方留 caption 一行
  const hasQr = drawQrToCanvas(
    ctx,
    withRef(`https://api.rebugx.cn/h5/#/pkg-competition/detail/index?id=${encodeURIComponent(compId.value)}`),
    qrX,
    qrY,
    qrSize,
    { caption: '长按识别 · 一起学', captionColor: '#8a6d4a' },
  )

  ctx.setFillStyle('#8a6d4a')
  ctx.setFontSize(12)
  ctx.setTextAlign('center')
  if (hasQr) {
    // slogan 上移到二维码上方（原底部位置让给 caption）
    ctx.fillText('扫码参与赛事 · 以文会友', W / 2, qrY - 18)
  } else {
    // 静默降级：无二维码维持原 slogan 构图
    ctx.fillText('以文会友 · 传承国学之美', W / 2, H - 18)
  }

  ctx.draw()
}

/** 圆角矩形路径 */
function roundRect(ctx: UniApp.CanvasContext, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/** 文本换行绘制（限定最大行数，超出省略号） */
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
  // 剩余截断加省略号
  const consumed = lines.join('').length
  if (consumed < chars.length && lines.length) {
    let last = lines[lines.length - 1]
    while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1)
    lines[lines.length - 1] = last + '…'
  }
  lines.forEach((l, i) => ctx.fillText(l, cx, top + i * lineH))
}

function onSave() {
  if (submitting.value) return
  submitting.value = true
  uni.canvasToTempFilePath({
    canvasId: 'posterCanvas',
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
        fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' }),
        complete: () => { submitting.value = false },
      })
    },
    fail: () => {
      uni.showToast({ title: '海报生成失败，请重试', icon: 'none' })
      submitting.value = false
    },
  }, instance)
}

function goBack() { navigateBack() }

onLoad((q) => {
  compId.value = (q?.id as string) || ''
  uni.getSystemInfo({
    success: (e) => {
      statusBarHeight.value = e.statusBarHeight || 0
      sysH.value = e.windowHeight || 667
      // 按屏宽适配画布尺寸（保持 2:3 竖版比例·最小高 450 保证底部二维码区不溢出）
      const w = Math.min(320, Math.max(260, (e.windowWidth || 375) - 80))
      canvasW.value = Math.round(w)
      canvasH.value = Math.max(Math.round(w * 1.5), 450)
    },
  })
  load()
})
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f0e8; }
.nav-bar { background: var(--brand); position: sticky; top: 0; z-index: 50; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { color: #fff; font-size: 16px; font-weight: 500; }
.scroll { width: 100%; }

.state { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9ca3af; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e8d8c0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }

.canvas-wrap { display: flex; justify-content: center; padding: 24px 0 12px; }
.poster-canvas { border-radius: 12px; box-shadow: 0 8rpx 28rpx rgba(0,0,0,0.12); background: #fdf6ed; }
.hint { display: block; text-align: center; font-size: 12px; color: #9ca3af; padding: 8px 24px; }

.footer { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1rpx solid #eee; padding: 12px 16px; z-index: 50; }
.footer-btn { height: 46px; background: linear-gradient(135deg, var(--brand), #a01830); border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.footer-btn.disabled { opacity: 0.6; }
.footer-btn-txt { color: #fff; font-size: 16px; font-weight: 600; }
.safe-bottom { height: 24px; }
</style>
