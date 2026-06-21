<template>
  <view class="sku-cart">
    <view
      class="nav-bar"
      :style="{ paddingTop: 'calc(20rpx + var(--status-bar-height, 0px))' }"
    >
      <view
        class="nav-back"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#1A1A1A"
        />
      </view>
      <text class="nav-title">
        购物车
      </text>
      <text
        class="nav-edit"
        @tap="editMode = !editMode"
      >
        {{ editMode ? '完成' : '管理' }}
      </text>
    </view>

    <!-- 加载骨架 -->
    <view
      v-if="loading"
      class="sk-wrap"
    >
      <view
        v-for="i in 4"
        :key="i"
        class="sk-item"
      >
        <view class="sk-img" />
        <view class="sk-info">
          <view class="sk-line" />
          <view class="sk-line sk-short" />
        </view>
      </view>
    </view>

    <error-state
      v-else-if="error"
      :message="error"
      @retry="loadCart"
    />

    <scroll-view
      v-else-if="validItems.length || invalidItems.length"
      scroll-y
      class="content"
    >
      <!-- 有效商品 -->
      <view class="item-list">
        <view
          v-for="item in validItems"
          :key="item.id"
          class="swipe-wrap"
        >
          <view
            class="swipe-inner"
            :style="{ transform: openId === item.id ? 'translateX(-160rpx)' : 'translateX(0)' }"
          >
            <view
              class="cart-item"
              @tap="onItemTap(item)"
            >
              <view
                class="item-check"
                :class="{ checked: item.selected }"
                @tap.stop="toggleItem(item)"
              >
                <app-icon
                  v-if="item.selected"
                  name="check"
                  :size="28"
                  color="#FFFFFF"
                />
              </view>
              <image
                class="item-img"
                :src="item.productCover"
                mode="aspectFill"
              />
              <view class="item-info">
                <text class="item-name">
                  {{ item.productName }}
                </text>
                <view class="sku-tag">
                  <text>{{ item.skuName }}</text>
                </view>
                <view class="item-bottom">
                  <view class="price-box">
                    <text class="cur">
                      ¥{{ item.price }}
                    </text>
                    <text class="ori">
                      ¥{{ item.originalPrice }}
                    </text>
                  </view>
                  <view class="stepper">
                    <view
                      class="step-btn"
                      :class="{ disabled: item.quantity <= 1 }"
                      @tap.stop="changeQty(item, -1)"
                    >
                      <app-icon
                        name="minus"
                        :size="24"
                        color="#666666"
                      />
                    </view>
                    <text class="step-num">
                      {{ item.quantity }}
                    </text>
                    <view
                      class="step-btn"
                      :class="{ disabled: item.quantity >= item.stock }"
                      @tap.stop="changeQty(item, 1)"
                    >
                      <app-icon
                        name="plus"
                        :size="24"
                        color="#666666"
                      />
                    </view>
                  </view>
                </view>
              </view>
            </view>
            <view
              class="swipe-delete"
              @tap="removeItem(item.id)"
            >
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 失效区 -->
      <view
        v-if="invalidItems.length"
        class="invalid-block"
      >
        <view class="invalid-header">
          <text class="invalid-title">
            失效商品
          </text>
          <view
            class="invalid-clear"
            @tap="clearInvalid"
          >
            <app-icon
              name="trash-2"
              :size="26"
              color="#999999"
            /><text>清空失效</text>
          </view>
        </view>
        <view
          v-for="iv in invalidItems"
          :key="iv.id"
          class="cart-item invalid"
        >
          <view class="invalid-badge">
            <text>失效</text>
          </view>
          <image
            class="item-img gray"
            :src="iv.productCover"
            mode="aspectFill"
          />
          <view class="item-info">
            <text class="item-name gray">
              {{ iv.productName }}
            </text>
            <text class="invalid-reason">
              {{ iv.invalidReason }}
            </text>
          </view>
        </view>
      </view>
      <view style="height: 160rpx;" />
    </scroll-view>

    <view
      v-else
      class="empty"
    >
      <app-icon
        name="shopping-cart"
        :size="120"
        color="#DDDDDD"
      />
      <text class="empty-text">
        购物车是空的
      </text>
      <view
        class="empty-btn"
        @tap="goShop"
      >
        <text>去选购</text>
      </view>
    </view>

    <!-- 底部渐变结算栏 -->
    <view
      v-if="validItems.length"
      class="footer"
    >
      <view
        class="all-check"
        :class="{ checked: isAllChecked }"
        @tap="toggleAll"
      >
        <app-icon
          v-if="isAllChecked"
          name="check"
          :size="28"
          color="#FFFFFF"
        />
      </view>
      <text class="all-label">
        全选
      </text>
      <view
        v-if="!editMode"
        class="footer-info"
      >
        <view class="total-row">
          <text class="total-label">
            合计
          </text>
          <text class="total-amount">
            ¥{{ totalAmount }}
          </text>
        </view>
        <text class="saved">
          已优惠 ¥{{ savedAmount }}
        </text>
      </view>
      <view
        v-else
        class="footer-spacer"
      />
      <view
        v-if="!editMode"
        class="checkout-btn"
        @tap="goCheckout"
      >
        <text>结算({{ selectedCount }})</text>
      </view>
      <view
        v-else
        class="checkout-btn danger"
        @tap="removeSelected"
      >
        <text>删除</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateBack, navigateTo, reLaunch } from '@/utils/router'
import ErrorState from '@/components/common/error-state.vue'
import { shopApi, type SkuCartItem } from '@/lib/shop-data'

const items = ref<SkuCartItem[]>([])
const loading = ref(true)
const error = ref('')

async function loadCart() {
  loading.value = true
  error.value = ''
  try {
    const res = await shopApi.getCart()
    const flat: SkuCartItem[] = []
    let idx = 0
    for (const g of (res.items || [])) {
      for (const it of (g.items || [])) {
        flat.push({
          id: String(it.id || ++idx),
          productId: it.productId || `p${it.id}`,
          productName: it.name,
          productCover: it.image,
          skuId: it.skuId || '',
          skuName: it.spec || '',
          price: it.price,
          originalPrice: it.originalPrice,
          quantity: it.quantity,
          stock: it.stock || 99,
          selected: true,
          isValid: true,
        })
      }
    }
    items.value = flat
  } catch (e: any) { error.value = e?.message || '加载失败' } finally { loading.value = false }
}

onMounted(() => { loadCart() })
const editMode = ref(false)
const openId = ref<string | null>(null)

const validItems = computed(() => items.value.filter((i) => i.isValid))
const invalidItems = computed(() => items.value.filter((i) => !i.isValid))

function onItemTap(item: SkuCartItem) {
  if (openId.value === item.id) {
    openId.value = null
    return
  }
  openId.value = item.id
}
function toggleItem(item: SkuCartItem) {
  item.selected = !item.selected
}
const isAllChecked = computed(() => validItems.value.length > 0 && validItems.value.every((i) => i.selected))
function toggleAll() {
  const next = !isAllChecked.value
  validItems.value.forEach((i) => (i.selected = next))
}
const selectedCount = computed(() => validItems.value.filter((i) => i.selected).reduce((s, i) => s + i.quantity, 0))
const totalAmount = computed(() => validItems.value.filter((i) => i.selected).reduce((s, i) => s + i.price * i.quantity, 0))
const savedAmount = computed(() => validItems.value.filter((i) => i.selected).reduce((s, i) => s + (i.originalPrice - i.price) * i.quantity, 0))
function changeQty(item: SkuCartItem, delta: number) {
  const next = item.quantity + delta
  if (next < 1 || next > item.stock) return
  item.quantity = next
}
function removeItem(id: string) {
  items.value = items.value.filter((i) => i.id !== id)
  openId.value = null
}
function removeSelected() {
  items.value = items.value.filter((i) => !(i.isValid && i.selected))
}
function clearInvalid() {
  items.value = items.value.filter((i) => i.isValid)
}
function goBack() { navigateBack() }
function goShop() { reLaunch('/shop') }
function goCheckout() {
  if (selectedCount.value === 0) { uni.showToast({ title: '请选择商品', icon: 'none' }); return }
  navigateTo('/shop/checkout')
}
</script>

<style lang="scss" scoped>
.sku-cart { min-height: 100vh; background: #F5F5F5; display: flex; flex-direction: column; }
.nav-bar { display: flex; align-items: center; padding: 20rpx 30rpx; background: #FFFFFF; }
.nav-back { width: 60rpx; }
.nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 600; color: #1A1A1A; }
.nav-edit { width: 80rpx; text-align: right; font-size: 28rpx; color: #9A2D2D; }
.content { flex: 1; }
.item-list { padding: 20rpx; display: flex; flex-direction: column; gap: 20rpx; }
.swipe-wrap { overflow: hidden; border-radius: 20rpx; }
.swipe-inner { display: flex; transition: transform 0.25s; position: relative; }
.cart-item {
  display: flex; gap: 16rpx; align-items: center;
  background: #FFFFFF; border-radius: 20rpx; padding: 24rpx;
  width: 100%; box-sizing: border-box; flex-shrink: 0;
}
.cart-item.invalid { margin-top: 20rpx; }
.swipe-delete {
  width: 160rpx; flex-shrink: 0;
  background: #E74C3C;
  display: flex; align-items: center; justify-content: center;
  margin-left: 20rpx; border-radius: 20rpx;
}
.swipe-delete text { color: #FFFFFF; font-size: 28rpx; }
.item-check, .all-check {
  width: 40rpx; height: 40rpx; border-radius: 50%;
  border: 2rpx solid #CCCCCC;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  &.checked { background: #9A2D2D; border-color: #9A2D2D; }
}
.item-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; flex-shrink: 0; }
.item-img.gray { opacity: 0.5; }
.item-info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; min-width: 0; }
.item-name { font-size: 28rpx; color: #1A1A1A; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.item-name.gray { color: #999999; }
.sku-tag { align-self: flex-start; background: #F5F5F5; padding: 4rpx 14rpx; border-radius: 8rpx; }
.sku-tag text { font-size: 22rpx; color: #999999; }
.item-bottom { display: flex; align-items: center; justify-content: space-between; }
.price-box { display: flex; align-items: baseline; gap: 10rpx; }
.cur { font-size: 32rpx; color: #9A2D2D; font-weight: 700; }
.ori { font-size: 22rpx; color: #BBBBBB; text-decoration: line-through; }
.stepper { display: flex; align-items: center; border: 2rpx solid #EEEEEE; border-radius: 8rpx; }
.step-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; &.disabled { opacity: 0.3; } }
.step-num { width: 56rpx; text-align: center; font-size: 26rpx; color: #1A1A1A; }
.invalid-block { padding: 0 20rpx; }
.invalid-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 4rpx 0; }
.invalid-title { font-size: 26rpx; color: #999999; }
.invalid-clear { display: flex; align-items: center; gap: 8rpx; }
.invalid-clear text { font-size: 24rpx; color: #999999; }
.invalid-badge { background: #999999; padding: 4rpx 12rpx; border-radius: 8rpx; }
.invalid-badge text { font-size: 20rpx; color: #FFFFFF; }
.invalid-reason { font-size: 24rpx; color: #999999; }
.empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; }
.empty-btn { padding: 16rpx 60rpx; background: #9A2D2D; border-radius: 40rpx; }
.empty-btn text { color: #FFFFFF; font-size: 28rpx; }
.footer {
  position: fixed; left: 0; right: 0; bottom: 0;
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #FFFFFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.05);
}
.all-label { font-size: 28rpx; color: #1A1A1A; }
.footer-info { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; }
.footer-spacer { margin-left: auto; }
.total-row { display: flex; align-items: baseline; gap: 6rpx; }
.total-label { font-size: 26rpx; color: #666666; }
.total-amount { font-size: 36rpx; color: #9A2D2D; font-weight: 700; }
.saved { font-size: 22rpx; color: #999999; }
.checkout-btn {
  padding: 20rpx 50rpx; border-radius: 40rpx; margin-left: 20rpx;
  background: linear-gradient(90deg, #9A2D2D, #C8453E);
}
.checkout-btn text { color: #FFFFFF; font-size: 30rpx; font-weight: 600; }
.checkout-btn.danger { background: #E74C3C; }

.sk-wrap { padding: 20rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sk-item { display: flex; gap: 16rpx; align-items: center; background: #fff; border-radius: 20rpx; padding: 24rpx; }
.sk-img { width: 160rpx; height: 160rpx; background: #f0ece4; border-radius: 12rpx; flex-shrink: 0; }
.sk-info { flex: 1; display: flex; flex-direction: column; gap: 16rpx; }
.sk-line { height: 24rpx; background: #f0ece4; border-radius: 8rpx; }
.sk-short { width: 60%; }
</style>
