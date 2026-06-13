<template>
  <view class="min-h-screen bg-background pb-32">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border">
      <view class="px-4 py-3 flex items-center gap-3">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-2xl text-foreground">←</text>
        </view>
        <text class="text-lg font-semibold text-foreground">发票管理</text>
      </view>

      <!-- loading -->
      <view v-if="loading">
        <view class="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
          <view class="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          <view class="w-24 h-5 bg-gray-200 rounded animate-pulse" />
        </view>
        <view class="p-4 space-y-4">
          <view v-for="i in 3" :key="i" class="bg-white rounded-2xl h-32 animate-pulse" />
        </view>
      </view>

      <!-- Tab切换 -->
      <view v-else class="flex border-b border-border">
        <view
          v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          :class="['flex-1 py-3 text-sm font-medium text-center relative', activeTab === tab.key ? 'text-primary' : 'text-ink-soft']"
        >
          <text>{{ tab.label }}</text>
          <text v-if="tab.count > 0" :class="['ml-1 px-1.5 py-0.5 text-xs rounded-full', activeTab === tab.key ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600']">
            {{ tab.count }}
          </text>
          <view v-if="activeTab === tab.key" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
        </view>
      </view>
    </view>

    <!-- 申请开票 Tab -->
    <view v-if="activeTab === 'apply' && !loading" class="p-4 space-y-4">
      <!-- 可开票订单 -->
      <view class="bg-white rounded-2xl p-4">
        <view class="font-medium text-foreground mb-3 flex items-center gap-2">
          <text class="text-lg text-primary">🧾</text>
          <text>选择订单</text>
        </view>
        <text v-if="errors.orders" class="text-xs text-red-500 mb-2 block">{{ errors.orders }}</text>
        <view v-if="applicableOrders.length === 0" class="text-center py-6 text-muted-foreground">暂无可开票订单</view>
        <view v-else class="space-y-3">
          <view
            v-for="order in applicableOrders" :key="order.orderId"
            @click="toggleOrder(order.orderId)"
            :class="['flex items-start gap-3 p-3 rounded-xl border-2 transition-all', selectedOrders.includes(order.orderId) ? 'border-primary bg-red-50' : 'border-border bg-background']"
          >
            <view :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5', selectedOrders.includes(order.orderId) ? 'border-primary bg-primary' : 'border-gray-300']">
              <text v-if="selectedOrders.includes(order.orderId)" class="text-white text-xs">✓</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground font-medium truncate block">{{ order.productName }}</text>
              <text class="text-xs text-muted-foreground mt-1 block">订单号：{{ order.orderNo }}</text>
              <text class="text-xs text-muted-foreground block">{{ order.createdAt }}</text>
            </view>
            <text class="text-primary font-semibold">¥{{ order.amount }}</text>
          </view>
        </view>
        <view v-if="selectedOrders.length > 0" class="mt-4 pt-4 border-t border-border flex justify-between items-center">
          <text class="text-sm text-ink-soft">已选 {{ selectedOrders.length }} 笔订单</text>
          <text class="text-lg font-bold text-primary">¥{{ totalAmount }}</text>
        </view>
      </view>

      <!-- 发票类型 -->
      <view class="bg-white rounded-2xl p-4">
        <text class="font-medium text-foreground mb-3 block">发票类型</text>
        <view class="grid grid-cols-2 gap-3">
          <view
            v-for="type in invoiceTypes" :key="type.key"
            @click="invoiceType = type.key"
            :class="['p-4 rounded-xl border-2 transition-all', invoiceType === type.key ? 'border-primary bg-red-50' : 'border-border']"
          >
            <text :class="['text-2xl mb-2 block', invoiceType === type.key ? 'text-primary' : 'text-ink-soft']">{{ type.icon }}</text>
            <text :class="['font-medium block', invoiceType === type.key ? 'text-primary' : 'text-foreground']">{{ type.label }}</text>
            <text class="text-xs text-muted-foreground mt-1 block">{{ type.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 发票信息 -->
      <view class="bg-white rounded-2xl p-4">
        <text class="font-medium text-foreground mb-4 block">发票信息</text>
        <view class="space-y-4">
          <!-- 抬头 -->
          <view>
            <text class="block text-sm text-ink-soft mb-2">
              {{ invoiceType === 'company' ? '公司名称' : '个人姓名' }} <text class="text-red-500">*</text>
            </text>
            <input
              v-model="title"
              :placeholder="invoiceType === 'company' ? '请输入公司全称' : '请输入真实姓名'"
              :class="['w-full px-4 py-3 rounded-xl border text-foreground placeholder:text-muted-foreground', errors.title ? 'border-red-500' : 'border-border']"
            />
            <text v-if="errors.title" class="text-xs text-red-500 mt-1 block">{{ errors.title }}</text>
          </view>

          <!-- 税号（企业） -->
          <view v-if="invoiceType === 'company'">
            <text class="block text-sm text-ink-soft mb-2">
              税号 <text class="text-red-500">*</text>
            </text>
            <input
              v-model="taxNumber"
              placeholder="请输入纳税人识别号"
              :class="['w-full px-4 py-3 rounded-xl border text-foreground placeholder:text-muted-foreground', errors.taxNumber ? 'border-red-500' : 'border-border']"
            />
            <text v-if="errors.taxNumber" class="text-xs text-red-500 mt-1 block">{{ errors.taxNumber }}</text>
          </view>

          <!-- 邮箱 -->
          <view>
            <text class="block text-sm text-ink-soft mb-2">
              接收邮箱 <text class="text-red-500">*</text>
            </text>
            <view class="relative">
              <text class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">✉️</text>
              <input
                v-model="email"
                type="email"
                placeholder="用于接收电子发票"
                :class="['w-full pl-12 pr-4 py-3 rounded-xl border text-foreground placeholder:text-muted-foreground', errors.email ? 'border-red-500' : 'border-border']"
              />
            </view>
            <text v-if="errors.email" class="text-xs text-red-500 mt-1 block">{{ errors.email }}</text>
          </view>

          <!-- 手机号（可选） -->
          <view>
            <text class="block text-sm text-ink-soft mb-2">联系电话（选填）</text>
            <view class="relative">
              <text class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">📞</text>
              <input
                v-model="phone"
                type="tel"
                placeholder="方便开票问题联系"
                class="w-full pl-12 pr-4 py-3 rounded-xl border border-border text-foreground placeholder:text-muted-foreground"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 提示 -->
      <view class="bg-yellow-50 rounded-xl p-4 flex gap-3">
        <text class="text-lg text-yellow-600 flex-shrink-0 mt-0.5"></text>
        <view class="text-sm text-yellow-700">
          <text class="font-medium mb-1 block">温馨提示</text>
          <view class="text-xs space-y-1 text-yellow-600">
            <text class="block">电子发票与纸质发票具有同等法律效力</text>
            <text class="block">发票将在1-3个工作日内发送至您的邮箱</text>
            <text class="block">如有问题请联系客服</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 已申请 Tab -->
    <view v-else-if="!loading" class="p-4 space-y-3">
      <view v-if="invoices.length === 0" class="bg-white rounded-2xl p-8 text-center">
        <text class="text-4xl text-gray-300 block mb-3">🧾</text>
        <text class="text-muted-foreground block">暂无发票记录</text>
        <view @click="activeTab = 'apply'" class="mt-4 px-6 py-2 bg-primary text-white rounded-full text-sm inline-block">去申请</view>
      </view>
      <view v-for="invoice in invoices" :key="invoice.id" class="bg-white rounded-2xl p-4" @click="goTo('/pages/orders/invoice/' + invoice.id)">
        <view class="flex items-start justify-between mb-3">
          <view class="flex items-center gap-2">
            <text class="text-lg text-primary">{{ invoice.type === 'company' ? '🏢' : '' }}</text>
            <text class="font-medium text-foreground">{{ invoice.title }}</text>
          </view>
          <text :class="['px-2 py-0.5 rounded-full text-xs', getStatusConfig(invoice.status).color]">
            {{ getStatusConfig(invoice.status).label }}
          </text>
        </view>

        <text v-if="invoice.taxNumber" class="text-xs text-muted-foreground mb-2 block">税号：{{ invoice.taxNumber }}</text>

        <view class="flex items-center justify-between pt-3 border-t border-border">
          <view>
            <text class="text-lg font-bold text-primary">¥{{ invoice.amount }}</text>
            <text class="text-xs text-muted-foreground block">{{ invoice.createdAt }}</text>
          </view>
          <view class="flex gap-2">
            <view v-if="invoice.status === 'completed'" class="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-full text-xs">⬇ 下载</view>
            <view class="flex items-center gap-1 px-3 py-1.5 border border-border rounded-full text-xs text-ink-soft"> 详情</view>
          </view>
        </view>

        <view v-if="invoice.status === 'rejected' && invoice.rejectReason" class="mt-3 p-2 bg-red-50 rounded-lg">
          <text class="text-xs text-red-600">驳回原因：{{ invoice.rejectReason }}</text>
        </view>
      </view>
    </view>

    <!-- 底部提交按钮 -->
    <view v-if="activeTab === 'apply'" class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4" style="padding-bottom:calc(16px + env(safe-area-inset-bottom))">
      <view
        @click="handleSubmit"
        :class="['w-full py-3 bg-primary text-white rounded-full font-medium text-center', (submitting || selectedOrders.length === 0) ? 'opacity-50' : '']"
      >
        {{ submitting ? '提交中...' : '提交申请' + (totalAmount > 0 ? ' ¥' + totalAmount : '') }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface InvoiceOrder {
  orderId: string
  orderNo: string
  amount: number
  createdAt: string
  productName: string
}

interface Invoice {
  id: string
  type: string
  title: string
  taxNumber?: string
  amount: number
  status: string
  email: string
  createdAt: string
  completedAt?: string
  rejectReason?: string
}

const mockApplicableOrders: InvoiceOrder[] = [
  { orderId: 'o1', orderNo: '202412150001', amount: 299, createdAt: '2024-12-15 10:30', productName: '周易六十四卦详解' },
  { orderId: 'o2', orderNo: '202412140002', amount: 168, createdAt: '2024-12-14 15:20', productName: '紫微斗数入门课程' },
  { orderId: 'o3', orderNo: '202412130003', amount: 88, createdAt: '2024-12-13 09:15', productName: '风水基础教程' },
]

const mockInvoices: Invoice[] = [
  { id: 'i1', type: 'company', title: '北京某某科技有限公司', taxNumber: '91110108MA01XXXXX', amount: 467, status: 'completed', email: 'finance@example.com', createdAt: '2024-12-10 14:30', completedAt: '2024-12-11 10:00' },
  { id: 'i2', type: 'personal', title: '张*三', amount: 168, status: 'processing', email: 'zhang***@163.com', createdAt: '2024-12-14 16:00' },
  { id: 'i3', type: 'company', title: '上海某某文化传媒', taxNumber: '91310115MA1HXXXX', amount: 299, status: 'rejected', email: 'acc@example.com', createdAt: '2024-12-08 11:20', rejectReason: '税号格式不正确' },
]

const invoiceTypes = [
  { key: 'personal', label: '个人发票', icon: '', desc: '个人消费使用' },
  { key: 'company', label: '企业发票', icon: '🏢', desc: '公司报销使用' },
]

const loading = ref(true)
const activeTab = ref<'apply' | 'list'>('apply')
const applicableOrders = ref<InvoiceOrder[]>([])
const invoices = ref<Invoice[]>([])

const selectedOrders = ref<string[]>([])
const invoiceType = ref<'personal' | 'company'>('personal')
const title = ref('')
const taxNumber = ref('')
const email = ref('')
const phone = ref('')
const submitting = ref(false)
const errors = ref<Record<string, string>>({})

const totalAmount = computed(() => {
  return applicableOrders.value
    .filter(o => selectedOrders.value.includes(o.orderId))
    .reduce((sum, o) => sum + o.amount, 0)
})

const tabs = computed(() => [
  { key: 'apply', label: '申请开票', count: applicableOrders.value.length },
  { key: 'list', label: '已申请', count: invoices.value.length },
])

onMounted(() => {
  loadData()
})

function loadData() {
  loading.value = true
  setTimeout(() => {
    applicableOrders.value = mockApplicableOrders
    invoices.value = mockInvoices
    loading.value = false
  }, 300)
}

function toggleOrder(orderId: string) {
  const idx = selectedOrders.value.indexOf(orderId)
  if (idx >= 0) {
    selectedOrders.value.splice(idx, 1)
  } else {
    selectedOrders.value.push(orderId)
  }
  if (errors.value.orders) {
    errors.value = { ...errors.value, orders: '' }
  }
}

function validate(): boolean {
  const newErrors: Record<string, string> = {}
  if (selectedOrders.value.length === 0) newErrors.orders = '请选择要开票的订单'
  if (!title.value.trim()) newErrors.title = invoiceType.value === 'company' ? '请输入公司名称' : '请输入个人姓名'
  if (invoiceType.value === 'company' && !taxNumber.value.trim()) newErrors.taxNumber = '请输入税号'
  if (invoiceType.value === 'company' && taxNumber.value && !/^[A-Z0-9]{15,20}$/.test(taxNumber.value.toUpperCase())) {
    newErrors.taxNumber = '税号格式不正确'
  }
  if (!email.value.trim()) newErrors.email = '请输入接收邮箱'
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) newErrors.email = '邮箱格式不正确'
  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    selectedOrders.value = []
    title.value = ''
    taxNumber.value = ''
    email.value = ''
    phone.value = ''
    activeTab.value = 'list'
    uni.showToast({ title: '提交成功', icon: 'success' })
  }, 1000)
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'pending': return { label: '待处理', color: 'bg-yellow-100 text-yellow-700' }
    case 'processing': return { label: '开票中', color: 'bg-blue-100 text-blue-700' }
    case 'completed': return { label: '已开具', color: 'bg-green-100 text-green-700' }
    case 'rejected': return { label: '已驳回', color: 'bg-red-100 text-red-700' }
    default: return { label: status, color: 'bg-gray-100 text-gray-700' }
  }
}

function goBack() {
  uni.navigateBack()
}

function goTo(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
