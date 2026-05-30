<template>
  <view class="page">
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="cart && cart.items && cart.items.length">
      <!-- 购物车列表 -->
      <view class="cart-list">
        <view v-for="item in cart.items" :key="item.id" class="cart-item">
          <view class="item-checkbox" @click="toggleSelect(item.id)">
            <text :class="['check-icon', selectedIds.includes(item.id) ? 'checked' : '']">
              {{ selectedIds.includes(item.id) ? '✓' : '○' }}
            </text>
          </view>
          <image
            :src="item.product?.image || '/static/placeholder.png'"
            class="item-img"
            mode="aspectFill"
            @click="goProduct(item.productId)"
          />
          <view class="item-info">
            <text class="item-title" @click="goProduct(item.productId)">{{ item.product?.title || '商品已下架' }}</text>
            <text v-if="item.sku" class="item-sku">{{ skuText(item.sku.specs) }}</text>
            <view class="item-bottom">
              <text class="item-price">¥{{ item.unitPrice }}</text>
              <view class="qty-ctrl">
                <text class="qty-btn" @click="decrease(item)">−</text>
                <text class="qty-val">{{ item.quantity }}</text>
                <text class="qty-btn" @click="increase(item)">+</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部结算栏 -->
      <view class="bottom-bar">
        <view class="select-all" @click="toggleAll">
          <text :class="['check-icon', isAllSelected ? 'checked' : '']">
            {{ isAllSelected ? '✓' : '○' }}
          </text>
          <text class="select-label">全选</text>
        </view>
        <view class="total-area">
          <text class="total-label">合计：</text>
          <text class="total-price">¥{{ selectedAmount }}</text>
        </view>
        <view class="btn-checkout" :class="{ disabled: selectedIds.length === 0 }" @click="goCheckout">
          结算({{ selectedIds.length }})
        </view>
      </view>
    </template>

    <!-- 空购物车 -->
    <view v-else class="empty">
      <text class="empty-icon">🛒</text>
      <text class="empty-title">购物车是空的</text>
      <text class="empty-desc">快去商城挑选心仪的商品吧</text>
      <view class="btn-go-shop" @click="goShop">去逛逛</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { shopApi } from "../../api";

const loading = ref(true);
const cart = ref<any>(null);
const selectedIds = ref<string[]>([]);

onMounted(() => fetchCart());

async function fetchCart() {
  try {
    cart.value = await shopApi.getCart();
  } catch {
    /* ignore */
  } finally {
    loading.value = false;
  }
}

const isAllSelected = computed(() => {
  if (!cart.value?.items?.length) return false;
  return selectedIds.value.length === cart.value.items.length;
});

const selectedAmount = computed(() => {
  if (!cart.value?.items) return "0.00";
  return cart.value.items
    .filter((i: any) => selectedIds.value.includes(i.id))
    .reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0)
    .toFixed(2);
});

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1);
  } else {
    selectedIds.value.push(id);
  }
}

function toggleAll() {
  if (!cart.value?.items?.length) return;
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = cart.value.items.map((i: any) => i.id);
  }
}

function skuText(specs: any): string {
  if (!specs) return "";
  return Object.values(specs).join(" / ");
}

async function decrease(item: any) {
  if (item.quantity <= 1) {
    // 确认删除
    const { confirm } = await uni.showModal({
      title: "移除商品",
      content: "确定要从购物车移除该商品吗？",
    });
    if (!confirm) return;
    await shopApi.removeCartItem(item.id);
  } else {
    await shopApi.updateCartItem(item.id, { quantity: item.quantity - 1 });
  }
  await fetchCart();
}

async function increase(item: any) {
  await shopApi.updateCartItem(item.id, { quantity: item.quantity + 1 });
  await fetchCart();
}

function goProduct(productId: string) {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${productId}` });
}

function goCheckout() {
  if (selectedIds.value.length === 0) {
    uni.showToast({ title: "请选择商品", icon: "none" });
    return;
  }
  const ids = selectedIds.value.join(",");
  uni.navigateTo({ url: `/pages/shop/checkout?ids=${ids}` });
}

function goShop() {
  uni.navigateTo({ url: "/pages/shop/shop" });
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 70px; }

.loading-state { display: flex; justify-content: center; padding: 80px 0; }
.loading-text { color: #999; font-size: 14px; }

/* 购物车列表 */
.cart-list { padding: 0 0 8px; }
.cart-item {
  display: flex; align-items: center; gap: 10px;
  background: #fff; margin: 8px 10px 0; padding: 12px;
  border-radius: 10px;
}
.item-checkbox { flex-shrink: 0; padding: 4px; }
.check-icon { font-size: 22px; color: #ccc; }
.check-icon.checked { color: #C41E3A; }
.item-img { width: 80px; height: 80px; border-radius: 8px; flex-shrink: 0; background: #F5F0E8; }
.item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.item-title { font-size: 14px; color: #2C2C2C; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; line-height: 1.4; }
.item-sku { font-size: 11px; color: #999; }
.item-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
.item-price { font-size: 16px; font-weight: bold; color: #C41E3A; }
.qty-ctrl { display: flex; align-items: center; gap: 0; border: 1px solid #E8E0D5; border-radius: 16px; overflow: hidden; }
.qty-btn { width: 30px; height: 28px; text-align: center; line-height: 28px; font-size: 16px; color: #666; background: #F5F0E8; }
.qty-val { width: 36px; text-align: center; font-size: 14px; color: #333; }

/* 底部栏 */
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; gap: 8px;
  background: #fff; border-top: 1px solid #E8E0D5;
  padding: 8px 12px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  z-index: 50;
}
.select-all { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.select-label { font-size: 13px; color: #666; }
.total-area { flex: 1; text-align: right; }
.total-label { font-size: 13px; color: #666; }
.total-price { font-size: 18px; font-weight: bold; color: #C41E3A; }
.btn-checkout {
  padding: 10px 20px; background: #C41E3A; color: #fff;
  border-radius: 22px; font-size: 14px; font-weight: 600;
  flex-shrink: 0;
}
.btn-checkout.disabled { background: #ccc; }

/* 空状态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 80px 0; }
.empty-icon { font-size: 60px; margin-bottom: 16px; }
.empty-title { font-size: 16px; color: #2C2C2C; margin-bottom: 8px; font-weight: 500; }
.empty-desc { font-size: 13px; color: #999; margin-bottom: 24px; }
.btn-go-shop {
  padding: 10px 40px; background: #C41E3A; color: #fff;
  border-radius: 22px; font-size: 15px; font-weight: 500;
}
</style>
