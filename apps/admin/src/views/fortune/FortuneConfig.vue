<template>
  <div class="page">
    <div class="header">
      <h2>运势推送配置</h2>
      <el-button
        v-if="activeTab === 'push'"
        type="primary"
        :loading="pushingAll"
        @click="handlePushAll"
      >
        {{ pushingAll ? '推送中...' : '推送全部' }}
      </el-button>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="推送配置" name="push" />
      <el-tab-pane label="分享卡片" name="shareCard" />
    </el-tabs>

    <!-- 推送配置 -->
    <template v-if="activeTab === 'push'">
      <el-form
        :inline="true"
        class="search-bar"
      >
        <el-form-item label="运势类型">
          <el-select
            v-model="filterType"
            placeholder="全部"
            clearable
          >
            <el-option
              label="每日运势"
              value="DAILY"
            />
            <el-option
              label="每周运势"
              value="WEEKLY"
            />
            <el-option
              label="每月运势"
              value="MONTHLY"
            />
            <el-option
              label="年度运势"
              value="YEARLY"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="fetchList"
          >
            搜索
          </el-button>
        </el-form-item>
      </el-form>

      <el-table
        v-loading="loading"
        :data="list"
        border
        stripe
      >
        <el-table-column
          prop="userId"
          label="用户ID"
          width="200"
        />
        <el-table-column
          prop="fortuneType"
          label="运势类型"
          width="110"
        >
          <template #default="{ row }">
            <el-tag>{{ fortuneTypeLabel(row.fortuneType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="pushChannel"
          label="推送渠道"
          width="120"
        >
          <template #default="{ row }">
            <el-tag>{{ row.pushChannel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="pushTime"
          label="推送时间"
          width="170"
        />
        <el-table-column
          prop="isActive"
          label="启用状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.isActive ? 'warning' : 'success'"
              @click="toggleActive(row)"
            >
              {{ row.isActive ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </template>

    <!-- 分享卡片配置 -->
    <template v-if="activeTab === 'shareCard'">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>运势分享卡片模板配置</span>
            <el-button size="small" type="primary" :loading="savingCard" @click="saveShareCard">保存配置</el-button>
          </div>
        </template>
        <el-table :data="shareCardConfigs" stripe>
          <el-table-column label="运势类型" width="120">
            <template #default="{ row }">
              <el-tag>{{ fortuneTypeLabel(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="启用分享" width="90" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="卡片模板" width="200">
            <template #default="{ row }">
              <el-select v-model="row.template" size="small" style="width:100%">
                <el-option v-for="t in cardTemplates" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="背景图" min-width="180">
            <template #default="{ row }">
              <el-input v-model="row.backgroundUrl" size="small" placeholder="背景图片URL" />
            </template>
          </el-table-column>
          <el-table-column label="主色调" width="90">
            <template #default="{ row }">
              <el-color-picker v-model="row.primaryColor" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="显示幸运项" width="110" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.showLucky" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="预览" width="70" align="center">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="previewCard(row)">预览</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="分享卡片预览" width="420px">
      <div style="text-align:center">
        <div :style="{ background: previewBg, borderRadius: '12px', padding: '24px', color: '#fff', minHeight: '300px' }">
          <h3 style="margin:0 0 8px 0">{{ previewTitle }}</h3>
          <p style="margin:0 0 16px 0;opacity:0.85">{{ previewDesc }}</p>
          <div v-if="previewShowLucky" style="background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '12px', marginBottom: '12px'">
            <span style="font-size:13px">幸运色: {{ previewLuckyColor }} · 幸运方向: {{ previewLuckyDir }}</span>
          </div>
          <div style="font-size:11px;opacity:0.6;margin-top:20px">国学平台 · 运势分享</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { fortuneAdminApi } from "@/api";

const activeTab = ref("push");
const loading = ref(false);
const pushingAll = ref(false);
const savingCard = ref(false);
const list = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterType = ref("");

// 分享卡片
const shareCardConfigs = reactive<Array<{ type: string; enabled: boolean; template: string; backgroundUrl: string; primaryColor: string; showLucky: boolean }>>([]);

const cardTemplates = [
  { label: "经典画卷", value: "classic_scroll" },
  { label: "水墨风格", value: "ink_wash" },
  { label: "金色运势", value: "golden_fortune" },
  { label: "简约卡片", value: "simple_card" },
  { label: "古风卷轴", value: "ancient_scroll" },
];

// 预览
const previewVisible = ref(false);
const previewBg = ref("");
const previewTitle = ref("");
const previewDesc = ref("");
const previewShowLucky = ref(false);
const previewLuckyColor = ref("");
const previewLuckyDir = ref("");

function fortuneTypeLabel(type: string) {
  const map: Record<string, string> = { DAILY: "每日运势", WEEKLY: "每周运势", MONTHLY: "每月运势", YEARLY: "年度运势" };
  return map[type] || type;
}

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filterType.value) params.fortuneType = filterType.value;
    const res = await fortuneAdminApi.listConfigs(params);
    list.value = res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    ElMessage.error("获取配置列表失败");
  } finally {
    loading.value = false;
  }
}

async function toggleActive(row: any) {
  try {
    await fortuneAdminApi.updateConfig(row.id, { isActive: !row.isActive });
    ElMessage.success("更新成功");
    fetchList();
  } catch {
    ElMessage.error("操作失败");
  }
}

async function handlePushAll() {
  pushingAll.value = true;
  try {
    await fortuneAdminApi.pushAll();
    ElMessage.success("批量推送任务已触发");
  } catch {
    ElMessage.error("推送失败");
  } finally {
    pushingAll.value = false;
  }
}

async function fetchShareCardConfig() {
  try {
    const res = await fortuneAdminApi.getShareCardConfig();
    const data = res.data?.configs || res.data?.data || [];
    shareCardConfigs.length = 0;
    if (data.length > 0) {
      shareCardConfigs.push(...data);
    } else {
      // 默认配置
      shareCardConfigs.push(
        { type: "DAILY", enabled: true, template: "classic_scroll", backgroundUrl: "", primaryColor: "#d4380d", showLucky: true },
        { type: "WEEKLY", enabled: true, template: "ink_wash", backgroundUrl: "", primaryColor: "#1d39c4", showLucky: true },
        { type: "MONTHLY", enabled: true, template: "golden_fortune", backgroundUrl: "", primaryColor: "#d48806", showLucky: true },
        { type: "YEARLY", enabled: true, template: "ancient_scroll", backgroundUrl: "", primaryColor: "#7b1fa2", showLucky: true },
      );
    }
  } catch {
    // 默认
    shareCardConfigs.length = 0;
    shareCardConfigs.push(
      { type: "DAILY", enabled: true, template: "classic_scroll", backgroundUrl: "", primaryColor: "#d4380d", showLucky: true },
      { type: "WEEKLY", enabled: true, template: "ink_wash", backgroundUrl: "", primaryColor: "#1d39c4", showLucky: true },
      { type: "MONTHLY", enabled: true, template: "golden_fortune", backgroundUrl: "", primaryColor: "#d48806", showLucky: true },
      { type: "YEARLY", enabled: true, template: "ancient_scroll", backgroundUrl: "", primaryColor: "#7b1fa2", showLucky: true },
    );
  }
}

async function saveShareCard() {
  savingCard.value = true;
  try {
    await fortuneAdminApi.updateShareCardConfig({ configs: [...shareCardConfigs] });
    ElMessage.success("分享卡片配置已保存");
  } catch {
    ElMessage.error("保存失败");
  } finally {
    savingCard.value = false;
  }
}

function previewCard(row: any) {
  previewBg.value = `linear-gradient(135deg, ${row.primaryColor || '#667eea'}, ${row.primaryColor ? row.primaryColor + 'cc' : '#764ba2'})`;
  previewTitle.value = fortuneTypeLabel(row.type) + " · 运势分享";
  previewDesc.value = "你的专属运势已生成，点击查看完整解读";
  previewShowLucky.value = row.showLucky;
  previewLuckyColor.value = "金色";
  previewLuckyDir.value = "东方";
  previewVisible.value = true;
}

onMounted(() => { fetchList(); fetchShareCardConfig(); });
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
