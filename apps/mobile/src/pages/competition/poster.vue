<template>
  <view class="page">
    <view class="poster-card">
      <view class="poster-header"><text class="poster-title">{{ comp.name || '国学竞赛' }}</text><text class="poster-date">{{ comp.startDate || '' }}</text></view>
      <view class="poster-body">
        <text class="poster-desc">{{ comp.description || '' }}</text>
        <image v-if="comp.qrcode" :src="comp.qrcode" class="qr" mode="aspectFit" />
      </view>
      <text class="poster-footer">长按保存海报分享给好友</text>
    </view>
    <button class="btn-save" @click="save">保存海报</button>
    <button class="btn-share" @click="share">分享给好友</button>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { competitionApi } from '../../api'
const comp = ref<any>({})
onMounted(async () => {
  const pages = getCurrentPages(); const id = (pages[pages.length - 1] as any)?.options?.id
  try { const res: any = await competitionApi.getPoster(id); comp.value = res || {} } catch {}
})
function save() { uni.showToast({ title: '海报已保存', icon: 'none' }) }
function share() { uni.showToast({ title: '请使用右上角分享', icon: 'none' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; display: flex; flex-direction: column; align-items: center; }
.poster-card { background: linear-gradient(135deg, #C41E3A, #8B0000); border-radius: 16px; padding: 30px 20px; color: #fff; width: 100%; margin-bottom: 16px; }
.poster-header { text-align: center; margin-bottom: 20px; }
.poster-title { font-size: 22px; font-weight: bold; display: block; }
.poster-date { font-size: 13px; opacity: 0.8; display: block; margin-top: 6px; }
.poster-body { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
.poster-desc { font-size: 13px; line-height: 1.6; display: block; }
.qr { width: 100px; height: 100px; margin-top: 12px; display: block; margin-left: auto; margin-right: auto; }
.poster-footer { font-size: 11px; opacity: 0.6; text-align: center; display: block; }
.btn-save { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; margin-bottom: 10px; }
.btn-share { width: 100%; background: #fff; color: #C41E3A; border: 1px solid #C41E3A; border-radius: 8px; padding: 12px; font-size: 15px; }
</style>
