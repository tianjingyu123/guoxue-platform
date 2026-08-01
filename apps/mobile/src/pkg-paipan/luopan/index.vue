<script setup lang="ts">
/**
 * 电子罗盘（自 V0 app/luopan/page.tsx 还原）
 *
 * 相对 V0 的取舍：
 * - 砍：Leaflet 地图/GPS 反查/立极尺测距（外链 OSM 小程序域名白名单不通，且非罗盘主线）、
 *       勘测卡片海报导出（本批统一砍海报）、玄空飞星深链（项目内无 xuankong 页面）
 * - 留：多盘制盘面、实时定向、锁定判读（坐山/向首/八方）、手动降级
 * - 增：锁定后的坐向判读卡（替代 V0 深链动作区）
 *
 * 多端指南针：见 ./compass.ts；无传感器/被拒授权 → 诚实降级为手动拖动定向。
 */
import { ref, computed, onUnmounted } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import LuopanPlate from './luopan-plate.vue'
import { createCompass, type CompassStatus } from './compass'
import {
  PLATE_STYLES,
  sittingFacing,
  bearingToDirection,
  type PlateStyle,
} from '@/pkg-paipan/lib/luopan-data'

/** 传统罗盘制式为上南下北：无传感器数据时静置于正南 180°（午上、子下） */
const heading = ref(180) // 归一化 0~360，供读数/判读
const headingSpin = ref(180) // 连续累计角，供盘面旋转（避免 359°→0° 回绕倒转一整圈）
const locked = ref(false)
const plate = ref<PlateStyle>('sanyuan')
const showPicker = ref(false)
const sensorStatus = ref<CompassStatus>('starting')

const sf = computed(() => sittingFacing(heading.value))
const directionText = computed(() => bearingToDirection(heading.value))
const plateName = computed(() => PLATE_STYLES.find((p) => p.id === plate.value)?.name ?? '')
const manualVal = computed(() => Math.round(heading.value))

function applyHeading(deg: number) {
  if (locked.value) return
  const norm = ((deg % 360) + 360) % 360
  // 最短路径增量，累计到 headingSpin，保证旋转动画不回绕
  const delta = ((norm - heading.value + 540) % 360) - 180
  headingSpin.value += delta
  heading.value = norm
}

const compass = createCompass({
  onHeading: applyHeading,
  onStatus: (s) => {
    sensorStatus.value = s
  },
})

onShow(() => compass.start())
onHide(() => compass.stop())
onUnload(() => compass.stop())
onUnmounted(() => compass.stop())

function onSlider(e: { detail: { value: number } }) {
  applyHeading(e.detail.value)
}

function toggleLock() {
  locked.value = !locked.value
}

function pickPlate(id: PlateStyle) {
  plate.value = id
  showPicker.value = false
}
</script>

<template>
  <view class="page">
    <tool-header title="电子罗盘" subtitle="廿四山定向 · 民俗建筑研究" />

    <scroll-view scroll-y class="scroll">
      <view class="content">
        <!-- 顶部大度数读数（对应固定指针指向） -->
        <view class="readout">
          <text class="readout-deg">{{ sf.deg.toFixed(1) }}°</text>
          <text class="readout-dir">{{ directionText }}</text>
        </view>

        <!-- 盘面 -->
        <view class="plate-box">
          <luopan-plate
            :plate-style="plate"
            :heading="headingSpin"
            :locked="locked"
            :sitting-idx="locked ? sf.sittingIdx : null"
          />
        </view>

        <!-- 底部面板 -->
        <paper-card padding="md">
          <view class="panel">
            <!-- 坐向读数 + 盘制切换 -->
            <view class="row-top">
              <view class="sf-block">
                <text class="sf-label">{{ sf.label }}</text>
                <text class="sf-deg">{{ sf.deg }}°</text>
              </view>
              <view class="plate-btn" @tap="showPicker = true">
                <text class="plate-btn-text">{{ plateName }}</text>
                <app-icon name="refresh-cw" :size="24" color="var(--text-soft)" />
              </view>
            </view>

            <!-- 传感器状态 / 手动降级 -->
            <view v-if="sensorStatus === 'need-permission'" class="sensor-block">
              <view class="btn-primary" @tap="compass.requestPermission()">
                <app-icon name="navigation" :size="28" color="#ffffff" />
                <text class="btn-primary-text">开启罗盘感应</text>
              </view>
              <text class="sensor-hint">iOS 需授权“方向与运动”权限后方可自动定向</text>
            </view>
            <view v-else-if="sensorStatus !== 'active'" class="sensor-block">
              <text class="sensor-hint">{{
                sensorStatus === 'unavailable'
                  ? '当前设备不支持罗盘感应，已切换手动定向'
                  : '正在启动罗盘感应…'
              }}</text>
              <view class="manual-row">
                <text class="manual-tag">手动</text>
                <slider
                  class="manual-slider"
                  :min="0"
                  :max="359"
                  :step="1"
                  :value="manualVal"
                  :disabled="locked"
                  active-color="#b5432f"
                  block-size="20"
                  @changing="onSlider"
                  @change="onSlider"
                />
                <text class="manual-val">{{ manualVal }}°</text>
              </view>
            </view>
            <view v-else class="sensor-block">
              <text class="sensor-hint">手机顶部指向待测方向 · 远离磁铁与金属可提高精度</text>
            </view>

            <!-- 主操作：锁定 / 判读 -->
            <view v-if="!locked" class="btn-lock" @tap="toggleLock">
              <app-icon name="lock" :size="28" color="#ffffff" />
              <text class="btn-lock-text">锁定盘面</text>
            </view>
            <view v-else class="locked-area">
              <view class="verdict">
                <view class="verdict-row">
                  <text class="verdict-k">坐山</text>
                  <text class="verdict-v verdict-strong">{{ sf.sitting }}山</text>
                </view>
                <view class="verdict-row">
                  <text class="verdict-k">向首</text>
                  <text class="verdict-v verdict-strong">{{ sf.facing }}向</text>
                </view>
                <view class="verdict-row">
                  <text class="verdict-k">朝向</text>
                  <text class="verdict-v">{{ sf.deg }}° · {{ directionText }}</text>
                </view>
                <view class="verdict-row">
                  <text class="verdict-k">盘制</text>
                  <text class="verdict-v">{{ plateName }}</text>
                </view>
              </view>
              <view class="btn-unlock" @tap="toggleLock">
                <app-icon name="refresh-cw" :size="26" color="var(--text-soft)" />
                <text class="btn-unlock-text">解除锁定</text>
              </view>
            </view>
          </view>
        </paper-card>

        <disclaimer
          variant="custom"
          text="罗盘方位受手机传感器与周边磁场影响，仅供民俗与传统建筑文化研究参考，不构成任何决策依据。"
        />
      </view>
    </scroll-view>

    <!-- 盘制选择弹层 -->
    <view v-if="showPicker" class="mask" @tap="showPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-hd">
          <text class="sheet-title">选择盘面制式</text>
          <view class="sheet-close" @tap="showPicker = false">
            <app-icon name="x" :size="36" color="var(--text-soft)" />
          </view>
        </view>
        <view class="sheet-grid">
          <view
            v-for="p in PLATE_STYLES"
            :key="p.id"
            class="sheet-item"
            :class="{ on: plate === p.id }"
            @tap="pickPlate(p.id)"
          >
            <text class="sheet-item-name">{{ p.name }}</text>
            <text class="sheet-item-desc">{{ p.desc }}</text>
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
  background: var(--bg-paper, #faf8f5);
}
.scroll {
  flex: 1;
  height: 0; /* 显式高度，规避 iOS flex 子项 min-height 坍缩 */
}
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 32rpx 48rpx;
}

/* 顶部读数 */
.readout {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 12rpx 40rpx;
  border-radius: 999rpx;
  background: var(--card, #ffffff);
  border: 1rpx solid var(--line, #e8e2d8);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 28rpx;
}
.readout-deg {
  font-family: monospace;
  font-size: 48rpx;
  font-weight: 700;
  color: var(--text-ink, #2b2622);
}
.readout-dir {
  font-family: Georgia, 'Songti SC', 'SimSun', serif;
  font-size: 34rpx;
  font-weight: 700;
  color: #b5432f;
}

.plate-box {
  margin-bottom: 32rpx;
}

/* 底部面板 */
.panel {
  width: 622rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.row-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.sf-block {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.sf-label {
  font-family: Georgia, 'Songti SC', 'SimSun', serif;
  font-size: 44rpx;
  font-weight: 700;
  color: var(--text-ink, #2b2622);
}
.sf-deg {
  font-size: 26rpx;
  font-weight: 500;
  color: #b5432f;
}
.plate-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid var(--line, #e8e2d8);
  &:active {
    border-color: var(--brand, #b5432f);
  }
}
.plate-btn-text {
  font-size: 26rpx;
  color: var(--text-ink, #2b2622);
}

/* 传感器区 */
.sensor-block {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 22rpx 0;
  border-radius: 16rpx;
  background: var(--brand, #b5432f);
  &:active {
    opacity: 0.9;
  }
}
.btn-primary-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}
.sensor-hint {
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--text-soft, #8a8378);
  text-align: center;
}
.manual-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.manual-tag {
  flex-shrink: 0;
  font-size: 24rpx;
  color: var(--text-soft, #8a8378);
}
.manual-slider {
  flex: 1;
  margin: 0;
}
.manual-val {
  flex-shrink: 0;
  width: 84rpx;
  text-align: right;
  font-size: 24rpx;
  color: var(--text-ink, #2b2622);
}

/* 锁定 */
.btn-lock {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 26rpx 0;
  border-radius: 20rpx;
  background: var(--brand, #b5432f);
  box-shadow: 0 8rpx 24rpx rgba(181, 67, 47, 0.25);
  &:active {
    transform: scale(0.99);
  }
}
.btn-lock-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}
.locked-area {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.verdict {
  display: flex;
  flex-wrap: wrap;
  border-radius: 16rpx;
  background: rgba(181, 67, 47, 0.05);
  border: 1rpx solid rgba(181, 67, 47, 0.15);
  padding: 20rpx 8rpx;
}
.verdict-row {
  width: 50%;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  padding: 10rpx 16rpx;
  box-sizing: border-box;
}
.verdict-k {
  font-size: 22rpx;
  color: var(--text-soft, #8a8378);
  flex-shrink: 0;
}
.verdict-v {
  font-size: 26rpx;
  color: var(--text-ink, #2b2622);
}
.verdict-strong {
  font-family: Georgia, 'Songti SC', 'SimSun', serif;
  font-size: 32rpx;
  font-weight: 700;
  color: #b5432f;
}
.btn-unlock {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 18rpx 0;
  border-radius: 16rpx;
  border: 1rpx solid var(--line, #e8e2d8);
  &:active {
    background: rgba(0, 0, 0, 0.03);
  }
}
.btn-unlock-text {
  font-size: 26rpx;
  color: var(--text-soft, #8a8378);
}

/* 盘制弹层 */
.mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.sheet {
  background: var(--card, #ffffff);
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
}
.sheet-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--line, #e8e2d8);
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-ink, #2b2622);
}
.sheet-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 16rpx;
}
.sheet-item {
  width: calc(50% - 24rpx);
  margin: 12rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  border: 1rpx solid var(--line, #e8e2d8);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  box-sizing: border-box;
  &.on {
    border-color: var(--brand, #b5432f);
    background: rgba(181, 67, 47, 0.05);
  }
}
.sheet-item-name {
  font-family: Georgia, 'Songti SC', 'SimSun', serif;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-ink, #2b2622);
}
.sheet-item-desc {
  font-size: 20rpx;
  line-height: 1.6;
  color: var(--text-soft, #8a8378);
}
</style>
