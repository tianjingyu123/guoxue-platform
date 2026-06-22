<template>
  <view v-if="isLoading" class="compare-page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="88rpx" radius="0" mb="24rpx" />
      <AppSkeleton width="100%" height="160rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="400rpx" radius="24rpx" mb="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无对比数据" />
  <view v-else class="compare-page">
    <!-- 导航栏 -->
    <app-nav-bar title="商品对比" back-icon="arrow-left" :back-size="40" color="#2C2C2C">
      <template #right>
        <view
          class="nav-diff"
          :class="{ 'nav-diff--on': onlyDiff }"
          hover-class="nav-hover"
          @tap="onlyDiff = !onlyDiff"
        >
          <text class="nav-diff-text" :class="{ 'nav-diff-text--on': onlyDiff }">只看差异</text>
        </view>
      </template>
    </app-nav-bar>

    <scroll-view scroll-y class="compare-body">
      <!-- 商品选择区 -->
      <view class="picker">
        <scroll-view scroll-x class="picker-scroll">
          <view class="picker-list">
            <view v-for="(p, idx) in picked" :key="p.id" class="pcard">
              <view class="pcard-cover" hover-class="card-hover" @tap="goDetail(p.id)">
                <image class="pcard-img" :src="p.cover" mode="aspectFill" />
              </view>
              <text class="pcard-name">{{ p.name }}</text>
              <text class="pcard-price">¥{{ p.price }}</text>
              <view class="pcard-del" @tap="removeAt(idx)">
                <app-icon name="x" :size="24" color="#fff" />
              </view>
            </view>

            <!-- 添加插槽 -->
            <view v-if="selected.length < 4" class="empty-slot" hover-class="card-hover" @tap="showPicker = true">
              <app-icon name="plus" :size="56" color="#C9A96E" />
              <text class="empty-slot-text">添加商品</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 对比表格 -->
      <view class="table" v-if="picked.length">
        <view v-for="g in visibleGroups" :key="g.group" class="group">
          <!-- 分组标题 -->
          <view class="group-head" hover-class="card-hover" @tap="toggleGroup(g.group)">
            <text class="group-title">{{ g.group }}</text>
            <app-icon :name="isCollapsed(g.group) ? 'chevron-down' : 'chevron-up'" :size="32" color="#999999" />
          </view>

          <template v-if="!isCollapsed(g.group)">
            <view
              v-for="row in g.rows"
              :key="row.key"
              class="trow"
              :class="{ 'trow--diff': row.diff }"
            >
              <!-- 参数名 -->
              <view class="td-label">
                <text class="td-label-text">{{ row.label }}</text>
                <view v-if="row.diff" class="diff-dot" />
              </view>
              <!-- 各商品值 -->
              <view class="td-values">
                <view
                  v-for="(val, ci) in row.values"
                  :key="ci"
                  class="td-cell"
                  :class="{
                    'td-cell--best': row.bestIdx === ci,
                    'td-cell--diff': row.diff && row.bestIdx !== ci,
                  }"
                >
                  <text class="td-cell-text">{{ val ?? '—' }}</text>
                </view>
              </view>
            </view>
          </template>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作区 -->
    <view class="footer" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="footer-row">
        <view
          v-for="p in picked"
          :key="p.id"
          class="footer-btn"
          hover-class="btn-hover"
          @tap="goDetail(p.id)"
        >
          <app-icon name="external-link" :size="28" color="#fff" />
          <text class="footer-btn-text">查看</text>
        </view>
      </view>
    </view>

    <!-- 商品选择弹窗 -->
    <view v-if="showPicker" class="modal">
      <view class="modal-mask" @tap="showPicker = false" />
      <view class="modal-sheet">
        <view class="modal-head">
          <text class="modal-title">选择对比商品</text>
          <view class="modal-close" @tap="showPicker = false">
            <app-icon name="x" :size="32" color="#666666" />
          </view>
        </view>
        <scroll-view scroll-y class="modal-list">
          <view
            v-for="pid in pickableIds"
            :key="pid"
            class="modal-item"
            hover-class="card-hover"
            @tap="addProduct(pid)"
          >
            <image class="modal-cover" :src="products[pid].cover" mode="aspectFill" />
            <view class="modal-info">
              <text class="modal-name">{{ products[pid].name }}</text>
              <text class="modal-price">¥{{ products[pid].price }}</text>
            </view>
          </view>
          <view v-if="!pickableIds.length" class="modal-empty">
            <text class="modal-empty-text">已无更多可添加的商品</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { shopApi, type CompareProduct } from '@/lib/shop-data'
const comparePickList: any[] = []
const _products: CompareProduct[] = []

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  return { products: _products }
})

const products = computed(() => pageData.value?.products ?? {})
const isEmpty = computed(() => Object.keys(products.value).length === 0)

const safeBottom = ref(0)
try {
  const sys = uni.getSystemInfoSync()
  safeBottom.value = sys.safeAreaInsets?.bottom ?? 0
} catch (e) {}

const selected = ref<string[]>(['p1', 'p2'])
const showPicker = ref(false)
const onlyDiff = ref(false)
const collapsed = ref<string[]>([])

const picked = computed<CompareProduct[]>(() => selected.value.map((id) => products.value[id]).filter(Boolean))
const pickableIds = computed(() => comparePickList.filter((id) => !selected.value.includes(id)))

function goDetail(id: string) {
  uni.navigateTo({ url: `/pkg-shop/detail/index?id=${id}` })
}
function removeAt(idx: number) {
  selected.value.splice(idx, 1)
}
function addProduct(id: string) {
  if (selected.value.length >= 4) return
  selected.value.push(id)
  showPicker.value = false
}
function toggleGroup(group: string) {
  const i = collapsed.value.indexOf(group)
  if (i >= 0) collapsed.value.splice(i, 1)
  else collapsed.value.push(group)
}
function isCollapsed(group: string) {
  return collapsed.value.includes(group)
}

function isDifferent(values: (string | undefined)[]) {
  const nonEmpty = values.filter(Boolean) as string[]
  if (nonEmpty.length < 2) return false
  return new Set(nonEmpty).size > 1
}

interface Row {
  key: string
  label: string
  values: (string | undefined)[]
  diff: boolean
  bestIdx: number
}
interface Group {
  group: string
  rows: Row[]
}

// 参数分组定义
const groups = computed<Group[]>(() => {
  const list = picked.value
  if (!list.length) return []

  const priceKeys = [
    { key: 'price', label: '当前价格', get: (p: CompareProduct) => `¥${p.price}`, lowerBetter: true },
    { key: 'originalPrice', label: '原价', get: (p: CompareProduct) => `¥${p.originalPrice}`, lowerBetter: false },
    { key: 'sales', label: '销量', get: (p: CompareProduct) => `${p.sales}人`, lowerBetter: false },
    { key: 'rating', label: '评分', get: (p: CompareProduct) => `${p.rating}分`, lowerBetter: false },
  ]
  const priceRows: Row[] = priceKeys.map((k) => {
    const values = list.map((p) => k.get(p))
    const diff = isDifferent(values)
    let bestIdx = -1
    if (diff && k.key === 'price') {
      let best = Infinity
      list.forEach((p, i) => {
        if (p.price < best) { best = p.price; bestIdx = i }
      })
    }
    return { key: k.key, label: k.label, values, diff, bestIdx }
  })

  const specNames = list[0].specs.map((s) => s.name)
  const specRows: Row[] = specNames.map((name) => {
    const values = list.map((p) => p.specs.find((s) => s.name === name)?.value || '—')
    return { key: name, label: name, values, diff: isDifferent(values), bestIdx: -1 }
  })

  return [
    { group: '价格信息', rows: priceRows },
    { group: '课程规格', rows: specRows },
  ]
})

// "只看差异" 过滤
const visibleGroups = computed<Group[]>(() => {
  if (!onlyDiff.value) return groups.value
  return groups.value
    .map((g) => ({ group: g.group, rows: g.rows.filter((r) => r.diff) }))
    .filter((g) => g.rows.length > 0)
})
</script>

<style lang="scss" scoped>
.compare-page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 导航右侧只看差异 */
.nav-diff {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  border: 2rpx solid #e8e3db;
}
.nav-diff--on {
  background: #c41e3a;
  border-color: #c41e3a;
}
.nav-hover {
  opacity: 0.7;
}
.nav-diff-text {
  font-size: 24rpx;
  color: #666666;
}
.nav-diff-text--on {
  color: #fff;
}

.compare-body {
  height: calc(100vh - 88rpx - var(--status-bar-height, 0px) - 140rpx);
}

/* 商品选择区 */
.picker {
  background: #fff;
  border-bottom: 1rpx solid #e8e3db;
  padding: 28rpx 32rpx;
}
.picker-scroll {
  white-space: nowrap;
}
.picker-list {
  display: inline-flex;
  gap: 24rpx;
  padding-bottom: 8rpx;
}
.pcard {
  position: relative;
  width: 224rpx;
  flex-shrink: 0;
}
.pcard-cover {
  width: 224rpx;
  height: 224rpx;
  border-radius: 28rpx;
  overflow: hidden;
  border: 1rpx solid #e8e3db;
  background: #faf8f5;
}
.pcard-img {
  width: 100%;
  height: 100%;
}
.card-hover {
  opacity: 0.85;
}
.pcard-name {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #2c2c2c;
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pcard-price {
  display: block;
  margin-top: 4rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #c41e3a;
}
.pcard-del {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #2c2c2c;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 空插槽 */
.empty-slot {
  width: 224rpx;
  height: 224rpx;
  flex-shrink: 0;
  border: 4rpx dashed #e8e3db;
  border-radius: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.empty-slot-text {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;
}

/* 对比表 */
.table {
  margin-top: 16rpx;
}
.group {
  margin-bottom: 16rpx;
}
.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #faf8f5;
}
.group-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.trow {
  display: flex;
  border-bottom: 1rpx solid #e8e3db;
  background: #fff;
}
.trow--diff {
  background: #fff5f5;
}
.td-label {
  width: 192rpx;
  flex-shrink: 0;
  padding: 24rpx 24rpx;
  display: flex;
  align-items: center;
}
.td-label-text {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.4;
}
.diff-dot {
  margin-left: 8rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #c41e3a;
  flex-shrink: 0;
}
.td-values {
  flex: 1;
  display: flex;
  min-width: 0;
}
.td-cell {
  flex: 1;
  min-width: 0;
  padding: 24rpx 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-left: 1rpx solid #e8e3db;
}
.td-cell:first-child {
  border-left: none;
}
.td-cell-text {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.4;
}
.td-cell--diff .td-cell-text {
  color: #2c2c2c;
  font-weight: 600;
}
.td-cell--best .td-cell-text {
  color: #c41e3a;
  font-weight: 700;
}

/* 底部操作区 */
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top: 1rpx solid #e8e3db;
  padding: 20rpx 32rpx;
  z-index: 20;
}
.footer-row {
  display: flex;
  gap: 24rpx;
}
.footer-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.btn-hover {
  opacity: 0.85;
}
.footer-btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
}

/* 选择弹窗 */
.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
}
.modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}
.modal-sheet {
  position: relative;
  width: 100%;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 32rpx 32rpx 64rpx;
  max-height: 60vh;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}
.modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.modal-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-list {
  max-height: 40vh;
}
.modal-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  border: 1rpx solid #e8e3db;
  margin-bottom: 24rpx;
}
.modal-cover {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  background: #faf8f5;
  flex-shrink: 0;
}
.modal-info {
  flex: 1;
  min-width: 0;
}
.modal-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.modal-price {
  display: block;
  margin-top: 6rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #c41e3a;
}
.modal-empty {
  padding: 60rpx 0;
  text-align: center;
}
.modal-empty-text {
  font-size: 26rpx;
  color: #999999;
}
</style>
