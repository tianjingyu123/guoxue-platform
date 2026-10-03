<template>
  <main class="preview-page">
    <PageHeader
      title="内容审核"
      description="查看风险线索、核对内容证据，并完成审核决策。"
    >
      <template #actions>
        <el-button :icon="Download">
          导出记录
        </el-button>
        <el-button
          type="primary"
          :icon="Refresh"
        >
          刷新队列
        </el-button>
      </template>
    </PageHeader>

    <section
      class="preview-metrics"
      aria-label="审核队列概览"
    >
      <StatsCard
        title="待审核"
        :value="36"
        :icon="Clock"
        color="#B4233E"
        :trend="-12.4"
        subtitle="较昨日减少 5 条"
      />
      <StatsCard
        title="今日已处理"
        :value="128"
        :icon="CircleCheck"
        color="#168A62"
        :trend="18.6"
        subtitle="平均 4.2 分钟 / 条"
      />
      <StatsCard
        title="高风险线索"
        :value="7"
        :icon="Warning"
        color="#B7791F"
        subtitle="其中 2 条即将超时"
      />
      <StatsCard
        title="审核通过率"
        value="94.8%"
        :icon="DataLine"
        color="#315F88"
        :trend="2.1"
        subtitle="近 7 日稳定"
      />
    </section>

    <SearchFilter
      :custom-filters="filters"
      placeholder="搜索标题、作者或内容编号"
    />

    <DataTable
      class="preview-table"
      :columns="columns"
      :data="rows"
      :total="128"
      :page="1"
      :page-size="10"
      :actions-width="170"
    >
      <template #toolbar>
        <div class="table-heading">
          <div><b>待审内容</b><span>按风险等级与进入队列时间排序</span></div>
          <el-tag
            type="warning"
            effect="plain"
          >
            36 条待处理
          </el-tag>
        </div>
      </template>
      <template #type="{ row }">
        <el-tag effect="plain">
          {{ row.type }}
        </el-tag>
      </template>
      <template #risk="{ row }">
        <el-tag :type="row.risk === '高' ? 'danger' : row.risk === '中' ? 'warning' : 'info'">
          {{ row.risk }}风险
        </el-tag>
      </template>
      <template #status="{ row }">
        <span class="status-cell"><i />{{ row.status }}</span>
      </template>
      <template #actions="{ row }">
        <el-button
          text
          type="primary"
        >
          查看证据
        </el-button>
        <el-button text>
          {{ row.risk === "高" ? "优先审核" : "开始审核" }}
        </el-button>
      </template>
    </DataTable>
  </main>
</template>

<script setup lang="ts">
import { CircleCheck, Clock, DataLine, Download, Refresh, Warning } from "@element-plus/icons-vue";
import DataTable, { type TableColumn } from "@/components/DataTable.vue";
import PageHeader from "@/components/PageHeader.vue";
import SearchFilter, { type FilterDef } from "@/components/SearchFilter.vue";
import StatsCard from "@/components/StatsCard.vue";

const filters: FilterDef[] = [
  { key: "type", label: "内容类型", type: "select", options: [
    { label: "文章", value: "article" }, { label: "视频", value: "video" }, { label: "课程", value: "course" },
  ] },
  { key: "risk", label: "风险等级", type: "select", options: [
    { label: "高风险", value: "high" }, { label: "中风险", value: "medium" }, { label: "低风险", value: "low" },
  ] },
];

const columns: TableColumn[] = [
  { prop: "id", label: "内容编号", width: 125 },
  { prop: "title", label: "内容标题", minWidth: 240 },
  { prop: "author", label: "作者", width: 120 },
  { prop: "type", label: "类型", width: 100, slot: "type" },
  { prop: "risk", label: "风险", width: 100, slot: "risk" },
  { prop: "status", label: "队列状态", width: 120, slot: "status" },
  { prop: "time", label: "进入时间", width: 160 },
];

const rows = [
  { id: "CT-260902-038", title: "《周易》中的时位观与现代管理", author: "清和书院", type: "文章", risk: "低", status: "待初审", time: "今天 05:42" },
  { id: "CT-260902-031", title: "秋分雅集线上公开课", author: "知止学堂", type: "课程", risk: "中", status: "待复核", time: "今天 05:18" },
  { id: "CT-260902-026", title: "古籍修复技艺纪录短片", author: "文脉研究社", type: "视频", risk: "低", status: "待初审", time: "今天 04:56" },
  { id: "CT-260902-019", title: "传统文化专题直播预告", author: "杏坛讲堂", type: "视频", risk: "高", status: "需优先处理", time: "今天 04:21" },
  { id: "CT-260902-012", title: "宋代文人生活美学十二讲", author: "松风书院", type: "课程", risk: "中", status: "待复核", time: "今天 03:48" },
];
</script>

<style scoped>
.preview-page { max-width: 1520px; margin: 0 auto; }
.preview-metrics { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; margin-bottom: 16px; }
.preview-table { margin-top: 16px; }
.table-heading { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 16px; }
.table-heading b { display: block; color: var(--color-text-title); font-size: 14px; }
.table-heading span { display: block; margin-top: 4px; color: var(--color-text-secondary); font-size: 11px; }
.status-cell { display: inline-flex; align-items: center; gap: 7px; }
.status-cell i { width: 6px; height: 6px; border-radius: 50%; background: var(--color-warning); }
@media (max-width: 1000px) { .preview-metrics { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 560px) { .preview-metrics { grid-template-columns: 1fr; } }
</style>
