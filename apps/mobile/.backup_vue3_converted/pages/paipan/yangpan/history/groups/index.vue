<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-20 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="p-1 -ml-1" @click="goBack">
          <text class="text-xl">←</text>
        </view>
        <text class="text-base font-bold">分组管理</text>
        <view class="p-1 -mr-1 text-primary" @click="showAddModal = true">
          <text class="text-lg"></text>
        </view>
      </view>
    </header>

    <!-- 分组列表 -->
    <main class="flex-1 p-3">
      <view class="bg-card rounded-xl border border-border overflow-hidden">
        <view v-for="(group, index) in groups" :key="group.id" class="flex items-center justify-between px-4 py-3" :class="index !== groups.length - 1 ? 'border-b' : ''" :style="index !== groups.length - 1 ? 'border-bottom: 1px solid rgba(232,227,219,0.6)' : ''">
          <view class="flex items-center gap-3">
            <view class="w-3 h-3 rounded-full" :class="group.color" />
            <template v-if="editingGroup === group.id">
              <input type="text" :value="group.name" @blur="(e:any) => handleRename(group.id, e.detail.value)" @confirm="(e:any) => handleRename(group.id, e.detail.value)" class="text-sm bg-secondary/50 rounded px-2 py-1" style="outline: none; border: 1px solid #C41E3A; box-shadow: 0 0 0 2px rgba(196,30,58,0.15);" focus />
            </template>
            <template v-else>
              <text class="text-sm font-medium">{{ group.name }}</text>
            </template>
            <text class="text-xs text-muted-foreground">({{ group.count }})</text>
          </view>
          <view class="flex items-center gap-2">
            <view class="p-1.5 text-muted-foreground hover-primary" @click="editingGroup = group.id">
              <text>✏</text>
            </view>
            <view v-if="group.name !== '未分类'" class="p-1.5 text-muted-foreground hover-danger" @click="handleDelete(group.id)">
              <text>🗑</text>
            </view>
          </view>
        </view>
      </view>

      <text class="text-xs text-muted-foreground text-center block mt-4">
        删除分组后，该分组下的记录将移动到"未分类"
      </text>
    </main>

    <!-- 添加分组弹窗 -->
    <view v-if="showAddModal" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <view class="bg-card w-full max-w-sm rounded-xl" style="animation: scaleIn 0.2s ease-out;">
        <view class="flex items-center justify-between px-4 py-3" style="border-bottom: 1px solid #E8E0D5;">
          <text class="font-medium">添加分组</text>
          <view class="p-1 text-muted-foreground" @click="showAddModal = false" hover-class="press-opacity-60">
            <text>✕</text>
          </view>
        </view>
        <view class="p-4">
          <input type="text" v-model="newGroupName" placeholder="请输入分组名称" class="w-full px-3 py-2.5 bg-secondary/50 rounded-lg text-sm modal-input" style="outline: none; border: 1px solid #E8E0D5;" focus />
        </view>
        <view class="p-4 pt-0 flex gap-2">
          <view class="flex-1 py-2.5 rounded-lg border border-border text-center hover-secondary" @click="showAddModal = false">取消</view>
          <view class="flex-1 py-2.5 rounded-lg bg-primary text-white text-center hover-primary-bg" @click="handleAddGroup">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Group {
  id: string
  name: string
  count: number
  color: string
}

const initialGroups: Group[] = [
  { id: '1', name: '客户', count: 12, color: 'bg-blue-500' },
  { id: '2', name: '家人', count: 5, color: 'bg-green-500' },
  { id: '3', name: '朋友', count: 8, color: 'bg-orange-500' },
  { id: '4', name: '未分类', count: 3, color: 'bg-gray-500' },
]

const groups = ref<Group[]>(initialGroups)
const showAddModal = ref(false)
const editingGroup = ref<string | null>(null)
const newGroupName = ref('')

function handleAddGroup() {
  if (newGroupName.value.trim()) {
    groups.value.push({
      id: String(Date.now()),
      name: newGroupName.value.trim(),
      count: 0,
      color: 'bg-purple-500'
    })
    newGroupName.value = ''
    showAddModal.value = false
  }
}

function handleDelete(id: string) {
  groups.value = groups.value.filter(g => g.id !== id)
}

function handleRename(id: string, newName: string) {
  if (newName.trim()) {
    groups.value = groups.value.map(g => g.id === id ? { ...g, name: newName } : g)
  }
  editingGroup.value = null
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 编辑/删除图标悬停 */
.hover-primary:hover { color: #C41E3A; background: rgba(196,30,58,0.08); border-radius: 0.375rem; }
.hover-danger:hover { color: #ef4444; background: rgba(239,68,68,0.08); border-radius: 0.375rem; }
.hover-secondary:hover { background: rgba(245,241,235,0.5); }
.hover-primary-bg:hover { opacity: 0.9; }

/* 模态输入框聚焦 */
.modal-input:focus { outline: none; border-color: #C41E3A; box-shadow: 0 0 0 2px rgba(196,30,58,0.15); }

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
