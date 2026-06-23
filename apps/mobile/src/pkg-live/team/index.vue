<template>
  <view v-if="isLoading" class="team-page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="80rpx" radius="16rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="60rpx" radius="16rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无团队成员" />
  <view v-else class="team-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view
          class="nav-back"
          @tap="goBack"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="#1a1a1a"
          />
        </view>
        <text class="nav-title">
          主播团队管理
        </text>
      </view>
      <view
        class="nav-add"
        @tap="showAddDialog = true"
      >
        <app-icon
          name="plus"
          :size="32"
          color="#fff"
        />
        <text class="nav-add-text">
          添加成员
        </text>
      </view>
    </view>

    <view class="page-body">
      <!-- 统计卡片 -->
      <view class="stat-grid">
        <view class="stat-card">
          <text class="stat-num stat-red">
            {{ countRole('host') }}
          </text>
          <text class="stat-label">
            主播
          </text>
        </view>
        <view class="stat-card">
          <text class="stat-num stat-orange">
            {{ countRole('cohost') }}
          </text>
          <text class="stat-label">
            副播
          </text>
        </view>
        <view class="stat-card">
          <text class="stat-num stat-blue">
            {{ countRole('operator') }}
          </text>
          <text class="stat-label">
            运营
          </text>
        </view>
      </view>

      <!-- 权限说明卡片 -->
      <view
        class="perm-card"
        @tap="showPermissions = !showPermissions"
      >
        <view class="perm-head">
          <view class="perm-head-left">
            <app-icon
              name="shield"
              :size="32"
              color="#d97706"
            />
            <text class="perm-title">
              角色权限说明
            </text>
          </view>
          <view
            class="perm-arrow"
            :class="{ 'perm-arrow-open': showPermissions }"
          >
            <app-icon
              name="chevron-left"
              :size="32"
              color="#999"
            />
          </view>
        </view>
        <view
          v-if="showPermissions"
          class="perm-body"
        >
          <view
            v-for="(perms, role) in permissions"
            :key="role"
            class="perm-group"
          >
            <view
              class="perm-badge"
              :style="{ background: roleConfig[role].color }"
            >
              {{ roleConfig[role].label }}
            </view>
            <view class="perm-list">
              <view
                v-for="(perm, idx) in perms"
                :key="idx"
                class="perm-item"
              >
                <app-icon
                  :name="perm.icon"
                  :size="24"
                  color="#999"
                />
                <text class="perm-item-text">
                  {{ perm.label }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索 -->
      <view class="search-box">
        <app-icon
          name="search"
          :size="32"
          color="#999"
          class="search-icon"
        />
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索成员姓名或擅长领域"
          placeholder-class="search-ph"
        >
      </view>

      <!-- Tab -->
      <view class="tab-row">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="tab-item"
          :class="{ 'tab-item-active': activeTab === t.key }"
          @tap="activeTab = t.key"
        >
          {{ t.label }}
        </view>
      </view>

      <!-- 成员列表 -->
      <view class="member-list">
        <view
          v-if="filteredMembers.length === 0"
          class="empty-card"
        >
          <app-icon
            name="users"
            :size="96"
            color="#e0e0e0"
          />
          <text class="empty-text">
            暂无成员
          </text>
          <view
            class="empty-btn"
            @tap="showAddDialog = true"
          >
            添加成员
          </view>
        </view>
        <view
          v-for="member in filteredMembers"
          :key="member.id"
          class="member-card"
        >
          <view class="member-avatar-wrap">
            <image
              class="member-avatar"
              :src="member.avatar"
              mode="aspectFill"
            />
            <view
              class="member-status"
              :class="member.status === 'online' ? 'status-online' : 'status-offline'"
            />
          </view>
          <view class="member-info">
            <view class="member-name-row">
              <text class="member-name">
                {{ member.name }}
              </text>
              <view
                class="role-badge"
                :style="{ background: roleConfig[member.role].color }"
              >
                <app-icon
                  :name="roleConfig[member.role].icon"
                  :size="24"
                  color="#fff"
                />
                <text class="role-badge-text">
                  {{ roleConfig[member.role].label }}
                </text>
              </view>
              <view
                v-if="member.hasActiveLive"
                class="live-badge"
              >
                直播中
              </view>
            </view>
            <view class="exp-row">
              <text
                v-for="(exp, idx) in member.expertise"
                :key="idx"
                class="exp-tag"
              >
                {{ exp }}
              </text>
            </view>
            <view class="member-meta">
              <view class="meta-item">
                <app-icon
                  name="phone"
                  :size="24"
                  color="#999"
                />
                <text class="meta-text">
                  {{ member.phone }}
                </text>
              </view>
              <text class="meta-text">
                已直播 {{ member.liveCount }} 场
              </text>
            </view>
          </view>
          <view class="member-menu-wrap">
            <view
              class="member-menu-btn"
              @tap.stop="toggleMenu(member.id)"
            >
              <app-icon
                name="more-horizontal"
                :size="32"
                color="#1a1a1a"
              />
            </view>
            <template v-if="openMenuId === member.id">
              <view
                class="menu-mask"
                @tap.stop="openMenuId = null"
              />
              <view class="menu-pop">
                <view
                  class="menu-item"
                  @tap.stop="openEdit(member)"
                >
                  <app-icon
                    name="edit-2"
                    :size="32"
                    color="#1a1a1a"
                  />
                  <text class="menu-item-text">
                    编辑信息
                  </text>
                </view>
                <view class="menu-divider" />
                <view
                  class="menu-item"
                  @tap.stop="openRemove(member)"
                >
                  <app-icon
                    name="trash-2"
                    :size="32"
                    color="#ef4444"
                  />
                  <text class="menu-item-text menu-item-danger">
                    移除成员
                  </text>
                </view>
              </view>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加成员对话框 -->
    <view
      v-if="showAddDialog"
      class="dialog-mask"
      @tap="showAddDialog = false"
    >
      <view
        class="dialog"
        @tap.stop
      >
        <text class="dialog-title">
          添加团队成员
        </text>
        <text class="dialog-desc">
          从签约讲师或圈内成员中搜索添加
        </text>
        <view class="search-box dialog-search">
          <app-icon
            name="search"
            :size="32"
            color="#999"
            class="search-icon"
          />
          <input
            v-model="addSearchQuery"
            class="search-input"
            placeholder="搜索姓名或擅长领域"
            placeholder-class="search-ph"
          >
        </view>
        <view class="form-group">
          <text class="form-label">
            分配角色
          </text>
          <view class="role-select">
            <view
              v-for="r in ['host', 'cohost', 'operator']"
              :key="r"
              class="role-opt"
              :class="{ 'role-opt-active': selectedRole === r }"
              @tap="selectedRole = r"
            >
              {{ roleConfig[r].label }}
            </view>
          </view>
        </view>
        <text class="result-label">
          搜索结果
        </text>
        <scroll-view
          scroll-y
          class="add-result"
        >
          <view
            v-for="m in filteredAvailable"
            :key="m.id"
            class="add-card"
          >
            <view class="add-avatar">
              {{ m.name[0] }}
            </view>
            <view class="add-info">
              <view class="add-name-row">
                <text class="add-name">
                  {{ m.name }}
                </text>
                <view class="add-type">
                  {{ m.type === 'lecturer' ? '签约讲师' : '圈内成员' }}
                </view>
              </view>
              <text class="add-exp">
                {{ m.expertise.join('、') }}
              </text>
            </view>
            <view class="add-btn">
              <app-icon
                name="plus"
                :size="24"
                color="#1a1a1a"
              />
              <text class="add-btn-text">
                添加
              </text>
            </view>
          </view>
        </scroll-view>
        <view class="dialog-footer">
          <view
            class="dlg-btn dlg-btn-outline"
            @tap="showAddDialog = false"
          >
            取消
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑成员对话框 -->
    <view
      v-if="showEditDialog"
      class="dialog-mask"
      @tap="showEditDialog = false"
    >
      <view
        class="dialog"
        @tap.stop
      >
        <text class="dialog-title">
          编辑成员信息
        </text>
        <view
          v-if="selectedMember"
          class="edit-body"
        >
          <view class="edit-head">
            <image
              class="edit-avatar"
              :src="selectedMember.avatar"
              mode="aspectFill"
            />
            <view>
              <text class="edit-name">
                {{ selectedMember.name }}
              </text>
              <text class="edit-join">
                加入时间：{{ selectedMember.joinDate }}
              </text>
            </view>
          </view>
          <view class="form-group">
            <text class="form-label">
              角色
            </text>
            <view class="role-select">
              <view
                v-for="r in ['host', 'cohost', 'operator']"
                :key="r"
                class="role-opt"
                :class="{ 'role-opt-active': selectedRole === r }"
                @tap="selectedRole = r"
              >
                {{ roleConfig[r].label }}
              </view>
            </view>
          </view>
          <view class="cur-perm">
            <text class="cur-perm-label">
              当前角色权限
            </text>
            <view class="cur-perm-list">
              <view
                v-for="(perm, idx) in (permissions[selectedRole] || [])"
                :key="idx"
                class="cur-perm-item"
              >
                <app-icon
                  name="check"
                  :size="24"
                  color="#22c55e"
                />
                <text class="cur-perm-text">
                  {{ perm.label }}
                </text>
              </view>
            </view>
          </view>
        </view>
        <view class="dialog-footer">
          <view
            class="dlg-btn dlg-btn-outline"
            @tap="showEditDialog = false"
          >
            取消
          </view>
          <view
            class="dlg-btn dlg-btn-primary"
            @tap="showEditDialog = false"
          >
            保存
          </view>
        </view>
      </view>
    </view>

    <!-- 移除确认对话框 -->
    <view
      v-if="showRemoveDialog"
      class="dialog-mask"
      @tap="showRemoveDialog = false"
    >
      <view
        class="dialog dialog-sm"
        @tap.stop
      >
        <text class="dialog-title">
          移除成员
        </text>
        <view
          v-if="selectedMember"
          class="remove-body"
        >
          <view
            v-if="selectedMember.hasActiveLive"
            class="warn-box"
          >
            <app-icon
              name="alert-triangle"
              :size="40"
              color="#ef4444"
            />
            <view class="warn-text">
              <text class="warn-title">
                无法移除
              </text>
              <text class="warn-desc">
                该成员当前有进行中的直播，请在直播结束后再进行移除操作。
              </text>
            </view>
          </view>
          <view
            v-else
            class="remove-confirm"
          >
            <image
              class="remove-avatar"
              :src="selectedMember.avatar"
              mode="aspectFill"
            />
            <text class="remove-q">
              确定要移除 <text class="remove-name">
                {{ selectedMember.name }}
              </text> 吗？
            </text>
            <text class="remove-sub">
              移除后该成员将无法参与直播管理
            </text>
          </view>
        </view>
        <view class="dialog-footer">
          <view
            class="dlg-btn dlg-btn-outline"
            @tap="showRemoveDialog = false"
          >
            取消
          </view>
          <view
            v-if="selectedMember && !selectedMember.hasActiveLive"
            class="dlg-btn dlg-btn-danger"
            :class="{ disabled: submitting }"
            @tap="confirmRemove"
          >
            {{ submitting ? '移除中...' : '确认移除' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useSubmitLock } from '@/composables/use-submit-lock'
import {
  teamMembers, teamAvailableMembers, teamRoleConfig, teamPermissions,
  type TeamMember, type TeamRole,
} from '@/lib/live-data'

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const isEmpty = computed(() => filteredMembers.value.length === 0)
function reload() {
  loadError.value = null
}

const roleConfig = teamRoleConfig as Record<string, typeof teamRoleConfig[TeamRole]>
const permissions = teamPermissions as Record<string, typeof teamPermissions[TeamRole]>

const activeTab = ref('all')
const searchQuery = ref('')
const showAddDialog = ref(false)
const showRemoveDialog = ref(false)
const showEditDialog = ref(false)
const showPermissions = ref(false)
const selectedMember = ref<TeamMember | null>(null)
const addSearchQuery = ref('')
const selectedRole = ref('cohost')
const openMenuId = ref<number | null>(null)
const { submitting, withLock } = useSubmitLock()

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'host', label: '主播' },
  { key: 'cohost', label: '副播' },
  { key: 'operator', label: '运营' },
]

function countRole(role: string) {
  return teamMembers.filter((m) => m.role === role).length
}

const filteredMembers = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return teamMembers.filter((member) => {
    const matchTab = activeTab.value === 'all' || member.role === activeTab.value
    const matchSearch = member.name.toLowerCase().includes(q) || member.expertise.some((e) => e.includes(searchQuery.value))
    return matchTab && matchSearch
  })
})

const filteredAvailable = computed(() => {
  return teamAvailableMembers.filter(
    (m) => m.name.includes(addSearchQuery.value) || m.expertise.some((e) => e.includes(addSearchQuery.value)),
  )
})

function toggleMenu(id: number) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function openEdit(member: TeamMember) {
  selectedMember.value = member
  selectedRole.value = member.role
  showEditDialog.value = true
  openMenuId.value = null
}
function openRemove(member: TeamMember) {
  selectedMember.value = member
  showRemoveDialog.value = true
  openMenuId.value = null
}
function confirmRemove() {
  if (selectedMember.value?.hasActiveLive || submitting.value) return
  withLock(async () => {
    console.log('[v0] 移除成员', selectedMember.value?.id)
    showRemoveDialog.value = false
    selectedMember.value = null
  })
}
function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.team-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 80rpx;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 1px solid #ece8e1;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nav-back {
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.nav-add {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 56rpx;
  padding: 0 20rpx;
  background: #C41E3A;
  border-radius: 12rpx;
}
.nav-add-text {
  font-size: 26rpx;
  color: #fff;
}

.page-body {
  padding: 24rpx;
}

/* 统计卡片 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 24rpx;
}
.stat-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num {
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.2;
}
.stat-red {
  color: #ef4444;
}
.stat-orange {
  color: #f97316;
}
.stat-blue {
  color: #3b82f6;
}
.stat-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}

/* 权限说明 */
.perm-card {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.1), rgba(249, 115, 22, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.perm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.perm-head-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.perm-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.perm-arrow {
  transform: rotate(-90deg);
  transition: transform 0.2s;
  display: flex;
}
.perm-arrow-open {
  transform: rotate(90deg);
}
.perm-body {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1px solid rgba(245, 158, 11, 0.2);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.perm-group {
  display: flex;
  flex-direction: column;
}
.perm-badge {
  align-self: flex-start;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #fff;
  margin-bottom: 16rpx;
}
.perm-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.perm-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.perm-item-text {
  font-size: 22rpx;
  color: #999;
}

/* 搜索 */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.search-icon {
  position: absolute;
  left: 20rpx;
  z-index: 1;
}
.search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx 0 64rpx;
  background: #fff;
  border: 1px solid #e5e0d8;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #1a1a1a;
}
.search-ph {
  color: #b3b3b3;
}

/* Tab */
.tab-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4rpx;
  padding: 8rpx;
  background: #f0ece5;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}
.tab-item {
  text-align: center;
  padding: 14rpx 0;
  font-size: 26rpx;
  color: #999;
  border-radius: 12rpx;
}
.tab-item-active {
  background: #fff;
  color: #1a1a1a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 成员列表 */
.member-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.empty-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  padding: 64rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-text {
  font-size: 26rpx;
  color: #999;
  margin-top: 24rpx;
}
.empty-btn {
  margin-top: 24rpx;
  padding: 12rpx 28rpx;
  border: 1px solid #d8d2c8;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #1a1a1a;
}
.member-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  padding: 28rpx;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}
.member-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.member-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #f0ece5;
}
.member-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  border: 2px solid #fff;
}
.status-online {
  background: #22c55e;
}
.status-offline {
  background: #9ca3af;
}
.member-info {
  flex: 1;
  min-width: 0;
}
.member-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}
.member-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.role-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.role-badge-text {
  font-size: 20rpx;
  color: #fff;
}
.live-badge {
  padding: 2rpx 12rpx;
  border: 1px solid #ef4444;
  border-radius: 8rpx;
  font-size: 20rpx;
  color: #ef4444;
}
.exp-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}
.exp-tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: #f0ece5;
  font-size: 20rpx;
  color: #999;
}
.member-meta {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 16rpx;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.meta-text {
  font-size: 22rpx;
  color: #999;
}
.member-menu-wrap {
  position: relative;
  flex-shrink: 0;
}
.member-menu-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.menu-pop {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 50;
  width: 220rpx;
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 12rpx;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 8rpx 0;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
}
.menu-item-text {
  font-size: 26rpx;
  color: #1a1a1a;
}
.menu-item-danger {
  color: #ef4444;
}
.menu-divider {
  height: 1px;
  background: #ece8e1;
  margin: 4rpx 0;
}

/* 对话框 */
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.dialog {
  width: 100%;
  max-width: 680rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
}
.dialog-sm {
  max-width: 560rpx;
}
.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  display: block;
}
.dialog-desc {
  font-size: 26rpx;
  color: #999;
  margin-top: 12rpx;
  display: block;
}
.dialog-search {
  margin-top: 32rpx;
  margin-bottom: 0;
}
.form-group {
  margin-top: 24rpx;
}
.form-label {
  font-size: 26rpx;
  color: #1a1a1a;
  display: block;
  margin-bottom: 12rpx;
}
.role-select {
  display: flex;
  gap: 12rpx;
}
.role-opt {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border: 1px solid #e5e0d8;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #999;
}
.role-opt-active {
  border-color: #C41E3A;
  background: rgba(196, 30, 58, 0.06);
  color: #C41E3A;
}
.result-label {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-top: 24rpx;
}
.add-result {
  max-height: 480rpx;
  margin-top: 16rpx;
}
.add-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}
.add-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f0ece5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #999;
  flex-shrink: 0;
}
.add-info {
  flex: 1;
  min-width: 0;
}
.add-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.add-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.add-type {
  padding: 2rpx 10rpx;
  border: 1px solid #e5e0d8;
  border-radius: 6rpx;
  font-size: 20rpx;
  color: #999;
}
.add-exp {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.add-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 20rpx;
  border: 1px solid #d8d2c8;
  border-radius: 10rpx;
  flex-shrink: 0;
}
.add-btn-text {
  font-size: 24rpx;
  color: #1a1a1a;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 40rpx;
}
.dlg-btn {
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
}
.dlg-btn-outline {
  border: 1px solid #d8d2c8;
  color: #1a1a1a;
}
.dlg-btn-primary {
  background: #C41E3A;
  color: #fff;
}
.dlg-btn-danger {
  background: #ef4444;
  color: #fff;
}
.dlg-btn-danger.disabled {
  opacity: 0.5;
}

/* 编辑 */
.edit-head {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 24rpx;
}
.edit-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #f0ece5;
}
.edit-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  display: block;
}
.edit-join {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}
.cur-perm {
  margin-top: 24rpx;
  padding: 24rpx;
  background: #f7f4ef;
  border-radius: 12rpx;
}
.cur-perm-label {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}
.cur-perm-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.cur-perm-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.cur-perm-text {
  font-size: 22rpx;
  color: #1a1a1a;
}

/* 移除 */
.remove-body {
  margin-top: 24rpx;
}
.warn-box {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 28rpx;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12rpx;
}
.warn-text {
  flex: 1;
}
.warn-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #dc2626;
  display: block;
}
.warn-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
  display: block;
  line-height: 1.5;
}
.remove-confirm {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.remove-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #f0ece5;
  margin-bottom: 24rpx;
}
.remove-q {
  font-size: 26rpx;
  color: #999;
}
.remove-name {
  font-weight: 500;
  color: #1a1a1a;
}
.remove-sub {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
</style>
