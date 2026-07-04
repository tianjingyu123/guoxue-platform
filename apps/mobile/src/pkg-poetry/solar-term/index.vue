<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @tap="onBack"><text class="nav-ico">‹</text></view>
        <text class="nav-title">节气仪式</text>
        <view class="nav-btn" />
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">加载中...</text>
    </view>

    <!-- error -->
    <view v-else-if="error" class="state">
      <text class="state-emoji">☁️</text>
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <scroll-view v-else scroll-y class="scroll">
      <!-- ─── 节气日：当期节气卡 ─── -->
      <view v-if="isTermDay && current" class="term-card">
        <view class="term-head">
          <text class="term-label">今日节气</text>
          <text class="term-name">{{ current.name }}</text>
          <text class="term-date">{{ current.date }}</text>
        </view>

        <view class="term-poem-wrap">
          <text class="term-poem">{{ current.poem }}</text>
        </view>

        <view class="term-rows">
          <view class="term-row">
            <text class="row-tag">三候</text>
            <text class="row-val">{{ current.sanHou }}</text>
          </view>
          <view class="term-row">
            <text class="row-tag">习俗</text>
            <text class="row-val">{{ current.custom }}</text>
          </view>
          <view class="term-row">
            <text class="row-tag">养生</text>
            <text class="row-val">{{ current.health }}</text>
          </view>
        </view>

        <!-- 参与 / 已参与 -->
        <view
          v-if="!myParticipated"
          class="join-btn"
          :class="{ disabled: submitting }"
          @tap="onParticipate"
        >
          <text class="join-txt">{{ submitting ? '参与中...' : '参与今日节气' }}</text>
        </view>
        <view v-else class="joined-box">
          <text class="joined-txt">✓ 今日已参与</text>
          <view class="joined-share" @tap="openCard"><text class="joined-share-txt">分享我的节气成就卡</text></view>
        </view>
      </view>

      <!-- ─── 非节气日：距下一节气 ─── -->
      <view v-else class="next-card">
        <text class="next-hint">今日非节气日</text>
        <text class="next-main">距下一节气</text>
        <text class="next-name">{{ next.name }}</text>
        <view class="next-days">
          <text class="next-num">{{ next.daysUntil }}</text>
          <text class="next-unit">天</text>
        </view>
        <text class="next-tip">节气当日回来参与仪式，得限定成就</text>
      </view>

      <!-- 触点 #4 节气礼盒：仪式参与区块之后·服务端无卡（场景标签未上线）则不渲染 -->
      <touchpoint-card v-if="tp?.card" :card="tp.card" scene="jieqi_gift" />

      <!-- ─── 集齐进度区 ─── -->
      <view class="collect-card">
        <text class="collect-title">节气集齐进度</text>

        <template v-if="isLoggedIn">
          <view v-if="myLoading" class="collect-loading"><view class="spinner sm" /></view>
          <template v-else>
            <!-- 进度环 -->
            <view class="ring-wrap">
              <view class="ring" :style="ringStyle">
                <view class="ring-inner">
                  <text class="ring-num">{{ uniqueTerms }}</text>
                  <text class="ring-total">/ 24</text>
                </view>
              </view>
            </view>

            <!-- 里程碑成就 -->
            <view class="milestones">
              <view
                v-for="m in milestones"
                :key="m.threshold"
                class="milestone"
                :class="{ got: uniqueTerms >= m.threshold }"
              >
                <text class="ms-badge">{{ uniqueTerms >= m.threshold ? '🏅' : '🔒' }}</text>
                <text class="ms-label">{{ m.label }}</text>
                <text class="ms-cond">集齐{{ m.threshold }}</text>
              </view>
            </view>

            <!-- 已参与列表 -->
            <view v-if="participated.length" class="parted-list">
              <text class="parted-title">已参与</text>
              <view class="parted-chips">
                <text v-for="(p, i) in participated" :key="i" class="chip">{{ p.termName }}·{{ p.year }}</text>
              </view>
            </view>
            <view v-else class="parted-empty">
              <text class="parted-empty-txt">还没有参与记录，节气日来赴一场文化之约</text>
            </view>
          </template>
        </template>

        <!-- 未登录引导 -->
        <view v-else class="collect-guest">
          <text class="guest-txt">登录后查看你的节气集齐进度</text>
          <view class="guest-btn" @tap="goLogin"><text class="guest-btn-txt">去登录</text></view>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- ─── 成就卡弹层 ─── -->
    <view v-if="cardVisible" class="overlay" @tap="closeCard">
      <view class="card-modal" @tap.stop>
        <view class="card-canvas-wrap">
          <canvas
            canvas-id="solarTermCard"
            class="card-canvas"
            :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
          />
        </view>
        <view class="card-actions">
          <button class="card-btn share" open-type="share"><text class="card-btn-txt">分享给好友</text></button>
          <view class="card-btn save" :class="{ disabled: saving }" @tap="onSaveCard">
            <text class="card-btn-txt">{{ saving ? '保存中...' : '保存到相册' }}</text>
          </view>
        </view>
        <text class="card-close" @tap="closeCard">关闭</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance, nextTick } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { navigateTo, goBack } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { captureRefFromQuery, withRef } from '@/utils/referral'
import { drawQrToCanvas } from '@/utils/qrcode'
import { useShare } from '@/composables/useShare'
import TouchpointCard from '@/components/common/touchpoint-card.vue'
import { touchpointApi, type TouchpointResult } from '@/lib/touchpoint-data'
import {
  solarTermApi,
  achievementLabel,
  type SolarTermCurrent,
  type NextTerm,
  type MyParticipationItem,
} from '@/lib/solar-term-data'

const instance = getCurrentInstance()?.proxy
const { toAppMessage, toTimeline } = useShare()

const statusBarHeight = ref(0)

// 主数据（today）
const loading = ref(true)
const error = ref('')
const isTermDay = ref(false)
const current = ref<SolarTermCurrent | null>(null)
const next = ref<NextTerm>({ name: '', daysUntil: 0 })
const myParticipated = ref(false)

// 我的集齐（my）
const isLoggedIn = ref(false)
const myLoading = ref(false)
const uniqueTerms = ref(0)
const participated = ref<MyParticipationItem[]>([])

// 写操作 / 成就卡
const submitting = ref(false)
const saving = ref(false)
const cardVisible = ref(false)
const canvasW = ref(300)
const canvasH = ref(420)

// 里程碑（与后端 4/12/24 对齐，含首参）
const milestones = [
  { threshold: 1, label: '应时·初参' },
  { threshold: 4, label: '应时·四时' },
  { threshold: 12, label: '应时·十二气' },
  { threshold: 24, label: '应时·廿四节' },
]

/** 进度环角度（圆锥渐变） */
const ringStyle = computed(() => {
  const deg = Math.min(360, Math.round((uniqueTerms.value / 24) * 360))
  return { background: `conic-gradient(#8b5a2b ${deg}deg, #ece0cc ${deg}deg)` }
})

/** 分享文案：节气日用当期节气，否则用通用文案 */
const shareTitle = computed(() =>
  current.value ? `今日${current.value.name}·我在热卜国学过节气` : '热卜国学·二十四节气仪式',
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await solarTermApi.today()
    isTermDay.value = res.isSolarTermDay
    current.value = res.current
    next.value = res.next
    myParticipated.value = res.myParticipated
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
  // 集齐进度需登录，独立拉取（失败不影响主内容）
  loadMy()
  loadTouchpoint()
}

// ── 无痕商业化触点 #4 节气礼盒（jieqi_gift·供应链场景标签上线前服务端返回空→v-if 天然隐藏） ──
const tp = ref<TouchpointResult | null>(null)
async function loadTouchpoint() {
  // 节气日带上当期节气名，供服务端场景标签召回（如「节气时令」礼盒）
  const ctx = isTermDay.value && current.value ? { term: current.value.name } : undefined
  tp.value = await touchpointApi.get('jieqi_gift', ctx)
}

async function loadMy() {
  isLoggedIn.value = !!getToken()
  if (!isLoggedIn.value) return
  myLoading.value = true
  try {
    const res = await solarTermApi.my()
    uniqueTerms.value = res.totalUniqueTerms
    participated.value = res.participated
  } catch {
    /* 集齐进度拉取失败静默：主内容已展示 */
  } finally {
    myLoading.value = false
  }
}

async function onParticipate() {
  if (submitting.value) return
  if (!getToken()) {
    guideLogin()
    return
  }
  submitting.value = true
  try {
    const res = await solarTermApi.participate()
    myParticipated.value = true
    uniqueTerms.value = res.totalTerms
    if (res.newAchievements.length) {
      const label = achievementLabel(res.newAchievements[res.newAchievements.length - 1])
      uni.showToast({ title: `获得「${label}」`, icon: 'none' })
    } else {
      uni.showToast({ title: '参与成功', icon: 'success' })
    }
    await loadMy()
    openCard()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '参与失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function guideLogin() {
  uni.showModal({
    title: '登录参与',
    content: '登录后即可参与节气仪式、领取限定成就',
    confirmText: '去登录',
    success: (r) => { if (r.confirm) goLogin() },
  })
}

function goLogin() { navigateTo('/login') }

// ───────── 成就卡 canvas ─────────

/** 当前应得徽章文案（按累计参与数派生，与后端里程碑一致） */
function currentBadge(): string {
  const n = uniqueTerms.value
  if (n >= 24) return '应时·廿四节'
  if (n >= 12) return '应时·十二气'
  if (n >= 4) return '应时·四时'
  return '应时·初参'
}

/** 节气页分享落地链接（卡面二维码内容·withRef 带我的 ref 归因，与小程序转发路径一致） */
function shareLink(): string {
  return withRef('https://api.rebugx.cn/h5/#/pkg-poetry/solar-term/index')
}

function openCard() {
  cardVisible.value = true
  nextTick(() => setTimeout(drawCard, 60))
}

function closeCard() { cardVisible.value = false }

function drawCard() {
  const W = canvasW.value
  const H = canvasH.value
  const name = current.value?.name || next.value.name || '节气'
  const poem = current.value?.poem || ''
  const year = new Date().getFullYear()
  const ctx = uni.createCanvasContext('solarTermCard', instance)

  // 背景
  ctx.setFillStyle('#faf3e6')
  ctx.fillRect(0, 0, W, H)
  // 顶部暖色块
  const headH = 96
  ctx.setFillStyle('#8b5a2b')
  ctx.fillRect(0, 0, W, headH)
  ctx.setFillStyle('rgba(255,255,255,0.85)')
  ctx.setFontSize(12)
  ctx.setTextAlign('center')
  ctx.fillText('热卜国学 · 二十四节气仪式', W / 2, 34)
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(15)
  ctx.fillText(`${year} 年`, W / 2, 66)

  // 节气大名
  ctx.setFillStyle('#8b5a2b')
  ctx.setFontSize(52)
  ctx.setTextAlign('center')
  ctx.fillText(name, W / 2, headH + 84)

  // 徽章
  const badge = currentBadge()
  ctx.setFillStyle('#b5843f')
  const badgeY = headH + 116
  roundRect(ctx, W / 2 - 70, badgeY, 140, 34, 17)
  ctx.fill()
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(16)
  ctx.fillText(badge, W / 2, badgeY + 23)

  // ── 右下角真二维码（节气页落地链接·带 ref 归因·失败静默降级） ──
  const qrSize = 88
  const qrX = W - qrSize - 20
  const qrY = Math.max(H - qrSize - 36, headH + 158)
  const hasQr = drawQrToCanvas(ctx, shareLink(), qrX, qrY, qrSize, {
    caption: '长按识别 · 一起学',
    captionColor: '#b09a7c',
  })

  if (hasQr) {
    // 有二维码：应景诗/集齐进度/slogan 左对齐上移，右侧让位二维码
    const compact = H < 400 // 窄屏画布更矮，压缩行数与行距
    ctx.setTextAlign('left')
    if (poem) {
      ctx.setFillStyle('#6b5b45')
      ctx.setFontSize(14)
      drawWrapped(ctx, poem, 24, headH + 186, qrX - 34, 24, compact ? 1 : 2)
    }
    const py = compact ? headH + 210 : headH + 240
    ctx.setFillStyle('#a8895f')
    ctx.setFontSize(12)
    ctx.fillText('节气集齐进度', 24, py)
    ctx.setFillStyle('#8b5a2b')
    ctx.setFontSize(26)
    ctx.fillText(`${uniqueTerms.value} / 24`, 24, py + 34)
    ctx.setFillStyle('#b09a7c')
    ctx.setFontSize(11)
    ctx.fillText('应时而作 · 顺天而行', 24, py + 56)
    ctx.setTextAlign('center')
  } else {
    // 静默降级：无二维码维持原居中构图
    if (poem) {
      ctx.setFillStyle('#6b5b45')
      ctx.setFontSize(15)
      drawWrapped(ctx, poem, W / 2, headH + 190, W - 56, 26, 2)
    }

    // 集齐进度
    ctx.setFillStyle('#a8895f')
    ctx.setFontSize(13)
    ctx.fillText('节气集齐进度', W / 2, H - 96)
    ctx.setFillStyle('#8b5a2b')
    ctx.setFontSize(30)
    ctx.fillText(`${uniqueTerms.value} / 24`, W / 2, H - 60)

    // slogan
    ctx.setFillStyle('#b09a7c')
    ctx.setFontSize(12)
    ctx.fillText('应时而作 · 顺天而行', W / 2, H - 24)
  }

  ctx.draw()
}

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

function onSaveCard() {
  if (saving.value) return
  saving.value = true
  uni.canvasToTempFilePath({
    canvasId: 'solarTermCard',
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
        fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' }),
        complete: () => { saving.value = false },
      })
    },
    fail: () => {
      uni.showToast({ title: '成就卡生成失败，请重试', icon: 'none' })
      saving.value = false
    },
  }, instance)
}

function onBack() { goBack() }

// 分享带 ref（路径由 withRef 自动追加分享者 ref）
onShareAppMessage(() => toAppMessage({ title: shareTitle.value, path: '/pkg-poetry/solar-term/index' }))
onShareTimeline(() => toTimeline({ title: shareTitle.value, path: '/pkg-poetry/solar-term/index' }))

onLoad((q) => {
  captureRefFromQuery(q as Record<string, unknown>)
  uni.getSystemInfo({
    success: (e) => {
      statusBarHeight.value = e.statusBarHeight || 0
      const w = Math.min(320, Math.max(260, (e.windowWidth || 375) - 100))
      canvasW.value = Math.round(w)
      canvasH.value = Math.round(w * 1.4)
    },
  })
  load()
})
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f5efe3; }
.nav-bar { background: #8b5a2b; position: sticky; top: 0; z-index: 50; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.nav-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
.nav-ico { color: #fff; font-size: 30px; line-height: 1; }
.nav-title { color: #fff; font-size: 17px; font-weight: 600; }

.scroll { height: calc(100vh - 44px); }

/* 状态 */
.state { padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.state-emoji { font-size: 64rpx; }
.state-txt { color: #9a8b73; font-size: 28rpx; }
.spinner { width: 56rpx; height: 56rpx; border: 5rpx solid #e8d8c0; border-top-color: #8b5a2b; border-radius: 50%; animation: spin 0.8s linear infinite; }
.spinner.sm { width: 40rpx; height: 40rpx; border-width: 4rpx; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 8rpx; padding: 14rpx 44rpx; background: #8b5a2b; border-radius: 999rpx; }
.retry-txt { color: #fff; font-size: 26rpx; }

/* 节气卡 */
.term-card { margin: 28rpx 28rpx 0; background: #fff; border-radius: 28rpx; padding: 40rpx 36rpx; box-shadow: 0 8rpx 28rpx rgba(139,90,43,0.08); }
.term-head { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.term-label { font-size: 24rpx; color: #b08a55; letter-spacing: 4rpx; }
.term-name { font-size: 72rpx; font-weight: 800; color: #8b5a2b; line-height: 1.1; }
.term-date { font-size: 24rpx; color: #a89a80; }
.term-poem-wrap { margin: 28rpx 0; padding: 24rpx; background: #faf3e6; border-radius: 18rpx; }
.term-poem { display: block; text-align: center; font-size: 30rpx; color: #6b5b45; line-height: 1.6; }
.term-rows { display: flex; flex-direction: column; gap: 20rpx; }
.term-row { display: flex; align-items: flex-start; gap: 18rpx; }
.row-tag { flex-shrink: 0; width: 72rpx; height: 44rpx; line-height: 44rpx; text-align: center; font-size: 24rpx; color: #8b5a2b; background: #f3e8d5; border-radius: 10rpx; }
.row-val { flex: 1; font-size: 27rpx; color: #5c5142; line-height: 1.55; }

.join-btn { margin-top: 36rpx; height: 92rpx; background: linear-gradient(135deg, #a06a34, #8b5a2b); border-radius: 18rpx; display: flex; align-items: center; justify-content: center; }
.join-btn.disabled { opacity: 0.6; }
.join-txt { color: #fff; font-size: 32rpx; font-weight: 700; letter-spacing: 4rpx; }
.joined-box { margin-top: 36rpx; display: flex; flex-direction: column; align-items: center; gap: 18rpx; }
.joined-txt { font-size: 30rpx; color: #4a7c59; font-weight: 600; }
.joined-share { padding: 14rpx 40rpx; border: 1rpx solid #c4a878; border-radius: 999rpx; }
.joined-share-txt { font-size: 26rpx; color: #8b5a2b; }

/* 非节气日 */
.next-card { margin: 28rpx 28rpx 0; background: #fff; border-radius: 28rpx; padding: 56rpx 36rpx; display: flex; flex-direction: column; align-items: center; gap: 12rpx; box-shadow: 0 8rpx 28rpx rgba(139,90,43,0.08); }
.next-hint { font-size: 24rpx; color: #b08a55; }
.next-main { font-size: 30rpx; color: #6b5b45; }
.next-name { font-size: 56rpx; font-weight: 800; color: #8b5a2b; }
.next-days { display: flex; align-items: baseline; gap: 8rpx; margin-top: 8rpx; }
.next-num { font-size: 80rpx; font-weight: 800; color: #a06a34; }
.next-unit { font-size: 32rpx; color: #8b5a2b; }
.next-tip { margin-top: 12rpx; font-size: 25rpx; color: #a89a80; }

/* 集齐卡 */
.collect-card { margin: 28rpx; background: #fff; border-radius: 28rpx; padding: 40rpx 36rpx; box-shadow: 0 8rpx 28rpx rgba(139,90,43,0.06); }
.collect-title { display: block; text-align: center; font-size: 30rpx; font-weight: 700; color: #8b5a2b; }
.collect-loading { display: flex; justify-content: center; padding: 40rpx 0; }

.ring-wrap { display: flex; justify-content: center; padding: 36rpx 0 24rpx; }
.ring { width: 220rpx; height: 220rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ring-inner { width: 168rpx; height: 168rpx; border-radius: 50%; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-num { font-size: 64rpx; font-weight: 800; color: #8b5a2b; line-height: 1; }
.ring-total { font-size: 26rpx; color: #a89a80; margin-top: 4rpx; }

.milestones { display: flex; justify-content: space-between; gap: 12rpx; margin-top: 12rpx; }
.milestone { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 20rpx 4rpx; background: #f7f0e3; border-radius: 14rpx; opacity: 0.55; }
.milestone.got { opacity: 1; background: #f3e6cf; }
.ms-badge { font-size: 36rpx; }
.ms-label { font-size: 22rpx; color: #8b5a2b; font-weight: 600; text-align: center; }
.ms-cond { font-size: 20rpx; color: #a89a80; }

.parted-list { margin-top: 32rpx; }
.parted-title { display: block; font-size: 26rpx; color: #6b5b45; margin-bottom: 16rpx; }
.parted-chips { display: flex; flex-wrap: wrap; gap: 14rpx; }
.chip { font-size: 24rpx; color: #8b5a2b; background: #f3e8d5; padding: 10rpx 20rpx; border-radius: 999rpx; }
.parted-empty { margin-top: 28rpx; padding: 28rpx; background: #faf5ec; border-radius: 16rpx; }
.parted-empty-txt { display: block; text-align: center; font-size: 25rpx; color: #a89a80; }

.collect-guest { margin-top: 28rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.guest-txt { font-size: 27rpx; color: #a89a80; }
.guest-btn { padding: 14rpx 44rpx; background: #8b5a2b; border-radius: 999rpx; }
.guest-btn-txt { color: #fff; font-size: 26rpx; }

.safe-bottom { height: 48rpx; }

/* 成就卡弹层 */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; }
.card-modal { display: flex; flex-direction: column; align-items: center; gap: 28rpx; }
.card-canvas-wrap { border-radius: 20rpx; overflow: hidden; box-shadow: 0 12rpx 40rpx rgba(0,0,0,0.3); }
.card-canvas { background: #faf3e6; }
.card-actions { display: flex; gap: 24rpx; }
.card-btn { min-width: 220rpx; height: 84rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; line-height: normal; }
.card-btn::after { border: none; }
.card-btn.share { background: #4a7c59; }
.card-btn.save { background: #8b5a2b; }
.card-btn.save.disabled { opacity: 0.6; }
.card-btn-txt { color: #fff; font-size: 28rpx; font-weight: 600; }
.card-close { font-size: 28rpx; color: rgba(255,255,255,0.85); padding: 8rpx 24rpx; }
</style>
