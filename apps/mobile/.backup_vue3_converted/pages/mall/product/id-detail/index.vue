<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 响应式布局 -->
    <view class="lg:flex lg:max-w-6xl lg:mx-auto lg:gap-6 lg:p-6">
      <!-- 左侧图片区 -->
      <view class="lg:w-[480px] lg:flex-shrink-0">
        <view class="lg:rounded-xl lg:overflow-hidden lg:sticky lg:top-6">
          <view class="relative">
            <!-- 返回按钮 -->
            <view class="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center" @click="goBack">
              <text class="text-xl text-foreground">←</text>
            </view>
            <!-- 分享按钮 -->
            <view class="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center" @click="handleShare">
              <text class="text-lg text-foreground"></text>
            </view>

            <!-- 轮播图 -->
            <swiper
              :indicator-dots="false"
              :autoplay="false"
              :current="activeImage"
              @change="(e: any) => activeImage = e.detail.current"
              class="w-full aspect-square bg-[#F2EFEA]"
            >
              <swiper-item v-for="(img, index) in productData.images" :key="index">
                <view class="w-full h-full relative">
                  <image :src="img" mode="aspectFill" class="w-full h-full" />
                  <!-- 视频标识（第一张） -->
                  <view v-if="index === 0 && productData.hasVideo" class="absolute inset-0 flex items-center justify-center">
                    <view class="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                      <text class="text-white text-2xl ml-0.5">▶</text>
                    </view>
                  </view>
                </view>
              </swiper-item>
            </swiper>

            <!-- 轮播指示器 -->
            <view class="absolute bottom-4 right-4 px-2 py-1 rounded-full bg-black/50 text-xs text-white">
              {{ activeImage + 1 }} / {{ productData.images.length }}
            </view>
          </view>
        </view>
      </view>

      <!-- 右侧信息区 -->
      <view class="lg:flex-1 lg:min-w-0">
        <!-- 营销位 -->
        <view class="px-4 pt-4 space-y-2">
          <!-- 拼团信息 -->
          <view class="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 rounded-xl px-4 py-3">
            <view class="flex items-center justify-between">
              <view class="flex items-center gap-3">
                <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <text class="text-lg"></text>
                </view>
                <view>
                  <text class="text-sm font-medium text-foreground">3人拼团价 ¥48</text>
                  <text class="text-xs text-muted-foreground">原价¥68 · 已有1人参团 · 24小时后结束</text>
                </view>
              </view>
              <view class="px-3 py-1 bg-primary text-white text-xs rounded-full">去拼团</view>
            </view>
          </view>
          <!-- 优惠券领取 -->
          <view class="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/30 rounded-xl px-4 py-3 flex items-center justify-between">
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <text class="text-lg">️</text>
              </view>
              <view>
                <text class="text-sm font-medium text-foreground">满{{ productData.coupon.threshold }}减{{ productData.coupon.value }}</text>
                <text class="text-xs text-muted-foreground">限时领取优惠券</text>
              </view>
            </view>
            <view class="px-3 py-1 bg-primary text-white text-xs rounded-full">领取</view>
          </view>
        </view>

        <!-- 价格与促销区 -->
        <view class="bg-white mx-4 mt-4 p-4 rounded-2xl shadow-sm">
          <view class="flex items-baseline gap-2">
            <text class="text-primary font-bold text-2xl">¥{{ productData.price }}</text>
            <text class="text-muted-foreground line-through text-sm">¥{{ productData.originalPrice }}</text>
            <text class="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded">{{ Math.round((1 - productData.price / productData.originalPrice) * 100) }}% OFF</text>
          </view>
          <text class="text-lg font-semibold text-foreground mt-3 block">{{ productData.title }}</text>
          <text class="text-sm text-muted-foreground mt-1 block">{{ productData.subtitle }}</text>
          <view class="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <text>销量 {{ productData.sales }}</text>
            <text>库存 {{ productData.stock }}</text>
          </view>
          <!-- 优惠券入口 -->
          <view
            class="flex items-center justify-between w-full mt-3 py-2 px-3 rounded-lg bg-primary/5 border border-primary/20"
            @click="showCouponTip = !showCouponTip"
          >
            <view class="flex items-center gap-2">
              <text class="px-1.5 py-0.5 bg-primary text-white text-[10px] rounded">券</text>
              <text class="text-sm text-foreground">满{{ productData.coupon.threshold }}减{{ productData.coupon.value }}</text>
            </view>
            <text class="text-xs text-primary">领取 ›</text>
          </view>
        </view>

        <!-- 规格选择入口 -->
        <view class="bg-white mx-4 mt-3 p-4 rounded-2xl shadow-sm" @click="openSpecPanel('cart')">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground">规格</text>
              <text class="text-sm text-foreground">{{ selectedSpecLabels }}</text>
            </view>
            <text class="text-muted-foreground text-lg">›</text>
          </view>
        </view>

        <!-- 服务保障 -->
        <view class="bg-white mx-4 mt-3 p-4 rounded-2xl shadow-sm">
          <text class="text-sm font-medium text-foreground mb-3 block">服务保障</text>
          <view class="grid grid-cols-2 gap-3">
            <view v-for="svc in services" :key="svc.label" class="flex items-center gap-2">
              <view class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <text>{{ svc.icon }}</text>
              </view>
              <view>
                <text class="text-xs font-medium text-foreground block">{{ svc.label }}</text>
                <text class="text-[10px] text-muted-foreground block">{{ svc.desc }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 商品评价 -->
        <view class="bg-white mx-4 mt-3 p-4 rounded-2xl shadow-sm">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="font-medium text-foreground">商品评价</text>
              <text class="text-sm text-muted-foreground">({{ productData.reviewCount }})</text>
            </view>
            <view class="flex items-center gap-1">
              <text class="text-sm text-accent font-medium">{{ productData.rating }}</text>
              <text class="text-yellow-400 text-sm">★</text>
            </view>
          </view>
          <!-- 评价标签 -->
          <view class="flex flex-wrap gap-2 mt-3">
            <view v-for="tag in productData.tags" :key="tag" class="px-2.5 py-1 text-xs border border-border text-muted-foreground rounded-full">{{ tag }}</view>
          </view>
          <!-- 评价列表 -->
          <view class="mt-2">
            <view v-for="review in productData.reviews.slice(0, 2)" :key="review.id" class="py-3 border-b border-[#F2EFEA] last:border-b-0">
              <view class="flex items-center gap-2">
                <view class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
                  <image v-if="review.user.avatar" :src="review.user.avatar" mode="aspectFill" class="w-full h-full" />
                  <text v-else class="text-xs font-medium text-primary">{{ review.user.name.charAt(0) }}</text>
                </view>
                <view class="flex-1">
                  <text class="text-sm text-foreground block">{{ review.user.name }}</text>
                  <view class="flex items-center gap-0.5">
                    <text v-for="s in 5" :key="s" :class="['text-xs', s <= review.rating ? 'text-yellow-400' : 'text-[#E8E0D5]']">★</text>
                  </view>
                </view>
                <text class="text-xs text-muted-foreground shrink-0">{{ review.date }}</text>
              </view>
              <text class="text-sm text-ink-soft mt-2 block">{{ review.content }}</text>
              <view v-if="review.images.length > 0 && review.images[0]" class="flex gap-2 mt-2">
                <image v-for="(src, idx) in review.images.filter(Boolean)" :key="idx" :src="src" mode="aspectFill" class="w-16 h-16 rounded-lg" />
              </view>
              <view class="flex items-center justify-between mt-2">
                <text class="text-xs text-muted-foreground">{{ review.spec }}</text>
                <view class="flex items-center gap-1 text-xs text-muted-foreground">
                  <text></text>
                  <text>{{ review.likes }}</text>
                </view>
              </view>
            </view>
          </view>
          <view class="w-full mt-2 py-2 text-sm text-muted-foreground text-center" @click="goReviews">查看全部评价 ›</view>
        </view>

        <!-- 详情介绍 -->
        <view class="bg-white mx-4 mt-3 p-4 rounded-2xl shadow-sm">
          <text class="font-medium text-foreground mb-3 block">商品详情</text>
          <text class="text-sm text-ink-soft whitespace-pre-line leading-relaxed block">{{ productData.description }}</text>
          <view class="mt-4 space-y-2">
            <view v-for="i in 3" :key="i" class="aspect-[4/3] bg-[#F2EFEA] rounded-lg flex items-center justify-center">
              <text class="text-xs text-muted-foreground">商品详情图 {{ i }}</text>
            </view>
          </view>
        </view>

        <!-- PC端右侧购买卡片 -->
        <view class="hidden lg:block mt-6 p-4 bg-white rounded-xl border border-border">
          <view class="flex items-baseline gap-2 mb-4">
            <text class="text-primary font-bold text-3xl">¥{{ productData.price }}</text>
            <text class="text-muted-foreground line-through">¥{{ productData.originalPrice }}</text>
          </view>
          <view class="space-y-3">
            <view class="w-full h-12 rounded-lg bg-gradient-to-r from-primary to-[#E74C3C] text-white font-semibold flex items-center justify-center shadow-lg" @click="openSpecPanel('buy')">
              立即购买
            </view>
            <view class="w-full h-12 rounded-lg bg-accent/20 text-accent font-semibold flex items-center justify-center" @click="openSpecPanel('cart')">
              加入购物车
            </view>
          </view>
          <view class="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            <text>正品保障</text>
            <text>•</text>
            <text>7天退换</text>
            <text>•</text>
            <text>急速发货</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 - 仅移动端 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3 flex items-center gap-3 z-30 lg:hidden" style="padding-bottom: calc(12px + env(safe-area-inset-bottom))">
      <view class="flex items-center gap-4">
        <view class="flex flex-col items-center gap-0.5" @click="handleCustomerService">
          <text class="text-lg text-muted-foreground"></text>
          <text class="text-[10px] text-muted-foreground">客服</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 relative">
          <text class="text-lg text-muted-foreground"></text>
          <text class="text-[10px] text-muted-foreground">购物车</text>
          <text v-if="cartCount > 0" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">
            {{ cartCount }}
          </text>
        </view>
        <view class="flex flex-col items-center gap-0.5" @click="isFavorite = !isFavorite">
          <text :class="['text-lg', isFavorite ? 'text-primary' : 'text-muted-foreground']"></text>
          <text class="text-[10px] text-muted-foreground">收藏</text>
        </view>
      </view>
      <view class="flex-1 flex gap-2">
        <view class="flex-1 h-11 rounded-full bg-accent/20 text-accent font-medium text-sm flex items-center justify-center" @click="openSpecPanel('cart')">
          加入购物车
        </view>
        <view class="flex-1 h-11 rounded-full bg-gradient-to-r from-primary to-[#E74C3C] text-white font-medium text-sm flex items-center justify-center" @click="openSpecPanel('buy')">
          立即购买
        </view>
      </view>
    </view>

    <!-- 规格选择面板 -->
    <view v-if="showSpecPanel" class="fixed inset-0 z-50">
      <view class="fixed inset-0 bg-black/50" @click="showSpecPanel = false" />
      <view class="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[80vh] overflow-y-auto" style="padding-bottom: calc(env(safe-area-inset-bottom) + 16px)">
        <view class="p-4">
          <!-- 头部 -->
          <view class="flex gap-4 pb-4 border-b border-border">
            <view class="w-24 h-24 rounded-lg bg-[#F2EFEA] flex items-center justify-center flex-shrink-0">
              <text class="text-3xl text-muted-foreground/30">📦</text>
            </view>
            <view class="flex-1">
              <view class="flex items-baseline gap-1">
                <text class="text-primary font-bold text-2xl">¥{{ currentPrice }}</text>
              </view>
              <text class="text-sm text-muted-foreground mt-1 block">库存 {{ currentStock }} 件</text>
              <text class="text-sm text-muted-foreground">已选：{{ selectedSpecLabels || '请选择规格' }}</text>
            </view>
          </view>

          <!-- 规格选项 -->
          <view class="py-4 space-y-4">
            <view v-for="spec in productData.specs" :key="spec.name">
              <text class="text-sm font-medium text-foreground mb-2 block">{{ spec.name }}</text>
              <view class="flex flex-wrap gap-2">
                <view
                  v-for="option in spec.options"
                  :key="option.id"
                  :class="['px-4 py-2 rounded-lg text-sm transition-colors', selectedSpecs[spec.name] === option.id ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-foreground']"
                  @click="handleSelectSpec(spec.name, option.id)"
                >
                  <text>{{ option.label }}{{ option.price > 0 && spec.name === '版本' ? ' ¥' + option.price : '' }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="flex gap-3 pt-4 border-t border-border">
            <view class="flex-1 h-12 rounded-full bg-accent/20 text-accent font-medium flex items-center justify-center" @click="handleAddToCart">
              加入购物车
            </view>
            <view class="flex-1 h-12 rounded-full bg-gradient-to-r from-primary to-[#E74C3C] text-white font-medium flex items-center justify-center" @click="handleBuyNow">
              立即购买
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface ReviewImage {
  id: number
  user: { name: string; avatar: string }
  rating: number
  content: string
  images: string[]
  date: string
  likes: number
  spec: string
}

const productData = {
  id: 1,
  title: '周易正义·十三经注疏本（全四册）',
  subtitle: '唐·孔颖达 疏',
  hasVideo: true,
  images: [
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=800&q=80',
  ],
  price: 68,
  originalPrice: 128,
  sales: 2341,
  stock: 856,
  coupon: { value: 10, threshold: 99 },
  specs: [
    {
      name: '版本',
      options: [
        { id: 'standard', label: '标准版', price: 68, stock: 500 },
        { id: 'deluxe', label: '精装版', price: 128, stock: 200 },
        { id: 'collector', label: '收藏版', price: 268, stock: 50 },
      ],
    },
    {
      name: '数量',
      options: [
        { id: '1', label: '1套', price: 0, stock: 999 },
        { id: '2', label: '2套', price: 0, stock: 999 },
        { id: '3', label: '3套', price: 0, stock: 999 },
      ],
    },
  ],
  rating: 4.9,
  reviewCount: 1256,
  tags: ['质量好', '包装精美', '内容详实', '印刷清晰'],
  reviews: [
    {
      id: 1,
      user: { name: '易学爱好者', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80' },
      rating: 5,
      content: '非常好的版本，注疏详尽，印刷质量很高，纸张也很好。作为入门和进阶学习周易的必备书籍。',
      images: [
        'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&q=80',
      ],
      date: '2024-03-15',
      likes: 128,
      spec: '精装版',
    },
    {
      id: 2,
      user: { name: '国学传承', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80' },
      rating: 5,
      content: '孔颖达的正义注疏是研究周易的权威版本，这个出版质量很好，值得收藏。',
      images: [],
      date: '2024-03-10',
      likes: 86,
      spec: '收藏版',
    },
    {
      id: 3,
      user: { name: '命理研究', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80' },
      rating: 4,
      content: '书的内容没话说，就是物流有点慢，等了好几天。整体还是很满意的。',
      images: ['https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=200&q=80'],
      date: '2024-03-08',
      likes: 45,
      spec: '标准版',
    },
  ],
  description: `《周易正义》是唐代孔颖达等奉敕编撰的儒家经典注疏，是"十三经注疏"之一，也是现存最早、最权威的《周易》注疏本。

本书特点：
• 原文+注释+疏解三位一体
• 采用宋刻底本，校勘精审
• 繁体竖排，古籍原貌
• 全四册精装，便于翻阅收藏

适合人群：
• 周易研究者、国学爱好者
• 命理学、风水学从业者
• 高校古典文献学专业师生
• 传统文化收藏爱好者`,
}

const services = [
  { icon: '🛡️', label: '正品保障', desc: '假一赔十' },
  { icon: '🚚', label: '急速发货', desc: '48小时内' },
  { icon: '', label: '7天退换', desc: '无理由退换' },
  { icon: '', label: '品质认证', desc: '平台严选' },
]

const activeImage = ref(0)
const isFavorite = ref(false)
const cartCount = ref(2)
const showSpecPanel = ref(false)
const showCouponTip = ref(false)
const selectedSpecs = ref<Record<string, string>>({ '版本': 'standard', '数量': '1' })

const currentPrice = computed(() => {
  const versionSpec = productData.specs.find(s => s.name === '版本')
  const selectedOption = versionSpec?.options.find(o => o.id === selectedSpecs.value['版本'])
  return selectedOption?.price || productData.price
})

const currentStock = computed(() => {
  const versionSpec = productData.specs.find(s => s.name === '版本')
  const selectedOption = versionSpec?.options.find(o => o.id === selectedSpecs.value['版本'])
  return selectedOption?.stock || productData.stock
})

const selectedSpecLabels = computed(() => {
  return Object.entries(selectedSpecs.value).map(([key, value]) => {
    const spec = productData.specs.find(s => s.name === key)
    const option = spec?.options.find(o => o.id === value)
    return option?.label
  }).join('、')
})

function handleSelectSpec(specName: string, optionId: string) {
  selectedSpecs.value[specName] = optionId
}

function openSpecPanel(action: 'cart' | 'buy') {
  showSpecPanel.value = true
}

function handleAddToCart() {
  cartCount.value++
  showSpecPanel.value = false
  uni.showToast({ title: '已加入购物车', icon: 'success' })
}

function handleBuyNow() {
  showSpecPanel.value = false
  uni.navigateTo({ url: '/pages/courses/purchase-confirm/index' })
}

function goBack() { uni.navigateBack() }
function handleShare() { uni.showToast({ title: '分享已开启', icon: 'none' }) }
function handleCustomerService() { uni.showToast({ title: '客服已接入', icon: 'none' }) }
function goReviews() { uni.navigateTo({ url: '/pages/mall/product/id-detail/reviews/index' }) }
</script>

<style scoped>
</style>
