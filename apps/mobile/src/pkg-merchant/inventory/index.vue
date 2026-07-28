<template>
  <view class="page">
    <view class="nav safe-top">
      <view class="nav-side back" @tap="back">‹</view>
      <view class="nav-title">
        <text class="title">库存与履约</text>
        <text class="nav-sub">采购 · 发货 · 售后共用一套库存账</text>
      </view>
      <view class="nav-side refresh" @tap="loadAll">刷新</view>
    </view>

    <scroll-view scroll-y class="body">
      <view v-if="overview" class="cockpit">
        <view class="cockpit-head">
          <view>
            <text class="eyebrow">今日经营脉络</text>
            <text class="cockpit-title">{{ healthCopy }}</text>
          </view>
          <view class="health">
            <text class="health-value">{{ overview.stockHealthRate }}%</text>
            <text class="health-label">库存健康度</text>
          </view>
        </view>
        <view class="health-track">
          <view class="health-bar" :style="{ width: `${overview.stockHealthRate}%` }"/>
        </view>
        <view class="summary">
          <view class="sum" @tap="showAllStock">
            <text class="num">{{ overview.totalStock }}</text>
            <text>现货总量</text>
            <text class="sum-note">{{ overview.skuCount }} 个规格</text>
          </view>
          <view class="sum warn" @tap="showLowStock">
            <text class="num">{{ overview.lowStockCount }}</text>
            <text>需要补货</text>
            <text class="sum-note">{{ overview.outOfStockCount }} 个售罄</text>
          </view>
          <view class="sum" @tap="activate('purchase')">
            <text class="num">{{ overview.pendingReceiptUnitCount }}</text>
            <text>在途待收</text>
            <text class="sum-note">{{ overview.pendingPurchaseCount }} 张单据</text>
          </view>
          <view class="sum" @tap="activate('flow')">
            <text class="num">{{ overview.movementCount }}</text>
            <text>库存流水</text>
            <text class="sum-note">每笔可追溯</text>
          </view>
        </view>
      </view>

      <view v-if="overview" class="task-panel">
        <view class="section-head">
          <view>
            <text class="section-title">今日待办</text>
            <text class="section-sub">先处理会影响成交与履约的事项</text>
          </view>
          <text class="task-total">{{ taskCount }} 项</text>
        </view>
        <view class="task-grid">
          <view class="task" :class="{ urgent: overview.lowStockCount > 0 }" @tap="showLowStock">
            <text class="task-glyph">补</text>
            <view><text class="task-name">库存预警</text><text class="task-desc">{{ overview.lowStockCount ? `${overview.lowStockCount} 个规格待补货` : '库存状态良好' }}</text></view>
            <text class="task-arrow">›</text>
          </view>
          <view class="task" :class="{ urgent: overview.overduePurchaseCount > 0 }" @tap="activate('purchase')">
            <text class="task-glyph">收</text>
            <view><text class="task-name">采购到货</text><text class="task-desc">{{ overview.overduePurchaseCount ? `${overview.overduePurchaseCount} 张已逾期` : `${overview.pendingReceiptUnitCount} 件待验收` }}</text></view>
            <text class="task-arrow">›</text>
          </view>
          <view class="task" :class="{ urgent: overview.unshippedOrderCount > 0 }" @tap="go('/pkg-merchant/batch-ship/index')">
            <text class="task-glyph">发</text>
            <view><text class="task-name">待发订单</text><text class="task-desc">{{ overview.unshippedOrderCount ? `${overview.unshippedOrderCount} 单等待发货` : '暂无待发订单' }}</text></view>
            <text class="task-arrow">›</text>
          </view>
          <view class="task" :class="{ urgent: overview.pendingAfterSaleCount > 0 }" @tap="go('/pkg-merchant/notices/index?tab=after-sales')">
            <text class="task-glyph">退</text>
            <view><text class="task-name">售后回仓</text><text class="task-desc">{{ overview.pendingAfterSaleCount ? `${overview.pendingAfterSaleCount} 件等待处理` : '暂无售后待办' }}</text></view>
            <text class="task-arrow">›</text>
          </view>
        </view>
      </view>

      <view class="lifecycle">
        <view class="life-head">
          <view>
            <text class="section-title">单据流轨</text>
            <text class="section-sub">商业约定与实物移动分开记录，库存只认验收结果</text>
          </view>
          <text class="life-mark">全程留痕</text>
        </view>
        <view class="life-rail">
          <view class="rail-line"/>
          <view class="rail-pulse"/>
          <view class="life-item" :class="{ active: tab === 'purchase' }" @tap="activate('purchase')">
            <text class="life-no">01</text><text class="life-name">采购</text><text class="life-desc">确认约定</text>
          </view>
          <view class="life-item" :class="{ active: tab === 'stock' }" @tap="activate('stock')">
            <text class="life-no">02</text><text class="life-name">入库</text><text class="life-desc">验收记账</text>
          </view>
          <view class="life-item" @tap="go('/pkg-merchant/batch-ship/index')">
            <text class="life-no">03</text><text class="life-name">发货</text><text class="life-desc">运单履约</text>
          </view>
          <view class="life-item" @tap="go('/pkg-merchant/notices/index?tab=after-sales')">
            <text class="life-no">04</text><text class="life-name">售后</text><text class="life-desc">质检回仓</text>
          </view>
        </view>
      </view>

      <view class="workspace">
        <view class="tabs">
          <view v-for="t in tabs" :key="t.key" class="tab" :class="{ active: tab === t.key }" @tap="activate(t.key)">
            <text>{{ t.label }}</text>
          </view>
        </view>

        <view v-if="loading" class="state">正在读取真实经营数据…</view>
        <view v-else-if="error" class="state error" @tap="loadAll">{{ error }}，点击重试</view>

        <template v-else-if="tab === 'stock'">
          <view class="filter">
            <input v-model="keyword" placeholder="搜索商品或规格" @confirm="loadStocks"/>
            <view class="filter-btn" :class="{ on: lowOnly }" @tap="toggleLowOnly">{{ lowOnly ? '查看全部' : '只看预警' }}</view>
          </view>
          <view v-if="overview?.missingAlertCount" class="notice">
            <text>还有 {{ overview.missingAlertCount }} 个规格未单独设置预警线，当前按默认 5 件提醒。</text>
          </view>
          <view v-for="item in stocks" :key="item.productId + ':' + (item.skuId || '')" class="stock-card">
            <view class="stock-main">
              <image v-if="item.image" :src="item.image" mode="aspectFill" class="cover"/>
              <view v-else class="cover fallback">货</view>
              <view class="main">
                <text class="name">{{ item.title }}</text>
                <text class="sub">{{ item.skuLabel || '单规格' }}</text>
                <view class="stock-line">
                  <text class="stock-number" :class="{ danger: item.lowStock }">{{ item.stock }}</text>
                  <text class="stock-unit">件可售</text>
                  <text class="stock-state" :class="{ danger: item.lowStock }">{{ stockState(item) }}</text>
                </view>
              </view>
            </view>
            <view class="card-foot">
              <view class="threshold" @tap="setThreshold(item)">预警线 {{ item.threshold ?? '默认 5' }} ›</view>
              <view class="stock-actions">
                <text @tap="adjust(item, 'SET')">盘点</text>
                <text @tap="adjust(item, 'DECREASE')">报损</text>
                <text class="primary-action" @tap="createPurchase(item)">发起采购</text>
              </view>
            </view>
          </view>
          <view v-if="!stocks.length" class="state empty">
            <text class="empty-title">{{ lowOnly ? '当前没有低库存商品' : '暂无库存记录' }}</text>
            <text class="empty-sub">{{ lowOnly ? '库存状态良好，可切换查看全部库存' : '请先在商品管理中创建商品和规格' }}</text>
          </view>
        </template>

        <template v-else-if="tab === 'flow'">
          <view class="flow-intro">流水是库存审计底账，来源、原因、操作前后数量均不可覆盖。</view>
          <view v-for="m in movements" :key="m.id" class="flow-card">
            <view class="flow-mark" :class="{ inbound: m.quantity > 0 }">{{ m.quantity > 0 ? '入' : '出' }}</view>
            <view class="main">
              <view class="row-between">
                <text class="name">{{ m.metadata?.title || '库存变动' }}</text>
                <text class="flow-time">{{ formatTime(m.createdAt) }}</text>
              </view>
              <text class="sub">{{ m.metadata?.skuLabel || '单规格' }} · {{ typeText[m.type] || m.type }}</text>
              <text class="flow-reason">{{ m.reason || '系统自动记录' }}</text>
              <text class="balance">结存 {{ m.beforeStock }} → {{ m.afterStock }}</text>
            </view>
            <text class="delta" :class="{ plus: m.quantity > 0 }">{{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}</text>
          </view>
          <view v-if="!movements.length" class="state empty">暂无库存流水</view>
        </template>

        <template v-else>
          <view class="purchase-tip">采购单记录价格与供应约定；实际库存只在到货验收后增加。支持多批到货，不会提前虚增可售库存。</view>
          <view v-for="p in purchases" :key="p.id" class="purchase-card" :class="{ overdue: isOverdue(p) }">
            <view class="purchase-head">
              <view>
                <text class="order-no">{{ p.orderNo }}</text>
                <text class="name">{{ p.supplierName }}</text>
              </view>
              <text class="status">{{ isOverdue(p) ? '已逾期' : (purchaseStatus[p.status] || p.status) }}</text>
            </view>
            <view class="purchase-meta">
              <text>采购金额 ¥{{ Number(p.totalAmount).toFixed(2) }}</text>
              <text v-if="p.expectedAt">预计 {{ formatDate(p.expectedAt) }} 到货</text>
            </view>
            <view v-if="p.contactName || p.contactPhone || p.remark" class="supplier-note">
              <text v-if="p.contactName || p.contactPhone">对接人 {{ [p.contactName, p.contactPhone].filter(Boolean).join(' · ') }}</text>
              <text v-if="p.remark">{{ p.remark }}</text>
            </view>
            <view v-for="it in p.items" :key="it.id" class="purchase-line">
              <view class="row-between">
                <text>{{ it.productTitle }}{{ it.skuLabel ? ' · ' + it.skuLabel : '' }}</text>
                <text>{{ it.receivedQuantity }}/{{ it.quantity }}</text>
              </view>
              <view class="progress"><view :style="{ width: `${receivePercent(it)}%` }"/></view>
            </view>
            <view class="purchase-actions">
              <text v-if="p.status === 'DRAFT'" class="primary-action" @tap="submitPurchase(p)">确认下单</text>
              <text v-if="p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED'" class="primary-action receive" @tap="receiveBatch(p)">分批验收</text>
              <text v-if="p.status === 'DRAFT' || p.status === 'ORDERED'" class="muted-action" @tap="cancelPurchase(p)">取消采购</text>
            </view>
          </view>
          <view v-if="!purchases.length" class="state empty">
            <text class="empty-title">暂无采购单</text>
            <text class="empty-sub">可从低库存商品直接创建采购草稿</text>
          </view>
        </template>
      </view>
      <view class="bottom-space"/>
    </scroll-view>

    <view v-if="purchaseDraft.open" class="sheet-mask" @tap="closePurchaseSheet">
      <view class="sheet" @tap.stop>
        <view class="sheet-handle"/>
        <view class="sheet-head">
          <view>
            <text class="sheet-kicker">采购约定</text>
            <text class="sheet-title">新建采购单</text>
          </view>
          <text class="sheet-close" @tap="closePurchaseSheet">×</text>
        </view>
        <view class="goods-brief">
          <image v-if="purchaseDraft.item?.image" :src="purchaseDraft.item.image" mode="aspectFill"/>
          <view v-else class="brief-fallback">货</view>
          <view>
            <text>{{ purchaseDraft.item?.title }}</text>
            <text>{{ purchaseDraft.item?.skuLabel || '单规格' }} · 当前库存 {{ purchaseDraft.item?.stock || 0 }}</text>
          </view>
        </view>
        <scroll-view scroll-y class="sheet-form">
          <view class="field required">
            <text>供应商</text>
            <input v-model="purchaseDraft.supplierName" maxlength="100" placeholder="公司或供货方名称"/>
          </view>
          <view class="field-pair">
            <view class="field"><text>联系人</text><input v-model="purchaseDraft.contactName" maxlength="50" placeholder="选填"/></view>
            <view class="field"><text>联系电话</text><input v-model="purchaseDraft.contactPhone" maxlength="30" type="number" placeholder="选填"/></view>
          </view>
          <view class="field-pair">
            <view class="field required"><text>采购数量</text><input v-model="purchaseDraft.quantity" type="number" placeholder="正整数"/></view>
            <view class="field required"><text>采购单价</text><input v-model="purchaseDraft.unitCost" type="digit" placeholder="0.00"/></view>
          </view>
          <picker mode="date" :value="purchaseDraft.expectedDate" :start="today" @change="onExpectedDateChange">
            <view class="field picker-field">
              <text>预计到货</text>
              <text :class="{ placeholder: !purchaseDraft.expectedDate }">{{ purchaseDraft.expectedDate || '选择日期（选填）' }}</text>
            </view>
          </picker>
          <view class="field textarea-field">
            <text>采购备注</text>
            <textarea v-model="purchaseDraft.remark" maxlength="500" placeholder="包装、票据、交付批次等约定（选填）"/>
            <text class="count">{{ purchaseDraft.remark.length }}/500</text>
          </view>
          <view class="sheet-assurance">
            <text class="assurance-mark">账</text>
            <text>创建后先保存为草稿；确认下单仍需二次操作。库存只在验收完成后增加。</text>
          </view>
        </scroll-view>
        <view class="sheet-actions safe-bottom">
          <view class="sheet-secondary" @tap="closePurchaseSheet">暂不创建</view>
          <view class="sheet-primary" :class="{ disabled: purchaseDraft.submitting }" @tap="submitPurchaseDraft">
            {{ purchaseDraft.submitting ? '正在建单…' : `创建草稿 · ¥${purchaseDraftTotal}` }}
          </view>
        </view>
      </view>
    </view>

    <view v-if="receiptDraft.open" class="sheet-mask" @tap="closeReceiptSheet">
      <view class="sheet receipt-sheet" @tap.stop>
        <view class="sheet-handle"/>
        <view class="sheet-head">
          <view>
            <text class="sheet-kicker">实物验收</text>
            <text class="sheet-title">登记本批到货</text>
          </view>
          <text class="sheet-close" @tap="closeReceiptSheet">×</text>
        </view>
        <view class="receipt-order">
          <text>{{ receiptDraft.order?.orderNo }}</text>
          <text>{{ receiptDraft.order?.supplierName }} · 本批合计 {{ receiptDraftTotal }} 件</text>
        </view>
        <scroll-view scroll-y class="receipt-list">
          <view v-for="item in receiptDraft.order?.items || []" :key="item.id" class="receipt-line">
            <view class="receipt-copy">
              <text>{{ item.productTitle }}</text>
              <text>{{ item.skuLabel || '单规格' }} · 已收 {{ item.receivedQuantity }}/{{ item.quantity }}</text>
            </view>
            <view class="receipt-input">
              <text>本批</text>
              <input
                v-model="receiptDraft.quantities[item.id]"
                type="number"
                :disabled="item.receivedQuantity >= item.quantity"
                placeholder="0"
                placeholder-style="color:#c7bdb0;font-weight:500"
              />
              <text>件</text>
            </view>
          </view>
          <view class="sheet-assurance">
            <text class="assurance-mark">验</text>
            <text>请按实际清点数量录入。提交后立即形成不可覆盖的采购入库流水。</text>
          </view>
        </scroll-view>
        <view class="sheet-actions safe-bottom">
          <view class="sheet-secondary" @tap="closeReceiptSheet">稍后验收</view>
          <view class="sheet-primary receive-confirm" :class="{ disabled: receiptDraft.submitting || receiptDraftTotal <= 0 }" @tap="submitReceipt">
            {{ receiptDraft.submitting ? '正在入库…' : `确认入库 ${receiptDraftTotal} 件` }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  type InventoryOverview,
  type InventoryStockItem,
  type InventoryMovement,
  type PurchaseOrder,
  type PurchaseOrderItem,
} from '@/pkg-merchant/lib/merchant-data'

type TabKey = 'stock' | 'flow' | 'purchase'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'stock', label: '实时库存' },
  { key: 'flow', label: '库存流水' },
  { key: 'purchase', label: '采购到货' },
]
const tab = ref<TabKey>('stock')
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const lowOnly = ref(false)
const overview = ref<InventoryOverview | null>(null)
const stocks = ref<InventoryStockItem[]>([])
const movements = ref<InventoryMovement[]>([])
const purchases = ref<PurchaseOrder[]>([])
const today = new Date().toISOString().slice(0, 10)
const purchaseDraft = ref({
  open: false,
  submitting: false,
  item: null as InventoryStockItem | null,
  supplierName: '',
  contactName: '',
  contactPhone: '',
  quantity: '',
  unitCost: '',
  expectedDate: '',
  remark: '',
})
const receiptDraft = ref({
  open: false,
  submitting: false,
  order: null as PurchaseOrder | null,
  quantities: {} as Record<string, string>,
})
const typeText: Record<string, string> = {
  PURCHASE_IN: '采购入库',
  SALE_OUT: '销售出库',
  ORDER_CANCEL_RETURN: '取消回补',
  REFUND_RETURN: '退货入库',
  ADJUST_IN: '手工调增',
  ADJUST_OUT: '手工调减',
  STOCKTAKE_GAIN: '盘盈',
  STOCKTAKE_LOSS: '盘亏',
}
const purchaseStatus: Record<string, string> = {
  DRAFT: '草稿',
  ORDERED: '待到货',
  PARTIALLY_RECEIVED: '部分到货',
  RECEIVED: '已完成',
  CANCELLED: '已取消',
}
const healthCopy = computed(() => {
  if (!overview.value) return '库存状态读取中'
  if (overview.value.outOfStockCount) return `${overview.value.outOfStockCount} 个规格售罄，建议优先补货`
  if (overview.value.lowStockCount) return `${overview.value.lowStockCount} 个规格接近预警线`
  return '库存稳定，可以安心履约'
})
const taskCount = computed(() => {
  if (!overview.value) return 0
  return overview.value.lowStockCount
    + overview.value.overduePurchaseCount
    + overview.value.unshippedOrderCount
    + overview.value.pendingAfterSaleCount
})
const purchaseDraftTotal = computed(() => {
  const quantity = Number(purchaseDraft.value.quantity)
  const unitCost = Number(purchaseDraft.value.unitCost)
  if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return '0.00'
  return Math.max(0, quantity * unitCost).toFixed(2)
})
const receiptDraftTotal = computed(() => Object.values(receiptDraft.value.quantities)
  .reduce((sum, value) => sum + (Number(value) || 0), 0))

const rid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
const formatDate = (value: string) => new Date(value).toLocaleDateString('zh-CN')
const receivePercent = (item: PurchaseOrderItem) => item.quantity
  ? Math.min(100, Math.round(item.receivedQuantity / item.quantity * 100))
  : 0
const isOverdue = (order: PurchaseOrder) => (
  ['ORDERED', 'PARTIALLY_RECEIVED'].includes(order.status)
  && Boolean(order.expectedAt)
  && new Date(order.expectedAt as string).getTime() < Date.now()
)
const stockState = (item: InventoryStockItem) => {
  if (item.stock === 0) return '已售罄'
  if (item.lowStock) return '需要补货'
  return '库存正常'
}

function back() {
  uni.navigateBack()
}
function go(path: string) {
  navigateTo(path)
}
function activate(next: TabKey) {
  tab.value = next
}
function prompt(title: string, placeholder: string): Promise<string | null> {
  return new Promise((resolve) => uni.showModal({
    title,
    editable: true,
    placeholderText: placeholder,
    success: (result) => resolve(result.confirm ? (result.content || '').trim() : null),
  }))
}
function showAllStock() {
  tab.value = 'stock'
  lowOnly.value = false
  void loadStocks()
}
function showLowStock() {
  tab.value = 'stock'
  lowOnly.value = true
  void loadStocks()
}
function toggleLowOnly() {
  lowOnly.value = !lowOnly.value
  void loadStocks()
}
async function loadStocks() {
  const result = await merchantBackendApi.getInventoryStocks({
    keyword: keyword.value,
    lowStock: lowOnly.value,
    pageSize: 100,
  })
  stocks.value = result.items || []
}
async function loadAll() {
  loading.value = true
  error.value = ''
  const result = await Promise.allSettled([
    merchantBackendApi.getInventoryOverview(),
    merchantBackendApi.getInventoryStocks({ pageSize: 100 }),
    merchantBackendApi.getInventoryMovements({ pageSize: 100 }),
    merchantBackendApi.getPurchaseOrders({ pageSize: 100 }),
  ])
  if (result[0].status === 'fulfilled') overview.value = result[0].value
  if (result[1].status === 'fulfilled') stocks.value = result[1].value.items || []
  if (result[2].status === 'fulfilled') movements.value = result[2].value.items || []
  if (result[3].status === 'fulfilled') purchases.value = result[3].value.items || []
  const failed = result.find((item) => item.status === 'rejected') as PromiseRejectedResult | undefined
  if (failed) error.value = failed.reason?.message || '部分数据加载失败'
  loading.value = false
}

function loadVisualPreview() {
  overview.value = {
    skuCount: 18,
    totalStock: 384,
    lowStockCount: 4,
    outOfStockCount: 1,
    stockHealthRate: 78,
    missingAlertCount: 2,
    movementCount: 36,
    pendingPurchaseCount: 3,
    pendingReceiptUnitCount: 42,
    overduePurchaseCount: 1,
    unshippedOrderCount: 5,
    pendingAfterSaleCount: 2,
  }
  stocks.value = [{
    productId: 'preview-product',
    skuId: 'preview-sku',
    title: '文房四宝精品套装',
    skuLabel: '礼盒装 · 墨色',
    stock: 3,
    threshold: 8,
    lowStock: true,
  }]
  movements.value = []
  purchases.value = [{
    id: 'preview-purchase',
    orderNo: 'CG202607280018',
    supplierName: '临安文房供应社',
    contactName: '陈掌柜',
    contactPhone: '138****2608',
    remark: '礼盒外箱单独加固，发货前确认批次与票据。',
    status: 'PARTIALLY_RECEIVED',
    totalAmount: 2466,
    expectedAt: '2026-07-30T10:00:00.000Z',
    createdAt: '2026-07-27T10:00:00.000Z',
    items: [{
      id: 'preview-purchase-item',
      productId: 'preview-product',
      skuId: 'preview-sku',
      productTitle: '文房四宝精品套装',
      skuLabel: '礼盒装 · 墨色',
      quantity: 36,
      receivedQuantity: 12,
      unitCost: 68.5,
    }],
  }]
  loading.value = false
  error.value = ''
}
async function adjust(item: InventoryStockItem, mode: 'INCREASE' | 'DECREASE' | 'SET') {
  const title = mode === 'SET' ? '盘点库存' : mode === 'DECREASE' ? '报损出库' : '补充库存'
  const placeholder = mode === 'SET' ? '输入盘点后的实际库存' : mode === 'DECREASE' ? '输入损耗或破损数量' : '输入本次增加数量'
  const raw = await prompt(title, placeholder)
  if (raw === null) return
  const quantity = Number(raw)
  if (!Number.isInteger(quantity) || quantity < 0 || (mode !== 'SET' && quantity === 0)) {
    return uni.showToast({ title: '请输入有效的正整数', icon: 'none' })
  }
  await merchantBackendApi.adjustInventory({
    requestId: rid(),
    productId: item.productId,
    skuId: item.skuId || undefined,
    mode,
    quantity,
    reason: mode === 'SET' ? '商家盘点调整' : mode === 'DECREASE' ? '破损或损耗报废' : '商家手工补货',
  })
  uni.showToast({ title: '库存已更新', icon: 'success' })
  await loadAll()
}
async function setThreshold(item: InventoryStockItem) {
  const raw = await prompt('设置库存预警线', '低于或等于该数量时预警')
  if (raw === null) return
  const threshold = Number(raw)
  if (!Number.isInteger(threshold) || threshold < 0) {
    return uni.showToast({ title: '请输入非负整数', icon: 'none' })
  }
  await merchantBackendApi.setInventoryAlert({
    productId: item.productId,
    skuId: item.skuId || undefined,
    lowStockThreshold: threshold,
  })
  await loadAll()
}
async function createPurchase(item: InventoryStockItem) {
  purchaseDraft.value = {
    open: true,
    submitting: false,
    item,
    supplierName: '',
    contactName: '',
    contactPhone: '',
    quantity: '',
    unitCost: '',
    expectedDate: '',
    remark: '',
  }
}
function closePurchaseSheet() {
  if (purchaseDraft.value.submitting) return
  purchaseDraft.value.open = false
}
function onExpectedDateChange(event: { detail?: { value?: string } }) {
  purchaseDraft.value.expectedDate = String(event.detail?.value || '')
}
async function submitPurchaseDraft() {
  const draft = purchaseDraft.value
  if (draft.submitting || !draft.item) return
  const supplier = draft.supplierName.trim()
  const quantity = Number(draft.quantity)
  const unitCost = Number(draft.unitCost)
  if (!supplier) {
    return uni.showToast({ title: '请填写供应商名称', icon: 'none' })
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return uni.showToast({ title: '采购数量不正确', icon: 'none' })
  }
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    return uni.showToast({ title: '采购单价不正确', icon: 'none' })
  }
  draft.submitting = true
  try {
    await merchantBackendApi.createPurchaseOrder({
      supplierName: supplier,
      contactName: draft.contactName.trim() || undefined,
      contactPhone: draft.contactPhone.trim() || undefined,
      expectedAt: draft.expectedDate ? new Date(`${draft.expectedDate}T18:00:00`).toISOString() : undefined,
      remark: draft.remark.trim() || undefined,
      items: [{
        productId: draft.item.productId,
        skuId: draft.item.skuId || undefined,
        quantity,
        unitCost,
      }],
    })
    draft.open = false
    tab.value = 'purchase'
    uni.showToast({ title: '采购草稿已建立', icon: 'success' })
    await loadAll()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '采购单创建失败', icon: 'none' })
  } finally {
    draft.submitting = false
  }
}
async function submitPurchase(order: PurchaseOrder) {
  await merchantBackendApi.submitPurchaseOrder(order.id)
  await loadAll()
}
async function cancelPurchase(order: PurchaseOrder) {
  await merchantBackendApi.cancelPurchaseOrder(order.id)
  await loadAll()
}
async function receiveBatch(order: PurchaseOrder) {
  const quantities: Record<string, string> = {}
  order.items.forEach((item) => {
    if (item.receivedQuantity < item.quantity) quantities[item.id] = ''
  })
  receiptDraft.value = { open: true, submitting: false, order, quantities }
}
function closeReceiptSheet() {
  if (receiptDraft.value.submitting) return
  receiptDraft.value.open = false
}
async function submitReceipt() {
  const draft = receiptDraft.value
  if (draft.submitting || !draft.order) return
  const items: Array<{ itemId: string; quantity: number }> = []
  for (const item of draft.order.items) {
    const remaining = item.quantity - item.receivedQuantity
    if (remaining <= 0) continue
    const raw = draft.quantities[item.id] || '0'
    const quantity = Number(raw)
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > remaining) {
      return uni.showToast({ title: `${item.productTitle} 到货数应为 0-${remaining}`, icon: 'none' })
    }
    if (quantity > 0) items.push({ itemId: item.id, quantity })
  }
  if (!items.length) return uni.showToast({ title: '本批没有填写到货数量', icon: 'none' })
  draft.submitting = true
  try {
    await merchantBackendApi.receivePurchaseOrder(draft.order.id, { requestId: rid(), items })
    draft.open = false
    uni.showToast({ title: '本批到货已入库', icon: 'success' })
    await loadAll()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '验收入库失败', icon: 'none' })
  } finally {
    draft.submitting = false
  }
}

onLoad((options) => {
  // 仅本地开发视觉验收使用；生产构建中 import.meta.env.DEV 恒为 false。
  if (import.meta.env.DEV && options?.__preview === 'purchase') {
    loadVisualPreview()
    return
  }
  void loadAll()
})
</script>

<style scoped>
.page{--red:#c9193f;--red-soft:#fff0f3;--ink:#29251f;--muted:#867a6b;--green:#246a4a;--green-soft:#eaf5ef;--gold:#aa742d;--line:#eadfce;min-height:100vh;background:#f5f0e7;color:var(--ink)}
.nav{height:104rpx;padding:0 24rpx;display:flex;align-items:center;background:rgba(255,255,255,.97);position:sticky;top:0;z-index:8;border-bottom:1rpx solid #eee5d8;box-sizing:border-box}.nav-side{width:96rpx;flex:none}.back{font-size:54rpx;line-height:1}.refresh{text-align:right;color:#8a5b28;font-size:25rpx}.nav-title{flex:1;min-width:0;text-align:center;display:flex;flex-direction:column}.title{font-size:32rpx;font-weight:750}.nav-sub{margin-top:3rpx;font-size:18rpx;color:#9a9083}.body{height:calc(100vh - 104rpx)}
.cockpit{margin:22rpx 22rpx 16rpx;padding:26rpx;border:1rpx solid #dfc69f;border-radius:28rpx;background:radial-gradient(circle at 88% 0,rgba(213,165,87,.18),transparent 31%),linear-gradient(135deg,#fffdfa,#fff8ed);box-shadow:0 12rpx 30rpx rgba(80,55,28,.07)}.cockpit-head{display:flex;justify-content:space-between;align-items:center}.cockpit-head>view:first-child{display:flex;flex-direction:column;min-width:0}.eyebrow{font-size:19rpx;color:var(--gold);letter-spacing:.18em}.cockpit-title{margin-top:8rpx;font-size:29rpx;font-weight:720}.health{width:132rpx;height:104rpx;border-radius:22rpx;background:#283f35;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 8rpx 18rpx rgba(36,74,56,.18)}.health-value{font:700 34rpx Georgia,serif}.health-label{margin-top:3rpx;font-size:18rpx;opacity:.72}.health-track{height:8rpx;margin-top:22rpx;background:#eee3d2;border-radius:999rpx;overflow:hidden}.health-bar{height:100%;min-width:4rpx;border-radius:inherit;background:linear-gradient(90deg,#c9193f,#d39a43,#31825a);transition:width .35s ease}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10rpx;margin-top:20rpx}.sum{min-width:0;padding:15rpx 6rpx;text-align:center;border-right:1rpx solid #eee1cf;display:flex;flex-direction:column;color:#756b5e;font-size:20rpx}.sum:last-child{border-right:0}.sum .num{font:700 34rpx Georgia,serif;color:#2d493c;margin-bottom:5rpx}.sum.warn .num{color:var(--red)}.sum-note{margin-top:5rpx;font-size:17rpx;color:#a19688;white-space:nowrap}
.task-panel,.lifecycle,.workspace{margin:0 22rpx 16rpx;border:1rpx solid var(--line);border-radius:26rpx;background:#fff;box-shadow:0 8rpx 24rpx rgba(61,45,28,.045)}.task-panel{padding:24rpx}.section-head,.life-head,.row-between,.purchase-head,.purchase-meta{display:flex;align-items:center;justify-content:space-between;gap:14rpx}.section-head>view,.life-head>view{display:flex;flex-direction:column}.section-title{font-size:29rpx;font-weight:750}.section-sub{margin-top:5rpx;font-size:20rpx;color:#978c7d}.task-total,.life-mark{padding:7rpx 13rpx;border-radius:999rpx;background:#f5eee4;color:#8f693d;font-size:19rpx}.task-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12rpx;margin-top:20rpx}.task{min-width:0;display:grid;grid-template-columns:50rpx 1fr 20rpx;align-items:center;gap:10rpx;padding:18rpx 14rpx;border:1rpx solid #eee6db;border-radius:18rpx;background:#fbfaf7}.task.urgent{background:#fff6f7;border-color:#efc4cd}.task-glyph{width:48rpx;height:48rpx;border-radius:14rpx;display:flex;align-items:center;justify-content:center;background:#eee6db;color:#765a3c;font-weight:750}.task.urgent .task-glyph{background:var(--red);color:#fff}.task>view{min-width:0;display:flex;flex-direction:column}.task-name{font-size:23rpx;font-weight:700}.task-desc{margin-top:4rpx;font-size:18rpx;color:#94897b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.task-arrow{color:#b2a797}
.lifecycle{padding:23rpx}.life-rail{position:relative;display:grid;grid-template-columns:repeat(4,1fr);margin-top:23rpx}.rail-line{position:absolute;left:11%;right:11%;top:23rpx;height:2rpx;background:#e2d4c1}.rail-pulse{position:absolute;top:17rpx;left:10%;width:14rpx;height:14rpx;border-radius:50%;background:var(--red);box-shadow:0 0 0 8rpx rgba(201,25,63,.1);animation:railMove 4.8s ease-in-out infinite}.life-item{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center}.life-no{width:46rpx;height:46rpx;border-radius:50%;background:#f3ece2;border:5rpx solid #fff;box-shadow:0 0 0 1rpx #e7d9c6;display:flex;align-items:center;justify-content:center;font:19rpx Georgia,serif;color:#9b7650}.life-item.active .life-no{background:#2c5140;color:#fff;box-shadow:0 0 0 1rpx #2c5140}.life-name{margin-top:10rpx;font-size:23rpx;font-weight:700}.life-desc{margin-top:3rpx;font-size:17rpx;color:#9b9083}
.workspace{overflow:hidden}.tabs{padding:8rpx;background:#eee6da;display:flex}.tab{flex:1;text-align:center;padding:18rpx 8rpx;color:#74695b;font-size:24rpx}.tab.active{background:#fff;border-radius:16rpx;color:var(--red);font-weight:750;box-shadow:0 4rpx 12rpx rgba(62,44,24,.06)}.filter{display:flex;padding:20rpx;gap:12rpx}.filter input{flex:1;height:72rpx;padding:0 22rpx;border-radius:14rpx;background:#f6f3ee;font-size:24rpx}.filter-btn{padding:19rpx 20rpx;border-radius:14rpx;background:#2e5a47;color:#fff;font-size:22rpx}.filter-btn.on{background:#9a6637}.notice,.flow-intro,.purchase-tip{margin:0 20rpx 16rpx;padding:18rpx 20rpx;border-radius:14rpx;background:#fff6e5;color:#876437;font-size:21rpx;line-height:1.55}.flow-intro{background:#eef5f0;color:#52705f}.purchase-tip{background:#f6f1e9;color:#786b5c}
.stock-card,.flow-card,.purchase-card{margin:0 20rpx 16rpx;padding:20rpx;border:1rpx solid #ece3d7;border-radius:20rpx;background:#fff;box-shadow:0 5rpx 16rpx rgba(64,48,30,.04)}.stock-main{display:flex;gap:18rpx}.cover{width:104rpx;height:104rpx;border-radius:16rpx;background:#eee;flex:none}.fallback{display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#e9dfd2,#f8f4ed);color:#9a7146;font-family:"Songti SC",serif;font-size:34rpx}.main{flex:1;min-width:0;display:flex;flex-direction:column}.name{font-size:27rpx;font-weight:720}.sub{margin-top:6rpx;font-size:21rpx;color:#8e8375}.stock-line{display:flex;align-items:baseline;margin-top:auto}.stock-number{font:700 38rpx Georgia,serif;color:#2d654b}.stock-number.danger,.stock-state.danger{color:var(--red)}.stock-unit{margin-left:5rpx;font-size:19rpx;color:#8b8174}.stock-state{margin-left:auto;font-size:20rpx;color:#33805d}.card-foot{margin-top:17rpx;padding-top:15rpx;border-top:1rpx dashed #e9dfd2;display:flex;align-items:center;justify-content:space-between;gap:12rpx}.threshold{font-size:20rpx;color:#897b6a}.stock-actions,.purchase-actions{display:flex;align-items:center;gap:9rpx}.stock-actions text,.purchase-actions text{padding:10rpx 13rpx;border-radius:11rpx;background:#f4f0e9;color:#6d6255;font-size:20rpx}.stock-actions .primary-action,.purchase-actions .primary-action{background:var(--red);color:#fff}
.flow-card{display:flex;gap:15rpx;align-items:flex-start}.flow-mark{width:50rpx;height:50rpx;flex:none;border-radius:15rpx;display:flex;align-items:center;justify-content:center;background:#fff0ed;color:#b04a38;font-weight:750}.flow-mark.inbound{background:var(--green-soft);color:var(--green)}.flow-time{font-size:18rpx;color:#a2988c}.flow-reason{margin-top:12rpx;font-size:22rpx;color:#5f574c}.balance{margin-top:7rpx;font-size:19rpx;color:#978d80}.delta{flex:none;font:700 30rpx Georgia,serif;color:#b64d3e}.delta.plus{color:#2e8056}
.purchase-card.overdue{border-color:#e6a8b4;background:linear-gradient(135deg,#fff,#fff7f8)}.purchase-head>view{display:flex;flex-direction:column}.order-no{font:18rpx ui-monospace,SFMono-Regular,monospace;color:#9a8d7d}.purchase-head .name{margin-top:5rpx}.status{padding:8rpx 13rpx;border-radius:999rpx;background:#f5eee3;color:#875f33;font-size:19rpx}.overdue .status{background:var(--red);color:#fff}.purchase-meta{margin:16rpx 0;padding:14rpx 0;border-block:1rpx dashed #e8ded0;color:#7f7365;font-size:20rpx}.purchase-line{padding:8rpx 0;font-size:21rpx}.progress{height:7rpx;margin-top:9rpx;border-radius:99rpx;background:#eee7dc;overflow:hidden}.progress>view{height:100%;border-radius:inherit;background:linear-gradient(90deg,#b68a4d,#2f7857)}.purchase-actions{justify-content:flex-end;margin-top:15rpx}.purchase-actions .receive{background:#2d704f}.purchase-actions .muted-action{background:#f3eee8;color:#887767}
.supplier-note{margin:-4rpx 0 12rpx;padding:14rpx 16rpx;border-radius:12rpx;background:#f8f4ed;display:flex;flex-direction:column;gap:6rpx;color:#776c5d;font-size:19rpx;line-height:1.45}
.state{text-align:center;padding:82rpx 28rpx;color:#887e70}.state.error{color:#b54b3b}.state.empty text{display:block}.empty-title{font-size:26rpx;color:#655d52}.empty-sub{margin-top:12rpx;font-size:21rpx;color:#a09688}.bottom-space{height:calc(110rpx + env(safe-area-inset-bottom))}
.sheet-mask{position:fixed;inset:0;z-index:30;background:rgba(26,22,17,.48);display:flex;align-items:flex-end;backdrop-filter:blur(5px)}.sheet{width:100%;max-height:88vh;border-radius:32rpx 32rpx 0 0;background:#fbf8f2;box-shadow:0 -18rpx 50rpx rgba(28,20,12,.18);overflow:hidden;display:flex;flex-direction:column}.sheet-handle{width:70rpx;height:7rpx;margin:14rpx auto 2rpx;border-radius:99rpx;background:#d6cabc}.sheet-head{padding:17rpx 26rpx 18rpx;display:flex;align-items:center;justify-content:space-between;border-bottom:1rpx solid #e9dfd2}.sheet-head>view{display:flex;flex-direction:column}.sheet-kicker{font-size:18rpx;color:var(--gold);letter-spacing:.16em}.sheet-title{margin-top:4rpx;font-size:31rpx;font-weight:760}.sheet-close{width:58rpx;height:58rpx;border-radius:50%;background:#eee7dc;display:flex;align-items:center;justify-content:center;color:#776b5c;font-size:36rpx}.goods-brief{margin:18rpx 24rpx 0;padding:16rpx;border-radius:18rpx;background:#fff;display:flex;align-items:center;gap:16rpx;border:1rpx solid #ece1d3}.goods-brief image,.brief-fallback{width:76rpx;height:76rpx;border-radius:13rpx;flex:none}.brief-fallback{display:flex;align-items:center;justify-content:center;background:#efe6da;color:#966b3e}.goods-brief>view:last-child{min-width:0;display:flex;flex-direction:column;gap:6rpx}.goods-brief text:first-child{font-size:25rpx;font-weight:700}.goods-brief text:last-child{font-size:19rpx;color:#8e8375}.sheet-form{max-height:54vh;padding:16rpx 24rpx 10rpx;box-sizing:border-box}.field-pair{display:grid;grid-template-columns:1fr 1fr;gap:12rpx}.field{position:relative;margin-bottom:13rpx;padding:14rpx 16rpx;border:1rpx solid #e7ddd0;border-radius:15rpx;background:#fff;display:flex;flex-direction:column;gap:9rpx}.field>text:first-child{font-size:19rpx;color:#84786a}.field.required>text:first-child::after{content:" *";color:var(--red)}.field input{height:42rpx;font-size:24rpx;color:var(--ink)}.picker-field>text:last-child{min-height:42rpx;font-size:24rpx}.picker-field .placeholder{color:#a89d90}.textarea-field textarea{width:100%;height:96rpx;font-size:23rpx;line-height:1.5}.count{position:absolute;right:14rpx;bottom:10rpx;font-size:17rpx;color:#aaa094}.sheet-assurance{margin:4rpx 0 14rpx;padding:15rpx;border-radius:14rpx;background:#eef5f0;color:#587060;display:flex;align-items:center;gap:12rpx;font-size:19rpx;line-height:1.45}.assurance-mark{width:40rpx;height:40rpx;flex:none;border-radius:12rpx;background:#2d704f;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:750}.sheet-actions{padding:16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));background:#fff;display:grid;grid-template-columns:.72fr 1.28fr;gap:12rpx;border-top:1rpx solid #eee5d9}.sheet-secondary,.sheet-primary{height:82rpx;border-radius:17rpx;display:flex;align-items:center;justify-content:center;font-size:24rpx;font-weight:700}.sheet-secondary{background:#f2ede6;color:#74695c}.sheet-primary{background:var(--red);color:#fff;box-shadow:0 8rpx 20rpx rgba(201,25,63,.2)}.sheet-primary.disabled{opacity:.48}.receipt-sheet{max-height:82vh}.receipt-order{margin:17rpx 24rpx 0;padding:17rpx 19rpx;border-radius:16rpx;background:#2d493c;color:#fff;display:flex;justify-content:space-between;gap:16rpx;font-size:20rpx}.receipt-order text:last-child{opacity:.75}.receipt-list{max-height:50vh;padding:16rpx 24rpx;box-sizing:border-box}.receipt-line{padding:17rpx;margin-bottom:11rpx;border:1rpx solid #e8dfd3;border-radius:16rpx;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:18rpx}.receipt-copy{min-width:0;display:flex;flex-direction:column;gap:6rpx}.receipt-copy text:first-child{font-size:24rpx;font-weight:700}.receipt-copy text:last-child{font-size:19rpx;color:#8d8173}.receipt-input{height:60rpx;padding:0 12rpx;border-radius:13rpx;background:#f3eee7;display:flex;align-items:center;gap:6rpx;color:#8a7c6c;font-size:19rpx}.receipt-input input{width:76rpx;text-align:center;font:700 26rpx Georgia,serif;color:var(--ink)}.receive-confirm{background:#2d704f;box-shadow:0 8rpx 20rpx rgba(45,112,79,.2)}
@keyframes railMove{0%,100%{left:10%;opacity:.6}50%{left:87%;opacity:1}}
@media (min-width:700px){.page{max-width:960px;margin:0 auto}.task-grid{grid-template-columns:repeat(4,1fr)}.stock-card,.flow-card,.purchase-card{margin-inline:26rpx}.summary{gap:18rpx}.sheet-mask{align-items:center;justify-content:center;padding:32px;box-sizing:border-box}.sheet{width:min(720px,100%);max-height:88vh;border-radius:28px}.sheet-handle{margin-top:10px}.sheet-form,.receipt-list{max-height:52vh}.sheet-actions{padding-bottom:16rpx}}
@media (prefers-reduced-motion:reduce){.rail-pulse{animation:none;left:48%}.health-bar{transition:none}}
</style>
