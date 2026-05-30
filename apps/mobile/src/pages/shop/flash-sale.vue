<template>
  <view class="page">
    <view v-if="loading" class="loading-state"><text class="loading-text">加载中...</text></view>

    <template v-else>
      <!-- 进行中的秒杀 -->
      <view v-if="activeSales.length" class="section">
        <view class="section-header">
          <text class="section-title">⚡ 限时秒杀</text>
          <text class="section-sub">手慢无</text>
        </view>
        <scroll-view scroll-x class="flash-scroll" show-scrollbar="false">
          <view v-for="sale in activeSales" :key="sale.id" class="flash-card" @click="goDetail(sale)">
            <view class="flash-img-wrap">
              <image :src="sale.cover || sale.images?.[0]" class="flash-img" mode="aspectFill" />
              <view class="flash-countdown">{{ formatCountdown(sale.endTime) }}</view>
            </view>
            <view class="flash-info">
              <text class="flash-name">{{ sale.title || sale.name }}</text>
              <view class="flash-price-row">
                <text class="flash-price">¥{{ sale.flashPrice }}</text>
                <text class="flash-original">¥{{ sale.originalPrice }}</text>
              </view>
              <view class="flash-progress">
                <view class="progress-bar">
                  <view class="progress-fill" :style="{ width: progressPct(sale) + '%' }" />
                </view>
                <text class="progress-text">{{ sale.soldCount || 0 }}/{{ sale.stock || 0 }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 即将开始 -->
      <view v-if="upcomingSales.length" class="section">
        <view class="section-header">
          <text class="section-title">即将开始</text>
        </view>
        <view v-for="sale in upcomingSales" :key="sale.id" class="upcoming-item">
          <image :src="sale.cover || sale.images?.[0]" class="upcoming-img" mode="aspectFill" />
          <view class="upcoming-info">
            <text class="upcoming-name">{{ sale.title || sale.name }}</text>
            <text class="upcoming-time">{{ formatTime(sale.startTime) }} 开始</text>
          </view>
        </view>
      </view>

      <view v-if="!loading && !activeSales.length && !upcomingSales.length" class="empty">
        <text class="empty-icon">⚡</text>
        <text>暂无秒杀活动</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { marketingApi } from "../../api";

const loading = ref(true);
const activeSales = ref<any[]>([]);
const upcomingSales = ref<any[]>([]);

onMounted(async () => {
  try {
    const data = await marketingApi.flashSales({ page: 1, pageSize: 20 });
    const list = data?.flashSales || data?.data || [];
    const now = Date.now();
    activeSales.value = list.filter((s: any) => new Date(s.startTime).getTime() <= now && new Date(s.endTime).getTime() > now);
    upcomingSales.value = list.filter((s: any) => new Date(s.startTime).getTime() > now);
  } catch { /* */ } finally {
    loading.value = false;
  }
});

function progressPct(sale: any) {
  if (!sale.stock) return 0;
  return Math.min(100, Math.round(((sale.soldCount || 0) / sale.stock) * 100));
}

function formatCountdown(endTime: string) {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "已结束";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTime(t: string) {
  const d = new Date(t);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function goDetail(sale: any) {
  if (sale.productId) {
    uni.navigateTo({ url: `/pages/shop/product-detail?id=${sale.productId}` });
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding: 0 0 20px; }

.loading-state { display: flex; justify-content: center; padding: 80px 0; }
.loading-text { color: #999; font-size: 14px; }

.section { background: #fff; margin: 0 0 8px; padding: 16px; }
.section-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.section-title { font-size: 17px; font-weight: bold; color: #C41E3A; }
.section-sub { font-size: 12px; color: #999; }

.flash-scroll { white-space: nowrap; }
.flash-card { display: inline-block; width: 150px; background: #F5F0E8; border-radius: 10px; overflow: hidden; margin-right: 10px; vertical-align: top; }
.flash-img-wrap { position: relative; }
.flash-img { width: 150px; height: 150px; }
.flash-countdown { position: absolute; bottom: 4px; left: 4px; right: 4px; background: rgba(196,30,58,0.85); color: #fff; font-size: 11px; text-align: center; padding: 2px 0; border-radius: 4px; }
.flash-info { padding: 8px; white-space: normal; }
.flash-name { font-size: 13px; color: #2C2C2C; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.flash-price-row { display: flex; align-items: baseline; gap: 4px; margin-top: 4px; }
.flash-price { font-size: 16px; font-weight: bold; color: #C41E3A; }
.flash-original { font-size: 11px; color: #bbb; text-decoration: line-through; }
.flash-progress { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.progress-bar { flex: 1; height: 6px; background: #E8E0D5; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #ff6b6b); border-radius: 3px; }
.progress-text { font-size: 10px; color: #999; flex-shrink: 0; }

.upcoming-item { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F5F0E8; }
.upcoming-item:last-child { border-bottom: none; }
.upcoming-img { width: 70px; height: 70px; border-radius: 8px; flex-shrink: 0; }
.upcoming-info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.upcoming-name { font-size: 14px; color: #2C2C2C; }
.upcoming-time { font-size: 12px; color: #C9A96E; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 80px 0; color: #999; font-size: 14px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
</style>
