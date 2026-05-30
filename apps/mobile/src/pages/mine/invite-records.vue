<template>
  <view class="page">
    <view class="invite-card">
      <text class="i-label">我的邀请码</text>
      <text class="i-code">{{ code }}</text>
      <button class="btn-copy" @click="copy">复制邀请码</button>
    </view>
    <view class="section"><text class="section-title">邀请记录</text>
      <view v-for="r in records" :key="r.id" class="record">
        <image :src="r.avatar || ''" class="r-avatar" mode="aspectFill" />
        <view class="r-info"><text class="r-name">{{ r.nickname || '用户' }}</text><text class="r-time">{{ r.createdAt?.slice(0, 10) }}</text></view>
        <text class="r-reward">+{{ r.reward || 0 }}积分</text>
      </view>
      <EmptyState v-if="!records.length" text="暂无邀请记录" />
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EmptyState from '../../components/EmptyState.vue'
import { userApi } from '../../api'
const code = ref('GX2024ABC'); const records = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await (userApi as any).getInviteRecords?.(); records.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {}
})
function copy() { uni.setClipboardData({ data: code.value }); uni.showToast({ title: '已复制' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.invite-card { background: linear-gradient(135deg, #C41E3A, #C9A96E); border-radius: 12px; padding: 24px; text-align: center; color: #fff; margin-bottom: 12px; }
.i-label { font-size: 13px; opacity: 0.8; display: block; }
.i-code { font-size: 24px; font-weight: bold; letter-spacing: 2px; display: block; margin: 8px 0; }
.btn-copy { background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.5); border-radius: 20px; padding: 6px 20px; font-size: 13px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 10px; }
.record { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.r-avatar { width: 32px; height: 32px; border-radius: 50%; }
.r-info { flex: 1; }
.r-name { font-size: 13px; display: block; }
.r-time { font-size: 11px; color: #ccc; }
.r-reward { font-size: 13px; color: #4CAF50; }
</style>
