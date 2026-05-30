<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="notes.length" class="list">
      <view v-for="n in notes" :key="n.id" class="note-card">
        <text class="note-content">{{ n.content }}</text>
        <text class="note-ref">{{ n.bookTitle || n.chapterTitle }}</text>
        <text class="note-time">{{ n.createdAt?.slice(0, 10) }}</text>
        <view class="note-actions">
          <button class="btn-edit" @click="editNote(n)">编辑</button>
          <button class="btn-del" @click="deleteNote(n)">删除</button>
        </view>
      </view>
    </view>
    <EmptyState v-else text="暂无笔记" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { classicApi } from '../../api'

const loading = ref(true)
const notes = ref<any[]>([])

onMounted(async () => {
  try {
    const res: any = await classicApi.listNotes()
    notes.value = Array.isArray(res) ? res : res?.data || res?.list || []
  } catch {} finally { loading.value = false }
})

function editNote(n: any) { uni.showToast({ title: '编辑功能', icon: 'none' }) }
async function deleteNote(n: any) {
  try { await classicApi.deleteNote(n.id); notes.value = notes.value.filter(x => x.id !== n.id) } catch {}
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.note-card { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.note-content { font-size: 14px; line-height: 1.6; display: block; }
.note-ref { font-size: 12px; color: #C9A96E; margin-top: 6px; display: block; }
.note-time { font-size: 11px; color: #ccc; display: block; }
.note-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.btn-edit { padding: 4px 14px; background: #F5F0E8; border-radius: 12px; font-size: 12px; border: none; }
.btn-del { padding: 4px 14px; background: #FFF0F0; color: #C41E3A; border-radius: 12px; font-size: 12px; border: none; }
</style>
