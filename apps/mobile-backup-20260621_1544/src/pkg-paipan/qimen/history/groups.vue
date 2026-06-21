<script setup lang="ts">
/** 奇门分组管理页——从原型 app/paipan/qimen/history/groups/page.tsx 1:1 迁移，已接入后端 API */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { groupApi, type GroupItem } from '@/lib/paipan-groups'

const PAI_TYPE = 'QIMEN'
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
  try { groups.value = await groupApi.list(PAI_TYPE) }
  catch (e: any) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(fetchGroups)

function editGroup(g: GroupItem) {
  editingGroup.value = g
  newGroupName.value = g.name
}
async function saveEdit() {
  if (!editingGroup.value || !newGroupName.value.trim() || submitting.value) return
  if (newGroupName.value.trim() === editingGroup.value.name) { editingGroup.value = null; newGroupName.value = ''; return }
  submitting.value = true
  try {
    await groupApi.rename(PAI_TYPE, editingGroup.value.name, newGroupName.value.trim())
    await fetchGroups()
    editingGroup.value = null; newGroupName.value = ''
  } catch (e: any) { uni.showToast({ title: e?.message || '重命名失败', icon: 'none' }) }
  finally { submitting.value = false }
}
async function deleteGroup() {
  if (!editingGroup.value || submitting.value) return
  submitting.value = true
  try {
    await groupApi.delete(PAI_TYPE, editingGroup.value.name)
    await fetchGroups()
    editingGroup.value = null; newGroupName.value = ''
  } catch (e: any) { uni.showToast({ title: e?.message || '删除失败', icon: 'none' }) }
  finally { submitting.value = false }
}
async function addGroup() {
  if (!newGroupName.value.trim() || submitting.value) return
  submitting.value = true
  try {
    await groupApi.create(PAI_TYPE, newGroupName.value.trim())
    await fetchGroups()
    newGroupName.value = ''; isAdding.value = false
  } catch (e: any) { uni.showToast({ title: e?.message || '添加失败', icon: 'none' }) }
  finally { submitting.value = false }
}
function cancelEdit() { editingGroup.value = null; newGroupName.value = '' }
function cancelAdd() { isAdding.value = false; newGroupName.value = '' }
</script>

<template>
  <!-- 编辑分组视图 -->
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
          :size="40"
          color="#ffffff"
        />
      </view>
      <text class="topbar-title">
        编辑分组
      </text>
      <view class="topbar-spacer" />
    </view>
    <view class="form">
      <input
        v-model="newGroupName"
        class="form-input"
        placeholder="分组名称"
      >
    </view>
    <view class="edit-actions">
      <view
        class="del-btn"
        @tap="deleteGroup"
      >
        <app-icon
          name="trash-2"
          :size="34"
          color="var(--text-soft)"
        />
        <text class="del-btn-t">
          删除分组
        </text>
      </view>
      <view
        class="done-btn"
        :class="{ disabled: !newGroupName.trim() || submitting }"
        @tap="saveEdit"
      >
        <text class="done-btn-t">
          {{ submitting ? '保存中...' : '完成' }}
        </text>
      </view>
    </view>
  </view>

  <!-- 添加分组视图 -->
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
          :size="40"
          color="#ffffff"
        />
      </view>
      <text class="topbar-title">
        添加分组
      </text>
      <view class="topbar-spacer" />
    </view>
    <view class="form">
      <input
        v-model="newGroupName"
        class="form-input"
        placeholder="输入分组名称"
        focus
      >
    </view>
    <view class="add-foot">
      <view
        class="done-btn full"
        :class="{ disabled: !newGroupName.trim() || submitting }"
        @tap="addGroup"
      >
        <text class="done-btn-t">
          {{ submitting ? '添加中...' : '确定' }}
        </text>
      </view>
    </view>
  </view>

  <!-- 分组列表视图 -->
  <view
    v-else
    class="page"
  >
    <view class="topbar">
      <view
        class="topbar-back"
        @tap="navigateTo('/paipan/qimen/history')"
      >
        <app-icon
          name="chevron-left"
          :size="40"
          color="#ffffff"
        />
      </view>
      <text class="topbar-title">
        全部分组
      </text>
      <view class="topbar-spacer" />
    </view>
    <view class="count-bar">
      <text class="count-t">
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

    <!-- 列表 -->
    <scroll-view
      v-else
      scroll-y
      class="glist"
    >
      <view
        v-for="g in groups"
        :key="g.id"
        class="grow"
        @tap="editGroup(g)"
      >
        <text class="grow-name">
          {{ g.name }}
        </text>
        <text class="grow-count">
          （{{ g.count }}）
        </text>
      </view>
    </scroll-view>

    <view class="add-foot">
      <view
        class="done-btn full"
        @tap="isAdding = true"
      >
        <text class="done-btn-t">
          添加
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--card); display: flex; flex-direction: column; }

.topbar { background: var(--brand); display: flex; align-items: center; padding: 20rpx 24rpx; padding-top: calc(20rpx + var(--status-bar-height, 0)); }
.topbar-back { padding: 4rpx; margin-left: -4rpx; }
.topbar-title { flex: 1; text-align: center; font-size: 30rpx; font-weight: 500; color: #fff; padding-right: 48rpx; }
.topbar-spacer { width: 0; }

.form { flex: 1; padding: 32rpx; }
.form-input { width: 100%; box-sizing: border-box; padding: 24rpx 32rpx; background: rgba(0,0,0,0.04); border-radius: 20rpx; font-size: 30rpx; color: var(--text-ink); }

.edit-actions { padding: 32rpx; display: flex; gap: 24rpx; align-items: stretch; }
.del-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx; padding: 16rpx 32rpx; background: rgba(0,0,0,0.05); border-radius: 28rpx; }
.del-btn-t { font-size: 22rpx; color: var(--text-soft); }
.done-btn { flex: 1; padding: 24rpx 0; background: var(--brand); border-radius: 999rpx; text-align: center; display: flex; align-items: center; justify-content: center; }
.done-btn.full { width: 100%; }
.done-btn.disabled { opacity: 0.5; }
.done-btn-t { font-size: 30rpx; font-weight: 500; color: #fff; }

.loading-spinner { flex: 1; display: flex; align-items: center; justify-content: center; }
.loading-text { font-size: 28rpx; color: var(--text-soft); }
.error-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 26rpx; color: #fff; }

.add-foot { padding: 32rpx; }

.count-bar { padding: 20rpx 32rpx; border-bottom: 2rpx solid rgba(0,0,0,0.06); }
.count-t { font-size: 26rpx; color: var(--text-soft); }
.glist { flex: 1; }
.grow { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; border-bottom: 2rpx solid rgba(0,0,0,0.06); }
.grow-name { font-size: 30rpx; color: var(--text-ink); }
.grow-count { font-size: 28rpx; color: var(--text-soft); }
</style>
