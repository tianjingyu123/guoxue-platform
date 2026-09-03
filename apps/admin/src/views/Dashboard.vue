<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, type Component } from 'vue'
import { BRAND } from '@/lib/brand'
import PendingOverview from '@/components/PendingOverview.vue'

const loading = ref(true)
const dashComp = shallowRef<Component | null>(null)
const error = ref('')

// ===== 工作台定义（优先级从高到低，与旧 else-if 链一致）=====
// 多角色员工原来只能看到最高优先级工作台，其余工作台永远不可达；
// 现按用户实际拥有的角色生成可切换列表（2026-07-18·董事长"每个员工进工作区便携高效"）
interface DashDef { role: string; label: string; loader: () => Promise<{ default: Component }> }
const DASHBOARDS: DashDef[] = [
  { role: 'SUPER_ADMIN', label: '超管总览', loader: () => import('@/views/dashboard/SuperAdminDashboard.vue') },
  { role: 'OPERATION_ADMIN', label: '运营工作台', loader: () => import('@/views/dashboard/OperationDashboard.vue') },
  { role: 'FINANCE_ADMIN', label: '财务工作台', loader: () => import('@/views/dashboard/FinanceDashboard.vue') },
  { role: 'CUSTOMER_SERVICE', label: '客服工作台', loader: () => import('@/views/dashboard/CustomerServiceDashboard.vue') },
  { role: 'CONTENT_AUDITOR', label: '内容审核台', loader: () => import('@/views/dashboard/ContentAuditDashboard.vue') },
  { role: 'GOODS_AUDITOR', label: '商品审核台', loader: () => import('@/views/dashboard/GoodsAuditDashboard.vue') },
]

/** 当前用户可用的工作台（按优先级序） */
const available = ref<DashDef[]>([])
/** 当前选中的工作台角色 */
const activeRole = ref('')
/** 已加载过的工作台组件缓存（切换不重复拉 chunk） */
const compCache = new Map<string, Component>()

const segOptions = computed(() => available.value.map((d) => ({ label: d.label, value: d.role })))

/** 加载并切到指定角色的工作台 */
async function applyRole(role: string) {
  const def = DASHBOARDS.find((d) => d.role === role)
  if (!def) return
  const cached = compCache.get(role)
  if (cached) {
    dashComp.value = cached
    return
  }
  loading.value = true
  try {
    const mod = await def.loader()
    compCache.set(role, mod.default)
    dashComp.value = mod.default
  } catch (e) {
    error.value = (e as Error)?.message || String(e)
  } finally {
    loading.value = false
  }
}

watch(activeRole, (role) => { if (role) void applyRole(role) })

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

    available.value = DASHBOARDS.filter((d) => roles.includes(d.role))
    if (available.value.length > 0) {
      // 默认进最高优先级工作台（watch 触发 applyRole 加载）
      activeRole.value = available.value[0].role
    }
  } catch (e) {
    error.value = (e as Error)?.message || String(e)
  } finally {
    if (!activeRole.value) loading.value = false
  }
})
</script>

<template>
  <div
    v-loading="loading"
    style="min-height:300px"
  >
    <!-- 工作台切换：仅多角色员工可见（单角色不显示，避免多余控件·2026-07-18） -->
    <div
      v-if="available.length > 1"
      class="workspace-switch"
    >
      <el-segmented
        v-model="activeRole"
        :options="segOptions"
      />
    </div>
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
      <div class="error-icon">
        ⚠
      </div>
      <p>仪表盘加载失败：{{ error }}</p>
    </div>
    <div
      v-else
      class="dashboard-welcome"
    >
      <div class="welcome-card">
        <div class="welcome-decoration" />
        <div class="welcome-icon">
          热
        </div>
        <h1 class="welcome-title">
          {{ BRAND.name }}
        </h1>
        <p class="welcome-subtitle">
          管理后台
        </p>
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
.workspace-switch {
  margin-bottom: 16px;
}

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
