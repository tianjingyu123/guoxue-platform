<template>
  <div class="audit-page">
    <div class="toolbar">
      <div class="toolbar-heading">
        <h3>内容审核中心</h3>
        <p>集中处理平台公开内容与课程审核，优先完成待审队列。</p>
      </div>
      <div class="toolbar-actions">
        <template v-if="batchEnabled">
          <el-button
            type="success"
            :disabled="selected.length === 0"
            @click="batchApprove"
          >
            批量通过
          </el-button>
          <el-button
            type="danger"
            :disabled="selected.length === 0"
            @click="batchReject"
          >
            批量拒绝
          </el-button>
        </template>
        <el-button
          :icon="RefreshIcon"
          @click="refreshAll"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片（内容全量口径·课程待审单独统计）-->
    <el-row
      :gutter="12"
      style="margin-bottom:12px"
    >
      <el-col :span="5">
        <div class="stat-mini">
          <span class="v">{{ statsAvailable ? stats.pending : '—' }}</span><span class="l">待审核内容（全量）</span>
        </div>
      </el-col>
      <el-col :span="5">
        <div class="stat-mini">
          <span class="v">{{ coursePendingTotal }}</span><span class="l">待审核课程（全量）</span>
        </div>
      </el-col>
      <el-col :span="5">
        <div class="stat-mini">
          <span class="v">{{ statsAvailable ? stats.approved : '—' }}</span><span class="l">已通过内容（含已发布）</span>
        </div>
      </el-col>
      <el-col :span="5">
        <div class="stat-mini">
          <span class="v">{{ statsAvailable ? stats.rejected : '—' }}</span><span class="l">已拒绝内容（全量）</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div
          class="stat-mini"
          style="display:flex;align-items:center;justify-content:center"
        >
          <span
            v-if="!statsAvailable"
            class="l"
          >统计接口不可用（当前账号无权限）</span>
          <span
            v-else
            class="l"
          >统计为内容全量口径</span>
        </div>
      </el-col>
    </el-row>

    <el-tabs
      v-model="activeTab"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="待审核"
        name="PENDING"
      />
      <el-tab-pane
        label="平台开放申请"
        name="PLATFORM_OPEN"
      />
      <el-tab-pane name="COURSE">
        <template #label>
          课程审核{{ coursePendingTotal ? `（${coursePendingTotal}）` : '' }}
        </template>
      </el-tab-pane>
      <el-tab-pane
        label="已通过"
        name="APPROVED"
      />
      <el-tab-pane
        label="已拒绝"
        name="REJECTED"
      />
    </el-tabs>

    <el-alert
      v-if="error"
      type="error"
      title="审核列表加载失败，请重试"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        type="primary"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <!-- 平台开放审核队列（向全平台开放必审·五类内容统一台账）-->
    <template v-if="activeTab === 'PLATFORM_OPEN'">
      <div class="queue-context">
        <el-select
          v-model="platformStatus"
          size="small"
          style="width:130px"
          @change="fetchList"
        >
          <el-option
            label="待审核"
            value="PENDING"
          />
          <el-option
            label="已通过"
            value="APPROVED"
          />
          <el-option
            label="已驳回"
            value="REJECTED"
          />
        </el-select>
        <el-select
          v-model="platformType"
          size="small"
          placeholder="按类型筛选"
          clearable
          style="width:130px"
          @change="fetchList"
        >
          <el-option
            v-for="t in ['ARTICLE', 'POST', 'COURSE', 'VIDEO', 'LIVE']"
            :key="t"
            :label="typeLabel(t)"
            :value="t"
          />
        </el-select>
        <span class="queue-note">圈内内容自治不进此队列；只有申请「向全平台开放」的内容在此人工审核，通过后才进平台公共池</span>
      </div>
      <el-table
        v-loading="platformLoading"
        :data="platformList"
        stripe
      >
        <template #empty>
          <el-empty :description="platformStatus === 'PENDING' ? '暂无待处理申请，去看看已通过的？' : '暂无记录，换个筛选条件试试'" />
        </template>
        <el-table-column
          label="类型"
          width="90"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="typeTag(row.contentType)"
            >
              {{ typeLabel(row.contentType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="内容标题"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.contentTitle || row.contentId }}
          </template>
        </el-table-column>
        <el-table-column
          label="提交人"
          width="130"
        >
          <template #default="{ row }">
            <template v-if="row.submitter?.nickname">
              {{ row.submitter.nickname }}
            </template>
            <span
              v-else-if="row.submitterId"
              class="id-chip"
              :title="`${row.submitterId}（点击复制）`"
              @click="copyId(row.submitterId)"
            >{{ shortId(row.submitterId) }}</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="来源圈子"
          width="130"
        >
          <template #default="{ row }">
            <span
              v-if="row.circleId"
              class="id-chip"
              :title="`${row.circleId}（点击复制）`"
              @click="copyId(row.circleId)"
            >{{ shortId(row.circleId) }}</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="提交时间"
          width="150"
        >
          <template #default="{ row }">
            <span :title="formatFull(row.createdAt)">{{ formatSmart(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          v-if="platformStatus === 'REJECTED'"
          label="驳回原因"
          min-width="150"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.rejectReason || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="170"
          fixed="right"
        >
          <template #default="{ row }">
            <template v-if="platformStatus === 'PENDING'">
              <el-button
                size="small"
                type="success"
                @click="platformApprove(row)"
              >
                通过
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="platformReject(row)"
              >
                驳回
              </el-button>
            </template>
            <span
              v-else-if="row.humanAuditorId"
              style="font-size:12px;color:var(--color-text-secondary)"
            >审核人
              <span
                class="id-chip"
                :title="`${row.humanAuditorId}（点击复制）`"
                @click="copyId(row.humanAuditorId)"
              >{{ shortId(row.humanAuditorId) }}</span>
            </span>
            <span
              v-else
              style="font-size:12px;color:var(--color-text-secondary)"
            >—</span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="platformPage"
        :total="platformTotal"
        :page-size="20"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchList"
      />
    </template>

    <!-- 课程审核队列（独立数据源·服务端分页）-->
    <template v-if="activeTab === 'COURSE'">
      <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
        <el-select
          v-model="courseStatus"
          size="small"
          style="width:130px"
          @change="onCourseFilterChange"
        >
          <el-option
            label="待审核"
            value="PENDING"
          />
          <el-option
            label="已通过"
            value="APPROVED"
          />
          <el-option
            label="已驳回"
            value="REJECTED"
          />
          <el-option
            label="全部状态"
            value="ALL"
          />
        </el-select>
        <el-input
          v-model="keyword"
          size="small"
          placeholder="按课程标题搜索"
          clearable
          style="width:200px"
          @keyup.enter="onCourseFilterChange"
          @clear="onCourseFilterChange"
        />
        <el-button
          size="small"
          type="primary"
          @click="onCourseFilterChange"
        >
          查询
        </el-button>
      </div>
      <el-table
        v-loading="courseLoading"
        :data="courseList"
        stripe
        @selection-change="handleSelection"
      >
        <template #empty>
          <el-empty :description="courseStatus === 'PENDING' ? '暂无待审核课程' : '暂无记录，换个筛选条件试试'" />
        </template>
        <el-table-column
          v-if="courseStatus === 'PENDING'"
          type="selection"
          width="45"
        />
        <el-table-column
          prop="title"
          label="课程标题"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          label="讲师"
          width="120"
        >
          <template #default="{ row }">
            {{ row.user?.nickname || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="品类"
          width="110"
        >
          <template #default="{ row }">
            {{ row.categoryLevel1 || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          v-if="courseStatus === 'ALL'"
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="statusTag(row.status)"
            >
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="提交时间"
          width="150"
        >
          <template #default="{ row }">
            <span :title="formatFull(row.createdAt)">{{ formatSmart(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="240"
          fixed="right"
        >
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button
                size="small"
                type="success"
                @click="approveOne(row)"
              >
                通过
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="rejectOne(row)"
              >
                拒绝
              </el-button>
            </template>
            <el-button
              size="small"
              @click="preview(row)"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="coursePage"
        v-model:page-size="coursePageSize"
        :total="courseTotal"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top:16px;justify-content:flex-end"
        @size-change="onCoursePageSizeChange"
        @current-change="fetchList"
      />
    </template>

    <!-- 内容列表（PENDING / APPROVED / REJECTED·服务端分页）-->
    <template v-if="isContentTab">
      <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;flex-wrap:wrap">
        <el-input
          v-model="keyword"
          size="small"
          placeholder="按标题/作者搜索"
          clearable
          style="width:200px"
          @keyup.enter="onContentFilterChange"
          @clear="onContentFilterChange"
        />
        <el-select
          v-model="filterType"
          size="small"
          placeholder="按类型筛选"
          clearable
          style="width:130px"
          @change="onContentFilterChange"
        >
          <el-option
            label="文章"
            value="ARTICLE"
          />
          <el-option
            label="诗词"
            value="POEM"
          />
          <el-option
            label="古籍"
            value="CLASSIC"
          />
        </el-select>
        <el-button
          size="small"
          type="primary"
          @click="onContentFilterChange"
        >
          查询
        </el-button>
        <el-button
          size="small"
          @click="resetFilters"
        >
          重置
        </el-button>
        <el-radio-group
          v-if="activeTab === 'APPROVED'"
          v-model="approvedSub"
          size="small"
          @change="onContentFilterChange"
        >
          <el-radio-button value="PUBLISHED">
            已发布
          </el-radio-button>
          <el-radio-button value="APPROVED">
            审核通过待发布
          </el-radio-button>
        </el-radio-group>
      </div>

      <el-table
        v-loading="loading"
        :data="list"
        stripe
        @selection-change="handleSelection"
      >
        <template #empty>
          <el-empty :description="activeTab === 'PENDING' ? '暂无待审核内容，去看看已通过的？' : '暂无记录，换个筛选条件试试'" />
        </template>
        <el-table-column
          v-if="activeTab === 'PENDING'"
          type="selection"
          width="45"
        />
        <el-table-column
          label="类型"
          width="90"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="typeTag(row.type)"
            >
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="AI"
          width="55"
        >
          <template #default="{ row }">
            <el-tag
              v-if="isAiContent(row)"
              type="warning"
              size="small"
              effect="dark"
            >
              AI
            </el-tag>
            <span
              v-else
              style="color:#c0c4cc"
            >—</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="标题"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          label="品类"
          width="100"
        >
          <template #default="{ row }">
            <span
              v-if="row.categoryLevel1"
              style="font-size:12px"
            >{{ row.categoryLevel1 }}</span>
            <span
              v-else
              style="color:#c0c4cc"
            >—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="作者"
          width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.author || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          v-if="activeTab === 'REJECTED'"
          label="拒绝原因"
          min-width="150"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.auditReason || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="提交时间"
          width="150"
        >
          <template #default="{ row }">
            <span :title="formatFull(row.createdAt)">{{ formatSmart(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="240"
          fixed="right"
        >
          <template #default="{ row }">
            <template v-if="activeTab === 'PENDING'">
              <el-button
                size="small"
                type="success"
                @click="approveOne(row)"
              >
                通过
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="rejectOne(row)"
              >
                拒绝
              </el-button>
            </template>
            <el-button
              size="small"
              @click="preview(row)"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top:16px;justify-content:flex-end"
        @size-change="onPageSizeChange"
        @current-change="fetchList"
      />
    </template>

    <!-- 拒绝原因对话框（单条/批量共用）-->
    <el-dialog
      v-model="rejectVisible"
      :title="batchMode ? `批量拒绝（已选 ${selected.length} 条）` : '拒绝原因'"
      width="480px"
    >
      <div class="quick-reasons">
        <el-tag
          v-for="r in COMMON_REJECT_REASONS"
          :key="r"
          size="small"
          style="cursor:pointer"
          @click="rejectReason = r"
        >
          {{ r }}
        </el-tag>
      </div>
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="3"
        placeholder="请填写拒绝原因（必填，将反馈给作者）"
      />
      <template #footer>
        <el-button @click="rejectVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :disabled="!rejectReason.trim()"
          :loading="rejectSubmitting"
          @click="confirmReject"
        >
          确认拒绝
        </el-button>
      </template>
    </el-dialog>

    <!-- 预览抽屉（审核弹窗内呈现被审内容本体·支持连续审核）-->
    <el-drawer
      v-model="drawerVisible"
      title="内容预览"
      size="600px"
    >
      <div
        v-if="currentItem"
        class="preview-body"
      >
        <h2>{{ currentItem.title }}</h2>
        <p class="meta">
          作者：{{ currentItem._kind === 'COURSE' ? (currentItem.user?.nickname || '—') : (currentItem.author || '—') }} | {{ formatFull(currentItem.createdAt) }}
        </p>
        <SafeHtml
          class="content"
          :html="currentItem.body || currentItem.intro || currentItem.excerpt || '暂无内容'"
        />
      </div>
      <template
        v-if="currentItem && currentItem.status === 'PENDING'"
        #footer
      >
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <el-button
            type="danger"
            :loading="drawerSubmitting"
            @click="rejectFromDrawer"
          >
            拒绝
          </el-button>
          <el-button
            type="success"
            :loading="drawerSubmitting"
            @click="drawerApprove(false)"
          >
            通过
          </el-button>
          <el-button
            type="success"
            plain
            :loading="drawerSubmitting"
            @click="drawerApprove(true)"
          >
            通过并看下一条
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh as RefreshIcon } from '@element-plus/icons-vue'
import SafeHtml from '@/components/SafeHtml.vue'
import { contentApi, courseApi, auditApi } from '@/api'

// AI 生成内容的真实标记：内容生成管线写入的 tags（不做标题猜测）
const AI_TAGS = ['基础知识库', '经典精华库', '玩法教程库', 'AI生成', 'AI互动'];

const COMMON_REJECT_REASONS = [
  '内容与国学主题无关',
  '含违规或敏感信息',
  '内容质量不达标',
  '涉嫌抄袭搬运',
  '图文不符/信息不实',
];

// 审核行（内容/课程共用·课程行 _kind=COURSE 且 status 归一自 auditStatus）
interface ContentRow {
  id: string
  _kind?: 'CONTENT' | 'COURSE'
  type?: string
  tags?: string[]
  title?: string
  author?: string | null
  categoryLevel1?: string | null
  status?: string
  auditReason?: string | null
  body?: string
  excerpt?: string
  intro?: string
  createdAt?: string
  updatedAt?: string
  user?: { nickname?: string } | null
}

interface CourseApiRow {
  id: string
  title?: string
  intro?: string
  categoryLevel1?: string | null
  auditStatus?: string
  createdAt?: string
  user?: { nickname?: string } | null
}

const loading = ref(false)
const error = ref(false)
const activeTab = ref('PENDING')
const list = ref<ContentRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const selected = ref<ContentRow[]>([])
const keyword = ref('')
const filterType = ref('')
const approvedSub = ref<'PUBLISHED' | 'APPROVED'>('PUBLISHED')

// 全量统计（contentApi.stats·内容口径不含课程；无权限时诚实显示不可用）
const statsAvailable = ref(true)
const stats = reactive({ pending: 0, approved: 0, rejected: 0 })
const coursePendingTotal = ref(0)

// 课程审核队列（独立数据源，不与内容硬拼一个列表）
const courseLoading = ref(false)
const courseList = ref<ContentRow[]>([])
const courseTotal = ref(0)
const coursePage = ref(1)
const coursePageSize = ref(20)
const courseStatus = ref('PENDING')

const rejectVisible = ref(false)
const rejectReason = ref('')
const rejectSubmitting = ref(false)
const pendingItem = ref<ContentRow | null>(null)
const batchMode = ref(false)
const rejectViaDrawer = ref(false)

const drawerVisible = ref(false)
const drawerSubmitting = ref(false)
const currentItem = ref<ContentRow | null>(null)

const isContentTab = computed(() => ['PENDING', 'APPROVED', 'REJECTED'].includes(activeTab.value))
const batchEnabled = computed(() =>
  (activeTab.value === 'PENDING') || (activeTab.value === 'COURSE' && courseStatus.value === 'PENDING'))

// ── 平台开放审核队列（ContentAuditRecord 统一台账）──
interface PlatformAuditRow {
  id: string
  contentType: string
  contentId: string
  contentTitle?: string | null
  circleId?: string | null
  submitterId: string
  submitter?: { nickname?: string } | null
  finalStatus: string
  rejectReason?: string | null
  humanAuditorId?: string | null
  createdAt?: string
}
const platformLoading = ref(false)
const platformList = ref<PlatformAuditRow[]>([])
const platformTotal = ref(0)
const platformPage = ref(1)
const platformStatus = ref('PENDING')
const platformType = ref('')

function isAiContent(row: ContentRow): boolean {
  const tags: string[] = row.tags || [];
  return tags.some((t) => AI_TAGS.some((at) => t.includes(at)));
}

onMounted(() => {
  fetchList();
  fetchStats();
  fetchCoursePendingCount();
});

function typeLabel(t: string) {
  const map: Record<string, string> = { ARTICLE: '文章', POEM: '诗词', CLASSIC: '古籍', COURSE: '课程', VIDEO: '视频', POST: '帖子', LIVE: '直播' }
  return map[t] || t
}
function typeTag(t: string) {
  const map: Record<string, string> = { ARTICLE: '', POEM: 'success', CLASSIC: 'warning', COURSE: 'danger', VIDEO: 'info', POST: '', LIVE: 'warning' }
  return map[t] || ''
}
function statusLabel(s?: string) {
  const map: Record<string, string> = { PENDING: '待审核', APPROVED: '已通过', PUBLISHED: '已发布', REJECTED: '已拒绝', DRAFT: '草稿' }
  return (s && map[s]) || s || '—'
}
function statusTag(s?: string) {
  const map: Record<string, string> = { PENDING: 'warning', APPROVED: 'success', PUBLISHED: 'success', REJECTED: 'danger', DRAFT: 'info' }
  return (s && map[s]) || 'info'
}

function formatFull(d?: string | null) {
  // 固定中文 24 小时制：默认 toLocaleString 在部分环境输出美式 "5/7/2026, 5:59 AM"
  return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '—'
}
function formatSmart(d?: string | null) {
  if (!d) return '—'
  const t = new Date(d)
  const diff = Date.now() - t.getTime()
  if (diff >= 0 && diff < 60_000) return '刚刚'
  if (diff >= 0 && diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff >= 0 && diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`
}

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}
async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    ElMessage.success('已复制')
  } catch {
    // 非安全上下文降级
    const ta = document.createElement('textarea')
    ta.value = id
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    ElMessage.success('已复制')
  }
}

function handleSelection(rows: ContentRow[]) { selected.value = rows }

function onTabChange() {
  page.value = 1
  coursePage.value = 1
  selected.value = []
  error.value = false
  fetchList()
}
function onContentFilterChange() { page.value = 1; fetchList() }
function onCourseFilterChange() { coursePage.value = 1; selected.value = []; fetchList() }
function onPageSizeChange() { page.value = 1; fetchList() }
function onCoursePageSizeChange() { coursePage.value = 1; fetchList() }
function resetFilters() {
  keyword.value = ''
  filterType.value = ''
  page.value = 1
  fetchList()
}

function refreshAll() {
  fetchList()
  fetchStats()
  fetchCoursePendingCount()
}

async function fetchStats() {
  try {
    const { data } = await contentApi.stats()
    const by = (s: string) => (data.byStatus || []).find((x: { status: string; count: number }) => x.status === s)?.count || 0
    stats.pending = by('PENDING')
    // 存量内容默认 PUBLISHED、审核通过为 APPROVED：口径合并，避免 tab 与统计打架
    stats.approved = by('APPROVED') + by('PUBLISHED')
    stats.rejected = by('REJECTED')
    statsAvailable.value = true
  } catch {
    statsAvailable.value = false
  }
}

async function fetchCoursePendingCount() {
  try {
    const { data } = await courseApi.list({ page: 1, pageSize: 1, auditStatus: 'PENDING' })
    coursePendingTotal.value = data.total ?? 0
  } catch {
    coursePendingTotal.value = 0
  }
}

async function fetchList() {
  if (activeTab.value === 'PLATFORM_OPEN') return fetchPlatformQueue()
  if (activeTab.value === 'COURSE') return fetchCourses()
  loading.value = true
  error.value = false
  try {
    // 已通过 tab：存量内容默认 PUBLISHED、审核通过为 APPROVED；后端 status 仅支持单值，
    // 用子筛选（默认已发布）保真分页，不做前端假合并
    const status = activeTab.value === 'APPROVED' ? approvedSub.value : activeTab.value
    const { data } = await contentApi.list({
      page: page.value,
      pageSize: pageSize.value,
      status,
      keyword: keyword.value.trim() || undefined,
      type: filterType.value || undefined,
    })
    list.value = ((data.data || data.items || []) as ContentRow[]).map((c) => ({ ...c, _kind: 'CONTENT' as const, type: c.type || 'ARTICLE' }))
    total.value = data.total ?? 0
  } catch {
    error.value = true
    list.value = []
    total.value = 0
  } finally { loading.value = false }
}

async function fetchCourses() {
  courseLoading.value = true
  error.value = false
  try {
    const { data } = await courseApi.list({
      page: coursePage.value,
      pageSize: coursePageSize.value,
      auditStatus: courseStatus.value,
      keyword: keyword.value.trim() || undefined,
    })
    courseList.value = ((data.courses || []) as CourseApiRow[]).map((c) => ({
      ...c,
      _kind: 'COURSE' as const,
      status: c.auditStatus,
      body: c.intro,
    }))
    courseTotal.value = data.total ?? 0
  } catch {
    error.value = true
    courseList.value = []
    courseTotal.value = 0
  } finally { courseLoading.value = false }
}

async function fetchPlatformQueue() {
  platformLoading.value = true
  error.value = false
  try {
    const { data } = await auditApi.listContentAudits({
      finalStatus: platformStatus.value,
      contentType: platformType.value || undefined,
      page: platformPage.value,
      pageSize: 20,
    })
    platformList.value = data.records || []
    platformTotal.value = data.total ?? 0
  } catch {
    error.value = true
    platformList.value = []
    platformTotal.value = 0
  } finally { platformLoading.value = false }
}

function platformApprove(row: PlatformAuditRow) {
  ElMessageBox.confirm(`确定通过「${row.contentTitle || row.contentId}」向全平台开放？通过后进入平台公共池。`, '平台开放审核', { type: 'success' }).then(async () => {
    await auditApi.reviewContentAudit(row.id, { action: 'approve' })
    ElMessage.success('已通过，内容将进入平台公共池')
    fetchPlatformQueue()
  }).catch(() => {})
}

function platformReject(row: PlatformAuditRow) {
  ElMessageBox.prompt('请填写驳回原因（发布者可见，内容保持圈内可见）', '驳回申请', {
    inputType: 'textarea',
    inputValidator: (v: string) => (v && v.trim().length > 0) || '驳回原因必填',
  }).then(async ({ value }) => {
    await auditApi.reviewContentAudit(row.id, { action: 'reject', reason: value.trim() })
    ElMessage.success('已驳回')
    fetchPlatformQueue()
  }).catch(() => {})
}

// ── 审核动作（专用审核端点·内容/课程分流）──

async function doAudit(row: ContentRow, status: 'APPROVED' | 'REJECTED', reason?: string) {
  if (row._kind === 'COURSE') return courseApi.audit(row.id, status, reason)
  try {
    return await contentApi.audit(row.id, status, reason)
  } catch (e) {
    // 兼容回退：后端专用审核端点(PUT /contents/:id/audit)未部署时 404，
    // 降级走旧编辑端点保持审核可用（旧口径=超管/运营可审）。后端上线后此分支自然不再触发。
    if ((e as { response?: { status?: number } })?.response?.status === 404) {
      return contentApi.update(row.id, { status, auditReason: reason })
    }
    throw e
  }
}

function approveOne(row: ContentRow) {
  ElMessageBox.confirm('确定通过该内容？通过后对用户可见。', '审核', { type: 'success' }).then(async () => {
    await doAudit(row, 'APPROVED')
    ElMessage.success('已通过')
    refreshAll()
  }).catch(() => {})
}

function rejectOne(row: ContentRow) {
  pendingItem.value = row
  batchMode.value = false
  rejectViaDrawer.value = false
  rejectReason.value = ''
  rejectVisible.value = true
}

function batchReject() {
  if (selected.value.length === 0) return
  batchMode.value = true
  pendingItem.value = null
  rejectViaDrawer.value = false
  rejectReason.value = ''
  rejectVisible.value = true
}

async function confirmReject() {
  const reason = rejectReason.value.trim()
  if (!reason) return
  rejectSubmitting.value = true
  try {
    if (batchMode.value) {
      if (selected.value.length === 0) { rejectVisible.value = false; return }
      const rows = [...selected.value]
      const results = await Promise.allSettled(rows.map((r) => doAudit(r, 'REJECTED', reason)))
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const fail = results.length - ok
      if (fail === 0) ElMessage.success(`已批量拒绝 ${ok} 条`)
      else ElMessage.warning(`批量拒绝完成：成功 ${ok} 条，失败 ${fail} 条`)
    } else if (pendingItem.value) {
      const item = pendingItem.value
      await doAudit(item, 'REJECTED', reason)
      ElMessage.success('已拒绝')
      // 从抽屉发起的拒绝：连续审核，自动跳下一条待审
      if (rejectViaDrawer.value && drawerVisible.value && currentItem.value?.id === item.id) {
        const next = drawerNextCandidate()
        removeLocal(item.id)
        if (next) currentItem.value = next
        else drawerVisible.value = false
      }
    } else {
      rejectVisible.value = false
      return
    }
    rejectVisible.value = false
    refreshAll()
  } catch { /* 具体错误信息由 api 拦截器提示 */ }
  finally { rejectSubmitting.value = false }
}

function batchApprove() {
  if (selected.value.length === 0) return
  const count = selected.value.length
  ElMessageBox.confirm(`确定批量通过选中的 ${count} 条？通过后将对用户可见。`, '批量通过', { type: 'warning' }).then(async () => {
    const rows = [...selected.value]
    const results = await Promise.allSettled(rows.map((r) => doAudit(r, 'APPROVED')))
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const fail = results.length - ok
    if (fail === 0) ElMessage.success(`已批量通过 ${ok} 条`)
    else ElMessage.warning(`批量通过完成：成功 ${ok} 条，失败 ${fail} 条`)
    refreshAll()
  }).catch(() => {})
}

// ── 预览 + 连续审核 ──

function preview(row: ContentRow) {
  currentItem.value = row
  drawerVisible.value = true
}

function currentQueue(): ContentRow[] {
  return activeTab.value === 'COURSE' ? courseList.value : list.value
}

function drawerNextCandidate(): ContentRow | null {
  if (!currentItem.value) return null
  const arr = currentQueue()
  const idx = arr.findIndex((i) => i.id === currentItem.value?.id)
  for (let i = idx + 1; i < arr.length; i++) {
    if (arr[i].status === 'PENDING') return arr[i]
  }
  return null
}

function removeLocal(id: string) {
  list.value = list.value.filter((i) => i.id !== id)
  courseList.value = courseList.value.filter((i) => i.id !== id)
}

async function drawerApprove(goNext: boolean) {
  const item = currentItem.value
  if (!item) return
  drawerSubmitting.value = true
  try {
    await doAudit(item, 'APPROVED')
    ElMessage.success('已通过')
    const next = goNext ? drawerNextCandidate() : null
    removeLocal(item.id)
    if (next) currentItem.value = next
    else drawerVisible.value = false
    refreshAll()
  } catch { /* 具体错误信息由 api 拦截器提示 */ }
  finally { drawerSubmitting.value = false }
}

function rejectFromDrawer() {
  if (!currentItem.value) return
  pendingItem.value = currentItem.value
  batchMode.value = false
  rejectViaDrawer.value = true
  rejectReason.value = ''
  rejectVisible.value = true
}
</script>

<style scoped>
.audit-page { padding: 0; }
.toolbar { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 18px; }
.toolbar-heading { min-width: 0; padding-left: 13px; border-left: 4px solid var(--color-primary); }
.toolbar h3 { margin: 0; font-size: 25px; font-weight: 680; letter-spacing: -.025em; color: var(--color-text-title); }
.toolbar-heading p { margin: 5px 0 0; color: var(--color-text-secondary); font-size: 12px; }
.toolbar-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.stat-mini { background: var(--color-bg-page); border-radius: 6px; padding: 8px 12px; text-align: center; height: 100%; box-sizing: border-box; }
.stat-mini .v { display: block; font-size: 22px; font-weight: 700; color: var(--color-text-title); }
.stat-mini .l { display: block; font-size: 11px; color: var(--color-text-secondary); }
.id-chip { cursor: pointer; font-family: monospace; font-size: 12px; color: var(--el-color-primary); }
.id-chip:hover { text-decoration: underline; }
.quick-reasons { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.preview-body h2 { color: var(--color-text-title); margin-bottom: 8px; }
.preview-body .meta { color: var(--color-text-secondary); font-size: 13px; margin-bottom: 16px; }
.preview-body .content { line-height: 1.8; color: #444; }
.queue-context { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 11px 12px; border: 1px solid var(--color-divider); border-radius: 11px; background: rgba(255,255,255,.78); }
.queue-note { min-width: 220px; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; }

@media (max-width: 760px) {
  .toolbar { align-items: flex-start; flex-direction: column; }
  .toolbar-actions { width: 100%; justify-content: flex-start; }
  .queue-context { align-items: stretch; flex-direction: column; }
  .queue-context :deep(.el-select) { width: 100% !important; }
}
</style>
