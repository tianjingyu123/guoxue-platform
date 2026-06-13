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
              <el-input
                v-model="form.category"
                placeholder="商品分类"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="封面">
              <ImageUpload v-model="form.cover" />
            </el-form-item>
          </el-col>
        </el-row>
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
import { uploadApi, productApi } from '@/api'
import ImageUpload from '@/components/ImageUpload.vue'
import DataTable from '@/components/DataTable.vue'
import PageHeader from "@/components/PageHeader.vue"

const products = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)

const dialogVisible = ref(false)
const editingId = ref('')
const form = reactive({
  title: '', intro: '', detail: '', price: 0, originalPrice: 0, stock: 0,
  cover: '', category: '', images: [] as string[], status: 'ON_SALE' as string,
})
const dialogFormRef = ref<any>(null)
const dialogRules = {
  title: [{ required: true, message: '请输入商品标题', trigger: 'blur' }],
  price: [{ required: true, message: '请输入商品价格', trigger: 'blur' }],
}
const imgUrl = ref('')
const detailEditorEl = ref<HTMLElement | null>(null)
let detailQuill: any = null

const skuVisible = ref(false)
const skuProduct = ref<any>(null)
const skus = ref<any[]>([])
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
]

onMounted(() => fetchList())

function statusLabel(s: string) { return ({ ON_SALE: '在售', PENDING: '待审', OFF_SHELF: '下架' } as Record<string, string>)[s] || s }
function statusType(s: string) { return ({ ON_SALE: 'success', PENDING: 'warning', OFF_SHELF: 'info' } as Record<string, string>)[s] || 'info' }
function specsText(s: any) { if (!s) return '-'; return Object.entries(s).map(([k,v]) => `${k}:${v}`).join(' / ') }

async function fetchList() {
  loading.value = true
  try {
    const { data } = await productApi.list({ page: page.value, pageSize: 20 })
    products.value = data.products; total.value = data.total
  } finally { loading.value = false }
}

async function fetchProduct(id: string) { const { data } = await productApi.detail(id); return data }

function addImage() { const u = imgUrl.value.trim(); if (u && !form.images.includes(u)) { form.images.push(u); imgUrl.value = '' } }

async function uploadImage(options: any) {
  uploading.value = true
  try { const { data } = await uploadApi.image(options.file); if (data.url) form.images.push(data.url); ElMessage.success('上传成功') } catch { /* */ } finally { uploading.value = false }
}

function resetForm() {
  Object.assign(form, { title: '', intro: '', detail: '', price: 0, originalPrice: 0, stock: 0, cover: '', category: '', images: [], status: 'ON_SALE' })
  editingId.value = ''; imgUrl.value = ''
}

function openCreate() { resetForm(); dialogVisible.value = true; nextTick(() => initEditor()) }

async function openEdit(row: any) {
  resetForm(); editingId.value = row.id
  const p = await fetchProduct(row.id)
  Object.assign(form, {
    title: p.title, intro: p.intro || '', detail: p.detail || '',
    price: Number(p.price) || 0, originalPrice: Number(p.originalPrice) || 0,
    stock: p.stock || 0, cover: p.cover || '', category: p.category || '',
    images: p.images || [], status: p.status || 'ON_SALE',
  })
  dialogVisible.value = true; nextTick(() => initEditor())
}

function initEditor() {
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

async function saveProduct() {
  saving.value = true
  try {
    const payload = { ...form }
    if (editingId.value) { await productApi.update(editingId.value, payload); ElMessage.success('已更新') }
    else { await productApi.create(payload); ElMessage.success('已创建') }
    dialogVisible.value = false; fetchList()
  } catch { /* */ } finally { saving.value = false }
}

async function toggleStatus(row: any) {
  const newStatus = row.status === 'ON_SALE' ? 'OFF_SHELF' : 'ON_SALE'
  await productApi.updateStatus(row.id, newStatus)
  ElMessage.success(newStatus === 'ON_SALE' ? '已上架' : '已下架')
  fetchList()
}

async function handleDelete(id: string) {
  try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await productApi.delete(id); ElMessage.success('已删除'); fetchList() } catch { /* */ }
}

async function openSkus(row: any) {
  skuProduct.value = row
  try { const { data } = await productApi.detail(row.id); skus.value = data.skus || [] } catch { skus.value = [] }
  skuVisible.value = true
}

async function addSkuAction() {
  if (!skuProduct.value) return
  try {
    await productApi.addSku(skuProduct.value.id, {
      name: skuKey.value.trim() + ':' + skuVal.value.trim(),
      price: skuForm.price, stock: skuForm.stock,
    })
    ElMessage.success('SKU已添加')
    skuKey.value = ''; skuVal.value = ''; skuForm.price = 0; skuForm.stock = 0
    openSkus(skuProduct.value)
  } catch { /* */ }
}

async function delSku(skuId: string) {
  try { await ElMessageBox.confirm('确定删除此SKU？', '提示', { type: 'warning' }); await productApi.deleteSku(skuId); ElMessage.success('已删除'); openSkus(skuProduct.value) } catch { /* */ }
}
</script>

<style scoped>
.product-page { padding: 0; }
.thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; }
.no-img { color: var(--color-text-placeholder); font-size: 11px; }
.editor-box { min-height: 180px; max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; }
.images-area { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
.img-item { position: relative; width: 80px; height: 80px; }
.img-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
.img-item .el-button { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; }
.img-add { display: flex; gap: 4px; align-items: center; }
</style>
