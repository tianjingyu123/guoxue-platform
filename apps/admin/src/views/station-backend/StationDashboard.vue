<template>
  <div class="station-dashboard">
    <!-- 顶部品牌卡片 -->
    <el-card
      class="brand-card"
      shadow="hover"
    >
      <div class="brand-header">
        <div class="brand-info">
          <el-avatar
            :size="64"
            :src="station.logo"
          />
          <div class="brand-text">
            <h2>{{ station.name || '我的分站' }}</h2>
            <el-tag :type="station.status === 'ACTIVE' ? 'success' : 'warning'">
              {{ station.status === 'ACTIVE' ? '运营中' : '待审核' }}
            </el-tag>
            <span class="brand-code">推广码：{{ station.code }}</span>
          </div>
        </div>
        <div class="brand-actions">
          <el-button
            type="primary"
            @click="showProfileEdit = true"
          >
            编辑分站信息
          </el-button>
          <el-button @click="copyShareLink">
            复制推广链接
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 核心数据 -->
    <el-row
      :gutter="16"
      class="stats-row"
    >
      <el-col :span="6">
        <el-statistic
          title="累计收益（元）"
          :value="station.totalEarning"
          :precision="2"
        />
      </el-col>
      <el-col :span="6">
        <el-statistic
          title="锁定用户数"
          :value="station.lockedUsers || 0"
        />
      </el-col>
      <el-col :span="6">
        <el-statistic
          title="本月订单"
          :value="station.monthOrders || 0"
        />
      </el-col>
      <el-col :span="6">
        <el-statistic
          title="本月佣金（元）"
          :value="station.monthEarning || 0"
          :precision="2"
        />
      </el-col>
    </el-row>

    <!-- 权益卡片 -->
    <h3 class="section-title">
      我的权益
    </h3>
    <el-row :gutter="16">
      <el-col
        v-for="benefit in stationBenefits"
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

    <!-- 专属权益详情 -->
    <el-row
      :gutter="16"
      class="detail-row"
    >
      <!-- 分享赚 / 自购省 -->
      <el-col :span="12">
        <el-card
          class="detail-card"
          shadow="hover"
        >
          <template #header>
            <div class="card-header">
              <el-icon><Share /></el-icon>
              <span>分享赚 · 自购省</span>
            </div>
          </template>
          <div class="commission-rules">
            <div class="rule-item">
              <el-tag type="success">
                分享赚
              </el-tag>
              <span>通过分享链接或他人主动进入分站，购买站内付费服务、会员权益、商品及课程，购买成功即获佣金</span>
            </div>
            <div class="rule-item">
              <el-tag type="warning">
                自购省
              </el-tag>
              <span>自己购买站内排盘、会员权益、商品及课程，购买成功即获佣金返还</span>
            </div>
          </div>
          <el-table
            :data="commissionRates"
            size="small"
            class="rate-table"
          >
            <el-table-column
              prop="type"
              label="消费类型"
              width="120"
            />
            <el-table-column
              prop="rate"
              label="佣金比例"
              width="100"
            />
            <el-table-column
              prop="desc"
              label="说明"
            />
          </el-table>
        </el-card>
      </el-col>

      <!-- 赠送福利 -->
      <el-col :span="12">
        <el-card
          class="detail-card"
          shadow="hover"
        >
          <template #header>
            <div class="card-header">
              <el-icon><Present /></el-icon>
              <span>站长专属福利</span>
            </div>
          </template>
          <div class="gift-list">
            <div
              v-for="gift in freeGifts"
              :key="gift.title"
              class="gift-item"
            >
              <el-image
                :src="gift.cover"
                style="width:80px;height:60px;border-radius:4px"
                fit="cover"
              />
              <div class="gift-info">
                <h4>{{ gift.title }}</h4>
                <p>{{ gift.desc }}</p>
                <el-button
                  size="small"
                  type="primary"
                  link
                  @click="viewGift(gift)"
                >
                  查看详情
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 收益明细 -->
    <h3 class="section-title">
      收益明细
    </h3>
    <el-card shadow="hover">
      <el-table
        v-loading="loading"
        :data="earnings"
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
            <el-tag>{{ earningTypeMap[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="orderId"
          label="订单号"
          width="200"
        />
        <el-table-column
          prop="amount"
          label="订单金额（元）"
          width="120"
        />
        <el-table-column
          prop="rate"
          label="佣金比例"
          width="100"
        >
          <template #default="{ row }">
            {{ (row.rate * 100).toFixed(1) }}%
          </template>
        </el-table-column>
        <el-table-column
          prop="earned"
          label="佣金（元）"
          width="120"
        >
          <template #default="{ row }">
            <span class="earned-amount">¥{{ row.earned }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑分站弹窗 -->
    <el-dialog
      v-model="showProfileEdit"
      title="编辑分站信息"
      width="500px"
    >
      <el-form
        :model="editForm"
        label-width="100px"
      >
        <el-form-item label="分站名称">
          <el-input
            v-model="editForm.name"
            placeholder="如：青云国学小站"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="分站Logo">
          <el-upload
            action="/api/v1/upload"
            :show-file-list="false"
            :on-success="onLogoUploaded"
          >
            <el-avatar
              :size="64"
              :src="editForm.logo"
            />
            <el-button
              type="primary"
              link
            >
              更换Logo
            </el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="主题色">
          <el-color-picker v-model="editForm.themeColor" />
        </el-form-item>
        <el-form-item label="分站介绍">
          <el-input
            v-model="editForm.intro"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Share, Present, Coin, VideoCamera, Reading, Promotion } from '@element-plus/icons-vue'
import { api } from '@/api'

// 分站信息
const station = reactive({
  id: '',
  name: '',
  code: '',
  logo: '',
  themeColor: '#8B4513',
  intro: '',
  status: 'ACTIVE',
  totalEarning: 0,
  lockedUsers: 0,
  monthOrders: 0,
  monthEarning: 0,
})

// 权益列表
const stationBenefits = [
  {
    title: '分站品牌定制',
    desc: '自定义分站名称、Logo、主题色，让用户识别你的品牌',
    icon: 'Promotion',
    action: () => showProfileEdit.value = true,
    actionType: 'primary',
    actionLabel: '去设置',
  },
  {
    title: '分享赚',
    desc: '用户通过你的链接消费，佣金归你。终身绑定，持续收益',
    icon: 'Share',
    action: copyShareLink,
    actionType: 'success',
    actionLabel: '复制推广链接',
  },
  {
    title: '自购省',
    desc: '自己购买排盘、课程、商品均获佣金返还',
    icon: 'Coin',
  },
  {
    title: '专属福利',
    desc: '赠送国学视频课程 + 精装国学书籍',
    icon: 'Gift',
    action: () => scrollToGifts(),
    actionType: 'warning',
    actionLabel: '查看福利',
  },
]

// 佣金比例
const commissionRates = [
  { type: '付费圈子入圈', rate: '20%', desc: '用户通过你的链接付费入圈' },
  { type: '课程购买', rate: '15%', desc: '站内所有付费课程' },
  { type: '会员购买', rate: '15%', desc: '月卡/年卡/终身会员' },
  { type: '商品购买', rate: '10%', desc: '商城所有实物/虚拟商品' },
  { type: '排盘付费', rate: '10%', desc: '排盘工具付费解锁' },
  { type: '自购返佣', rate: '同分享赚', desc: '自己购买同样获得佣金返还' },
]

// 赠送福利
const freeGifts = [
  { title: '国学视频课程', cover: '', desc: '《易经入门》《八字基础》《风水概论》等全套入门课程免费学', id: 'video-courses' },
  { title: '精装国学书籍', cover: '', desc: '《周易》《道德经》《论语》精装电子版', id: 'books' },
]

// 收益明细
const loading = ref(false)
const earnings = ref<any[]>([])
const earningTypeMap: Record<string, string> = {
  COURSE: '课程',
  PRODUCT: '商品',
  MEMBER: '会员',
  CIRCLE: '圈子',
  BOT: 'Bot',
}

// 编辑
const showProfileEdit = ref(false)
const saving = ref(false)
const editForm = reactive({ name: '', logo: '', themeColor: '#8B4513', intro: '' })

function copyShareLink() {
  const link = `${window.location.origin}/s/${station.code}`
  navigator.clipboard.writeText(link).then(() => {
    ElMessage.success('推广链接已复制！')
  })
}

function scrollToGifts() {
  document.querySelector('.gift-list')?.scrollIntoView({ behavior: 'smooth' })
}

function viewGift(gift: any) {
  ElMessage.info(`${gift.title}：${gift.desc}`)
}

function onLogoUploaded(res: any) {
  editForm.logo = res.url
}

async function saveProfile() {
  saving.value = true
  try {
    await api.put('/station/my', editForm)
    Object.assign(station, editForm)
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
    const [stationRes, earningRes] = await Promise.all([
      api.get('/station/my'),
      api.get('/station/my/earnings', { params: { pageSize: 20 } }),
    ])
    const s = stationRes.data
    Object.assign(station, {
      id: s.id, name: s.name, code: s.code, logo: s.logo,
      themeColor: s.themeColor, intro: s.intro, status: s.status,
      totalEarning: s.totalEarning, lockedUsers: s.lockedUsers || 0,
      monthOrders: s.monthOrders || 0, monthEarning: s.monthEarning || 0,
    })
    Object.assign(editForm, {
      name: s.name, logo: s.logo, themeColor: s.themeColor, intro: s.intro,
    })
    earnings.value = earningRes.data?.list || earningRes.data || []
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.station-dashboard { padding: 20px; max-width: 1200px; margin: 0 auto; }
.brand-card { margin-bottom: 20px; }
.brand-header { display: flex; justify-content: space-between; align-items: center; }
.brand-info { display: flex; align-items: center; gap: 16px; }
.brand-text h2 { margin: 0 0 8px 0; font-size: 20px; }
.brand-code { margin-left: 16px; color: #999; font-size: 13px; }
.brand-actions { display: flex; gap: 8px; }
.stats-row { margin-bottom: 24px; }
.section-title { margin: 24px 0 16px; font-size: 16px; color: #333; }
.benefit-card { text-align: center; cursor: pointer; transition: transform .2s; }
.benefit-card:hover { transform: translateY(-2px); }
.benefit-icon { margin: 12px 0; color: #8B4513; }
.benefit-card h4 { margin: 8px 0; }
.benefit-card p { color: #666; font-size: 13px; line-height: 1.6; }
.detail-row { margin-bottom: 24px; }
.detail-card .card-header { display: flex; align-items: center; gap: 6px; font-weight: 600; }
.commission-rules { margin-bottom: 16px; }
.rule-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; font-size: 13px; color: #555; line-height: 1.6; }
.rule-item .el-tag { flex-shrink: 0; margin-top: 2px; }
.rate-table { margin-top: 12px; }
.gift-list { display: flex; flex-direction: column; gap: 16px; }
.gift-item { display: flex; gap: 12px; align-items: center; }
.gift-info h4 { margin: 0 0 4px 0; font-size: 14px; }
.gift-info p { margin: 0 0 8px 0; color: #666; font-size: 13px; }
.earned-amount { color: #e6a23c; font-weight: 600; }
</style>
