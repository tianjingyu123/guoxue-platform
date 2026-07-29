<script setup lang="ts">
/**
 * 排盘记录页 · 通用外壳（自 V0 app/<工具>/history/page.tsx 提炼——18 个记录页同构）
 * 结构：顶栏（管理/完成）+ 搜索 + 分组标签（可选）+ 置顶分区 + 全部分区 + 底部批量栏（置顶/删除）+ 空态
 * 记录卡由调用方通过 #card 插槽给出（各工具展示字段不同：四柱 / 主星五行局 / 卦名 / 姓名三才…）
 *
 * 数据一律来自各工具的本地记录（uni.storage），无记录就是空态——不塞任何示例数据。
 */
import { ref, computed } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

export interface HistoryVM {
  id: string
  pinned?: boolean
  group?: string
  /** 参与搜索的全部文本（调用方拼好） */
  keywords: string
  /** 点击跳转（管理模式下不跳） */
  href?: string
  /** 透传给插槽的原始记录 */
  raw: any
}

const props = withDefaults(
  defineProps<{
    title?: string
    backHref?: string
    records: HistoryVM[]
    searchPlaceholder?: string
    /** 分组标签（传了才显示；第一项应为「全部」） */
    groups?: string[]
    emptyText?: string
    /** 空态引导按钮文案（跳回 backHref 对应工具页；未传则用默认「去排盘」） */
    ctaText?: string
  }>(),
  {
    title: '排盘记录',
    searchPlaceholder: '搜索记录',
    emptyText: '暂无排盘记录，起盘后自动保存',
    ctaText: '去排盘',
  },
)

function goTool() {
  if (props.backHref) navigateTo(props.backHref)
}

const emit = defineEmits<{
  (e: 'pin', ids: string[]): void
  (e: 'delete', ids: string[]): void
  (e: 'group', payload: { ids: string[]; group: string }): void
  (e: 'open', rec: HistoryVM): void
}>()

const keyword = ref('')
const manageMode = ref(false)
const selected = ref<Set<string>>(new Set())
const activeGroup = ref('全部')
const groupPickerOpen = ref(false)

const filtered = computed(() => {
  const k = keyword.value.trim()
  return props.records.filter((r) => {
    if (props.groups && activeGroup.value !== '全部' && (r.group || '全部') !== activeGroup.value) return false
    return !k || r.keywords.includes(k)
  })
})
const pinnedList = computed(() => filtered.value.filter((r) => r.pinned))
const normalList = computed(() => filtered.value.filter((r) => !r.pinned))
const selCount = computed(() => selected.value.size)

function toggleManage() {
  manageMode.value = !manageMode.value
  selected.value = new Set()
}
function toggleSelect(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}
function onCardTap(r: HistoryVM) {
  if (manageMode.value) {
    toggleSelect(r.id)
    return
  }
  emit('open', r)
}
function doPin() {
  emit('pin', [...selected.value])
  selected.value = new Set()
  manageMode.value = false
}
function doDelete() {
  const ids = [...selected.value]
  uni.showModal({
    title: '删除记录',
    content: `确定删除选中的 ${ids.length} 条记录？删除后不可恢复。`,
    confirmColor: '#C41E3A',
    success: (res) => {
      if (!res.confirm) return
      emit('delete', ids)
      selected.value = new Set()
      manageMode.value = false
    },
  })
}
function doGroup(g: string) {
  emit('group', { ids: [...selected.value], group: g })
  groupPickerOpen.value = false
  selected.value = new Set()
  manageMode.value = false
}
</script>

<template>
  <view class="hp">
    <ToolHeader :title="title" :back-href="backHref">
      <template #actions>
        <text class="hp-manage" @tap="toggleManage">{{ manageMode ? '完成' : '管理' }}</text>
      </template>
    </ToolHeader>

    <view class="hp-body">
      <!-- 搜索 -->
      <view class="hp-search">
        <AppIcon name="search" :size="32" color="#8a7a68" />
        <input v-model="keyword" class="hp-input" type="text" :placeholder="searchPlaceholder" placeholder-class="hp-ph" />
        <text v-if="keyword" class="hp-clear" @tap="keyword = ''">✕</text>
      </view>

      <!-- 分组标签 -->
      <scroll-view v-if="groups && groups.length" class="hp-groups" scroll-x>
        <view class="hp-groups-row">
          <view
            v-for="g in groups"
            :key="g"
            :class="['hp-group', activeGroup === g && 'hp-group-on']"
            @tap="activeGroup = g"
          >
            {{ g }}
          </view>
        </view>
      </scroll-view>

      <!-- 置顶分区 -->
      <view v-if="pinnedList.length" class="hp-sec">
        <text class="hp-sec-title">置顶</text>
        <view
          v-for="r in pinnedList"
          :key="r.id"
          :class="['hp-card', manageMode && selected.has(r.id) && 'hp-card-sel']"
          @tap="onCardTap(r)"
        >
          <view v-if="manageMode" :class="['hp-check', selected.has(r.id) && 'hp-check-on']">
            <text v-if="selected.has(r.id)" class="hp-tick">✓</text>
          </view>
          <slot name="card" :rec="r.raw" :pinned="true" />
        </view>
      </view>

      <!-- 全部分区 -->
      <view class="hp-sec">
        <text v-if="pinnedList.length" class="hp-sec-title">全部</text>
        <view v-if="!filtered.length" class="hp-empty">
          <text class="hp-empty-txt">{{ keyword ? '没有匹配的记录' : emptyText }}</text>
          <view v-if="!keyword && backHref" class="hp-empty-cta" @tap="goTool">
            <text class="hp-empty-cta-txt">{{ ctaText }}</text>
          </view>
        </view>
        <view
          v-for="r in normalList"
          :key="r.id"
          :class="['hp-card', manageMode && selected.has(r.id) && 'hp-card-sel']"
          @tap="onCardTap(r)"
        >
          <view v-if="manageMode" :class="['hp-check', selected.has(r.id) && 'hp-check-on']">
            <text v-if="selected.has(r.id)" class="hp-tick">✓</text>
          </view>
          <slot name="card" :rec="r.raw" :pinned="false" />
        </view>
      </view>
    </view>

    <!-- 批量操作栏 -->
    <view v-if="manageMode && selCount > 0" class="hp-bar">
      <view v-if="groups && groups.length" class="hp-bar-btn hp-bar-ghost" @tap="groupPickerOpen = true">
        <AppIcon name="folder" :size="32" color="#C41E3A" />
        <text class="hp-bar-t hp-bar-t-red">分组</text>
      </view>
      <view class="hp-bar-btn hp-bar-ghost" @tap="doPin">
        <AppIcon name="pin" :size="32" color="#C41E3A" />
        <text class="hp-bar-t hp-bar-t-red">置顶/取消</text>
      </view>
      <view class="hp-bar-btn hp-bar-danger" @tap="doDelete">
        <AppIcon name="trash-2" :size="32" color="#ffffff" />
        <text class="hp-bar-t hp-bar-t-white">删除（{{ selCount }}）</text>
      </view>
    </view>

    <!-- 分组选择弹窗 -->
    <view v-if="groupPickerOpen" class="hp-mask" @tap="groupPickerOpen = false">
      <view class="hp-sheet" @tap.stop>
        <text class="hp-sheet-title">移动到分组</text>
        <view v-for="g in groups" :key="g" class="hp-sheet-item" @tap="doGroup(g)">{{ g }}</view>
        <view class="hp-sheet-cancel" @tap="groupPickerOpen = false">取消</view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.hp {
  min-height: 100vh;
  background: var(--bg-page, #faf8f5);
  padding-bottom: 180rpx;
}
.hp-manage {
  font-size: 28rpx;
  color: #c41e3a;
  padding: 0 8rpx;
}
.hp-body {
  padding: 24rpx 32rpx;
}

.hp-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 76rpx;
  padding: 0 24rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #fff;
}
.hp-input {
  flex: 1;
  height: 76rpx;
  font-size: 26rpx;
  color: #3d2f22;
}
.hp-ph {
  color: #b0a494;
}
.hp-clear {
  font-size: 26rpx;
  color: #8a7a68;
  padding: 0 8rpx;
}

.hp-groups {
  margin-top: 20rpx;
  white-space: nowrap;
}
.hp-groups-row {
  display: inline-flex;
  gap: 12rpx;
}
.hp-group {
  padding: 0 24rpx;
  height: 56rpx;
  line-height: 56rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 999rpx;
  background: #fff;
  font-size: 24rpx;
  color: #8a7a68;
}
.hp-group-on {
  background: #c41e3a;
  border-color: #c41e3a;
  color: #fff;
}

.hp-sec {
  margin-top: 24rpx;
}
.hp-sec-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 22rpx;
  color: #8a7a68;
}
.hp-card {
  position: relative;
  margin-bottom: 16rpx;
  padding: 20rpx 24rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #fff;
}
.hp-card-sel {
  border-color: #c41e3a;
  box-shadow: 0 0 0 2rpx rgba(196, 30, 58, 0.2);
}
.hp-check {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  z-index: 2;
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid rgba(138, 122, 104, 0.4);
  border-radius: 50%;
  background: #fff;
}
.hp-check-on {
  border-color: #c41e3a;
  background: #c41e3a;
}
.hp-tick {
  display: block;
  width: 100%;
  text-align: center;
  line-height: 34rpx;
  color: #fff;
  font-size: 24rpx;
}
.hp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  text-align: center;
  border: 1rpx dashed #e7e0d5;
  border-radius: 16rpx;
}
.hp-empty-txt {
  font-size: 26rpx;
  color: #8a7a68;
}
.hp-empty-cta {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.hp-empty-cta-txt {
  font-size: 26rpx;
  color: #fff;
}

.hp-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #e7e0d5;
  background: rgba(255, 255, 255, 0.96);
}
.hp-bar-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 84rpx;
  border-radius: 16rpx;
}
.hp-bar-ghost {
  border: 1rpx solid #c41e3a;
  background: #fff;
}
.hp-bar-danger {
  background: #c41e3a;
}
.hp-bar-t {
  font-size: 26rpx;
  font-weight: 500;
}
.hp-bar-t-red {
  color: #c41e3a;
}
.hp-bar-t-white {
  color: #fff;
}

.hp-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}
.hp-sheet {
  width: 100%;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
  background: #fff;
}
.hp-sheet-title {
  display: block;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #8a7a68;
}
.hp-sheet-item {
  padding: 28rpx 0;
  text-align: center;
  font-size: 30rpx;
  color: #3d2f22;
  border-top: 1rpx solid #f0ebe3;
}
.hp-sheet-cancel {
  margin-top: 16rpx;
  padding: 28rpx 0;
  text-align: center;
  font-size: 30rpx;
  color: #8a7a68;
  border-radius: 16rpx;
  background: #f5f1ea;
}
</style>
