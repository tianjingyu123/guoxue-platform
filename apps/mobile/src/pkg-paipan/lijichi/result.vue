<script setup lang="ts">
/**
 * 立极尺盘面页——自 V0 app/lijichi/result/page.tsx 还原
 * 复用第一批电子罗盘盘面组件（../luopan/luopan-plate.vue），叠加：
 * 固定立极线（竖直红虚线+太极点）+ 户型图图层（上传/拖动/缩放/旋转）+ 拖动旋转盘面 + 盘制切换。
 * 取舍：
 * - V0 玄空飞星深链保留：同批 xuankong/result 已就位，payload 契约（XuankongParams）逐字段核实一致
 * - V0 PointerEvent 改多端 touch 事件；户型图 URL.createObjectURL 改 uni.chooseImage 临时路径
 * - luopan-plate 无 V0 的 overlay 半透明面板（该组件属第一批只读目录），改在本页对盘面容器加
 *   opacity 半透明近似 V0 叠图效果
 * - V0 无指南针联动（纯手动立极），故不接 ../luopan/compass 适配层
 * - 自定义 toast 改 uni.showToast；保存写本地历史（key: rebu:lijichi-history，上限 50）
 * - R4 合规：小程序端标题改文化研究表述
 */
import { ref, computed, getCurrentInstance } from 'vue'
import { onLoad, onReady } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import AppIcon from '@/components/common/app-icon.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { navigateTo } from '@/utils/router'
import LuopanPlate from '../luopan/luopan-plate.vue'
import { PLATE_STYLES, mountainCenterDeg, type PlateStyle } from '@/pkg-paipan/lib/luopan-data'
import { MOUNTAINS, currentPeriod } from '@/pkg-paipan/lib/xuankong-data'

const HISTORY_KEY = 'rebu:lijichi-history'

interface LjRecord {
  id: number
  client: string
  dateText: string
  shanxiang: string
  sitting: number
  heading?: number
  plate?: string
  note?: string
  createdAt: number
}

const PLATE_IDS = PLATE_STYLES.map((p) => p.id)

// ── 输入参数 ──
const customer = ref('')
const sittingIdx = ref(1)
const invalid = ref(false)

const facingIdx = computed(() => (sittingIdx.value + 12) % 24)
const shanxiang = computed(() => `${MOUNTAINS[sittingIdx.value]}山${MOUNTAINS[facingIdx.value]}向`)
const zuoxiang = computed(() => `坐${MOUNTAINS[sittingIdx.value]}向${MOUNTAINS[facingIdx.value]}`)

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let isMp = false
// #ifdef MP-WEIXIN
isMp = true
// #endif
const hdrTitle = computed(() => {
  if (isMp) return '立极文化研究'
  return customer.value ? `${customer.value}·${shanxiang.value}` : shanxiang.value
})

// ── 盘面状态 ──
/** 盘面初始朝向：向首置于正上方 */
const initHeading = computed(() => mountainCenterDeg(facingIdx.value))
const heading = ref(0) // 归一化 0~360，供读数/保存
const headingSpin = ref(0) // 连续累计角，供盘面旋转（避免 359°→0° 回绕倒转，同第一批 luopan）
const locked = ref(false)
const plate = ref<PlateStyle>('sanyuan')
const mode = ref<'plate' | 'floorplan'>('plate')
const note = ref('')
const noteDraft = ref('')

// ── 户型图 ──
const fpUrl = ref('')
const fp = ref({ x: 0, y: 0, scale: 1, rotate: 0 })

const showStyle = ref(false)
const showNote = ref(false)
const showContact = ref(false)

onLoad((opts: Record<string, string> = {}) => {
  try {
    if (!opts.payload) throw new Error('missing payload')
    const p = JSON.parse(decodeURIComponent(opts.payload)) as Record<string, unknown>
    const s = Number(p.sitting)
    if (!Number.isFinite(s)) throw new Error('invalid sitting')
    sittingIdx.value = Math.max(0, Math.min(23, Math.round(s)))
    customer.value = p.customer ? String(p.customer) : ''
    if (typeof p.plate === 'string' && (PLATE_IDS as string[]).includes(p.plate)) {
      plate.value = p.plate as PlateStyle
    }
    if (typeof p.note === 'string') {
      note.value = p.note
      noteDraft.value = p.note
    }
    const h = Number(p.heading)
    const start = Number.isFinite(h) ? ((h % 360) + 360) % 360 : initHeading.value
    heading.value = start
    headingSpin.value = start
  } catch {
    invalid.value = true
  }
})

const plateName = computed(() => PLATE_STYLES.find((p) => p.id === plate.value)?.name ?? '')
const headingText = computed(() => String(Math.round(heading.value * 10) / 10))

/** 最短路径增量旋转（保持 headingSpin 连续） */
function applyDelta(delta: number) {
  headingSpin.value += delta
  heading.value = ((heading.value + delta) % 360 + 360) % 360
}

// ── 舞台拖动（盘面旋转 / 户型图平移） ──
const inst = getCurrentInstance()
let stageCenter: { x: number; y: number } | null = null
const drag = { active: false, lastX: 0, lastY: 0, lastAngle: 0 }

function measureStage() {
  uni.createSelectorQuery().in(inst).select('.stage').boundingClientRect().exec((res) => {
    const r = (res?.[0] || null) as UniApp.NodeInfo | null
    if (r && typeof r.left === 'number' && r.width) {
      stageCenter = { x: r.left + r.width / 2, y: (r.top ?? 0) + (r.height ?? r.width) / 2 }
    }
  })
}
onReady(measureStage)

function pointerAngle(x: number, y: number) {
  if (!stageCenter) return 0
  return (Math.atan2(y - stageCenter.y, x - stageCenter.x) * 180) / Math.PI
}

function onTouchStart(e: any /* uni 触摸事件经 vue-tsc 按原生签名校验，参数须 any */) {
  const t = (e as { touches: { clientX: number; clientY: number }[] }).touches?.[0]
  if (!t) return
  if (!stageCenter) measureStage()
  drag.active = true
  drag.lastX = t.clientX
  drag.lastY = t.clientY
  drag.lastAngle = pointerAngle(t.clientX, t.clientY)
}

function onTouchMove(e: any /* 同上 */) {
  if (!drag.active) return
  const t = (e as { touches: { clientX: number; clientY: number }[] }).touches?.[0]
  if (!t) return
  if (mode.value === 'floorplan' && fpUrl.value) {
    fp.value = {
      ...fp.value,
      x: fp.value.x + (t.clientX - drag.lastX),
      y: fp.value.y + (t.clientY - drag.lastY),
    }
    drag.lastX = t.clientX
    drag.lastY = t.clientY
  } else if (mode.value === 'plate' && !locked.value) {
    const a = pointerAngle(t.clientX, t.clientY)
    let d = a - drag.lastAngle
    if (d > 180) d -= 360
    if (d < -180) d += 360
    applyDelta(d)
    drag.lastAngle = a
  }
}

function onTouchEnd() {
  drag.active = false
}

// ── 控制面板 ──
function rotateStep(dir: -1 | 1) {
  const step = 2 * dir
  if (mode.value === 'floorplan' && fpUrl.value) {
    fp.value = { ...fp.value, rotate: fp.value.rotate + step * 2 }
  } else if (!locked.value) {
    applyDelta(step)
  } else {
    uni.showToast({ title: '盘面已锁定', icon: 'none' })
  }
}

function toggleLock() {
  locked.value = !locked.value
}

function toggleMode() {
  if (mode.value === 'plate' && !fpUrl.value) {
    uni.showToast({ title: '请先上传户型图', icon: 'none' })
    return
  }
  mode.value = mode.value === 'floorplan' ? 'plate' : 'floorplan'
}

function chooseFloorplan() {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const path = Array.isArray(res.tempFilePaths) ? res.tempFilePaths[0] : String(res.tempFilePaths)
      if (!path) return
      fpUrl.value = path
      fp.value = { x: 0, y: 0, scale: 1, rotate: 0 }
      mode.value = 'floorplan'
      locked.value = true
    },
  })
}

function fpZoom(dir: -1 | 1) {
  const s = Math.round((fp.value.scale + dir * 0.1) * 10) / 10
  fp.value = { ...fp.value, scale: Math.min(4, Math.max(0.3, s)) }
}
function fpRotate(dir: -1 | 1) {
  fp.value = { ...fp.value, rotate: fp.value.rotate + dir * 2 }
}

function cycleStyle() {
  const idx = PLATE_STYLES.findIndex((p) => p.id === plate.value)
  plate.value = PLATE_STYLES[(idx + 1) % PLATE_STYLES.length].id
}

function pickStyle(id: PlateStyle) {
  plate.value = id
  showStyle.value = false
}

/** 玄空飞星：以当前坐向 + 当下时间起盘（payload 契约同 xuankong/result 的 XuankongParams） */
function gotoXuankong() {
  const now = new Date()
  const params = {
    customer: customer.value,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    period: currentPeriod(now.getFullYear()),
    sitting: sittingIdx.value,
    shuikou: 0,
    ti: false,
  }
  navigateTo(`/pkg-paipan/xuankong/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}

// ── 底部动作 ──
function openNote() {
  noteDraft.value = note.value
  showNote.value = true
}
function confirmNote() {
  note.value = noteDraft.value.trim()
  showNote.value = false
  uni.showToast({ title: '笔记已记录', icon: 'none' })
}

function pad(n: number) { return String(n).padStart(2, '0') }

function save() {
  const now = new Date()
  const dateText = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}:${pad(now.getMinutes())}`
  const rec: LjRecord = {
    id: Date.now(),
    client: customer.value || '未命名',
    dateText,
    shanxiang: shanxiang.value,
    sitting: sittingIdx.value,
    heading: Math.round(heading.value * 10) / 10,
    plate: plate.value,
    note: note.value,
    createdAt: Date.now(),
  }
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    const list = raw ? (JSON.parse(raw) as LjRecord[]) : []
    list.unshift(rec)
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, 50)))
    uni.showToast({ title: '已保存到历史记录', icon: 'none' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function share() {
  const text = `立极尺 · ${customer.value ? `${customer.value} · ` : ''}${shanxiang.value}（${Math.round(heading.value)}°）`
  // #ifdef H5
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> }
  if (nav.share) {
    nav.share({ title: '立极尺', text }).catch(() => {})
    return
  }
  // #endif
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制分享内容', icon: 'none' }),
  })
}

// ── 视图样式 ──
const fpStyle = computed(() => {
  const f = fp.value
  return (
    `transform:translate(-50%,-50%) translate(${f.x}px,${f.y}px) ` +
    `rotate(${f.rotate}deg) scale(${f.scale});`
  )
})
</script>

<template>
  <view class="page">
    <tool-header
      :title="hdrTitle"
      back-href="/pkg-paipan/lijichi/index"
      @share="share"
    />

    <!-- 参数无效 -->
    <view v-if="invalid" class="invalid">
      <text class="invalid-text">参数无效，请重新创建立极尺</text>
      <view class="invalid-btn" @tap="navigateTo('/pkg-paipan/lijichi/index')">
        <text class="invalid-btn-text">返回创建</text>
      </view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="body">
        <!-- 罗盘舞台 -->
        <view
          class="stage"
          @touchstart="onTouchStart"
          @touchmove.stop.prevent="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
        >
          <!-- 户型图层 -->
          <image
            v-if="fpUrl"
            class="fp-img"
            :src="fpUrl"
            mode="aspectFit"
            :style="fpStyle"
          />

          <!-- 罗盘盘面（叠图时半透明，近似 V0 overlay 面板） -->
          <view class="plate-box" :class="{ 'plate-overlay': !!fpUrl }">
            <luopan-plate
              :plate-style="plate"
              :heading="headingSpin"
              :locked="locked"
              :sitting-idx="sittingIdx"
            />
          </view>

          <!-- 立极线（固定竖直红虚线 + 太极点） -->
          <view class="axis-line" />
          <view class="axis-dot" />

          <!-- 户型图模式：缩放/旋转浮动控制 -->
          <view v-if="mode === 'floorplan' && fpUrl" class="fp-ctrls">
            <view class="fp-ctrl" @tap="fpZoom(1)">
              <app-icon name="plus" :size="30" color="var(--text-ink)" />
            </view>
            <view class="fp-ctrl" @tap="fpZoom(-1)">
              <app-icon name="minus" :size="30" color="var(--text-ink)" />
            </view>
            <view class="fp-ctrl" @tap="fpRotate(-1)">
              <app-icon name="undo-2" :size="30" color="var(--text-ink)" />
            </view>
            <view class="fp-ctrl" @tap="fpRotate(1)">
              <view class="flip-x">
                <app-icon name="undo-2" :size="30" color="var(--text-ink)" />
              </view>
            </view>
          </view>
        </view>

        <!-- 坐向读数条 -->
        <view class="readout">
          <text class="readout-sx">{{ zuoxiang }}</text>
          <text class="readout-deg">{{ headingText }}°</text>
        </view>

        <!-- 控制面板 -->
        <view class="panel">
          <view class="ctrl ctrl-primary" @tap="rotateStep(-1)">
            <app-icon name="undo-2" :size="28" color="#ffffff" />
            <text class="ctrl-text">左转</text>
          </view>
          <view class="ctrl" :class="locked ? 'ctrl-danger' : 'ctrl-primary'" @tap="toggleLock">
            <app-icon name="lock" :size="28" color="#ffffff" />
            <text class="ctrl-text">{{ locked ? '已锁定' : '旋转锁定' }}</text>
          </view>
          <view class="ctrl" :class="mode === 'floorplan' ? 'ctrl-good' : 'ctrl-primary'" @tap="toggleMode">
            <app-icon name="layers" :size="28" color="#ffffff" />
            <text class="ctrl-text">户型图</text>
          </view>
          <view class="ctrl ctrl-primary" @tap="rotateStep(1)">
            <text class="ctrl-text">右转</text>
            <view class="flip-x">
              <app-icon name="undo-2" :size="28" color="#ffffff" />
            </view>
          </view>

          <view class="ctrl ctrl-primary" @tap="chooseFloorplan">
            <app-icon name="image-plus" :size="28" color="#ffffff" />
            <text class="ctrl-text">上传</text>
          </view>
          <view class="ctrl ctrl-primary" @tap="cycleStyle">
            <app-icon name="grid" :size="28" color="#ffffff" />
            <text class="ctrl-text">切换样式</text>
          </view>
          <view class="ctrl ctrl-primary" @tap="gotoXuankong">
            <app-icon name="compass" :size="28" color="#ffffff" />
            <text class="ctrl-text">玄空飞星</text>
          </view>
          <view class="ctrl ctrl-plain" @tap="showStyle = true">
            <text class="ctrl-text ctrl-text-ink">{{ shanxiang }}</text>
          </view>
        </view>
        <text class="panel-hint">
          户型图模式：户型图可旋转、移动、缩放，立极尺锁定。当前盘面：{{ plateName }}
        </text>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="立极尺为传统堪舆文化工具，所示方位仅供文化研究与参考，不构成任何决策建议。"
        />
      </scroll-view>

      <!-- 底部导航 -->
      <view class="nav">
        <view class="nav-item" @tap="showContact = true">
          <app-icon name="headphones" :size="36" color="var(--text-soft)" />
          <text class="nav-text">客服</text>
        </view>
        <view class="nav-item" @tap="share">
          <app-icon name="share-2" :size="36" color="var(--text-soft)" />
          <text class="nav-text">分享</text>
        </view>
        <view class="nav-item" @tap="openNote">
          <app-icon name="sticky-note" :size="36" :color="note ? 'var(--brand)' : 'var(--text-soft)'" />
          <text class="nav-text" :class="{ 'nav-text-on': note }">笔记</text>
        </view>
        <view class="nav-item" @tap="save">
          <app-icon name="save" :size="36" color="var(--brand)" />
          <text class="nav-text nav-text-on">保存</text>
        </view>
      </view>
    </template>

    <!-- 盘面样式选择 -->
    <view v-if="showStyle" class="mask" @tap="showStyle = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-hdr">
          <text class="sheet-title">选择盘面样式</text>
          <view class="sheet-close" @tap="showStyle = false">
            <app-icon name="x" :size="36" color="var(--text-soft)" />
          </view>
        </view>
        <view class="style-grid">
          <view
            v-for="p in PLATE_STYLES"
            :key="p.id"
            class="style-item"
            :class="{ 'style-item-on': plate === p.id }"
            @tap="pickStyle(p.id)"
          >
            <text class="style-name">{{ p.name }}</text>
            <text class="style-desc">{{ p.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 勘测笔记 -->
    <view v-if="showNote" class="mask mask-center" @tap="showNote = false">
      <view class="modal" @tap.stop>
        <view class="modal-hdr">
          <text class="modal-title">勘测笔记</text>
          <view class="sheet-close" @tap="showNote = false">
            <app-icon name="x" :size="36" color="var(--text-soft)" />
          </view>
        </view>
        <view class="modal-body">
          <textarea
            v-model="noteDraft"
            class="note-input"
            placeholder="记录本次立极的现场情况、峦头砂水、注意事项…"
            :maxlength="500"
          />
          <view class="note-ok" @tap="confirmNote">
            <app-icon name="check" :size="28" color="#ffffff" />
            <text class="note-ok-text">完成</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 客服 -->
    <view v-if="showContact" class="mask mask-center" @tap="showContact = false">
      <view class="modal modal-sm" @tap.stop>
        <view class="contact-body">
          <app-icon name="headphones" :size="64" color="var(--brand)" />
          <text class="contact-title">在线客服</text>
          <text class="contact-desc">
            立极尺使用如有疑问，可在入口页「历史记录」中回看，或联系客服协助解读盘面。
          </text>
          <view class="contact-ok" @tap="showContact = false">
            <text class="contact-ok-text">知道了</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-paper);
}
.body {
  flex: 1;
  height: 0; /* 显式高度，规避 iOS flex 子项 min-height 坍缩 */
}

/* ── 参数无效 ── */
.invalid { padding: 160rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 32rpx; }
.invalid-text { font-size: 28rpx; color: var(--text-soft); }
.invalid-btn {
  padding: 20rpx 64rpx; border-radius: 999rpx;
  background: var(--brand);
  &:active { opacity: 0.9; }
}
.invalid-btn-text { font-size: 28rpx; font-weight: 700; color: #fff; }

/* ── 罗盘舞台 ── */
.stage {
  position: relative;
  width: 100%;
  height: 700rpx;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.03);
}
.fp-img {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 616rpx;
  height: 616rpx;
}
.plate-box {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 640rpx;
  height: 640rpx;
  margin-left: -320rpx;
  margin-top: -320rpx;
}
.plate-overlay {
  opacity: 0.55;
}
.axis-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 3rpx dashed rgba(196, 30, 58, 0.7);
  margin-left: -1rpx;
}
.axis-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20rpx;
  height: 20rpx;
  margin-left: -10rpx;
  margin-top: -10rpx;
  border-radius: 50%;
  background: var(--brand);
  border: 4rpx solid var(--bg-paper);
  box-sizing: border-box;
  z-index: 10;
}
.fp-ctrls {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.fp-ctrl {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid var(--line);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { transform: scale(0.95); }
}
.flip-x { transform: scaleX(-1); display: flex; }

/* ── 坐向读数条 ── */
.readout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx;
}
.readout-sx {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-ink);
}
.readout-deg {
  font-family: monospace;
  font-size: 28rpx;
  color: var(--brand);
}

/* ── 控制面板 ── */
.panel {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 0 24rpx;
}
.ctrl {
  width: calc(25% - 12rpx);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx 0;
  border-radius: 16rpx;
  &:active { opacity: 0.85; }
}
.ctrl-primary { background: var(--brand); }
.ctrl-danger { background: #8c2f23; }
.ctrl-good { background: #3f7d4e; }
.ctrl-plain { background: var(--card); border: 1rpx solid var(--line); }
.ctrl-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
}
.ctrl-text-ink {
  color: var(--text-ink);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.panel-hint {
  display: block;
  padding: 16rpx 32rpx 0;
  text-align: center;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--text-soft);
}

/* ── 底部导航 ── */
.nav {
  display: flex;
  border-top: 1rpx solid var(--line);
  background: var(--card);
  padding-bottom: env(safe-area-inset-bottom);
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 18rpx 0;
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.nav-text { font-size: 22rpx; color: var(--text-soft); }
.nav-text-on { color: var(--brand); font-weight: 700; }

/* ── 弹层 ── */
.mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.mask-center { align-items: center; justify-content: center; padding: 48rpx; background: rgba(0, 0, 0, 0.5); }
.sheet {
  width: 100%;
  background: var(--card);
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
}
.sheet-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.sheet-close {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
}
.style-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 16rpx;
}
.style-item {
  width: calc(50% - 24rpx);
  margin: 12rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  border: 1rpx solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  box-sizing: border-box;
  &:active { opacity: 0.85; }
}
.style-item-on {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.05);
}
.style-name {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-ink);
}
.style-desc { font-size: 20rpx; line-height: 1.6; color: var(--text-soft); }

/* ── 笔记 / 客服弹窗 ── */
.modal {
  width: 100%;
  max-width: 640rpx;
  background: var(--card);
  border-radius: 32rpx;
  overflow: hidden;
}
.modal-sm { max-width: 560rpx; }
.modal-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 40rpx;
  border-bottom: 1rpx solid var(--line);
}
.modal-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.modal-body { padding: 32rpx; }
.note-input {
  width: 100%;
  height: 240rpx;
  box-sizing: border-box;
  padding: 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  font-size: 28rpx;
  line-height: 1.6;
  color: var(--text-ink);
}
.note-ok {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 22rpx 0;
  border-radius: 16rpx;
  background: var(--brand);
  &:active { opacity: 0.9; }
}
.note-ok-text { font-size: 28rpx; font-weight: 700; color: #fff; }
.contact-body {
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.contact-title { margin-top: 12rpx; font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.contact-desc { font-size: 26rpx; line-height: 1.7; color: var(--text-soft); text-align: center; }
.contact-ok {
  margin-top: 20rpx;
  width: 100%;
  padding: 20rpx 0;
  border-radius: 16rpx;
  background: var(--brand);
  &:active { opacity: 0.9; }
}
.contact-ok-text { display: block; text-align: center; font-size: 28rpx; font-weight: 700; color: #fff; }
</style>
