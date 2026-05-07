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

<script setup>
import { ref, computed } from "vue";
import { useUserStore } from "@/store/user";
import { shopApi } from "@/api/index";

const userStore = useUserStore();

const plans = [
  {
    level: "MONTHLY",
    name: "月会员",
    price: 39,
    unit: "月",
    featured: false,
    benefits: ["AI排盘分析免费看", "智能体调用额度×5", "专属会员标识"],
  },
  {
    level: "YEARLY",
    name: "年会员",
    price: 365,
    unit: "年",
    featured: true,
    benefits: ["月会员全部权益", "部分课程免费学", "商城95折优惠", "圈子入圈8折"],
  },
  {
    level: "LIFETIME",
    name: "终身会员",
    price: 9999,
    unit: "",
    featured: false,
    benefits: ["年会员全部权益", "终身有效", "全部课程免费", "专属客服通道"],
  },
];

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
.page { padding: 16px; background: #f5f0e6; min-height: 100vh; padding-bottom: 40px; }

.header {
  background: linear-gradient(135deg, #c4943a, #8b4513);
  border-radius: 12px; padding: 28px 20px; text-align: center; margin-bottom: 20px;
}
.header-title { color: #fff; font-size: 22px; font-weight: bold; display: block; }
.header-sub { color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 6px; display: block; }
.current-badge {
  background: rgba(255,255,255,0.2); border-radius: 8px; padding: 8px 16px;
  margin-top: 12px; display: inline-flex; flex-direction: column; gap: 2px;
  color: #fff; font-size: 13px;
}
.expire { font-size: 11px; opacity: 0.7; }

.plans { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.plan-card {
  background: #fff; border-radius: 12px; padding: 20px;
  border: 2px solid transparent; position: relative; overflow: hidden;
}
.plan-card.active { border-color: #c4943a; }
.plan-card.featured { border-color: #c4943a; }
.ribbon {
  position: absolute; top: 10px; right: -28px;
  background: #c4943a; color: #fff; font-size: 11px;
  padding: 2px 30px; transform: rotate(45deg);
}
.plan-name { font-size: 17px; font-weight: bold; color: #333; }
.plan-price { margin: 8px 0 12px; }
.price-symbol { font-size: 18px; color: #c4943a; }
.price-num { font-size: 36px; font-weight: bold; color: #c4943a; }
.price-unit { font-size: 13px; color: #999; }
.plan-benefits { display: flex; flex-direction: column; gap: 4px; }
.benefit { font-size: 13px; color: #666; }

.buy-btn {
  background: linear-gradient(135deg, #c4943a, #8b4513);
  color: #fff; border: none; border-radius: 12px;
  padding: 14px; font-size: 17px; font-weight: bold; width: 100%;
}
.buy-btn[disabled] { opacity: 0.6; }
.disclaimer { text-align: center; color: #bbb; font-size: 12px; display: block; margin-top: 8px; }

.section { margin-top: 24px; }
.section-title { font-size: 17px; font-weight: bold; color: #333; margin-bottom: 12px; display: block; }
.compare-table {
  background: #fff; border-radius: 12px; overflow: hidden;
}
.compare-row { display: flex; padding: 10px 12px; border-bottom: 1px solid #f5f0e6; font-size: 12px; }
.compare-row.head { background: #f5f0e6; font-weight: bold; }
.compare-row:last-child { border-bottom: none; }
.col-name { flex: 2; color: #333; }
.col-val { flex: 1; text-align: center; color: #666; }
</style>
