<template>
  <view class="page">
    <!-- 余额卡片 -->
    <view class="balance-card">
      <text class="balance-label">可提现余额</text>
      <text class="balance-amount">¥{{ balance.toFixed(2) }}</text>
      <view class="balance-sub">
        <text>累计收益 ¥{{ totalEarned.toFixed(2) }}</text>
        <text>已提现 ¥{{ totalWithdrawn.toFixed(2) }}</text>
      </view>
      <button class="withdraw-btn" @click="showWithdraw = true" :disabled="balance < 100">
        {{ balance < 100 ? '满¥100可提现' : '申请提现' }}
      </button>
    </view>

    <!-- 收益列表 -->
    <view class="section">
      <text class="section-title">收益明细</text>
      <view v-if="earnings.length === 0" class="empty">暂无收益记录</view>
      <view v-for="item in earnings" :key="item.id" class="earning-item">
        <view class="earn-left">
          <text class="earn-type">{{ typeLabel(item.type) }}</text>
          <text class="earn-time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <text class="earn-amount">+¥{{ Number(item.earned).toFixed(2) }}</text>
      </view>
    </view>

    <!-- 提现记录 -->
    <view class="section">
      <text class="section-title">提现记录</text>
      <view v-if="withdrawals.length === 0" class="empty">暂无提现记录</view>
      <view v-for="item in withdrawals" :key="item.id" class="w-item">
        <view class="earn-left">
          <text class="earn-type">{{ item.alipayAccount || item.bankName || '提现' }}</text>
          <text class="earn-time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <view style="text-align: right">
          <text class="earn-amount" :class="{ fail: item.status === 'REJECTED' }">
            {{ item.status === 'REJECTED' ? '-' : '' }}¥{{ Number(item.amount).toFixed(2) }}
          </text>
          <text class="w-status" :class="item.status">{{ statusLabel(item.status) }}</text>
        </view>
      </view>
    </view>

    <!-- 提现弹窗 -->
    <view v-if="showWithdraw" class="modal-mask" @click="showWithdraw = false">
      <view class="modal" @click.stop>
        <text class="modal-title">申请提现</text>
        <view class="form-item">
          <text class="label">金额</text>
          <input class="input" v-model="wdAmount" type="digit" placeholder="最低¥100" />
        </view>
        <view class="form-item">
          <text class="label">支付宝</text>
          <input class="input" v-model="wdAlipay" placeholder="收款支付宝账号" />
        </view>
        <view class="modal-btns">
          <button class="btn-cancel" @click="showWithdraw = false">取消</button>
          <button class="btn-confirm" @click="doWithdraw">确认提现</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { commissionApi } from "@/api/index";

const stationId = ref("");
const balance = ref(0);
const totalEarned = ref(0);
const totalWithdrawn = ref(0);
const earnings = ref([]);
const withdrawals = ref([]);
const showWithdraw = ref(false);
const wdAmount = ref("");
const wdAlipay = ref("");

onMounted(async () => {
  // 从全局状态获取stationId
  const app = getApp();
  const sid = app?.globalData?.stationId;
  if (!sid) {
    // 尝试获取用户的分站
    try {
      const profile = await uni.getStorage({ key: "userProfile" }).then(r => r.data).catch(() => null);
      // 简化：直接使用存储的profile中的station信息
    } catch {}
    uni.showToast({ title: "暂无分站信息", icon: "none" });
    return;
  }
  stationId.value = sid;
  fetchData();
});

async function fetchData() {
  try {
    const [balRes, earnRes, wdRes] = await Promise.all([
      commissionApi.balance(stationId.value),
      commissionApi.earnings(stationId.value, { pageSize: 50 }),
      commissionApi.withdrawals({ pageSize: 50 }),
    ]);
    const bal = balRes.data;
    balance.value = bal.balance ?? 0;
    totalEarned.value = bal.totalEarned ?? 0;
    totalWithdrawn.value = bal.totalWithdrawn ?? 0;
    earnings.value = earnRes.data?.earnings || [];
    withdrawals.value = wdRes.data?.withdrawals || [];
  } catch {}
}

async function doWithdraw() {
  const amount = parseFloat(wdAmount.value);
  if (!amount || amount < 100) {
    uni.showToast({ title: "最低提现¥100", icon: "none" });
    return;
  }
  try {
    await commissionApi.applyWithdrawal({
      amount,
      alipayAccount: wdAlipay.value || undefined,
      stationId: stationId.value,
    });
    uni.showToast({ title: "提现申请已提交", icon: "success" });
    showWithdraw.value = false;
    wdAmount.value = "";
    wdAlipay.value = "";
    fetchData();
  } catch {}
}

function typeLabel(t: string) {
  const m: Record<string, string> = { COURSE: "课程", PRODUCT: "商品", MEMBER: "会员", CIRCLE: "圈子", BOT: "智能体" };
  return m[t] || t;
}
function statusLabel(s: string) {
  const m: Record<string, string> = { PENDING: "待审核", APPROVED: "已通过", PAID: "已打款", REJECTED: "已拒绝" };
  return m[s] || s;
}
function formatTime(t: string) {
  if (!t) return "";
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
</script>

<style scoped>
.page { padding: 16px; background: #f5f5f5; min-height: 100vh; }

.balance-card {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 12px;
  padding: 24px;
  color: #fff;
  margin-bottom: 16px;
}
.balance-label { font-size: 13px; opacity: 0.85; }
.balance-amount { font-size: 36px; font-weight: bold; display: block; margin: 8px 0; }
.balance-sub { display: flex; gap: 24px; font-size: 12px; opacity: 0.8; margin-bottom: 16px; }
.withdraw-btn {
  background: #fff;
  color: #667eea;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-size: 15px;
  font-weight: bold;
}
.withdraw-btn[disabled] { opacity: 0.6; }

.section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: bold; margin-bottom: 12px; display: block; }
.empty { text-align: center; color: #999; padding: 24px 0; font-size: 13px; }

.earning-item, .w-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.earning-item:last-child, .w-item:last-child { border-bottom: none; }
.earn-left { display: flex; flex-direction: column; gap: 4px; }
.earn-type { font-size: 14px; color: #333; }
.earn-time { font-size: 11px; color: #999; }
.earn-amount { font-size: 16px; font-weight: bold; color: #67c23a; }
.earn-amount.fail { color: #f56c6c; }
.w-status { font-size: 11px; display: block; }
.w-status.PENDING { color: #e6a23c; }
.w-status.APPROVED { color: #67c23a; }
.w-status.PAID { color: #409eff; }
.w-status.REJECTED { color: #f56c6c; }

.modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
  z-index: 999;
}
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 85%; }
.modal-title { font-size: 18px; font-weight: bold; text-align: center; display: block; margin-bottom: 20px; }
.form-item { display: flex; align-items: center; margin-bottom: 12px; }
.label { width: 60px; font-size: 14px; color: #666; }
.input { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; font-size: 14px; }
.modal-btns { display: flex; gap: 12px; margin-top: 20px; }
.btn-cancel { flex: 1; background: #f0f0f0; border: none; border-radius: 8px; padding: 10px; font-size: 14px; }
.btn-confirm { flex: 1; background: #667eea; color: #fff; border: none; border-radius: 8px; padding: 10px; font-size: 14px; }
</style>
