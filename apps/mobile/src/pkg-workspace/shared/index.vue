<script setup lang="ts">
/**
 * 只读交付报告（对应 V0 readonly-report.tsx）—— 客户看到的那一面
 *
 * 无需登录：令牌即凭证（老师生成的高熵随机 token）。老师撤回后立刻 404。
 * 这是平台交到客户手里的**门面**，所以：
 *  · 落款用老师的品牌（工作室名/印章/联系方式），报告是他的作品
 *  · 免责声明固定挂底部，不可被去掉（合规红线 R3/R4）
 */
import { getCurrentInstance, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { drawQrToCanvas } from '@/utils/qrcode'

const instance = getCurrentInstance()
const loading = ref(true)
const notFound = ref(false)
const loadFailed = ref(false)
const data = ref<any>(null)

/**
 * 打印 / 存 PDF：H5 直接调浏览器打印（打印对话框里可选「另存为 PDF」）。
 * 打印样式见 @media print：隐掉操作条、白底、章节不跨页断开。
 */
const canPrint = typeof window !== 'undefined' && typeof window.print === 'function'
function printReport() {
  if (!canPrint) {
    uni.showToast({ title: '请在浏览器中打开本链接后打印', icon: 'none' })
    return
  }
  window.print()
}

/** 在线版地址：纸质/电子版上印二维码，客户扫码即可在线查阅并向老师的助理提问 */
const onlineUrl = ref('')
function drawQr() {
  if (typeof window === 'undefined') return
  onlineUrl.value = window.location.href
  setTimeout(() => {
    try {
      const ctx = uni.createCanvasContext('sr-qr', instance)
      drawQrToCanvas(ctx, onlineUrl.value, 0, 0, 80)
      ctx.draw()
    } catch {
      // 画不出二维码不影响阅读
    }
  }, 120)
}

// ── 客户提问：看不懂的地方直接问，答的是老师的助理 ──
// 同样直连 uni.request：客户没有登录态，不能走带鉴权拦截的请求层。
const shareToken = ref('')
const askInput = ref('')
const asking = ref(false)
const askItems = ref<{ role: 'user' | 'assistant'; text: string }[]>([])
const askRemaining = ref<number | null>(null)

async function sendAsk() {
  const q = askInput.value.trim()
  if (!q || asking.value || !shareToken.value) return
  if (askRemaining.value === 0) {
    uni.showToast({ title: '今日提问次数已用完', icon: 'none' })
    return
  }
  askInput.value = ''
  askItems.value.push({ role: 'user', text: q })
  asking.value = true
  try {
    const history = askItems.value.slice(-5, -1).map((m) => ({ role: m.role, content: m.text }))
    const res = await new Promise<any>((resolve, reject) => {
      uni.request({
        url: `${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/practitioner/reports/shared/${shareToken.value}/ask`,
        method: 'POST',
        data: { question: q, history },
        success: (r) => resolve(r),
        fail: reject,
      })
    })
    const body = res?.data
    if (res.statusCode === 404 || res.statusCode === 410) {
      data.value = null
      askItems.value = []
      askInput.value = ''
      notFound.value = true
      return
    }
    if (res.statusCode === 429 && typeof body?.message === 'string' && body.message.includes('今天的提问次数已用完')) {
      askRemaining.value = 0
    }
    if (res.statusCode !== 200 || !body?.data) {
      throw new Error(body?.message || '暂时没能回答，请稍后再试')
    }
    askItems.value.push({ role: 'assistant', text: body.data.answer })
    askRemaining.value = body.data.remaining ?? null
  } catch (e) {
    askItems.value.pop()
    askInput.value = q
    uni.showToast({ title: (e as Error)?.message || '暂时没能回答，请稍后重试', icon: 'none' })
  } finally {
    asking.value = false
  }
}

/** 平台兜底免责声明：老师没自定义时用这句 */
const DEFAULT_DISCLAIMER =
  '本报告为传统文化解读，仅供参考，不构成医疗、投资、法律或其他专业决策依据。'

async function loadReport() {
  const token = shareToken.value
  if (!token) {
    notFound.value = true
    loading.value = false
    return
  }
  loading.value = true
  notFound.value = false
  loadFailed.value = false
  try {
    // 用 uni.request 直连而非 apiGet：这是公开页，客户没有登录态，
    // 走带鉴权拦截的请求层会在 401 时把人踢去登录页。
    const res = await new Promise<any>((resolve, reject) => {
      uni.request({
        url: `${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/practitioner/reports/shared/${token}`,
        method: 'GET',
        success: (r) => resolve(r),
        fail: reject,
      })
    })
    const body = res?.data
    if (res.statusCode === 404 || res.statusCode === 410) {
      data.value = null
      askItems.value = []
      notFound.value = true
    } else if (res.statusCode !== 200 || !body?.data) {
      data.value = null
      loadFailed.value = true
    } else {
      data.value = body.data
      askRemaining.value = null
      drawQr()
    }
  } catch {
    data.value = null
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  shareToken.value = (q?.token as string) || ''
  loadReport()
})

function dateText(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}
</script>

<template>
  <app-safe-area-top />
  <view class="sr">
    <view v-if="loading" class="sr-loading">
      <text class="sr-loading-txt">载入中…</text>
    </view>

    <view v-else-if="notFound" class="sr-404">
      <AppIcon name="file-text" :size="48" color="#D5C9B8" />
      <text class="sr-404-txt">报告不存在或已被撤回</text>
      <text class="sr-404-sub">请联系为你出具报告的老师</text>
    </view>

    <view v-else-if="loadFailed" class="sr-404">
      <AppIcon name="alert-circle" :size="48" color="#C41E3A" />
      <text class="sr-404-txt">报告暂时无法加载</text>
      <text class="sr-404-sub">检查网络后重试</text>
      <view class="sr-retry" @tap="loadReport">重新加载</view>
    </view>

    <scroll-view v-else class="sr-body" scroll-y :show-scrollbar="false">
      <!-- 封面 -->
      <view class="sr-cover">
        <text class="sr-cover-brand">{{ data.brand.brandName || data.typeLabel || '命理咨询报告' }}</text>
        <view class="sr-cover-line" />
        <text class="sr-cover-title">{{ data.title }}</text>
        <text class="sr-cover-type">{{ data.typeLabel }}</text>
        <view class="sr-cover-meta">
          <text class="sr-cover-meta-txt">受测人：{{ data.clientName }}</text>
          <text v-if="data.clientBirth" class="sr-cover-meta-txt">生辰：{{ data.clientBirth }}</text>
        </view>
        <text v-if="data.brand.slogan" class="sr-cover-slogan">{{ data.brand.slogan }}</text>
      </view>

      <!-- 盘面 -->
      <view v-if="data.paipan" class="sr-card">
        <text class="sr-card-title">盘面</text>
        <text class="sr-card-sub">{{ data.paipan.toolLabel }}</text>
        <text v-if="data.paipan.summary" class="sr-paipan-summary">{{ data.paipan.summary }}</text>
      </view>

      <!-- 正文 -->
      <view v-for="(c, i) in data.chapters || []" :key="c.key" class="sr-card">
        <view class="sr-ch-head">
          <text class="sr-ch-idx">{{ i + 1 }}</text>
          <text class="sr-ch-title">{{ c.title }}</text>
        </view>
        <text class="sr-ch-body">{{ c.body || '（本章暂无内容）' }}</text>
        <text v-if="c.ai" class="sr-ai-note">本章由 AI 起草，请结合盘面与实际情况核对</text>
      </view>

      <!-- 落款 -->
      <view class="sr-sign">
        <view class="sr-sign-left">
          <text v-if="data.brand.title" class="sr-sign-title">{{ data.brand.title }}</text>
          <text class="sr-sign-brand">{{ data.brand.brandName || '' }}</text>
          <text v-if="data.sharedAt" class="sr-sign-date">{{ dateText(data.sharedAt) }}</text>
          <text v-if="data.brand.contact" class="sr-sign-contact">{{ data.brand.contact }}</text>
        </view>
        <view v-if="data.brand.sealText" class="sr-seal">
          <text class="sr-seal-txt">{{ data.brand.sealText }}</text>
        </view>
      </view>

      <!-- 有看不懂的地方，直接问：答的是老师的助理，只依据这份报告 -->
      <view class="sr-ask no-print">
        <text class="sr-ask-title">有看不懂的地方？直接问</text>
        <text class="sr-ask-sub">{{ data.brand.brandName ? `由${data.brand.brandName}的助理为你解答` : '由老师的助理为你解答' }}，只依据这份报告作答</text>

        <view v-if="askItems.length" class="sr-ask-list">
          <view v-for="(m, i) in askItems" :key="i" class="sr-ask-msg" :class="m.role === 'user' ? 'sr-ask-user' : 'sr-ask-bot'">
            <text class="sr-ask-txt">{{ m.text }}</text>
          </view>
        </view>

        <view class="sr-ask-bar">
          <input
            v-model="askInput"
            class="sr-ask-input"
            type="text"
            :disabled="asking || askRemaining === 0"
            placeholder="例如：报告里说的「身弱」是什么意思？"
            confirm-type="send"
            @confirm="sendAsk"
          />
          <view class="sr-ask-send" :class="{ 'sr-ask-send--off': !askInput.trim() || asking }" @tap="sendAsk">
            <text class="sr-ask-send-txt">{{ asking ? '…' : '发送' }}</text>
          </view>
        </view>
        <text v-if="askRemaining === 0" class="sr-ask-left">今日提问次数已用完，如还有疑问，请直接联系老师；次日重新打开报告可继续提问</text>
        <text v-else-if="askRemaining !== null && askRemaining <= 5" class="sr-ask-left">今日还可提问 {{ askRemaining }} 次</text>
      </view>

      <!-- 扫码在线查阅：纸质版与电子版印在这里，客户扫码即可随时打开并提问 -->
      <view class="sr-qr-wrap">
        <canvas id="sr-qr" canvas-id="sr-qr" class="sr-qr" />
        <view class="sr-qr-text">
          <text class="sr-qr-title">扫码在线查阅本报告</text>
          <text class="sr-qr-sub">手机扫一扫，随时打开这份报告；有看不懂的地方可以直接提问</text>
        </view>
      </view>

      <!-- 免责声明（合规红线：不可去掉） -->
      <view class="sr-disclaimer">
        <text class="sr-disclaimer-txt">{{ data.brand.disclaimer || DEFAULT_DISCLAIMER }}</text>
      </view>

      <view class="sr-actions no-print">
        <view class="sr-btn" @tap="printReport">
          <app-icon name="printer" :size="30" color="#2E4B58" />
          <text class="sr-btn-txt">打印 / 存为 PDF</text>
        </view>
      </view>

      <view class="sr-space" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.sr {
  min-height: 100vh;
  background: #F2ECE0;
}

.sr-loading,
.sr-404 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  min-height: 100vh;
}

.sr-loading-txt {
  font-size: 26rpx;
  color: #9A8C7E;
}

.sr-404-txt {
  font-size: 30rpx;
  color: #7A6C5E;
}

.sr-404-sub {
  font-size: 24rpx;
  color: #B8AA9A;
}

.sr-body {
  height: 100vh;
  padding: 32rpx 32rpx 0;
  box-sizing: border-box;
}

/* 封面 */
.sr-cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 40rpx;
  margin-bottom: 24rpx;
  border-radius: 16rpx;
  background: #FDFAF4;
  border: 2rpx solid rgba(196, 30, 58, 0.2);
}

.sr-cover-brand {
  font-size: 24rpx;
  letter-spacing: 4rpx;
  color: #9A8C7E;
}

.sr-cover-line {
  width: 80rpx;
  height: 2rpx;
  margin: 24rpx 0;
  background: rgba(196, 30, 58, 0.35);
}

.sr-cover-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #3A2A1E;
  text-align: center;
  line-height: 1.4;
}

.sr-cover-type {
  margin-top: 12rpx;
  padding: 4rpx 20rpx;
  border-radius: 20rpx;
  background: rgba(196, 30, 58, 0.08);
  font-size: 22rpx;
  color: #C41E3A;
}

.sr-cover-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  margin-top: 32rpx;
}

.sr-cover-meta-txt {
  font-size: 24rpx;
  color: #7A6C5E;
}

.sr-cover-slogan {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: #B8AA9A;
  font-style: italic;
}

/* 卡片 */
.sr-card {
  padding: 32rpx;
  margin-bottom: 24rpx;
  border-radius: 16rpx;
  background: #FDFAF4;
}

.sr-card-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.sr-card-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.sr-paipan-summary {
  display: block;
  margin-top: 20rpx;
  font-size: 26rpx;
  line-height: 1.8;
  color: #3A2A1E;
}

.sr-ch-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 20rpx;
}

.sr-ch-idx {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #C41E3A;
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}

.sr-ch-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.sr-ch-body {
  font-size: 28rpx;
  line-height: 2;
  color: #3A2A1E;
  white-space: pre-wrap;
}

.sr-retry { padding: 16rpx 32rpx; border-radius: 12rpx; background: #C41E3A; color: #fff; font-size: 24rpx; }

.sr-ai-note { display: block; margin-top: 16rpx; font-size: 21rpx; color: #9A8C7E; }

/* 落款 */
.sr-sign {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 32rpx;
  margin-bottom: 24rpx;
  border-radius: 16rpx;
  background: #FDFAF4;
}

.sr-sign-left {
  flex: 1;
  min-width: 0;
}

.sr-sign-title {
  display: block;
  font-size: 22rpx;
  color: #9A8C7E;
}

.sr-sign-brand {
  display: block;
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.sr-sign-date {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.sr-sign-contact {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.sr-seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  flex-shrink: 0;
  border-radius: 12rpx;
  background: #C41E3A;
  transform: rotate(-6deg);
}

.sr-seal-txt {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
  text-align: center;
  line-height: 1.3;
}

/* 免责 */
.sr-disclaimer {
  padding: 24rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.1);
}

.sr-disclaimer-txt {
  font-size: 21rpx;
  line-height: 1.7;
  color: #9A8C7E;
}

.sr-space {
  height: 60rpx;
}

/* 扫码入口 */
.sr-qr-wrap { display: flex; align-items: center; gap: 24rpx; margin: 24rpx 32rpx; padding: 24rpx; border-radius: 16rpx; background: rgba(0, 0, 0, 0.03); }
.sr-qr { width: 160rpx; height: 160rpx; flex-shrink: 0; background: #fff; }
.sr-qr-text { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.sr-qr-title { font-size: 26rpx; font-weight: 700; color: #2E4B58; }
.sr-qr-sub { font-size: 22rpx; color: #888; line-height: 1.5; }

/* 操作条 */
.sr-actions { display: flex; justify-content: center; margin: 24rpx 32rpx 0; }
.sr-btn { display: flex; align-items: center; gap: 12rpx; padding: 20rpx 40rpx; border-radius: 999rpx; border: 2rpx solid rgba(46, 75, 88, 0.3); }
.sr-btn-txt { font-size: 26rpx; color: #2E4B58; }

/* 打印：客户拿到的纸质版 —— 去掉屏幕上的操作元素，章节不跨页断开 */
@media print {
  .no-print { display: none !important; }
  page, .sr-page { background: #fff !important; }
  .sr-card, .sr-sign, .sr-qr-wrap { break-inside: avoid; page-break-inside: avoid; }
  .sr-ch-body { color: #000 !important; }
}

/* 客户提问区 */
.sr-ask { margin: 24rpx 32rpx; padding: 24rpx; border-radius: 16rpx; background: rgba(46, 75, 88, 0.05); display: flex; flex-direction: column; gap: 10rpx; }
.sr-ask-title { font-size: 28rpx; font-weight: 700; color: #2E4B58; }
.sr-ask-sub { font-size: 22rpx; color: #888; line-height: 1.5; }
.sr-ask-list { display: flex; flex-direction: column; gap: 10rpx; margin: 8rpx 0; }
.sr-ask-msg { max-width: 86%; padding: 14rpx 18rpx; border-radius: 14rpx; }
.sr-ask-user { align-self: flex-end; background: rgba(46, 75, 88, 0.12); }
.sr-ask-bot { align-self: flex-start; background: #fff; }
.sr-ask-txt { font-size: 25rpx; color: #333; line-height: 1.7; }
.sr-ask-bar { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; }
.sr-ask-input { flex: 1; height: 72rpx; padding: 0 20rpx; border-radius: 999rpx; background: #fff; font-size: 25rpx; }
.sr-ask-send { padding: 0 28rpx; height: 72rpx; display: flex; align-items: center; border-radius: 999rpx; background: #2E4B58; }
.sr-ask-send--off { opacity: 0.45; }
.sr-ask-send-txt { font-size: 25rpx; color: #fff; }
.sr-ask-left { font-size: 21rpx; color: #999; }
</style>
