<template>
  <view class="p-page">
    <!-- 自定义 navbar -->
    <view class="p-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="p-nav-row">
        <view class="p-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="p-nav-title">驿站商品</text>
        <view class="p-nav-btn add" @tap="openCreate"><app-icon name="plus" :size="20" color="#C41E3A" /></view>
      </view>
    </view>

    <scroll-view scroll-y class="p-body">
      <!-- 三态：加载 -->
      <view v-if="loading" class="p-state">
        <view class="spinner" /><text class="p-state-text">加载中…</text>
      </view>
      <!-- 三态：错误 -->
      <view v-else-if="errMsg" class="p-state">
        <app-icon name="alert-circle" :size="44" color="#d8cfc0" /><text class="p-state-text">{{ errMsg }}</text>
        <view class="p-retry" @tap="load"><text class="p-retry-text">重试</text></view>
      </view>
      <!-- 三态：空态（首次无商品） -->
      <view v-else-if="products.length === 0" class="p-state">
        <view class="p-empty-icon"><app-icon name="shopping-bag" :size="40" color="#C9A96E" /></view>
        <text class="p-state-text">还没有商品</text>
        <text class="p-state-sub">上架第一件驿站好物，学员在驿站详情页购买，到店自提</text>
        <view class="p-empty-btn" @tap="openCreate"><text class="p-empty-btn-text">＋ 上架商品</text></view>
      </view>

      <!-- 商品列表态 -->
      <template v-else>
        <!-- 状态筛选 -->
        <view class="p-filters">
          <view
            v-for="f in filters"
            :key="f.value"
            class="p-filter"
            :class="{ on: filter === f.value }"
            @tap="filter = f.value"
          >
            <text class="p-filter-text">{{ f.label }} {{ counts[f.value] }}</text>
          </view>
        </view>

        <view class="p-list">
          <view v-for="p in shownProducts" :key="p.id" class="p-card">
            <view class="p-card-top">
              <!-- 商品图 1:1（后端无图片字段 → 诚实降级占位） -->
              <view class="p-thumb">
                <view class="p-thumb-inner"><app-icon name="image" :size="20" color="#c9beac" /></view>
              </view>
              <view class="p-info">
                <view class="p-name-row">
                  <text class="p-name" :class="{ muted: derive(p) === 'sold' }">{{ p.name }}</text>
                  <text class="p-badge" :class="statusStyle(p)">{{ statusLabel(p) }}</text>
                  <text v-if="p.isPlatform" class="p-tag plat">平台代销</text>
                  <text v-else-if="derive(p) === 'active' && p.stock <= 5" class="p-tag warn">库存紧张</text>
                </view>
                <text class="p-meta">¥{{ formatPrice(p.price) }} · 库存 {{ p.stock }}</text>
                <text class="p-pickup">到店自提</text>
              </view>
            </view>
            <view class="p-ops">
              <template v-if="derive(p) === 'sold'">
                <view class="p-op" @tap="openStock(p)"><text class="p-op-text">补库存</text></view>
                <view class="p-op danger" @tap="onDelete(p)"><text class="p-op-text danger">下架</text></view>
              </template>
              <template v-else-if="derive(p) === 'off'">
                <view class="p-op" @tap="openEdit(p)"><text class="p-op-text">编辑</text></view>
              </template>
              <template v-else>
                <view class="p-op" @tap="openEdit(p)"><text class="p-op-text">编辑</text></view>
                <view class="p-op" @tap="openStock(p)"><text class="p-op-text">改库存</text></view>
                <view class="p-op danger" @tap="onDelete(p)"><text class="p-op-text danger">下架</text></view>
              </template>
            </view>
          </view>
          <view v-if="shownProducts.length === 0" class="p-list-empty">
            <text class="p-list-empty-text">该状态下暂无商品</text>
          </view>
        </view>
      </template>

      <view class="p-safe" />
    </scroll-view>

    <!-- 新增/编辑商品表单态（底部弹层） -->
    <view v-if="editOpen" class="p-mask" @tap="closeEdit">
      <view class="p-sheet" @tap.stop>
        <view class="p-sheet-head">
          <text class="p-sheet-title">{{ editId ? '编辑商品' : '新增商品' }}</text>
          <view class="p-sheet-x" @tap="closeEdit"><app-icon name="x" :size="20" color="#6E6E73" /></view>
        </view>
        <scroll-view scroll-y class="p-sheet-body">
          <!-- 商品图（后端无图片字段 → 诚实降级：占位+推荐尺寸，暂不支持上传） -->
          <view class="p-form-card">
            <view class="p-form-card-head">
              <text class="p-form-card-title">商品图</text>
              <text class="p-form-card-sub">1:1 · 建议 800×800</text>
            </view>
            <view class="p-img-slot">
              <view class="p-img-slot-inner">
                <app-icon name="image" :size="24" color="#c9beac" />
                <text class="p-img-slot-text">800×800</text>
              </view>
            </view>
            <text class="p-img-tip">当前版本商品图暂不支持上传，学员端展示统一占位图</text>
          </view>

          <!-- 基本信息 -->
          <view class="p-form-card">
            <view class="p-field">
              <text class="p-label">商品名称 <text class="req">*</text></text>
              <input v-model="form.name" class="p-input" placeholder="如：手工线装《周易》" placeholder-class="ph" />
            </view>
            <view class="p-field-row">
              <view class="p-field flex1">
                <text class="p-label">价格（元）<text class="req">*</text></text>
                <input v-model="form.price" type="digit" class="p-input" placeholder="0.00" placeholder-class="ph" />
              </view>
              <view class="p-field flex1">
                <text class="p-label">库存</text>
                <input v-model="form.stock" type="number" class="p-input" placeholder="0" placeholder-class="ph" />
              </view>
            </view>
            <view class="p-static-row">
              <text class="p-static-label">提货方式</text>
              <text class="p-static-val">到店自提（固定）</text>
            </view>
          </view>

          <!-- 平台代销开关（仅新增时可设；编辑不改代销属性） -->
          <view v-if="!editId" class="p-form-card">
            <view class="p-switch-row" @tap="form.isPlatform = !form.isPlatform">
              <view class="p-switch-info">
                <text class="p-switch-label">平台代销商品</text>
                <text class="p-switch-sub">从平台商品池代销（按代销分佣）；关闭为驿站自有（100% 所得）</text>
              </view>
              <view class="p-switch" :class="{ on: form.isPlatform }"><view class="p-switch-dot" /></view>
            </view>
          </view>

          <text class="p-form-tip">学员在驿站详情页购买，到店出示订单提货，你在「订单与结算」中完成自提核销。</text>
          <view class="p-sheet-pad" />
        </scroll-view>
        <view class="p-sheet-foot">
          <view class="p-submit" :class="{ disabled: !canSubmit || submitting }" @tap="submit">
            <text class="p-submit-text">{{ submitting ? '提交中…' : (editId ? '保存商品' : '上架商品') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷改库存弹层 -->
    <view v-if="stockOpen" class="p-mask center" @tap="stockOpen = false">
      <view class="p-dialog" @tap.stop>
        <text class="p-dialog-title">修改库存</text>
        <text class="p-dialog-sub">{{ stockTarget?.name }}</text>
        <view class="p-stepper">
          <view class="p-step-btn" @tap="stockVal = Math.max(0, stockVal - 1)"><text class="p-step-sym">－</text></view>
          <input v-model.number="stockVal" type="number" class="p-step-input" />
          <view class="p-step-btn" @tap="stockVal = stockVal + 1"><text class="p-step-sym">＋</text></view>
        </view>
        <view class="p-dialog-ops">
          <view class="p-dialog-btn ghost" @tap="stockOpen = false"><text class="p-dialog-btn-text ghost">取消</text></view>
          <view class="p-dialog-btn" :class="{ disabled: stockSaving }" @tap="saveStock"><text class="p-dialog-btn-text">{{ stockSaving ? '保存中…' : '保存' }}</text></view>
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

// 派生状态：active(在售) / sold(售罄=在售但库存0) / off(已下架=status非ACTIVE)
type DerivedProductStatus = 'active' | 'sold' | 'off'
function derive(p: StationProduct): DerivedProductStatus {
  if (p.status !== 'ACTIVE') return 'off'
  if (p.stock <= 0) return 'sold'
  return 'active'
}
function statusLabel(p: StationProduct): string {
  const s = derive(p)
  return s === 'active' ? '在售' : s === 'sold' ? '已售罄' : '已下架'
}
function statusStyle(p: StationProduct): string {
  return derive(p) // active / sold / off 直接作为 class
}

// 状态筛选
type FilterKey = 'active' | 'sold' | 'off'
const filter = ref<FilterKey>('active')
const filters: { value: FilterKey; label: string }[] = [
  { value: 'active', label: '在售' },
  { value: 'sold', label: '已售罄' },
  { value: 'off', label: '已下架' },
]
const counts = computed<Record<FilterKey, number>>(() => {
  const c: Record<FilterKey, number> = { active: 0, sold: 0, off: 0 }
  for (const p of products.value) c[derive(p)]++
  return c
})
const shownProducts = computed(() => products.value.filter((p) => derive(p) === filter.value))

// 新增/编辑表单
const editOpen = ref(false)
const editId = ref('')
const submitting = ref(false)
const form = ref({ name: '', price: '', stock: '', isPlatform: false })
const canSubmit = computed(() => !!form.value.name.trim() && form.value.price !== '' && Number(form.value.price) >= 0)

// 快捷改库存
const stockOpen = ref(false)
const stockTarget = ref<StationProduct | null>(null)
const stockVal = ref(0)
const stockSaving = ref(false)

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
function closeEdit() { editOpen.value = false }

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    if (editId.value) {
      await offlineManageApi.updateProduct(editId.value, {
        name: form.value.name.trim(),
        price: Number(form.value.price),
        stock: Number(form.value.stock) || 0,
      })
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await offlineManageApi.createProduct(stationId.value, {
        name: form.value.name.trim(),
        price: Number(form.value.price),
        stock: Number(form.value.stock) || 0,
        isPlatform: form.value.isPlatform,
      })
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

function openStock(p: StationProduct) {
  stockTarget.value = p
  stockVal.value = p.stock
  stockOpen.value = true
}
async function saveStock() {
  const t = stockTarget.value
  if (!t || stockSaving.value) return
  const val = Math.max(0, Math.floor(Number(stockVal.value) || 0))
  stockSaving.value = true
  try {
    await offlineManageApi.updateProduct(t.id, { stock: val })
    uni.showToast({ title: '库存已更新', icon: 'success' })
    stockOpen.value = false
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    stockSaving.value = false
  }
}

function onDelete(p: StationProduct) {
  uni.showModal({
    title: '下架商品',
    content: `确认下架「${p.name}」？下架后学员端不再展示。`,
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

<style lang="scss" scoped>
.p-page { height: 100vh; background: #F4F1EC; display: flex; flex-direction: column; }

/* 自定义 navbar */
.p-nav { background: #F4F1EC; position: relative; z-index: 10; }
.p-nav-row { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 12px; }
.p-nav-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
.p-nav-btn.add { background: rgba(196,30,58,0.08); border-radius: 12px; }
.p-nav-title { font-size: 17px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }

.p-body { flex: 1; height: 0; min-height: 0; }

/* 三态 */
.p-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 90px 40px 0; }
.p-state-text { font-size: 14px; color: #6E6E73; }
.p-state-sub { font-size: 12px; color: #999; text-align: center; line-height: 1.6; }
.spinner { width: 28px; height: 28px; border: 3px solid #EDE9E2; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.p-retry { margin-top: 4px; padding: 8px 22px; border: 1px solid #C41E3A; border-radius: 999px; }
.p-retry-text { font-size: 13px; color: #C41E3A; }
.p-empty-icon { width: 76px; height: 76px; border-radius: 24px; background: rgba(201,169,110,0.12); display: flex; align-items: center; justify-content: center; }
.p-empty-btn { margin-top: 8px; padding: 11px 28px; background: #C41E3A; border-radius: 999px; }
.p-empty-btn-text { font-size: 14px; color: #fff; font-weight: 600; }

/* 状态筛选 */
.p-filters { display: flex; gap: 8px; padding: 8px 20px 4px; }
.p-filter { padding: 6px 14px; background: #fff; border-radius: 999px; border: 1px solid #EDE9E2; }
.p-filter.on { background: #C41E3A; border-color: #C41E3A; }
.p-filter-text { font-size: 12px; color: #6E6E73; }
.p-filter.on .p-filter-text { color: #fff; font-weight: 600; }

/* 列表 */
.p-list { padding: 12px 20px 0; display: flex; flex-direction: column; gap: 12px; }
.p-card { background: #fff; border-radius: 18px; padding: 14px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.p-card-top { display: flex; align-items: flex-start; gap: 12px; }
.p-thumb { width: 84px; flex-shrink: 0; border-radius: 12px; border: 1.5px dashed #d8cfc0; background: #F9F6F1; overflow: hidden; position: relative; padding-top: 84px; }
.p-thumb-inner { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.p-info { flex: 1; min-width: 0; }
.p-name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.p-name { font-size: 14px; font-weight: 700; color: #2C2C2C; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p-name.muted { color: #999; }
.p-badge { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 6px; flex-shrink: 0; }
.p-badge.active { color: #a5843f; background: rgba(201,169,110,0.16); }
.p-badge.sold { color: #C41E3A; background: rgba(196,30,58,0.09); }
.p-badge.off { color: #999; background: #f0ece5; }
.p-tag { font-size: 10px; padding: 2px 7px; border-radius: 6px; flex-shrink: 0; }
.p-tag.plat { color: #a5843f; background: rgba(201,169,110,0.14); }
.p-tag.warn { color: #C41E3A; background: rgba(196,30,58,0.09); }
.p-meta { display: block; font-size: 15px; font-weight: 700; color: #C41E3A; margin-top: 8px; }
.p-pickup { display: block; font-size: 11px; color: #999; margin-top: 5px; }

.p-ops { display: flex; gap: 8px; margin-top: 12px; }
.p-op { flex: 1; height: 34px; border: 1px solid #E4DDD0; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.p-op.danger { border-color: rgba(196,30,58,0.35); }
.p-op-text { font-size: 12px; color: #6E6E73; }
.p-op-text.danger { color: #C41E3A; }

.p-list-empty { padding: 40px 0; text-align: center; }
.p-list-empty-text { font-size: 13px; color: #b0a89c; }
.p-safe { height: 40px; }

/* 遮罩 */
.p-mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.p-mask.center { align-items: center; justify-content: center; }

/* 底部表单弹层 */
.p-sheet { width: 100%; background: #F4F1EC; border-radius: 20px 20px 0 0; max-height: 86vh; display: flex; flex-direction: column; }
.p-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; }
.p-sheet-title { font-size: 17px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.p-sheet-x { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
.p-sheet-body { flex: 1; min-height: 0; padding: 0 20px; }
.p-sheet-pad { height: 8px; }

.p-form-card { background: #fff; border-radius: 18px; padding: 16px; margin-bottom: 12px; }
.p-form-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.p-form-card-title { font-size: 14px; font-weight: 600; color: #2C2C2C; }
.p-form-card-sub { font-size: 11px; color: #999; }
.p-img-slot { width: 90px; border-radius: 12px; border: 1.5px dashed #d8cfc0; background: #F9F6F1; position: relative; padding-top: 90px; overflow: hidden; }
.p-img-slot-inner { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
.p-img-slot-text { font-size: 10px; color: #b0a89c; }
.p-img-tip { display: block; font-size: 11px; color: #b0a89c; margin-top: 8px; line-height: 1.5; }

.p-field { margin-bottom: 14px; }
.p-field:last-child { margin-bottom: 0; }
.p-field-row { display: flex; gap: 12px; }
.flex1 { flex: 1; }
.p-label { display: block; font-size: 12px; color: #6E6E73; margin-bottom: 7px; }
.req { color: #C41E3A; }
.p-input { height: 44px; padding: 0 12px; background: #F9F6F1; border: 1px solid #EDE9E2; border-radius: 12px; font-size: 14px; color: #2C2C2C; box-sizing: border-box; }
.ph { color: #b0a89c; }
.p-static-row { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 14px; border-top: 1px solid #F2EEE7; }
.p-static-label { font-size: 12px; color: #6E6E73; }
.p-static-val { font-size: 13px; color: #2C2C2C; }

.p-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.p-switch-info { flex: 1; min-width: 0; }
.p-switch-label { display: block; font-size: 14px; font-weight: 600; color: #2C2C2C; }
.p-switch-sub { display: block; font-size: 11px; color: #999; margin-top: 4px; line-height: 1.5; }
.p-switch { width: 46px; height: 27px; border-radius: 999px; background: #d8cfc0; position: relative; flex-shrink: 0; transition: background 0.2s; }
.p-switch.on { background: #C41E3A; }
.p-switch-dot { position: absolute; top: 3px; left: 3px; width: 21px; height: 21px; border-radius: 999px; background: #fff; transition: left 0.2s; }
.p-switch.on .p-switch-dot { left: 22px; }

.p-form-tip { display: block; font-size: 11px; color: #b0a89c; line-height: 1.7; padding: 0 4px; }

.p-sheet-foot { padding: 12px 20px calc(12px + env(safe-area-inset-bottom)); background: #F4F1EC; }
.p-submit { height: 48px; background: #C41E3A; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
.p-submit.disabled { background: #dcc3c0; }
.p-submit-text { font-size: 15px; color: #fff; font-weight: 600; }

/* 改库存弹窗 */
.p-dialog { width: 300px; background: #fff; border-radius: 20px; padding: 22px 20px 18px; display: flex; flex-direction: column; align-items: center; }
.p-dialog-title { font-size: 16px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.p-dialog-sub { font-size: 12px; color: #999; margin-top: 6px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p-stepper { display: flex; align-items: center; gap: 12px; margin: 18px 0; }
.p-step-btn { width: 40px; height: 40px; border-radius: 12px; background: #F4F1EC; display: flex; align-items: center; justify-content: center; }
.p-step-sym { font-size: 20px; color: #C41E3A; }
.p-step-input { width: 80px; height: 44px; background: #F9F6F1; border: 1px solid #EDE9E2; border-radius: 12px; text-align: center; font-size: 16px; font-weight: 700; color: #2C2C2C; box-sizing: border-box; }
.p-dialog-ops { display: flex; gap: 10px; width: 100%; }
.p-dialog-btn { flex: 1; height: 44px; background: #C41E3A; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.p-dialog-btn.ghost { background: #F4F1EC; }
.p-dialog-btn.disabled { background: #dcc3c0; }
.p-dialog-btn-text { font-size: 14px; color: #fff; font-weight: 600; }
.p-dialog-btn-text.ghost { color: #6E6E73; }
</style>
