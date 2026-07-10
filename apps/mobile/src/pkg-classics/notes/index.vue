<template>
  <view class="nt-page">
    <!-- 顶部导航 -->
    <view class="nt-header">
      <view class="nt-nav">
        <view class="nt-nav-left">
          <view class="nt-back" @tap="goBack">
            <app-icon name="arrow-left" :size="40" color="#6b6355" />
          </view>
          <view class="nt-title-wrap">
            <text class="nt-title">我的笔记</text>
            <text v-if="!loading && !isGuest && !error && notes.length" class="nt-title-sub">共 {{ notes.length }} 条 · 点卡片回到书中章节</text>
          </view>
        </view>
        <view class="nt-nav-right">
          <template v-if="isSelectMode">
            <view class="nt-tbtn" @tap="exitSelect">
              <text class="nt-tbtn-text">取消</text>
            </view>
            <view class="nt-tbtn nt-tbtn--danger" :class="{ 'nt-tbtn--disabled': selectedIds.size === 0 }" @tap="batchDelete">
              <text class="nt-tbtn-text nt-tbtn-text--danger">删除 ({{ selectedIds.size }})</text>
            </view>
          </template>
          <view v-else class="nt-icon-btn" @tap="openManageMenu">
            <app-icon name="more-vertical" :size="32" color="#999999" />
          </view>
        </view>
      </view>

      <!-- 搜索和视图切换 -->
      <view class="nt-toolbar">
        <view class="nt-search">
          <app-icon name="search" :size="28" color="#999999" />
          <input v-model="searchValue" class="nt-search-input" placeholder="搜索笔记内容..." placeholder-class="nt-ph" />
        </view>
        <view class="nt-toggle">
          <view class="nt-toggle-btn" :class="{ 'nt-toggle-btn--active': viewMode === 'timeline' }" @tap="viewMode = 'timeline'">
            <text class="nt-toggle-text" :class="{ 'nt-toggle-text--active': viewMode === 'timeline' }">时间线</text>
          </view>
          <view class="nt-toggle-btn" :class="{ 'nt-toggle-btn--active': viewMode === 'book' }" @tap="viewMode = 'book'">
            <text class="nt-toggle-text" :class="{ 'nt-toggle-text--active': viewMode === 'book' }">按书籍</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <view class="nt-body">
      <!-- 加载态 -->
      <view v-if="loading" class="nt-empty">
        <text class="nt-empty-title">加载中...</text>
      </view>
      <!-- 未登录态 -->
      <view v-else-if="isGuest" class="nt-empty">
        <view class="nt-empty-icon"><app-icon name="file-text" :size="64" color="#999999" /></view>
        <text class="nt-empty-title">登录后查看笔记</text>
        <text class="nt-empty-sub">笔记会自动同步到你的账号</text>
        <view class="nt-empty-btn" @tap="goLogin"><text class="nt-empty-btn-text">去登录</text></view>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="nt-empty">
        <text class="nt-empty-title">{{ error }}</text>
        <view class="nt-empty-btn" @tap="fetchData">
          <text class="nt-empty-btn-text">重试</text>
        </view>
      </view>
      <!-- 空状态 -->
      <view v-else-if="filtered.length === 0" class="nt-empty">
        <view class="nt-empty-icon">
          <app-icon name="file-text" :size="64" color="#c41e3a" />
        </view>
        <text class="nt-empty-verse">不动笔墨，不读书</text>
        <text class="nt-empty-sub">阅读时点底部「笔记」，记下所思所悟</text>
        <view class="nt-empty-btn" @tap="goHome">
          <text class="nt-empty-btn-text">去读书</text>
        </view>
      </view>

      <!-- 时间线视图 -->
      <view v-else-if="viewMode === 'timeline'" class="nt-list">
        <view
          v-for="note in filtered"
          :key="note.id"
          class="nt-card"
          :class="{ 'nt-card--selected': selectedIds.has(note.id) }"
          @tap="onCardTap(note)"
        >
          <view class="nt-card-head">
            <view class="nt-card-book">
              <text class="nt-card-book-title">{{ note.bookTitle }}</text>
              <view class="nt-chapter-chip"><text class="nt-chapter-chip-text">{{ note.chapter || '未知章节' }}</text></view>
            </view>
            <view v-if="!isSelectMode" class="nt-icon-btn" @tap.stop="openItemMenu(note.id)">
              <app-icon name="more-vertical" :size="32" color="#a89e8c" />
            </view>
          </view>

          <!-- 原文引用（旧数据无摘录则隐藏） -->
          <view v-if="note.originalText" class="nt-quote">
            <text class="nt-quote-text">{{ note.originalText }}</text>
          </view>

          <!-- 笔记内容 -->
          <text class="nt-content">{{ note.noteContent }}</text>

          <!-- 标签和时间 -->
          <view class="nt-meta">
            <view class="nt-tags">
              <template v-if="note.tags.length">
                <app-icon name="tag" :size="22" color="#a89e8c" />
                <view v-for="(tag, i) in note.tags" :key="i" class="nt-tag">
                  <text class="nt-tag-text">{{ tag }}</text>
                </view>
              </template>
              <view v-else class="nt-time">
                <app-icon name="clock" :size="22" color="#a89e8c" />
                <text class="nt-time-text">{{ note.updatedAt }}</text>
              </view>
            </view>
            <view v-if="!isSelectMode" class="nt-goto">
              <text class="nt-goto-text">回到原文</text>
              <app-icon name="chevron-right" :size="24" color="#c41e3a" />
            </view>
          </view>
        </view>
      </view>

      <!-- 按书籍分组视图 -->
      <view v-else class="nt-groups">
        <view v-for="group in grouped" :key="group.bookId" class="nt-group">
          <view class="nt-group-head" @tap="goBook(group.bookId)">
            <view class="nt-group-left">
              <flat-cover
                :title="group.bookTitle"
                :cover-color="coverColorForBook(group.bookTitle)"
                title-size="18rpx"
                class="nt-group-cover"
              />
              <view class="nt-group-info">
                <text class="nt-group-title">《{{ group.bookTitle }}》</text>
                <text class="nt-group-author">{{ group.dynasty ? `[${group.dynasty}] ` : '' }}{{ group.bookAuthor || '佚名' }}</text>
              </view>
            </view>
            <view class="nt-group-right">
              <text class="nt-group-count">{{ group.count }}条笔记</text>
              <app-icon name="chevron-right" :size="28" color="#999999" />
            </view>
          </view>
          <view class="nt-group-items">
            <view
              v-for="note in group.items"
              :key="note.id"
              class="nt-subcard"
              :class="{ 'nt-card--selected': selectedIds.has(note.id) }"
              @tap="onCardTap(note)"
            >
              <view class="nt-subcard-locrow">
                <text class="nt-subcard-loc">{{ note.chapter || '未知章节' }}</text>
                <text class="nt-subcard-time">{{ note.updatedAt.slice(0, 10) }}</text>
              </view>
              <text v-if="note.originalText" class="nt-subcard-quote">{{ note.originalText }}</text>
              <text class="nt-subcard-content">{{ note.noteContent }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    <!-- 编辑笔记 -->
    <view v-if="editing" class="nt-edit-mask" @tap="editing = false">
      <view class="nt-edit-sheet" @tap.stop>
        <text class="nt-edit-title">编辑笔记</text>
        <textarea v-model="editText" class="nt-edit-area" :maxlength="2000" />
        <view class="nt-edit-save" :class="{ 'nt-edit-disabled': !editText.trim() || editSubmitting }" @tap="saveEdit">
          <text>{{ editSubmitting ? '保存中…' : '保存' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { classicsApi, type NoteItem } from '@/lib/classics-data'
import { getToken } from '@/utils/storage'

const searchValue = ref('')
const selectedIds = ref<Set<string>>(new Set())
const isSelectMode = ref(false)
const notes = ref<NoteItem[]>([])
const viewMode = ref<'timeline' | 'book'>('timeline')
const loading = ref(true)
const error = ref('')
const isGuest = ref(false)
const editing = ref(false)
const editId = ref('')
const editText = ref('')
const editSubmitting = ref(false)

async function fetchData() {
  if (!getToken()) { isGuest.value = true; loading.value = false; return }
  isGuest.value = false
  loading.value = true
  error.value = ''
  try {
    notes.value = await classicsApi.notes()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

const filtered = computed(() =>
  notes.value.filter(
    (note) =>
      note.noteContent.includes(searchValue.value) ||
      note.originalText.includes(searchValue.value) ||
      note.bookTitle.includes(searchValue.value) ||
      note.tags.some((t) => t.includes(searchValue.value)),
  ),
)

const grouped = computed(() => {
  const groups: Record<string, NoteItem[]> = {}
  filtered.value.forEach((note) => {
    if (!groups[note.bookId]) groups[note.bookId] = []
    groups[note.bookId].push(note)
  })
  return Object.entries(groups).map(([bookId, items]) => ({
    bookId,
    bookTitle: items[0].bookTitle,
    bookAuthor: items[0].bookAuthor,
    dynasty: items[0].dynasty,
    count: items.length,
    items,
  }))
})

/** 点卡片：选择模式下切选中，否则回到书中对应章节 */
function onCardTap(note: NoteItem) {
  if (isSelectMode.value) { toggleSelect(note.id); return }
  goReaderAt(note)
}
function goReaderAt(note: NoteItem) {
  if (!note.bookId) { uni.showToast({ title: '书籍信息缺失', icon: 'none' }); return }
  let url = `/pkg-classics/reader/index?bookId=${note.bookId}`
  if (note.chapterId) url += `&chapterId=${note.chapterId}`
  uni.navigateTo({ url })
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}
function exitSelect() {
  isSelectMode.value = false
  selectedIds.value = new Set()
}
async function batchDelete() {
  if (selectedIds.value.size === 0) return
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map((id) => classicsApi.removeNote(id)))
    notes.value = notes.value.filter((note) => !ids.includes(note.id))
    exitSelect()
    uni.showToast({ title: '已删除', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
    fetchData()
  }
}
async function deleteItem(id: string) {
  try {
    await classicsApi.removeNote(id)
    notes.value = notes.value.filter((note) => note.id !== id)
    uni.showToast({ title: '已删除', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
  }
}
function openManageMenu() {
  uni.showActionSheet({
    itemList: ['批量管理'],
    success: () => {
      isSelectMode.value = true
    },
  })
}
function openItemMenu(id: string) {
  const note = notes.value.find((n) => n.id === id)
  uni.showActionSheet({
    itemList: ['编辑', '回到原文位置', '删除'],
    success: (res) => {
      if (res.tapIndex === 0 && note) openEdit(note)
      else if (res.tapIndex === 1 && note) goReaderAt(note)
      else if (res.tapIndex === 2) deleteItem(id)
    },
  })
}
function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.navigateTo({ url: '/pkg-classics/home/index' }) })
}
function goBook(id: string) {
  uni.navigateTo({ url: `/pkg-classics/detail/index?id=${id}` })
}
function goHome() {
  uni.navigateTo({ url: '/pkg-classics/home/index' })
}
function goLogin() {
  uni.navigateTo({ url: '/pkg-auth/login/index' })
}
function openEdit(note: NoteItem) {
  editId.value = note.id
  editText.value = note.noteContent
  editing.value = true
}
async function saveEdit() {
  const c = editText.value.trim()
  if (!c || editSubmitting.value) return
  editSubmitting.value = true
  try {
    await classicsApi.updateNote(editId.value, c)
    const n = notes.value.find((x) => x.id === editId.value)
    if (n) n.noteContent = c
    editing.value = false
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    editSubmitting.value = false
  }
}
</script>

<style scoped lang="scss">
.nt-edit-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, 0.45); display: flex; align-items: flex-end; }
.nt-edit-sheet { width: 100%; background: var(--background, #fff); border-radius: 32rpx 32rpx 0 0; padding: 32rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.nt-edit-title { font-size: 32rpx; font-weight: 600; color: var(--foreground, #2c2c2c); }
.nt-edit-area { margin-top: 24rpx; width: 100%; box-sizing: border-box; height: 280rpx; padding: 24rpx; background: var(--secondary, #f5f5f5); border-radius: 16rpx; font-size: 28rpx; line-height: 1.7; color: var(--foreground, #2c2c2c); }
.nt-edit-save { margin-top: 24rpx; height: 88rpx; border-radius: 20rpx; background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; }
.nt-edit-disabled { opacity: 0.5; }
.nt-page {
  min-height: 100vh;
  background: var(--classics-bg, #f4f2ee);
  padding-bottom: 48rpx;
}
.nt-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--classics-bg, #f4f2ee);
  border-bottom: 1rpx solid rgba(196, 30, 58, 0.08);
}
.nt-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.nt-nav-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.nt-back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nt-title-wrap {
  display: flex;
  flex-direction: column;
}
.nt-title {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2c2c;
  letter-spacing: 2rpx;
}
.nt-title-sub {
  font-size: 20rpx;
  color: #a89e8c;
  margin-top: 2rpx;
}
.nt-nav-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nt-icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nt-tbtn {
  height: 56rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  border-radius: 12rpx;
}
.nt-tbtn--danger {
  background: var(--brand);
}
.nt-tbtn--disabled {
  opacity: 0.5;
}
.nt-tbtn-text {
  font-size: 26rpx;
  color: var(--foreground);
}
.nt-tbtn-text--danger {
  color: #ffffff;
}
.nt-toolbar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx 24rpx;
}
.nt-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 1rpx solid rgba(0, 0, 0, 0.05);
}
.nt-search-input {
  flex: 1;
  font-size: 28rpx;
  color: #2c2c2c;
}
.nt-ph {
  color: #b8ae9c;
}
.nt-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 999rpx;
  padding: 4rpx;
}
.nt-toggle-btn {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
}
.nt-toggle-btn--active {
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}
.nt-toggle-text {
  font-size: 24rpx;
  color: #a89e8c;
}
.nt-toggle-text--active {
  color: var(--brand, #c41e3a);
  font-weight: 600;
}
.nt-body {
  padding: 32rpx;
}
.nt-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.nt-card {
  padding: 32rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  &:active { box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.08); }
}
.nt-card--selected {
  box-shadow: 0 0 0 4rpx var(--brand, #c41e3a);
}
.nt-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.nt-card-book {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16rpx;
}
.nt-card-book-title {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.nt-chapter-chip {
  padding: 4rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
}
.nt-chapter-chip-text {
  font-size: 22rpx;
  color: var(--brand, #c41e3a);
  font-weight: 500;
}
.nt-quote {
  padding: 16rpx 24rpx;
  border-left: 6rpx solid rgba(196, 30, 58, 0.35);
  background: var(--classics-bg, #f4f2ee);
  border-radius: 0 16rpx 16rpx 0;
  margin-bottom: 20rpx;
}
.nt-quote-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: #4a4136;
  font-family: var(--font-serif, 'Noto Serif SC', serif);
}
.nt-content {
  font-size: 28rpx;
  line-height: 1.7;
  color: #4a4136;
  margin-bottom: 20rpx;
  display: block;
}
.nt-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nt-tags {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.nt-tag {
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.06);
}
.nt-tag-text {
  font-size: 20rpx;
  color: var(--brand, #c41e3a);
}
.nt-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.nt-time-text {
  font-size: 22rpx;
  color: #a89e8c;
}
.nt-goto {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.nt-goto-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--brand, #c41e3a);
}
.nt-groups {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.nt-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 20rpx;
}
.nt-group-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
/* 分组头书封：flat-cover 仿真书（只给宽度，高度由组件内部 3:4 撑出） */
.nt-group-cover {
  width: 64rpx;
  flex-shrink: 0;
}
.nt-group-title {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.nt-group-author {
  font-size: 24rpx;
  color: #a89e8c;
}
.nt-group-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.nt-group-count {
  font-size: 24rpx;
  color: var(--brand, #c41e3a);
}
.nt-group-items {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-left: 32rpx;
  border-left: 4rpx solid rgba(196, 30, 58, 0.12);
  margin-left: 32rpx;
}
.nt-subcard {
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  &:active { box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.07); }
}
.nt-subcard-locrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.nt-subcard-loc {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--brand, #c41e3a);
}
.nt-subcard-time {
  font-size: 20rpx;
  color: #a89e8c;
}
.nt-subcard-quote {
  font-size: 28rpx;
  color: #6b4f2a;
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.nt-subcard-content {
  font-size: 28rpx;
  line-height: 1.7;
  color: #4a4136;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.nt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 128rpx 0;
  text-align: center;
}
.nt-empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}
.nt-empty-verse {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 34rpx;
  font-weight: 700;
  color: #2c2c2c;
  letter-spacing: 2rpx;
  margin-bottom: 16rpx;
}
.nt-empty-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 8rpx;
}
.nt-empty-sub {
  font-size: 26rpx;
  color: #a89e8c;
  margin-bottom: 40rpx;
  line-height: 1.6;
}
.nt-empty-btn {
  height: 80rpx;
  padding: 0 64rpx;
  border-radius: 999rpx;
  background: var(--brand, #c41e3a);
  box-shadow: 0 4rpx 16rpx rgba(196, 30, 58, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { opacity: 0.85; }
}
.nt-empty-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}
</style>
