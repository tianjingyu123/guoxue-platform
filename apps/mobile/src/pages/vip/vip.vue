<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="header-title">会员中心</text>
      <text class="header-sub">解锁更多国学内容</text>
      <view class="current-badge" v-if="userStore.isVip">
        <text>当前：{{ levelLabel(userStore.user?.memberLevel) }}</text>
        <text v-if="userStore.user?.memberExpire" class="expire">
          到期 {{ formatDate(userStore.user.memberExpire) }}
        </text>
      </view>
    </view>

    <!-- 套餐卡片 -->
    <view class="plans">
      <view
        v-for="plan in plans"
        :key="plan.level"
        class="plan-card"
        :class="{ featured: plan.featured, active: selectedLevel === plan.level }"
        @click="selectedLevel = plan.level"
      >
        <view v-if="plan.featured" class="ribbon">推荐</view>
        <text class="plan-name">{{ plan.name }}</text>
        <view class="plan-price">
          <text class="price-symbol">¥</text>
          <text class="price-num">{{ plan.price }}</text>
          <text v-if="plan.unit" class="price-unit">/{{ plan.unit }}</text>
        </view>
        <view class="plan-benefits">
          <text v-for="b in plan.benefits" :key="b" class="benefit">✓ {{ b }}</text>
        </view>
      </view>
    </view>

    <!-- 购买按钮 -->
    <button class="buy-btn" @click="doBuy" :loading="buying" :disabled="buying">
      立即开通 · ¥{{ selectedPlan?.price || 0 }}
    </button>
    <text class="disclaimer">支付即表示同意《会员服务协议》</text>

    <!-- 会员权益对比 -->
    <view class="section">
      <text class="section-title">会员权益对比</text>
      <view class="compare-table">
        <view class="compare-row head">
          <text class="col-name">权益</text>
          <text class="col-val">普通</text>
          <text class="col-val">月会员</text>
          <text class="col-val">年会员</text>
          <text class="col-val">终身</text>
        </view>
        <view v-for="r in compareRows" :key="r.name" class="compare-row">
          <text class="col-name">{{ r.name }}</text>
          <text class="col-val">{{ r.free }}</text>
          <text class="col-val">{{ r.monthly }}</text>
          <text class="col-val">{{ r.yearly }}</text>
          <text class="col-val">{{ r.lifetime }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useUserStore } from "@/store/user";
import { shopApi, memberApi } from "@/api/index";

const userStore = useUserStore();

const unitMap: Record<string, string> = { MONTHLY: "月", YEARLY: "年", LIFETIME: "" };

// 本地默认数据，后端不可用时兜底
const defaultPlans = [
  { level: "MONTHLY", name: "月会员", price: 39, unit: "月", featured: false, benefits: ["AI排盘分析免费看", "智能体调用额度×5", "专属会员标识"] },
  { level: "YEARLY", name: "年会员", price: 365, unit: "年", featured: true, benefits: ["月会员全部权益", "部分课程免费学", "商城95折优惠", "圈子入圈8折"] },
  { level: "LIFETIME", name: "终身会员", price: 9999, unit: "", featured: false, benefits: ["年会员全部权益", "终身有效", "全部课程免费", "专属客服通道"] },
];

const plans = ref<Array<{ level: string; name: string; price: number; unit: string; featured: boolean; benefits: string[] }>>([...defaultPlans]);

onMounted(async () => {
  try {
    const res: any = await memberApi.plans();
    if (res?.length > 0) {
      plans.value = res.map((p: any) => ({
        level: p.level,
        name: p.name,
        price: p.price,
        unit: unitMap[p.level] || "",
        featured: p.level === "YEARLY",
        benefits: Array.isArray(p.benefits) ? p.benefits : [],
      }));
    }
  } catch {
    // 后端不可用，保留本地默认数据
  }
});

const compareRows = [
  { name: "排盘AI分析", free: "限1次/天", monthly: "无限次", yearly: "无限次", lifetime: "无限次" },
  { name: "智能体额度", free: "5次/天", monthly: "25次/天", yearly: "50次/天", lifetime: "无限" },
  { name: "免费课程", free: "--", monthly: "--", yearly: "部分", lifetime: "全部" },
  { name: "商城折扣", free: "--", monthly: "--", yearly: "95折", lifetime: "9折" },
  { name: "圈子优惠", free: "--", monthly: "--", yearly: "8折", lifetime: "7折" },
  { name: "专属客服", free: "--", monthly: "--", yearly: "--", lifetime: "✓" },
];

const selectedLevel = ref("YEARLY");
const buying = ref(false);

const selectedPlan = computed(() => plans.find(p => p.level === selectedLevel.value));

async function doBuy() {
  const plan = selectedPlan.value;
  if (!plan) return;

  buying.value = true;
  try {
    // 创建会员订单
    const orderRes = await shopApi.createOrder({
      type: "MEMBER",
      targetId: `MEMBER_${plan.level}`,
      amount: plan.price,
    });
    const order = (orderRes as any).data || orderRes;

    // 支付
    await shopApi.payOrder(order.id);

    // 刷新用户信息
    await userStore.fetchProfile();

    uni.showToast({ title: "开通成功！", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e: any) {
    uni.showToast({ title: e.message || "支付失败", icon: "none" });
  } finally {
    buying.value = false;
  }
}

function levelLabel(l?: string) {
  const m: Record<string, string> = { MONTHLY: "月会员", YEARLY: "年会员", LIFETIME: "终身会员" };
  return m[l || ""] || "普通用户";
}
function formatDate(d?: string) {
  if (!d) return "";
  return d.slice(0, 10);
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* ── 头部 ── */
.header {
  background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
  padding: 45px 20px 35px;
  text-align: center;
  margin-bottom: -20px;
}
.header-title {
  font-size: 26px;
  font-weight: bold;
  background: linear-gradient(135deg, #C9A96E, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: block;
}
.header-sub {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-top: 6px;
  display: block;
}
.current-badge {
  background: rgba(201, 169, 110, 0.15);
  border: 1px solid rgba(201, 169, 110, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  margin-top: 14px;
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  color: #C9A96E;
  font-size: 13px;
}

/* ── 权益图标 ── */
.benefit-icons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 0 15px 20px;
  margin-top: 30px;
}
.benefit-icon-item {
  background: #fff;
  border-radius: 12px;
  padding: 15px 10px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.bi-icon {
  font-size: 28px;
  display: block;
  margin-bottom: 6px;
}
.bi-name {
  font-size: 13px;
  color: #2C2C2C;
  font-weight: 500;
}

/* ── 套餐卡片 ── */
.plans {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 15px 20px;
}
.plan-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid #E8E0D5;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
}
.plan-card.active {
  border-color: #C9A96E;
  box-shadow: 0 2px 16px rgba(201, 169, 110, 0.15);
}
.plan-card.popular {
  border-color: #C9A96E;
}
.ribbon {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #C9A96E, #D4AF37);
  border-radius: 10px;
  color: #fff;
  font-size: 11px;
  padding: 3px 12px;
  font-weight: 500;
}
.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.plan-name {
  font-size: 18px;
  font-weight: bold;
  color: #2C2C2C;
}
.plan-price {
  text-align: right;
}
.price-original {
  font-size: 13px;
  color: #999;
  text-decoration: line-through;
  display: block;
}
.price-current {
  font-size: 28px;
  font-weight: bold;
  color: #C41E3A;
}
.price-unit {
  font-size: 14px;
  font-weight: normal;
  color: #999;
}
.plan-benefits {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 15px;
  padding-top: 10px;
  border-top: 1px solid #F5F0E8;
}
.benefit {
  font-size: 13px;
  color: #666;
  padding-left: 4px;
}
.plan-btn {
  width: 100%;
  height: 44px;
  background: #F5F0E8;
  border: none;
  border-radius: 22px;
  font-size: 15px;
  font-weight: bold;
  color: #2C2C2C;
}
.plan-card.popular .plan-btn {
  background: linear-gradient(135deg, #C9A96E, #D4AF37);
  color: #fff;
}

/* ── 购买按钮 ── */
.buy-btn {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  border: none;
  border-radius: 25px;
  padding: 14px;
  font-size: 17px;
  font-weight: bold;
  width: calc(100% - 30px);
  margin: 0 15px;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3);
}
.buy-btn:active {
  transform: scale(0.98);
}
.buy-btn[disabled] {
  opacity: 0.6;
}
.disclaimer {
  text-align: center;
  color: #bbb;
  font-size: 12px;
  display: block;
  margin-top: 10px;
  margin-bottom: 20px;
}

/* ── 权益对比表 ── */
.section {
  margin: 24px 15px 0;
}
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #2C2C2C;
  margin-bottom: 12px;
  display: block;
}
.compare-table {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.compare-row {
  display: flex;
  padding: 12px 14px;
  border-bottom: 1px solid #F5F0E8;
  font-size: 13px;
}
.compare-row.head {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  font-weight: bold;
  font-size: 12px;
}
.compare-row.head .col-name,
.compare-row.head .col-val {
  color: #fff;
}
.compare-row:last-child {
  border-bottom: none;
}
.col-name {
  flex: 2;
  color: #2C2C2C;
  font-weight: 500;
}
.col-val {
  flex: 1;
  text-align: center;
  color: #666;
  font-size: 12px;
}
</style>
