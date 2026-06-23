<script setup lang="ts">
/**
 * 八字历史 · 分组编辑（从原型 app/paipan/bazi/history/groups/page.tsx 1:1 高保真迁移）
 * 三视图（按状态切换）：① 分组列表 ② 编辑分组(改名/删除) ③ 添加分组。顶栏为故宫红主题。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'

interface Group { id: number; name: string; count: number; isDefault?: boolean }

const groups = ref<Group[]>([
  { id: 0, name: '全部', count: 11, isDefault: true },
  { id: 1, name: '家人', count: 3 },
  { id: 2, name: '朋友', count: 5 },
  { id: 3, name: '客户', count: 3 },
])
const editingGroup = ref<Group | null>(null)
const newGroupName = ref('')
const isAdding = ref(false)

const totalGroups = computed(() => groups.value.filter((g) => !g.isDefault).length)

function handleEditGroup(group: Group) {
  if (group.isDefault) return
  editingGroup.value = group
  newGroupName.value = group.name
}
function handleSaveEdit() {
  if (!editingGroup.value || !newGroupName.value.trim()) return
  groups.value = groups.value.map((g) =>
    g.id === editingGroup.value!.id ? { ...g, name: newGroupName.value.trim() } : g,
  )
  editingGroup.value = null
  newGroupName.value = ''
}
function handleDeleteGroup() {
  if (!editingGroup.value) return
  groups.value = groups.value.filter((g) => g.id !== editingGroup.value!.id)
  editingGroup.value = null
  newGroupName.value = ''
}
function handleAddGroup() {
  if (!newGroupName.value.trim()) return
  const newId = Math.max(...groups.value.map((g) => g.id)) + 1
  groups.value = [...groups.value, { id: newId, name: newGroupName.value.trim(), count: 0 }]
  newGroupName.value = ''
  isAdding.value = false
}
function cancelEdit() {
  editingGroup.value = null
  newGroupName.value = ''
}
function cancelAdd() {
  isAdding.value = false
  newGroupName.value = ''
}
</script>

<template>
  <!-- ① 编辑分组视图 -->
  <view v-if="editingGroup" class="page">
    <view class="topbar">
      <view class="topbar-back" @tap="cancelEdit"><app-icon name="chevron-left" :size="44" color="#ffffff" /></view>
      <text class="topbar-title">编辑分组</text>
      <view class="topbar-spacer" />
    </view>
    <view class="body">
      <input v-model="newGroupName" class="name-input" placeholder="分组名称" placeholder-class="name-ph" />
    </view>
    <view class="foot foot-edit">
      <view class="del-btn" @tap="handleDeleteGroup">
        <app-icon name="trash-2" :size="36" color="#999999" />
        <text class="del-text">删除分组</text>
      </view>
      <view class="primary-btn" :class="{ 'btn-disabled': !newGroupName.trim() }" @tap="handleSaveEdit"><text class="primary-btn-text">完成</text></view>
    </view>
  </view>

  <!-- ② 添加分组视图 -->
  <view v-else-if="isAdding" class="page">
    <view class="topbar">
      <view class="topbar-back" @tap="cancelAdd"><app-icon name="chevron-left" :size="44" color="#ffffff" /></view>
      <text class="topbar-title">添加分组</text>
      <view class="topbar-spacer" />
    </view>
    <view class="body">
      <input v-model="newGroupName" class="name-input" placeholder="输入分组名称" placeholder-class="name-ph" focus />
    </view>
    <view class="foot">
      <view class="primary-btn primary-btn-full" :class="{ 'btn-disabled': !newGroupName.trim() }" @tap="handleAddGroup"><text class="primary-btn-text">确定</text></view>
    </view>
  </view>

  <!-- ③ 分组列表视图 -->
  <view v-else class="page">
    <view class="topbar">
      <view class="topbar-back" @tap="navigateBack()"><app-icon name="chevron-left" :size="44" color="#ffffff" /></view>
      <text class="topbar-title">全部分组</text>
      <view class="topbar-spacer" />
    </view>
    <view class="count-bar"><text class="count-text">所有分组（{{ totalGroups }}）</text></view>
    <view class="glist">
      <view v-for="group in groups" :key="group.id" class="gitem" :class="{ 'gitem-default': group.isDefault }" @tap="handleEditGroup(group)">
        <text class="gitem-name">{{ group.name }}</text>
        <text class="gitem-count">（{{ group.count }}）</text>
      </view>
    </view>
    <view class="foot">
      <view class="primary-btn primary-btn-full" @tap="isAdding = true"><text class="primary-btn-text">添加</text></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--card); display: flex; flex-direction: column; }
/* 顶栏（故宫红） */
.topbar { display: flex; align-items: center; background: var(--brand); padding: 16rpx 24rpx; padding-top: calc(16rpx + var(--status-bar-height, 0)); }
.topbar-back { padding: 4rpx; }
.topbar-title { flex: 1; text-align: center; font-size: 30rpx; font-weight: 500; color: #fff; padding-right: 48rpx; }
.topbar-spacer { width: 0; }
/* 主体 */
.body { flex: 1; padding: 24rpx; }
.name-input { width: 100%; padding: 24rpx 28rpx; background: #f9fafb; border-radius: 20rpx; font-size: 30rpx; color: var(--text-ink); }
.name-ph { color: var(--text-soft); }
/* 统计 */
.count-bar { padding: 20rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.count-text { font-size: 26rpx; color: #6b7280; }
/* 分组列表 */
.glist { flex: 1; }
.gitem { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-bottom: 2rpx solid #f3f4f6; }
.gitem-name { font-size: 30rpx; color: #1a1a1a; }
.gitem-count { font-size: 28rpx; color: #9ca3af; }
/* 底部 */
.foot { padding: 24rpx; }
.foot-edit { display: flex; gap: 20rpx; align-items: stretch; }
.del-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12rpx 28rpx; background: var(--secondary); border-radius: 24rpx; gap: 4rpx; }
.del-text { font-size: 22rpx; color: var(--text-soft); }
.primary-btn { padding: 24rpx 0; background: var(--brand); border-radius: 999rpx; text-align: center; }
.primary-btn-full { width: 100%; flex: 1; }
.primary-btn-text { font-size: 30rpx; font-weight: 500; color: #fff; }
.btn-disabled { opacity: 0.5; }
</style>
