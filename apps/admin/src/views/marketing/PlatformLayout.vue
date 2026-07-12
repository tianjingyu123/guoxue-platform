<script setup lang="ts">
/**
 * 平台页面布局管理（平台运营专用·非站长）
 * ─────────────────────────────────────────────────────────────
 * 定位：可视化配置首页/发现页等「容器页」的顶部运营楼层，带手机框预览。
 * - 复用后端 marketing 模块 MarketingPage（平台级 = 不传 stationId，stationId 为 null）。
 * - 与站长的 MicroPageEditor（/promo/* 促销微页面）区分：本页只管平台固定容器页。
 * - 区块 type 与 H5 components/layout/block-renderer.vue 对齐（小写 type）。
 * - 主内容瀑布流（课程/商品/直播等通用卡片）由 H5 系统自动展示在楼层下方，无需配置。
 */
import { ref, reactive, computed, h } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { marketingApi } from "@/api";

// ── 预置固定平台容器页（可扩展个人中心等）──
interface FixedPage {
  route: string;
  name: string;
  desc: string;
}
const FIXED_PAGES: FixedPage[] = [
  { route: "home", name: "首页", desc: "App 首页顶部运营楼层" },
  { route: "discover", name: "发现页", desc: "发现页顶部运营楼层" },
];

// ── 区块类型定义（与 H5 block-renderer 对齐）──
interface BlockTypeDef {
  type: string;
  label: string;
  desc: string;
}
const BLOCK_TYPES: BlockTypeDef[] = [
  { type: "banner", label: "轮播图", desc: "多图轮播·可跳转" },
  { type: "notice", label: "公告条", desc: "单行公告文字·可跳转" },
  { type: "kingkong", label: "金刚区", desc: "图标导航网格" },
  { type: "rail", label: "横滑专栏", desc: "运营手选卡片横向滑动" },
  { type: "bigCard", label: "大卡(2:1)", desc: "运营重点位大图卡" },
  { type: "richtext", label: "富文本", desc: "标题+正文文字段" },
];
function blockLabel(type: string): string {
  return BLOCK_TYPES.find((b) => b.type === type)?.label || type;
}

// ── 类型 ──
interface PageComponent {
  id?: string;
  type: string;
  title?: string;
  config: Record<string, any>;
  sortOrder?: number;
}
interface PageRow {
  fixed: FixedPage;
  id: string | null; // 后端页 id，未配置为 null
  status: string; // '' 未配置 / 'DRAFT' / 'PUBLISHED' / 'OFFLINE'
}

// ── 列表状态 ──
const loading = ref(false);
const rows = ref<PageRow[]>([]);

function statusText(s: string): string {
  if (s === "PUBLISHED") return "已启用";
  if (s === "DRAFT") return "草稿";
  if (s === "OFFLINE") return "已停用";
  return "未配置（默认布局）";
}
function statusTag(s: string): "success" | "info" | "warning" {
  if (s === "PUBLISHED") return "success";
  if (s === "DRAFT") return "warning";
  return "info";
}

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await marketingApi.listPages();
    const all: any[] = data.items || data.pages || data.data || (Array.isArray(data) ? data : []);
    // 只认平台级页（stationId 为 null/空），按 route 匹配固定容器页
    rows.value = FIXED_PAGES.map((fp) => {
      const hit = all.find(
        (p) => (p.stationId == null || p.stationId === "") && p.route === fp.route
      );
      return {
        fixed: fp,
        id: hit ? hit.id : null,
        status: hit ? hit.status || "DRAFT" : "",
      };
    });
  } catch {
    rows.value = FIXED_PAGES.map((fp) => ({ fixed: fp, id: null, status: "" }));
    ElMessage.error("加载失败");
  } finally {
    loading.value = false;
  }
}

// ── 编辑抽屉 ──
const editVisible = ref(false);
const editSaving = ref(false);
const curRow = ref<PageRow | null>(null);
const curPageId = ref<string | null>(null);
const components = ref<PageComponent[]>([]);
const selectedIdx = ref(0);

const curComp = computed<PageComponent | null>(() =>
  components.value[selectedIdx.value] || null
);

async function openEdit(row: PageRow) {
  curRow.value = row;
  components.value = [];
  selectedIdx.value = 0;
  editSaving.value = false;
  // 未配置则先建平台页（不传 stationId = 平台级）
  let pageId = row.id;
  if (!pageId) {
    try {
      const { data } = await marketingApi.createPage({
        name: row.fixed.name,
        route: row.fixed.route,
        description: row.fixed.desc,
      });
      pageId = data.id;
      row.id = pageId;
      row.status = "DRAFT";
    } catch {
      ElMessage.error("创建页面失败");
      return;
    }
  }
  curPageId.value = pageId;
  // 拉取组件
  try {
    const { data } = await marketingApi.getPage(pageId!);
    components.value = (data.components || []).map((c: any) => ({
      id: c.id,
      type: c.type,
      title: c.title || "",
      config: c.config || {},
      sortOrder: c.sortOrder,
    }));
  } catch {
    components.value = [];
  }
  editVisible.value = true;
}

// 默认 config 模版
function defaultConfig(type: string): Record<string, any> {
  switch (type) {
    case "banner":
      return { images: [{ image: "", link: "", title: "" }] };
    case "notice":
      return { text: "", link: "" };
    case "kingkong":
      return { items: [{ icon: "grid", label: "", color: "#C41E3A", link: "" }] };
    case "rail":
      return { moreLink: "", items: [{ cover: "", title: "", sub: "", price: "", link: "" }] };
    case "bigCard":
      return { cover: "", subtitle: "", price: "", tag: "", link: "" };
    case "richtext":
      return { text: "" };
    default:
      return {};
  }
}

function addBlock(type: string) {
  components.value.push({ type, title: "", config: defaultConfig(type) });
  selectedIdx.value = components.value.length - 1;
}
function removeBlock(idx: number) {
  components.value.splice(idx, 1);
  if (selectedIdx.value >= components.value.length) {
    selectedIdx.value = Math.max(0, components.value.length - 1);
  }
}
function moveUp(idx: number) {
  if (idx <= 0) return;
  const arr = components.value;
  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
  selectedIdx.value = idx - 1;
}
function moveDown(idx: number) {
  if (idx >= components.value.length - 1) return;
  const arr = components.value;
  [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
  selectedIdx.value = idx + 1;
}

// 子项增删（kingkong / rail / banner 的 items|images）
function addItem(key: "items" | "images") {
  const c = curComp.value;
  if (!c) return;
  if (!Array.isArray(c.config[key])) c.config[key] = [];
  if (key === "images") c.config[key].push({ image: "", link: "", title: "" });
  else if (c.type === "kingkong")
    c.config[key].push({ icon: "grid", label: "", color: "#C41E3A", link: "" });
  else c.config[key].push({ cover: "", title: "", sub: "", price: "", link: "" });
}
function removeItem(key: "items" | "images", i: number) {
  const c = curComp.value;
  if (c && Array.isArray(c.config[key])) c.config[key].splice(i, 1);
}

// ── 保存（先删旧组件再按序重建·参照 MicroPageEditor.veSave）──
async function save(): Promise<boolean> {
  if (!curPageId.value) return false;
  editSaving.value = true;
  try {
    const { data: page } = await marketingApi.getPage(curPageId.value);
    for (const c of page.components || []) {
      await marketingApi.deletePageComponent(curPageId.value, c.id).catch(() => {});
    }
    for (let i = 0; i < components.value.length; i++) {
      const c = components.value[i];
      await marketingApi.addPageComponent(curPageId.value, {
        type: c.type,
        title: c.title || "",
        config: c.config || {},
        sortOrder: i,
      });
    }
    ElMessage.success("已保存");
    return true;
  } catch {
    ElMessage.error("保存失败");
    return false;
  } finally {
    editSaving.value = false;
  }
}

async function saveOnly() {
  const ok = await save();
  if (ok) fetchList();
}

// 保存并发布（启用）
async function savePublish() {
  const ok = await save();
  if (!ok || !curPageId.value) return;
  try {
    await marketingApi.publishPage(curPageId.value);
    ElMessage.success("已启用（H5 生效）");
    editVisible.value = false;
    fetchList();
  } catch {
    ElMessage.error("启用失败");
  }
}

// ── 列表页操作：启用 / 停用 ──
async function ensurePageId(row: PageRow): Promise<string | null> {
  if (row.id) return row.id;
  try {
    const { data } = await marketingApi.createPage({
      name: row.fixed.name,
      route: row.fixed.route,
      description: row.fixed.desc,
    });
    row.id = data.id;
    row.status = "DRAFT";
    return data.id;
  } catch {
    ElMessage.error("创建页面失败");
    return null;
  }
}

async function enablePage(row: PageRow) {
  const id = await ensurePageId(row);
  if (!id) return;
  try {
    await marketingApi.publishPage(id);
    ElMessage.success("已启用");
    fetchList();
  } catch {
    ElMessage.error("启用失败");
  }
}

async function disablePage(row: PageRow) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(
      "停用后 H5 将回退到系统默认布局（顶部运营楼层不再展示）。确认停用？",
      "停用确认",
      { type: "warning" }
    );
  } catch {
    return;
  }
  try {
    await marketingApi.updatePage(row.id, { status: "DRAFT" });
    ElMessage.success("已停用");
    fetchList();
  } catch {
    ElMessage.error("停用失败");
  }
}

// ── 独立预览弹窗（列表页「预览」按钮）──
const previewVisible = ref(false);
const previewComps = ref<PageComponent[]>([]);
const previewTitle = ref("");

async function openPreview(row: PageRow) {
  previewTitle.value = row.fixed.name;
  previewComps.value = [];
  if (!row.id) {
    previewVisible.value = true;
    return;
  }
  try {
    const { data } = await marketingApi.getPage(row.id);
    previewComps.value = (data.components || []).map((c: any) => ({
      id: c.id,
      type: c.type,
      title: c.title || "",
      config: c.config || {},
    }));
  } catch {
    previewComps.value = [];
  }
  previewVisible.value = true;
}

// ── 手机框区块渲染（admin 内 h() 渲染·所见即所得·与 block-renderer 对齐）──
function renderBlock(comp: PageComponent) {
  const cfg = comp.config || {};
  const type = comp.type;

  if (type === "banner") {
    const imgs = Array.isArray(cfg.images) ? cfg.images : [];
    const first = imgs[0] || {};
    return h(
      "div",
      { style: { margin: "8px 12px", borderRadius: "10px", overflow: "hidden", position: "relative" } },
      [
        h("div", {
          style: {
            width: "100%",
            height: "110px",
            background: "#f2efea",
            backgroundImage: first.image ? `url(${first.image})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
          },
        }),
        first.title
          ? h(
              "div",
              {
                style: {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: "16px 12px 8px",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)",
                },
              },
              first.title
            )
          : null,
        imgs.length > 1
          ? h(
              "div",
              { style: { position: "absolute", right: "10px", bottom: "8px", display: "flex", gap: "4px" } },
              imgs.map((_: any, i: number) =>
                h("div", {
                  style: {
                    width: i === 0 ? "12px" : "5px",
                    height: "5px",
                    borderRadius: "3px",
                    background: i === 0 ? "#fff" : "rgba(255,255,255,0.5)",
                  },
                })
              )
            )
          : null,
      ]
    );
  }

  if (type === "notice") {
    return h(
      "div",
      {
        style: {
          margin: "8px 12px",
          padding: "10px 14px",
          background: "rgba(201,169,110,0.14)",
          borderRadius: "8px",
          color: "#8A6D3B",
          fontSize: "13px",
        },
      },
      `📢 ${comp.title || cfg.text || "公告文字"}`
    );
  }

  if (type === "kingkong") {
    const items = Array.isArray(cfg.items) ? cfg.items : [];
    return h("div", { style: { padding: "12px 8px" } }, [
      comp.title
        ? h("div", { style: { fontSize: "13px", fontWeight: 700, padding: "0 8px 8px" } }, comp.title)
        : null,
      h(
        "div",
        { style: { display: "flex", flexWrap: "wrap" } },
        (items.length ? items : [null, null, null, null, null]).map((it: any) =>
          h(
            "div",
            { style: { width: "20%", textAlign: "center", marginBottom: "10px", fontSize: "11px" } },
            [
              h(
                "div",
                {
                  style: {
                    width: "38px",
                    height: "38px",
                    margin: "0 auto 4px",
                    borderRadius: "10px",
                    background: (it?.color || "#C41E3A") + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    color: it?.color || "#C41E3A",
                  },
                },
                it?.icon ? "●" : ""
              ),
              h("div", { style: { color: "#333" } }, it?.label || "图标"),
            ]
          )
        )
      ),
    ]);
  }

  if (type === "rail") {
    const items = Array.isArray(cfg.items) ? cfg.items : [];
    return h("div", { style: { padding: "8px 0" } }, [
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13px",
            fontWeight: 700,
            padding: "0 12px 8px",
          },
        },
        [
          h("span", comp.title || "横滑专栏"),
          cfg.moreLink ? h("span", { style: { fontSize: "12px", color: "#999" } }, "更多 ›") : null,
        ]
      ),
      h(
        "div",
        { style: { display: "flex", gap: "8px", overflowX: "auto", padding: "0 12px" } },
        (items.length ? items : [null, null]).map((it: any) =>
          h(
            "div",
            {
              style: {
                flexShrink: 0,
                width: "110px",
                background: "#fff",
                borderRadius: "8px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
                overflow: "hidden",
              },
            },
            [
              h("div", {
                style: {
                  width: "100%",
                  height: "80px",
                  background: "#f2efea",
                  backgroundImage: it?.cover ? `url(${it.cover})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                },
              }),
              h(
                "div",
                {
                  style: {
                    padding: "6px 8px 2px",
                    fontSize: "12px",
                    color: "#333",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                },
                it?.title || "卡片标题"
              ),
              h("div", { style: { display: "flex", justifyContent: "space-between", padding: "0 8px 6px" } }, [
                it?.sub ? h("span", { style: { fontSize: "11px", color: "#999" } }, it.sub) : h("span"),
                it?.price
                  ? h("span", { style: { fontSize: "12px", color: "#C41E3A", fontWeight: 700 } }, `¥${it.price}`)
                  : null,
              ]),
            ]
          )
        )
      ),
    ]);
  }

  if (type === "bigCard") {
    const cover = cfg.cover || cfg.image || "";
    return h(
      "div",
      {
        style: {
          margin: "8px 12px",
          position: "relative",
          borderRadius: "10px",
          overflow: "hidden",
          height: "120px",
          background: "#f2efea",
          backgroundImage: cover ? `url(${cover})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        },
      },
      [
        h("div", {
          style: {
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(20,15,10,0.7), transparent 60%)",
          },
        }),
        cfg.tag
          ? h(
              "span",
              {
                style: {
                  position: "absolute",
                  top: "8px",
                  left: "8px",
                  fontSize: "11px",
                  color: "#fff",
                  background: "rgba(180,140,70,0.95)",
                  borderRadius: "5px",
                  padding: "2px 8px",
                },
              },
              cfg.tag
            )
          : null,
        h(
          "div",
          { style: { position: "absolute", left: "12px", right: "12px", bottom: "10px", color: "#fff" } },
          [
            h("div", { style: { fontSize: "16px", fontWeight: 700 } }, comp.title || cfg.title || "大卡标题"),
            h("div", { style: { marginTop: "2px" } }, [
              cfg.price
                ? h("span", { style: { fontSize: "15px", fontWeight: 700, color: "#FFD98A" } }, `¥${cfg.price}`)
                : null,
              cfg.subtitle
                ? h("span", { style: { fontSize: "12px", marginLeft: "8px", opacity: 0.9 } }, cfg.subtitle)
                : null,
            ]),
          ]
        ),
      ]
    );
  }

  if (type === "richtext") {
    return h(
      "div",
      {
        style: {
          margin: "8px 12px",
          padding: "12px 14px",
          background: "#fff",
          borderRadius: "10px",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        },
      },
      [
        comp.title
          ? h("div", { style: { fontSize: "14px", fontWeight: 700, marginBottom: "6px", color: "#2C2C2C" } }, comp.title)
          : null,
        h(
          "div",
          { style: { fontSize: "13px", color: "#6E6E73", lineHeight: 1.7, whiteSpace: "pre-wrap" } },
          cfg.text || "富文本内容"
        ),
      ]
    );
  }

  return h("div", { style: { margin: "8px 12px", padding: "10px", color: "#bbb", fontSize: "12px" } }, `未知区块：${type}`);
}

// 手机框（编辑抽屉右侧 & 独立预览弹窗共用）
const PhonePreview: any = {
  props: { comps: { type: Array, default: () => [] }, label: { type: String, default: "" } },
  setup(props: any) {
    return () =>
      h("div", { class: "pl-phone" }, [
        h("div", { class: "pl-phone-bar" }, `${props.label || "预览"} · 顶部运营楼层`),
        h(
          "div",
          { class: "pl-phone-body" },
          [
            ...(props.comps || []).map((c: PageComponent) => renderBlock(c)),
            h("div", { class: "pl-phone-feed-hint" }, "▼ 以下为系统主内容瀑布流（自动展示·无需配置）"),
            h(
              "div",
              { class: "pl-phone-feed" },
              [0, 1, 2, 3].map(() => h("div", { class: "pl-phone-feed-card" }))
            ),
          ]
        ),
      ]);
  },
};

fetchList();
</script>

<template>
  <div class="platform-layout">
    <div class="pl-header">
      <div>
        <h2 class="pl-title">平台页面布局</h2>
        <p class="pl-sub">
          配置首页/发现页等容器页的<b>顶部运营楼层</b>（轮播/公告/金刚区/专栏/大卡）。
          主内容瀑布流（课程/商品/直播）由系统自动展示在楼层下方，无需配置。
          <span class="pl-warn">此处为平台运营专用，与「站长微页面」相互独立。</span>
        </p>
      </div>
    </div>

    <el-table :data="rows" v-loading="loading" border style="width: 100%">
      <el-table-column label="页面" min-width="180">
        <template #default="{ row }">
          <div class="pl-page-name">{{ row.fixed.name }}</div>
          <div class="pl-page-desc">{{ row.fixed.desc }}（route={{ row.fixed.route }}）</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="160">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" @click="openPreview(row)">预览</el-button>
          <el-button
            size="small"
            type="success"
            :disabled="row.status === 'PUBLISHED'"
            @click="enablePage(row)"
          >启用</el-button>
          <el-button
            size="small"
            type="warning"
            :disabled="!row.id || row.status !== 'PUBLISHED'"
            @click="disablePage(row)"
          >停用</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ── 编辑抽屉：左区块列表+配置 / 右手机预览 ── -->
    <el-drawer
      v-model="editVisible"
      :title="`编辑布局 · ${curRow?.fixed.name || ''}`"
      size="960px"
      destroy-on-close
    >
      <div class="pl-edit">
        <!-- 左：区块管理 -->
        <div class="pl-edit-left">
          <div class="pl-add-bar">
            <span class="pl-add-label">添加区块：</span>
            <el-button
              v-for="bt in BLOCK_TYPES"
              :key="bt.type"
              size="small"
              plain
              @click="addBlock(bt.type)"
            >{{ bt.label }}</el-button>
          </div>

          <el-empty v-if="!components.length" description="暂无区块，点上方按钮添加" :image-size="60" />

          <div class="pl-block-list">
            <div
              v-for="(c, idx) in components"
              :key="idx"
              class="pl-block-item"
              :class="{ active: idx === selectedIdx }"
              @click="selectedIdx = idx"
            >
              <span class="pl-block-tag">{{ blockLabel(c.type) }}</span>
              <span class="pl-block-title">{{ c.title || "（未命名）" }}</span>
              <span class="pl-block-ops">
                <el-button link size="small" :disabled="idx === 0" @click.stop="moveUp(idx)">↑</el-button>
                <el-button link size="small" :disabled="idx === components.length - 1" @click.stop="moveDown(idx)">↓</el-button>
                <el-button link size="small" type="danger" @click.stop="removeBlock(idx)">删除</el-button>
              </span>
            </div>
          </div>

          <!-- 当前区块配置表单 -->
          <div v-if="curComp" class="pl-form">
            <el-divider content-position="left">配置：{{ blockLabel(curComp.type) }}</el-divider>

            <el-form label-width="80px" size="small">
              <el-form-item
                v-if="curComp.type !== 'notice'"
                label="标题"
              >
                <el-input v-model="curComp.title" placeholder="区块标题（可选）" />
              </el-form-item>

              <!-- banner 轮播 -->
              <template v-if="curComp.type === 'banner'">
                <div v-for="(img, i) in curComp.config.images" :key="i" class="pl-sub-item">
                  <el-input v-model="img.image" placeholder="图片URL" class="pl-mb" />
                  <el-input v-model="img.title" placeholder="图上标题（可选）" class="pl-mb" />
                  <el-input v-model="img.link" placeholder="跳转链接（可选）" class="pl-mb" />
                  <el-button link type="danger" size="small" @click="removeItem('images', i)">删除此图</el-button>
                </div>
                <el-button size="small" @click="addItem('images')">+ 添加轮播图</el-button>
              </template>

              <!-- notice 公告 -->
              <template v-else-if="curComp.type === 'notice'">
                <el-form-item label="公告文字">
                  <el-input v-model="curComp.config.text" placeholder="公告内容" />
                </el-form-item>
                <el-form-item label="跳转链接">
                  <el-input v-model="curComp.config.link" placeholder="点击跳转（可选）" />
                </el-form-item>
              </template>

              <!-- kingkong 金刚区 -->
              <template v-else-if="curComp.type === 'kingkong'">
                <div v-for="(it, i) in curComp.config.items" :key="i" class="pl-sub-item">
                  <el-input v-model="it.label" placeholder="文字标签" class="pl-mb" />
                  <el-input v-model="it.icon" placeholder="图标名（如 grid）" class="pl-mb" />
                  <div class="pl-color-row">
                    <span>颜色：</span><el-color-picker v-model="it.color" />
                  </div>
                  <el-input v-model="it.link" placeholder="跳转链接" class="pl-mb" />
                  <el-button link type="danger" size="small" @click="removeItem('items', i)">删除此项</el-button>
                </div>
                <el-button size="small" @click="addItem('items')">+ 添加图标</el-button>
              </template>

              <!-- rail 横滑专栏 -->
              <template v-else-if="curComp.type === 'rail'">
                <el-form-item label="更多链接">
                  <el-input v-model="curComp.config.moreLink" placeholder="「更多」跳转（可选）" />
                </el-form-item>
                <div v-for="(it, i) in curComp.config.items" :key="i" class="pl-sub-item">
                  <el-input v-model="it.cover" placeholder="封面图URL" class="pl-mb" />
                  <el-input v-model="it.title" placeholder="卡片标题" class="pl-mb" />
                  <el-input v-model="it.sub" placeholder="副标题（可选）" class="pl-mb" />
                  <el-input v-model="it.price" placeholder="价格（可选）" class="pl-mb" />
                  <el-input v-model="it.link" placeholder="跳转链接" class="pl-mb" />
                  <el-button link type="danger" size="small" @click="removeItem('items', i)">删除此卡</el-button>
                </div>
                <el-button size="small" @click="addItem('items')">+ 添加卡片</el-button>
              </template>

              <!-- bigCard 大卡 -->
              <template v-else-if="curComp.type === 'bigCard'">
                <el-form-item label="封面图"><el-input v-model="curComp.config.cover" placeholder="封面图URL" /></el-form-item>
                <el-form-item label="副标题"><el-input v-model="curComp.config.subtitle" placeholder="副标题（可选）" /></el-form-item>
                <el-form-item label="价格"><el-input v-model="curComp.config.price" placeholder="价格（可选）" /></el-form-item>
                <el-form-item label="角标"><el-input v-model="curComp.config.tag" placeholder="左上角标签（可选）" /></el-form-item>
                <el-form-item label="跳转链接"><el-input v-model="curComp.config.link" placeholder="点击跳转" /></el-form-item>
              </template>

              <!-- richtext 富文本 -->
              <template v-else-if="curComp.type === 'richtext'">
                <el-form-item label="正文">
                  <el-input v-model="curComp.config.text" type="textarea" :rows="4" placeholder="文字内容（支持换行）" />
                </el-form-item>
              </template>
            </el-form>
          </div>
        </div>

        <!-- 右：手机预览 -->
        <div class="pl-edit-right">
          <PhonePreview :comps="components" :label="curRow?.fixed.name" />
        </div>
      </div>

      <template #footer>
        <el-button @click="editVisible = false">关闭</el-button>
        <el-button :loading="editSaving" @click="saveOnly">仅保存草稿</el-button>
        <el-button type="primary" :loading="editSaving" @click="savePublish">保存并启用</el-button>
      </template>
    </el-drawer>

    <!-- ── 独立预览弹窗 ── -->
    <el-dialog v-model="previewVisible" :title="`预览 · ${previewTitle}`" width="440px">
      <div style="display: flex; justify-content: center">
        <PhonePreview :comps="previewComps" :label="previewTitle" />
      </div>
      <el-empty v-if="!previewComps.length" description="该页尚未配置区块（H5 展示系统默认布局）" :image-size="60" />
    </el-dialog>
  </div>
</template>

<style scoped>
.platform-layout {
  padding: 16px;
}
.pl-header {
  margin-bottom: 16px;
}
.pl-title {
  margin: 0 0 6px;
  font-size: 20px;
}
.pl-sub {
  margin: 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  max-width: 760px;
}
.pl-warn {
  color: #e6a23c;
}
.pl-page-name {
  font-weight: 600;
}
.pl-page-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* 编辑抽屉 */
.pl-edit {
  display: flex;
  gap: 16px;
}
.pl-edit-left {
  flex: 1;
  min-width: 0;
}
.pl-edit-right {
  width: 320px;
  flex-shrink: 0;
}
.pl-add-bar {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.pl-add-label {
  font-size: 13px;
  color: #606266;
}
.pl-block-list {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}
.pl-block-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f2f2f2;
  cursor: pointer;
}
.pl-block-item:last-child {
  border-bottom: none;
}
.pl-block-item.active {
  background: #ecf5ff;
}
.pl-block-tag {
  font-size: 12px;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  color: #606266;
}
.pl-block-title {
  flex: 1;
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pl-block-ops {
  flex-shrink: 0;
}
.pl-form {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 4px 12px 12px;
  background: #fafafa;
}
.pl-sub-item {
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
  background: #fff;
}
.pl-mb {
  margin-bottom: 8px;
}
.pl-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

/* 手机框 */
.pl-phone {
  width: 320px;
  border: 8px solid #1a1a1a;
  border-radius: 28px;
  overflow: hidden;
  background: #f6f4ef;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
.pl-phone-bar {
  background: #8b4513;
  color: #fff;
  text-align: center;
  padding: 8px;
  font-size: 12px;
}
.pl-phone-body {
  height: 560px;
  overflow-y: auto;
  background: #f6f4ef;
  padding-bottom: 16px;
}
.pl-phone-feed-hint {
  margin: 14px 12px 8px;
  font-size: 11px;
  color: #b0a48f;
  text-align: center;
}
.pl-phone-feed {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 12px;
}
.pl-phone-feed-card {
  height: 120px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}
</style>
