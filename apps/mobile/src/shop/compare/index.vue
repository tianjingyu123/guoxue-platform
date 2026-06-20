<template>
  <view class="compare-page">
    <!-- 自定义导航栏 -->
    <view class="navbar">
      <view
        class="nav-back"
        hover-class="nav-hover"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#1a1a1a"
        />
      </view>
      <text class="nav-title">
        商品对比
      </text>
      <view
        class="nav-right"
        hover-class="nav-hover"
        @tap="clearAll"
      >
        <text class="nav-clear">
          清空
        </text>
      </view>
    </view>

    <!-- Loading -->
    <view
      v-if="loading"
      class="load-state"
    >
      <view class="load-spinner" />
      <text class="load-text">
        加载中...
      </text>
    </view>

    <!-- Error -->
    <view
      v-else-if="error"
      class="err-state"
    >
      <app-icon
        name="alert-circle"
        :size="80"
        color="#CCCCCC"
      />
      <text class="err-text">
        加载失败
      </text>
      <view
        class="err-btn"
        @tap="loadData"
      >
        重新加载
      </view>
    </view>

    <!-- Content -->
    <template v-else>
      <scroll-view
        scroll-y
        class="compare-body"
      >
        <!-- 已选商品横向滚动选择 -->
        <view class="picker">
          <text class="picker-title">
            选择对比商品（最多4件）
          </text>
          <scroll-view
            scroll-x
            class="picker-scroll"
          >
            <view class="picker-list">
              <view
                v-for="pid in comparePickList"
                :key="pid"
                class="picker-item"
                :class="{ 'picker-item--on': selected.includes(pid) }"
                hover-class="card-hover"
                @tap="toggle(pid)"
              >
                <image
                  class="picker-cover"
                  :src="products[pid]?.cover"
                  mode="aspectFill"
                />
                <text class="picker-name">
                  {{ products[pid]?.name }}
                </text>
                <view
                  v-if="selected.includes(pid)"
                  class="picker-check"
                >
                  <app-icon
                    name="check"
                    :size="24"
                    color="#fff"
                  />
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 对比表 -->
        <view
          v-if="picked.length"
          class="table"
        >
          <!-- 商品头 -->
          <view class="table-head">
            <view class="th-label" />
            <view
              v-for="p in picked"
              :key="p.id"
              class="th-col"
            >
              <image
                class="th-cover"
                :src="p.cover"
                mode="aspectFill"
              />
              <text class="th-name">
                {{ p.name }}
              </text>
            </view>
          </view>

          <!-- 价格行 -->
          <view class="trow">
            <view class="td-label">
              价格
            </view>
            <view
              v-for="p in picked"
              :key="p.id"
              class="td-col"
            >
              <text
                class="price"
                :class="{ 'price--best': p.price === minPrice }"
              >
                ¥{{ p.price }}
              </text>
              <text class="price-old">
                ¥{{ p.originalPrice }}
              </text>
            </view>
          </view>
          <!-- 销量行 -->
          <view class="trow trow--alt">
            <view class="td-label">
              销量
            </view>
            <view
              v-for="p in picked"
              :key="p.id"
              class="td-col"
            >
              <text
                class="td-val"
                :class="{ 'td-val--best': p.sales === maxSales }"
              >
                {{ p.sales }}
              </text>
            </view>
          </view>
          <!-- 评分行 -->
          <view class="trow">
            <view class="td-label">
              评分
            </view>
            <view
              v-for="p in picked"
              :key="p.id"
              class="td-col"
            >
              <text
                class="td-val"
                :class="{ 'td-val--best': p.rating === maxRating }"
              >
                {{ p.rating }}
              </text>
            </view>
          </view>
          <!-- 规格行 -->
          <view
            v-for="(spec, idx) in specNames"
            :key="spec"
            class="trow"
            :class="{ 'trow--alt': idx % 2 === 0 }"
          >
            <view class="td-label">
              {{ spec }}
            </view>
            <view
              v-for="p in picked"
              :key="p.id"
              class="td-col"
            >
              <text class="td-val">
                {{ specValue(p, spec) }}
              </text>
            </view>
          </view>
        </view>

        <!-- 空态 -->
        <view
          v-else
          class="empty"
        >
          <app-icon
            name="layers"
            :size="96"
            color="#d4c5a9"
          />
          <text class="empty-text">
            请至少选择 2 件商品进行对比
          </text>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'

const loading = ref(true)
const error = ref(false)
const products = ref<Record<string, any>>({})
const comparePickList = ref<string[]>([])

const selected = ref<string[]>(['p1', 'p2'])

onLoad(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  error.value = false
  try {
    const res = await shopApi.getCompareProducts()
    products.value = res.products
    comparePickList.value = res.pickList || []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function toggle(pid: string) {
  const i = selected.value.indexOf(pid)
  if (i >= 0) {
    selected.value.splice(i, 1)
  } else {
    if (selected.value.length >= 4) {
      uni.showToast({ title: '最多对比4件', icon: 'none' })
      return
    }
    selected.value.push(pid)
  }
}
function clearAll() {
  selected.value = []
}

const picked = computed(() => selected.value.map((id) => products.value[id]).filter(Boolean))
const specNames = computed(() => (picked.value[0] ? picked.value[0].specs.map((s: any) => s.name) : []))
const minPrice = computed(() => Math.min(...picked.value.map((p: any) => p.price)))
const maxSales = computed(() => Math.max(...picked.value.map((p: any) => p.sales)))
const maxRating = computed(() => Math.max(...picked.value.map((p: any) => p.rating)))

function specValue(p: any, name: string): string {
  const s = p.specs.find((x: any) => x.name === name)
  return s ? s.value : '-'
}
</script>

<style lang="scss" scoped>
.compare-page {
  min-height: 100vh;
  background: #f5f1e8;
}
.load-state, .err-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20rpx;
}
.load-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid #E8E3DB;
  border-top-color: #b3261e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.load-text { font-size: 28rpx; color: #8a7d65; }
.err-text { font-size: 28rpx; color: #8a7d65; margin-top: 16rpx; }
.err-btn {
  margin-top: 24rpx;
  padding: 16rpx 48rpx;
  border: 1rpx solid #E8E3DB;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #8a7d65;
}
.navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0px);
  background: #fff;
  border-bottom: 1rpx solid #efe8da;
}
.nav-back,
.nav-right {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  opacity: 0.5;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.nav-clear {
  font-size: 26rpx;
  color: #8a7d65;
}
.compare-body {
  height: calc(100vh - 88rpx - var(--status-bar-height, 0px));
}

.picker {
  padding: 24rpx;
}
.picker-title {
  font-size: 26rpx;
  color: #8a7d65;
  margin-bottom: 16rpx;
  display: block;
}
.picker-scroll {
  white-space: nowrap;
}
.picker-list {
  display: inline-flex;
  gap: 16rpx;
}
.picker-item {
  position: relative;
  width: 160rpx;
  padding: 12rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  box-sizing: border-box;
}
.picker-item--on {
  border-color: #b3261e;
}
.card-hover {
  opacity: 0.85;
}
.picker-cover {
  width: 100%;
  height: 136rpx;
  border-radius: 12rpx;
  background: #f0ece2;
}
.picker-name {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #3a3024;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.picker-check {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #b3261e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table {
  margin: 0 24rpx 40rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}
.table-head {
  display: flex;
  border-bottom: 1rpx solid #efe8da;
}
.th-label {
  width: 140rpx;
  flex-shrink: 0;
}
.th-col {
  flex: 1;
  min-width: 0;
  padding: 20rpx 12rpx;
  text-align: center;
}
.th-cover {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  background: #f0ece2;
}
.th-name {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #3a3024;
  line-height: 1.3;
  display: block;
}
.trow {
  display: flex;
  align-items: center;
}
.trow--alt {
  background: #faf7f0;
}
.td-label {
  width: 140rpx;
  flex-shrink: 0;
  padding: 20rpx 16rpx;
  font-size: 24rpx;
  color: #8a7d65;
}
.td-col {
  flex: 1;
  min-width: 0;
  padding: 20rpx 8rpx;
  text-align: center;
}
.td-val {
  font-size: 26rpx;
  color: #3a3024;
}
.td-val--best {
  color: #b3261e;
  font-weight: 600;
}
.price {
  font-size: 30rpx;
  font-weight: 700;
  color: #3a3024;
}
.price--best {
  color: #b3261e;
}
.price-old {
  margin-left: 6rpx;
  font-size: 22rpx;
  color: #b8ab94;
  text-decoration: line-through;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
}
.empty-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #8a7d65;
}
</style>
