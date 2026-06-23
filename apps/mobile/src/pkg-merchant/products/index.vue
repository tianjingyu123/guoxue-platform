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
      <view v-if="loading" class="state-loading"><text class="state-loading-text">加载中...</text></view>
      <view v-if="error" class="state-error"><text class="state-error-text">加载失败</text><view class="state-retry" @tap="retry"><text class="state-retry-text">重试</text></view></view>
      <template v-if="!loading && !error">
      <!-- 搜索和筛选 -->
      <view class="pl-toolbar">
        <view class="pl-search-row">
          <view class="pl-search">
            <AppIcon name="search" :size="16" color="#9ca3af" />
            <input class="pl-search-input" v-model="searchQuery" placeholder="搜索商品名称" placeholder-class="pl-ph" />
          </view>
          <view class="pl-icon-btn">
            <AppIcon name="filter" :size="16" color="#1a1a1a" />
          </view>
          <view class="pl-icon-btn">
            <AppIcon name="arrow-up-down" :size="16" color="#1a1a1a" />
          </view>
        </view>
        <!-- 状态标签 -->
        <view class="pl-tabs">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="pl-tab"
            :class="{ active: activeTab === t.key }"
            @tap="activeTab = t.key"
          >
            {{ t.label }}({{ stats[t.key] }})
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="pl-list">
        <view v-for="p in filteredProducts" :key="p.id" class="pl-card">
          <view class="pl-card-row">
            <!-- 图片 -->
            <view class="pl-thumb">
              <AppIcon name="package" :size="28" color="#c4b59a" />
              <view class="pl-check" :class="{ checked: selected.includes(p.id) }" @tap.stop="toggleSelect(p.id)">
                <AppIcon v-if="selected.includes(p.id)" name="check" :size="12" color="#fff" />
              </view>
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
                <text class="pl-tag-cat">{{ p.category }}</text>
                <text class="pl-tag-status" :style="{ color: statusCfg[p.status].color, background: statusCfg[p.status].bg }">
                  {{ statusCfg[p.status].label }}
                </text>
              </view>
              <!-- 价格（快捷编辑） -->
              <view class="pl-price-row">
                <template v-if="editing.id === p.id && editing.field === 'price'">
                  <text class="pl-yen">¥</text>
                  <input class="pl-edit-input" type="number" v-model="editValue" focus />
                  <view class="pl-edit-btn" @tap="saveEdit">
                    <AppIcon v-if="!isSaving" name="check" :size="14" color="#16a34a" />
                    <text v-else class="pl-saving">···</text>
                  </view>
                  <view class="pl-edit-btn" @tap="cancelEdit">
                    <AppIcon name="x" :size="14" color="#ef4444" />
                  </view>
                </template>
                <view v-else class="pl-price" @tap="startEdit(p.id, 'price', p.price)">
                  <text class="pl-price-now">¥{{ p.price }}</text>
                  <text v-if="p.originalPrice" class="pl-price-orig">¥{{ p.originalPrice }}</text>
                  <AppIcon name="edit" :size="12" color="#9ca3af" />
                </view>
              </view>
              <!-- 库存销量 -->
              <view class="pl-meta">
                <template v-if="editing.id === p.id && editing.field === 'stock'">
                  <text class="pl-meta-label">库存:</text>
                  <input class="pl-edit-input pl-edit-input-sm" type="number" v-model="editValue" focus />
                  <view class="pl-edit-btn" @tap="saveEdit">
                    <AppIcon v-if="!isSaving" name="check" :size="12" color="#16a34a" />
                    <text v-else class="pl-saving">···</text>
                  </view>
                  <view class="pl-edit-btn" @tap="cancelEdit">
                    <AppIcon name="x" :size="12" color="#ef4444" />
                  </view>
                </template>
                <view v-else class="pl-stock" @tap="startEdit(p.id, 'stock', p.stock)">
                  <text class="pl-meta-label">库存: </text>
                  <text :class="{ 'pl-out': p.stock === 0 }">{{ p.stock }}</text>
                  <AppIcon name="edit" :size="12" color="#9ca3af" />
                </view>
                <text class="pl-meta-label">销量: {{ p.sales }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="filteredProducts.length === 0" class="pl-empty">
          <text class="pl-empty-txt">暂无商品</text>
          <view class="pl-empty-btn" @tap="go('/merchant/product-edit')">
            <text class="pl-empty-btn-txt">发布第一个商品</text>
          </view>
        </view>
      </view>
      <view style="height: 80px" />
      </template>
    </scroll-view>

    <!-- 批量操作栏 -->
    <view v-if="selected.length > 0" class="pl-batch">
      <text class="pl-batch-txt">已选择 {{ selected.length }} 件商品</text>
      <view class="pl-batch-actions">
        <view class="pl-batch-btn" @tap="toast">批量下架</view>
        <view class="pl-batch-btn danger" @tap="toast">批量删除</view>
      </view>
    </view>

    <!-- 操作菜单浮层 -->
    <view v-if="menuTarget" class="pl-mask" @tap="menuTarget = null">
      <view class="pl-sheet" @tap.stop>
        <view class="pl-sheet-item" @tap="toast">
          <AppIcon name="eye" :size="18" color="#1a1a1a" />
          <text>查看详情</text>
        </view>
        <view class="pl-sheet-item" @tap="goEdit">
          <AppIcon name="edit" :size="18" color="#1a1a1a" />
          <text>编辑商品</text>
        </view>
        <view class="pl-sheet-item" @tap="toast">
          <text>{{ menuTarget.status === 'online' ? '下架商品' : '上架商品' }}</text>
        </view>
        <view class="pl-sheet-item danger" @tap="askDelete">
          <AppIcon name="trash-2" :size="18" color="#ef4444" />
          <text>删除商品</text>
        </view>
        <view class="pl-sheet-cancel" @tap="menuTarget = null">取消</view>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <view v-if="deleteTarget" class="pl-mask pl-mask-center" @tap="deleteTarget = null">
      <view class="pl-dialog" @tap.stop>
        <text class="pl-dialog-title">确认删除商品？</text>
        <text class="pl-dialog-desc">您即将删除商品「{{ deleteTarget.title }}」，删除后将无法恢复。确定要继续吗？</text>
        <view class="pl-dialog-actions">
          <view class="pl-dialog-btn" @tap="deleteTarget = null">取消</view>
          <view class="pl-dialog-btn danger" @tap="confirmDelete">
            {{ isDeleting ? '删除中...' : '确认删除' }}
          </view>
        </view>
      </view>
    </view>
  </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantAdminApi, productStatusConfig, type MerchantProduct } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })

const statusCfg = productStatusConfig
const products = ref<MerchantProduct[]>([])
const loading = ref(true)
const error = ref(false)
const activeTab = ref('all')
const searchQuery = ref('')
const selected = ref<string[]>([])

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'online', label: '已上架' },
  { key: 'offline', label: '已下架' },
  { key: 'soldout', label: '已售罄' },
]

const stats = computed<Record<string, number>>(() => ({
  all: products.value.length,
  online: products.value.filter((p) => p.status === 'online').length,
  offline: products.value.filter((p) => p.status === 'offline').length,
  soldout: products.value.filter((p) => p.status === 'soldout').length,
}))

const filteredProducts = computed(() =>
  products.value.filter((p) => {
    if (activeTab.value !== 'all' && p.status !== activeTab.value) return false
    if (searchQuery.value && !p.title.includes(searchQuery.value)) return false
    return true
  }),
)

function toggleSelect(id: string) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id]
}

// 快捷编辑
const editing = ref<{ id: string | null; field: 'price' | 'stock' | null }>({ id: null, field: null })
const editValue = ref('')
const isSaving = ref(false)

function startEdit(id: string, field: 'price' | 'stock', current: number) {
  editing.value = { id, field }
  editValue.value = String(current)
}
function cancelEdit() {
  editing.value = { id: null, field: null }
  editValue.value = ''
}
function saveEdit() {
  isSaving.value = true
  setTimeout(() => {
    const p = products.value.find((x) => x.id === editing.value.id)
    if (p && editing.value.field) {
      ;(p as any)[editing.value.field] = Number(editValue.value)
    }
    isSaving.value = false
    cancelEdit()
  }, 800)
}

// 菜单 + 删除
const menuTarget = ref<MerchantProduct | null>(null)
const deleteTarget = ref<{ id: string; title: string } | null>(null)
const isDeleting = ref(false)

function openMenu(p: MerchantProduct) {
  menuTarget.value = p
}
function goEdit() {
  const id = menuTarget.value?.id
  menuTarget.value = null
  navigateTo(`/merchant/product-edit?id=${id}`)
}
function askDelete() {
  if (menuTarget.value) deleteTarget.value = { id: menuTarget.value.id, title: menuTarget.value.title }
  menuTarget.value = null
}
function confirmDelete() {
  isDeleting.value = true
  setTimeout(() => {
    products.value = products.value.filter((p) => p.id !== deleteTarget.value?.id)
    isDeleting.value = false
    deleteTarget.value = null
  }, 1000)
}

function toast() {
  uni.showToast({ title: '演示功能', icon: 'none' })
}
function go(path: string) {
  navigateTo(path)
}

onMounted(async () => {
  try {
    products.value = await merchantAdminApi.getProducts()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

async function retry() {
  error.value = false
  loading.value = true
  try { products.value = await merchantAdminApi.getProducts() }
  catch { error.value = true }
  finally { loading.value = false }
}
</script>

<style scoped>
.pl-page { min-height: 100vh; background: #f5f5f7; }
.pl-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.pl-header-inner { height: 44px; display: flex; align-items: center; padding: 0 16px; }
.pl-back { width: 32px; display: flex; align-items: center; }
.pl-title { font-size: 18px; font-weight: 600; color: #1a1a1a; flex: 1; }
.pl-add { display: flex; align-items: center; gap: 4px; background: #c41e3a; padding: 6px 12px; border-radius: 8px; }
.pl-add-txt { font-size: 13px; color: #fff; }
.pl-scroll { height: 100vh; box-sizing: border-box; }

.pl-toolbar { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.pl-search-row { display: flex; gap: 8px; }
.pl-search { flex: 1; display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; height: 40px; }
.pl-search-input { flex: 1; font-size: 14px; color: #1a1a1a; }
.pl-ph { color: #9ca3af; }
.pl-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; }
.pl-tabs { display: flex; background: #ececef; border-radius: 8px; padding: 3px; }
.pl-tab { flex: 1; text-align: center; font-size: 12px; color: #6b7280; padding: 6px 0; border-radius: 6px; }
.pl-tab.active { background: #fff; color: #1a1a1a; font-weight: 500; }

.pl-list { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
.pl-card { background: #fff; border-radius: 12px; padding: 12px; }
.pl-card-row { display: flex; gap: 12px; }
.pl-thumb { width: 80px; height: 80px; border-radius: 8px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
.pl-check { position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 4px; background: rgba(255,255,255,0.9); border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; }
.pl-check.checked { background: #c41e3a; border-color: #c41e3a; }
.pl-info { flex: 1; min-width: 0; }
.pl-info-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.pl-name { font-size: 14px; font-weight: 500; color: #1a1a1a; flex: 1; line-height: 1.4; }
.pl-more { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pl-tags { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.pl-tag-cat { font-size: 10px; color: #6b7280; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
.pl-tag-status { font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.pl-price-row { margin-top: 8px; display: flex; align-items: center; }
.pl-price { display: flex; align-items: baseline; gap: 4px; }
.pl-price-now { font-size: 16px; font-weight: 700; color: #c41e3a; }
.pl-price-orig { font-size: 12px; color: #9ca3af; text-decoration: line-through; }
.pl-yen { font-size: 14px; color: #1a1a1a; }
.pl-edit-input { width: 80px; height: 28px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 8px; font-size: 14px; }
.pl-edit-input-sm { width: 64px; height: 24px; font-size: 12px; }
.pl-edit-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
.pl-saving { font-size: 12px; color: #9ca3af; }
.pl-meta { display: flex; align-items: center; gap: 16px; margin-top: 6px; }
.pl-meta-label { font-size: 12px; color: #6b7280; }
.pl-stock { display: flex; align-items: center; gap: 2px; }
.pl-out { color: #ef4444; }

.pl-empty { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.pl-empty-txt { font-size: 14px; color: #9ca3af; }
.pl-empty-btn { background: #c41e3a; padding: 10px 20px; border-radius: 8px; }
.pl-empty-btn-txt { font-size: 14px; color: #fff; }

.pl-batch { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ededed; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; align-items: center; justify-content: space-between; z-index: 60; }
.pl-batch-txt { font-size: 13px; color: #6b7280; }
.pl-batch-actions { display: flex; gap: 8px; }
.pl-batch-btn { font-size: 13px; padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; color: #1a1a1a; }
.pl-batch-btn.danger { background: #ef4444; border-color: #ef4444; color: #fff; }

.pl-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.pl-mask-center { align-items: center; justify-content: center; }
.pl-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 8px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
.pl-sheet-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; font-size: 15px; color: #1a1a1a; }
.pl-sheet-item.danger { color: #ef4444; }
.pl-sheet-cancel { text-align: center; padding: 14px; font-size: 15px; color: #6b7280; margin-top: 4px; border-top: 1px solid #f3f4f6; }

.pl-dialog { width: 280px; background: #fff; border-radius: 16px; padding: 20px; }
.pl-dialog-title { font-size: 16px; font-weight: 600; color: #1a1a1a; display: block; }
.pl-dialog-desc { font-size: 13px; color: #6b7280; margin-top: 8px; display: block; line-height: 1.5; }
.pl-dialog-actions { display: flex; gap: 12px; margin-top: 20px; }
.pl-dialog-btn { flex: 1; text-align: center; padding: 10px; border-radius: 8px; font-size: 14px; border: 1px solid #d1d5db; color: #1a1a1a; }
.pl-dialog-btn.danger { background: #ef4444; border-color: #ef4444; color: #fff; }
/* 三态 */
.state-loading { padding: 80px 0; text-align: center; }
.state-loading-text { font-size: 14px; color: #9ca3af; }
.state-error { padding: 80px 0; text-align: center; }
.state-error-text { font-size: 14px; color: #ef4444; display: block; margin-bottom: 12px; }
.state-retry { display: inline-block; padding: 8px 20px; background: #c41e3a; border-radius: 8px; }
.state-retry-text { font-size: 14px; color: #fff; }
</style>
