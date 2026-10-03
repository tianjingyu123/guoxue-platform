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
        <div style="font-size:13px;line-height:1.7">
          <div><b>微页面 = 独立的促销/活动页</b>，通过路径（如 <b>/promo/spring</b>）在小程序中独立展示，可嵌入轮播、秒杀、拼团、商品、大卡等区块。</div>
          <div style="color:#8b4513">
            使用流程：① 点「创建微页面」填名称与路径 → ② 进入「编辑」拖入组件 → ③ 点「预览」查看效果 → ④ 点「发布」用户即可见；如需临时隐藏点「下线」回到草稿。
          </div>
        </div>
      </template>
    </el-alert>
    <el-alert
      v-if="error"
      type="error"
      title="数据加载失败"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        type="primary"
        @click="fetchList"
      >
        重试
      </el-button>
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
        width="110"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.status === 'PUBLISHED'"
            type="success"
            size="small"
          >
            已发布 · 用户可见
          </el-tag>
          <el-tooltip
            v-else
            content="草稿状态用户不可见。曾发布后「下线」也会回到草稿状态。点「发布」即可上线。"
            placement="top"
          >
            <el-tag
              type="info"
              size="small"
            >
              草稿 · 未上线
            </el-tag>
          </el-tooltip>
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
            size="small"
            type="warning"
            @click="openPreview(row)"
          >
            预览
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
            v-if="row.status === 'PUBLISHED'"
            title="下线后用户将无法访问此页面，确定下线？"
            @confirm="doUnpublish(row)"
          >
            <template #reference>
              <el-button
                size="small"
                type="info"
              >
                下线
              </el-button>
            </template>
          </el-popconfirm>
          <el-button
            size="small"
            @click="openVersions(row)"
          >
            版本
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
      <template #empty>
        <el-empty :description="error ? '加载失败，请重试' : '暂无数据'" />
      </template>
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
            /><span class="entry-glyph">{{ form.entryIcon || '荐' }}</span>
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

              <!-- ═══ 首页原生块：公告条 ═══ -->
              <template v-if="vePropForm.type === 'notice'">
                <el-form-item label="公告文字">
                  <el-input
                    v-model="vePropForm.noticeText"
                    type="textarea"
                    :rows="2"
                    placeholder="公告内容（留空则用上方标题）"
                  />
                </el-form-item>
                <el-form-item label="跳转链接">
                  <el-input
                    v-model="vePropForm.noticeLink"
                    placeholder="可选，如 /pages/xxx 或 https://"
                  />
                </el-form-item>
              </template>

              <!-- ═══ 首页原生块：金刚区（图标导航·可增删项）═══ -->
              <template v-if="vePropForm.type === 'kingkong'">
                <el-form-item label="图标项">
                  <div style="width:100%">
                    <div
                      v-for="(it, i) in vePropForm.kkItems"
                      :key="i"
                      style="border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:8px;position:relative"
                    >
                      <div style="display:flex;gap:6px;margin-bottom:6px">
                        <el-select
                          v-model="it.icon"
                          filterable
                          allow-create
                          placeholder="图标名"
                          size="small"
                          style="flex:1"
                        >
                          <el-option
                            v-for="ic in KINGKONG_ICONS"
                            :key="ic"
                            :label="ic"
                            :value="ic"
                          />
                        </el-select>
                        <el-color-picker
                          v-model="it.color"
                          size="small"
                        />
                        <el-button
                          size="small"
                          type="danger"
                          @click="vePropForm.kkItems.splice(i, 1)"
                        >
                          删
                        </el-button>
                      </div>
                      <el-input
                        v-model="it.label"
                        placeholder="文字标签"
                        size="small"
                        style="margin-bottom:6px"
                      />
                      <el-input
                        v-model="it.link"
                        placeholder="跳转链接，如 /pages/xxx"
                        size="small"
                      />
                    </div>
                    <el-button
                      size="small"
                      type="primary"
                      plain
                      style="width:100%"
                      @click="vePropForm.kkItems.push({ icon: 'grid', label: '', color: '#C41E3A', link: '' })"
                    >
                      + 添加图标
                    </el-button>
                  </div>
                </el-form-item>
              </template>

              <!-- ═══ 首页原生块：横滑专栏（可增删卡片）═══ -->
              <template v-if="vePropForm.type === 'rail'">
                <el-form-item label="更多链接">
                  <el-input
                    v-model="vePropForm.railMoreLink"
                    placeholder="可选，专栏右上角「更多」跳转"
                    size="small"
                  />
                </el-form-item>
                <el-form-item label="专栏卡片">
                  <div style="width:100%">
                    <div
                      v-for="(it, i) in vePropForm.railItems"
                      :key="i"
                      style="border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:8px"
                    >
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                        <span style="font-size:12px;color:#999">卡片 {{ i + 1 }}</span>
                        <el-button
                          size="small"
                          type="danger"
                          @click="vePropForm.railItems.splice(i, 1)"
                        >
                          删
                        </el-button>
                      </div>
                      <el-input
                        v-model="it.cover"
                        placeholder="封面图 URL"
                        size="small"
                        style="margin-bottom:6px"
                      />
                      <el-input
                        v-model="it.title"
                        placeholder="卡片标题"
                        size="small"
                        style="margin-bottom:6px"
                      />
                      <div style="display:flex;gap:6px;margin-bottom:6px">
                        <el-input
                          v-model="it.sub"
                          placeholder="副标题（可选）"
                          size="small"
                        />
                        <el-input
                          v-model="it.price"
                          placeholder="价格（可选）"
                          size="small"
                        />
                      </div>
                      <el-input
                        v-model="it.link"
                        placeholder="跳转链接"
                        size="small"
                      />
                    </div>
                    <el-button
                      size="small"
                      type="primary"
                      plain
                      style="width:100%"
                      @click="vePropForm.railItems.push({ cover: '', title: '', sub: '', price: '', link: '' })"
                    >
                      + 添加卡片
                    </el-button>
                  </div>
                </el-form-item>
              </template>

              <!-- ═══ 首页原生块：2:1 大卡 ═══ -->
              <template v-if="vePropForm.type === 'bigCard'">
                <el-form-item label="封面图">
                  <el-input
                    v-model="vePropForm.bigCover"
                    placeholder="封面图 URL"
                    size="small"
                  />
                </el-form-item>
                <el-form-item label="副标题">
                  <el-input
                    v-model="vePropForm.bigSubtitle"
                    placeholder="可选"
                    size="small"
                  />
                </el-form-item>
                <el-form-item label="价格">
                  <el-input
                    v-model="vePropForm.bigPrice"
                    placeholder="可选，如 99"
                    size="small"
                  />
                </el-form-item>
                <el-form-item label="角标">
                  <el-input
                    v-model="vePropForm.bigTag"
                    placeholder="可选，如 限时"
                    size="small"
                  />
                </el-form-item>
                <el-form-item label="跳转链接">
                  <el-input
                    v-model="vePropForm.bigLink"
                    placeholder="点击大卡跳转"
                    size="small"
                  />
                </el-form-item>
                <el-alert
                  title="大卡主标题使用上方「标题」字段"
                  type="info"
                  :closable="false"
                  style="margin-bottom:8px"
                />
              </template>

              <!-- 其他类型：保留JSON配置 -->
              <el-form-item
                v-if="!['FLASHSALE','GROUPBUY','COUPON','PRODUCT_LIST','FLASHSALE_INDEPENDENT','GROUPBUY_INDEPENDENT','notice','kingkong','rail','bigCard'].includes(vePropForm.type)"
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
                轮播图 Banner
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
                2人拼团 ¥19.9
              </div>
              <!-- 优惠券 -->
              <div
                v-else-if="comp.type === 'COUPON'"
                class="pp-mock-coupon"
              >
                满100减20
              </div>
              <!-- 商品列表 -->
              <div
                v-else-if="comp.type === 'PRODUCT_LIST'"
                class="pp-mock-productlist"
              >
                精选商品网格
              </div>
              <!-- 图片 -->
              <div
                v-else-if="comp.type === 'IMAGE'"
                class="pp-mock-image"
              >
                {{ comp.title || '图片展示' }}
              </div>
              <!-- 文本 -->
              <div
                v-else-if="comp.type === 'TEXT'"
                class="pp-mock-textblock"
              >
                {{ comp.title || '文本内容区域' }}
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
                选项卡内容
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
                {{ comp.config?.minMembers || 2 }}人拼团 ¥{{ comp.config?.groupPrice || '19.9' }}
              </div>
              <!-- 通用 -->
              <div v-else>
                {{ compTypeMap[comp.type] || comp.type }}
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

// axios 错误体
interface ApiError { response?: { data?: { message?: string } } }
// 微页面配置由运营人员自由组合，动态字段集中在这一处兼容旧数据。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DynamicPageConfig = Record<string, any>
interface PageComponent {
  id?: string
  type: string
  title?: string
  config?: DynamicPageConfig
  startTime?: string | null
  endTime?: string | null
  audience?: DynamicPageConfig | null
  sortOrder?: number
  _key?: string
}
// 微页面行：依据表格列与编辑/编辑器访问字段声明
interface PageRow {
  id: string
  name?: string
  title?: string
  route?: string
  path?: string
  description?: string
  status?: string
  version?: number
  createdAt?: string
  components?: PageComponent[]
  entryVisible?: boolean
  entryConfig?: { title?: string; icon?: string; sort?: number } | null
}
// 活动/优惠券下拉选项（秒杀/拼团/优惠券复用）
interface ActivityOption {
  id: string
  name?: string
  productTitle?: string
  groupSize?: number
  minMembers?: number
  threshold?: number | string
  reduction?: number | string
  items?: { flashPrice?: number | string }[]
}
// 版本历史行
interface VersionRow {
  id: string
  version?: number
  comment?: string
  createdAt?: string
  value?: { components?: PageComponent[] }
}

const loading = ref(false); const error = ref(false); const saving = ref(false); const list = ref<PageRow[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const form = reactive({ name: '', route: '', description: '', entryVisible: false, entryTitle: '', entryIcon: '', entrySort: 0 })

const compVis = ref(false); const compFormVis = ref(false); const compEditingId = ref(''); const compSaving = ref(false)
const components = ref<PageComponent[]>([]); const currentPageId = ref('')
const compForm = reactive({ type: 'CAROUSEL', title: '', configStr: '{}', activityIds: [] as string[], productIds: [] as string[], startTime: '' as string, endTime: '' as string, audienceStr: '', independentProductId: '', independentPrice: 9.9, independentStock: 100, independentLimit: 1 })

// 活动选项（用于组件关联选择）
const flashSaleOptions = ref<ActivityOption[]>([])
const groupBuyOptions = ref<ActivityOption[]>([])
const couponOptions = ref<ActivityOption[]>([])

const compTitlePlaceholder = computed(() => {
  const m: Record<string, string> = { FLASHSALE: '如：限时秒杀', GROUPBUY: '如：超值拼团', COUPON: '如：领券中心', PRODUCT_LIST: '如：精选好物', CAROUSEL: '如：首页轮播', COUNTDOWN: '如：活动倒计时', IMAGE: '如：品牌宣传', TEXT: '如：活动说明', TABS: '如：热门分类', RECOMMEND: '如：为你推荐' }
  return m[compForm.type] || '组件标题'
})

const compConfigPlaceholder = computed(() => {
  const m: Record<string, string> = {
    CAROUSEL: '{"images":[{"url":"...","link":"..."}]}', COUNTDOWN: '{"targetTime":"2026-12-31 23:59:59"}', IMAGE: '{"url":"...","link":"..."}', TEXT: '{"content":"HTML内容"}', TABS: '{"tabs":[{"title":"标签1","type":"PRODUCT_LIST"}]}', RECOMMEND: '{"algorithm":"popular","limit":10}',
    // 首页原生块建议在可视化编辑器中配置，此处为 JSON 结构参考
    notice: '{"text":"公告文字","link":"/pages/xxx"}',
    kingkong: '{"items":[{"icon":"book-open","label":"课程","color":"#C41E3A","link":"/pages/xxx"}]}',
    rail: '{"moreLink":"","items":[{"cover":"图URL","title":"标题","sub":"","price":"","link":""}]}',
    bigCard: '{"cover":"图URL","subtitle":"","price":"","tag":"","link":""}',
  }
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

const verVis = ref(false); const versions = ref<VersionRow[]>([])
const prevVis = ref(false); const previewVer = ref<VersionRow | null>(null); const previewComponents = ref<PageComponent[]>([])

// 页面预览
const previewPageVis = ref(false); const previewPageTitle = ref(''); const previewPageComps = ref<PageComponent[]>([])

// 可视化编辑器状态
const veVis = ref(false); const veSaving = ref(false); const vePageTitle = ref('')
const veComponents = ref<PageComponent[]>([]); const veSelectedIdx = ref<number | null>(null); const dragOver = ref(false)
// 首页块子项类型
interface KingkongItem { icon: string; label: string; color: string; link: string }
interface RailItem { cover: string; title: string; sub: string; price: string; link: string }
const vePropForm = reactive({
  type: 'CAROUSEL', title: '', configStr: '{}', activityIds: [] as string[], productIds: [] as string[],
  startTime: '' as string, endTime: '' as string, audienceStr: '',
  independentProductId: '', independentPrice: 9.9, independentStock: 100, independentLimit: 1,
  // ── 首页原生块字段 ──
  noticeText: '', noticeLink: '',                                   // notice
  kkItems: [] as KingkongItem[],                                   // kingkong
  railMoreLink: '', railItems: [] as RailItem[],                   // rail
  bigCover: '', bigSubtitle: '', bigPrice: '', bigTag: '', bigLink: '', // bigCard（title 复用 vePropForm.title）
})

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
  // ── 首页原生块（type 为小写，与 H5 block-renderer 对齐）──
  notice: '公告条', kingkong: '金刚区', rail: '横滑专栏', bigCard: '大卡2:1',
}

// 金刚区可选图标（H5 app-icon 支持的图标名）
const KINGKONG_ICONS = [
  'graduation-cap', 'book-open', 'shopping-bag', 'video', 'radio',
  'users', 'bot', 'compass', 'grid', 'star', 'gift', 'heart',
]

function compIcon(type: string): string {
  const icons: Record<string, string> = {
    CAROUSEL: '轮', COUNTDOWN: '时', FLASHSALE: '秒', GROUPBUY: '拼',
    COUPON: '券', PRODUCT_LIST: '品', RECOMMEND: '荐', IMAGE: '图',
    TEXT: '文', TABS: '签', FLASHSALE_INDEPENDENT: '秒', GROUPBUY_INDEPENDENT: '拼',
    notice: '告', kingkong: '导', rail: '列', bigCard: '卡',
  }
  return icons[type] || '组'
}

let veCompKey = 0

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const { data } = await marketingApi.listPages()
    // 后端 listPages 返回裸数组（经拦截器解包后 data 即数组）；同时兼容分页包裹结构
    const rows = Array.isArray(data) ? data : (data.items || data.pages || data.data || [])
    list.value = rows
    total.value = Array.isArray(data) ? rows.length : (data.total || rows.length)
  } catch { list.value = []; error.value = true } finally { loading.value = false }
}

function openCreate() { editingId.value = ''; Object.assign(form, { name: '', route: '', description: '', entryVisible: false, entryTitle: '', entryIcon: '', entrySort: 0 }); vis.value = true }
async function save() {
  if (!form.name) { ElMessage.warning('请输入页面名称'); return }
  if (!form.route) { ElMessage.warning('请输入路由路径（如 /promo），用户通过此路径访问页面'); return }
  saving.value = true
  try {
    const payload: Record<string, unknown> = {
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
  } catch (e) {
    ElMessage.error((e as ApiError)?.response?.data?.message || '操作失败，请重试')
  } finally { saving.value = false }
}

async function doPublish(row: PageRow) {
  try { await marketingApi.publishPage(row.id); ElMessage.success('已发布'); fetchList() } catch { ElMessage.error('发布失败') }
}

async function del(id: string) {
  try { await marketingApi.deletePage(id); ElMessage.success('已删除'); fetchList() } catch { ElMessage.error('删除失败') }
}

// ───────── 组件管理（列表模式） ─────────
function openCompCreate() {
  compEditingId.value = ''
  Object.assign(compForm, { type: 'CAROUSEL', title: '', configStr: '{}', activityIds: [], productIds: [], startTime: '', endTime: '', audienceStr: '', independentProductId: '', independentPrice: 9.9, independentStock: 100, independentLimit: 1 })
  fetchActivityOptions()
  compFormVis.value = true
}

function formatDateTime(d?: string | null) {
  if (!d) return ''
  const dt = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
}

function openCompEdit(row: PageComponent) {
  compEditingId.value = row.id ?? ''
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
  // 根据组件类型构建 config（任意 JSON 配置）
  let config: Record<string, unknown> = {}
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
  let audience: Record<string, unknown> | null = null
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
    components.value = data.items || data.components || []
  } catch { ElMessage.error('组件保存失败') } finally { compSaving.value = false }
}

async function delComp(compId: string) {
  try {
    await ElMessageBox.confirm('删除该组件？', '提示', { type: 'warning' })
    await marketingApi.deletePageComponent(currentPageId.value, compId)
    ElMessage.success('已删除')
    const { data } = await marketingApi.getPage(currentPageId.value)
    components.value = data.items || data.components || []
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
  const ids = components.value.map(c => c.id).filter((id): id is string => !!id)
  try { await marketingApi.sortPageComponents(currentPageId.value, { componentIds: ids }); ElMessage.success('排序已保存') } catch { ElMessage.error('排序保存失败') }
}

// ───────── 可视化编辑器 ─────────
async function openVisualEditor(row: PageRow) {
  currentPageId.value = row.id
  vePageTitle.value = row.title ?? row.name ?? ''
  try {
    const { data } = await marketingApi.getPage(row.id)
    veComponents.value = ((data.components || []) as PageComponent[]).map((c: PageComponent) => ({ ...c, _key: `comp_${veCompKey++}` }))
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
    // ── 首页原生块回填 ──
    noticeText: cfg.text || '',
    noticeLink: cfg.link || '',
    kkItems: Array.isArray(cfg.items)
      ? cfg.items.map((it: DynamicPageConfig) => ({ icon: it.icon || 'grid', label: it.label || '', color: it.color || '#C41E3A', link: it.link || '' }))
      : [],
    railMoreLink: cfg.moreLink || '',
    railItems: Array.isArray(cfg.items)
      ? cfg.items.map((it: DynamicPageConfig) => ({ cover: it.cover || it.image || '', title: it.title || '', sub: it.sub || it.subtitle || '', price: it.price || '', link: it.link || '' }))
      : [],
    bigCover: cfg.cover || cfg.image || '',
    bigSubtitle: cfg.subtitle || '',
    bigPrice: cfg.price || '',
    bigTag: cfg.tag || '',
    bigLink: cfg.link || '',
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
  // ── 首页原生块：产出与 H5 block-renderer 对齐的 config ──
  else if (t === 'notice') comp.config = { text: vePropForm.noticeText, link: vePropForm.noticeLink }
  else if (t === 'kingkong') comp.config = { items: vePropForm.kkItems.map(it => ({ icon: it.icon, label: it.label, color: it.color, link: it.link })) }
  else if (t === 'rail') comp.config = { moreLink: vePropForm.railMoreLink, items: vePropForm.railItems.map(it => ({ cover: it.cover, title: it.title, sub: it.sub, price: it.price, link: it.link })) }
  else if (t === 'bigCard') comp.config = { cover: vePropForm.bigCover, title: vePropForm.title, subtitle: vePropForm.bigSubtitle, price: vePropForm.bigPrice, tag: vePropForm.bigTag, link: vePropForm.bigLink }
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
  () => vePropForm.independentStock, () => vePropForm.independentLimit,
  // ── 首页原生块字段（深度监听 items 数组）──
  () => vePropForm.noticeText, () => vePropForm.noticeLink,
  () => vePropForm.kkItems, () => vePropForm.railMoreLink, () => vePropForm.railItems,
  () => vePropForm.bigCover, () => vePropForm.bigSubtitle, () => vePropForm.bigPrice,
  () => vePropForm.bigTag, () => vePropForm.bigLink], () => {
  veSyncProps()
}, { deep: true })

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
    // 保存组件后刷新列表，使「组件数」等信息立即更新
    fetchList()
  } catch { ElMessage.error('保存失败') } finally { veSaving.value = false }
}

async function vePublish() {
  await veSave()
  try { await marketingApi.publishPage(currentPageId.value); ElMessage.success('已发布'); fetchList() } catch { ElMessage.error('发布失败') }
}

// 下线/停用：把已发布页改回草稿态，用户即不可见
async function doUnpublish(row: PageRow) {
  try {
    await marketingApi.updatePage(row.id, { status: 'DRAFT' })
    ElMessage.success('已下线，用户不再可见')
    fetchList()
  } catch (e) {
    ElMessage.error((e as ApiError)?.response?.data?.message || '下线失败')
  }
}

// 渲染预览组件
function veRenderComp(comp: PageComponent) {
  const type = comp.type
  if (type === 'CAROUSEL') return veCarouselComp
  if (type === 'COUNTDOWN') return veCountdownComp
  if (type === 'IMAGE') return veImageComp
  if (type === 'TEXT') return veTextComp
  if (type === 'TABS') return veTabsComp
  if (type === 'FLASHSALE_INDEPENDENT') return veFlashIndependentComp
  if (type === 'GROUPBUY_INDEPENDENT') return veGroupIndependentComp
  if (type === 'notice') return veNoticeComp
  if (type === 'kingkong') return veKingkongComp
  if (type === 'rail') return veRailComp
  if (type === 'bigCard') return veBigCardComp
  return veGenericComp
}

// ── 首页原生块预览 ──
type PreviewRenderContext = { comp?: PageComponent }

const veNoticeComp = {
  props: ['comp'],
  render(ctx: PreviewRenderContext) {
    const cfg = ctx.comp?.config || {}
    return h('div', { style: { margin: '8px 12px', padding: '10px 14px', background: 'rgba(201,169,110,0.14)', borderRadius: '8px', color: '#8A6D3B', fontSize: '13px' } },
      ctx.comp?.title || cfg.text || '公告文字')
  },
}
const veKingkongComp = {
  props: ['comp'],
  render(ctx: PreviewRenderContext) {
    const cfg = ctx.comp?.config || {}
    const items = Array.isArray(cfg.items) ? cfg.items : []
    return h('div', { style: { padding: '12px 8px' } }, [
      ctx.comp?.title ? h('div', { style: { fontSize: '13px', fontWeight: 700, padding: '0 8px 8px' } }, ctx.comp.title) : null,
      h('div', { style: { display: 'flex', flexWrap: 'wrap' } },
        (items.length ? items : [null, null, null, null, null]).map((it: DynamicPageConfig | null) =>
          h('div', { style: { width: '20%', textAlign: 'center', marginBottom: '10px', fontSize: '11px' } }, [
            h('div', { style: { width: '38px', height: '38px', margin: '0 auto 4px', borderRadius: '10px', background: (it?.color || '#C41E3A') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: it?.color || '#C41E3A' } }, it?.icon ? '●' : ''),
            h('div', { style: { color: '#333' } }, it?.label || '图标'),
          ])
        )
      ),
    ])
  },
}
const veRailComp = {
  props: ['comp'],
  render(ctx: PreviewRenderContext) {
    const cfg = ctx.comp?.config || {}
    const items = Array.isArray(cfg.items) ? cfg.items : []
    return h('div', { style: { padding: '8px 0' } }, [
      h('div', { style: { fontSize: '13px', fontWeight: 700, padding: '0 12px 8px' } }, ctx.comp?.title || '横滑专栏'),
      h('div', { style: { display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 12px' } },
        (items.length ? items : [null, null]).map((it: DynamicPageConfig | null) =>
          h('div', { style: { flexShrink: 0, width: '110px', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden' } }, [
            h('div', { style: { width: '100%', height: '80px', background: '#f2efea', backgroundImage: it?.cover ? `url(${it.cover})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' } }),
            h('div', { style: { padding: '6px 8px', fontSize: '12px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, it?.title || '卡片标题'),
            it?.price ? h('div', { style: { padding: '0 8px 6px', fontSize: '12px', color: '#C41E3A', fontWeight: 700 } }, `¥${it.price}`) : null,
          ])
        )
      ),
    ])
  },
}
const veBigCardComp = {
  props: ['comp'],
  render(ctx: PreviewRenderContext) {
    const cfg = ctx.comp?.config || {}
    const cover = cfg.cover || cfg.image || ''
    return h('div', { style: { margin: '8px 12px', position: 'relative', borderRadius: '10px', overflow: 'hidden', height: '120px', background: '#f2efea', backgroundImage: cover ? `url(${cover})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' } }, [
      h('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(20,15,10,0.7), transparent 60%)' } }),
      cfg.tag ? h('span', { style: { position: 'absolute', top: '8px', left: '8px', fontSize: '11px', color: '#fff', background: 'rgba(180,140,70,0.95)', borderRadius: '5px', padding: '2px 8px' } }, cfg.tag) : null,
      h('div', { style: { position: 'absolute', left: '12px', right: '12px', bottom: '10px', color: '#fff' } }, [
        h('div', { style: { fontSize: '16px', fontWeight: 700 } }, ctx.comp?.title || cfg.title || '大卡标题'),
        cfg.price ? h('span', { style: { fontSize: '15px', fontWeight: 700, color: '#FFD98A' } }, `¥${cfg.price}`) : null,
        cfg.subtitle ? h('span', { style: { fontSize: '12px', marginLeft: '8px', opacity: 0.9 } }, cfg.subtitle) : null,
      ]),
    ])
  },
}

const veFlashIndependentComp = {
  props: ['comp'],
  render(ctx: PreviewRenderContext) {
    const cfg = ctx.comp?.config || {}
    return h('div', { class: 've-mock ve-mock-countdown' }, [
      h('span', { style: { fontWeight: 'bold' } }, `⚡ 独立秒杀 — ¥${cfg.flashPrice || '?'}`),
      h('span', { style: { fontSize: '10px', display: 'block', marginTop: '4px', opacity: 0.8 } }, `库存${cfg.stock || 0} | 限购${cfg.limitPerUser || 0}`),
    ])
  },
}
const veGroupIndependentComp = {
  props: ['comp'],
  render(ctx: PreviewRenderContext) {
    const cfg = ctx.comp?.config || {}
    return h('div', { class: 've-mock', style: { background: 'linear-gradient(135deg, #fff8f0, #ffeedd)', color: '#e67e22' } }, [
      h('span', { style: { fontWeight: 'bold' } }, `独立拼团 — ¥${cfg.groupPrice || '?'}`),
      h('span', { style: { fontSize: '10px', display: 'block', marginTop: '4px' } }, `${cfg.minMembers || 2}人成团 | 库存${cfg.stock || 0}`),
    ])
  },
}

const veCarouselComp = { render() { return h('div', { class: 've-mock ve-mock-carousel' }, [h('span', '轮播图 — Banner轮播')]) } }
const veCountdownComp = { render() { return h('div', { class: 've-mock ve-mock-countdown' }, [h('span', '⏰ 倒计时组件')]) } }
const veImageComp = { render() { return h('div', { class: 've-mock ve-mock-image' }, [h('span', '图片组件')]) } }
const veTextComp = { render() { return h('div', { class: 've-mock ve-mock-text' }, [h('span', '文本内容区域')]) } }
const veTabsComp = { render() { return h('div', { class: 've-mock ve-mock-tabs' }, [h('span', '选项卡切换')]) } }
const veGenericComp = {
  props: ['comp'],
  render(ctx: PreviewRenderContext) {
    const type = ctx.comp?.type || ''
    const label = compTypeMap[type] || type || '未知组件'
    return h('div', { class: 've-mock ve-mock-generic' }, [
      h('span', `${compIcon(ctx.comp?.type || '')} ${label}`),
      h('span', { style: { fontSize: '10px', color: '#999', display: 'block' } }, ctx.comp?.title || ''),
    ])
  },
}

// ───────── 版本管理 ─────────
async function openVersions(row: PageRow) {
  currentPageId.value = row.id
  try { const { data } = await marketingApi.getPageVersions(row.id); versions.value = data || [] } catch { versions.value = [] }
  verVis.value = true
}

function previewVersion(row: VersionRow) {
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
async function openPreview(row: PageRow) {
  previewPageTitle.value = row.title ?? row.name ?? ''
  previewPageComps.value = []
  previewPageVis.value = true
  try {
    const { data } = await marketingApi.getPage(row.id)
    previewPageComps.value = data.items || data.components || []
  } catch { previewPageComps.value = [] }
}
</script>

<style scoped>
.page { padding: 0; }
.entry-glyph { display: inline-grid; width: 30px; height: 30px; margin-left: 8px; place-items: center; border-radius: 9px; color: #8a6331; background: rgba(184,137,63,.1); font-size: 14px; font-weight: 700; }
.toolbar { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; margin-bottom: 18px; padding-left: 13px; border-left: 4px solid var(--color-primary); }
.toolbar h3 { margin: 0; font-size: 25px; font-weight: 680; letter-spacing: -.025em; color: var(--color-text-title); }

/* ═══ 可视化编辑器 ═══ */
.ve-toolbar { display: flex; justify-content: space-between; align-items: center; min-height: 64px; padding: 10px 18px; background: rgba(255,255,255,.94); border-bottom: 1px solid var(--color-divider); box-shadow: 0 6px 18px rgba(16,34,55,.05); backdrop-filter: blur(16px); position: sticky; top: 0; z-index: 10; }
.ve-tbar-left { display: flex; align-items: center; gap: 12px; }
.ve-page-name { max-width: 360px; overflow: hidden; font-size: 17px; font-weight: 680; color: var(--color-text-title); text-overflow: ellipsis; white-space: nowrap; }
.ve-tbar-right { display: flex; gap: 8px; }

.ve-body { display: flex; height: calc(100vh - 64px); overflow: hidden; }

/* 左侧组件库 */
.ve-left { width: 208px; background: #f4f6f8; border-right: 1px solid var(--color-divider); overflow-y: auto; flex-shrink: 0; }
.ve-left-title { padding: 17px 14px 9px; font-size: 12px; color: var(--color-text-secondary); font-weight: 650; }
.ve-comp-lib { padding: 0 10px 16px; }
.ve-comp-item { display: flex; align-items: center; gap: 9px; min-height: 42px; padding: 8px 10px; margin-bottom: 5px; border-radius: 10px; cursor: grab; background: rgba(255,255,255,.82); border: 1px solid #e2e7ed; transition: border-color .15s, background .15s, box-shadow .15s; user-select: none; }
.ve-comp-item:hover { border-color: #aebbc8; background: #fff; box-shadow: 0 5px 14px rgba(19,38,60,.07); }
.ve-comp-item:active { cursor: grabbing; }
.ve-comp-icon { display: grid; width: 26px; height: 26px; place-items: center; border-radius: 7px; background: #edf1f4; font-size: 15px; }
.ve-comp-label { font-size: 12px; color: #4d596b; }

/* 中间预览区 */
.ve-center { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 28px; background-color: #e9edf1; background-image: linear-gradient(rgba(56,76,98,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(56,76,98,.055) 1px, transparent 1px); background-size: 24px 24px; overflow-y: auto; }
.ve-phone-frame { width: min(375px, 100%); background: var(--color-bg-card); border: 8px solid #19283a; border-radius: 28px; box-shadow: 0 24px 56px rgba(17,34,55,.22), 0 0 0 1px rgba(255,255,255,.8); overflow: hidden; }
.ve-phone-status { background: #19283a; color: rgba(255,255,255,.88); text-align: center; padding: 8px; font-size: 11px; }
.ve-phone-body { min-height: 500px; padding: 0; position: relative; }
.ve-phone-body.ve-drag-over { outline: 2px dashed var(--color-primary); outline-offset: -3px; background: rgba(180,35,62,.025); }
.ve-drop-hint { display: flex; align-items: center; justify-content: center; height: 400px; color: var(--color-text-placeholder); font-size: 13px; text-align: center; line-height: 1.8; }

.ve-render-comp { position: relative; border-bottom: 1px dashed #eee; cursor: pointer; transition: all 0.15s; }
.ve-render-comp:hover { background: rgba(82,120,157,.035); }
.ve-render-comp.ve-selected { outline: 2px solid var(--color-primary); outline-offset: -2px; background: rgba(180,35,62,.035); }
.ve-comp-actions { display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(0,0,0,0.03); }
.ve-comp-idx { width: 20px; height: 20px; border-radius: 6px; background: var(--color-ink); color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; }
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
.ve-right { width: 326px; background: #fbfcfd; border-left: 1px solid var(--color-divider); overflow-y: auto; padding: 18px; flex-shrink: 0; }
.ve-right-title { font-size: 15px; font-weight: 680; color: var(--color-text-title); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--color-divider); }
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

@media (max-width: 900px) {
  .toolbar { align-items: flex-start; flex-direction: column; }
  .ve-toolbar { align-items: flex-start; flex-direction: column; }
  .ve-tbar-left, .ve-tbar-right { width: 100%; flex-wrap: wrap; }
  .ve-body { height: calc(100vh - 112px); flex-direction: column; overflow: auto; }
  .ve-left { width: 100%; overflow: visible; border-right: 0; border-bottom: 1px solid var(--color-divider); }
  .ve-left-title { padding: 10px 12px 6px; }
  .ve-comp-lib { display: flex; gap: 6px; padding: 0 10px 10px; overflow-x: auto; }
  .ve-comp-item { min-width: 122px; margin-bottom: 0; }
  .ve-center { min-height: 640px; flex: 0 0 auto; padding: 18px; }
  .ve-right { width: 100%; overflow: visible; border-top: 1px solid var(--color-divider); border-left: 0; }
}
</style>

<!-- global styles for fullscreen dialog -->
<style>
.visual-editor-dlg.el-dialog { max-height: 100vh; border: 0; border-radius: 0 !important; }
.visual-editor-dlg .el-dialog__header { display: none; }
.visual-editor-dlg .el-dialog__body { padding: 0; overflow: hidden; }
</style>
