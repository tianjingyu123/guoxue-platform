<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else class="container">
      <scroll-view scroll-y class="left-menu">
        <view v-for="cat in categories" :key="cat.id" class="menu-item" :class="{ active: activeCat === cat.id }" @click="activeCat = cat.id; fetchRight()">
          <text>{{ cat.name }}</text>
        </view>
      </scroll-view>
      <scroll-view scroll-y class="right-grid">
        <view v-for="sub in subCategories" :key="sub.id" class="sub-item" @click="goProducts(sub)">
          <image :src="sub.icon || ''" class="sub-icon" mode="aspectFill" />
          <text class="sub-name">{{ sub.name }}</text>
        </view>
        <EmptyState v-if="!subCategories.length" text="暂无分类" />
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { shopApi } from '../../api'

const loading = ref(true)
const activeCat = ref('')
const categories = ref<any[]>([])
const subCategories = ref<any[]>([])

onMounted(async () => {
  try {
    const res: any = await shopApi.categoryTree()
    categories.value = Array.isArray(res) ? res : res?.data || res?.list || []
    if (categories.value.length) { activeCat.value = categories.value[0].id; updateSubs() }
  } catch {} finally { loading.value = false }
})

function updateSubs() {
  const cat = categories.value.find(c => c.id === activeCat.value)
  subCategories.value = cat?.children || cat?.subCategories || []
}
function fetchRight() { updateSubs() }
function goProducts(sub: any) {
  uni.navigateTo({ url: `/pages/shop/shop?categoryId=${sub.id}` })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.container { display: flex; height: 100vh; }
.left-menu { width: 100px; background: #fff; }
.menu-item { padding: 16px 10px; text-align: center; font-size: 13px; color: #666; border-left: 3px solid transparent; }
.menu-item.active { color: #C41E3A; border-left-color: #C41E3A; background: #FFF0F0; font-weight: 500; }
.right-grid { flex: 1; background: #fff; padding: 12px; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 10px; }
.sub-item { width: calc(33.33% - 7px); text-align: center; }
.sub-icon { width: 50px; height: 50px; border-radius: 50%; background: #eee; margin: 0 auto; }
.sub-name { font-size: 12px; display: block; margin-top: 6px; }
</style>
