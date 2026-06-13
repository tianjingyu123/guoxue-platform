<template>
  <view class="min-h-screen bg-background max-w-lg mx-auto">
    <!-- Top nav -->
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border" style="padding-top:44px">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="font-semibold text-base text-foreground">圈子成员</text>
        <view class="w-9" />
      </view>
    </view>

    <!-- Search -->
    <view class="sticky top-[92px] z-30 bg-background px-4 py-3 border-b border-border">
      <view class="relative">
        <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
        <input type="text" placeholder="搜索成员昵称或编号" v-model="searchQuery" class="w-full h-10 pl-10 pr-4 bg-[#F0EDE8] rounded-full text-sm text-foreground" />
        <view v-if="searchQuery" class="absolute right-3 top-1/2 -translate-y-1/2" @click="searchQuery = ''">
          <text class="text-muted-foreground text-sm">✕</text>
        </view>
      </view>
    </view>

    <!-- Role filter -->
    <view class="sticky top-[144px] z-30 bg-background border-b border-border">
      <view class="flex items-center gap-2 px-4 py-2 overflow-x-auto" style="scrollbar-width:none">
        <view v-for="role in roles" :key="role.id" class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium" :class="selectedRole === role.id ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground'" @click="selectedRole = role.id">
          <text>{{ role.label }}</text>
          <text class="ml-1 opacity-70">{{ role.count }}</text>
        </view>
      </view>
    </view>

    <!-- Sort -->
    <view class="flex items-center justify-between px-4 py-2 border-b border-border">
      <text class="text-xs text-muted-foreground">共 {{ filteredMembers.length }} 位成员</text>
      <view class="relative">
        <view class="flex items-center gap-1 text-xs text-muted-foreground" @click="showSortMenu = !showSortMenu">
          <text>{{ sortBy === 'time' ? '按加入时间' : '按活跃度' }}</text>
          <text class="text-sm" :class="showSortMenu ? 'rotate-180' : ''">↓</text>
        </view>
        <view v-if="showSortMenu">
          <view class="fixed inset-0 z-40" @click="showSortMenu = false" />
          <view class="absolute right-0 top-6 z-50 w-28 bg-white rounded-lg shadow-lg border border-border overflow-hidden">
            <view class="w-full px-3 py-2 text-xs" :class="sortBy === 'time' ? 'text-primary' : 'text-foreground'" @click="sortBy = 'time'; showSortMenu = false">按加入时间</view>
            <view class="w-full px-3 py-2 text-xs" :class="sortBy === 'active' ? 'text-primary' : 'text-foreground'" @click="sortBy = 'active'; showSortMenu = false">按活跃度</view>
          </view>
        </view>
      </view>
    </view>

    <!-- Member list -->
    <view class="divide-y divide-border">
      <template v-if="filteredMembers.length > 0">
        <view v-for="member in filteredMembers" :key="member.id" class="flex items-center gap-3 px-4 py-3">
          <view class="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white font-bold flex-shrink-0" @click="goUser(member.id)">
            <text>{{ member.name[0] }}</text>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-1.5 flex-wrap">
              <text class="font-medium text-sm text-foreground" @click="goUser(member.id)">{{ member.name }}</text>
              <text v-if="member.isVerified" class="text-[10px] px-1 py-0 bg-accent/20 text-accent rounded">V</text>
              <text v-if="member.role !== 'member'" class="text-[10px] px-1.5 py-0 rounded flex items-center gap-0.5" :class="getRoleClass(member.role)">
                {{ getRoleIcon(member.role) }}{{ getRoleConfig(member.role).label }}
              </text>
            </view>
            <view class="flex items-center gap-2 mt-0.5">
              <text class="text-xs text-muted-foreground">#{{ member.memberNo }}</text>
              <text class="text-[10px] text-muted-foreground/60">·</text>
              <text class="text-xs text-muted-foreground/70">{{ member.joinTime }} 加入</text>
            </view>
            <text v-if="member.intro" class="text-xs text-muted-foreground/70 block mt-0.5 line-clamp-1">{{ member.intro }}</text>
          </view>
          <view class="flex items-center gap-2 flex-shrink-0">
            <text class="text-[10px] text-muted-foreground/60">{{ member.lastActive }}</text>
            <view v-if="isAdmin && member.role !== 'owner'" class="p-1.5 rounded-full" @click="handleManage(member)">
              <text class="text-muted-foreground text-sm">⋯</text>
            </view>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="flex flex-col items-center justify-center py-16">
          <view class="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center mb-3">
            <text class="text-2xl text-muted-foreground"></text>
          </view>
          <text class="text-sm text-muted-foreground">未找到相关成员</text>
          <text class="text-xs text-muted-foreground/70 mt-1">试试其他搜索条件</text>
        </view>
      </template>
    </view>

    <!-- Manage modal -->
    <view v-if="showManageModal && selectedMember">
      <view class="fixed inset-0 z-50 bg-black/60" @click="showManageModal = false" />
      <view class="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl" style="padding-bottom:34px">
        <view class="flex items-center gap-3 p-4 border-b border-border">
          <view class="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white font-bold">
            <text>{{ selectedMember.name[0] }}</text>
          </view>
          <view>
            <text class="font-medium text-foreground block">{{ selectedMember.name }}</text>
            <text class="text-xs text-muted-foreground">#{{ selectedMember.memberNo }}</text>
          </view>
        </view>
        <view class="p-4 border-b border-border">
          <text class="text-xs text-muted-foreground block mb-3">修改角色</text>
          <view class="grid grid-cols-3 gap-2">
            <view v-for="r in manageRoles" :key="r.id" class="px-3 py-2 rounded-lg text-xs font-medium text-center" :class="selectedMember.role === r.id ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground'" @click="handleChangeRole(r.id)">
              <text>{{ r.label }}</text>
            </view>
            <view class="px-3 py-2 rounded-lg text-xs font-medium text-center" :class="selectedMember.role === 'member' ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground'" @click="handleChangeRole('member')">
              <text>普通成员</text>
            </view>
          </view>
        </view>
        <view class="p-4">
          <view class="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium" @click="handleRemove">
            <text class="text-base"></text>
            <text>移出圈子</text>
          </view>
        </view>
        <view class="px-4 pt-0">
          <view class="w-full py-3 bg-[#F0EDE8] text-foreground rounded-xl text-sm font-medium text-center" @click="showManageModal = false">
            <text>取消</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Confirm modal -->
    <view v-if="showConfirmModal && selectedMember">
      <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <view class="w-full max-w-sm bg-white rounded-2xl p-5">
          <view class="text-center mb-4">
            <view class="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" :class="confirmAction === 'remove' ? 'bg-red-500/10' : 'bg-primary/10'">
              <text :class="confirmAction === 'remove' ? 'text-red-500' : 'text-primary'" class="text-xl">{{ confirmAction === 'remove' ? '' : '' }}</text>
            </view>
            <text class="font-semibold text-foreground block">{{ confirmAction === 'remove' ? '确认移出成员?' : '确认修改角色?' }}</text>
            <text class="text-sm text-muted-foreground block mt-2">
              {{ confirmAction === 'remove' ? `将 ${selectedMember.name} 移出圈子后，其发布的内容将保留，但无法再访问圈子内容。` : `将 ${selectedMember.name} 的角色修改为「${getRoleConfig(newRole).label}」` }}
            </text>
          </view>
          <view class="flex gap-3">
            <view class="flex-1 py-2.5 bg-[#F0EDE8] text-foreground rounded-xl text-sm font-medium text-center" @click="showConfirmModal = false; selectedMember = null">
              <text>取消</text>
            </view>
            <view class="flex-1 py-2.5 rounded-xl text-sm font-medium text-center text-white" :class="confirmAction === 'remove' ? 'bg-red-500' : 'bg-primary'" @click="confirmActionHandler">
              <text>确认</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const roles = [
  { id: 'all', label: '全部', count: 1280 },
  { id: 'owner', label: '圈主', count: 1, color: 'bg-accent text-foreground' },
  { id: 'partner', label: '合伙人', count: 3, color: 'bg-purple-500/20 text-purple-400' },
  { id: 'admin', label: '管理员', count: 5, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'guest', label: '嘉宾', count: 12, color: 'bg-green-500/20 text-green-400' },
  { id: 'volunteer', label: '志愿者', count: 8, color: 'bg-orange-500/20 text-orange-400' },
]

const membersData = [
  { id: 1, name: '周易大师', avatar: '', memberNo: '001', role: 'owner', joinTime: '2024-01-15', lastActive: '刚刚', isVerified: true, intro: '八字命理资深讲师' },
  { id: 2, name: '张玄风', avatar: '', memberNo: '002', role: 'partner', joinTime: '2024-01-20', lastActive: '3小时前', isVerified: true, intro: '紫微斗数传承人' },
  { id: 3, name: '陈风水', avatar: '', memberNo: '003', role: 'partner', joinTime: '2024-02-01', lastActive: '昨天', isVerified: true, intro: '风水堪舆专家' },
  { id: 4, name: '李易安', avatar: '', memberNo: '008', role: 'admin', joinTime: '2024-02-15', lastActive: '2小时前', isVerified: false, intro: '国学传播者' },
  { id: 5, name: '王命理', avatar: '', memberNo: '015', role: 'admin', joinTime: '2024-03-01', lastActive: '5分钟前', isVerified: false, intro: '八字爱好者' },
  { id: 6, name: '赵星辰', avatar: '', memberNo: '023', role: 'guest', joinTime: '2024-03-10', lastActive: '1天前', isVerified: true, intro: '知名命理博主' },
  { id: 7, name: '孙紫微', avatar: '', memberNo: '056', role: 'volunteer', joinTime: '2024-04-01', lastActive: '3天前', isVerified: false, intro: '热心圈友' },
  { id: 8, name: '刘八字', avatar: '', memberNo: '128', role: 'member', joinTime: '2024-05-15', lastActive: '1周前', isVerified: false, intro: '命理学习中' },
  { id: 9, name: '杨天干', avatar: '', memberNo: '256', role: 'member', joinTime: '2024-06-01', lastActive: '2天前', isVerified: false, intro: '新手入门' },
  { id: 10, name: '吴地支', avatar: '', memberNo: '512', role: 'member', joinTime: '2024-06-20', lastActive: '刚刚', isVerified: false, intro: '' },
]

const manageRoles = roles.filter(r => r.id !== 'all' && r.id !== 'owner')
const isAdmin = true

const searchQuery = ref('')
const selectedRole = ref('all')
const sortBy = ref<'time' | 'active'>('time')
const showSortMenu = ref(false)
const showManageModal = ref(false)
const selectedMember = ref<any>(null)
const showConfirmModal = ref(false)
const confirmAction = ref<'remove' | 'changeRole' | null>(null)
const newRole = ref('')

const filteredMembers = computed(() => {
  return membersData
    .filter(m => {
      const matchSearch = m.name.includes(searchQuery.value) || m.memberNo.includes(searchQuery.value)
      const matchRole = selectedRole.value === 'all' || m.role === selectedRole.value
      return matchSearch && matchRole
    })
    .sort((a, b) => {
      if (sortBy.value === 'time') {
        return new Date(b.joinTime).getTime() - new Date(a.joinTime).getTime()
      }
      const activeOrder = ['刚刚', '5分钟前', '2小时前', '3小时前', '昨天', '1天前', '2天前', '3天前', '1周前']
      return activeOrder.indexOf(a.lastActive) - activeOrder.indexOf(b.lastActive)
    })
})

function getRoleConfig(role: string) {
  return roles.find(r => r.id === role) || { label: '成员', color: 'bg-[#F0EDE8] text-muted-foreground' }
}

function getRoleClass(role: string) {
  switch (role) {
    case 'owner': return 'bg-accent/10 text-accent'
    case 'partner': return 'bg-purple-500/10 text-purple-500'
    case 'admin': return 'bg-blue-500/10 text-blue-500'
    case 'guest': return 'bg-green-500/10 text-green-500'
    case 'volunteer': return 'bg-orange-500/10 text-orange-500'
    default: return 'bg-[#F0EDE8] text-muted-foreground'
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner': return '👑'
    case 'partner': return '🏅'
    case 'admin': return '🛡'
    case 'guest': return ''
    default: return ''
  }
}

function goBack() { uni.navigateBack() }
function goUser(id: number) { uni.navigateTo({ url: `/pages/user/profile/index?id=${id}` }) }

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
  uni.showToast({ title: '操作成功', icon: 'success' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
