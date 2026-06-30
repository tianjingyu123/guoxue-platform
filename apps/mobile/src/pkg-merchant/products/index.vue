<template>
  <view class="pl-page">
    <!-- 顶部导航 -->
    <view class="pl-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pl-header-inner">
        <view class="pl-back" @tap="go('/merchant/dashboard')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="pl-title">商品管理</text>
        <view class="pl-add" @tap="go('/merchant/product-edit')">
          <AppIcon name="plus" :size="16" color="#fff" />
          <text class="pl-add-txt">发布商品</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="pl-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 搜索和筛选 -->
      <view class="pl-toolbar">
        <view class="pl-search-row">
          <view class="pl-search">
            <AppIcon name="search" :size="16" color="#9ca3af" />
            <input class="pl-search-input" v-model="searchQuery" placeholder="搜索商品名称" placeholder-class="pl-ph" />
          </view>
        </view>
        <!-- 状态标签 -->
        <view class="pl-tabs">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="pl-tab"
            :class="{ active: activeTab === t.key }"
            @tap="switchTab(t.key)"
          >
            {{ t.label }}
          </view>
        </view>
      </view>

      <!-- Loading -->
      <view v-if="loading" class="pl-state">
        <text class="pl-state-txt">加载中…</text>
      </view>
      <!-- Error -->
      <view v-else-if="error" class="pl-state">
        <AppIcon name="alert-circle" :size="44" color="#dc2626" />
        <text class="pl-state-txt">{{ error }}</text>
        <view class="pl-state-btn" @tap="load"><text class="pl-state-btn-txt">重试</text></view>
      </view>
      <!-- Empty -->
      <view v-else-if="filteredProducts.length === 0" class="pl-state">
        <AppIcon name="package" :size="44" color="#ccc" />
        <text class="pl-state-txt">{{ searchQuery ? '没有匹配的商品' : '暂无商品' }}</text>
        <view v-if="!searchQuery" class="pl-state-btn" @tap="go('/merchant/product-edit')">
          <text class="pl-state-btn-txt">发布第一个商品</text>
        </view>
      </view>

      <!-- 商品列表 -->
      <view v-else class="pl-list">
        <view v-for="p in filteredProducts" :key="p.id" class="pl-card">
          <view class="pl-card-row">
            <!-- 图片 -->
            <view class="pl-thumb">
              <image lazy-load v-if="p.images && p.images.length" :src="p.images[0]" class="pl-thumb-img" mode="aspectFill" />
              <AppIcon v-else name="package" :size="28" color="#c4b59a" />
            </view>
            <!-- 信息 -->
            <view class="pl-info">
              <view class="pl-info-top">
                <text class="pl-name">{{ p.title }}</text>
                <view class="pl-more" @tap.stop="openMenu(p)">
                  <AppIcon name="more-horizontal" :size="16" color="#6b7280" />
                </view>
              </view>
              <view class="pl-tags">
                <text class="pl-tag-cat">{{ categoryName(p.categoryId) }}</text>
                <text class="pl-tag-status" :style="{ color: statusLabel(p).color, background: statusLabel(p).bg }">
                  {{ statusLabel(p).label }}
                </text>
              </view>
              <view class="pl-price-row">
                <text class="pl-price-now">¥{{ Number(p.price).toFixed(2) }}</text>
              </view>
              <view class="pl-meta">
                <text class="pl-meta-label">库存: <text :class="{ 'pl-out': p.stock === 0 }">{{ p.stock }}</text></text>
                <text class="pl-meta-label">销量: {{ p.salesCount }}</text>
              </view>
            </view>
          </view>
        </view>
        <view style="height: 24px" />
      </view>
    </scroll-view>

    <!-- 操作菜单浮层 -->
    <view v-if="menuTarget" class="pl-mask" @tap="menuTarget = null">
      <view class="pl-sheet" @tap.stop>
        <view class="pl-sheet-item" @tap="goEdit">
          <AppIcon name="edit" :size="18" color="#1a1a1a" />
          <text>编辑商品</text>
        </view>
        <view v-if="menuTarget.status === 'OFF_SHELF'" class="pl-sheet-item" @tap="doList(menuTarget)">
          <AppIcon name="arrow-up-circle" :size="18" color="#15803d" />
          <text>上架商品</text>
        </view>
        <view v-else-if="menuTarget.status === 'ON_SALE'" class="pl-sheet-item" @tap="doUnlist(menuTarget)">
          <AppIcon name="arrow-down-circle" :size="18" color="#b45309" />
          <text>下架商品</text>
        </view>
        <view class="pl-sheet-item danger" @tap="doDelete(menuTarget)">
          <AppIcon name="trash-2" :size="18" color="#ef4444" />
          <text>删除商品</text>
        </view>
        <view class="pl-sheet-cancel" @tap="menuTarget = null">取消</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  categoryName,
  productStatusLabel,
  type MerchantProduct,
  type ProductStatus,
} from '@/lib/merchant-data'

const statusBarHeight = ref(0)

type TabKey = 'ALL' | ProductStatus
const tabs: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'ON_SALE', label: '在售' },
  { key: 'OFF_SHELF', label: '已下架' },
  { key: 'PENDING', label: '审核中' },
]

const activeTab = ref<TabKey>('ALL')
const searchQuery = ref('')
const products = ref<MerchantProduct[]>([])
const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const menuTarget = ref<MerchantProduct | null>(null)

const statusLabel = (p: MerchantProduct) => productStatusLabel(p)

const filteredProducts = computed(() =>
  products.value.filter((p) => !searchQuery.value || p.title.includes(searchQuery.value)),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const status = activeTab.value === 'ALL' ? undefined : activeTab.value
    const res = await merchantBackendApi.getProducts({ status })
    products.value = res.items
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function switchTab(key: TabKey) {
  if (activeTab.value === key) return
  activeTab.value = key
  load()
}

function openMenu(p: MerchantProduct) {
  menuTarget.value = p
}
function goEdit() {
  const id = menuTarget.value?.id
  menuTarget.value = null
  if (id) navigateTo(`/merchant/product-edit?id=${id}`)
}

async function doList(p: MerchantProduct) {
  if (submitting.value) return
  submitting.value = true
  menuTarget.value = null
  try {
    await merchantBackendApi.listProduct(p.id)
    uni.showToast({ title: '已上架', icon: 'success' })
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function doUnlist(p: MerchantProduct) {
  if (submitting.value) return
  submitting.value = true
  menuTarget.value = null
  try {
    await merchantBackendApi.unlistProduct(p.id)
    uni.showToast({ title: '已下架', icon: 'success' })
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function doDelete(p: MerchantProduct) {
  menuTarget.value = null
  uni.showModal({
    title: '确认删除商品？',
    content: `删除商品「${p.title}」后将无法恢复，确定继续吗？`,
    confirmColor: '#C41E3A',
    success: async (res) => {
      if (!res.confirm || submitting.value) return
      submitting.value = true
      try {
        await merchantBackendApi.deleteProduct(p.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    },
  })
}

function go(path: string) {
  navigateTo(path)
}

onMounted(() => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })
  load()
})
</script>

<style scoped>
.pl-page { min-height: 100vh; background: #f5f5f7; }
.pl-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.pl-header-inner { height: 44px; display: flex; align-items: center; padding: 0 16px; }
.pl-back { width: 32px; display: flex; align-items: center; }
.pl-title { font-size: 18px; font-weight: 600; color: #1a1a1a; flex: 1; }
.pl-add { display: flex; align-items: center; gap: 4px; background: var(--brand); padding: 6px 12px; border-radius: 8px; }
.pl-add-txt { font-size: 13px; color: #fff; }
.pl-scroll { height: 100vh; box-sizing: border-box; }

.pl-toolbar { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.pl-search-row { display: flex; gap: 8px; }
.pl-search { flex: 1; display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; height: 40px; }
.pl-search-input { flex: 1; font-size: 14px; color: #1a1a1a; }
.pl-ph { color: #9ca3af; }
.pl-tabs { display: flex; background: #ececef; border-radius: 8px; padding: 3px; }
.pl-tab { flex: 1; text-align: center; font-size: 12px; color: #6b7280; padding: 6px 0; border-radius: 6px; }
.pl-tab.active { background: #fff; color: #1a1a1a; font-weight: 500; }

.pl-list { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
.pl-card { background: #fff; border-radius: 12px; padding: 12px; }
.pl-card-row { display: flex; gap: 12px; }
.pl-thumb { width: 80px; height: 80px; border-radius: 8px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; overflow: hidden; }
.pl-thumb-img { width: 80px; height: 80px; border-radius: 8px; }
.pl-info { flex: 1; min-width: 0; }
.pl-info-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.pl-name { font-size: 14px; font-weight: 500; color: #1a1a1a; flex: 1; line-height: 1.4; }
.pl-more { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pl-tags { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.pl-tag-cat { font-size: 10px; color: #6b7280; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
.pl-tag-status { font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.pl-price-row { margin-top: 8px; display: flex; align-items: center; }
.pl-price-now { font-size: 16px; font-weight: 700; color: var(--brand); }
.pl-meta { display: flex; align-items: center; gap: 16px; margin-top: 6px; }
.pl-meta-label { font-size: 12px; color: #6b7280; }
.pl-out { color: #ef4444; }

.pl-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 24px; }
.pl-state-txt { font-size: 14px; color: #9ca3af; text-align: center; }
.pl-state-btn { margin-top: 4px; background: var(--brand); padding: 10px 20px; border-radius: 8px; }
.pl-state-btn-txt { font-size: 14px; color: #fff; }

.pl-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.pl-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 8px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
.pl-sheet-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; font-size: 15px; color: #1a1a1a; }
.pl-sheet-item.danger { color: #ef4444; }
.pl-sheet-cancel { text-align: center; padding: 14px; font-size: 15px; color: #6b7280; margin-top: 4px; border-top: 1px solid #f3f4f6; }
</style>
