<template>
  <div
    v-if="kind === 'detail'"
    class="user-detail preview-workflow"
  >
    <el-page-header title="返回用户列表">
      <template #content>
        <span class="header-title">用户详情 — 林川</span>
        <el-tag
          size="small"
          type="success"
        >
          正常
        </el-tag>
      </template>
      <template #extra>
        <el-button type="warning">
          封禁用户
        </el-button>
      </template>
    </el-page-header>
    <div class="stats-row">
      <div
        v-for="item in detailStats"
        :key="item.label"
        class="stat-card"
      >
        <div class="stat-value">
          {{ item.value }}
        </div><div class="stat-label">
          {{ item.label }}
        </div>
      </div>
    </div>
    <el-tabs
      class="tabs"
      model-value="profile"
    >
      <el-tab-pane
        label="基本信息"
        name="profile"
      >
        <el-descriptions
          :column="2"
          border
        >
          <el-descriptions-item label="用户 ID">
            RB202609020018
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            2026-08-12 10:36
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            138****2816
          </el-descriptions-item>
          <el-descriptions-item label="会员等级">
            <el-tag>年度会员</el-tag>
          </el-descriptions-item>
          <el-descriptions-item
            label="最近活跃"
            :span="2"
          >
            5 分钟前 · iOS · 杭州
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>
      <el-tab-pane
        label="订单与收益"
        name="orders"
      />
      <el-tab-pane
        label="行为轨迹"
        name="behavior"
      />
    </el-tabs>
  </div>

  <div
    v-else-if="kind === 'editor'"
    class="content-edit preview-workflow"
  >
    <div class="edit-header">
      <div class="edit-heading">
        <h3>新建内容</h3><p>先完成正文，再确认封面、标签与发布状态。</p>
      </div>
      <div class="header-actions">
        <el-button type="primary">
          保存
        </el-button><el-button>存草稿</el-button><el-button>取消</el-button>
      </div>
    </div>
    <div class="edit-body">
      <div class="edit-main">
        <el-form label-width="60px">
          <el-form-item label="标题">
            <el-input
              model-value="《周易》中的时间观"
              size="large"
            />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="类型">
                <el-select
                  model-value="ARTICLE"
                  style="width:100%"
                >
                  <el-option
                    label="文章"
                    value="ARTICLE"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="作者">
                <el-input model-value="国学研究院" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="朝代">
                <el-input model-value="先秦" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="摘要">
            <el-input
              type="textarea"
              :rows="3"
              model-value="从卦象流转理解中国传统文化中的时间秩序。"
            />
          </el-form-item>
          <el-form-item label="正文">
            <div class="editor-placeholder">
              <strong>正文编辑区</strong><span>支持标题、引文、图片与段落排版</span>
            </div>
          </el-form-item>
        </el-form>
      </div>
      <aside class="edit-sidebar">
        <section>
          <h4>封面图片</h4><div class="cover-placeholder">
            上传 16:10 封面
          </div>
        </section>
        <section>
          <h4>标签</h4><div class="tag-list">
            <el-tag>周易</el-tag><el-tag>传统文化</el-tag>
          </div>
        </section>
        <section>
          <h4>状态</h4><el-radio-group model-value="DRAFT">
            <el-radio-button value="PUBLISHED">
              发布
            </el-radio-button><el-radio-button value="DRAFT">
              草稿
            </el-radio-button>
          </el-radio-group>
        </section>
      </aside>
    </div>
  </div>

  <div
    v-else-if="kind === 'review'"
    class="audit-page preview-workflow"
  >
    <div class="toolbar">
      <div class="toolbar-heading">
        <h3>内容审核中心</h3><p>集中处理平台公开内容与课程审核，优先完成待审队列。</p>
      </div>
      <div class="toolbar-actions">
        <el-button type="success">
          批量通过
        </el-button><el-button type="danger">
          批量拒绝
        </el-button><el-button>刷新</el-button>
      </div>
    </div>
    <el-row
      :gutter="12"
      class="review-stats"
    >
      <el-col
        v-for="item in reviewStats"
        :key="item.label"
        :span="5"
      >
        <div class="stat-mini">
          <span class="v">{{ item.value }}</span><span class="l">{{ item.label }}</span>
        </div>
      </el-col>
    </el-row>
    <el-tabs model-value="pending">
      <el-tab-pane
        label="待审核（24）"
        name="pending"
      /><el-tab-pane
        label="平台开放申请"
        name="platform"
      /><el-tab-pane
        label="课程审核（7）"
        name="course"
      /><el-tab-pane
        label="已通过"
        name="approved"
      />
    </el-tabs>
    <el-table
      :data="reviewRows"
      stripe
    >
      <el-table-column
        type="selection"
        width="48"
      /><el-table-column
        prop="title"
        label="内容标题"
        min-width="240"
      /><el-table-column
        prop="author"
        label="提交人"
        width="130"
      /><el-table-column
        prop="type"
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag>{{ row.type }}</el-tag>
        </template>
      </el-table-column><el-table-column
        prop="time"
        label="提交时间"
        width="150"
      /><el-table-column
        label="操作"
        width="180"
        fixed="right"
      >
        <template #default>
          <el-button
            type="success"
            size="small"
          >
            通过
          </el-button><el-button
            type="danger"
            size="small"
          >
            驳回
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <div
    v-else-if="kind === 'analytics'"
    class="revenue-page preview-workflow"
  >
    <div class="page-header">
      <div><h2>用户收益总览</h2><span class="update-time">数据更新于 09-02 06:30</span></div><div class="header-actions">
        <el-radio-group model-value="30d">
          <el-radio-button value="7d">
            近7天
          </el-radio-button><el-radio-button value="30d">
            近30天
          </el-radio-button><el-radio-button value="90d">
            近90天
          </el-radio-button>
        </el-radio-group><el-button>导出报表</el-button>
      </div>
    </div>
    <el-row
      :gutter="16"
      class="metric-row"
    >
      <el-col
        v-for="item in analyticsStats"
        :key="item.label"
        :span="6"
      >
        <div class="metric-card">
          <div class="metric-label">
            {{ item.label }}
          </div><div class="metric-value">
            {{ item.value }}
          </div><div class="metric-change">
            {{ item.note }}
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="16">
        <el-card>
          <template #header>
            收益趋势
          </template><div class="chart-placeholder">
            <i
              v-for="n in chartBars"
              :key="n"
              :style="{ height: `${32 + (n % 5) * 12}%` }"
            />
          </div>
        </el-card>
      </el-col><el-col :span="8">
        <el-card>
          <template #header>
            收益构成
          </template><div class="donut-placeholder">
            <div><strong>¥286万</strong><span>近30天</span></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>

  <div
    v-else-if="kind === 'settings'"
    class="page preview-workflow"
  >
    <PageHeader
      title="系统配置"
      description="集中维护平台运行参数；修改关键配置前请确认影响范围。"
    >
      <template #actions>
        <el-button type="primary">
          添加配置
        </el-button>
      </template>
    </PageHeader>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="关键配置修改后可能影响平台服务，请在低峰期操作并保留变更记录。"
    />
    <div class="settings-toolbar">
      <el-input
        model-value=""
        placeholder="搜索配置键、说明或配置值"
      /><span class="settings-count">12 项配置</span>
    </div>
    <el-table
      :data="settingRows"
      stripe
    >
      <el-table-column
        prop="key"
        label="配置键"
        width="240"
      /><el-table-column
        prop="value"
        label="配置值"
        min-width="260"
      /><el-table-column
        prop="desc"
        label="说明"
        min-width="220"
      /><el-table-column
        prop="time"
        label="更新时间"
        width="170"
      /><el-table-column
        label="操作"
        width="150"
        fixed="right"
      >
        <template #default>
          <el-button
            type="primary"
            size="small"
          >
            编辑
          </el-button><el-button
            type="danger"
            size="small"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <AdminShellPreview v-else />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import PageHeader from "@/components/PageHeader.vue";
import AdminShellPreview from "@/views/qa/AdminShellPreview.vue";

const route = useRoute();
const kind = computed(() => String(route.params.kind || "list"));
const detailStats = [{ label: "有效订单", value: "28" }, { label: "国学币余额", value: "8,620" }, { label: "收藏", value: "146" }, { label: "点赞", value: "392" }, { label: "粉丝", value: "86" }, { label: "设备数", value: "3" }];
const reviewStats = [{ label: "待审核内容", value: "24" }, { label: "待审核课程", value: "7" }, { label: "今日已通过", value: "116" }, { label: "今日已驳回", value: "9" }];
const reviewRows = [{ title: "古籍数字化与当代阅读", author: "墨池书院", type: "文章", time: "今天 10:24" }, { title: "入门六爻：起卦与装卦", author: "清和先生", type: "课程", time: "今天 09:58" }, { title: "宋词中的月意象", author: "听雨", type: "视频", time: "昨天 22:16" }];
const analyticsStats = [{ label: "用户收益总额", value: "¥1,286.40万", note: "累计 82,641 笔" }, { label: "关联国学币", value: "8,932万", note: "收益对应币数" }, { label: "本月收益", value: "¥286.34万", note: "本月 16,820 笔" }, { label: "今日收益", value: "¥18.62万", note: "今日 1,204 笔" }];
const chartBars = Array.from({ length: 26 }, (_, index) => index + 1);
const settingRows = [{ key: "platform.official_account", value: "RB-OFFICIAL-001", desc: "平台官方内容主体", time: "今天 05:18" }, { key: "search.hot_words", value: "周易, 诗词, 书法, 茶道", desc: "搜索页热门词", time: "昨天 18:42" }, { key: "finance.withdraw_limit", value: "100.00", desc: "最低提现金额", time: "08-30 14:20" }];
</script>

<style scoped>
.preview-workflow { min-height: 620px; }
.header-title { margin-right: 10px; }
.edit-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.edit-heading h3 { margin: 0; }
.edit-heading p, .toolbar-heading p { margin: 4px 0 0; color: var(--color-text-secondary); font-size: 12px; }
.edit-body { display: flex; align-items: flex-start; gap: 16px; }
.edit-main { min-width: 0; flex: 1; padding: 24px; border: 1px solid var(--color-divider); border-radius: 16px; background: #fff; }
.edit-sidebar { display: flex; width: 292px; flex: 0 0 292px; flex-direction: column; gap: 22px; padding: 18px; border: 1px solid var(--color-divider); border-radius: 16px; background: #fff; }
.edit-sidebar h4 { margin: 0 0 10px; padding-bottom: 9px; border-bottom: 1px solid var(--color-border-light); }
.editor-placeholder { display: flex; width: 100%; min-height: 310px; align-items: center; justify-content: center; flex-direction: column; gap: 7px; border: 1px solid var(--color-divider); border-radius: 12px; color: var(--color-text-secondary); background: #fbfcfd; }
.editor-placeholder strong { color: var(--color-text-title); }
.cover-placeholder { display: grid; aspect-ratio: 16 / 10; place-items: center; border: 1px dashed #bdc6d0; border-radius: 10px; color: var(--color-text-secondary); background: #f8fafb; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.review-stats { margin-bottom: 12px; }
.toolbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
.toolbar-heading { padding-left: 13px; border-left: 4px solid var(--color-primary); }
.toolbar-heading h3 { margin: 0; font-size: 25px; }
.toolbar-actions { display: flex; gap: 8px; }
.stat-mini { display: flex; min-height: 78px; flex-direction: column; justify-content: center; }
.stat-mini .v { font-size: 25px; font-weight: 720; }
.stat-mini .l { margin-top: 4px; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
.page-header h2 { margin: 0 0 4px; font-size: 25px; }
.update-time, .metric-label, .metric-change { color: var(--color-text-secondary); font-size: 12px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.metric-row { margin-bottom: 16px; }
.metric-value { margin: 7px 0; }
.chart-placeholder { display: flex; height: 300px; align-items: flex-end; gap: 8px; padding: 30px 8px 12px; border-bottom: 1px solid var(--color-divider); }
.chart-placeholder i { flex: 1; min-width: 3px; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, #26715f, rgba(38,113,95,.22)); }
.donut-placeholder { position: relative; display: grid; height: 300px; place-items: center; }
.donut-placeholder::before { position: absolute; width: 172px; height: 172px; border: 28px solid #e8edef; border-top-color: #26715f; border-right-color: #b8893f; border-radius: 50%; content: ""; transform: rotate(18deg); }
.donut-placeholder div { z-index: 1; display: flex; align-items: center; flex-direction: column; }
.donut-placeholder strong { color: var(--color-text-title); font-size: 21px; }
.donut-placeholder span { color: var(--color-text-secondary); font-size: 11px; }
.settings-toolbar { display: flex; align-items: center; gap: 12px; margin: 14px 0; padding: 12px; border: 1px solid var(--color-divider); border-radius: 12px; background: #fff; }
.settings-toolbar :deep(.el-input) { max-width: 420px; }
.settings-count { margin-left: auto; color: var(--color-text-secondary); font-size: 12px; }
@media (max-width: 760px) { .edit-header { align-items: flex-start; flex-direction: column; } .edit-body, .toolbar, .page-header { align-items: stretch; flex-direction: column; } .edit-sidebar { position: static; width: 100%; flex-basis: auto; } .header-actions, .toolbar-actions { flex-wrap: wrap; } }
</style>
