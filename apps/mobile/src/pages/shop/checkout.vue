<template>
  <view class="page">
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 收货地址 -->
      <view class="section address-section" @click="goSelectAddress">
        <template v-if="selectedAddress">
          <view class="addr-info">
            <text class="addr-name">{{ selectedAddress.name }}</text>
            <text class="addr-phone">{{ selectedAddress.phone }}</text>
            <text class="addr-tag" v-if="selectedAddress.isDefault">默认</text>
          </view>
          <text class="addr-detail">
            {{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }} {{ selectedAddress.detail }}
          </text>
        </template>
        <view v-else class="addr-empty">
          <text class="addr-empty-icon">📍</text>
          <text>请选择收货地址</text>
        </view>
        <text class="addr-arrow">›</text>
      </view>

      <!-- 商品清单 -->
      <view class="section">
        <view class="section-title">商品清单</view>
        <view v-for="item in checkoutItems" :key="item.id" class="goods-item">
          <image :src="item.product?.image || '/static/placeholder.png'" class="goods-img" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-title">{{ item.product?.title }}</text>
            <text v-if="item.sku" class="goods-sku">{{ skuText(item.sku.specs) }}</text>
            <view class="goods-bottom">
              <text class="goods-price">¥{{ item.unitPrice }}</text>
              <text class="goods-qty">×{{ item.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 优惠券 -->
      <view class="section coupon-section" @click="showCouponPanel = true">
        <text class="section-label">优惠券</text>
        <view class="section-right">
          <text v-if="selectedCoupon" class="coupon-selected">-¥{{ selectedCoupon.discountAmount || selectedCoupon.value }}</text>
          <text v-else class="coupon-placeholder">选择优惠券</text>
          <text class="addr-arrow">›</text>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="section">
        <text class="section-label">支付方式</text>
        <view class="pay-methods">
          <view
            v-for="m in payMethods"
            :key="m.value"
            class="pay-method"
            :class="{ active: payMethod === m.value }"
            @click="payMethod = m.value"
          >
            <text class="pay-icon">{{ m.icon }}</text>
            <text class="pay-name">{{ m.label }}</text>
            <text class="pay-check">{{ payMethod === m.value ? '✓' : '○' }}</text>
          </view>
        </view>
      </view>

      <!-- 金额明细 -->
      <view class="section">
        <view class="amount-row">
          <text class="amount-label">商品总额</text>
          <text class="amount-val">¥{{ totalGoodsAmount }}</text>
        </view>
        <view class="amount-row">
          <text class="amount-label">运费</text>
          <text class="amount-val">{{ freightAmount > 0 ? '¥' + freightAmount : '免运费' }}</text>
        </view>
        <view v-if="selectedCoupon" class="amount-row discount-row">
          <text class="amount-label">优惠券</text>
          <text class="amount-val">-¥{{ selectedCoupon.discountAmount || selectedCoupon.value }}</text>
        </view>
        <view class="amount-row total-row">
          <text class="amount-label">实付金额</text>
          <text class="amount-val final">¥{{ finalAmount }}</text>
        </view>
      </view>

      <!-- 提交 -->
      <view class="submit-area">
        <view class="btn-submit" @click="submitOrder">
          提交订单 ¥{{ finalAmount }}
        </view>
      </view>
    </template>

    <!-- 优惠券选择弹窗 -->
    <view v-if="showCouponPanel" class="mask" @click="showCouponPanel = false">
      <view class="panel" @click.stop>
        <view class="panel-header">
          <text class="panel-title">选择优惠券</text>
          <text class="panel-close" @click="showCouponPanel = false">✕</text>
        </view>
        <view v-if="availableCoupons.length === 0" class="no-coupon">
          <text>暂无可用优惠券</text>
        </view>
        <view
          v-for="c in availableCoupons"
          :key="c.id"
          class="coupon-card"
          :class="{ selected: selectedCoupon?.id === c.id }"
          @click="selectCoupon(c)"
        >
          <view class="coupon-left">
            <text class="coupon-value">¥{{ c.discountAmount || c.value }}</text>
            <text class="coupon-cond" v-if="c.minAmount">满{{ c.minAmount }}可用</text>
            <text class="coupon-cond" v-else>无门槛</text>
          </view>
          <view class="coupon-right">
            <text class="coupon-name">{{ c.name || c.type }}</text>
            <text class="coupon-expire">有效期至 {{ formatDate(c.validEnd) }}</text>
          </view>
          <text class="coupon-check">{{ selectedCoupon?.id === c.id ? '✓' : '' }}</text>
        </view>
        <view class="panel-confirm" @click="showCouponPanel = false">确定</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { shopApi } from "../../api";

const loading = ref(true);
const checkoutItems = ref<any[]>([]);
const selectedAddress = ref<any>(null);
const selectedCoupon = ref<any>(null);
const availableCoupons = ref<any[]>([]);
const showCouponPanel = ref(false);
const payMethod = ref("wechat");
const freightAmount = ref(0);

const payMethods = [
  { label: "微信支付", value: "wechat", icon: "💚" },
  { label: "支付宝", value: "alipay", icon: "💙" },
];

const totalGoodsAmount = computed(() => {
  return checkoutItems.value.reduce((sum, i) => sum + i.totalPrice, 0).toFixed(2);
});

const finalAmount = computed(() => {
  let amount = parseFloat(totalGoodsAmount.value) + freightAmount.value;
  if (selectedCoupon.value) {
    const discount = Number(selectedCoupon.value.discountAmount || selectedCoupon.value.value || 0);
    amount = Math.max(0, amount - discount);
  }
  return amount.toFixed(2);
});

onMounted(async () => {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as any;
  const idsParam = current?.options?.ids;

  try {
    // 获取购物车数据
    const cart = await shopApi.getCart();
    const allItems = cart?.items || [];
    if (idsParam) {
      const ids = idsParam.split(",");
      checkoutItems.value = allItems.filter((i: any) => ids.includes(i.id));
    } else {
      checkoutItems.value = allItems;
    }

    // 获取默认地址
    try {
      const addrs = await shopApi.listAddresses();
      if (addrs?.length) {
        selectedAddress.value = addrs.find((a: any) => a.isDefault) || addrs[0];
      }
    } catch { /* */ }

    // 获取可用优惠券
    try {
      const data = await shopApi.myCoupons();
      availableCoupons.value = (data || []).filter(
        (uc: any) => !uc.used && uc.coupon && new Date(uc.coupon.validEnd) > new Date(),
      ).map((uc: any) => ({
        ...uc.coupon,
        userCouponId: uc.id,
      }));
    } catch { /* */ }
  } catch (e) {
    uni.showToast({ title: "加载结算信息失败", icon: "none" });
  } finally {
    loading.value = false;
  }
});

function skuText(specs: any): string {
  if (!specs) return "";
  return Object.values(specs).join(" / ");
}

function formatDate(d: string): string {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function selectCoupon(c: any) {
  if (selectedCoupon.value?.id === c.id) {
    selectedCoupon.value = null;
  } else {
    selectedCoupon.value = c;
  }
}

function goSelectAddress() {
  uni.navigateTo({ url: "/pages/shop/address-list?select=1" });
}

async function submitOrder() {
  if (!selectedAddress.value) {
    uni.showToast({ title: "请选择收货地址", icon: "none" });
    return;
  }
  if (checkoutItems.value.length === 0) {
    uni.showToast({ title: "没有可结算的商品", icon: "none" });
    return;
  }

  uni.showLoading({ title: "提交中..." });
  try {
    // 为每个商品创建订单
    for (const item of checkoutItems.value) {
      const orderData: any = {
        type: "PRODUCT",
        targetId: item.productId,
        amount: item.quantity || 1,
      };
      if (item.skuId) {
        orderData.skuId = item.skuId;
      }
      if (selectedCoupon.value?.userCouponId) {
        orderData.couponId = selectedCoupon.value.userCouponId;
      }
      await shopApi.createOrder(orderData);
    }

    // 仅移除已结算的商品，不清空整个购物车
    await Promise.all(checkoutItems.value.map((item: any) => shopApi.removeCartItem(item.id)));

    uni.hideLoading();
    uni.showToast({ title: "下单成功", icon: "success" });
    setTimeout(() => {
      uni.redirectTo({ url: "/pages/orders/orders" });
    }, 1500);
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.message || "提交失败", icon: "none" });
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 80px; }

.loading-state { display: flex; justify-content: center; padding: 80px 0; }
.loading-text { color: #999; font-size: 14px; }

.section { background: #fff; padding: 16px; margin-bottom: 8px; }

/* 地址 */
.address-section { display: flex; align-items: flex-start; }
.addr-info { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex: 1; }
.addr-name { font-size: 15px; font-weight: 600; color: #2C2C2C; }
.addr-phone { font-size: 13px; color: #666; }
.addr-tag { font-size: 10px; background: #C41E3A; color: #fff; padding: 1px 6px; border-radius: 3px; }
.addr-detail { font-size: 13px; color: #666; line-height: 1.5; flex: 1; }
.addr-empty { display: flex; align-items: center; gap: 8px; flex: 1; font-size: 14px; color: #999; }
.addr-empty-icon { font-size: 18px; }
.addr-arrow { font-size: 20px; color: #ccc; flex-shrink: 0; }

/* 商品 */
.section-title { font-size: 14px; font-weight: 600; color: #2C2C2C; margin-bottom: 12px; }
.goods-item { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F5F0E8; }
.goods-item:last-child { border-bottom: none; }
.goods-img { width: 64px; height: 64px; border-radius: 6px; flex-shrink: 0; background: #F5F0E8; }
.goods-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.goods-title { font-size: 13px; color: #2C2C2C; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.goods-sku { font-size: 11px; color: #999; }
.goods-bottom { display: flex; justify-content: space-between; align-items: center; }
.goods-price { font-size: 15px; font-weight: bold; color: #C41E3A; }
.goods-qty { font-size: 12px; color: #999; }

/* 优惠券/支付方式 */
.coupon-section { display: flex; justify-content: space-between; align-items: center; }
.section-label { font-size: 14px; color: #2C2C2C; }
.section-right { display: flex; align-items: center; gap: 6px; }
.coupon-selected { font-size: 13px; color: #C41E3A; font-weight: 500; }
.coupon-placeholder { font-size: 13px; color: #999; }

.pay-methods { margin-top: 10px; }
.pay-method { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid #F5F0E8; }
.pay-method:last-child { border-bottom: none; }
.pay-icon { font-size: 18px; }
.pay-name { flex: 1; font-size: 14px; color: #2C2C2C; }
.pay-check { font-size: 18px; color: #C41E3A; }
.pay-method:not(.active) .pay-check { color: #ccc; }

/* 金额明细 */
.amount-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.amount-label { font-size: 13px; color: #666; }
.amount-val { font-size: 13px; color: #333; }
.discount-row .amount-val { color: #C41E3A; }
.total-row { margin-top: 4px; padding-top: 10px; border-top: 1px solid #E8E0D5; }
.total-row .amount-label { font-size: 14px; font-weight: 600; color: #2C2C2C; }
.total-row .amount-val.final { font-size: 20px; font-weight: bold; color: #C41E3A; }

/* 提交 */
.submit-area { padding: 12px; }
.btn-submit {
  width: 100%; padding: 14px;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff; border-radius: 24px;
  font-size: 16px; font-weight: 600; text-align: center;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3);
}

/* 优惠券弹窗 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; }
.panel { background: #fff; border-radius: 16px 16px 0 0; width: 100%; padding: 20px 16px 24px; max-height: 70vh; overflow-y: auto; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.panel-title { font-size: 16px; font-weight: bold; color: #2C2C2C; }
.panel-close { font-size: 18px; color: #bbb; padding: 4px; }
.no-coupon { text-align: center; padding: 40px 0; color: #999; font-size: 14px; }
.coupon-card { display: flex; align-items: center; padding: 12px; border: 1px solid #E8E0D5; border-radius: 10px; margin-bottom: 10px; position: relative; }
.coupon-card.selected { border-color: #C41E3A; background: #fef5f5; }
.coupon-left { width: 80px; text-align: center; border-right: 1px dashed #E8E0D5; padding-right: 12px; margin-right: 12px; flex-shrink: 0; }
.coupon-value { font-size: 22px; font-weight: bold; color: #C41E3A; display: block; }
.coupon-cond { font-size: 11px; color: #999; margin-top: 2px; display: block; }
.coupon-right { flex: 1; }
.coupon-name { font-size: 14px; color: #2C2C2C; font-weight: 500; display: block; }
.coupon-expire { font-size: 11px; color: #bbb; margin-top: 4px; display: block; }
.coupon-check { font-size: 18px; color: #C41E3A; flex-shrink: 0; margin-left: 8px; }
.panel-confirm { text-align: center; padding: 14px; background: #C41E3A; color: #fff; border-radius: 24px; font-size: 16px; font-weight: bold; margin-top: 8px; }
</style>
