<script setup lang="ts">
/** 奇门排盘记录页——从原型 app/paipan/qimen/history/page.tsx 1:1 迁移 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

const groups = ['全部', '工作事业', '财运投资', '感情婚姻', '健康出行', '其他']

interface Record { id: number; dateTime: string; matter: string; ju: string; panMethod: string; createdAt: string; group: string; pinned: boolean }
const records = ref<Record[]>([
  { id: 1, dateTime: '2026-05-17 13:38', matter: '求财运势', ju: '阳遁3局', panMethod: '飞盘', createdAt: '2026-05-17', group: '财运投资', pinned: false },
  { id: 2, dateTime: '2026-05-16 09:20', matter: '出行吉凶', ju: '阴遁5局', panMethod: '转盘', createdAt: '2026-05-16', group: '健康出行', pinned: true },
  { id: 3, dateTime: '2026-05-15 15:45', matter: '合作洽谈', ju: '阳遁7局', panMethod: '飞盘', createdAt: '2026-05-15', group: '工作事业', pinned: false },
  { id: 4, dateTime: '2026-05-14 11:00', matter: '', ju: '阴遁2局', panMethod: '飞盘', createdAt: '2026-05-14', group: '其他', pinned: false },
  { id: 5, dateTime: '2026-05-13 08:30', matter: '面试求职', ju: '阳遁1局', panMethod: '转盘', createdAt: '2026-05-13', group: '工作事业', pinned: true },
])

type SelectMode = 'none' | 'delete' | 'pin' | 'group'
const searchQuery = ref('')
const activeGroup = ref('全部')
const showMenu = ref(false)
const selectMode = ref<SelectMode>('none')
const selectedIds = ref<number[]>([])
const showGroupPicker = ref(false)

const filteredRecords = computed(() =>
  records.value
    .filter(r =>
      (activeGroup.value === '全部' || r.group === activeGroup.value) &&
      (r.matter.includes(searchQuery.value) || r.dateTime.includes(searchQuery.value) || r.ju.includes(searchQuery.value)))
    .sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1)),
)
const allSelected = computed(() => selectedIds.value.length === filteredRecords.value.length && filteredRecords.value.length > 0)

function toggleSelect(id: number) {
  selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter(i => i !== id) : [...selectedIds.value, id]
}
function selectAll() { selectedIds.value = allSelected.value ? [] : filteredRecords.value.map(r => r.id) }
function resetMode() { selectMode.value = 'none'; selectedIds.value = [] }
function handleDelete() { records.value = records.value.filter(r => !selectedIds.value.includes(r.id)); resetMode() }
function handlePin() { records.value = records.value.map(r => selectedIds.value.includes(r.id) ? { ...r, pinned: true } : r); resetMode() }
function handleChangeGroup(g: string) { records.value = records.value.map(r => selectedIds.value.includes(r.id) ? { ...r, group: g } : r); showGroupPicker.value = false; resetMode() }
function openRecord(r: Record) {
  if (selectMode.value !== 'none') { toggleSelect(r.id); return }
  navigateTo(`/paipan/qimen/result?matter=${encodeURIComponent(r.matter)}&customJu=${encodeURIComponent(r.ju)}`)
}
function pickMenu(mode: SelectMode) { selectMode.value = mode; showMenu.value = false }
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-inner">
        <view class="hdr-back" @tap="navigateTo('/paipan/qimen')"><app-icon name="chevron-left" :size="40" color="var(--text-ink)" /></view>
        <text class="hdr-title">排盘记录</text>
        <view class="hdr-more" @tap="showMenu = !showMenu"><app-icon name="more-vertical" :size="32" color="var(--text-ink)" /></view>
      </view>
      <!-- 下拉菜单 -->
      <view v-if="showMenu" class="menu-mask" @tap="showMenu = false" />
      <view v-if="showMenu" class="menu">
        <view class="menu-item" @tap="navigateTo('/paipan/qimen/history/groups'); showMenu = false">
          <app-icon name="users" :size="28" color="var(--text-soft)" /><text class="menu-text">分组管理</text>
        </view>
        <view class="menu-item" @tap="pickMenu('group')">
          <app-icon name="folder-pen" :size="28" color="var(--text-soft)" /><text class="menu-text">修改分组</text>
        </view>
        <view class="menu-item" @tap="pickMenu('pin')">
          <app-icon name="pin" :size="28" color="var(--text-soft)" /><text class="menu-text">批量置顶</text>
        </view>
        <view class="menu-item" @tap="pickMenu('delete')">
          <app-icon name="trash-2" :size="28" color="var(--text-soft)" /><text class="menu-text">批量删除</text>
        </view>
      </view>
    </view>

    <!-- 分组标签 -->
    <view class="groups">
      <scroll-view scroll-x class="groups-scroll">
        <view class="groups-row">
          <view v-for="g in groups" :key="g" class="grp" :class="{ on: activeGroup === g }" @tap="activeGroup = g">
            <text class="grp-t" :class="{ on: activeGroup === g }">{{ g }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 搜索栏 -->
    <view class="search">
      <view class="search-box">
        <app-icon name="search" :size="28" color="var(--text-soft)" />
        <input v-model="searchQuery" class="search-input" placeholder="搜索事项、时间、局数..." placeholder-class="search-ph" />
      </view>
    </view>

    <!-- 记录列表 -->
    <scroll-view scroll-y class="body">
      <view v-if="filteredRecords.length === 0" class="empty">
        <text class="empty-title">暂无记录</text>
        <text class="empty-sub">开始排盘后，记录会显示在这里</text>
      </view>
      <view v-else class="list">
        <view
          v-for="r in filteredRecords" :key="r.id"
          class="rec" :class="{ sel: selectedIds.includes(r.id), pinned: r.pinned }"
          @tap="openRecord(r)"
        >
          <view class="rec-bar" />
          <view class="rec-body">
            <view v-if="selectMode !== 'none'" class="rec-check" :class="{ on: selectedIds.includes(r.id) }">
              <app-icon v-if="selectedIds.includes(r.id)" name="check" :size="20" color="#ffffff" />
            </view>
            <view class="rec-content">
              <view class="rec-top">
                <view class="rec-name-wrap">
                  <app-icon v-if="r.pinned" name="pin" :size="24" color="#f59e0b" />
                  <text class="rec-name">{{ r.matter || '未命名事项' }}</text>
                </view>
                <text class="rec-group">{{ r.group }}</text>
              </view>
              <view class="rec-meta">
                <text class="rec-time">{{ r.dateTime }}</text>
                <text class="rec-ju">{{ r.ju }}</text>
                <text class="rec-pan">{{ r.panMethod }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 批量操作栏 -->
    <view v-if="selectMode !== 'none'" class="bulk">
      <view class="bulk-all" @tap="selectAll">
        <view class="bulk-check" :class="{ on: allSelected }"><app-icon v-if="allSelected" name="check" :size="20" color="#ffffff" /></view>
        <text class="bulk-all-t">全选</text>
      </view>
      <view class="bulk-actions">
        <view class="bulk-btn cancel" @tap="resetMode"><text class="bulk-btn-t soft">取消</text></view>
        <view v-if="selectMode === 'delete'" class="bulk-btn danger" :class="{ disabled: !selectedIds.length }" @tap="handleDelete">
          <text class="bulk-btn-t light">删除 {{ selectedIds.length ? `(${selectedIds.length})` : '' }}</text>
        </view>
        <view v-else-if="selectMode === 'pin'" class="bulk-btn brand" :class="{ disabled: !selectedIds.length }" @tap="handlePin">
          <text class="bulk-btn-t light">置顶 {{ selectedIds.length ? `(${selectedIds.length})` : '' }}</text>
        </view>
        <view v-else class="bulk-btn brand" :class="{ disabled: !selectedIds.length }" @tap="selectedIds.length && (showGroupPicker = true)">
          <text class="bulk-btn-t light">移动到分组</text>
        </view>
      </view>
    </view>

    <!-- 分组选择弹窗 -->
    <view v-if="showGroupPicker" class="gp-mask" @tap="showGroupPicker = false">
      <view class="gp-sheet" @tap.stop>
        <view class="gp-head"><text class="gp-head-t">选择分组</text></view>
        <scroll-view scroll-y class="gp-list">
          <view v-for="g in groups.filter(x => x !== '全部')" :key="g" class="gp-item" @tap="handleChangeGroup(g)">
            <text class="gp-item-t">{{ g }}</text>
          </view>
        </scroll-view>
        <view class="gp-foot">
          <view class="gp-cancel" @tap="showGroupPicker = false"><text class="gp-cancel-t">取消</text></view>
        </view>
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
.hdr-more { padding: 8rpx; margin-right: -8rpx; }
.menu-mask { position: fixed; inset: 0; z-index: 10; }
.menu { position: absolute; right: 24rpx; top: 96rpx; z-index: 20; background: var(--card); border-radius: 20rpx; box-shadow: 0 8rpx 28rpx rgba(0,0,0,0.16); padding: 12rpx 0; min-width: 280rpx; }
.menu-item { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 32rpx; }
.menu-text { font-size: 28rpx; color: var(--text-ink); }

.groups { padding: 20rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.groups-scroll { white-space: nowrap; }
.groups-row { display: inline-flex; gap: 16rpx; }
.grp { padding: 10rpx 32rpx; border-radius: 999rpx; background: rgba(0,0,0,0.04); }
.grp.on { background: var(--brand); }
.grp-t { font-size: 26rpx; color: var(--text-soft); }
.grp-t.on { color: #fff; font-weight: 500; }

.search { padding: 20rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.search-box { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 28rpx; background: rgba(0,0,0,0.04); border-radius: 999rpx; }
.search-input { flex: 1; font-size: 28rpx; color: var(--text-ink); }
.search-ph { color: var(--text-soft); }

.body { flex: 1; padding: 20rpx 24rpx; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400rpx; }
.empty-title { font-size: 34rpx; color: var(--text-soft); margin-bottom: 12rpx; }
.empty-sub { font-size: 26rpx; color: var(--text-soft); }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.rec { background: var(--card); border-radius: 20rpx; border: 2rpx solid var(--border); overflow: hidden; display: flex; }
.rec.sel { border-color: var(--brand); box-shadow: 0 0 0 3rpx rgba(196,30,58,0.3); }
.rec.pinned { background: rgba(245,158,11,0.06); }
.rec-bar { width: 8rpx; flex-shrink: 0; background: #4f6ef7; }
.rec-body { flex: 1; padding: 28rpx; display: flex; align-items: flex-start; gap: 20rpx; }
.rec-check { width: 38rpx; height: 38rpx; border-radius: 999rpx; border: 4rpx solid var(--border); flex-shrink: 0; margin-top: 4rpx; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.rec-check.on { border-color: var(--brand); background: var(--brand); }
.rec-content { flex: 1; }
.rec-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.rec-name-wrap { display: flex; align-items: center; gap: 12rpx; }
.rec-name { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.rec-group { font-size: 18rpx; color: var(--brand); background: rgba(196,30,58,0.1); padding: 2rpx 16rpx; border-radius: 999rpx; font-weight: 500; }
.rec-meta { display: flex; align-items: center; gap: 20rpx; }
.rec-time { font-size: 26rpx; color: var(--text-soft); }
.rec-ju { font-size: 26rpx; font-weight: 600; color: var(--brand); background: rgba(196,30,58,0.05); padding: 2rpx 16rpx; border-radius: 8rpx; }
.rec-pan { font-size: 22rpx; color: var(--text-soft); }

.bulk { position: sticky; bottom: 0; background: var(--card); border-top: 2rpx solid var(--border); padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 20rpx; }
.bulk-all { display: flex; align-items: center; gap: 12rpx; }
.bulk-check { width: 38rpx; height: 38rpx; border-radius: 999rpx; border: 4rpx solid var(--border); display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.bulk-check.on { border-color: var(--brand); background: var(--brand); }
.bulk-all-t { font-size: 28rpx; color: var(--text-ink); }
.bulk-actions { flex: 1; display: flex; gap: 20rpx; justify-content: flex-end; }
.bulk-btn { padding: 18rpx 44rpx; border-radius: 999rpx; }
.bulk-btn.cancel { background: rgba(0,0,0,0.05); }
.bulk-btn.danger { background: #ef4444; }
.bulk-btn.brand { background: var(--brand); }
.bulk-btn.disabled { opacity: 0.4; }
.bulk-btn-t { font-size: 28rpx; font-weight: 500; }
.bulk-btn-t.soft { color: var(--text-soft); }
.bulk-btn-t.light { color: #fff; }

.gp-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.gp-sheet { width: 100%; background: var(--card); border-radius: 32rpx 32rpx 0 0; }
.gp-head { padding: 28rpx; text-align: center; border-bottom: 2rpx solid var(--border); }
.gp-head-t { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.gp-list { max-height: 50vh; }
.gp-item { padding: 28rpx 32rpx; border-bottom: 2rpx solid rgba(0,0,0,0.06); }
.gp-item-t { font-size: 28rpx; color: var(--text-ink); }
.gp-foot { padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); border-top: 2rpx solid var(--border); }
.gp-cancel { padding: 22rpx 0; background: rgba(0,0,0,0.05); border-radius: 999rpx; text-align: center; }
.gp-cancel-t { font-size: 28rpx; font-weight: 500; color: var(--text-soft); }
</style>
