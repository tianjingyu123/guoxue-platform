<script setup lang="ts">
import { ref, shallowRef, onMounted, type Component } from 'vue'

const loading = ref(true)
const dashComp = shallowRef<Component | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    const cached = localStorage.getItem('user_roles')
    const roles: string[] = cached ? JSON.parse(cached) : []

    let mod: any = null
    if (roles.includes('SUPER_ADMIN')) {
      mod = await import('@/views/dashboard/SuperAdminDashboard.vue')
    } else if (roles.includes('OPERATION_ADMIN')) {
      mod = await import('@/views/dashboard/OperationDashboard.vue')
    } else if (roles.includes('FINANCE_ADMIN')) {
      mod = await import('@/views/dashboard/FinanceDashboard.vue')
    } else if (roles.includes('CUSTOMER_SERVICE')) {
      mod = await import('@/views/dashboard/CustomerServiceDashboard.vue')
    } else if (roles.includes('CONTENT_AUDITOR')) {
      mod = await import('@/views/dashboard/ContentAuditDashboard.vue')
    } else if (roles.includes('GOODS_AUDITOR')) {
      mod = await import('@/views/dashboard/GoodsAuditDashboard.vue')
    }

    if (mod) {
      dashComp.value = mod.default
    }
  } catch (e: any) {
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading" style="min-height:300px">
    <component v-if="dashComp" :is="dashComp" />
    <div v-else-if="error" style="padding:40px;text-align:center;color:#c41e3a">
      <p>仪表盘加载失败：{{ error }}</p>
    </div>
    <div v-else class="dashboard">
      <h2 style="color:#C41E3A;margin-bottom:8px">🏮 热卜国学管理后台</h2>
      <p style="color:#999">欢迎使用管理后台，请通过左侧菜单导航。</p>
    </div>
  </div>
</template>

<style scoped>
.dashboard { text-align: center; padding: 80px 20px; }
</style>
