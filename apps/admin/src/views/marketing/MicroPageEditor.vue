<template>
  <div class="page">
    <div class="toolbar">
      <h3>微页面管理</h3>
      <el-button
        type="primary"
        @click="openCreate"
      >
        创建微页面
      </el-button>
    </div>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        <span style="font-size:13px">展示位置：通过路径（如 <b>/promo/spring</b>）在小程序中独立展示。可嵌入轮播、秒杀、拼团、商品等组件。发布后用户可见。</span>
      </template>
    </el-alert>
    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="title"
        label="页面标题"
        min-width="150"
      />
      <el-table-column
        label="组件数"
        width="80"
      >
        <template #default="{ row }">
          {{ row.components?.length || 0 }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'PUBLISHED' ? 'success' : 'info'"
            size="small"
          >
            {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="版本"
        width="70"
      >
        <template #default="{ row }">
          v{{ row.version || 1 }}
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="400"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="openVisualEditor(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="row.status === 'PUBLISHED'"
            size="small"
            type="warning"
            @click="openPreview(row)"
          >
            预览
          </el-button>
          <el-button
            size="small"
            @click="openVersions(row)"
          >
            版本
          </el-button>
          <el-button
            v-if="row.status !== 'PUBLISHED'"
            size="small"
            type="success"
            @click="doPublish(row)"
          >
            发布
          </el-button>
          <el-popconfirm
            title="确定删除此页面？"
            @confirm="del(row.id)"
          >
            <template #reference>
              <el-button
                size="small"
                type="danger"
              >
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="total > 20"
      style="margin-top:16px;display:flex;justify-content:flex-end"
    >
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <!-- 页面编辑弹窗 -->
    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑微页面' : '创建微页面'"
      width="600px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input
            v-model="form.name"
            placeholder="如：春季促销活动"
          />
        </el-form-item>
        <el-form-item
          label="路由路径"
          required
        >
          <el-select
            v-model="form.route"
            filterable
            allow-create
            placeholder="选择或输入路径，用户通过此路径访问"
            style="width:100%"
          >
            <el-option
              v-for="r in routePresets"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </el-select><div style="font-size:12px;color:#999;margin-top:4px">
            用户在小程序中访问 <b>/promo/xxx</b> 即可看到此页面
          </div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="内部备注，不出现在用户端"
          />
        </el-form-item>
        <el-divider
          content-position="left"
          style="margin:12px 0"
        >
          <span style="font-size:12px;color:#8b4513">入口配置</span>
        </el-divider>
        <el-form-item label="入口可见">
          <el-switch
            v-model="form.entryVisible"
            active-text="在首页等入口展示"
            inactive-text="仅通过路径访问"
          />
        </el-form-item>
        <template v-if="form.entryVisible">
          <el-form-item label="入口标题">
            <el-input
              v-model="form.entryTitle"
              placeholder="入口展示标题，如：限时秒杀"
            />
          </el-form-item>
          <el-form-item label="入口图标">
            <el-input
              v-model="form.entryIcon"
              placeholder="emoji或图标URL"
              style="width:200px"
            /><span style="margin-left:8px;font-size:20px">{{ form.entryIcon || '🎯' }}</span>
          </el-form-item>
          <el-form-item label="排序权重">
            <el-input-number
              v-model="form.entrySort"
              :min="0"
              :max="999"
              style="width:150px"
            /><span style="font-size:12px;color:#999;margin-left:8px">越小越靠前</span>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="vis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 组件管理弹窗（列表模式） -->
    <el-dialog
      v-model="compVis"
      title="页面组件"
      width="750px"
    >
      <div style="margin-bottom:12px;display:flex;gap:8px">
        <el-button
          size="small"
          type="primary"
          @click="openCompCreate"
        >
          添加组件
        </el-button>
        <el-button
          size="small"
          :disabled="components.length < 2"
          @click="doSort"
        >
          保存排序
        </el-button>
      </div>
      <el-table
        :data="components"
        stripe
        max-height="400"
        row-key="id"
      >
        <el-table-column
          label="排序"
          width="70"
        >
          <template #default="{ $index }">
            <el-button-group size="small">
              <el-button
                :disabled="$index === 0"
                @click="moveComp($index, -1)"
              >
                ↑
              </el-button>
              <el-button
                :disabled="$index === components.length - 1"
                @click="moveComp($index, 1)"
              >
                ↓
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
        <el-table-column
          prop="type"
          label="组件类型"
          width="110"
        >
          <template #default="{ row }">
            {{ compTypeMap[row.type] || row.type }}
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="标题"
          min-width="120"
        />
        <el-table-column
          label="展示时段"
          min-width="170"
        >
          <template #default="{ row }">
            <span v-if="row.startTime || row.endTime">{{ row.startTime ? formatDate(row.startTime) : '不限' }} ~ {{ row.endTime ? formatDate(row.endTime) : '不限' }}</span>
            <span
              v-else
              style="color:#ccc"
            >一直展示</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="140"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              @click="openCompEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="delComp(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div
        v-if="components.length === 0"
        style="text-align:center;padding:40px;color:#ccc"
      >
        暂无组件，点击"添加组件"开始
      </div>
    </el-dialog>

    <!-- 组件编辑弹窗 -->
    <el-dialog
      v-model="compFormVis"
      :title="compEditingId ? '编辑组件' : '添加组件'"
      width="550px"
    >
      <el-form
        :model="compForm"
        label-width="80px"
      >
        <el-form-item
          label="类型"
          required
        >
          <el-select
            v-model="compForm.type"
            style="width:100%"
            @change="onCompTypeChange"
          >
            <el-option
              v-for="(label, value) in compTypeMap"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input
            v-model="compForm.title"
            :placeholder="compTitlePlaceholder"
          />
        </el-form-item>

        <!-- 秒杀专区：选择已有秒杀活动 -->
        <el-form-item
          v-if="compForm.type === 'FLASHSALE'"
          label="选择秒杀"
        >
          <el-select
            v-model="compForm.activityIds"
            multiple
            placeholder="选择要展示的秒杀活动"
            style="width:100%"
          >
            <el-option
              v-for="f in flashSaleOptions"
              :key="f.id"
              :label="`${f.name} (¥${Number(f.items?.[0]?.flashPrice||0).toFixed(2)})`"
              :value="f.id"
            />
          </el-select>
          <div style="font-size:12px;color:#999;margin-top:4px">
            选择已有的秒杀活动，留空则自动展示所有进行中的秒杀
          </div>
        </el-form-item>

        <!-- 拼团专区：选择已有拼团活动 -->
        <el-form-item
          v-if="compForm.type === 'GROUPBUY'"
          label="选择拼团"
        >
          <el-select
            v-model="compForm.activityIds"
            multiple
            placeholder="选择要展示的拼团活动"
            style="width:100%"
          >
            <el-option
              v-for="g in groupBuyOptions"
              :key="g.id"
              :label="`${g.name || g.productTitle || '拼团'} (${g.groupSize || g.minMembers}人团)`"
              :value="g.id"
            />
          </el-select>
          <div style="font-size:12px;color:#999;margin-top:4px">
            选择已有的拼团活动，留空则自动展示所有进行中的拼团
          </div>
        </el-form-item>

        <!-- 优惠券：选择已有优惠券 -->
        <el-form-item
          v-if="compForm.type === 'COUPON'"
          label="选择优惠券"
        >
          <el-select
            v-model="compForm.activityIds"
            multiple
            placeholder="选择要展示的优惠券"
            style="width:100%"
          >
            <el-option
              v-for="c in couponOptions"
              :key="c.id"
              :label="`${c.name} (满${c.threshold}减${c.reduction})`"
              :value="c.id"
            />
          </el-select>
          <div style="font-size:12px;color:#999;margin-top:4px">
            选择已有的优惠券，留空则自动展示所有可用优惠券
          </div>
        </el-form-item>

        <!-- 商品列表：选择商品 -->
        <el-form-item
          v-if="compForm.type === 'PRODUCT_LIST'"
          label="选择商品"
        >
          <ProductPicker
            v-model="compForm.productIds"
            multiple
            placeholder="选择要展示的商品"
          />
          <div style="font-size:12px;color:#999;margin-top:4px">
            留空则自动展示推荐商品
          </div>
        </el-form-item>

        <!-- 独立秒杀：直接配置商品+价格 -->
        <template v-if="compForm.type === 'FLASHSALE_INDEPENDENT'">
          <el-form-item
            label="选择商品"
            required
          >
            <ProductPicker
              v-model="compForm.independentProductId"
              placeholder="选择秒杀商品"
            />
          </el-form-item>
          <el-form-item
            label="秒杀价"
            required
          >
            <el-input-number
              v-model="compForm.independentPrice"
              :min="0.01"
              :precision="2"
              style="width:100%"
            />
          </el-form-item>
          <el-form-item label="秒杀库存">
            <el-input-number
              v-model="compForm.independentStock"
              :min="1"
              :max="99999"
              style="width:100%"
            />
          </el-form-item>
          <el-form-item label="每人限购">
            <el-input-number
              v-model="compForm.independentLimit"
              :min="1"
              :max="99"
              style="width:100%"
            />
          </el-form-item>
          <el-alert
            type="info"
            :closable="false"
            style="margin-bottom:12px"
            show-icon
          >
            <template #title>
              <span style="font-size:12px">独立秒杀不依赖全局秒杀活动，价格和库存仅在当前微页面生效</span>
            </template>
          </el-alert>
        </template>

        <!-- 独立拼团：直接配置商品+价格 -->
        <template v-if="compForm.type === 'GROUPBUY_INDEPENDENT'">
          <el-form-item
            label="选择商品"
            required
          >
            <ProductPicker
              v-model="compForm.independentProductId"
              placeholder="选择拼团商品"
            />
          </el-form-item>
          <el-form-item
            label="拼团价"
            required
          >
            <el-input-number
              v-model="compForm.independentPrice"
              :min="0.01"
              :precision="2"
              style="width:100%"
            />
          </el-form-item>
          <el-form-item label="成团人数">
            <el-input-number
              v-model="compForm.independentLimit"
              :min="2"
              :max="999"
              style="width:100%"
            />
          </el-form-item>
          <el-form-item label="拼团库存">
            <el-input-number
              v-model="compForm.independentStock"
              :min="1"
              :max="99999"
              style="width:100%"
            />
          </el-form-item>
          <el-alert
            type="info"
            :closable="false"
            style="margin-bottom:12px"
            show-icon
          >
            <template #title>
              <span style="font-size:12px">独立拼团不依赖全局拼团活动，价格和库存仅在当前微页面生效</span>
            </template>
          </el-alert>
        </template>

        <!-- 其他组件：保留JSON配置 -->
        <el-form-item
          v-if="!['FLASHSALE','GROUPBUY','COUPON','PRODUCT_LIST','FLASHSALE_INDEPENDENT','GROUPBUY_INDEPENDENT'].includes(compForm.type)"
          label="配置JSON"
        >
          <el-input
            v-model="compForm.configStr"
            type="textarea"
            :rows="4"
            :placeholder="compConfigPlaceholder"
          />
        </el-form-item>

        <el-form-item label="开始时间">
          <el-date-picker
            v-model="compForm.startTime"
            type="datetime"
            placeholder="选择开始时间（可选）"
            style="width:100%"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="compForm.endTime"
            type="datetime"
            placeholder="选择结束时间（可选）"
            style="width:100%"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="定向人群">
          <el-input
            v-model="compForm.audienceStr"
            type="textarea"
            :rows="2"
            placeholder="可选，如 {&quot;userTags&quot;:[&quot;vip&quot;],&quot;memberLevels&quot;:[2,3]}"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="compFormVis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="compSaving"
          @click="saveComp"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- ═══════════════════════════════════════ -->
    <!-- 可视化编辑器（全屏对话框） -->
    <!-- ═══════════════════════════════════════ -->
    <el-dialog
      v-model="veVis"
      title=""
      fullscreen
      destroy-on-close
      class="visual-editor-dlg"
    >
      <!-- 顶部工具栏 -->
      <div class="ve-toolbar">
        <div class="ve-tbar-left">
          <el-button
            text
            @click="veVis = false"
          >
            ← 返回列表
          </el-button>
          <span class="ve-page-name">{{ vePageTitle || '未命名页面' }}</span>
        </div>
        <div class="ve-tbar-right">
          <el-button
            :loading="veSaving"
            @click="veSave"
          >
            保存
          </el-button>
          <el-button
            type="success"
            @click="vePublish"
          >
            发布
          </el-button>
        </div>
      </div>

      <div class="ve-body">
        <!-- 左侧：组件库 -->
        <div class="ve-left">
          <div class="ve-left-title">
            组件库
          </div>
          <div class="ve-comp-lib">
            <div
              v-for="(label, type) in compTypeMap"
              :key="type"
              class="ve-comp-item"
              draggable="true"
              @dragstart="onDragStart($event, type)"
              @click="veAddComp(type)"
            >
              <span class="ve-comp-icon">{{ compIcon(type) }}</span>
              <span class="ve-comp-label">{{ label }}</span>
            </div>
          </div>
        </div>

        <!-- 中间：手机预览 -->
        <div class="ve-center">
          <div class="ve-phone-frame">
            <div class="ve-phone-status">
              微页面预览
            </div>
            <div
              class="ve-phone-body"
              :class="{ 've-drag-over': dragOver }"
              @drop="onDrop"
              @dragover.prevent
              @dragenter="dragOver = true"
              @dragleave="dragOver = false"
            >
              <!-- 拖入此处提示 -->
              <div
                v-if="!veComponents.length"
                class="ve-drop-hint"
              >
                <span>从左侧拖入组件到此处<br>或点击组件库中的组件添加</span>
              </div>

              <!-- 渲染组件 -->
              <div
                v-for="(comp, idx) in veComponents"
                :key="comp._key || idx"
                class="ve-render-comp"
                :class="{ 've-selected': veSelectedIdx === idx }"
                :draggable="true"
                @dragstart="onCompDragStart($event, idx)"
                @dragover.prevent="onCompDragOver($event, idx)"
                @drop.stop="onCompDrop($event, idx)"
                @click.stop="veSelectComp(idx)"
              >
                <!-- 序号和操作按钮 -->
                <div class="ve-comp-actions">
                  <span class="ve-comp-idx">{{ idx + 1 }}</span>
                  <span class="ve-comp-type-tag">{{ compTypeMap[comp.type] || comp.type }}</span>
                  <el-button
                    size="small"
                    type="danger"
                    circle
                    :icon="'Delete'"
                    style="width:22px;height:22px"
                    @click.stop="veDeleteComp(idx)"
                  />
                </div>
                <!-- 组件可视化渲染 -->
                <div class="ve-comp-body">
                  <component
                    :is="veRenderComp(comp)"
                    :comp="comp"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：属性面板 -->
        <div class="ve-right">
          <template v-if="veSelectedIdx !== null && veComponents[veSelectedIdx]">
            <div class="ve-right-title">
              组件属性
            </div>
            <el-form
              :model="vePropForm"
              label-width="70px"
              size="small"
            >
              <el-form-item label="类型">
                <el-select
                  v-model="vePropForm.type"
                  style="width:100%"
                >
                  <el-option
                    v-for="(label, value) in compTypeMap"
                    :key="value"
                    :label="label"
                    :value="value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="标题">
                <el-input v-model="vePropForm.title" />
              </el-form-item>

              <!-- 秒杀/拼团/优惠券：选择已有活动 -->
              <el-form-item
                v-if="vePropForm.type === 'FLASHSALE'"
                label="秒杀活动"
              >
                <el-select
                  v-model="vePropForm.activityIds"
                  multiple
                  placeholder="选择秒杀"
                  size="small"
                  style="width:100%"
                >
                  <el-option
                    v-for="f in flashSaleOptions"
                    :key="f.id"
                    :label="f.name"
                    :value="f.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item
                v-if="vePropForm.type === 'GROUPBUY'"
                label="拼团活动"
              >
                <el-select
                  v-model="vePropForm.activityIds"
                  multiple
                  placeholder="选择拼团"
                  size="small"
                  style="width:100%"
                >
                  <el-option
                    v-for="g in groupBuyOptions"
                    :key="g.id"
                    :label="g.name || g.productTitle"
                    :value="g.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item
                v-if="vePropForm.type === 'COUPON'"
                label="优惠券"
              >
                <el-select
                  v-model="vePropForm.activityIds"
                  multiple
                  placeholder="选择优惠券"
                  size="small"
                  style="width:100%"
                >
                  <el-option
                    v-for="c in couponOptions"
                    :key="c.id"
                    :label="c.name"
                    :value="c.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item
                v-if="vePropForm.type === 'PRODUCT_LIST'"
                label="选择商品"
              >
                <ProductPicker
                  v-model="vePropForm.productIds"
                  multiple
                  placeholder="选择商品"
                />
              </el-form-item>

              <!-- 独立秒杀 -->
              <el-form-item
                v-if="vePropForm.type === 'FLASHSALE_INDEPENDENT'"
                label="选择商品"
              >
                <ProductPicker
                  v-model="vePropForm.independentProductId"
                  placeholder="选择秒杀商品"
                />
              </el-form-item>
              <el-form-item
                v-if="vePropForm.type === 'FLASHSALE_INDEPENDENT'"
                label="秒杀价"
              >
                <el-input-number
                  v-model="vePropForm.independentPrice"
                  :min="0.01"
                  :precision="2"
                  style="width:100%"
                  size="small"
                />
              </el-form-item>
              <el-form-item
                v-if="vePropForm.type === 'FLASHSALE_INDEPENDENT'"
                label="库存"
              >
                <el-input-number
                  v-model="vePropForm.independentStock"
                  :min="1"
                  :max="99999"
                  style="width:100%"
                  size="small"
                />
              </el-form-item>
              <el-form-item
                v-if="vePropForm.type === 'FLASHSALE_INDEPENDENT'"
                label="限购"
              >
                <el-input-number
                  v-model="vePropForm.independentLimit"
                  :min="1"
                  :max="99"
                  style="width:100%"
                  size="small"
                />
              </el-form-item>

              <!-- 独立拼团 -->
              <el-form-item
                v-if="vePropForm.type === 'GROUPBUY_INDEPENDENT'"
                label="选择商品"
              >
                <ProductPicker
                  v-model="vePropForm.independentProductId"
                  placeholder="选择拼团商品"
                />
              </el-form-item>
              <el-form-item
                v-if="vePropForm.type === 'GROUPBUY_INDEPENDENT'"
                label="拼团价"
              >
                <el-input-number
                  v-model="vePropForm.independentPrice"
                  :min="0.01"
                  :precision="2"
                  style="width:100%"
                  size="small"
                />
              </el-form-item>
              <el-form-item
                v-if="vePropForm.type === 'GROUPBUY_INDEPENDENT'"
                label="成团人数"
              >
                <el-input-number
                  v-model="vePropForm.independentLimit"
                  :min="2"
                  :max="999"
                  style="width:100%"
                  size="small"
                />
              </el-form-item>
              <el-form-item
                v-if="vePropForm.type === 'GROUPBUY_INDEPENDENT'"
                label="库存"
              >
                <el-input-number
                  v-model="vePropForm.independentStock"
                  :min="1"
                  :max="99999"
                  style="width:100%"
                  size="small"
                />
              </el-form-item>

              <!-- 其他类型：保留JSON配置 -->
              <el-form-item
                v-if="!['FLASHSALE','GROUPBUY','COUPON','PRODUCT_LIST','FLASHSALE_INDEPENDENT','GROUPBUY_INDEPENDENT'].includes(vePropForm.type)"
                label="配置JSON"
              >
                <el-input
                  v-model="vePropForm.configStr"
                  type="textarea"
                  :rows="4"
                />
              </el-form-item>

              <el-form-item label="开始时间">
                <el-date-picker
                  v-model="vePropForm.startTime"
                  type="datetime"
                  style="width:100%"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="可选"
                />
              </el-form-item>
              <el-form-item label="结束时间">
                <el-date-picker
                  v-model="vePropForm.endTime"
                  type="datetime"
                  style="width:100%"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="可选"
                />
              </el-form-item>
              <el-form-item label="定向人群">
                <el-input
                  v-model="vePropForm.audienceStr"
                  type="textarea"
                  :rows="2"
                  placeholder="可选JSON"
                />
              </el-form-item>
            </el-form>
            <el-alert
              title="属性实时生效，点击上方保存按钮提交"
              type="info"
              :closable="false"
              style="margin-top:12px"
            />
          </template>
          <div
            v-else
            class="ve-right-hint"
          >
            点击预览中的组件<br>编辑其属性
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 版本历史弹窗 -->
    <el-dialog
      v-model="verVis"
      title="版本历史"
      width="700px"
    >
      <el-table
        :data="versions"
        stripe
        max-height="400"
      >
        <el-table-column
          label="版本号"
          width="80"
        >
          <template #default="{ row }">
            v{{ row.version }}
          </template>
        </el-table-column>
        <el-table-column
          prop="comment"
          label="说明"
          min-width="150"
        />
        <el-table-column
          label="时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="180"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              @click="previewVersion(row)"
            >
              预览
            </el-button>
            <el-popconfirm
              title="确认回滚到此版本？"
              @confirm="doRollback(row.id)"
            >
              <template #reference>
                <el-button
                  size="small"
                  type="warning"
                >
                  回滚
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <div
        v-if="versions.length === 0"
        style="text-align:center;padding:40px;color:#ccc"
      >
        暂无历史版本
      </div>
    </el-dialog>

    <!-- 版本预览 -->
    <el-dialog
      v-model="prevVis"
      title="版本预览"
      width="600px"
    >
      <div style="margin-bottom:12px;color:#8b4513">
        版本 v{{ previewVer?.version }} — {{ previewVer?.comment }}
      </div>
      <el-table
        :data="previewComponents"
        stripe
        max-height="400"
        size="small"
      >
        <el-table-column
          label="#"
          width="50"
        >
          <template #default="{ $index }">
            {{ $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column
          label="类型"
          width="110"
        >
          <template #default="{ row }">
            {{ compTypeMap[row.type] || row.type }}
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="标题"
          min-width="120"
        />
      </el-table>
      <div
        v-if="previewComponents.length === 0"
        style="text-align:center;padding:40px;color:#ccc"
      >
        此版本无组件
      </div>
    </el-dialog>

    <!-- ═══════════════════════════════════════ -->
    <!-- 用户端预览（手机框） -->
    <!-- ═══════════════════════════════════════ -->
    <el-dialog
      v-model="previewPageVis"
      title="用户端预览"
      width="460px"
      destroy-on-close
    >
      <div style="text-align:center;margin-bottom:8px;color:#8b4513;font-size:13px">
        微信小程序中展示效果（{{ previewPageTitle }}）
      </div>
      <div class="pp-phone-frame">
        <div class="pp-phone-status-bar">
          微页面预览
        </div>
        <div class="pp-phone-content">
          <div
            v-if="!previewPageComps.length"
            style="text-align:center;padding:60px 20px;color:#ccc"
          >
            该页面暂无组件，请先编辑添加内容
          </div>
          <div
            v-for="(comp, idx) in previewPageComps"
            :key="idx"
            class="pp-preview-comp"
          >
            <div class="pp-comp-badge">
              {{ compTypeMap[comp.type] || comp.type }}
            </div>
            <div
              v-if="comp.title"
              class="pp-comp-title"
            >
              {{ comp.title }}
            </div>
            <div class="pp-comp-mock">
              <!-- 轮播图 -->
              <div
                v-if="comp.type === 'CAROUSEL'"
                class="pp-mock-carousel"
              >
                📷 轮播图 Banner
              </div>
              <!-- 倒计时 -->
              <div
                v-else-if="comp.type === 'COUNTDOWN'"
                class="pp-mock-countdown"
              >
                ⏰ 距活动结束 <b>23:59:59</b>
              </div>
              <!-- 秒杀 -->
              <div
                v-else-if="comp.type === 'FLASHSALE'"
                class="pp-mock-flashsale"
              >
                <div style="display:flex;gap:8px">
                  <div
                    v-for="i in 3"
                    :key="i"
                    class="pp-mock-product-card"
                  >
                    <div class="pp-mock-product-img" />
                    <div class="pp-mock-product-name">
                      商品{{ i }}
                    </div>
                    <div class="pp-mock-product-price">
                      ¥9.9
                    </div>
                  </div>
                </div>
              </div>
              <!-- 拼团 -->
              <div
                v-else-if="comp.type === 'GROUPBUY'"
                class="pp-mock-groupbuy"
              >
                👥 2人拼团 ¥19.9
              </div>
              <!-- 优惠券 -->
              <div
                v-else-if="comp.type === 'COUPON'"
                class="pp-mock-coupon"
              >
                🎫 满100减20
              </div>
              <!-- 商品列表 -->
              <div
                v-else-if="comp.type === 'PRODUCT_LIST'"
                class="pp-mock-productlist"
              >
                🛍️ 精选商品网格
              </div>
              <!-- 图片 -->
              <div
                v-else-if="comp.type === 'IMAGE'"
                class="pp-mock-image"
              >
                📷 {{ comp.title || '图片展示' }}
              </div>
              <!-- 文本 -->
              <div
                v-else-if="comp.type === 'TEXT'"
                class="pp-mock-textblock"
              >
                📝 {{ comp.title || '文本内容区域' }}
              </div>
              <!-- 推荐 -->
              <div
                v-else-if="comp.type === 'RECOMMEND'"
                class="pp-mock-recommend"
              >
                ⭐ 为您推荐
              </div>
              <!-- 选项卡 -->
              <div
                v-else-if="comp.type === 'TABS'"
                class="pp-mock-tabs"
              >
                📑 选项卡内容
              </div>
              <!-- 独立秒杀 -->
              <div
                v-else-if="comp.type === 'FLASHSALE_INDEPENDENT'"
                class="pp-mock-flashsale"
              >
                <div style="display:flex;gap:8px">
                  <div class="pp-mock-product-card">
                    <div class="pp-mock-product-img" />
                    <div class="pp-mock-product-name">
                      {{ comp.title || '独立秒杀商品' }}
                    </div>
                    <div class="pp-mock-product-price">
                      ¥{{ comp.config?.flashPrice || '9.9' }}
                    </div>
                  </div>
                </div>
              </div>
              <!-- 独立拼团 -->
              <div
                v-else-if="comp.type === 'GROUPBUY_INDEPENDENT'"
                class="pp-mock-groupbuy"
              >
                👥 {{ comp.config?.minMembers || 2 }}人拼团 ¥{{ comp.config?.groupPrice || '19.9' }}
              </div>
              <!-- 通用 -->
              <div v-else>
                📦 {{ compTypeMap[comp.type] || comp.type }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'
import ProductPicker from '@/components/ProductPicker.vue'

const loading = ref(false); const saving = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const form = reactive({ name: '', route: '', description: '', entryVisible: false, entryTitle: '', entryIcon: '', entrySort: 0 })

const compVis = ref(false); const compFormVis = ref(false); const compEditingId = ref(''); const compSaving = ref(false)
const components = ref<any[]>([]); const currentPageId = ref('')
const compForm = reactive({ type: 'CAROUSEL', title: '', configStr: '{}', activityIds: [] as string[], productIds: [] as string[], startTime: '' as string, endTime: '' as string, audienceStr: '', independentProductId: '', independentPrice: 9.9, independentStock: 100, independentLimit: 1 })

// 活动选项（用于组件关联选择）
const flashSaleOptions = ref<any[]>([])
const groupBuyOptions = ref<any[]>([])
const couponOptions = ref<any[]>([])

const compTitlePlaceholder = computed(() => {
  const m: Record<string, string> = { FLASHSALE: '如：限时秒杀', GROUPBUY: '如：超值拼团', COUPON: '如：领券中心', PRODUCT_LIST: '如：精选好物', CAROUSEL: '如：首页轮播', COUNTDOWN: '如：活动倒计时', IMAGE: '如：品牌宣传', TEXT: '如：活动说明', TABS: '如：热门分类', RECOMMEND: '如：为你推荐' }
  return m[compForm.type] || '组件标题'
})

const compConfigPlaceholder = computed(() => {
  const m: Record<string, string> = { CAROUSEL: '{"images":[{"url":"...","link":"..."}]}', COUNTDOWN: '{"targetTime":"2026-12-31 23:59:59"}', IMAGE: '{"url":"...","link":"..."}', TEXT: '{"content":"HTML内容"}', TABS: '{"tabs":[{"title":"标签1","type":"PRODUCT_LIST"}]}', RECOMMEND: '{"algorithm":"popular","limit":10}' }
  return m[compForm.type] || '{}'
})

async function fetchActivityOptions() {
  try {
    const [fsRes, gbRes, cpRes] = await Promise.all([
      marketingApi.listFlashSales({ pageSize: 100 }),
      marketingApi.listGroupBuys({ pageSize: 100 }),
      marketingApi.listCoupons({ pageSize: 100 }),
    ])
    flashSaleOptions.value = fsRes.data.items || fsRes.data.flashSales || fsRes.data.data || []
    groupBuyOptions.value = gbRes.data.items || gbRes.data.groupBuys || gbRes.data.data || []
    couponOptions.value = cpRes.data.items || cpRes.data.data || []
  } catch { /* 静默 */ }
}

function onCompTypeChange() {
  compForm.activityIds = []
  compForm.productIds = []
  compForm.configStr = '{}'
  compForm.independentProductId = ''
  compForm.independentPrice = 9.9
  compForm.independentStock = 100
  compForm.independentLimit = 1
}

const verVis = ref(false); const versions = ref<any[]>([])
const prevVis = ref(false); const previewVer = ref<any>(null); const previewComponents = ref<any[]>([])

// 页面预览
const previewPageVis = ref(false); const previewPageTitle = ref(''); const previewPageComps = ref<any[]>([])

// 可视化编辑器状态
const veVis = ref(false); const veSaving = ref(false); const vePageTitle = ref('')
const veComponents = ref<any[]>([]); const veSelectedIdx = ref<number | null>(null); const dragOver = ref(false)
const vePropForm = reactive({ type: 'CAROUSEL', title: '', configStr: '{}', activityIds: [] as string[], productIds: [] as string[], startTime: '' as string, endTime: '' as string, audienceStr: '', independentProductId: '', independentPrice: 9.9, independentStock: 100, independentLimit: 1 })

const routePresets = [
  { label: '促销活动 /promo/sale', value: '/promo/sale' },
  { label: '春节大促 /promo/spring', value: '/promo/spring' },
  { label: '年中大促 /promo/midyear', value: '/promo/midyear' },
  { label: '双十一 /promo/double11', value: '/promo/double11' },
  { label: '开学季 /promo/school', value: '/promo/school' },
  { label: '新品首发 /promo/new', value: '/promo/new' },
  { label: '限时秒杀 /promo/flash', value: '/promo/flash' },
  { label: '拼团专区 /promo/group', value: '/promo/group' },
  { label: '会员专享 /vip/benefits', value: '/vip/benefits' },
  { label: '积分商城 /points/mall', value: '/points/mall' },
]

const compTypeMap: Record<string, string> = {
  CAROUSEL: '轮播图', COUNTDOWN: '倒计时', FLASHSALE: '秒杀专区',
  GROUPBUY: '拼团专区', COUPON: '优惠券', PRODUCT_LIST: '商品列表',
  RECOMMEND: '推荐', IMAGE: '图片', TEXT: '文本', TABS: '选项卡',
  FLASHSALE_INDEPENDENT: '独立秒杀', GROUPBUY_INDEPENDENT: '独立拼团',
}

function compIcon(type: string): string {
  const icons: Record<string, string> = {
    CAROUSEL: '🖼️', COUNTDOWN: '⏰', FLASHSALE: '⚡', GROUPBUY: '👥',
    COUPON: '🎫', PRODUCT_LIST: '🛍️', RECOMMEND: '⭐', IMAGE: '📷',
    TEXT: '📝', TABS: '📑', FLASHSALE_INDEPENDENT: '⚡', GROUPBUY_INDEPENDENT: '👥',
  }
  return icons[type] || '📦'
}

let veCompKey = 0

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try { const { data } = await marketingApi.listPages(); list.value = data.pages || data.data || []; total.value = data.total || 0 } catch { list.value = [] } finally { loading.value = false }
}

function openCreate() { editingId.value = ''; Object.assign(form, { name: '', route: '', description: '', entryVisible: false, entryTitle: '', entryIcon: '', entrySort: 0 }); vis.value = true }
function openEdit(row: any) {
  editingId.value = row.id
  const ec = row.entryConfig || {}
  Object.assign(form, { name: row.name || row.title || '', route: row.route || row.path || '', description: row.description || '', entryVisible: row.entryVisible || false, entryTitle: ec.title || '', entryIcon: ec.icon || '', entrySort: ec.sort || 0 })
  vis.value = true
}

async function save() {
  if (!form.name) { ElMessage.warning('请输入页面名称'); return }
  if (!form.route) { ElMessage.warning('请输入路由路径（如 /promo），用户通过此路径访问页面'); return }
  saving.value = true
  try {
    const payload: any = {
      name: form.name, route: form.route, description: form.description,
      entryVisible: form.entryVisible,
      entryConfig: form.entryVisible ? { title: form.entryTitle, icon: form.entryIcon, sort: form.entrySort } : null,
    }
    if (editingId.value) {
      await marketingApi.updatePage(editingId.value, payload)
      ElMessage.success('已保存'); vis.value = false; fetchList()
    } else {
      const { data } = await marketingApi.createPage(payload)
      const newId = data?.id || data?.page?.id
      ElMessage.success('微页面创建成功，即将进入编辑器添加组件')
      vis.value = false
      fetchList()
      // 自动打开可视化编辑器
      if (newId) {
        setTimeout(() => openVisualEditor({ id: newId, title: form.name }), 500)
      }
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败，请重试')
  } finally { saving.value = false }
}

async function doPublish(row: any) {
  try { await marketingApi.publishPage(row.id); ElMessage.success('已发布'); fetchList() } catch { ElMessage.error('发布失败') }
}

async function del(id: string) {
  try { await marketingApi.deletePage(id); ElMessage.success('已删除'); fetchList() } catch { ElMessage.error('删除失败') }
}

// ───────── 组件管理（列表模式） ─────────
async function openComponents(row: any) {
  currentPageId.value = row.id
  try { const { data } = await marketingApi.getPage(row.id); components.value = data.components || [] } catch { components.value = [] }
  compVis.value = true
}

function openCompCreate() {
  compEditingId.value = ''
  Object.assign(compForm, { type: 'CAROUSEL', title: '', configStr: '{}', activityIds: [], productIds: [], startTime: '', endTime: '', audienceStr: '', independentProductId: '', independentPrice: 9.9, independentStock: 100, independentLimit: 1 })
  fetchActivityOptions()
  compFormVis.value = true
}

function formatDateTime(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
}

function openCompEdit(row: any) {
  compEditingId.value = row.id
  const cfg = row.config || {}
  Object.assign(compForm, {
    type: row.type, title: row.title || '',
    configStr: JSON.stringify(cfg, null, 2),
    activityIds: cfg.activityIds || cfg.flashSaleIds || cfg.groupBuyIds || cfg.couponIds || [],
    productIds: cfg.productIds || [],
    startTime: formatDateTime(row.startTime),
    endTime: formatDateTime(row.endTime),
    audienceStr: row.audience ? JSON.stringify(row.audience, null, 2) : '',
    independentProductId: cfg.productId || '',
    independentPrice: cfg.flashPrice || cfg.groupPrice || 9.9,
    independentStock: cfg.stock || 100,
    independentLimit: cfg.limitPerUser || cfg.minMembers || 1,
  })
  fetchActivityOptions()
  compFormVis.value = true
}

async function saveComp() {
  // 根据组件类型构建 config
  let config: any = {}
  const t = compForm.type
  if (t === 'FLASHSALE') {
    config = { flashSaleIds: compForm.activityIds }
  } else if (t === 'GROUPBUY') {
    config = { groupBuyIds: compForm.activityIds }
  } else if (t === 'COUPON') {
    config = { couponIds: compForm.activityIds }
  } else if (t === 'PRODUCT_LIST') {
    config = { productIds: compForm.productIds }
  } else if (t === 'FLASHSALE_INDEPENDENT') {
    if (!compForm.independentProductId) { ElMessage.warning('请选择商品'); return }
    config = { productId: compForm.independentProductId, flashPrice: compForm.independentPrice, stock: compForm.independentStock, limitPerUser: compForm.independentLimit }
  } else if (t === 'GROUPBUY_INDEPENDENT') {
    if (!compForm.independentProductId) { ElMessage.warning('请选择商品'); return }
    config = { productId: compForm.independentProductId, groupPrice: compForm.independentPrice, stock: compForm.independentStock, minMembers: compForm.independentLimit }
  } else {
    try { config = JSON.parse(compForm.configStr || '{}') } catch { ElMessage.warning('配置JSON格式错误'); return }
  }
  let audience: any = null
  if (compForm.audienceStr.trim()) {
    try { audience = JSON.parse(compForm.audienceStr) } catch { ElMessage.warning('定向人群JSON格式错误'); return }
  }
  compSaving.value = true
  const payload = {
    type: compForm.type, title: compForm.title, config,
    startTime: compForm.startTime ? new Date(compForm.startTime).toISOString() : undefined,
    endTime: compForm.endTime ? new Date(compForm.endTime).toISOString() : undefined,
    audience: audience || undefined,
  }
  try {
    if (compEditingId.value) {
      await marketingApi.updatePageComponent(currentPageId.value, compEditingId.value, payload)
    } else {
      await marketingApi.addPageComponent(currentPageId.value, { ...payload, sortOrder: components.value.length })
    }
    ElMessage.success('已保存'); compFormVis.value = false
    const { data } = await marketingApi.getPage(currentPageId.value)
    components.value = data.components || []
  } catch { ElMessage.error('组件保存失败') } finally { compSaving.value = false }
}

async function delComp(compId: string) {
  try {
    await ElMessageBox.confirm('删除该组件？', '提示', { type: 'warning' })
    await marketingApi.deletePageComponent(currentPageId.value, compId)
    ElMessage.success('已删除')
    const { data } = await marketingApi.getPage(currentPageId.value)
    components.value = data.components || []
  } catch { /* 用户取消 */ }
}

function moveComp(index: number, dir: number) {
  const arr = [...components.value]
  const target = index + dir
  if (target < 0 || target >= arr.length) return;
  [arr[index], arr[target]] = [arr[target], arr[index]]
  components.value = arr
}

async function doSort() {
  const ids = components.value.map(c => c.id)
  try { await marketingApi.sortPageComponents(currentPageId.value, { componentIds: ids }); ElMessage.success('排序已保存') } catch { ElMessage.error('排序保存失败') }
}

// ───────── 可视化编辑器 ─────────
async function openVisualEditor(row: any) {
  currentPageId.value = row.id
  vePageTitle.value = row.title
  try {
    const { data } = await marketingApi.getPage(row.id)
    veComponents.value = ((data.components || []) as any[]).map((c: any) => ({ ...c, _key: `comp_${veCompKey++}` }))
  } catch { veComponents.value = [] }
  veSelectedIdx.value = null
  veVis.value = true
}

function veAddComp(type: string) {
  const comp = { type, title: '', config: {}, sortOrder: veComponents.value.length, _key: `comp_${veCompKey++}` }
  veComponents.value.push(comp)
  veSelectComp(veComponents.value.length - 1)
}

function veSelectComp(idx: number) {
  veSelectedIdx.value = idx
  const comp = veComponents.value[idx]
  if (!comp) return
  const cfg = comp.config || {}
  Object.assign(vePropForm, {
    type: comp.type, title: comp.title || '',
    configStr: JSON.stringify(cfg, null, 2),
    activityIds: cfg.flashSaleIds || cfg.groupBuyIds || cfg.couponIds || cfg.activityIds || [],
    productIds: cfg.productIds || [],
    startTime: formatDateTime(comp.startTime),
    endTime: formatDateTime(comp.endTime),
    audienceStr: comp.audience ? JSON.stringify(comp.audience, null, 2) : '',
    independentProductId: cfg.productId || '',
    independentPrice: cfg.flashPrice || cfg.groupPrice || 9.9,
    independentStock: cfg.stock || 100,
    independentLimit: cfg.limitPerUser || cfg.minMembers || 1,
  })
  fetchActivityOptions()
}

// 属性面板实时同步到组件数据
function veSyncProps() {
  if (veSelectedIdx.value === null) return
  const comp = veComponents.value[veSelectedIdx.value]
  if (!comp) return
  comp.type = vePropForm.type
  comp.title = vePropForm.title
  // 根据类型构建config
  const t = vePropForm.type
  if (t === 'FLASHSALE') comp.config = { flashSaleIds: vePropForm.activityIds }
  else if (t === 'GROUPBUY') comp.config = { groupBuyIds: vePropForm.activityIds }
  else if (t === 'COUPON') comp.config = { couponIds: vePropForm.activityIds }
  else if (t === 'PRODUCT_LIST') comp.config = { productIds: vePropForm.productIds }
  else if (t === 'FLASHSALE_INDEPENDENT') comp.config = { productId: vePropForm.independentProductId, flashPrice: vePropForm.independentPrice, stock: vePropForm.independentStock, limitPerUser: vePropForm.independentLimit }
  else if (t === 'GROUPBUY_INDEPENDENT') comp.config = { productId: vePropForm.independentProductId, groupPrice: vePropForm.independentPrice, stock: vePropForm.independentStock, minMembers: vePropForm.independentLimit }
  else { try { comp.config = JSON.parse(vePropForm.configStr) } catch { /* keep old */ } }
  comp.startTime = vePropForm.startTime || null
  comp.endTime = vePropForm.endTime || null
  try { comp.audience = vePropForm.audienceStr.trim() ? JSON.parse(vePropForm.audienceStr) : null } catch { /* keep old */ }
}

// 监听属性表单变化实时同步
import { watch } from 'vue'
watch([() => vePropForm.type, () => vePropForm.title, () => vePropForm.configStr,
  () => vePropForm.activityIds, () => vePropForm.productIds,
  () => vePropForm.startTime, () => vePropForm.endTime, () => vePropForm.audienceStr,
  () => vePropForm.independentProductId, () => vePropForm.independentPrice,
  () => vePropForm.independentStock, () => vePropForm.independentLimit], () => {
  veSyncProps()
})

function veDeleteComp(idx: number) {
  veComponents.value.splice(idx, 1)
  if (veSelectedIdx.value === idx) veSelectedIdx.value = null
  else if (veSelectedIdx.value !== null && veSelectedIdx.value > idx) veSelectedIdx.value!--
}

// 拖拽：从组件库拖入
function onDragStart(e: DragEvent, type: string) {
  e.dataTransfer!.setData('text/plain', type)
  e.dataTransfer!.effectAllowed = 'copy'
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const type = e.dataTransfer!.getData('text/plain')
  if (type && compTypeMap[type]) veAddComp(type)
}

// 拖拽：组件排序
let dragSrcIdx: number | null = null

function onCompDragStart(e: DragEvent, idx: number) {
  dragSrcIdx = idx
  e.dataTransfer!.effectAllowed = 'move'
}

function onCompDragOver(_e: DragEvent, _idx: number) {
  // visual indicator
}

function onCompDrop(e: DragEvent, targetIdx: number) {
  if (dragSrcIdx === null || dragSrcIdx === targetIdx) return
  const arr = [...veComponents.value]
  const [moved] = arr.splice(dragSrcIdx, 1)
  arr.splice(targetIdx, 0, moved)
  veComponents.value = arr
  if (veSelectedIdx.value === dragSrcIdx) veSelectedIdx.value = targetIdx
  dragSrcIdx = null
}

async function veSave() {
  veSaving.value = true
  try {
    // 删除所有现有组件，重新创建
    const { data: page } = await marketingApi.getPage(currentPageId.value)
    const existingComps = page.components || []
    for (const c of existingComps) {
      await marketingApi.deletePageComponent(currentPageId.value, c.id).catch(() => {})
    }
    for (let i = 0; i < veComponents.value.length; i++) {
      const c = veComponents.value[i]
      await marketingApi.addPageComponent(currentPageId.value, {
        type: c.type, title: c.title, config: c.config || {},
        sortOrder: i,
        startTime: c.startTime ? new Date(c.startTime).toISOString() : undefined,
        endTime: c.endTime ? new Date(c.endTime).toISOString() : undefined,
        audience: c.audience || undefined,
      })
    }
    ElMessage.success('已保存')
  } catch { ElMessage.error('保存失败') } finally { veSaving.value = false }
}

async function vePublish() {
  await veSave()
  try { await marketingApi.publishPage(currentPageId.value); ElMessage.success('已发布'); fetchList() } catch { ElMessage.error('发布失败') }
}

// 渲染预览组件
function veRenderComp(comp: any) {
  const type = comp.type
  if (type === 'CAROUSEL') return veCarouselComp
  if (type === 'COUNTDOWN') return veCountdownComp
  if (type === 'IMAGE') return veImageComp
  if (type === 'TEXT') return veTextComp
  if (type === 'TABS') return veTabsComp
  if (type === 'FLASHSALE_INDEPENDENT') return veFlashIndependentComp
  if (type === 'GROUPBUY_INDEPENDENT') return veGroupIndependentComp
  return veGenericComp
}

const veFlashIndependentComp: any = {
  props: ['comp'],
  render(ctx: any) {
    const cfg = ctx.comp?.config || {}
    return h('div', { class: 've-mock ve-mock-countdown' }, [
      h('span', { style: { fontWeight: 'bold' } }, `⚡ 独立秒杀 — ¥${cfg.flashPrice || '?'}`),
      h('span', { style: { fontSize: '10px', display: 'block', marginTop: '4px', opacity: 0.8 } }, `库存${cfg.stock || 0} | 限购${cfg.limitPerUser || 0}`),
    ])
  },
}
const veGroupIndependentComp: any = {
  props: ['comp'],
  render(ctx: any) {
    const cfg = ctx.comp?.config || {}
    return h('div', { class: 've-mock', style: { background: 'linear-gradient(135deg, #fff8f0, #ffeedd)', color: '#e67e22' } }, [
      h('span', { style: { fontWeight: 'bold' } }, `👥 独立拼团 — ¥${cfg.groupPrice || '?'}`),
      h('span', { style: { fontSize: '10px', display: 'block', marginTop: '4px' } }, `${cfg.minMembers || 2}人成团 | 库存${cfg.stock || 0}`),
    ])
  },
}

const veCarouselComp = { render() { return h('div', { class: 've-mock ve-mock-carousel' }, [h('span', '轮播图 — Banner轮播')]) } }
const veCountdownComp = { render() { return h('div', { class: 've-mock ve-mock-countdown' }, [h('span', '⏰ 倒计时组件')]) } }
const veImageComp = { render() { return h('div', { class: 've-mock ve-mock-image' }, [h('span', '📷 图片组件')]) } }
const veTextComp = { render() { return h('div', { class: 've-mock ve-mock-text' }, [h('span', '📝 文本内容区域')]) } }
const veTabsComp = { render() { return h('div', { class: 've-mock ve-mock-tabs' }, [h('span', '📑 选项卡切换')]) } }
const veGenericComp: any = {
  props: ['comp'],
  render(ctx: any) {
    const label = compTypeMap[ctx.comp?.type] || ctx.comp?.type || '未知组件'
    return h('div', { class: 've-mock ve-mock-generic' }, [
      h('span', `${compIcon(ctx.comp?.type || '')} ${label}`),
      h('span', { style: { fontSize: '10px', color: '#999', display: 'block' } }, ctx.comp?.title || ''),
    ])
  },
}

// ───────── 版本管理 ─────────
async function openVersions(row: any) {
  currentPageId.value = row.id
  try { const { data } = await marketingApi.getPageVersions(row.id); versions.value = data || [] } catch { versions.value = [] }
  verVis.value = true
}

function previewVersion(row: any) {
  previewVer.value = row
  previewComponents.value = row.value?.components || []
  prevVis.value = true
}

async function doRollback(versionId: string) {
  try {
    await marketingApi.rollbackPage(currentPageId.value, versionId)
    ElMessage.success('已回滚'); verVis.value = false; fetchList()
  } catch { ElMessage.error('回滚失败') }
}

// ───────── 用户端预览 ─────────
async function openPreview(row: any) {
  previewPageTitle.value = row.title
  previewPageComps.value = []
  previewPageVis.value = true
  try {
    const { data } = await marketingApi.getPage(row.id)
    previewPageComps.value = data.components || []
  } catch { previewPageComps.value = [] }
}
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }

/* ═══ 可视化编辑器 ═══ */
.ve-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: var(--color-bg-card); border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 10; }
.ve-tbar-left { display: flex; align-items: center; gap: 12px; }
.ve-page-name { font-size: 16px; font-weight: 600; color: var(--color-text-title); }
.ve-tbar-right { display: flex; gap: 8px; }

.ve-body { display: flex; height: calc(100vh - 56px); overflow: hidden; }

/* 左侧组件库 */
.ve-left { width: 180px; background: #fafafa; border-right: 1px solid #eee; overflow-y: auto; flex-shrink: 0; }
.ve-left-title { padding: 12px 12px 8px; font-size: 13px; color: var(--color-text-secondary); font-weight: 500; }
.ve-comp-lib { padding: 0 8px; }
.ve-comp-item { display: flex; align-items: center; gap: 8px; padding: 10px 8px; margin-bottom: 4px; border-radius: 6px; cursor: grab; background: var(--color-bg-card); border: 1px solid #eee; transition: all 0.15s; user-select: none; }
.ve-comp-item:hover { border-color: var(--color-text-title); box-shadow: 0 2px 8px rgba(139,69,19,0.1); }
.ve-comp-item:active { cursor: grabbing; }
.ve-comp-icon { font-size: 18px; }
.ve-comp-label { font-size: 12px; color: #666; }

/* 中间预览区 */
.ve-center { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 20px; background: #f0f0f0; overflow-y: auto; }
.ve-phone-frame { width: 375px; background: var(--color-bg-card); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; }
.ve-phone-status { background: #8b4513; color: #fff; text-align: center; padding: 8px; font-size: 12px; }
.ve-phone-body { min-height: 500px; padding: 0; position: relative; }
.ve-phone-body.ve-drag-over { outline: 2px dashed #8b4513; outline-offset: -2px; background: rgba(201,169,110,0.03); }
.ve-drop-hint { display: flex; align-items: center; justify-content: center; height: 400px; color: var(--color-text-placeholder); font-size: 13px; text-align: center; line-height: 1.8; }

.ve-render-comp { position: relative; border-bottom: 1px dashed #eee; cursor: pointer; transition: all 0.15s; }
.ve-render-comp:hover { background: rgba(201,169,110,0.02); }
.ve-render-comp.ve-selected { outline: 2px solid #8b4513; outline-offset: -2px; background: rgba(201,169,110,0.05); }
.ve-comp-actions { display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(0,0,0,0.03); }
.ve-comp-idx { width: 18px; height: 18px; border-radius: 50%; background: #8b4513; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.ve-comp-type-tag { font-size: 11px; color: var(--color-text-secondary); flex: 1; }
.ve-comp-body { padding: 0; }

/* 预览组件 mock */
.ve-mock { padding: 20px 16px; text-align: center; color: var(--color-text-secondary); font-size: 13px; }
.ve-mock-carousel { background: linear-gradient(135deg, #f5f0e8, #e8d5c4); height: 100px; display: flex; align-items: center; justify-content: center; }
.ve-mock-countdown { background: linear-gradient(135deg, #C41E3A, #E85D75); color: #fff; padding: 16px; }
.ve-mock-image { background: #e8e0d5; height: 120px; display: flex; align-items: center; justify-content: center; }
.ve-mock-text { background: var(--color-bg-card); min-height: 60px; display: flex; align-items: center; justify-content: center; }
.ve-mock-tabs { background: #fafafa; border-top: 3px solid #8b4513; }
.ve-mock-generic { background: #fafafa; min-height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }

/* 右侧属性面板 */
.ve-right { width: 300px; background: var(--color-bg-card); border-left: 1px solid #eee; overflow-y: auto; padding: 12px; flex-shrink: 0; }
.ve-right-title { font-size: 14px; font-weight: 600; color: var(--color-text-title); margin-bottom: 12px; }
.ve-right-hint { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--color-text-placeholder); font-size: 13px; text-align: center; line-height: 1.8; }

/* 预览手机框 */
.pp-phone-frame { width: 320px; margin: 0 auto; background: var(--color-bg-card); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; }
.pp-phone-status-bar { background: #8b4513; color: #fff; text-align: center; padding: 6px; font-size: 11px; }
.pp-phone-content { min-height: 400px; padding: 0; }
.pp-preview-comp { border-bottom: 1px solid #f0f0f0; }
.pp-comp-badge { display: inline-block; padding: 2px 6px; margin: 6px 8px 0; background: rgba(201,169,110,0.1); color: var(--color-text-title); font-size: 10px; border-radius: 3px; }
.pp-comp-title { font-size: 12px; font-weight: 600; padding: 4px 8px 0; color: #333; }
.pp-comp-mock { padding: 8px; }
.pp-mock-carousel { background: linear-gradient(135deg, #f5f0e8, #e8d5c4); height: 80px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--color-text-secondary); border-radius: 6px; }
.pp-mock-countdown { background: #C41E3A; color: #fff; padding: 12px; text-align: center; border-radius: 6px; font-size: 13px; }
.pp-mock-flashsale { padding: 8px 0; }
.pp-mock-product-card { flex: 1; text-align: center; }
.pp-mock-product-img { width: 100%; height: 60px; background: #f5f5f5; border-radius: 4px; margin-bottom: 4px; }
.pp-mock-product-name { font-size: 11px; color: #666; }
.pp-mock-product-price { font-size: 13px; color: #C41E3A; font-weight: 600; }
.pp-mock-groupbuy { background: #fff3e0; color: #e65100; padding: 12px; text-align: center; border-radius: 6px; font-size: 13px; }
.pp-mock-coupon { background: linear-gradient(90deg, #fff7e6, #ffe7ba); color: #d4380d; padding: 12px; text-align: center; border-radius: 6px; font-size: 13px; }
.pp-mock-productlist { background: #f0faf0; padding: 16px; text-align: center; border-radius: 6px; font-size: 13px; color: #52c41a; }
.pp-mock-image { background: #e8e0d5; height: 100px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 13px; color: var(--color-text-secondary); }
.pp-mock-textblock { padding: 16px; text-align: center; font-size: 13px; color: var(--color-text-secondary); }
.pp-mock-recommend { background: #f0f5ff; padding: 16px; text-align: center; border-radius: 6px; font-size: 13px; color: #2f54eb; }
.pp-mock-tabs { border-top: 3px solid #8b4513; padding: 16px; text-align: center; font-size: 13px; color: var(--color-text-secondary); }
</style>

<!-- global styles for fullscreen dialog -->
<style>
.visual-editor-dlg .el-dialog__header { display: none; }
.visual-editor-dlg .el-dialog__body { padding: 0; }
</style>
