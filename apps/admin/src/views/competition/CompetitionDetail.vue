<template>
  <div class="competition-detail">
    <el-page-header
      title="返回"
      style="margin-bottom:16px"
      @back="router.push('/competitions')"
    >
      <template #content>
        {{ detail?.title || '赛事详情' }}
      </template>
      <template #extra>
        <el-button
          v-if="detail?.status === 'DRAFT'"
          type="success"
          :loading="statusChanging"
          @click="changeStatus('publish')"
        >
          发布赛事
        </el-button>
        <el-button
          v-if="detail?.status === 'PUBLISHED'"
          type="warning"
          :loading="statusChanging"
          @click="changeStatus('start')"
        >
          开始赛事
        </el-button>
        <el-button
          v-if="detail?.status === 'IN_PROGRESS'"
          type="danger"
          :loading="statusChanging"
          @click="changeStatus('finish')"
        >
          结束赛事
        </el-button>
        <el-button @click="router.push(`/competitions/${route.params.id}/edit`)">
          编辑
        </el-button>
      </template>
    </el-page-header>

    <!-- 错误态 -->
    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="无法获取赛事详情，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchDetail"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-tabs
      v-else
      v-model="activeTab"
      type="border-card"
      @tab-change="onTabChange"
    >
      <!-- Tab 1: 基本信息 -->
      <el-tab-pane
        label="基本信息"
        name="basic"
      >
        <el-card v-loading="loading">
          <el-descriptions
            :column="2"
            border
          >
            <el-descriptions-item
              label="赛事标题"
              :span="2"
            >
              {{ detail?.title }}
            </el-descriptions-item>
            <el-descriptions-item label="赛事类型">
              {{ typeLabels[detail?.type] || detail?.type }}
            </el-descriptions-item>
            <el-descriptions-item label="赛事级别">
              <el-tag
                :type="detail?.level === 'S' ? 'danger' : detail?.level === 'A' ? 'warning' : 'info'"
                size="small"
              >
                {{ detail?.level }}级
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="评分模型">
              {{ scoringModelLabel(detail?.scoringModel) }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag
                :type="statusLabels[detail?.status]?.type || 'info'"
                size="small"
              >
                {{ statusLabels[detail?.status]?.text || detail?.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="报名费">
              {{ detail?.entryFee > 0 ? formatMoney(detail.entryFee) : '免费' }}
            </el-descriptions-item>
            <el-descriptions-item label="人数上限">
              {{ detail?.maxParticipants > 0 ? detail.maxParticipants + '人' : '不限' }}
            </el-descriptions-item>
            <el-descriptions-item label="邀请制">
              {{ detail?.isInviteOnly ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="实名要求">
              {{ detail?.requireIdentity ? '需要' : '不要求' }}
            </el-descriptions-item>
            <el-descriptions-item label="最低等级">
              {{ detail?.minLevel > 0 ? 'Lv.' + detail.minLevel : '不限' }}
            </el-descriptions-item>
            <el-descriptions-item label="总奖金池">
              {{ detail?.totalPrize > 0 ? formatMoney(detail.totalPrize) : '未设置' }}
            </el-descriptions-item>
            <el-descriptions-item label="奖品类型">
              {{ ({ CASH: "现金奖金", PHYSICAL: "实物奖品", VIRTUAL: "虚拟商品", MIXED: "混合" } as any)[detail?.prizeType] || "现金" }}
            </el-descriptions-item>
            <el-descriptions-item label="邀请分润">
              {{ detail?.invitationShare ? (detail.invitationShare / 10).toFixed(1) + '%' : '无' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="detail?.prizeConfig?.length"
              label="奖品分配"
              :span="2"
            >
              <div class="prize-config-list">
                <div
                  v-for="(item, idx) in detail.prizeConfig"
                  :key="idx"
                  class="prize-config-item"
                >
                  <el-tag
                    size="small"
                    type="danger"
                  >
                    {{ item.title || '第' + item.rank + '名' }}
                  </el-tag>
                  <template v-if="item.prizeType === 'PHYSICAL' || item.prizeType === 'VIRTUAL'">
                    <span>{{ item.prizeItem || item.description }}</span>
                    <el-tag
                      size="small"
                      :type="item.prizeType === 'PHYSICAL' ? 'warning' : ''"
                    >
                      实物
                    </el-tag>
                  </template>
                  <template v-else>
                    <span style="color:#C41E3A;font-weight:bold">{{ formatMoney(item.prize || 0) }}</span>
                  </template>
                  <span
                    v-if="item.description"
                    style="color:#999;font-size:12px"
                  >{{ item.description }}</span>
                </div>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="报名人数">
              {{ detail?._count?.registrations || 0 }}人
            </el-descriptions-item>
            <el-descriptions-item label="题目数量">
              {{ detail?._count?.questions || 0 }}题
            </el-descriptions-item>
            <el-descriptions-item
              label="标签"
              :span="2"
            >
              <el-tag
                v-for="t in detail?.tags"
                :key="t"
                size="small"
                style="margin-right:4px"
              >
                {{ t }}
              </el-tag>
              <span
                v-if="!detail?.tags?.length"
                style="color:#ccc"
              >-</span>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDate(detail?.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="发布时间">
              {{ formatDate(detail?.publishedAt) }}
            </el-descriptions-item>
          </el-descriptions>

          <el-divider>赛事描述</el-divider>
          <SafeHtml
            class="markdown-body"
            style="min-height:40px"
            :html="renderMarkdown(detail?.description || '暂无描述')"
          />

          <el-divider v-if="detail?.rules">
            赛事规则
          </el-divider>
          <SafeHtml
            v-if="detail?.rules"
            class="markdown-body"
            :html="renderMarkdown(detail?.rules || '')"
          />
        </el-card>
      </el-tab-pane>

      <!-- Tab 2: 赛程管理 -->
      <el-tab-pane
        label="赛程管理"
        name="rounds"
      >
        <div class="section-header">
          <span>共 {{ rounds.length }} 个赛程</span>
          <el-button
            type="primary"
            size="small"
            @click="openRoundDialog()"
          >
            添加赛程
          </el-button>
        </div>
        <el-table
          :data="rounds"
          stripe
          style="margin-top:12px"
        >
          <el-table-column
            label="排序"
            width="60"
            prop="sortOrder"
          />
          <el-table-column
            prop="title"
            label="标题"
            min-width="150"
          />
          <el-table-column
            label="类型"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.roundType === 'FINAL' ? 'danger' : row.roundType === 'SEMIFINAL' ? 'warning' : 'info'"
                size="small"
              >
                {{ roundTypeLabel(row.roundType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="开始时间"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDate(row.startAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="结束时间"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDate(row.endAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="时长(分)"
            width="80"
          >
            <template #default="{ row }">
              {{ row.duration || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="晋级人数"
            width="90"
          >
            <template #default="{ row }">
              {{ row.passCount || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="150"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="openRoundDialog(row)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="handleDeleteRound(row.id)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Tab 3: 题库管理 -->
      <el-tab-pane
        label="题库管理"
        name="questions"
      >
        <div class="section-header">
          <span>共 {{ questionTotal }} 题</span>
          <div style="display:flex;gap:8px">
            <el-select
              v-model="questionFilter.roundId"
              placeholder="按赛程筛选"
              clearable
              size="small"
              style="width:160px"
              @change="fetchQuestions"
            >
              <el-option
                v-for="r in rounds"
                :key="r.id"
                :label="r.title"
                :value="r.id"
              />
            </el-select>
            <el-button
              size="small"
              @click="fetchQuestions"
            >
              刷新
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="openQuestionDialog()"
            >
              添加题目
            </el-button>
            <el-button
              size="small"
              @click="openBatchImport"
            >
              批量导入
            </el-button>
          </div>
        </div>
        <el-table
          v-loading="questionLoading"
          :data="questions"
          stripe
          style="margin-top:12px"
        >
          <el-table-column
            label="排序"
            width="60"
            prop="sortOrder"
          />
          <el-table-column
            label="题型"
            width="100"
          >
            <template #default="{ row }">
              {{ questionTypeLabel(row.type) }}
            </template>
          </el-table-column>
          <el-table-column
            label="难度"
            width="70"
          >
            <template #default="{ row }">
              <el-rate
                v-model="row.difficulty"
                disabled
                :max="5"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="分值"
            width="70"
            prop="score"
          />
          <el-table-column
            prop="stem"
            label="题干"
            min-width="200"
            show-overflow-tooltip
          />
          <el-table-column
            label="状态"
            width="80"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.isPublished ? 'success' : 'info'"
                size="small"
              >
                {{ row.isPublished ? '已发布' : '草稿' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="180"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="openQuestionDialog(row)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="handleDeleteQuestion(row.id)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="questionTotal > questionPageSize"
          v-model:current-page="questionPage"
          :page-size="questionPageSize"
          :total="questionTotal"
          layout="prev, pager, next"
          size="small"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchQuestions"
        />
      </el-tab-pane>

      <!-- Tab 4: 报名管理 -->
      <el-tab-pane
        label="报名管理"
        name="registrations"
      >
        <div class="section-header">
          <span>共 {{ regTotal }} 条报名</span>
          <div style="display:flex;gap:8px">
            <el-select
              v-model="regFilter.status"
              placeholder="报名状态"
              clearable
              size="small"
              style="width:120px"
              @change="fetchRegistrations"
            >
              <el-option
                label="待审核"
                value="PENDING"
              />
              <el-option
                label="已确认"
                value="QUALIFIED"
              />
              <el-option
                label="已拒绝"
                value="DISQUALIFIED"
              />
              <el-option
                label="已取消"
                value="CANCELLED"
              />
            </el-select>
            <el-button
              size="small"
              @click="fetchRegistrations"
            >
              刷新
            </el-button>
          </div>
        </div>
        <el-table
          v-loading="regLoading"
          :data="registrations"
          stripe
          style="margin-top:12px"
        >
          <el-table-column
            label="用户"
            min-width="140"
          >
            <template #default="{ row }">
              <div style="display:flex;align-items:center;gap:8px">
                <el-avatar
                  v-if="row.user?.avatar"
                  :src="row.user.avatar"
                  :size="28"
                />
                <span>{{ row.user?.nickname || row.user?.id?.slice(0, 8) || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                :type="registrationStatusType(row.status)"
                size="small"
              >
                {{ registrationStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="报名费"
            width="80"
          >
            <template #default="{ row }">
              {{ row.paidFee > 0 ? formatMoney(row.paidFee) : '免费' }}
            </template>
          </el-table-column>
          <el-table-column
            label="邀请人"
            width="100"
          >
            <template #default="{ row }">
              {{ row.inviterId?.slice(0, 8) || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="报名时间"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="160"
          >
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'PENDING'"
                size="small"
                type="success"
                @click="handleRegAction(row.id, 'QUALIFIED')"
              >
                确认
              </el-button>
              <el-button
                v-if="row.status === 'PENDING'"
                size="small"
                type="danger"
                @click="handleRegAction(row.id, 'DISQUALIFIED')"
              >
                拒绝
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="regTotal > regPageSize"
          v-model:current-page="regPage"
          :page-size="regPageSize"
          :total="regTotal"
          layout="prev, pager, next"
          size="small"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchRegistrations"
        />
      </el-tab-pane>

      <!-- Tab 5: 排名管理 -->
      <el-tab-pane
        label="排名管理"
        name="rankings"
      >
        <div class="section-header">
          <span>共 {{ rankTotal }} 条排名</span>
          <div style="display:flex;gap:8px">
            <el-select
              v-model="rankFilter.roundId"
              placeholder="按赛程筛选"
              clearable
              size="small"
              style="width:160px"
              @change="fetchRankings"
            >
              <el-option
                v-for="r in rounds"
                :key="r.id"
                :label="r.title"
                :value="r.id"
              />
            </el-select>
            <el-button
              type="warning"
              size="small"
              :loading="calcingRank"
              @click="handleCalcRanking"
            >
              计算排名
            </el-button>
            <el-button
              size="small"
              @click="fetchRankings"
            >
              刷新
            </el-button>
          </div>
        </div>
        <el-table
          v-loading="rankLoading"
          :data="rankings"
          stripe
          style="margin-top:12px"
        >
          <el-table-column
            label="排名"
            width="70"
            prop="rank"
          >
            <template #default="{ row }">
              <el-tag
                v-if="row.rank === 1"
                type="danger"
                size="small"
              >
                第 1 名
              </el-tag>
              <el-tag
                v-else-if="row.rank === 2"
                type="warning"
                size="small"
              >
                第 2 名
              </el-tag>
              <el-tag
                v-else-if="row.rank === 3"
                type="success"
                size="small"
              >
                第 3 名
              </el-tag>
              <span v-else>{{ row.rank }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="用户"
            min-width="120"
          >
            <template #default="{ row }">
              <div style="display:flex;align-items:center;gap:8px">
                <el-avatar
                  v-if="row.user?.avatar"
                  :src="row.user.avatar"
                  :size="28"
                />
                <span>{{ row.user?.nickname || row.userId?.slice(0, 8) || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="总分"
            width="80"
            prop="score"
          />
          <el-table-column
            label="状态"
            width="80"
          >
            <template #default="{ row }">
              <el-tag
                :type="rankingStatusType(row.status)"
                size="small"
              >
                {{ rankingStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="证书"
            width="100"
          >
            <template #default="{ row }">
              <el-button
                v-if="row.certificateUrl"
                size="small"
                @click="viewCert(row)"
              >
                查看证书
              </el-button>
              <span
                v-else
                style="color:#ccc"
              >-</span>
            </template>
          </el-table-column>
          <el-table-column
            label="更新时间"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="rankTotal > rankPageSize"
          v-model:current-page="rankPage"
          :page-size="rankPageSize"
          :total="rankTotal"
          layout="prev, pager, next"
          size="small"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchRankings"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 赛程编辑弹窗 -->
    <el-dialog
      v-model="roundDialog"
      :title="editingRound ? '编辑赛程' : '添加赛程'"
      width="600px"
    >
      <el-form
        :model="roundForm"
        label-width="100px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input
            v-model="roundForm.title"
            placeholder="赛程标题"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="roundForm.roundType"
            style="width:100%"
          >
            <el-option
              label="初赛"
              value="PRELIMINARY"
            />
            <el-option
              label="复赛"
              value="SEMIFINAL"
            />
            <el-option
              label="决赛"
              value="FINAL"
            />
            <el-option
              label="自定义"
              value="CUSTOM"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="roundForm.sortOrder"
            :min="0"
          />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="roundForm.startAt"
                type="datetime"
                placeholder="选择时间"
                style="width:100%"
                value-format="YYYY-MM-DDTHH:mm:ss.sssZ"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="roundForm.endAt"
                type="datetime"
                placeholder="选择时间"
                style="width:100%"
                value-format="YYYY-MM-DDTHH:mm:ss.sssZ"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="时长(分)">
              <el-input-number
                v-model="roundForm.duration"
                :min="0"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="晋级人数">
              <el-input-number
                v-model="roundForm.passCount"
                :min="0"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="晋级比例(%)">
              <el-input-number
                v-model="roundForm.passPercent"
                :min="0"
                :max="100"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input
            v-model="roundForm.description"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roundDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="savingRound"
          @click="saveRound"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 题目编辑弹窗 -->
    <el-dialog
      v-model="questionDialog"
      :title="editingQuestion ? '编辑题目' : '添加题目'"
      width="700px"
    >
      <el-form
        :model="questionForm"
        label-width="100px"
      >
        <el-form-item
          label="题干"
          required
        >
          <el-input
            v-model="questionForm.stem"
            type="textarea"
            :rows="2"
            placeholder="题目内容"
          />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="题型">
              <el-select
                v-model="questionForm.type"
                style="width:100%"
              >
                <el-option
                  label="单选题"
                  value="SINGLE_CHOICE"
                />
                <el-option
                  label="多选题"
                  value="MULTI_CHOICE"
                />
                <el-option
                  label="填空题"
                  value="FILL_IN"
                />
                <el-option
                  label="主观题"
                  value="SUBJECTIVE"
                />
                <el-option
                  label="判断题"
                  value="JUDGMENT"
                />
                <el-option
                  label="论述题"
                  value="ESSAY"
                />
                <el-option
                  label="量表题"
                  value="SCALE"
                />
                <el-option
                  label="配对题"
                  value="MATCHING"
                />
                <el-option
                  label="代码题"
                  value="CODE"
                />
                <el-option
                  label="上传题"
                  value="UPLOAD"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分值">
              <el-input-number
                v-model="questionForm.score"
                :min="1"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="难度">
              <el-rate
                v-model="questionForm.difficulty"
                :max="5"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="所属赛程">
              <el-select
                v-model="questionForm.roundId"
                placeholder="可选"
                clearable
                style="width:100%"
              >
                <el-option
                  v-for="r in rounds"
                  :key="r.id"
                  :label="r.title"
                  :value="r.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序">
              <el-input-number
                v-model="questionForm.sortOrder"
                :min="0"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="发布">
              <el-switch v-model="questionForm.isPublished" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="选项配置">
          <el-input
            v-model="optionsJson"
            type="textarea"
            :rows="4"
            placeholder="JSON数组，如 [{&quot;label&quot;:&quot;A&quot;,&quot;value&quot;:&quot;a&quot;,&quot;text&quot;:&quot;选项A&quot;}]"
          />
        </el-form-item>
        <el-form-item label="正确答案">
          <el-input
            v-model="answerJson"
            type="textarea"
            :rows="2"
            placeholder="JSON，如 {&quot;value&quot;:&quot;a&quot;} 或 {&quot;values&quot;:[&quot;a&quot;,&quot;b&quot;]}"
          />
        </el-form-item>
        <el-form-item label="解析">
          <el-input
            v-model="questionForm.analysis"
            type="textarea"
            :rows="2"
            placeholder="答案解析（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="questionDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="savingQuestion"
          @click="saveQuestion"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量导入题目弹窗 -->
    <el-dialog
      v-model="batchDialog"
      title="批量导入题目"
      width="600px"
    >
      <el-form label-width="80px">
        <el-form-item label="导入格式">
          <el-radio-group v-model="batchFormat">
            <el-radio value="json">
              JSON
            </el-radio>
            <el-radio value="csv">
              CSV
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="题目数据">
          <el-input
            v-model="batchContent"
            type="textarea"
            :rows="12"
            :placeholder="batchPlaceholder"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="batchImporting"
          @click="doBatchImport"
        >
          导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 证书预览弹窗 -->
    <el-dialog
      v-model="certDialog"
      title="获奖证书"
      width="850px"
      top="3vh"
    >
      <iframe
        v-if="certHtml"
        :srcdoc="certHtml"
        style="width:100%;height:600px;border:1px solid #eee"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import SafeHtml from "@/components/SafeHtml.vue";
import { sanitize } from "@/utils/sanitize";
import { competitionApi, api } from "@/api";

const route = useRoute();
const router = useRouter();
const competitionId = route.params.id as string;
const activeTab = ref("basic");

// ─── 行类型（字段宽松 optional，不复刻完整后端结构） ───
/** 赛程行 */
interface RoundRow {
  id: string; title?: string; roundType?: string; sortOrder?: number;
  startAt?: string; endAt?: string; duration?: number;
  passCount?: number; passPercent?: number; description?: string;
}
/** 题目行 */
interface QuestionRow {
  id: string; stem?: string; type?: string; score?: number; difficulty?: number;
  roundId?: string; sortOrder?: number; isPublished?: boolean;
  analysis?: string; source?: string; tags?: string[]; options?: unknown; answer?: unknown;
}
/** 报名行 */
interface RegistrationRow {
  id: string; status?: string; paidFee?: number; inviterId?: string;
  user?: { id?: string; nickname?: string; avatar?: string }; createdAt?: string;
}
/** 排名行 */
interface RankingRow {
  id: string; rank?: number; score?: number; status?: string; certificateUrl?: string;
  user?: { nickname?: string; avatar?: string }; userId?: string; updatedAt?: string;
}

// ─── 类型标签 ───
const typeLabels: Record<string, string> = {
  BAZI_PREDICT: "八字预测赛", LIUYAO: "六爻断卦赛", QIMEN_DUNJIA: "奇门遁甲赛",
  MEIHUA_YISHU: "梅花易数赛", ZIWEI_DOUSHU: "紫微斗数赛", FENGSHUI: "风水堪舆赛",
  NAME_ANALYSIS: "姓名学赛", POETRY: "诗词大赛", COUPLET: "对联大赛",
  CALLIGRAPHY: "书法大赛", PAINTING: "国画大赛", MUSIC: "民乐/古琴大赛",
  GO_CHESS: "围棋/象棋赛", TEA_CEREMONY: "茶道赛", INCENSE: "香道赛",
  MARTIAL_ARTS: "武术/太极赛", TCM_DIAGNOSIS: "中医辨证赛", CLASSIC_RECITE: "经典诵读赛",
  GEWU_PERCEIVE: "格物感知赛", UNKNOWN_PREDICT: "未知预测赛",
};

const statusLabels: Record<string, { text: string; type: string }> = {
  DRAFT: { text: "草稿", type: "info" },
  PUBLISHED: { text: "已发布", type: "success" },
  IN_PROGRESS: { text: "进行中", type: "warning" },
  FINISHED: { text: "已结束", type: "" },
};

const scoringModelLabels: Record<string, string> = {
  A: "全自动评分",
  B: "AI+评委混合",
  C: "纯评委评分",
  D: "对弈引擎",
};
const roundTypeLabels: Record<string, string> = {
  PRELIMINARY: "初赛",
  SEMIFINAL: "复赛",
  FINAL: "决赛",
  CUSTOM: "自定义",
};
const questionTypeLabels: Record<string, string> = {
  SINGLE_CHOICE: "单选",
  MULTI_CHOICE: "多选",
  FILL_IN: "填空",
  SCALE: "量表",
  SUBJECTIVE: "主观",
  ESSAY: "论述",
  JUDGMENT: "判断",
  CODE: "代码",
  UPLOAD: "上传",
  MATCHING: "配对",
};
const registrationStatusLabels: Record<string, string> = {
  PENDING: "待审核",
  QUALIFIED: "已确认",
  DISQUALIFIED: "已拒绝",
  CANCELLED: "已取消",
};
const registrationStatusTypes: Record<string, "warning" | "success" | "danger" | "info"> = {
  PENDING: "warning",
  QUALIFIED: "success",
  DISQUALIFIED: "danger",
  CANCELLED: "info",
};
const rankingStatusLabels: Record<string, string> = {
  CHAMPION: "冠军",
  RUNNER_UP: "亚军",
  THIRD_PLACE: "季军",
  ELIMINATED: "淘汰",
};
const rankingStatusTypes: Record<string, "danger" | "warning" | "success" | "info"> = {
  CHAMPION: "danger",
  RUNNER_UP: "warning",
  THIRD_PLACE: "success",
  ELIMINATED: "info",
};

const labelOrFallback = (labels: Record<string, string>, value?: string) =>
  value ? labels[value] || value : "-";
const scoringModelLabel = (model?: string) => labelOrFallback(scoringModelLabels, model);
const roundTypeLabel = (type?: string) => labelOrFallback(roundTypeLabels, type);
const questionTypeLabel = (type?: string) => labelOrFallback(questionTypeLabels, type);
const registrationStatusLabel = (status?: string) => labelOrFallback(registrationStatusLabels, status);
const registrationStatusType = (status?: string) =>
  (status && registrationStatusTypes[status]) || "info";
const rankingStatusLabel = (status?: string) => labelOrFallback(rankingStatusLabels, status);
const rankingStatusType = (status?: string) => (status && rankingStatusTypes[status]) || "info";

// ─── 基本信息 ───
const loading = ref(false);
const error = ref(false);
const statusChanging = ref(false);
// 详情接口仍是历史动态结构；待服务端 DTO 固化后再收紧。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const detail = ref<any>(null);

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleString("zh-CN");
}

/** 金额：后端以「分」存储（entryFee/totalPrize/prize/paidFee），统一转元、千分位两位小数 */
function formatMoney(fen: number) {
  return "¥" + (fen / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 轻量 Markdown 渲染（标题/加粗/斜体/无序列表/换行）。
 * 项目无 markdown 依赖（package.json 已核实），不为此引新库；输出经 sanitize 消毒防 XSS。
 */
function renderMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    const inline = (s: string) => s
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const listItem = line.match(/^\s*[-*]\s+(.*)$/);
    if (listItem) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(listItem[1])}</li>`);
      continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    if (heading) {
      const level = Math.min(heading[1].length + 2, 6); // #→h3 起，避免盖过页面标题层级
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (line.trim() === "") {
      out.push("<br>");
    } else {
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return sanitize(out.join(""));
}

async function fetchDetail() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await competitionApi.detail(competitionId);
    detail.value = data;
  } catch {
    error.value = true;
  } finally { loading.value = false }
}

async function changeStatus(action: string) {
  if (statusChanging.value) return;
  // 状态流转均为影响全平台用户的操作：发布/开始/结束都先确认
  try {
    if (action === "publish") {
      await ElMessageBox.confirm("发布后赛事将对全平台用户可见并开放报名，确定发布？", "发布确认", { type: "warning" });
    } else if (action === "start") {
      await ElMessageBox.confirm("开始后赛事进入进行中状态，报名截止、选手开始比赛，确定开始？", "开始确认", { type: "warning" });
    } else if (action === "finish") {
      await ElMessageBox.confirm("确定结束该赛事？结束后不可恢复。", "结束确认", { type: "warning" });
    }
  } catch { return; /* 用户取消 */ }
  statusChanging.value = true;
  try {
    if (action === "publish") { await competitionApi.publish(competitionId); }
    else if (action === "start") { await competitionApi.start(competitionId); }
    else if (action === "finish") { await competitionApi.finish(competitionId); }
    ElMessage.success("操作成功");
    fetchDetail();
  } catch { /* 接口拦截器已提示 */ } finally { statusChanging.value = false }
}

// ─── 赛程管理 ───
const rounds = ref<RoundRow[]>([]);
const roundDialog = ref(false);
const savingRound = ref(false);
const editingRound = ref<RoundRow | null>(null);
const roundForm = reactive({
  title: "", roundType: "PRELIMINARY", sortOrder: 0,
  startAt: "", endAt: "", duration: undefined as number | undefined,
  passCount: undefined as number | undefined, passPercent: undefined as number | undefined,
  description: "",
});

async function fetchRounds() {
  try {
    const { data } = await competitionApi.listRounds(competitionId);
    rounds.value = Array.isArray(data) ? data : data.data || [];
  } catch {
    ElMessage.error("加载赛程失败");
  }
}

function openRoundDialog(row?: RoundRow) {
  if (row) {
    editingRound.value = row;
    Object.assign(roundForm, {
      title: row.title, roundType: row.roundType || "PRELIMINARY", sortOrder: row.sortOrder || 0,
      startAt: row.startAt || "", endAt: row.endAt || "", duration: row.duration,
      passCount: row.passCount, passPercent: row.passPercent, description: row.description || "",
    });
  } else {
    editingRound.value = null;
    Object.assign(roundForm, {
      title: "", roundType: "PRELIMINARY", sortOrder: rounds.value.length + 1,
      startAt: "", endAt: "", duration: undefined, passCount: undefined, passPercent: undefined, description: "",
    });
  }
  roundDialog.value = true;
}

async function saveRound() {
  if (savingRound.value) return;
  if (!roundForm.title.trim()) { ElMessage.warning("请填写赛程标题"); return; }
  savingRound.value = true;
  try {
    const payload = { ...roundForm };
    if (editingRound.value) {
      await competitionApi.updateRound(competitionId, editingRound.value.id, payload);
    } else {
      await competitionApi.createRound(competitionId, { ...payload, competitionId });
    }
    ElMessage.success("赛程已保存");
    roundDialog.value = false;
    fetchRounds();
  } catch {
    ElMessage.error("保存失败，请重试");
  } finally {
    savingRound.value = false;
  }
}

async function handleDeleteRound(roundId: string) {
  try {
    await ElMessageBox.confirm("确定删除该赛程？", "提示", { type: "warning" });
    await competitionApi.deleteRound(competitionId, roundId);
    ElMessage.success("已删除");
    fetchRounds();
  } catch { /* */ }
}

// ─── 题库管理 ───
const questions = ref<QuestionRow[]>([]);
const questionLoading = ref(false);
const questionTotal = ref(0);
const questionPage = ref(1);
const questionPageSize = ref(50);
const questionFilter = reactive({ roundId: "" });
const questionDialog = ref(false);
const savingQuestion = ref(false);
const editingQuestion = ref<QuestionRow | null>(null);
const optionsJson = ref("");
const answerJson = ref("");
const questionForm = reactive({
  stem: "", type: "SINGLE_CHOICE", score: 10, difficulty: 3,
  roundId: "" as string | undefined, sortOrder: 0, isPublished: true,
  analysis: "", source: "", tags: [] as string[],
});

async function fetchQuestions() {
  questionLoading.value = true;
  try {
    const params: Record<string, string | number> = { page: questionPage.value, pageSize: questionPageSize.value };
    if (questionFilter.roundId) params.roundId = questionFilter.roundId;
    const { data } = await competitionApi.listQuestions(competitionId, params);
    const list = data?.data || data || [];
    questions.value = Array.isArray(list) ? list : [];
    questionTotal.value = data?.total || questions.value.length;
  } finally { questionLoading.value = false }
}

function openQuestionDialog(row?: QuestionRow) {
  if (row) {
    editingQuestion.value = row;
    Object.assign(questionForm, {
      stem: row.stem, type: row.type, score: row.score, difficulty: row.difficulty,
      roundId: row.roundId, sortOrder: row.sortOrder || 0, isPublished: row.isPublished,
      analysis: row.analysis || "", source: row.source || "", tags: row.tags || [],
    });
    optionsJson.value = row.options ? JSON.stringify(row.options, null, 2) : "";
    answerJson.value = row.answer ? JSON.stringify(row.answer, null, 2) : "";
  } else {
    editingQuestion.value = null;
    Object.assign(questionForm, {
      stem: "", type: "SINGLE_CHOICE", score: 10, difficulty: 3,
      roundId: undefined, sortOrder: 0, isPublished: true, analysis: "", source: "", tags: [],
    });
    optionsJson.value = "";
    answerJson.value = "";
  }
  questionDialog.value = true;
}

async function saveQuestion() {
  let options: unknown = undefined;
  let answer: unknown = undefined;
  try {
    if (optionsJson.value.trim()) options = JSON.parse(optionsJson.value);
    if (answerJson.value.trim()) answer = JSON.parse(answerJson.value);
  } catch {
    ElMessage.warning("选项或答案JSON格式不正确");
    return;
  }

  if (savingQuestion.value) return;
  if (!questionForm.stem.trim()) { ElMessage.warning("请填写题干"); return; }

  const payload = {
    ...questionForm,
    competitionId: competitionId,
    options,
    answer: answer || {},
    roundId: questionForm.roundId || undefined,
  };

  savingQuestion.value = true;
  try {
    if (editingQuestion.value) {
      await competitionApi.updateQuestion(competitionId, editingQuestion.value.id, payload);
    } else {
      await competitionApi.addQuestion(competitionId, payload);
    }
    ElMessage.success("题目已保存");
    questionDialog.value = false;
    fetchQuestions();
  } catch {
    ElMessage.error("保存失败，请重试");
  } finally {
    savingQuestion.value = false;
  }
}

async function handleDeleteQuestion(questionId: string) {
  try {
    await ElMessageBox.confirm("确定删除该题目？", "提示", { type: "warning" });
    await competitionApi.deleteQuestion(competitionId, questionId);
    ElMessage.success("已删除");
    fetchQuestions();
  } catch { /* */ }
}

// ─── 报名管理 ───
const registrations = ref<RegistrationRow[]>([]);
const regLoading = ref(false);
const regTotal = ref(0);
const regPage = ref(1);
const regPageSize = ref(20);
const regFilter = reactive({ status: "" });

async function fetchRegistrations() {
  regLoading.value = true;
  try {
    const params: Record<string, string | number> = { page: regPage.value, pageSize: regPageSize.value };
    if (regFilter.status) params.status = regFilter.status;
    const { data } = await competitionApi.listRegistrations(competitionId, params);
    registrations.value = data.items || data.data || [];
    regTotal.value = data.total || 0;
  } finally { regLoading.value = false }
}

async function handleRegAction(regId: string, status: string) {
  // L2：拒绝报名属驳回类操作，理由必填（后端 UpdateRegistrationDto 暂只消费 status，
  // reason 会被 whitelist 剥离；前端先行收集并随请求带上，后端补契约后即留痕）
  let reason: string | undefined;
  if (status === "DISQUALIFIED") {
    try {
      const { value } = await ElMessageBox.prompt("请填写拒绝理由（将用于告知选手）：", "拒绝报名", {
        type: "warning",
        confirmButtonText: "确认拒绝",
        confirmButtonClass: "el-button--danger",
        inputPlaceholder: "如：资料不全 / 不符合参赛条件",
        inputValidator: (v: string) => (v && v.trim().length > 0) || "拒绝理由必填",
      });
      reason = value.trim();
    } catch { return; /* 用户取消 */ }
  }
  try {
    await competitionApi.updateRegistration(competitionId, regId, { status, ...(reason ? { reason } : {}) });
    ElMessage.success(status === "QUALIFIED" ? "已确认" : "已拒绝");
    fetchRegistrations();
  } catch {
    ElMessage.error("操作失败，请重试");
  }
}

// ─── 排名管理 ───
const rankings = ref<RankingRow[]>([]);
const rankLoading = ref(false);
const calcingRank = ref(false);
const rankTotal = ref(0);
const rankPage = ref(1);
const rankPageSize = ref(50);
const rankFilter = reactive({ roundId: "" });

async function fetchRankings() {
  rankLoading.value = true;
  try {
    const params: Record<string, string | number> = { page: rankPage.value, pageSize: rankPageSize.value };
    if (rankFilter.roundId) params.roundId = rankFilter.roundId;
    const { data } = await competitionApi.getRankings(competitionId, params);
    const list = data?.data || data || [];
    rankings.value = Array.isArray(list) ? list : [];
    rankTotal.value = data?.total || rankings.value.length;
  } finally { rankLoading.value = false }
}

async function handleCalcRanking() {
  if (calcingRank.value) return;
  calcingRank.value = true;
  try {
    const { data } = await competitionApi.calculateRanking(competitionId);
    ElMessage.success(`排名计算完成，共 ${data.length} 条记录`);
    fetchRankings();
  } catch {
    ElMessage.error("排名计算失败");
  } finally {
    calcingRank.value = false;
  }
}

// ─── 批量导入题目 ───
const batchDialog = ref(false);
const batchFormat = ref("json");
const batchContent = ref("");
const batchImporting = ref(false);

const batchPlaceholder = computed(() =>
  batchFormat.value === "json"
    ? '[{ "stem": "...", "type": "SINGLE_CHOICE", "options": [...], "answer": {...}, "score": 10, "difficulty": 3 }]'
    : "stem,type,score,difficulty,options,answer"
);

function openBatchImport() {
  batchContent.value = "";
  batchFormat.value = "json";
  batchDialog.value = true;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

async function doBatchImport() {
  batchImporting.value = true;
  try {
    let questions: Record<string, unknown>[];
    if (batchFormat.value === "json") {
      const parsed: unknown = JSON.parse(batchContent.value);
      if (!Array.isArray(parsed) || !parsed.every(item => item && typeof item === "object" && !Array.isArray(item))) {
        throw new Error("JSON必须是对象数组格式");
      }
      questions = parsed as Record<string, unknown>[];
    } else {
      const lines = batchContent.value.trim().split("\n");
      const headers = parseCSVLine(lines[0]);
      questions = lines.slice(1).filter(l => l.trim()).map(line => {
        const vals = parseCSVLine(line);
        const q: Record<string, unknown> = { competitionId };
        headers.forEach((h, i) => {
          if (h === "options" || h === "answer") {
            q[h] = vals[i] ? JSON.parse(vals[i]) : undefined;
          } else if (h === "score" || h === "difficulty" || h === "sortOrder") {
            q[h] = Number(vals[i]) || undefined;
          } else {
            q[h] = vals[i] || undefined;
          }
        });
        return q;
      });
    }
    if (questions.length === 0) { ElMessage.warning("无有效题目数据"); return; }
    await competitionApi.batchQuestions(competitionId, { questions });
    ElMessage.success(`成功导入 ${questions.length} 道题目`);
    batchDialog.value = false;
    fetchQuestions();
  } catch (e) {
    ElMessage.error((e as Error)?.message || "导入失败，请检查数据格式");
  } finally {
    batchImporting.value = false;
  }
}

// ─── 证书预览 ───
const certDialog = ref(false);
const certHtml = ref("");

async function viewCert(row: RankingRow) {
  certDialog.value = true;
  certHtml.value = "";
  try {
    const { data } = await api.get(`/competitions/certificates/${row.id}/view`);
    certHtml.value = typeof data === "string" ? data : data?.certificateHtml || "";
  } catch {
    certHtml.value = `<div style="text-align:center;padding:40px">证书加载失败，请稍后重试</div>`;
  }
}

// ─── 初始化 & Tab切换懒加载 ───
onMounted(async () => {
  await fetchDetail();
  // 预加载赛程数据
  fetchRounds();
});

function onTabChange(tab: string) {
  if (tab === "questions" && questions.value.length === 0) fetchQuestions();
  if (tab === "registrations" && registrations.value.length === 0) fetchRegistrations();
  if (tab === "rankings" && rankings.value.length === 0) fetchRankings();
}
</script>

<style scoped>
.competition-detail { padding: 16px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; }
.markdown-body { padding: 12px 0; line-height: 1.8; color: var(--color-text-title); }
.prize-config-list { display: flex; flex-direction: column; gap: 8px; }
.prize-config-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--color-bg-page); }
.prize-config-item:last-child { border-bottom: none; }
</style>
