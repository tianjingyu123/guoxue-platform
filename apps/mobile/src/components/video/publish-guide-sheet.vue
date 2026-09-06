<template>
  <view v-if="open" class="pgs-mask" role="dialog" aria-modal="true" :aria-label="`${capabilityLabel}资格`" @tap="onClose" @touchmove.self.prevent>
    <view class="pgs-sheet" tabindex="-1" @tap.stop @touchmove.stop>
      <view class="pgs-handle" />
      <view class="pgs-head">
        <view>
          <text class="pgs-kicker">{{ capabilityLabel }}资格</text>
          <text class="pgs-title">核对授权与申请进度</text>
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
        <view v-if="loadError" class="pgs-fast"><text>{{ loadError }}</text><button @tap="loadStatus">重新核对</button></view>
        <view v-else class="pgs-fast"><text>{{ stateText }}</text></view>
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
        </view>

        <view class="pgs-fast">
          <text class="pgs-fast-title">名师与平台合作伙伴</text>
          <text class="pgs-fast-desc">平台可直接授权，无需达到圈子申请门槛。此处仅管理发布资格，不限制普通浏览。</text>
        </view>
        <textarea v-if="canApply" v-model="reason" maxlength="500" placeholder="填写申请原因（必填）" class="pgs-fast" :disabled="actionBusy" />

        <view class="pgs-foot">
          <view
            class="pgs-btn pgs-btn-ghost"
            role="button"
            aria-label="暂不申请"
            tabindex="0"
            @tap="onClose"
            @keydown="activateOnKeyboard($event, onClose)"
          >
            <text>暂不申请</text>
          </view>
          <view
            v-if="canApply || canEnable || allowed || loadError"
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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import {
  checkCirclePublishPermission,
  getCirclePublishGrantStatus,
  type CirclePublishGrantStatus,
  type CirclePublishStatus,
} from '@/lib/publish-permission'
import { apiGet, apiPost } from '@/utils/request'
import { getCurrentUserId } from '@/lib/circle-consult-data'

const props = defineProps<{ open: boolean; circleId?: string; capability?: 'SHORT_VIDEO' | 'LIVE' }>()
const capability = computed(() => props.capability || 'SHORT_VIDEO')
const capabilityLabel = computed(() => capability.value === 'LIVE' ? '直播开播' : '短视频发布')
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
const allowed = ref(false), loadError = ref(''), reason = ref('')
type Progress = { key: string; current: number; required: number; passed: boolean }
type Eligibility = { eligible: boolean; progress: Progress[]; scope: { circleId: string; capability: string } }
type Grant = { id: string; revision: number; circleId: string; capability: string; subjectUserId: string | null; state: string; enabled: boolean; expiresAt: string | null }
const eligibility = ref<Eligibility | null>(null), grant = ref<Grant | null>(null)
type ApplicationContext = { circleId: string; capability: string; subjectUserId: string | null; canApply: boolean; reason: string; progress: Progress[] }
const application = ref<ApplicationContext | null>(null), checkedCircle = ref('')
const scopeMatches = computed(() => !!checkedCircle.value && (!props.circleId || props.circleId === checkedCircle.value)
  && (!grant.value || (grant.value.circleId === checkedCircle.value && grant.value.capability === capability.value
    && (grant.value.subjectUserId === null || grant.value.subjectUserId === getCurrentUserId()))))
let generation = 0
onBeforeUnmount(() => { generation++ })

const activeCircle = computed<CirclePublishStatus | null>(() => {
  const circles = status.value?.circles || []
  return props.circleId ? circles.find((item) => item.id === props.circleId) || null : circles[0] || null
})

const progressItems = computed(() => {
  const labels: Record<string, string> = { operatingDays: '运营天数', validMembers: '有效成员', publishedPosts: '有效圈内帖子', recentPosts: '近期有效帖子', activeViolations: '有效违规（上限）' }
  return (eligibility.value?.progress || []).filter(item => labels[item.key]).map(item => ({ ...item, name: labels[item.key],
    percent: item.key === 'activeViolations' ? (item.passed ? 100 : 0) : Math.min(100, Math.round(item.current / Math.max(1, item.required) * 100)) }))
})
const canApply = computed(() => !loading.value && scopeMatches.value && !loadError.value && !allowed.value && application.value?.canApply === true
  && application.value.circleId === checkedCircle.value && application.value.capability === capability.value && application.value.subjectUserId === null)
const canEnable = computed(() => !loading.value && scopeMatches.value && !loadError.value && grant.value?.state === 'APPROVED' && grant.value.enabled === false && !!grant.value.expiresAt && Date.parse(grant.value.expiresAt) > Date.now())
const stateText = computed(() => {
  if (allowed.value) return '已开通'
  if (grant.value?.state === 'PENDING') return '审核中'
  if (canEnable.value) return '已批准，待启用'
  if (canApply.value) return '可申请'
  if (application.value?.reason === 'REAPPLY_COOLDOWN') return '暂处于再次申请间隔，请稍后重新核对'
  if (grant.value?.subjectUserId && grant.value.state === 'REVOKED') return '个人资格已撤销，请联系平台'
  return grant.value?.state === 'SUSPENDED' ? '资格已暂停' : '尚未满足发布条件'
})
const identityText = computed(() => {
  const item = eligibility.value?.progress.find(row => row.key === 'identity')
  return item ? (item.passed ? '身份条件已满足' : '请完成平台要求的实名认证') : '按服务端当前规则核对，不影响普通浏览'
})
const actionText = computed(() => loadError.value ? '重新核对' : allowed.value ? '继续发布' : canEnable.value ? '确认启用发布' : '提交授权申请')

async function loadStatus() {
  const ticket = ++generation, selected = props.circleId
  loading.value = true; allowed.value = false; loadError.value = ''; eligibility.value = null; grant.value = null; application.value = null; checkedCircle.value = ''
  try {
    const permitted = await checkCirclePublishPermission(capability.value, selected)
    if (ticket !== generation || !props.open) return
    if (permitted) { allowed.value = true; emit('granted'); return }
    const current = await getCirclePublishGrantStatus(capability.value)
    if (ticket !== generation || !props.open) return
    status.value = current // 仅复用圈主圈子名称列表，不复用旧授权和旧门槛。
    const circleId = selected || activeCircle.value?.id
    if (!circleId) throw new Error('请先在发布页选择圈子；申请由圈主发起，合作伙伴可联系平台直授。')
    if (!selected && await checkCirclePublishPermission(capability.value, circleId)) {
      if (ticket === generation && props.open) { allowed.value = true; emit('granted') }
      return
    }
    const currentGrant = await apiGet<{ circleId: string; capability: string; grant: Grant | null }>(`/circle-capabilities/circles/${encodeURIComponent(circleId)}/current?capability=${capability.value}`)
    if (ticket !== generation || !props.open) return
    if (currentGrant.circleId !== circleId || currentGrant.capability !== capability.value || currentGrant.grant === undefined) throw new Error('授权响应不完整，请重新核对')
    if (currentGrant.grant && (currentGrant.grant.circleId !== circleId || currentGrant.grant.capability !== capability.value
      || (currentGrant.grant.subjectUserId !== null && currentGrant.grant.subjectUserId !== getCurrentUserId()))) throw new Error('授权对象不匹配')
    grant.value = currentGrant.grant
    checkedCircle.value = circleId
    // 个人直授的本人启用不依赖圈主申请接口；暂停或撤销仍不可自行恢复。
    if (currentGrant.grant?.subjectUserId) return
    const facts = await apiGet<ApplicationContext>(`/circle-capabilities/circles/${encodeURIComponent(circleId)}/application-context?capability=${capability.value}`)
    if (ticket !== generation || !props.open) return
    if (facts.circleId !== circleId || facts.capability !== capability.value || facts.subjectUserId !== null
      || typeof facts.canApply !== 'boolean' || !Array.isArray(facts.progress)) throw new Error('申请响应不完整')
    application.value = facts
    eligibility.value = { eligible: facts.canApply, progress: facts.progress, scope: { circleId, capability: capability.value } }
  } catch {
    if (ticket === generation) loadError.value = '暂未取得申请资格。请确认已选择圈子；申请由圈主发起，合作伙伴可联系平台直接授权。'
  } finally {
    if (ticket === generation) loading.value = false
  }
}

watch(
  () => [props.open, props.circleId, props.capability] as const,
  ([open]) => {
    if (open) loadStatus()
    else { generation++; loading.value = false }
  },
  { immediate: true },
)

function onClose() {
  if (actionBusy.value) return
  generation++
  emit('close')
}

function activateOnKeyboard(event: KeyboardEvent, action: () => void | Promise<void>) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}

async function handleAction() {
  if (actionBusy.value || loading.value || !props.open) return
  if (loadError.value || allowed.value) { await loadStatus(); return }
  const circleId = checkedCircle.value
  if (!circleId || (!canApply.value && !canEnable.value)) return
  if (canApply.value && !reason.value.trim()) { uni.showToast({ title: '请填写申请原因', icon: 'none' }); return }
  actionBusy.value = true
  try {
    if (canEnable.value && grant.value) await apiPost(`/circle-capabilities/grants/${grant.value.id}/enabled`, { expectedRevision: grant.value.revision, enabled: true, reason: `本人确认启用${capabilityLabel.value}` })
    else await apiPost(`/circle-capabilities/circles/${circleId}/applications`, { capability: capability.value, reason: reason.value.trim() })
    uni.showToast({ title: '已提交，正在核对状态', icon: 'none' })
    await loadStatus()
  } catch {
    uni.showToast({ title: '结果未确认，刷新核对后再操作', icon: 'none' })
    await loadStatus() // 只重读，不自动重发申请或启用。
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
  max-height: 90vh;
  overflow-y: auto;
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
