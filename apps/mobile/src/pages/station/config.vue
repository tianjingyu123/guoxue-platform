<template>
  <view class="page">
    <view class="section">
      <text class="title">分站配置</text>
      <view class="form-item"><text class="label">分站名称</text><input v-model="form.name" class="input" /></view>
      <view class="form-item"><text class="label">简介</text><textarea v-model="form.description" class="textarea" /></view>
      <view class="form-item"><text class="label">主题色</text><input v-model="form.themeColor" class="input" placeholder="#C41E3A" /></view>
      <view class="form-item"><text class="label">联系方式</text><input v-model="form.contact" class="input" /></view>
      <button class="btn-save" @click="save">保存配置</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { stationApi } from '../../api'
const form = ref({ name: '', description: '', themeColor: '', contact: '' })
onMounted(async () => {
  try { const res: any = await stationApi.getConfig(); Object.assign(form.value, res || {}) } catch {}
})
async function save() {
  try { await stationApi.updateConfig(form.value); uni.showToast({ title: '保存成功' }) } catch { uni.showToast({ title: '保存失败', icon: 'none' }) }
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 20px 16px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 16px; }
.form-item { margin-bottom: 14px; }
.label { font-size: 13px; color: #666; display: block; margin-bottom: 6px; }
.input { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; width: 100%; box-sizing: border-box; }
.textarea { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; height: 80px; width: 100%; box-sizing: border-box; }
.btn-save { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; margin-top: 12px; }
</style>
