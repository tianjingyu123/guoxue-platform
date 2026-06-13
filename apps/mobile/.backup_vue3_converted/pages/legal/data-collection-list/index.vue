<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- ===== 骨架屏 ===== -->
    <view v-if="loading" class="min-h-screen bg-background p-4">
      <view class="h-32 bg-white rounded-xl animate-pulse mb-4" />
      <view class="h-16 bg-white rounded-xl animate-pulse mb-3" />
      <view class="h-16 bg-white rounded-xl animate-pulse mb-3" />
      <view class="h-16 bg-white rounded-xl animate-pulse mb-3" />
      <view class="h-16 bg-white rounded-xl animate-pulse" />
    </view>

    <template v-else>
      <!-- 导航栏 -->
      <header class="sticky top-0 z-10 bg-background/95 px-4 py-3 border-b border-border" style="backdrop-filter:blur(8px)">
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-3">
            <view @click="goBack" class="p-1 -ml-1 rounded-full active:bg-muted">
              <text class="text-xl text-foreground leading-none">←</text>
            </view>
            <text class="text-lg font-semibold text-foreground">个人信息收集清单</text>
          </view>
          <view @click="goTo('/pages/settings/privacy/index')" class="flex items-center gap-1 px-2 py-1 rounded active:bg-muted">
            <text class="text-sm text-primary">⚙️</text>
            <text class="text-xs text-primary">管理授权</text>
          </view>
        </view>
      </header>

      <view class="p-4 space-y-4">
        <!-- 说明卡片 -->
        <view class="bg-blue-50/80 border border-blue-200 rounded-xl p-4">
          <view class="flex gap-3">
            <text class="text-blue-600 text-lg flex-shrink-0 mt-0.5">🛡</text>
            <view class="space-y-2">
              <text class="text-sm text-blue-800 block leading-relaxed">
                根据《个人信息保护法》第17条规定，我们向您明示收集的个人信息清单。
                您可以随时在「设置-隐私」中管理您的授权。
              </text>
              <view class="flex flex-wrap gap-3 text-xs text-blue-700">
                <text>共 <text class="font-semibold">{{ totalFields }}</text> 项信息</text>
                <text>必需 <text class="font-semibold text-orange-600">{{ requiredFields }}</text> 项</text>
                <text>可选 <text class="font-semibold text-gray-600">{{ optionalFields }}</text> 项</text>
              </view>
              <text v-if="lastUpdated" class="text-[11px] text-blue-400 block">最后更新：{{ lastUpdated }}</text>
            </view>
          </view>
        </view>

        <!-- 搜索 -->
        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
          <input v-model="searchQuery" placeholder="搜索信息项..." class="w-full pl-9 h-10 text-sm bg-white border border-border rounded-xl outline-none px-3 text-foreground placeholder:text-muted-foreground" @input="handleSearch" />
          <text v-if="searchQuery" @click="searchQuery = ''; handleSearch()" class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground active:opacity-60">✕</text>
        </view>

        <!-- 展开/收起 + 统计 -->
        <view class="flex items-center justify-between">
          <text class="text-xs text-muted-foreground">
            {{ searchQuery ? '搜索到 ' + searchResultCount + ' 项' : '共 ' + totalFields + ' 项信息' }}
          </text>
          <view class="flex items-center gap-3">
            <text @click="expandAll" class="text-xs text-primary active:opacity-70">全部展开</text>
            <text class="text-[#E8E0D5]">|</text>
            <text @click="collapseAll" class="text-xs text-primary active:opacity-70">全部收起</text>
          </view>
        </view>

        <!-- 分组列表 -->
        <view class="space-y-3">
          <view v-for="cat in displayCategories" :key="cat.id" class="bg-white border border-border rounded-xl overflow-hidden">
            <!-- 分组头部 -->
            <view @click="toggleCategory(cat.id)" class="w-full flex items-center justify-between p-4 active:bg-background">
              <view class="flex items-center gap-3 min-w-0">
                <view class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style="background:rgba(196,30,58,0.08)">
                  <text>{{ cat.icon }}</text>
                </view>
                <view class="text-left min-w-0">
                  <view class="flex items-center gap-2">
                    <text class="font-medium text-foreground text-sm truncate">{{ cat.name }}</text>
                    <text class="text-xs text-muted-foreground whitespace-nowrap">{{ cat.fields.length }}项</text>
                  </view>
                  <text class="text-xs text-muted-foreground block truncate">{{ cat.description }}</text>
                </view>
              </view>
              <view class="flex items-center gap-2 shrink-0 ml-2">
                <text v-if="cat.canManage" class="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded leading-none">可管理</text>
                <text class="text-muted-foreground text-lg leading-none">{{ expandedCategories.includes(cat.id) ? '▲' : '▼' }}</text>
              </view>
            </view>

            <!-- 字段列表 -->
            <view v-if="expandedCategories.includes(cat.id)" class="border-t border-border">
              <view v-for="(field, idx) in cat.fields" :key="field.name"
                :class="['px-4 py-3', idx !== cat.fields.length - 1 ? 'border-b border-border' : '']">
                <view class="flex items-start justify-between gap-2">
                  <view class="flex-1 min-w-0">
                    <view class="flex items-center gap-2 flex-wrap">
                      <text class="font-medium text-sm text-foreground">{{ field.name }}</text>
                      <text :class="['text-[10px] px-1.5 py-0.5 rounded leading-none', field.isRequired ? 'text-orange-600 bg-orange-50' : 'text-gray-500 bg-gray-100']">
                        {{ field.isRequired ? '必需' : '可选' }}
                      </text>
                      <text v-if="field.collectionMethod" class="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded leading-none">{{ field.collectionMethod }}</text>
                    </view>
                    <text class="text-xs text-ink-soft block mt-1 leading-relaxed">{{ field.purpose }}</text>
                    <view v-if="field.retentionPeriod" class="flex items-center gap-1 mt-1">
                      <text class="text-[10px] text-muted-foreground">保存期限：</text>
                      <text class="text-[10px] text-muted-foreground">{{ field.retentionPeriod }}</text>
                    </view>
                  </view>
                  <view v-if="field.legalBasis" class="flex-shrink-0">
                    <text class="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground leading-none">{{ field.legalBasis }}</text>
                  </view>
                </view>
              </view>

              <!-- 管理授权入口 -->
              <view v-if="cat.canManage" class="px-4 py-3" style="background:rgba(245,241,235,0.5)">
                <view @click="goTo('/pages/settings/privacy/index')" class="text-sm text-primary flex items-center gap-1 active:opacity-70">
                  <text>管理此类信息的授权</text>
                  <text class="text-xs">↗</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 搜索无结果 -->
          <view v-if="displayCategories.length === 0" class="py-12 text-center">
            <text class="text-4xl block mb-3 text-[#E8E0D5]"></text>
            <text class="text-sm text-muted-foreground">未找到匹配的信息项</text>
            <text @click="searchQuery = ''; handleSearch()" class="text-xs text-primary block mt-2 active:opacity-70">清除搜索</text>
          </view>
        </view>

        <!-- 标签说明 -->
        <view class="rounded-xl p-4 space-y-3" style="background:rgba(245,241,235,0.5)">
          <text class="font-medium text-sm text-foreground block">标签说明</text>
          <view class="grid grid-cols-2 gap-3 text-xs">
            <view class="flex items-center gap-2">
              <text class="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded leading-none">必需</text>
              <text class="text-muted-foreground">提供基本服务所必需</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded leading-none">可选</text>
              <text class="text-muted-foreground">可拒绝，不影响基本功能</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-green-600 bg-green-50 px-1.5 py-0.5 rounded leading-none">可管理</text>
              <text class="text-muted-foreground">可在设置中开启/关闭</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded leading-none">采集方式</text>
              <text class="text-muted-foreground">用户提供/自动采集/第三方</text>
            </view>
          </view>
        </view>

        <!-- 处理依据说明 -->
        <view class="rounded-xl p-4 space-y-3" style="background:rgba(245,241,235,0.5)">
          <text class="font-medium text-sm text-foreground block">处理依据说明</text>
          <view class="space-y-2.5 text-xs">
            <view class="flex gap-2">
              <text class="font-medium text-foreground w-16 shrink-0">合同履行</text>
              <text class="text-muted-foreground">为履行与您签订的用户协议所必需</text>
            </view>
            <view class="flex gap-2">
              <text class="font-medium text-foreground w-16 shrink-0">同意</text>
              <text class="text-muted-foreground">基于您的明示同意收集，可随时撤回</text>
            </view>
            <view class="flex gap-2">
              <text class="font-medium text-foreground w-16 shrink-0">合法利益</text>
              <text class="text-muted-foreground">为维护平台安全、优化服务所必需</text>
            </view>
            <view class="flex gap-2">
              <text class="font-medium text-foreground w-16 shrink-0">法律义务</text>
              <text class="text-muted-foreground">为履行法定义务所必需</text>
            </view>
          </view>
        </view>

        <!-- 版本历史 -->
        <view class="rounded-xl p-4" style="background:rgba(245,241,235,0.5)">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground"></text>
              <text class="text-xs text-muted-foreground">版本历史</text>
            </view>
            <text class="text-xs text-primary" @click="showVersionHistory = !showVersionHistory">
              {{ showVersionHistory ? '收起' : '查看' }}
            </text>
          </view>
          <view v-if="showVersionHistory" class="mt-3 space-y-2">
            <view v-for="ver in versionHistory" :key="ver.version" class="flex items-center gap-3 text-xs">
              <text class="font-medium text-foreground w-16 shrink-0">v{{ ver.version }}</text>
              <text class="text-muted-foreground flex-1">{{ ver.change }}</text>
              <text class="text-muted-foreground w-16 text-right">{{ ver.date }}</text>
            </view>
          </view>
        </view>

        <!-- 联系方式 -->
        <view class="text-center space-y-2 pt-2">
          <text class="text-sm text-muted-foreground block">如有疑问，请联系我们</text>
          <text class="text-sm text-primary" @click="goToMail">privacy@rebu.com</text>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4" style="padding-bottom:calc(16px + env(safe-area-inset-bottom))">
        <view @click="goTo('/pages/settings/privacy/index')" class="w-full py-3 text-white text-sm font-medium rounded-xl text-center active:opacity-90" style="background:#C41E3A">
          <text>管理我的授权</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'

// ===== 类型定义 =====
interface DataField {
  name: string
  purpose: string
  isRequired: boolean
  legalBasis?: string
  collectionMethod?: string
  retentionPeriod?: string
}

interface DataCategory {
  id: string
  name: string
  icon: string
  description: string
  fields: DataField[]
  canManage: boolean
}

interface VersionEntry {
  version: string
  change: string
  date: string
}

// ===== 状态 =====
const loading = ref(true)
const lastUpdated = ref('')
const searchQuery = ref('')
const expandedCategories = ref<string[]>(['account'])
const showVersionHistory = ref(false)

const dataCategories = ref<DataCategory[]>([])
const versionHistory = ref<VersionEntry[]>([])

// ===== 计算属性 =====
const displayCategories = computed(() => {
  if (!searchQuery.value.trim()) return dataCategories.value
  const q = searchQuery.value.toLowerCase().trim()
  return dataCategories.value
    .map(cat => ({
      ...cat,
      fields: cat.fields.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.purpose.toLowerCase().includes(q)
      ),
    }))
    .filter(cat => cat.fields.length > 0)
})

const totalFields = computed(() =>
  dataCategories.value.reduce((s, c) => s + c.fields.length, 0)
)

const requiredFields = computed(() =>
  dataCategories.value.reduce((s, c) => s + c.fields.filter(f => f.isRequired).length, 0)
)

const optionalFields = computed(() =>
  totalFields.value - requiredFields.value
)

const searchResultCount = computed(() =>
  displayCategories.value.reduce((s, c) => s + c.fields.length, 0)
)

// ===== 数据 =====
const mockCategories: DataCategory[] = [
  {
    id: 'account', name: '账号信息', icon: '',
    description: '用于创建和维护您的账户',
    canManage: false,
    fields: [
      { name: '手机号码', purpose: '账号注册、登录验证、找回密码', isRequired: true, legalBasis: '合同履行', collectionMethod: '用户提供', retentionPeriod: '账号注销后30天' },
      { name: '用户昵称', purpose: '展示身份、社区互动', isRequired: true, legalBasis: '合同履行', collectionMethod: '用户提供', retentionPeriod: '长期' },
      { name: '头像', purpose: '个人形象展示', isRequired: false, legalBasis: '同意', collectionMethod: '用户提供', retentionPeriod: '长期' },
      { name: '性别', purpose: '个性化推荐、社区功能', isRequired: false, legalBasis: '同意', collectionMethod: '用户提供', retentionPeriod: '长期' },
      { name: '出生日期', purpose: '命理服务、年龄验证', isRequired: false, legalBasis: '同意', collectionMethod: '用户提供', retentionPeriod: '长期' },
      { name: '出生时辰', purpose: '命理排盘服务', isRequired: false, legalBasis: '同意', collectionMethod: '用户提供', retentionPeriod: '长期' },
      { name: '出生地点', purpose: '命理排盘服务（时区计算）', isRequired: false, legalBasis: '同意', collectionMethod: '用户提供', retentionPeriod: '长期' },
      { name: '邮箱地址', purpose: '重要通知、找回密码', isRequired: false, legalBasis: '同意', collectionMethod: '用户提供', retentionPeriod: '长期' },
    ],
  },
  {
    id: 'location', name: '位置信息', icon: '📍',
    description: '用于附近功能和位置服务',
    canManage: true,
    fields: [
      { name: '精确位置', purpose: '附近的人/驿站、同城发现', isRequired: false, legalBasis: '同意', collectionMethod: '自动采集', retentionPeriod: '实时获取不保存' },
      { name: '城市信息', purpose: '本地化内容推荐、活动筛选', isRequired: false, legalBasis: '同意', collectionMethod: '自动采集', retentionPeriod: '长期' },
      { name: 'IP地址', purpose: '安全防护、区域服务', isRequired: true, legalBasis: '合法利益', collectionMethod: '自动采集', retentionPeriod: '90天' },
    ],
  },
  {
    id: 'device', name: '设备信息', icon: '',
    description: '用于安全防护和服务优化',
    canManage: false,
    fields: [
      { name: '设备型号', purpose: '界面适配、问题排查', isRequired: true, legalBasis: '合法利益', collectionMethod: '自动采集', retentionPeriod: '90天' },
      { name: '操作系统版本', purpose: '兼容性保障、功能适配', isRequired: true, legalBasis: '合法利益', collectionMethod: '自动采集', retentionPeriod: '90天' },
      { name: '设备标识符', purpose: '账号安全、防欺诈', isRequired: true, legalBasis: '合法利益', collectionMethod: '自动采集', retentionPeriod: '长期' },
      { name: '网络类型', purpose: '服务质量优化', isRequired: true, legalBasis: '合法利益', collectionMethod: '自动采集', retentionPeriod: '会话期' },
      { name: '应用版本', purpose: '功能更新、问题排查', isRequired: true, legalBasis: '合法利益', collectionMethod: '自动采集', retentionPeriod: '90天' },
    ],
  },
  {
    id: 'behavior', name: '行为记录', icon: '📊',
    description: '用于改善产品体验和个性化推荐',
    canManage: true,
    fields: [
      { name: '浏览历史', purpose: '个性化内容推荐', isRequired: false, legalBasis: '同意', collectionMethod: '自动采集', retentionPeriod: '180天' },
      { name: '搜索记录', purpose: '搜索建议、历史记录', isRequired: false, legalBasis: '同意', collectionMethod: '自动采集', retentionPeriod: '180天' },
      { name: '点击行为', purpose: '产品体验优化', isRequired: false, legalBasis: '合法利益', collectionMethod: '自动采集', retentionPeriod: '90天' },
      { name: '学习进度', purpose: '课程续学、学习统计', isRequired: false, legalBasis: '合同履行', collectionMethod: '自动采集', retentionPeriod: '长期' },
      { name: '收藏/关注', purpose: '内容聚合、更新提醒', isRequired: false, legalBasis: '合同履行', collectionMethod: '自动采集', retentionPeriod: '长期' },
    ],
  },
  {
    id: 'transaction', name: '交易记录', icon: '',
    description: '用于订单处理和售后服务',
    canManage: false,
    fields: [
      { name: '订单信息', purpose: '交易记录、售后服务', isRequired: true, legalBasis: '合同履行', collectionMethod: '自动采集', retentionPeriod: '交易完成3年后删除' },
      { name: '支付记录', purpose: '支付完成、退款处理', isRequired: true, legalBasis: '合同履行', collectionMethod: '自动采集', retentionPeriod: '交易完成3年后删除' },
      { name: '发票信息', purpose: '开具发票', isRequired: false, legalBasis: '法律义务', collectionMethod: '用户提供', retentionPeriod: '按税法规定保存' },
      { name: '收货地址', purpose: '实物商品配送', isRequired: false, legalBasis: '合同履行', collectionMethod: '用户提供', retentionPeriod: '交易完成后30天' },
    ],
  },
  {
    id: 'interaction', name: '互动数据', icon: '',
    description: '用于社区功能和内容审核',
    canManage: true,
    fields: [
      { name: '发布内容', purpose: '社区展示、内容审核', isRequired: false, legalBasis: '合同履行', collectionMethod: '用户提供', retentionPeriod: '长期，用户删除后30天清除' },
      { name: '评论/回复', purpose: '社区互动、内容审核', isRequired: false, legalBasis: '合同履行', collectionMethod: '用户提供', retentionPeriod: '长期，用户删除后30天清除' },
      { name: '私信记录', purpose: '用户间通讯', isRequired: false, legalBasis: '合同履行', collectionMethod: '用户提供', retentionPeriod: '180天' },
      { name: '举报记录', purpose: '内容治理、违规处理', isRequired: false, legalBasis: '合法利益', collectionMethod: '用户提供', retentionPeriod: '处理完成后90天' },
    ],
  },
]

const mockVersionHistory: VersionEntry[] = [
  { version: '2.0', change: '新增采集方式和保存期限说明', date: '2026-03-15' },
  { version: '1.2', change: '更新行为记录分类', date: '2025-12-01' },
  { version: '1.1', change: '新增位置信息可管理标识', date: '2025-08-20' },
  { version: '1.0', change: '初始版本上线', date: '2025-06-01' },
]

// ===== 生命周期 =====
onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/legal/data-collection')
    if (res && typeof res === 'object' && 'categories' in res) {
      const d = res as any
      dataCategories.value = d.categories
      if (d.lastUpdated) lastUpdated.value = d.lastUpdated
      if (d.versionHistory) versionHistory.value = d.versionHistory
    } else {
      throw new Error('data missing')
    }
  } catch {
    dataCategories.value = mockCategories
    lastUpdated.value = '2026-03-15'
    versionHistory.value = mockVersionHistory
  } finally {
    loading.value = false
  }
})

// ===== 交互函数 =====
function toggleCategory(id: string) {
  const idx = expandedCategories.value.indexOf(id)
  if (idx >= 0) expandedCategories.value.splice(idx, 1)
  else expandedCategories.value.push(id)
}

function expandAll() {
  expandedCategories.value = dataCategories.value.map(c => c.id)
}

function collapseAll() {
  expandedCategories.value = []
}

function handleSearch() {
  // 搜索时自动展开所有匹配的分类
  if (searchQuery.value.trim()) {
    expandedCategories.value = dataCategories.value.map(c => c.id)
  }
}

// ===== 导航 =====
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
function goToMail() {
  uni.setClipboardData({
    data: 'privacy@rebu.com',
    success: () => uni.showToast({ title: '邮箱地址已复制', icon: 'success' }),
  })
}
</script>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.active\:opacity-70:active {
  opacity: 0.7;
}

.active\:opacity-90:active {
  opacity: 0.9;
}
</style>
