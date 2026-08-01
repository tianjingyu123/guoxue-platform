<template>
  <view v-if="open" class="pgs-mask" role="dialog" aria-modal="true" aria-label="短视频发布资格" @tap="onClose" @touchmove.self.prevent>
    <view class="pgs-sheet" tabindex="-1" @tap.stop @touchmove.stop>
      <view class="pgs-handle" />
      <view class="pgs-head">
        <view>
          <text class="pgs-kicker">全平台创作者通行证</text>
          <text class="pgs-title">让优质内容走出圈子</text>
        </view>
        <view
          class="pgs-close"
          role="button"
          aria-label="关闭发布资格面板"
          tabindex="0"
          @tap="onClose"
          @keydown="activateOnKeyboard($event, onClose)"
        >
          <AppIcon name="x" :size="32" color="#8D8780" />
        </view>
      </view>

      <view v-if="loading" class="pgs-loading">
        <view class="pgs-loading-orbit" />
        <text>正在核对圈子运营进度…</text>
      </view>

      <template v-else>
        <view v-if="activeCircle" class="pgs-circle">
          <view class="pgs-circle-copy">
            <text class="pgs-circle-label">当前圈子</text>
            <text class="pgs-circle-name">{{ activeCircle.name }}</text>
          </view>
          <text class="pgs-circle-state">{{ stateText }}</text>
        </view>

        <view class="pgs-grid">
          <view v-for="item in progressItems" :key="item.key" class="pgs-progress">
            <view class="pgs-progress-head">
              <text class="pgs-progress-name">{{ item.name }}</text>
              <text class="pgs-progress-value">{{ item.current }}/{{ item.required }}</text>
            </view>
            <view class="pgs-track">
              <view
                class="pgs-bar"
                :class="{ done: item.passed }"
                :style="{ width: `${item.percent}%` }"
              />
            </view>
          </view>
        </view>

        <view class="pgs-identity">
          <view class="pgs-identity-icon">
            <AppIcon name="shield-check" :size="30" color="#C41E3A" />
          </view>
          <view class="pgs-identity-copy">
            <text class="pgs-identity-title">身份可信等级</text>
            <text class="pgs-identity-desc">{{ identityText }}</text>
          </view>
          <text class="pgs-identity-level">{{ status?.identityLevel || 'NONE' }}</text>
        </view>

        <view class="pgs-fast">
          <text class="pgs-fast-title">已有其他平台影响力？</text>
          <text class="pgs-fast-desc">粉丝达到 1 万可准备主页与数据证明，走快速审核通道。</text>
        </view>

        <view class="pgs-foot">
          <view
            class="pgs-btn pgs-btn-ghost"
            role="button"
            aria-label="先发到圈内"
            tabindex="0"
            @tap="onClose"
            @keydown="activateOnKeyboard($event, onClose)"
          >
            <text>先发到圈内</text>
          </view>
          <view
            class="pgs-btn pgs-btn-primary"
            :class="{ disabled: actionBusy }"
            role="button"
            :aria-label="actionText"
            :aria-disabled="actionBusy"
            :tabindex="actionBusy ? -1 : 0"
            @tap="handleAction"
            @keydown="activateOnKeyboard($event, handleAction)"
          >
            <text>{{ actionText }}</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import {
  applyCirclePublishGrant,
  getCirclePublishGrantStatus,
  type CirclePublishGrantStatus,
  type CirclePublishStatus,
} from '@/lib/publish-permission'
import { navigateTo } from '@/utils/router'

const props = defineProps<{ open: boolean; circleId?: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'granted'): void }>()

useOverlayScrollLock(
  () => props.open,
  {
    onEscape: onClose,
    focusContainerSelector: '.pgs-sheet',
    initialFocusSelector: '.pgs-close',
  },
)

const loading = ref(false)
const actionBusy = ref(false)
const status = ref<CirclePublishGrantStatus | null>(null)

const activeCircle = computed<CirclePublishStatus | null>(() => {
  const circles = status.value?.circles || []
  return circles.find((item) => item.id === props.circleId) || circles[0] || null
})

const progressItems = computed(() => {
  const progress = activeCircle.value?.progress
  const requiredMap = {
    operatingDays: 30,
    members: 100,
    works: 30,
    recentWorks: 8,
  } as const
  const items = [
    ['operatingDays', '运营天数'],
    ['members', '圈友人数'],
    ['works', '累计作品'],
    ['recentWorks', '近 30 天新增'],
  ] as const
  return items.map(([key, name]) => {
    const item = progress?.[key] || { current: 0, required: requiredMap[key], passed: false }
    return {
      key,
      name,
      ...item,
      percent: Math.min(100, Math.round((item.current / Math.max(1, item.required)) * 100)),
    }
  })
})

const stateText = computed(() => {
  const grant = activeCircle.value?.activeGrant
  if (activeCircle.value?.canPublish) return '已开通'
  if (grant?.status === 'PENDING') return '审核中'
  if (grant?.status === 'REJECTED') return '待完善'
  if (activeCircle.value?.regularEligible) return '可申请'
  return '成长中'
})

const identityText = computed(() => {
  if (activeCircle.value?.identityReady) return '实名认证已满足短视频发布要求'
  return '请先完成 L1 实名认证，再提交发布授权'
})

const actionText = computed(() => {
  if (!activeCircle.value) return '去创建圈子'
  if (activeCircle.value.canPublish) return '继续全平台发布'
  if (activeCircle.value.activeGrant?.status === 'PENDING') return '等待审核结果'
  if (!activeCircle.value.identityReady) return '去完成实名认证'
  if (activeCircle.value.regularEligible) return '提交授权申请'
  return '查看成长进度'
})

async function loadStatus() {
  loading.value = true
  try {
    status.value = await getCirclePublishGrantStatus('SHORT_VIDEO')
    if (status.value.isPlatformAdmin || activeCircle.value?.canPublish) emit('granted')
  } catch {
    status.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) loadStatus()
  },
  { immediate: true },
)

function onClose() {
  emit('close')
}

function activateOnKeyboard(event: KeyboardEvent, action: () => void | Promise<void>) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}

async function handleAction() {
  if (actionBusy.value) return
  const circle = activeCircle.value
  if (!circle) {
    onClose()
    navigateTo('/circles/create')
    return
  }
  if (circle.canPublish) {
    emit('granted')
    onClose()
    return
  }
  if (circle.activeGrant?.status === 'PENDING') {
    uni.showToast({ title: '申请正在审核中', icon: 'none' })
    return
  }
  if (!circle.identityReady) {
    onClose()
    navigateTo('/mine/verification')
    return
  }
  if (!circle.regularEligible) {
    uni.showToast({ title: '继续运营圈子，达到进度后即可申请', icon: 'none' })
    return
  }
  actionBusy.value = true
  try {
    await applyCirclePublishGrant({
      circleId: circle.id,
      scopes: ['SHORT_VIDEO'],
      channel: 'REGULAR',
    })
    uni.showToast({ title: '申请已提交', icon: 'success' })
    await loadStatus()
  } catch (error) {
    uni.showToast({ title: (error as Error)?.message || '提交失败，请稍后重试', icon: 'none' })
  } finally {
    actionBusy.value = false
  }
}
</script>

<style scoped>
.pgs-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: flex-end;
  background: rgba(28, 22, 18, 0.54);
  backdrop-filter: blur(8px);
}
.pgs-sheet {
  width: 100%;
  box-sizing: border-box;
  padding: 16rpx 32rpx calc(28rpx + env(safe-area-inset-bottom));
  border-radius: 36rpx 36rpx 0 0;
  background:
    radial-gradient(circle at 92% 5%, rgba(220, 49, 76, 0.12), transparent 32%),
    #fbfaf8;
  box-shadow: 0 -20rpx 60rpx rgba(44, 28, 20, 0.18);
}
.pgs-handle {
  width: 72rpx;
  height: 8rpx;
  margin: 0 auto 20rpx;
  border-radius: 999rpx;
  background: #ded8d1;
}
.pgs-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.pgs-kicker {
  display: block;
  margin-bottom: 6rpx;
  color: #c41e3a;
  font-size: 22rpx;
  letter-spacing: 4rpx;
}
.pgs-title {
  display: block;
  color: #201c19;
  font-family: serif;
  font-size: 40rpx;
  font-weight: 700;
}
.pgs-close {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f0ece7;
}
.pgs-loading {
  min-height: 360rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  color: #7d756d;
  font-size: 26rpx;
}
.pgs-loading-orbit {
  width: 72rpx;
  height: 72rpx;
  border: 4rpx solid rgba(196, 30, 58, 0.18);
  border-top-color: #c41e3a;
  border-radius: 50%;
  animation: pgs-spin 0.9s linear infinite;
}
.pgs-circle {
  margin-top: 28rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1rpx solid #eadfd4;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.82);
}
.pgs-circle-label,
.pgs-circle-name {
  display: block;
}
.pgs-circle-label {
  margin-bottom: 6rpx;
  color: #9b9187;
  font-size: 21rpx;
}
.pgs-circle-name {
  color: #2d2823;
  font-size: 29rpx;
  font-weight: 650;
}
.pgs-circle-state {
  padding: 9rpx 18rpx;
  border-radius: 999rpx;
  color: #c41e3a;
  background: #fae8ec;
  font-size: 22rpx;
}
.pgs-grid {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}
.pgs-progress {
  padding: 20rpx;
  border-radius: 18rpx;
  background: #f1ede8;
}
.pgs-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pgs-progress-name {
  color: #6f675f;
  font-size: 22rpx;
}
.pgs-progress-value {
  color: #2e2925;
  font-size: 24rpx;
  font-weight: 650;
}
.pgs-track {
  height: 8rpx;
  margin-top: 14rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #ddd5ce;
}
.pgs-bar {
  min-width: 5%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #c41e3a, #e46579);
}
.pgs-bar.done {
  background: linear-gradient(90deg, #2c8f70, #68bea3);
}
.pgs-identity {
  margin-top: 18rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(59, 45, 34, 0.05);
}
.pgs-identity-icon {
  width: 58rpx;
  height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: #fae8ec;
}
.pgs-identity-copy {
  flex: 1;
  min-width: 0;
}
.pgs-identity-title,
.pgs-identity-desc {
  display: block;
}
.pgs-identity-title {
  color: #2a2521;
  font-size: 25rpx;
  font-weight: 650;
}
.pgs-identity-desc {
  margin-top: 5rpx;
  color: #8a8178;
  font-size: 21rpx;
}
.pgs-identity-level {
  color: #c41e3a;
  font-size: 24rpx;
  font-weight: 700;
}
.pgs-fast {
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
  border: 1rpx dashed #d8b787;
  border-radius: 18rpx;
  background: #fff9ef;
}
.pgs-fast-title,
.pgs-fast-desc {
  display: block;
}
.pgs-fast-title {
  color: #8c5f25;
  font-size: 24rpx;
  font-weight: 650;
}
.pgs-fast-desc {
  margin-top: 5rpx;
  color: #a27c4d;
  font-size: 21rpx;
}
.pgs-foot {
  margin-top: 24rpx;
  display: flex;
  gap: 18rpx;
}
.pgs-btn {
  flex: 1;
  height: 86rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 27rpx;
  font-weight: 650;
}
.pgs-btn-ghost {
  color: #756d65;
  background: #eee9e4;
}
.pgs-btn-primary {
  color: #fff;
  background: linear-gradient(135deg, #d72b49, #a90f2d);
  box-shadow: 0 12rpx 28rpx rgba(196, 30, 58, 0.22);
}
.pgs-btn.disabled {
  opacity: 0.55;
}
@keyframes pgs-spin {
  to { transform: rotate(360deg); }
}
</style>
