<template>
  <view class="page">
    <view class="section">
      <view class="row"><text class="label">青少年模式</text><switch :checked="enabled" @change="toggle" color="#C41E3A" /></view>
      <view v-if="enabled" class="row"><text class="label">每日时长限制</text><input v-model="dailyLimit" type="number" class="input" placeholder="分钟" /></view>
    </view>
    <view v-if="enabled" class="info"><text>开启后将限制部分功能和内容。详细说明请查看</text><text class="link" @click="goIntro">青少年模式说明</text></view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { userApi } from '../../api'
const enabled = ref(false); const dailyLimit = ref('60')
async function toggle(e: any) { enabled.value = e.detail.value; await userApi.updateTeenMode({ enabled: enabled.value }) }
function goIntro() { uni.navigateTo({ url: '/pages/legal/teen-mode-intro' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
.row:last-child { border-bottom: none; }
.label { font-size: 14px; }
.input { width: 80px; text-align: right; border: 1px solid #ddd; border-radius: 8px; padding: 4px 8px; font-size: 14px; }
.info { padding: 12px; font-size: 12px; color: #999; line-height: 1.6; }
.link { color: #C41E3A; }
</style>
