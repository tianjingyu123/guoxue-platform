<template>
  <view class="page">
    <scroll-view scroll-x class="cat-nav">
      <view v-for="cat in categories" :key="cat.id" class="cat-item" :class="{ active: activeCat === cat.id }" @click="switchCat(cat.id)">
        <text>{{ cat.name }}</text>
      </view>
    </scroll-view>
    <LoadingSkeleton v-if="loading" type="card" />
    <view v-else-if="items.length" class="grid">
      <view v-for="item in items" :key="item.id" class="card" @click="goDetail(item)">
        <image :src="item.cover || ''" class="card-img" mode="aspectFill" />
        <view class="card-body">
          <text class="card-title">{{ item.title }}</text>
          <text class="card-desc">{{ item.excerpt || item.description }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-else text="暂无内容" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { discoverApi } from '../../api'

const loading = ref(true)
const activeCat = ref('')
const categories = ref<any[]>([])
const items = ref<any[]>([])

onMounted(async () => {
  try {
    const cats: any = await discoverApi.getCategories()
    categories.value = cats?.length ? cats : [
      { id: 'classic', name: '经典' }, { id: 'poetry', name: '诗词' }, { id: 'mingli', name: '命理' },
      { id: 'fengshui', name: '风水' }, { id: 'yangsheng', name: '养生' }, { id: 'wushu', name: '武术' },
      { id: 'chadao', name: '茶道' }, { id: 'shufa', name: '书法' }, { id: 'guohua', name: '国画' },
      { id: 'yinyue', name: '音乐' },
    ]
    if (categories.value.length) { activeCat.value = categories.value[0].id; await fetchItems() }
  } catch {} finally { loading.value = false }
})

async function fetchItems() {
  try {
    const res: any = await discoverApi.getDiscover({ categoryLevel1: activeCat.value })
    items.value = Array.isArray(res) ? res : res?.data || res?.list || []
  } catch {}
}

function switchCat(id: string) { activeCat.value = id; fetchItems() }
function goDetail(item: any) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${item.id}&type=${item._type || 'CONTENT'}` })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.cat-nav { white-space: nowrap; padding: 12px; background: #fff; }
.cat-item { display: inline-block; padding: 8px 16px; margin-right: 8px; border-radius: 16px; font-size: 13px; background: #F5F0E8; color: #666; }
.cat-item.active { background: #C41E3A; color: #fff; }
.grid { display: flex; flex-wrap: wrap; padding: 12px; gap: 8px; }
.card { width: calc(50% - 4px); background: #fff; border-radius: 10px; overflow: hidden; }
.card-img { width: 100%; height: 140px; background: #eee; }
.card-body { padding: 10px; }
.card-title { font-size: 14px; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-desc { font-size: 12px; color: #999; margin-top: 4px; display: block; }
</style>
