<template>
  <view class="page">
    <view class="header">
      <text class="back-btn" @click="goBack">‹</text>
      <text class="header-title">申请开通功能</text>
      <view style="width:60rpx" />
    </view>

    <scroll-view scroll-y class="content">
      <!-- 已申请状态 -->
      <view v-for="r in myRequests" :key="r.id" class="status-card" :class="r.status">
        <view class="status-row">
          <text class="status-type">{{ typeLabel(r.type) }}</text>
          <text class="status-badge" :class="r.status">{{ statusLabel(r.status) }}</text>
        </view>
        <text v-if="r.reviewNote" class="status-note">审核备注：{{ r.reviewNote }}</text>
        <text class="status-time">{{ r.createdAt?.slice(0, 10) }}</text>
      </view>

      <!-- 申请表单 -->
      <view class="section" v-if="showForm">
        <text class="section-title">申请开通高级功能</text>
        <text class="section-sub">平台资源有限，高级功能需申请审核后开通</text>

        <view class="cap-list">
          <view
            v-for="cap in capabilities"
            :key="cap.type"
            class="cap-item"
            :class="{ selected: selectedType === cap.type, disabled: cap.disabled }"
            @click="cap.disabled ? null : selectedType = cap.type"
          >
            <text class="cap-icon">{{ cap.icon }}</text>
            <view class="cap-info">
              <text class="cap-name">{{ cap.name }}</text>
              <text class="cap-desc">{{ cap.desc }}</text>
            </view>
            <text v-if="cap.disabled" class="cap-status">已申请</text>
            <view v-else class="cap-radio" :class="{ on: selectedType === cap.type }" />
          </view>
        </view>

        <textarea
          v-if="selectedType"
          class="reason-input"
          v-model="reason"
          placeholder="请说明申请理由，例如：我计划开设《易经入门》系列课程，已有50+学员..."
          maxlength="200"
        />
        <text class="char-count">{{ reason.length }}/200</text>

        <button
          v-if="selectedType"
          class="submit-btn"
          :loading="submitting"
          :disabled="submitting || !reason.trim()"
          @click="doSubmit"
        >
          {{ submitting ? '提交中...' : '提交申请' }}
        </button>
      </view>

      <!-- 全部都已申请 -->
      <view v-if="!showForm" class="all-done">
        <text class="done-icon">✅</text>
        <text class="done-text">您已申请所有可用功能，请等待审核</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const CAPS = [
  { type: 'LIVE', name: '直播功能', desc: '开设直播课程、直播答疑', icon: '📡' },
  { type: 'VIDEO_UPLOAD', name: '视频上传', desc: '上传录播课程视频', icon: '🎬' },
  { type: 'AUDIO_CALL', name: '语音连麦', desc: '与学员语音实时互动', icon: '🎤' },
  { type: 'VIDEO_CALL', name: '视频连麦', desc: '与学员视频面对面交流', icon: '📹' },
  { type: 'PAID_QA', name: '付费问答', desc: '接受学员付费提问', icon: '💬' },
  { type: 'VOICE_QA', name: '语音问答', desc: '接受学员语音提问', icon: '🎙️' },
  { type: 'BOT', name: '圈主助理机器人', desc: 'AI智能客服自动回复学员提问', icon: '🤖' },
]

const selectedType = ref('')
const reason = ref('')
const submitting = ref(false)
const myRequests = ref<any[]>([])

const pendingTypes = computed(() => myRequests.value.filter(r => r.status === 'PENDING').map(r => r.type))
const capabilities = computed(() => CAPS.map(c => ({
  ...c,
  disabled: pendingTypes.value.includes(c.type),
})))

const showForm = computed(() => CAPS.some(c => !pendingTypes.value.includes(c.type)))

onMounted(async () => {
  try {
    const res = await uni.request({ url: '/api/v1/capabilities/my', method: 'GET',
      header: { Authorization: `Bearer ${uni.getStorageSync('token')}` },
    })
    myRequests.value = (res.data as any)?.data || (res.data as any)?.list || []
  } catch { /* 离线展示表单 */ }
})

async function doSubmit() {
  submitting.value = true
  try {
    await uni.request({
      url: '/api/v1/capabilities/request',
      method: 'POST',
      data: { type: selectedType.value, reason: reason.value },
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${uni.getStorageSync('token')}`,
      },
    })
    uni.showToast({ title: '申请已提交', icon: 'success' })
    selectedType.value = ''
    reason.value = ''
    // 刷新
    const res2 = await uni.request({ url: '/api/v1/capabilities/my', method: 'GET',
      header: { Authorization: `Bearer ${uni.getStorageSync('token')}` },
    })
    myRequests.value = (res2.data as any)?.data || []
  } catch (e: any) {
    uni.showToast({ title: e.errMsg || '提交失败', icon: 'none' })
  } finally { submitting.value = false }
}

function typeLabel(t: string) { return CAPS.find(c => c.type === t)?.name || t }
function statusLabel(s: string) { const m: Record<string,string> = { PENDING:'审核中', APPROVED:'已通过', REJECTED:'已拒绝' }; return m[s]||s }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { min-height:100vh; background:#F5F0E8; }
.header { display:flex; align-items:center; justify-content:space-between; padding:20rpx 24rpx; background:#fff; border-bottom:1rpx solid #E5E1DB; }
.back-btn { font-size:48rpx; color:#2C2C2C; }
.header-title { font-size:32rpx; font-weight:600; }
.content { padding:20rpx; padding-bottom:60rpx; }

.status-card { background:#fff; border-radius:16rpx; padding:20rpx; margin-bottom:16rpx; }
.status-card.APPROVED { border-left:6rpx solid #52C41A; }
.status-card.REJECTED { border-left:6rpx solid #FF4D4F; }
.status-card.PENDING { border-left:6rpx solid #FA8C16; }
.status-row { display:flex; justify-content:space-between; align-items:center; }
.status-type { font-size:28rpx; font-weight:600; }
.status-badge { font-size:22rpx; padding:4rpx 12rpx; border-radius:20rpx; }
.status-badge.PENDING { background:#FFF7E6; color:#FA8C16; }
.status-badge.APPROVED { background:#F6FFED; color:#52C41A; }
.status-badge.REJECTED { background:#FFF2F0; color:#FF4D4F; }
.status-note { font-size:24rpx; color:#999; margin-top:8rpx; display:block; }
.status-time { font-size:22rpx; color:#CCC; margin-top:4rpx; }

.section { background:#fff; border-radius:16rpx; padding:24rpx; }
.section-title { font-size:30rpx; font-weight:600; display:block; }
.section-sub { font-size:24rpx; color:#999; margin-top:8rpx; display:block; }

.cap-list { margin-top:20rpx; }
.cap-item { display:flex; align-items:center; gap:16rpx; padding:20rpx 16rpx; border:1rpx solid #E8E3DB; border-radius:12rpx; margin-bottom:12rpx; }
.cap-item.selected { border-color:#C41E3A; background:rgba(196,30,58,.03); }
.cap-item.disabled { opacity:.5; }
.cap-icon { font-size:36rpx; }
.cap-info { flex:1; }
.cap-name { font-size:28rpx; font-weight:500; display:block; }
.cap-desc { font-size:22rpx; color:#999; display:block; margin-top:4rpx; }
.cap-radio { width:36rpx; height:36rpx; border-radius:50%; border:2rpx solid #E8E3DB; }
.cap-radio.on { border-color:#C41E3A; background:#C41E3A; box-shadow:inset 0 0 0 4rpx #fff; }
.cap-status { font-size:22rpx; color:#FA8C16; }

.reason-input { width:100%; height:160rpx; background:#F5F1EB; border:1rpx solid #E8E3DB; border-radius:12rpx; padding:16rpx; font-size:26rpx; margin-top:20rpx; box-sizing:border-box; }
.char-count { font-size:22rpx; color:#CCC; text-align:right; display:block; margin-top:4rpx; }

.submit-btn { width:100%; height:88rpx; background:linear-gradient(135deg,#C41E3A,#8B0000); color:#fff; border:none; border-radius:16rpx; font-size:30rpx; font-weight:600; margin-top:20rpx; }

.all-done { text-align:center; padding:80rpx 0; }
.done-icon { font-size:64rpx; display:block; margin-bottom:16rpx; }
.done-text { font-size:28rpx; color:#999; }
</style>
