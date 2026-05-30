<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="detail-header">
        <image :src="book.cover || ''" class="cover" mode="aspectFill" />
        <text class="title">{{ book.title || book.name }}</text>
        <text class="author">{{ book.author || book.dynasty }}</text>
        <text class="desc">{{ book.description || book.intro }}</text>
        <button class="btn-read" @click="startRead">开始阅读</button>
      </view>
      <view class="chapters">
        <text class="section-title">目录（共{{ chapters.length }}章）</text>
        <view v-for="(ch, i) in chapters" :key="ch.id" class="ch-item" @click="goChapter(ch)">
          <text class="ch-num">第{{ i + 1 }}章</text>
          <text class="ch-title">{{ ch.title }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { classicApi } from '../../api'

const loading = ref(true)
const book = ref<any>({})
const chapters = ref<any[]>([])

onMounted(async () => {
  const query = getCurrentPages().pop()?.options || {}
  const id = query.id || ''
  if (!id) { loading.value = false; return }
  try {
    const res: any = await classicApi.bookDetail(id)
    book.value = res || {}
    const chs = (res as any)?.chapters || []
    chapters.value = Array.isArray(chs) ? chs : chs?.data || []
  } catch {} finally { loading.value = false }
})

function startRead() {
  if (chapters.value.length) goChapter(chapters.value[0])
}
function goChapter(ch: any) {
  uni.navigateTo({ url: `/pages/reader/reader?chapterId=${ch.id}&bookId=${book.value.id}` })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.detail-header { background: #fff; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 12px; }
.cover { width: 120px; height: 160px; border-radius: 8px; }
.title { font-size: 20px; font-weight: bold; display: block; margin-top: 12px; }
.author { font-size: 13px; color: #C9A96E; display: block; margin-top: 4px; }
.desc { font-size: 13px; color: #666; display: block; margin-top: 8px; line-height: 1.6; }
.btn-read { width: 180px; height: 40px; background: #C41E3A; color: #fff; border-radius: 20px; border: none; font-size: 15px; margin-top: 12px; line-height: 40px; text-align: center; }
.chapters { background: #fff; border-radius: 12px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; margin-bottom: 10px; display: block; }
.ch-item { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
.ch-num { color: #C41E3A; flex-shrink: 0; }
.ch-title { color: #2C2C2C; }
</style>
