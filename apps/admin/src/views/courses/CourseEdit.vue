<template>
  <div class="course-edit">
    <el-page-header
      title="返回"
      style="margin-bottom:16px"
      @back="router.push('/courses')"
    >
      <template #content>
        {{ isEdit ? '编辑课程' : '新建课程' }}
      </template>
    </el-page-header>

    <el-tabs
      v-model="activeTab"
      type="border-card"
    >
      <!-- Tab 1: 基本信息 -->
      <el-tab-pane
        label="基本信息"
        name="basic"
      >
        <div class="edit-body">
          <div class="edit-main">
            <el-card>
              <el-form
                ref="mainFormRef"
                :model="form"
                :rules="mainRules"
                label-width="90px"
              >
                <el-form-item
                  label="标题"
                  required
                >
                  <el-input
                    v-model="form.title"
                    placeholder="课程标题"
                    size="large"
                  />
                </el-form-item>
                <el-form-item label="简介">
                  <el-input
                    v-model="form.intro"
                    type="textarea"
                    :rows="3"
                    placeholder="课程简介"
                  />
                </el-form-item>
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="类型">
                      <el-select
                        v-model="form.type"
                        style="width:100%"
                      >
                        <el-option
                          label="视频"
                          value="VIDEO"
                        />
                        <el-option
                          label="音频"
                          value="AUDIO"
                        />
                        <el-option
                          label="文本"
                          value="TEXT"
                        />
                        <el-option
                          label="电子书"
                          value="EBOOK"
                        />
                        <el-option
                          label="组合"
                          value="COMBO"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="价格(元)">
                      <el-input-number
                        v-model="form.price"
                        :min="0"
                        :precision="2"
                        style="width:100%"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="原价(元)">
                      <el-input-number
                        v-model="form.originalPrice"
                        :min="0"
                        :precision="2"
                        style="width:100%"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="一级分类">
                      <el-select
                        v-model="form.categoryLevel1"
                        placeholder="选择一级分类"
                        clearable
                        style="width:100%"
                        @change="onLevel1Change"
                      >
                        <el-option
                          v-for="cat in categoryLevel1List"
                          :key="cat"
                          :label="cat"
                          :value="cat"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="二级分类">
                      <el-select
                        v-model="form.categoryLevel2"
                        placeholder="选择二级分类"
                        clearable
                        style="width:100%"
                      >
                        <el-option
                          v-for="cat in categoryLevel2Options"
                          :key="cat"
                          :label="cat"
                          :value="cat"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="有效期(天)">
                      <el-input-number
                        v-model="form.validityDays"
                        :min="0"
                        placeholder="0=永久"
                        style="width:100%"
                      />
                      <span style="font-size:11px;color:#999;margin-left:8px">0=永久</span>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="所属圈子">
                      <el-input
                        v-model="form.circleId"
                        placeholder="圈子ID"
                        clearable
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="所属分站">
                      <el-input
                        v-model="form.stationId"
                        placeholder="分站ID（空=平台级）"
                        clearable
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="定时发布">
                      <el-date-picker
                        v-model="form.scheduledAt"
                        type="datetime"
                        placeholder="留空=立即发布"
                        style="width:100%"
                        value-format="YYYY-MM-DDTHH:mm:ss.sssZ"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="标签">
                  <el-tag
                    v-for="(tag, idx) in form.tags"
                    :key="idx"
                    closable
                    style="margin-right:6px"
                    @close="form.tags.splice(idx, 1)"
                  >
                    {{ tag }}
                  </el-tag>
                  <el-input
                    v-if="tagInputVisible"
                    ref="tagInputRef"
                    v-model="tagInputValue"
                    size="small"
                    style="width:100px"
                    @keyup.enter="addTag"
                    @blur="addTag"
                  />
                  <el-button
                    v-else
                    size="small"
                    @click="showTagInput"
                  >
                    + 添加标签
                  </el-button>
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="saving"
                    @click="save"
                  >
                    保存课程
                  </el-button>
                  <el-button
                    v-if="isEdit"
                    type="danger"
                    @click="handleDelete"
                  >
                    删除课程
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </div>
          <div
            v-if="isEdit"
            class="edit-sidebar"
          >
            <div class="sidebar-section">
              <h4>封面图片</h4>
              <div class="cover-upload">
                <div
                  v-if="form.cover"
                  class="cover-preview"
                >
                  <img
                    :src="form.cover"
                    alt="封面"
                  >
                  <el-button
                    size="small"
                    type="danger"
                    class="cover-remove"
                    @click="form.cover = ''"
                  >
                    移除
                  </el-button>
                </div>
                <div
                  v-else
                  class="cover-placeholder"
                >
                  <span>暂无封面</span>
                </div>
                <div class="cover-input-row">
                  <el-input
                    v-model="coverUrl"
                    placeholder="图片URL"
                    size="small"
                  />
                  <el-button
                    size="small"
                    @click="form.cover = coverUrl"
                  >
                    设置
                  </el-button>
                </div>
                <el-upload
                  :show-file-list="false"
                  :http-request="handleCoverUpload"
                  accept="image/*"
                  style="margin-top:8px"
                >
                  <el-button
                    size="small"
                    type="primary"
                    :loading="uploading"
                  >
                    本地上传
                  </el-button>
                </el-upload>
              </div>
            </div>
            <div
              v-if="isEdit"
              class="sidebar-section"
            >
              <h4>快速操作</h4>
              <el-select
                v-model="quickStatus"
                placeholder="变更状态"
                size="small"
                style="width:100%;margin-bottom:8px"
                @change="changeStatus"
              >
                <el-option
                  label="提交审核"
                  value="PENDING"
                />
                <el-option
                  label="直接上架"
                  value="APPROVED"
                />
                <el-option
                  label="驳回"
                  value="REJECTED"
                />
                <el-option
                  label="下架为草稿"
                  value="DRAFT"
                />
              </el-select>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- Tab 2: 章节管理 -->
      <el-tab-pane
        v-if="isEdit"
        label="章节管理"
        name="chapters"
      >
        <div class="section-header">
          <span>共 {{ chapters.length }} 章</span>
          <el-button
            type="primary"
            size="small"
            @click="openChapterDialog()"
          >
            添加章节
          </el-button>
        </div>
        <el-table
          :data="chapters"
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
            min-width="200"
          />
          <el-table-column
            label="内容类型"
            width="90"
          >
            <template #default="{ row }">
              {{ row.mediaUrl ? '视频/音频' : row.content ? '文本' : '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="时长(秒)"
            width="90"
          >
            <template #default="{ row }">
              {{ row.duration || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="试看"
            width="70"
          >
            <template #default="{ row }">
              <el-tag
                v-if="row.freeTrial"
                type="success"
                size="small"
              >
                免费
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="150"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="openChapterDialog(row)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteChapter(row.id)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

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
          <span>共 {{ works.length }} 份作业</span>
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
        <el-table
          :data="works"
          stripe
          style="margin-top:12px"
        >
          <el-table-column
            label="学员"
            width="100"
          >
            <template #default="{ row }">
              {{ row.userId?.slice(0, 8) || '-' }}
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
                AI 批改
              </el-button>
            </template>
          </el-table-column>
        </el-table>
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

    <!-- 章节编辑弹窗 -->
    <el-dialog
      v-model="chapterDialog"
      :title="editingChapter ? '编辑章节' : '添加章节'"
      width="700px"
      top="5vh"
    >
      <el-form
        :model="chapterForm"
        label-width="80px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input
            v-model="chapterForm.title"
            placeholder="章节标题"
          />
        </el-form-item>
        <el-form-item label="媒体URL">
          <el-input
            v-model="chapterForm.mediaUrl"
            placeholder="视频/音频URL"
          />
        </el-form-item>
        <el-form-item label="正文">
          <div
            ref="chapterEditorEl"
            class="chapter-editor-box"
          />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="时长(秒)">
              <el-input-number
                v-model="chapterForm.duration"
                :min="0"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序">
              <el-input-number
                v-model="chapterForm.sortOrder"
                :min="0"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="免费试看">
              <el-switch v-model="chapterForm.freeTrial" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="chapterDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="saveChapter"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 作业评分弹窗 -->
    <el-dialog
      v-model="scoreDialog"
      title="作业评分"
      width="500px"
    >
      <el-form label-width="80px">
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
      </el-form>
      <template #footer>
        <el-button @click="scoreDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="submitScore"
        >
          提交
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
            {{ answeringQa.answer }}
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
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { courseApi, uploadApi } from '@/api'

const route = useRoute()
const router = useRouter()
const isEdit = ref(!!route.params.id)
const courseId = route.params.id as string
const activeTab = ref("basic")

// ─── 基本信息表单 ───
const form = reactive({
  title: '',
  cover: '',
  intro: '',
  type: 'VIDEO' as string,
  price: 0,
  originalPrice: undefined as number | undefined,
  tags: [] as string[],
  categoryLevel1: '' as string,
  categoryLevel2: '' as string,
  validityDays: 0,
  scheduledAt: '' as string,
  circleId: '' as string,
  stationId: '' as string,
})
const mainFormRef = ref<any>(null)
const mainRules = {
  title: [{ required: true, message: '请输入课程标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择课程类型', trigger: 'change' }],
}
const saving = ref(false)
const uploading = ref(false)
const coverUrl = ref('')
const quickStatus = ref('')

// 标签输入
const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref<any>(null)

function showTagInput() { tagInputVisible.value = true; nextTick(() => tagInputRef.value?.focus?.()) }
function addTag() {
  const val = tagInputValue.value.trim()
  if (val && !form.tags.includes(val)) form.tags.push(val)
  tagInputValue.value = ''
  tagInputVisible.value = false
}

// ─── 章节管理 ───
const chapters = ref<any[]>([])
const chapterForm = reactive({ title: '', content: '', mediaUrl: '', duration: undefined as number | undefined, freeTrial: false, sortOrder: 0 })
const chapterDialog = ref(false)
const editingChapter = ref<any>(null)
const chapterEditorEl = ref<HTMLElement | null>(null)
let chapterQuill: any = null

// ─── 学员管理 ───
const students = ref<any[]>([])
const studentTotal = ref(0)
const studentPage = ref(1)
const studentPageSize = ref(20)
const studentLoading = ref(false)

// ─── 作业批改 ───
const works = ref<any[]>([])
const scoreDialog = ref(false)
const scoringWork = ref<any>(null)
const scoreForm = reactive({ score: 80, feedback: '' })
const aiScoreLoading = ref('')
const aiBatchLoading = ref(false)

// ─── 评价管理 ───
const reviews = ref<any[]>([])
const reviewTotal = ref(0)
const reviewPage = ref(1)
const reviewPageSize = ref(20)
const reviewLoading = ref(false)
const reviewFilter = ref('')
const replyDialog = ref(false)
const replyingReview = ref<any>(null)
const replyContent = ref('')

// ─── 分类 ───
const categoryTree = ref<Record<string, string[]>>({})
const categoryLevel1List = ref<string[]>([])
const categoryLevel2Options = ref<string[]>([])

function onLevel1Change(val: string) {
  categoryLevel2Options.value = val ? (categoryTree.value[val] || []) : []
  if (form.categoryLevel2 && !categoryLevel2Options.value.includes(form.categoryLevel2)) {
    form.categoryLevel2 = ''
  }
}

async function fetchCategories() {
  try {
    const { data } = await courseApi.getCategories()
    if (data && Object.keys(data).length > 0) {
      categoryTree.value = data
    }
  } catch { /* 使用默认值 */ }
  if (Object.keys(categoryTree.value).length === 0) {
    // 默认后备
    categoryTree.value = {
      "国学经典": ["儒家经典", "道家典籍", "佛学经典", "诸子百家"],
      "易经命理": ["八字命理", "紫微斗数", "风水堪舆", "姓名学", "六爻占卜"],
      "中医养生": ["中医基础", "食疗药膳", "经络穴位", "四季养生"],
      "道家文化": ["道门经典", "内丹修炼", "符箓科仪"],
      "儒家文化": ["四书五经", "宋明理学", "礼乐文化"],
      "诗词文学": ["唐诗鉴赏", "宋词赏析", "古文观止"],
      "书法绘画": ["书法入门", "国画技法", "名家鉴赏"],
      "茶道香道": ["茶道文化", "香道文化", "茶具鉴赏"],
      "武术太极": ["太极拳", "八段锦", "武术基础"],
      "其他": ["通识入门", "专题讲座"],
    }
  }
  categoryLevel1List.value = Object.keys(categoryTree.value)
  if (form.categoryLevel1) {
    categoryLevel2Options.value = categoryTree.value[form.categoryLevel1] || []
  }
}

// ─── 问答管理 ───
const qas = ref<any[]>([])
const qaTotal = ref(0)
const qaPage = ref(1)
const qaPageSize = ref(20)
const qaLoading = ref(false)
const qaFilter = reactive({ status: '', tag: '' })
const qaTags = ref<string[]>([])
const qaAnswerDialog = ref(false)
const answeringQa = ref<any>(null)
const qaAnswerContent = ref('')
const aiSuggestLoading = ref('')

// ─── 数据统计 ───
const stats = ref<any>(null)
const statsLoading = ref(false)

// ─── 学员详情 ───
const studentDetailDialog = ref(false)
const studentDetail = ref<any>(null)
const studentDetailLoading = ref(false)

// ─── 初始化 ───
onMounted(async () => {
  if (isEdit.value) {
    const { data } = await courseApi.detail(courseId)
    Object.assign(form, {
      title: data.title,
      cover: data.cover || '',
      intro: data.intro || '',
      type: data.type,
      price: Number(data.price) || 0,
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
      tags: data.tags || [],
      categoryLevel1: data.categoryLevel1 || '',
      categoryLevel2: data.categoryLevel2 || '',
      validityDays: data.validityDays || 0,
      scheduledAt: data.scheduledAt || '',
      circleId: data.circleId || '',
      stationId: data.stationId || '',
    })
    await loadChapters()
  }
  await fetchCategories()
})

// ─── 保存课程 ───
async function save() {
  saving.value = true
  try {
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      validityDays: Number(form.validityDays) || 0,
      scheduledAt: form.scheduledAt || undefined,
      circleId: form.circleId || undefined,
      stationId: form.stationId || undefined,
    }
    if (isEdit.value) {
      await courseApi.update(courseId, payload)
    } else {
      const { data } = await courseApi.create(payload)
      router.replace(`/courses/${data.id}/edit`)
      isEdit.value = true
      // 刷新页面以初始化 tabs
      window.location.reload()
    }
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

async function handleCoverUpload(options: any) {
  uploading.value = true
  try {
    const { data } = await uploadApi.image(options.file)
    form.cover = data.url
    coverUrl.value = data.url
    ElMessage.success('封面上传成功')
  } catch { /* skip */ } finally { uploading.value = false }
}

async function changeStatus(status: string) {
  await courseApi.forceStatus(courseId, status)
  const label = { DRAFT: "已下架", PENDING: "已提交审核", APPROVED: "已上架", REJECTED: "已驳回" }[status] || status
  ElMessage.success(label)
  quickStatus.value = ''
}

async function handleDelete() {
  await courseApi.remove(courseId)
  ElMessage.success('已删除课程')
  router.push('/courses')
}

// ─── 章节操作 ───
async function loadChapters() {
  const { data } = await courseApi.getChapters(courseId)
  chapters.value = data
}

function openChapterDialog(ch?: any) {
  if (ch) {
    editingChapter.value = ch
    Object.assign(chapterForm, { title: ch.title, content: ch.content || '', mediaUrl: ch.mediaUrl || '', duration: ch.duration, freeTrial: ch.freeTrial || false, sortOrder: ch.sortOrder || 0 })
  } else {
    editingChapter.value = null
    Object.assign(chapterForm, { title: '', content: '', mediaUrl: '', duration: undefined, freeTrial: false, sortOrder: chapters.value.length + 1 })
  }
  chapterDialog.value = true
  nextTick(() => initChapterEditor())
}

async function saveChapter() {
  if (!isEdit.value) { await save() }
  if (chapterQuill) {
    chapterForm.content = chapterQuill.root.innerHTML
  } else if (!chapterForm.content) {
    ElMessage.warning("编辑器未就绪，请刷新页面后重试")
    return
  }
  const payload = { ...chapterForm }
  if (editingChapter.value) {
    await courseApi.updateChapter(courseId, editingChapter.value.id, payload)
  } else {
    await courseApi.addChapter(courseId, payload)
  }
  chapterDialog.value = false
  ElMessage.success('章节已保存')
  await loadChapters()
}

async function deleteChapter(chapterId: string) {
  await courseApi.deleteChapter(courseId, chapterId)
  ElMessage.success('已删除')
  await loadChapters()
}

function initChapterEditor() {
  if (!chapterEditorEl.value) return
  if (chapterQuill) { chapterQuill.root.innerHTML = chapterForm.content || ''; return }
  const Q = (window as any).Quill
  if (!Q) return
  chapterQuill = new Q(chapterEditorEl.value, {
    theme: 'snow',
    modules: { toolbar: [['bold', 'italic', 'underline'], [{ header: 1 }, { header: 2 }], [{ list: 'ordered' }, { list: 'bullet' }], ['blockquote', 'code-block'], ['link'], ['clean']] },
    placeholder: '章节正文...',
  })
  chapterQuill.root.innerHTML = chapterForm.content || ''
  chapterQuill.on('text-change', () => { chapterForm.content = chapterQuill.root.innerHTML })
}

// ─── 学员操作 ───
async function fetchStudents() {
  studentLoading.value = true
  try {
    const { data } = await courseApi.getStudents(courseId, { page: studentPage.value, pageSize: studentPageSize.value })
    students.value = data.students || []
    studentTotal.value = data.total || 0
  } finally { studentLoading.value = false }
}

async function viewStudentDetail(row: any) {
  studentDetailDialog.value = true
  studentDetailLoading.value = true
  try {
    const { data } = await courseApi.getStudentProgress(courseId, row.user?.id || row.userId)
    studentDetail.value = data
  } finally { studentDetailLoading.value = false }
}

// ─── 作业操作 ───
async function fetchWorks() {
  const { data } = await courseApi.getWorks(courseId)
  works.value = Array.isArray(data) ? data : data.list || data.works || []
}

function openScoreDialog(work: any) {
  scoringWork.value = work
  scoreForm.score = work.score || 80
  scoreForm.feedback = work.feedback || ''
  scoreDialog.value = true
}

async function submitScore() {
  await courseApi.scoreWork(scoringWork.value.id, scoreForm.score, scoreForm.feedback)
  ElMessage.success('评分已提交')
  scoreDialog.value = false
  fetchWorks()
}

async function handleAiScore(work: any) {
  aiScoreLoading.value = work.id
  try {
    const { data } = await courseApi.aiScoreWork(work.id)
    // 后台已自动填入评分，直接刷新列表
    ElMessage.success(`AI 已批改 — ${data.suggestedScore}分 (${data.model || 'AI'})${data.suggestions?.length ? '，建议: ' + data.suggestions.join('; ') : ''}`)
    fetchWorks()
  } catch { /* handled by interceptor */ } finally { aiScoreLoading.value = '' }
}

async function handleAiBatchScore() {
  aiBatchLoading.value = true
  try {
    const { data } = await courseApi.aiBatchScoreWorks(courseId)
    ElMessage.success(`AI 批量批改完成 — 处理 ${data.processed} 份，成功 ${data.successCount} 份${data.failCount > 0 ? `，失败 ${data.failCount} 份` : ''}`)
    fetchWorks()
  } catch { /* handled by interceptor */ } finally { aiBatchLoading.value = false }
}

// ─── 评价操作 ───
async function fetchReviews() {
  reviewLoading.value = true
  try {
    const { data } = await courseApi.getAllReviews(courseId, { page: reviewPage.value, pageSize: reviewPageSize.value, status: reviewFilter.value || undefined })
    reviews.value = data.reviews || []
    reviewTotal.value = data.total || 0
  } finally { reviewLoading.value = false }
}

function openReplyDialog(review: any) {
  replyingReview.value = review
  replyContent.value = review.reply || ''
  replyDialog.value = true
}

async function submitReply() {
  await courseApi.replyReview(replyingReview.value.id, replyContent.value)
  ElMessage.success('回复成功')
  replyDialog.value = false
  fetchReviews()
}

async function toggleReview(review: any) {
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
    const params: any = { page: qaPage.value, pageSize: qaPageSize.value }
    if (qaFilter.status) params.status = qaFilter.status
    if (qaFilter.tag) params.tag = qaFilter.tag
    const { data } = await courseApi.getQuestions(courseId, params)
    qas.value = data.questions || []
    qaTotal.value = data.total || 0
  } finally { qaLoading.value = false }
}

async function fetchQaTags() {
  try {
    const { data } = await courseApi.getQuestionTags(courseId)
    qaTags.value = data.tags || []
  } catch { /* skip */ }
}

function openQaAnswerDialog(qa: any) {
  answeringQa.value = qa
  qaAnswerContent.value = qa.answer || ''
  qaAnswerDialog.value = true
}

async function submitQaAnswer() {
  if (!qaAnswerContent.value.trim()) { ElMessage.warning('请输入回答内容'); return }
  await courseApi.answerQuestion(answeringQa.value.id, qaAnswerContent.value)
  ElMessage.success('回答已提交')
  qaAnswerDialog.value = false
  fetchQas()
}

async function handleCloseQa(qa: any) {
  await courseApi.closeQuestion(qa.id)
  ElMessage.success('问题已关闭')
  fetchQas()
}

async function handleAiSuggest(qa: any) {
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
.chapter-editor-box { min-height: 200px; max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; }
.stat-card { background: var(--color-bg-card); border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center; margin-bottom: 16px; }
.stat-label { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--color-primary); }
@media (max-width: 900px) { .edit-body { flex-direction: column; } .edit-sidebar { width: 100%; } }
</style>
