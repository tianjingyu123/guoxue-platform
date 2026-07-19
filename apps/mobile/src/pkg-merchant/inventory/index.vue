<template>
  <view class="page">
    <view class="nav safe-top"><view class="back" @tap="back">‹</view><text class="title">库存与采购</text><view class="refresh" @tap="loadAll">刷新</view></view>

    <scroll-view scroll-y class="body">
      <view class="summary" v-if="overview">
        <view class="sum"><text class="num">{{ overview.totalStock }}</text><text>总库存</text></view>
        <view class="sum"><text class="num">{{ overview.skuCount }}</text><text>商品规格</text></view>
        <view class="sum warn"><text class="num">{{ overview.lowStockCount }}</text><text>库存预警</text></view>
        <view class="sum"><text class="num">{{ overview.pendingPurchaseCount }}</text><text>待到货</text></view>
      </view>

      <view class="tabs">
        <view v-for="t in tabs" :key="t.key" class="tab" :class="{ active: tab === t.key }" @tap="tab = t.key"><text>{{ t.label }}</text></view>
      </view>

      <view v-if="loading" class="state">正在读取真实库存…</view>
      <view v-else-if="error" class="state error" @tap="loadAll">{{ error }}，点击重试</view>

      <template v-else-if="tab === 'stock'">
        <view class="filter"><input v-model="keyword" placeholder="搜索商品" @confirm="loadStocks"/><view class="filter-btn" @tap="lowOnly = !lowOnly; loadStocks()">{{ lowOnly ? '全部库存' : '只看预警' }}</view></view>
        <view v-for="item in stocks" :key="item.productId + ':' + (item.skuId || '')" class="card">
          <image v-if="item.image" :src="item.image" mode="aspectFill" class="cover"/>
          <view class="main"><text class="name">{{ item.title }}</text><text v-if="item.skuLabel" class="sub">{{ item.skuLabel }}</text><text class="stock" :class="{ danger: item.lowStock }">库存 {{ item.stock }}<text v-if="item.threshold !== null"> · 预警线 {{ item.threshold }}</text></text></view>
          <view class="actions"><text @tap="adjust(item, 'INCREASE')">补货</text><text @tap="adjust(item, 'SET')">盘点</text><text @tap="setThreshold(item)">预警</text><text @tap="createPurchase(item)">采购</text></view>
        </view>
        <view v-if="!stocks.length" class="state">暂无库存记录</view>
      </template>

      <template v-else-if="tab === 'flow'">
        <view v-for="m in movements" :key="m.id" class="card flow">
          <view class="main"><text class="name">{{ m.metadata?.title || '库存变动' }}<text v-if="m.metadata?.skuLabel" class="sub"> · {{ m.metadata.skuLabel }}</text></text><text class="sub">{{ typeText[m.type] || m.type }} · {{ formatTime(m.createdAt) }}</text><text class="stock">{{ m.beforeStock }} → {{ m.afterStock }} · {{ m.reason || '系统自动记录' }}</text></view>
          <text class="delta" :class="{ plus: m.quantity > 0 }">{{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}</text>
        </view>
        <view v-if="!movements.length" class="state">暂无库存流水</view>
      </template>

      <template v-else>
        <view class="tip">采购单从“库存”页对应商品发起。确认下单后可分批到货，入库数量由后端幂等校验。</view>
        <view v-for="p in purchases" :key="p.id" class="card purchase">
          <view class="main"><text class="name">{{ p.supplierName }} · {{ p.orderNo }}</text><text class="sub">{{ purchaseStatus[p.status] || p.status }} · ¥{{ Number(p.totalAmount).toFixed(2) }}</text><text v-for="it in p.items" :key="it.id" class="stock">{{ it.productTitle }}{{ it.skuLabel ? ' · ' + it.skuLabel : '' }}　{{ it.receivedQuantity }}/{{ it.quantity }}</text></view>
          <view class="actions vertical"><text v-if="p.status === 'DRAFT'" @tap="submitPurchase(p)">确认下单</text><text v-if="p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED'" @tap="receiveAll(p)">到货入库</text><text v-if="p.status === 'DRAFT' || p.status === 'ORDERED'" class="muted" @tap="cancelPurchase(p)">取消</text></view>
        </view>
        <view v-if="!purchases.length" class="state">暂无采购单</view>
      </template>
      <view class="bottom-space"/>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { merchantBackendApi, type InventoryOverview, type InventoryStockItem, type InventoryMovement, type PurchaseOrder } from '@/lib/merchant-data'

const tabs = [{ key: 'stock', label: '库存' }, { key: 'flow', label: '流水' }, { key: 'purchase', label: '采购单' }]
const tab = ref('stock'); const loading = ref(false); const error = ref(''); const keyword = ref(''); const lowOnly = ref(false)
const overview = ref<InventoryOverview | null>(null); const stocks = ref<InventoryStockItem[]>([])
const movements = ref<InventoryMovement[]>([]); const purchases = ref<PurchaseOrder[]>([])
const typeText: Record<string,string> = { PURCHASE_IN:'采购入库',SALE_OUT:'销售出库',ORDER_CANCEL_RETURN:'取消回补',REFUND_RETURN:'退货入库',ADJUST_IN:'手工调增',ADJUST_OUT:'手工调减',STOCKTAKE_GAIN:'盘盈',STOCKTAKE_LOSS:'盘亏' }
const purchaseStatus: Record<string,string> = { DRAFT:'草稿',ORDERED:'待到货',PARTIALLY_RECEIVED:'部分到货',RECEIVED:'已完成',CANCELLED:'已取消' }
const rid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`
const formatTime = (v:string) => new Date(v).toLocaleString('zh-CN', { hour12:false })
function back(){ uni.navigateBack() }
function prompt(title:string, placeholder:string):Promise<string|null>{ return new Promise(resolve => uni.showModal({ title, editable:true, placeholderText:placeholder, success:r=>resolve(r.confirm ? (r.content || '').trim() : null) })) }
async function loadStocks(){ const r=await merchantBackendApi.getInventoryStocks({ keyword:keyword.value, lowStock:lowOnly.value, pageSize:100 }); stocks.value=r.items || [] }
async function loadAll(){ loading.value=true; error.value=''; try { const [o,s,m,p]=await Promise.all([merchantBackendApi.getInventoryOverview(),merchantBackendApi.getInventoryStocks({ pageSize:100 }),merchantBackendApi.getInventoryMovements({ pageSize:100 }),merchantBackendApi.getPurchaseOrders({ pageSize:100 })]); overview.value=o; stocks.value=s.items||[]; movements.value=m.items||[]; purchases.value=p.items||[] } catch(e:any){ error.value=e?.message||'加载失败' } finally { loading.value=false } }
async function adjust(item:InventoryStockItem, mode:'INCREASE'|'SET'){ const raw=await prompt(mode==='SET'?'盘点库存':'补充库存', mode==='SET'?'输入盘点后的实际库存':'输入本次增加数量'); if(raw===null)return; const quantity=Number(raw); if(!Number.isInteger(quantity)||quantity<0)return uni.showToast({title:'请输入非负整数',icon:'none'}); await merchantBackendApi.adjustInventory({requestId:rid(),productId:item.productId,skuId:item.skuId||undefined,mode,quantity,reason:mode==='SET'?'商家盘点调整':'商家手工补货'}); uni.showToast({title:'库存已更新',icon:'success'}); await loadAll() }
async function setThreshold(item:InventoryStockItem){ const raw=await prompt('设置库存预警线','低于或等于该数量时预警'); if(raw===null)return; const n=Number(raw); if(!Number.isInteger(n)||n<0)return uni.showToast({title:'请输入非负整数',icon:'none'}); await merchantBackendApi.setInventoryAlert({productId:item.productId,skuId:item.skuId||undefined,lowStockThreshold:n}); await loadAll() }
async function createPurchase(item:InventoryStockItem){ const supplier=await prompt('新建采购单','输入供应商名称'); if(!supplier)return; const q=Number(await prompt('采购数量','输入正整数')); if(!Number.isInteger(q)||q<=0)return uni.showToast({title:'采购数量不正确',icon:'none'}); const cost=Number(await prompt('采购单价','输入本次采购单价')); if(!Number.isFinite(cost)||cost<0)return uni.showToast({title:'采购单价不正确',icon:'none'}); await merchantBackendApi.createPurchaseOrder({supplierName:supplier,items:[{productId:item.productId,skuId:item.skuId||undefined,quantity:q,unitCost:cost}]}); tab.value='purchase'; uni.showToast({title:'采购单已创建',icon:'success'}); await loadAll() }
async function submitPurchase(p:PurchaseOrder){ await merchantBackendApi.submitPurchaseOrder(p.id); await loadAll() }
async function cancelPurchase(p:PurchaseOrder){ await merchantBackendApi.cancelPurchaseOrder(p.id); await loadAll() }
async function receiveAll(p:PurchaseOrder){ const items=p.items.map(i=>({itemId:i.id,quantity:i.quantity-i.receivedQuantity})).filter(i=>i.quantity>0); if(!items.length)return; await merchantBackendApi.receivePurchaseOrder(p.id,{requestId:rid(),items}); uni.showToast({title:'到货已入库',icon:'success'}); await loadAll() }
onLoad(loadAll)
</script>

<style scoped>
.page{min-height:100vh;background:#f5f1e8;color:#28241e}.nav{height:92rpx;padding:0 28rpx;display:flex;align-items:center;background:#fff;position:sticky;top:0;z-index:5;border-bottom:1rpx solid #eee5d8}.back{font-size:54rpx;width:100rpx}.title{font-size:34rpx;font-weight:700;flex:1;text-align:center}.refresh{width:100rpx;text-align:right;color:#8a5b28;font-size:26rpx}.body{height:calc(100vh - 92rpx)}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12rpx;padding:24rpx}.sum{background:#fff;border-radius:18rpx;padding:20rpx 8rpx;text-align:center;display:flex;flex-direction:column;color:#827766;font-size:22rpx}.sum .num{font-size:38rpx;font-weight:700;color:#2c4435;margin-bottom:6rpx}.sum.warn .num{color:#b85a32}.tabs{margin:0 24rpx 20rpx;background:#e9e1d4;padding:6rpx;border-radius:16rpx;display:flex}.tab{flex:1;text-align:center;padding:18rpx;color:#756b5d}.tab.active{background:#fff;border-radius:12rpx;color:#315440;font-weight:700}.filter{display:flex;margin:0 24rpx 18rpx;gap:14rpx}.filter input{flex:1;background:#fff;border-radius:14rpx;padding:0 22rpx;height:72rpx}.filter-btn{background:#315440;color:#fff;padding:18rpx 24rpx;border-radius:14rpx;font-size:24rpx}.card{margin:0 24rpx 18rpx;background:#fff;border-radius:20rpx;padding:22rpx;display:flex;gap:18rpx;box-shadow:0 6rpx 20rpx rgba(70,55,35,.05)}.cover{width:100rpx;height:100rpx;border-radius:12rpx;background:#eee}.main{flex:1;min-width:0;display:flex;flex-direction:column;gap:8rpx}.name{font-size:28rpx;font-weight:650}.sub{font-size:23rpx;color:#8a8174}.stock{font-size:24rpx;color:#55645b}.stock.danger{color:#c15338;font-weight:600}.actions{width:90rpx;display:grid;grid-template-columns:1fr 1fr;gap:10rpx}.actions text{font-size:22rpx;text-align:center;padding:8rpx 2rpx;background:#edf3ee;color:#315440;border-radius:8rpx}.actions.vertical{display:flex;flex-direction:column;width:120rpx}.actions .muted{background:#f3eee8;color:#8b7662}.flow .delta{font-size:32rpx;font-weight:700;color:#b54939}.flow .delta.plus{color:#2d8050}.tip{margin:0 24rpx 18rpx;padding:20rpx;background:#fff8e7;border-radius:14rpx;color:#8b6737;font-size:23rpx;line-height:1.6}.state{text-align:center;padding:90rpx 30rpx;color:#887e70}.state.error{color:#b54b3b}.bottom-space{height:100rpx}
</style>
