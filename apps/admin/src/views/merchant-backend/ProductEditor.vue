<script setup lang="ts">
/**
 * 商家后台·商品发布/编辑页（2026-07-11 董事长点名重做）
 *
 * 设计要点（对应董事长痛点）：
 * 1. 商品编辑以"图"为主而非富文本：详情区默认=详情图序列（上传+拖拽排序），
 *    富文本降级为可选的「图文补充说明」折叠块。
 * 2. 图片用途明确三分区：封面（1张·列表展示）/ 轮播图（商品页顶部轮播·可拖拽排序）/
 *    详情图（按顺序拼成商品详情·可拖拽排序）。
 * 3. 价格逻辑梳理：单规格只填一个售价；开启「多规格」后按规格填价，
 *    商品售价自动取最低规格价（后端 Product.price=min(sku.price)·提交侧计算·不改后端）。
 * 4. SKU 表格行内编辑，增删行方便。
 * 5. 右侧常驻手机壳实时预览，编辑即所见。
 *
 * 字段落库映射（后端端点/审核流不变）：
 * - 封面+轮播 → Product.images（images[0]=封面·其余=轮播）
 * - 详情图+补充说明 → Product.detail（HTML：<img> 序列 + 富文本·编辑时按"起始连续图片"还原拆分）
 * - 商品创建/更新 → /merchant-backend/products（MerchantProductDto）
 * - SKU 增删 → /shop/products/:id/skus + /shop/skus/:skuId（owner 校验·无更新端点·改=删+重建）
 */
import { ref, reactive, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { Plus, Delete, InfoFilled } from "@element-plus/icons-vue";
import { merchantBackendApi, productApi } from "@/api";
import CosImageUpload from "@/components/upload/CosImageUpload.vue";
import ImageListUpload from "@/components/upload/ImageListUpload.vue";
import RichEditor from "@/components/editor/RichEditor.vue";

const props = defineProps<{
  modelValue: boolean;
  /** 空字符串 = 新建 */
  productId?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [boolean]; saved: [] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit("update:modelValue", v),
});

/* ══════════════ 表单状态 ══════════════ */

const form = reactive({
  title: "",
  intro: "",
  cover: "",
  carousel: [] as string[],
  detailImages: [] as string[],
  supplement: "", // 图文补充说明（富文本·选填）
  price: null as number | null,
  stock: 0,
  categoryId: "",
  tags: [] as string[],
});

const multiSpec = ref(false);
const supplementOpen = ref<string[]>([]); // el-collapse 展开状态

interface SkuRow {
  id?: string; // 已存在的 SKU 才有
  specName: string;
  specValue: string;
  price: number | null;
  stock: number;
}
const skuRows = ref<SkuRow[]>([]);
/** 打开时的 SKU 快照（保存时 diff：改=删+重建·删=删·新=增） */
let origSkus: Array<SkuRow & { id: string }> = [];

const loading = ref(false);
const saving = ref(false);

/* ── 标签输入 ── */
const tagInputVisible = ref(false);
const tagInputValue = ref("");
function addTag() {
  const val = tagInputValue.value.trim();
  if (val && !form.tags.includes(val)) form.tags.push(val);
  tagInputValue.value = "";
  tagInputVisible.value = false;
}

/* ── 分类树 ── */
interface CategoryNode { id: string; name: string; children?: CategoryNode[] }
const categoryOptions = ref<CategoryNode[]>([]);
const cascaderProps = { value: "id", label: "name", children: "children", checkStrictly: true, emitPath: false };
async function loadCategories() {
  if (categoryOptions.value.length) return;
  try {
    const { data } = await productApi.getCategoryTree();
    const tree = (data as CategoryNode[]) || [];
    // 空 children 置 undefined，避免 cascader 给叶子画展开箭头
    categoryOptions.value = tree.map((n) => ({
      ...n,
      children: n.children?.length ? n.children : undefined,
    }));
  } catch { /* 分类树加载失败不阻塞编辑 */ }
}

/* ══════════════ detail HTML ⇄ 详情图+补充说明 ══════════════ */

function htmlIsEmpty(html: string): boolean {
  if (!html) return true;
  const div = document.createElement("div");
  div.innerHTML = html;
  return !div.textContent?.trim() && !div.querySelector("img,video");
}

/** HTML 属性值转义（详情图 URL 进 src 属性前处理，防属性注入） */
function escapeAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 详情图序列 + 补充富文本 → detail HTML */
function buildDetail(): string {
  const imgHtml = form.detailImages
    .map((u) => `<img src="${escapeAttr(u)}" style="width:100%;display:block;" alt="商品详情图"/>`)
    .join("");
  const sup = htmlIsEmpty(form.supplement) ? "" : form.supplement;
  return imgHtml + sup;
}

/** detail HTML → { 起始连续图片, 其余富文本 }（兼容旧数据：无起始图片则全部进补充说明） */
function parseDetail(html: string): { images: string[]; supplement: string } {
  if (!html) return { images: [], supplement: "" };
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  const images: string[] = [];
  while (body.firstChild) {
    const node = body.firstChild;
    // 空白文本节点跳过
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent?.trim()) { body.removeChild(node); continue; }
      break;
    }
    if (node instanceof HTMLImageElement) {
      const src = node.getAttribute("src");
      if (src) images.push(src);
      body.removeChild(node);
      continue;
    }
    // wangEditor 常把图片包在 <p> 里：仅含一张图的 <p> 也算详情图
    if (node instanceof HTMLElement && node.tagName === "P") {
      const kids = Array.from(node.childNodes).filter(
        (n) => !(n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()) && !(n instanceof HTMLBRElement),
      );
      if (kids.length === 1 && kids[0] instanceof HTMLImageElement) {
        const src = (kids[0] as HTMLImageElement).getAttribute("src");
        if (src) images.push(src);
        body.removeChild(node);
        continue;
      }
      if (kids.length === 0) { body.removeChild(node); continue; } // 空段落
    }
    break; // 遇到第一个非图片内容即停：其余归补充说明
  }
  const supplement = body.innerHTML.trim();
  return { images, supplement: htmlIsEmpty(supplement) ? "" : supplement };
}

/* ══════════════ 加载 ══════════════ */

function resetForm() {
  Object.assign(form, {
    title: "", intro: "", cover: "", carousel: [], detailImages: [],
    supplement: "", price: null, stock: 0, categoryId: "", tags: [],
  });
  multiSpec.value = false;
  skuRows.value = [];
  origSkus = [];
  supplementOpen.value = [];
  tagInputVisible.value = false;
  tagInputValue.value = "";
}

interface SkuData { id: string; specs?: Record<string, string>; price: number | string; stock?: number }
interface ProductDetailData {
  id: string; title?: string; intro?: string; detail?: string;
  images?: string[]; price?: number | string; stock?: number;
  categoryId?: string; tags?: string[]; skus?: SkuData[];
}

async function loadProduct(id: string) {
  loading.value = true;
  try {
    // 走商城详情端点：merchant-backend 详情不含 skus，此端点带 skus 且商品各状态均可取
    const { data } = await productApi.detail(id);
    const p = data as ProductDetailData;
    form.title = p.title || "";
    form.intro = p.intro || "";
    const images = p.images || [];
    form.cover = images[0] || "";
    form.carousel = images.slice(1);
    const parsed = parseDetail(p.detail || "");
    form.detailImages = parsed.images;
    form.supplement = parsed.supplement;
    if (parsed.supplement) supplementOpen.value = ["supplement"];
    form.price = p.price != null ? Number(p.price) : null;
    form.stock = Number(p.stock) || 0;
    form.categoryId = p.categoryId || "";
    form.tags = [...(p.tags || [])];
    // SKU：specs Json → 规格名/规格值（多维规格用 " / " 拼接展示·保存改动时会重建为单维）
    const skus = p.skus || [];
    skuRows.value = skus.map((s) => {
      const entries = Object.entries(s.specs || {});
      return {
        id: s.id,
        specName: entries.map(([k]) => k).join(" / ") || "规格",
        specValue: entries.map(([, v]) => v).join(" / "),
        price: s.price != null ? Number(s.price) : null,
        stock: Number(s.stock) || 0,
      };
    });
    origSkus = skuRows.value.filter((r): r is SkuRow & { id: string } => !!r.id).map((r) => ({ ...r, id: r.id as string }));
    multiSpec.value = skuRows.value.length > 0;
  } catch {
    ElMessage.error("商品加载失败，请重试");
    visible.value = false;
  } finally {
    loading.value = false;
  }
}

watch(visible, (v) => {
  if (!v) return;
  resetForm();
  loadCategories();
  if (props.productId) loadProduct(props.productId);
});

/* ══════════════ SKU 表格 ══════════════ */

function addSkuRow() {
  const last = skuRows.value[skuRows.value.length - 1];
  skuRows.value.push({ specName: last?.specName || "规格", specValue: "", price: null, stock: 0 });
}
function removeSkuRow(idx: number) {
  skuRows.value.splice(idx, 1);
}
watch(multiSpec, (on) => {
  if (on && skuRows.value.length === 0) addSkuRow();
});

/** 多规格下商品级售价 = 最低规格价 */
const minSkuPrice = computed(() => {
  const prices = skuRows.value.map((r) => r.price).filter((p): p is number => p != null && p >= 0);
  return prices.length ? Math.min(...prices) : null;
});
/** 多规格下商品级库存 = 各规格库存之和 */
const totalSkuStock = computed(() => skuRows.value.reduce((sum, r) => sum + (Number(r.stock) || 0), 0));

/* ══════════════ 校验 + 保存 ══════════════ */

function validate(): string | null {
  if (!form.title.trim()) return "请填写商品名称";
  if (!form.cover) return "请上传商品封面（商品列表展示必需）";
  if (form.detailImages.length === 0 && htmlIsEmpty(form.supplement)) {
    return "请至少上传一张详情图，或填写图文补充说明";
  }
  if (multiSpec.value) {
    if (skuRows.value.length === 0) return "多规格模式下请至少添加一个规格";
    for (let i = 0; i < skuRows.value.length; i++) {
      const r = skuRows.value[i];
      if (!r.specValue.trim()) return `第 ${i + 1} 行规格值不能为空`;
      if (r.price == null || r.price < 0) return `第 ${i + 1} 行规格请填写价格`;
    }
    // 同名规格值查重
    const seen = new Set<string>();
    for (const r of skuRows.value) {
      const key = `${r.specName.trim()}:${r.specValue.trim()}`;
      if (seen.has(key)) return `规格「${r.specValue}」重复，请修改`;
      seen.add(key);
    }
  } else {
    if (form.price == null || form.price < 0) return "请填写商品售价";
  }
  return null;
}

/** SKU 同步（diff）：无更新端点·改动的行=删旧+建新 */
async function syncSkus(productId: string): Promise<number> {
  const rows = multiSpec.value ? skuRows.value : []; // 关掉多规格 = 清空全部 SKU
  const keptIds = new Set<string>();
  const toAdd: SkuRow[] = [];
  for (const row of rows) {
    if (row.id) {
      const orig = origSkus.find((o) => o.id === row.id);
      const unchanged = orig && orig.specName === row.specName && orig.specValue === row.specValue
        && orig.price === row.price && orig.stock === row.stock;
      if (unchanged) { keptIds.add(row.id); continue; }
      toAdd.push(row); // 改过：旧的删（下方统一删）·内容重建
    } else {
      toAdd.push(row);
    }
  }
  const toDelete = origSkus.filter((o) => !keptIds.has(o.id));
  let failed = 0;
  for (const sku of toDelete) {
    try { await productApi.deleteSku(sku.id); } catch { failed++; }
  }
  for (const row of toAdd) {
    try {
      await productApi.addSku(productId, {
        name: `${row.specName.trim() || "规格"}:${row.specValue.trim()}`,
        price: row.price as number,
        stock: Number(row.stock) || 0,
      });
    } catch { failed++; }
  }
  return failed;
}

async function save() {
  const err = validate();
  if (err) { ElMessage.warning(err); return; }
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      intro: form.intro.trim(),
      detail: buildDetail(),
      images: [form.cover, ...form.carousel].filter(Boolean),
      // 多规格：商品级售价=最低规格价（列表"¥X起"）·库存=规格库存之和
      price: multiSpec.value ? (minSkuPrice.value ?? 0) : Number(form.price),
      stock: multiSpec.value ? totalSkuStock.value : Number(form.stock) || 0,
      tags: form.tags,
      // 空分类传 null（编辑时可清空分类·@IsOptional 放行 null）
      categoryId: form.categoryId || null,
    };

    let id = props.productId || "";
    if (id) {
      await merchantBackendApi.updateProduct(id, payload);
    } else {
      const { data } = await merchantBackendApi.createProduct(payload);
      id = (data as { id?: string })?.id || "";
    }

    // SKU 同步（新建失败拿不到 id 时跳过并提示）
    let skuFailed = 0;
    if (id && (multiSpec.value || origSkus.length > 0)) {
      skuFailed = await syncSkus(id);
    }
    if (skuFailed > 0) {
      ElMessage.warning(`商品已保存，但 ${skuFailed} 条规格同步失败，请重新编辑规格`);
    } else {
      ElMessage.success(props.productId ? "保存成功" : "发布成功");
    }
    visible.value = false;
    emit("saved");
  } catch { /* 请求错误已由拦截器提示 */ } finally {
    saving.value = false;
  }
}

/* ══════════════ 实时预览 ══════════════ */

const previewCarousel = computed(() => [form.cover, ...form.carousel].filter(Boolean));
const previewPrice = computed(() => {
  if (multiSpec.value) return minSkuPrice.value;
  return form.price;
});
const previewSpecs = computed(() =>
  multiSpec.value ? skuRows.value.map((r) => r.specValue.trim()).filter(Boolean) : [],
);
const previewSupplement = computed(() => (htmlIsEmpty(form.supplement) ? "" : form.supplement));
</script>

<template>
  <el-dialog
    v-model="visible"
    fullscreen
    destroy-on-close
    :show-close="false"
    class="product-editor-dialog"
  >
    <template #header>
      <div class="editor-header">
        <div class="header-title">
          <h3>{{ productId ? "编辑商品" : "发布商品" }}</h3>
          <span class="header-sub">左侧编辑 · 右侧手机实时预览，编辑即所见</span>
        </div>
        <div class="header-actions">
          <el-button @click="visible = false">
            取消
          </el-button>
          <el-button
            type="primary"
            :loading="saving"
            @click="save"
          >
            {{ productId ? "保存" : "发布" }}
          </el-button>
        </div>
      </div>
    </template>

    <div
      v-loading="loading"
      class="editor-layout"
    >
      <!-- ═══ 左：分区块表单 ═══ -->
      <div class="form-col">
        <!-- 块1：基本信息 -->
        <section class="form-block">
          <div class="block-title">
            基本信息
          </div>
          <el-form
            label-width="80px"
            label-position="top"
          >
            <el-form-item required>
              <template #label>
                商品名称
              </template>
              <el-input
                v-model="form.title"
                maxlength="100"
                show-word-limit
                placeholder="请输入商品名称"
              />
            </el-form-item>
            <el-form-item label="一句话简介">
              <el-input
                v-model="form.intro"
                type="textarea"
                :rows="2"
                maxlength="200"
                show-word-limit
                placeholder="展示在商品标题下方（选填）"
              />
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="商品分类">
                  <el-cascader
                    v-model="form.categoryId"
                    :options="categoryOptions"
                    :props="cascaderProps"
                    placeholder="选择分类（选填）"
                    clearable
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="标签">
                  <el-tag
                    v-for="(tag, idx) in form.tags"
                    :key="idx"
                    closable
                    style="margin-right: 4px"
                    @close="form.tags.splice(idx, 1)"
                  >
                    {{ tag }}
                  </el-tag>
                  <el-input
                    v-if="tagInputVisible"
                    v-model="tagInputValue"
                    size="small"
                    style="width: 90px"
                    autofocus
                    @keyup.enter="addTag"
                    @blur="addTag"
                  />
                  <el-button
                    v-else
                    size="small"
                    @click="tagInputVisible = true"
                  >
                    + 标签
                  </el-button>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </section>

        <!-- 块2：商品图片（用途明确三分区） -->
        <section class="form-block">
          <div class="block-title">
            商品图片
          </div>
          <div class="img-zone">
            <div class="zone-label">
              商品封面 <span class="zone-req">*</span>
            </div>
            <div class="zone-desc">
              1 张 · 展示在商品列表和商城卡片上，同时是商品页轮播的第一张
            </div>
            <CosImageUpload v-model="form.cover" />
          </div>
          <div class="img-zone">
            <div class="zone-label">
              轮播图
            </div>
            <div class="zone-desc">
              最多 9 张 · 展示在商品页顶部轮播（封面之后） · 按住图片拖动即可排序
            </div>
            <ImageListUpload
              v-model="form.carousel"
              :max="9"
            />
          </div>
        </section>

        <!-- 块3：商品详情（以图为主·富文本降级为可选补充） -->
        <section class="form-block">
          <div class="block-title">
            商品详情
          </div>
          <div class="img-zone">
            <div class="zone-label">
              详情图 <span class="zone-req">*</span>
            </div>
            <div class="zone-desc">
              多张 · 按顺序从上到下拼成商品详情页 · 按住图片拖动即可排序（详情图与补充说明至少填一项）
            </div>
            <ImageListUpload
              v-model="form.detailImages"
              :max="20"
            />
          </div>
          <el-collapse
            v-model="supplementOpen"
            class="supplement-collapse"
          >
            <el-collapse-item name="supplement">
              <template #title>
                <span class="supplement-title">图文补充说明（选填）</span>
                <span class="supplement-note">需要额外文字说明时展开填写，展示在详情图下方</span>
              </template>
              <RichEditor
                v-model="form.supplement"
                placeholder="补充文字说明（选填）"
                min-height="200px"
              />
            </el-collapse-item>
          </el-collapse>
        </section>

        <!-- 块4：价格与库存 -->
        <section class="form-block">
          <div class="block-title">
            价格与库存
          </div>
          <div class="price-note">
            <el-icon class="note-icon">
              <InfoFilled />
            </el-icon>
            <span>
              单规格商品：只填一个售价。多规格商品（如不同尺寸/材质）：开启下方开关，
              按规格分别填价，商品售价自动取最低规格价，商城列表显示「¥最低价 起」。
            </span>
          </div>
          <el-form label-position="top">
            <el-form-item>
              <template #label>
                <span>多规格</span>
                <span class="switch-note">（不同尺寸、材质、套装等按规格分别定价时开启）</span>
              </template>
              <el-switch v-model="multiSpec" />
            </el-form-item>

            <template v-if="!multiSpec">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item required>
                    <template #label>
                      售价（元）
                    </template>
                    <el-input-number
                      v-model="form.price"
                      :min="0"
                      :precision="2"
                      :controls="false"
                      placeholder="0.00"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="库存（件）">
                    <el-input-number
                      v-model="form.stock"
                      :min="0"
                      :precision="0"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </template>

            <template v-else>
              <el-table
                :data="skuRows"
                size="small"
                class="sku-table"
              >
                <el-table-column
                  label="规格名"
                  width="140"
                >
                  <template #default="{ row }">
                    <el-input
                      v-model="row.specName"
                      size="small"
                      placeholder="如：尺寸"
                    />
                  </template>
                </el-table-column>
                <el-table-column
                  label="规格值"
                  min-width="140"
                >
                  <template #default="{ row }">
                    <el-input
                      v-model="row.specValue"
                      size="small"
                      placeholder="如：大号 / 紫檀木"
                    />
                  </template>
                </el-table-column>
                <el-table-column
                  label="价格（元）"
                  width="140"
                >
                  <template #default="{ row }">
                    <el-input-number
                      v-model="row.price"
                      :min="0"
                      :precision="2"
                      :controls="false"
                      size="small"
                      placeholder="0.00"
                      style="width: 100%"
                    />
                  </template>
                </el-table-column>
                <el-table-column
                  label="库存（件）"
                  width="120"
                >
                  <template #default="{ row }">
                    <el-input-number
                      v-model="row.stock"
                      :min="0"
                      :precision="0"
                      :controls="false"
                      size="small"
                      style="width: 100%"
                    />
                  </template>
                </el-table-column>
                <el-table-column
                  label=""
                  width="60"
                  align="center"
                >
                  <template #default="{ $index }">
                    <el-button
                      size="small"
                      text
                      type="danger"
                      :icon="Delete"
                      @click="removeSkuRow($index)"
                    />
                  </template>
                </el-table-column>
              </el-table>
              <div class="sku-footer">
                <el-button
                  size="small"
                  :icon="Plus"
                  @click="addSkuRow"
                >
                  添加规格
                </el-button>
                <span class="sku-summary">
                  <template v-if="minSkuPrice != null">
                    商品售价将自动设为最低规格价 <b>¥{{ minSkuPrice.toFixed(2) }}</b> · 总库存 {{ totalSkuStock }} 件
                  </template>
                  <template v-else>
                    填写规格价格后，商品售价自动取最低价
                  </template>
                </span>
              </div>
            </template>
          </el-form>
        </section>
      </div>

      <!-- ═══ 右：手机壳实时预览 ═══ -->
      <div class="preview-col">
        <div class="phone-frame">
          <div class="phone-notch" />
          <div class="phone-screen">
            <!-- 顶部轮播 -->
            <div
              v-if="previewCarousel.length"
              class="pv-carousel"
            >
              <div class="pv-carousel-track">
                <img
                  v-for="(url, idx) in previewCarousel"
                  :key="idx"
                  :src="url"
                  class="pv-carousel-img"
                >
              </div>
              <span class="pv-carousel-count">{{ previewCarousel.length }} 张 · 左右滑动</span>
            </div>
            <div
              v-else
              class="pv-carousel pv-carousel-empty"
            >
              封面 / 轮播图预览
            </div>

            <!-- 价格 + 标题 -->
            <div class="pv-info">
              <div class="pv-price">
                <template v-if="previewPrice != null">
                  <span class="pv-price-symbol">¥</span>{{ Number(previewPrice).toFixed(2) }}
                  <span
                    v-if="multiSpec"
                    class="pv-price-qi"
                  >起</span>
                </template>
                <span
                  v-else
                  class="pv-price-empty"
                >¥ --</span>
              </div>
              <div class="pv-title">
                {{ form.title || "商品名称" }}
              </div>
              <div
                v-if="form.intro"
                class="pv-intro"
              >
                {{ form.intro }}
              </div>
              <div
                v-if="form.tags.length"
                class="pv-tags"
              >
                <span
                  v-for="(tag, idx) in form.tags"
                  :key="idx"
                  class="pv-tag"
                >{{ tag }}</span>
              </div>
            </div>

            <!-- 规格 -->
            <div
              v-if="previewSpecs.length"
              class="pv-specs"
            >
              <div class="pv-section-label">
                选择规格
              </div>
              <div class="pv-spec-chips">
                <span
                  v-for="(s, idx) in previewSpecs"
                  :key="idx"
                  class="pv-spec-chip"
                >{{ s }}</span>
              </div>
            </div>

            <!-- 详情 -->
            <div class="pv-detail">
              <div class="pv-section-label">
                商品详情
              </div>
              <template v-if="form.detailImages.length || previewSupplement">
                <img
                  v-for="(url, idx) in form.detailImages"
                  :key="idx"
                  :src="url"
                  class="pv-detail-img"
                >
                <!-- 预览商家自己录入的补充说明（与 RichEditor 同源内容·保存时经服务端 Sanitize） -->
                <!-- eslint-disable vue/no-v-html -->
                <div
                  v-if="previewSupplement"
                  class="pv-supplement"
                  v-html="previewSupplement"
                />
                <!-- eslint-enable vue/no-v-html -->
              </template>
              <div
                v-else
                class="pv-detail-empty"
              >
                详情图按顺序拼接展示在这里
              </div>
            </div>
          </div>
        </div>
        <div class="preview-caption">
          手机端实时预览
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.editor-header { display: flex; align-items: center; justify-content: space-between; }
.header-title { display: flex; align-items: baseline; gap: 12px; }
.header-title h3 { margin: 0; font-size: 18px; }
.header-sub { font-size: 12px; color: var(--color-text-secondary, #999); }
.header-actions { display: flex; gap: 8px; }

.editor-layout { display: flex; gap: 24px; align-items: flex-start; max-width: 1400px; margin: 0 auto; }

/* 左列 */
.form-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.form-block {
  background: var(--el-bg-color, #fff);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 10px; padding: 20px;
}
.block-title {
  font-size: 15px; font-weight: 600; margin-bottom: 16px;
  padding-left: 10px; border-left: 3px solid var(--el-color-primary, #409eff);
  line-height: 1.2;
}

/* 图片分区 */
.img-zone { margin-bottom: 20px; }
.img-zone:last-child { margin-bottom: 0; }
.zone-label { font-size: 14px; font-weight: 500; margin-bottom: 2px; }
.zone-req { color: var(--el-color-danger, #f56c6c); }
.zone-desc { font-size: 12px; color: var(--color-text-secondary, #999); margin-bottom: 10px; }

.supplement-collapse { border-top: 1px dashed var(--el-border-color-lighter, #ebeef5); }
.supplement-title { font-size: 14px; font-weight: 500; }
.supplement-note { font-size: 12px; color: var(--color-text-secondary, #999); margin-left: 10px; }

/* 价格块 */
.price-note {
  display: flex; gap: 8px; align-items: flex-start;
  background: var(--el-color-primary-light-9, #ecf5ff);
  border-radius: 8px; padding: 10px 12px; margin-bottom: 16px;
  font-size: 12px; line-height: 1.7; color: var(--el-color-primary, #409eff);
}
.note-icon { margin-top: 3px; flex-shrink: 0; }
.switch-note { font-size: 12px; color: var(--color-text-secondary, #999); font-weight: normal; }
.sku-table { margin-bottom: 10px; }
.sku-footer { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.sku-summary { font-size: 12px; color: var(--color-text-secondary, #999); }
.sku-summary b { color: var(--el-color-danger, #f56c6c); }

/* 右列：手机壳 */
.preview-col {
  width: 395px; flex-shrink: 0;
  position: sticky; top: 0;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.phone-frame {
  width: 375px; border-radius: 36px; padding: 10px;
  background: #1c1c1e; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  position: relative;
}
.phone-notch {
  position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
  width: 120px; height: 22px; background: #1c1c1e; border-radius: 0 0 14px 14px; z-index: 2;
}
.phone-screen {
  border-radius: 28px; overflow-y: auto; background: #f6f6f8;
  height: calc(100vh - 190px); min-height: 480px;
}
.phone-screen::-webkit-scrollbar { width: 0; }

/* 预览：轮播 */
.pv-carousel { position: relative; }
.pv-carousel-track {
  display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
}
.pv-carousel-track::-webkit-scrollbar { height: 0; }
.pv-carousel-img {
  width: 100%; aspect-ratio: 1 / 1; object-fit: cover;
  flex-shrink: 0; scroll-snap-align: center; display: block;
}
.pv-carousel-count {
  position: absolute; right: 10px; bottom: 10px;
  background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 11px;
  border-radius: 10px; padding: 2px 8px;
}
.pv-carousel-empty {
  aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center;
  color: #b0b3ba; font-size: 13px; background: #ececf0;
}

/* 预览：信息卡 */
.pv-info { background: #fff; padding: 12px 14px; margin-bottom: 8px; }
.pv-price { color: #e64340; font-size: 22px; font-weight: 700; line-height: 1.3; }
.pv-price-symbol { font-size: 14px; }
.pv-price-qi { font-size: 12px; font-weight: normal; color: #e64340; }
.pv-price-empty { color: #c0c4cc; }
.pv-title { font-size: 15px; font-weight: 600; margin-top: 6px; line-height: 1.45; word-break: break-all; }
.pv-intro { font-size: 12px; color: #8a8f99; margin-top: 4px; line-height: 1.5; }
.pv-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pv-tag {
  font-size: 10px; color: #b8894b; background: rgba(184, 137, 75, 0.1);
  border-radius: 4px; padding: 2px 6px;
}

/* 预览：规格 */
.pv-specs { background: #fff; padding: 12px 14px; margin-bottom: 8px; }
.pv-section-label { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.pv-spec-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.pv-spec-chip {
  font-size: 12px; padding: 4px 12px; border-radius: 14px;
  background: #f2f3f5; color: #333;
}

/* 预览：详情 */
.pv-detail { background: #fff; padding: 12px 0 20px; }
.pv-detail .pv-section-label { padding: 0 14px; }
.pv-detail-img { width: 100%; display: block; }
.pv-supplement { padding: 8px 14px; font-size: 13px; line-height: 1.7; word-break: break-all; }
.pv-supplement :deep(img) { max-width: 100%; }
.pv-detail-empty {
  margin: 8px 14px; padding: 32px 0; text-align: center;
  color: #b0b3ba; font-size: 12px; background: #f6f6f8; border-radius: 8px;
}
.preview-caption { font-size: 12px; color: var(--color-text-secondary, #999); }
</style>
