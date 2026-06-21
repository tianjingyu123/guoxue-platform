<script setup lang="ts">
/**
 * 八字历史 · 分组编辑（从原型 app/paipan/bazi/history/groups/page.tsx 1:1 高保真迁移）
 * 已接入后端 API：GET/POST/PUT/DELETE /paipan/groups
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'
import { groupApi, type GroupItem } from '@/lib/paipan-groups'

const PAI_TYPE = 'BAZI'
const groups = ref<GroupItem[]>([])
const loading = ref(true)
const error = ref('')
const editingGroup = ref<GroupItem | null>(null)
const newGroupName = ref('')
const isAdding = ref(false)
const submitting = ref(false)

const totalGroups = computed(() => groups.value.length)

async function fetchGroups() {
  loading.value = true; error.value = ''
  try {
    groups.value = await groupApi.list(PAI_TYPE)
  } catch (e: any) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}

onMounted(fetchGroups)

function handleEditGroup(group: GroupItem) {
  editingGroup.value = group
  newGroupName.value = group.name
}

async function handleSaveEdit() {
  if (!editingGroup.value || !newGroupName.value.trim() || submitting.value) return
  if (newGroupName.value.trim() === editingGroup.value.name) { editingGroup.value = null; newGroupName.value = ''; return }
  submitting.value = true
  try {
    await groupApi.rename(PAI_TYPE, editingGroup.value.name, newGroupName.value.trim())
    await fetchGroups()
    editingGroup.value = null
    newGroupName.value = ''
  } catch (e: any) { uni.showToast({ title: e?.message || '重命名失败', icon: 'none' }) }
  finally { submitting.value = false }
}

async function handleDeleteGroup() {
  if (!editingGroup.value || submitting.value) return
  submitting.value = true
  try {
    await groupApi.delete(PAI_TYPE, editingGroup.value.name)
    await fetchGroups()
    editingGroup.value = null
    newGroupName.value = ''
  } catch (e: any) { uni.showToast({ title: e?.message || '删除失败', icon: 'none' }) }
  finally { submitting.value = false }
}

async function handleAddGroup() {
  if (!newGroupName.value.trim() || submitting.value) return
  submitting.value = true
  try {
    await groupApi.create(PAI_TYPE, newGroupName.value.trim())
    await fetchGroups()
    newGroupName.value = ''
    isAdding.value = false
  } catch (e: any) { uni.showToast({ title: e?.message || '添加失败', icon: 'none' }) }
  finally { submitting.value = false }
}

function cancelEdit() { editingGroup.value = null; newGroupName.value = '' }
function cancelAdd() { isAdding.value = false; newGroupName.value = '' }
</script>

<template>
  <!-- ① 编辑分组视图 -->
  <view
    v-if="editingGroup"
    class="page"
  >
    <view class="topbar">
      <view
        class="topbar-back"
        @tap="cancelEdit"
      >
        <app-icon
          name="chevron-left"
          :size="44"
          color="#ffffff"
        />
      </view>
      <text class="topbar-title">
        编辑分组
      </text>
      <view class="topbar-spacer" />
    </view>
    <view class="body">
      <input
        v-model="newGroupName"
        class="name-input"
        placeholder="分组名称"
        placeholder-class="name-ph"
      >
    </view>
    <view class="foot foot-edit">
      <view
        class="del-btn"
        @tap="handleDeleteGroup"
      >
        <app-icon
          name="trash-2"
          :size="36"
          color="#999999"
        />
        <text class="del-text">
          删除分组
        </text>
      </view>
      <view
        class="primary-btn"
        :class="{ 'btn-disabled': !newGroupName.trim() || submitting }"
        @tap="handleSaveEdit"
      >
        <text class="primary-btn-text">
          {{ submitting ? '保存中...' : '完成' }}
        </text>
      </view>
    </view>
  </view>

  <!-- ② 添加分组视图 -->
  <view
    v-else-if="isAdding"
    class="page"
  >
    <view class="topbar">
      <view
        class="topbar-back"
        @tap="cancelAdd"
      >
        <app-icon
          name="chevron-left"
          :size="44"
          color="#ffffff"
        />
      </view>
      <text class="topbar-title">
        添加分组
      </text>
      <view class="topbar-spacer" />
    </view>
    <view class="body">
      <input
        v-model="newGroupName"
        class="name-input"
        placeholder="输入分组名称"
        placeholder-class="name-ph"
        focus
      >
    </view>
    <view class="foot">
      <view
        class="primary-btn primary-btn-full"
        :class="{ 'btn-disabled': !newGroupName.trim() || submitting }"
        @tap="handleAddGroup"
      >
        <text class="primary-btn-text">
          {{ submitting ? '添加中...' : '确定' }}
        </text>
      </view>
    </view>
  </view>

  <!-- ③ 分组列表视图 -->
  <view
    v-else
    class="page"
  >
    <view class="topbar">
      <view
        class="topbar-back"
        @tap="navigateBack()"
      >
        <app-icon
          name="chevron-left"
          :size="44"
          color="#ffffff"
        />
      </view>
      <text class="topbar-title">
        全部分组
      </text>
      <view class="topbar-spacer" />
    </view>
    <view class="count-bar">
      <text class="count-text">
        所有分组（{{ totalGroups }}）
      </text>
    </view>

    <!-- loading -->
    <view
      v-if="loading"
      class="loading-spinner"
    >
      <text class="loading-text">
        加载中...
      </text>
    </view>

    <!-- error -->
    <view
      v-else-if="error"
      class="error-wrap"
    >
      <text class="error-text">
        {{ error }}
      </text>
      <view
        class="retry-btn"
        @tap="fetchGroups"
      >
        <text class="retry-text">
          重试
        </text>
      </view>
    </view>

    <!-- 分组列表 -->
    <view
      v-else
      class="glist"
    >
      <view
        v-for="group in groups"
        :key="group.id"
        class="gitem"
        @tap="handleEditGroup(group)"
      >
        <text class="gitem-name">
          {{ group.name }}
        </text>
        <text class="gitem-count">
          （{{ group.count }}）
        </text>
      </view>
    </view>

    <view class="foot">
      <view
        class="primary-btn primary-btn-full"
        @tap="isAdding = true"
      >
        <text class="primary-btn-text">
          添加
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--card); display: flex; flex-direction: column; }
.topbar { display: flex; align-items: center; background: var(--brand); padding: 16rpx 24rpx; padding-top: calc(16rpx + var(--status-bar-height, 0)); }
.topbar-back { padding: 4rpx; }
.topbar-title { flex: 1; text-align: center; font-size: 30rpx; font-weight: 500; color: #fff; padding-right: 48rpx; }
.topbar-spacer { width: 0; }
.body { flex: 1; padding: 24rpx; }
.name-input { width: 100%; padding: 24rpx 28rpx; background: #f9fafb; border-radius: 20rpx; font-size: 30rpx; color: var(--text-ink); }
.name-ph { color: var(--text-soft); }
.count-bar { padding: 20rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.count-text { font-size: 26rpx; color: #6b7280; }

.loading-spinner { flex: 1; display: flex; align-items: center; justify-content: center; }
.loading-text { font-size: 28rpx; color: var(--text-soft); }
.error-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 26rpx; color: #fff; }

.glist { flex: 1; }
.gitem { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-bottom: 2rpx solid #f3f4f6; }
.gitem-name { font-size: 30rpx; color: #1a1a1a; }
.gitem-count { font-size: 28rpx; color: #9ca3af; }
.foot { padding: 24rpx; }
.foot-edit { display: flex; gap: 20rpx; align-items: stretch; }
.del-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12rpx 28rpx; background: var(--secondary); border-radius: 24rpx; gap: 4rpx; }
.del-text { font-size: 22rpx; color: var(--text-soft); }
.primary-btn { padding: 24rpx 0; background: var(--brand); border-radius: 999rpx; text-align: center; }
.primary-btn-full { width: 100%; flex: 1; }
.primary-btn-text { font-size: 30rpx; font-weight: 500; color: #fff; }
.btn-disabled { opacity: 0.5; }
</style>
