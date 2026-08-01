<template>
  <div class="page">
    <div class="toolbar">
      <h3>秒杀活动</h3><el-button
        type="primary"
        @click="openCreate"
      >
        创建活动
      </el-button>
    </div>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        <span style="font-size:13px">展示位置：<b>商城首页秒杀专区</b>、<b>微页面秒杀组件</b>。创建后需点击"开始"才在用户端生效。</span>
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
        prop="name"
        label="活动名称"
        min-width="150"
      />
      <el-table-column
        label="商品"
        min-width="140"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.items?.map((i:any) => i.product?.title || i.productId).join(', ') || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="秒杀价"
        width="140"
      >
        <template #default="{ row }">
          {{ priceRange(row) }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ACTIVE' ? 'success' : 'info'"
            size="small"
          >
            {{ row.status === 'ACTIVE' ? '进行中' : row.status === 'ENDED' ? '已结束' : '未开始' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="活动时间"
        width="300"
      >
        <template #default="{ row }">
          {{ formatDate(row.startTime) }} ~ {{ formatDate(row.endTime) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="220"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="row.status !== 'ACTIVE'"
            size="small"
            type="success"
            @click="startActivity(row)"
          >
            开始
          </el-button>
          <el-button
            v-if="row.status === 'ACTIVE'"
            size="small"
            type="warning"
            @click="endActivity(row)"
          >
            结束
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="del(row.id)"
          >
            删除
          </el-button>
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

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑秒杀' : '创建秒杀'"
      width="550px"
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
            :disabled="!!editingId"
          />
          <div
            v-if="editingId"
            class="field-hint"
          >
            活动名称创建后暂不支持修改
          </div>
        </el-form-item>
        <el-form-item
          v-if="!editingId"
          label="选择商品"
        >
          <ProductPicker v-model="form.productId" />
        </el-form-item>
        <el-form-item
          v-else
          label="秒杀商品"
        >
          <el-select
            v-model="editItemId"
            style="width:100%"
            placeholder="选择要修改价格的商品"
            @change="onEditItemChange"
          >
            <el-option
              v-for="it in editItems"
              :key="it.id || ''"
              :label="(it.product?.title || it.productId || '未知商品') + ' · ¥' + Number(it.flashPrice || 0).toFixed(2)"
              :value="it.id || ''"
            />
          </el-select>
          <div
            v-if="editItems.length > 1"
            class="field-hint"
          >
            该活动含 {{ editItems.length }} 个商品，价格/限购修改仅作用于上方所选商品，其余商品不受影响
          </div>
          <div class="field-hint">
            如需更换/增删商品，请删除活动后重新创建
          </div>
        </el-form-item>
        <el-form-item label="秒杀价">
          <el-input-number
            v-model="form.flashPrice"
            :min="0.01"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="限购数">
          <el-input-number
            v-model="form.limitPerUser"
            :min="1"
            style="width:100%"
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col><el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="展示范围">
          <el-radio-group v-model="form.scope">
            <el-radio value="GLOBAL">
              全平台
            </el-radio><el-radio value="PAGE_ONLY">
              仅指定微页面
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="form.scope === 'PAGE_ONLY'"
          label="关联微页面"
        >
          <el-select
            v-model="form.scopePageId"
            placeholder="选择微页面"
            clearable
            style="width:100%"
          >
            <el-option
              v-for="p in pages"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'
import ProductPicker from '@/components/ProductPicker.vue'

// 微页面下拉选项
interface PageOption { id: string; name?: string }
// axios 错误体
interface ApiError { response?: { data?: { message?: string } } }
// 秒杀商品明细
interface FlashSaleItem { id?: string; productId?: string; flashPrice?: number | string; limitCount?: number; product?: { title?: string } }
// 秒杀活动行：依据表格列与编辑表单访问字段声明
interface FlashSaleRow {
  id: string
  name?: string
  items?: FlashSaleItem[]
  limitPerUser?: number
  startTime?: string
  endTime?: string
  scope?: string
  scopePageId?: string
  status?: string
}

const loading = ref(false); const error = ref(false); const saving = ref(false); const list = ref<FlashSaleRow[]>([]); const total = ref(0); const page = ref(1); const pages = ref<PageOption[]>([])
const vis = ref(false); const editingId = ref('')
const form = reactive<{ name: string; productId: string; flashPrice: number; limitPerUser: number; startTime: string; endTime: string; scope: string; scopePageId: string }>({ name: '', productId: '', flashPrice: 0, limitPerUser: 1, startTime: '', endTime: '', scope: 'GLOBAL', scopePageId: '' })
// 编辑态：多商品活动需先选中要改价的商品（价格/限购走 item 端点，活动本身只支持改时间/展示范围）
const editItems = ref<FlashSaleItem[]>([])
const editItemId = ref('')

onMounted(() => { fetchList(); loadPages() })
async function loadPages() { try { const { data } = await marketingApi.listPages(); pages.value = Array.isArray(data) ? data : (data.items || data.pages || data.data || []) } catch { /* 忽略 */ } }

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
/** 秒杀价区间：单商品显示单价，多商品显示 最低~最高 */
function priceRange(row: FlashSaleRow) {
  const prices = (row.items || []).map(i => Number(i.flashPrice || 0)).filter(n => n > 0)
  if (!prices.length) return '-'
  const min = Math.min(...prices); const max = Math.max(...prices)
  return min === max ? `¥${min.toFixed(2)}` : `¥${min.toFixed(2)} ~ ¥${max.toFixed(2)}`
}

async function fetchList() {
  loading.value = true; error.value = false
  try { const { data } = await marketingApi.listFlashSales({ page: page.value, pageSize: 20 }); list.value = data.items || data.flashSales || data.data || []; total.value = data.total || 0 } catch { list.value = []; error.value = true } finally { loading.value = false }
}
function openCreate() { editingId.value = ''; editItems.value = []; editItemId.value = ''; Object.assign(form, { name: '', productId: '', flashPrice: 0, limitPerUser: 1, startTime: '', endTime: '', scope: 'GLOBAL', scopePageId: '' }); vis.value = true }
function openEdit(row: FlashSaleRow) {
  editingId.value = row.id
  editItems.value = row.items || []
  const first = editItems.value[0]
  editItemId.value = first?.id || ''
  Object.assign(form, { name: row.name, productId: first?.productId || '', flashPrice: Number(first?.flashPrice) || 0, limitPerUser: first?.limitCount ?? 1, startTime: row.startTime || '', endTime: row.endTime || '', scope: row.scope || 'GLOBAL', scopePageId: row.scopePageId || '' })
  vis.value = true
}
/** 切换所选商品时，回填该商品当前的秒杀价/限购数 */
function onEditItemChange(itemId: string) {
  const it = editItems.value.find(i => i.id === itemId)
  if (it) { form.flashPrice = Number(it.flashPrice) || 0; form.limitPerUser = it.limitCount ?? 1 }
}
async function save() {
  if (!form.name) { ElMessage.warning('请输入活动名称'); return }
  saving.value = true
  try {
    if (editingId.value) {
      // 后端 UpdateFlashSaleDto 只接受时间/预热/状态/展示范围；价格与限购走秒杀商品 item 端点
      const payload: Record<string, unknown> = { scope: form.scope, scopePageId: form.scope === 'PAGE_ONLY' ? form.scopePageId : undefined }
      if (form.startTime) payload.startTime = form.startTime
      if (form.endTime) payload.endTime = form.endTime
      await marketingApi.updateFlashSale(editingId.value, payload)
      if (editItemId.value) {
        await marketingApi.updateFlashSaleItem(editingId.value, editItemId.value, { flashPrice: form.flashPrice, limitCount: form.limitPerUser })
      }
      ElMessage.success('已更新')
    } else {
      const payload: Record<string, unknown> = { name: form.name, productId: form.productId || undefined, flashPrice: form.flashPrice || undefined, limitPerUser: form.limitPerUser || undefined, scope: form.scope, scopePageId: form.scope === 'PAGE_ONLY' ? form.scopePageId : undefined }
      if (form.startTime) payload.startTime = form.startTime
      if (form.endTime) payload.endTime = form.endTime
      await marketingApi.createFlashSale(payload)
      ElMessage.success('秒杀活动创建成功，请点击"开始"按钮启用以生效')
    }
    vis.value = false; fetchList()
  } catch (e) { ElMessage.error((e as ApiError)?.response?.data?.message || '操作失败') } finally { saving.value = false }
}
async function startActivity(row: FlashSaleRow) { try { await marketingApi.startFlashSale(row.id); ElMessage.success('秒杀活动已开始'); fetchList() } catch { ElMessage.error('启动失败') } }
async function endActivity(row: FlashSaleRow) { try { await marketingApi.endFlashSale(row.id); ElMessage.success('秒杀活动已结束'); fetchList() } catch { ElMessage.error('结束失败') } }
async function del(id: string) { try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deleteFlashSale(id); ElMessage.success('已删除'); fetchList() } catch { /* 用户取消 */ } }
</script>

<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); } .field-hint { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.5; margin-top: 2px; }</style>
