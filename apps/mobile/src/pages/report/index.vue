<template>
  <view class="page">
    <view class="section">
      <text class="title">举报</text>
      <view v-if="target" class="target-info"><text>举报对象：{{ target.name || target.title }}</text></view>
      <view class="reasons">
        <view v-for="r in reasons" :key="r" class="reason" :class="{ selected: r === selectedReason }" @click="selectedReason = r"><text>{{ r }}</text></view>
      </view>
      <textarea v-model="detail" placeholder="补充说明（选填）" class="textarea" />
      <button class="btn-submit" @click="submit">提交举报</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { reportApi } from '../../api'
const target = ref<any>(null); const selectedReason = ref(''); const detail = ref('')
const reasons = ['色情低俗', '政治敏感', '暴力恐怖', '违法信息', '虚假信息', '侵权举报', '其他']
onMounted(() => {
  const pages = getCurrentPages(); const opts = (pages[pages.length - 1] as any)?.options || {}
  target.value = { id: opts.targetId, name: opts.targetName, type: opts.type }
})
async function submit() {
  if (!selectedReason.value) { uni.showToast({ title: '请选择举报原因', icon: 'none' }); return }
  try { await reportApi.report({ targetId: target.value?.id, type: target.value?.type, reason: selectedReason.value, detail: detail.value }); uni.showToast({ title: '举报提交成功' }); setTimeout(() => uni.navigateBack(), 1500) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 20px 16px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 12px; }
.target-info { padding: 10px; background: #f9f9f9; border-radius: 8px; font-size: 13px; margin-bottom: 14px; }
.reasons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.reason { padding: 8px 16px; border: 1px solid #ddd; border-radius: 20px; font-size: 13px; }
.reason.selected { border-color: #C41E3A; background: #FFF8F8; color: #C41E3A; }
.textarea { border: 1px solid #ddd; border-radius: 8px; padding: 10px; font-size: 14px; height: 80px; width: 100%; box-sizing: border-box; margin-bottom: 14px; }
.btn-submit { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; }
</style>
