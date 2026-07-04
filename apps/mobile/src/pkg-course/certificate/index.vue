<script setup lang="ts">
/** 课程结业证书页 - 从原型 app/courses/certificate/page.tsx 迁移
 * V10 结业证书裂变闭环：证书=社交货币。补齐「保存到相册（canvas 海报）」+「分享给好友（ref 归因裂变）」。 */
import { ref, computed, getCurrentInstance, nextTick, onMounted } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import { withRef } from '@/utils/referral'
import AppIcon from '@/components/common/app-icon.vue'
import TouchpointCard from '@/components/common/touchpoint-card.vue'
import { courseApi } from '@/lib/course-data'
import { touchpointApi, type TouchpointResult } from '@/lib/touchpoint-data'
import { BRAND } from '@/lib/brand'

const instance = getCurrentInstance()?.proxy

const loading = ref(true)
const error = ref('')
const courseId = ref('')
const submitting = ref(false)

// 证书详情对象，模板 v-else 裸访问字段，保留 any 避免 null 链式报错
const cert = ref<any>(null)

const dateStr = computed(() => cert.value?.completedAt ?? '')

// 竖版海报画布尺寸（2:3），onLoad 按屏宽适配
const canvasW = ref(300)
const canvasH = ref(450)

function fmtDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

// 触点 #9 证书下一课（服务端按同一级品类召回·排除本课与已购·show:false 或异常一律不渲染）
const tp = ref<TouchpointResult | null>(null)
async function loadTouchpoint() {
  tp.value = await touchpointApi.get('cert_next_course', { courseId: courseId.value })
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await courseApi.getCertificate(courseId.value)
    cert.value = res
    // 触点不 await：失败静默不出，绝不阻塞证书展示
    loadTouchpoint()
    // 数据就绪后预绘海报，保证「保存到相册」即时可导出
    await nextTick()
    setTimeout(drawPoster, 60)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// ============ 分享给好友（裂变核心）============
// 标题带「炫耀感+召唤感」，path 指向课程详情页；withRef 自动追加当前用户 ref，好友点开即归因
const shareTitle = computed(() => `我在${BRAND.name}完成了《${cert.value?.courseName || '国学好课'}》结课！`)
const sharePath = computed(() => `/courses/${cert.value?.courseId || courseId.value}`)

const { toAppMessage, toTimeline } = useShare()
// 微信小程序原生转发：底部 open-type="share" 按钮 / 右上角菜单触发
onShareAppMessage(() => toAppMessage({ title: shareTitle.value, path: sharePath.value }))
onShareTimeline(() => toTimeline({ title: shareTitle.value, path: sharePath.value }))

/** H5/App 端：复制炫耀文案 + 带 ref 的完整链接到剪贴板（好友点开自动记归因） */
function copyShareLink() {
  const link = withRef(`https://api.rebugx.cn/h5/#${sharePath.value}`)
  const text = `${shareTitle.value} 快来和我一起研习国学吧 👉 ${link}`
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '炫耀文案已复制，去粘贴给好友吧', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' }),
  })
}

// ============ 保存到相册（canvas 海报）============
/** 绘制竖版结业证书海报（主色块 + 白卡信息区 + 底部平台标识/二维码占位） */
function drawPoster() {
  const c = cert.value
  if (!c) return
  const W = canvasW.value
  const H = canvasH.value
  const ctx = uni.createCanvasContext('certPosterCanvas', instance)

  // 背景
  ctx.setFillStyle('#fdf8f3')
  ctx.fillRect(0, 0, W, H)
  // 米色内边框
  ctx.setStrokeStyle('#e8d5b5')
  ctx.setLineWidth(2)
  ctx.strokeRect(10, 10, W - 20, H - 20)

  // ── 顶部主色块 ──
  const headH = 118
  ctx.setFillStyle('#C9A96E')
  ctx.fillRect(10, 10, W - 20, headH)
  ctx.setFillStyle('rgba(255,255,255,0.9)')
  ctx.setFontSize(12)
  ctx.setTextAlign('center')
  ctx.fillText(`${BRAND.name}传统文化平台`, W / 2, 42)
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(30)
  ctx.fillText('结 业 证 书', W / 2, 82)
  ctx.setFontSize(11)
  ctx.setFillStyle('rgba(255,255,255,0.85)')
  ctx.fillText('CERTIFICATE OF COMPLETION', W / 2, 104)

  // ── 中部白卡信息区 ──
  const cardX = 26
  const cardY = 10 + headH + 22
  const cardW = W - 52
  const cardH = 176
  ctx.setFillStyle('#ffffff')
  roundRect(ctx, cardX, cardY, cardW, cardH, 12)
  ctx.fill()

  ctx.setTextAlign('center')
  // 学员名
  ctx.setFillStyle('#2c2c2c')
  ctx.setFontSize(24)
  ctx.fillText(c.studentName || '学员', W / 2, cardY + 44)
  ctx.setFillStyle('#666666')
  ctx.setFontSize(13)
  ctx.fillText('已完成', W / 2, cardY + 70)
  // 课程名
  ctx.setFillStyle('#C9A96E')
  ctx.setFontSize(17)
  drawWrapped(ctx, `《${c.courseName || ''}》`, W / 2, cardY + 96, cardW - 24, 22, 2)
  // 学时
  ctx.setFillStyle('#666666')
  ctx.setFontSize(12)
  ctx.fillText(`全部课程学习，共计 ${c.totalHours || 0} 学时`, W / 2, cardY + 138)

  // 分隔线
  ctx.setStrokeStyle('#e8d5b5')
  ctx.setLineWidth(1)
  ctx.beginPath()
  ctx.moveTo(cardX + 20, cardY + 150)
  ctx.lineTo(cardX + cardW - 20, cardY + 150)
  ctx.stroke()
  // 讲师 / 日期
  ctx.setFillStyle('#8a6d4a')
  ctx.setFontSize(11)
  ctx.setTextAlign('left')
  ctx.fillText(`授课讲师：${c.instructor || '—'}`, cardX + 16, cardY + 168)
  ctx.setTextAlign('right')
  ctx.fillText(`颁发日期：${fmtDate(dateStr.value)}`, cardX + cardW - 16, cardY + 168)

  // ── 底部二维码占位 + 编号 ──
  const qrSize = 66
  const qrX = (W - qrSize) / 2
  const qrY = cardY + cardH + 22
  ctx.setFillStyle('#eef0f2')
  ctx.fillRect(qrX, qrY, qrSize, qrSize)
  ctx.setFillStyle('#9ca3af')
  ctx.setFontSize(10)
  ctx.setTextAlign('center')
  ctx.fillText('扫码开启国学之旅', W / 2, qrY + qrSize + 16)
  ctx.setFillStyle('#c4b59a')
  ctx.setFontSize(8)
  ctx.fillText('（二维码占位 · 上线后接入）', W / 2, qrY + qrSize + 30)
  ctx.setFillStyle('#b0a48c')
  ctx.setFontSize(9)
  ctx.fillText(`证书编号：${c.certificateNo || ''}`, W / 2, H - 20)

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
  const consumed = lines.join('').length
  if (consumed < chars.length && lines.length) {
    let last = lines[lines.length - 1]
    while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1)
    lines[lines.length - 1] = last + '…'
  }
  lines.forEach((l, i) => ctx.fillText(l, cx, top + i * lineH))
}

/** 保存证书海报到相册（防重复；H5 降级为预览长按保存） */
function onSavePoster() {
  if (submitting.value || !cert.value) return
  submitting.value = true
  drawPoster()
  setTimeout(() => {
    uni.canvasToTempFilePath({
      canvasId: 'certPosterCanvas',
      success: (res) => {
        // #ifdef H5
        uni.previewImage({ urls: [res.tempFilePath], current: res.tempFilePath })
        uni.showToast({ title: '长按图片可保存到相册', icon: 'none' })
        submitting.value = false
        // #endif
        // #ifndef H5
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => uni.showToast({ title: '证书已保存到相册', icon: 'success' }),
          fail: (err) => {
            if (/auth|deny|授权/.test(err.errMsg || '')) {
              uni.showModal({ title: '提示', content: '需要相册权限才能保存，请在设置中开启', showCancel: false })
            } else {
              uni.showToast({ title: '保存失败，请重试', icon: 'none' })
            }
          },
          complete: () => { submitting.value = false },
        })
        // #endif
      },
      fail: () => {
        uni.showToast({ title: '海报生成失败，请重试', icon: 'none' })
        submitting.value = false
      },
    }, instance)
  }, 60)
}

onLoad((options) => {
  courseId.value = options?.id || '1'
  uni.getSystemInfo({
    success: (e) => {
      // 按屏宽适配画布尺寸（保持 2:3 竖版比例）
      const w = Math.min(320, Math.max(260, (e.windowWidth || 375) - 80))
      canvasW.value = Math.round(w)
      canvasH.value = Math.round(w * 1.5)
    },
  })
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <!-- Loading -->
  <view v-if="loading" class="loading-wrap">
    <text class="loading-text">加载中...</text>
  </view>
  <!-- Error -->
  <view v-else-if="error" class="error-wrap">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <!-- Content -->
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#ffffff" /></view>
      <text class="nav-title">结业证书</text>
      <view class="nav-right" />
    </view>

    <!-- 恭喜提示 -->
    <view class="congrats-wrap">
      <view class="congrats">
        <app-icon name="check-circle" :size="32" color="#C9A96E" />
        <text class="congrats-txt">恭喜您完成课程学习！</text>
      </view>
    </view>

    <!-- 证书展示（产品中由 canvas 生成图填充；比对时图片被中和露出底色） -->
    <view class="cert-area">
      <view class="cert-card">
        <view class="cert-inner">
          <view class="cert-badge"><text class="cert-star">★</text></view>
          <text class="cert-title">结业证书</text>
          <text class="cert-en">CERTIFICATE OF COMPLETION</text>
          <text class="cert-name">{{ cert.studentName }}</text>
          <text class="cert-desc">已完成</text>
          <text class="cert-course">《{{ cert.courseName }}》</text>
          <text class="cert-hours">全部课程学习，共计 {{ cert.totalHours }} 学时</text>
          <text v-if="cert.score" class="cert-score">综合评分：{{ cert.score }} 分</text>
          <view class="cert-divider" />
          <view class="cert-foot">
            <view class="cert-foot-col left">
              <text class="cert-foot-label">授课讲师</text>
              <text class="cert-foot-val italic">{{ cert.instructor }}</text>
            </view>
            <view class="cert-foot-col right">
              <text class="cert-foot-label">颁发日期</text>
              <text class="cert-foot-val">{{ fmtDate(dateStr) }}</text>
            </view>
          </view>
          <text class="cert-no">证书编号：{{ cert.certificateNo }}</text>
          <text class="cert-platform">{{ BRAND.name }}</text>
        </view>
      </view>
    </view>

    <!-- 触点 #9 进阶之路·下一门：证书卡下方·服务端裁决无卡则不渲染（一页一触点） -->
    <touchpoint-card v-if="tp?.card" :card="tp.card" scene="cert_next_course" />

    <!-- 证书信息 -->
    <view class="info-card">
      <view class="info-grid">
        <view class="info-item">
          <app-icon name="user" :size="28" color="#C9A96E" />
          <text class="info-label">学员：</text>
          <text class="info-val">{{ cert.studentName }}</text>
        </view>
        <view class="info-item">
          <app-icon name="clock" :size="28" color="#C9A96E" />
          <text class="info-label">学时：</text>
          <text class="info-val">{{ cert.totalHours }}小时</text>
        </view>
        <view class="info-item">
          <app-icon name="calendar" :size="28" color="#C9A96E" />
          <text class="info-label">日期：</text>
          <text class="info-val">{{ fmtDate(dateStr) }}</text>
        </view>
        <view class="info-item">
          <app-icon name="qr-code" :size="28" color="#C9A96E" />
          <text class="info-label">编号：</text>
          <text class="info-val small">{{ cert.certificateNo }}</text>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="actions">
      <view class="btn-primary" :class="{ disabled: submitting }" @tap="onSavePoster">
        <app-icon name="download" :size="40" color="#ffffff" />
        <text class="btn-primary-txt">{{ submitting ? '生成中...' : '保存到相册' }}</text>
      </view>
      <!-- 分享给好友：小程序用原生转发按钮，H5/App 复制炫耀文案+带 ref 链接 -->
      <!-- #ifdef MP-WEIXIN -->
      <button class="btn-secondary share-btn" open-type="share">
        <app-icon name="share-2" :size="40" color="#ffffff" />
        <text class="btn-secondary-txt">分享给好友</text>
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="btn-secondary" @tap="copyShareLink">
        <app-icon name="share-2" :size="40" color="#ffffff" />
        <text class="btn-secondary-txt">分享给好友</text>
      </view>
      <!-- #endif -->
    </view>

    <!-- 离屏海报画布（不占布局，供「保存到相册」导出图片） -->
    <canvas
      canvas-id="certPosterCanvas"
      class="poster-canvas-offscreen"
      :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
    />
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(to bottom, #1a1a2e, #16213e); display: flex; flex-direction: column; }

.nav { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.nav-back { width: 80rpx; height: 80rpx; border-radius: 999rpx; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 30rpx; font-weight: 500; color: #fff; }
.nav-right { width: 80rpx; }

.congrats-wrap { padding: 16rpx 32rpx; text-align: center; }
.congrats { display: inline-flex; align-items: center; gap: 16rpx; padding: 16rpx 32rpx; border-radius: 999rpx; background: linear-gradient(to right, rgba(201,169,110,0.2), rgba(196,30,58,0.2)); }
.congrats-txt { font-size: 26rpx; color: #C9A96E; }

.cert-area { flex: 1; display: flex; align-items: center; justify-content: center; padding: 32rpx; }
.cert-card { width: 100%; max-width: 670rpx; aspect-ratio: 3 / 4; background: linear-gradient(to bottom, #FDF8F3, #F5EDE4); border: 6rpx solid #C9A96E; border-radius: 16rpx; box-shadow: 0 24rpx 64rpx rgba(0,0,0,0.5); padding: 20rpx; }
.cert-inner { width: 100%; height: 100%; border: 2rpx solid #E8D5B5; border-radius: 8rpx; display: flex; flex-direction: column; align-items: center; padding: 32rpx 40rpx; }
.cert-badge { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; margin-top: 8rpx; }
.cert-star { font-size: 40rpx; color: #fff; }
.cert-title { font-size: 48rpx; font-weight: 700; color: var(--brand); margin-top: 24rpx; font-family: serif; }
.cert-en { font-size: 18rpx; color: #999; margin-top: 8rpx; letter-spacing: 1rpx; }
.cert-name { font-size: 44rpx; font-weight: 700; color: #2C2C2C; margin-top: 40rpx; }
.cert-desc { font-size: 24rpx; color: #666; margin-top: 24rpx; }
.cert-course { font-size: 32rpx; font-weight: 700; color: var(--brand); margin-top: 16rpx; font-family: serif; }
.cert-hours { font-size: 22rpx; color: #666; margin-top: 16rpx; }
.cert-score { font-size: 28rpx; font-weight: 700; color: #C9A96E; margin-top: 16rpx; }
.cert-divider { width: 80%; height: 1rpx; background: #E8D5B5; margin: 32rpx 0; }
.cert-foot { width: 100%; display: flex; justify-content: space-between; }
.cert-foot-col { display: flex; flex-direction: column; gap: 8rpx; }
.cert-foot-col.right { align-items: flex-end; }
.cert-foot-label { font-size: 20rpx; color: #666; }
.cert-foot-val { font-size: 26rpx; color: #2C2C2C; }
.cert-foot-val.italic { font-style: italic; font-family: serif; }
.cert-no { font-size: 18rpx; color: #999; margin-top: 24rpx; }
.cert-platform { font-size: 22rpx; font-weight: 700; color: var(--brand); margin-top: 12rpx; }

.info-card { margin: 0 32rpx 32rpx; padding: 24rpx 32rpx; background: rgba(255,255,255,0.05); border-radius: 24rpx; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32rpx; }
.info-item { display: flex; align-items: center; gap: 12rpx; }
.info-label { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.info-val { font-size: 26rpx; color: #fff; }
.info-val.small { font-size: 22rpx; }

.actions { padding: 32rpx; padding-bottom: 64rpx; display: flex; flex-direction: column; gap: 24rpx; }
.btn-primary { height: 96rpx; border-radius: 999rpx; background: linear-gradient(to right, var(--brand), #E74C3C); display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.btn-primary.disabled { opacity: 0.6; }
.btn-primary-txt { font-size: 30rpx; font-weight: 500; color: #fff; }
.btn-secondary { height: 96rpx; border-radius: 999rpx; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.btn-secondary-txt { font-size: 30rpx; font-weight: 500; color: #fff; }
/* 原生 button 复位（去默认边框/背景，与 view 版视觉一致） */
.share-btn { padding: 0; line-height: normal; border: none; }
.share-btn::after { border: none; }

/* 离屏海报画布：移出可视区但仍参与渲染（小程序 canvasToTempFilePath 要求非 display:none） */
.poster-canvas-offscreen { position: fixed; left: -9999rpx; top: 0; }

/* 加载 / 错误 */
.loading-wrap, .error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.loading-text, .error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
