<template>
  <view class="page">
    <view
      v-if="loading"
      class="loading-state"
    >
      <text class="loading-text">
        加载中...
      </text>
    </view>

    <template v-else>
      <view
        v-if="activeBuys.length"
        class="section"
      >
        <view class="section-header">
          <text class="section-title">
            👥 拼团优惠
          </text>
          <text class="section-sub">
            {{ activeBuys.length }}个活动进行中
          </text>
        </view>
        <view
          v-for="gb in activeBuys"
          :key="gb.id"
          class="gb-card"
          @click="goDetail(gb)"
        >
          <image
            :src="gb.cover || gb.images?.[0]"
            class="gb-img"
            mode="aspectFill"
          />
          <view class="gb-info">
            <text class="gb-name">
              {{ gb.title || gb.name }}
            </text>
            <view class="gb-price-row">
              <text class="gb-price">
                ¥{{ gb.groupPrice }}
              </text>
              <text class="gb-original">
                ¥{{ gb.originalPrice }}
              </text>
            </view>
            <view class="gb-meta">
              <text class="gb-count">
                {{ gb.minCount }}人成团
              </text>
              <text class="gb-joined">
                {{ gb.joinedCount || 0 }}人参团
              </text>
            </view>
          </view>
          <view
            class="gb-btn"
            @click.stop="joinBuy(gb)"
          >
            去拼团
          </view>
        </view>
      </view>

      <view
        v-if="!loading && !activeBuys.length"
        class="empty"
      >
        <text class="empty-icon">
          👥
        </text>
        <text>暂无拼团活动</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { marketingApi } from "../../api";

const loading = ref(true);
const activeBuys = ref<any[]>([]);

onMounted(async () => {
  try {
    const data = await marketingApi.groupBuys({ page: 1, pageSize: 20 });
    const list = data?.groupBuys || data?.data || [];
    const now = Date.now();
    activeBuys.value = list.filter(
      (gb: any) => new Date(gb.startTime).getTime() <= now && new Date(gb.endTime).getTime() > now,
    );
  } catch { /* */ } finally {
    loading.value = false;
  }
});

async function joinBuy(gb: any) {
  try {
    await marketingApi.joinGroupBuy(gb.id);
    uni.showToast({ title: "拼团成功", icon: "success" });
  } catch (e: any) {
    uni.showToast({ title: e?.message || "拼团失败", icon: "none" });
  }
}

function goDetail(gb: any) {
  if (gb.productId) {
    uni.navigateTo({ url: `/pages/shop/product-detail?id=${gb.productId}` });
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 20px; }

.loading-state { display: flex; justify-content: center; padding: 80px 0; }
.loading-text { color: #999; font-size: 14px; }

.section { background: #fff; margin: 0 0 8px; padding: 16px; }
.section-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.section-title { font-size: 17px; font-weight: bold; color: #2C2C2C; }
.section-sub { font-size: 12px; color: #999; }

.gb-card { display: flex; gap: 10px; padding: 12px 0; border-bottom: 1px solid #F5F0E8; align-items: center; }
.gb-card:last-child { border-bottom: none; }
.gb-img { width: 80px; height: 80px; border-radius: 8px; flex-shrink: 0; }
.gb-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.gb-name { font-size: 14px; color: #2C2C2C; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.gb-price-row { display: flex; align-items: baseline; gap: 6px; }
.gb-price { font-size: 18px; font-weight: bold; color: #e67e22; }
.gb-original { font-size: 12px; color: #bbb; text-decoration: line-through; }
.gb-meta { display: flex; gap: 12px; }
.gb-count, .gb-joined { font-size: 11px; color: #999; }
.gb-btn { padding: 8px 18px; background: linear-gradient(135deg, #e67e22, #d35400); color: #fff; border-radius: 18px; font-size: 13px; flex-shrink: 0; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 80px 0; color: #999; font-size: 14px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
</style>
