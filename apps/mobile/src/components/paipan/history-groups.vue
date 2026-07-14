<script setup lang="ts">
/**
 * 排盘记录 · 分组管理（自 V0 app/<工具>/history/groups/page.tsx 提炼）
 * 三视图：分组列表 / 改名 / 新建。每组显示真实记录条数。
 *
 * 🔴 原分组页是写死的 4 个分组 + 内存改名（退出即失效，条数「11/3/5/3」也是编的）。
 * 现在：分组名落本地存储，条数由真实记录实时统计；改名/删除会同步迁移记录里的 group 字段
 *（记录存的是分组名，不迁移就会出现「幽灵分组」——记录挂在一个已不存在的名字下，任何标签都筛不到它）。
 */
import { ref, computed } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import AppIcon from '@/components/common/app-icon.vue'
import type { GroupNameStore, HistoryStore } from '@/lib/paipan/history-core'

const props = defineProps<{
  title?: string
  backHref?: string
  groupStore: GroupNameStore
  /** 记录存储（改名/删除分组时同步迁移记录的 group） */
  recordStore: HistoryStore<any>
}>()

const groups = ref<string[]>(props.groupStore.load())
const records = ref<any[]>(props.recordStore.load())

const editing = ref<string | null>(null)
const adding = ref(false)
const draft = ref('')

const counts = computed(() => {
  const m: Record<string, number> = { 全部: records.value.length }
  for (const r of records.value) {
    const g = r.group && r.group !== '全部' ? r.group : null
    if (g) m[g] = (m[g] || 0) + 1
  }
  return m
})

function reload() {
  groups.value = props.groupStore.load()
  records.value = props.recordStore.load()
}

function startEdit(g: string) {
  if (g === '全部') return
  editing.value = g
  draft.value = g
}
function saveEdit() {
  const name = draft.value.trim()
  const old = editing.value
  if (!old || !name) return
  if (name !== old && groups.value.includes(name)) {
    uni.showToast({ title: '该分组已存在', icon: 'none' })
    return
  }
  props.groupStore.save(groups.value.map((g) => (g === old ? name : g)))
  // 同步迁移记录，否则老名字下的记录会变成谁也筛不到的幽灵记录
  const ids = records.value.filter((r) => r.group === old).map((r) => r.id)
  if (ids.length) props.recordStore.setGroup(ids, name)
  editing.value = null
  draft.value = ''
  reload()
}
function removeGroup() {
  const old = editing.value
  if (!old) return
  uni.showModal({
    title: '删除分组',
    content: `删除「${old}」后，该组下的 ${counts.value[old] || 0} 条记录会回到「全部」，记录本身不会丢。`,
    confirmColor: '#C41E3A',
    success: (res) => {
      if (!res.confirm) return
      props.groupStore.save(groups.value.filter((g) => g !== old))
      const ids = records.value.filter((r) => r.group === old).map((r) => r.id)
      if (ids.length) props.recordStore.setGroup(ids, '全部')
      editing.value = null
      reload()
    },
  })
}
function addGroup() {
  const name = draft.value.trim()
  if (!name) return
  if (groups.value.includes(name)) {
    uni.showToast({ title: '该分组已存在', icon: 'none' })
    return
  }
  props.groupStore.save([...groups.value, name])
  adding.value = false
  draft.value = ''
  reload()
}
function cancel() {
  editing.value = null
  adding.value = false
  draft.value = ''
}
</script>

<template>
  <view class="gp">
    <ToolHeader :title="title || '分组管理'" :back-href="backHref" />

    <view class="gp-body">
      <!-- 改名 / 新建 -->
      <view v-if="editing || adding" class="gp-edit">
        <text class="gp-edit-title">{{ adding ? '新建分组' : `重命名「${editing}」` }}</text>
        <input v-model="draft" class="gp-input" type="text" placeholder="分组名称" placeholder-class="gp-ph" maxlength="10" />
        <view class="gp-edit-btns">
          <view class="gp-btn gp-btn-ghost" @tap="cancel">取消</view>
          <view v-if="editing" class="gp-btn gp-btn-danger" @tap="removeGroup">删除分组</view>
          <view class="gp-btn gp-btn-primary" @tap="adding ? addGroup() : saveEdit()">保存</view>
        </view>
      </view>

      <!-- 分组列表 -->
      <template v-else>
        <view v-for="g in groups" :key="g" class="gp-item" @tap="startEdit(g)">
          <view class="gp-item-l">
            <AppIcon name="folder" :size="34" color="#c41e3a" />
            <text class="gp-name">{{ g }}</text>
            <text v-if="g === '全部'" class="gp-def">默认</text>
          </view>
          <view class="gp-item-r">
            <text class="gp-count">{{ counts[g] || 0 }} 条</text>
            <text v-if="g !== '全部'" class="gp-arrow">›</text>
          </view>
        </view>

        <view class="gp-add" @tap="adding = true; draft = ''">＋ 新建分组</view>
        <text class="gp-tip">分组名与记录一起存在本机。删除分组不会删除记录，组内记录会回到「全部」。</text>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.gp {
  min-height: 100vh;
  background: var(--bg-page, #faf8f5);
}
.gp-body {
  padding: 24rpx 32rpx;
}
.gp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  padding: 26rpx 24rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #fff;
}
.gp-item-l {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.gp-name {
  font-size: 28rpx;
  color: #3d2f22;
}
.gp-def {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #f0ebe3;
  font-size: 20rpx;
  color: #8a7a68;
}
.gp-item-r {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.gp-count {
  font-size: 22rpx;
  color: #8a7a68;
}
.gp-arrow {
  font-size: 30rpx;
  color: #b0a494;
}
.gp-add {
  margin-top: 8rpx;
  padding: 26rpx 0;
  text-align: center;
  border: 1rpx dashed #c41e3a;
  border-radius: 16rpx;
  color: #c41e3a;
  font-size: 28rpx;
}
.gp-tip {
  display: block;
  margin-top: 24rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #a89b8a;
}

.gp-edit {
  padding: 32rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 24rpx;
  background: #fff;
}
.gp-edit-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #3d2f22;
  margin-bottom: 20rpx;
}
.gp-input {
  height: 84rpx;
  padding: 0 24rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #faf8f5;
  font-size: 28rpx;
  color: #3d2f22;
}
.gp-ph {
  color: #b0a494;
}
.gp-edit-btns {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.gp-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 16rpx;
  font-size: 28rpx;
}
.gp-btn-ghost {
  border: 1rpx solid #e7e0d5;
  background: #fff;
  color: #8a7a68;
}
.gp-btn-danger {
  border: 1rpx solid #c41e3a;
  background: #fff;
  color: #c41e3a;
}
.gp-btn-primary {
  background: #c41e3a;
  color: #fff;
}
</style>
