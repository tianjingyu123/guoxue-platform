<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-left" @click="goBack">
        <text class="nav-back-icon">←</text>
        <text class="nav-title">圈子成员</text>
      </view>
      <view style="width: 48rpx;" />
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input class="search-input" v-model="searchQuery" type="text" placeholder="搜索成员昵称或编号" />
        <text v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</text>
      </view>
    </view>

    <!-- 角色筛选 -->
    <scroll-view scroll-x class="role-scroll">
      <view v-for="role in roles" :key="role.id"
        class="role-chip" :class="{ active: selectedRole === role.id }"
        @click="selectedRole = role.id"
      >
        <text>{{ role.label }} {{ role.count }}</text>
      </view>
    </scroll-view>

    <!-- 排序+计数 -->
    <view class="sort-row">
      <text class="sort-count">共 {{ filteredMembers.length }} 位成员</text>
      <view class="sort-toggle" @click="showSortMenu = !showSortMenu">
        <text>{{ sortBy === 'time' ? '按加入时间' : '按活跃度' }}</text>
        <text class="sort-arrow">▼</text>
      </view>
    </view>
    <view v-if="showSortMenu" class="sort-menu">
      <view class="sort-menu-item" :class="{ active: sortBy === 'time' }" @click="sortBy = 'time'; showSortMenu = false">
        <text>按加入时间</text>
      </view>
      <view class="sort-menu-item" :class="{ active: sortBy === 'active' }" @click="sortBy = 'active'; showSortMenu = false">
        <text>按活跃度</text>
      </view>
    </view>

    <!-- 成员列表 -->
    <scroll-view scroll-y class="content" :style="{ height: 'calc(100vh - 56px - 48px - 56px - 56px)' }">
      <view v-if="filteredMembers.length > 0">
        <view v-for="member in filteredMembers" :key="member.id" class="member-row">
          <view class="member-avatar" @click="goPage('/pages/user/user/index')">
            <text>{{ member.name[0] }}</text>
          </view>
          <view class="member-info">
            <view class="member-name-row">
              <text class="member-name" @click="goPage('/pages/user/user/index')">{{ member.name }}</text>
              <text v-if="member.isVerified" class="member-verified">V</text>
              <text v-if="member.role !== 'member'" class="member-role-badge" :style="{ backgroundColor: getRoleBg(member.role), color: getRoleColor(member.role) }">
                {{ getRoleIcon(member.role) }} {{ getRoleLabel(member.role) }}
              </text>
            </view>
            <view class="member-sub-info">
              <text class="member-no">#{{ member.memberNo }}</text>
              <text class="member-dot">·</text>
              <text class="member-join">{{ member.joinTime }} 加入</text>
            </view>
            <text v-if="member.intro" class="member-intro">{{ member.intro }}</text>
          </view>
          <view class="member-right">
            <text class="member-active">{{ member.lastActive }}</text>
            <text v-if="isAdmin && member.role !== 'owner'" class="member-manage" @click="handleManage(member)">⋯</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">
        <text class="empty-icon">👥</text>
        <text class="empty-text">未找到相关成员</text>
        <text class="empty-sub">试试其他搜索条件</text>
      </view>
    </scroll-view>

    <!-- 管理弹窗 -->
    <view v-if="showManageModal && selectedMember" class="modal-mask" @click="showManageModal = false" />
    <view v-if="showManageModal && selectedMember" class="modal-sheet">
      <view class="modal-handle" />
      <view class="modal-member-info">
        <view class="mm-avatar"><text>{{ selectedMember.name[0] }}</text></view>
        <view>
          <text class="mm-name">{{ selectedMember.name }}</text>
          <text class="mm-no">#{{ selectedMember.memberNo }}</text>
        </view>
      </view>
      <!-- 修改角色 -->
      <view class="modal-section">
        <text class="modal-section-label">修改角色</text>
        <view class="role-grid">
          <view v-for="role in editableRoles" :key="role.id"
            class="role-grid-item" :class="{ active: selectedMember.role === role.id }"
            @click="handleChangeRole(role.id)"
          >
            <text>{{ role.label }}</text>
          </view>
        </view>
      </view>
      <!-- 移出圈子 -->
      <view class="modal-section">
        <view class="danger-btn" @click="handleRemove">
          <text>🚫 移出圈子</text>
        </view>
      </view>
      <view class="modal-cancel" @click="showManageModal = false">
        <text>取消</text>
      </view>
    </view>

    <!-- 确认弹窗 -->
    <view v-if="showConfirmModal && selectedMember" class="modal-mask" @click="showConfirmModal = false" />
    <view v-if="showConfirmModal && selectedMember" class="confirm-modal">
      <view class="confirm-icon-wrap" :style="{ backgroundColor: confirmAction === 'remove' ? 'rgba(239,68,68,0.1)' : 'rgba(196,30,58,0.1)' }">
        <text class="confirm-icon">{{ confirmAction === 'remove' ? '🚫' : '👤' }}</text>
      </view>
      <text class="confirm-title">{{ confirmAction === 'remove' ? '确认移出成员?' : '确认修改角色?' }}</text>
      <text class="confirm-desc">
        {{ confirmAction === 'remove' ? `将 ${selectedMember.name} 移出圈子后，其发布的内容将保留，但无法再访问圈子内容。` : `将 ${selectedMember.name} 的角色修改为「${getRoleLabel(newRole)}」` }}
      </text>
      <view class="confirm-btns">
        <view class="confirm-btn cancel" @click="showConfirmModal = false"><text>取消</text></view>
        <view class="confirm-btn ok" :class="{ danger: confirmAction === 'remove' }" @click="confirmActionHandler"><text>确认</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const searchQuery = ref('')
const selectedRole = ref('all')
const sortBy = ref<'time' | 'active'>('time')
const showSortMenu = ref(false)
const showManageModal = ref(false)
const showConfirmModal = ref(false)
const selectedMember = ref<any>(null)
const confirmAction = ref<'remove' | 'changeRole' | null>(null)
const newRole = ref('')
const isAdmin = ref(true)

const roles = [
  { id: 'all', label: '全部', count: 1280 },
  { id: 'owner', label: '圈主', count: 1 },
  { id: 'partner', label: '合伙人', count: 3 },
  { id: 'admin', label: '管理员', count: 5 },
  { id: 'guest', label: '嘉宾', count: 12 },
  { id: 'volunteer', label: '志愿者', count: 8 },
]

const editableRoles = roles.filter(r => r.id !== 'all' && r.id !== 'owner')

const membersData = [
  { id: 1, name: '周易大师', memberNo: '001', role: 'owner', joinTime: '2024-01-15', lastActive: '刚刚', isVerified: true, intro: '八字命理资深讲师' },
  { id: 2, name: '张玄风', memberNo: '002', role: 'partner', joinTime: '2024-01-20', lastActive: '3小时前', isVerified: true, intro: '紫微斗数传承人' },
  { id: 3, name: '陈风水', memberNo: '003', role: 'partner', joinTime: '2024-02-01', lastActive: '昨天', isVerified: true, intro: '风水堪舆专家' },
  { id: 4, name: '李易安', memberNo: '008', role: 'admin', joinTime: '2024-02-15', lastActive: '2小时前', isVerified: false, intro: '国学传播者' },
  { id: 5, name: '王命理', memberNo: '015', role: 'admin', joinTime: '2024-03-01', lastActive: '5分钟前', isVerified: false, intro: '八字爱好者' },
  { id: 6, name: '赵星辰', memberNo: '023', role: 'guest', joinTime: '2024-03-10', lastActive: '1天前', isVerified: true, intro: '知名命理博主' },
  { id: 7, name: '孙紫微', memberNo: '056', role: 'volunteer', joinTime: '2024-04-01', lastActive: '3天前', isVerified: false, intro: '热心圈友' },
  { id: 8, name: '刘八字', memberNo: '128', role: 'member', joinTime: '2024-05-15', lastActive: '1周前', isVerified: false, intro: '命理学习中' },
  { id: 9, name: '杨天干', memberNo: '256', role: 'member', joinTime: '2024-06-01', lastActive: '2天前', isVerified: false, intro: '新手入门' },
  { id: 10, name: '吴地支', memberNo: '512', role: 'member', joinTime: '2024-06-20', lastActive: '刚刚', isVerified: false, intro: '' },
]

const filteredMembers = computed(() => {
  let list = membersData
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(m => m.name.toLowerCase().includes(q) || m.memberNo.includes(q))
  }
  if (selectedRole.value !== 'all') list = list.filter(m => m.role === selectedRole.value)
  if (sortBy.value === 'time') {
    list = [...list].sort((a, b) => new Date(b.joinTime).getTime() - new Date(a.joinTime).getTime())
  } else {
    const activeOrder = ['刚刚', '5分钟前', '2小时前', '3小时前', '昨天', '1天前', '2天前', '3天前', '1周前']
    list = [...list].sort((a, b) => activeOrder.indexOf(a.lastActive) - activeOrder.indexOf(b.lastActive))
  }
  return list
})

function getRoleLabel(role: string) {
  const m: Record<string, string> = { owner: '圈主', partner: '合伙人', admin: '管理员', guest: '嘉宾', volunteer: '志愿者' }
  return m[role] || '成员'
}
function getRoleColor(role: string) {
  const m: Record<string, string> = { owner: '#C9A96E', partner: '#a855f7', admin: '#3b82f6', guest: '#22c55e', volunteer: '#f97316' }
  return m[role] || '#999'
}
function getRoleBg(role: string) {
  const m: Record<string, string> = { owner: 'rgba(201,169,110,0.15)', partner: 'rgba(168,85,247,0.1)', admin: 'rgba(59,130,246,0.1)', guest: 'rgba(34,197,94,0.1)', volunteer: 'rgba(249,115,22,0.1)' }
  return m[role] || '#F5F1EB'
}
function getRoleIcon(role: string) {
  const m: Record<string, string> = { owner: '⭐', partner: '🏅', admin: '🛡️', guest: '❤️' }
  return m[role] || ''
}

function handleManage(member: any) { selectedMember.value = member; showManageModal.value = true }
function handleChangeRole(role: string) { newRole.value = role; confirmAction.value = 'changeRole'; showManageModal.value = false; showConfirmModal.value = true }
function handleRemove() { confirmAction.value = 'remove'; showManageModal.value = false; showConfirmModal.value = true }
function confirmActionHandler() { showConfirmModal.value = false; selectedMember.value = null; confirmAction.value = null; newRole.value = '' }

function goBack() { uni.navigateBack() }
function goPage(url: string) { uni.navigateTo({ url }) }

onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }
.nav-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24rpx; height: 56px; background: rgba(250,248,245,0.95);
  backdrop-filter: blur(10px); border-bottom: 1px solid #E8E0D5;
  position: sticky; top: 0; z-index: 40;
}
.nav-left { display: flex; align-items: center; gap: 12rpx; }
.nav-back-icon { font-size: 36rpx; color: #2C2C2C; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }

.search-bar { padding: 16rpx 24rpx; background: #FAF8F5; position: sticky; top: 56px; z-index: 30; }
.search-input-wrap { position: relative; display: flex; align-items: center; background: #F5F1EB; border-radius: 40rpx; padding: 0 20rpx; }
.search-icon { font-size: 28rpx; margin-right: 12rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 26rpx; color: #2C2C2C; background: transparent; }
.search-clear { font-size: 24rpx; color: #999; padding: 12rpx; }

.role-scroll { white-space: nowrap; padding: 8rpx 24rpx; background: #FAF8F5; position: sticky; top: 100px; z-index: 30; border-bottom: 1px solid #E8E0D5; }
.role-chip { display: inline-block; padding: 10rpx 24rpx; border-radius: 40rpx; background: #F5F1EB; font-size: 22rpx; color: #999; margin-right: 12rpx; }
.role-chip.active { background: #C41E3A; color: #FFFFFF; }

.sort-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 24rpx; border-bottom: 1px solid #E8E0D5; }
.sort-count { font-size: 22rpx; color: #999; }
.sort-toggle { display: flex; align-items: center; gap: 4rpx; font-size: 22rpx; color: #999; }
.sort-arrow { font-size: 18rpx; }
.sort-menu { background: #FFFFFF; border-radius: 16rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.08); position: absolute; right: 24rpx; z-index: 35; overflow: hidden; }
.sort-menu-item { padding: 16rpx 32rpx; font-size: 24rpx; color: #999; }
.sort-menu-item.active { color: #C41E3A; }

.member-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; border-bottom: 1px solid #F5F1EB; background: #FFFFFF; }
.member-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 30rpx; color: #2C2C2C; flex-shrink: 0; }
.member-info { flex: 1; min-width: 0; }
.member-name-row { display: flex; align-items: center; gap: 6rpx; flex-wrap: wrap; }
.member-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.member-verified { font-size: 18rpx; background: rgba(201,169,110,0.2); color: #C9A96E; padding: 2rpx 8rpx; border-radius: 4rpx; }
.member-role-badge { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.member-sub-info { display: flex; align-items: center; gap: 8rpx; margin-top: 4rpx; }
.member-no { font-size: 22rpx; color: #999; }
.member-dot { font-size: 18rpx; color: #E8E0D5; }
.member-join { font-size: 22rpx; color: #ccc; }
.member-intro { font-size: 22rpx; color: #ccc; margin-top: 2rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.member-right { text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 4rpx; }
.member-active { font-size: 20rpx; color: #ccc; }
.member-manage { font-size: 32rpx; color: #999; padding: 8rpx; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 72rpx; opacity: 0.3; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; color: #999; }
.empty-sub { font-size: 22rpx; color: #ccc; margin-top: 8rpx; }

.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; }
.modal-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: #FFFFFF; border-radius: 32rpx 32rpx 0 0; z-index: 101; padding: 24rpx; }
.modal-handle { width: 64rpx; height: 8rpx; background: #E8E0D5; border-radius: 4rpx; margin: 0 auto 24rpx; }
.modal-member-info { display: flex; align-items: center; gap: 16rpx; padding-bottom: 24rpx; border-bottom: 1px solid #E8E0D5; margin-bottom: 24rpx; }
.mm-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #2C2C2C; }
.mm-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; display: block; }
.mm-no { font-size: 22rpx; color: #999; }
.modal-section { margin-bottom: 24rpx; }
.modal-section-label { font-size: 22rpx; color: #999; margin-bottom: 16rpx; display: block; }
.role-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12rpx; }
.role-grid-item { padding: 16rpx; background: #F5F1EB; border-radius: 16rpx; text-align: center; font-size: 24rpx; color: #999; }
.role-grid-item.active { background: #C41E3A; color: #FFFFFF; }
.danger-btn { padding: 24rpx; background: rgba(239,68,68,0.1); color: #ef4444; border-radius: 20rpx; text-align: center; font-size: 26rpx; font-weight: 500; }
.modal-cancel { padding: 24rpx; background: #F5F1EB; border-radius: 20rpx; text-align: center; font-size: 26rpx; color: #2C2C2C; }

.confirm-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #FFFFFF; border-radius: 32rpx; padding: 40rpx; width: 600rpx; z-index: 102; text-align: center; }
.confirm-icon-wrap { width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20rpx; }
.confirm-icon { font-size: 44rpx; }
.confirm-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.confirm-desc { font-size: 24rpx; color: #999; line-height: 1.5; margin-bottom: 28rpx; display: block; }
.confirm-btns { display: flex; gap: 16rpx; }
.confirm-btn { flex: 1; padding: 22rpx; border-radius: 20rpx; font-size: 28rpx; font-weight: 500; text-align: center; }
.confirm-btn.cancel { background: #F5F1EB; color: #2C2C2C; }
.confirm-btn.ok { background: #C41E3A; color: #FFFFFF; }
.confirm-btn.danger { background: #ef4444; }
</style>
