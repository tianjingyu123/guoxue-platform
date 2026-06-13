<template>
  <view class="members-page">
    <!-- 顶部导航 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">圈子成员</text>
        <view class="header-spacer" />
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input v-model="searchQuery" class="search-input" placeholder="搜索成员昵称或编号" />
        <text v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</text>
      </view>
    </view>

    <!-- 角色筛选Tab -->
    <view class="role-tabs">
      <view v-for="role in roles" :key="role.id" class="role-tab" :class="{ active: selectedRole === role.id }" @click="selectedRole = role.id">
        <text>{{ role.label }} {{ role.count }}</text>
      </view>
    </view>

    <!-- 排序选项 -->
    <view class="sort-bar">
      <text class="sort-count">共 {{ filteredMembers.length }} 位成员</text>
      <view class="sort-dropdown" @click="showSortMenu = !showSortMenu">
        <text>{{ sortBy === 'time' ? '按加入时间' : '按活跃度' }}</text>
        <text class="sort-arrow" :class="{ open: showSortMenu }">⌄</text>
        <view v-if="showSortMenu" class="sort-menu">
          <view class="sm-overlay" @click.stop="showSortMenu = false" />
          <view class="sm-list">
            <text class="sm-item" :class="{ active: sortBy === 'time' }" @click.stop="sortBy = 'time'; showSortMenu = false">按加入时间</text>
            <text class="sm-item" :class="{ active: sortBy === 'active' }" @click.stop="sortBy = 'active'; showSortMenu = false">按活跃度</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 成员列表 -->
    <view class="member-list">
      <template v-if="filteredMembers.length">
        <view v-for="member in filteredMembers" :key="member.id" class="member-item">
          <view class="mi-avatar" @click="goPage('/pages/user/id-detail/index?id=' + member.id)">{{ member.name[0] }}</view>
          <view class="mi-info" @click="goPage('/pages/user/id-detail/index?id=' + member.id)">
            <view class="mi-name-row">
              <text class="mi-name">{{ member.name }}</text>
              <text v-if="member.isVerified" class="mi-verified">V</text>
              <text v-if="member.role !== 'member'" class="mi-role" :class="'role-' + member.role">{{ getRoleIcon(member.role) }} {{ getRoleLabel(member.role) }}</text>
            </view>
            <view class="mi-meta">
              <text class="mi-no">#{{ member.memberNo }}</text>
              <text class="mi-dot">·</text>
              <text class="mi-join">{{ member.joinTime }} 加入</text>
            </view>
            <text v-if="member.intro" class="mi-intro">{{ member.intro }}</text>
          </view>
          <view class="mi-right">
            <text class="mi-active">{{ member.lastActive }}</text>
            <text v-if="isAdmin && member.role !== 'owner'" class="mi-manage" @click="handleManage(member)">⋯</text>
          </view>
        </view>
      </template>
      <view v-else class="empty-state">
        <text class="empty-icon">👥</text>
        <text class="empty-text">未找到相关成员</text>
        <text class="empty-hint">试试其他搜索条件</text>
      </view>
    </view>

    <!-- 成员管理弹窗 -->
    <view v-if="showManageModal && selectedMember" class="modal-mask" @click="showManageModal = false">
      <view class="manage-panel" @click.stop>
        <view class="mp-header">
          <view class="mp-avatar">{{ selectedMember.name[0] }}</view>
          <view class="mp-info">
            <text class="mp-name">{{ selectedMember.name }}</text>
            <text class="mp-no">#{{ selectedMember.memberNo }}</text>
          </view>
        </view>
        <view class="mp-section">
          <text class="mp-label">修改角色</text>
          <view class="mp-role-grid">
            <text v-for="role in editableRoles" :key="role.id" class="mp-role-item" :class="{ active: selectedMember.role === role.id }" @click="handleChangeRole(role.id)">{{ role.label }}</text>
            <text class="mp-role-item" :class="{ active: selectedMember.role === 'member' }" @click="handleChangeRole('member')">普通成员</text>
          </view>
        </view>
        <view class="mp-section">
          <text class="mp-danger-btn" @click="handleRemove">👤➖ 移出圈子</text>
        </view>
        <text class="mp-cancel-btn" @click="showManageModal = false">取消</text>
      </view>
    </view>

    <!-- 确认弹窗 -->
    <view v-if="showConfirmModal && selectedMember" class="modal-mask" @click="showConfirmModal = false">
      <view class="confirm-panel" @click.stop>
        <view class="cp-icon" :class="confirmAction === 'remove' ? 'danger' : 'normal'">
          <text>{{ confirmAction === 'remove' ? '👤➖' : '👤⚙️' }}</text>
        </view>
        <text class="cp-title">{{ confirmAction === 'remove' ? '确认移出成员?' : '确认修改角色?' }}</text>
        <text class="cp-desc">
          {{ confirmAction === 'remove' ? '将 ' + selectedMember.name + ' 移出圈子后，其发布的内容将保留，但无法再访问圈子内容。' : '将 ' + selectedMember.name + ' 的角色修改为「' + getRoleLabel(newRole) + '」' }}
        </text>
        <view class="cp-btns">
          <text class="cp-btn cancel" @click="showConfirmModal = false; selectedMember = null">取消</text>
          <text class="cp-btn" :class="confirmAction === 'remove' ? 'danger' : 'confirm'" @click="confirmActionHandler">确认</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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

const editableRoles = [
  { id: 'partner', label: '合伙人' },
  { id: 'admin', label: '管理员' },
  { id: 'guest', label: '嘉宾' },
  { id: 'volunteer', label: '志愿者' },
]

const membersData = ref([
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
])

const filteredMembers = computed(() => {
  let members = membersData.value.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || m.memberNo.includes(searchQuery.value)
    const matchRole = selectedRole.value === 'all' || m.role === selectedRole.value
    return matchSearch && matchRole
  })
  if (sortBy.value === 'time') {
    members.sort((a, b) => new Date(b.joinTime).getTime() - new Date(a.joinTime).getTime())
  } else {
    const order = ['刚刚', '5分钟前', '2小时前', '3小时前', '昨天', '1天前', '2天前', '3天前', '1周前']
    members.sort((a, b) => order.indexOf(a.lastActive) - order.indexOf(b.lastActive))
  }
  return members
})

function getRoleLabel(role: string) {
  const config = roles.find(r => r.id === role)
  return config ? config.label : '成员'
}

function getRoleIcon(role: string) {
  const icons: Record<string, string> = { owner: '⭐', partner: '🏅', admin: '🛡️', guest: '❤️' }
  return icons[role] || ''
}

function handleManage(member: any) {
  selectedMember.value = member
  showManageModal.value = true
}

function handleChangeRole(role: string) {
  newRole.value = role
  confirmAction.value = 'changeRole'
  showManageModal.value = false
  showConfirmModal.value = true
}

function handleRemove() {
  confirmAction.value = 'remove'
  showManageModal.value = false
  showConfirmModal.value = true
}

function confirmActionHandler() {
  showConfirmModal.value = false
  selectedMember.value = null
  confirmAction.value = null
  newRole.value = ''
}

function goPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.members-page { min-height: 100vh; background: #FAF8F5; }

.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.search-bar { padding: 16rpx 24rpx; background: #fff; border-bottom: 1px solid #E8E0D5; }
.search-input-wrap { position: relative; }
.search-icon { position: absolute; left: 20rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; z-index: 1; }
.search-input { width: 100%; height: 72rpx; padding: 0 72rpx; border-radius: 36rpx; background: #F5F1EB; font-size: 26rpx; box-sizing: border-box; }
.search-clear { position: absolute; right: 20rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; color: #999; }

.role-tabs { display: flex; gap: 12rpx; padding: 16rpx 24rpx; background: #fff; border-bottom: 1px solid #E8E0D5; overflow-x: auto; }
.role-tabs::-webkit-scrollbar { display: none; }
.role-tab { flex-shrink: 0; padding: 10rpx 20rpx; border-radius: 32rpx; background: #F5F1EB; }
.role-tab text { font-size: 22rpx; color: #999; }
.role-tab.active { background: #C41E3A; }
.role-tab.active text { color: #fff; }

.sort-bar { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 24rpx; border-bottom: 1px solid #E8E0D5; }
.sort-count { font-size: 22rpx; color: #999; }
.sort-dropdown { position: relative; display: flex; align-items: center; gap: 4rpx; }
.sort-dropdown > text { font-size: 22rpx; color: #999; }
.sort-arrow { font-size: 20rpx; transition: transform 0.2s; }
.sort-arrow.open { transform: rotate(180deg); }
.sort-menu { position: absolute; right: 0; top: 40rpx; z-index: 40; }
.sm-overlay { position: fixed; inset: 0; z-index: 39; }
.sm-list { background: #fff; border-radius: 16rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1); overflow: hidden; position: relative; z-index: 40; width: 200rpx; }
.sm-item { display: block; padding: 18rpx 24rpx; font-size: 22rpx; color: #333; }
.sm-item.active { color: #C41E3A; }

.member-list { padding-bottom: 40rpx; }
.member-item { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 24rpx; border-bottom: 1px solid #F5F1EB; background: #fff; }
.mi-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #333; flex-shrink: 0; }
.mi-info { flex: 1; min-width: 0; }
.mi-name-row { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.mi-name { font-size: 26rpx; font-weight: 500; color: #333; }
.mi-verified { font-size: 18rpx; padding: 2rpx 6rpx; border-radius: 4rpx; background: rgba(201,169,110,0.2); color: #C9A96E; }
.mi-role { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 4rpx; }
.mi-role.role-owner { background: rgba(201,169,110,0.2); color: #C9A96E; }
.mi-role.role-partner { background: rgba(168,85,247,0.15); color: #A855F7; }
.mi-role.role-admin { background: rgba(59,130,246,0.15); color: #3B82F6; }
.mi-role.role-guest { background: rgba(34,197,94,0.15); color: #22C55E; }
.mi-role.role-volunteer { background: rgba(249,115,22,0.15); color: #F97316; }
.mi-meta { display: flex; align-items: center; gap: 8rpx; margin-top: 4rpx; }
.mi-no { font-size: 20rpx; color: #999; }
.mi-dot { font-size: 18rpx; color: #E8E0D5; }
.mi-join { font-size: 20rpx; color: #BBB; }
.mi-intro { font-size: 20rpx; color: #BBB; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.mi-right { display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.mi-active { font-size: 18rpx; color: #CCC; }
.mi-manage { font-size: 32rpx; color: #999; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 64rpx; }
.empty-text { font-size: 26rpx; color: #999; margin-top: 12rpx; }
.empty-hint { font-size: 22rpx; color: #BBB; margin-top: 6rpx; }

.modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; }
.manage-panel { width: 100%; max-width: 600rpx; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 24rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
.mp-header { display: flex; align-items: center; gap: 20rpx; margin-bottom: 24rpx; }
.mp-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #333; }
.mp-name { font-size: 28rpx; font-weight: 500; color: #333; display: block; }
.mp-no { font-size: 22rpx; color: #999; }
.mp-section { margin-bottom: 24rpx; }
.mp-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 12rpx; }
.mp-role-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12rpx; }
.mp-role-item { padding: 16rpx; border-radius: 12rpx; background: #F5F1EB; text-align: center; font-size: 22rpx; color: #666; }
.mp-role-item.active { background: #C41E3A; color: #fff; }
.mp-danger-btn { display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 22rpx; border-radius: 16rpx; background: rgba(196,30,58,0.08); color: #C41E3A; font-size: 26rpx; }
.mp-cancel-btn { display: block; padding: 22rpx; border-radius: 16rpx; background: #F5F1EB; text-align: center; font-size: 26rpx; color: #333; margin-top: 12rpx; }

.confirm-panel { width: 580rpx; background: #fff; border-radius: 24rpx; padding: 40rpx; text-align: center; margin: auto; }
.cp-icon { width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20rpx; font-size: 40rpx; }
.cp-icon.danger { background: rgba(196,30,58,0.08); }
.cp-icon.normal { background: rgba(196,30,58,0.08); }
.cp-title { font-size: 30rpx; font-weight: 600; color: #333; display: block; margin-bottom: 12rpx; }
.cp-desc { font-size: 24rpx; color: #999; display: block; margin-bottom: 28rpx; line-height: 1.5; }
.cp-btns { display: flex; gap: 20rpx; }
.cp-btn { flex: 1; padding: 22rpx; border-radius: 16rpx; font-size: 26rpx; text-align: center; }
.cp-btn.cancel { background: #F5F1EB; color: #333; }
.cp-btn.confirm { background: #C41E3A; color: #fff; }
.cp-btn.danger { background: #C41E3A; color: #fff; }
</style>
