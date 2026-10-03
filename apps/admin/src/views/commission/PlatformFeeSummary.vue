<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { commissionApi } from "@/api";

// 后端 getPlatformFeeSummary 真实返回：{ totalRecords, totalAmount, totalPlatformFee, byType: [{ type, platformFee }] }
interface ByTypeRow { type: string; platformFee: number }
interface FeeSummary {
  totalRecords?: number
  totalAmount?: number
  totalPlatformFee?: number
  byType?: ByTypeRow[]
}

const summary = ref<FeeSummary>({});
const loading = ref(false);
const error = ref(false);

// 收入类型翻译（PlatformFeeRecord.type：订单大写枚举 + 圈子侧小写配置键）
const TYPE_LABELS: Record<string, string> = {
  COURSE: "课程订单",
  PRODUCT: "商品订单",
  MEMBER: "会员购买",
  CIRCLE: "圈子收入",
  BOT: "智能体调用",
  REFUND: "退款冲正",
  course: "课程收入",
  product: "商品收入",
  circle_join: "付费入圈",
  circle_join_referral: "入圈推广",
  gift: "直播打赏",
  question: "付费提问",
  peek: "围观答案",
  audio_call: "音频连麦",
  bounty: "悬赏咨询",
  knowledge_revenue: "知识付费",
};
function typeLabel(t: string) { return TYPE_LABELS[t] || t; }

const byType = computed(() => {
  const rows = Array.isArray(summary.value.byType) ? summary.value.byType : [];
  return [...rows].sort((a, b) => Number(b.platformFee || 0) - Number(a.platformFee || 0));
});

const avgRate = computed(() => {
  const amount = Number(summary.value.totalAmount || 0);
  const fee = Number(summary.value.totalPlatformFee || 0);
  return amount > 0 ? ((fee / amount) * 100).toFixed(1) + "%" : "—";
});

onMounted(() => fetchSummary());

async function fetchSummary() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await commissionApi.getPlatformFeeSummary();
    summary.value = (data ?? {}) as FeeSummary;
  } catch {
    error.value = true;
    summary.value = {};
  } finally {
    loading.value = false;
  }
}

function formatCurrency(v: number | undefined | null) {
  return `¥${Number(v || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h2>平台抽成汇总</h2>
      <el-button
        :loading="loading"
        @click="fetchSummary"
      >
        刷新
      </el-button>
    </div>

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="平台抽成汇总加载出错，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchSummary"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <el-row
        v-loading="loading"
        :gutter="16"
      >
        <el-col :span="6">
          <el-statistic
            title="平台总抽成"
            :value="formatCurrency(summary.totalPlatformFee)"
          >
            <template #prefix>
              <span class="metric-glyph gold">总</span>
            </template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic
            title="来源总金额"
            :value="formatCurrency(summary.totalAmount)"
          >
            <template #prefix>
              <span class="metric-glyph green">额</span>
            </template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic
            title="抽成笔数"
            :value="Number(summary.totalRecords ?? 0).toLocaleString('zh-CN')"
          >
            <template #prefix>
              <span class="metric-glyph blue">笔</span>
            </template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic
            title="平均抽成率"
            :value="avgRate"
          >
            <template #prefix>
              <span class="metric-glyph red">率</span>
            </template>
          </el-statistic>
        </el-col>
      </el-row>

      <el-divider />

      <h3>按收入类型分拆</h3>
      <!-- 后端 byType 只有 type + platformFee 两个字段，不虚构"来源金额/比例/笔数"分拆列 -->
      <el-table
        :data="byType"
        border
        stripe
        style="margin-top:12px;max-width:560px"
      >
        <template #empty>
          <el-empty
            description="暂无抽成数据"
            :image-size="80"
          />
        </template>
        <el-table-column
          label="收入类型"
          min-width="200"
        >
          <template #default="{ row }">
            {{ typeLabel(row.type) }}
          </template>
        </el-table-column>
        <el-table-column
          label="平台抽成"
          width="200"
          align="right"
        >
          <template #default="{ row }">
            <span style="font-weight:600">{{ formatCurrency(row.platformFee) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; }
.metric-glyph { display: inline-grid; width: 26px; height: 26px; margin-right: 5px; place-items: center; border-radius: 8px; font-size: 12px; font-weight: 700; }
.metric-glyph.gold { color: #8a6331; background: rgba(184,137,63,.11); }
.metric-glyph.green { color: #26715f; background: rgba(38,113,95,.09); }
.metric-glyph.blue { color: #315d83; background: rgba(49,93,131,.09); }
.metric-glyph.red { color: var(--color-primary); background: rgba(180,35,62,.08); }
</style>
