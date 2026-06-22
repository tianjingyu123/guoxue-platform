<template>
  <view v-if="isLoading" class="center">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="160rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="160rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="120rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无订单" />
  <view v-else class="center">
    <!-- 头部 -->
    <view
      class="header"
      :style="{ paddingTop: 'calc(12rpx + var(--status-bar-height, 0px))' }"
    >
      <app-nav-bar
        title="我的订单"
        :back-size="40"
        background="transparent"
        no-border
      />
      <!-- 品类Tab -->
      <scroll-view
        scroll-x
        class="cats"
        :show-scrollbar="false"
      >
        <view class="cats-inner">
          <view
            v-for="cat in categories"
            :key="cat.key"
            class="cat"
            :class="{ active: activeCategory === cat.key }"
            @tap="activeCategory = cat.key"
          >
            <app-icon
              :name="cat.icon"
              :size="28"
              :color="activeCategory === cat.key ? '#FFFFFF' : '#999999'"
            />
            <text
              class="cat-text"
              :class="{ active: activeCategory === cat.key }"
            >
              {{ cat.label }}
            </text>
            <view
              v-if="counts[cat.key] > 0"
              class="cat-badge"
              :class="{ active: activeCategory === cat.key }"
            >
              <text class="cat-badge-text">
                {{ counts[cat.key] }}
              </text>
            </view>
          </view>
        </view>
      </scroll-view>
      <!-- 状态筛选 -->
      <scroll-view
        scroll-x
        class="states"
        :show-scrollbar="false"
      >
        <view class="states-inner">
          <view
            class="state"
            :class="{ active: activeStatus === '' }"
            @tap="activeStatus = ''"
          >
            <text
              class="state-text"
              :class="{ active: activeStatus === '' }"
            >
              全部状态
            </text>
          </view>
          <view
            v-for="(s, key) in statusConfig"
            :key="key"
            class="state"
            :class="{ active: activeStatus === key }"
            @tap="activeStatus = key"
          >
            <text
              class="state-text"
              :class="{ active: activeStatus === key }"
            >
              {{ s.label }}
            </text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 列表 -->
    <view class="content">
      <view
        v-if="filtered.length === 0"
        class="empty"
      >
        <app-icon
          name="package"
          :size="96"
          color="#E8E3DB"
        />
        <text class="empty-text">
          暂无订单
        </text>
      </view>

      <view
        v-for="order in filtered"
        :key="order.id"
        class="order-card"
      >
        <!-- 头 -->
        <view class="card-head">
          <view class="head-left">
            <view
              class="cat-tag"
              :style="{ background: catColor(order.category).bg, color: catColor(order.category).color }"
            >
              <app-icon
                :name="catIcon(order.category)"
                :size="22"
                :color="catColor(order.category).color"
              />
              <text
                class="cat-tag-text"
                :style="{ color: catColor(order.category).color }"
              >
                {{ catLabel(order.category) }}
              </text>
            </view>
            <text class="card-no">
              {{ order.orderNo }}
            </text>
          </view>
          <text
            class="card-status"
            :style="{ color: statusConfig[order.status].color }"
          >
            {{ statusConfig[order.status].label }}
          </text>
        </view>

        <!-- 内容 -->
        <view class="card-body">
          <image
            v-if="order.cover"
            class="cover"
            :src="order.cover"
            mode="aspectFill"
          />
          <view
            v-else
            class="cover ph"
            :style="{ background: catColor(order.category).bg }"
          >
            <app-icon
              :name="catIcon(order.category)"
              :size="44"
              :color="catColor(order.category).color"
            />
          </view>
          <view class="info">
            <text class="title">
              {{ order.title }}
            </text>
            <view class="meta">
              <text
                v-if="order.extra?.teacherName"
                class="meta-text"
              >
                讲师: {{ order.extra.teacherName }}
              </text>
              <text
                v-if="order.extra?.duration"
                class="meta-text"
              >
                {{ order.extra.duration }}
              </text>
              <text
                v-if="order.extra?.quantity"
                class="meta-text"
              >
                x{{ order.extra.quantity }}
              </text>
            </view>
            <view
              v-if="order.expiredAt"
              class="expire"
            >
              <app-icon
                name="clock"
                :size="22"
                color="#999999"
              />
              <text
                class="expire-text"
                :class="{ expired: isExpired(order.expiredAt) }"
              >
                有效期至 {{ order.expiredAt }}
              </text>
            </view>
          </view>
          <view class="price-box">
            <text class="price">
              {{ order.price > 0 ? `¥${order.price}` : '免费' }}
            </text>
            <text
              v-if="order.originalPrice && order.originalPrice > order.price"
              class="origin"
            >
              ¥{{ order.originalPrice }}
            </text>
          </view>
        </view>

        <!-- 脚 -->
        <view class="card-foot">
          <text class="foot-time">
            {{ order.createdAt }}
          </text>
          <view class="foot-actions">
            <template v-if="order.status === 'pending'">
              <view class="mini ghost">
                <text>取消订单</text>
              </view>
              <view class="mini primary">
                <text>去付款</text>
              </view>
            </template>
            <template v-else-if="order.status === 'expired'">
              <view class="mini warn">
                <text>立即续费</text>
              </view>
            </template>
            <template v-else-if="order.status === 'completed' && order.expiredAt && !isExpired(order.expiredAt)">
              <view class="mini ghost">
                <text>续费</text>
              </view>
            </template>
            <template v-else-if="order.status === 'completed'">
              <view class="mini text">
                <text>查看详情</text><app-icon
                  name="chevron-right"
                  :size="22"
                  color="#999999"
                />
              </view>
            </template>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import {
  mockUnifiedOrders as _mockUnifiedOrders, orderCategories as _orderCategories, unifiedStatusConfig as _unifiedStatusConfig, categoryColorMap as _categoryColorMap,
  type OrderCategory, type UnifiedOrderStatus,
} from '@/lib/order-data'

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  return { orders: _mockUnifiedOrders, categories: _orderCategories, config: _unifiedStatusConfig, colorMap: _categoryColorMap }
})

const categories = computed<typeof _orderCategories>(() => pageData.value?.categories ?? [])
const unifiedStatusConfig = computed<typeof _unifiedStatusConfig>(() => pageData.value?.config ?? _unifiedStatusConfig)
const categoryColorMap = computed<typeof _categoryColorMap>(() => pageData.value?.colorMap ?? _categoryColorMap)
const statusConfig = unifiedStatusConfig
const mockUnifiedOrders = computed(() => pageData.value?.orders ?? [])
const isEmpty = computed(() => mockUnifiedOrders.value.length === 0)

const activeCategory = ref<OrderCategory>('all')
const activeStatus = ref<UnifiedOrderStatus | ''>('')

const filtered = computed(() =>
  mockUnifiedOrders.value.filter((o) => {
    if (activeCategory.value !== 'all' && o.category !== activeCategory.value) return false
    if (activeStatus.value && o.status !== activeStatus.value) return false
    return true
  })
)
const counts = computed(() => {
  const acc: Record<string, number> = {}
  for (const cat of categories.value) {
    acc[cat.key] = cat.key === 'all' ? mockUnifiedOrders.value.length : mockUnifiedOrders.value.filter((o) => o.category === cat.key).length
  }
  return acc
})

function catColor(c: OrderCategory) { return categoryColorMap.value[c] }
function catIcon(c: OrderCategory) { return categories.value.find((x) => x.key === c)?.icon || 'package' }
function catLabel(c: OrderCategory) { return categories.value.find((x) => x.key === c)?.label || '' }
function isExpired(date: string) { return new Date(date).getTime() < Date.now() }
</script>

<style lang="scss" scoped>
.center { min-height: 100vh; background: #FAF8F5; }
.header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-bottom: 1rpx solid #E8E3DB; }
.cats { white-space: nowrap; padding: 8rpx 0; }
.cats-inner { display: inline-flex; gap: 16rpx; padding: 0 24rpx; }
.cat { flex-shrink: 0; display: flex; align-items: center; gap: 10rpx; padding: 12rpx 24rpx; border-radius: 40rpx; background: #F3F0EB; }
.cat.active { background: #C41E3A; }
.cat-text { font-size: 24rpx; color: #999999; }
.cat-text.active { color: #FFFFFF; }
.cat-badge { min-width: 30rpx; height: 30rpx; border-radius: 16rpx; background: #E8E3DB; display: flex; align-items: center; justify-content: center; padding: 0 6rpx; }
.cat-badge.active { background: rgba(255,255,255,0.25); }
.cat-badge-text { font-size: 20rpx; color: #666666; }
.cat-badge.active .cat-badge-text { color: #FFFFFF; }
.states { white-space: nowrap; padding-bottom: 12rpx; }
.states-inner { display: inline-flex; gap: 12rpx; padding: 0 24rpx; }
.state { flex-shrink: 0; padding: 8rpx 20rpx; border-radius: 8rpx; }
.state.active { background: rgba(196,30,58,0.1); }
.state-text { font-size: 24rpx; color: #999999; }
.state-text.active { color: #C41E3A; font-weight: 600; }
.content { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-text { font-size: 26rpx; color: #999999; margin-top: 20rpx; }
.order-card { background: #FFFFFF; border-radius: 20rpx; overflow: hidden; }
.card-head { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 20rpx; border-bottom: 1rpx solid #E8E3DB; background: rgba(245,242,235,0.4); }
.head-left { display: flex; align-items: center; gap: 12rpx; }
.cat-tag { display: flex; align-items: center; gap: 6rpx; padding: 4rpx 14rpx; border-radius: 8rpx; }
.cat-tag-text { font-size: 20rpx; font-weight: 600; }
.card-no { font-size: 20rpx; color: #999999; }
.card-status { font-size: 24rpx; font-weight: 600; }
.card-body { display: flex; gap: 20rpx; padding: 20rpx; }
.cover { width: 120rpx; height: 120rpx; border-radius: 12rpx; flex-shrink: 0; background: #FAF8F5; }
.cover.ph { display: flex; align-items: center; justify-content: center; }
.info { flex: 1; min-width: 0; }
.title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.meta { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 8rpx; }
.meta-text { font-size: 20rpx; color: #999999; }
.expire { display: flex; align-items: center; gap: 6rpx; margin-top: 8rpx; }
.expire-text { font-size: 20rpx; color: #999999; }
.expire-text.expired { color: #EF4444; }
.price-box { text-align: right; flex-shrink: 0; }
.price { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.origin { display: block; font-size: 20rpx; color: #999999; text-decoration: line-through; margin-top: 4rpx; }
.card-foot { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 20rpx; border-top: 1rpx solid #E8E3DB; background: rgba(245,242,235,0.25); }
.foot-time { font-size: 20rpx; color: #999999; }
.foot-actions { display: flex; align-items: center; gap: 16rpx; }
.mini { display: flex; align-items: center; gap: 4rpx; padding: 8rpx 20rpx; border-radius: 8rpx; }
.mini text { font-size: 24rpx; }
.mini.ghost { border: 1rpx solid #E8E3DB; color: #666666; }
.mini.primary { background: #C41E3A; color: #FFFFFF; }
.mini.warn { background: #F59E0B; color: #FFFFFF; }
.mini.text { color: #999999; }
</style>
