<script setup lang="ts">
/** 分组选择器弹窗——从原型 group-picker-modal.tsx 迁移 */
import { ref, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

const props = withDefaults(defineProps<{ open: boolean; initialGroup?: string }>(), { initialGroup: '全部' })
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm', v: string): void }>()

const groups = ref([
  { name: '全部', count: 11 },
  { name: '家人', count: 3 },
  { name: '朋友', count: 5 },
  { name: '客户', count: 2 },
])
const selected = ref(props.initialGroup)
const showAddInput = ref(false)
const newName = ref('')

watch(() => props.open, (v) => { if (v) selected.value = props.initialGroup })

function confirm() { emit('confirm', selected.value); emit('close') }
function addGroup() {
  const n = newName.value.trim()
  if (!n) return
  groups.value.push({ name: n, count: 0 })
  selected.value = n
  newName.value = ''
  showAddInput.value = false
}
</script>

<template>
  <view v-if="open" class="gp-root">
    <view class="gp-mask" @tap="emit('close')" @touchmove.prevent />
    <view class="gp-panel" @touchmove.stop>
      <view class="gp-handle-wrap"><view class="gp-handle" /></view>
      <view class="gp-head">
        <view class="gp-x" @tap="emit('close')"><app-icon name="x" :size="36" color="#6b7280" /></view>
        <text class="gp-title">选择分组</text>
        <view class="gp-confirm" @tap="confirm"><text class="gp-confirm-text">确定</text></view>
      </view>
      <scroll-view scroll-y class="gp-list">
        <view
          v-for="g in groups" :key="g.name"
          class="gp-item" :class="{ 'gp-item-on': selected === g.name }"
          @tap="selected = g.name"
        >
          <view class="gp-item-l">
            <text class="gp-name" :class="{ 'gp-name-on': selected === g.name }">{{ g.name }}</text>
            <text class="gp-count">({{ g.count }})</text>
          </view>
          <app-icon v-if="selected === g.name" name="check" :size="36" color="#c41e3a" />
        </view>

        <view v-if="showAddInput" class="gp-add-input">
          <input v-model="newName" class="gp-input" placeholder="输入分组名称" confirm-type="done" @confirm="addGroup" />
          <view class="gp-add-btn" :class="{ 'gp-add-btn-off': !newName.trim() }" @tap="addGroup"><text class="gp-add-btn-text">添加</text></view>
          <view class="gp-cancel" @tap="showAddInput = false; newName = ''"><text class="gp-cancel-text">取消</text></view>
        </view>
        <view v-else class="gp-add" @tap="showAddInput = true">
          <app-icon name="plus" :size="28" color="#c41e3a" />
          <text class="gp-add-text">添加新分组</text>
        </view>
      </scroll-view>
      <view class="gp-safe" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.gp-root { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; }
.gp-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.gp-panel { position: relative; width: 100%; max-height: 78vh; background: #fff; border-radius: 48rpx 48rpx 0 0; overflow: hidden; display: flex; flex-direction: column; }
.gp-handle-wrap { display: flex; justify-content: center; padding: 24rpx 0 16rpx; }
.gp-handle { width: 80rpx; height: 8rpx; background: #d1d5db; border-radius: 999rpx; }
.gp-head { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 40rpx; }
.gp-x { padding: 12rpx; }
.gp-title { font-size: 32rpx; font-weight: 600; color: #111827; }
.gp-confirm { padding: 12rpx 32rpx; background: #111827; border-radius: 999rpx; }
.gp-confirm-text { font-size: 26rpx; font-weight: 500; color: #fff; }
.gp-list { flex: 1; height: 0; min-height: 0; padding: 24rpx 32rpx; max-height: 50vh; }
.gp-list :deep(.uni-scroll-view),
.gp-list :deep(.uni-scroll-view-content) { overscroll-behavior: contain; }
.gp-item { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; border-radius: 24rpx; margin-bottom: 16rpx; background: #f9fafb; border: 4rpx solid transparent; }
.gp-item-on { background: rgba(196,30,58,0.05); border-color: var(--brand); }
.gp-item-l { display: flex; align-items: center; gap: 24rpx; }
.gp-name { font-size: 28rpx; font-weight: 500; color: #374151; }
.gp-name-on { color: var(--brand); }
.gp-count { font-size: 22rpx; color: #9ca3af; }
.gp-add-input { display: flex; align-items: center; gap: 16rpx; padding: 24rpx 32rpx; background: #f9fafb; border-radius: 24rpx; }
.gp-input { flex: 1; font-size: 28rpx; }
.gp-add-btn { padding: 8rpx 24rpx; background: var(--brand); border-radius: 16rpx; }
.gp-add-btn-off { opacity: 0.5; }
.gp-add-btn-text { font-size: 22rpx; font-weight: 500; color: #fff; }
.gp-cancel { padding: 8rpx 24rpx; }
.gp-cancel-text { font-size: 22rpx; font-weight: 500; color: #6b7280; }
.gp-add { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 28rpx 32rpx; background: rgba(196,30,58,0.05); border-radius: 24rpx; border: 4rpx dashed rgba(196,30,58,0.3); }
.gp-add-text { font-size: 28rpx; font-weight: 500; color: var(--brand); }
.gp-safe { height: 48rpx; }
</style>
