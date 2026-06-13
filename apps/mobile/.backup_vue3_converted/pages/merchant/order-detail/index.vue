<template>
  <view class="min-h-screen bg-background pb-32">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center h-14 px-4">
        <view @click="goBack" class="mr-3 p-1">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-lg font-semibold">订单详情</text>
      </view>
    </view>

    <!-- 订单状态 -->
    <view class="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4">
      <view class="flex items-center gap-3">
        <text class="text-3xl">📦</text>
        <view>
          <text class="text-lg font-semibold block">{{ statusConfig[order.status]?.label || '' }}</text>
          <text class="text-sm text-white/80 block">请尽快发货，超时将自动关闭订单</text>
        </view>
      </view>
    </view>

    <!-- 收货信息 -->
    <view class="bg-white rounded-2xl mx-4 -mt-2 relative z-10 p-4 shadow-sm">
      <view class="flex items-start gap-3">
        <text class="text-muted-foreground mt-0.5">📍</text>
        <view class="flex-1">
          <view class="flex items-center gap-2">
            <text class="font-medium">{{ order.buyer.name }}</text>
            <text class="text-muted-foreground">{{ order.buyer.phone }}</text>
            <view @click="copyText(order.buyer.phone)" class="w-5 h-5 flex items-center justify-center"><text class="text-xs"></text></view>
          </view>
          <text class="text-sm text-muted-foreground mt-1 block">{{ order.buyer.address }}</text>
        </view>
        <view class="w-8 h-8 border border-border rounded-lg flex items-center justify-center">
          <text class="text-sm">📞</text>
        </view>
      </view>
    </view>

    <!-- 商品信息 -->
    <view class="bg-white rounded-2xl mx-4 mt-3 p-4 shadow-sm">
      <text class="font-medium mb-3 block">商品信息</text>
      <view v-for="product in order.products" :key="product.id" class="flex gap-3">
        <view class="w-16 h-16 rounded-xl bg-background flex items-center justify-center shrink-0">
          <text class="text-xl">📦</text>
        </view>
        <view class="flex-1 min-w-0">
          <text class="text-sm font-medium line-clamp-2 block">{{ product.title }}</text>
          <text class="text-xs text-muted-foreground mt-1 block">{{ product.specs }}</text>
          <view class="flex items-center justify-between mt-1">
            <text class="text-sm font-medium">¥{{ product.price }}</text>
            <text class="text-xs text-muted-foreground">x{{ product.quantity }}</text>
          </view>
        </view>
      </view>
      <view v-if="order.remark" class="mt-3 pt-3 border-t border-border">
        <view class="flex items-start gap-2 p-2 bg-amber-50 rounded-xl">
          <text class="text-amber-600"></text>
          <view>
            <text class="text-xs text-muted-foreground block">买家备注</text>
            <text class="text-sm mt-0.5">{{ order.remark }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 金额明细 -->
    <view class="bg-white rounded-2xl mx-4 mt-3 p-4 shadow-sm">
      <text class="font-medium mb-3 block">金额明细</text>
      <view class="space-y-2 text-sm">
        <view class="flex justify-between">
          <text class="text-muted-foreground">商品总价</text>
          <text>¥{{ order.amounts.productTotal }}</text>
        </view>
        <view class="flex justify-between">
          <text class="text-muted-foreground">运费</text>
          <text>{{ order.amounts.shipping === 0 ? '免运费' : '¥' + order.amounts.shipping }}</text>
        </view>
        <view v-if="order.amounts.discount > 0" class="flex justify-between">
          <text class="text-muted-foreground">优惠</text>
          <text class="text-red-500">-¥{{ order.amounts.discount }}</text>
        </view>
        <view class="h-px bg-[#E8E0D5]" />
        <view class="flex justify-between font-medium">
          <text>实付金额</text>
          <text class="text-primary text-lg">¥{{ order.amounts.total }}</text>
        </view>
      </view>
    </view>

    <!-- 订单信息 -->
    <view class="bg-white rounded-2xl mx-4 mt-3 p-4 shadow-sm">
      <text class="font-medium mb-3 block">订单信息</text>
      <view class="space-y-2 text-sm">
        <view class="flex justify-between">
          <text class="text-muted-foreground">订单编号</text>
          <view class="flex items-center gap-1">
            <text>{{ order.id }}</text>
            <view @click="copyText(order.id)" class="w-5 h-5 flex items-center justify-center"><text class="text-xs"></text></view>
          </view>
        </view>
        <view class="flex justify-between">
          <text class="text-muted-foreground">下单时间</text>
          <text>{{ order.createdAt }}</text>
        </view>
        <view class="flex justify-between">
          <text class="text-muted-foreground">付款时间</text>
          <text>{{ order.paidAt }}</text>
        </view>
        <view class="flex justify-between">
          <text class="text-muted-foreground">支付方式</text>
          <text>{{ order.payMethod }}</text>
        </view>
      </view>
    </view>

    <!-- 订单进度 -->
    <view class="bg-white rounded-2xl mx-4 mt-3 p-4 shadow-sm">
      <text class="font-medium mb-3 block">订单进度</text>
      <view class="space-y-4">
        <view v-for="(item, index) in order.timeline" :key="index" class="flex gap-3">
          <view class="flex flex-col items-center">
            <view :class="['w-3 h-3 rounded-full', index === 0 ? 'bg-primary' : 'bg-[#E8E0D5]']" />
            <view v-if="index < order.timeline.length - 1" class="w-px flex-1 bg-[#E8E0D5] my-1" />
          </view>
          <view class="flex-1 pb-4">
            <text :class="['text-sm font-medium block', index === 0 ? 'text-foreground' : 'text-muted-foreground']">{{ item.title }}</text>
            <text class="text-xs text-muted-foreground mt-0.5 block">{{ item.desc }}</text>
            <text class="text-xs text-muted-foreground mt-1 block">{{ item.time }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="order.status === 'pending'" class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border">
      <view class="flex gap-3">
        <view class="flex-1 py-3 border border-border rounded-xl text-center text-sm">修改价格</view>
        <view @click="showShipDialog = true" class="flex-1 py-3 bg-primary text-white rounded-xl text-center text-sm font-medium">🚚 发货</view>
      </view>
    </view>

    <!-- 发货弹窗 -->
    <view v-if="showShipDialog" class="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <view class="bg-white rounded-t-2xl w-full p-6 pb-8">
        <text class="text-lg font-semibold mb-4 block">填写物流信息</text>
        <view class="space-y-4">
          <view class="space-y-2">
            <text class="text-sm font-medium">快递公司 <text class="text-primary">*</text></text>
            <view class="flex flex-wrap gap-2">
              <view v-for="company in expressCompanies" :key="company.id" @click="expressCompany = company.id" :class="['px-3 py-2 rounded-xl text-sm border transition-all', expressCompany === company.id ? 'border-primary bg-primary/5 text-primary' : 'border-border']">
                <text>{{ company.name }}</text>
              </view>
            </view>
          </view>
          <view class="space-y-2">
            <text class="text-sm font-medium">物流单号 <text class="text-primary">*</text></text>
            <input v-model="trackingNo" placeholder="请输入物流单号" class="w-full px-3 py-2.5 bg-background rounded-xl text-sm" />
            <text class="text-xs text-muted-foreground">请仔细核对单号，填写错误将影响买家查询物流</text>
          </view>
          <view v-if="order.products.length > 0" class="p-3 bg-background rounded-xl">
            <text class="text-xs text-muted-foreground mb-2 block">发货商品</text>
            <view class="flex items-center gap-2">
              <view class="w-10 h-10 rounded bg-background flex items-center justify-center">
                <text>📦</text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm truncate block">{{ order.products[0].title }}</text>
                <text class="text-xs text-muted-foreground">x{{ order.products[0].quantity }}</text>
              </view>
            </view>
          </view>
          <view @click="handleShip" :class="['w-full py-3 rounded-xl text-center font-medium', (!trackingNo || !expressCompany || isSubmitting) ? 'opacity-50 bg-primary text-white' : 'bg-primary text-white']">
            <text v-if="isSubmitting"> 确认中...</text>
            <text v-else> 确认发货</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const expressCompanies = [
  { id: 'sf', name: '顺丰速运' },
  { id: 'yd', name: '韵达快递' },
  { id: 'zt', name: '中通快递' },
  { id: 'yt', name: '圆通速递' },
  { id: 'st', name: '申通快递' },
  { id: 'jd', name: '京东物流' },
  { id: 'ems', name: 'EMS' },
  { id: 'db', name: '德邦物流' },
]

const order = ref({
  id: '202401150001',
  status: 'pending',
  createdAt: '2024-01-15 14:30:00',
  paidAt: '2024-01-15 14:32:00',
  payMethod: '微信支付',
  buyer: { name: '张三', phone: '13888888888', address: '北京市朝阳区建国路88号SOHO现代城A座1801室' },
  products: [{ id: '1', title: '滴天髓精解', specs: '精装版', price: 68, quantity: 2 }],
  amounts: { productTotal: 136, shipping: 0, discount: 0, total: 136 },
  remark: '请用气泡膜包装好，谢谢',
  timeline: [
    { time: '2024-01-15 14:32:00', title: '买家已付款', desc: '等待商家发货' },
    { time: '2024-01-15 14:30:00', title: '订单创建', desc: '买家提交订单' },
  ],
})

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待发货', color: 'text-orange-600' },
  shipped: { label: '已发货', color: 'text-blue-600' },
  completed: { label: '已完成', color: 'text-green-600' },
  refunding: { label: '退款中', color: 'text-red-600' },
  cancelled: { label: '已取消', color: 'text-gray-600' },
}

const showShipDialog = ref(false)
const expressCompany = ref('')
const trackingNo = ref('')
const isSubmitting = ref(false)

function copyText(text: string) {
  uni.setClipboardData({ data: text, success: () => { uni.showToast({ title: '已复制', icon: 'none' }) } })
}

async function handleShip() {
  if (!trackingNo.value || !expressCompany.value) return
  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  isSubmitting.value = false
  showShipDialog.value = false
  expressCompany.value = ''
  trackingNo.value = ''
  uni.showToast({ title: '发货成功', icon: 'success' })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
