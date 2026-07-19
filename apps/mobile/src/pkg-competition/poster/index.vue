<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="nav-title">{{ myRank ? '荣誉海报' : '邀请海报' }}</text>
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
      <view class="retry-btn" @tap="load"><text class="retry-txt">重新加载</text></view>
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
        <text class="hint">{{ myRank ? '保存海报，晒出你的荣誉战报' : '保存海报，邀好友同台竞技' }}</text>
        <view class="safe-bottom" />
      </scroll-view>

      <!-- 底部操作 -->
      <view class="footer" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
        <view class="footer-btn gold" @tap="onSave">
          <text class="footer-btn-txt gold-txt">{{ submitting ? '保存中...' : '保存到相册' }}</text>
        </view>
        <view class="footer-btn primary" @tap="onShare">
          <text class="footer-btn-txt">{{ myRank ? '分享给好友' : '分享邀请' }}</text>
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
import { getUserInfo } from '@/utils/storage'
import { drawQrToCanvas } from '@/utils/qrcode'
import { BRAND } from '@/lib/brand'
import {
  competitionApi, promotionLabel, typeLabel,
  type Competition, type Registration, type Ranking, type MyResults, type PromotionStatus,
} from '@/pkg-competition/lib/competition-data'

const instance = getCurrentInstance()?.proxy

// ── 设计 token（A11 视觉稿）──
const C_PAPER = '#faf8f5' // 宣纸白（海报底）
const C_PAPER2 = '#fffdf6' // 卡面白
const C_RED = '#c41e3a' // 朱红
const C_RED_DARK = '#8f1526' // 朱红深（头部渐变尾）
const C_GOLD = '#c9a96e' // 金（荣誉·卡边/徽章）
const C_GOLD_DARK = '#a5883f' // 金深（名次数字）
const C_TEXT = '#2c2c2c' // 主文
const C_SUB = '#6e6e73' // 次文
const C_GRAY = '#999999' // 弱文（标签）

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44 - 74)

// 竖版海报逻辑像素（9:16·适配后写入 px）
const canvasW = ref(300)
const canvasH = ref(Math.round(300 * 16 / 9))

const compId = ref('')
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

const comp = ref<Competition | null>(null)
const myReg = ref<Registration | null>(null)
const myRank = ref<Ranking | null>(null)
const myScore = ref<number | null>(null) // 我的总分（优先 myResults）
const totalParticipants = ref(0) // 参赛人数

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [c, my, rk] = await Promise.all([
      competitionApi.detail(compId.value).catch(() => null),
      competitionApi.myResults(compId.value).catch(() => null),
      competitionApi.rankings(compId.value).catch(() => ({ items: [] as Ranking[], total: 0 })),
    ])
    if (!c) throw new Error('赛事不存在')
    comp.value = c

    const items: Ranking[] = (rk as { items?: Ranking[] }).items || []
    totalParticipants.value = (rk as { total?: number }).total || items.length || c._count?.registrations || 0

    // 我的成绩：优先 myResults（含 registration/rankings/totalScores），降级用公开 rankings 按 userId 命中
    const results = my as MyResults | null
    myReg.value = results?.registration || null
    const myUserId = results?.registration?.userId || (getUserInfo<{ id?: string | number }>()?.id != null
      ? String(getUserInfo<{ id?: string | number }>()!.id)
      : undefined)

    // 名次：myResults.rankings 优先，其次公开榜命中
    let rank: Ranking | null = results?.rankings?.[0] || null
    if (!rank && myUserId) rank = items.find((r) => r.userId === myUserId) || null
    myRank.value = rank

    // 分数：myResults.totalScores 优先，其次 ranking.score
    const ts = results?.totalScores?.[0]?.totalScore
    myScore.value = typeof ts === 'number' ? ts : (rank ? rank.score : null)

    await nextTick()
    setTimeout(draw, 60)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

/** 名次徽章简称（宋体·冠亚季/第N名） */
function medalLabel(rank: Ranking): string {
  const s = rank.status as PromotionStatus
  if (s === 'CHAMPION') return '冠军'
  if (s === 'RUNNER_UP') return '亚军'
  if (s === 'THIRD_PLACE') return '季军'
  return `第${rank.rank}`
}

/** 海报二维码落地链接（赛事详情·带 inviterId 邀请归因=当前 userId·后端 register 支持） */
function posterQrUrl(): string {
  const uid = getUserInfo<{ id?: string | number }>()?.id
  let url = `https://api.rebugx.cn/h5/pkg-competition/detail/index?id=${encodeURIComponent(compId.value)}`
  if (uid != null && String(uid)) url += `&inviterId=${encodeURIComponent(String(uid))}`
  return url
}

/** 绘制 9:16 荣誉/邀请海报 */
function draw() {
  const c = comp.value
  if (!c) return
  // 赛事名兜底：后端偶发 title 缺失时不再画出 "— undefined —"
  const compTitle = (c.title && String(c.title).trim()) || `${BRAND.name}·国学竞技`
  const W = canvasW.value
  const H = canvasH.value
  const ctx = uni.createCanvasContext('posterCanvas', instance)

  // ── 海报底（宣纸白 + 金色描边）──
  ctx.setFillStyle(C_PAPER)
  ctx.fillRect(0, 0, W, H)

  // ── 顶部朱红块（渐变头）──
  const headH = Math.round(H * 0.155)
  const grad = ctx.createLinearGradient(0, 0, W, headH)
  grad.addColorStop(0, C_RED)
  grad.addColorStop(1, C_RED_DARK)
  ctx.setFillStyle(grad)
  ctx.fillRect(0, 0, W, headH)

  ctx.setTextAlign('center')
  // 赛事名 badge（— 平台/赛事名 —·带间距）
  ctx.setFillStyle('rgba(255,255,255,0.9)')
  ctx.setFontSize(11)
  const eb = `— ${compTitle} —`
  drawEllipsis(ctx, eb, W / 2, Math.round(headH * 0.36), W - 40)
  // 主标题（宋体感·获奖=类型专场·荣誉战报 / 邀请=赛事名）
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(19)
  const headTitle = myRank.value
    ? `${typeLabel(c.type)}专场 · 荣誉战报`
    : compTitle
  drawWrapped(ctx, headTitle, W / 2, Math.round(headH * 0.62), W - 40, 25, 2)

  // ── 中部主体区 ──
  const bodyTop = headH
  const footH = Math.round(H * 0.14)
  const bodyBottom = H - footH
  const bodyCY = (bodyTop + bodyBottom) / 2

  if (myRank.value) {
    drawHonor(ctx, W, bodyTop, bodyBottom)
  } else {
    drawInvite(ctx, W, bodyCY)
  }

  // ── 底部页脚（虚线分隔 + 二维码 + slogan）──
  drawFoot(ctx, W, H, bodyBottom, footH)

  ctx.draw()
}

/** 获奖态：金色荣誉卡（徽章 + 昵称 + 名次 + 三项成绩） */
function drawHonor(ctx: UniApp.CanvasContext, W: number, top: number, bottom: number) {
  const rank = myRank.value!
  const padX = 22
  const cardW = W - padX * 2
  const cardH = Math.min(Math.round((bottom - top) * 0.86), 300)
  const cardX = padX
  const cardY = top + (bottom - top - cardH) / 2

  // 卡底（浅金渐变）+ 金边
  const cg = ctx.createLinearGradient(0, cardY, 0, cardY + cardH)
  cg.addColorStop(0, '#fbf3e2')
  cg.addColorStop(1, C_PAPER2)
  ctx.setFillStyle(cg)
  roundRect(ctx, cardX, cardY, cardW, cardH, 14)
  ctx.fill()
  ctx.setStrokeStyle(C_GOLD)
  ctx.setLineWidth(1.5)
  roundRect(ctx, cardX, cardY, cardW, cardH, 14)
  ctx.stroke()

  const cx = W / 2
  let y = cardY + 30

  // 徽章（双圈金环 + 名次简称·宋体）
  const mr = 34
  y += mr
  ctx.setFillStyle('#ffffff')
  ctx.beginPath()
  ctx.arc(cx, y, mr, 0, Math.PI * 2)
  ctx.fill()
  ctx.setStrokeStyle(C_GOLD)
  ctx.setLineWidth(2.5)
  ctx.beginPath()
  ctx.arc(cx, y, mr, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineWidth(1)
  ctx.beginPath()
  ctx.arc(cx, y, mr - 5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setFillStyle(C_GOLD_DARK)
  ctx.setFontSize(17)
  ctx.setTextAlign('center')
  ctx.fillText(medalLabel(rank), cx, y + 6)
  y += mr + 20

  // 昵称：公开榜回带的 user.nickname 优先，其次本地登录昵称
  const nick = rank.user?.nickname || getUserInfo<{ nickname?: string }>()?.nickname || '参赛选手'
  ctx.setFillStyle(C_TEXT)
  ctx.setFontSize(15)
  drawEllipsis(ctx, nick, cx, y, cardW - 32)
  y += 26

  // 名次（朱红·宋体感）
  ctx.setFillStyle(C_RED)
  ctx.setFontSize(23)
  ctx.fillText(`全国第 ${rank.rank} 名`, cx, y)
  y += 30

  // 三项成绩（得分 / 名次 / 参赛人数）
  const cells: { n: string; l: string }[] = [
    { n: String(myScore.value ?? rank.score), l: '得分' },
    { n: promotionLabel[rank.status] || `第${rank.rank}`, l: '荣誉' },
    { n: totalParticipants.value ? String(totalParticipants.value) : '—', l: '参赛人数' },
  ]
  const gap = cardW / 3
  cells.forEach((cell, i) => {
    const ccx = cardX + gap * i + gap / 2
    ctx.setFillStyle(C_GOLD_DARK)
    ctx.setFontSize(19)
    ctx.setTextAlign('center')
    ctx.fillText(cell.n, ccx, y)
    ctx.setFillStyle(C_GRAY)
    ctx.setFontSize(11)
    ctx.fillText(cell.l, ccx, y + 18)
  })
}

/** 邀请态：不误导·「以学会友·同台论道」+ 项目文案 */
function drawInvite(ctx: UniApp.CanvasContext, W: number, cy: number) {
  const cx = W / 2
  let y = cy - 90

  // 图标圈（浅红）
  const r = 34
  y += r
  const ig = ctx.createLinearGradient(cx - r, cy - 90, cx + r, cy - 90 + r * 2)
  ig.addColorStop(0, '#f6e0e2')
  ig.addColorStop(1, '#fbeef0')
  ctx.setFillStyle(ig)
  ctx.beginPath()
  ctx.arc(cx, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.setStrokeStyle('#e6b3b8')
  ctx.setLineWidth(2)
  ctx.beginPath()
  ctx.arc(cx, y, r, 0, Math.PI * 2)
  ctx.stroke()
  // 交锋符号（⚔ 以红色字符衬底·X5 兼容用实色文字）
  ctx.setFillStyle(C_RED)
  ctx.setFontSize(30)
  ctx.setTextAlign('center')
  ctx.fillText('⚔', cx, y + 10)
  y += r + 28

  // 标题（两行·朱红·宋体感）
  ctx.setFillStyle(C_RED)
  ctx.setFontSize(23)
  ctx.fillText('以学会友', cx, y)
  y += 30
  ctx.fillText('同台论道', cx, y)
  y += 32

  // 副文案（多行）
  ctx.setFillStyle(C_SUB)
  ctx.setFontSize(12)
  const lines = [
    '八字 · 风水 · 紫微 · 六爻 · 奇门',
    '知识竞技，赢取荣誉证书与人才榜席位',
    '',
    '诚邀你一同参赛，切磋学识',
  ]
  lines.forEach((l) => {
    if (l) ctx.fillText(l, cx, y)
    y += 22
  })
}

/** 底部页脚：虚线分隔 + 真二维码（带归因）+ slogan */
function drawFoot(ctx: UniApp.CanvasContext, W: number, H: number, bodyBottom: number, footH: number) {
  const won = !!myRank.value
  const footTop = bodyBottom

  // 虚线分隔（金）
  ctx.setStrokeStyle('#e3d5b0')
  ctx.setLineWidth(1)
  drawDashedLine(ctx, 18, footTop, W - 18, footTop, 5, 4)

  const qrSize = Math.min(Math.round(footH * 0.62), 84)
  const qrX = 20
  const qrY = footTop + (footH - qrSize) / 2 - 4
  const hasQr = drawQrToCanvas(ctx, posterQrUrl(), qrX, qrY, qrSize, {
    padding: 4, radius: 6, foreground: C_TEXT,
  })

  // slogan 区（二维码右侧·左对齐）
  const tx = hasQr ? qrX + qrSize + 16 : 24
  ctx.setTextAlign('left')
  ctx.setFillStyle(C_RED)
  ctx.setFontSize(14)
  ctx.fillText(won ? '扫码同台竞技' : '扫码报名参赛', tx, footTop + footH / 2 - 4)
  ctx.setFillStyle(C_GRAY)
  ctx.setFontSize(11)
  ctx.fillText(won ? '证学识 · 赢荣誉 · 入人才榜' : '与全国易学爱好者同场比拼', tx, footTop + footH / 2 + 16)

  // 无二维码降级：底部补品牌 slogan（实色衬底文字）
  if (!hasQr) {
    ctx.setTextAlign('center')
    ctx.setFillStyle(C_GOLD_DARK)
    ctx.setFontSize(11)
    ctx.fillText(`${BRAND.name} · 以文会友`, W / 2, H - 12)
  }
}

/** 圆角矩形路径 */
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

/** 虚线（旧接口 canvas setLineDash 兼容差·手绘短段） */
function drawDashedLine(ctx: UniApp.CanvasContext, x1: number, y1: number, x2: number, y2: number, dash: number, gap: number) {
  const total = Math.abs(x2 - x1)
  let x = x1
  ctx.beginPath()
  while (x < x2) {
    const xe = Math.min(x + dash, x2)
    ctx.moveTo(x, y1)
    ctx.lineTo(xe, y1)
    x += dash + gap
  }
  void total; void y2
  ctx.stroke()
}

/** 单行文本超宽省略 */
function drawEllipsis(ctx: UniApp.CanvasContext, text: string, cx: number, y: number, maxW: number) {
  let t = text || ''
  if (ctx.measureText(t).width <= maxW) { ctx.fillText(t, cx, y); return }
  while (t && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  ctx.fillText(t + '…', cx, y)
}

/** 文本换行绘制（限行·超出省略号） */
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

// 分享：APP/小程序调系统分享面板承接图片；H5 引导长按保存后分享
function onShare() {
  uni.canvasToTempFilePath({
    canvasId: 'posterCanvas',
    success: (res) => {
      // #ifdef APP-PLUS || MP-WEIXIN
      const share = (uni as unknown as { share?: (o: Record<string, unknown>) => void }).share
      if (typeof share === 'function') {
        share({
          provider: 'weixin',
          type: 2,
          imageUrl: res.tempFilePath,
          scene: 'WXSceneSession',
          fail: () => uni.showToast({ title: '请先保存到相册再分享', icon: 'none' }),
        })
      } else {
        uni.showToast({ title: '请保存到相册后分享', icon: 'none' })
      }
      // #endif
      // #ifdef H5
      uni.showToast({ title: '请长按海报保存后分享', icon: 'none' })
      // #endif
    },
    fail: () => uni.showToast({ title: '海报生成失败，请重试', icon: 'none' }),
  }, instance)
}

function goBack() { navigateBack() }

onLoad((q) => {
  compId.value = (q?.id as string) || ''
  uni.getSystemInfo({
    success: (e) => {
      statusBarHeight.value = e.statusBarHeight || 0
      sysH.value = e.windowHeight || 667
      // 9:16 竖版海报·按屏宽适配（画布宽 = 屏宽 - 80·夹在 [240,340]）
      const w = Math.min(340, Math.max(240, (e.windowWidth || 375) - 80))
      canvasW.value = Math.round(w)
      canvasH.value = Math.round(w * 16 / 9)
    },
  })
  load()
})
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #faf8f5; }
.nav-bar { background: #faf8f5; position: sticky; top: 0; z-index: 50; border-bottom: 1rpx solid #ece7df; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { color: #2c2c2c; font-size: 16px; font-weight: 700; font-family: "Songti SC", serif; }
.scroll { width: 100%; }

.state { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9ca3af; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e8d8c0; border-top-color: #c41e3a; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: #c41e3a; border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }

.canvas-wrap { display: flex; justify-content: center; padding: 20px 0 12px; }
.poster-canvas { border-radius: 14px; box-shadow: 0 10px 26px rgba(150, 120, 60, 0.2); background: #faf8f5; }
.hint { display: block; text-align: center; font-size: 12px; color: #9ca3af; padding: 8px 24px; }

.footer { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1rpx solid #ece7df; padding: 12px 16px; z-index: 50; display: flex; gap: 12px; }
.footer-btn { flex: 1; height: 46px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.footer-btn.gold { background: #f1e9d8; border: 1rpx solid #e3d5b0; }
.footer-btn.primary { background: linear-gradient(135deg, #c41e3a, #a01830); }
.footer-btn-txt { color: #fff; font-size: 15px; font-weight: 700; }
.footer-btn-txt.gold-txt { color: #a5883f; }
.safe-bottom { height: 24px; }
</style>
