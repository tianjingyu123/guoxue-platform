<template>
  <!-- 课程运营页（2026-07-11 编辑器重做）：原"编辑课程"页的基本信息/章节编辑已迁往 CourseEditor.vue，
       本页保留学员/作业/评价/问答/统计等运营管理能力，路由 /courses/:id/manage -->
  <div class="course-edit">
    <el-page-header
      title="返回"
      style="margin-bottom:16px"
      @back="router.push('/courses')"
    >
      <template #content>
        课程运营{{ courseTitle ? ` · ${courseTitle}` : '' }}
      </template>
      <template #extra>
        <el-button
          type="primary"
          plain
          size="small"
          @click="router.push(`/courses/${courseId}/edit`)"
        >
          编辑课程内容
        </el-button>
      </template>
    </el-page-header>

    <el-tabs
      v-model="activeTab"
      type="border-card"
    >
      <!-- Tab 3: 学员管理 -->
      <el-tab-pane
        v-if="isEdit"
        label="学员管理"
        name="students"
      >
        <div class="section-header">
          <span>共 {{ studentTotal }} 名学员</span>
          <el-button
            size="small"
            @click="fetchStudents"
          >
            刷新
          </el-button>
        </div>
        <el-table
          v-loading="studentLoading"
          :data="students"
          stripe
          style="margin-top:12px"
        >
          <el-table-column
            label="学员"
            min-width="140"
          >
            <template #default="{ row }">
              <div style="display:flex;align-items:center;gap:8px">
                <el-avatar
                  v-if="row.user?.avatar"
                  :src="row.user.avatar"
                  :size="32"
                />
                <span>{{ row.user?.nickname || row.user?.id || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="支付金额"
            width="100"
          >
            <template #default="{ row }">
              ¥{{ row.amount || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            label="购买时间"
            width="170"
          >
            <template #default="{ row }">
              {{ row.paidAt ? new Date(row.paidAt).toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="已完成章节"
            width="110"
          >
            <template #default="{ row }">
              {{ row.progress?.completedChapters || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            label="总进度"
            width="90"
          >
            <template #default="{ row }">
              <el-progress
                :percentage="row.progress?.totalProgress || 0"
                :stroke-width="6"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="100"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="viewStudentDetail(row)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="studentTotal > studentPageSize"
          v-model:current-page="studentPage"
          :page-size="studentPageSize"
          :total="studentTotal"
          layout="prev, pager, next"
          size="small"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchStudents"
        />
      </el-tab-pane>

      <!-- Tab 4: 作业批改 -->
      <el-tab-pane
        v-if="isEdit"
        label="作业批改"
        name="works"
      >
        <div class="section-header">
          <span>共 {{ workTotal }} 份作业</span>
          <div style="display:flex;gap:8px">
            <el-button
              size="small"
              type="success"
              :loading="aiBatchLoading"
              @click="handleAiBatchScore"
            >
              AI 批量批改
            </el-button>
            <el-button
              size="small"
              @click="fetchWorks"
            >
              刷新
            </el-button>
          </div>
        </div>
        <el-alert
          v-if="workError"
          type="error"
          :closable="false"
          show-icon
          style="margin-top:12px"
        >
          <template #title>
            作业列表加载失败，请
            <el-button
              link
              type="primary"
              @click="fetchWorks"
            >
              重试
            </el-button>
          </template>
        </el-alert>
        <el-table
          v-loading="workLoading"
          :data="works"
          stripe
          style="margin-top:12px"
        >
          <template #empty>
            <el-empty description="暂无学员提交作业" />
          </template>
          <el-table-column
            label="学员"
            width="130"
          >
            <template #default="{ row }">
              <span v-if="row.user?.nickname">{{ row.user.nickname }}</span>
              <el-tooltip
                v-else-if="row.userId"
                :content="'用户ID：' + row.userId + '（点击复制）'"
              >
                <span
                  style="cursor:pointer;color:#666"
                  @click="copyText(row.userId)"
                >{{ row.userId.slice(0, 8) }}…</span>
              </el-tooltip>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column
            label="章节"
            width="120"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.chapter?.title || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            prop="content"
            label="内容"
            min-width="200"
            show-overflow-tooltip
          />
          <el-table-column
            label="提交时间"
            width="160"
          >
            <template #default="{ row }">
              {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="评分"
            width="90"
          >
            <template #default="{ row }">
              {{ row.score != null ? row.score + '分' : '未评分' }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="200"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="openScoreDialog(row)"
              >
                {{ row.score != null ? '重新评分' : '评分' }}
              </el-button>
              <el-button
                size="small"
                type="success"
                :loading="aiScoreLoading === row.id"
                @click="handleAiScore(row)"
              >
                AI 建议分
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="workTotal > workPageSize"
          v-model:current-page="workPage"
          :page-size="workPageSize"
          :total="workTotal"
          layout="prev, pager, next"
          size="small"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchWorks"
        />
      </el-tab-pane>

      <!-- Tab 5: 评价管理 -->
      <el-tab-pane
        v-if="isEdit"
        label="评价管理"
        name="reviews"
      >
        <div class="section-header">
          <span>共 {{ reviewTotal }} 条评价</span>
          <el-select
            v-model="reviewFilter"
            placeholder="状态筛选"
            size="small"
            clearable
            style="width:120px"
            @change="fetchReviews"
          >
            <el-option
              label="已发布"
              value="PUBLISHED"
            />
            <el-option
              label="已隐藏"
              value="HIDDEN"
            />
          </el-select>
        </div>
        <el-table
          v-loading="reviewLoading"
          :data="reviews"
          stripe
          style="margin-top:12px"
        >
          <el-table-column
            label="用户"
            width="120"
          >
            <template #default="{ row }">
              {{ row.user?.nickname || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="评分"
            width="80"
          >
            <template #default="{ row }">
              ⭐ {{ row.rating }}
            </template>
          </el-table-column>
          <el-table-column
            prop="content"
            label="内容"
            min-width="200"
            show-overflow-tooltip
          />
          <el-table-column
            label="状态"
            width="80"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'HIDDEN' ? 'danger' : 'success'"
                size="small"
              >
                {{ row.status === 'HIDDEN' ? '已隐藏' : '已发布' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="时间"
            width="160"
          >
            <template #default="{ row }">
              {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="200"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="openReplyDialog(row)"
              >
                回复
              </el-button>
              <el-button
                size="small"
                :type="row.status === 'HIDDEN' ? 'success' : 'warning'"
                @click="toggleReview(row)"
              >
                {{ row.status === 'HIDDEN' ? '恢复' : '隐藏' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="reviewTotal > reviewPageSize"
          v-model:current-page="reviewPage"
          :page-size="reviewPageSize"
          :total="reviewTotal"
          layout="prev, pager, next"
          size="small"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchReviews"
        />
      </el-tab-pane>

      <!-- Tab 6: 问答管理 -->
      <el-tab-pane
        v-if="isEdit"
        label="问答管理"
        name="qas"
      >
        <div class="section-header">
          <span>共 {{ qaTotal }} 条问答</span>
          <div style="display:flex;gap:8px">
            <el-select
              v-model="qaFilter.status"
              placeholder="状态"
              size="small"
              clearable
              style="width:110px"
              @change="fetchQas"
            >
              <el-option
                label="待回答"
                value="PENDING"
              />
              <el-option
                label="已回答"
                value="ANSWERED"
              />
              <el-option
                label="已关闭"
                value="CLOSED"
              />
            </el-select>
            <el-select
              v-if="qaTags.length > 0"
              v-model="qaFilter.tag"
              placeholder="标签"
              size="small"
              clearable
              style="width:110px"
              @change="fetchQas"
            >
              <el-option
                v-for="t in qaTags"
                :key="t"
                :label="t"
                :value="t"
              />
            </el-select>
            <el-button
              size="small"
              @click="fetchQas"
            >
              刷新
            </el-button>
          </div>
        </div>
        <el-table
          v-loading="qaLoading"
          :data="qas"
          stripe
          style="margin-top:12px"
        >
          <el-table-column
            label="提问者"
            width="110"
          >
            <template #default="{ row }">
              {{ row.user?.nickname || row.userId?.slice(0, 8) || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            prop="question"
            label="问题"
            min-width="200"
            show-overflow-tooltip
          />
          <el-table-column
            label="章节"
            width="110"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.chapter?.title || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="标签"
            width="120"
          >
            <template #default="{ row }">
              <el-tag
                v-for="t in row.tags"
                :key="t"
                size="small"
                style="margin-right:4px"
              >
                {{ t }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="80"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'ANSWERED' ? 'success' : row.status === 'CLOSED' ? 'info' : 'warning'"
                size="small"
              >
                {{ ({ PENDING: '待回答', ANSWERED: '已回答', CLOSED: '已关闭' } as Record<string, string>)[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="提问时间"
            width="160"
          >
            <template #default="{ row }">
              {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="200"
          >
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'PENDING'"
                size="small"
                type="primary"
                @click="openQaAnswerDialog(row)"
              >
                回答
              </el-button>
              <el-button
                v-if="row.status === 'ANSWERED'"
                size="small"
                @click="openQaAnswerDialog(row)"
              >
                编辑
              </el-button>
              <el-button
                v-if="row.status === 'PENDING' || row.status === 'ANSWERED'"
                size="small"
                type="success"
                :loading="aiSuggestLoading === row.id"
                @click="handleAiSuggest(row)"
              >
                AI辅助
              </el-button>
              <el-button
                v-if="row.status !== 'CLOSED'"
                size="small"
                type="warning"
                @click="handleCloseQa(row)"
              >
                关闭
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="qaTotal > qaPageSize"
          v-model:current-page="qaPage"
          :page-size="qaPageSize"
          :total="qaTotal"
          layout="prev, pager, next"
          size="small"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchQas"
        />
      </el-tab-pane>

      <!-- Tab 7: 数据统计 -->
      <el-tab-pane
        v-if="isEdit"
        label="数据统计"
        name="stats"
      >
        <div
          v-loading="statsLoading"
          style="min-height:200px"
        >
          <el-row
            v-if="stats"
            :gutter="16"
          >
            <el-col :span="6">
              <div class="stat-card">
                <div class="stat-label">
                  报名人数
                </div><div class="stat-value">
                  {{ stats.enrollmentCount }}
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-card">
                <div class="stat-label">
                  完成人数
                </div><div class="stat-value">
                  {{ stats.completedCount }}
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-card">
                <div class="stat-label">
                  平均评分
                </div><div class="stat-value">
                  {{ stats.avgRating }} ⭐
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-card">
                <div class="stat-label">
                  作业总数
                </div><div class="stat-value">
                  {{ stats.totalWorks }}
                </div>
              </div>
            </el-col>
          </el-row>
          <el-empty
            v-if="!stats && !statsLoading"
            description="暂无数据"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 作业评分弹窗（人工评分 / AI 建议分人工采纳共用） -->
    <el-dialog
      v-model="scoreDialog"
      :title="aiSuggestedScore ? '作业评分（含 AI 建议）' : '作业评分'"
      width="500px"
    >
      <el-alert
        v-if="aiSuggestedScore"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
      >
        <template #title>
          AI 建议分 {{ aiSuggestedScore.score }} 分（模型：{{ aiSuggestedScore.model || 'AI' }}）·仅供参考，可调整后由您确认提交才会生效
        </template>
      </el-alert>
      <el-form label-width="80px">
        <el-form-item label="学员">
          <span>{{ scoringWork?.user?.nickname || (scoringWork?.userId ? scoringWork.userId.slice(0, 8) + '…' : '—') }}</span>
        </el-form-item>
        <el-form-item label="作业内容">
          <div style="max-height:200px;overflow-y:auto;background:#f5f5f5;padding:12px;border-radius:4px">
            {{ scoringWork?.content }}
          </div>
        </el-form-item>
        <el-form-item label="评分">
          <el-input-number
            v-model="scoreForm.score"
            :min="0"
            :max="100"
          />
        </el-form-item>
        <el-form-item label="点评">
          <el-input
            v-model="scoreForm.feedback"
            type="textarea"
            :rows="3"
            placeholder="可选点评"
          />
        </el-form-item>
        <el-form-item
          v-if="aiSuggestedScore?.suggestions?.length"
          label="AI 建议"
        >
          <div style="font-size:12px;color:#888;line-height:1.6">
            <div
              v-for="(s, i) in aiSuggestedScore.suggestions"
              :key="i"
            >
              · {{ s }}
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scoreDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="scoreSubmitting"
          @click="submitScore"
        >
          {{ aiSuggestedScore ? '采纳并提交' : '提交' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 评价回复弹窗 -->
    <el-dialog
      v-model="replyDialog"
      title="回复评价"
      width="500px"
    >
      <el-form label-width="80px">
        <el-form-item label="用户评价">
          <div style="color:#666">
            {{ replyingReview?.content }}
          </div>
        </el-form-item>
        <el-form-item label="回复内容">
          <el-input
            v-model="replyContent"
            type="textarea"
            :rows="3"
            placeholder="输入回复内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="replySubmitting"
          @click="submitReply"
        >
          提交
        </el-button>
      </template>
    </el-dialog>

    <!-- 问答回答弹窗 -->
    <el-dialog
      v-model="qaAnswerDialog"
      title="回答问题"
      width="550px"
    >
      <el-form label-width="80px">
        <el-form-item label="学生提问">
          <div style="background:#f5f5f5;padding:12px;border-radius:4px;max-height:150px;overflow-y:auto">
            {{ answeringQa?.question }}
          </div>
        </el-form-item>
        <el-form-item
          v-if="answeringQa?.answer"
          label="现有回答"
        >
          <div style="color:#666">
            {{ answeringQa?.answer }}
          </div>
        </el-form-item>
        <el-form-item label="回答内容">
          <el-input
            v-model="qaAnswerContent"
            type="textarea"
            :rows="4"
            placeholder="输入回答内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="qaAnswerDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="qaSubmitting"
          @click="submitQaAnswer"
        >
          提交回答
        </el-button>
      </template>
    </el-dialog>

    <!-- 学员详情弹窗 -->
    <el-dialog
      v-model="studentDetailDialog"
      title="学员学习详情"
      width="700px"
    >
      <div
        v-if="studentDetail"
        v-loading="studentDetailLoading"
      >
        <h4 style="margin-bottom:8px">
          章节进度
        </h4>
        <el-table
          :data="studentDetail.progresses || []"
          stripe
          size="small"
        >
          <el-table-column
            label="章节"
            prop="chapter.title"
          />
          <el-table-column
            label="进度"
            width="100"
          >
            <template #default="{ row }">
              {{ row.progress }}%
            </template>
          </el-table-column>
          <el-table-column
            label="完成"
            width="80"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.completed ? 'success' : 'info'"
                size="small"
              >
                {{ row.completed ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="更新时间"
            width="160"
          >
            <template #default="{ row }">
              {{ row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-' }}
            </template>
          </el-table-column>
        </el-table>
        <h4
          v-if="(studentDetail.works || []).length > 0"
          style="margin:16px 0 8px"
        >
          作业记录
        </h4>
        <el-table
          v-if="(studentDetail.works || []).length > 0"
          :data="studentDetail.works"
          stripe
          size="small"
        >
          <el-table-column
            label="章节"
            prop="chapter.title"
          />
          <el-table-column
            label="内容"
            prop="content"
            show-overflow-tooltip
          />
          <el-table-column
            label="评分"
            width="80"
          >
            <template #default="{ row }">
              {{ row.score != null ? row.score + '分' : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// 课程运营页脚本（2026-07-11 编辑器重做）：基本信息/章节编辑逻辑已迁往 CourseEditor.vue，
// 本页只保留学员/作业/评价/问答/统计的运营管理逻辑。
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { courseApi } from '@/api'

const route = useRoute()
const router = useRouter()
const isEdit = ref(!!route.params.id)
const courseId = route.params.id as string
const activeTab = ref("students")
const courseTitle = ref('')

// ─── 行/详情类型（字段宽松 optional，不复刻完整后端结构） ───
/** 学员行 */
interface StudentRow {
  id?: string; userId?: string;
  user?: { id?: string; nickname?: string; avatar?: string };
  amount?: number; paidAt?: string;
  progress?: { completedChapters?: number; totalProgress?: number };
}
/** 作业行 */
interface WorkRow {
  id: string; userId?: string; content?: string; score?: number; feedback?: string;
  user?: { id?: string; nickname?: string; avatar?: string };
  chapter?: { title?: string }; createdAt?: string;
}
/** AI 建议分（单份批改端点只出建议不落库，采纳后经人工评分端点落库） */
interface AiScoreSuggestion { score: number; feedback?: string; suggestions?: string[]; model?: string }
/** 评价行 */
interface ReviewRow {
  id: string; rating?: number; content?: string; status?: string; reply?: string;
  user?: { nickname?: string }; createdAt?: string;
}
/** 问答行 */
interface QaRow {
  id: string; question?: string; answer?: string; status?: string; tags?: string[];
  user?: { nickname?: string }; userId?: string; chapter?: { title?: string }; createdAt?: string;
}
/** 课程统计 */
interface CourseStats {
  enrollmentCount?: number; completedCount?: number; avgRating?: number; totalWorks?: number;
}
/** 学员学习详情 */
interface StudentDetailData { progresses?: unknown[]; works?: unknown[] }

// ─── 学员管理 ───
const students = ref<StudentRow[]>([])
const studentTotal = ref(0)
const studentPage = ref(1)
const studentPageSize = ref(20)
const studentLoading = ref(false)

// ─── 作业批改 ───
const works = ref<WorkRow[]>([])
const workTotal = ref(0)
const workPage = ref(1)
const workPageSize = ref(20)
const workLoading = ref(false)
const workError = ref(false)
const scoreDialog = ref(false)
const scoringWork = ref<WorkRow | null>(null)
const scoreForm = reactive({ score: 80, feedback: '' })
const scoreSubmitting = ref(false)
const aiScoreLoading = ref('')
const aiBatchLoading = ref(false)
// 非空 = 当前评分弹窗由"AI 建议分"发起（展示 AI 来源标注，人工采纳才落库）
const aiSuggestedScore = ref<AiScoreSuggestion | null>(null)

// ─── 评价管理 ───
const reviews = ref<ReviewRow[]>([])
const reviewTotal = ref(0)
const reviewPage = ref(1)
const reviewPageSize = ref(20)
const reviewLoading = ref(false)
const reviewFilter = ref('')
const replyDialog = ref(false)
const replyingReview = ref<ReviewRow | null>(null)
const replyContent = ref('')

// ─── 问答管理 ───
const qas = ref<QaRow[]>([])
const qaTotal = ref(0)
const qaPage = ref(1)
const qaPageSize = ref(20)
const qaLoading = ref(false)
const qaFilter = reactive({ status: '', tag: '' })
const qaTags = ref<string[]>([])
const qaAnswerDialog = ref(false)
const answeringQa = ref<QaRow | null>(null)
const qaAnswerContent = ref('')
const aiSuggestLoading = ref('')

// ─── 数据统计 ───
const stats = ref<CourseStats | null>(null)
const statsLoading = ref(false)

// ─── 学员详情 ───
const studentDetailDialog = ref(false)
const studentDetail = ref<StudentDetailData | null>(null)
const studentDetailLoading = ref(false)

// ─── 初始化 ───
onMounted(async () => {
  if (!isEdit.value) { router.replace('/courses'); return }
  fetchStudents()
  // 标题仅作页头展示：详情端点自带，失败静默（不阻塞运营 tab）
  try {
    const { data } = await courseApi.detail(courseId)
    courseTitle.value = data?.title || ''
  } catch { /* 静默 */ }
})

// ─── 学员操作 ───
async function fetchStudents() {
  studentLoading.value = true
  try {
    const { data } = await courseApi.getStudents(courseId, { page: studentPage.value, pageSize: studentPageSize.value })
    students.value = data.items || data.students || []
    studentTotal.value = data.total || 0
  } finally { studentLoading.value = false }
}

async function viewStudentDetail(row: StudentRow) {
  studentDetailDialog.value = true
  studentDetailLoading.value = true
  try {
    const { data } = await courseApi.getStudentProgress(courseId, (row.user?.id || row.userId)!)
    studentDetail.value = data
  } finally { studentDetailLoading.value = false }
}

// ─── 作业操作 ───
async function fetchWorks() {
  workLoading.value = true
  workError.value = false
  try {
    const { data } = await courseApi.getWorks(courseId, { page: workPage.value, pageSize: workPageSize.value })
    works.value = Array.isArray(data) ? data : data.list || data.works || data.items || []
    workTotal.value = data.total ?? works.value.length
  } catch {
    works.value = []
    workError.value = true
  } finally { workLoading.value = false }
}

function copyText(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => ElMessage.success('已复制'),
    () => ElMessage.warning('复制失败，请手动复制'),
  )
}

function openScoreDialog(work: WorkRow) {
  scoringWork.value = work
  scoreForm.score = work.score || 80
  scoreForm.feedback = work.feedback || ''
  aiSuggestedScore.value = null
  scoreDialog.value = true
}

async function submitScore() {
  if (scoreSubmitting.value) return
  scoreSubmitting.value = true
  try {
    await courseApi.scoreWork(scoringWork.value!.id, scoreForm.score, scoreForm.feedback)
    ElMessage.success(aiSuggestedScore.value ? '已采纳 AI 建议分并提交' : '评分已提交')
    scoreDialog.value = false
    aiSuggestedScore.value = null
    fetchWorks()
  } catch {
    ElMessage.error('评分提交失败，请重试')
  } finally { scoreSubmitting.value = false }
}

// AI 建议分（合规改造·标准3.3-1）：单份批改端点只返回建议分不落库；
// 这里拿到建议后打开评分弹窗标注"AI 建议"，由人工采纳/调整后经评分端点落库。
async function handleAiScore(work: WorkRow) {
  aiScoreLoading.value = work.id
  try {
    const { data } = await courseApi.aiScoreWork(work.id)
    scoringWork.value = work
    scoreForm.score = Number(data.suggestedScore) || 70
    scoreForm.feedback = data.feedback || ''
    aiSuggestedScore.value = { score: Number(data.suggestedScore) || 70, feedback: data.feedback, suggestions: data.suggestions, model: data.model }
    scoreDialog.value = true
  } catch { /* handled by interceptor */ } finally { aiScoreLoading.value = '' }
}

// 批量端点后端为"批改后直接写入评分"（course-work.service aiBatchScoreWorks），
// 前置 L3 确认（影响预告+AI 来源声明），批改后可逐份人工复核修改。
async function handleAiBatchScore() {
  const pending = workTotal.value
  try {
    await ElMessageBox.confirm(
      `AI 将自动批改该课程未评分的作业（单次最多 50 份${pending ? `，当前共 ${pending} 份作业` : ''}），批改结果为 AI 生成并会直接写入评分。写入后您仍可逐份人工复核修改。确定继续？`,
      'AI 批量批改确认',
      { type: 'warning', confirmButtonText: '确认批改', cancelButtonText: '取消' },
    )
  } catch { return }
  aiBatchLoading.value = true
  try {
    const { data } = await courseApi.aiBatchScoreWorks(courseId)
    if (data.processed === 0) {
      ElMessage.info(data.message || '没有待批改的作业')
    } else {
      ElMessage.success(`AI 批量批改完成 — 处理 ${data.processed} 份，成功 ${data.successCount} 份${data.failCount > 0 ? `，失败 ${data.failCount} 份` : ''}，评分已标注为 AI 批改，可逐份人工复核`)
    }
    fetchWorks()
  } catch { /* handled by interceptor */ } finally { aiBatchLoading.value = false }
}

// ─── 评价操作 ───
async function fetchReviews() {
  reviewLoading.value = true
  try {
    const { data } = await courseApi.getAllReviews(courseId, { page: reviewPage.value, pageSize: reviewPageSize.value, status: reviewFilter.value || undefined })
    reviews.value = data.items || data.reviews || []
    reviewTotal.value = data.total || 0
  } finally { reviewLoading.value = false }
}

function openReplyDialog(review: ReviewRow) {
  replyingReview.value = review
  replyContent.value = review.reply || ''
  replyDialog.value = true
}

const replySubmitting = ref(false)
async function submitReply() {
  if (!replyContent.value.trim()) { ElMessage.warning('请输入回复内容'); return }
  if (replySubmitting.value) return
  replySubmitting.value = true
  try {
    await courseApi.replyReview(replyingReview.value!.id, replyContent.value)
    ElMessage.success('回复成功')
    replyDialog.value = false
    fetchReviews()
  } catch {
    ElMessage.error('回复失败，请重试')
  } finally { replySubmitting.value = false }
}

async function toggleReview(review: ReviewRow) {
  const newStatus = review.status === 'HIDDEN' ? 'PUBLISHED' : 'HIDDEN'
  await courseApi.toggleReview(review.id, newStatus)
  ElMessage.success(newStatus === 'HIDDEN' ? '已隐藏' : '已恢复')
  fetchReviews()
}

// ─── 统计 ───
async function fetchStats() {
  statsLoading.value = true
  try {
    const { data } = await courseApi.getStats(courseId)
    stats.value = data
  } finally { statsLoading.value = false }
}

// ─── 问答操作 ───
async function fetchQas() {
  qaLoading.value = true
  try {
    const params: Record<string, string | number> = { page: qaPage.value, pageSize: qaPageSize.value }
    if (qaFilter.status) params.status = qaFilter.status
    if (qaFilter.tag) params.tag = qaFilter.tag
    const { data } = await courseApi.getQuestions(courseId, params)
    qas.value = data.items || data.questions || []
    qaTotal.value = data.total || 0
  } finally { qaLoading.value = false }
}

async function fetchQaTags() {
  try {
    const { data } = await courseApi.getQuestionTags(courseId)
    qaTags.value = data.items || data.tags || []
  } catch { /* skip */ }
}

function openQaAnswerDialog(qa: QaRow) {
  answeringQa.value = qa
  qaAnswerContent.value = qa.answer || ''
  qaAnswerDialog.value = true
}

const qaSubmitting = ref(false)
async function submitQaAnswer() {
  if (!qaAnswerContent.value.trim()) { ElMessage.warning('请输入回答内容'); return }
  if (qaSubmitting.value) return
  qaSubmitting.value = true
  try {
    await courseApi.answerQuestion(answeringQa.value!.id, qaAnswerContent.value)
    ElMessage.success('回答已提交')
    qaAnswerDialog.value = false
    fetchQas()
  } catch {
    ElMessage.error('回答提交失败，请重试')
  } finally { qaSubmitting.value = false }
}

async function handleCloseQa(qa: QaRow) {
  // 关闭问答确认（关闭后学员不能再追问）
  try {
    await ElMessageBox.confirm('关闭后该问题将不再接受回答，学员端显示为已关闭。确定关闭？', '关闭问答', {
      type: 'warning', confirmButtonText: '确定关闭', cancelButtonText: '取消',
    })
  } catch { return }
  try {
    await courseApi.closeQuestion(qa.id)
    ElMessage.success('问题已关闭')
    fetchQas()
  } catch {
    ElMessage.error('关闭失败，请重试')
  }
}

async function handleAiSuggest(qa: QaRow) {
  aiSuggestLoading.value = qa.id
  try {
    const { data } = await courseApi.aiSuggestAnswer(qa.id)
    answeringQa.value = qa
    qaAnswerContent.value = data.suggestion || ''
    qaAnswerDialog.value = true
    ElMessage.success(`AI 已生成建议（模型: ${data.model || 'AI'}），可修改后提交`)
  } catch { /* handled by interceptor */ } finally { aiSuggestLoading.value = '' }
}

// Tab 切换时加载数据
watch(activeTab, (tab) => {
  if (tab === 'students' && students.value.length === 0) fetchStudents()
  if (tab === 'works' && works.value.length === 0) fetchWorks()
  if (tab === 'reviews' && reviews.value.length === 0) fetchReviews()
  if (tab === 'qas' && qas.value.length === 0) { fetchQas(); fetchQaTags() }
  if (tab === 'stats' && !stats.value) fetchStats()
})
</script>

<style scoped>
.course-edit { padding: 16px; }
.edit-body { display: flex; gap: 16px; }
.edit-main { flex: 1; min-width: 0; }
.edit-sidebar { width: 260px; flex-shrink: 0; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; }
.sidebar-section { margin-bottom: 16px; }
.sidebar-section h4 { margin: 0 0 10px; font-size: 14px; color: var(--color-text-title); border-bottom: 1px solid #f0e6d3; padding-bottom: 6px; }
.cover-preview { position: relative; width: 100%; aspect-ratio: 16/10; border-radius: 4px; overflow: hidden; background: var(--color-bg-page); margin-bottom: 8px; }
.cover-preview img { width: 100%; height: 100%; object-fit: cover; }
.cover-remove { position: absolute; top: 4px; right: 4px; }
.cover-placeholder { width: 100%; aspect-ratio: 16/10; border: 2px dashed #E8E0D5; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--color-text-placeholder); font-size: 13px; margin-bottom: 8px; }
.cover-input-row { display: flex; gap: 4px; }
.stat-card { background: var(--color-bg-card); border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center; margin-bottom: 16px; }
.stat-label { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--color-primary); }
@media (max-width: 900px) { .edit-body { flex-direction: column; } .edit-sidebar { width: 100%; } }
.vod-upload-row { margin-top: 8px; }
.vod-tip { font-size: 12px; color: var(--color-text-secondary, #999); margin-top: 6px; }
</style>
