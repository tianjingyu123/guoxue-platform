<template>
  <view class="products-page">
    <!-- 顶部导航（V0：返回在左·标题居中） -->
    <view class="nav-bar">
      <view class="nav-back" @tap="handleBack">
        <AppIcon name="chevron-left" :size="44" color="#2C2C2C" />
      </view>
      <text class="nav-title">带货商品</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="page-body">
      <view class="sk-caption" />
      <view class="sk-card" v-for="i in 3" :key="i">
        <view class="sk-thumb" />
        <view class="sk-info">
          <view class="sk-line sk-w80" />
          <view class="sk-line sk-w40" />
        </view>
      </view>
      <view class="sk-addbar" />
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="error-state">
      <AppIcon name="alert-circle" :size="96" color="#cbb8a8" />
      <text class="error-text">{{ error }}</text>
      <view class="error-btn" @tap="fetchData">重试</view>
    </view>

    <!-- 正常内容 -->
    <view v-else class="page-body">
      <!-- 当前配置的直播场次名 -->
      <view class="caption">
        <text class="caption-text">
          正在为「<text class="caption-strong">{{ roomTitle || '本场直播' }}</text>」配置商品 · 已选 {{ products.length }}/{{ MAX_LIVE_PRODUCTS }} 件
        </text>
      </view>

      <!-- 空态 -->
      <view v-if="products.length === 0" class="empty-box">
        <view class="empty-icon">
          <AppIcon name="shopping-bag" :size="80" color="#DDD5C8" />
        </view>
        <text class="empty-title">{{ roomId ? '还没有商品' : '请先选择直播场次' }}</text>
        <text class="empty-desc">{{ roomId ? '添加商品后，观众端会同步展示商品卡' : '从“我的直播”进入具体场次后再配置商品' }}</text>
        <text v-if="roomId" class="empty-desc">最多挂载 {{ MAX_LIVE_PRODUCTS }} 件，可按讲解顺序排列</text>
        <view class="empty-btn" @tap="roomId ? openPicker() : goManage()">{{ roomId ? '＋ 添加商品' : '去我的直播' }}</view>
      </view>

      <!-- 已选商品列表（排序即讲解顺序） -->
      <template v-else>
        <view class="product-list">
          <view v-for="(product, idx) in products" :key="product.id" class="gcard">
            <!-- 顺序标号（拖拽成本高 → 用上/下移按钮 + 明确顺序号，见文件末说明） -->
            <view class="order-col">
              <text class="order-num">{{ idx + 1 }}</text>
              <view
                class="order-btn"
                :class="{ 'order-btn-disabled': idx === 0 }"
                @tap="moveUp(idx)"
              >
                <AppIcon name="chevron-up" :size="26" :color="idx === 0 ? '#DDD5C8' : '#6E6E73'" />
              </view>
              <view
                class="order-btn"
                :class="{ 'order-btn-disabled': idx === products.length - 1 }"
                @tap="moveDown(idx)"
              >
                <AppIcon name="chevron-down" :size="26" :color="idx === products.length - 1 ? '#DDD5C8' : '#6E6E73'" />
              </view>
            </view>

            <!-- 缩略图（固定宽高·不用 aspect-ratio） -->
            <view class="thumb">
              <image v-if="product.cover" class="thumb-img" :src="product.cover" mode="aspectFill" lazy-load />
              <view v-else class="thumb-ph">
                <AppIcon name="image" :size="36" color="#C9BFB0" />
              </view>
            </view>

            <!-- 信息 -->
            <view class="ginfo">
              <text class="gt">{{ product.name }}</text>
              <view class="gprice-row">
                <text class="gp">¥{{ formatPrice(product.price) }}</text>
                <text class="gp-sub">库存 {{ product.stock }} · 已售 {{ product.sold }}</text>
              </view>
            </view>

            <!-- 移除 -->
            <view class="gops">
              <view class="remove-btn" @tap="remove(product.id)">
                <text class="remove-text">移除</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 添加商品（金色虚线引导） -->
        <view v-if="products.length < MAX_LIVE_PRODUCTS" class="addbar" @tap="openPicker">＋ 添加商品</view>
      </template>

      <view v-if="roomId" class="save-panel">
        <view class="cta" :class="{ 'cta-disabled': !dirty || saving }" @tap="saveList">
          <AppIcon v-if="saving" name="loader-2" :size="28" color="#FFFFFF" class="save-spinner" />
          <AppIcon v-else-if="!dirty" name="check" :size="28" color="#FFFFFF" />
          <text>{{ saving ? '保存中…' : dirty ? '保存商品清单' : '商品清单已保存' }}</text>
        </view>
        <text class="save-hint">{{ dirty ? '保存后，观众端将按当前顺序展示' : '已与本场直播同步' }}</text>
      </view>
    </view>

    <view v-if="!loading && !error" class="bottom-spacer" />

    <!-- ===== 半屏选品层 ===== -->
    <view v-if="pickerOpen" class="mask" @tap="closePicker">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择商品</text>
          <view class="sheet-x" @tap="closePicker">
            <AppIcon name="x" :size="36" color="#999" />
          </view>
        </view>

        <!-- 搜索框（明确 height，避免 H5 原生 input 塌成 0 高） -->
        <view class="search-bar">
          <AppIcon name="search" :size="30" color="#B8B2A8" class="search-icon" />
          <input
            v-model="pickSearch"
            class="search-input"
            type="text"
            placeholder="搜索可带货商品"
            placeholder-class="search-ph"
            confirm-type="search"
            @confirm="fetchPool"
          />
        </view>

        <!-- 选品列表 -->
        <scroll-view scroll-y class="pick-scroll">
          <view v-if="pickLoading" class="pick-loading">
            <text class="pick-loading-text">加载商品中…</text>
          </view>
          <view v-else-if="pickError" class="pick-empty">
            <text class="pick-empty-text">{{ pickError }}</text>
            <view class="pick-retry" @tap="fetchPool">重新加载</view>
          </view>
          <view v-else-if="pool.length === 0" class="pick-empty">
            <text class="pick-empty-text">暂无可选商品</text>
          </view>
          <view
            v-for="p in pool"
            v-else
            :key="p.id"
            class="pick"
            :class="{ 'pick-added': isAdded(p.id) }"
            @tap="togglePick(p.id)"
          >
            <view class="ck" :class="{ 'ck-on': isChecked(p.id) }">
              <AppIcon v-if="isChecked(p.id)" name="check" :size="24" color="#fff" />
            </view>
            <view class="thumb thumb-sm">
              <image v-if="p.cover" class="thumb-img" :src="p.cover" mode="aspectFill" lazy-load />
              <view v-else class="thumb-ph">
                <AppIcon name="image" :size="30" color="#C9BFB0" />
              </view>
            </view>
            <view class="ginfo">
              <view class="gt-row">
                <text class="gt">{{ p.name }}</text>
                <text v-if="isAdded(p.id)" class="added-tag">已添加</text>
              </view>
              <text class="gp">¥{{ formatPrice(p.price) }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="cta sheet-cta" :class="{ 'cta-disabled': checkedIds.length === 0 }" @tap="confirmPick">
          加入直播间（{{ checkedIds.length }}）
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { liveApi, type LiveConfiguredProduct, type LivePickerProduct } from '@/lib/live-data'
import { formatPrice } from '@/utils/format'

const MAX_LIVE_PRODUCTS = 5
const roomId = ref('')
const roomTitle = ref('')
const products = ref<LiveConfiguredProduct[]>([])
const savedProductIds = ref<string[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const dirty = computed(() => products.value.map((p) => p.id).join('|') !== savedProductIds.value.join('|'))

// ── 已配商品：真连 GET /live/rooms/:id ──
async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    if (!roomId.value) {
      // 无房间 id（非从某场直播进入）→ 无法定位本场商品，空态引导添加
      roomTitle.value = ''
      products.value = []
      return
    }
    const res = await liveApi.getRoomProducts(roomId.value)
    roomTitle.value = res.roomTitle
    products.value = res.products
    savedProductIds.value = res.products.map((p) => p.id)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// ── 商品顺序与增删：本地编辑，点击保存后事务写入 LiveProduct ──
function moveUp(idx: number) {
  if (idx <= 0) return
  const arr = products.value.slice()
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
  products.value = arr
}
function moveDown(idx: number) {
  if (idx >= products.value.length - 1) return
  const arr = products.value.slice()
  ;[arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]
  products.value = arr
}
function remove(id: string) {
  products.value = products.value.filter((p) => p.id !== id)
}
async function saveList() {
  if (!roomId.value || !dirty.value || saving.value) return
  saving.value = true
  try {
    const ids = products.value.map((p) => p.id)
    await liveApi.saveRoomProducts(roomId.value, ids)
    savedProductIds.value = ids.slice()
    uni.showToast({ title: '商品清单已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败，请重试', icon: 'none' })
  } finally {
    saving.value = false
  }
}
function goManage() {
  navigateTo('/pkg-live/manage/index')
}
function handleBack() {
  if (!dirty.value) {
    goBack()
    return
  }
  uni.showModal({
    title: '放弃未保存的修改？',
    content: '商品增删或顺序调整尚未保存。',
    confirmText: '放弃修改',
    confirmColor: '#C41E3A',
    success: (res) => { if (res.confirm) goBack() },
  })
}

// ── 选品层：真连 GET /shop/products?status=ON_SALE ──
const pickerOpen = ref(false)
const pickSearch = ref('')
const pool = ref<LivePickerProduct[]>([])
const pickLoading = ref(false)
const pickError = ref('')
const checkedIds = ref<string[]>([])

const addedIdSet = computed(() => new Set(products.value.map((p) => p.id)))
function isAdded(id: string) {
  return addedIdSet.value.has(id)
}
function isChecked(id: string) {
  return checkedIds.value.includes(id)
}

async function fetchPool() {
  pickLoading.value = true
  pickError.value = ''
  try {
    pool.value = await liveApi.getShopProductPool(pickSearch.value.trim() || undefined)
  } catch (e) {
    pool.value = []
    pickError.value = (e as Error)?.message || '商品库加载失败，请重试'
  } finally {
    pickLoading.value = false
  }
}

function openPicker() {
  if (!roomId.value) {
    goManage()
    return
  }
  pickerOpen.value = true
  checkedIds.value = []
  if (pool.value.length === 0) fetchPool()
}
function closePicker() {
  pickerOpen.value = false
}
function togglePick(id: string) {
  if (isAdded(id)) return // 已在清单中 → 置灰不可再选
  const i = checkedIds.value.indexOf(id)
  if (i >= 0) checkedIds.value.splice(i, 1)
  else if (products.value.length + checkedIds.value.length >= MAX_LIVE_PRODUCTS) {
    uni.showToast({ title: `每场最多添加 ${MAX_LIVE_PRODUCTS} 件商品`, icon: 'none' })
  } else checkedIds.value.push(id)
}
function confirmPick() {
  if (checkedIds.value.length === 0) return
  // 商品先并入本地编辑清单，点击“保存商品清单”后统一持久化
  const picked = pool.value
    .filter((p) => checkedIds.value.includes(p.id) && !isAdded(p.id))
    .map<LiveConfiguredProduct>((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      cover: p.cover,
      stock: p.stock ?? 0,
      sold: p.sold ?? 0,
    }))
  products.value = products.value.concat(picked)
  closePicker()
  uni.showToast({ title: `已加入 ${picked.length} 件，保存后生效`, icon: 'none' })
}

onLoad((q) => {
  roomId.value = (q?.id as string) || (q?.roomId as string) || ''
  fetchData()
})
</script>

<style scoped>
.products-page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 24rpx;
  background: #faf8f5;
  border-bottom: 1px solid #f0ebe2;
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-placeholder {
  width: 64rpx;
  height: 64rpx;
}

.page-body {
  padding: 20rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 场次说明 */
.caption {
  padding: 20rpx 24rpx;
  background: #fff;
  border: 1px solid #f0ebe2;
  border-radius: 16rpx;
}
.caption-text {
  font-size: 24rpx;
  color: #6e6e73;
  line-height: 1.6;
}
.caption-strong {
  color: #2c2c2c;
  font-weight: 600;
}

/* 空态 */
.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96rpx 40rpx;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #f0ebe2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}
.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 12rpx;
}
.empty-desc {
  font-size: 26rpx;
  color: #999;
  line-height: 1.7;
  text-align: center;
}
.empty-btn {
  margin-top: 36rpx;
  width: 320rpx;
  height: 92rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
}

/* 商品列表 */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.gcard {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border: 1px solid #f0ebe2;
  border-radius: 24rpx;
  padding: 20rpx;
}
/* 顺序 + 上下移 */
.order-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
  width: 52rpx;
}
.order-num {
  font-size: 24rpx;
  font-weight: 700;
  color: #c9a96e;
  margin-bottom: 2rpx;
}
.order-btn {
  width: 48rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  background: #f7f4ee;
}
.order-btn-disabled {
  opacity: 0.5;
}

/* 缩略图（固定宽高） */
.thumb {
  width: 112rpx;
  height: 112rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f0ebe2;
  flex-shrink: 0;
}
.thumb-sm {
  width: 96rpx;
  height: 96rpx;
}
.thumb-img {
  width: 100%;
  height: 100%;
}
.thumb-ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ginfo {
  flex: 1;
  min-width: 0;
}
.gt-row {
  display: flex;
  align-items: center;
}
.gt {
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2c2c;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gprice-row {
  margin-top: 10rpx;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12rpx;
}
.gp {
  font-size: 30rpx;
  font-weight: 700;
  color: #c41e3a;
}
.gp-sub {
  font-size: 22rpx;
  color: #999;
}

/* 移除 */
.gops {
  flex-shrink: 0;
}
.remove-btn {
  height: 56rpx;
  padding: 0 24rpx;
  border: 1px solid #ddd5c8;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  background: #fff;
}
.remove-text {
  font-size: 24rpx;
  color: #6e6e73;
}

/* 添加商品（金色虚线） */
.addbar {
  height: 92rpx;
  border: 1px dashed #c9a96e;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #c9a96e;
  background: #fbf6ec;
  margin-top: 8rpx;
}

/* 保存 CTA */
.cta {
  height: 96rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 30rpx;
  font-weight: 600;
  margin-top: 12rpx;
}
.cta-disabled {
  background: #d8d0c5;
}
.save-panel {
  padding-top: 4rpx;
}
.save-hint {
  font-size: 22rpx;
  color: #b8b2a8;
  text-align: center;
  margin-top: 8rpx;
}
.save-spinner {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .save-spinner { animation: none; }
}

.bottom-spacer {
  height: 64rpx;
}

/* ── 半屏选品层 ── */
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}
.sheet {
  width: 100%;
  height: 78vh;
  background: #faf8f5;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.sheet-head {
  position: relative;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.sheet-x {
  position: absolute;
  right: 0;
  top: 0;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 搜索框（明确 height，防原生 input 塌陷） */
.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.search-icon {
  position: absolute;
  left: 22rpx;
  z-index: 1;
}
.search-input {
  width: 100%;
  height: 76rpx;
  padding: 0 24rpx 0 66rpx;
  font-size: 26rpx;
  color: #2c2c2c;
  background: #fff;
  border: 1px solid #f0ebe2;
  border-radius: 999rpx;
  box-sizing: border-box;
}
.search-ph {
  color: #b8b2a8;
}

.pick-scroll {
  flex: 1;
  min-height: 0;
}
.pick-loading,
.pick-empty {
  padding: 96rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pick-loading-text,
.pick-empty-text {
  font-size: 26rpx;
  color: #999;
}
.pick-retry {
  margin-top: 20rpx;
  min-width: 176rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border: 1px solid #c9a96e;
  border-radius: 999rpx;
  color: #9a7434;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pick {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 8rpx;
  border-bottom: 1px solid #f0ebe2;
}
.pick-added {
  opacity: 0.45;
}
.ck {
  width: 40rpx;
  height: 40rpx;
  border: 1px solid #ddd5c8;
  background: #fff;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ck-on {
  background: #c41e3a;
  border-color: #c41e3a;
}
.added-tag {
  font-size: 20rpx;
  background: #ddd5c8;
  color: #fff;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}
.sheet-cta {
  margin-top: 20rpx;
}

/* ── 骨架屏 ── */
.sk-caption {
  height: 72rpx;
  background: #ece8e1;
  border-radius: 16rpx;
}
.sk-card {
  display: flex;
  gap: 16rpx;
  background: #fff;
  border: 1px solid #f0ebe2;
  border-radius: 24rpx;
  padding: 20rpx;
}
.sk-thumb {
  width: 112rpx;
  height: 112rpx;
  border-radius: 16rpx;
  background: #ece8e1;
  flex-shrink: 0;
}
.sk-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-top: 12rpx;
}
.sk-line {
  height: 24rpx;
  background: #ece8e1;
  border-radius: 8rpx;
}
.sk-w80 {
  width: 80%;
}
.sk-w40 {
  width: 40%;
}
.sk-addbar {
  height: 92rpx;
  background: #ece8e1;
  border-radius: 20rpx;
}

/* ── 错误态 ── */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 128rpx 0;
}
.error-text {
  font-size: 26rpx;
  color: #999;
  margin-top: 24rpx;
}
.error-btn {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  font-size: 26rpx;
  color: #fff;
  background: #c41e3a;
  border-radius: 999rpx;
}
</style>
