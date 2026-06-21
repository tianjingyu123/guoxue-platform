<script setup lang="ts">
/** 阳盘命理奇门 · 分组管理（从原型 app/paipan/yangpan/history/groups/page.tsx 1:1 迁移），已接入后端 API */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { groupApi, type GroupItem } from '@/lib/paipan-groups'

const PAI_TYPE = 'YANGPAN'
const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#06b6d4']
let _colorIdx = 0

const groups = ref<GroupItem[]>([])
const loading = ref(true)
const error = ref('')
const showAddModal = ref(false)
const editingGroup = ref<string | null>(null)
const editingName = ref('')
const newGroupName = ref('')
const submitting = ref(false)

async function fetchGroups() {
  loading.value = true; error.value = ''
  try { groups.value = await groupApi.list(PAI_TYPE) }
  catch (e: any) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(fetchGroups)

async function handleAddGroup() {
  if (!newGroupName.value.trim() || submitting.value) return
  submitting.value = true
  try {
    const color = DEFAULT_COLORS[_colorIdx % DEFAULT_COLORS.length]; _colorIdx++
    await groupApi.create(PAI_TYPE, newGroupName.value.trim(), color)
    await fetchGroups()
    newGroupName.value = ''
    showAddModal.value = false
  } catch (e: any) { uni.showToast({ title: e?.message || '添加失败', icon: 'none' }) }
  finally { submitting.value = false }
}

async function handleDeleteGroup(name: string) {
  if (submitting.value) return
  submitting.value = true
  try {
    await groupApi.delete(PAI_TYPE, name)
    await fetchGroups()
  } catch (e: any) { uni.showToast({ title: e?.message || '删除失败', icon: 'none' }) }
  finally { submitting.value = false }
}

function startEdit(g: GroupItem) {
  editingGroup.value = g.id
  editingName.value = g.name
}

async function saveRename(id: string, oldName: string) {
  if (!editingName.value.trim() || submitting.value) { editingGroup.value = null; return }
  if (editingName.value.trim() === oldName) { editingGroup.value = null; return }
  submitting.value = true
  try {
    await groupApi.rename(PAI_TYPE, oldName, editingName.value.trim())
    await fetchGroups()
    editingGroup.value = null
  } catch (e: any) { uni.showToast({ title: e?.message || '重命名失败', icon: 'none' }) }
  finally { submitting.value = false }
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-inner">
        <view
          class="hdr-back"
          @tap="navigateTo('/paipan/yangpan/history')"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="var(--text-ink)"
          />
        </view>
        <text class="hdr-title">
          分组管理
        </text>
        <view
          class="hdr-add"
          @tap="showAddModal = true"
        >
          <app-icon
            name="plus"
            :size="34"
            color="var(--brand)"
          />
        </view>
      </view>
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
    <scroll-view
      v-else
      scroll-y
      class="body"
    >
      <view class="body-inner">
        <view class="card">
          <view
            v-for="(g, i) in groups"
            :key="g.id"
            class="grp-row"
            :class="{ noborder: i === groups.length - 1 }"
          >
            <view class="grp-left">
              <view
                class="grp-dot"
                :style="{ background: g.color || '#6b7280' }"
              />
              <input
                v-if="editingGroup === g.id"
                v-model="editingName"
                class="grp-edit"
                focus
                @blur="saveRename(g.id, g.name)"
                @confirm="saveRename(g.id, g.name)"
              >
              <text
                v-else
                class="grp-name"
              >
                {{ g.name }}
              </text>
              <text class="grp-count">
                ({{ g.count }})
              </text>
            </view>
            <view class="grp-actions">
              <view
                class="grp-btn"
                @tap="startEdit(g)"
              >
                <app-icon
                  name="pencil"
                  :size="30"
                  color="var(--text-soft)"
                />
              </view>
              <view
                class="grp-btn"
                @tap="handleDeleteGroup(g.name)"
              >
                <app-icon
                  name="trash-2"
                  :size="30"
                  color="var(--text-soft)"
                />
              </view>
            </view>
          </view>
        </view>
        <text class="tip">
          删除分组后，该分组下的记录将移动到"未分类"
        </text>
      </view>
    </scroll-view>

    <!-- 添加分组弹窗 -->
    <view
      v-if="showAddModal"
      class="mask"
      @tap="showAddModal = false"
    >
      <view
        class="modal"
        @tap.stop
      >
        <view class="modal-head">
          <text class="modal-title">
            添加分组
          </text>
          <view
            class="modal-close"
            @tap="showAddModal = false"
          >
            <app-icon
              name="x"
              :size="34"
              color="var(--text-soft)"
            />
          </view>
        </view>
        <view class="modal-body">
          <input
            v-model="newGroupName"
            class="modal-input"
            placeholder="请输入分组名称"
            placeholder-class="modal-ph"
            focus
          >
        </view>
        <view class="modal-foot">
          <view
            class="modal-btn cancel"
            @tap="showAddModal = false"
          >
            <text class="modal-btn-t">
              取消
            </text>
          </view>
          <view
            class="modal-btn ok"
            :class="{ disabled: !newGroupName.trim() || submitting }"
            @tap="handleAddGroup"
          >
            <text class="modal-btn-t light">
              {{ submitting ? '添加中...' : '确定' }}
            </text>
          </view>
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

.loading-spinner { flex: 1; display: flex; align-items: center; justify-content: center; }
.loading-text { font-size: 28rpx; color: var(--text-soft); }
.error-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 26rpx; color: #fff; }

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
.modal-btn.ok.disabled { opacity: 0.5; }
.modal-btn-t { font-size: 28rpx; color: var(--text-ink); }
.modal-btn-t.light { color: #fff; }
</style>
