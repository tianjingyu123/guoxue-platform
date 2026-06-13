<template>
  <div class="circle-detail-page">
    <!-- 页头 -->
    <div class="page-header">
      <div class="header-left">
        <el-button
          size="small"
          @click="router.back()"
        >
          ← 返回
        </el-button>
        <h3>{{ detail?.name || '加载中...' }}</h3>
        <el-tag
          v-if="detail"
          :type="typeTagType"
          size="small"
        >
          {{ typeLabel }}
        </el-tag>
        <el-tag
          v-if="detail"
          :type="statusTagType"
          size="small"
          style="margin-left:4px"
        >
          {{ statusLabel }}
        </el-tag>
      </div>
      <div class="header-actions">
        <el-button
          size="small"
          @click="refreshDetail"
        >
          刷新
        </el-button>
        <el-button
          size="small"
          type="primary"
          @click="openEdit"
        >
          编辑信息
        </el-button>
        <el-button
          v-if="detail?.status === 'ACTIVE'"
          size="small"
          type="danger"
          @click="disableCircle"
        >
          封禁
        </el-button>
        <el-button
          v-else
          size="small"
          type="success"
          @click="enableCircle"
        >
          解封
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row
      v-if="detail"
      :gutter="12"
      class="stat-row"
    >
      <el-col :span="3">
        <div class="stat-card">
          <span class="value">{{ detail.memberCount || 0 }}</span><span class="label">成员</span>
        </div>
      </el-col>
      <el-col :span="3">
        <div class="stat-card">
          <span class="value">{{ detail.postCount || 0 }}</span><span class="label">帖子</span>
        </div>
      </el-col>
      <el-col :span="3">
        <div class="stat-card">
          <span class="value">{{ detail.articleCount || dashData?.articleCount || 0 }}</span><span class="label">文章</span>
        </div>
      </el-col>
      <el-col :span="3">
        <div class="stat-card">
          <span class="value">{{ detail.courseCount || dashData?.courseCount || 0 }}</span><span class="label">课程</span>
        </div>
      </el-col>
      <el-col :span="3">
        <div class="stat-card">
          <span class="value">{{ dashData?.totalRevenue || 0 }}</span><span class="label">总收益(元)</span>
        </div>
      </el-col>
      <el-col :span="3">
        <div class="stat-card">
          <span class="value">{{ dashData?.questionCount || 0 }}</span><span class="label">问答</span>
        </div>
      </el-col>
      <el-col :span="3">
        <div class="stat-card">
          <span class="value">{{ dashData?.liveCount || 0 }}</span><span class="label">直播</span>
        </div>
      </el-col>
      <el-col :span="3">
        <div class="stat-card">
          <span
            class="value"
            :class="detail.status === 'ACTIVE' ? '' : 'warn'"
          >{{ statusLabel }}</span><span class="label">状态</span>
        </div>
      </el-col>
    </el-row>

    <!-- Tab 管理 -->
    <el-card
      v-if="detail"
      class="main-tabs"
    >
      <el-tabs
        v-model="activeTab"
        @tab-change="onTabChange"
      >
        <el-tab-pane
          label="概览"
          name="overview"
        />
        <el-tab-pane
          label="成员管理"
          name="members"
        />
        <el-tab-pane
          label="帖子管理"
          name="posts"
        />
        <el-tab-pane
          label="文章管理"
          name="articles"
        />
        <el-tab-pane
          label="课程管理"
          name="courses"
        />
        <el-tab-pane
          label="付费问答"
          name="questions"
        />
        <el-tab-pane
          label="直播管理"
          name="lives"
        />
        <el-tab-pane
          label="达人管理"
          name="experts"
        />
        <el-tab-pane
          label="收益记录"
          name="revenue"
        />
        <el-tab-pane
          label="知识库"
          name="knowledge"
        />
        <el-tab-pane
          label="排行榜"
          name="ranking"
        />
        <el-tab-pane
          label="设置"
          name="settings"
        />
      </el-tabs>

      <!-- ====== 概览 ====== -->
      <template v-if="activeTab === 'overview'">
        <el-row :gutter="16">
          <el-col :span="12">
            <div class="section-title">
              基础信息
            </div>
            <el-descriptions
              :column="1"
              border
              size="small"
            >
              <el-descriptions-item label="ID">
                {{ detail.id }}
              </el-descriptions-item>
              <el-descriptions-item label="圈主">
                {{ detail.owner?.nickname || detail.ownerId }}
              </el-descriptions-item>
              <el-descriptions-item label="类型">
                {{ typeLabel }}
              </el-descriptions-item>
              <el-descriptions-item label="价格">
                ¥{{ detail.price || 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="押金">
                ¥{{ detail.depositAmount || 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="标签">
                {{ (detail.tags || []).join(' / ') || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="品类">
                {{ detail.categoryLevel1 || '-' }} / {{ detail.categoryLevel2 || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="分站">
                {{ detail.stationId || '平台级' }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ fmtDate(detail.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="简介">
                {{ detail.intro || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-col>
          <el-col :span="12">
            <div class="section-title">
              运营数据
            </div>
            <el-descriptions
              :column="1"
              border
              size="small"
            >
              <el-descriptions-item label="总成员">
                {{ detail.memberCount || 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="总帖子">
                {{ detail.postCount || 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="总文章">
                {{ dashData?.articleCount || 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="总课程">
                {{ dashData?.courseCount || 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="总问答">
                {{ dashData?.questionCount || 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="总收益">
                ¥{{ dashData?.totalRevenue || 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="近7日新增">
                {{ dashData?.recentMembers || 0 }} 成员
              </el-descriptions-item>
              <el-descriptions-item label="流失预警">
                {{ dashData?.churnCount || 0 }} 人
              </el-descriptions-item>
              <el-descriptions-item label="待处理提问">
                {{ dashData?.pendingQuestions || 0 }} 条
              </el-descriptions-item>
              <el-descriptions-item label="候选知识">
                {{ dashData?.knowledgeCandidates || 0 }} 条
              </el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>
      </template>

      <!-- ====== 成员管理 ====== -->
      <template v-if="activeTab === 'members'">
        <div class="toolbar-row">
          <el-input
            v-model="memberSearch"
            placeholder="搜索成员昵称/ID"
            size="small"
            style="width:200px"
            clearable
            @change="fetchMembers"
          />
          <el-select
            v-model="memberRoleFilter"
            size="small"
            style="width:120px"
            clearable
            placeholder="角色筛选"
            @change="fetchMembers"
          >
            <el-option
              label="圈主"
              value="OWNER"
            /><el-option
              label="合伙人"
              value="PARTNER"
            />
            <el-option
              label="管理员"
              value="ADMIN"
            /><el-option
              label="嘉宾"
              value="GUEST"
            />
            <el-option
              label="志愿者"
              value="VOLUNTEER"
            /><el-option
              label="成员"
              value="MEMBER"
            />
          </el-select>
          <el-select
            v-model="memberExpireFilter"
            size="small"
            style="width:120px"
            clearable
            placeholder="过期筛选"
            @change="fetchMembers"
          >
            <el-option
              label="正常"
              value="active"
            /><el-option
              label="已过期"
              value="expired"
            />
          </el-select>
          <el-button
            size="small"
            @click="fetchMembers"
          >
            查询
          </el-button>
          <el-button
            size="small"
            type="primary"
            @click="showAddMemberDialog"
          >
            添加成员
          </el-button>
        </div>
        <el-table
          v-loading="memberLoading"
          :data="members"
          stripe
          size="small"
        >
          <el-table-column
            label="用户"
            min-width="160"
          >
            <template #default="{ row }">
              <div>{{ row.user?.nickname || '-' }}</div><div
                class="text-muted"
                style="font-size:11px"
              >
                {{ row.userId }}
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="角色"
            width="110"
          >
            <template #default="{ row }">
              <el-select
                :model-value="row.role"
                size="small"
                :disabled="row.role === 'OWNER'"
                @change="(v: string) => changeRole(row, v)"
              >
                <el-option
                  v-for="r in memberRoles"
                  :key="r.value"
                  :label="r.label"
                  :value="r.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column
            label="到期时间"
            width="160"
          >
            <template #default="{ row }">
              <span
                v-if="row.expireAt"
                :class="{ 'text-danger': new Date(row.expireAt) < new Date() }"
              >{{ fmtDate(row.expireAt) }}</span>
              <span
                v-else
                class="text-muted"
              >永久</span>
            </template>
          </el-table-column>
          <el-table-column
            label="提问价格"
            width="100"
          >
            <template #default="{ row }">
              {{ row.questionPriceCoin > 0 ? row.questionPriceCoin + '币' : '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="连麦价格"
            width="100"
          >
            <template #default="{ row }">
              {{ row.callPricePerMinuteCoin > 0 ? row.callPricePerMinuteCoin + '币/分' : '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="加入时间"
            width="160"
          >
            <template #default="{ row }">
              {{ fmtDate(row.joinedAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="150"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="showMemberGroups(row)"
              >
                分组
              </el-button>
              <el-button
                v-if="row.role !== 'OWNER'"
                size="small"
                type="danger"
                @click="removeMember(row)"
              >
                移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="memberPage"
          :total="memberTotal"
          :page-size="20"
          layout="total, prev, pager, next"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchMembers"
        />
      </template>

      <!-- ====== 帖子管理 ====== -->
      <template v-if="activeTab === 'posts'">
        <div class="toolbar-row">
          <el-select
            v-model="postFilter"
            size="small"
            style="width:120px"
            placeholder="类型筛选"
            @change="fetchPosts"
          >
            <el-option
              label="全部"
              value=""
            /><el-option
              label="精华帖"
              value="essence"
            />
            <el-option
              label="置顶帖"
              value="top"
            /><el-option
              label="审核中"
              value="auditing"
            />
          </el-select>
          <el-input
            v-model="postKeyword"
            size="small"
            style="width:180px"
            placeholder="搜索标题/内容"
            clearable
            @change="fetchPosts"
          />
        </div>
        <el-table
          v-loading="postLoading"
          :data="posts"
          stripe
          size="small"
        >
          <el-table-column
            label="标题"
            min-width="200"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.title || row.content?.slice(0, 50) || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="作者"
            width="110"
          >
            <template #default="{ row }">
              {{ row.user?.nickname || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="类型"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="postTypeColor(row.type)"
              >
                {{ postTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.status === 'PUBLISHED' ? 'success' : row.status === 'AUDITING' ? 'warning' : 'info'"
              >
                {{ row.status === 'PUBLISHED' ? '已发布' : row.status === 'AUDITING' ? '审核中' : row.status === 'DRAFT' ? '草稿' : row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="精华/置顶"
            width="140"
          >
            <template #default="{ row }">
              <el-tag
                v-if="row.isEssence"
                type="warning"
                size="small"
              >
                精华
              </el-tag>
              <el-tag
                v-if="row.isTop"
                type="danger"
                size="small"
                style="margin-left:2px"
              >
                置顶
              </el-tag>
              <span
                v-if="!row.isEssence && !row.isTop"
                class="text-muted"
              >-</span>
            </template>
          </el-table-column>
          <el-table-column
            label="互动"
            width="100"
          >
            <template #default="{ row }">
              {{ row.likeCount || 0 }}赞 {{ row.commentCount || 0 }}评
            </template>
          </el-table-column>
          <el-table-column
            label="时间"
            width="150"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="300"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="toggleEssence(row)"
              >
                {{ row.isEssence ? '取消精华' : '精华' }}
              </el-button>
              <el-button
                size="small"
                @click="toggleTop(row)"
              >
                {{ row.isTop ? '取消置顶' : '置顶' }}
              </el-button>
              <el-button
                size="small"
                type="success"
                @click="addPostToKnowledge(row)"
              >
                知识库
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="deletePost(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="postPage"
          :total="postTotal"
          :page-size="20"
          layout="total, prev, pager, next"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchPosts"
        />
      </template>

      <!-- ====== 文章管理 ====== -->
      <template v-if="activeTab === 'articles'">
        <div class="toolbar-row">
          <el-select
            v-model="articleAuditFilter"
            size="small"
            style="width:120px"
            clearable
            placeholder="审核筛选"
            @change="fetchArticles"
          >
            <el-option
              label="全部"
              value=""
            /><el-option
              label="待审核"
              value="PENDING"
            /><el-option
              label="已通过"
              value="APPROVED"
            /><el-option
              label="已拒绝"
              value="REJECTED"
            />
          </el-select>
        </div>
        <el-table
          v-loading="articleLoading"
          :data="articles"
          stripe
          size="small"
        >
          <el-table-column
            label="标题"
            prop="title"
            min-width="200"
            show-overflow-tooltip
          />
          <el-table-column
            label="作者"
            width="110"
          >
            <template #default="{ row }">
              {{ row.user?.nickname || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="审核"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.auditStatus === 'APPROVED' ? 'success' : row.auditStatus === 'REJECTED' ? 'danger' : 'warning'"
              >
                {{ row.auditStatus === 'APPROVED' ? '通过' : row.auditStatus === 'REJECTED' ? '拒绝' : '待审' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="推首页"
            width="80"
          >
            <template #default="{ row }">
              {{ row.isPushHome ? '是' : '否' }}
            </template>
          </el-table-column>
          <el-table-column
            label="阅读/赞"
            width="100"
          >
            <template #default="{ row }">
              {{ row.viewCount || 0 }} / {{ row.likeCount || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            label="时间"
            width="150"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="260"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                v-if="row.auditStatus === 'PENDING'"
                size="small"
                type="success"
                @click="auditArticle(row, 'APPROVED')"
              >
                通过
              </el-button>
              <el-button
                v-if="row.auditStatus === 'PENDING'"
                size="small"
                type="danger"
                @click="auditArticle(row, 'REJECTED')"
              >
                拒绝
              </el-button>
              <el-button
                size="small"
                type="success"
                @click="addArticleToKnowledge(row)"
              >
                知识库
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteArticle(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="articlePage"
          :total="articleTotal"
          :page-size="20"
          layout="total, prev, pager, next"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchArticles"
        />
      </template>

      <!-- ====== 课程管理 ====== -->
      <template v-if="activeTab === 'courses'">
        <div class="toolbar-row">
          <el-select
            v-model="courseTypeFilter"
            size="small"
            style="width:120px"
            clearable
            placeholder="课程类型"
            @change="fetchCourses"
          >
            <el-option
              label="全部"
              value=""
            /><el-option
              label="视频课"
              value="VIDEO"
            /><el-option
              label="音频课"
              value="AUDIO"
            />
            <el-option
              label="图文课"
              value="TEXT"
            /><el-option
              label="电子书"
              value="EBOOK"
            /><el-option
              label="组合课"
              value="COMBO"
            />
          </el-select>
          <el-select
            v-model="courseAuditFilter"
            size="small"
            style="width:100px"
            clearable
            placeholder="审核"
            @change="fetchCourses"
          >
            <el-option
              label="全部"
              value=""
            /><el-option
              label="待审"
              value="PENDING"
            /><el-option
              label="通过"
              value="APPROVED"
            />
          </el-select>
        </div>
        <el-table
          v-loading="courseLoading"
          :data="courses"
          stripe
          size="small"
        >
          <el-table-column
            label="标题"
            prop="title"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            label="类型"
            width="90"
          >
            <template #default="{ row }">
              {{ ({ VIDEO: '视频', AUDIO: '音频', TEXT: '图文', EBOOK: '电子书', COMBO: '组合' } as Record<string, string>)[row.type] || row.type }}
            </template>
          </el-table-column>
          <el-table-column
            label="价格"
            width="100"
          >
            <template #default="{ row }">
              ¥{{ row.price || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            label="学生数"
            width="80"
          >
            <template #default="{ row }">
              {{ row.studentCount || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            label="审核"
            width="80"
          >
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.auditStatus === 'APPROVED' ? 'success' : 'warning'"
              >
                {{ row.auditStatus === 'APPROVED' ? '通过' : '待审' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="时间"
            width="150"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="180"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                type="success"
                @click="addCourseToKnowledge(row)"
              >
                知识库
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteCourse(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="coursePage"
          :total="courseTotal"
          :page-size="20"
          layout="total, prev, pager, next"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchCourses"
        />
      </template>

      <!-- ====== 付费问答 ====== -->
      <template v-if="activeTab === 'questions'">
        <div class="toolbar-row">
          <el-select
            v-model="questionFilter"
            size="small"
            style="width:120px"
            clearable
            placeholder="状态筛选"
            @change="fetchQuestions"
          >
            <el-option
              label="全部"
              value=""
            /><el-option
              label="待回答"
              value="PENDING"
            />
            <el-option
              label="已回答"
              value="ANSWERED"
            /><el-option
              label="已拒绝"
              value="REJECTED"
            />
            <el-option
              label="已退款"
              value="REFUNDED"
            /><el-option
              label="已过期"
              value="EXPIRED"
            />
          </el-select>
        </div>
        <el-table
          v-loading="questionLoading"
          :data="questions"
          stripe
          size="small"
        >
          <el-table-column
            label="问题"
            min-width="200"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.questionTitle || row.question?.slice(0, 60) }}
            </template>
          </el-table-column>
          <el-table-column
            label="提问者"
            width="110"
          >
            <template #default="{ row }">
              {{ row.asker?.nickname || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="回答者"
            width="110"
          >
            <template #default="{ row }">
              {{ row.answerer?.nickname || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="价格"
            width="80"
          >
            <template #default="{ row }">
              {{ row.priceCoin }}币
            </template>
          </el-table-column>
          <el-table-column
            label="围观"
            width="80"
          >
            <template #default="{ row }">
              {{ row.peekPriceCoin > 0 ? row.peekPriceCoin + '币/' + (row.peekCount||0) + '人' : '不可围观' }}
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="questionStatusColor(row.status)"
              >
                {{ questionStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="时间"
            width="150"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="100"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'PENDING'"
                size="small"
                type="danger"
                @click="refundQuestion(row)"
              >
                退款
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="questionPage"
          :total="questionTotal"
          :page-size="20"
          layout="total, prev, pager, next"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchQuestions"
        />
      </template>

      <!-- ====== 直播管理 ====== -->
      <template v-if="activeTab === 'lives'">
        <div class="toolbar-row">
          <el-select
            v-model="liveStatusFilter"
            size="small"
            style="width:120px"
            clearable
            placeholder="状态筛选"
            @change="fetchLives"
          >
            <el-option
              label="全部"
              value=""
            /><el-option
              label="进行中"
              value="LIVE"
            />
            <el-option
              label="已结束"
              value="ENDED"
            /><el-option
              label="预约中"
              value="SCHEDULED"
            />
          </el-select>
        </div>
        <el-table
          v-loading="liveLoading"
          :data="lives"
          stripe
          size="small"
        >
          <el-table-column
            label="标题"
            prop="title"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            label="主播"
            width="110"
          >
            <template #default="{ row }">
              {{ row.host?.nickname || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="类型"
            width="90"
          >
            <template #default="{ row }">
              <el-tag size="small">
                {{ row.liveType === 'PAID' ? '付费' : row.liveType === 'VIP' ? 'VIP' : '免费' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.status === 'LIVE' ? 'danger' : row.status === 'SCHEDULED' ? 'warning' : 'info'"
              >
                {{ ({ LIVE: '进行中', ENDED: '已结束', SCHEDULED: '预约中' } as Record<string, string>)[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="观看"
            width="80"
          >
            <template #default="{ row }">
              {{ row.viewCount || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            label="时间"
            width="150"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="100"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                type="danger"
                @click="deleteLive(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="livePage"
          :total="liveTotal"
          :page-size="20"
          layout="total, prev, pager, next"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchLives"
        />
      </template>

      <!-- ====== 达人管理 ====== -->
      <template v-if="activeTab === 'experts'">
        <el-table
          v-loading="expertLoading"
          :data="experts"
          stripe
          size="small"
        >
          <el-table-column
            label="达人"
            min-width="150"
          >
            <template #default="{ row }">
              <div>{{ row.user?.nickname || '-' }}</div><div
                class="text-muted"
                style="font-size:11px"
              >
                {{ row.userId }}
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="角色"
            width="90"
          >
            <template #default="{ row }">
              {{ memberRoleLabel(row.role) }}
            </template>
          </el-table-column>
          <el-table-column
            label="提问价格"
            width="120"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row.questionPriceCoin"
                :min="0"
                size="small"
                style="width:100px"
                @change="(v: number) => updateExpertPrice(row, 'question', v)"
              />
              <span style="margin-left:4px">币</span>
            </template>
          </el-table-column>
          <el-table-column
            label="超时(小时)"
            width="120"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row.questionTimeoutHours"
                :min="1"
                :max="720"
                size="small"
                style="width:100px"
                @change="(v: number) => updateExpertPrice(row, 'timeout', v)"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="连麦价格"
            width="120"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row.callPricePerMinuteCoin"
                :min="0"
                size="small"
                style="width:100px"
                @change="(v: number) => updateExpertPrice(row, 'call', v)"
              />
              <span style="margin-left:4px">币/分</span>
            </template>
          </el-table-column>
          <el-table-column
            label="可接时段"
            width="200"
          >
            <template #default="{ row }">
              {{ row.callAvailableHours?.length ? row.callAvailableHours.length + '个时段' : '未设置' }}
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- ====== 收益记录 ====== -->
      <template v-if="activeTab === 'revenue'">
        <div class="toolbar-row">
          <el-select
            v-model="revenueTypeFilter"
            size="small"
            style="width:130px"
            clearable
            placeholder="收益类型"
            @change="fetchRevenue"
          >
            <el-option
              label="全部"
              value=""
            /><el-option
              label="入圈费"
              value="circle_join"
            />
            <el-option
              label="课程"
              value="course"
            /><el-option
              label="商品"
              value="product"
            />
            <el-option
              label="礼物"
              value="gift"
            /><el-option
              label="知识付费"
              value="knowledge_revenue"
            />
          </el-select>
        </div>
        <el-table
          v-loading="revenueLoading"
          :data="revenues"
          stripe
          size="small"
        >
          <el-table-column
            label="类型"
            width="100"
          >
            <template #default="{ row }">
              {{ revenueTypeLabel(row.type) }}
            </template>
          </el-table-column>
          <el-table-column
            label="来源ID"
            width="150"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.sourceId }}
            </template>
          </el-table-column>
          <el-table-column
            label="原始金额"
            width="100"
          >
            <template #default="{ row }">
              ¥{{ row.amount }}
            </template>
          </el-table-column>
          <el-table-column
            label="平台抽成"
            width="100"
          >
            <template #default="{ row }">
              ¥{{ row.platformFee }}
            </template>
          </el-table-column>
          <el-table-column
            label="圈主实得"
            width="100"
          >
            <template #default="{ row }">
              <b>¥{{ row.ownerShare }}</b>
            </template>
          </el-table-column>
          <el-table-column
            label="分成比例"
            width="90"
          >
            <template #default="{ row }">
              {{ (Number(row.splitRate) * 100).toFixed(0) }}%
            </template>
          </el-table-column>
          <el-table-column
            label="结算"
            width="80"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.settled ? 'success' : 'warning'"
                size="small"
              >
                {{ row.settled ? '已结算' : '未结算' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="时间"
            width="150"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="revenuePage"
          :total="revenueTotal"
          :page-size="20"
          layout="total, prev, pager, next"
          style="margin-top:12px;justify-content:flex-end"
          @change="fetchRevenue"
        />
      </template>

      <!-- ====== 知识库 ====== -->
      <template v-if="activeTab === 'knowledge'">
        <div class="toolbar-row">
          <el-button
            size="small"
            type="primary"
            @click="syncCircleKnowledge"
          >
            同步精华帖到知识库
          </el-button>
          <el-button
            size="small"
            @click="fetchKnowledgeCandidates"
          >
            刷新候选列表
          </el-button>
        </div>
        <el-tabs
          v-model="knowledgeSubTab"
          type="card"
          size="small"
        >
          <el-tab-pane
            label="已入库"
            name="indexed"
          />
          <el-tab-pane
            label="候选中"
            name="candidates"
          />
        </el-tabs>
        <el-table
          v-loading="knowledgeLoading"
          :data="knowledgeSubTab === 'candidates' ? knowledgeCandidates : knowledgeItems"
          stripe
          size="small"
        >
          <el-table-column
            label="标题"
            min-width="200"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.title || row.content?.slice(0, 60) }}
            </template>
          </el-table-column>
          <el-table-column
            label="来源"
            width="90"
          >
            <template #default="{ row }">
              {{ row.sourceType || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="质量分"
            width="80"
          >
            <template #default="{ row }">
              {{ row.qualityScore || row.similarityScore || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="时间"
            width="150"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            v-if="knowledgeSubTab === 'candidates'"
            label="操作"
            width="140"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                type="success"
                @click="confirmKnowledge(row)"
              >
                入库
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="rejectKnowledge(row)"
              >
                拒绝
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- ====== 排行榜 ====== -->
      <template v-if="activeTab === 'ranking'">
        <el-row :gutter="16">
          <el-col :span="12">
            <div class="section-title">
              成员贡献榜
            </div>
            <el-table
              :data="leaderboard"
              stripe
              size="small"
              max-height="450"
            >
              <el-table-column
                label="排名"
                width="60"
                align="center"
              >
                <template #default="{ $index }">
                  {{ $index + 1 }}
                </template>
              </el-table-column>
              <el-table-column
                label="成员"
                min-width="150"
              >
                <template #default="{ row }">
                  {{ row.nickname || row.userId }}
                </template>
              </el-table-column>
              <el-table-column
                label="发帖"
                prop="postCount"
                width="80"
                align="center"
              />
              <el-table-column
                label="贡献"
                prop="contributionScore"
                width="80"
                align="center"
              />
            </el-table>
          </el-col>
          <el-col :span="12">
            <div class="section-title">
              热门内容
            </div>
            <el-table
              :data="hotContent"
              stripe
              size="small"
              max-height="450"
            >
              <el-table-column
                label="排名"
                width="60"
                align="center"
              >
                <template #default="{ $index }">
                  {{ $index + 1 }}
                </template>
              </el-table-column>
              <el-table-column
                label="标题"
                min-width="180"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  {{ row.title || row.id }}
                </template>
              </el-table-column>
              <el-table-column
                label="点赞"
                prop="likeCount"
                width="70"
                align="center"
              />
              <el-table-column
                label="评论"
                prop="commentCount"
                width="70"
                align="center"
              />
              <el-table-column
                label="热度"
                prop="hotScore"
                width="70"
                align="center"
              />
            </el-table>
          </el-col>
        </el-row>
      </template>

      <!-- ====== 设置 ====== -->
      <template v-if="activeTab === 'settings'">
        <el-form
          :model="settingsForm"
          label-width="120px"
          size="small"
        >
          <el-divider content-position="left">
            基本信息
          </el-divider>
          <el-form-item label="圈子名称">
            <el-input
              v-model="settingsForm.name"
              style="width:300px"
            />
          </el-form-item>
          <el-form-item label="封面URL">
            <el-input
              v-model="settingsForm.cover"
              style="width:400px"
            />
          </el-form-item>
          <el-form-item label="简介">
            <el-input
              v-model="settingsForm.intro"
              type="textarea"
              :rows="3"
              style="width:400px"
            />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="settingsForm.type">
              <el-option
                label="免费"
                value="FREE"
              /><el-option
                label="一次性付费"
                value="PAID"
              /><el-option
                label="年费制"
                value="YEARLY"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="settingsForm.type !== 'FREE'"
            label="价格(元)"
          >
            <el-input-number
              v-model="settingsForm.price"
              :min="0"
              :precision="2"
            />
          </el-form-item>
          <el-form-item label="押金(元)">
            <el-input-number
              v-model="settingsForm.depositAmount"
              :min="0"
              :precision="2"
            />
          </el-form-item>
          <el-form-item label="品类">
            <el-input
              v-model="settingsForm.categoryLevel1"
              placeholder="一级品类"
              style="width:150px"
            />
            <el-input
              v-model="settingsForm.categoryLevel2"
              placeholder="二级品类"
              style="width:150px;margin-left:8px"
            />
          </el-form-item>
          <el-form-item label="标签">
            <el-input
              v-model="settingsForm.tagsStr"
              placeholder="逗号分隔"
              style="width:300px"
            />
          </el-form-item>

          <el-divider content-position="left">
            公告
          </el-divider>
          <el-form-item label="圈子公告">
            <el-input
              v-model="settingsForm.announcement"
              type="textarea"
              :rows="3"
              style="width:400px"
              placeholder="圈子公告内容，对所有成员展示"
            />
          </el-form-item>

          <el-divider content-position="left">
            审核设置
          </el-divider>
          <el-form-item label="发帖审核">
            <el-switch
              v-model="settingsForm.postAudit"
              active-text="先审后发"
              inactive-text="先发后审"
            />
          </el-form-item>
          <el-form-item label="评论审核">
            <el-switch
              v-model="settingsForm.commentAudit"
              active-text="开启"
              inactive-text="关闭"
            />
          </el-form-item>
          <el-form-item label="发言频率限制">
            <el-input-number
              v-model="settingsForm.postRateLimit"
              :min="0"
            /> 条/小时（0=不限制）
          </el-form-item>

          <el-divider content-position="left">
            AI 助理
          </el-divider>
          <el-form-item label="启用AI助理">
            <el-switch v-model="settingsForm.botEnabled" />
          </el-form-item>
          <el-form-item
            v-if="settingsForm.botEnabled"
            label="助理欢迎语"
          >
            <el-input
              v-model="settingsForm.botWelcome"
              style="width:400px"
              placeholder="你好，我是圈子的AI助理..."
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="saving"
              @click="saveSettings"
            >
              保存设置
            </el-button>
          </el-form-item>
        </el-form>
      </template>
    </el-card>

    <!-- 编辑弹窗（快速编辑） -->
    <el-dialog
      v-model="editVisible"
      title="编辑圈子"
      width="500px"
    >
      <el-form
        :model="editForm"
        label-width="80px"
      >
        <el-form-item label="名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="封面URL">
          <el-input v-model="editForm.cover" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="editForm.intro"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="editForm.type">
            <el-option
              label="免费"
              value="FREE"
            /><el-option
              label="一次性付费"
              value="PAID"
            /><el-option
              label="年费制"
              value="YEARLY"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="editForm.type !== 'FREE'"
          label="价格"
        >
          <el-input-number
            v-model="editForm.price"
            :min="0"
            :precision="2"
          />
        </el-form-item>
        <el-form-item label="押金">
          <el-input-number
            v-model="editForm.depositAmount"
            :min="0"
            :precision="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveEdit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 成员分组弹窗 -->
    <el-dialog
      v-model="groupVisible"
      title="成员分组管理"
      width="500px"
    >
      <div class="section-title">
        {{ groupTargetUser?.nickname || groupTargetUser?.userId }}
      </div>
      <el-checkbox-group v-model="groupSelected">
        <el-checkbox
          v-for="g in memberGroups"
          :key="g.id"
          :label="g.id"
        >
          {{ g.name }} <span :style="{color: g.color}">●</span> ({{ g._count?.members || 0 }}人)
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="groupVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="saveMemberGroups"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加成员弹窗 -->
    <el-dialog
      v-model="addMemberVisible"
      title="添加成员"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="用户ID">
          <el-input
            v-model="addMemberForm.userId"
            placeholder="输入用户ID"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="addMemberForm.role">
            <el-option
              v-for="r in memberRoles"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addMemberVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="addMember"
        >
          添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { circleApi, articleApi, courseApi, knowledgeApi, circleDashboardApi } from "@/api";
import { useAuthStore } from "@/store/auth";
import api from "@/api";

const route = useRoute();
const router = useRouter();
const circleId = route.params.id as string;

// 角色常量
const memberRoles = [
  { value: "OWNER", label: "圈主" }, { value: "PARTNER", label: "合伙人" },
  { value: "ADMIN", label: "管理员" }, { value: "GUEST", label: "嘉宾" },
  { value: "VOLUNTEER", label: "志愿者" }, { value: "MEMBER", label: "成员" },
];
const memberRoleLabel = (r: string) => memberRoles.find(x => x.value === r)?.label || r;

const detail = ref<any>(null);
const dashData = ref<any>({});
const activeTab = ref("overview");

const typeTagType = computed(() => detail.value?.type === "FREE" ? "success" : detail.value?.type === "YEARLY" ? "" : "warning");
const typeLabel = computed(() => detail.value?.type === "FREE" ? "免费" : detail.value?.type === "YEARLY" ? `年费 ¥${detail.value?.price || 0}` : `付费 ¥${detail.value?.price || 0}`);
const statusTagType = computed(() => detail.value?.status === "ACTIVE" ? "success" : detail.value?.status === "DISABLED" ? "danger" : "warning");
const statusLabel = computed(() => detail.value?.status === "ACTIVE" ? "正常" : detail.value?.status === "DISABLED" ? "已封禁" : detail.value?.status === "PENDING" ? "待审核" : detail.value?.status);

// 成员
const members = ref<any[]>([]); const memberLoading = ref(false); const memberPage = ref(1); const memberTotal = ref(0);
const memberSearch = ref(""); const memberRoleFilter = ref(""); const memberExpireFilter = ref("");

// 帖子
const posts = ref<any[]>([]); const postLoading = ref(false); const postPage = ref(1); const postTotal = ref(0);
const postFilter = ref(""); const postKeyword = ref("");

// 文章
const articles = ref<any[]>([]); const articleLoading = ref(false); const articlePage = ref(1); const articleTotal = ref(0);
const articleAuditFilter = ref("");

// 课程
const courses = ref<any[]>([]); const courseLoading = ref(false); const coursePage = ref(1); const courseTotal = ref(0);
const courseTypeFilter = ref(""); const courseAuditFilter = ref("");

// 问答
const questions = ref<any[]>([]); const questionLoading = ref(false); const questionPage = ref(1); const questionTotal = ref(0);
const questionFilter = ref("");

// 直播
const lives = ref<any[]>([]); const liveLoading = ref(false); const livePage = ref(1); const liveTotal = ref(0);
const liveStatusFilter = ref("");

// 达人
const experts = ref<any[]>([]); const expertLoading = ref(false);

// 收益
const revenues = ref<any[]>([]); const revenueLoading = ref(false); const revenuePage = ref(1); const revenueTotal = ref(0);
const revenueTypeFilter = ref("");

// 知识库
const knowledgeItems = ref<any[]>([]); const knowledgeCandidates = ref<any[]>([]); const knowledgeLoading = ref(false);
const knowledgeSubTab = ref("indexed");

// 排行
const leaderboard = ref<any[]>([]); const hotContent = ref<any[]>([]);

// 设置
const saving = ref(false);
const settingsForm = reactive({ name: "", cover: "", intro: "", type: "FREE", price: 0, depositAmount: 0, categoryLevel1: "", categoryLevel2: "", tagsStr: "", announcement: "", postAudit: false, commentAudit: false, postRateLimit: 0, botEnabled: false, botWelcome: "" });

// 编辑弹窗
const editVisible = ref(false);
const editForm = reactive({ name: "", cover: "", intro: "", type: "FREE", price: 0, depositAmount: 0 });

// 分组
const groupVisible = ref(false); const groupTargetUser = ref<any>(null); const groupSelected = ref<string[]>([]); const memberGroups = ref<any[]>([]);

// 添加成员
const addMemberVisible = ref(false);
const addMemberForm = reactive({ userId: "", role: "MEMBER" });

function fmtDate(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }
function postTypeColor(t: string) { return { TEXT: "", IMAGE: "success", VIDEO: "danger", FILE: "warning", LINK: "info" }[t] || ""; }
function postTypeLabel(t: string) { return { TEXT: "图文", IMAGE: "图片", VIDEO: "视频", FILE: "文件", LINK: "链接" }[t] || t; }
function questionStatusColor(s: string) { return { PENDING: "warning", ANSWERED: "success", REJECTED: "danger", REFUNDED: "info", EXPIRED: "info", CLOSED: "" }[s] || ""; }
function questionStatusLabel(s: string) { return { PENDING: "待回答", ANSWERED: "已回答", REJECTED: "已拒绝", REFUNDED: "已退款", EXPIRED: "已过期", CLOSED: "已关闭" }[s] || s; }
function revenueTypeLabel(t: string) { return { circle_join: "入圈费", course: "课程", product: "商品", gift: "礼物", knowledge_revenue: "知识付费" }[t] || t; }

onMounted(() => { refreshDetail(); fetchOverview(); });

async function refreshDetail() {
  try {
    const { data } = await circleApi.detail(circleId);
    detail.value = data as any;
    Object.assign(settingsForm, {
      name: detail.value.name || "", cover: detail.value.cover || "", intro: detail.value.intro || "",
      type: detail.value.type || "FREE", price: Number(detail.value.price) || 0,
      depositAmount: Number(detail.value.depositAmount) || 0,
      categoryLevel1: detail.value.categoryLevel1 || "", categoryLevel2: detail.value.categoryLevel2 || "",
      tagsStr: (detail.value.tags || []).join(","), announcement: "",
    });
  } catch { /* ignore */ }
}

async function fetchOverview() {
  try {
    const { data } = await circleDashboardApi.overview(circleId);
    dashData.value = data || {};
  } catch { dashData.value = {}; }
}

function onTabChange(tab: string) {
  const loaders: Record<string, () => void> = {
    members: fetchMembers, posts: fetchPosts, articles: fetchArticles, courses: fetchCourses,
    questions: fetchQuestions, lives: fetchLives, experts: fetchExperts, revenue: fetchRevenue,
    knowledge: fetchKnowledge, ranking: fetchRanking,
  };
  loaders[tab]?.();
}

// ─── 成员 ───
async function fetchMembers() {
  memberLoading.value = true;
  try {
    // 这里后端需要支持更丰富的查询，暂时用现有API
    const { data } = await circleApi.detail(circleId);
    // 通过members端点获取
    const res = await api.get(`/circles/${circleId}/members`, { params: { page: memberPage.value, pageSize: 20 } });
    const d = res.data as any;
    members.value = d?.members || d?.data || [];
    memberTotal.value = d?.total || 0;
  } catch { members.value = []; } finally { memberLoading.value = false; }
}

async function changeRole(row: any, role: string) {
  if (row.role === "OWNER" && role !== "OWNER") return ElMessage.warning("不能降级圈主");
  try {
    await circleApi.updateMember(circleId, row.userId, { role });
    ElMessage.success("角色已更新"); row.role = role;
  } catch { /* ignore */ }
}

async function removeMember(row: any) {
  await ElMessageBox.confirm("确定移除该成员？", "确认", { type: "warning" });
  try { await circleApi.removeMember(circleId, row.userId); ElMessage.success("已移除"); fetchMembers(); } catch { /* ignore */ }
}

async function showMemberGroups(row: any) {
  groupTargetUser.value = row.user || row;
  try {
    const res = await api.get(`/circles/${circleId}/member-groups`);
    memberGroups.value = (res.data as any)?.data || res.data || [];
    const memberRes = await api.get(`/circles/${circleId}/member-groups/user/${row.userId}`);
    groupSelected.value = ((memberRes.data as any)?.groups || []).map((g: any) => g.id);
  } catch { memberGroups.value = []; }
  groupVisible.value = true;
}

async function saveMemberGroups() {
  try {
    await api.post(`/circles/${circleId}/member-groups/assign`, { userId: groupTargetUser.value?.userId || groupTargetUser.value?.id, groupIds: groupSelected.value });
    ElMessage.success("分组已更新"); groupVisible.value = false;
  } catch { /* ignore */ }
}

async function showAddMemberDialog() { addMemberVisible.value = true; }
async function addMember() {
  try {
    await api.post(`/circles/${circleId}/join`, { userId: addMemberForm.userId, role: addMemberForm.role });
    ElMessage.success("已添加"); addMemberVisible.value = false; fetchMembers();
  } catch { /* ignore */ }
}

// ─── 帖子 ───
async function fetchPosts() {
  postLoading.value = true;
  try {
    const params: any = { page: postPage.value, pageSize: 20 };
    if (postFilter.value === "essence") params.isEssence = "true";
    if (postFilter.value === "top") params.isEssence = "top";
    const { data } = await circleApi.getPosts(circleId, params);
    const d = data as any; posts.value = d?.posts || d?.data || []; postTotal.value = d?.total || 0;
  } catch { posts.value = []; } finally { postLoading.value = false; }
}
async function toggleEssence(row: any) {
  try { await circleApi.toggleEssence(circleId, row.id); row.isEssence = !row.isEssence; ElMessage.success(row.isEssence ? "已设为精华" : "已取消精华"); } catch { /* ignore */ }
}
async function toggleTop(row: any) {
  try { await circleApi.toggleTop(circleId, row.id); row.isTop = !row.isTop; ElMessage.success(row.isTop ? "已设为置顶" : "已取消置顶"); } catch { /* ignore */ }
}
async function deletePost(row: any) {
  await ElMessageBox.confirm("确定删除该帖子？", "确认", { type: "warning" });
  try { await circleApi.deletePost(circleId, row.id); ElMessage.success("已删除"); fetchPosts(); } catch { /* ignore */ }
}

// ─── 文章 ───
async function fetchArticles() {
  articleLoading.value = true;
  try {
    const params: any = { page: articlePage.value, pageSize: 20, circleId };
    if (articleAuditFilter.value) params.status = articleAuditFilter.value;
    const { data } = await articleApi.list(params);
    const d = data as any; articles.value = d?.articles || d?.data || []; articleTotal.value = d?.total || 0;
  } catch { articles.value = []; } finally { articleLoading.value = false; }
}
async function auditArticle(row: any, status: string) {
  try { await articleApi.audit(row.id, status); row.auditStatus = status; ElMessage.success(status === "APPROVED" ? "已通过" : "已拒绝"); } catch { /* ignore */ }
}
async function deleteArticle(row: any) {
  await ElMessageBox.confirm("确定删除该文章？", "确认", { type: "warning" });
  try { await articleApi.remove(row.id); ElMessage.success("已删除"); fetchArticles(); } catch { /* ignore */ }
}

// ─── 课程 ───
async function fetchCourses() {
  courseLoading.value = true;
  try {
    const res = await api.get("/courses", { params: { page: coursePage.value, pageSize: 20, circleId } });
    const d = res.data as any; courses.value = d?.courses || d?.data || []; courseTotal.value = d?.total || 0;
  } catch { courses.value = []; } finally { courseLoading.value = false; }
}
async function deleteCourse(row: any) {
  await ElMessageBox.confirm("确定删除该课程？", "确认", { type: "warning" });
  try { await api.delete(`/courses/${row.id}`); ElMessage.success("已删除"); fetchCourses(); } catch { /* ignore */ }
}

// ─── 问答 ───
async function fetchQuestions() {
  questionLoading.value = true;
  try {
    const params: any = { page: questionPage.value, pageSize: 20, circleId };
    if (questionFilter.value) params.status = questionFilter.value;
    const res = await api.get("/question", { params });
    const d = res.data as any; questions.value = d?.questions || d?.data || []; questionTotal.value = d?.total || 0;
  } catch { questions.value = []; } finally { questionLoading.value = false; }
}
async function refundQuestion(row: any) {
  await ElMessageBox.confirm("确定退款该问题？费用将退回提问者账户", "确认", { type: "warning" });
  try { await api.post("/question/admin/refund-expired"); ElMessage.success("已退款"); fetchQuestions(); } catch { /* ignore */ }
}

// ─── 直播 ───
async function fetchLives() {
  liveLoading.value = true;
  try {
    const params: any = { page: livePage.value, pageSize: 20, circleId };
    if (liveStatusFilter.value) params.status = liveStatusFilter.value;
    const res = await api.get("/live/rooms", { params });
    const d = res.data as any; lives.value = d?.lives || d?.data || []; liveTotal.value = d?.total || 0;
  } catch { lives.value = []; } finally { liveLoading.value = false; }
}
async function deleteLive(row: any) {
  await ElMessageBox.confirm("确定删除该直播？", "确认", { type: "warning" });
  try { await api.delete(`/live/rooms/${row.id}`); ElMessage.success("已删除"); fetchLives(); } catch { /* ignore */ }
}

// ─── 达人 ───
async function fetchExperts() {
  expertLoading.value = true;
  try {
    const { data } = await circleApi.listExperts(circleId);
    experts.value = (data as any)?.experts || (data as any)?.data || [];
  } catch { experts.value = []; } finally { expertLoading.value = false; }
}
async function updateExpertPrice(row: any, field: string, value: number) {
  try {
    await circleApi.setExpertConfig(circleId, {
      userId: row.userId,
      questionPriceCoin: field === "question" ? value : row.questionPriceCoin,
      questionTimeoutHours: field === "timeout" ? value : row.questionTimeoutHours,
      callPricePerMinuteCoin: field === "call" ? value : row.callPricePerMinuteCoin,
    } as any);
  } catch { /* ignore */ }
}

// ─── 收益 ───
async function fetchRevenue() {
  revenueLoading.value = true;
  try {
    const params: any = { page: revenuePage.value, pageSize: 20, circleId };
    if (revenueTypeFilter.value) params.type = revenueTypeFilter.value;
    const res = await api.get(`/commission/circle-revenue/${circleId}/records`, { params });
    const d = res.data as any; revenues.value = d?.records || d?.data || []; revenueTotal.value = d?.total || 0;
  } catch { revenues.value = []; } finally { revenueLoading.value = false; }
}

// ─── 知识库 ───
async function fetchKnowledge() {
  knowledgeLoading.value = true;
  try {
    const [itemsRes, candRes] = await Promise.all([
      api.get(`/circles/${circleId}/knowledge`),
      api.get(`/circles/${circleId}/knowledge/candidates`),
    ]);
    knowledgeItems.value = (itemsRes.data as any)?.items || (itemsRes.data as any)?.data || [];
    knowledgeCandidates.value = (candRes.data as any)?.candidates || (candRes.data as any)?.data || [];
  } catch { knowledgeItems.value = []; knowledgeCandidates.value = []; } finally { knowledgeLoading.value = false; }
}
async function fetchKnowledgeCandidates() { fetchKnowledge(); }
async function syncCircleKnowledge() {
  try { await knowledgeApi.syncCircle(circleId); ElMessage.success("同步已触发，稍后查看结果"); } catch { /* ignore */ }
}
async function confirmKnowledge(row: any) {
  try { await knowledgeApi.confirmCandidate(row.id); ElMessage.success("已入库"); fetchKnowledge(); } catch { /* ignore */ }
}
async function rejectKnowledge(row: any) {
  try { await knowledgeApi.rejectCandidate(row.id); ElMessage.success("已拒绝"); fetchKnowledge(); } catch { /* ignore */ }
}

// ─── 排行 ───
async function fetchRanking() {
  try {
    const [lbRes, hotRes] = await Promise.all([
      circleApi.getLeaderboard(circleId, { page: 1, pageSize: 20 }),
      circleApi.getHotContent(circleId, 10),
    ]);
    leaderboard.value = (lbRes.data as any)?.items || (lbRes.data as any)?.data || [];
    hotContent.value = (hotRes.data as any)?.data || [];
  } catch { leaderboard.value = []; hotContent.value = []; }
}

// ─── 添加到知识库 ───
function getAdminUserId(): string {
  const auth = useAuthStore()
  return auth.user?.id || ''
}

async function addPostToKnowledge(row: any) {
  try {
    await knowledgeApi.addToKnowledge({
      circleId,
      userId: getAdminUserId(),
      targetType: 'post',
      targetId: row.id,
    })
    ElMessage.success(`帖子已添加到知识库候选`)
  } catch { ElMessage.error('添加失败') }
}

async function addArticleToKnowledge(row: any) {
  try {
    await knowledgeApi.addToKnowledge({
      circleId,
      userId: getAdminUserId(),
      targetType: 'article',
      targetId: row.id,
    })
    ElMessage.success(`文章已添加到知识库候选`)
  } catch { ElMessage.error('添加失败') }
}

async function addCourseToKnowledge(row: any) {
  try {
    await knowledgeApi.addToKnowledge({
      circleId,
      userId: getAdminUserId(),
      targetType: 'course',
      targetId: row.id,
    })
    ElMessage.success(`课程已添加到知识库候选`)
  } catch { ElMessage.error('添加失败') }
}

// ─── 设置 ───
async function saveSettings() {
  saving.value = true;
  try {
    await circleApi.update(circleId, {
      name: settingsForm.name, cover: settingsForm.cover, intro: settingsForm.intro,
      type: settingsForm.type, price: settingsForm.price, depositAmount: settingsForm.depositAmount,
      categoryLevel1: settingsForm.categoryLevel1, categoryLevel2: settingsForm.categoryLevel2,
      tags: settingsForm.tagsStr.split(",").map(s => s.trim()).filter(Boolean),
    });
    if (settingsForm.announcement) {
      await api.put(`/circles/${circleId}/announcement`, { content: settingsForm.announcement });
    }
    ElMessage.success("设置已保存"); refreshDetail();
  } catch { /* ignore */ } finally { saving.value = false; }
}

// ─── 编辑弹窗 ───
function openEdit() {
  Object.assign(editForm, {
    name: detail.value?.name || "", cover: detail.value?.cover || "", intro: detail.value?.intro || "",
    type: detail.value?.type || "FREE", price: Number(detail.value?.price) || 0,
    depositAmount: Number(detail.value?.depositAmount) || 0,
  });
  editVisible.value = true;
}
async function saveEdit() {
  saving.value = true;
  try {
    await circleApi.update(circleId, { ...editForm });
    ElMessage.success("已更新"); editVisible.value = false; refreshDetail();
  } catch { /* ignore */ } finally { saving.value = false; }
}

// ─── 封禁/解封 ───
async function disableCircle() {
  await ElMessageBox.confirm("确定封禁该圈子？封禁后用户无法访问", "确认", { type: "warning" });
  try { await circleApi.update(circleId, { status: "DISABLED" } as any); ElMessage.success("已封禁"); refreshDetail(); } catch { /* ignore */ }
}
async function enableCircle() {
  try { await circleApi.update(circleId, { status: "ACTIVE" } as any); ElMessage.success("已解封"); refreshDetail(); } catch { /* ignore */ }
}
</script>

<style scoped>
.circle-detail-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.header-left { display: flex; align-items: center; gap: 10px; }
.header-left h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.header-actions { display: flex; gap: 8px; }
.stat-row { margin-bottom: 16px; }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 12px 8px; text-align: center; }
.stat-card .value { display: block; font-size: 20px; font-weight: 700; color: #303133; }
.stat-card .value.warn { color: #f56c6c; }
.stat-card .label { display: block; font-size: 12px; color: #909399; margin-top: 2px; }
.main-tabs { margin-top: 0; }
.toolbar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.section-title { font-weight: 600; font-size: 14px; color: #303133; margin-bottom: 10px; }
.text-muted { color: #909399; }
.text-danger { color: #f56c6c; }
</style>
