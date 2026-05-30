<template>
  <view class="page">
    <view class="section">
      <text class="title">竞赛报名</text>
      <text class="comp-name">{{ comp.name || '' }}</text>
      <text class="comp-time">比赛时间：{{ comp.startDate || '' }} - {{ comp.endDate || '' }}</text>
      <input v-model="form.name" placeholder="参赛者姓名" class="input" />
      <input v-model="form.phone" placeholder="联系电话" class="input" />
      <input v-model="form.school" placeholder="学校/机构（选填）" class="input" />
      <button class="btn-reg" @click="submit">确认报名</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { competitionApi } from '../../api'
const comp = ref<any>({}); const form = ref({ name: '', phone: '', school: '' })
onMounted(async () => {
  const pages = getCurrentPages(); const id = (pages[pages.length - 1] as any)?.options?.id
  try { const res: any = await competitionApi.getDetail(id); comp.value = res || {} } catch {}
})
async function submit() {
  if (!form.value.name || !form.value.phone) { uni.showToast({ title: '请填写必填项', icon: 'none' }); return }
  try { await competitionApi.register({ ...form.value, competitionId: comp.value.id }); uni.showToast({ title: '报名成功' }); setTimeout(() => uni.navigateBack(), 1500) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 20px 16px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 8px; }
.comp-name { font-size: 14px; color: #C41E3A; display: block; margin-bottom: 4px; }
.comp-time { font-size: 12px; color: #999; display: block; margin-bottom: 16px; }
.input { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; margin-bottom: 12px; width: 100%; box-sizing: border-box; }
.btn-reg { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; margin-top: 8px; }
</style>
