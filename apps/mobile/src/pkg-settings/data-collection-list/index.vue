<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="navbar-inner">
        <view class="navbar-left">
          <view class="back-btn" @tap="goBack">
            <app-icon name="chevron-left" :size="24" color="#2c2c2c" />
          </view>
          <text class="navbar-title">个人信息收集清单</text>
        </view>
        <view class="manage-btn" @tap="goPrivacy">
          <app-icon name="settings" :size="16" color="#2c2c2c" />
          <text class="manage-btn-text">管理授权</text>
        </view>
      </view>
    </view>

    <view class="body">
      <!-- 说明卡片 -->
      <view class="intro-card">
        <view class="intro-row">
          <app-icon name="shield" :size="20" color="#2563eb" class="intro-icon" />
          <view class="intro-content">
            <text class="intro-text">根据《个人信息保护法》第17条规定，我们向您明示收集的个人信息清单。您可以随时在「设置-隐私」中管理您的授权。</text>
            <view class="intro-stats">
              <text class="intro-stat">共 {{ totalFields }} 项信息</text>
              <text class="intro-stat">必需 {{ requiredFields }} 项</text>
              <text class="intro-stat">可选 {{ totalFields - requiredFields }} 项</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 展开/收起 -->
      <view class="toggle-row">
        <text class="toggle-link" @tap="expandAll">全部展开</text>
        <text class="toggle-sep">|</text>
        <text class="toggle-link" @tap="collapseAll">全部收起</text>
      </view>

      <!-- 分组列表 -->
      <view class="category-list">
        <view v-for="category in dataCategories" :key="category.id" class="category-card">
          <!-- 分组头部 -->
          <view class="category-head" @tap="toggleCategory(category.id)">
            <view class="category-head-left">
              <view class="category-icon">
                <app-icon :name="category.icon" :size="20" color="#c41e3a" />
              </view>
              <view class="category-head-text">
                <view class="category-name-row">
                  <text class="category-name">{{ category.name }}</text>
                  <text class="category-count">{{ category.fields.length }}项</text>
                </view>
                <text class="category-desc">{{ category.description }}</text>
              </view>
            </view>
            <view class="category-head-right">
              <text v-if="category.canManage" class="badge-manage">可管理</text>
              <app-icon :name="isExpanded(category.id) ? 'chevron-up' : 'chevron-down'" :size="20" color="#999999" />
            </view>
          </view>

          <!-- 字段列表 -->
          <view v-if="isExpanded(category.id)" class="field-list">
            <view
              v-for="(field, index) in category.fields"
              :key="field.name"
              class="field-item"
              :class="{ 'field-item-border': index !== category.fields.length - 1 }"
            >
              <view class="field-row">
                <view class="field-main">
                  <view class="field-name-row">
                    <text class="field-name">{{ field.name }}</text>
                    <text v-if="field.isRequired" class="badge-required">必需</text>
                    <text v-else class="badge-optional">可选</text>
                  </view>
                  <text class="field-purpose">{{ field.purpose }}</text>
                </view>
                <text v-if="field.legalBasis" class="field-basis">{{ field.legalBasis }}</text>
              </view>
            </view>

            <!-- 管理授权入口 -->
            <view v-if="category.canManage" class="field-manage">
              <view class="field-manage-btn" @tap="goPrivacy">
                <text class="field-manage-text">管理此类信息的授权</text>
                <app-icon name="external-link" :size="12" color="#c41e3a" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 图例说明 -->
      <view class="legend-card">
        <text class="legend-title">标签说明</text>
        <view class="legend-grid">
          <view class="legend-item">
            <text class="badge-required">必需</text>
            <text class="legend-desc">提供基本服务所必需</text>
          </view>
          <view class="legend-item">
            <text class="badge-optional">可选</text>
            <text class="legend-desc">可拒绝，不影响基本功能</text>
          </view>
          <view class="legend-item">
            <text class="badge-manage">可管理</text>
            <text class="legend-desc">可在设置中开启/关闭</text>
          </view>
        </view>
      </view>

      <!-- 法律依据说明 -->
      <view class="legend-card">
        <text class="legend-title">处理依据说明</text>
        <view class="basis-list">
          <view class="basis-item">
            <text class="basis-label">合同履行</text>
            <text class="basis-text">为履行与您签订的用户协议所必需</text>
          </view>
          <view class="basis-item">
            <text class="basis-label">同意</text>
            <text class="basis-text">基于您的明示同意收集，可随时撤回</text>
          </view>
          <view class="basis-item">
            <text class="basis-label">合法利益</text>
            <text class="basis-text">为维护平台安全、优化服务所必需</text>
          </view>
          <view class="basis-item">
            <text class="basis-label">法律义务</text>
            <text class="basis-text">为履行法定义务所必需</text>
          </view>
        </view>
      </view>

      <!-- 联系方式 -->
      <view class="contact">
        <text class="contact-tip">如有疑问，请联系我们</text>
        <text class="contact-email" @tap="contactEmail">privacy@rebu.com</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="footer">
      <view class="footer-btn" @tap="goPrivacy">
        <text class="footer-btn-text">管理我的授权</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { goBack, navigateTo } from '@/utils/router'

interface DataField {
  name: string
  purpose: string
  isRequired: boolean
  legalBasis?: string
}

interface DataCategory {
  id: string
  name: string
  icon: string
  description: string
  fields: DataField[]
  canManage: boolean
}

const dataCategories: DataCategory[] = [
  {
    id: 'account',
    name: '账号信息',
    icon: 'user',
    description: '用于创建和维护您的账户',
    canManage: false,
    fields: [
      { name: '手机号码', purpose: '账号注册、登录验证、找回密码', isRequired: true, legalBasis: '合同履行' },
      { name: '用户昵称', purpose: '展示身份、社区互动', isRequired: true, legalBasis: '合同履行' },
      { name: '头像', purpose: '个人形象展示', isRequired: false, legalBasis: '同意' },
      { name: '性别', purpose: '个性化推荐、社区功能', isRequired: false, legalBasis: '同意' },
      { name: '出生日期', purpose: '命理服务、年龄验证', isRequired: false, legalBasis: '同意' },
      { name: '出生时辰', purpose: '命理排盘服务', isRequired: false, legalBasis: '同意' },
      { name: '出生地点', purpose: '命理排盘服务（时区计算）', isRequired: false, legalBasis: '同意' },
      { name: '邮箱地址', purpose: '重要通知、找回密码', isRequired: false, legalBasis: '同意' },
    ],
  },
  {
    id: 'location',
    name: '位置信息',
    icon: 'map-pin',
    description: '用于附近功能和位置服务',
    canManage: true,
    fields: [
      { name: '精确位置', purpose: '附近的人/驿站、同城发现', isRequired: false, legalBasis: '同意' },
      { name: '城市信息', purpose: '本地化内容推荐、活动筛选', isRequired: false, legalBasis: '同意' },
      { name: 'IP地址', purpose: '安全防护、区域服务', isRequired: true, legalBasis: '合法利益' },
    ],
  },
  {
    id: 'device',
    name: '设备信息',
    icon: 'smartphone',
    description: '用于安全防护和服务优化',
    canManage: false,
    fields: [
      { name: '设备型号', purpose: '界面适配、问题排查', isRequired: true, legalBasis: '合法利益' },
      { name: '操作系统版本', purpose: '兼容性保障、功能适配', isRequired: true, legalBasis: '合法利益' },
      { name: '设备标识符', purpose: '账号安全、防欺诈', isRequired: true, legalBasis: '合法利益' },
      { name: '网络类型', purpose: '服务质量优化', isRequired: true, legalBasis: '合法利益' },
      { name: '应用版本', purpose: '功能更新、问题排查', isRequired: true, legalBasis: '合法利益' },
    ],
  },
  {
    id: 'behavior',
    name: '行为记录',
    icon: 'activity',
    description: '用于改善产品体验和个性化推荐',
    canManage: true,
    fields: [
      { name: '浏览历史', purpose: '个性化内容推荐', isRequired: false, legalBasis: '同意' },
      { name: '搜索记录', purpose: '搜索建议、历史记录', isRequired: false, legalBasis: '同意' },
      { name: '点击行为', purpose: '产品体验优化', isRequired: false, legalBasis: '合法利益' },
      { name: '学习进度', purpose: '课程续学、学习统计', isRequired: false, legalBasis: '合同履行' },
      { name: '收藏/关注', purpose: '内容聚合、更新提醒', isRequired: false, legalBasis: '合同履行' },
    ],
  },
  {
    id: 'transaction',
    name: '交易记录',
    icon: 'credit-card',
    description: '用于订单处理和售后服务',
    canManage: false,
    fields: [
      { name: '订单信息', purpose: '交易记录、售后服务', isRequired: true, legalBasis: '合同履行' },
      { name: '支付记录', purpose: '支付完成、退款处理', isRequired: true, legalBasis: '合同履行' },
      { name: '发票信息', purpose: '开具发票', isRequired: false, legalBasis: '法律义务' },
      { name: '收货地址', purpose: '实物商品配送', isRequired: false, legalBasis: '合同履行' },
    ],
  },
  {
    id: 'interaction',
    name: '互动数据',
    icon: 'message-circle',
    description: '用于社区功能和内容审核',
    canManage: true,
    fields: [
      { name: '发布内容', purpose: '社区展示、内容审核', isRequired: false, legalBasis: '合同履行' },
      { name: '评论/回复', purpose: '社区互动、内容审核', isRequired: false, legalBasis: '合同履行' },
      { name: '私信记录', purpose: '用户间通讯', isRequired: false, legalBasis: '合同履行' },
      { name: '举报记录', purpose: '内容治理、违规处理', isRequired: false, legalBasis: '合法利益' },
    ],
  },
]

const expandedCategories = ref<string[]>(['account'])

const isExpanded = (id: string) => expandedCategories.value.includes(id)

const toggleCategory = (id: string) => {
  if (expandedCategories.value.includes(id)) {
    expandedCategories.value = expandedCategories.value.filter(c => c !== id)
  } else {
    expandedCategories.value = [...expandedCategories.value, id]
  }
}

const expandAll = () => {
  expandedCategories.value = dataCategories.map(c => c.id)
}

const collapseAll = () => {
  expandedCategories.value = []
}

const totalFields = computed(() => dataCategories.reduce((sum, cat) => sum + cat.fields.length, 0))
const requiredFields = computed(() =>
  dataCategories.reduce((sum, cat) => sum + cat.fields.filter(f => f.isRequired).length, 0)
)

const goPrivacy = () => navigateTo('/settings/privacy')
const contactEmail = () => {}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #faf8f5;
  /* 固定底部 CTA 实际高度 = 32rpx padding-top + 88rpx 按钮 + 32rpx padding-bottom + 安全区，
     原 192rpx 在有安全区的机型上不够，末行「联系我们」会被固定栏遮挡，故留足底部空间 */
  padding-bottom: calc(224rpx + env(safe-area-inset-bottom));
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: rgba(250, 248, 245, 0.95);
  border-bottom: 2rpx solid #e8e0d5;
  padding: 24rpx 32rpx;
}
.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.navbar-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.back-btn {
  padding: 8rpx;
  margin-left: -8rpx;
}
.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.manage-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
}
.manage-btn-text {
  font-size: 28rpx;
  color: #2c2c2c;
}

.body {
  padding: 32rpx;
}
.body > view {
  margin-bottom: 32rpx;
}

/* 说明卡 */
.intro-card {
  background-color: #eff6ff;
  border: 2rpx solid #bfdbfe;
  border-radius: 24rpx;
  padding: 32rpx;
}
.intro-row {
  display: flex;
  gap: 24rpx;
}
.intro-icon {
  flex-shrink: 0;
  margin-top: 4rpx;
}
.intro-content {
  flex: 1;
}
.intro-text {
  font-size: 28rpx;
  color: #1e40af;
  line-height: 1.6;
}
.intro-stats {
  display: flex;
  gap: 32rpx;
  margin-top: 16rpx;
}
.intro-stat {
  font-size: 24rpx;
  color: #1d4ed8;
}

/* 展开收起 */
.toggle-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16rpx;
}
.toggle-link {
  font-size: 24rpx;
  color: var(--brand);
}
.toggle-sep {
  font-size: 24rpx;
  color: #999999;
}

/* 分组列表 */
.category-list > .category-card {
  margin-bottom: 24rpx;
}
.category-card {
  background-color: #ffffff;
  border: 2rpx solid #e8e0d5;
  border-radius: 24rpx;
  overflow: hidden;
}
.category-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
}
.category-head-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.category-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.category-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.category-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.category-count {
  font-size: 24rpx;
  color: #999999;
}
.category-desc {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}
.category-head-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.badge-manage {
  font-size: 24rpx;
  color: #16a34a;
  background-color: #f0fdf4;
  padding: 2rpx 16rpx;
  border-radius: 8rpx;
}

/* 字段列表 */
.field-list {
  border-top: 2rpx solid #e8e0d5;
}
.field-item {
  padding: 24rpx 32rpx;
}
.field-item-border {
  border-bottom: 2rpx solid #e8e0d5;
}
.field-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.field-main {
  flex: 1;
  min-width: 0;
}
.field-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.field-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.badge-required {
  font-size: 24rpx;
  color: #ea580c;
  background-color: #fff7ed;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.badge-optional {
  font-size: 24rpx;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.field-purpose {
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}
.field-basis {
  font-size: 24rpx;
  color: #999999;
  white-space: nowrap;
}
.field-manage {
  padding: 24rpx 32rpx;
  background-color: rgba(245, 241, 235, 0.3);
}
.field-manage-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.field-manage-text {
  font-size: 28rpx;
  color: var(--brand);
}

/* 图例/依据 */
.legend-card {
  background-color: rgba(245, 241, 235, 0.5);
  border-radius: 24rpx;
  padding: 32rpx;
}
.legend-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  display: block;
  margin-bottom: 24rpx;
}
.legend-grid {
  display: flex;
  flex-wrap: wrap;
}
.legend-item {
  width: 50%;
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.legend-desc {
  font-size: 24rpx;
  color: #999999;
}
.basis-list > .basis-item {
  margin-bottom: 16rpx;
}
.basis-item {
  display: flex;
  gap: 16rpx;
}
.basis-label {
  font-size: 24rpx;
  font-weight: 500;
  color: #2c2c2c;
  width: 128rpx;
  flex-shrink: 0;
}
.basis-text {
  font-size: 24rpx;
  color: #999999;
  flex: 1;
}

/* 联系 */
.contact {
  text-align: center;
  padding-top: 32rpx;
}
.contact-tip {
  font-size: 28rpx;
  color: #999999;
  display: block;
  margin-bottom: 16rpx;
}
.contact-email {
  font-size: 28rpx;
  color: var(--brand);
}

/* 底部按钮 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #faf8f5;
  border-top: 2rpx solid #e8e0d5;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}
.footer-btn {
  width: 100%;
  height: 88rpx;
  background-color: var(--brand);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.footer-btn-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}
</style>
