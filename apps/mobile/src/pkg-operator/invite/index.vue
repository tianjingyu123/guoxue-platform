<template>
  <view v-if="loading" class="state-loading"><text>加载中...</text></view>
  <view v-else-if="error" class="state-error">
    <text class="state-error-text">{{ error }}</text>
    <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
  </view>
  <view v-else class="invite-page">
    <app-nav-bar title="邀请站长" :show-back="true" serif-title />

    <!-- 三态 Tab -->
    <view class="inv-tabs">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="inv-tab"
        :class="{ on: activeTab === t.key }"
        @tap="switchTab(t.key)"
      >
        <text class="inv-tab-txt">{{ t.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="inv-scroll">
      <!-- ============ 态一：二维码 ============ -->
      <view v-if="activeTab === 'qr'" class="inv-pane">
        <!-- 名额提示 -->
        <view class="inv-quota">
          <app-icon name="info" :size="30" color="#97794a" />
          <text class="inv-quota-txt">每成功邀请一位站长占用 1 个可售名额</text>
        </view>

        <!-- 二维码卡 -->
        <view class="inv-card inv-qr-card">
          <view class="inv-qr-box">
            <canvas
              canvas-id="inviteQr"
              class="inv-qr-canvas"
              :style="{ width: QR_PX + 'px', height: QR_PX + 'px' }"
            />
            <view v-if="!qrReady" class="inv-qr-ph"><text>二维码</text></view>
          </view>
          <text class="inv-op-name">{{ opName }}</text>
          <text class="inv-op-sub">扫描二维码，加入我的国学分站团队</text>
          <view class="inv-code-line">
            <text class="inv-code-label">邀请码</text>
            <text class="inv-code-val">{{ inviteCode }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="inv-btn-row">
          <view class="inv-btn inv-btn-out" @tap="saveQr">
            <app-icon name="download" :size="30" color="#C41E3A" />
            <text class="inv-btn-out-txt">保存图片</text>
          </view>
          <view class="inv-btn inv-btn-solid" @tap="share">
            <app-icon name="share-2" :size="30" color="#ffffff" />
            <text class="inv-btn-solid-txt">分享</text>
          </view>
        </view>
      </view>

      <!-- ============ 态二：链接邀请 ============ -->
      <view v-else-if="activeTab === 'link'" class="inv-pane">
        <!-- 专属链接 -->
        <view class="inv-card">
          <text class="inv-lbl">专属邀请链接</text>
          <view class="inv-link-field">
            <text class="inv-link-txt">{{ inviteLink }}</text>
            <text class="inv-link-cp" :class="{ copied }" @tap="copy(inviteLink)">{{ copied ? '已复制' : '复制' }}</text>
          </view>
        </view>

        <!-- 自定义推荐语 -->
        <view class="inv-card">
          <text class="inv-lbl">自定义推荐语（选填）</text>
          <textarea
            v-model="message"
            class="inv-textarea"
            :maxlength="100"
            placeholder="诚邀您加入我的国学分站计划，无需门槛即可推广国学好课与好物，收益按月结算。"
            placeholder-class="inv-textarea-ph"
          />
          <text class="inv-textarea-count">{{ message.length }}/100</text>
        </view>

        <!-- 生成并分享 -->
        <view class="inv-full-btn" @tap="shareMessage">
          <text class="inv-full-btn-txt">生成邀请消息并分享</text>
        </view>

        <!-- 消息预览 -->
        <view class="inv-card">
          <text class="inv-lbl">消息预览</text>
          <view class="inv-preview">
            <view class="inv-bubble">
              <text class="inv-bubble-txt">{{ previewText }}</text>
              <view class="inv-link-card">
                <view class="inv-lc-ic"><text>卜</text></view>
                <view class="inv-lc-body">
                  <text class="inv-lc-t">加入{{ opName }}分站团队</text>
                  <text class="inv-lc-d">{{ brandName }} · 点击了解详情</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- ============ 态三：邀请记录 ============ -->
      <view v-else class="inv-pane">
        <!-- 统计 -->
        <view class="inv-card inv-stat-card">
          <view class="inv-stat-col">
            <text class="inv-stat-val">{{ invited.length }}</text>
            <text class="inv-stat-lbl">已邀请</text>
          </view>
          <view class="inv-stat-div" />
          <view class="inv-stat-col">
            <text class="inv-stat-val ok">{{ joinedCount }}</text>
            <text class="inv-stat-lbl">已加入</text>
          </view>
          <view class="inv-stat-div" />
          <view class="inv-stat-col">
            <text class="inv-stat-val wait">{{ pendingCount }}</text>
            <text class="inv-stat-lbl">待加入</text>
          </view>
        </view>

        <!-- 空态 -->
        <view v-if="invited.length === 0" class="inv-empty">
          <app-icon name="users" :size="72" color="#d6cdbf" />
          <text class="inv-empty-txt">还没有邀请记录</text>
          <text class="inv-empty-sub">切换到二维码或链接邀请，邀请第一位站长</text>
        </view>

        <!-- 记录列表 -->
        <template v-else>
          <text v-if="joinedCount > 0" class="inv-sec-lbl">已加入（{{ joinedCount }}）</text>
          <view v-for="s in joinedList" :key="s.id" class="inv-rec">
            <view class="inv-rec-av ok"><text>{{ avatarChar(s.name) }}</text></view>
            <view class="inv-rec-info">
              <text class="inv-rec-name">{{ s.name }}</text>
              <text class="inv-rec-date">{{ s.joinedAt }} 加入</text>
            </view>
            <text class="inv-rst inv-rst-ok">已加入</text>
          </view>

          <text v-if="pendingCount > 0" class="inv-sec-lbl">待加入（{{ pendingCount }}）</text>
          <view v-for="s in pendingList" :key="s.id" class="inv-rec">
            <view class="inv-rec-av wait"><text>{{ avatarChar(s.name) }}</text></view>
            <view class="inv-rec-info">
              <text class="inv-rec-name">{{ s.name }}</text>
              <text class="inv-rec-date">{{ s.joinedAt }} 已发送邀请</text>
            </view>
            <text class="inv-rst inv-rst-wait">待加入</text>
          </view>
        </template>
      </view>

      <view class="inv-bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance, nextTick } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { operatorApi, type InvitedStation } from '@/pkg-operator/lib/operator-data'
import { BRAND } from '@/lib/brand'
import { drawQrToCanvas } from '@/utils/qrcode'

const instance = getCurrentInstance()?.proxy

const loading = ref(true)
const error = ref('')
const invited = ref<InvitedStation[]>([])
const inviteLink = ref('')
const inviteCode = ref('')
const copied = ref(false)
const submitting = ref(false)
const message = ref('')

const activeTab = ref<'qr' | 'link' | 'record'>('qr')
const tabs = [
  { key: 'qr' as const, label: '二维码' },
  { key: 'link' as const, label: '链接邀请' },
  { key: 'record' as const, label: '邀请记录' },
]

// 二维码画布尺寸（px·可视 canvas 用旧接口尺寸）
const QR_PX = 176
const qrReady = ref(false)

// 品牌名（预览气泡用·无独立运营商名字段 → 用品牌+邀请码派生一个展示名）
const brandName = BRAND?.name || '热卜国学'
const opName = computed(() => `${brandName}分站`)

async function load() {
  const [is, il, ic] = await Promise.all([
    operatorApi.getInvitedStations(),
    operatorApi.getInviteLinkFull(),
    operatorApi.getInviteCode(),
  ])
  invited.value = is
  inviteLink.value = il
  inviteCode.value = ic
}

onMounted(async () => {
  try {
    await load()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
  // 首屏在二维码态 → 渲染真二维码
  await nextTick()
  renderQr()
})

async function retry() {
  loading.value = true
  error.value = ''
  try {
    await load()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
  await nextTick()
  renderQr()
}

// 切换 Tab：切回二维码态需重绘（canvas 被 v-if 销毁过）
async function switchTab(key: 'qr' | 'link' | 'record') {
  activeTab.value = key
  if (key === 'qr') {
    qrReady.value = false
    await nextTick()
    renderQr()
  }
}

// ===== 邀请记录分组 =====
const joinedList = computed(() => invited.value.filter((s) => s.status === 'active'))
const pendingList = computed(() => invited.value.filter((s) => s.status !== 'active'))
const joinedCount = computed(() => joinedList.value.length)
const pendingCount = computed(() => pendingList.value.length)

function avatarChar(name: string): string {
  return name ? name.trim().charAt(0) : '?'
}

// ===== 预览文案 =====
const previewText = computed(
  () =>
    message.value.trim() ||
    '诚邀您加入我的国学分站计划，无需门槛即可推广国学好课与好物，收益按月结算。',
)

// ===== 二维码渲染（真二维码·内容=邀请链接） =====
function renderQr() {
  if (activeTab.value !== 'qr' || !inviteLink.value) return
  try {
    const ctx = uni.createCanvasContext('inviteQr', instance)
    const ok = drawQrToCanvas(ctx, inviteLink.value, 8, 8, QR_PX - 16, {})
    ctx.draw(false, () => {
      qrReady.value = ok
    })
  } catch (e) {
    qrReady.value = false
  }
}

// ===== 复制链接 =====
function copy(text: string) {
  if (submitting.value || !text) return
  submitting.value = true
  uni.setClipboardData({
    data: text,
    success: () => {
      copied.value = true
      uni.showToast({ title: '已复制', icon: 'none' })
      setTimeout(() => (copied.value = false), 2000)
    },
    complete: () => {
      submitting.value = false
    },
  })
}

// ===== 保存二维码到相册 =====
function saveQr() {
  if (!qrReady.value) {
    uni.showToast({ title: '二维码生成中，请稍候', icon: 'none' })
    return
  }
  uni.canvasToTempFilePath(
    {
      canvasId: 'inviteQr',
      success: (res) => {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => uni.showToast({ title: '已保存到相册', icon: 'none' }),
          fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' }),
        })
      },
      fail: () => uni.showToast({ title: '保存失败', icon: 'none' }),
    },
    instance,
  )
}

// ===== 分享（多端系统分享受限 → 统一降级为复制链接 + toast） =====
function share() {
  copy(inviteLink.value)
}

function shareMessage() {
  const full = `${previewText.value}\n${inviteLink.value}`
  copy(full)
}
</script>

<style lang="scss" scoped>
.invite-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

/* ===== 三态 Tab ===== */
.inv-tabs {
  display: flex;
  background: #ffffff;
  border-bottom: 2rpx solid #ece7df;
}
.inv-tab {
  flex: 1;
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.inv-tab-txt {
  font-size: 28rpx;
  color: #6e6e73;
}
.inv-tab.on .inv-tab-txt {
  color: #c41e3a;
  font-weight: 600;
}
.inv-tab.on::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 54rpx;
  height: 6rpx;
  background: #c41e3a;
  border-radius: 4rpx;
}

.inv-scroll {
  flex: 1;
  height: 0;
}
.inv-pane {
  padding: 34rpx 38rpx 0;
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.inv-card {
  background: #ffffff;
  border-radius: 35rpx;
  padding: 34rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
}

/* ===== 名额提示 ===== */
.inv-quota {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 22rpx 28rpx;
  background: #fbf6ee;
  border: 2rpx solid #eee2cc;
  border-radius: 24rpx;
}
.inv-quota-txt {
  flex: 1;
  font-size: 23rpx;
  color: #97794a;
  line-height: 1.5;
}

/* ===== 二维码卡 ===== */
.inv-qr-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 34rpx;
}
.inv-qr-box {
  width: 384rpx;
  height: 384rpx;
  border-radius: 30rpx;
  background: #ffffff;
  border: 2rpx solid #ece7df;
  box-shadow: 0 8rpx 30rpx rgba(60, 40, 20, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.inv-qr-canvas {
  display: block;
}
.inv-qr-ph {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
.inv-qr-ph text {
  font-size: 24rpx;
  color: #999999;
}
.inv-op-name {
  font-family: 'Songti SC', serif;
  font-size: 33rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-top: 30rpx;
}
.inv-op-sub {
  font-size: 23rpx;
  color: #6e6e73;
  margin-top: 8rpx;
}
.inv-code-line {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 24rpx;
}
.inv-code-label {
  font-size: 24rpx;
  color: #999999;
}
.inv-code-val {
  font-size: 34rpx;
  font-weight: 700;
  color: #c41e3a;
  letter-spacing: 6rpx;
}

/* ===== 操作按钮 ===== */
.inv-btn-row {
  display: flex;
  gap: 24rpx;
}
.inv-btn {
  flex: 1;
  min-height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}
.inv-btn-out {
  border: 3rpx solid #c41e3a;
  background: transparent;
}
.inv-btn-out-txt {
  font-size: 27rpx;
  font-weight: 600;
  color: #c41e3a;
}
.inv-btn-solid {
  background: #c41e3a;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.24);
}
.inv-btn-solid-txt {
  font-size: 27rpx;
  font-weight: 600;
  color: #ffffff;
}

/* ===== 链接 / 推荐语 ===== */
.inv-lbl {
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 18rpx;
  display: block;
}
.inv-link-field {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #f7f4ef;
  border: 2rpx solid #ece7df;
  border-radius: 24rpx;
  padding: 22rpx 28rpx;
}
.inv-link-txt {
  flex: 1;
  font-size: 23rpx;
  color: #6e6e73;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inv-link-cp {
  flex-shrink: 0;
  font-size: 26rpx;
  font-weight: 600;
  color: #c41e3a;
}
.inv-link-cp.copied {
  color: #2dae57;
}

.inv-textarea {
  width: 100%;
  min-height: 160rpx;
  background: #f7f4ef;
  border: 2rpx solid #ece7df;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  font-size: 26rpx;
  color: #2c2c2c;
  line-height: 1.6;
  box-sizing: border-box;
}
.inv-textarea-ph {
  color: #999999;
}
.inv-textarea-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #999999;
  margin-top: 12rpx;
}

.inv-full-btn {
  min-height: 92rpx;
  background: #c41e3a;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.24);
}
.inv-full-btn-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

/* ===== 消息预览 ===== */
.inv-preview {
  background: #ede7de;
  border-radius: 28rpx;
  padding: 30rpx;
}
.inv-bubble {
  background: #ffffff;
  border-radius: 8rpx 28rpx 28rpx 28rpx;
  padding: 26rpx 30rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.06);
}
.inv-bubble-txt {
  font-size: 26rpx;
  line-height: 1.6;
  color: #2c2c2c;
}
.inv-link-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 20rpx;
  border: 2rpx solid #ece7df;
  border-radius: 20rpx;
  padding: 20rpx;
}
.inv-lc-ic {
  width: 76rpx;
  height: 76rpx;
  border-radius: 16rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.inv-lc-ic text {
  font-family: 'Songti SC', serif;
  font-size: 30rpx;
  color: #ffffff;
}
.inv-lc-body {
  flex: 1;
  min-width: 0;
}
.inv-lc-t {
  font-size: 24rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.inv-lc-d {
  display: block;
  font-size: 20rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* ===== 邀请记录 ===== */
.inv-stat-card {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
}
.inv-stat-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.inv-stat-val {
  font-size: 46rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.inv-stat-val.ok {
  color: #2dae57;
}
.inv-stat-val.wait {
  color: #ff9500;
}
.inv-stat-lbl {
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
}
.inv-stat-div {
  width: 2rpx;
  height: 56rpx;
  background: #ece7df;
}

.inv-sec-lbl {
  font-size: 23rpx;
  color: #999999;
  margin: 4rpx 4rpx -8rpx;
}
.inv-rec {
  background: #ffffff;
  border-radius: 35rpx;
  padding: 26rpx 30rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
  display: flex;
  align-items: center;
  gap: 22rpx;
}
.inv-rec-av {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.inv-rec-av.ok {
  background: #c9a96e;
}
.inv-rec-av.wait {
  background: #c7bfb2;
}
.inv-rec-av text {
  font-family: 'Songti SC', serif;
  font-size: 28rpx;
  color: #ffffff;
}
.inv-rec-info {
  flex: 1;
  min-width: 0;
}
.inv-rec-name {
  font-size: 27rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.inv-rec-date {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-top: 6rpx;
}
.inv-rst {
  flex-shrink: 0;
  height: 44rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
}
.inv-rst-ok {
  background: rgba(45, 174, 87, 0.12);
  color: #2dae57;
}
.inv-rst-wait {
  background: rgba(255, 149, 0, 0.12);
  color: #e8890b;
}

/* ===== 空态 ===== */
.inv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 90rpx 40rpx;
}
.inv-empty-txt {
  font-size: 28rpx;
  color: #6e6e73;
  margin-top: 24rpx;
}
.inv-empty-sub {
  font-size: 23rpx;
  color: #999999;
  margin-top: 10rpx;
  text-align: center;
}

.inv-bottom-space {
  height: 80rpx;
}

/* ===== 三态：loading / error ===== */
.state-loading,
.state-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #faf8f5;
  padding: 120rpx 38rpx;
}
.state-loading text {
  font-size: 28rpx;
  color: #999999;
}
.state-error-text {
  font-size: 28rpx;
  color: #c41e3a;
  text-align: center;
  margin-bottom: 24rpx;
}
.state-retry-btn {
  min-height: 80rpx;
  padding: 0 48rpx;
  background: #c41e3a;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.state-retry-btn text {
  font-size: 26rpx;
  color: #ffffff;
}
</style>
