<template>
  <view class="mp-page">
    <view class="mp-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mp-nav">
        <view class="mp-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="mp-nav-title">商品管理</text>
        <view class="mp-icon-btn" @tap="openCreate"><app-icon name="plus" :size="22" color="#9a2e25" /></view>
      </view>
    </view>

    <scroll-view scroll-y class="mp-body">
      <view v-if="loading" class="mp-state"><view class="spinner" /><text class="mp-state-text">加载中…</text></view>
      <view v-else-if="errMsg" class="mp-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" /><text class="mp-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>
      <view v-else-if="products.length === 0" class="mp-state">
        <app-icon name="shopping-bag" :size="48" color="#d1d5db" /><text class="mp-state-text">还没有商品</text>
        <view class="retry-btn" @tap="openCreate"><text class="retry-text">上架第一件商品</text></view>
      </view>

      <view v-else class="mp-list">
        <view v-for="p in products" :key="p.id" class="mp-card">
          <view class="mp-thumb"><app-icon name="shopping-bag" :size="26" color="#d8b48a" /></view>
          <view class="mp-info">
            <view class="mp-name-row">
              <text class="mp-name">{{ p.name }}</text>
              <text v-if="p.isPlatform" class="mp-tag">平台代销</text>
            </view>
            <view class="mp-meta">
              <text class="mp-price">¥{{ formatPrice(p.price) }}</text>
              <text class="mp-stock">库存 {{ p.stock }}</text>
              <text class="mp-status" :class="p.status === 'ACTIVE' ? 'on' : 'off'">{{ p.status === 'ACTIVE' ? '在售' : '已下架' }}</text>
            </view>
          </view>
          <view class="mp-ops">
            <view class="mp-op" @tap="openEdit(p)"><text class="mp-op-text">编辑</text></view>
            <view class="mp-op danger" @tap="onDelete(p)"><text class="mp-op-text danger">下架</text></view>
          </view>
        </view>
      </view>
      <view class="mp-safe" />
    </scroll-view>

    <!-- 上架/编辑弹层 -->
    <view v-if="editOpen" class="mp-mask" @tap="editOpen = false">
      <view class="mp-sheet" @tap.stop>
        <view class="mp-sheet-head">
          <text class="mp-sheet-title">{{ editId ? '编辑商品' : '上架商品' }}</text>
          <view @tap="editOpen = false"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
        </view>
        <view class="mp-sheet-body">
          <view class="mp-field">
            <text class="mp-label">商品名称 <text class="req">*</text></text>
            <input v-model="form.name" class="mp-input" placeholder="如：开光罗盘" placeholder-class="ph" />
          </view>
          <view class="mp-field-row">
            <view class="mp-field flex1">
              <text class="mp-label">价格（元）<text class="req">*</text></text>
              <input v-model="form.price" type="number" class="mp-input" placeholder="0.00" placeholder-class="ph" />
            </view>
            <view class="mp-field flex1">
              <text class="mp-label">库存</text>
              <input v-model="form.stock" type="number" class="mp-input" placeholder="0" placeholder-class="ph" />
            </view>
          </view>
          <view class="mp-switch-row" @tap="form.isPlatform = !form.isPlatform">
            <view>
              <text class="mp-switch-label">平台代销商品</text>
              <text class="mp-switch-sub">从平台商品池代销（按代销分佣）；关闭为驿站自有（100%所得）</text>
            </view>
            <view class="mp-switch" :class="{ on: form.isPlatform }"><view class="mp-switch-dot" /></view>
          </view>
          <view class="mp-submit" :class="{ disabled: !canSubmit || submitting }" @tap="submit">
            <text class="mp-submit-text">{{ submitting ? '提交中…' : (editId ? '保存' : '上架') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { offlineManageApi, num, type StationProduct } from '@/lib/offline-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const products = ref<StationProduct[]>([])

const editOpen = ref(false)
const editId = ref('')
const submitting = ref(false)
const form = ref({ name: '', price: '', stock: '', isPlatform: false })

const canSubmit = computed(() => !!form.value.name && Number(form.value.price) >= 0 && form.value.price !== '')

async function load() {
  if (!stationId.value) { loading.value = false; errMsg.value = '缺少驿站参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    products.value = await offlineManageApi.listProducts(stationId.value)
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad((q) => { stationId.value = q && q.stationId ? String(q.stationId) : ''; load() })

function openCreate() {
  editId.value = ''
  form.value = { name: '', price: '', stock: '', isPlatform: false }
  editOpen.value = true
}
function openEdit(p: StationProduct) {
  editId.value = p.id
  form.value = { name: p.name, price: String(num(p.price)), stock: String(p.stock), isPlatform: p.isPlatform }
  editOpen.value = true
}
async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    if (editId.value) {
      await offlineManageApi.updateProduct(editId.value, { name: form.value.name, price: Number(form.value.price), stock: Number(form.value.stock) || 0 })
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await offlineManageApi.createProduct(stationId.value, { name: form.value.name, price: Number(form.value.price), stock: Number(form.value.stock) || 0, isPlatform: form.value.isPlatform })
      uni.showToast({ title: '已上架', icon: 'success' })
    }
    editOpen.value = false
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
function onDelete(p: StationProduct) {
  uni.showModal({
    title: '下架商品',
    content: `确认下架「${p.name}」？`,
    confirmColor: '#C41E3A',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await offlineManageApi.deleteProduct(p.id)
        uni.showToast({ title: '已下架', icon: 'none' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      }
    },
  })
}
</script>

<style scoped>
.mp-page { min-height: 100vh; background: #f5f2ed; display: flex; flex-direction: column; }
.mp-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.mp-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.mp-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.mp-nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.mp-body { flex: 1; }
.mp-state { padding: 90px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.mp-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #e8ddd0; border-top-color: #9a2e25; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid #9a2e25; border-radius: 999px; }
.retry-text { font-size: 13px; color: #9a2e25; }
.mp-list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.mp-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 12px; }
.mp-thumb { width: 56px; height: 56px; border-radius: 10px; background: #f3ede2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mp-info { flex: 1; min-width: 0; }
.mp-name-row { display: flex; align-items: center; gap: 6px; }
.mp-name { font-size: 14px; font-weight: 500; color: #2a1f1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-tag { font-size: 10px; padding: 1px 6px; color: #2563eb; background: #eff6ff; border-radius: 4px; flex-shrink: 0; }
.mp-meta { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.mp-price { font-size: 15px; font-weight: 700; color: #9a2e25; }
.mp-stock { font-size: 12px; color: #9ca3af; }
.mp-status { font-size: 11px; padding: 1px 6px; border-radius: 4px; }
.mp-status.on { color: #16a34a; background: #f0fdf4; }
.mp-status.off { color: #6b7280; background: #f3f4f6; }
.mp-ops { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
.mp-op { padding: 5px 12px; border: 1px solid #e8e2d8; border-radius: 6px; }
.mp-op.danger { border-color: #fecaca; }
.mp-op-text { font-size: 12px; color: #4b4039; }
.mp-op-text.danger { color: #dc2626; }
.mp-safe { height: 24px; }

.mp-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.mp-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; max-height: 80vh; }
.mp-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #ededed; }
.mp-sheet-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.mp-sheet-body { padding: 16px; }
.mp-field { margin-bottom: 14px; }
.mp-field-row { display: flex; gap: 12px; }
.flex1 { flex: 1; }
.mp-label { display: block; font-size: 13px; color: #6b7280; margin-bottom: 6px; }
.req { color: #dc2626; }
.mp-input { height: 42px; padding: 0 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 8px; font-size: 14px; color: #1a1a1a; }
.ph { color: #9ca3af; }
.mp-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; }
.mp-switch-label { display: block; font-size: 14px; color: #2a1f1a; }
.mp-switch-sub { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; line-height: 1.4; }
.mp-switch { width: 44px; height: 26px; border-radius: 999px; background: #d1d5db; position: relative; flex-shrink: 0; transition: background 0.2s; }
.mp-switch.on { background: #9a2e25; }
.mp-switch-dot { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 999px; background: #fff; transition: left 0.2s; }
.mp-switch.on .mp-switch-dot { left: 21px; }
.mp-submit { margin-top: 8px; height: 46px; background: #9a2e25; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.mp-submit.disabled { background: #d1b5b1; }
.mp-submit-text { font-size: 15px; color: #fff; font-weight: 500; }
</style>
