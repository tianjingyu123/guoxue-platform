<template>
  <view class="page">
    <!-- 分站品牌头 -->
    <view
      v-if="brand"
      class="brand-header"
      :style="{ background: brand.themeColor || '#667eea' }"
    >
      <image
        v-if="brand.logo"
        :src="brand.logo"
        class="brand-logo"
        mode="aspectFit"
      />
      <text class="brand-name">
        {{ brand.name }}
      </text>
      <text class="brand-intro">
        {{ brand.intro }}
      </text>
    </view>

    <!-- 余额卡片 -->
    <view class="balance-card">
      <text class="balance-label">
        可提现余额
      </text>
      <text class="balance-amount">
        ¥{{ balance.toFixed(2) }}
      </text>
      <view class="balance-sub">
        <text>累计收益 ¥{{ totalEarned.toFixed(2) }}</text>
        <text>已提现 ¥{{ totalWithdrawn.toFixed(2) }}</text>
      </view>
      <button
        class="withdraw-btn"
        :disabled="balance < 100"
        @click="showWithdraw = true"
      >
        {{ balance < 100 ? '满¥100可提现' : '申请提现' }}
      </button>
    </view>

    <!-- 收益列表（分页加载） -->
    <view class="section">
      <text class="section-title">
        收益明细
      </text>
      <view
        v-if="earnings.length === 0 && !loadingEarnings"
        class="empty"
      >
        暂无收益记录
      </view>
      <view
        v-for="item in earnings"
        :key="item.id"
        class="earning-item"
      >
        <view class="earn-left">
          <text class="earn-type">
            {{ typeLabel(item.type) }}
          </text>
          <text class="earn-time">
            {{ formatTime(item.createdAt) }}
          </text>
        </view>
        <text class="earn-amount">
          +¥{{ Number(item.earned).toFixed(2) }}
        </text>
      </view>
      <!-- 加载更多 -->
      <view
        v-if="hasMore"
        class="load-more"
        @click="fetchMoreEarnings"
      >
        <text v-if="!loadingEarnings">
          加载更多
        </text>
        <text v-else>
          加载中...
        </text>
      </view>
      <view
        v-else-if="earnings.length > 0"
        class="load-more load-end"
      >
        没有更多了
      </view>
    </view>

    <!-- 提现记录 -->
    <view class="section">
      <text class="section-title">
        提现记录
      </text>
      <view
        v-if="withdrawals.length === 0"
        class="empty"
      >
        暂无提现记录
      </view>
      <view
        v-for="item in withdrawals"
        :key="item.id"
        class="w-item"
      >
        <view class="earn-left">
          <text class="earn-type">
            {{ item.alipayAccount || item.bankName || '提现' }}
          </text>
          <text class="earn-time">
            {{ formatTime(item.createdAt) }}
          </text>
        </view>
        <view style="text-align: right">
          <text
            class="earn-amount"
            :class="{ fail: item.status === 'REJECTED' }"
          >
            {{ item.status === 'REJECTED' ? '-' : '' }}¥{{ Number(item.amount).toFixed(2) }}
          </text>
          <text
            class="w-status"
            :class="item.status"
          >
            {{ statusLabel(item.status) }}
          </text>
        </view>
      </view>
    </view>

    <!-- 提现弹窗 -->
    <view
      v-if="showWithdraw"
      class="modal-mask"
      @click="showWithdraw = false"
    >
      <view
        class="modal"
        @click.stop
      >
        <text class="modal-title">
          申请提现
        </text>
        <view class="form-item">
          <text class="label">
            金额
          </text>
          <input
            v-model="wdAmount"
            class="input"
            type="digit"
            placeholder="最低¥100"
          >
        </view>
        <view class="form-item">
          <text class="label">
            支付宝
          </text>
          <input
            v-model="wdAlipay"
            class="input"
            placeholder="收款支付宝账号"
          >
        </view>
        <view class="modal-btns">
          <button
            class="btn-cancel"
            @click="showWithdraw = false"
          >
            取消
          </button>
          <button
            class="btn-confirm"
            @click="doWithdraw"
          >
            确认提现
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { commissionApi, stationApi } from "@/api/index";
import { useStationStore } from "@/store/stationStore";

const stationStore = useStationStore();

// 品牌信息（响应式，随 store 变化）
const brand = computed(() => stationStore.brand);

// 余额
const balance = ref(0);
const totalEarned = ref(0);
const totalWithdrawn = ref(0);

// 收益列表（支持分页）
const earnings = ref<any[]>([]);
const earnPage = ref(1);
const earnPageSize = 20;
const hasMore = ref(true);
const loadingEarnings = ref(false);

// 提现
const withdrawals = ref<any[]>([]);
const showWithdraw = ref(false);
const wdAmount = ref("");
const wdAlipay = ref("");

onMounted(async () => {
  // 优先从 stationStore 获取 stationId
  let sid = stationStore.stationId;

  if (!sid) {
    // 兜底：从全局变量或缓存获取
    try {
      const app = getApp();
      sid = (app as any)?.globalData?.stationId || '';
    } catch {}
  }

  if (!sid) {
    uni.showToast({ title: "暂无分站信息", icon: "none" });
    return;
  }

  // 并行加载余额和收益数据
  await Promise.all([
    fetchBalance(sid),
    fetchEarnings(sid, 1),
    fetchWithdrawals(),
  ]);
});

/** 加载余额 */
async function fetchBalance(sid: string) {
  try {
    const balRes = await commissionApi.balance(sid);
    const bal = (balRes as any).data ?? balRes;
    balance.value = bal.balance ?? 0;
    totalEarned.value = bal.totalEarned ?? 0;
    totalWithdrawn.value = bal.totalWithdrawn ?? 0;
  } catch {
    uni.showToast({ title: "获取余额失败", icon: "none" });
  }
}

/** 加载收益列表（分页） */
async function fetchEarnings(sid: string, page: number) {
  loadingEarnings.value = true;
  try {
    const res: any = await stationApi.getEarnings(sid, page, earnPageSize);
    const data = res.data ?? res;
    const list: any[] = data.earnings ?? data.list ?? data.items ?? [];
    if (page === 1) {
      earnings.value = list;
    } else {
      earnings.value = earnings.value.concat(list);
    }
    earnPage.value = page;
    // 判断是否还有更多
    const total = data.total ?? data.count ?? 0;
    hasMore.value = earnings.value.length < total;
  } catch {
    uni.showToast({ title: "获取收益明细失败", icon: "none" });
  } finally {
    loadingEarnings.value = false;
  }
}

/** 加载更多收益 */
function fetchMoreEarnings() {
  if (loadingEarnings.value || !hasMore.value) return;
  const sid = stationStore.stationId;
  if (sid) {
    fetchEarnings(sid, earnPage.value + 1);
  }
}

/** 加载提现记录 */
async function fetchWithdrawals() {
  try {
    const wdRes: any = await commissionApi.withdrawals({ pageSize: 50 });
    const data = wdRes.data ?? wdRes;
    withdrawals.value = data.withdrawals ?? data.list ?? data.items ?? [];
  } catch {}
}

async function doWithdraw() {
  const amount = parseFloat(wdAmount.value);
  if (!amount || amount < 100) {
    uni.showToast({ title: "最低提现¥100", icon: "none" });
    return;
  }
  const sid = stationStore.stationId;
  if (!sid) {
    uni.showToast({ title: "分站信息缺失", icon: "none" });
    return;
  }
  try {
    await commissionApi.applyWithdrawal({
      amount,
      alipayAccount: wdAlipay.value || undefined,
      stationId: sid,
    });
    uni.showToast({ title: "提现申请已提交", icon: "success" });
    showWithdraw.value = false;
    wdAmount.value = "";
    wdAlipay.value = "";
    // 刷新数据
    await Promise.all([
      fetchBalance(sid),
      fetchEarnings(sid, 1),
      fetchWithdrawals(),
    ]);
  } catch {}
}

function typeLabel(t: string): string {
  const m: Record<string, string> = { COURSE: "课程", PRODUCT: "商品", MEMBER: "会员", CIRCLE: "圈子", BOT: "智能体" };
  return m[t] || t;
}

function statusLabel(s: string): string {
  const m: Record<string, string> = { PENDING: "待审核", APPROVED: "已通过", PAID: "已打款", REJECTED: "已拒绝" };
  return m[s] || s;
}

function formatTime(t: string): string {
  if (!t) return "";
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
</script>

<style scoped>
.page { padding: 16px; background: #F5F0E8; min-height: 100vh; }

/* 分站品牌头 */
.brand-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  color: #fff;
}
.brand-logo {
  width: 60px;
  height: 60px;
  border-radius: 30px;
  margin-bottom: 10px;
  background: rgba(255,255,255,0.2);
}
.brand-name { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
.brand-intro { font-size: 13px; opacity: 0.85; text-align: center; }

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
  border-bottom: 1px solid #F5F0E8;
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

.load-more {
  text-align: center;
  padding: 14px 0 6px;
  font-size: 13px;
  color: #C41E3A;
}
.load-more.load-end { color: #999; }
.load-more:active { opacity: 0.7; }

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
.btn-cancel { flex: 1; background: #F5F0E8; border: none; border-radius: 8px; padding: 10px; font-size: 14px; }
.btn-confirm { flex: 1; background: #667eea; color: #fff; border: none; border-radius: 8px; padding: 10px; font-size: 14px; }
</style>
