<script setup lang="ts">
/**
 * 白标贺卡打印（供-P2·商城供应链重构 B2B2C §五）
 * 按订单号查贺卡任务（Order.giftCardMeta {fromName,blessing,qrRef}）→ A6 排版预览 → window.print 打印。
 * 供应商/运营发货时打印随包裹放入——每个包裹都是从业者的获客物料，也是平台的归因入口。
 */
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { orderApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";
// @ts-ignore uqrcodejs 为纯 JS 编码库，无类型声明（下方 UQRCodeInstance 收口实例类型）
import UQRCode from "uqrcodejs";

/** uqrcodejs 实例（仅声明本页用到的成员·与 mobile utils/qrcode.ts 同款收口） */
interface UQRCodeInstance {
  data: string;
  size: number;
  margin: number;
  make(): void;
  modules: boolean[][];
  moduleCount: number;
}

interface GiftCardMeta { fromName?: string; blessing?: string; qrRef?: string }
/** 订单行（仅覆盖本页实际访问字段·宽松 optional） */
interface GiftOrder {
  id?: string;
  status?: string;
  createdAt?: string;
  giftCardMeta?: GiftCardMeta | null;
  product?: { title?: string } | null;
}

const route = useRoute();
const orderId = ref(String(route.query.orderId || ""));
const order = ref<GiftOrder | null>(null);
const loading = ref(false);
const error = ref("");
const searched = ref(false);
const qrCanvas = ref<HTMLCanvasElement | null>(null);
const qrOk = ref(false);

/** A6 页面尺寸规则动态注入（离开本页移除，避免影响其他页面打印纸型） */
let pageStyleEl: HTMLStyleElement | null = null;

onMounted(() => {
  document.body.classList.add("gcp-printing");
  pageStyleEl = document.createElement("style");
  pageStyleEl.textContent = "@page { size: 105mm 148mm; margin: 0; }";
  document.head.appendChild(pageStyleEl);
  if (orderId.value.trim()) load();
});

onUnmounted(() => {
  document.body.classList.remove("gcp-printing");
  pageStyleEl?.remove();
  pageStyleEl = null;
});

async function load() {
  const id = orderId.value.trim();
  if (!id) { ElMessage.warning("请输入订单号"); return; }
  if (loading.value) return;
  loading.value = true;
  error.value = "";
  order.value = null;
  qrOk.value = false;
  searched.value = true;
  try {
    const { data } = await orderApi.detail(id);
    order.value = data as GiftOrder;
    const qrRef = (data as GiftOrder)?.giftCardMeta?.qrRef;
    if (qrRef) {
      await nextTick(); // 等贺卡 DOM（含 canvas）渲染
      qrOk.value = drawQr(String(qrRef));
    }
  } catch (e) {
    error.value = (e as Error)?.message || "订单查询失败";
  } finally {
    loading.value = false;
  }
}

/** 名片二维码：uqrcodejs 编码点阵 → canvas 自绘（失败静默降级为文字链接） */
function drawQr(text: string): boolean {
  const canvas = qrCanvas.value;
  if (!canvas || !text) return false;
  try {
    const qr = new (UQRCode as unknown as new () => UQRCodeInstance)();
    qr.data = text;
    qr.size = canvas.width;
    qr.margin = 0;
    qr.make();
    const modules = qr.modules;
    const count = qr.moduleCount;
    if (!modules || !count) return false;

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cell = canvas.width / count;
    ctx.fillStyle = "#2d2a26";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (!modules[row][col]) continue;
        // cell 向上取 0.5 重叠，避免缩放白缝
        ctx.fillRect(col * cell, row * cell, cell + 0.5, cell + 0.5);
      }
    }
    return true;
  } catch {
    return false;
  }
}

function doPrint() {
  window.print();
}
</script>

<template>
  <div class="gift-card-print">
    <PageHeader title="贺卡打印" />

    <el-card
      shadow="never"
      class="gcp-toolbar"
    >
      <div class="gcp-search">
        <el-input
          v-model="orderId"
          placeholder="输入订单号查询贺卡任务"
          clearable
          style="width: 380px"
          @keyup.enter="load"
        />
        <el-button
          type="primary"
          :loading="loading"
          @click="load"
        >
          查询
        </el-button>
        <el-button
          v-if="order?.giftCardMeta"
          type="success"
          @click="doPrint"
        >
          打印贺卡（A6）
        </el-button>
      </div>
      <div class="gcp-tip">
        归因到从业者的订单下单时自动生成贺卡任务；打印后请供应商发货时随包裹放入。纸张请选 A6（105×148mm）。
      </div>
    </el-card>

    <!-- 错误态 -->
    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-top:12px"
    >
      <template #title>
        {{ error }}，请
        <el-button
          link
          type="primary"
          @click="load"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <!-- 空态：订单存在但无贺卡任务 -->
    <el-empty
      v-else-if="searched && !loading && order && !order.giftCardMeta"
      description="该订单无贺卡任务（非归因订单、自购单或全局开关已关闭）"
    />

    <!-- 贺卡 A6 预览 + 打印区 -->
    <div
      v-else-if="order?.giftCardMeta"
      class="gcp-stage"
    >
      <div class="gcp-card gcp-print-area">
        <div class="gcp-card-frame">
          <div class="gcp-ornament">
            ❖
          </div>
          <div class="gcp-selected-by">
            {{ order.giftCardMeta.fromName || '国学甄选' }}
          </div>
          <div class="gcp-selected-label">
            为您甄选
          </div>
          <div class="gcp-divider" />
          <div
            v-if="order.giftCardMeta.blessing"
            class="gcp-blessing"
          >
            {{ order.giftCardMeta.blessing }}
          </div>
          <div class="gcp-qr-wrap">
            <canvas
              ref="qrCanvas"
              width="320"
              height="320"
              class="gcp-qr"
            />
            <div
              v-if="!qrOk && order.giftCardMeta.qrRef"
              class="gcp-qr-fallback"
            >
              {{ order.giftCardMeta.qrRef }}
            </div>
            <div class="gcp-qr-caption">
              扫码认识 TA · 专属雅物与服务
            </div>
          </div>
          <div class="gcp-footer">
            国学平台 · 严选好物
          </div>
        </div>
      </div>
      <div class="gcp-meta no-print">
        <div>订单号：{{ order.id }}</div>
        <div v-if="order.product?.title">
          商品：{{ order.product.title }}
        </div>
        <div v-if="order.giftCardMeta.qrRef">
          名片码内容：{{ order.giftCardMeta.qrRef }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gcp-toolbar { margin-bottom: 0; }
.gcp-search { display: flex; align-items: center; gap: 12px; }
.gcp-tip { margin-top: 8px; font-size: 12px; color: #909399; }

.gcp-stage { margin-top: 16px; display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }

/* A6 竖版 105×148mm·屏幕预览按 mm 排版（打印时 1:1） */
.gcp-card {
  width: 105mm;
  height: 148mm;
  background: #fdfbf7;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
  padding: 6mm;
  flex-shrink: 0;
}
.gcp-card-frame {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 1px solid #c9a96e;
  padding: 8mm 6mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.gcp-ornament { color: #c9a96e; font-size: 14px; }
.gcp-selected-by {
  margin-top: 4mm;
  font-size: 22px;
  font-weight: 600;
  color: #2d2a26;
  letter-spacing: 2px;
  line-height: 1.3;
  word-break: break-all;
}
.gcp-selected-label { margin-top: 1mm; font-size: 13px; color: #9a8b73; letter-spacing: 6px; }
.gcp-divider { width: 24mm; height: 1px; background: #c9a96e; margin: 5mm 0; }
.gcp-blessing {
  font-size: 13px;
  color: #6b5d48;
  line-height: 2;
  max-width: 80mm;
}
.gcp-qr-wrap { margin-top: auto; display: flex; flex-direction: column; align-items: center; }
.gcp-qr { width: 30mm; height: 30mm; background: #fff; }
.gcp-qr-fallback { margin-top: 2mm; font-size: 9px; color: #6b5d48; word-break: break-all; max-width: 80mm; }
.gcp-qr-caption { margin-top: 2mm; font-size: 11px; color: #9a8b73; letter-spacing: 1px; }
.gcp-footer { margin-top: 4mm; font-size: 10px; color: #b8ab93; letter-spacing: 2px; }

.gcp-meta { font-size: 13px; color: #606266; line-height: 2; max-width: 420px; word-break: break-all; }
</style>

<!-- 打印规则需命中全局 DOM（隐藏后台布局壳），不能 scoped；
     以 body.gcp-printing（本页挂载时才加）收口，避免污染其他页面的打印 -->
<style>
@media print {
  body.gcp-printing * { visibility: hidden; }
  body.gcp-printing .gcp-print-area,
  body.gcp-printing .gcp-print-area * { visibility: visible; }
  body.gcp-printing .gcp-print-area {
    position: fixed;
    left: 0;
    top: 0;
    margin: 0;
    box-shadow: none;
  }
  body.gcp-printing .no-print { display: none; }
}
/* @page A6 纸型由本页 onMounted 动态注入（onUnmounted 移除），不写死在全局 */
</style>
