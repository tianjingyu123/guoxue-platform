<template>
  <view class="page">
    <!-- 标签切换 -->
    <view class="tabs">
      <text
        v-for="t in tabs"
        :key="t.value"
        class="tab"
        :class="{ active: activeTab === t.value }"
        @click="switchTab(t.value)"
      >{{ t.label }}</text>
    </view>

    <!-- 领券中心 -->
    <template v-if="activeTab === 'center'">
      <scroll-view scroll-y class="coupon-list" refresher-enabled @refresherrefresh="fetchAvailable" :refresher-triggered="refreshing">
        <view v-for="c in availableCoupons" :key="c.id" class="coupon-card" :class="{ claimed: c.claimed }">
          <view class="cc-left">
            <text class="cc-amount" v-if="c.type === 'FULL_REDUCE'">
              <text class="cc-symbol">¥</text>{{ c.reduceAmount || c.value }}
            </text>
            <text class="cc-amount" v-else-if="c.type === 'DISCOUNT'">
              {{ (c.discountRate || c.value || 10) * 10 }}<text class="cc-symbol">折</text>
            </text>
            <text class="cc-amount" v-else>
              <text class="cc-symbol">¥</text>{{ c.value || c.reduceAmount }}
            </text>
            <text class="cc-condition">{{ conditionText(c) }}</text>
          </view>
          <view class="cc-right">
            <text class="cc-name">{{ c.title || c.name || '优惠券' }}</text>
            <text class="cc-desc" v-if="c.description">{{ c.description }}</text>
            <text class="cc-expire">有效期至 {{ formatDate(c.validEnd || c.endTime) }}</text>
          </view>
          <view class="cc-btn" :class="{ claimed: c.claimed }" @click="claimCoupon(c)">
            <text>{{ c.claimed ? '已领取' : '立即领取' }}</text>
          </view>
        </view>
        <view v-if="!loading && availableCoupons.length === 0" class="empty">暂无可领优惠券</view>
      </scroll-view>
    </template>

    <!-- 我的优惠券 -->
    <template v-else>
      <view class="my-tabs">
        <text
          v-for="st in statusTabs"
          :key="st.value"
          class="my-tab"
          :class="{ active: myStatus === st.value }"
          @click="myStatus = st.value"
        >{{ st.label }}</text>
      </view>
      <scroll-view scroll-y class="coupon-list">
        <view v-for="c in filteredMyCoupons" :key="c.id" class="coupon-card" :class="{ used: c.status === 'USED', expired: c.status === 'EXPIRED' }">
          <view class="cc-left">
            <text class="cc-amount" v-if="c.type === 'FULL_REDUCE'">
              <text class="cc-symbol">¥</text>{{ c.reduceAmount || c.value }}
            </text>
            <text class="cc-amount" v-else-if="c.type === 'DISCOUNT'">
              {{ (c.discountRate || c.value || 10) * 10 }}<text class="cc-symbol">折</text>
            </text>
            <text class="cc-amount" v-else>
              <text class="cc-symbol">¥</text>{{ c.value || c.reduceAmount }}
            </text>
            <text class="cc-condition">{{ conditionText(c) }}</text>
          </view>
          <view class="cc-right">
            <text class="cc-name">{{ c.title || c.name || '优惠券' }}</text>
            <text class="cc-expire">有效期至 {{ formatDate(c.validEnd || c.endTime) }}</text>
            <text class="cc-status-tag" :class="c.status">{{ statusLabel(c.status) }}</text>
          </view>
        </view>
        <view v-if="filteredMyCoupons.length === 0" class="empty">暂无优惠券</view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { shopApi } from "../../api";

const tabs = [
  { label: "领券中心", value: "center" },
  { label: "我的优惠券", value: "my" },
];
const statusTabs = [
  { label: "全部", value: "all" },
  { label: "未使用", value: "UNUSED" },
  { label: "已使用", value: "USED" },
  { label: "已过期", value: "EXPIRED" },
];

const activeTab = ref("center");
const myStatus = ref("all");
const loading = ref(false);
const refreshing = ref(false);
const availableCoupons = ref<any[]>([]);
const myCoupons = ref<any[]>([]);

const filteredMyCoupons = computed(() => {
  if (myStatus.value === "all") return myCoupons.value;
  return myCoupons.value.filter((c) => c.status === myStatus.value);
});

onMounted(() => {
  fetchAvailable();
  fetchMyCoupons();
});

function switchTab(v: string) {
  activeTab.value = v;
}

async function fetchAvailable() {
  loading.value = true;
  try {
    const res = await shopApi.listCoupons();
    availableCoupons.value = (res?.coupons || res?.data || []).map((c: any) => ({
      ...c,
      claimed: c.claimed || c.isClaimed || false,
    }));
  } catch { /* */ }
  finally { loading.value = false; refreshing.value = false; }
}

async function fetchMyCoupons() {
  try {
    const res = await shopApi.myCoupons();
    myCoupons.value = res?.coupons || res?.data || [];
  } catch { /* */ }
}

async function claimCoupon(c: any) {
  if (c.claimed) return;
  try {
    await shopApi.claimCoupon(c.id);
    c.claimed = true;
    uni.showToast({ title: "领取成功", icon: "success" });
    fetchMyCoupons();
  } catch { /* */ }
}

function conditionText(c: any): string {
  if (c.type === "NO_THRESHOLD") return "无门槛";
  if (c.minAmount) return `满${c.minAmount}元可用`;
  if (c.type === "FULL_REDUCE" && c.minAmount) return `满${c.minAmount}减${c.reduceAmount}`;
  return "满减券";
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    UNUSED: "未使用",
    USED: "已使用",
    EXPIRED: "已过期",
  };
  return map[s] || s;
}

function formatDate(d: string): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("zh-CN");
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding: 12px;
}

/* 标签切换 */
.tabs {
  display: flex;
  gap: 0;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 10px;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}
.tab.active {
  background: #C41E3A;
  color: #fff;
  font-weight: bold;
}

/* 我的优惠券子标签 */
.my-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.my-tab {
  font-size: 13px;
  color: #666;
  padding: 4px 12px;
  border-radius: 14px;
  background: #fff;
}
.my-tab.active {
  background: #C41E3A;
  color: #fff;
}

/* 优惠券卡片 */
.coupon-list {
  max-height: calc(100vh - 130px);
}
.coupon-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  border-left: 4px solid #C9A96E;
}
.coupon-card.used {
  opacity: 0.6;
  border-left-color: #999;
}
.coupon-card.expired {
  opacity: 0.5;
  border-left-color: #ccc;
}

.cc-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  padding-right: 12px;
  border-right: 1px dashed #e0d5c1;
}
.cc-amount {
  font-size: 24px;
  font-weight: bold;
  color: #d03050;
  line-height: 1.2;
}
.cc-symbol {
  font-size: 14px;
  font-weight: normal;
}
.cc-condition {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.cc-right {
  flex: 1;
  padding-left: 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cc-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}
.cc-desc {
  font-size: 12px;
  color: #999;
}
.cc-expire {
  font-size: 11px;
  color: #bbb;
}

.cc-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  background: linear-gradient(135deg, #C9A96E, #C41E3A);
  color: #fff;
  padding: 4px 14px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: bold;
}
.cc-btn.claimed {
  background: #ddd;
  color: #999;
}

.cc-status-tag {
  font-size: 11px;
  align-self: flex-start;
}
.cc-status-tag.UNUSED {
  color: #67c23a;
}
.cc-status-tag.USED {
  color: #999;
}
.cc-status-tag.EXPIRED {
  color: #ccc;
}

.empty {
  text-align: center;
  padding: 60px 0;
  color: #999;
  font-size: 14px;
}
</style>
