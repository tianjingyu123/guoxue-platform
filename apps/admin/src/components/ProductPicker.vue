<template>
  <div class="product-picker">
    <div
      class="pp-trigger"
      @click="open"
    >
      <template v-if="selectedProducts.length">
        <el-tag
          v-for="p in selectedProducts"
          :key="p.id"
          closable
          size="small"
          type="info"
          @close.stop="removeProduct(p.id)"
        >
          {{ p.title }}
        </el-tag>
      </template>
      <span
        v-else
        class="pp-placeholder"
      >{{ placeholder }}</span>
      <el-icon class="pp-icon">
        <component :is="'ArrowDown'" />
      </el-icon>
    </div>

    <el-dialog
      v-model="vis"
      :title="multiple ? '选择商品（可多选）' : '选择商品'"
      width="780px"
      destroy-on-close
    >
      <div class="pp-dialog">
        <!-- 搜索栏 -->
        <div class="pp-search">
          <el-input
            v-model="keyword"
            placeholder="搜索商品名称"
            clearable
            @keyup.enter="search"
            @clear="search"
          >
            <template #prefix>
              <el-icon><component :is="'Search'" /></el-icon>
            </template>
          </el-input>
        </div>

        <div class="pp-body">
          <!-- 左侧分类 -->
          <div class="pp-cats">
            <div class="pp-cat-title">
              商品分类
            </div>
            <div
              class="pp-cat-item"
              :class="{ active: !activeCatId }"
              @click="selectCat('')"
            >
              全部分类
            </div>
            <template
              v-for="cat in catTree"
              :key="cat.id"
            >
              <div
                class="pp-cat-item"
                :class="{ active: activeCatId === cat.id }"
                @click="selectCat(cat.id)"
              >
                {{ cat.name }}
              </div>
              <div
                v-for="child in cat.children"
                :key="child.id"
                class="pp-cat-item pp-cat-child"
                :class="{ active: activeCatId === child.id }"
                @click="selectCat(child.id)"
              >
                {{ child.name }}
              </div>
            </template>
          </div>

          <!-- 右侧商品表格 -->
          <div class="pp-table-wrap">
            <el-table
              ref="tableRef"
              v-loading="loading"
              :data="products"
              max-height="360"
              :row-class-name="rowClassName"
              @selection-change="onSelectionChange"
              @row-click="onRowClick"
              @select="onSelectRow"
              @select-all="onSelectAll"
            >
              <!-- 单选列：radio 样式 -->
              <el-table-column
                v-if="!multiple"
                width="44"
                align="center"
              >
                <template #default="{ row }">
                  <span
                    class="pp-radio-dot"
                    :class="{ 'pp-radio-dot--checked': isSelected(row.id) }"
                  >
                    <el-icon
                      v-if="isSelected(row.id)"
                      :size="14"
                    ><component :is="'Check'" /></el-icon>
                  </span>
                </template>
              </el-table-column>
              <!-- 多选列：checkbox -->
              <el-table-column
                v-if="multiple"
                type="selection"
                width="44"
              />
              <el-table-column
                label=""
                width="52"
              >
                <template #default="{ row }">
                  <img
                    v-if="row.images?.[0]"
                    :src="row.images[0]"
                    class="pp-thumb"
                  >
                  <span
                    v-else
                    class="pp-no-img"
                  >无</span>
                </template>
              </el-table-column>
              <el-table-column
                prop="title"
                label="商品名称"
                min-width="200"
                show-overflow-tooltip
              />
              <el-table-column
                label="价格"
                width="90"
              >
                <template #default="{ row }">
                  ¥{{ Number(row.price || 0).toFixed(2) }}
                </template>
              </el-table-column>
              <el-table-column
                label="状态"
                width="70"
              >
                <template #default="{ row }">
                  <el-tag
                    size="small"
                    :type="row.status === 'ON_SALE' ? 'success' : 'info'"
                  >
                    {{ row.status === 'ON_SALE' ? '在售' : row.status === 'PENDING' ? '待审' : '下架' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            <div
              v-if="total > 12"
              style="margin-top:8px;display:flex;justify-content:center"
            >
              <el-pagination
                v-model:current-page="ppage"
                :total="total"
                :page-size="12"
                layout="prev, pager, next"
                small
                @current-change="fetchProducts"
              />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <span style="float:left;color:#8b4513">
          <template v-if="multiple">已选 <b>{{ tempIds.size }}</b> 个商品</template>
          <template v-else>{{ tempIds.size ? '当前已选 1 个商品' : '请点击商品行进行选择' }}</template>
        </span>
        <el-button @click="vis = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirm"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import type { TableInstance } from 'element-plus'
import { productApi } from '@/api'

interface ProductCategory {
  id: string
  name: string
  children?: ProductCategory[]
}

interface ProductOption {
  id: string
  title?: string
  images?: string[]
  price?: number | string
  status?: string
}

interface ProductListResponse {
  products?: ProductOption[]
  data?: ProductOption[]
  total?: number
}

const props = withDefaults(defineProps<{
  modelValue: string | string[]
  multiple?: boolean
  placeholder?: string
}>(), {
  modelValue: () => [],
  multiple: false,
  placeholder: '点击选择商品',
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | string[]): void
}>()

const vis = ref(false)
const loading = ref(false)
const keyword = ref('')
const activeCatId = ref('')
const catTree = ref<ProductCategory[]>([])
const products = ref<ProductOption[]>([])
const total = ref(0)
const ppage = ref(1)
const tableRef = ref<TableInstance>()

// 外部已确认选中的商品对象
const selectedProducts = ref<ProductOption[]>([])
// 弹窗内临时选中的 ID 集合
const tempIds = reactive<Set<string>>(new Set())

onMounted(() => {
  fetchCats()
})

function normalizeIds(v: string | string[]): string[] {
  if (props.multiple) return Array.isArray(v) ? v.filter(Boolean) : []
  return v && typeof v === 'string' ? [v] : []
}

function isSelected(id: string): boolean {
  return tempIds.has(id)
}

function rowClassName({ row }: { row: ProductOption }) {
  return isSelected(row.id) ? 'pp-row-selected' : ''
}

async function fetchCats() {
  try {
    const { data } = await productApi.getCategoryTree()
    catTree.value = (data as ProductCategory[]) || []
  } catch { catTree.value = [] }
}

async function fetchProducts() {
  loading.value = true
  try {
    const { data } = await productApi.list({
      page: ppage.value,
      pageSize: 12,
      categoryId: activeCatId.value || undefined,
      keyword: keyword.value || undefined,
    })
    const payload = data as ProductListResponse
    products.value = payload.products || payload.data || []
    total.value = payload.total || 0
    // 翻页后恢复勾选状态
    nextTick(() => {
      products.value.forEach(p => {
        if (tempIds.has(p.id)) tableRef.value?.toggleRowSelection(p, true)
      })
    })
  } catch { products.value = [] } finally { loading.value = false }
}

function search() { ppage.value = 1; fetchProducts() }
function selectCat(catId: string) { activeCatId.value = catId; ppage.value = 1; fetchProducts() }

function open() {
  const ids = normalizeIds(props.modelValue)
  tempIds.clear()
  ids.forEach(id => tempIds.add(id))
  vis.value = true
  ppage.value = 1
  keyword.value = ''
  activeCatId.value = ''
  fetchProducts()
}

// 多选：checkbox 变化
function onSelectionChange(rows: ProductOption[]) {
  if (!props.multiple) return
  // 当前页选中的行
  const pageIds = new Set(products.value.map((p) => p.id))
  // 先清理当前页所有 ID
  pageIds.forEach(id => tempIds.delete(id))
  // 再添加选中的
  rows.forEach((r) => tempIds.add(r.id))
}

function onSelectRow(_selection: ProductOption[], row: ProductOption) {
  if (!props.multiple) return
  // Element Plus 多选时 selection 包含所有选中行（跨页累积）
  // row 是当前操作的行
  if (isSelected(row.id)) {
    tempIds.delete(row.id)
  } else {
    tempIds.add(row.id)
  }
}

function onSelectAll(selection: ProductOption[]) {
  if (!props.multiple) return
  const pageIds = new Set(products.value.map((p) => p.id))
  if (selection.length === 0) {
    // 取消全选当前页
    pageIds.forEach(id => tempIds.delete(id))
  } else {
    // 全选当前页
    pageIds.forEach(id => tempIds.add(id))
  }
}

// 单选：点击行
function onRowClick(row: ProductOption) {
  if (props.multiple) {
    // 多选模式点击行 toggle 选中
    tableRef.value?.toggleRowSelection(row)
    return
  }
  // 单选模式
  tempIds.clear()
  tempIds.add(row.id)
}

function removeProduct(id: string) {
  const ids = normalizeIds(props.modelValue)
  const newIds = ids.filter(i => i !== id)
  selectedProducts.value = selectedProducts.value.filter(p => p.id !== id)
  emit('update:modelValue', props.multiple ? newIds : (newIds[0] || ''))
}

function confirm() {
  const ids = Array.from(tempIds)
  // 用当前表格数据构建选中的商品对象
  const selObjs = products.value.filter(p => ids.includes(p.id))
  // 也保留之前已选但不在当前页的商品
  const existing = selectedProducts.value.filter(p => ids.includes(p.id) && !selObjs.find(s => s.id === p.id))
  selectedProducts.value = [...selObjs, ...existing]
  emit('update:modelValue', props.multiple ? ids : (ids[0] || ''))
  vis.value = false
}
</script>

<style scoped>
.product-picker { display: inline-block; min-width: 200px; }
.pp-trigger {
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
  min-height: 32px; padding: 4px 8px; border: 1px solid #dcdfe6; border-radius: 4px;
  cursor: pointer; background: #fff; transition: border-color .2s;
}
.pp-trigger:hover { border-color: #8b4513; }
.pp-placeholder { color: #c0c4cc; font-size: 13px; }
.pp-icon { margin-left: auto; color: #c0c4cc; font-size: 12px; }

.pp-dialog { display: flex; flex-direction: column; gap: 12px; }
.pp-search { }
.pp-body { display: flex; gap: 12px; }
.pp-cats { width: 140px; flex-shrink: 0; border-right: 1px solid #eee; padding-right: 8px; overflow-y: auto; max-height: 400px; }
.pp-cat-title { font-size: 13px; font-weight: 600; color: #8b4513; margin-bottom: 8px; padding: 4px 8px; }
.pp-cat-item { padding: 6px 8px; font-size: 12px; color: #666; cursor: pointer; border-radius: 4px; transition: all .15s; }
.pp-cat-item:hover { background: rgba(139,69,19,0.06); color: #8b4513; }
.pp-cat-item.active { background: rgba(139,69,19,0.12); color: #8b4513; font-weight: 600; }
.pp-cat-child { padding-left: 20px; font-size: 11px; }
.pp-table-wrap { flex: 1; min-width: 0; }
.pp-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 4px; }
.pp-no-img { display: inline-block; width: 36px; height: 36px; background: #f5f5f5; border-radius: 4px; text-align: center; line-height: 36px; color: #ccc; font-size: 10px; }

/* 单选 radio 样式圆点 */
.pp-radio-dot {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid #dcdfe6; transition: all .2s;
}
.pp-radio-dot--checked {
  border-color: #8b4513; background: #8b4513; color: #fff;
}

/* 选中行的样式 */
:deep(.pp-row-selected) {
  background-color: rgba(139, 69, 19, 0.08) !important;
}
:deep(.pp-row-selected td) {
  border-bottom-color: rgba(139, 69, 19, 0.15) !important;
}
:deep(.pp-row-selected:hover td) {
  background-color: rgba(139, 69, 19, 0.12) !important;
}
</style>
