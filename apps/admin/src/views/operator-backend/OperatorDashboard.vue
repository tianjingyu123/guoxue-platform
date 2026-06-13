<template>
  <div class="operator-dashboard">
    <!-- 顶部品牌卡片 -->
    <el-card
      class="brand-card"
      shadow="hover"
    >
      <div class="brand-header">
        <div class="brand-info">
          <el-avatar
            :size="64"
            :src="operator.brandLogo"
          />
          <div class="brand-text">
            <h2>{{ operator.brandName || '我的运营商' }}</h2>
            <el-tag
              :type="levelTagType"
              size="large"
            >
              {{ operator.level }}
            </el-tag>
            <span class="brand-code">邀请码：{{ operator.code }}</span>
          </div>
        </div>
        <div class="brand-actions">
          <el-button
            type="primary"
            @click="showProfileEdit = true"
          >
            编辑品牌信息
          </el-button>
          <el-button @click="copyInviteLink">
            复制邀请链接
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 核心数据 -->
    <el-row
      :gutter="16"
      class="stats-row"
    >
      <el-col :span="4">
        <el-statistic
          title="累计收益（元）"
          :value="operator.totalEarning"
          :precision="2"
        />
      </el-col>
      <el-col :span="4">
        <el-statistic
          title="管理奖（元）"
          :value="operator.mgmtEarning || 0"
          :precision="2"
        />
      </el-col>
      <el-col :span="4">
        <el-statistic
          title="名下站长"
          :value="operator.stationCount || 0"
        />
        <template #suffix>
          <span class="stat-extra">/ {{ operator.containQuota }}</span>
        </template>
      </el-col>
      <el-col :span="4">
        <el-statistic
          title="剩余名额"
          :value="operator.containQuota - (operator.usedQuota || 0)"
        />
      </el-col>
      <el-col :span="4">
        <el-statistic
          title="全返名额"
          :value="operator.fullRebateSlots || 5"
        >
          <template #suffix>
            <span class="stat-extra">已用 {{ operator.usedRebateSlots || 0 }}</span>
          </template>
        </el-statistic>
      </el-col>
      <el-col :span="4">
        <el-statistic
          title="本月新增站长"
          :value="operator.monthNewStations || 0"
        />
      </el-col>
    </el-row>

    <!-- 运营商权益卡片 -->
    <h3 class="section-title">
      运营商专属权益
    </h3>
    <el-row :gutter="16">
      <el-col
        v-for="benefit in operatorBenefits"
        :key="benefit.title"
        :span="6"
      >
        <el-card
          class="benefit-card"
          shadow="hover"
        >
          <div class="benefit-icon">
            <el-icon :size="32">
              <component :is="benefit.icon" />
            </el-icon>
          </div>
          <h4>{{ benefit.title }}</h4>
          <p>{{ benefit.desc }}</p>
          <el-button
            v-if="benefit.action"
            :type="benefit.actionType || 'primary'"
            size="small"
            @click="benefit.action"
          >
            {{ benefit.actionLabel }}
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <!-- 对比表格：分站 vs 运营商 -->
    <h3 class="section-title">
      权益对比
    </h3>
    <el-card shadow="hover">
      <el-table
        :data="comparisonTable"
        stripe
        border
      >
        <el-table-column
          prop="benefit"
          label="权益项"
          width="200"
        />
        <el-table-column
          prop="station"
          label="分站站长"
          width="180"
        >
          <template #default="{ row }">
            <el-icon
              v-if="row.station"
              color="#67c23a"
            >
              <Check />
            </el-icon>
            <el-icon
              v-else
              color="#ccc"
            >
              <Close />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column
          prop="operator"
          label="运营商"
          width="180"
        >
          <template #default="{ row }">
            <el-icon
              v-if="row.operator"
              color="#67c23a"
            >
              <Check />
            </el-icon>
            <el-icon
              v-else
              color="#ccc"
            >
              <Close />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column
          prop="detail"
          label="详细说明"
        />
      </el-table>
    </el-card>

    <!-- 分站名额管理 + 团队管理 -->
    <el-row
      :gutter="16"
      class="detail-row"
    >
      <!-- 分站名额 -->
      <el-col :span="12">
        <el-card
          class="detail-card"
          shadow="hover"
        >
          <template #header>
            <div class="card-header">
              <el-icon><UserFilled /></el-icon>
              <span>分站名额管理</span>
              <el-tag
                type="warning"
                class="header-tag"
              >
                5个全返名额
              </el-tag>
            </div>
          </template>
          <div class="slot-info">
            <el-progress
              :percentage="slotUsagePercent"
              :stroke-width="12"
              :color="slotUsagePercent > 80 ? '#e6a23c' : '#8B4513'"
            />
            <p class="slot-desc">
              总名额 {{ operator.containQuota }}，已用 {{ operator.usedQuota || 0 }}，
              其中全返名额 {{ operator.fullRebateSlots || 5 }}，已用 {{ operator.usedRebateSlots || 0 }}
            </p>
          </div>
          <el-button
            type="primary"
            @click="showInviteStation = true"
          >
            邀请站长加入
          </el-button>
        </el-card>
      </el-col>

      <!-- 管理奖说明 -->
      <el-col :span="12">
        <el-card
          class="detail-card"
          shadow="hover"
        >
          <template #header>
            <div class="card-header">
              <el-icon><TrendCharts /></el-icon>
              <span>管理奖说明</span>
            </div>
          </template>
          <div class="mgmt-bonus">
            <p>名下站长每笔佣金，你获得 <strong>{{ mgmtBonusRate }}</strong> 的管理奖。</p>
            <el-table
              :data="mgmtBonusLevels"
              size="small"
            >
              <el-table-column
                prop="level"
                label="等级"
                width="100"
              />
              <el-table-column
                prop="rate"
                label="管理奖比例"
                width="120"
              />
              <el-table-column
                prop="slots"
                label="分站名额"
                width="100"
              />
            </el-table>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 名下站长列表 -->
    <h3 class="section-title">
      名下站长
    </h3>
    <el-card shadow="hover">
      <el-table
        v-loading="loading"
        :data="stations"
        stripe
        border
      >
        <el-table-column
          prop="name"
          label="分站名称"
          min-width="160"
        />
        <el-table-column
          prop="code"
          label="推广码"
          width="120"
        />
        <el-table-column
          prop="totalEarning"
          label="累计收益（元）"
          width="140"
        />
        <el-table-column
          prop="status"
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'warning'">
              {{ row.status === 'ACTIVE' ? '活跃' : '暂停' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="加入时间"
          width="180"
        >
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column
          label="本月佣金"
          width="120"
        >
          <template #default="{ row }">
            ¥{{ row.monthEarning || 0 }}
          </template>
        </el-table-column>
        <el-table-column
          label="管理奖"
          width="120"
        >
          <template #default="{ row }">
            ¥{{ row.mgmtBonus || 0 }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 收益明细 -->
    <h3 class="section-title">
      我的收益明细
    </h3>
    <el-card shadow="hover">
      <el-tabs v-model="earningTab">
        <el-tab-pane
          label="分享佣金"
          name="commission"
        />
        <el-tab-pane
          label="管理奖"
          name="mgmt"
        />
      </el-tabs>
      <el-table
        v-loading="loading"
        :data="filteredEarnings"
        stripe
      >
        <el-table-column
          prop="createdAt"
          label="时间"
          width="180"
        >
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column
          prop="type"
          label="类型"
          width="120"
        >
          <template #default="{ row }">
            {{ earningTypeMap[row.type] || row.type }}
          </template>
        </el-table-column>
        <el-table-column
          prop="sourceStationId"
          label="来源分站"
          width="160"
        >
          <template #default="{ row }">
            {{ row.sourceStationId ? (stationMap[row.sourceStationId] || row.sourceStationId) : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="amount"
          label="订单金额"
          width="120"
        />
        <el-table-column
          prop="rate"
          label="比例"
          width="80"
        >
          <template #default="{ row }">
            {{ (row.rate * 100).toFixed(1) }}%
          </template>
        </el-table-column>
        <el-table-column
          prop="earned"
          label="收益（元）"
          width="120"
        >
          <template #default="{ row }">
            <span class="earned-amount">¥{{ row.earned }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 赠送福利 -->
    <h3 class="section-title">
      运营商专属福利
    </h3>
    <el-card shadow="hover">
      <div class="gift-list">
        <div
          v-for="gift in operatorGifts"
          :key="gift.title"
          class="gift-item"
        >
          <el-image
            :src="gift.cover"
            style="width:100px;height:75px;border-radius:4px"
            fit="cover"
          >
            <template #error>
              <el-icon :size="40">
                <Reading />
              </el-icon>
            </template>
          </el-image>
          <div class="gift-info">
            <h4>{{ gift.title }}</h4>
            <p>{{ gift.desc }}</p>
            <el-button
              size="small"
              type="primary"
              link
            >
              立即学习
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 邀请站长弹窗 -->
    <el-dialog
      v-model="showInviteStation"
      title="邀请站长加入"
      width="450px"
    >
      <div class="invite-section">
        <p class="invite-desc">
          生成专属邀请链接，发送给想成为站长的人。对方通过此链接注册并开通分站后，自动归属到你名下。
        </p>
        <el-input
          v-model="inviteLink"
          readonly
        >
          <template #append>
            <el-button @click="copyInviteToClipboard">
              复制
            </el-button>
          </template>
        </el-input>
        <el-divider />
        <p class="invite-desc">
          或分享海报：
        </p>
        <div class="poster-preview">
          <el-image
            src=""
            style="width:200px;height:320px;background:#f0f0f0;border-radius:8px"
          >
            <template #error>
              <div class="poster-placeholder">
                <el-icon :size="40">
                  <Picture />
                </el-icon>
                <p>点击生成海报</p>
              </div>
            </template>
          </el-image>
        </div>
      </div>
      <template #footer>
        <el-button @click="showInviteStation = false">
          关闭
        </el-button>
        <el-button
          type="primary"
          @click="generatePoster"
        >
          生成海报
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑品牌弹窗 -->
    <el-dialog
      v-model="showProfileEdit"
      title="编辑品牌信息"
      width="500px"
    >
      <el-form
        :model="editForm"
        label-width="100px"
      >
        <el-form-item label="品牌名称">
          <el-input
            v-model="editForm.brandName"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="品牌Logo">
          <el-upload
            action="/api/v1/upload"
            :show-file-list="false"
            :on-success="onLogoUploaded"
          >
            <el-avatar
              :size="64"
              :src="editForm.brandLogo"
            />
            <el-button
              type="primary"
              link
            >
              更换
            </el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="主题色">
          <el-color-picker v-model="editForm.brandThemeColor" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showProfileEdit = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveProfile"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Share, Reading, Promotion,
  UserFilled, TrendCharts, Check, Close, Picture,
} from '@element-plus/icons-vue'
import { api } from '@/api'

const operator = reactive({
  id: '',
  brandName: '',
  brandLogo: '',
  brandThemeColor: '#8B4513',
  code: '',
  level: 'SILVER',
  totalEarning: 0,
  mgmtEarning: 0,
  containQuota: 0,
  usedQuota: 0,
  fullRebateSlots: 5,
  usedRebateSlots: 0,
  stationCount: 0,
  monthNewStations: 0,
})

const levelTagType = computed(() => {
  const map: Record<string, string> = { SILVER: '', GOLD: 'warning', DIAMOND: '', BLACK_GOLD: 'danger' }
  return map[operator.level] || ''
})

const slotUsagePercent = computed(() =>
  operator.containQuota ? Math.round((operator.usedQuota / operator.containQuota) * 100) : 0
)

const mgmtBonusRate = computed(() => {
  const map: Record<string, string> = { SILVER: '5%', GOLD: '8%', DIAMOND: '12%', BLACK_GOLD: '15%' }
  return map[operator.level] || '5%'
})

const mgmtBonusLevels = [
  { level: '白银', rate: '5%', slots: '10个' },
  { level: '黄金', rate: '8%', slots: '20个' },
  { level: '钻石', rate: '12%', slots: '40个' },
  { level: '黑金', rate: '15%', slots: '80个' },
]

// 权益列表
const operatorBenefits = [
  {
    title: '分站品牌定制',
    desc: '自定义品牌名称、Logo、主题色',
    icon: 'Promotion',
    action: () => showProfileEdit.value = true,
    actionType: 'primary',
    actionLabel: '去设置',
  },
  {
    title: '分享赚 · 自购省',
    desc: '推广得佣金 + 自购返佣金，同分站权益',
    icon: 'Share',
    action: copyInviteLink,
    actionType: 'success',
    actionLabel: '复制推广链接',
  },
  {
    title: '5个全返名额',
    desc: '赠送5个销售金额全返的分站推荐名额，名下站长销售你全返',
    icon: 'UserFilled',
    action: () => showInviteStation.value = true,
    actionType: 'warning',
    actionLabel: '邀请站长',
  },
  {
    title: '管理奖',
    desc: `名下站长佣金再分你${mgmtBonusRate.value}作为管理奖`,
    icon: 'TrendCharts',
  },
  {
    title: '专属福利',
    desc: '赠送国学视频课程 + 精装国学书籍',
    icon: 'Gift',
    actionType: 'warning',
    actionLabel: '查看福利',
  },
]

// 权益对比表
const comparisonTable = [
  { benefit: '自定义分站名称/Logo/主题色', station: true, operator: true, detail: '在分站首页顶部展示个性品牌' },
  { benefit: '分享赚佣金', station: true, operator: true, detail: '用户通过链接消费即获佣金' },
  { benefit: '自购省（自购返佣）', station: true, operator: true, detail: '自己购买站内付费内容同样返佣' },
  { benefit: '赠送国学视频课程', station: true, operator: true, detail: '入门级国学课程免费学习' },
  { benefit: '赠送精装国学书籍', station: true, operator: true, detail: '《周易》《道德经》《论语》等电子版' },
  { benefit: '分站推荐名额', station: false, operator: true, detail: '运营商独有：5个全返名额，可售卖或赠送' },
  { benefit: '管理奖', station: false, operator: true, detail: '运营商独有：名下站长佣金按比例提成' },
  { benefit: '团队管理后台', station: false, operator: true, detail: '运营商独有：查看名下所有站长数据' },
]

// 运营商专属礼物
const operatorGifts = [
  { title: '国学视频课程（全系列）', cover: '', desc: '含《易经》《八字》《风水》《紫微》等全部入门课程', id: 'all-video' },
  { title: '精装国学书籍（全套）', cover: '', desc: '经史子集经典精装电子版', id: 'all-books' },
]

// 加载状态
const loading = ref(false)
const earningTab = ref('commission')
const earnings = ref<any[]>([])
const stations = ref<any[]>([])
const stationMap = ref<Record<string, string>>({})

const earningTypeMap: Record<string, string> = {
  COURSE: '课程', PRODUCT: '商品', MEMBER: '会员', CIRCLE: '圈子',
  MGMT_BONUS: '管理奖',
}

const filteredEarnings = computed(() => {
  if (earningTab.value === 'mgmt') return earnings.value.filter((e: any) => e.source === 'MGMT_BONUS')
  return earnings.value.filter((e: any) => e.source !== 'MGMT_BONUS')
})

// 编辑
const showProfileEdit = ref(false)
const saving = ref(false)
const editForm = reactive({ brandName: '', brandLogo: '', brandThemeColor: '#8B4513' })

// 邀请站长
const showInviteStation = ref(false)
const inviteLink = ref('')

function copyInviteLink() {
  const link = `${window.location.origin}/s/${operator.code}`
  navigator.clipboard.writeText(link).then(() => ElMessage.success('邀请链接已复制！'))
}

function copyInviteToClipboard() {
  navigator.clipboard.writeText(inviteLink.value).then(() => ElMessage.success('已复制！'))
}

function generatePoster() {
  ElMessage.info('海报生成功能开发中')
}

function onLogoUploaded(res: any) {
  editForm.brandLogo = res.url
}

async function saveProfile() {
  saving.value = true
  try {
    await api.put('/station/operator/my', editForm)
    Object.assign(operator, editForm)
    showProfileEdit.value = false
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function fetchData() {
  loading.value = true
  try {
    const [opRes, earnRes, stationRes] = await Promise.all([
      api.get('/station/operator/my'),
      api.get('/station/operator/my/earnings', { params: { pageSize: 30 } }),
      api.get('/station/operator/my/stations'),
    ])
    const o = opRes.data
    Object.assign(operator, {
      id: o.id, brandName: o.brandName, brandLogo: o.brandLogo,
      brandThemeColor: o.brandThemeColor, code: o.user?.station?.code || o.code,
      level: o.level, totalEarning: o.totalEarning,
      containQuota: o.containQuota, usedQuota: o.usedQuota,
      stationCount: o._count?.stations || o.stationCount || 0,
    })
    Object.assign(editForm, {
      brandName: o.brandName, brandLogo: o.brandLogo, brandThemeColor: o.brandThemeColor,
    })
    inviteLink.value = `${window.location.origin}/register?ref=${operator.code}`
    earnings.value = earnRes.data?.list || earnRes.data || []
    const stList = stationRes.data?.list || stationRes.data || []
    stations.value = stList
    stList.forEach((s: any) => { stationMap.value[s.id] = s.name })
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.operator-dashboard { padding: 20px; max-width: 1200px; margin: 0 auto; }
.brand-card { margin-bottom: 20px; }
.brand-header { display: flex; justify-content: space-between; align-items: center; }
.brand-info { display: flex; align-items: center; gap: 16px; }
.brand-text h2 { margin: 0 0 8px 0; font-size: 20px; }
.brand-code { margin-left: 16px; color: var(--color-text-secondary); font-size: 13px; }
.brand-actions { display: flex; gap: 8px; }
.stats-row { margin-bottom: 24px; }
.stat-extra { font-size: 13px; color: var(--color-text-secondary); }
.section-title { margin: 24px 0 16px; font-size: 16px; color: #333; }
.benefit-card { text-align: center; cursor: pointer; transition: transform .2s; }
.benefit-card:hover { transform: translateY(-2px); }
.benefit-icon { margin: 12px 0; color: #8B4513; }
.benefit-card h4 { margin: 8px 0; }
.benefit-card p { color: #666; font-size: 13px; line-height: 1.6; }
.detail-row { margin-bottom: 24px; }
.detail-card .card-header { display: flex; align-items: center; gap: 6px; font-weight: 600; }
.header-tag { margin-left: auto; }
.slot-info { margin-bottom: 16px; }
.slot-desc { color: #666; font-size: 13px; margin-top: 8px; }
.mgmt-bonus p { color: #555; font-size: 13px; margin-bottom: 12px; }
.gift-list { display: flex; flex-direction: column; gap: 16px; }
.gift-item { display: flex; gap: 12px; align-items: center; }
.gift-info h4 { margin: 0 0 4px 0; font-size: 14px; }
.gift-info p { margin: 0 0 8px 0; color: #666; font-size: 13px; }
.earned-amount { color: #e6a23c; font-weight: 600; }
.invite-desc { color: #666; font-size: 13px; margin-bottom: 12px; }
.poster-preview { display: flex; justify-content: center; margin: 16px 0; }
.poster-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary); }
.poster-placeholder p { margin: 8px 0 0; }
</style>
