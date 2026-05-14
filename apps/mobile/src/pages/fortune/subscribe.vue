<template>
  <view class="page">
    <view class="header">
      <text class="title">订阅设置</text>
    </view>

    <view class="form-card">
      <view class="form-item">
        <text class="form-label">推送频率</text>
        <view class="toggle-group">
          <view v-for="freq in frequencies" :key="freq.value" class="toggle-row">
            <text class="toggle-label">{{ freq.label }}</text>
            <switch :checked="subscriptions.includes(freq.value)" @change="toggleSubscription(freq.value)" color="#C41E3A" />
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">推送渠道</text>
        <view class="channel-group">
          <view v-for="ch in channels" :key="ch.value" class="toggle-row">
            <text class="toggle-label">{{ ch.label }}</text>
            <switch :checked="selectedChannels.includes(ch.value)" @change="toggleChannel(ch.value)" color="#C41E3A" />
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">推送时间</text>
        <picker mode="time" :value="pushTime" @change="onTimeChange">
          <text class="picker-text">{{ pushTime || '选择推送时间' }}</text>
        </picker>
      </view>

      <button class="save-btn" @click="saveSettings" :loading="saving">保存设置</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../api'

const frequencies = [
  { label: '每日推送', value: 'DAILY' },
  { label: '每周推送', value: 'WEEKLY' },
  { label: '每月推送', value: 'MONTHLY' },
]

const channels = [
  { label: '模板消息', value: 'TEMPLATE' },
  { label: '短信通知', value: 'SMS' },
  { label: 'APP推送', value: 'APP' },
]

const subscriptions = ref<string[]>([])
const selectedChannels = ref<string[]>([])
const pushTime = ref('08:00')
const saving = ref(false)

onMounted(async () => {
  try {
    const data: any = await api.get('/fortune/subscription')
    if (data) {
      subscriptions.value = data.frequencies || []
      selectedChannels.value = data.channels || []
      pushTime.value = data.pushTime || '08:00'
    }
  } catch { /* */ }
})

function toggleSubscription(value: string) {
  const idx = subscriptions.value.indexOf(value)
  if (idx >= 0) subscriptions.value.splice(idx, 1)
  else subscriptions.value.push(value)
}

function toggleChannel(value: string) {
  const idx = selectedChannels.value.indexOf(value)
  if (idx >= 0) selectedChannels.value.splice(idx, 1)
  else selectedChannels.value.push(value)
}

function onTimeChange(e: any) {
  pushTime.value = e.detail.value
}

async function saveSettings() {
  saving.value = true
  try {
    await api.put('/fortune/subscription', {
      frequencies: subscriptions.value,
      channels: selectedChannels.value,
      pushTime: pushTime.value,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (e: any) {
    uni.showToast({ title: e.errMsg || '保存失败', icon: 'none' })
  } finally { saving.value = false }
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }
.header { margin-bottom: 16px; }
.title { font-size: 20px; font-weight: bold; color: #C41E3A; }

.form-card { background: #fff; border-radius: 12px; padding: 16px; }
.form-item { margin-bottom: 20px; }
.form-label { font-size: 14px; font-weight: bold; color: #333; display: block; margin-bottom: 12px; }

.toggle-group, .channel-group { display: flex; flex-direction: column; gap: 4px; }
.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F5F0E8; }
.toggle-row:last-child { border-bottom: none; }
.toggle-label { font-size: 14px; color: #444; }

.picker-text { font-size: 15px; color: #C41E3A; padding: 10px 14px; background: #F5F0E8; border-radius: 8px; display: block; text-align: center; }

.save-btn { width: 100%; background: #C41E3A; color: #fff; border-radius: 24px; padding: 12px; font-size: 16px; border: none; margin-top: 8px; }
.save-btn[disabled] { background: #ccc; }
</style>
