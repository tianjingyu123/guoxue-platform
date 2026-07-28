<template>
  <div class="inventory-page">
    <section class="hero">
      <div>
        <p class="eyebrow">库存经营台 · SINGLE LEDGER</p>
        <h1>一套库存账，串起每一笔实物履约</h1>
        <p class="hero-copy">采购记录商业约定，验收入库记录实物移动；销售、发货、退货全部回到同一条审计链路。</p>
      </div>
      <div class="hero-actions">
        <el-button class="ghost-btn" @click="router.push('/merchant-backend/shipping')">批量发货</el-button>
        <el-button class="ghost-btn" @click="router.push('/merchant-backend/after-sales')">售后验收</el-button>
        <el-button type="primary" @click="openPurchase()">新建采购单</el-button>
      </div>
    </section>

    <section class="daily-brief">
      <header>
        <div>
          <p class="eyebrow dark">DAILY ACTIONS</p>
          <h2>今日必须处理</h2>
          <span>先解决会影响成交、履约和资金回笼的事项。</span>
        </div>
        <div class="brief-total"><strong>{{ taskCount }}</strong><span>项待办</span></div>
      </header>
      <div class="brief-grid">
        <button :class="{ urgent: overview.lowStockCount > 0 }" @click="showLowStock">
          <i>补</i><div><b>库存预警</b><span>{{ overview.lowStockCount ? `${overview.lowStockCount} 个规格需要补货` : "库存状态良好" }}</span></div><em>›</em>
        </button>
        <button :class="{ urgent: overview.overduePurchaseCount > 0 }" @click="activate('purchase')">
          <i>收</i><div><b>采购到货</b><span>{{ overview.overduePurchaseCount ? `${overview.overduePurchaseCount} 张采购单已逾期` : `${overview.pendingReceiptUnitCount} 件在途待收` }}</span></div><em>›</em>
        </button>
        <button :class="{ urgent: overview.unshippedOrderCount > 0 }" @click="router.push('/merchant-backend/shipping')">
          <i>发</i><div><b>销售发货</b><span>{{ overview.unshippedOrderCount ? `${overview.unshippedOrderCount} 单等待出库` : "暂无待发订单" }}</span></div><em>›</em>
        </button>
        <button :class="{ urgent: overview.pendingAfterSaleCount > 0 }" @click="router.push('/merchant-backend/after-sales')">
          <i>退</i><div><b>售后回仓</b><span>{{ overview.pendingAfterSaleCount ? `${overview.pendingAfterSaleCount} 件等待处理` : "暂无售后待办" }}</span></div><em>›</em>
        </button>
      </div>
    </section>

    <section class="metrics">
      <button class="metric" @click="activate('stock')">
        <span>库存健康度</span><strong>{{ overview.stockHealthRate }}%</strong><small>{{ overview.skuCount - overview.lowStockCount }} 个规格状态正常</small>
      </button>
      <button class="metric warning" @click="showLowStock">
        <span>库存预警</span><strong>{{ overview.lowStockCount }}</strong><small>{{ overview.outOfStockCount }} 个售罄 · {{ overview.missingAlertCount }} 个未设预警线</small>
      </button>
      <button class="metric" @click="activate('purchase')">
        <span>在途待收</span><strong>{{ overview.pendingReceiptUnitCount }}</strong><small>{{ overview.pendingPurchaseCount }} 张采购单支持分批验收</small>
      </button>
      <button class="metric" @click="activate('movement')">
        <span>库存流水</span><strong>{{ overview.movementCount }}</strong><small>每次变更全程留痕</small>
      </button>
    </section>

    <section class="chain">
      <div class="chain-head">
        <div><b>单据链路</b><span>每个动作都会回写库存并生成不可修改的流水</span></div>
        <span class="chain-note">采购约定 → 到货质检 → 可售库存 → 订单出库 → 售后回仓</span>
      </div>
      <div class="chain-track">
        <button :class="{ on: active === 'purchase' }" @click="activate('purchase')"><i>01</i><b>采购约定</b><span>供应商、价格、交期</span></button>
        <button :class="{ on: active === 'stock' }" @click="activate('stock')"><i>02</i><b>到货入库</b><span>分批验收、盘点、损耗</span></button>
        <button @click="router.push('/merchant-backend/shipping')"><i>03</i><b>销售出库</b><span>拣货、批量运单、轨迹</span></button>
        <button @click="router.push('/merchant-backend/after-sales')"><i>04</i><b>售后质检</b><span>合格回补、不合格留证</span></button>
      </div>
    </section>

    <section class="workspace">
      <div class="workspace-head">
        <div class="tabs">
          <button :class="{ on: active === 'stock' }" @click="activate('stock')">库存</button>
          <button :class="{ on: active === 'movement' }" @click="activate('movement')">流水</button>
          <button :class="{ on: active === 'purchase' }" @click="activate('purchase')">采购单</button>
        </div>
        <el-button text :loading="loading" @click="loadActive">刷新数据</el-button>
      </div>

      <template v-if="active === 'stock'">
        <div class="filters">
          <el-input v-model="keyword" clearable placeholder="搜索商品或规格" @keyup.enter="loadStocks" @clear="loadStocks" />
          <el-checkbox v-model="lowOnly" @change="loadStocks">只看预警</el-checkbox>
          <el-button type="primary" @click="loadStocks">查询</el-button>
        </div>
        <el-table v-loading="loading" :data="stocks" stripe row-key="stockKey" class="data-table">
          <el-table-column label="商品 / 规格" min-width="260">
            <template #default="{ row }">
              <div class="product-cell">
                <el-image v-if="row.image" :src="row.image" fit="cover" />
                <div class="image-fallback" v-else>货</div>
                <div><b>{{ row.title }}</b><span>{{ row.skuLabel || "单规格" }}</span></div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="stock" label="当前库存" width="120">
            <template #default="{ row }"><strong :class="{ danger: row.lowStock }">{{ row.stock }}</strong></template>
          </el-table-column>
          <el-table-column label="预警线" width="120">
            <template #default="{ row }">{{ row.threshold ?? "未启用" }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="row.lowStock ? 'danger' : 'success'" effect="light">{{ row.stock === 0 ? "已售罄" : row.lowStock ? "需要补货" : "库存正常" }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" min-width="270" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openAdjust(row, 'INCREASE')">补货</el-button>
              <el-button link type="warning" @click="openAdjust(row, 'DECREASE')">报损</el-button>
              <el-button link @click="openAdjust(row, 'SET')">盘点</el-button>
              <el-button link @click="openAlert(row)">预警</el-button>
              <el-button link type="success" @click="openPurchase(row)">采购</el-button>
            </template>
          </el-table-column>
          <template #empty><el-empty description="暂无库存记录，请先在商品管理中创建商品" /></template>
        </el-table>
      </template>

      <template v-else-if="active === 'movement'">
        <div class="filters">
          <el-select v-model="movementType" clearable placeholder="全部流水类型" @change="loadMovements">
            <el-option v-for="(label, key) in movementLabels" :key="key" :label="label" :value="key" />
          </el-select>
        </div>
        <el-table v-loading="loading" :data="movements" stripe class="data-table">
          <el-table-column label="时间" width="180"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="商品" min-width="240"><template #default="{ row }"><b>{{ row.metadata?.title || "库存变动" }}</b><div class="muted">{{ row.metadata?.skuLabel || "单规格" }}</div></template></el-table-column>
          <el-table-column label="类型" width="130"><template #default="{ row }">{{ movementLabels[row.type] || row.type }}</template></el-table-column>
          <el-table-column label="变化" width="100"><template #default="{ row }"><strong :class="row.quantity > 0 ? 'success' : 'danger'">{{ row.quantity > 0 ? "+" : "" }}{{ row.quantity }}</strong></template></el-table-column>
          <el-table-column label="结存" width="140"><template #default="{ row }">{{ row.beforeStock }} → {{ row.afterStock }}</template></el-table-column>
          <el-table-column prop="reason" label="原因 / 备注" min-width="220" show-overflow-tooltip />
          <template #empty><el-empty description="暂无库存流水" /></template>
        </el-table>
      </template>

      <template v-else>
        <div class="filters">
          <el-select v-model="purchaseStatus" clearable placeholder="全部采购状态" @change="loadPurchases">
            <el-option v-for="(label, key) in purchaseLabels" :key="key" :label="label" :value="key" />
          </el-select>
          <el-button type="primary" @click="openPurchase()">新建采购单</el-button>
        </div>
        <div v-loading="loading" class="purchase-list">
          <article v-for="order in purchases" :key="order.id" class="purchase-card" :class="{ overdue: isOverdue(order) }">
            <header>
              <div><span class="order-no">{{ order.orderNo }}</span><h3>{{ order.supplierName }}</h3></div>
              <el-tag :type="isOverdue(order) ? 'danger' : purchaseTag(order.status)">{{ isOverdue(order) ? "已逾期" : (purchaseLabels[order.status] || order.status) }}</el-tag>
            </header>
            <div class="purchase-meta">
              <span>合计 <b>¥{{ money(order.totalAmount) }}</b></span>
              <span>创建 {{ formatTime(order.createdAt) }}</span>
              <span v-if="order.expectedAt">预计 {{ formatDate(order.expectedAt) }} 到货</span>
            </div>
            <div v-if="order.contactName || order.contactPhone" class="supplier-contact">
              <span>供应联系人</span>
              <b>{{ order.contactName || "未填写" }}{{ order.contactPhone ? ` · ${order.contactPhone}` : "" }}</b>
            </div>
            <div class="batch-line">
              <div v-for="item in order.items" :key="item.id">
                <span>{{ item.productTitle }}{{ item.skuLabel ? ` · ${item.skuLabel}` : "" }}</span>
                <b>{{ item.receivedQuantity }}/{{ item.quantity }}</b>
                <el-progress :percentage="receivePercent(item)" :stroke-width="5" :show-text="false" />
              </div>
            </div>
            <footer>
              <el-button v-if="order.status === 'DRAFT'" type="primary" @click="submitPurchase(order)">确认下单</el-button>
              <el-button v-if="canReceive(order)" type="success" @click="openReceive(order)">到货验收</el-button>
              <el-button v-if="canCancel(order)" text type="danger" @click="cancelPurchase(order)">取消采购</el-button>
            </footer>
          </article>
          <el-empty v-if="!purchases.length" description="暂无采购单，可从低库存商品直接发起补货" />
        </div>
      </template>
    </section>

    <el-dialog v-model="adjustVisible" :title="adjustTitle" width="460px">
      <el-form label-position="top">
        <el-form-item label="商品"><el-input :model-value="selectedStockLabel" disabled /></el-form-item>
        <el-form-item :label="adjustMode === 'SET' ? '盘点后的实际库存' : '本次数量'"><el-input-number v-model="adjustForm.quantity" :min="adjustMode === 'SET' ? 0 : 1" :precision="0" style="width:100%" /></el-form-item>
        <el-form-item label="变动原因（必填）"><el-input v-model="adjustForm.reason" maxlength="80" show-word-limit placeholder="例如：仓库盘点、破损报废、线下补货" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="adjustVisible=false">取消</el-button><el-button type="primary" :loading="submitting" @click="saveAdjust">确认并记流水</el-button></template>
    </el-dialog>

    <el-dialog v-model="alertVisible" title="库存预警" width="420px">
      <el-form label-position="top">
        <el-form-item label="低库存阈值"><el-input-number v-model="alertThreshold" :min="0" :precision="0" style="width:100%" /></el-form-item>
        <p class="dialog-tip">库存小于或等于该数值时，工作台会提示补货。</p>
      </el-form>
      <template #footer><el-button @click="alertVisible=false">取消</el-button><el-button type="primary" :loading="submitting" @click="saveAlert">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="purchaseVisible" title="新建采购单" width="720px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="供应商名称"><el-input v-model="purchaseForm.supplierName" placeholder="必填" /></el-form-item>
          <el-form-item label="预计到货"><el-date-picker v-model="purchaseForm.expectedAt" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
          <el-form-item label="联系人"><el-input v-model="purchaseForm.contactName" /></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="purchaseForm.contactPhone" /></el-form-item>
        </div>
        <el-form-item label="采购明细">
          <div class="purchase-editor">
            <div v-for="(item, index) in purchaseForm.items" :key="index" class="purchase-row">
              <el-select v-model="item.stockKey" filterable placeholder="选择商品规格" @change="syncPurchaseItem(item)">
                <el-option v-for="stock in stocks" :key="stock.stockKey" :label="stockLabel(stock)" :value="stock.stockKey" />
              </el-select>
              <el-input-number v-model="item.quantity" :min="1" :precision="0" controls-position="right" />
              <el-input-number v-model="item.unitCost" :min="0" :precision="2" controls-position="right" />
              <el-button circle text type="danger" @click="purchaseForm.items.splice(index,1)">×</el-button>
            </div>
            <div class="purchase-row row-label"><span>商品规格</span><span>数量</span><span>采购单价</span><span></span></div>
            <el-button text type="primary" @click="addPurchaseRow">+ 添加明细</el-button>
          </div>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="purchaseForm.remark" type="textarea" :rows="2" maxlength="200" /></el-form-item>
      </el-form>
      <template #footer><span class="purchase-total">预计金额 ¥{{ purchaseTotal }}</span><el-button @click="purchaseVisible=false">取消</el-button><el-button type="primary" :loading="submitting" @click="createPurchase">保存草稿</el-button></template>
    </el-dialog>

    <el-dialog v-model="receiveVisible" title="分批到货验收" width="620px">
      <p class="dialog-tip">只填写本批实际到货数量，未到部分可在下次继续验收入库。</p>
      <div v-for="item in receiveForm" :key="item.itemId" class="receive-row">
        <div><b>{{ item.label }}</b><span>待到 {{ item.remaining }}</span></div>
        <el-input-number v-model="item.quantity" :min="0" :max="item.remaining" :precision="0" />
      </div>
      <template #footer><el-button @click="receiveVisible=false">取消</el-button><el-button type="success" :loading="submitting" @click="receivePurchase">确认本批入库</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { merchantBackendApi } from "@/api";

type Stock = { productId:string; skuId:string|null; title:string; image?:string|null; skuLabel?:string|null; stock:number; threshold:number|null; lowStock:boolean; stockKey:string };
type Movement = { id:string; type:string; quantity:number; beforeStock:number; afterStock:number; reason?:string|null; metadata?:{title?:string;skuLabel?:string}|null; createdAt:string };
type PurchaseItem = { id:string; productId:string; skuId?:string|null; productTitle:string; skuLabel?:string|null; quantity:number; receivedQuantity:number; unitCost:number|string };
type Purchase = { id:string; orderNo:string; supplierName:string; contactName?:string|null; contactPhone?:string|null; status:string; totalAmount:number|string; expectedAt?:string|null; createdAt:string; items:PurchaseItem[] };
type PurchaseDraftItem = { stockKey:string; productId:string; skuId?:string; quantity:number; unitCost:number };

const router = useRouter();
const active = ref<"stock"|"movement"|"purchase">("stock");
const loading = ref(false); const submitting = ref(false);
const overview = reactive({
  totalStock:0,
  skuCount:0,
  lowStockCount:0,
  outOfStockCount:0,
  stockHealthRate:100,
  missingAlertCount:0,
  movementCount:0,
  pendingPurchaseCount:0,
  pendingReceiptUnitCount:0,
  overduePurchaseCount:0,
  unshippedOrderCount:0,
  pendingAfterSaleCount:0,
});
const stocks = ref<Stock[]>([]); const movements = ref<Movement[]>([]); const purchases = ref<Purchase[]>([]);
const keyword = ref(""); const lowOnly = ref(false); const movementType = ref(""); const purchaseStatus = ref("");
const movementLabels:Record<string,string>={PURCHASE_IN:"采购入库",SALE_OUT:"销售出库",ORDER_CANCEL_RETURN:"取消回补",REFUND_RETURN:"退货入库",ADJUST_IN:"人工调增",ADJUST_OUT:"人工调减",STOCKTAKE_GAIN:"盘盈",STOCKTAKE_LOSS:"盘亏"};
const purchaseLabels:Record<string,string>={DRAFT:"草稿",ORDERED:"待到货",PARTIALLY_RECEIVED:"部分到货",RECEIVED:"已完成",CANCELLED:"已取消"};
const rid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
function dataOf<T>(res:any):T { return (res?.data?.data ?? res?.data ?? res) as T; }
function pageOf<T>(res:any):{items:T[];total:number}{ const data:any=dataOf(res); return {items:Array.isArray(data)?data:(data?.items||data?.list||data?.data||[]),total:Number(data?.total||0)}; }
function formatTime(value:string){ return value ? new Date(value).toLocaleString("zh-CN",{hour12:false}) : "—"; }
function formatDate(value:string){ return value ? new Date(value).toLocaleDateString("zh-CN") : "—"; }
function money(value:number|string){ return Number(value||0).toFixed(2); }
function stockLabel(s:Stock){ return `${s.title}${s.skuLabel ? ` · ${s.skuLabel}` : " · 单规格"}（现有 ${s.stock}）`; }
function receivePercent(item:PurchaseItem){ return item.quantity ? Math.round(item.receivedQuantity/item.quantity*100) : 0; }
function purchaseTag(status:string):"success"|"info"|"warning"|""{ return status==="RECEIVED"?"success":status==="CANCELLED"?"info":status==="PARTIALLY_RECEIVED"?"warning":""; }
function canReceive(order:Purchase){ return ["ORDERED","PARTIALLY_RECEIVED"].includes(order.status); }
function canCancel(order:Purchase){ return ["DRAFT","ORDERED"].includes(order.status); }
function isOverdue(order:Purchase){ return canReceive(order) && Boolean(order.expectedAt) && new Date(order.expectedAt as string).getTime() < Date.now(); }
const taskCount=computed(()=>overview.lowStockCount+overview.overduePurchaseCount+overview.unshippedOrderCount+overview.pendingAfterSaleCount);

async function loadOverview(){ Object.assign(overview,dataOf(await merchantBackendApi.getInventoryOverview())); }
async function loadStocks(){
  loading.value=true;
  try{ const p=pageOf<any>(await merchantBackendApi.listInventoryStocks({page:1,pageSize:100,keyword:keyword.value||undefined,lowStock:lowOnly.value||undefined})); stocks.value=p.items.map((s:any)=>({...s,stockKey:`${s.productId}:${s.skuId||"PRODUCT"}`})); }
  catch(e:any){ stocks.value=[]; ElMessage.error(e?.message||"库存加载失败"); } finally{loading.value=false;}
}
async function loadMovements(){ loading.value=true; try{ movements.value=pageOf<Movement>(await merchantBackendApi.listInventoryMovements({page:1,pageSize:100,type:movementType.value||undefined})).items; }catch(e:any){ElMessage.error(e?.message||"流水加载失败");}finally{loading.value=false;} }
async function loadPurchases(){ loading.value=true; try{ purchases.value=pageOf<Purchase>(await merchantBackendApi.listPurchaseOrders({page:1,pageSize:100,status:purchaseStatus.value||undefined})).items; }catch(e:any){ElMessage.error(e?.message||"采购单加载失败");}finally{loading.value=false;} }
async function loadActive(){ await Promise.allSettled([loadOverview(), active.value==="stock"?loadStocks():active.value==="movement"?loadMovements():loadPurchases()]); }
function activate(tab:typeof active.value){ active.value=tab; loadActive(); }
function showLowStock(){ lowOnly.value=true; activate("stock"); }

const adjustVisible=ref(false); const selectedStock=ref<Stock|null>(null); const adjustMode=ref<"INCREASE"|"DECREASE"|"SET">("INCREASE");
const adjustForm=reactive({quantity:1,reason:""});
const adjustTitle=computed(()=>adjustMode.value==="SET"?"库存盘点":adjustMode.value==="DECREASE"?"报损出库":"补充库存");
const selectedStockLabel=computed(()=>selectedStock.value?stockLabel(selectedStock.value):"");
function openAdjust(row:Stock,mode:typeof adjustMode.value){selectedStock.value=row;adjustMode.value=mode;adjustForm.quantity=mode==="SET"?row.stock:1;adjustForm.reason=mode==="DECREASE"?"破损或损耗":"仓库人工调整";adjustVisible.value=true;}
async function saveAdjust(){ if(!selectedStock.value||!adjustForm.reason.trim())return ElMessage.warning("请填写库存变动原因"); submitting.value=true; try{await merchantBackendApi.adjustInventory({requestId:rid(),productId:selectedStock.value.productId,skuId:selectedStock.value.skuId||undefined,mode:adjustMode.value,quantity:adjustForm.quantity,reason:adjustForm.reason.trim()});ElMessage.success("库存已更新并记录流水");adjustVisible.value=false;await loadActive();}catch(e:any){ElMessage.error(e?.message||"库存调整失败");}finally{submitting.value=false;} }
const alertVisible=ref(false); const alertThreshold=ref(5);
function openAlert(row:Stock){selectedStock.value=row;alertThreshold.value=row.threshold??5;alertVisible.value=true;}
async function saveAlert(){if(!selectedStock.value)return;submitting.value=true;try{await merchantBackendApi.setInventoryAlert({productId:selectedStock.value.productId,skuId:selectedStock.value.skuId||undefined,lowStockThreshold:alertThreshold.value,enabled:true});ElMessage.success("预警线已保存");alertVisible.value=false;await loadActive();}catch(e:any){ElMessage.error(e?.message||"保存失败");}finally{submitting.value=false;}}

const purchaseVisible=ref(false);
const purchaseForm=reactive<{supplierName:string;expectedAt:string;contactName:string;contactPhone:string;remark:string;items:PurchaseDraftItem[]}>({supplierName:"",expectedAt:"",contactName:"",contactPhone:"",remark:"",items:[]});
const purchaseTotal=computed(()=>purchaseForm.items.reduce((s,i)=>s+Number(i.quantity||0)*Number(i.unitCost||0),0).toFixed(2));
function newPurchaseItem(stock?:Stock):PurchaseDraftItem{return{stockKey:stock?.stockKey||"",productId:stock?.productId||"",skuId:stock?.skuId||undefined,quantity:1,unitCost:0};}
async function openPurchase(stock?:Stock){if(!stocks.value.length)await loadStocks();purchaseForm.supplierName="";purchaseForm.expectedAt="";purchaseForm.contactName="";purchaseForm.contactPhone="";purchaseForm.remark="";purchaseForm.items=[newPurchaseItem(stock)];purchaseVisible.value=true;}
function addPurchaseRow(){purchaseForm.items.push(newPurchaseItem());}
function syncPurchaseItem(item:PurchaseDraftItem){const stock=stocks.value.find(s=>s.stockKey===item.stockKey);if(stock){item.productId=stock.productId;item.skuId=stock.skuId||undefined;}}
async function createPurchase(){ if(!purchaseForm.supplierName.trim())return ElMessage.warning("请填写供应商名称"); const items=purchaseForm.items.filter(i=>i.productId&&i.quantity>0);if(!items.length)return ElMessage.warning("请至少添加一条采购明细");submitting.value=true;try{await merchantBackendApi.createPurchaseOrder({supplierName:purchaseForm.supplierName.trim(),contactName:purchaseForm.contactName||undefined,contactPhone:purchaseForm.contactPhone||undefined,expectedAt:purchaseForm.expectedAt||undefined,remark:purchaseForm.remark||undefined,items:items.map(({productId,skuId,quantity,unitCost})=>({productId,skuId,quantity,unitCost}))});ElMessage.success("采购单草稿已创建");purchaseVisible.value=false;activate("purchase");}catch(e:any){ElMessage.error(e?.message||"采购单创建失败");}finally{submitting.value=false;}}
async function submitPurchase(order:Purchase){try{await merchantBackendApi.submitPurchaseOrder(order.id);ElMessage.success("采购单已确认");await loadActive();}catch(e:any){ElMessage.error(e?.message||"确认失败");}}
async function cancelPurchase(order:Purchase){try{await ElMessageBox.confirm("取消后不可继续收货，确认取消该采购单？","取消采购单",{type:"warning"});await merchantBackendApi.cancelPurchaseOrder(order.id);ElMessage.success("采购单已取消");await loadActive();}catch(e:any){if(e!=="cancel"&&e!=="close")ElMessage.error(e?.message||"取消失败");}}
const receiveVisible=ref(false); const receiveOrder=ref<Purchase|null>(null); const receiveForm=ref<Array<{itemId:string;label:string;remaining:number;quantity:number}>>([]);
function openReceive(order:Purchase){receiveOrder.value=order;receiveForm.value=order.items.map(i=>({itemId:i.id,label:`${i.productTitle}${i.skuLabel?` · ${i.skuLabel}`:""}`,remaining:i.quantity-i.receivedQuantity,quantity:i.quantity-i.receivedQuantity})).filter(i=>i.remaining>0);receiveVisible.value=true;}
async function receivePurchase(){if(!receiveOrder.value)return;const items=receiveForm.value.filter(i=>i.quantity>0).map(i=>({itemId:i.itemId,quantity:i.quantity}));if(!items.length)return ElMessage.warning("请填写本批到货数量");submitting.value=true;try{await merchantBackendApi.receivePurchaseOrder(receiveOrder.value.id,{requestId:rid(),items});ElMessage.success("本批到货已入库");receiveVisible.value=false;await loadActive();}catch(e:any){ElMessage.error(e?.message||"入库失败");}finally{submitting.value=false;}}

onMounted(async()=>{await Promise.allSettled([loadOverview(),loadStocks()]);});
</script>

<style scoped>
.inventory-page{--red:#c9183d;--ink:#27231f;--green:#285a43;--gold:#a6712e;--paper:#f7f3eb;--line:#e8dfd1;min-height:100%;padding:22px;background:linear-gradient(135deg,#f7f3eb 0,#fff 52%,#f4eee4 100%);color:var(--ink)}
.hero{display:flex;justify-content:space-between;align-items:end;gap:24px;padding:30px 34px;border-radius:22px;color:#fff;background:radial-gradient(circle at 82% 16%,rgba(255,218,150,.34),transparent 23%),linear-gradient(118deg,#1f4435,#32644d 50%,#7b2937);box-shadow:0 18px 40px rgba(38,73,56,.17)}
.eyebrow{margin:0 0 8px;font-size:11px;letter-spacing:.2em;opacity:.72}.eyebrow.dark{color:var(--gold);opacity:1}.hero h1{max-width:760px;margin:0;font-family:"Noto Serif SC","Songti SC",serif;font-size:32px;letter-spacing:.04em}.hero-copy{max-width:850px;margin:10px 0 0;opacity:.82}.hero-actions{display:flex;gap:10px;flex-wrap:wrap}.ghost-btn{color:#fff;border-color:rgba(255,255,255,.45);background:rgba(255,255,255,.08)}.ghost-btn:hover{color:#fff;border-color:#fff;background:rgba(255,255,255,.16)}
.daily-brief{margin:18px 0;padding:22px 24px;border:1px solid #dfc9a9;border-radius:20px;background:radial-gradient(circle at 94% 0,rgba(209,157,75,.16),transparent 28%),linear-gradient(135deg,#fffdfa,#fff9ef);box-shadow:0 10px 30px rgba(72,51,28,.06)}.daily-brief>header{display:flex;align-items:center;justify-content:space-between;gap:20px}.daily-brief h2{margin:0 0 5px;font-family:"Noto Serif SC","Songti SC",serif;font-size:23px}.daily-brief header span{color:#8c8173;font-size:13px}.brief-total{width:88px;height:66px;border-radius:15px;display:grid;place-content:center;text-align:center;color:#fff;background:var(--green)}.brief-total strong{font:700 25px Georgia,serif}.brief-total span{color:rgba(255,255,255,.72)!important;font-size:11px!important}.brief-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.brief-grid button{display:grid;grid-template-columns:42px 1fr 16px;align-items:center;gap:10px;padding:14px;border:1px solid #ede4d7;border-radius:14px;text-align:left;background:rgba(255,255,255,.88);cursor:pointer;transition:border-color .2s,transform .2s,box-shadow .2s}.brief-grid button:hover{transform:translateY(-2px);border-color:#d4b88f;box-shadow:0 8px 18px rgba(77,55,31,.07)}.brief-grid button.urgent{border-color:#e8b5bf;background:#fff7f8}.brief-grid i{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-style:normal;font-weight:700;color:#7d5b35;background:#f1e9dd}.brief-grid .urgent i{color:#fff;background:var(--red)}.brief-grid div{min-width:0}.brief-grid b,.brief-grid span{display:block}.brief-grid span{margin-top:4px;overflow:hidden;color:#8f8578;font-size:12px;white-space:nowrap;text-overflow:ellipsis}.brief-grid em{color:#b5a999;font-size:19px;font-style:normal}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}.metric{position:relative;text-align:left;padding:18px 20px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.9);cursor:pointer;transition:.2s}.metric:hover{transform:translateY(-2px);border-color:#d7b8a3;box-shadow:0 10px 25px rgba(70,50,30,.08)}.metric span,.metric small{display:block;color:#847b70}.metric strong{display:block;margin:8px 0 5px;font-family:Georgia,serif;font-size:30px}.metric.warning strong{color:var(--red)}
.chain,.workspace{border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.93);box-shadow:0 12px 35px rgba(55,40,25,.05)}.chain{padding:20px 24px;margin-bottom:18px}.chain-head{display:flex;align-items:center;justify-content:space-between}.chain-head div{display:flex;gap:12px;align-items:baseline}.chain-head span{color:#8d8275;font-size:13px}.chain-note{letter-spacing:.04em}.chain-track{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.chain-track button{position:relative;display:grid;grid-template-columns:36px 1fr;text-align:left;gap:3px 8px;padding:15px;border:1px solid #ede5d9;border-radius:14px;background:#fbf9f5;cursor:pointer}.chain-track button:not(:last-child)::after{content:"›";position:absolute;right:-9px;top:29px;z-index:2;color:#c3b8a8}.chain-track button.on{border-color:#84aa96;background:#f3faf6}.chain-track i{grid-row:1/3;font-style:normal;color:var(--red);font-family:Georgia,serif}.chain-track span{font-size:12px;color:#8b8175}
.workspace{overflow:hidden}.workspace-head{display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid var(--line)}.tabs{display:flex}.tabs button{padding:18px 20px;border:0;border-bottom:3px solid transparent;background:none;cursor:pointer}.tabs button.on{color:var(--red);border-bottom-color:var(--red);font-weight:700}.filters{display:flex;gap:12px;align-items:center;padding:18px 20px;background:#fcfaf7}.filters .el-input{max-width:340px}.data-table{width:100%}.product-cell{display:flex;gap:12px;align-items:center}.product-cell .el-image,.image-fallback{width:46px;height:46px;border-radius:10px}.image-fallback{display:grid;place-items:center;background:#f2e9df;color:#9d6f52}.product-cell b,.product-cell span{display:block}.product-cell span,.muted{margin-top:4px;font-size:12px;color:#8d8377}.danger{color:#c52b43}.success{color:#21825a}
.purchase-list{padding:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;min-height:180px}.purchase-card{border:1px solid var(--line);border-radius:16px;padding:18px;background:#fff}.purchase-card.overdue{border-color:#e2a5b1;background:linear-gradient(135deg,#fff,#fff7f8)}.purchase-card header,.purchase-card footer,.purchase-meta{display:flex;justify-content:space-between;gap:12px;align-items:center}.purchase-card h3{margin:5px 0 0}.order-no{font:12px ui-monospace,SFMono-Regular,monospace;color:#8b8175}.purchase-meta{margin:14px 0 10px;padding:12px 0;border-block:1px dashed #e7ded2;color:#796f64;font-size:13px}.supplier-contact{display:flex;justify-content:space-between;gap:12px;margin-bottom:13px;padding:9px 11px;border-radius:9px;background:#f7f3ed;color:#8b8175;font-size:12px}.supplier-contact b{color:#534c43}.batch-line{display:grid;gap:10px}.batch-line>div{display:grid;grid-template-columns:1fr 52px 120px;gap:10px;align-items:center}.purchase-card footer{justify-content:flex-end;margin-top:16px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.purchase-editor{width:100%;display:flex;flex-direction:column;gap:9px}.purchase-row{display:grid;grid-template-columns:minmax(220px,1fr) 120px 150px 32px;gap:8px}.row-label{order:-1;color:#8b8175;font-size:12px}.purchase-total{margin-right:auto;font-weight:700;color:var(--red)}.receive-row{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid #eee7dc}.receive-row b,.receive-row span{display:block}.receive-row span,.dialog-tip{color:#8a8176;font-size:13px}
@media(max-width:1100px){.brief-grid{grid-template-columns:repeat(2,1fr)}.metrics{grid-template-columns:repeat(2,1fr)}.chain-track{grid-template-columns:repeat(2,1fr)}.chain-track button::after{display:none}.purchase-list{grid-template-columns:1fr}}
@media(max-width:720px){.inventory-page{padding:12px}.hero{align-items:flex-start;flex-direction:column;padding:22px}.hero h1{font-size:27px}.daily-brief>header{align-items:flex-start}.brief-grid{grid-template-columns:1fr}.metrics{gap:8px}.metric{padding:14px}.chain-head,.chain-head div{align-items:flex-start;flex-direction:column}.chain-note{display:none}.filters{align-items:stretch;flex-direction:column}.filters .el-input{max-width:none}.purchase-row{grid-template-columns:1fr 88px 110px 28px}.form-grid{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.metric,.brief-grid button{transition:none}.metric:hover,.brief-grid button:hover{transform:none}}
</style>
