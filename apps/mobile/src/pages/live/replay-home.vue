<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <swiper class="banner-swiper" circular autoplay>
        <swiper-item v-for="r in featured" :key="r.id"><view class="banner-slide" @click="goPlay(r)"><image :src="r.cover || ''" class="banner-img" mode="aspectFill" /><text class="banner-title">{{ r.title }}</text></view></swiper-item>
      </swiper>
      <view class="section"><text class="section-title">精选回放</text>
        <view class="grid"><view v-for="r in replays" :key="r.id" class="card" @click="goPlay(r)"><image :src="r.cover || ''" class="card-img" mode="aspectFill" /><text class="card-title">{{ r.title }}</text></view></view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { liveApi } from '../../api'

const loading = ref(true)
const featured = ref<any[]>([])
const replays = ref<any[]>([])

onMounted(async () => {
  try {
    const res: any = await liveApi.rooms({ status: 'ENDED', pageSize: 10 })
    const list = Array.isArray(res) ? res : res?.data || res?.list || []
    featured.value = list.slice(0, 3)
    replays.value = list.slice(3)
  } catch {} finally { loading.value = false }
})

function goPlay(r: any) { uni.navigateTo({ url: `/pages/live/replay-player?id=${r.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.banner-swiper { height: 180px; margin: 12px; border-radius: 12px; overflow: hidden; }
.banner-slide { position: relative; }
.banner-img { width: 100%; height: 100%; }
.banner-title { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: #fff; padding: 8px 12px; font-size: 14px; }
.section { padding: 12px; }
.section-title { font-size: 16px; font-weight: 500; margin-bottom: 10px; display: block; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.card { background: #fff; border-radius: 10px; overflow: hidden; }
.card-img { width: 100%; height: 100px; }
.card-title { font-size: 13px; padding: 8px; display: block; }
</style>
