<template>
  <app-safe-area-top />
  <view class="page">
    <view class="nav safe-top" aria-label="库存与履约页面导航">
      <view class="nav-side back" role="button" tabindex="0" aria-label="返回商家工作台" @tap="back" @keydown="activateOnKeyboard($event, back)">‹</view>
      <view class="nav-title">
        <text class="title">库存与履约</text>
        <text class="nav-sub">采购 · 发货 · 售后共用一套库存账</text>
      </view>
      <view class="nav-side refresh" role="button" tabindex="0" aria-label="刷新库存与履约数据" @tap="loadAll" @keydown="activateOnKeyboard($event, loadAll)">刷新</view>
    </view>

    <scroll-view scroll-y class="body" aria-label="库存与履约经营内容">
      <view v-if="overview" class="cockpit" aria-label="库存经营概览">
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
          <view class="sum" role="link" tabindex="0" :aria-label="`账面现货${overview.physicalOnHandStock}件，可售${overview.availableStock}件，查看实时库存`" @tap="showAllStock" @keydown="activateOnKeyboard($event, showAllStock)">
            <text class="num">{{ overview.physicalOnHandStock }}</text>
            <text>账面现货</text>
            <text class="sum-note">可售 {{ overview.availableStock }}</text>
          </view>
          <view class="sum reserve" role="link" tabindex="0" :aria-label="`待付款占用${overview.unpaidReservedUnitCount}件，查看实时库存`" @tap="showAllStock" @keydown="activateOnKeyboard($event, showAllStock)">
            <text class="num">{{ overview.unpaidReservedUnitCount }}</text>
            <text>待付款占用</text>
            <text class="sum-note">超时自动释放</text>
          </view>
          <view class="sum reserve" role="link" tabindex="0" :aria-label="`待发货占用${overview.unshippedUnitCount}件，共${overview.unshippedOrderCount}张订单，进入批量发货`" @tap="go('/pkg-merchant/batch-ship/index')" @keydown="activateOnKeyboard($event, () => go('/pkg-merchant/batch-ship/index'))">
            <text class="num">{{ overview.unshippedUnitCount }}</text>
            <text>待发货占用</text>
            <text class="sum-note">{{ overview.unshippedOrderCount }} 张订单</text>
          </view>
          <view class="sum" role="link" tabindex="0" :aria-label="`在途待收${overview.pendingReceiptUnitCount}件，共${overview.pendingPurchaseCount}张采购单，查看采购到货`" @tap="activate('purchase')" @keydown="activateOnKeyboard($event, () => activate('purchase'))">
            <text class="num">{{ overview.pendingReceiptUnitCount }}</text>
            <text>在途待收</text>
            <text class="sum-note">{{ overview.pendingPurchaseCount }} 张单据</text>
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
          <view class="task" :class="{ urgent: overview.lowStockCount > 0 }" role="link" tabindex="0" :aria-label="overview.lowStockCount ? `${overview.lowStockCount}个规格库存预警，查看待补货商品` : '库存状态良好，查看实时库存'" @tap="showLowStock" @keydown="activateOnKeyboard($event, showLowStock)">
            <text class="task-glyph">补</text>
            <view><text class="task-name">库存预警</text><text class="task-desc">{{ overview.lowStockCount ? `${overview.lowStockCount} 个规格待补货` : '库存状态良好' }}</text></view>
            <text class="task-arrow">›</text>
          </view>
          <view class="task" :class="{ urgent: overview.overduePurchaseCount > 0 }" role="link" tabindex="0" :aria-label="overview.overduePurchaseCount ? `${overview.overduePurchaseCount}张采购单已逾期，查看采购到货` : `${overview.pendingReceiptUnitCount}件待验收，查看采购到货`" @tap="activate('purchase')" @keydown="activateOnKeyboard($event, () => activate('purchase'))">
            <text class="task-glyph">收</text>
            <view><text class="task-name">采购到货</text><text class="task-desc">{{ overview.overduePurchaseCount ? `${overview.overduePurchaseCount} 张已逾期` : `${overview.pendingReceiptUnitCount} 件待验收` }}</text></view>
            <text class="task-arrow">›</text>
          </view>
          <view class="task" :class="{ urgent: overview.unshippedOrderCount > 0 }" role="link" tabindex="0" :aria-label="overview.unshippedOrderCount ? `${overview.unshippedOrderCount}单等待发货，进入批量发货` : '暂无待发订单，进入批量发货'" @tap="go('/pkg-merchant/batch-ship/index')" @keydown="activateOnKeyboard($event, () => go('/pkg-merchant/batch-ship/index'))">
            <text class="task-glyph">发</text>
            <view><text class="task-name">待发订单</text><text class="task-desc">{{ overview.unshippedOrderCount ? `${overview.unshippedOrderCount} 单等待发货` : '暂无待发订单' }}</text></view>
            <text class="task-arrow">›</text>
          </view>
          <view class="task" :class="{ urgent: overview.pendingAfterSaleCount > 0 }" role="link" tabindex="0" :aria-label="overview.pendingAfterSaleCount ? `${overview.pendingAfterSaleCount}件售后等待处理，进入售后回仓` : '暂无售后待办，进入售后回仓'" @tap="go('/pkg-merchant/after-sales/index')" @keydown="activateOnKeyboard($event, () => go('/pkg-merchant/after-sales/index'))">
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
          <view class="life-item" :class="{ active: tab === 'purchase' }" role="link" tabindex="0" aria-label="采购，确认采购约定" @tap="activate('purchase')" @keydown="activateOnKeyboard($event, () => activate('purchase'))">
            <text class="life-no">01</text><text class="life-name">采购</text><text class="life-desc">确认约定</text>
          </view>
          <view class="life-item" :class="{ active: tab === 'stock' }" role="link" tabindex="0" aria-label="入库，验收后记账" @tap="activate('stock')" @keydown="activateOnKeyboard($event, () => activate('stock'))">
            <text class="life-no">02</text><text class="life-name">入库</text><text class="life-desc">验收记账</text>
          </view>
          <view class="life-item" role="link" tabindex="0" aria-label="发货，进入运单履约" @tap="go('/pkg-merchant/batch-ship/index')" @keydown="activateOnKeyboard($event, () => go('/pkg-merchant/batch-ship/index'))">
            <text class="life-no">03</text><text class="life-name">发货</text><text class="life-desc">运单履约</text>
          </view>
          <view class="life-item" role="link" tabindex="0" aria-label="售后，进入质检回仓" @tap="go('/pkg-merchant/after-sales/index')" @keydown="activateOnKeyboard($event, () => go('/pkg-merchant/after-sales/index'))">
            <text class="life-no">04</text><text class="life-name">售后</text><text class="life-desc">质检回仓</text>
          </view>
        </view>
      </view>

      <view class="workspace">
        <view class="tabs" role="tablist" aria-label="库存与履约数据视图">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="tab"
            :class="{ active: tab === t.key }"
            role="tab"
            :aria-selected="tab === t.key"
            :tabindex="tab === t.key ? 0 : -1"
            @tap="activate(t.key)"
            @keydown="onWorkspaceTabKeydown($event, t.key)"
          >
            <text>{{ t.label }}</text>
          </view>
        </view>

        <view v-if="loading" class="state" role="status" aria-live="polite">正在读取真实经营数据…</view>
        <view v-else-if="error && !hasLoadedData" class="state error" role="button" tabindex="0" :aria-label="`${error}，重新加载经营数据`" @tap="loadAll" @keydown="activateOnKeyboard($event, loadAll)">{{ error }}，点击重试</view>
        <view v-else-if="error" class="partial-warning" role="button" tabindex="0" :aria-label="`${error}，重新加载全部经营数据`" @tap="loadAll" @keydown="activateOnKeyboard($event, loadAll)">
          <text>{{ error }}</text>
          <text>重试 ›</text>
        </view>

        <template v-if="!loading && hasLoadedData && tab === 'stock'">
          <view class="filter">
            <input v-model="keyword" aria-label="搜索库存商品或规格" placeholder="搜索商品或规格" @confirm="loadStocks"/>
            <view class="filter-btn" :class="{ on: lowOnly }" role="button" tabindex="0" :aria-pressed="lowOnly" :aria-label="lowOnly ? '取消只看库存预警' : '只看库存预警商品'" @tap="toggleLowOnly" @keydown="activateOnKeyboard($event, toggleLowOnly)">{{ lowOnly ? '查看全部' : '只看预警' }}</view>
          </view>
          <view v-if="overview?.missingAlertCount" class="notice">
            <text>还有 {{ overview.missingAlertCount }} 个规格未单独设置预警线，当前按默认 5 件提醒。</text>
          </view>
          <view
            v-for="item in stocks"
            :key="item.productId + ':' + (item.skuId || '')"
            class="stock-card"
          >
            <view class="stock-main" role="button" tabindex="0" :aria-label="stockItemAriaLabel(item)" @tap="openStockDetail(item)" @keydown="activateOnKeyboard($event, () => openStockDetail(item))">
              <image v-if="item.image" :src="item.image" mode="aspectFill" class="cover"/>
              <view v-else class="cover fallback">货</view>
              <view class="main">
                <text class="name">{{ item.title }}</text>
                <text class="sub">{{ item.skuLabel || '单规格' }}</text>
                <view class="stock-line">
                  <text class="stock-number" :class="{ danger: item.lowStock }">{{ item.availableStock }}</text>
                  <text class="stock-unit">件可售</text>
                  <text class="stock-state" :class="{ danger: item.lowStock }">{{ stockState(item) }}</text>
                </view>
                <view class="stock-reservation">
                  <text>账面 {{ item.physicalOnHandStock }}</text>
                  <text v-if="item.unpaidReservedUnitCount">待付款 {{ item.unpaidReservedUnitCount }}</text>
                  <text v-if="item.unshippedUnitCount">待发货 {{ item.unshippedUnitCount }}</text>
                </view>
              </view>
            </view>
            <view class="card-foot" @tap.stop>
              <view class="threshold" role="button" tabindex="0" :aria-label="`设置${item.title}${item.skuLabel ? `，${item.skuLabel}` : ''}的库存预警线，当前${item.threshold ?? '默认5'}件`" @tap="setThreshold(item)" @keydown="activateOnKeyboard($event, () => setThreshold(item))">预警线 {{ item.threshold ?? '默认 5' }} ›</view>
              <view class="stock-actions">
                <text role="button" tabindex="0" :aria-label="`盘点${item.title}库存`" @tap="adjust(item, 'SET')" @keydown="activateOnKeyboard($event, () => adjust(item, 'SET'))">盘点</text>
                <text role="button" tabindex="0" :aria-label="`登记${item.title}报损出库`" @tap="adjust(item, 'DECREASE')" @keydown="activateOnKeyboard($event, () => adjust(item, 'DECREASE'))">报损</text>
                <text class="primary-action" role="button" tabindex="0" :aria-label="`为${item.title}发起采购`" @tap="createPurchase(item)" @keydown="activateOnKeyboard($event, () => createPurchase(item))">发起采购</text>
              </view>
            </view>
            <view class="stock-file-hint" role="button" tabindex="0" :aria-label="`查看${item.title}库存档案与变动原因`" @tap="openStockDetail(item)" @keydown="activateOnKeyboard($event, () => openStockDetail(item))">查看库存档案与变动原因 <text>›</text></view>
          </view>
          <view v-if="!stocks.length" class="state empty">
            <text class="empty-title">{{ lowOnly ? '当前没有低库存商品' : '暂无库存记录' }}</text>
            <text class="empty-sub">{{ lowOnly ? '库存状态良好，可切换查看全部库存' : '请先在商品管理中创建商品和规格' }}</text>
          </view>
        </template>

        <template v-else-if="!loading && hasLoadedData && tab === 'flow'">
          <view class="flow-intro">流水是库存审计底账，来源、原因、操作前后数量均不可覆盖。</view>
          <view v-if="movementFocus" class="flow-focus">
            <view>
              <text>正在查看 {{ movementFocus.label }}</text>
              <text>仅显示该规格的完整变动记录</text>
            </view>
            <text role="button" tabindex="0" aria-label="清除规格筛选，查看全部库存流水" @tap="clearMovementFocus" @keydown="activateOnKeyboard($event, clearMovementFocus)">查看全部</text>
          </view>
          <view v-for="m in filteredMovements" :key="m.id" class="flow-card">
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
          <view v-if="!filteredMovements.length" class="state empty">
            <text class="empty-title">{{ movementFocus ? '该规格暂无更多库存流水' : '暂无库存流水' }}</text>
            <text v-if="movementFocus" class="empty-sub" role="button" tabindex="0" aria-label="返回查看全部库存流水" @tap="clearMovementFocus" @keydown="activateOnKeyboard($event, clearMovementFocus)">返回查看全部流水</text>
          </view>
        </template>

        <template v-else-if="!loading && hasLoadedData">
          <view class="purchase-tip">采购单记录价格与供应约定；实际库存只在到货验收后增加。支持多批到货，不会提前虚增可售库存。</view>
          <scroll-view scroll-x class="purchase-filters" :show-scrollbar="false">
            <view class="purchase-filter-row" role="tablist" aria-label="采购单状态筛选">
              <view
                v-for="filterItem in purchaseFilters"
                :key="filterItem.key"
                class="purchase-filter"
                :class="{ active: purchaseFilter === filterItem.key }"
                role="tab"
                :aria-selected="purchaseFilter === filterItem.key"
                :tabindex="purchaseFilter === filterItem.key ? 0 : -1"
                @tap="purchaseFilter = filterItem.key"
                @keydown="onPurchaseFilterKeydown($event, filterItem.key)"
              >
                <text>{{ filterItem.label }}</text>
                <text>{{ purchaseFilterCount(filterItem.key) }}</text>
              </view>
            </view>
          </scroll-view>
          <view v-for="p in filteredPurchases" :key="p.id" class="purchase-card" :class="{ overdue: isOverdue(p) }">
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
                <text>合格 {{ it.receivedQuantity }}{{ it.rejectedQuantity ? ` · 拒收 ${it.rejectedQuantity}` : '' }} / {{ it.quantity }}</text>
              </view>
              <view class="progress"><view :style="{ width: `${receivePercent(it)}%` }"/></view>
            </view>
            <view class="purchase-actions">
              <text v-if="hasReceiptHistory(p)" class="history-action" role="button" tabindex="0" :aria-label="`查看采购单${p.orderNo}的验收记录`" @tap="openReceiptHistory(p)" @keydown="activateOnKeyboard($event, () => openReceiptHistory(p))">验收记录</text>
              <text v-if="p.status === 'DRAFT'" class="primary-action" role="button" tabindex="0" :aria-label="`确认采购单${p.orderNo}下单`" @tap="submitPurchase(p)" @keydown="activateOnKeyboard($event, () => submitPurchase(p))">确认下单</text>
              <text v-if="p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED'" class="primary-action receive" role="button" tabindex="0" :aria-label="`登记采购单${p.orderNo}分批验收`" @tap="receiveBatch(p)" @keydown="activateOnKeyboard($event, () => receiveBatch(p))">分批验收</text>
              <text v-if="p.status === 'DRAFT' || p.status === 'ORDERED'" class="muted-action" role="button" tabindex="0" :aria-label="`取消采购单${p.orderNo}`" @tap="cancelPurchase(p)" @keydown="activateOnKeyboard($event, () => cancelPurchase(p))">取消采购</text>
            </view>
          </view>
          <view v-if="!filteredPurchases.length" class="state empty">
            <text class="empty-title">{{ purchases.length ? '当前状态下没有采购单' : '暂无采购单' }}</text>
            <text class="empty-sub">{{ purchases.length ? '可切换其他状态继续查看' : '可从低库存商品直接创建采购草稿' }}</text>
          </view>
        </template>
      </view>
      <view class="bottom-space"/>
    </scroll-view>

    <view v-if="purchaseDraft.open" class="sheet-mask" @tap="closePurchaseSheet" @touchmove.self.prevent>
      <view class="sheet" role="dialog" aria-modal="true" aria-label="新建采购单" tabindex="-1" @tap.stop @touchmove.stop>
        <view class="sheet-handle"/>
        <view class="sheet-head">
          <view>
            <text class="sheet-kicker">采购约定</text>
            <text class="sheet-title">新建采购单</text>
          </view>
          <text class="sheet-close" role="button" tabindex="0" aria-label="关闭新建采购单" @tap="closePurchaseSheet" @keydown="activateOnKeyboard($event, closePurchaseSheet)">×</text>
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
          <view v-if="activeSuppliers.length" class="supplier-presets">
            <view class="preset-head">
              <text>常用供货方</text>
              <text>点选后自动带入联系人</text>
            </view>
            <scroll-view scroll-x class="preset-scroll" :show-scrollbar="false">
              <view class="preset-row">
                <view
                  v-for="supplier in activeSuppliers"
                  :key="supplier.id"
                  class="supplier-chip"
                  :class="{ selected: purchaseDraft.supplierId === supplier.id }"
                  role="button"
                  tabindex="0"
                  :aria-pressed="purchaseDraft.supplierId === supplier.id"
                  :aria-label="`选择供应商${supplier.name}`"
                  @tap="applySupplier(supplier)"
                  @keydown="activateOnKeyboard($event, () => applySupplier(supplier))"
                >
                  <text>{{ supplier.name }}</text>
                  <text>{{ supplier.purchaseCount ? `${supplier.purchaseCount} 次采购` : '新档案' }}</text>
                </view>
              </view>
            </scroll-view>
          </view>
          <view class="field required">
            <text>供应商</text>
            <input v-model="purchaseDraft.supplierName" aria-label="供应商名称，必填" maxlength="100" placeholder="公司或供货方名称" @input="onSupplierNameInput"/>
          </view>
          <view class="field-pair">
            <view class="field"><text>联系人</text><input v-model="purchaseDraft.contactName" aria-label="供应商联系人" maxlength="50" placeholder="选填"/></view>
            <view class="field"><text>联系电话</text><input v-model="purchaseDraft.contactPhone" aria-label="供应商联系电话" maxlength="30" type="number" placeholder="选填"/></view>
          </view>
          <view class="field-pair">
            <view class="field required"><text>采购数量</text><input v-model="purchaseDraft.quantity" aria-label="采购数量，必填" type="number" placeholder="正整数"/></view>
            <view class="field required"><text>采购单价</text><input v-model="purchaseDraft.unitCost" aria-label="采购单价，必填" type="digit" placeholder="0.00"/></view>
          </view>
          <picker mode="date" :value="purchaseDraft.expectedDate" :start="today" @change="onExpectedDateChange">
            <view class="field picker-field">
              <text>预计到货</text>
              <text :class="{ placeholder: !purchaseDraft.expectedDate }">{{ purchaseDraft.expectedDate || '选择日期（选填）' }}</text>
            </view>
          </picker>
          <view class="field textarea-field">
            <text>采购备注</text>
            <textarea v-model="purchaseDraft.remark" aria-label="采购备注" maxlength="500" placeholder="包装、票据、交付批次等约定（选填）"/>
            <text class="count">{{ purchaseDraft.remark.length }}/500</text>
          </view>
          <view class="sheet-assurance">
            <text class="assurance-mark">账</text>
            <text>创建后先保存为草稿；确认下单仍需二次操作。库存只在验收完成后增加。</text>
          </view>
        </scroll-view>
        <view class="sheet-actions safe-bottom">
          <view class="sheet-secondary" role="button" tabindex="0" aria-label="暂不创建采购单" @tap="closePurchaseSheet" @keydown="activateOnKeyboard($event, closePurchaseSheet)">暂不创建</view>
          <view class="sheet-primary" :class="{ disabled: purchaseDraft.submitting }" role="button" :tabindex="purchaseDraft.submitting ? -1 : 0" :aria-disabled="purchaseDraft.submitting" :aria-label="`创建采购草稿，金额${purchaseDraftTotal}元`" @tap="submitPurchaseDraft" @keydown="activateOnKeyboard($event, submitPurchaseDraft)">
            {{ purchaseDraft.submitting ? '正在建单…' : `创建草稿 · ¥${purchaseDraftTotal}` }}
          </view>
        </view>
      </view>
    </view>

    <view v-if="receiptDraft.open" class="sheet-mask" @tap="closeReceiptSheet" @touchmove.self.prevent>
      <view class="sheet receipt-sheet" role="dialog" aria-modal="true" aria-label="登记采购到货验收" tabindex="-1" @tap.stop @touchmove.stop>
        <view class="sheet-handle"/>
        <view class="sheet-head">
          <view>
            <text class="sheet-kicker">实物验收</text>
            <text class="sheet-title">登记本批到货</text>
          </view>
          <text class="sheet-close" role="button" tabindex="0" aria-label="关闭到货验收" @tap="closeReceiptSheet" @keydown="activateOnKeyboard($event, closeReceiptSheet)">×</text>
        </view>
        <view class="receipt-order">
          <text>{{ receiptDraft.order?.orderNo }}</text>
          <text>{{ receiptDraft.order?.supplierName }} · 本批验收 {{ receiptDraftTotal }} 件</text>
        </view>
        <scroll-view scroll-y class="receipt-list">
          <view v-for="item in receiptDraft.order?.items || []" :key="item.id" class="receipt-line">
            <view class="receipt-copy">
              <text>{{ item.productTitle }}</text>
              <text>{{ item.skuLabel || '单规格' }} · 合格 {{ item.receivedQuantity }} · 拒收 {{ item.rejectedQuantity || 0 }} · 待验 {{ Math.max(0, item.quantity - item.receivedQuantity - (item.rejectedQuantity || 0)) }}</text>
            </view>
            <view class="receipt-input-grid">
              <view class="receipt-input accepted">
                <text>合格</text>
                <input
                  v-model="receiptDraft.quantities[item.id]"
                  :aria-label="`${item.productTitle}合格数量`"
                  type="number"
                  :disabled="item.receivedQuantity + (item.rejectedQuantity || 0) >= item.quantity"
                  placeholder="0"
                  placeholder-style="color:#c7bdb0;font-weight:500"
                />
              </view>
              <view class="receipt-input rejected">
                <text>拒收</text>
                <input
                  v-model="receiptDraft.rejectedQuantities[item.id]"
                  :aria-label="`${item.productTitle}拒收数量`"
                  type="number"
                  :disabled="item.receivedQuantity + (item.rejectedQuantity || 0) >= item.quantity"
                  placeholder="0"
                  placeholder-style="color:#c7bdb0;font-weight:500"
                />
              </view>
            </view>
            <input
              v-if="Number(receiptDraft.rejectedQuantities[item.id] || 0) > 0"
              v-model="receiptDraft.reasons[item.id]"
              :aria-label="`${item.productTitle}拒收原因`"
              class="rejection-reason"
              maxlength="120"
              placeholder="填写拒收原因，例如破损、错发、质量不符"
            />
          </view>
          <view class="field-pair receipt-context">
            <view class="field">
              <text>验收仓库</text>
              <input v-model="receiptDraft.warehouseName" aria-label="验收仓库" maxlength="60" placeholder="例如杭州一号仓"/>
            </view>
            <view class="field">
              <text>批次备注</text>
              <input v-model="receiptDraft.remark" aria-label="验收批次备注" maxlength="200" placeholder="包装、凭证或处理说明"/>
            </view>
          </view>
          <view class="sheet-assurance">
            <text class="assurance-mark">验</text>
            <text>合格品才进入可售库存；拒收品只形成质检留痕。每次提交都会生成独立批次，重复点击不会二次入库。</text>
          </view>
        </scroll-view>
        <view class="sheet-actions safe-bottom">
          <view class="sheet-secondary" role="button" tabindex="0" aria-label="稍后验收" @tap="closeReceiptSheet" @keydown="activateOnKeyboard($event, closeReceiptSheet)">稍后验收</view>
          <view class="sheet-primary receive-confirm" :class="{ disabled: receiptDraft.submitting || receiptDraftTotal <= 0 }" role="button" :tabindex="receiptDraft.submitting || receiptDraftTotal <= 0 ? -1 : 0" :aria-disabled="receiptDraft.submitting || receiptDraftTotal <= 0" :aria-label="`确认验收，合格${receiptAcceptedTotal}件，拒收${receiptRejectedTotal}件`" @tap="submitReceipt" @keydown="activateOnKeyboard($event, submitReceipt)">
            {{ receiptDraft.submitting ? '正在提交质检…' : `确认验收 · 合格 ${receiptAcceptedTotal} / 拒收 ${receiptRejectedTotal}` }}
          </view>
        </view>
      </view>
    </view>

    <view v-if="receiptHistory.open" class="sheet-mask" @tap="closeReceiptHistory" @touchmove.self.prevent>
      <view class="sheet receipt-history-sheet" role="dialog" aria-modal="true" aria-label="到货质检记录" tabindex="-1" @tap.stop @touchmove.stop>
        <view class="sheet-handle"/>
        <view class="sheet-head">
          <view>
            <text class="sheet-kicker">RECEIVING LOG</text>
            <text class="sheet-title">到货质检记录</text>
          </view>
          <text class="sheet-close" role="button" tabindex="0" aria-label="关闭到货质检记录" @tap="closeReceiptHistory" @keydown="activateOnKeyboard($event, closeReceiptHistory)">×</text>
        </view>
        <view v-if="receiptHistory.order" class="history-order">
          <view><text>{{ receiptHistory.order.orderNo }}</text><text>{{ receiptHistory.order.supplierName }}</text></view>
          <text>每批合格、拒收与原因永久留痕</text>
        </view>
        <scroll-view scroll-y class="history-list">
          <view v-if="receiptHistory.loading" class="state compact" role="status" aria-live="polite">正在读取验收凭证…</view>
          <view v-else-if="receiptHistory.error" class="state compact error" role="button" tabindex="0" :aria-label="`${receiptHistory.error}，重新读取验收记录`" @tap="reloadReceiptHistory" @keydown="activateOnKeyboard($event, reloadReceiptHistory)">{{ receiptHistory.error }}，点击重试</view>
          <view v-else-if="!receiptHistory.items.length" class="state compact" role="status">尚未产生到货质检批次</view>
          <view v-for="receipt in receiptHistory.items" :key="receipt.id" class="history-batch">
            <view class="history-batch-head">
              <view><text>{{ receipt.receiptNo }}</text><text>{{ formatTime(receipt.receivedAt) }}</text></view>
              <view><text>合格 {{ receiptTotals(receipt).accepted }}</text><text :class="{ danger: receiptTotals(receipt).rejected > 0 }">拒收 {{ receiptTotals(receipt).rejected }}</text></view>
            </view>
            <view class="history-context">
              <text>{{ receipt.warehouseName || '未指定仓库' }}</text>
              <text v-if="receipt.remark">{{ receipt.remark }}</text>
            </view>
            <view v-for="item in receipt.items" :key="item.id" class="history-item">
              <view>
                <text>{{ item.productTitle }}</text>
                <text>{{ item.skuLabel || '单规格' }}</text>
              </view>
              <view>
                <text class="accepted">合格 {{ item.acceptedQuantity }}</text>
                <text v-if="item.rejectedQuantity" class="rejected">拒收 {{ item.rejectedQuantity }}</text>
              </view>
              <text v-if="item.rejectionReason" class="history-reason">原因：{{ item.rejectionReason }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="stockDetail.open" class="sheet-mask" @tap="closeStockDetail" @touchmove.self.prevent>
      <view class="sheet stock-detail-sheet" role="dialog" aria-modal="true" aria-label="库存档案" tabindex="-1" @tap.stop @touchmove.stop>
        <view class="sheet-handle"/>
        <view class="sheet-head">
          <view>
            <text class="sheet-kicker">SKU LEDGER</text>
            <text class="sheet-title">库存档案</text>
          </view>
          <text class="sheet-close" role="button" tabindex="0" aria-label="关闭库存档案" @tap="closeStockDetail" @keydown="activateOnKeyboard($event, closeStockDetail)">×</text>
        </view>
        <view v-if="stockDetail.item" class="stock-file-hero">
          <image v-if="stockDetail.item.image" :src="stockDetail.item.image" mode="aspectFill"/>
          <view v-else class="stock-file-cover">货</view>
          <view class="stock-file-copy">
            <text class="stock-file-title">{{ stockDetail.item.title }}</text>
            <text class="stock-file-spec">{{ stockDetail.item.skuLabel || '单规格' }}</text>
            <view class="stock-file-status">
              <text :class="{ danger: stockDetail.item.lowStock }">{{ stockState(stockDetail.item) }}</text>
              <text>预警线 {{ stockDetail.item.threshold ?? '默认 5' }}</text>
            </view>
          </view>
          <view class="stock-file-balance">
            <text>{{ stockDetail.item.availableStock }}</text>
            <text>当前可售</text>
          </view>
        </view>
        <view v-if="stockDetail.item" class="stock-balance-strip">
          <view><text>账面现货</text><strong>{{ stockDetail.item.physicalOnHandStock }}</strong></view>
          <view><text>待付款占用</text><strong>{{ stockDetail.item.unpaidReservedUnitCount }}</strong></view>
          <view><text>待发货占用</text><strong>{{ stockDetail.item.unshippedUnitCount }}</strong></view>
        </view>
        <view v-if="stockDetail.item" class="stock-file-actions">
          <view role="button" tabindex="0" aria-label="设置库存预警线" @tap="runStockDetailAction('threshold')" @keydown="activateOnKeyboard($event, () => runStockDetailAction('threshold'))"><text>线</text><text>预警设置</text></view>
          <view role="button" tabindex="0" aria-label="盘点库存" @tap="runStockDetailAction('stocktake')" @keydown="activateOnKeyboard($event, () => runStockDetailAction('stocktake'))"><text>盘</text><text>库存盘点</text></view>
          <view role="button" tabindex="0" aria-label="登记报损出库" @tap="runStockDetailAction('damage')" @keydown="activateOnKeyboard($event, () => runStockDetailAction('damage'))"><text>损</text><text>报损出库</text></view>
          <view class="primary" role="button" tabindex="0" aria-label="发起采购" @tap="runStockDetailAction('purchase')" @keydown="activateOnKeyboard($event, () => runStockDetailAction('purchase'))"><text>采</text><text>发起采购</text></view>
        </view>
        <view class="stock-ledger-head">
          <view>
            <text>最近变动</text>
            <text>每笔库存增减均保留原因与结存</text>
          </view>
          <text v-if="stockDetail.movements.length" role="button" tabindex="0" aria-label="查看该规格全部库存流水" @tap="openAllMovements" @keydown="activateOnKeyboard($event, openAllMovements)">全部流水 ›</text>
        </view>
        <scroll-view scroll-y class="stock-ledger-list">
          <view v-if="stockDetail.loading" class="state compact" role="status" aria-live="polite">正在读取库存底账…</view>
          <view v-else-if="stockDetail.error" class="state compact error" role="button" tabindex="0" :aria-label="`${stockDetail.error}，重新读取库存底账`" @tap="reloadStockDetail" @keydown="activateOnKeyboard($event, reloadStockDetail)">{{ stockDetail.error }}，点击重试</view>
          <view v-else-if="!stockDetail.movements.length" class="state compact" role="status">暂无该规格的库存变动</view>
          <template v-else>
            <view v-for="movement in stockDetail.movements" :key="movement.id" class="stock-ledger-row">
              <view class="ledger-direction" :class="{ inbound: movement.quantity > 0 }">{{ movement.quantity > 0 ? '入' : '出' }}</view>
              <view class="ledger-copy">
                <view><text>{{ typeText[movement.type] || movement.type }}</text><text>{{ formatTime(movement.createdAt) }}</text></view>
                <text>{{ movement.reason || '系统自动记录' }}</text>
                <text>结存 {{ movement.beforeStock }} → {{ movement.afterStock }}</text>
              </view>
              <text class="ledger-delta" :class="{ plus: movement.quantity > 0 }">{{ movement.quantity > 0 ? '+' : '' }}{{ movement.quantity }}</text>
            </view>
          </template>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo } from '@/utils/router'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import {
  merchantBackendApi,
  type InventoryOverview,
  type InventoryStockItem,
  type InventoryMovement,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type PurchaseReceipt,
  type MerchantSupplier,
} from '@/pkg-merchant/lib/merchant-data'

type TabKey = 'stock' | 'flow' | 'purchase'
type PurchaseFilterKey = 'ACTIVE' | 'ALL' | PurchaseOrder['status']

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'stock', label: '实时库存' },
  { key: 'flow', label: '库存流水' },
  { key: 'purchase', label: '采购到货' },
]
const tab = ref<TabKey>('stock')
const purchaseFilter = ref<PurchaseFilterKey>('ACTIVE')
const loading = ref(false)
const error = ref('')
const isVisualPreview = ref(false)
const keyword = ref('')
const lowOnly = ref(false)
const overview = ref<InventoryOverview | null>(null)
const stocks = ref<InventoryStockItem[]>([])
const movements = ref<InventoryMovement[]>([])
const movementFocus = ref<{ productId: string; skuId: string | null; label: string } | null>(null)
const purchases = ref<PurchaseOrder[]>([])
const suppliers = ref<MerchantSupplier[]>([])
const today = new Date().toISOString().slice(0, 10)
const purchaseDraft = ref({
  open: false,
  submitting: false,
  item: null as InventoryStockItem | null,
  supplierId: '',
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
  rejectedQuantities: {} as Record<string, string>,
  reasons: {} as Record<string, string>,
  warehouseName: '',
  remark: '',
})
const receiptHistory = ref({
  open: false,
  loading: false,
  error: '',
  order: null as PurchaseOrder | null,
  items: [] as PurchaseReceipt[],
})
const stockDetail = ref({
  open: false,
  loading: false,
  error: '',
  item: null as InventoryStockItem | null,
  movements: [] as InventoryMovement[],
})

const activeOverlayOpen = computed(() =>
  purchaseDraft.value.open
  || receiptDraft.value.open
  || receiptHistory.value.open
  || stockDetail.value.open)
useOverlayScrollLock(() => activeOverlayOpen.value, {
  onEscape: closeActiveOverlay,
  focusContainerSelector: '.sheet[role="dialog"]',
  initialFocusSelector: '.sheet-close',
})
const purchaseFilters: Array<{ key: PurchaseFilterKey; label: string }> = [
  { key: 'ACTIVE', label: '进行中' },
  { key: 'DRAFT', label: '待确认' },
  { key: 'ORDERED', label: '待到货' },
  { key: 'PARTIALLY_RECEIVED', label: '部分到货' },
  { key: 'RECEIVED', label: '已完成' },
  { key: 'CANCELLED', label: '已取消' },
  { key: 'ALL', label: '全部' },
]
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
const hasLoadedData = computed(() => Boolean(
  overview.value
  || stocks.value.length
  || movements.value.length
  || purchases.value.length,
))
const purchaseDraftTotal = computed(() => {
  const quantity = Number(purchaseDraft.value.quantity)
  const unitCost = Number(purchaseDraft.value.unitCost)
  if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return '0.00'
  return Math.max(0, quantity * unitCost).toFixed(2)
})
const receiptAcceptedTotal = computed(() => Object.values(receiptDraft.value.quantities)
  .reduce((sum, value) => sum + (Number(value) || 0), 0))
const receiptRejectedTotal = computed(() => Object.values(receiptDraft.value.rejectedQuantities)
  .reduce((sum, value) => sum + (Number(value) || 0), 0))
const receiptDraftTotal = computed(() => receiptAcceptedTotal.value + receiptRejectedTotal.value)
const filteredPurchases = computed(() => {
  if (purchaseFilter.value === 'ALL') return purchases.value
  if (purchaseFilter.value === 'ACTIVE') {
    return purchases.value.filter((order) => ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(order.status))
  }
  return purchases.value.filter((order) => order.status === purchaseFilter.value)
})
const filteredMovements = computed(() => {
  if (!movementFocus.value) return movements.value
  return movements.value.filter((movement) => (
    movement.productId === movementFocus.value?.productId
    && (movement.skuId || null) === movementFocus.value?.skuId
  ))
})
const activeSuppliers = computed(() => suppliers.value
  .filter((supplier) => supplier.status === 'ACTIVE')
  .slice(0, 8))

const rid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
const formatDate = (value: string) => new Date(value).toLocaleDateString('zh-CN')
const receivePercent = (item: PurchaseOrderItem) => item.quantity
  ? Math.min(100, Math.round((item.receivedQuantity + (item.rejectedQuantity || 0)) / item.quantity * 100))
  : 0
const hasReceiptHistory = (order: PurchaseOrder) => order.items.some((item) => (
  item.receivedQuantity > 0 || (item.rejectedQuantity || 0) > 0
))
const receiptTotals = (receipt: PurchaseReceipt) => receipt.items.reduce((totals, item) => ({
  accepted: totals.accepted + item.acceptedQuantity,
  rejected: totals.rejected + item.rejectedQuantity,
}), { accepted: 0, rejected: 0 })
const isOverdue = (order: PurchaseOrder) => (
  ['ORDERED', 'PARTIALLY_RECEIVED'].includes(order.status)
  && Boolean(order.expectedAt)
  && new Date(order.expectedAt as string).getTime() < Date.now()
)
const stockState = (item: InventoryStockItem) => {
  if (item.availableStock === 0) return '已售罄'
  if (item.lowStock) return '需要补货'
  return '库存正常'
}
const stockIdentity = (item: InventoryStockItem) => `${item.productId}:${item.skuId || 'PRODUCT'}`
const purchaseFilterCount = (key: PurchaseFilterKey) => {
  if (key === 'ALL') return purchases.value.length
  if (key === 'ACTIVE') {
    return purchases.value.filter((order) => ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(order.status)).length
  }
  return purchases.value.filter((order) => order.status === key).length
}

function back() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }
  uni.redirectTo({ url: '/pkg-merchant/dashboard/index' })
}
function go(path: string) {
  navigateTo(path)
}
function activate(next: TabKey) {
  if (next === 'flow') movementFocus.value = null
  tab.value = next
}
function activateOnKeyboard(event: KeyboardEvent, action: () => unknown) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}
function focusIndexedControl(event: KeyboardEvent, index: number) {
  if (typeof HTMLElement === 'undefined') return
  const current = event.currentTarget
  if (!(current instanceof HTMLElement)) return
  const next = current.parentElement?.children.item(index)
  if (next instanceof HTMLElement) next.focus({ preventScroll: true })
}
function onWorkspaceTabKeydown(event: KeyboardEvent, current: TabKey) {
  const currentIndex = tabs.findIndex((item) => item.key === current)
  if (event.key === 'Enter' || event.key === ' ') {
    activateOnKeyboard(event, () => activate(current))
    return
  }
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.length - 1
      : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  activate(tabs[nextIndex].key)
  focusIndexedControl(event, nextIndex)
}
function onPurchaseFilterKeydown(event: KeyboardEvent, current: PurchaseFilterKey) {
  const currentIndex = purchaseFilters.findIndex((item) => item.key === current)
  if (event.key === 'Enter' || event.key === ' ') {
    activateOnKeyboard(event, () => {
      purchaseFilter.value = current
    })
    return
  }
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? purchaseFilters.length - 1
      : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + purchaseFilters.length) % purchaseFilters.length
  purchaseFilter.value = purchaseFilters[nextIndex].key
  focusIndexedControl(event, nextIndex)
}
function stockItemAriaLabel(item: InventoryStockItem) {
  const spec = item.skuLabel ? `，${item.skuLabel}` : ''
  return `${item.title}${spec}，账面现货${item.physicalOnHandStock ?? item.stock}件，可售${item.availableStock}件，${stockState(item)}，查看库存档案`
}
function closeActiveOverlay() {
  if (stockDetail.value.open) {
    closeStockDetail()
    return
  }
  if (receiptHistory.value.open) {
    closeReceiptHistory()
    return
  }
  if (receiptDraft.value.open) {
    closeReceiptSheet()
    return
  }
  if (purchaseDraft.value.open) closePurchaseSheet()
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
  try {
    const result = await merchantBackendApi.getInventoryStocks({
      keyword: keyword.value,
      lowStock: lowOnly.value,
      pageSize: 100,
    })
    stocks.value = result.items || []
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '库存读取失败', icon: 'none' })
  }
}
let stockDetailRequestSeq = 0
async function openStockDetail(item: InventoryStockItem) {
  const requestSeq = ++stockDetailRequestSeq
  stockDetail.value = {
    open: true,
    loading: true,
    error: '',
    item,
    movements: [],
  }
  if (isVisualPreview.value) {
    stockDetail.value.movements = movements.value.filter((movement) => (
      movement.productId === item.productId
      && (movement.skuId || null) === (item.skuId || null)
    )).slice(0, 12)
    stockDetail.value.loading = false
    return
  }
  try {
    const result = await merchantBackendApi.getInventoryMovements({
      productId: item.productId,
      pageSize: 30,
    })
    if (
      requestSeq !== stockDetailRequestSeq
      || !stockDetail.value.open
      || stockIdentity(item) !== stockIdentity(stockDetail.value.item || item)
    ) return
    stockDetail.value.movements = (result.items || []).filter((movement) => (
      (movement.skuId || null) === (item.skuId || null)
    )).slice(0, 12)
  } catch (e) {
    if (requestSeq !== stockDetailRequestSeq || !stockDetail.value.open) return
    stockDetail.value.error = (e as Error)?.message || '库存底账读取失败'
  } finally {
    if (requestSeq === stockDetailRequestSeq && stockDetail.value.open) {
      stockDetail.value.loading = false
    }
  }
}
function closeStockDetail() {
  stockDetailRequestSeq += 1
  stockDetail.value.open = false
}
function reloadStockDetail() {
  if (stockDetail.value.item) void openStockDetail(stockDetail.value.item)
}
function openAllMovements() {
  const item = stockDetail.value.item
  if (item) {
    movementFocus.value = {
      productId: item.productId,
      skuId: item.skuId || null,
      label: `${item.title} · ${item.skuLabel || '单规格'}`,
    }
  }
  closeStockDetail()
  tab.value = 'flow'
}
function clearMovementFocus() {
  movementFocus.value = null
}
async function runStockDetailAction(action: 'threshold' | 'stocktake' | 'damage' | 'purchase') {
  const item = stockDetail.value.item
  if (!item) return
  if (action === 'purchase') {
    closeStockDetail()
    await waitForOverlayExit()
    await createPurchase(item)
    return
  }
  if (action === 'threshold') await setThreshold(item)
  if (action === 'stocktake') await adjust(item, 'SET')
  if (action === 'damage') await adjust(item, 'DECREASE')
  const refreshed = stocks.value.find((row) => stockIdentity(row) === stockIdentity(item))
  if (stockDetail.value.open && refreshed) await openStockDetail(refreshed)
}
async function waitForOverlayExit() {
  // 让上一层弹窗先完整退出，并等待焦点在下一帧回到原触发卡片。
  // 否则两个弹窗在同一渲染周期内直接切换，关闭新弹窗时会丢回 document.body。
  await nextTick()
  if (typeof window === 'undefined') return
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
}
async function loadAll() {
  loading.value = true
  error.value = ''
  const result = await Promise.allSettled([
    merchantBackendApi.getInventoryOverview(),
    merchantBackendApi.getInventoryStocks({ pageSize: 100 }),
    merchantBackendApi.getInventoryMovements({ pageSize: 100 }),
    merchantBackendApi.getPurchaseOrders({ pageSize: 100 }),
    merchantBackendApi.getSuppliers({ pageSize: 100, status: 'ACTIVE' }),
  ])
  if (result[0].status === 'fulfilled') overview.value = result[0].value
  if (result[1].status === 'fulfilled') stocks.value = result[1].value.items || []
  if (result[2].status === 'fulfilled') movements.value = result[2].value.items || []
  if (result[3].status === 'fulfilled') purchases.value = result[3].value.items || []
  if (result[4].status === 'fulfilled') suppliers.value = result[4].value.items || []
  const failed = result.find((item) => item.status === 'rejected') as PromiseRejectedResult | undefined
  if (failed) error.value = failed.reason?.message || '部分数据加载失败'
  loading.value = false
}

function loadVisualPreview() {
  isVisualPreview.value = true
  overview.value = {
    skuCount: 18,
    totalStock: 384,
    availableStock: 384,
    physicalOnHandStock: 412,
    unpaidReservedUnitCount: 11,
    unshippedUnitCount: 17,
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
    availableStock: 3,
    physicalOnHandStock: 9,
    unpaidReservedUnitCount: 2,
    unshippedUnitCount: 4,
    threshold: 8,
    lowStock: true,
  }]
  movements.value = [{
    id: 'preview-movement-1',
    productId: 'preview-product',
    skuId: 'preview-sku',
    type: 'PURCHASE_IN',
    quantity: 12,
    beforeStock: 2,
    afterStock: 14,
    reason: '采购单 CG202607280018 首批验收入库',
    createdAt: '2026-07-28T09:32:00.000Z',
    metadata: { title: '文房四宝精品套装', skuLabel: '礼盒装 · 墨色' },
  }, {
    id: 'preview-movement-2',
    productId: 'preview-product',
    skuId: 'preview-sku',
    type: 'SALE_OUT',
    quantity: -9,
    beforeStock: 14,
    afterStock: 5,
    reason: '商城订单批量发货扣减',
    createdAt: '2026-07-28T11:18:00.000Z',
    metadata: { title: '文房四宝精品套装', skuLabel: '礼盒装 · 墨色' },
  }, {
    id: 'preview-movement-3',
    productId: 'preview-product',
    skuId: 'preview-sku',
    type: 'ADJUST_OUT',
    quantity: -2,
    beforeStock: 5,
    afterStock: 3,
    reason: '仓内巡检发现外盒破损，已报损留痕',
    createdAt: '2026-07-28T14:05:00.000Z',
    metadata: { title: '文房四宝精品套装', skuLabel: '礼盒装 · 墨色' },
  }]
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
      rejectedQuantity: 2,
      unitCost: 68.5,
    }],
  }]
  suppliers.value = [{
    id: 'preview-supplier-1',
    name: '临安文房供应社',
    contactName: '陈掌柜',
    contactPhone: '138****2608',
    address: '浙江省杭州市临安区',
    settlementTerms: '月结 30 天',
    leadTimeDays: 3,
    remark: '礼盒类优先供应商',
    status: 'ACTIVE',
    purchaseCount: 18,
    totalPurchaseAmount: 38620,
    lastPurchasedAt: '2026-07-27T10:00:00.000Z',
    createdAt: '2026-06-18T08:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z',
  }, {
    id: 'preview-supplier-2',
    name: '泾县古法纸坊',
    contactName: '谢师傅',
    contactPhone: '137****1198',
    settlementTerms: '货到付款',
    leadTimeDays: 5,
    status: 'ACTIVE',
    purchaseCount: 9,
    totalPurchaseAmount: 17280,
    lastPurchasedAt: '2026-07-25T05:20:00.000Z',
    createdAt: '2026-06-22T08:00:00.000Z',
    updatedAt: '2026-07-25T05:20:00.000Z',
  }]
  loading.value = false
  error.value = ''
}
async function adjust(item: InventoryStockItem, mode: 'INCREASE' | 'DECREASE' | 'SET') {
  const title = mode === 'SET' ? '盘点库存' : mode === 'DECREASE' ? '报损出库' : '补充库存'
  const placeholder = mode === 'SET'
    ? `输入仓库实物总数（当前账面 ${item.physicalOnHandStock ?? item.stock}）`
    : mode === 'DECREASE' ? '输入损耗或破损数量' : '输入本次增加数量'
  const raw = await prompt(title, placeholder)
  if (raw === null) return
  const quantity = Number(raw)
  if (!Number.isInteger(quantity) || quantity < 0 || (mode !== 'SET' && quantity === 0)) {
    return uni.showToast({ title: '请输入有效的正整数', icon: 'none' })
  }
  try {
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
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '库存更新失败', icon: 'none' })
  }
}
async function setThreshold(item: InventoryStockItem) {
  const raw = await prompt('设置库存预警线', '低于或等于该数量时预警')
  if (raw === null) return
  const threshold = Number(raw)
  if (!Number.isInteger(threshold) || threshold < 0) {
    return uni.showToast({ title: '请输入非负整数', icon: 'none' })
  }
  try {
    await merchantBackendApi.setInventoryAlert({
      productId: item.productId,
      skuId: item.skuId || undefined,
      lowStockThreshold: threshold,
    })
    await loadAll()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '预警线保存失败', icon: 'none' })
  }
}
async function createPurchase(item: InventoryStockItem) {
  purchaseDraft.value = {
    open: true,
    submitting: false,
    item,
    supplierId: '',
    supplierName: '',
    contactName: '',
    contactPhone: '',
    quantity: '',
    unitCost: '',
    expectedDate: '',
    remark: '',
  }
}
function applySupplier(supplier: MerchantSupplier) {
  purchaseDraft.value.supplierId = supplier.id
  purchaseDraft.value.supplierName = supplier.name
  purchaseDraft.value.contactName = supplier.contactName || ''
  purchaseDraft.value.contactPhone = supplier.contactPhone || ''
  if (!purchaseDraft.value.expectedDate && supplier.leadTimeDays) {
    const date = new Date()
    date.setDate(date.getDate() + supplier.leadTimeDays)
    purchaseDraft.value.expectedDate = date.toISOString().slice(0, 10)
  }
}
function onSupplierNameInput() {
  const selected = suppliers.value.find((supplier) => supplier.id === purchaseDraft.value.supplierId)
  if (selected && selected.name !== purchaseDraft.value.supplierName.trim()) {
    purchaseDraft.value.supplierId = ''
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
      supplierId: draft.supplierId || undefined,
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
  try {
    await merchantBackendApi.submitPurchaseOrder(order.id)
    uni.showToast({ title: '采购单已确认', icon: 'success' })
    await loadAll()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '采购单确认失败', icon: 'none' })
  }
}
async function cancelPurchase(order: PurchaseOrder) {
  const confirmed = await new Promise<boolean>((resolve) => uni.showModal({
    title: '取消采购单',
    content: `确定取消 ${order.orderNo}？已产生的库存流水不会被覆盖。`,
    confirmText: '确认取消',
    success: (result) => resolve(result.confirm),
    fail: () => resolve(false),
  }))
  if (!confirmed) return
  try {
    await merchantBackendApi.cancelPurchaseOrder(order.id)
    uni.showToast({ title: '采购单已取消', icon: 'success' })
    await loadAll()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '采购单取消失败', icon: 'none' })
  }
}
async function openReceiptHistory(order: PurchaseOrder) {
  receiptHistory.value = {
    open: true,
    loading: !isVisualPreview.value,
    error: '',
    order,
    items: isVisualPreview.value ? [{
      id: 'receipt-preview-1',
      purchaseOrderId: order.id,
      receiptNo: 'PR202607290018',
      warehouseName: '杭州一号仓',
      operatorId: 'preview',
      remark: '外箱轻微受潮，现场拍照留存',
      receivedAt: '2026-07-29T09:16:00.000Z',
      createdAt: '2026-07-29T09:16:00.000Z',
      items: order.items.slice(0, 1).map((item) => ({
        id: 'receipt-item-preview-1',
        purchaseOrderItemId: item.id,
        productId: item.productId,
        skuId: item.skuId,
        productTitle: item.productTitle,
        skuLabel: item.skuLabel,
        acceptedQuantity: Math.max(0, item.receivedQuantity),
        rejectedQuantity: Math.max(0, item.rejectedQuantity || 0),
        rejectionReason: item.rejectedQuantity ? '外包装破损' : null,
        createdAt: '2026-07-29T09:16:00.000Z',
      })),
    }] : [],
  }
  if (isVisualPreview.value) return
  await reloadReceiptHistory()
}
async function reloadReceiptHistory() {
  const order = receiptHistory.value.order
  if (!order) return
  receiptHistory.value.loading = true
  receiptHistory.value.error = ''
  try {
    receiptHistory.value.items = await merchantBackendApi.getPurchaseReceipts(order.id)
  } catch (e) {
    receiptHistory.value.error = (e as Error)?.message || '验收记录加载失败'
  } finally {
    receiptHistory.value.loading = false
  }
}
function closeReceiptHistory() {
  receiptHistory.value.open = false
}
async function receiveBatch(order: PurchaseOrder) {
  const quantities: Record<string, string> = {}
  const rejectedQuantities: Record<string, string> = {}
  const reasons: Record<string, string> = {}
  order.items.forEach((item) => {
    if (item.receivedQuantity + (item.rejectedQuantity || 0) < item.quantity) {
      quantities[item.id] = ''
      rejectedQuantities[item.id] = ''
      reasons[item.id] = ''
    }
  })
  receiptDraft.value = {
    open: true,
    submitting: false,
    order,
    quantities,
    rejectedQuantities,
    reasons,
    warehouseName: '',
    remark: '',
  }
}
function closeReceiptSheet() {
  if (receiptDraft.value.submitting) return
  receiptDraft.value.open = false
}
async function submitReceipt() {
  const draft = receiptDraft.value
  if (draft.submitting || !draft.order) return
  const items: Array<{ itemId: string; quantity: number; rejectedQuantity: number; rejectionReason?: string }> = []
  for (const item of draft.order.items) {
    const remaining = item.quantity - item.receivedQuantity - (item.rejectedQuantity || 0)
    if (remaining <= 0) continue
    const quantity = Number(draft.quantities[item.id] || '0')
    const rejectedQuantity = Number(draft.rejectedQuantities[item.id] || '0')
    if (!Number.isInteger(quantity) || !Number.isInteger(rejectedQuantity)
      || quantity < 0 || rejectedQuantity < 0 || quantity + rejectedQuantity > remaining) {
      return uni.showToast({ title: `${item.productTitle} 合格与拒收合计应为 0-${remaining}`, icon: 'none' })
    }
    const rejectionReason = draft.reasons[item.id]?.trim()
    if (rejectedQuantity > 0 && !rejectionReason) {
      return uni.showToast({ title: `${item.productTitle} 请填写拒收原因`, icon: 'none' })
    }
    if (quantity + rejectedQuantity > 0) {
      items.push({ itemId: item.id, quantity, rejectedQuantity, rejectionReason: rejectionReason || undefined })
    }
  }
  if (!items.length) return uni.showToast({ title: '本批没有填写验收数量', icon: 'none' })
  draft.submitting = true
  try {
    await merchantBackendApi.receivePurchaseOrder(draft.order.id, {
      requestId: rid(),
      warehouseName: draft.warehouseName.trim() || undefined,
      remark: draft.remark.trim() || undefined,
      items,
    })
    draft.open = false
    uni.showToast({ title: receiptRejectedTotal.value ? '质检批次已登记' : '合格品已入库', icon: 'success' })
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
.nav{height:104rpx;padding:0 24rpx;display:flex;align-items:center;background:rgba(255,255,255,.97);position:sticky;top:var(--status-bar-height,0px);z-index:8;border-bottom:1rpx solid #eee5d8;box-sizing:border-box}.nav-side{width:96rpx;flex:none}.back{font-size:54rpx;line-height:1}.refresh{text-align:right;color:#8a5b28;font-size:25rpx}.nav-title{flex:1;min-width:0;text-align:center;display:flex;flex-direction:column}.title{font-size:32rpx;font-weight:750}.nav-sub{margin-top:3rpx;font-size:18rpx;color:#9a9083}.body{height:calc(100vh - 104rpx)}
.cockpit{margin:22rpx 22rpx 16rpx;padding:26rpx;border:1rpx solid #dfc69f;border-radius:28rpx;background:radial-gradient(circle at 88% 0,rgba(213,165,87,.18),transparent 31%),linear-gradient(135deg,#fffdfa,#fff8ed);box-shadow:0 12rpx 30rpx rgba(80,55,28,.07)}.cockpit-head{display:flex;justify-content:space-between;align-items:center}.cockpit-head>view:first-child{display:flex;flex-direction:column;min-width:0}.eyebrow{font-size:19rpx;color:var(--gold);letter-spacing:.18em}.cockpit-title{margin-top:8rpx;font-size:29rpx;font-weight:720}.health{width:132rpx;height:104rpx;border-radius:22rpx;background:#283f35;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 8rpx 18rpx rgba(36,74,56,.18)}.health-value{font:700 34rpx Georgia,serif}.health-label{margin-top:3rpx;font-size:18rpx;opacity:.72}.health-track{height:8rpx;margin-top:22rpx;background:#eee3d2;border-radius:999rpx;overflow:hidden}.health-bar{height:100%;min-width:4rpx;border-radius:inherit;background:linear-gradient(90deg,#c9193f,#d39a43,#31825a);transition:width .35s ease}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10rpx;margin-top:20rpx}.sum{min-width:0;padding:15rpx 6rpx;text-align:center;border-right:1rpx solid #eee1cf;display:flex;flex-direction:column;color:#756b5e;font-size:20rpx}.sum:last-child{border-right:0}.sum .num{font:700 34rpx Georgia,serif;color:#2d493c;margin-bottom:5rpx}.sum.warn .num{color:var(--red)}.sum-note{margin-top:5rpx;font-size:17rpx;color:#a19688;white-space:nowrap}
.task-panel,.lifecycle,.workspace{margin:0 22rpx 16rpx;border:1rpx solid var(--line);border-radius:26rpx;background:#fff;box-shadow:0 8rpx 24rpx rgba(61,45,28,.045)}.task-panel{padding:24rpx}.section-head,.life-head,.row-between,.purchase-head,.purchase-meta{display:flex;align-items:center;justify-content:space-between;gap:14rpx}.section-head>view,.life-head>view{display:flex;flex-direction:column}.section-title{font-size:29rpx;font-weight:750}.section-sub{margin-top:5rpx;font-size:20rpx;color:#978c7d}.task-total,.life-mark{padding:7rpx 13rpx;border-radius:999rpx;background:#f5eee4;color:#8f693d;font-size:19rpx}.task-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12rpx;margin-top:20rpx}.task{min-width:0;display:grid;grid-template-columns:50rpx minmax(0,1fr) 20rpx;align-items:center;gap:10rpx;padding:18rpx 14rpx;border:1rpx solid #eee6db;border-radius:18rpx;background:#fbfaf7}.task.urgent{background:#fff6f7;border-color:#efc4cd}.task-glyph{width:48rpx;height:48rpx;border-radius:14rpx;display:flex;align-items:center;justify-content:center;background:#eee6db;color:#765a3c;font-weight:750}.task.urgent .task-glyph{background:var(--red);color:#fff}.task>view{min-width:0;display:flex;flex-direction:column}.task-name{font-size:23rpx;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.task-desc{margin-top:4rpx;font-size:18rpx;color:#94897b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.task-arrow{color:#b2a797}
.lifecycle{padding:23rpx}.life-rail{position:relative;display:grid;grid-template-columns:repeat(4,1fr);margin-top:23rpx}.rail-line{position:absolute;left:11%;right:11%;top:23rpx;height:2rpx;background:#e2d4c1}.rail-pulse{position:absolute;top:17rpx;left:10%;width:14rpx;height:14rpx;border-radius:50%;background:var(--red);box-shadow:0 0 0 8rpx rgba(201,25,63,.1);animation:railMove 4.8s ease-in-out infinite}.life-item{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center}.life-no{width:46rpx;height:46rpx;border-radius:50%;background:#f3ece2;border:5rpx solid #fff;box-shadow:0 0 0 1rpx #e7d9c6;display:flex;align-items:center;justify-content:center;font:19rpx Georgia,serif;color:#9b7650}.life-item.active .life-no{background:#2c5140;color:#fff;box-shadow:0 0 0 1rpx #2c5140}.life-name{margin-top:10rpx;font-size:23rpx;font-weight:700}.life-desc{margin-top:3rpx;font-size:17rpx;color:#9b9083}
.workspace{overflow:hidden}.tabs{padding:8rpx;background:#eee6da;display:flex}.tab{flex:1;text-align:center;padding:18rpx 8rpx;color:#74695b;font-size:24rpx}.tab.active{background:#fff;border-radius:16rpx;color:var(--red);font-weight:750;box-shadow:0 4rpx 12rpx rgba(62,44,24,.06)}.filter{display:flex;padding:20rpx;gap:12rpx}.filter input{flex:1;height:72rpx;padding:0 22rpx;border-radius:14rpx;background:#f6f3ee;font-size:24rpx}.filter-btn{padding:19rpx 20rpx;border-radius:14rpx;background:#2e5a47;color:#fff;font-size:22rpx}.filter-btn.on{background:#9a6637}.notice,.flow-intro,.purchase-tip{margin:0 20rpx 16rpx;padding:18rpx 20rpx;border-radius:14rpx;background:#fff6e5;color:#876437;font-size:21rpx;line-height:1.55}.flow-intro{background:#eef5f0;color:#52705f}.purchase-tip{background:#f6f1e9;color:#786b5c}
.stock-card,.flow-card,.purchase-card{margin:0 20rpx 16rpx;padding:20rpx;border:1rpx solid #ece3d7;border-radius:20rpx;background:#fff;box-shadow:0 5rpx 16rpx rgba(64,48,30,.04)}.stock-main{display:flex;gap:18rpx}.cover{width:104rpx;height:104rpx;border-radius:16rpx;background:#eee;flex:none}.fallback{display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#e9dfd2,#f8f4ed);color:#9a7146;font-family:"Songti SC",serif;font-size:34rpx}.main{flex:1;min-width:0;display:flex;flex-direction:column}.name{font-size:27rpx;font-weight:720}.sub{margin-top:6rpx;font-size:21rpx;color:#8e8375}.stock-line{display:flex;align-items:baseline;margin-top:auto}.stock-number{font:700 38rpx Georgia,serif;color:#2d654b}.stock-number.danger,.stock-state.danger{color:var(--red)}.stock-unit{margin-left:5rpx;font-size:19rpx;color:#8b8174}.stock-state{margin-left:auto;font-size:20rpx;color:#33805d}.card-foot{margin-top:17rpx;padding-top:15rpx;border-top:1rpx dashed #e9dfd2;display:flex;align-items:center;justify-content:space-between;gap:12rpx}.threshold{font-size:20rpx;color:#897b6a}.stock-actions,.purchase-actions{display:flex;align-items:center;gap:9rpx}.stock-actions text,.purchase-actions text{padding:10rpx 13rpx;border-radius:11rpx;background:#f4f0e9;color:#6d6255;font-size:20rpx}.stock-actions .primary-action,.purchase-actions .primary-action{background:var(--red);color:#fff}
.sum.reserve .num{color:#a56e2e}.stock-reservation{display:flex;flex-wrap:wrap;gap:8rpx;margin-top:8rpx}.stock-reservation text{padding:4rpx 8rpx;border-radius:7rpx;background:#f6f1e8;color:#766a5a;font-size:17rpx}.stock-reservation text:not(:first-child){background:#fff4e5;color:#9a632b}.stock-balance-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin:14rpx 0 20rpx}.stock-balance-strip view{padding:14rpx 10rpx;border:1rpx solid #eadfce;border-radius:14rpx;background:#faf7f1;display:flex;flex-direction:column;gap:5rpx}.stock-balance-strip text{font-size:18rpx;color:#8d8172}.stock-balance-strip strong{font:700 28rpx Georgia,serif;color:#493f34}
.stock-file-hint{margin-top:13rpx;padding-top:12rpx;border-top:1rpx solid #f1ebe2;color:#9a8d7d;font-size:19rpx;display:flex;justify-content:space-between}.stock-file-hint text{color:var(--gold);font-size:25rpx}
.flow-focus{margin:0 20rpx 16rpx;padding:16rpx 18rpx;border:1rpx solid #cfe0d5;border-radius:16rpx;background:linear-gradient(135deg,#f0f7f3,#fafcf9);display:flex;align-items:center;justify-content:space-between;gap:14rpx}.flow-focus>view{min-width:0;display:flex;flex-direction:column;gap:4rpx}.flow-focus>view text:first-child{font-size:22rpx;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.flow-focus>view text:last-child{font-size:18rpx;color:#7d8d83}.flow-focus>text{flex:none;padding:8rpx 13rpx;border-radius:999rpx;background:#2d704f;color:#fff;font-size:18rpx}
.flow-card{display:flex;gap:15rpx;align-items:flex-start}.flow-mark{width:50rpx;height:50rpx;flex:none;border-radius:15rpx;display:flex;align-items:center;justify-content:center;background:#fff0ed;color:#b04a38;font-weight:750}.flow-mark.inbound{background:var(--green-soft);color:var(--green)}.flow-time{font-size:18rpx;color:#a2988c}.flow-reason{margin-top:12rpx;font-size:22rpx;color:#5f574c}.balance{margin-top:7rpx;font-size:19rpx;color:#978d80}.delta{flex:none;font:700 30rpx Georgia,serif;color:#b64d3e}.delta.plus{color:#2e8056}
.purchase-card.overdue{border-color:#e6a8b4;background:linear-gradient(135deg,#fff,#fff7f8)}.purchase-head>view{display:flex;flex-direction:column}.order-no{font:18rpx ui-monospace,SFMono-Regular,monospace;color:#9a8d7d}.purchase-head .name{margin-top:5rpx}.status{padding:8rpx 13rpx;border-radius:999rpx;background:#f5eee3;color:#875f33;font-size:19rpx}.overdue .status{background:var(--red);color:#fff}.purchase-meta{margin:16rpx 0;padding:14rpx 0;border-block:1rpx dashed #e8ded0;color:#7f7365;font-size:20rpx}.purchase-line{padding:8rpx 0;font-size:21rpx}.progress{height:7rpx;margin-top:9rpx;border-radius:99rpx;background:#eee7dc;overflow:hidden}.progress>view{height:100%;border-radius:inherit;background:linear-gradient(90deg,#b68a4d,#2f7857)}.purchase-actions{justify-content:flex-end;margin-top:15rpx}.purchase-actions .receive{background:#2d704f}.purchase-actions .muted-action{background:#f3eee8;color:#887767}.purchase-actions .history-action{margin-right:auto;background:#eef5f0;color:#2d704f}
.supplier-note{margin:-4rpx 0 12rpx;padding:14rpx 16rpx;border-radius:12rpx;background:#f8f4ed;display:flex;flex-direction:column;gap:6rpx;color:#776c5d;font-size:19rpx;line-height:1.45}
.purchase-filters{width:100%;white-space:nowrap;margin:0 0 16rpx}.purchase-filter-row{display:inline-flex;gap:10rpx;padding:0 20rpx}.purchase-filter{height:56rpx;flex:none;padding:0 18rpx;border:1rpx solid #e8dfd3;border-radius:999rpx;background:#faf8f4;color:#7d7265;display:flex;align-items:center;gap:8rpx;font-size:20rpx;white-space:nowrap}.purchase-filter text{white-space:nowrap}.purchase-filter text:last-child{min-width:28rpx;height:28rpx;padding:0 5rpx;border-radius:999rpx;background:#eee7dc;display:flex;align-items:center;justify-content:center;font:17rpx Georgia,serif}.purchase-filter.active{border-color:#2d704f;background:#2d704f;color:#fff}.purchase-filter.active text:last-child{background:rgba(255,255,255,.18)}
.state{text-align:center;padding:82rpx 28rpx;color:#887e70}.state.error{color:#b54b3b}.state.empty text{display:block}.empty-title{font-size:26rpx;color:#655d52}.empty-sub{margin-top:12rpx;font-size:21rpx;color:#a09688}.partial-warning{margin:16rpx 20rpx 0;padding:14rpx 18rpx;border:1rpx solid #efd5a5;border-radius:14rpx;background:#fff8e9;color:#896832;font-size:20rpx;display:flex;align-items:center;justify-content:space-between;gap:16rpx}.bottom-space{height:calc(110rpx + env(safe-area-inset-bottom))}
.sheet-mask{position:fixed;inset:0;z-index:30;background:rgba(26,22,17,.48);display:flex;align-items:flex-end;backdrop-filter:blur(5px)}.sheet{width:100%;max-height:88vh;border-radius:32rpx 32rpx 0 0;background:#fbf8f2;box-shadow:0 -18rpx 50rpx rgba(28,20,12,.18);overflow:hidden;display:flex;flex-direction:column}.sheet-handle{width:70rpx;height:7rpx;margin:14rpx auto 2rpx;border-radius:99rpx;background:#d6cabc}.sheet-head{padding:17rpx 26rpx 18rpx;display:flex;align-items:center;justify-content:space-between;border-bottom:1rpx solid #e9dfd2}.sheet-head>view{display:flex;flex-direction:column}.sheet-kicker{font-size:18rpx;color:var(--gold);letter-spacing:.16em}.sheet-title{margin-top:4rpx;font-size:31rpx;font-weight:760}.sheet-close{width:58rpx;height:58rpx;border-radius:50%;background:#eee7dc;display:flex;align-items:center;justify-content:center;color:#776b5c;font-size:36rpx}.goods-brief{margin:18rpx 24rpx 0;padding:16rpx;border-radius:18rpx;background:#fff;display:flex;align-items:center;gap:16rpx;border:1rpx solid #ece1d3}.goods-brief image,.brief-fallback{width:76rpx;height:76rpx;border-radius:13rpx;flex:none}.brief-fallback{display:flex;align-items:center;justify-content:center;background:#efe6da;color:#966b3e}.goods-brief>view:last-child{min-width:0;display:flex;flex-direction:column;gap:6rpx}.goods-brief text:first-child{font-size:25rpx;font-weight:700}.goods-brief text:last-child{font-size:19rpx;color:#8e8375}.sheet-form{max-height:54vh;padding:16rpx 24rpx 10rpx;box-sizing:border-box}.field-pair{display:grid;grid-template-columns:1fr 1fr;gap:12rpx}.field{position:relative;margin-bottom:13rpx;padding:14rpx 16rpx;border:1rpx solid #e7ddd0;border-radius:15rpx;background:#fff;display:flex;flex-direction:column;gap:9rpx}.field>text:first-child{font-size:19rpx;color:#84786a}.field.required>text:first-child::after{content:" *";color:var(--red)}.field input{height:42rpx;font-size:24rpx;color:var(--ink)}.picker-field>text:last-child{min-height:42rpx;font-size:24rpx}.picker-field .placeholder{color:#a89d90}.textarea-field textarea{width:100%;height:96rpx;font-size:23rpx;line-height:1.5}.count{position:absolute;right:14rpx;bottom:10rpx;font-size:17rpx;color:#aaa094}.sheet-assurance{margin:4rpx 0 14rpx;padding:15rpx;border-radius:14rpx;background:#eef5f0;color:#587060;display:flex;align-items:center;gap:12rpx;font-size:19rpx;line-height:1.45}.assurance-mark{width:40rpx;height:40rpx;flex:none;border-radius:12rpx;background:#2d704f;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:750}.sheet-actions{padding:16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));background:#fff;display:grid;grid-template-columns:.72fr 1.28fr;gap:12rpx;border-top:1rpx solid #eee5d9}.sheet-secondary,.sheet-primary{height:82rpx;border-radius:17rpx;display:flex;align-items:center;justify-content:center;font-size:24rpx;font-weight:700}.sheet-secondary{background:#f2ede6;color:#74695c}.sheet-primary{background:var(--red);color:#fff;box-shadow:0 8rpx 20rpx rgba(201,25,63,.2)}.sheet-primary.disabled{opacity:.48}.receipt-sheet{max-height:82vh}.receipt-order{margin:17rpx 24rpx 0;padding:17rpx 19rpx;border-radius:16rpx;background:#2d493c;color:#fff;display:flex;justify-content:space-between;gap:16rpx;font-size:20rpx}.receipt-order text:last-child{opacity:.75}.receipt-list{max-height:50vh;padding:16rpx 24rpx;box-sizing:border-box}.receipt-line{padding:17rpx;margin-bottom:11rpx;border:1rpx solid #e8dfd3;border-radius:16rpx;background:#fff;display:flex;flex-direction:column;gap:14rpx}.receipt-copy{min-width:0;display:flex;flex-direction:column;gap:6rpx}.receipt-copy text:first-child{font-size:24rpx;font-weight:700}.receipt-copy text:last-child{font-size:19rpx;color:#8d8173}.receipt-input-grid{display:grid;grid-template-columns:1fr 1fr;gap:10rpx}.receipt-input{height:66rpx;padding:0 14rpx;border-radius:13rpx;background:#edf6f1;border:1rpx solid #cfe3d8;display:flex;align-items:center;justify-content:space-between;gap:6rpx;color:#387055;font-size:19rpx}.receipt-input.rejected{background:#fff2f3;border-color:#eccad0;color:#a93a50}.receipt-input input{width:92rpx;text-align:right;font:700 26rpx Georgia,serif;color:var(--ink)}.rejection-reason{height:66rpx;padding:0 15rpx;border:1rpx solid #eccad0;border-radius:13rpx;background:#fff8f8;font-size:21rpx;color:#7f3745;box-sizing:border-box}.receipt-context{margin-top:5rpx}.receive-confirm{background:#2d704f;box-shadow:0 8rpx 20rpx rgba(45,112,79,.2)}
.receipt-history-sheet{max-height:84vh}.history-order{margin:17rpx 24rpx 0;padding:17rpx 19rpx;border-radius:18rpx;background:linear-gradient(135deg,#263d33,#476250);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:18rpx}.history-order>view{display:flex;flex-direction:column;gap:5rpx}.history-order>view text:first-child{font:19rpx ui-monospace,SFMono-Regular,monospace;color:#e7cc9b}.history-order>view text:last-child{font-size:24rpx;font-weight:720}.history-order>text{max-width:48%;font-size:18rpx;line-height:1.45;color:rgba(255,255,255,.66);text-align:right}.history-list{max-height:59vh;padding:16rpx 24rpx 26rpx;box-sizing:border-box}.history-batch{margin-bottom:15rpx;padding:19rpx;border:1rpx solid #e5dacb;border-radius:20rpx;background:#fff;box-shadow:0 7rpx 19rpx rgba(58,43,28,.05)}.history-batch-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16rpx;padding-bottom:14rpx;border-bottom:1rpx dashed #e6dccf}.history-batch-head>view{display:flex;flex-direction:column;gap:4rpx}.history-batch-head>view:first-child text:first-child{font:700 20rpx ui-monospace,SFMono-Regular,monospace;color:#493d31}.history-batch-head>view:first-child text:last-child{font-size:17rpx;color:#9b9082}.history-batch-head>view:last-child{align-items:flex-end;font-size:19rpx;color:#357454}.history-batch-head .danger{color:#b13a51}.history-context{padding:12rpx 0;display:flex;justify-content:space-between;gap:12rpx;color:#887b6c;font-size:18rpx}.history-context text:last-child{max-width:62%;text-align:right}.history-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7rpx 14rpx;padding:14rpx;border-radius:14rpx;background:#f8f5ef;margin-top:8rpx}.history-item>view:first-child{min-width:0;display:flex;flex-direction:column;gap:4rpx}.history-item>view:first-child text:first-child{font-size:22rpx;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.history-item>view:first-child text:last-child{font-size:17rpx;color:#94887a}.history-item>view:nth-child(2){display:flex;flex-direction:column;align-items:flex-end;gap:4rpx;font-size:18rpx}.history-item .accepted{color:#2d704f}.history-item .rejected{color:#b13a51}.history-reason{grid-column:1/-1;padding-top:8rpx;border-top:1rpx solid #ece3d7;font-size:18rpx;color:#8f4b58}
.supplier-presets{margin-bottom:14rpx;padding:15rpx;border:1rpx solid #e7ddd0;border-radius:16rpx;background:linear-gradient(135deg,#fff,#f7f2ea)}.preset-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12rpx}.preset-head text:first-child{font-size:21rpx;font-weight:720;color:#5f5549}.preset-head text:last-child{font-size:17rpx;color:#9a8f82}.preset-scroll{width:100%;white-space:nowrap}.preset-row{display:inline-flex;gap:10rpx;padding-right:10rpx}.supplier-chip{min-width:190rpx;max-width:260rpx;padding:12rpx 14rpx;border:1rpx solid #e8dfd3;border-radius:14rpx;background:#fff;display:flex;flex-direction:column;gap:4rpx}.supplier-chip text:first-child{font-size:21rpx;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.supplier-chip text:last-child{font-size:17rpx;color:#9a8d7d}.supplier-chip.selected{border-color:#2d704f;background:#edf6f1;box-shadow:0 0 0 2rpx rgba(45,112,79,.08)}.supplier-chip.selected text:first-child{color:#20543d}
.stock-detail-sheet{max-height:86vh}.stock-file-hero{margin:18rpx 24rpx 0;padding:19rpx;border-radius:20rpx;background:linear-gradient(135deg,#293f35,#1f3029);color:#fff;display:grid;grid-template-columns:86rpx minmax(0,1fr) auto;align-items:center;gap:16rpx;box-shadow:0 12rpx 26rpx rgba(31,48,41,.16)}.stock-file-hero image,.stock-file-cover{width:86rpx;height:86rpx;border-radius:16rpx}.stock-file-cover{display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.1);color:#dfbd82;font:36rpx "Songti SC",serif}.stock-file-copy{min-width:0;display:flex;flex-direction:column}.stock-file-title{font-size:26rpx;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stock-file-spec{margin-top:5rpx;font-size:19rpx;color:rgba(255,255,255,.64)}.stock-file-status{display:flex;gap:8rpx;margin-top:10rpx}.stock-file-status text{padding:5rpx 9rpx;border-radius:999rpx;background:rgba(255,255,255,.1);font-size:17rpx}.stock-file-status .danger{background:#c9193f;color:#fff}.stock-file-balance{padding-left:16rpx;border-left:1rpx solid rgba(255,255,255,.16);display:flex;flex-direction:column;align-items:flex-end}.stock-file-balance text:first-child{font:700 42rpx Georgia,serif;color:#f1ce91}.stock-file-balance text:last-child{font-size:17rpx;color:rgba(255,255,255,.58)}.stock-file-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:10rpx;margin:14rpx 24rpx 0}.stock-file-actions>view{padding:14rpx 6rpx;border:1rpx solid #e7ded1;border-radius:15rpx;background:#fff;display:flex;flex-direction:column;align-items:center;gap:6rpx;color:#74695c;font-size:18rpx}.stock-file-actions>view>text:first-child{width:42rpx;height:42rpx;border-radius:13rpx;background:#f3eee7;display:flex;align-items:center;justify-content:center;color:#956c3f;font-weight:750}.stock-file-actions .primary{background:#fff3f5;border-color:#ecc5ce;color:#a92542}.stock-file-actions .primary>text:first-child{background:var(--red);color:#fff}.stock-ledger-head{margin:20rpx 24rpx 10rpx;display:flex;align-items:flex-end;justify-content:space-between;gap:12rpx}.stock-ledger-head>view{display:flex;flex-direction:column;gap:4rpx}.stock-ledger-head>view text:first-child{font-size:27rpx;font-weight:750}.stock-ledger-head>view text:last-child{font-size:18rpx;color:#958a7d}.stock-ledger-head>text{color:#a36b33;font-size:19rpx}.stock-ledger-list{max-height:42vh;padding:0 24rpx 20rpx;box-sizing:border-box}.stock-ledger-row{display:grid;grid-template-columns:50rpx minmax(0,1fr) auto;gap:13rpx;align-items:start;padding:16rpx 0;border-bottom:1rpx solid #ece4d8}.ledger-direction{width:46rpx;height:46rpx;border-radius:14rpx;background:#fff0ed;color:#b04a38;display:flex;align-items:center;justify-content:center;font-size:19rpx;font-weight:750}.ledger-direction.inbound{background:var(--green-soft);color:var(--green)}.ledger-copy{min-width:0;display:flex;flex-direction:column;gap:5rpx}.ledger-copy>view{display:flex;align-items:center;justify-content:space-between;gap:10rpx}.ledger-copy>view text:first-child{font-size:22rpx;font-weight:700}.ledger-copy>view text:last-child{font-size:17rpx;color:#a09587}.ledger-copy>text{font-size:19rpx;color:#746b5f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ledger-copy>text:last-child{color:#9a9083}.ledger-delta{font:700 27rpx Georgia,serif;color:#b64d3e}.ledger-delta.plus{color:#2e8056}.state.compact{padding:52rpx 20rpx;font-size:21rpx}
@keyframes railMove{0%,100%{left:10%;opacity:.6}50%{left:87%;opacity:1}}
@media (min-width:700px){.page{max-width:960px;margin:0 auto}.stock-card,.flow-card,.purchase-card{margin-inline:26rpx}.summary{gap:18rpx}.sheet-mask{align-items:center;justify-content:center;padding:32px;box-sizing:border-box}.sheet{width:min(720px,100%);max-height:88vh;border-radius:28px}.sheet-handle{margin-top:10px}.sheet-form,.receipt-list{max-height:52vh}.sheet-actions{padding-bottom:16rpx}}
@media (prefers-reduced-motion:reduce){.rail-pulse{animation:none;left:48%}.health-bar{transition:none}}
</style>
