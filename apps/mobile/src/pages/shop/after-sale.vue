<template>
  <view class="page">
    <view class="form-card">
      <view class="form-item">
        <text class="form-label">订单编号</text>
        <input class="form-input" v-model="orderId" placeholder="请输入订单编号" />
      </view>
      <view class="form-item">
        <text class="form-label">售后类型</text>
        <view class="type-row">
          <view
            v-for="t in types"
            :key="t.value"
            class="type-item"
            :class="{ active: form.type === t.value }"
            @click="form.type = t.value"
          >
            <text>{{ t.label }}</text>
          </view>
        </view>
      </view>
      <view class="form-item" v-if="form.type === 'refund'">
        <text class="form-label">退款金额</text>
        <input class="form-input" v-model="form.amount" type="digit" placeholder="不填则全额退款" />
      </view>
      <view class="form-item">
        <text class="form-label">申请原因</text>
        <textarea class="form-textarea" v-model="form.reason" placeholder="请描述售后原因..." :maxlength="500" />
        <text class="char-count">{{ form.reason.length }}/500</text>
      </view>
    </view>

    <view class="btn-area">
      <view class="btn-submit" @click="submit">提交申请</view>
    </view>

    <!-- 我的售后列表 -->
    <view class="section-title">我的售后</view>
    <view v-if="afterSales.length === 0" class="empty-mini">
      <text>暂无售后记录</text>
    </view>
    <view v-for="item in afterSales" :key="item.id" class="as-card">
      <view class="as-header">
        <text class="as-type">{{ typeLabel(item.type) }}</text>
        <text class="as-status" :class="'as-' + item.status.toLowerCase()">{{ statusLabel(item.status) }}</text>
      </view>
      <text class="as-reason">{{ item.reason }}</text>
      <text class="as-time">{{ formatTime(item.createdAt) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { shopApi } from "../../api";

const orderId = ref("");
const afterSales = ref<any[]>([]);
const types = [
  { label: "退款", value: "refund" },
  { label: "退货", value: "return" },
  { label: "换货", value: "exchange" },
];
const form = reactive({ type: "refund", reason: "", amount: "" });

onMounted(async () => {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as any;
  orderId.value = current?.options?.orderId || "";

  try {
    const data = await shopApi.myAfterSales({ page: 1, pageSize: 20 });
    afterSales.value = data?.items || data?.data || [];
  } catch { /* */ }
});

function typeLabel(t: string) {
  const map: Record<string, string> = { refund: "退款", return: "退货", exchange: "换货" };
  return map[t] || t;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    PENDING: "待处理", APPROVED: "已同意", REJECTED: "已拒绝",
    CANCELLED: "已取消", COMPLETED: "已完成", PROCESSING: "处理中",
  };
  return map[s] || s;
}

function formatTime(t: string) {
  if (!t) return "";
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

async function submit() {
  if (!orderId.value.trim()) { uni.showToast({ title: "请输入订单编号", icon: "none" }); return; }
  if (!form.reason.trim()) { uni.showToast({ title: "请填写申请原因", icon: "none" }); return; }
  try {
    const data: any = { type: form.type, reason: form.reason.trim() };
    if (form.amount) data.amount = Number(form.amount);
    await shopApi.applyAfterSale(orderId.value.trim(), data);
    uni.showToast({ title: "提交成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e: any) {
    uni.showToast({ title: e?.message || "提交失败", icon: "none" });
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40px; }

.form-card { background: #fff; margin: 10px; border-radius: 10px; padding: 0 16px; }
.form-item { padding: 14px 0; border-bottom: 1px solid #F5F0E8; }
.form-item:last-child { border-bottom: none; }
.form-label { font-size: 14px; color: #2C2C2C; display: block; margin-bottom: 8px; }
.form-input { font-size: 14px; color: #333; background: #F5F0E8; padding: 10px; border-radius: 8px; }
.form-textarea { width: 100%; min-height: 100px; font-size: 14px; background: #F5F0E8; padding: 10px; border-radius: 8px; box-sizing: border-box; }
.char-count { font-size: 11px; color: #bbb; text-align: right; display: block; margin-top: 4px; }

.type-row { display: flex; gap: 10px; }
.type-item { padding: 8px 20px; border: 1px solid #E8E0D5; border-radius: 20px; font-size: 13px; color: #666; background: #F5F0E8; }
.type-item.active { border-color: #C41E3A; color: #C41E3A; background: #fef5f5; }

.btn-area { padding: 16px; }
.btn-submit { width: 100%; padding: 14px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 16px; font-weight: 600; text-align: center; }

.section-title { font-size: 15px; font-weight: bold; color: #2C2C2C; padding: 16px 16px 8px; }
.empty-mini { text-align: center; padding: 20px; color: #999; font-size: 13px; }

.as-card { background: #fff; margin: 8px 10px; padding: 14px; border-radius: 10px; }
.as-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.as-type { font-size: 14px; font-weight: 600; color: #2C2C2C; }
.as-status { font-size: 12px; padding: 2px 10px; border-radius: 10px; }
.as-pending { background: #fef5e7; color: #C9A96E; }
.as-approved { background: #eafaf1; color: #27ae60; }
.as-rejected { background: #fdedec; color: #C41E3A; }
.as-cancelled { background: #F5F0E8; color: #bbb; }
.as-completed { background: #eafaf1; color: #27ae60; }
.as-reason { font-size: 13px; color: #666; display: block; margin-top: 4px; }
.as-time { font-size: 11px; color: #bbb; display: block; margin-top: 6px; }
</style>
