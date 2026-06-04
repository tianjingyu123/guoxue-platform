<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          身份切换
        </text>
        <view class="header-right" />
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="card"
      @retry="loadData"
    >
      <view
        v-if="showContent"
        class="content"
      >
        <!-- 当前身份 -->
        <view class="section">
          <text class="section-label">
            当前身份
          </text>
          <view
            class="current-role"
            :class="'cr-' + currentRole?.type"
          >
            <view class="current-role-icon-wrap">
              <text class="current-role-icon">
                {{ roleIcon(currentRole?.type || '') }}
              </text>
            </view>
            <view class="current-role-info">
              <view class="current-role-name-row">
                <text class="current-role-name">
                  {{ currentRole?.name }}
                </text>
                <text class="current-role-tag">
                  当前
                </text>
              </view>
              <text class="current-role-desc">
                {{ currentRole?.description }}
              </text>
              <text
                v-if="currentRole?.activatedAt"
                class="current-role-date"
              >
                激活于 {{ currentRole.activatedAt }}
              </text>
            </view>
          </view>
        </view>

        <!-- 可切换身份 -->
        <view
          v-if="activeRoles.length > 0"
          class="section"
        >
          <text class="section-label">
            可切换身份
          </text>
          <view
            v-for="role in activeRoles"
            :key="role.id"
            class="role-item"
            @click="handleRoleClick(role)"
          >
            <view
              class="role-icon-wrap"
              :class="'riw-' + role.type"
            >
              <text class="role-item-icon">
                {{ roleIcon(role.type) }}
              </text>
            </view>
            <view class="role-item-info">
              <view class="role-item-name-row">
                <text class="role-item-name">
                  {{ role.name }}
                </text>
                <text class="role-item-badge">
                  已激活
                </text>
              </view>
              <text class="role-item-desc">
                {{ role.description }}
              </text>
            </view>
            <text class="role-item-arrow">
              →
            </text>
          </view>
        </view>

        <!-- 审核中 -->
        <view
          v-if="pendingRoles.length > 0"
          class="section"
        >
          <text class="section-label">
            审核中
          </text>
          <view
            v-for="role in pendingRoles"
            :key="role.id"
            class="role-item disabled"
          >
            <view class="role-icon-wrap riw-pending">
              <text class="role-item-icon">
                {{ roleIcon(role.type) }}
              </text>
            </view>
            <view class="role-item-info">
              <view class="role-item-name-row">
                <text class="role-item-name">
                  {{ role.name }}
                </text>
                <text class="role-item-badge pending-badge">
                  审核中
                </text>
              </view>
              <text class="role-item-desc">
                {{ role.description }}
              </text>
              <text class="role-item-pending-hint">
                您的申请正在审核中，预计1-3个工作日完成
              </text>
            </view>
          </view>
        </view>

        <!-- 更多身份 -->
        <view
          v-if="inactiveRoles.length > 0"
          class="section"
        >
          <text class="section-label">
            更多身份
          </text>
          <view
            v-for="role in inactiveRoles"
            :key="role.id"
            class="role-item inactive"
            @click="handleRoleClick(role)"
          >
            <view class="role-icon-wrap riw-inactive">
              <text class="role-item-icon inactive-icon">
                {{ roleIcon(role.type) }}
              </text>
            </view>
            <view class="role-item-info">
              <view class="role-item-name-row">
                <text class="role-item-name inactive-text">
                  {{ role.name }}
                </text>
                <text class="role-item-badge inactive-badge">
                  🔒 未开通
                </text>
              </view>
              <text class="role-item-desc">
                {{ role.description }}
              </text>
            </view>
            <text class="role-item-apply">
              申请开通
            </text>
          </view>
        </view>

        <!-- 提示 -->
        <view class="tip-card">
          <text class="tip-icon">
            🛡
          </text>
          <view class="tip-body">
            <text class="tip-title">
              身份切换说明
            </text>
            <text class="tip-item">
              • 切换身份后，界面将自动跳转至对应工作台
            </text>
            <text class="tip-item">
              • 不同身份的数据和权限相互独立
            </text>
            <text class="tip-item">
              • 您可以随时切换回其他已激活身份
            </text>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 切换确认底部弹窗 -->
    <view
      v-if="showConfirm && selectedRole"
      class="sheet-overlay"
      @click="!switching && (showConfirm = false)"
    >
      <view
        class="sheet-content"
        @click.stop
      >
        <view class="sheet-handle" />
        <view class="sheet-body">
          <view
            class="sheet-icon-wrap"
            :class="'siw-' + selectedRole.type"
          >
            <text class="sheet-icon-text">
              {{ roleIcon(selectedRole.type) }}
            </text>
          </view>
          <text class="sheet-title">
            切换至「{{ selectedRole.name }}」身份
          </text>
          <text class="sheet-desc">
            切换后将跳转至{{ selectedRole.name }}工作台
          </text>
        </view>

        <view class="sheet-hint">
          <text class="sheet-hint-text">
            提示：切换身份不会影响您在其他身份下的数据，您可以随时切换回来。
          </text>
        </view>

        <view class="sheet-actions">
          <view
            class="sheet-btn sheet-btn-cancel"
            @click="showConfirm = false"
          >
            取消
          </view>
          <view
            class="sheet-btn sheet-btn-confirm"
            :class="{ disabled: switching }"
            @click="handleSwitch"
          >
            {{ switching ? '切换中...' : '确认切换' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataState from '../../components/DataState.vue'

interface UserRole {
  id: string
  type: string
  name: string
  description: string
  status: 'active' | 'pending' | 'inactive'
  activatedAt?: string
  workspaceUrl?: string
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const currentRoleId = ref('role_1')
const roles = ref<UserRole[]>([])
const showConfirm = ref(false)
const selectedRole = ref<UserRole | null>(null)
const switching = ref(false)

const currentRole = computed(() => roles.value.find((r) => r.id === currentRoleId.value))
const activeRoles = computed(() => roles.value.filter((r) => r.status === 'active' && r.id !== currentRoleId.value))
const pendingRoles = computed(() => roles.value.filter((r) => r.status === 'pending'))
const inactiveRoles = computed(() => roles.value.filter((r) => r.status === 'inactive'))
const showContent = computed(() => !loading.value && !loadError.value)

function roleIcon(type: string): string {
  const map: Record<string, string> = { student: '👤', teacher: '🎓', merchant: '🏪', host: '📡', creator: '✨' }
  return map[type] || '👤'
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 600))
    roles.value = [
      { id: 'role_1', type: 'student', name: '学员', description: '学习课程、参与圈子、购买商品', status: 'active', activatedAt: '2024-01-15' },
      { id: 'role_2', type: 'teacher', name: '讲师', description: '创建课程、开设直播、解答问题', status: 'active', activatedAt: '2024-03-20' },
      { id: 'role_3', type: 'merchant', name: '商家', description: '管理店铺、上架商品、处理订单', status: 'pending' },
      { id: 'role_4', type: 'host', name: '主播', description: '开设直播、获取打赏、粉丝互动', status: 'inactive' },
      { id: 'role_5', type: 'creator', name: '内容创作者', description: '发布文章、短视频、知识分享', status: 'active', activatedAt: '2024-06-01' },
    ]
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handleRoleClick(role: UserRole) {
  if (role.status === 'active' && role.id !== currentRoleId.value) {
    selectedRole.value = role
    showConfirm.value = true
  } else if (role.status === 'inactive') {
    uni.showToast({ title: '即将跳转申请页面', icon: 'none' })
  }
}

async function handleSwitch() {
  if (!selectedRole.value) return
  switching.value = true
  await new Promise((r) => setTimeout(r, 1000))
  currentRoleId.value = selectedRole.value.id
  switching.value = false
  showConfirm.value = false
  uni.showToast({ title: '已切换至' + selectedRole.value.name, icon: 'success' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-right { width: 80rpx; }

.content { padding: 24rpx; }
.section { margin-bottom: 32rpx; }
.section-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 16rpx; }

/* 当前身份 */
.current-role { border-radius: 20rpx; padding: 24rpx; display: flex; gap: 20rpx; border: 2rpx solid; }
.current-role.cr-student { background: #E3F2FD; border-color: #90CAF9; }
.current-role.cr-teacher { background: #F3E5F5; border-color: #CE93D8; }
.current-role.cr-merchant { background: #FFF3E0; border-color: #FFCC80; }
.current-role.cr-host { background: #FFEBEE; border-color: #EF9A9A; }
.current-role.cr-creator { background: #E8F5E9; border-color: #A5D6A7; }
.current-role-icon-wrap { width: 100rpx; height: 100rpx; border-radius: 16rpx; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.current-role-icon { font-size: 44rpx; }
.current-role-info { flex: 1; }
.current-role-name-row { display: flex; align-items: center; gap: 8rpx; }
.current-role-name { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.current-role-tag { font-size: 18rpx; padding: 2rpx 14rpx; background: #C41E3A; color: #fff; border-radius: 20rpx; }
.current-role-desc { font-size: 24rpx; color: #666; margin-top: 4rpx; display: block; }
.current-role-date { font-size: 20rpx; color: #999; margin-top: 8rpx; display: block; }

/* 可切换身份 */
.role-item { display: flex; align-items: center; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.role-item.disabled { background: #FAF8F5; }
.role-item.inactive { background: #FAF8F5; }
.role-icon-wrap { width: 88rpx; height: 88rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.riw-student { background: #E3F2FD; }
.riw-teacher { background: #F3E5F5; }
.riw-merchant { background: #FFF3E0; }
.riw-host { background: #FFEBEE; }
.riw-creator { background: #E8F5E9; }
.riw-pending { background: #FFF8E1; }
.riw-inactive { background: #F5F5F5; }
.role-item-icon { font-size: 36rpx; }
.role-item-icon.inactive-icon { opacity: 0.4; }
.role-item-info { flex: 1; min-width: 0; }
.role-item-name-row { display: flex; align-items: center; gap: 8rpx; }
.role-item-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.role-item-name.inactive-text { color: #999; }
.role-item-badge { font-size: 18rpx; padding: 2rpx 12rpx; background: #E8F5E9; color: #22C55E; border-radius: 16rpx; }
.role-item-badge.pending-badge { background: #FFF8E1; color: #F59E0B; }
.role-item-badge.inactive-badge { background: #F5F5F5; color: #999; }
.role-item-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.role-item-pending-hint { font-size: 20rpx; color: #B8B0A4; margin-top: 8rpx; display: block; }
.role-item-arrow { font-size: 32rpx; color: #B8B0A4; }
.role-item-apply { font-size: 22rpx; color: #C41E3A; white-space: nowrap; }

/* 提示 */
.tip-card { display: flex; gap: 16rpx; background: #E3F2FD; border: 1rpx solid #90CAF9; border-radius: 20rpx; padding: 24rpx; }
.tip-icon { font-size: 32rpx; flex-shrink: 0; margin-top: 2rpx; }
.tip-body { flex: 1; }
.tip-title { font-size: 24rpx; font-weight: 500; color: #1565C0; display: block; margin-bottom: 8rpx; }
.tip-item { font-size: 22rpx; color: #1976D2; display: block; line-height: 1.7; }

/* 底部弹窗 */
.sheet-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; }
.sheet-content { background: #fff; width: 100%; border-radius: 32rpx 32rpx 0 0; padding: 16rpx 32rpx 48rpx; animation: slideUp 0.3s ease; }
.sheet-handle { width: 80rpx; height: 8rpx; background: #E8E3DB; border-radius: 4rpx; margin: 0 auto 24rpx; }
.sheet-body { text-align: center; }
.sheet-icon-wrap { width: 120rpx; height: 120rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; margin: 0 auto 16rpx; }
.siw-student { background: #E3F2FD; }
.siw-teacher { background: #F3E5F5; }
.siw-merchant { background: #FFF3E0; }
.siw-host { background: #FFEBEE; }
.siw-creator { background: #E8F5E9; }
.sheet-icon-text { font-size: 56rpx; }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; }
.sheet-desc { font-size: 24rpx; color: #666; margin-top: 8rpx; display: block; }
.sheet-hint { background: #FAF8F5; border-radius: 16rpx; padding: 20rpx; margin: 24rpx 0; }
.sheet-hint-text { font-size: 22rpx; color: #666; display: block; line-height: 1.5; }
.sheet-actions { display: flex; gap: 16rpx; }
.sheet-btn { flex: 1; height: 88rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 500; }
.sheet-btn-cancel { background: #F5F0E8; color: #666; }
.sheet-btn-confirm { background: #C41E3A; color: #fff; }
.sheet-btn-confirm.disabled { opacity: 0.5; }

@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
