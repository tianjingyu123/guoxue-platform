<script setup lang="ts">
/**
 * 我的小卜硬件（S09）：扫码/输入绑定码绑定、解绑、转赠、接收转赠。
 * 小智协议终端开机会逐位播报数字激活码：输入纯数字即按激活码绑定。
 *
 * 商业固件与语音接口未接通前，设备语音显示「待开通」——绑定关系先建好，真实通话等供应商激活。
 * 转赠后新主人看不到原主人的历史（服务端按绑定代次隔离）。
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { xiaobuVoiceApi, type VoiceDeviceView } from '@/lib/xiaobu-voice-data'

const devices = ref<VoiceDeviceView[]>([])
const loading = ref(true)
const error = ref('')
const code = ref('')
const busy = ref(false)
const transferCode = ref<{ deviceId: string; code: string; expiresAt: string } | null>(null)

const STATUS: Record<string, string> = {
  bound: '已绑定', transfer_pending: '转赠中', disabled: '已停用', unbound: '未绑定',
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    devices.value = await xiaobuVoiceApi.devices()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function run(fn: () => Promise<unknown>, ok: string) {
  if (busy.value) return
  busy.value = true
  try {
    await fn()
    uni.showToast({ title: ok, icon: 'none' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    busy.value = false
  }
}

function scan() {
  // 二维码内容即一次性绑定码；H5 不支持扫码时手动输入
  // #ifndef H5
  uni.scanCode({
    onlyFromCamera: true,
    success: (r) => { code.value = (r.result || '').trim() },
  })
  // #endif
}

function bind() {
  const c = code.value.trim()
  // 设备播报的激活码是 4—8 位数字；平台绑定码是 15 位字母数字
  if (/^\d{4,8}$/.test(c)) {
    run(() => xiaobuVoiceApi.activateDevice(c), '绑定成功，设备稍后自动连上').then(() => { code.value = '' })
    return
  }
  if (c.length < 10) { uni.showToast({ title: '请输入完整的绑定码或设备播报的激活码', icon: 'none' }); return }
  run(() => xiaobuVoiceApi.bindDevice(c), '绑定成功').then(() => { code.value = '' })
}

function accept() {
  const c = code.value.trim()
  if (c.length < 10) { uni.showToast({ title: '请输入完整的转赠码', icon: 'none' }); return }
  run(() => xiaobuVoiceApi.acceptTransfer(c), '已接收设备').then(() => { code.value = '' })
}

function unbind(d: VoiceDeviceView) {
  uni.showModal({
    title: '解绑设备',
    content: '解绑后这台设备不再属于你，你在设备上的语音记录也不再可见。确定解绑？',
    success: (r) => { if (r.confirm) run(() => xiaobuVoiceApi.unbindDevice(d.id), '已解绑') },
  })
}

async function transfer(d: VoiceDeviceView) {
  if (busy.value) return
  busy.value = true
  try {
    const r = await xiaobuVoiceApi.transferDevice(d.id)
    transferCode.value = { deviceId: d.id, code: r.transferCode, expiresAt: r.expiresAt }
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    busy.value = false
  }
}

function cancelTransfer(d: VoiceDeviceView) {
  run(() => xiaobuVoiceApi.cancelTransfer(d.id), '已取消转赠').then(() => { transferCode.value = null })
}

onShow(load)
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-bar">
        <view class="hdr-back" @tap="goBack()"><app-icon name="chevron-left" :size="40" color="#666666" /></view>
        <text class="hdr-title">我的小卜硬件</text>
        <view class="hdr-side" />
      </view>
    </view>

    <view class="card">
      <text class="label">绑定或接收设备</text>
      <view class="input-row">
        <input v-model="code" class="input" maxlength="40" placeholder="输入设备播报的激活码、绑定码或转赠码" data-testid="device-code" />
        <view class="icon-btn" @tap="scan"><app-icon name="qr-code" :size="36" color="#666666" /></view>
      </view>
      <view class="row">
        <view class="btn btn-primary" :class="{ disabled: busy }" @tap="bind"><text class="btn-text-primary">绑定新设备</text></view>
        <view class="btn" :class="{ disabled: busy }" @tap="accept"><text class="btn-text">接收转赠</text></view>
      </view>
    </view>

    <view v-if="transferCode" class="card warn" data-testid="transfer-code">
      <text class="label">转赠码（只显示这一次）</text>
      <text class="code">{{ transferCode.code }}</text>
      <text class="hint">把转赠码发给对方，24 小时内有效。对方接收后，这台设备和你的语音记录将与你无关。</text>
    </view>

    <view v-if="loading" class="state"><text class="hint">加载中…</text></view>
    <view v-else-if="error" class="state">
      <text class="state-text">{{ error }}</text>
      <view class="btn" @tap="load"><text class="btn-text">重试</text></view>
    </view>
    <view v-else-if="!devices.length" class="state" data-testid="device-empty">
      <text class="state-text">还没有绑定设备</text>
      <text class="hint">设备开机后会播报一串数字激活码，或在设备包装上找到绑定码，输入后即可绑定。</text>
    </view>
    <view v-else class="list">
      <view v-for="d in devices" :key="d.id" class="item">
        <view class="row-between">
          <text class="name">小卜硬件 · 尾号 {{ d.serialHint }}</text>
          <text class="status">{{ STATUS[d.status] || d.status }}</text>
        </view>
        <text class="hint" data-testid="device-voice-state">{{ d.voiceReady ? '语音可用' : '语音待开通：商业固件与语音服务接通后即可对话' }}</text>
        <text v-if="d.status === 'disabled' && d.disabledReason" class="hint">停用原因：{{ d.disabledReason }}</text>
        <view v-if="d.status === 'bound'" class="row">
          <view class="btn" @tap="transfer(d)"><text class="btn-text">转赠</text></view>
          <view class="btn" @tap="unbind(d)"><text class="btn-text">解绑</text></view>
        </view>
        <view v-else-if="d.status === 'transfer_pending'" class="row">
          <view class="btn" @tap="cancelTransfer(d)"><text class="btn-text">取消转赠</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page { min-height: 100vh; background: var(--bg-paper); padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); }
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; }
.hdr-back { width: 88rpx; height: 88rpx; margin: -20rpx; display: flex; align-items: center; justify-content: center; }
.hdr-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.hdr-side { width: 48rpx; }
.card { margin: 20rpx 24rpx 0; padding: 28rpx; background: var(--card); border-radius: 24rpx; display: flex; flex-direction: column; gap: 18rpx; }
.warn { background: #fdf3dc; }
.label { font-size: 28rpx; font-weight: 600; color: var(--text-ink); }
.code { font-size: 36rpx; letter-spacing: 4rpx; font-weight: 700; color: var(--text-ink); word-break: break-all; }
.input-row { display: flex; gap: 12rpx; align-items: center; }
.input { flex: 1; min-height: 80rpx; padding: 0 24rpx; border-radius: 16rpx; background: var(--bg-paper); font-size: 28rpx; }
.icon-btn { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: var(--bg-paper); display: flex; align-items: center; justify-content: center; }
.row { display: flex; gap: 16rpx; }
.row-between { display: flex; justify-content: space-between; align-items: center; }
.state { padding: 100rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.state-text { font-size: 28rpx; color: var(--text-ink); }
.hint { font-size: 23rpx; line-height: 1.6; color: var(--text-soft); }
.list { padding: 12rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.item { padding: 24rpx; background: var(--card); border-radius: 20rpx; display: flex; flex-direction: column; gap: 14rpx; }
.name { font-size: 28rpx; font-weight: 600; color: var(--text-ink); }
.status { font-size: 24rpx; color: var(--text-soft); }
.btn { flex: 1; min-height: 80rpx; border-radius: 999rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.12)); display: flex; align-items: center; justify-content: center; }
.btn.disabled { opacity: 0.5; }
.btn-primary { background: #C41E3A; border-color: #C41E3A; }
.btn-text { font-size: 28rpx; color: var(--text-ink); }
.btn-text-primary { font-size: 28rpx; color: #ffffff; }
</style>
