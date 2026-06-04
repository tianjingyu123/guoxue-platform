<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="article">
      <view class="article-header">
        <text class="title">
          {{ article.title }}
        </text>
        <view class="author-row">
          <image
            :src="article.authorAvatar || ''"
            class="avatar"
            mode="aspectFill"
          />
          <text class="author">
            {{ article.author || '国学平台' }}
          </text>
          <text class="time">
            {{ article.createdAt?.slice(0, 10) }}
          </text>
        </view>
      </view>
      <view class="content">
        <rich-text :nodes="article.content || ''" />
      </view>
      <view
        v-if="related.length"
        class="related"
      >
        <text class="section-title">
          推荐内容
        </text>
        <view
          v-for="r in related"
          :key="r.id"
          class="rel-item"
          @click="goDetail(r)"
        >
          <image
            :src="r.cover || ''"
            class="rel-cover"
            mode="aspectFill"
          />
          <text class="rel-title">
            {{ r.title }}
          </text>
        </view>
      </view>
    </view>
    <view class="bottom-bar">
      <view
        class="action"
        @click="toggleLike"
      >
        <text>{{ liked ? '❤️' : '🤍' }} {{ likeCount }}</text>
      </view>
      <view
        class="action"
        @click="showComment"
      >
        <text>💬 评论</text>
      </view>
      <view
        class="action"
        @click="toggleCollect"
      >
        <text>{{ collected ? '⭐' : '☆' }} 收藏</text>
      </view>
      <view
        class="action"
        @click="share"
      >
        <text>↗ 分享</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { contentApi, interactApi } from '../../api'

const loading = ref(true)
const article = ref<any>(null)
const related = ref<any[]>([])
const liked = ref(false)
const collected = ref(false)
const likeCount = ref(0)

onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).id || ''
  if (!id) { loading.value = false; return }
  try {
    const [detail, rel] = await Promise.all([contentApi.detail(id), contentApi.related(id)])
    article.value = detail || {}
    related.value = Array.isArray(rel) ? rel : rel?.data || rel?.list || []
  } catch {} finally { loading.value = false }
})

function toggleLike() { liked.value = !liked.value; likeCount.value += liked.value ? 1 : -1 }
async function toggleCollect() { collected.value = !collected.value }
function showComment() { uni.showToast({ title: '评论功能', icon: 'none' }) }
function share() { uni.showToast({ title: '分享功能', icon: 'none' }) }
function goDetail(r: any) { uni.navigateTo({ url: `/pages/detail/detail?id=${r.id}` }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 50px; }
.article-header { background: #fff; padding: 16px; }
.title { font-size: 20px; font-weight: bold; display: block; }
.author-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.avatar { width: 30px; height: 30px; border-radius: 50%; }
.author { font-size: 13px; color: #666; }
.time { font-size: 12px; color: #999; margin-left: auto; }
.content { padding: 16px; background: #fff; margin-top: 8px; font-size: 15px; line-height: 1.8; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: #fff; border-top: 1px solid #eee; padding: 8px 0 20px; }
.action { flex: 1; text-align: center; font-size: 12px; }
.related { padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; margin-bottom: 10px; display: block; }
.rel-item { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.rel-cover { width: 60px; height: 60px; border-radius: 8px; flex-shrink: 0; }
.rel-title { font-size: 14px; flex: 1; }
</style>
