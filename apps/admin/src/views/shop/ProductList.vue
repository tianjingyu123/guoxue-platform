<template>
  <div class="product-page">
    <PageHeader title="商品管理">
      <template #actions>
        <el-button
          type="primary"
          @click="openCreate"
        >
          添加商品
        </el-button>
      </template>
    </PageHeader>
    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        加载失败，请
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>
    <DataTable
      v-model:page="page"
      :columns="columns"
      :data="products"
      :loading="loading"
      :total="total"
      :page-size="20"
      actions-width="280"
      @change="fetchList"
    >

      <template #image="{ row }">
        <img
          v-if="row.images?.[0]"
          :src="row.images[0]"
          class="thumb"
        >
        <span
          v-else
          class="no-img"
        >无</span>
      </template>
      <template #price="{ row }">
        ¥{{ Number(row.price).toFixed(2) }}
      </template>
      <template #originalPrice="{ row }">
        ¥{{ Number(row.originalPrice).toFixed(2) }}
      </template>
      <template #status="{ row }">
        <el-tag
          :type="statusType(row.status)"
          size="small"
        >
          {{ statusLabel(row.status) }}
        </el-tag>
      </template>
      <template #sceneTags="{ row }">
        <template v-if="row.sceneTags?.length">
          <el-tag
            v-for="t in row.sceneTags"
            :key="t"
            size="small"
            type="warning"
            effect="plain"
            class="scene-tag"
          >
            {{ t }}
          </el-tag>
        </template>
        <span
          v-else
          class="no-img"
        >—</span>
      </template>
      <template #actions="{ row }">
        <el-button
          size="small"
          type="primary"
          @click="openEdit(row)"
        >
          编辑
        </el-button>
        <el-button
          size="small"
          @click="openSkus(row)"
        >
          SKU
        </el-button>
        <el-button
          v-if="row.status !== 'ON_SALE'"
          size="small"
          type="success"
          @click="toggleStatus(row)"
        >
          上架
        </el-button>
        <el-button
          v-else
          size="small"
          type="warning"
          @click="toggleStatus(row)"
        >
          下架
        </el-button>
        <el-button
          size="small"
          type="danger"
          @click="handleDelete(row.id)"
        >
          删除
        </el-button>
      </template>
    </DataTable>

    <!-- 编辑/新建弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑商品' : '添加商品'"
      width="700px"
      top="5vh"
    >
      <el-form
        ref="dialogFormRef"
        :model="form"
        :rules="dialogRules"
        label-width="80px"
      >
        <el-form-item
          label="商品名称"
          required
        >
          <el-input
            v-model="form.title"
            placeholder="商品名称"
          />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="2"
            placeholder="简要描述"
          />
        </el-form-item>
        <el-form-item label="详情">
          <div
            ref="detailEditorEl"
            class="editor-box"
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="价格">
              <el-input-number
                v-model="form.price"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="库存">
              <el-input-number
                v-model="form.stock"
                :min="0"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-select
                v-model="form.status"
                style="width:100%"
              >
                <el-option
                  label="在售"
                  value="ON_SALE"
                /><el-option
                  label="待审"
                  value="PENDING"
                /><el-option
                  label="下架"
                  value="OFF_SHELF"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 逐品站长推广佣金（佣-V2·仅编辑态·按商品利润逐品定·2026-07-04拍板） -->
        <el-form-item
          v-if="editingId"
          label="推广佣金"
        >
          <el-input-number
            v-model="form.commissionRatePct"
            :min="0"
            :max="99"
            :precision="1"
            placeholder="留空=类目默认"
            style="width:180px"
          />
          <span class="rate-hint">
            %（站长推广佣金一档·留空用类目默认{{ form.commissionRatePct != null ? `·站长每单约得 ¥${((form.price * form.commissionRatePct) / 100).toFixed(2)}` : '' }}）
          </span>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="原价">
              <el-input-number
                v-model="form.originalPrice"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分类">
              <el-select
                v-model="form.category"
                placeholder="选择商品分类"
                filterable
                allow-create
                default-first-option
                clearable
                style="width:100%"
              >
                <el-option
                  v-for="c in categories"
                  :key="c.id"
                  :label="c.name"
                  :value="c.name"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="封面">
              <CosImageUpload
                v-model="form.cover"
                tip="点击上传商品封面"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="场景标签">
          <el-select
            v-model="form.sceneTags"
            multiple
            clearable
            placeholder="按客户人生场景打标（可多选·保存即生效）"
            style="width:100%"
          >
            <el-option
              v-for="t in SCENE_TAG_OPTIONS"
              :key="t"
              :label="t"
              :value="t"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="图片">
          <div class="images-area">
            <div
              v-for="(img, i) in form.images"
              :key="i"
              class="img-item"
            >
              <img :src="img"><el-button
                size="small"
                type="danger"
                circle
                @click="form.images.splice(i,1)"
              >
                ✕
              </el-button>
            </div>
            <div class="img-add">
              <el-input
                v-model="imgUrl"
                placeholder="图片URL"
                size="small"
                style="width:180px"
              />
              <el-button
                size="small"
                @click="addImage"
              >
                添加
              </el-button>
              <el-upload
                :show-file-list="false"
                :http-request="uploadImage"
                accept="image/*"
                style="display:inline-block;margin-left:4px"
              >
                <el-button
                  size="small"
                  type="primary"
                  :loading="uploading"
                >
                  上传
                </el-button>
              </el-upload>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveProduct"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- SKU 管理弹窗 -->
    <el-dialog
      v-model="skuVisible"
      title="SKU 管理"
      width="600px"
    >
      <div v-if="skuProduct">
        <p><b>商品：</b>{{ skuProduct.title }}</p>
        <el-table
          :data="skus"
          border
          size="small"
          max-height="300"
        >
          <el-table-column
            label="规格"
            min-width="160"
          >
            <template #default="{ row }">
              {{ specsText(row.specs) }}
            </template>
          </el-table-column>
          <el-table-column
            label="价格"
            width="100"
          >
            <template #default="{ row }">
              ¥{{ Number(row.price).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="stock"
            label="库存"
            width="70"
          />
          <el-table-column
            prop="skuCode"
            label="编码"
            width="100"
          />
          <el-table-column
            label="操作"
            width="80"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                type="danger"
                @click="delSku(row.id)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-divider />
        <el-form
          :model="skuForm"
          inline
        >
          <el-form-item label="规格名">
            <el-input
              v-model="skuKey"
              placeholder="如 颜色"
              size="small"
              style="width:100px"
            />
          </el-form-item>
          <el-form-item label="规格值">
            <el-input
              v-model="skuVal"
              placeholder="如 红色"
              size="small"
              style="width:100px"
            />
          </el-form-item>
          <el-form-item label="价格">
            <el-input-number
              v-model="skuForm.price"
              :min="0"
              :precision="2"
              size="small"
              style="width:120px"
            />
          </el-form-item>
          <el-form-item label="库存">
            <el-input-number
              v-model="skuForm.stock"
              :min="0"
              size="small"
              style="width:80px"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              size="small"
              type="primary"
              @click="addSkuAction"
            >
              添加SKU
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { uploadApi, productApi, api } from '@/api'
import ImageUpload from '@/components/ImageUpload.vue'
import CosImageUpload from '@/components/upload/CosImageUpload.vue'
import DataTable from '@/components/DataTable.vue'
import PageHeader from "@/components/PageHeader.vue"

/** 场景标签白名单（供-P1·与后端 shop.dto PRODUCT_SCENE_TAGS 七值对齐） */
const SCENE_TAG_OPTIONS = ['乔迁新居', '合婚嫁娶', '开业大吉', '本命年', '学业考试', '长辈寿诞', '节气时令'] as const

/** 商品行（字段宽松 optional） */
interface ProductRow {
  id?: string
  title?: string
  price?: number | string
  originalPrice?: number | string
  stock?: number
  salesCount?: number
  status?: string
  images?: string[]
  sceneTags?: string[]
}
/** SKU 行（字段宽松 optional） */
interface SkuRow {
  id?: string
  specs?: Record<string, string | number>
  price?: number | string
  stock?: number
  skuCode?: string
}

const products = ref<ProductRow[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const uploading = ref(false)
// 商品分类下拉数据（来自后端商品分类树 /shop/categories）
const categories = ref<Array<{ id: string; name: string }>>([])
async function loadCategories() {
  try {
    const { data } = await api.get('/shop/categories')
    const flat: Array<{ id: string; name: string }> = []
    const walk = (nodes: any[]) => { (nodes || []).forEach((n: any) => { flat.push({ id: n.id, name: n.name }); if (n.children) walk(n.children) }) }
    walk(Array.isArray(data) ? data : ((data as any)?.items || (data as any)?.list || []))
    categories.value = flat
  } catch { /* 分类加载失败不阻断表单 */ }
}
const acting = ref(false)

const dialogVisible = ref(false)
const editingId = ref('')
const form = reactive({
  title: '', intro: '', detail: '', price: 0, originalPrice: 0, stock: 0,
  cover: '', category: '', images: [] as string[], status: 'ON_SALE' as string,
  sceneTags: [] as string[],
  // 逐品站长推广佣金率（%显示·null=用类目默认·佣-V2·独立端点保存，与 UpdateProductDto 白名单无关）
  commissionRatePct: null as number | null,
})
const dialogFormRef = ref<FormInstance>()
const dialogRules = {
  title: [{ required: true, message: '请输入商品标题', trigger: 'blur' }],
  price: [{ required: true, message: '请输入商品价格', trigger: 'blur' }],
}
const imgUrl = ref('')
const detailEditorEl = ref<HTMLElement | null>(null)
// 第三方 Quill 富文本实例，经全局 window.Quill 引入，无类型声明，保留 any
let detailQuill: any = null

const skuVisible = ref(false)
const skuProduct = ref<ProductRow | null>(null)
const skus = ref<SkuRow[]>([])
const skuKey = ref('')
const skuVal = ref('')
const skuForm = reactive({ price: 0, stock: 0 })

const columns = [
  { prop: "image", label: "图片", width: 80, slot: "image" },
  { prop: "title", label: "商品名", minWidth: 180, showOverflow: true },
  { prop: "price", label: "价格", width: 110, slot: "price" },
  { prop: "originalPrice", label: "原价", width: 80, slot: "originalPrice" },
  { prop: "stock", label: "库存", width: 70 },
  { prop: "salesCount", label: "销量", width: 70 },
  { prop: "status", label: "状态", width: 90, slot: "status" },
  { prop: "sceneTags", label: "场景标签", minWidth: 150, slot: "sceneTags" },
]

onMounted(() => { fetchList(); loadCategories() })

function statusLabel(s: string) { return ({ ON_SALE: '在售', PENDING: '待审', OFF_SHELF: '下架' } as Record<string, string>)[s] || s }
function statusType(s: string) { return ({ ON_SALE: 'success', PENDING: 'warning', OFF_SHELF: 'info' } as Record<string, string>)[s] || 'info' }
function specsText(s?: Record<string, string | number>) { if (!s) return '-'; return Object.entries(s).map(([k,v]) => `${k}:${v}`).join(' / ') }

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const { data } = await productApi.list({ page: page.value, pageSize: 20 })
    products.value = data.items || data.products || []; total.value = data.total || 0
  } catch {
    products.value = []; total.value = 0; error.value = true
  } finally { loading.value = false }
}

async function fetchProduct(id: string) { const { data } = await productApi.detail(id); return data }

function addImage() { const u = imgUrl.value.trim(); if (u && !form.images.includes(u)) { form.images.push(u); imgUrl.value = '' } }

async function uploadImage(options: { file: File }) {
  uploading.value = true
  try { const { data } = await uploadApi.image(options.file); if (data.url) form.images.push(data.url); ElMessage.success('上传成功') } catch { /* */ } finally { uploading.value = false }
}

function resetForm() {
  Object.assign(form, { title: '', intro: '', detail: '', price: 0, originalPrice: 0, stock: 0, cover: '', category: '', images: [], status: 'ON_SALE', sceneTags: [], commissionRatePct: null })
  editingId.value = ''; imgUrl.value = ''
}

function openCreate() { resetForm(); dialogVisible.value = true; nextTick(() => initEditor()) }

async function openEdit(row: ProductRow) {
  resetForm(); editingId.value = row.id ?? ''
  const p = await fetchProduct(row.id ?? '')
  Object.assign(form, {
    title: p.title, intro: p.intro || '', detail: p.detail || '',
    price: Number(p.price) || 0, originalPrice: Number(p.originalPrice) || 0,
    stock: p.stock || 0, cover: p.cover || '', category: p.category || '',
    images: p.images || [], status: p.status || 'ON_SALE',
    sceneTags: p.sceneTags || [],
    commissionRatePct: p.commissionRate != null ? Math.round(Number(p.commissionRate) * 10000) / 100 : null,
  })
  dialogVisible.value = true; nextTick(() => initEditor())
}

function setupDetailQuill() {
  const Q = (window as any).Quill
  if (!Q || !detailEditorEl.value) return
  if (detailQuill) { detailQuill.root.innerHTML = form.detail || ''; return }
  detailQuill = new Q(detailEditorEl.value, {
    theme: 'snow',
    modules: { toolbar: [['bold','italic','underline'], [{ header:1 },{ header:2 }], [{ list:'ordered' },{ list:'bullet' }], ['link','clean']] },
    placeholder: '商品详情...',
  })
  detailQuill.root.innerHTML = form.detail || ''
  detailQuill.on('text-change', () => { form.detail = detailQuill.root.innerHTML })
}

function initEditor() {
  // 自包含加载 Quill：补 snow 主题 CSS(缺则工具栏方框)+ 按需动态加载 JS(不依赖别的页面先加载过 window.Quill)
  if (!document.getElementById('quill-snow-css')) {
    const link = document.createElement('link')
    link.id = 'quill-snow-css'
    link.rel = 'stylesheet'
    link.href = 'https://cdn.quilljs.com/1.3.7/quill.snow.css'
    document.head.appendChild(link)
  }
  if ((window as any).Quill) { setupDetailQuill(); return }
  if (!document.getElementById('quill-cdn-js')) {
    const script = document.createElement('script')
    script.id = 'quill-cdn-js'
    script.src = 'https://cdn.quilljs.com/1.3.7/quill.min.js'
    script.onload = () => setupDetailQuill()
    document.body.appendChild(script)
  } else {
    const timer = setInterval(() => { if ((window as any).Quill) { clearInterval(timer); setupDetailQuill() } }, 100)
  }
}

async function saveProduct() {
  saving.value = true
  try {
    if (editingId.value) {
      // 更新按 UpdateProductDto 白名单显式取字段（后端 forbidNonWhitelisted·多传即 400·打标即生效）
      const payload = {
        title: form.title, intro: form.intro, detail: form.detail, images: form.images,
        price: form.price, stock: form.stock, status: form.status, sceneTags: form.sceneTags,
      }
      await productApi.update(editingId.value, payload)
      // 佣金率走独立 admin 端点（不在 UpdateProductDto 白名单·商家不可自设）·%转 0-1 小数
      await productApi.setCommissionRate(
        editingId.value,
        form.commissionRatePct != null ? Math.round(form.commissionRatePct * 100) / 10000 : null,
      )
      ElMessage.success('已更新')
    } else {
      // 创建按 CreateProductDto 白名单（无 status 字段·新建默认待审，用列表"上架"按钮流转）
      const payload = {
        title: form.title, intro: form.intro, detail: form.detail, images: form.images,
        price: form.price, originalPrice: form.originalPrice, stock: form.stock,
        cover: form.cover, category: form.category, sceneTags: form.sceneTags,
      }
      await productApi.create(payload); ElMessage.success('已创建')
    }
    dialogVisible.value = false; fetchList()
  } catch { /* */ } finally { saving.value = false }
}

async function toggleStatus(row: ProductRow) {
  if (acting.value) return
  acting.value = true
  const newStatus = row.status === 'ON_SALE' ? 'OFF_SHELF' : 'ON_SALE'
  try {
    await productApi.updateStatus(row.id ?? '', newStatus)
    ElMessage.success(newStatus === 'ON_SALE' ? '已上架' : '已下架')
    fetchList()
  } finally { acting.value = false }
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
    if (acting.value) return
    acting.value = true
    await productApi.delete(id); ElMessage.success('已删除'); fetchList()
  } catch { /* */ } finally { acting.value = false }
}

async function openSkus(row: ProductRow | null) {
  if (!row) return
  skuProduct.value = row
  try { const { data } = await productApi.detail(row.id ?? ''); skus.value = data.items || data.skus || [] } catch { skus.value = [] }
  skuVisible.value = true
}

async function addSkuAction() {
  if (!skuProduct.value) return
  if (acting.value) return
  acting.value = true
  try {
    await productApi.addSku(skuProduct.value.id ?? '', {
      name: skuKey.value.trim() + ':' + skuVal.value.trim(),
      price: skuForm.price, stock: skuForm.stock,
    })
    ElMessage.success('SKU已添加')
    skuKey.value = ''; skuVal.value = ''; skuForm.price = 0; skuForm.stock = 0
    openSkus(skuProduct.value)
  } catch { /* */ } finally { acting.value = false }
}

async function delSku(skuId: string) {
  try {
    await ElMessageBox.confirm('确定删除此SKU？', '提示', { type: 'warning' })
    if (acting.value) return
    acting.value = true
    await productApi.deleteSku(skuId); ElMessage.success('已删除'); openSkus(skuProduct.value)
  } catch { /* */ } finally { acting.value = false }
}
</script>

<style scoped>
.product-page { padding: 0; }
.thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; }
.scene-tag { margin: 0 4px 2px 0; }
.no-img { color: var(--color-text-placeholder); font-size: 11px; }
.editor-box { min-height: 180px; max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; }
.rate-hint { margin-left: 8px; font-size: 12px; color: #909399; }
.images-area { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
.img-item { position: relative; width: 80px; height: 80px; }
.img-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
.img-item .el-button { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; }
.img-add { display: flex; gap: 4px; align-items: center; }
</style>
