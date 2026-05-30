<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="topic-header">
        <text class="topic-tag">#{{ tag }}</text>
        <text class="post-count">{{ total }} 篇内容</text>
      </view>
      <view class="posts">
        <ContentCard v-for="p in posts" :key="p.id" :data="p" />
      </view>
      <EmptyState v-if="!posts.length" text="暂无相关内容" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import ContentCard from '../../components/ContentCard.vue'
import { contentApi } from '../../api'

const loading = ref(true)
const tag = ref('')
const total = ref(0)
const posts = ref<any[]>([])

onMounted(async () => {
  tag.value = (getCurrentPages().pop()?.options || {}).tag || ''
  if (!tag.value) { loading.value = false; return }
  uni.setNavigationBarTitle({ title: `#${tag.value}` })
  try {
    const res: any = await contentApi.list({ topic: tag.value, pageSize: 20 })
    const list = Array.isArray(res) ? res : res?.data || res?.list || []
    posts.value = list
    total.value = list.length
  } catch {} finally { loading.value = false }
})
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.topic-header { text-align: center; padding: 20px 16px; background: #fff; }
.topic-tag { font-size: 22px; font-weight: bold; color: #C41E3A; }
.post-count { font-size: 13px; color: #999; display: block; margin-top: 4px; }
.posts { padding: 12px; }
</style>
