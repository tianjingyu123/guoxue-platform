<template>
  <view class="page">
    <!-- 顶部 - 古典风格 -->
    <view class="classic-header">
      <view class="header-row">
        <text
          class="nav-back"
          @click="goBack"
        >
          ←
        </text>
        <view class="header-brand">
          <text class="header-icon">
            📖
          </text>
          <text class="header-brand-text">
            读书笔记
          </text>
        </view>
        <text
          class="header-create-btn"
          @click="showCreateForm = true"
        >
          ＋ 写笔记
        </text>
      </view>
    </view>

    <!-- 搜索筛选 -->
    <view class="filter-bar">
      <view class="search-input-wrap">
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索笔记内容..."
        >
      </view>
    </view>

    <!-- 创建/编辑笔记表单 -->
    <view
      v-if="showCreateForm"
      class="form-overlay"
      @click="showCreateForm = false"
    >
      <view
        class="form-panel"
        @click.stop
      >
        <view class="form-header">
          <text class="form-title">
            {{ editingNote ? '编辑笔记' : '新建笔记' }}
          </text>
          <text
            class="form-close"
            @click="closeForm"
          >
            ✕
          </text>
        </view>
        <view class="form-body">
          <view class="form-group">
            <text class="form-label">
              关联古籍 <text class="required">
                *
              </text>
            </text>
            <picker
              :value="selectedBookIndex"
              :range="books"
              range-key="title"
              @change="onBookChange"
            >
              <view class="picker-input">
                {{ selectedBook?.title || '请选择古籍' }} ›
              </view>
            </picker>
          </view>
          <view class="form-group">
            <text class="form-label">
              章节 <text class="required">
                *
              </text>
            </text>
            <input
              v-model="formChapter"
              class="form-input"
              placeholder="输入章节名称"
            >
          </view>
          <view class="form-group">
            <text class="form-label">
              笔记内容 <text class="required">
                *
              </text>
            </text>
            <textarea
              v-model="formContent"
              class="form-textarea"
              placeholder="记录你的阅读心得、感悟..."
            />
          </view>
          <view class="form-actions">
            <view
              class="btn btn-outline flex-1"
              @click="closeForm"
            >
              取消
            </view>
            <view
              class="btn btn-primary flex-1"
              @click="handleSaveNote"
            >
              保存
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 笔记列表 -->
    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && filteredNotes.length === 0"
      empty-icon="📝"
      empty-title="暂无笔记"
      empty-description="开始阅读并记录你的心得体会吧"
      @retry="loadNotes"
    >
      <view class="notes-list">
        <view
          v-for="note in filteredNotes"
          :key="note.id"
          class="note-card"
        >
          <view class="note-header">
            <text class="note-book">
              {{ note.bookName }}
            </text>
            <text class="note-chapter">
              · {{ note.chapterName }}
            </text>
            <text class="note-time">
              {{ formatTime(note.createdAt) }}
            </text>
          </view>
          <text class="note-content">
            {{ note.content }}
          </text>
          <view class="note-footer">
            <text
              class="note-action"
              @click="editNote(note)"
            >
              ✏️ 编辑
            </text>
            <text
              class="note-action note-action-del"
              @click="handleDeleteNote(note.id)"
            >
              🗑 删除
            </text>
          </view>
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { classicApi } from '../../api'

interface Note {
  id: number; bookId: number; bookName: string
  chapterId: string; chapterName: string; content: string
  createdAt: string; updatedAt: string
}
interface Book { id: number; title: string; author?: string }

const notes = ref<Note[]>([])
const books = ref<Book[]>([])
const searchQuery = ref('')
const loading = ref(false)
const loadError = ref<string | null>(null)
const showCreateForm = ref(false)
const editingNote = ref<Note | null>(null)
const selectedBookIndex = ref(0)
const formChapter = ref('')
const formContent = ref('')

const selectedBook = computed(() => books.value[selectedBookIndex.value])

const filteredNotes = computed(() => {
  if (!searchQuery.value) return notes.value
  return notes.value.filter(n => n.content.includes(searchQuery.value) || n.bookName.includes(searchQuery.value))
})

onMounted(() => {
  Promise.all([loadNotes(), loadBooks()])
})

async function loadNotes() {
  loading.value = true
  loadError.value = null
  try {
    const res = await classicApi.listNotes()
    if (res?.list) notes.value = res.list
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally { loading.value = false }
}

async function loadBooks() {
  try {
    const res = await classicApi.books()
    if (res?.list) books.value = res.list
  } catch (e) { console.error(e) }
}

function onBookChange(e: any) {
  selectedBookIndex.value = e.detail.value
}

function closeForm() {
  showCreateForm.value = false
  editingNote.value = null
  formChapter.value = ''
  formContent.value = ''
}

function editNote(note: Note) {
  editingNote.value = note
  const idx = books.value.findIndex(b => b.id === note.bookId)
  if (idx >= 0) selectedBookIndex.value = idx
  formChapter.value = note.chapterName
  formContent.value = note.content
  showCreateForm.value = true
}

async function handleSaveNote() {
  if (!selectedBook.value || !formChapter.value || !formContent.value) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  try {
    if (editingNote.value) {
      await classicApi.updateNote(String(editingNote.value.id), formContent.value)
    } else {
      await classicApi.createNote(String(selectedBook.value.id), { chapterId: formChapter.value, content: formContent.value })
    }
    closeForm()
    loadNotes()
    uni.showToast({ title: '保存成功', icon: 'none' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  }
}

async function handleDeleteNote(id: number) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条笔记吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await classicApi.deleteNote(String(id))
          loadNotes()
          uni.showToast({ title: '已删除', icon: 'none' })
        } catch (e: any) {
          uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function formatTime(t: string): string {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: linear-gradient(180deg, #fdf6e3 0%, #F5F0E8 100%); min-height: 100vh; padding-bottom: 30rpx; }

/* 顶部 */
.classic-header { background: linear-gradient(135deg, #92400e, #78350f); color: #fff; padding: 20rpx 24rpx 16rpx; }
.header-row { display: flex; align-items: center; gap: 16rpx; }
.nav-back { font-size: 36rpx; color: #fcd34d; padding: 4rpx; }
.header-brand { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.header-icon { font-size: 36rpx; color: #fcd34d; }
.header-brand-text { font-size: 34rpx; font-weight: 600; font-family: serif; }
.header-create-btn { font-size: 26rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 8rpx 20rpx; border-radius: 24rpx; }

/* 筛选 */
.filter-bar { padding: 16rpx 24rpx; background: #F5F0E8; }
.search-input-wrap { position: relative; }
.search-input { width: 100%; height: 64rpx; padding: 0 20rpx; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; }

/* 笔记列表 */
.notes-list { padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.note-card { background: #fff; border-radius: 16rpx; border: 1rpx solid #E5E1DB; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.note-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.note-book { font-size: 26rpx; font-weight: 600; color: #b45309; }
.note-chapter { font-size: 24rpx; color: #666; }
.note-time { font-size: 22rpx; color: #ccc; margin-left: auto; }
.note-content { display: block; font-size: 26rpx; color: #2C2C2C; line-height: 1.8; margin-bottom: 16rpx; white-space: pre-wrap; }
.note-footer { display: flex; gap: 24rpx; padding-top: 16rpx; border-top: 1rpx solid #F5F0E8; }
.note-action { font-size: 24rpx; color: #C41E3A; }
.note-action-del { color: #999; }

/* 表单弹窗 */
.form-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.form-panel { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; max-height: 80vh; overflow-y: auto; }
.form-header { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-bottom: 1rpx solid #E5E1DB; }
.form-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.form-close { font-size: 32rpx; color: #999; padding: 8rpx; }
.form-body { padding: 24rpx; }
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: #666; margin-bottom: 12rpx; }
.required { color: #ff4d4f; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #F5F0E8; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; }
.form-textarea { width: 100%; padding: 20rpx; background: #F5F0E8; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #2C2C2C; min-height: 240rpx; box-sizing: border-box; }
.picker-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #F5F0E8; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #2C2C2C; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; }
.form-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.flex-1 { flex: 1; }
.btn { display: flex; align-items: center; justify-content: center; padding: 20rpx; border-radius: 12rpx; font-size: 28rpx; font-weight: 500; }
.btn-primary { background: #C41E3A; color: #fff; }
.btn-outline { background: transparent; color: #666; border: 1rpx solid #E5E1DB; }
</style>
