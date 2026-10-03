<template>
  <view class="poster-page">
    <!-- 自定义导航（statusBarHeight 留白） -->
    <view class="poster-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="poster-nav-inner">
        <view class="poster-nav-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#2C2C2C" />
        </view>
        <text class="poster-nav-title serif">海报生成</text>
        <view class="poster-nav-btn" />
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="poster-state">
      <view class="poster-spinner poster-spinner--red" />
      <text class="poster-state-txt">加载中…</text>
    </view>

    <!-- 未开通分站 -->
    <view v-else-if="notOpened" class="poster-state">
      <app-icon name="store" :size="96" color="#D8D2C8" />
      <text class="poster-state-txt">你还没有开通分站</text>
      <view class="poster-state-btn" @tap="goJoin"><text class="poster-state-btn-txt">去开通分站</text></view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="poster-state">
      <app-icon name="alert-circle" :size="96" color="#D8D2C8" />
      <text class="poster-state-txt">{{ error }}</text>
      <view class="poster-state-btn" @tap="load"><text class="poster-state-btn-txt">重新加载</text></view>
    </view>

    <template v-else>
      <!-- 步骤条：选风格 → 生成 → 完成 -->
      <view class="steps">
        <view v-for="(s, i) in STEPS" :key="s" class="step">
          <view class="step-dot" :class="{ on: stepIndex >= i, cur: stepIndex === i }">
            <text class="step-num" :class="{ on: stepIndex >= i }">{{ i + 1 }}</text>
          </view>
          <text class="step-label" :class="{ on: stepIndex >= i }">{{ s }}</text>
          <view v-if="i < STEPS.length - 1" class="step-line" :class="{ on: stepIndex > i }" />
        </view>
      </view>

      <!-- 风格选择（承接 V0「模板选择」；后端无模板库/分类，用本地 4 套风格诚实降级） -->
      <view class="tpls">
        <view
          v-for="t in posterTemplates"
          :key="t.id"
          class="tpl"
          @tap="selectedId = t.id"
        >
          <view class="tpl-cover" :class="{ on: selectedId === t.id }" :style="{ background: t.bg }">
            <view v-if="selectedId === t.id" class="tpl-check">
              <app-icon name="check" :size="24" color="#ffffff" />
            </view>
            <view class="tpl-tc">
              <text class="tpl-tc-sub" :style="{ color: t.textColor }">风格</text>
              <text class="tpl-tc-main serif" :style="{ color: t.textColor }">{{ t.name }}</text>
            </view>
          </view>
          <text class="tpl-name" :class="{ on: selectedId === t.id }">{{ t.name }}</text>
        </view>
        <view class="tpl-tail" />
      </view>

      <!-- 实时预览 -->
      <view class="preview">
        <text class="pv-title">海报预览</text>
        <text class="pv-hint">生成时自动嵌入你的分站二维码和品牌信息</text>

        <view class="pv-img" :style="posterBgStyle">
          <view class="pv-deco pv-deco-1" />
          <view class="pv-deco pv-deco-2" />

          <text class="pv-brand" :style="{ color: tpl.textColor }">{{ BRAND.name }}</text>

          <view class="pv-avatar" :style="{ background: station.themeColor }">
            <image lazy-load v-if="station.masterAvatar" :src="station.masterAvatar" class="pv-avatar-img" mode="aspectFill" />
            <text v-else class="pv-avatar-txt">{{ (station.masterName || station.name).charAt(0) }}</text>
          </view>

          <text class="pv-big serif" :style="{ color: tpl.textColor }">{{ station.name }}</text>
          <text class="pv-sub" :style="{ color: tpl.textColor }">
            {{ station.masterName ? station.masterName + ' · 诚邀您加入' : '诚邀您加入' }}
          </text>

          <view v-if="station.lockedUsers > 0" class="pv-stat">
            <text class="pv-stat-num" :style="{ color: tpl.accentColor }">{{ station.lockedUsers }}</text>
            <text class="pv-stat-label" :style="{ color: tpl.textColor }">成员</text>
          </view>

          <view class="pv-qr">
            <app-icon name="qr-code" :size="56" color="#C41E3A" />
          </view>
          <text class="pv-qr-txt" :style="{ color: tpl.textColor }">扫码加入</text>
        </view>
      </view>

      <!-- 底部生成按钮 -->
      <view class="bottom">
        <view class="genbtn" @tap="handleGenerate">
          <app-icon name="download" :size="36" color="#ffffff" />
          <text class="genbtn-txt">生成海报</text>
        </view>
        <text class="poster-tip">
          海报含专属分站二维码，好友扫码注册后将与你的分站建立绑定关系（权益有效期内）
        </text>
      </view>
    </template>

    <!-- ② 生成中 loading 遮罩（唯一显式 loading 态·核心体验） -->
    <view v-if="generating" class="mask">
      <view class="poster-spinner poster-spinner--white" />
      <text class="mask-t">正在合成海报…</text>
    </view>

    <!-- ③ 完成结果层 -->
    <view v-if="resultShow" class="result">
      <image
        v-if="resultPath"
        :src="resultPath"
        class="r-poster"
        mode="aspectFit"
        @longpress="handleSave"
      />
      <text class="r-hint">长按图片可保存到相册</text>
      <view class="r-actions">
        <view class="r-btn save" :class="{ disabled: saving }" @tap="handleSave">
          <app-icon name="download" :size="30" color="#C41E3A" />
          <text class="r-btn-txt r-btn-txt--save">{{ saving ? '保存中…' : '保存相册' }}</text>
        </view>
        <view class="r-btn share" @tap="handleShare">
          <app-icon name="share-2" :size="30" color="#ffffff" />
          <text class="r-btn-txt r-btn-txt--share">复制链接</text>
        </view>
      </view>
      <text class="r-redo" @tap="closeResult">再做一张</text>
    </view>

    <!-- 屏外隐藏画布：真实生成海报（canvasToTempFilePath → 保存相册） -->
    <canvas
      canvas-id="stationPoster"
      class="poster-canvas"
      :style="{ width: CW + 'px', height: CH + 'px' }"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { operatorApi } from '@/pkg-operator/lib/operator-data'
import { BRAND } from '@/lib/brand'
import { drawQrToCanvas } from '@/utils/qrcode'
import { buildH5Url } from '@/utils/share'

const instance = getCurrentInstance()?.proxy
const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

// 三步步骤条文案
const STEPS = ['选风格', '生成', '完成'] as const

// 海报展示用分站信息（全部来自 /station/my 真实字段）
const station = ref({
  name: '',
  code: '',
  themeColor: '#C41E3A',
  masterName: '',
  masterAvatar: '',
  intro: '',
  lockedUsers: 0,
})

const loading = ref(true)
const error = ref('')
const notOpened = ref(false)

// 交互态：生成中 loading / 完成结果层 / 结果临时图路径
const generating = ref(false)
const resultShow = ref(false)
const resultPath = ref('')
const saving = ref(false)

// 步骤条当前索引：结果层=2完成，生成中=1，其余=0选风格
const stepIndex = computed(() => (resultShow.value ? 2 : generating.value ? 1 : 0))

async function load() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  try {
    const config = await operatorApi.getStationConfig()
    station.value = {
      name: config.name || '我的分站',
      code: config.code || '',
      themeColor: config.themeColor || '#C41E3A',
      masterName: config.masterNickname || '',
      masterAvatar: config.masterAvatar || '',
      intro: config.intro || '',
      lockedUsers: config.lockedUsers || 0,
    }
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (msg.includes('开通分站') || msg.includes('没有开通') || msg.includes('NOT_FOUND')) {
      notOpened.value = true
    } else {
      error.value = msg || '加载失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

interface PosterTemplate {
  id: string
  name: string
  bg: string
  /** canvas 渐变起止色 + 方向（v=竖 / d=对角），与 bg 字符串一致，供 canvas 绘制 */
  c1: string
  c2: string
  dir: 'v' | 'd'
  textColor: string
  accentColor: string
}

// 海报风格配色（前端展示配置常量·后端无模板库/分类/自定义字段，用本地风格诚实承接 V0 模板选择区）
const posterTemplates: PosterTemplate[] = [
  { id: 'classic', name: '朱红', bg: 'linear-gradient(160deg, #A01828, #C41E3A)', c1: '#A01828', c2: '#C41E3A', dir: 'd', textColor: '#ffffff', accentColor: '#F5D08A' },
  { id: 'ink', name: '墨褐', bg: 'linear-gradient(160deg, #5B3A29, #8B5E3C)', c1: '#5B3A29', c2: '#8B5E3C', dir: 'd', textColor: '#ffffff', accentColor: '#F5D08A' },
  { id: 'elegant', name: '素雅', bg: 'linear-gradient(160deg, #FAF8F5, #E8E4D9)', c1: '#FAF8F5', c2: '#E8E4D9', dir: 'd', textColor: '#2C2C2C', accentColor: '#C9A96E' },
  { id: 'gold', name: '流金', bg: 'linear-gradient(160deg, #B8860B, #C9A96E)', c1: '#B8860B', c2: '#C9A96E', dir: 'd', textColor: '#ffffff', accentColor: '#FFF3D6' },
]

const selectedId = ref(posterTemplates[0].id)
const tpl = computed(() => posterTemplates.find((t) => t.id === selectedId.value) || posterTemplates[0])
const posterBgStyle = computed(() => ({ background: tpl.value.bg }))

// 推广链接：真实 H5 地址 + 分站 code 作 ref（统一归因参数·注册绑定归属/下单临时归因均识别）
const promoLink = computed(() => {
  if (!station.value.code) return ''
  return buildH5Url('/pages/index/index', { ref: station.value.code })
})

// ───────── canvas 海报绘制（真实生成·可保存相册） ─────────

// 画布逻辑尺寸（9:16·屏外隐藏渲染），绘制坐标即此单位
const CW = 600
const CH = Math.round((CW * 16) / 9) // 1067

function roundRect(ctx: UniApp.CanvasContext, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** 逐字换行 + 行数截断（末行超出补省略号） */
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

/** 绘制整张海报到 canvas（真二维码·失败静默降级）。头像网络图取本地路径后画，取不到则画首字。 */
async function drawPoster(): Promise<void> {
  const s = station.value
  const t = tpl.value
  const ctx = uni.createCanvasContext('stationPoster', instance)

  // 背景渐变
  const grad = t.dir === 'd' ? ctx.createLinearGradient(0, 0, CW, CH) : ctx.createLinearGradient(0, 0, 0, CH)
  grad.addColorStop(0, t.c1)
  grad.addColorStop(1, t.c2)
  ctx.setFillStyle(grad)
  ctx.fillRect(0, 0, CW, CH)

  // 装饰圆
  ctx.setFillStyle('rgba(255,255,255,0.10)')
  ctx.beginPath(); ctx.arc(CW, 0, 130, 0, Math.PI * 2); ctx.fill()
  ctx.setFillStyle('rgba(255,255,255,0.07)')
  ctx.beginPath(); ctx.arc(0, CH, 200, 0, Math.PI * 2); ctx.fill()

  const P = 52
  // 顶部 logo 行
  ctx.setFillStyle(s.themeColor)
  roundRect(ctx, P, 64, 52, 52, 12); ctx.fill()
  ctx.setFillStyle('#ffffff'); ctx.setFontSize(24); ctx.setTextAlign('center')
  ctx.fillText(s.name.charAt(0) || '站', P + 26, 64 + 35)
  ctx.setFillStyle(t.textColor); ctx.setFontSize(24); ctx.setTextAlign('left')
  ctx.fillText(BRAND.name, P + 68, 64 + 35)

  // 头像（居中·网络图取本地路径后圆形裁剪，取不到画首字）
  const avCx = CW / 2, avCy = 380, avR = 90
  let avatarPath = ''
  if (s.masterAvatar) {
    try { avatarPath = (await uni.getImageInfo({ src: s.masterAvatar })).path } catch { /* 取不到降级首字 */ }
  }
  ctx.setFillStyle(s.themeColor)
  ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2); ctx.fill()
  if (avatarPath) {
    ctx.save(); ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2); ctx.clip()
    ctx.drawImage(avatarPath, avCx - avR, avCy - avR, avR * 2, avR * 2); ctx.restore()
  } else {
    ctx.setFillStyle('#ffffff'); ctx.setFontSize(64); ctx.setTextAlign('center')
    ctx.fillText((s.masterName || s.name).charAt(0) || '站', avCx, avCy + 22)
  }

  // 名字 + 副标
  ctx.setFillStyle(t.textColor); ctx.setTextAlign('center')
  ctx.setFontSize(44); ctx.fillText(s.name, avCx, avCy + avR + 66)
  ctx.setFontSize(24)
  ctx.fillText(s.masterName ? `${s.masterName} · 诚邀您加入` : '诚邀您加入', avCx, avCy + avR + 108)

  // 成员数（>0 才画）+ 简介
  let midY = avCy + avR + 170
  if (s.lockedUsers > 0) {
    ctx.setFillStyle(t.accentColor); ctx.setFontSize(44); ctx.fillText(String(s.lockedUsers), avCx, midY)
    ctx.setFillStyle(t.textColor); ctx.setFontSize(22); ctx.fillText('成员', avCx, midY + 32)
    midY += 72
  }
  if (s.intro) {
    ctx.setFillStyle(t.textColor); ctx.setFontSize(24)
    drawWrapped(ctx, s.intro, avCx, midY + 24, CW - 160, 34, 2)
  }

  // 底部二维码（真码·白卡衬底）
  const qrSize = 150
  const qrX = (CW - qrSize) / 2
  const qrY = CH - qrSize - 100
  ctx.setFillStyle('#ffffff')
  roundRect(ctx, qrX - 18, qrY - 18, qrSize + 36, qrSize + 36, 18); ctx.fill()
  const hasQr = promoLink.value ? drawQrToCanvas(ctx, promoLink.value, qrX, qrY, qrSize, {}) : false
  if (!hasQr) {
    ctx.setFillStyle('#9ca3af'); ctx.setFontSize(22); ctx.setTextAlign('center')
    ctx.fillText('推广码缺失', CW / 2, qrY + qrSize / 2 + 8)
  }
  ctx.setFillStyle(t.textColor); ctx.setFontSize(22); ctx.setTextAlign('center')
  ctx.fillText(`扫码加入${s.name}`, CW / 2, qrY + qrSize + 44)

  await new Promise<void>((resolve) => ctx.draw(false, () => resolve()))
}

// 生成海报（生成中 loading 态 → 绘制并导出临时图 → 弹出完成结果层）
async function handleGenerate() {
  if (generating.value) return
  generating.value = true
  try {
    await drawPoster()
    const tempPath = await new Promise<string>((resolve, reject) => {
      uni.canvasToTempFilePath(
        { canvasId: 'stationPoster', success: (r) => resolve(r.tempFilePath), fail: reject },
        instance,
      )
    })
    resultPath.value = tempPath
    resultShow.value = true
  } catch {
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  } finally {
    generating.value = false
  }
}

// 保存已生成的海报到相册（防重复）
async function handleSave() {
  if (saving.value || !resultPath.value) return
  saving.value = true
  try {
    await new Promise<void>((resolve, reject) => {
      uni.saveImageToPhotosAlbum({ filePath: resultPath.value, success: () => resolve(), fail: reject })
    })
    uni.showToast({ title: '海报已保存到相册', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' })
  } finally {
    saving.value = false
  }
}

// 复制真实推广链接（后端无「直接分享」图片接口，降级为复制专属链接）
function handleShare() {
  if (!promoLink.value) {
    uni.showToast({ title: '分站推广码缺失', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: promoLink.value,
    success: () => uni.showToast({ title: '推广链接已复制', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

// 再做一张：关闭结果层回到风格选择
function closeResult() {
  resultShow.value = false
  resultPath.value = ''
}

function goJoin() {
  navigateTo('/pkg-operator/join-station/index')
}
function goBack() {
  navigateBack()
}

onMounted(load)
</script>

<style lang="scss" scoped>
/* ===== token ===== */
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$gold: #C9A96E;
$t1: #2C2C2C;
$t2: #6E6E73;
$t3: #9A9A9A;
$line: #ECE7DF;
$radius: 35rpx;
$px: 38rpx;
$shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);

.poster-page {
  min-height: 100vh;
  background: $paper;
}
.serif {
  font-family: 'Songti SC', 'STSong', serif;
}

/* 屏外隐藏画布（仅用于导出图片，不可见） */
.poster-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
}

/* ===== 自定义导航 ===== */
.poster-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: $paper;
}
.poster-nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $px;
}
.poster-nav-btn {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.poster-nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $t1;
}

/* ===== 三态占位（加载/未开通/错误） ===== */
.poster-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 38rpx;
  gap: 28rpx;
}
.poster-state-txt {
  font-size: 28rpx;
  color: $t2;
}
.poster-state-btn {
  margin-top: 8rpx;
  padding: 20rpx 60rpx;
  background: $red;
  border-radius: 999rpx;
}
.poster-state-btn-txt {
  color: #fff;
  font-size: 28rpx;
}

/* 通用 spinner（红/白两版） */
.poster-spinner {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.poster-spinner--red {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid rgba(196, 30, 58, 0.2);
  border-top-color: $red;
}
.poster-spinner--white {
  border: 6rpx solid rgba(255, 255, 255, 0.25);
  border-top-color: #fff;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== 步骤条 ===== */
.steps {
  display: flex;
  align-items: center;
  padding: 24rpx $px 12rpx;
}
.step {
  display: flex;
  align-items: center;
  flex: 1;
  position: relative;
}
.step:last-child {
  flex: 0 0 auto;
}
.step-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #fff;
  border: 2rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-dot.on {
  background: $red;
  border-color: $red;
}
.step-dot.cur {
  box-shadow: 0 0 0 6rpx rgba(196, 30, 58, 0.12);
}
.step-num {
  font-size: 24rpx;
  color: $t3;
}
.step-num.on {
  color: #fff;
}
.step-label {
  font-size: 24rpx;
  color: $t3;
  margin-left: 12rpx;
  flex-shrink: 0;
}
.step-label.on {
  color: $t1;
  font-weight: 600;
}
.step-line {
  flex: 1;
  height: 2rpx;
  background: $line;
  margin: 0 16rpx;
}
.step-line.on {
  background: $red;
}

/* ===== 风格横滑选择 ===== */
.tpls {
  display: flex;
  gap: 24rpx;
  padding: 20rpx $px 8rpx;
  overflow-x: auto;
  white-space: nowrap;
}
.tpl {
  flex-shrink: 0;
  width: 170rpx;
}
.tpl-cover {
  width: 170rpx;
  height: 238rpx;
  border-radius: 24rpx;
  position: relative;
  overflow: hidden;
  border: 4rpx solid transparent;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tpl-cover.on {
  border-color: $red;
  box-shadow: 0 0 0 4rpx rgba(196, 30, 58, 0.15);
}
.tpl-check {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: $red;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tpl-tc {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.tpl-tc-sub {
  font-size: 20rpx;
  opacity: 0.85;
  letter-spacing: 4rpx;
}
.tpl-tc-main {
  font-size: 30rpx;
  font-weight: 700;
  margin-top: 8rpx;
}
.tpl-name {
  display: block;
  font-size: 24rpx;
  color: $t2;
  text-align: center;
  margin-top: 14rpx;
}
.tpl-name.on {
  color: $red;
  font-weight: 600;
}
.tpl-tail {
  width: 8rpx;
  flex-shrink: 0;
}

/* ===== 实时预览 ===== */
.preview {
  margin: 28rpx $px 0;
  background: $card;
  border: 2rpx solid $line;
  border-radius: $radius;
  padding: 32rpx;
  text-align: center;
  box-shadow: $shadow;
}
.pv-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $t1;
}
.pv-hint {
  display: block;
  font-size: 22rpx;
  color: $t3;
  margin-top: 6rpx;
  margin-bottom: 28rpx;
}
.pv-img {
  width: 360rpx;
  height: 510rpx;
  margin: 0 auto;
  border-radius: 24rpx;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  box-sizing: border-box;
  box-shadow: 0 20rpx 60rpx rgba(160, 24, 40, 0.28);
}
.pv-deco {
  position: absolute;
  border-radius: 50%;
}
.pv-deco-1 {
  top: 0;
  right: 0;
  width: 180rpx;
  height: 180rpx;
  background: rgba(255, 255, 255, 0.12);
  transform: translate(45%, -45%);
}
.pv-deco-2 {
  bottom: 0;
  left: 0;
  width: 260rpx;
  height: 260rpx;
  background: rgba(255, 255, 255, 0.08);
  transform: translate(-45%, 45%);
}
.pv-brand {
  font-size: 22rpx;
  letter-spacing: 6rpx;
  opacity: 0.85;
}
.pv-avatar {
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.35);
  overflow: hidden;
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pv-avatar-img {
  width: 100%;
  height: 100%;
}
.pv-avatar-txt {
  color: #fff;
  font-size: 44rpx;
  font-weight: 700;
}
.pv-big {
  font-size: 40rpx;
  font-weight: 700;
  margin-top: 16rpx;
  line-height: 1.4;
}
.pv-sub {
  font-size: 22rpx;
  opacity: 0.85;
  margin-top: 10rpx;
}
.pv-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 12rpx;
}
.pv-stat-num {
  font-size: 40rpx;
  font-weight: 700;
}
.pv-stat-label {
  font-size: 20rpx;
  opacity: 0.75;
}
.pv-qr {
  width: 100rpx;
  height: 100rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-top: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pv-qr-txt {
  font-size: 20rpx;
  opacity: 0.8;
  margin-top: 10rpx;
}

/* ===== 底部生成按钮 ===== */
.bottom {
  padding: 32rpx $px 64rpx;
}
.genbtn {
  height: 96rpx;
  border-radius: $radius;
  background: $red;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.28);
}
.genbtn-txt {
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}
.poster-tip {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: $t3;
  margin-top: 28rpx;
  line-height: 1.5;
}

/* ===== ② 生成中 loading 遮罩 ===== */
.mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(20, 10, 12, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32rpx;
}
.mask-t {
  color: #fff;
  font-size: 28rpx;
}

/* ===== ③ 完成结果层 ===== */
.result {
  position: fixed;
  inset: 0;
  z-index: 110;
  background: rgba(20, 10, 12, 0.82);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
  box-sizing: border-box;
}
.r-poster {
  width: 420rpx;
  height: 594rpx;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 40rpx 100rpx rgba(0, 0, 0, 0.5);
  background: #fff;
}
.r-hint {
  color: rgba(255, 255, 255, 0.85);
  font-size: 24rpx;
  margin-top: 36rpx;
}
.r-actions {
  display: flex;
  gap: 28rpx;
  margin-top: 40rpx;
  width: 100%;
  max-width: 560rpx;
}
.r-btn {
  flex: 1;
  height: 92rpx;
  border-radius: $radius;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.r-btn.disabled {
  opacity: 0.6;
}
.r-btn.save {
  background: #fff;
}
.r-btn.share {
  background: $gold;
}
.r-btn-txt {
  font-size: 28rpx;
  font-weight: 600;
}
.r-btn-txt--save {
  color: $red;
}
.r-btn-txt--share {
  color: #fff;
}
.r-redo {
  margin-top: 36rpx;
  color: rgba(255, 255, 255, 0.7);
  font-size: 26rpx;
  text-decoration: underline;
}
</style>
