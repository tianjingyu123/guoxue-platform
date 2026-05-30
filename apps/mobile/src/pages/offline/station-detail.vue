<template>
  <view class="page">
    <image :src="info.cover || ''" class="cover" mode="aspectFill" />
    <view class="section">
      <text class="name">{{ info.name }}</text>
      <text class="addr">{{ info.address }}</text>
      <text class="desc">{{ info.description }}</text>
    </view>
    <view class="section">
      <text class="section-title">服务项目</text>
      <view v-for="s in services" :key="s.id" class="service-item">
        <text class="sv-name">{{ s.name }}</text><text class="sv-price">¥{{ s.price }}</text>
      </view>
    </view>
    <view class="actions">
      <button class="btn-nav" @click="navigate">导航前往</button>
      <button class="btn-book" @click="book">预约服务</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { offlineApi } from '../../api'
const info = ref<any>({}); const services = ref<any[]>([])
onMounted(async () => {
  const pages = getCurrentPages(); const id = (pages[pages.length - 1] as any)?.options?.id
  try {
    const res: any = await offlineApi.getStationDetail(id)
    info.value = res || {}; services.value = res?.services || []
  } catch {}
})
function navigate() { uni.openLocation({ latitude: info.value.lat || 39.9, longitude: info.value.lng || 116.4, name: info.value.name }) }
function book() { uni.navigateTo({ url: `/pages/offline/teacher-booking?stationId=${info.value.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.cover { width: 100%; height: 200px; }
.section { background: #fff; padding: 16px; margin-top: 10px; }
.name { font-size: 18px; font-weight: 600; display: block; }
.addr { font-size: 13px; color: #999; display: block; margin-top: 4px; }
.desc { font-size: 13px; color: #666; line-height: 1.6; display: block; margin-top: 8px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 10px; }
.service-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.sv-name { font-size: 14px; }
.sv-price { font-size: 14px; color: #C41E3A; }
.actions { display: flex; gap: 12px; padding: 16px; }
.btn-nav { flex: 1; background: #fff; border: 1px solid #C41E3A; color: #C41E3A; border-radius: 8px; padding: 12px; font-size: 14px; }
.btn-book { flex: 1; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 14px; }
</style>
