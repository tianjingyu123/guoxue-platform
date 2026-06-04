<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          非遗传承人认证
        </text>
        <view class="header-right" />
      </view>

      <!-- Tab -->
      <view class="tabs">
        <view
          class="tab"
          :class="{ active: activeTab === 'apply' }"
          @click="activeTab = 'apply'"
        >
          申请认证
        </view>
        <view
          class="tab"
          :class="{ active: activeTab === 'status' }"
          @click="activeTab = 'status'"
        >
          认证进度
        </view>
      </view>
    </view>

    <!-- 申请认证 -->
    <view
      v-if="activeTab === 'apply'"
      class="apply-content"
    >
      <!-- 说明卡片 -->
      <view class="intro-card">
        <view class="intro-icon-wrap">
          <text class="intro-icon">
            🏅
          </text>
        </view>
        <view class="intro-body">
          <text class="intro-title">
            非遗传承人认证
          </text>
          <text class="intro-desc">
            通过认证后，您将获得平台官方传承人标识，享受专属权益和流量扶持
          </text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="form-card">
        <text class="form-card-title">
          📋 基本信息
        </text>
        <view class="form-group">
          <text class="form-label">
            真实姓名 *
          </text>
          <input
            v-model="form.name"
            class="form-input"
            placeholder="请输入真实姓名"
          >
        </view>
        <view class="form-group">
          <text class="form-label">
            身份证号 *
          </text>
          <input
            v-model="form.idCard"
            class="form-input"
            placeholder="请输入身份证号"
          >
        </view>
        <view class="form-group">
          <text class="form-label">
            联系电话 *
          </text>
          <input
            v-model="form.phone"
            class="form-input"
            placeholder="请输入联系电话"
            type="tel"
          >
        </view>
      </view>

      <!-- 传承项目信息 -->
      <view class="form-card">
        <text class="form-card-title">
          📚 传承项目信息
        </text>
        <view class="form-group">
          <text class="form-label">
            传承项目名称 *
          </text>
          <input
            v-model="form.projectName"
            class="form-input"
            placeholder="如：苏绣、景德镇手工制瓷技艺"
          >
        </view>
        <view class="form-group">
          <text class="form-label">
            项目级别 *
          </text>
          <view class="level-grid">
            <view
              v-for="lv in projectLevels"
              :key="lv.value"
              class="level-btn"
              :class="{ active: form.projectLevel === lv.value }"
              @click="form.projectLevel = lv.value"
            >
              {{ lv.label }}
            </view>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">
            传承谱系 *
          </text>
          <textarea
            v-model="form.lineage"
            class="form-textarea"
            placeholder="请描述您的传承谱系，如：师承某某大师，为第几代传人"
            rows="3"
          />
        </view>
        <view class="form-group">
          <text class="form-label">
            技艺描述
          </text>
          <textarea
            v-model="form.skillDescription"
            class="form-textarea"
            placeholder="请详细描述您的技艺特点、创作风格等"
            rows="4"
          />
        </view>
        <view class="form-group">
          <text class="form-label">
            从业经历
          </text>
          <textarea
            v-model="form.experience"
            class="form-textarea"
            placeholder="请描述您的从业年限、获得的荣誉等"
            rows="3"
          />
        </view>
      </view>

      <!-- 资质证书上传 -->
      <view class="form-card">
        <text class="form-card-title">
          📄 资质证书
          <text class="form-card-sub">
            （最多5张）
          </text>
        </text>
        <text class="upload-desc">
          请上传传承人证书、获奖证书、相关资质证明等
        </text>
        <view class="upload-grid three-cols">
          <view
            v-for="(url, idx) in certificates"
            :key="idx"
            class="upload-item"
          >
            <image
              :src="url"
              class="upload-img"
              mode="aspectFill"
            />
            <text
              class="upload-remove"
              @click="removeCert(idx)"
            >
              ✕
            </text>
          </view>
          <view
            v-if="certificates.length < 5"
            class="upload-add"
            @click="uploadCert"
          >
            <text class="upload-add-icon">
              📷
            </text>
            <text class="upload-add-text">
              上传证书
            </text>
          </view>
        </view>
      </view>

      <!-- 代表作品上传 -->
      <view class="form-card">
        <text class="form-card-title">
          📤 代表作品
          <text class="form-card-sub">
            （最多9张）
          </text>
        </text>
        <text class="upload-desc">
          请上传您的代表作品照片，展示您的技艺水平
        </text>
        <view class="upload-grid three-cols">
          <view
            v-for="(url, idx) in works"
            :key="idx"
            class="upload-item"
          >
            <image
              :src="url"
              class="upload-img"
              mode="aspectFill"
            />
            <text
              class="upload-remove"
              @click="removeWork(idx)"
            >
              ✕
            </text>
          </view>
          <view
            v-if="works.length < 9"
            class="upload-add"
            @click="uploadWork"
          >
            <text class="upload-add-icon">
              📷
            </text>
            <text class="upload-add-text">
              上传作品
            </text>
          </view>
        </view>
      </view>

      <!-- 认证权益 -->
      <view class="benefits-card">
        <text class="form-card-title">
          认证后您将获得
        </text>
        <view class="benefits-grid">
          <view
            v-for="b in benefits"
            :key="b.text"
            class="benefit-item"
          >
            <text class="benefit-icon">
              {{ b.icon }}
            </text>
            <text class="benefit-text">
              {{ b.text }}
            </text>
          </view>
        </view>
      </view>

      <!-- 底部提交 -->
      <view class="bottom-bar">
        <view
          class="btn-submit"
          :class="{ disabled: !isFormValid || submitting }"
          @click="handleSubmit"
        >
          {{ submitting ? '提交中...' : '提交认证申请' }}
        </view>
        <text class="submit-tip">
          提交即表示您同意《非遗传承人认证协议》
        </text>
      </view>
      <view class="bottom-spacer" />
    </view>

    <!-- 认证进度 -->
    <view
      v-if="activeTab === 'status'"
      class="status-content"
    >
      <DataState
        :is-loading="false"
        :is-empty="verifyStatus.status === 'none'"
        empty-icon="📄"
        empty-title="暂无认证记录"
        empty-description="还没有提交过认证申请"
        empty-action-text="立即申请认证"
        :empty-show-action="true"
        @empty-action="activeTab = 'apply'"
      >
        <!-- 状态卡片 -->
        <view
          class="status-card"
          :class="'sc-' + verifyStatus.status"
        >
          <view class="status-card-icon-wrap">
            <text class="status-card-icon">
              {{ statusIcon }}
            </text>
          </view>
          <view class="status-card-body">
            <text class="status-card-title">
              {{ statusTitle }}
            </text>
            <text class="status-card-desc">
              {{ statusDesc }}
            </text>
          </view>
          <view
            v-if="verifyStatus.status === 'approved'"
            class="status-card-footer"
          >
            <view class="status-card-row">
              <text class="status-card-row-label">
                证书编号
              </text>
              <text class="status-card-row-value">
                {{ verifyStatus.certificateNo }}
              </text>
            </view>
            <view class="status-card-row">
              <text class="status-card-row-label">
                认证时间
              </text>
              <text class="status-card-row-value">
                {{ verifyStatus.verifiedAt }}
              </text>
            </view>
          </view>
        </view>

        <!-- 审核进度 -->
        <view
          v-if="verifyStatus.status === 'pending'"
          class="progress-card"
        >
          <text class="section-title">
            审核进度
          </text>
          <view
            v-for="(s, idx) in progressSteps"
            :key="idx"
            class="progress-step"
          >
            <view
              class="progress-dot"
              :class="{ done: s.done }"
            >
              <text
                v-if="s.done"
                class="progress-dot-check"
              >
                ✓
              </text>
              <text v-else>
                {{ idx + 1 }}
              </text>
            </view>
            <view class="progress-info">
              <text
                class="progress-step-label"
                :class="{ done: s.done }"
              >
                {{ s.step }}
              </text>
              <text
                v-if="s.time"
                class="progress-step-time"
              >
                {{ s.time }}
              </text>
            </view>
          </view>
        </view>

        <!-- 认证标识预览 -->
        <view
          v-if="verifyStatus.status === 'approved'"
          class="badge-preview-card"
        >
          <text class="section-title">
            您的认证标识
          </text>
          <view class="badge-preview">
            <view class="badge-icon-wrap">
              <text class="badge-icon">
                🏅
              </text>
            </view>
            <view>
              <view class="badge-name-row">
                <text class="badge-name">
                  非遗传承人
                </text>
                <text class="badge-tag">
                  官方认证
                </text>
              </view>
              <text class="badge-project">
                {{ form.projectName }} · {{ levelName }}
              </text>
            </view>
          </view>
        </view>

        <!-- 重新申请 -->
        <view
          v-if="verifyStatus.status === 'rejected'"
          class="btn-reapply"
          @click="activeTab = 'apply'"
        >
          重新提交申请
        </view>
      </DataState>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataState from '../../components/DataState.vue'

const activeTab = ref<'apply' | 'status'>('apply')
const submitting = ref(false)
const verifyStatus = ref({
  status: 'none' as 'none' | 'pending' | 'approved' | 'rejected',
  submittedAt: '',
  reviewedAt: '',
  rejectReason: '',
  certificateNo: 'HERT-2026-001',
  verifiedAt: '2026-01-15',
})

const form = ref({
  name: '',
  idCard: '',
  phone: '',
  projectName: '',
  projectLevel: '',
  lineage: '',
  skillDescription: '',
  experience: '',
})

const certificates = ref<string[]>([])
const works = ref<string[]>([])

const projectLevels = [
  { value: 'national', label: '国家级' },
  { value: 'provincial', label: '省级' },
  { value: 'municipal', label: '市级' },
  { value: 'county', label: '县级' },
]

const benefits = [
  { icon: '🏅', text: '官方传承人标识' },
  { icon: '📈', text: '专属流量扶持' },
  { icon: '🎓', text: '开设付费课程' },
  { icon: '🛒', text: '开设非遗商城' },
  { icon: '📺', text: '直播带货权限' },
  { icon: '💰', text: '平台补贴政策' },
]

const progressSteps = computed(() => [
  { step: '提交申请', done: true, time: verifyStatus.value.submittedAt },
  { step: '资料审核', done: false, time: null },
  { step: '认证完成', done: false, time: null },
])

const isFormValid = computed(() =>
  form.value.name && form.value.idCard && form.value.phone &&
  form.value.projectName && form.value.projectLevel && form.value.lineage &&
  certificates.value.length > 0
)

const statusIcon = computed(() => {
  const map: Record<string, string> = { pending: '⏳', approved: '✅', rejected: '❌' }
  return map[verifyStatus.value.status] || '❓'
})

const statusTitle = computed(() => {
  const map: Record<string, string> = { pending: '认证审核中', approved: '认证已通过', rejected: '认证未通过' }
  return map[verifyStatus.value.status] || ''
})

const statusDesc = computed(() => {
  const map: Record<string, string> = {
    pending: '预计3-5个工作日完成审核',
    approved: '恭喜您成为平台认证非遗传承人',
    rejected: verifyStatus.value.rejectReason,
  }
  return map[verifyStatus.value.status] || ''
})

const levelName = computed(() => {
  const lv = projectLevels.find((l) => l.value === form.value.projectLevel)
  return lv ? lv.label : ''
})

function uploadCert() {
  if (certificates.value.length >= 5) return
  uni.chooseImage({ count: 1, success: (res) => {
    certificates.value.push(res.tempFilePaths[0])
  }})
}

function uploadWork() {
  if (works.value.length >= 9) return
  uni.chooseImage({ count: 1, success: (res) => {
    works.value.push(res.tempFilePaths[0])
  }})
}

function removeCert(idx: number) {
  certificates.value.splice(idx, 1)
}

function removeWork(idx: number) {
  works.value.splice(idx, 1)
}

async function handleSubmit() {
  if (!isFormValid.value) return
  submitting.value = true
  await new Promise((r) => setTimeout(r, 2000))
  submitting.value = false
  verifyStatus.value.status = 'pending'
  verifyStatus.value.submittedAt = '2026-06-04 14:30'
  activeTab.value = 'status'
  uni.showToast({ title: '认证申请已提交', icon: 'success' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-right { width: 80rpx; }

.tabs { display: flex; border-top: 1rpx solid #E8E3DB; }
.tab { flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #666; border-bottom: 3rpx solid transparent; }
.tab.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 500; }

.apply-content { padding: 24rpx; padding-bottom: 160rpx; }

.intro-card { display: flex; gap: 16rpx; background: linear-gradient(135deg, #FFF8E1, #FFF3E0); border: 1rpx solid #FFE082; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; }
.intro-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 50%; background: #FFE082; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.intro-icon { font-size: 32rpx; }
.intro-body { flex: 1; }
.intro-title { font-size: 26rpx; font-weight: 600; color: #E65100; display: block; }
.intro-desc { font-size: 22rpx; color: #BF360C; margin-top: 6rpx; line-height: 1.5; display: block; }

.form-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.form-card-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.form-card-sub { font-size: 20rpx; color: #999; font-weight: 400; }
.form-group { margin-bottom: 20rpx; }
.form-label { font-size: 22rpx; color: #666; display: block; margin-bottom: 8rpx; }
.form-input { width: 100%; height: 80rpx; padding: 0 24rpx; background: #FAF8F5; border-radius: 16rpx; border: 1rpx solid #E8E3D7; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; }
.form-textarea { width: 100%; padding: 20rpx 24rpx; background: #FAF8F5; border-radius: 16rpx; border: 1rpx solid #E8E3D7; font-size: 24rpx; color: #2C2C2C; box-sizing: border-box; line-height: 1.5; }

.level-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12rpx; }
.level-btn { height: 72rpx; border-radius: 14rpx; background: #F5F0E8; color: #666; font-size: 24rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.level-btn.active { background: #C41E3A; color: #fff; }

.upload-desc { font-size: 22rpx; color: #999; display: block; margin-bottom: 16rpx; }
.upload-grid { display: grid; gap: 12rpx; }
.upload-grid.three-cols { grid-template-columns: 1fr 1fr 1fr; }
.upload-item { position: relative; aspect-ratio: 4/3; border-radius: 12rpx; overflow: hidden; background: #F5F0E8; }
.upload-img { width: 100%; height: 100%; }
.upload-remove { position: absolute; top: 8rpx; right: 8rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,0.5); color: #fff; font-size: 20rpx; display: flex; align-items: center; justify-content: center; }
.upload-add { aspect-ratio: 4/3; border-radius: 12rpx; border: 2rpx dashed #D0C8B8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; color: #B8B0A4; }
.upload-add-icon { font-size: 40rpx; }
.upload-add-text { font-size: 20rpx; }

.benefits-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; }
.benefits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.benefit-item { display: flex; align-items: center; gap: 12rpx; padding: 20rpx; background: #FAF8F5; border-radius: 14rpx; }
.benefit-icon { font-size: 32rpx; }
.benefit-text { font-size: 24rpx; color: #2C2C2C; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; background: #F5F0E8; border-top: 1rpx solid #E8E3DB; }
.btn-submit { width: 100%; height: 88rpx; border-radius: 44rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; }
.btn-submit.disabled { opacity: 0.5; }
.submit-tip { font-size: 20rpx; color: #999; text-align: center; display: block; margin-top: 12rpx; }
.bottom-spacer { height: 160rpx; }

/* 认证进度 */
.status-content { padding: 24rpx; }
.section-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }

.status-card { border-radius: 20rpx; padding: 32rpx; margin-bottom: 24rpx; display: flex; flex-direction: column; align-items: center; text-align: center; }
.status-card.sc-pending { background: linear-gradient(135deg, #FFF8E1, #FFFDE7); border: 1rpx solid #FFE082; }
.status-card.sc-approved { background: linear-gradient(135deg, #E8F5E9, #F1F8E9); border: 1rpx solid #A5D6A7; }
.status-card.sc-rejected { background: linear-gradient(135deg, #FFEBEE, #FFF5F5); border: 1rpx solid #EF9A9A; }
.status-card-icon-wrap { width: 112rpx; height: 112rpx; border-radius: 50%; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.status-card-icon { font-size: 56rpx; }
.status-card-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; }
.status-card-desc { font-size: 22rpx; color: #666; margin-top: 6rpx; display: block; }
.status-card-footer { width: 100%; margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid rgba(0,0,0,0.08); }
.status-card-row { display: flex; justify-content: space-between; padding: 8rpx 0; }
.status-card-row-label { font-size: 22rpx; color: #666; }
.status-card-row-value { font-size: 22rpx; color: #2C2C2C; font-weight: 500; }

.progress-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; }
.progress-step { display: flex; align-items: flex-start; gap: 16rpx; margin-bottom: 24rpx; }
.progress-step:last-child { margin-bottom: 0; }
.progress-dot { width: 48rpx; height: 48rpx; border-radius: 50%; background: #E8E3DB; color: #999; font-size: 22rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.progress-dot.done { background: #22C55E; color: #fff; }
.progress-dot-check { font-size: 24rpx; }
.progress-info { flex: 1; }
.progress-step-label { font-size: 24rpx; color: #999; display: block; }
.progress-step-label.done { color: #2C2C2C; font-weight: 500; }
.progress-step-time { font-size: 20rpx; color: #B8B0A4; margin-top: 4rpx; display: block; }

.badge-preview-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; }
.badge-preview { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; background: linear-gradient(135deg, #FFF8E1, #FFF3E0); border-radius: 16rpx; border: 1rpx solid #FFE082; }
.badge-icon-wrap { width: 88rpx; height: 88rpx; border-radius: 50%; background: linear-gradient(135deg, #FFB300, #FF6F00); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.badge-icon { font-size: 40rpx; }
.badge-name-row { display: flex; align-items: center; gap: 8rpx; }
.badge-name { font-size: 28rpx; font-weight: 600; color: #E65100; }
.badge-tag { font-size: 18rpx; padding: 2rpx 12rpx; background: #FFE082; color: #E65100; border-radius: 16rpx; }
.badge-project { font-size: 22rpx; color: #BF360C; margin-top: 4rpx; display: block; }

.btn-reapply { width: 100%; height: 88rpx; border-radius: 44rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; }
</style>
