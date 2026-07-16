<script setup lang="ts">
import { ref, shallowRef, onMounted, type Component } from 'vue'
import { BRAND } from '@/lib/brand'
import PendingOverview from '@/components/PendingOverview.vue'

const loading = ref(true)
const dashComp = shallowRef<Component | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    let cached = localStorage.getItem('user_roles')
    // 缓存缺失（清过浏览器缓存但 token 有效）时主动拉档案回填，
    // 否则员工首屏退化成空欢迎页、看不到角色工作台（2026-07-15 走查修）
    if (!cached) {
      const { useAuthStore } = await import('@/store/auth')
      await useAuthStore().fetchProfile().catch(() => {})
      cached = localStorage.getItem('user_roles')
    }
    const roles: string[] = cached ? JSON.parse(cached) : []

    let mod: { default: Component } | null = null
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
  } catch (e) {
    error.value = (e as Error)?.message || String(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div
    v-loading="loading"
    style="min-height:300px"
  >
    <!-- 待办概览：员工进后台第一眼看到各审核队列待处理数（目录重构批 2026-07-11） -->
    <PendingOverview />
    <component
      :is="dashComp"
      v-if="dashComp"
    />
    <div
      v-else-if="error"
      class="dashboard-error"
    >
      <div class="error-icon">⚠</div>
      <p>仪表盘加载失败：{{ error }}</p>
    </div>
    <div
      v-else
      class="dashboard-welcome"
    >
      <div class="welcome-card">
        <div class="welcome-decoration" />
        <div class="welcome-icon">🏮</div>
        <h1 class="welcome-title">{{ BRAND.name }}</h1>
        <p class="welcome-subtitle">管理后台</p>
        <hr class="gold-divider">
        <p class="welcome-text">
          欢迎使用{{ BRAND.name }}管理后台。<br>
          请通过左侧菜单选择管理功能。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-error {
  padding: 80px 20px;
  text-align: center;
  color: var(--color-primary);
}
.error-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-lg);
  opacity: 0.6;
}

.dashboard-welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height) - var(--spacing-xl) * 2 - 120px);
}

.welcome-card {
  text-align: center;
  padding: 60px 80px;
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-divider);
  box-shadow: var(--shadow-card);
  position: relative;
  overflow: hidden;
}
/* 顶部装饰金条 */
.welcome-decoration {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  border-radius: 0 0 var(--radius-xs) var(--radius-xs);
  background: var(--gradient-gold);
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: var(--spacing-lg);
  line-height: 1;
}
.welcome-title {
  font-family: var(--font-family-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-title);
  letter-spacing: 6px;
  margin: 0 0 4px 0;
}
.welcome-subtitle {
  font-size: var(--font-size-subtitle);
  color: var(--color-gold);
  font-weight: 500;
  letter-spacing: 4px;
  margin: 0 0 var(--spacing-xl) 0;
}
.welcome-text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
  line-height: 1.8;
  margin: var(--spacing-xl) 0 0 0;
}
</style>
