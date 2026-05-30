<template>
  <view class="page">
    <view class="section">
      <text class="title">身份切换</text>
      <view class="role" v-for="r in roles" :key="r.id" :class="{ active: r.id === current }" @click="switchRole(r)">
        <text class="role-name">{{ r.name }}</text>
        <text class="role-desc">{{ r.desc }}</text>
        <text v-if="r.id === current" class="role-tag">当前</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { identityApi } from '../../api'
const roles = ref<any[]>([]); const current = ref('')
onMounted(async () => {
  try {
    const res: any = await identityApi.getMyIdentities()
    roles.value = Array.isArray(res) ? res : res?.data || []
    current.value = roles.value.find((r: any) => r.active)?.id || roles.value[0]?.id || ''
  } catch {}
})
async function switchRole(r: any) {
  try { await identityApi.switchIdentity(r.id); current.value = r.id; uni.showToast({ title: '已切换' }) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 12px; }
.role { padding: 14px; border: 1px solid #eee; border-radius: 10px; margin-bottom: 10px; position: relative; }
.role.active { border-color: #C41E3A; background: #FFF8F8; }
.role-name { font-size: 15px; font-weight: 500; display: block; }
.role-desc { font-size: 12px; color: #999; margin-top: 4px; display: block; }
.role-tag { position: absolute; top: 8px; right: 12px; font-size: 11px; color: #C41E3A; background: #FFF0F0; padding: 2px 8px; border-radius: 10px; }
</style>
