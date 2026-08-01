<template>
  <div class="inventory-page">
    <section class="hero">
      <div>
        <p class="eyebrow">库存经营台 · SINGLE LEDGER</p>
        <h1>一套库存账，串起每一笔实物履约</h1>
        <p class="hero-copy">采购记录商业约定，验收入库记录实物移动；销售、发货、退货全部回到同一条审计链路。</p>
      </div>
      <div class="hero-actions">
        <el-button class="ghost-btn" @click="openSupplierDirectory">供应商档案</el-button>
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
        <span>账面现货</span><strong>{{ overview.physicalOnHandStock }}</strong><small>其中可售 {{ overview.availableStock }}</small>
      </button>
      <button class="metric reserve" @click="activate('stock')">
        <span>待付款占用</span><strong>{{ overview.unpaidReservedUnitCount }}</strong><small>超时取消后自动释放</small>
      </button>
      <button class="metric reserve" @click="router.push('/merchant-backend/shipping')">
        <span>待发货占用</span><strong>{{ overview.unshippedUnitCount }}</strong><small>{{ overview.unshippedOrderCount }} 张订单等待出库</small>
      </button>
      <button class="metric" @click="activate('purchase')">
        <span>在途待收</span><strong>{{ overview.pendingReceiptUnitCount }}</strong><small>{{ overview.pendingPurchaseCount }} 张采购单支持分批验收</small>
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
        <el-table v-loading="loading" :data="stocks" stripe row-key="stockKey" class="data-table stock-table" @row-click="openStockFile">
          <el-table-column label="商品 / 规格" min-width="260">
            <template #default="{ row }">
              <div class="product-cell">
                <el-image v-if="row.image" :src="row.image" fit="cover" />
                <div class="image-fallback" v-else>货</div>
                <div><b>{{ row.title }}</b><span>{{ row.skuLabel || "单规格" }}</span></div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="physicalOnHandStock" label="账面现货" width="110" />
          <el-table-column prop="unpaidReservedUnitCount" label="待付款" width="100" />
          <el-table-column prop="unshippedUnitCount" label="待发货" width="100" />
          <el-table-column prop="availableStock" label="可售" width="100">
            <template #default="{ row }"><strong :class="{ danger: row.lowStock }">{{ row.availableStock }}</strong></template>
          </el-table-column>
          <el-table-column label="预警线" width="120">
            <template #default="{ row }">{{ row.threshold ?? "未启用" }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="row.lowStock ? 'danger' : 'success'" effect="light">{{ row.availableStock === 0 ? "已售罄" : row.lowStock ? "需要补货" : "库存正常" }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" min-width="270" fixed="right">
            <template #default="{ row }">
              <el-button link @click.stop="openStockFile(row)">档案</el-button>
              <el-button link type="primary" @click.stop="openAdjust(row, 'INCREASE')">补货</el-button>
              <el-button link type="warning" @click.stop="openAdjust(row, 'DECREASE')">报损</el-button>
              <el-button link @click.stop="openAdjust(row, 'SET')">盘点</el-button>
              <el-button link @click.stop="openAlert(row)">预警</el-button>
              <el-button link type="success" @click.stop="openPurchase(row)">采购</el-button>
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
          <div v-if="movementFocus" class="movement-focus">
            <span>SKU 档案：{{ stockLabel(movementFocus) }}</span>
            <button @click="clearMovementFocus">查看全部流水</button>
          </div>
        </div>
        <el-table v-loading="loading" :data="visibleMovements" stripe class="data-table">
          <el-table-column label="时间" width="180"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="商品" min-width="240"><template #default="{ row }"><b>{{ row.metadata?.title || "库存变动" }}</b><div class="muted">{{ row.metadata?.skuLabel || "单规格" }}</div></template></el-table-column>
          <el-table-column label="类型" width="130"><template #default="{ row }">{{ movementLabels[row.type] || row.type }}</template></el-table-column>
          <el-table-column label="变化" width="100"><template #default="{ row }"><strong :class="row.quantity > 0 ? 'success' : 'danger'">{{ row.quantity > 0 ? "+" : "" }}{{ row.quantity }}</strong></template></el-table-column>
          <el-table-column label="结存" width="140"><template #default="{ row }">{{ row.beforeStock }} → {{ row.afterStock }}</template></el-table-column>
          <el-table-column prop="reason" label="原因 / 备注" min-width="220" show-overflow-tooltip />
          <template #empty><el-empty :description="movementFocus ? '该规格暂无库存流水' : '暂无库存流水'" /></template>
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
                <b>合格 {{ item.receivedQuantity }}{{ item.rejectedQuantity ? ` · 拒收 ${item.rejectedQuantity}` : "" }} / {{ item.quantity }}</b>
                <el-progress :percentage="receivePercent(item)" :stroke-width="5" :show-text="false" />
              </div>
            </div>
            <footer>
              <el-button v-if="hasReceiptHistory(order)" text type="primary" @click="openReceiptHistory(order)">验收记录</el-button>
              <el-button v-if="order.status === 'DRAFT'" type="primary" @click="submitPurchase(order)">确认下单</el-button>
              <el-button v-if="canReceive(order)" type="success" @click="openReceive(order)">到货验收</el-button>
              <el-button v-if="canCancel(order)" text type="danger" @click="cancelPurchase(order)">取消采购</el-button>
            </footer>
          </article>
          <el-empty v-if="!purchases.length" description="暂无采购单，可从低库存商品直接发起补货" />
        </div>
      </template>
    </section>

    <el-drawer v-model="stockFileVisible" size="min(520px, 94vw)" class="stock-file-drawer" destroy-on-close>
      <template #header>
        <div class="stock-file-heading">
          <p>SKU LEDGER</p>
          <h2>库存档案</h2>
        </div>
      </template>
      <template v-if="stockFile">
        <section class="stock-file-hero">
          <el-image v-if="stockFile.image" :src="stockFile.image" fit="cover" />
          <div v-else class="stock-file-fallback">货</div>
          <div class="stock-file-copy">
            <h3>{{ stockFile.title }}</h3>
            <p>{{ stockFile.skuLabel || "单规格" }}</p>
            <div>
              <el-tag :type="stockFile.lowStock ? 'danger' : 'success'" effect="dark">{{ stockFile.availableStock === 0 ? "已售罄" : stockFile.lowStock ? "需要补货" : "库存正常" }}</el-tag>
              <span>预警线 {{ stockFile.threshold ?? "默认 5" }}</span>
            </div>
          </div>
          <div class="stock-file-balance"><strong>{{ stockFile.availableStock }}</strong><span>当前可售</span></div>
        </section>
        <section class="stock-file-breakdown">
          <div><span>账面现货</span><strong>{{ stockFile.physicalOnHandStock }}</strong></div>
          <div><span>待付款占用</span><strong>{{ stockFile.unpaidReservedUnitCount }}</strong></div>
          <div><span>待发货占用</span><strong>{{ stockFile.unshippedUnitCount }}</strong></div>
        </section>
        <section class="stock-file-actions">
          <button @click="runStockFileAction('alert')"><i>线</i><span>预警设置</span></button>
          <button @click="runStockFileAction('stocktake')"><i>盘</i><span>库存盘点</span></button>
          <button @click="runStockFileAction('damage')"><i>损</i><span>报损出库</span></button>
          <button class="primary" @click="runStockFileAction('purchase')"><i>采</i><span>发起采购</span></button>
        </section>
        <section class="stock-file-ledger">
          <header>
            <div><h3>最近变动</h3><p>来源、原因与操作前后结存均不可覆盖</p></div>
            <button v-if="stockFileMovements.length" @click="openFocusedMovements">完整流水 ›</button>
          </header>
          <div v-loading="stockFileLoading" class="stock-file-list">
            <article v-for="movement in stockFileMovements" :key="movement.id">
              <i :class="{ inbound: movement.quantity > 0 }">{{ movement.quantity > 0 ? "入" : "出" }}</i>
              <div>
                <header><b>{{ movementLabels[movement.type] || movement.type }}</b><time>{{ formatTime(movement.createdAt) }}</time></header>
                <p>{{ movement.reason || "系统自动记录" }}</p>
                <span>结存 {{ movement.beforeStock }} → {{ movement.afterStock }}</span>
              </div>
              <strong :class="movement.quantity > 0 ? 'success' : 'danger'">{{ movement.quantity > 0 ? "+" : "" }}{{ movement.quantity }}</strong>
            </article>
            <el-empty v-if="!stockFileLoading && !stockFileMovements.length" description="暂无该规格的库存变动" :image-size="72" />
          </div>
        </section>
      </template>
    </el-drawer>

    <el-drawer v-model="supplierVisible" title="供应商档案" size="560px" class="supplier-drawer">
      <div class="supplier-toolbar">
        <div>
          <b>稳定供货关系</b>
          <span>联系人、交期、结算约定与历史采购自动沉淀</span>
        </div>
        <el-button type="primary" @click="openSupplierEditor()">新增供应商</el-button>
      </div>
      <el-input v-model="supplierKeyword" clearable placeholder="搜索供应商、联系人或电话" @keyup.enter="loadSuppliers" @clear="loadSuppliers">
        <template #append><el-button @click="loadSuppliers">查询</el-button></template>
      </el-input>
      <div v-loading="supplierLoading" class="supplier-list">
        <article v-for="supplier in suppliers" :key="supplier.id" class="supplier-card" :class="{ inactive: supplier.status === 'INACTIVE' }">
          <header>
            <div><b>{{ supplier.name }}</b><span>{{ supplier.contactName || '未填联系人' }} · {{ supplier.contactPhone || '未填电话' }}</span></div>
            <el-tag :type="supplier.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{ supplier.status === 'ACTIVE' ? '合作中' : '已停用' }}</el-tag>
          </header>
          <div class="supplier-facts">
            <span><small>平均交期</small>{{ supplier.leadTimeDays ? `${supplier.leadTimeDays} 天` : '待完善' }}</span>
            <span><small>采购次数</small>{{ supplier.purchaseCount }} 次</span>
            <span><small>累计采购</small>¥{{ money(supplier.totalPurchaseAmount) }}</span>
          </div>
          <p>{{ supplier.settlementTerms || '未设置结算约定' }}<template v-if="supplier.address"> · {{ supplier.address }}</template></p>
          <footer>
            <el-button text @click="openSupplierEditor(supplier)">编辑档案</el-button>
            <el-button text :type="supplier.status === 'ACTIVE' ? 'danger' : 'success'" @click="toggleSupplier(supplier)">
              {{ supplier.status === 'ACTIVE' ? '停用' : '启用' }}
            </el-button>
            <el-button v-if="supplier.status === 'ACTIVE'" text type="primary" @click="useSupplierForPurchase(supplier)">用它开采购单</el-button>
          </footer>
        </article>
        <el-empty v-if="!supplierLoading && !suppliers.length" description="暂无供应商档案；首次采购时也会自动沉淀" :image-size="76" />
      </div>
    </el-drawer>

    <el-dialog v-model="supplierEditorVisible" :title="supplierForm.id ? '编辑供应商' : '新增供应商'" width="620px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="供应商名称"><el-input v-model="supplierForm.name" maxlength="100" placeholder="必填且店铺内唯一" /></el-form-item>
          <el-form-item label="平均交期"><el-input-number v-model="supplierForm.leadTimeDays" :min="0" :max="365" :precision="0" style="width:100%" /></el-form-item>
          <el-form-item label="联系人"><el-input v-model="supplierForm.contactName" maxlength="40" /></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="supplierForm.contactPhone" maxlength="30" /></el-form-item>
          <el-form-item label="结算约定"><el-input v-model="supplierForm.settlementTerms" maxlength="80" placeholder="例如：月结 30 天、货到付款" /></el-form-item>
          <el-form-item label="联系地址"><el-input v-model="supplierForm.address" maxlength="160" /></el-form-item>
        </div>
        <el-form-item label="合作备注"><el-input v-model="supplierForm.remark" type="textarea" :rows="3" maxlength="300" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button @click="supplierEditorVisible=false">取消</el-button><el-button type="primary" :loading="submitting" @click="saveSupplier">保存档案</el-button></template>
    </el-dialog>

    <el-dialog v-model="adjustVisible" :title="adjustTitle" width="460px">
      <el-form label-position="top">
        <el-form-item label="商品"><el-input :model-value="selectedStockLabel" disabled /></el-form-item>
        <el-form-item :label="adjustMode === 'SET' ? '仓库实物总数' : '本次数量'"><el-input-number v-model="adjustForm.quantity" :min="adjustMode === 'SET' ? 0 : 1" :precision="0" style="width:100%" /></el-form-item>
        <p v-if="adjustMode === 'SET'" class="dialog-tip">请填写现场实际清点总数，包含待付款和待发货订单仍在仓内的商品；系统会自动扣除订单占用，计算可售库存。</p>
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
        <el-form-item label="从供应商档案复用">
          <el-select v-model="purchaseForm.supplierId" clearable filterable placeholder="可选；选择后自动回填联系人和建议交期" style="width:100%" @change="applySupplierToPurchase">
            <el-option v-for="supplier in activeSuppliers" :key="supplier.id" :label="supplier.name" :value="supplier.id">
              <span>{{ supplier.name }}</span>
              <span class="supplier-option">{{ supplier.leadTimeDays ? `${supplier.leadTimeDays} 天交期` : '交期待完善' }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="供应商名称"><el-input v-model="purchaseForm.supplierName" placeholder="必填；新名称会自动沉淀为档案" @input="syncSupplierSelection" /></el-form-item>
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

    <el-dialog v-model="receiveVisible" title="到货质检与分批入库" width="760px">
      <div class="qc-guide">
        <i>验</i>
        <div><b>合格品进入可售库存，拒收品只留质检记录</b><span>提交后生成独立验收批次；未到部分可在下次继续处理，重复提交不会二次入库。</span></div>
        <em>本批 {{ receiveAcceptedTotal + receiveRejectedTotal }} 件</em>
      </div>
      <div v-for="item in receiveForm" :key="item.itemId" class="receive-row">
        <div class="receive-copy"><b>{{ item.label }}</b><span>待验 {{ item.remaining }} 件</span></div>
        <div class="receive-field accepted"><label>合格入库</label><el-input-number v-model="item.quantity" :min="0" :max="item.remaining - item.rejectedQuantity" :precision="0" /></div>
        <div class="receive-field rejected"><label>拒收留痕</label><el-input-number v-model="item.rejectedQuantity" :min="0" :max="item.remaining - item.quantity" :precision="0" /></div>
        <el-input
          v-if="item.rejectedQuantity > 0"
          v-model="item.rejectionReason"
          class="receive-reason"
          maxlength="120"
          show-word-limit
          placeholder="必填：破损、错发、质量不符等拒收原因"
        />
      </div>
      <div class="receive-context">
        <el-input v-model="receiveWarehouseName" maxlength="60" placeholder="验收仓库（选填，例如杭州一号仓）" />
        <el-input v-model="receiveRemark" maxlength="200" placeholder="批次备注（选填，例如外箱已拍照留证）" />
      </div>
      <template #footer>
        <span class="qc-total">合格 {{ receiveAcceptedTotal }} · 拒收 {{ receiveRejectedTotal }}</span>
        <el-button @click="receiveVisible=false">稍后处理</el-button>
        <el-button type="success" :loading="submitting" :disabled="receiveAcceptedTotal + receiveRejectedTotal <= 0" @click="receivePurchase">确认质检批次</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="receiptLogVisible" title="到货质检记录" width="780px" class="receipt-log-dialog">
      <div v-if="receiptLogOrder" class="receipt-log-hero">
        <div><span>{{ receiptLogOrder.orderNo }}</span><b>{{ receiptLogOrder.supplierName }}</b></div>
        <p>独立批次记录合格入库、拒收数量、原因、仓库和操作时间，库存流水可按批次追溯。</p>
      </div>
      <div v-loading="receiptLogLoading" class="receipt-log-list">
        <el-empty v-if="!receiptLogLoading && !receiptLogs.length" description="尚未产生到货质检批次" />
        <article v-for="receipt in receiptLogs" :key="receipt.id" class="receipt-log-card">
          <header>
            <div><b>{{ receipt.receiptNo }}</b><span>{{ formatTime(receipt.receivedAt) }}</span></div>
            <div><strong>合格 {{ receiptTotals(receipt).accepted }}</strong><em :class="{ danger: receiptTotals(receipt).rejected > 0 }">拒收 {{ receiptTotals(receipt).rejected }}</em></div>
          </header>
          <div class="receipt-log-context">
            <span>{{ receipt.warehouseName || "未指定仓库" }}</span>
            <span v-if="receipt.remark">{{ receipt.remark }}</span>
          </div>
          <div class="receipt-log-items">
            <div v-for="item in receipt.items" :key="item.id">
              <span><b>{{ item.productTitle }}</b><small>{{ item.skuLabel || "单规格" }}</small></span>
              <span><strong>合格 {{ item.acceptedQuantity }}</strong><em v-if="item.rejectedQuantity">拒收 {{ item.rejectedQuantity }}</em></span>
              <p v-if="item.rejectionReason">拒收原因：{{ item.rejectionReason }}</p>
            </div>
          </div>
        </article>
      </div>
      <template #footer><el-button @click="receiptLogVisible=false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { merchantBackendApi } from "@/api";

type Stock = { productId:string; skuId:string|null; title:string; image?:string|null; skuLabel?:string|null; stock:number; availableStock:number; physicalOnHandStock:number; unpaidReservedUnitCount:number; unshippedUnitCount:number; threshold:number|null; lowStock:boolean; stockKey:string };
type Movement = { id:string; productId?:string|null; skuId?:string|null; type:string; quantity:number; beforeStock:number; afterStock:number; reason?:string|null; metadata?:{title?:string;skuLabel?:string}|null; createdAt:string };
type PurchaseItem = { id:string; productId:string; skuId?:string|null; productTitle:string; skuLabel?:string|null; quantity:number; receivedQuantity:number; rejectedQuantity:number; unitCost:number|string };
type Purchase = { id:string; orderNo:string; supplierName:string; contactName?:string|null; contactPhone?:string|null; status:string; totalAmount:number|string; expectedAt?:string|null; createdAt:string; items:PurchaseItem[] };
type ReceiptItem = { id:string; productTitle:string; skuLabel?:string|null; acceptedQuantity:number; rejectedQuantity:number; rejectionReason?:string|null };
type Receipt = { id:string; receiptNo:string; warehouseName?:string|null; remark?:string|null; receivedAt:string; items:ReceiptItem[] };
type PurchaseDraftItem = { stockKey:string; productId:string; skuId?:string; quantity:number; unitCost:number };
type Supplier = {
  id:string; name:string; contactName?:string|null; contactPhone?:string|null; address?:string|null;
  settlementTerms?:string|null; leadTimeDays?:number|null; remark?:string|null; status:"ACTIVE"|"INACTIVE";
  purchaseCount:number; totalPurchaseAmount:number|string; lastPurchasedAt?:string|null;
};

const router = useRouter();
const route = useRoute();
const isVisualPreview = import.meta.env.DEV && route.meta.devPreview === true;
const active = ref<"stock"|"movement"|"purchase">("stock");
const loading = ref(false); const submitting = ref(false);
const overview = reactive({
  totalStock:0,
  availableStock:0,
  physicalOnHandStock:0,
  unpaidReservedUnitCount:0,
  unshippedUnitCount:0,
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
const suppliers = ref<Supplier[]>([]);
const keyword = ref(""); const lowOnly = ref(false); const movementType = ref(""); const purchaseStatus = ref("");
const movementFocus = ref<Stock|null>(null);
const stockFileVisible = ref(false); const stockFileLoading = ref(false); const stockFile = ref<Stock|null>(null); const stockFileMovements = ref<Movement[]>([]);
const movementLabels:Record<string,string>={PURCHASE_IN:"采购入库",SALE_OUT:"销售出库",ORDER_CANCEL_RETURN:"取消回补",REFUND_RETURN:"退货入库",ADJUST_IN:"人工调增",ADJUST_OUT:"人工调减",STOCKTAKE_GAIN:"盘盈",STOCKTAKE_LOSS:"盘亏"};
const purchaseLabels:Record<string,string>={DRAFT:"草稿",ORDERED:"待到货",PARTIALLY_RECEIVED:"部分到货",RECEIVED:"已完成",CANCELLED:"已取消"};
const rid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
function dataOf<T>(res:any):T { return (res?.data?.data ?? res?.data ?? res) as T; }
function pageOf<T>(res:any):{items:T[];total:number}{ const data:any=dataOf(res); return {items:Array.isArray(data)?data:(data?.items||data?.list||data?.data||[]),total:Number(data?.total||0)}; }
function formatTime(value:string){ return value ? new Date(value).toLocaleString("zh-CN",{hour12:false}) : "—"; }
function formatDate(value:string){ return value ? new Date(value).toLocaleDateString("zh-CN") : "—"; }
function money(value:number|string){ return Number(value||0).toFixed(2); }
function stockLabel(s:Stock){ return `${s.title}${s.skuLabel ? ` · ${s.skuLabel}` : " · 单规格"}（可售 ${s.availableStock}）`; }
function receivePercent(item:PurchaseItem){ return item.quantity ? Math.round((item.receivedQuantity+(item.rejectedQuantity||0))/item.quantity*100) : 0; }
function purchaseTag(status:string):"success"|"info"|"warning"|""{ return status==="RECEIVED"?"success":status==="CANCELLED"?"info":status==="PARTIALLY_RECEIVED"?"warning":""; }
function canReceive(order:Purchase){ return ["ORDERED","PARTIALLY_RECEIVED"].includes(order.status); }
function canCancel(order:Purchase){ return ["DRAFT","ORDERED"].includes(order.status); }
function hasReceiptHistory(order:Purchase){ return order.items.some((item)=>item.receivedQuantity>0||(item.rejectedQuantity||0)>0); }
function isOverdue(order:Purchase){ return canReceive(order) && Boolean(order.expectedAt) && new Date(order.expectedAt as string).getTime() < Date.now(); }
const taskCount=computed(()=>overview.lowStockCount+overview.overduePurchaseCount+overview.unshippedOrderCount+overview.pendingAfterSaleCount);
const activeSuppliers=computed(()=>suppliers.value.filter((supplier)=>supplier.status==="ACTIVE"));
const visibleMovements=computed(()=>movementFocus.value
  ? movements.value.filter((movement)=>(
      movement.productId===movementFocus.value?.productId
      && (movement.skuId||null)===(movementFocus.value?.skuId||null)
    ))
  : movements.value);

function previewImage(label:string,from:string,to:string){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="320" height="320" rx="36" fill="url(#g)"/><circle cx="160" cy="132" r="74" fill="none" stroke="rgba(255,255,255,.26)" stroke-width="2"/><circle cx="160" cy="132" r="52" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2"/><text x="160" y="151" text-anchor="middle" fill="#fff" font-size="58" font-family="serif">${label}</text><text x="160" y="246" text-anchor="middle" fill="rgba(255,255,255,.72)" font-size="19" letter-spacing="6">热卜严选</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
function loadVisualPreview(){
  Object.assign(overview,{
    totalStock:384,availableStock:384,physicalOnHandStock:412,unpaidReservedUnitCount:11,unshippedUnitCount:17,skuCount:18,lowStockCount:4,outOfStockCount:1,stockHealthRate:78,
    missingAlertCount:2,movementCount:36,pendingPurchaseCount:3,pendingReceiptUnitCount:42,
    overduePurchaseCount:1,unshippedOrderCount:5,pendingAfterSaleCount:2,
  });
  stocks.value=[
    {productId:"preview-ink",skuId:"gift",title:"文房四宝精品套装",image:previewImage("墨","#7d4a2b","#2d211b"),skuLabel:"礼盒装 · 墨色",stock:3,availableStock:3,physicalOnHandStock:9,unpaidReservedUnitCount:2,unshippedUnitCount:4,threshold:8,lowStock:true,stockKey:"preview-ink:gift"},
    {productId:"preview-audio",skuId:"walnut",title:"国学经典诵读机",image:previewImage("听","#b56a37","#61311f"),skuLabel:"胡桃木 · 128G",stock:42,availableStock:42,physicalOnHandStock:48,unpaidReservedUnitCount:1,unshippedUnitCount:5,threshold:10,lowStock:false,stockKey:"preview-audio:walnut"},
    {productId:"preview-tea",skuId:"six",title:"宜兴紫砂品茗套装",image:previewImage("茶","#9c4f36","#4a2723"),skuLabel:"一壶六杯",stock:0,availableStock:0,physicalOnHandStock:3,unpaidReservedUnitCount:1,unshippedUnitCount:2,threshold:5,lowStock:true,stockKey:"preview-tea:six"},
    {productId:"preview-paper",skuId:null,title:"手工半生熟宣纸",image:previewImage("纸","#4c6570","#263d47"),skuLabel:"四尺 · 100 张",stock:86,availableStock:86,physicalOnHandStock:86,unpaidReservedUnitCount:0,unshippedUnitCount:0,threshold:null,lowStock:false,stockKey:"preview-paper:PRODUCT"},
  ];
  movements.value=[
    {id:"move-1",productId:"preview-audio",skuId:"walnut",type:"PURCHASE_IN",quantity:12,beforeStock:30,afterStock:42,reason:"采购单 CG202607280018 首批到货",metadata:{title:"国学经典诵读机",skuLabel:"胡桃木 · 128G"},createdAt:"2026-07-28T09:16:00.000Z"},
    {id:"move-2",productId:"preview-ink",skuId:"gift",type:"SALE_OUT",quantity:-2,beforeStock:5,afterStock:3,reason:"订单批量发货出库",metadata:{title:"文房四宝精品套装",skuLabel:"礼盒装 · 墨色"},createdAt:"2026-07-28T08:48:00.000Z"},
    {id:"move-3",productId:"preview-tea",skuId:"six",type:"STOCKTAKE_LOSS",quantity:-1,beforeStock:1,afterStock:0,reason:"仓库盘点发现杯盖破损",metadata:{title:"宜兴紫砂品茗套装",skuLabel:"一壶六杯"},createdAt:"2026-07-27T16:35:00.000Z"},
    {id:"move-4",productId:"preview-ink",skuId:"gift",type:"REFUND_RETURN",quantity:1,beforeStock:2,afterStock:3,reason:"售后质检合格，重新入库",metadata:{title:"文房四宝精品套装",skuLabel:"礼盒装 · 墨色"},createdAt:"2026-07-27T14:20:00.000Z"},
  ];
  purchases.value=[
    {id:"purchase-1",orderNo:"CG202607280018",supplierName:"临安文房供应社",contactName:"陈掌柜",contactPhone:"138****2608",status:"PARTIALLY_RECEIVED",totalAmount:2466,expectedAt:"2026-07-30T10:00:00.000Z",createdAt:"2026-07-27T10:00:00.000Z",items:[{id:"purchase-item-1",productId:"preview-ink",skuId:"gift",productTitle:"文房四宝精品套装",skuLabel:"礼盒装 · 墨色",quantity:36,receivedQuantity:12,rejectedQuantity:2,unitCost:68.5}]},
    {id:"purchase-2",orderNo:"CG202607260011",supplierName:"宜兴清和陶作",contactName:"周老师",contactPhone:"139****1820",status:"ORDERED",totalAmount:5280,expectedAt:"2026-07-27T10:00:00.000Z",createdAt:"2026-07-26T03:30:00.000Z",items:[{id:"purchase-item-2",productId:"preview-tea",skuId:"six",productTitle:"宜兴紫砂品茗套装",skuLabel:"一壶六杯",quantity:24,receivedQuantity:0,rejectedQuantity:0,unitCost:220}]},
    {id:"purchase-3",orderNo:"CG202607250006",supplierName:"泾县古法纸坊",status:"DRAFT",totalAmount:1560,createdAt:"2026-07-25T05:20:00.000Z",items:[{id:"purchase-item-3",productId:"preview-paper",productTitle:"手工半生熟宣纸",skuLabel:"四尺 · 100 张",quantity:20,receivedQuantity:0,rejectedQuantity:0,unitCost:78}]},
  ];
  suppliers.value=[
    {id:"supplier-1",name:"临安文房供应社",contactName:"陈掌柜",contactPhone:"138****2608",address:"浙江省杭州市临安区",settlementTerms:"月结 30 天",leadTimeDays:3,status:"ACTIVE",purchaseCount:18,totalPurchaseAmount:38620,lastPurchasedAt:"2026-07-27T10:00:00.000Z"},
    {id:"supplier-2",name:"泾县古法纸坊",contactName:"谢师傅",contactPhone:"137****1198",address:"安徽省宣城市泾县",settlementTerms:"货到付款",leadTimeDays:5,status:"ACTIVE",purchaseCount:9,totalPurchaseAmount:17280,lastPurchasedAt:"2026-07-25T05:20:00.000Z"},
    {id:"supplier-3",name:"宜兴清和陶作",contactName:"周老师",contactPhone:"139****1820",address:"江苏省宜兴市丁蜀镇",settlementTerms:"预付 30%，到货结清",leadTimeDays:7,status:"INACTIVE",purchaseCount:6,totalPurchaseAmount:21400,lastPurchasedAt:"2026-07-20T05:20:00.000Z"},
  ];
}

async function loadOverview(){ if(isVisualPreview)return; Object.assign(overview,dataOf(await merchantBackendApi.getInventoryOverview())); }
async function loadStocks(){
  if(isVisualPreview)return;
  loading.value=true;
  try{ const p=pageOf<any>(await merchantBackendApi.listInventoryStocks({page:1,pageSize:100,keyword:keyword.value||undefined,lowStock:lowOnly.value||undefined})); stocks.value=p.items.map((s:any)=>({...s,stockKey:`${s.productId}:${s.skuId||"PRODUCT"}`})); }
  catch(e:any){ stocks.value=[]; ElMessage.error(e?.message||"库存加载失败"); } finally{loading.value=false;}
}
async function loadMovements(){
  if(isVisualPreview)return;
  loading.value=true;
  try{
    movements.value=pageOf<Movement>(await merchantBackendApi.listInventoryMovements({
      page:1,pageSize:100,type:movementType.value||undefined,productId:movementFocus.value?.productId||undefined,
    })).items;
  }catch(e:any){ElMessage.error(e?.message||"流水加载失败");}finally{loading.value=false;}
}
async function loadPurchases(){ if(isVisualPreview)return; loading.value=true; try{ purchases.value=pageOf<Purchase>(await merchantBackendApi.listPurchaseOrders({page:1,pageSize:100,status:purchaseStatus.value||undefined})).items; }catch(e:any){ElMessage.error(e?.message||"采购单加载失败");}finally{loading.value=false;} }
async function loadSuppliers(){
  if(isVisualPreview)return;
  supplierLoading.value=true;
  try{suppliers.value=pageOf<Supplier>(await merchantBackendApi.listSuppliers({page:1,pageSize:100,keyword:supplierKeyword.value||undefined})).items;}
  catch(e:any){ElMessage.error(e?.message||"供应商档案加载失败");}
  finally{supplierLoading.value=false;}
}
async function loadActive(){ await Promise.allSettled([loadOverview(), active.value==="stock"?loadStocks():active.value==="movement"?loadMovements():loadPurchases()]); }
function activate(tab:typeof active.value){ if(tab==="movement")movementFocus.value=null; active.value=tab; loadActive(); }
function showLowStock(){ lowOnly.value=true; activate("stock"); }
function clearMovementFocus(){ movementFocus.value=null; void loadMovements(); }

let stockFileRequestSeq=0;
async function openStockFile(row:Stock){
  const requestSeq=++stockFileRequestSeq;
  stockFile.value=row;
  stockFileMovements.value=[];
  stockFileLoading.value=true;
  stockFileVisible.value=true;
  if(isVisualPreview){
    stockFileMovements.value=movements.value.filter((movement)=>(
      movement.productId===row.productId && (movement.skuId||null)===(row.skuId||null)
    )).slice(0,12);
    stockFileLoading.value=false;
    return;
  }
  try{
    const rows=pageOf<Movement>(await merchantBackendApi.listInventoryMovements({page:1,pageSize:100,productId:row.productId})).items;
    if(requestSeq!==stockFileRequestSeq||!stockFileVisible.value)return;
    stockFileMovements.value=rows.filter((movement)=>(movement.skuId||null)===(row.skuId||null)).slice(0,12);
  }catch(e:any){
    if(requestSeq===stockFileRequestSeq&&stockFileVisible.value)ElMessage.error(e?.message||"库存档案读取失败");
  }finally{
    if(requestSeq===stockFileRequestSeq&&stockFileVisible.value)stockFileLoading.value=false;
  }
}
function openFocusedMovements(){
  if(!stockFile.value)return;
  movementFocus.value=stockFile.value;
  stockFileVisible.value=false;
  active.value="movement";
  void loadMovements();
}
function runStockFileAction(action:"alert"|"stocktake"|"damage"|"purchase"){
  if(!stockFile.value)return;
  const row=stockFile.value;
  stockFileVisible.value=false;
  if(action==="alert")openAlert(row);
  if(action==="stocktake")openAdjust(row,"SET");
  if(action==="damage")openAdjust(row,"DECREASE");
  if(action==="purchase")void openPurchase(row);
}

const adjustVisible=ref(false); const selectedStock=ref<Stock|null>(null); const adjustMode=ref<"INCREASE"|"DECREASE"|"SET">("INCREASE");
const adjustForm=reactive({quantity:1,reason:""});
const adjustTitle=computed(()=>adjustMode.value==="SET"?"库存盘点":adjustMode.value==="DECREASE"?"报损出库":"补充库存");
const selectedStockLabel=computed(()=>selectedStock.value?stockLabel(selectedStock.value):"");
function openAdjust(row:Stock,mode:typeof adjustMode.value){selectedStock.value=row;adjustMode.value=mode;adjustForm.quantity=mode==="SET"?(row.physicalOnHandStock??row.stock):1;adjustForm.reason=mode==="DECREASE"?"破损或损耗":"仓库实物盘点";adjustVisible.value=true;}
async function saveAdjust(){ if(!selectedStock.value||!adjustForm.reason.trim())return ElMessage.warning("请填写库存变动原因"); submitting.value=true; try{await merchantBackendApi.adjustInventory({requestId:rid(),productId:selectedStock.value.productId,skuId:selectedStock.value.skuId||undefined,mode:adjustMode.value,quantity:adjustForm.quantity,reason:adjustForm.reason.trim()});ElMessage.success("库存已更新并记录流水");adjustVisible.value=false;await loadActive();}catch(e:any){ElMessage.error(e?.message||"库存调整失败");}finally{submitting.value=false;} }
const alertVisible=ref(false); const alertThreshold=ref(5);
function openAlert(row:Stock){selectedStock.value=row;alertThreshold.value=row.threshold??5;alertVisible.value=true;}
async function saveAlert(){if(!selectedStock.value)return;submitting.value=true;try{await merchantBackendApi.setInventoryAlert({productId:selectedStock.value.productId,skuId:selectedStock.value.skuId||undefined,lowStockThreshold:alertThreshold.value,enabled:true});ElMessage.success("预警线已保存");alertVisible.value=false;await loadActive();}catch(e:any){ElMessage.error(e?.message||"保存失败");}finally{submitting.value=false;}}

const supplierVisible=ref(false); const supplierEditorVisible=ref(false); const supplierLoading=ref(false); const supplierKeyword=ref("");
const supplierForm=reactive({
  id:"",name:"",contactName:"",contactPhone:"",address:"",settlementTerms:"",leadTimeDays:0,remark:"",
});
async function openSupplierDirectory(){supplierVisible.value=true;await loadSuppliers();}
function openSupplierEditor(supplier?:Supplier){
  Object.assign(supplierForm,{
    id:supplier?.id||"",name:supplier?.name||"",contactName:supplier?.contactName||"",
    contactPhone:supplier?.contactPhone||"",address:supplier?.address||"",
    settlementTerms:supplier?.settlementTerms||"",leadTimeDays:supplier?.leadTimeDays||0,
    remark:supplier?.remark||"",
  });
  supplierEditorVisible.value=true;
}
async function saveSupplier(){
  if(!supplierForm.name.trim())return ElMessage.warning("请填写供应商名称");
  submitting.value=true;
  const payload={
    name:supplierForm.name.trim(),contactName:supplierForm.contactName.trim()||undefined,
    contactPhone:supplierForm.contactPhone.trim()||undefined,address:supplierForm.address.trim()||undefined,
    settlementTerms:supplierForm.settlementTerms.trim()||undefined,
    leadTimeDays:supplierForm.leadTimeDays||undefined,remark:supplierForm.remark.trim()||undefined,
  };
  try{
    if(supplierForm.id)await merchantBackendApi.updateSupplier(supplierForm.id,payload);
    else await merchantBackendApi.createSupplier(payload);
    ElMessage.success("供应商档案已保存");
    supplierEditorVisible.value=false;
    await loadSuppliers();
  }catch(e:any){ElMessage.error(e?.message||"供应商档案保存失败");}
  finally{submitting.value=false;}
}
async function toggleSupplier(supplier:Supplier){
  const next=supplier.status==="ACTIVE"?"INACTIVE":"ACTIVE";
  try{
    if(next==="INACTIVE")await ElMessageBox.confirm("停用后不可再用于新采购单，历史单据仍完整保留。","停用供应商",{type:"warning"});
    await merchantBackendApi.setSupplierStatus(supplier.id,next);
    ElMessage.success(next==="ACTIVE"?"供应商已启用":"供应商已停用");
    await loadSuppliers();
  }catch(e:any){if(e!=="cancel"&&e!=="close")ElMessage.error(e?.message||"状态更新失败");}
}

const purchaseVisible=ref(false);
const purchaseForm=reactive<{supplierId:string;supplierName:string;expectedAt:string;contactName:string;contactPhone:string;remark:string;items:PurchaseDraftItem[]}>({supplierId:"",supplierName:"",expectedAt:"",contactName:"",contactPhone:"",remark:"",items:[]});
const purchaseTotal=computed(()=>purchaseForm.items.reduce((s,i)=>s+Number(i.quantity||0)*Number(i.unitCost||0),0).toFixed(2));
function newPurchaseItem(stock?:Stock):PurchaseDraftItem{return{stockKey:stock?.stockKey||"",productId:stock?.productId||"",skuId:stock?.skuId||undefined,quantity:1,unitCost:0};}
async function openPurchase(stock?:Stock){if(!stocks.value.length)await loadStocks();if(!suppliers.value.length)await loadSuppliers();purchaseForm.supplierId="";purchaseForm.supplierName="";purchaseForm.expectedAt="";purchaseForm.contactName="";purchaseForm.contactPhone="";purchaseForm.remark="";purchaseForm.items=[newPurchaseItem(stock)];purchaseVisible.value=true;}
function applySupplierToPurchase(id:string){
  const supplier=suppliers.value.find((row)=>row.id===id);
  if(!supplier)return;
  purchaseForm.supplierName=supplier.name;purchaseForm.contactName=supplier.contactName||"";purchaseForm.contactPhone=supplier.contactPhone||"";
  if(!purchaseForm.expectedAt&&supplier.leadTimeDays){const date=new Date();date.setDate(date.getDate()+supplier.leadTimeDays);purchaseForm.expectedAt=date.toISOString().slice(0,10);}
}
function syncSupplierSelection(){const selected=suppliers.value.find((row)=>row.id===purchaseForm.supplierId);if(selected&&selected.name!==purchaseForm.supplierName.trim())purchaseForm.supplierId="";}
async function useSupplierForPurchase(supplier:Supplier){supplierVisible.value=false;await openPurchase();purchaseForm.supplierId=supplier.id;applySupplierToPurchase(supplier.id);}
function addPurchaseRow(){purchaseForm.items.push(newPurchaseItem());}
function syncPurchaseItem(item:PurchaseDraftItem){const stock=stocks.value.find(s=>s.stockKey===item.stockKey);if(stock){item.productId=stock.productId;item.skuId=stock.skuId||undefined;}}
async function createPurchase(){ if(!purchaseForm.supplierName.trim())return ElMessage.warning("请填写供应商名称"); const items=purchaseForm.items.filter(i=>i.productId&&i.quantity>0);if(!items.length)return ElMessage.warning("请至少添加一条采购明细");submitting.value=true;try{await merchantBackendApi.createPurchaseOrder({supplierId:purchaseForm.supplierId||undefined,supplierName:purchaseForm.supplierName.trim(),contactName:purchaseForm.contactName||undefined,contactPhone:purchaseForm.contactPhone||undefined,expectedAt:purchaseForm.expectedAt||undefined,remark:purchaseForm.remark||undefined,items:items.map(({productId,skuId,quantity,unitCost})=>({productId,skuId,quantity,unitCost}))});ElMessage.success("采购单草稿已创建");purchaseVisible.value=false;activate("purchase");}catch(e:any){ElMessage.error(e?.message||"采购单创建失败");}finally{submitting.value=false;}}
async function submitPurchase(order:Purchase){try{await merchantBackendApi.submitPurchaseOrder(order.id);ElMessage.success("采购单已确认");await loadActive();}catch(e:any){ElMessage.error(e?.message||"确认失败");}}
async function cancelPurchase(order:Purchase){try{await ElMessageBox.confirm("取消后不可继续收货，确认取消该采购单？","取消采购单",{type:"warning"});await merchantBackendApi.cancelPurchaseOrder(order.id);ElMessage.success("采购单已取消");await loadActive();}catch(e:any){if(e!=="cancel"&&e!=="close")ElMessage.error(e?.message||"取消失败");}}
const receiptLogVisible=ref(false); const receiptLogLoading=ref(false);
const receiptLogOrder=ref<Purchase|null>(null); const receiptLogs=ref<Receipt[]>([]);
function receiptTotals(receipt:Receipt){return receipt.items.reduce((total,item)=>({
  accepted:total.accepted+item.acceptedQuantity,
  rejected:total.rejected+item.rejectedQuantity,
}),{accepted:0,rejected:0});}
async function openReceiptHistory(order:Purchase){
  receiptLogOrder.value=order;
  receiptLogs.value=[];
  receiptLogVisible.value=true;
  if(isVisualPreview){
    receiptLogs.value=[{
      id:"receipt-preview-1",
      receiptNo:"PR202607290018",
      warehouseName:"杭州一号仓",
      remark:"外箱轻微受潮，现场拍照留存",
      receivedAt:"2026-07-29T09:16:00.000Z",
      items:order.items.slice(0,1).map((item)=>({
        id:"receipt-item-preview-1",
        productTitle:item.productTitle,
        skuLabel:item.skuLabel,
        acceptedQuantity:item.receivedQuantity,
        rejectedQuantity:item.rejectedQuantity||0,
        rejectionReason:item.rejectedQuantity?"外包装破损":null,
      })),
    }];
    return;
  }
  receiptLogLoading.value=true;
  try{receiptLogs.value=dataOf<Receipt[]>(await merchantBackendApi.listPurchaseReceipts(order.id));}
  catch(e:any){receiptLogs.value=[];ElMessage.error(e?.message||"验收记录加载失败");}
  finally{receiptLogLoading.value=false;}
}
type ReceiveDraftItem={itemId:string;label:string;remaining:number;quantity:number;rejectedQuantity:number;rejectionReason:string};
const receiveVisible=ref(false); const receiveOrder=ref<Purchase|null>(null); const receiveForm=ref<ReceiveDraftItem[]>([]);
const receiveWarehouseName=ref(""); const receiveRemark=ref("");
const receiveAcceptedTotal=computed(()=>receiveForm.value.reduce((sum,item)=>sum+Number(item.quantity||0),0));
const receiveRejectedTotal=computed(()=>receiveForm.value.reduce((sum,item)=>sum+Number(item.rejectedQuantity||0),0));
function openReceive(order:Purchase){
  receiveOrder.value=order;
  receiveWarehouseName.value="";
  receiveRemark.value="";
  receiveForm.value=order.items.map(i=>({
    itemId:i.id,
    label:`${i.productTitle}${i.skuLabel?` · ${i.skuLabel}`:""}`,
    remaining:i.quantity-i.receivedQuantity-(i.rejectedQuantity||0),
    quantity:0,
    rejectedQuantity:0,
    rejectionReason:"",
  })).filter(i=>i.remaining>0);
  receiveVisible.value=true;
}
async function receivePurchase(){
  if(!receiveOrder.value)return;
  for(const item of receiveForm.value){
    if(item.quantity<0||item.rejectedQuantity<0||item.quantity+item.rejectedQuantity>item.remaining)return ElMessage.warning(`${item.label} 的验收数量超过待验数量`);
    if(item.rejectedQuantity>0&&!item.rejectionReason.trim())return ElMessage.warning(`${item.label} 请填写拒收原因`);
  }
  const items=receiveForm.value
    .filter(i=>i.quantity+i.rejectedQuantity>0)
    .map(i=>({itemId:i.itemId,quantity:i.quantity,rejectedQuantity:i.rejectedQuantity,rejectionReason:i.rejectionReason.trim()||undefined}));
  if(!items.length)return ElMessage.warning("请填写本批合格或拒收数量");
  submitting.value=true;
  try{
    await merchantBackendApi.receivePurchaseOrder(receiveOrder.value.id,{
      requestId:rid(),
      warehouseName:receiveWarehouseName.value.trim()||undefined,
      remark:receiveRemark.value.trim()||undefined,
      items,
    });
    ElMessage.success(receiveRejectedTotal.value?"质检批次已登记":"合格品已入库");
    receiveVisible.value=false;
    await loadActive();
  }catch(e:any){ElMessage.error(e?.message||"质检批次提交失败");}finally{submitting.value=false;}
}

onMounted(async()=>{
  if(isVisualPreview){
    loadVisualPreview();
    return;
  }
  await Promise.allSettled([loadOverview(),loadStocks(),loadSuppliers()]);
});
</script>

<style scoped>
.inventory-page{--red:#c9183d;--ink:#27231f;--green:#285a43;--gold:#a6712e;--paper:#f7f3eb;--line:#e8dfd1;min-height:100%;padding:22px;background:linear-gradient(135deg,#f7f3eb 0,#fff 52%,#f4eee4 100%);color:var(--ink)}
.hero{display:flex;justify-content:space-between;align-items:end;gap:24px;padding:30px 34px;border-radius:22px;color:#fff;background:radial-gradient(circle at 82% 16%,rgba(255,218,150,.34),transparent 23%),linear-gradient(118deg,#1f4435,#32644d 50%,#7b2937);box-shadow:0 18px 40px rgba(38,73,56,.17)}
.eyebrow{margin:0 0 8px;font-size:11px;letter-spacing:.2em;opacity:.72}.eyebrow.dark{color:var(--gold);opacity:1}.hero h1{max-width:760px;margin:0;font-family:"Noto Serif SC","Songti SC",serif;font-size:32px;letter-spacing:.04em}.hero-copy{max-width:850px;margin:10px 0 0;opacity:.82}.hero-actions{display:flex;gap:10px;flex-wrap:wrap}.ghost-btn{color:#fff;border-color:rgba(255,255,255,.45);background:rgba(255,255,255,.08)}.ghost-btn:hover{color:#fff;border-color:#fff;background:rgba(255,255,255,.16)}
.daily-brief{margin:18px 0;padding:22px 24px;border:1px solid #dfc9a9;border-radius:20px;background:radial-gradient(circle at 94% 0,rgba(209,157,75,.16),transparent 28%),linear-gradient(135deg,#fffdfa,#fff9ef);box-shadow:0 10px 30px rgba(72,51,28,.06)}.daily-brief>header{display:flex;align-items:center;justify-content:space-between;gap:20px}.daily-brief h2{margin:0 0 5px;font-family:"Noto Serif SC","Songti SC",serif;font-size:23px}.daily-brief header span{color:#8c8173;font-size:13px}.brief-total{width:88px;height:66px;border-radius:15px;display:grid;place-content:center;text-align:center;color:#fff;background:var(--green)}.brief-total strong{font:700 25px Georgia,serif}.brief-total span{color:rgba(255,255,255,.72)!important;font-size:11px!important}.brief-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.brief-grid button{display:grid;grid-template-columns:42px 1fr 16px;align-items:center;gap:10px;padding:14px;border:1px solid #ede4d7;border-radius:14px;text-align:left;background:rgba(255,255,255,.88);cursor:pointer;transition:border-color .2s,transform .2s,box-shadow .2s}.brief-grid button:hover{transform:translateY(-2px);border-color:#d4b88f;box-shadow:0 8px 18px rgba(77,55,31,.07)}.brief-grid button.urgent{border-color:#e8b5bf;background:#fff7f8}.brief-grid i{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-style:normal;font-weight:700;color:#7d5b35;background:#f1e9dd}.brief-grid .urgent i{color:#fff;background:var(--red)}.brief-grid div{min-width:0}.brief-grid b,.brief-grid span{display:block}.brief-grid span{margin-top:4px;overflow:hidden;color:#8f8578;font-size:12px;white-space:nowrap;text-overflow:ellipsis}.brief-grid em{color:#b5a999;font-size:19px;font-style:normal}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}.metric{position:relative;text-align:left;padding:18px 20px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.9);cursor:pointer;transition:.2s}.metric:hover{transform:translateY(-2px);border-color:#d7b8a3;box-shadow:0 10px 25px rgba(70,50,30,.08)}.metric span,.metric small{display:block;color:#847b70}.metric strong{display:block;margin:8px 0 5px;font-family:Georgia,serif;font-size:30px}.metric.warning strong{color:var(--red)}
.chain,.workspace{border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.93);box-shadow:0 12px 35px rgba(55,40,25,.05)}.chain{padding:20px 24px;margin-bottom:18px}.chain-head{display:flex;align-items:center;justify-content:space-between}.chain-head div{display:flex;gap:12px;align-items:baseline}.chain-head span{color:#8d8275;font-size:13px}.chain-note{letter-spacing:.04em}.chain-track{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.chain-track button{position:relative;display:grid;grid-template-columns:36px 1fr;text-align:left;gap:3px 8px;padding:15px;border:1px solid #ede5d9;border-radius:14px;background:#fbf9f5;cursor:pointer}.chain-track button:not(:last-child)::after{content:"›";position:absolute;right:-9px;top:29px;z-index:2;color:#c3b8a8}.chain-track button.on{border-color:#84aa96;background:#f3faf6}.chain-track i{grid-row:1/3;font-style:normal;color:var(--red);font-family:Georgia,serif}.chain-track span{font-size:12px;color:#8b8175}
.workspace{overflow:hidden}.workspace-head{display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid var(--line)}.tabs{display:flex}.tabs button{padding:18px 20px;border:0;border-bottom:3px solid transparent;background:none;cursor:pointer}.tabs button.on{color:var(--red);border-bottom-color:var(--red);font-weight:700}.filters{display:flex;gap:12px;align-items:center;padding:18px 20px;background:#fcfaf7}.filters .el-input{max-width:340px}.data-table{width:100%}.product-cell{display:flex;gap:12px;align-items:center}.product-cell .el-image,.image-fallback{width:46px;height:46px;border-radius:10px}.image-fallback{display:grid;place-items:center;background:#f2e9df;color:#9d6f52}.product-cell b,.product-cell span{display:block}.product-cell span,.muted{margin-top:4px;font-size:12px;color:#8d8377}.danger{color:#c52b43}.success{color:#21825a}
.stock-table :deep(.el-table__row){cursor:pointer}.movement-focus{min-width:0;flex:1;padding:9px 12px;border:1px solid #cfe0d5;border-radius:10px;background:#f1f7f3;display:flex;align-items:center;justify-content:space-between;gap:12px;color:#506c5c;font-size:12px}.movement-focus span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.movement-focus button{flex:none;border:0;background:none;color:var(--green);font-weight:700;cursor:pointer}
.purchase-list{padding:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;min-height:180px}.purchase-card{border:1px solid var(--line);border-radius:16px;padding:18px;background:#fff}.purchase-card.overdue{border-color:#e2a5b1;background:linear-gradient(135deg,#fff,#fff7f8)}.purchase-card header,.purchase-card footer,.purchase-meta{display:flex;justify-content:space-between;gap:12px;align-items:center}.purchase-card h3{margin:5px 0 0}.order-no{font:12px ui-monospace,SFMono-Regular,monospace;color:#8b8175}.purchase-meta{margin:14px 0 10px;padding:12px 0;border-block:1px dashed #e7ded2;color:#796f64;font-size:13px}.supplier-contact{display:flex;justify-content:space-between;gap:12px;margin-bottom:13px;padding:9px 11px;border-radius:9px;background:#f7f3ed;color:#8b8175;font-size:12px}.supplier-contact b{color:#534c43}.batch-line{display:grid;gap:10px}.batch-line>div{display:grid;grid-template-columns:minmax(0,1fr) 150px 120px;gap:10px;align-items:center}.batch-line b{text-align:right;font-size:12px}.purchase-card footer{justify-content:flex-end;margin-top:16px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.purchase-editor{width:100%;display:flex;flex-direction:column;gap:9px}.purchase-row{display:grid;grid-template-columns:minmax(220px,1fr) 120px 150px 32px;gap:8px}.row-label{order:-1;color:#8b8175;font-size:12px}.purchase-total{margin-right:auto;font-weight:700;color:var(--red)}.qc-guide{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:14px;margin-bottom:15px;padding:15px;border-radius:14px;color:#fff;background:radial-gradient(circle at 90% 0,rgba(238,203,145,.23),transparent 32%),linear-gradient(135deg,#264d3b,#355f4b)}.qc-guide i{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:rgba(255,255,255,.12);font-style:normal;font-weight:700}.qc-guide div{display:flex;flex-direction:column;gap:5px}.qc-guide span{color:rgba(255,255,255,.7);font-size:12px}.qc-guide em{padding:7px 11px;border-radius:999px;background:rgba(255,255,255,.12);font-style:normal;font-size:12px}.receive-row{display:grid;grid-template-columns:minmax(170px,1fr) 145px 145px;align-items:end;gap:12px;padding:14px 0;border-bottom:1px solid #eee7dc}.receive-copy b,.receive-copy span{display:block}.receive-copy span{margin-top:5px;color:#8a8176;font-size:12px}.receive-field{padding:8px 10px;border:1px solid #cfe2d7;border-radius:11px;background:#f1f8f4}.receive-field.rejected{border-color:#ecd0d5;background:#fff6f7}.receive-field label{display:block;margin-bottom:6px;color:#4f7762;font-size:11px}.receive-field.rejected label{color:#a84859}.receive-field :deep(.el-input-number){width:100%}.receive-reason{grid-column:2/-1}.receive-context{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.qc-total{margin-right:auto;color:var(--green);font-weight:700}
.receipt-log-hero{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:16px;padding:18px 20px;border-radius:16px;color:#fff;background:radial-gradient(circle at 90% 10%,rgba(240,206,147,.24),transparent 32%),linear-gradient(135deg,#254b3a,#38634e)}
.receipt-log-hero>div{display:flex;flex-direction:column;gap:6px;min-width:180px}.receipt-log-hero span{color:rgba(255,255,255,.68);font:11px ui-monospace,SFMono-Regular,monospace}.receipt-log-hero b{font:700 18px "Noto Serif SC","Songti SC",serif}.receipt-log-hero p{max-width:470px;margin:0;color:rgba(255,255,255,.74);font-size:12px;line-height:1.7}
.receipt-log-list{max-height:62vh;min-height:190px;overflow:auto;padding:2px 4px 8px}.receipt-log-card{margin-bottom:12px;padding:17px;border:1px solid #e6dccd;border-radius:15px;background:linear-gradient(135deg,#fff,#fcfaf6);box-shadow:0 8px 24px rgba(60,45,28,.055)}
.receipt-log-card>header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:12px;border-bottom:1px dashed #e6ded2}.receipt-log-card>header>div{display:flex;align-items:center;gap:10px}.receipt-log-card>header>div:first-child{align-items:flex-start;flex-direction:column;gap:4px}.receipt-log-card>header b{font:700 14px ui-monospace,SFMono-Regular,monospace}.receipt-log-card>header span{color:#95897a;font-size:11px}.receipt-log-card>header strong,.receipt-log-card>header em{padding:6px 9px;border-radius:999px;font-size:12px;font-style:normal}.receipt-log-card>header strong{color:#24694a;background:#eaf6ef}.receipt-log-card>header em{color:#8c8174;background:#f3eee7}.receipt-log-card>header em.danger{color:#ad3046;background:#fff0f2}
.receipt-log-context{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.receipt-log-context span{padding:5px 8px;border-radius:7px;color:#766c60;background:#f3eee7;font-size:11px}.receipt-log-items{display:grid;gap:8px}.receipt-log-items>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 14px;padding:11px 12px;border-radius:11px;background:#f8f5ef}.receipt-log-items span{display:flex;align-items:center;gap:8px}.receipt-log-items small{color:#94897d}.receipt-log-items em{color:#b2374e;font-style:normal}.receipt-log-items p{grid-column:1/-1;margin:0;padding-top:7px;border-top:1px solid #eadfdf;color:#9d4655;font-size:12px}
.supplier-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px;padding:18px;border-radius:16px;color:#fff;background:radial-gradient(circle at 88% 0,rgba(255,222,163,.28),transparent 30%),linear-gradient(135deg,#244b3a,#7a3040)}.supplier-toolbar>div{display:flex;flex-direction:column;gap:5px}.supplier-toolbar b{font:700 19px "Noto Serif SC","Songti SC",serif}.supplier-toolbar span{font-size:12px;opacity:.72}.supplier-list{display:grid;gap:12px;margin-top:16px}.supplier-card{padding:17px;border:1px solid #e7ddce;border-radius:16px;background:linear-gradient(135deg,#fff,#fbf8f2);box-shadow:0 7px 20px rgba(65,48,29,.045)}.supplier-card.inactive{filter:saturate(.35);opacity:.72}.supplier-card header,.supplier-card footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.supplier-card header>div{min-width:0;display:flex;flex-direction:column;gap:5px}.supplier-card header b{font-size:16px}.supplier-card header span{overflow:hidden;color:#8b8174;font-size:12px;white-space:nowrap;text-overflow:ellipsis}.supplier-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.supplier-facts span{padding:10px;border-radius:10px;background:#f3eee6;font:700 15px Georgia,serif}.supplier-facts small{display:block;margin-bottom:5px;color:#8f8476;font:11px system-ui,sans-serif}.supplier-card p{margin:0;color:#736a60;font-size:12px;line-height:1.6}.supplier-card footer{justify-content:flex-end;margin-top:10px;padding-top:10px;border-top:1px dashed #e9dfd2}.supplier-option{float:right;margin-left:24px;color:#9a8e80;font-size:12px}
.stock-file-heading p{margin:0 0 5px;color:var(--gold);font-size:10px;letter-spacing:.18em}.stock-file-heading h2{margin:0;font-family:"Noto Serif SC","Songti SC",serif}.stock-file-hero{padding:20px;border-radius:18px;background:radial-gradient(circle at 88% 0,rgba(215,172,103,.22),transparent 30%),linear-gradient(135deg,#293f35,#1f3029);color:#fff;display:grid;grid-template-columns:74px minmax(0,1fr) auto;align-items:center;gap:15px;box-shadow:0 14px 30px rgba(31,48,41,.16)}.stock-file-hero .el-image,.stock-file-fallback{width:74px;height:74px;border-radius:14px}.stock-file-fallback{display:grid;place-items:center;background:rgba(255,255,255,.1);color:#e4c38e;font:30px "Songti SC",serif}.stock-file-copy{min-width:0}.stock-file-copy h3{margin:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.stock-file-copy p{margin:6px 0 10px;color:rgba(255,255,255,.62);font-size:12px}.stock-file-copy>div{display:flex;align-items:center;gap:8px}.stock-file-copy>div span{font-size:11px;color:rgba(255,255,255,.65)}.stock-file-balance{padding-left:15px;border-left:1px solid rgba(255,255,255,.15);display:flex;flex-direction:column;align-items:flex-end}.stock-file-balance strong{font:700 36px Georgia,serif;color:#f1ce91}.stock-file-balance span{font-size:11px;color:rgba(255,255,255,.58)}.stock-file-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:14px 0 24px}.stock-file-actions button{padding:12px 5px;border:1px solid #e7ded1;border-radius:12px;background:#fff;display:flex;flex-direction:column;align-items:center;gap:7px;color:#74695c;font-size:12px;cursor:pointer}.stock-file-actions i{width:34px;height:34px;border-radius:10px;background:#f3eee7;display:grid;place-items:center;color:#956c3f;font-style:normal;font-weight:700}.stock-file-actions button.primary{border-color:#ecc5ce;background:#fff3f5;color:#a92542}.stock-file-actions .primary i{background:var(--red);color:#fff}.stock-file-ledger>header{display:flex;align-items:end;justify-content:space-between;gap:12px}.stock-file-ledger h3,.stock-file-ledger p{margin:0}.stock-file-ledger p{margin-top:4px;color:#918679;font-size:12px}.stock-file-ledger>header button{border:0;background:none;color:#966631;cursor:pointer}.stock-file-list{min-height:170px;margin-top:8px}.stock-file-list article{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:11px;padding:15px 0;border-bottom:1px solid #ece4d8}.stock-file-list article>i{width:38px;height:38px;border-radius:11px;background:#fff0ed;color:#b04a38;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700}.stock-file-list article>i.inbound{background:#eaf5ef;color:#246a4a}.stock-file-list article>div{min-width:0}.stock-file-list article header{display:flex;align-items:center;justify-content:space-between;gap:9px}.stock-file-list time{font-size:10px;color:#a09587}.stock-file-list article p{margin-top:7px;color:#665e54;font-size:12px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.stock-file-list article span{display:block;margin-top:5px;color:#948a7e;font-size:11px}.stock-file-list article>strong{font:700 19px Georgia,serif}
.metric.reserve strong{color:#a36f2f}.stock-file-breakdown{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:12px 0 4px}.stock-file-breakdown div{padding:12px;border:1px solid #eadfce;border-radius:12px;background:#faf7f1;display:flex;flex-direction:column;gap:5px}.stock-file-breakdown span{font-size:11px;color:#887c6d}.stock-file-breakdown strong{font:700 22px Georgia,serif;color:#4b4035}
@media(max-width:1100px){.brief-grid{grid-template-columns:repeat(2,1fr)}.metrics{grid-template-columns:repeat(2,1fr)}.chain-track{grid-template-columns:repeat(2,1fr)}.chain-track button::after{display:none}.purchase-list{grid-template-columns:1fr}}
@media(max-width:720px){.receipt-log-hero,.receipt-log-card>header{align-items:flex-start;flex-direction:column}.receipt-log-card>header>div:last-child{flex-wrap:wrap}.receipt-log-items>div{grid-template-columns:1fr}.receipt-log-items p{grid-column:1}}
@media(max-width:720px){.inventory-page{padding:12px}.hero{align-items:flex-start;flex-direction:column;padding:22px}.hero h1{font-size:27px}.daily-brief>header{align-items:flex-start}.brief-grid{grid-template-columns:1fr}.metrics{gap:8px}.metric{padding:14px}.chain-head,.chain-head div{align-items:flex-start;flex-direction:column}.chain-note{display:none}.filters{align-items:stretch;flex-direction:column}.filters .el-input{max-width:none}.movement-focus{width:auto}.purchase-row{grid-template-columns:1fr 88px 110px 28px}.form-grid{grid-template-columns:1fr}.stock-file-hero{grid-template-columns:62px minmax(0,1fr)}.stock-file-hero .el-image,.stock-file-fallback{width:62px;height:62px}.stock-file-balance{grid-column:1/-1;padding:12px 0 0;border-left:0;border-top:1px solid rgba(255,255,255,.15);align-items:flex-start}.stock-file-actions{grid-template-columns:repeat(2,1fr)}}
@media(prefers-reduced-motion:reduce){.metric,.brief-grid button{transition:none}.metric:hover,.brief-grid button:hover{transform:none}}
</style>
