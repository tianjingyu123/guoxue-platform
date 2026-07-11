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

const statusBarHeight = ref(0)
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
      statusBarHeight.value = e.statusBarHeight || 0
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
    <!-- ══ 顶部导航（深底白字·自定义状态栏高度）══ -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" hover-class="btn-press" @tap="goBack">
        <app-icon name="chevron-left" :size="36" color="#ffffff" />
      </view>
      <text class="nav-title serif">结课证书</text>
      <view class="nav-right" />
    </view>

    <!-- ══ 舞台：竖版描金证书卡 + 按钮 ══ -->
    <view class="stage">
      <!-- ── 竖版证书卡（宣纸白底 + 描金双线边框 + 右下朱红印章）── -->
      <view class="cert">
        <view class="cert-inner">
          <view class="cert-inner2">
            <text class="cert-platform serif">{{ BRAND.name }}</text>
            <text class="cert-title serif">结课证书</text>
            <view class="cert-divider" />
            <text class="cert-line">兹证明</text>
            <text class="cert-student serif">{{ cert.studentName }}</text>
            <text class="cert-line">已完成课程</text>
            <text class="cert-course serif">《{{ cert.courseName }}》</text>
            <text class="cert-line">全部课程学习，共计 {{ cert.totalHours }} 学时</text>
            <text v-if="cert.score" class="cert-score">综合评分 {{ cert.score }} 分</text>
            <text class="cert-instructor">授课讲师：{{ cert.instructor }}</text>
            <text class="cert-date">{{ fmtDate(dateStr) }}</text>
            <text class="cert-no">证书编号 {{ cert.certificateNo }}</text>
            <!-- 印章位：右下角朱红圆章（实际上线接入平台电子章图）-->
            <view class="cert-seal"><text class="cert-seal-txt serif">热卜</text><text class="cert-seal-txt serif">国学</text></view>
          </view>
        </view>
      </view>

      <!-- 触点 #9 进阶之路·下一门：证书卡下方·服务端裁决无卡则不渲染（一页一触点） -->
      <touchpoint-card v-if="tp?.card" :card="tp.card" scene="cert_next_course" />

      <!-- ── 底部按钮：保存图片 / 分享 ── -->
      <view class="actions">
        <view class="btn btn-save" :class="{ disabled: submitting }" hover-class="btn-press" @tap="onSavePoster">
          <app-icon name="download" :size="34" color="#ffffff" />
          <text class="btn-txt">{{ submitting ? '生成中...' : '保存图片' }}</text>
        </view>
        <!-- 分享给好友：小程序用原生转发按钮，H5/App 复制炫耀文案+带 ref 链接 -->
        <!-- #ifdef MP-WEIXIN -->
        <button class="btn btn-share share-btn" open-type="share">
          <app-icon name="share-2" :size="34" color="#ffffff" />
          <text class="btn-txt">分享</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="btn btn-share" hover-class="btn-press" @tap="copyShareLink">
          <app-icon name="share-2" :size="34" color="#ffffff" />
          <text class="btn-txt">分享</text>
        </view>
        <!-- #endif -->
      </view>
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
/* ── 整页暖黑背景（#1C1917）衬托证书，分享海报感 ── */
.page { min-height: 100vh; background: #1C1917; display: flex; flex-direction: column; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.btn-press { opacity: 0.7; }

/* ── 顶部导航（深底白字）── */
.nav { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 40rpx; }
.nav-back { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
.nav-title { color: rgba(255,255,255,0.85); font-size: 32rpx; font-weight: 600; letter-spacing: 4rpx; }
.nav-right { width: 72rpx; }

/* ── 舞台 ── */
.stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24rpx 72rpx 48rpx; gap: 56rpx; }

/* ── 竖版证书卡：宣纸白底 + 描金双线边框（X5 兼容：纯色 + 边框，无毛玻璃）── */
.cert { width: 100%; background: #FDFBF7; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 24rpx 96rpx rgba(0,0,0,0.5); }
.cert-inner { border: 4rpx solid #C9A96E; border-radius: 8rpx; padding: 6rpx; }
.cert-inner2 {
  border: 2rpx solid rgba(201,169,110,0.5); border-radius: 4rpx;
  padding: 64rpx 44rpx 52rpx;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  position: relative;
}
.cert-platform { font-size: 24rpx; letter-spacing: 8rpx; color: #C9A96E; font-weight: 600; }
.cert-title { font-size: 52rpx; font-weight: 700; color: #2C2C2C; letter-spacing: 12rpx; margin-top: 20rpx; }
.cert-divider { width: 88rpx; height: 2rpx; background: #C9A96E; margin: 32rpx 0; }
.cert-line { font-size: 26rpx; color: #6E6E73; line-height: 2; }
.cert-student { font-size: 40rpx; font-weight: 700; color: #2C2C2C; margin: 12rpx 0; letter-spacing: 4rpx; }
.cert-course { font-size: 32rpx; font-weight: 700; color: #C41E3A; margin: 12rpx 0 4rpx; line-height: 1.5; }
.cert-score { font-size: 26rpx; font-weight: 700; color: #C9A96E; margin-top: 12rpx; }
.cert-instructor { font-size: 24rpx; color: #6E6E73; margin-top: 28rpx; }
.cert-date { font-size: 24rpx; color: #999999; margin-top: 12rpx; }
.cert-no { font-size: 22rpx; color: #999999; margin-top: 8rpx; font-variant-numeric: tabular-nums; }
/* 印章位：右下角朱红圆章示意（实际为平台电子章图）*/
.cert-seal {
  position: absolute; right: 36rpx; bottom: 88rpx;
  width: 128rpx; height: 128rpx; border-radius: 50%;
  border: 5rpx solid rgba(196,30,58,0.75);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  transform: rotate(-12deg);
}
.cert-seal-txt { font-size: 24rpx; color: rgba(196,30,58,0.85); font-weight: 700; line-height: 1.3; letter-spacing: 2rpx; }

/* ── 底部按钮 ── */
.actions { display: flex; gap: 24rpx; width: 100%; padding: 0 0 16rpx; }
.btn { flex: 1; height: 96rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; gap: 14rpx; }
.btn-txt { font-size: 30rpx; font-weight: 600; color: #fff; }
.btn-save { background: #C41E3A; }
.btn-save.disabled { opacity: 0.6; }
.btn-share { background: rgba(255,255,255,0.12); border: 2rpx solid rgba(255,255,255,0.25); }
/* 原生 button 复位（去默认边框/背景，与 view 版视觉一致） */
.share-btn { padding: 0; line-height: normal; }
.share-btn::after { border: none; }

/* 离屏海报画布：移出可视区但仍参与渲染（小程序 canvasToTempFilePath 要求非 display:none） */
.poster-canvas-offscreen { position: fixed; left: -9999rpx; top: 0; }

/* 加载 / 错误（暗底适配） */
.loading-wrap, .error-wrap { min-height: 100vh; background: #1C1917; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.loading-text, .error-text { font-size: 28rpx; color: rgba(255,255,255,0.7); }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
