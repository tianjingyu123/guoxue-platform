<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">古籍馆</text>
      <text class="hero-sub">品读经典，传承智慧</text>
      <SearchBar v-model="keyword" @search="doSearch" />
    </view>
    <scroll-view scroll-x class="cat-nav">
      <view v-for="c in cats" :key="c" class="cat-item" :class="{ active: activeCat === c }" @click="activeCat = c; fetchBooks()">{{ c }}</view>
    </scroll-view>
    <LoadingSkeleton v-if="loading" type="card" />
    <view v-else-if="books.length" class="book-grid">
      <view v-for="b in books" :key="b.id" class="book-card" @click="goBook(b)">
        <image :src="b.cover || ''" class="book-cover" mode="aspectFill" />
        <text class="book-title">{{ b.title || b.name }}</text>
        <text class="book-author">{{ b.author || b.dynasty }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无古籍" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import SearchBar from '../../components/SearchBar.vue'
import { classicApi } from '../../api'

const loading = ref(true)
const books = ref<any[]>([])
const keyword = ref('')
const activeCat = ref('全部')
const cats = ref(['全部', '经部', '史部', '子部', '集部'])

onMounted(() => fetchBooks())

async function fetchBooks() {
  loading.value = true
  try {
    const params: any = {}
    if (activeCat.value !== '全部') params.category = activeCat.value
    if (keyword.value) params.keyword = keyword.value
    const res: any = await classicApi.books(params)
    books.value = Array.isArray(res) ? res : res?.data || res?.list || []
  } catch {} finally { loading.value = false }
}
function doSearch() { fetchBooks() }
function goBook(b: any) { uni.navigateTo({ url: `/pages/classics/classic-detail?id=${b.id}` }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.hero { background: linear-gradient(135deg, #5a3a1a, #8b6914); padding: 20px 16px 16px; text-align: center; }
.hero-title { font-size: 24px; font-weight: bold; color: #fff; font-family: 'Noto Serif SC', serif; }
.hero-sub { font-size: 13px; color: rgba(255,255,255,0.7); display: block; margin: 6px 0 12px; }
.cat-nav { white-space: nowrap; padding: 10px; background: #fff; }
.cat-item { display: inline-block; padding: 6px 16px; margin-right: 8px; border-radius: 14px; font-size: 13px; background: #F5F0E8; color: #666; }
.cat-item.active { background: #8b6914; color: #fff; }
.book-grid { display: flex; flex-wrap: wrap; padding: 12px; gap: 10px; }
.book-card { width: calc(33.33% - 7px); text-align: center; }
.book-cover { width: 100%; height: 140px; border-radius: 8px; background: #eee; }
.book-title { font-size: 13px; font-weight: 500; display: block; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-author { font-size: 11px; color: #999; display: block; }
</style>
