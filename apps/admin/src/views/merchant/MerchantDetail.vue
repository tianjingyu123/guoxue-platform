<template>
  <div class="page">
    <div class="header">
      <el-button
        text
        @click="$router.back()"
      >
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h3 v-if="merchant">
        {{ merchant.shopName }} — 商家详情
      </h3>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="商家详情加载失败，请稍后重试"
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
      v-loading="loading"
    >
      <!-- 标签1: 店铺信息 -->
      <el-tab-pane
        label="店铺信息"
        name="info"
      >
        <el-card v-if="merchant">
          <el-descriptions
            :column="2"
            border
          >
            <el-descriptions-item label="店铺名称">
              {{ merchant.shopName }}
            </el-descriptions-item>
            <el-descriptions-item label="店铺状态">
              <el-tag :type="statusTagType(merchant.status)">
                {{ statusLabel(merchant.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="联系人">
              {{ merchant.contactName }}
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              {{ merchant.contactPhone }}
            </el-descriptions-item>
            <el-descriptions-item label="经营类目">
              {{ merchant.categoryIds?.join(', ') || '未选择' }}
            </el-descriptions-item>
            <el-descriptions-item label="店铺评分">
              {{ Number(merchant.rating).toFixed(1) }}
            </el-descriptions-item>
            <el-descriptions-item label="入驻时间">
              {{ formatDate(merchant.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="开通时间">
              {{ formatDate(merchant.openedAt) }}
            </el-descriptions-item>
            <el-descriptions-item
              label="店铺简介"
              :span="2"
            >
              {{ merchant.shopIntro || '暂无' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="merchant.rejectReason"
              label="驳回原因"
              :span="2"
            >
              <span style="color:red">{{ merchant.rejectReason }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="审核人">
              {{ merchant.reviewedBy || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="审核时间">
              {{ formatDate(merchant.reviewedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="保证金">
              {{ Number(merchant.depositAmount || 0) > 0 ? '¥' + Number(merchant.depositAmount).toFixed(2) : '当前免缴' }}
            </el-descriptions-item>
            <el-descriptions-item label="分佣比例">
              {{ merchant.commissionRate ? (Number(merchant.commissionRate) * 100).toFixed(1) + '%' : '默认' }}
            </el-descriptions-item>
          </el-descriptions>

          <h4 style="margin:20px 0 12px">
            资质材料
          </h4>
          <el-descriptions
            :column="3"
            border
          >
            <el-descriptions-item label="身份证正面">
              <el-image
                v-if="merchant.idCardFront"
                :src="merchant.idCardFront"
                style="width:200px;height:120px"
                fit="contain"
                preview-teleported
              />
              <span
                v-else
                class="text-muted"
              >未上传</span>
            </el-descriptions-item>
            <el-descriptions-item label="身份证反面">
              <el-image
                v-if="merchant.idCardBack"
                :src="merchant.idCardBack"
                style="width:200px;height:120px"
                fit="contain"
                preview-teleported
              />
              <span
                v-else
                class="text-muted"
              >未上传</span>
            </el-descriptions-item>
            <el-descriptions-item label="营业执照">
              <el-image
                v-if="merchant.businessLicense"
                :src="merchant.businessLicense"
                style="width:200px;height:120px"
                fit="contain"
                preview-teleported
              />
              <span
                v-else
                class="text-muted"
              >未上传</span>
            </el-descriptions-item>
            <el-descriptions-item label="品牌授权书">
              <el-image
                v-if="merchant.brandAuth"
                :src="merchant.brandAuth"
                style="width:200px;height:120px"
                fit="contain"
                preview-teleported
              />
              <span
                v-else
                class="text-muted"
              >未上传</span>
            </el-descriptions-item>
            <el-descriptions-item label="已签协议">
              <el-image
                v-if="merchant.agreementUrl"
                :src="merchant.agreementUrl"
                style="width:200px;height:120px"
                fit="contain"
                preview-teleported
              />
              <span
                v-else
                class="text-muted"
              >未签署</span>
            </el-descriptions-item>
          </el-descriptions>

          <h4 style="margin:20px 0 12px">
            关联用户
          </h4>
          <el-descriptions
            v-if="merchant.user"
            :column="2"
            border
          >
            <el-descriptions-item label="用户昵称">
              {{ merchant.user.nickname }}
            </el-descriptions-item>
            <el-descriptions-item label="手机号">
              {{ merchant.user.phone || '-' }}
            </el-descriptions-item>
          </el-descriptions>

          <div style="margin-top:20px">
            <template v-if="merchant.status === 'PENDING_REVIEW'">
              <el-button
                type="success"
                @click="openApprove"
              >
                审核通过
              </el-button>
              <el-button
                type="danger"
                @click="openReject"
              >
                审核驳回
              </el-button>
            </template>
            <template v-else-if="merchant.status === 'ACTIVE'">
              <el-button
                type="warning"
                @click="changeStatus('SUSPENDED')"
              >
                暂停经营
              </el-button>
              <el-button
                type="danger"
                @click="changeStatus('CLOSED')"
              >
                关闭店铺
              </el-button>
            </template>
            <template v-else-if="merchant.status === 'SUSPENDED'">
              <el-button
                type="success"
                @click="changeStatus('ACTIVE')"
              >
                恢复经营
              </el-button>
            </template>
            <el-button @click="openCommission">
              设置分佣比例
            </el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 标签2: 经营数据 -->
      <el-tab-pane
        label="经营数据"
        name="stats"
      >
        <div
          v-if="stats"
          class="stats-row"
        >
          <el-statistic
            title="累计销售额"
            :value="Number(stats.totalSales)"
            prefix="¥"
            :precision="2"
          />
          <el-statistic
            title="累计订单数"
            :value="stats.totalOrders"
          />
          <el-statistic
            title="违规次数"
            :value="stats.violationCount"
          />
        </div>
        <el-empty
          v-else
          description="暂无数据"
        />
      </el-tab-pane>

      <!-- 标签3: 违规记录 -->
      <el-tab-pane
        label="违规记录"
        name="violations"
      >
        <div style="margin-bottom:12px">
          <el-button
            type="primary"
            size="small"
            @click="openViolationDialog"
          >
            新建违规
          </el-button>
        </div>
        <el-table
          :data="violations"
          stripe
        >
          <template #empty>
            <el-empty description="暂无违规记录" />
          </template>
          <el-table-column
            label="程度"
            width="80"
          >
            <template #default="{ row }">
              <el-tag :type="violationTagType(row.type)">
                {{ violationTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="title"
            label="标题"
            min-width="150"
          />
          <el-table-column
            label="处罚金额"
            width="100"
          >
            <template #default="{ row }">
              {{ row.penalty ? '¥' + Number(row.penalty).toFixed(2) : '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'CONFIRMED' ? 'danger' : row.status === 'DISMISSED' ? 'info' : 'warning'"
                size="small"
              >
                {{ row.status === 'CONFIRMED' ? '已确认' : row.status === 'DISMISSED' ? '已驳回' : '待处理' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="创建时间"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            v-if="violations.some(v => v.status === 'PENDING')"
            label="操作"
            width="160"
          >
            <template #default="{ row }">
              <template v-if="row.status === 'PENDING'">
                <el-button
                  type="success"
                  size="small"
                  @click="handleViolationAction(row.id, 'CONFIRMED')"
                >
                  确认
                </el-button>
                <el-button
                  type="info"
                  size="small"
                  @click="handleViolationAction(row.id, 'DISMISSED')"
                >
                  驳回
                </el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 标签3.5: 处罚记录（履-P3） -->
      <el-tab-pane
        label="处罚记录"
        name="punishments"
      >
        <div style="margin-bottom:12px">
          <el-button
            type="danger"
            size="small"
            @click="openPunishDialog"
          >
            执行处罚
          </el-button>
        </div>
        <el-table
          v-loading="punishmentsLoading"
          :data="punishments"
          stripe
        >
          <template #empty>
            <el-empty description="暂无处罚记录" />
          </template>
          <el-table-column
            label="类型"
            width="110"
          >
            <template #default="{ row }">
              <el-tag
                :type="punishTagType(row.type)"
                size="small"
              >
                {{ punishTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="reason"
            label="处罚原因"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'ACTIVE' ? 'danger' : 'info'"
                size="small"
              >
                {{ row.status === 'ACTIVE' ? '生效中' : '已撤销' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="操作人"
            width="120"
          >
            <template #default="{ row }">
              {{ row.operatorId === 'SYSTEM' ? '系统自动' : row.operatorId }}
            </template>
          </el-table-column>
          <el-table-column
            label="到期时间"
            width="120"
          >
            <template #default="{ row }">
              {{ formatDate(row.expiresAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="处罚时间"
            width="120"
          >
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="90"
          >
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'ACTIVE'"
                type="warning"
                size="small"
                text
                @click="doRevokePunishment(row)"
              >
                撤销
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 标签4: 保证金 -->
      <el-tab-pane
        label="保证金记录"
        name="deposits"
      >
        <el-alert
          title="当前实行免保证金入驻；本页仅保留历史流水只读核验，在线收款与原路退款未接入前不提供资金操作"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom:12px"
        />
        <el-table
          :data="deposits"
          stripe
        >
          <template #empty>
            <el-empty description="暂无保证金记录" />
          </template>
          <el-table-column
            label="类型"
            width="90"
          >
            <template #default="{ row }">
              {{ depositTypeLabel(row.type) }}
            </template>
          </el-table-column>
          <el-table-column
            label="金额"
            width="120"
          >
            <template #default="{ row }">
              ¥{{ Number(row.amount).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="payMethod"
            label="支付方式"
            width="100"
          />
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'danger' : 'warning'"
                size="small"
              >
                {{ row.status === 'SUCCESS' ? '成功' : row.status === 'FAILED' ? '失败' : '处理中' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="remark"
            label="备注"
            min-width="150"
          />
          <el-table-column
            label="时间"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 标签5: 结算记录 -->
      <el-tab-pane
        label="结算记录"
        name="settlements"
      >
        <div style="margin-bottom:12px">
          <el-button
            type="primary"
            size="small"
            @click="openSettleDialog"
          >
            生成结算单
          </el-button>
        </div>
        <el-table
          :data="settlements"
          stripe
        >
          <template #empty>
            <el-empty description="暂无结算记录" />
          </template>
          <el-table-column
            label="结算周期"
            min-width="200"
          >
            <template #default="{ row }">
              {{ formatDate(row.periodStart) }} ~ {{ formatDate(row.periodEnd) }}
            </template>
          </el-table-column>
          <el-table-column
            label="订单数"
            width="80"
          >
            <template #default="{ row }">
              {{ row.orderCount }}
            </template>
          </el-table-column>
          <el-table-column
            label="总营收"
            width="110"
          >
            <template #default="{ row }">
              ¥{{ Number(row.totalRevenue || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column
            label="平台抽成"
            width="110"
          >
            <template #default="{ row }">
              ¥{{ Number(row.commission || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column
            label="结算金额"
            width="110"
          >
            <template #default="{ row }">
              ¥{{ Number(row.settlementAmount || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'PAID' ? 'success' : row.status === 'CANCELLED' ? 'info' : 'warning'"
                size="small"
              >
                {{ row.status === 'PAID' ? '已支付' : row.status === 'CANCELLED' ? '已取消' : '待支付' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="支付时间"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDate(row.paidAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="160"
          >
            <template #default="{ row }">
              <template v-if="row.status === 'PENDING'">
                <el-button
                  type="success"
                  size="small"
                  @click="openPaySettle(row)"
                >
                  标记支付
                </el-button>
                <el-button
                  type="info"
                  size="small"
                  @click="doCancelSettlement(row.id)"
                >
                  取消
                </el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 标签: 操作员管理（多操作员·官方旗舰店） -->
      <el-tab-pane
        label="操作员管理"
        name="members"
      >
        <el-card>
          <div class="members-head">
            <div class="members-hint">
              操作员可用自己的账号以本店铺身份发布/管理商品；商品与订单归属仍记店主，操作员仅用于协作与审计。
            </div>
            <el-button
              type="primary"
              size="small"
              @click="openAddMember"
            >
              添加操作员
            </el-button>
          </div>
          <el-table
            v-loading="membersLoading"
            :data="members"
            stripe
          >
            <template #empty>
              <el-empty description="暂无操作员" />
            </template>
            <el-table-column
              label="用户"
              min-width="160"
            >
              <template #default="{ row }">
                {{ row.nickname || '（未设昵称）' }}
              </template>
            </el-table-column>
            <el-table-column
              prop="phone"
              label="手机号"
              width="140"
            />
            <el-table-column
              label="身份"
              width="100"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.role === 'OWNER' ? 'warning' : 'success'"
                  size="small"
                >
                  {{ row.role === "OWNER" ? "店主" : "操作员" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="100"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  v-if="row.role !== 'OWNER'"
                  size="small"
                  text
                  type="danger"
                  @click="doRemoveMember(row)"
                >
                  移除
                </el-button>
                <span
                  v-else
                  class="members-owner-hint"
                >—</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加操作员对话框 -->
    <el-dialog
      v-model="addMemberDialog"
      title="添加操作员"
      width="420px"
    >
      <el-form label-width="80px">
        <el-form-item label="手机号">
          <el-input
            v-model="addMemberPhone"
            maxlength="11"
            placeholder="输入操作员手机号（须已注册平台）"
          />
        </el-form-item>
        <div class="members-add-tip">
          该手机号对应的账号将成为本店铺操作员，可在「个人中心 · 身份切换 · 商家管理台」进入并发布/管理商品。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="addMemberDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="addMemberSaving"
          @click="doAddMember"
        >
          确定添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 执行处罚对话框（履-P3·四类·二次确认） -->
    <el-dialog
      v-model="punishDialog"
      title="执行处罚"
      width="520px"
    >
      <el-alert
        v-if="punishForm.type === 'CLEAR_OUT'"
        title="清退仅做标记与停业，保证金/未结算货款不会自动清算，需人工处理"
        type="warning"
        :closable="false"
        style="margin-bottom:12px"
      />
      <el-form
        :model="punishForm"
        label-width="90px"
      >
        <el-form-item
          label="处罚类型"
          required
        >
          <el-select
            v-model="punishForm.type"
            style="width:100%"
          >
            <el-option
              label="警告（只记录+通知）"
              value="WARNING"
            />
            <el-option
              label="商品下架（指定涉事商品）"
              value="PRODUCT_DOWN"
            />
            <el-option
              label="暂停经营（店铺冻结+全部下架）"
              value="SHOP_SUSPEND"
            />
            <el-option
              label="标记清退（停业标记·资金人工处理）"
              value="CLEAR_OUT"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="处罚原因"
          required
        >
          <el-input
            v-model="punishForm.reason"
            type="textarea"
            :rows="3"
            maxlength="500"
            placeholder="如：抽检不合格 / 30 天内 2 次三级处罚（同原因未撤销不可重复处罚）"
          />
        </el-form-item>
        <el-form-item
          v-if="punishForm.type === 'PRODUCT_DOWN'"
          label="涉事商品"
          required
        >
          <el-input
            v-model="punishForm.productIdsText"
            type="textarea"
            :rows="3"
            placeholder="商品ID，多个用换行或逗号分隔"
          />
        </el-form-item>
        <el-form-item
          v-if="punishForm.type === 'SHOP_SUSPEND'"
          label="到期时间"
        >
          <el-date-picker
            v-model="punishForm.expiresAt"
            type="date"
            placeholder="暂停到期日（7-30 天·到期需人工撤销恢复）"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="punishDialog = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="saving"
          @click="doCreatePunishment"
        >
          执行处罚
        </el-button>
      </template>
    </el-dialog>

    <!-- 审核通过对话框 -->
    <el-dialog
      v-model="approveDialog"
      title="审核通过"
      width="500px"
    >
      <el-alert
        title="当前实行免保证金入驻；审核通过后商家将直接进入待签约状态"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:16px"
      />
      <el-form
        :model="approveForm"
        label-width="100px"
      >
        <el-form-item label="分佣比例">
          <el-input-number
            v-model="approveForm.commissionRate"
            :min="0"
            :max="1"
            :step="0.01"
            :precision="4"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="内部备注">
          <el-input
            v-model="approveForm.remark"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doApprove"
        >
          确认通过
        </el-button>
      </template>
    </el-dialog>

    <!-- 驳回对话框 -->
    <el-dialog
      v-model="rejectDialog"
      title="审核驳回"
      width="500px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="驳回原因"
          required
        >
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doReject"
        >
          确认驳回
        </el-button>
      </template>
    </el-dialog>

    <!-- 违规对话框 -->
    <el-dialog
      v-model="violationDialog"
      title="新建违规记录"
      width="500px"
    >
      <el-form
        :model="violationForm"
        label-width="80px"
      >
        <el-form-item
          label="违规程度"
          required
        >
          <el-select
            v-model="violationForm.type"
            style="width:100%"
          >
            <el-option
              label="轻微"
              value="MINOR"
            />
            <el-option
              label="中等"
              value="MODERATE"
            />
            <el-option
              label="严重"
              value="SEVERE"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="违规标题"
          required
        >
          <el-input v-model="violationForm.title" />
        </el-form-item>
        <el-form-item
          label="违规描述"
          required
        >
          <el-input
            v-model="violationForm.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="罚款金额">
          <el-input-number
            v-model="violationForm.penalty"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="violationForm.remark"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="violationDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doCreateViolation"
        >
          确认
        </el-button>
      </template>
    </el-dialog>


    <!-- 生成结算单对话框 -->
    <el-dialog
      v-model="settleDialog"
      title="生成结算单"
      width="450px"
    >
      <el-form label-width="100px">
        <el-form-item
          label="结算周期起始"
          required
        >
          <el-date-picker
            v-model="settleForm.periodStart"
            type="date"
            placeholder="选择起始日期"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          label="结算周期截止"
          required
        >
          <el-date-picker
            v-model="settleForm.periodEnd"
            type="date"
            placeholder="选择截止日期"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settleDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doGenerateSettlement"
        >
          生成
        </el-button>
      </template>
    </el-dialog>

    <!-- 标记结算支付对话框 -->
    <el-dialog
      v-model="paySettleDialog"
      title="标记结算已支付"
      width="420px"
    >
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
        :title="`该结算单应付金额 ¥${paySettleDue.toFixed(2)}（已预填），确认前请核对线下实际打款金额。`"
      />
      <el-form label-width="80px">
        <el-form-item
          label="支付金额"
          required
        >
          <el-input-number
            v-model="paySettleAmount"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="paySettleRemark" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paySettleDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doPaySettlement"
        >
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 分佣比例对话框 -->
    <el-dialog
      v-model="commissionDialog"
      title="设置分佣比例"
      width="400px"
    >
      <el-form label-width="100px">
        <el-form-item label="商家分佣比例">
          <el-input-number
            v-model="commissionRate"
            :min="0"
            :max="1"
            :step="0.01"
            :precision="4"
            style="width:100%"
          />
          <span style="margin-left:8px;color:#999">商家得 {{ (commissionRate * 100).toFixed(1) }}%</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="commissionDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doSetCommission"
        >
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { merchantApi } from '@/api'

const route = useRoute()
const id = route.params.id as string

/** 关联用户 */
interface MerchantUser { nickname?: string; phone?: string }
/** 商家详情（字段宽松 optional，仅覆盖模板/脚本访问字段） */
interface MerchantInfo {
  id?: string
  shopName?: string
  status?: string
  contactName?: string
  contactPhone?: string
  categoryIds?: string[]
  rating?: number
  createdAt?: string
  openedAt?: string
  shopIntro?: string
  rejectReason?: string
  reviewedBy?: string
  reviewedAt?: string
  depositAmount?: number
  commissionRate?: number
  idCardFront?: string
  idCardBack?: string
  businessLicense?: string
  brandAuth?: string
  agreementUrl?: string
  user?: MerchantUser
  violations?: ViolationRow[]
  depositRecords?: DepositRow[]
}
/** 经营数据统计 */
interface MerchantStats { totalSales?: number; totalOrders?: number; violationCount?: number }
/** 违规记录行 */
interface ViolationRow { id: string; type?: string; title?: string; penalty?: number; status?: string; createdAt?: string }
/** 保证金记录行 */
interface DepositRow { type?: string; amount?: number; payMethod?: string; status?: string; remark?: string; createdAt?: string }
/** 处罚记录行（履-P3） */
interface PunishmentRow { id: string; type?: string; reason?: string; status?: string; operatorId?: string; expiresAt?: string; createdAt?: string }
/** 结算记录行 */
interface SettlementRow {
  id: string
  periodStart?: string
  periodEnd?: string
  orderCount?: number
  totalRevenue?: number
  commission?: number
  settlementAmount?: number
  status?: string
  paidAt?: string
}

// 支持从列表页「处罚」按钮直达处罚 Tab（?tab=punishments）
const VALID_TABS = ['info', 'stats', 'violations', 'punishments', 'deposits', 'settlements']
const initTab = typeof route.query.tab === 'string' && VALID_TABS.includes(route.query.tab) ? route.query.tab : 'info'
const activeTab = ref(initTab)
const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const merchant = ref<MerchantInfo | null>(null)
const stats = ref<MerchantStats | null>(null)
const violations = ref<ViolationRow[]>([])
const deposits = ref<DepositRow[]>([])

const approveDialog = ref(false)
const rejectDialog = ref(false)
const rejectReason = ref('')
const approveForm = ref({ commissionRate: undefined as number | undefined, remark: '' })

const violationDialog = ref(false)
const violationForm = ref({ type: 'MINOR', title: '', description: '', penalty: undefined as number | undefined, remark: '' })


const commissionDialog = ref(false)
const commissionRate = ref(0.8)

const punishments = ref<PunishmentRow[]>([])
const punishmentsLoading = ref(false)
const punishDialog = ref(false)
const punishForm = ref({ type: 'WARNING', reason: '', productIdsText: '', expiresAt: '' as string | Date })

const settlements = ref<SettlementRow[]>([])
const settleDialog = ref(false)
const settleForm = ref({ periodStart: '', periodEnd: '' })

const paySettleDialog = ref(false)
const paySettleId = ref('')
const paySettleDue = ref(0) // 结算单应付金额（预填与比对基准）
const paySettleAmount = ref(0)
const paySettleRemark = ref('')

const STATUS_MAP: Record<string, string> = {
  PENDING_REVIEW: '待审核', REVIEW_FAILED: '审核驳回', DEPOSIT_PENDING: '保证金待处理',
  AGREEMENT_PENDING: '待签署协议', ACTIVE: '已开通', SUSPENDED: '已暂停', CLOSED: '已关闭',
}
const VIOLATION_TYPE: Record<string, string> = { MINOR: '轻微', MODERATE: '中等', SEVERE: '严重' }
const PUNISH_TYPE: Record<string, string> = { WARNING: '警告', PRODUCT_DOWN: '商品下架', SHOP_SUSPEND: '暂停经营', CLEAR_OUT: '标记清退' }
const DEPOSIT_TYPE: Record<string, string> = { PAYMENT: '缴纳', REFUND: '退还', DEDUCTION: '扣罚', TOPUP: '补缴' }

function statusLabel(s?: string) { return s ? (STATUS_MAP[s] || s) : '-' }
function statusTagType(s?: string) {
  if (s === 'ACTIVE') return 'success'
  if (s && ['PENDING_REVIEW', 'DEPOSIT_PENDING', 'AGREEMENT_PENDING'].includes(s)) return 'warning'
  if (s === 'REVIEW_FAILED' || s === 'CLOSED') return 'danger'
  return 'info'
}
function violationTypeLabel(t: string) { return VIOLATION_TYPE[t] || t }
function violationTagType(t: string) { return t === 'SEVERE' ? 'danger' : t === 'MODERATE' ? 'warning' : 'info' }
function punishTypeLabel(t?: string) { return t ? (PUNISH_TYPE[t] || t) : '-' }
function punishTagType(t?: string) {
  if (t === 'CLEAR_OUT') return 'danger'
  if (t === 'SHOP_SUSPEND') return 'danger'
  if (t === 'PRODUCT_DOWN') return 'warning'
  return 'info'
}
function depositTypeLabel(t: string) { return DEPOSIT_TYPE[t] || t }
function formatDate(d?: string) { return d ? new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-' }

onMounted(() => {
  fetchDetail()
  if (activeTab.value === 'punishments') fetchPunishments()
  else if (activeTab.value === 'stats') fetchStats()
  else if (activeTab.value === 'settlements') fetchSettlements()
})

// 切换Tab时懒加载数据
watch(activeTab, (tab) => {
  if (tab === 'stats') fetchStats()
  else if (tab === 'settlements') fetchSettlements()
  else if (tab === 'punishments') fetchPunishments()
  else if (tab === 'members') fetchMembers()
})

// ── 操作员管理 ──
interface MemberRow { userId: string; nickname: string; phone: string; role: string; status: string }
const members = ref<MemberRow[]>([])
const membersLoading = ref(false)
const addMemberDialog = ref(false)
const addMemberPhone = ref('')
const addMemberSaving = ref(false)

async function fetchMembers() {
  membersLoading.value = true
  try {
    const res = await merchantApi.listMembers(id)
    members.value = (res.data as MemberRow[]) || []
  } catch {
    members.value = []
  } finally { membersLoading.value = false }
}

function openAddMember() { addMemberPhone.value = ''; addMemberDialog.value = true }

async function doAddMember() {
  const phone = addMemberPhone.value.trim()
  if (!/^1[3-9]\d{9}$/.test(phone)) { ElMessage.warning('请输入正确的手机号'); return }
  addMemberSaving.value = true
  try {
    await merchantApi.addMember(id, { phone })
    ElMessage.success('已添加操作员')
    addMemberDialog.value = false
    fetchMembers()
  } catch { /* 拦截器已提示 */ } finally { addMemberSaving.value = false }
}

async function doRemoveMember(row: MemberRow) {
  try {
    await ElMessageBox.confirm(`确定移除操作员「${row.nickname || row.phone}」？`, '提示', { type: 'warning' })
    await merchantApi.removeMember(id, row.userId)
    ElMessage.success('已移除')
    fetchMembers()
  } catch { /* 取消或失败 */ }
}

async function fetchDetail() {
  loading.value = true
  error.value = false
  try {
    const res = await merchantApi.detail(id)
    merchant.value = (res.data as MerchantInfo)
    violations.value = merchant.value?.violations || []
    deposits.value = merchant.value?.depositRecords || []
  } catch (_e) {
    error.value = true
  } finally { loading.value = false }
}

async function fetchStats() {
  try {
    const res = await merchantApi.stats(id)
    stats.value = res.data as MerchantStats
  } catch { /* ignore */ }
}

// 审核
function openApprove() {
  approveForm.value = { commissionRate: undefined, remark: '' }
  approveDialog.value = true
}
async function doApprove() {
  saving.value = true
  try {
    await merchantApi.approve(id, { ...approveForm.value })
    ElMessage.success('审核已通过')
    approveDialog.value = false
    fetchDetail()
  } catch (_e) { }
  finally { saving.value = false }
}
function openReject() { rejectReason.value = ''; rejectDialog.value = true }
async function doReject() {
  if (!rejectReason.value) { ElMessage.warning('请填写驳回原因'); return }
  saving.value = true
  try {
    await merchantApi.reject(id, { reason: rejectReason.value })
    ElMessage.success('已驳回')
    rejectDialog.value = false
    fetchDetail()
  } catch (_e) { }
  finally { saving.value = false }
}
async function changeStatus(status: string) {
  const label = status === 'SUSPENDED' ? '暂停' : status === 'ACTIVE' ? '恢复' : '关闭'
  const shopName = merchant.value?.shopName || '该商家'
  try {
    if (status === 'ACTIVE') {
      await ElMessageBox.confirm(`确定恢复「${shopName}」经营吗？恢复后店铺与商品重新对用户可见。`, '恢复经营', { type: 'warning' })
      await merchantApi.updateStatus(id, { status })
    } else {
      // 暂停/关闭为 L2 危险操作：理由必填 + 影响提示（理由将通知商家并写入审计）
      const impact = status === 'SUSPENDED'
        ? `暂停后「${shopName}」店铺冻结、全部商品对用户不可购买，需人工恢复。`
        : `关闭后「${shopName}」永久停业、不可自助恢复，保证金与未结算货款需另行人工处理。`
      const r = await ElMessageBox.prompt(`${impact}请填写${label}理由（将通知商家并记录审计）：`, `${label}店铺`, {
        type: 'warning',
        confirmButtonText: `确认${label}`,
        cancelButtonText: '取消',
        inputPlaceholder: `请输入${label}理由（必填）`,
        inputValidator: (v: string) => (v && v.trim() ? true : '理由不能为空'),
      })
      await merchantApi.updateStatus(id, { status, reason: (r.value || '').trim() })
    }
    ElMessage.success(`已${label}`)
    fetchDetail()
  } catch { /* cancelled */ }
}

// 违规
function openViolationDialog() {
  violationForm.value = { type: 'MINOR', title: '', description: '', penalty: undefined, remark: '' }
  violationDialog.value = true
}
async function doCreateViolation() {
  if (!violationForm.value.title || !violationForm.value.description) { ElMessage.warning('请填写完整'); return }
  saving.value = true
  try {
    await merchantApi.createViolation(id, violationForm.value)
    ElMessage.success('违规记录已创建')
    violationDialog.value = false
    fetchDetail()
  } catch (_e) { }
  finally { saving.value = false }
}

// 违规处理
async function handleViolationAction(vid: string, status: string) {
  saving.value = true
  try {
    await merchantApi.handleViolation(id, vid, { status })
    ElMessage.success(status === 'CONFIRMED' ? '违规已确认' : '违规已驳回')
    fetchDetail()
  } catch (_e) { }
  finally { saving.value = false }
}

// 处罚（履-P3）
async function fetchPunishments() {
  punishmentsLoading.value = true
  try {
    const res = await merchantApi.listPunishments({ merchantId: id, pageSize: 100 })
    punishments.value = (res.data as { list?: PunishmentRow[] })?.list || []
  } catch { /* 接口错误走全局提示 */ }
  finally { punishmentsLoading.value = false }
}

function openPunishDialog() {
  punishForm.value = { type: 'WARNING', reason: '', productIdsText: '', expiresAt: '' }
  punishDialog.value = true
}

async function doCreatePunishment() {
  if (saving.value) return
  const { type, reason, productIdsText, expiresAt } = punishForm.value
  if (!reason.trim()) { ElMessage.warning('请填写处罚原因'); return }
  const productIds = productIdsText.split(/[\n,，、\s]+/).map(s => s.trim()).filter(Boolean)
  if (type === 'PRODUCT_DOWN' && productIds.length === 0) { ElMessage.warning('商品下架需指定涉事商品ID'); return }

  // 二次确认（处罚为高影响操作）
  try {
    await ElMessageBox.confirm(
      `确定对「${merchant.value?.shopName || id}」执行【${punishTypeLabel(type)}】处罚吗？将通知商家并记录审计。`,
      '处罚二次确认',
      { type: 'warning', confirmButtonText: '确认执行', cancelButtonText: '再想想' },
    )
  } catch { return }

  saving.value = true
  try {
    await merchantApi.createPunishment({
      merchantId: id,
      type,
      reason: reason.trim(),
      evidence: type === 'PRODUCT_DOWN' ? { productIds } : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    })
    ElMessage.success('处罚已执行')
    punishDialog.value = false
    fetchPunishments()
    fetchDetail() // 暂停/清退会改商家状态，同步刷新
  } catch (_e) { /* 错误走全局提示 */ }
  finally { saving.value = false }
}

async function doRevokePunishment(row: PunishmentRow) {
  if (saving.value) return
  let reason = ''
  try {
    const r = await ElMessageBox.prompt(
      `确定撤销该「${punishTypeLabel(row.type)}」处罚吗？将按处罚时的快照恢复商品/商家状态（已被其他原因改变的会诚实跳过）。`,
      '撤销处罚',
      { type: 'warning', confirmButtonText: '确认撤销', cancelButtonText: '取消', inputPlaceholder: '撤销原因（可选，如申诉成立）' },
    )
    reason = (r.value || '').trim()
  } catch { return }

  saving.value = true
  try {
    await merchantApi.revokePunishment(row.id, reason ? { reason } : undefined)
    ElMessage.success('处罚已撤销，状态已按快照恢复')
    fetchPunishments()
    fetchDetail()
  } catch (_e) { /* 错误走全局提示 */ }
  finally { saving.value = false }
}

// 结算
async function fetchSettlements() {
  try {
    const res = await merchantApi.getSettlements(id)
    settlements.value = (res.data as { list?: SettlementRow[] })?.list || []
  } catch { /* ignore */ }
}

function openSettleDialog() {
  settleForm.value = { periodStart: '', periodEnd: '' }
  settleDialog.value = true
}

async function doGenerateSettlement() {
  const { periodStart, periodEnd } = settleForm.value
  if (!periodStart || !periodEnd) { ElMessage.warning('请选择结算周期'); return }
  saving.value = true
  try {
    await merchantApi.generateSettlement(id, { periodStart, periodEnd })
    ElMessage.success('结算单已生成')
    settleDialog.value = false
    fetchSettlements()
  } catch (_e) { }
  finally { saving.value = false }
}

function openPaySettle(row: SettlementRow) {
  paySettleId.value = row.id
  // 预填结算单应付金额，避免手输错账
  paySettleDue.value = Number(row.settlementAmount || 0)
  paySettleAmount.value = paySettleDue.value
  paySettleRemark.value = ''
  paySettleDialog.value = true
}

async function doPaySettlement() {
  if (!paySettleAmount.value || paySettleAmount.value <= 0) { ElMessage.warning('请输入支付金额（须大于 0）'); return }
  const diff = Math.abs(paySettleAmount.value - paySettleDue.value) > 0.005
  const diffWarn = diff ? `⚠ 输入金额 ¥${paySettleAmount.value.toFixed(2)} 与应付 ¥${paySettleDue.value.toFixed(2)} 不一致，请确认线下实际打款金额无误。` : ''
  try {
    await ElMessageBox.confirm(
      `确认已线下向商家打款 ¥${paySettleAmount.value.toFixed(2)} 并标记该结算单为已支付？标记后不可撤销。${diffWarn}`,
      '标记结算已支付（不可逆）',
      { type: diff ? 'error' : 'warning', confirmButtonText: '确认标记', cancelButtonText: '取消' },
    )
  } catch { return }
  saving.value = true
  try {
    await merchantApi.paySettlement(id, paySettleId.value, {
      amount: paySettleAmount.value,
      remark: paySettleRemark.value || undefined,
    })
    ElMessage.success('已标记为已支付')
    paySettleDialog.value = false
    fetchSettlements()
  } catch (_e) { }
  finally { saving.value = false }
}

async function doCancelSettlement(sid: string) {
  try {
    await ElMessageBox.confirm('确定取消该结算单吗？', '提示', { type: 'warning' })
    await merchantApi.cancelSettlement(id, sid)
    ElMessage.success('结算单已取消')
    fetchSettlements()
  } catch { /* cancelled */ }
}


// 分佣
function openCommission() {
  commissionRate.value = merchant.value?.commissionRate ? Number(merchant.value.commissionRate) : 0.8
  commissionDialog.value = true
}
async function doSetCommission() {
  saving.value = true
  try {
    await merchantApi.setCommission(id, { rate: commissionRate.value })
    ElMessage.success('分佣比例已更新')
    commissionDialog.value = false
    fetchDetail()
  } catch (_e) { }
  finally { saving.value = false }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.header h3 { margin: 0; }
.stats-row { display: flex; gap: 40px; padding: 20px; }
.text-muted { color: var(--color-text-secondary); }
.members-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.members-hint { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; flex: 1; }
.members-owner-hint { color: var(--color-text-placeholder); }
.members-add-tip { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; padding: 0 4px; }
.fund-hint { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.5; margin-top: 4px; }
</style>
