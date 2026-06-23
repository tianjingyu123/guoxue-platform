<script setup lang="ts">
/** 阳盘命理奇门 · 分组管理（从原型 app/paipan/yangpan/history/groups/page.tsx 1:1 迁移） */
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

interface Group { id: string; name: string; count: number; color: string }

const groups = ref<Group[]>([
  { id: '1', name: '客户', count: 12, color: '#3b82f6' },
  { id: '2', name: '家人', count: 5, color: '#22c55e' },
  { id: '3', name: '朋友', count: 8, color: '#f97316' },
  { id: '4', name: '未分类', count: 3, color: '#6b7280' },
])

const showAddModal = ref(false)
const editingGroup = ref<string | null>(null)
const editingName = ref('')
const newGroupName = ref('')

function handleAddGroup() {
  if (newGroupName.value.trim()) {
    groups.value.push({ id: String(Date.now()), name: newGroupName.value.trim(), count: 0, color: '#a855f7' })
    newGroupName.value = ''
    showAddModal.value = false
  }
}
function handleDeleteGroup(id: string) {
  groups.value = groups.value.filter((g) => g.id !== id)
}
function startEdit(g: Group) {
  editingGroup.value = g.id
  editingName.value = g.name
}
function saveRename(id: string) {
  if (editingName.value.trim()) {
    groups.value = groups.value.map((g) => (g.id === id ? { ...g, name: editingName.value.trim() } : g))
  }
  editingGroup.value = null
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-inner">
        <view class="hdr-back" @tap="navigateTo('/paipan/yangpan/history')"><app-icon name="chevron-left" :size="40" color="var(--text-ink)" /></view>
        <text class="hdr-title">分组管理</text>
        <view class="hdr-add" @tap="showAddModal = true"><app-icon name="plus" :size="34" color="var(--brand)" /></view>
      </view>
    </view>

    <!-- 分组列表 -->
    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <view class="card">
          <view v-for="(g, i) in groups" :key="g.id" class="grp-row" :class="{ noborder: i === groups.length - 1 }">
            <view class="grp-left">
              <view class="grp-dot" :style="{ background: g.color }" />
              <input
                v-if="editingGroup === g.id"
                v-model="editingName"
                class="grp-edit"
                focus
                @blur="saveRename(g.id)"
                @confirm="saveRename(g.id)"
              />
              <text v-else class="grp-name">{{ g.name }}</text>
              <text class="grp-count">({{ g.count }})</text>
            </view>
            <view class="grp-actions">
              <view class="grp-btn" @tap="startEdit(g)"><app-icon name="pencil" :size="30" color="var(--text-soft)" /></view>
              <view v-if="g.name !== '未分类'" class="grp-btn" @tap="handleDeleteGroup(g.id)"><app-icon name="trash-2" :size="30" color="var(--text-soft)" /></view>
            </view>
          </view>
        </view>
        <text class="tip">删除分组后，该分组下的记录将移动到"未分类"</text>
      </view>
    </scroll-view>

    <!-- 添加分组弹窗 -->
    <view v-if="showAddModal" class="mask" @tap="showAddModal = false">
      <view class="modal" @tap.stop>
        <view class="modal-head">
          <text class="modal-title">添加分组</text>
          <view class="modal-close" @tap="showAddModal = false"><app-icon name="x" :size="34" color="var(--text-soft)" /></view>
        </view>
        <view class="modal-body">
          <input v-model="newGroupName" class="modal-input" placeholder="请输入分组名称" placeholder-class="modal-ph" focus />
        </view>
        <view class="modal-foot">
          <view class="modal-btn cancel" @tap="showAddModal = false"><text class="modal-btn-t">取消</text></view>
          <view class="modal-btn ok" @tap="handleAddGroup"><text class="modal-btn-t light">确定</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.hdr { position: sticky; top: 0; z-index: 20; background: var(--bg-paper); border-bottom: 2rpx solid var(--border); padding-top: var(--status-bar-height, 0); }
.hdr-inner { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; }
.hdr-back { padding: 8rpx; margin-left: -8rpx; }
.hdr-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.hdr-add { padding: 8rpx; margin-right: -8rpx; }

.body { flex: 1; }
.body-inner { padding: 24rpx; }
.card { background: var(--card); border-radius: 24rpx; border: 2rpx solid var(--border); overflow: hidden; }
.grp-row { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; border-bottom: 2rpx solid rgba(0,0,0,0.06); }
.grp-row.noborder { border-bottom: none; }
.grp-left { display: flex; align-items: center; gap: 20rpx; }
.grp-dot { width: 20rpx; height: 20rpx; border-radius: 999rpx; flex-shrink: 0; }
.grp-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
.grp-edit { font-size: 28rpx; color: var(--text-ink); background: var(--secondary, rgba(0,0,0,0.05)); border-radius: 8rpx; padding: 4rpx 16rpx; min-width: 200rpx; }
.grp-count { font-size: 22rpx; color: var(--text-soft); }
.grp-actions { display: flex; align-items: center; gap: 12rpx; }
.grp-btn { padding: 10rpx; }
.tip { display: block; text-align: center; font-size: 22rpx; color: var(--text-soft); margin-top: 32rpx; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 32rpx; }
.modal { background: var(--card); width: 100%; max-width: 600rpx; border-radius: 24rpx; overflow: hidden; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; border-bottom: 2rpx solid var(--border); }
.modal-title { font-size: 30rpx; font-weight: 500; color: var(--text-ink); }
.modal-close { padding: 4rpx; }
.modal-body { padding: 32rpx; }
.modal-input { width: 100%; box-sizing: border-box; padding: 22rpx 24rpx; background: var(--secondary, rgba(0,0,0,0.05)); border-radius: 16rpx; font-size: 28rpx; color: var(--text-ink); }
.modal-ph { color: var(--text-soft); }
.modal-foot { padding: 0 32rpx 32rpx; display: flex; gap: 16rpx; }
.modal-btn { flex: 1; padding: 20rpx 0; border-radius: 16rpx; text-align: center; }
.modal-btn.cancel { border: 2rpx solid var(--border); }
.modal-btn.ok { background: var(--brand); }
.modal-btn-t { font-size: 28rpx; color: var(--text-ink); }
.modal-btn-t.light { color: #fff; }
</style>
