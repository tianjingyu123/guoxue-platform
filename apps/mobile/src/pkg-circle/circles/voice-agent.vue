<script setup lang="ts">
/**
 * 圈主 · 小卜语音角色申请（S02）
 * 圈主设置角色名、性格、提示词和标准音色 → 提交平台审核 → 通过后发布；驳回可修改重提。
 * 已发布版本不受审核中的修改影响。语音通话尚未对成员开放（需接入小智商业接口），页面如实说明。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { voiceAgentApi, STANDARD_VOICES, type VoiceAgentProfile } from '@/lib/voice-agent-data'

const circleId = ref('')
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const profile = ref<VoiceAgentProfile | null>(null)

const name = ref('')
const persona = ref('')
const prompt = ref('')
const voiceId = ref(STANDARD_VOICES[0].id)

const STATUS_TEXT: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: '草稿', cls: 'st-draft' },
  PENDING_REVIEW: { label: '审核中', cls: 'st-pending' },
  APPROVED: { label: '已发布', cls: 'st-ok' },
  REJECTED: { label: '已驳回', cls: 'st-bad' },
  DISABLED: { label: '已停用', cls: 'st-bad' },
}

const pending = computed(() => profile.value?.status === 'PENDING_REVIEW')

const voiceIndex = computed(() => Math.max(0, STANDARD_VOICES.findIndex((v) => v.id === voiceId.value)))

function fill(p: VoiceAgentProfile | null) {
  profile.value = p
  if (!p) return
  name.value = p.name
  persona.value = p.persona
  prompt.value = p.prompt
  voiceId.value = p.voiceId
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    fill(await voiceAgentApi.get(circleId.value))
  } catch (e) {
    loadError.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function validate(): string {
  if (!name.value.trim() || name.value.trim().length > 20) return '角色名需为 1—20 个字'
  if (!persona.value.trim()) return '请填写性格与说话风格'
  if (!prompt.value.trim()) return '请填写角色提示词'
  return ''
}

async function save() {
  const msg = validate()
  if (msg) return uni.showToast({ title: msg, icon: 'none' })
  saving.value = true
  try {
    fill(await voiceAgentApi.save(circleId.value, {
      name: name.value.trim(),
      persona: persona.value.trim(),
      prompt: prompt.value.trim(),
      voiceId: voiceId.value,
    }))
    uni.showToast({ title: '草稿已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function submit() {
  const msg = validate()
  if (msg) return uni.showToast({ title: msg, icon: 'none' })
  saving.value = true
  try {
    await voiceAgentApi.save(circleId.value, {
      name: name.value.trim(),
      persona: persona.value.trim(),
      prompt: prompt.value.trim(),
      voiceId: voiceId.value,
    })
    fill(await voiceAgentApi.submit(circleId.value))
    uni.showToast({ title: '已提交审核', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function onVoiceChange(e: { detail: { value: number | string } }) {
  voiceId.value = STANDARD_VOICES[Number(e.detail.value)]?.id ?? STANDARD_VOICES[0].id
}

onLoad((q) => {
  circleId.value = String(q?.id || q?.circleId || '')
  if (!circleId.value) {
    loading.value = false
    loadError.value = '缺少圈子参数'
    return
  }
  load()
})
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-bar">
        <view class="hdr-back" @tap="goBack()"><app-icon name="chevron-left" :size="40" color="#666666" /></view>
        <text class="hdr-title">小卜语音角色</text>
        <view class="hdr-side" />
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <view v-if="loading" class="state"><text class="hint">加载中…</text></view>
      <view v-else-if="loadError" class="state">
        <text class="state-text">{{ loadError }}</text>
        <view v-if="circleId" class="btn" @tap="load"><text class="btn-text">重试</text></view>
      </view>

      <template v-else>
        <view class="card notice">
          <text class="notice-text">设置本圈专属的小卜语音角色，提交平台审核通过后发布。成员语音通话功能正在接入中，开放时间另行通知；角色知识来自本圈已发布的知识库，无需把资料写进提示词。</text>
        </view>

        <view v-if="profile" class="card">
          <view class="row-between">
            <text class="label">当前状态</text>
            <text class="status" :class="STATUS_TEXT[profile.status]?.cls">{{ STATUS_TEXT[profile.status]?.label }}</text>
          </view>
          <text v-if="profile.activeVersion" class="hint">线上版本 v{{ profile.activeVersion }}，修改后需重新审核，审核通过前线上版本不变</text>
          <view v-if="profile.status === 'REJECTED' && profile.reviewNote" class="reason">
            <text class="reason-title">驳回原因</text>
            <text class="reason-text">{{ profile.reviewNote }}</text>
          </view>
          <view v-if="pending && profile.riskFlags?.length" class="reason">
            <text class="reason-title">审核提示</text>
            <text v-for="f in profile.riskFlags" :key="f" class="reason-text">· {{ f }}</text>
          </view>
        </view>

        <view class="card form">
          <view class="field">
            <text class="label">角色名</text>
            <input id="va-name" v-model="name" class="input" maxlength="20" :disabled="pending" placeholder="如：小卜·易学圈" />
          </view>
          <view class="field">
            <text class="label">性格与说话风格</text>
            <textarea id="va-persona" v-model="persona" class="textarea short" maxlength="500" :disabled="pending" placeholder="如：温和耐心，喜欢用生活中的比喻解释术语" />
          </view>
          <view class="field">
            <text class="label">角色提示词</text>
            <textarea id="va-prompt" v-model="prompt" class="textarea" maxlength="3000" :disabled="pending" placeholder="说明角色定位、讲解范围和注意事项。不要承诺灵验、不要推销化解或引导私下交易。" />
            <text class="hint">{{ prompt.length }}/3000</text>
          </view>
          <view class="field">
            <text class="label">标准音色</text>
            <picker :range="STANDARD_VOICES" range-key="label" :value="voiceIndex" :disabled="pending" @change="onVoiceChange">
              <view class="input picker">
                <text>{{ STANDARD_VOICES[voiceIndex].label }}</text>
                <app-icon name="chevron-down" :size="28" color="#9ca3af" />
              </view>
            </picker>
            <text class="hint">试听待开放，实际音色以平台审核结果为准；服务档位由平台审核时确定</text>
          </view>
        </view>

        <view class="actions">
          <view class="btn" :class="{ disabled: saving || pending }" @tap="!saving && !pending && save()"><text class="btn-text">保存草稿</text></view>
          <view class="btn btn-primary" :class="{ disabled: saving || pending }" @tap="!saving && !pending && submit()">
            <text class="btn-text-primary">{{ pending ? '审核中' : '提交审核' }}</text>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; }
.hdr-back { width: 88rpx; height: 88rpx; margin: -20rpx; display: flex; align-items: center; justify-content: center; }
.hdr-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.hdr-side { width: 48rpx; }
.body { flex: 1; padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); }
.state { padding: 120rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.state-text { font-size: 28rpx; color: var(--text-ink); text-align: center; }
.card { margin: 20rpx 24rpx 0; padding: 28rpx; background: var(--card); border-radius: 24rpx; display: flex; flex-direction: column; gap: 14rpx; }
.notice { background: rgba(46, 75, 88, 0.08); }
.notice-text { font-size: 25rpx; line-height: 1.7; color: var(--text-ink); }
.row-between { display: flex; justify-content: space-between; align-items: center; }
.label { font-size: 28rpx; font-weight: 600; color: var(--text-ink); }
.hint { font-size: 22rpx; color: var(--text-soft); line-height: 1.6; }
.status { font-size: 24rpx; padding: 4rpx 18rpx; border-radius: 999rpx; }
.st-draft { background: var(--bg-paper); color: var(--text-soft); }
.st-pending { background: #fdf3dc; color: #9a6a12; }
.st-ok { background: #e2efe4; color: #3f7a4e; }
.st-bad { background: #f8e4e7; color: #c41e3a; }
.reason { padding: 16rpx 20rpx; border-radius: 16rpx; background: var(--bg-paper); display: flex; flex-direction: column; gap: 6rpx; }
.reason-title { font-size: 24rpx; font-weight: 600; color: var(--text-ink); }
.reason-text { font-size: 24rpx; line-height: 1.6; color: var(--text-soft); }
.form { gap: 28rpx; }
.field { display: flex; flex-direction: column; gap: 12rpx; }
.input { min-height: 80rpx; padding: 0 24rpx; border-radius: 16rpx; background: var(--bg-paper); font-size: 28rpx; display: flex; align-items: center; }
.picker { justify-content: space-between; }
.textarea { width: 100%; box-sizing: border-box; min-height: 320rpx; padding: 20rpx 24rpx; border-radius: 16rpx; background: var(--bg-paper); font-size: 27rpx; line-height: 1.6; }
.textarea.short { min-height: 160rpx; }
.actions { display: flex; gap: 20rpx; margin: 32rpx 24rpx 0; }
.btn { flex: 1; min-height: 88rpx; border-radius: 999rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.12)); display: flex; align-items: center; justify-content: center; }
.btn-primary { background: #C41E3A; border-color: #C41E3A; }
.btn.disabled { opacity: 0.5; }
.btn-text { font-size: 28rpx; color: var(--text-ink); }
.btn-text-primary { font-size: 28rpx; color: #ffffff; }
</style>
