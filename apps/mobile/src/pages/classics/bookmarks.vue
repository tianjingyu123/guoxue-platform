<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="items.length" class="list">
      <view v-for="b in items" :key="b.id" class="item" @click="goChapter(b)">
        <text class="item-title">{{ b.chapterTitle || b.bookTitle || b.title }}</text>
        <text class="item-note">{{ b.note || b.text?.slice(0, 50) }}</text>
        <text class="item-time">{{ b.createdAt?.slice(0, 10) }}</text>
        <button class="btn-del" @click.stop="removeBookmark(b)">删除</button>
      </view>
    </view>
    <EmptyState v-else text="暂无书签" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { classicApi } from '../../api'

const loading = ref(true)
const items = ref<any[]>([])

onMounted(async () => {
  try {
    const res: any = await classicApi.bookmarks()
    items.value = Array.isArray(res) ? res : res?.data || res?.list || []
  } catch {} finally { loading.value = false }
})

async function removeBookmark(b: any) {
  try { await classicApi.deleteBookmark(b.id); items.value = items.value.filter(i => i.id !== b.id) } catch {}
}
function goChapter(b: any) {
  uni.navigateTo({ url: `/pages/reader/reader?chapterId=${b.chapterId}&bookId=${b.bookId}` })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.list { background: #fff; border-radius: 12px; overflow: hidden; }
.item { padding: 14px 16px; border-bottom: 1px solid #f5f5f5; position: relative; }
.item-title { font-size: 15px; font-weight: 500; display: block; }
.item-note { font-size: 12px; color: #999; display: block; margin-top: 4px; }
.item-time { font-size: 11px; color: #ccc; display: block; margin-top: 2px; }
.btn-del { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); padding: 4px 12px; background: #FFF0F0; color: #C41E3A; border-radius: 12px; font-size: 12px; border: none; line-height: 24px; }
</style>
