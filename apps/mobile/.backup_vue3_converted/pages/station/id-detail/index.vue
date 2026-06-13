<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="fixed top-0 left-0 right-0 z-50">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="p-2 rounded-full" style="background-color:rgba(0,0,0,0.3)" @click="goBack">
          <text class="text-white text-lg">←</text>
        </view>
        <view class="flex items-center gap-2">
          <view class="p-2 rounded-full" style="background-color:rgba(0,0,0,0.3)" @click="isCollected = !isCollected">
            <text :class="['text-lg', isCollected ? 'text-primary' : 'text-white']">{{ isCollected ? '♥' : '♡' }}</text>
          </view>
          <view class="p-2 rounded-full" style="background-color:rgba(0,0,0,0.3)">
            <text class="text-white text-lg"></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 封面轮播 -->
    <view class="relative aspect-video" style="background-color:#F1EDE8">
      <view class="absolute inset-0 flex items-center justify-center" style="background:linear-gradient(135deg,rgba(196,30,58,0.2),rgba(201,169,110,0.1),rgba(241,237,232,1))">
        <text class="text-6xl opacity-30"></text>
      </view>
      <view v-if="stationData.covers[currentCover]?.caption" class="absolute bottom-3 left-3 px-2 py-1 rounded text-xs text-white" style="background-color:rgba(0,0,0,0.5)">
        <text>{{ stationData.covers[currentCover].caption }}</text>
      </view>
      <!-- 轮播指示器 -->
      <view class="absolute bottom-3 right-3 flex gap-1.5">
        <view
          v-for="(_, index) in stationData.covers"
          :key="index"
          class="w-2 h-2 rounded-full transition-colors"
          :class="currentCover === index ? 'bg-white' : 'bg-white/40'"
          @click="currentCover = index"
        />
      </view>
    </view>

    <!-- 驿站信息区 -->
    <view class="px-4 py-4 bg-white border-b border-border">
      <view class="flex items-start justify-between mb-3">
        <view>
          <text class="text-lg font-bold text-foreground">{{ stationData.name }}</text>
          <view class="flex items-center gap-2 mt-1">
            <view class="flex items-center gap-1">
              <text class="text-base" style="color:#C9A96E"></text>
              <text class="text-sm font-medium" style="color:#C9A96E">{{ stationData.rating }}</text>
            </view>
            <text class="text-xs text-muted-foreground">{{ stationData.reviewCount }}条评价</text>
            <view class="text-[10px] px-1.5 py-0.5 rounded border text-primary" style="border-color:rgba(196,30,58,0.3)">
              <text>{{ stationData.distance }}</text>
            </view>
          </view>
        </view>
      </view>

      <text class="text-sm text-muted-foreground block mb-4">{{ stationData.description }}</text>

      <!-- 地址、电话、营业时间 -->
      <view class="space-y-2.5">
        <view class="flex items-center gap-3">
          <view class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background-color:rgba(196,30,58,0.1)">
            <text class="text-base" style="color:#C41E3A">📍</text>
          </view>
          <text class="flex-1 text-sm text-foreground">{{ stationData.address }}</text>
          <view class="px-3 py-1.5 rounded-full text-xs font-medium text-white" style="background-color:#C41E3A">
            <text>导航</text>
          </view>
        </view>
        <view class="flex items-center gap-3">
          <view class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background-color:rgba(201,169,110,0.1)">
            <text class="text-base" style="color:#C9A96E">📞</text>
          </view>
          <text class="flex-1 text-sm text-foreground">{{ stationData.phone }}</text>
          <view class="px-3 py-1.5 rounded-full text-xs font-medium border" style="border-color:#C41E3A;color:#C41E3A">
            <text>拨打</text>
          </view>
        </view>
        <view class="flex items-center gap-3">
          <view class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#F1EDE8]">
            <text class="text-base text-muted-foreground">🕐</text>
          </view>
          <text class="flex-1 text-sm text-muted-foreground">营业时间：{{ stationData.hours }}</text>
        </view>
      </view>
    </view>

    <!-- 近期课程 -->
    <view class="px-4 py-4">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text class="text-base" style="color:#C41E3A"></text>
          <text class="font-semibold text-base text-foreground">近期课程</text>
        </view>
        <view class="flex items-center gap-1 text-xs text-muted-foreground" @click="goTo('/station/' + stationData.id + '/courses')">
          <text>全部课程</text>
          <text class="text-sm">›</text>
        </view>
      </view>
      <scroll-view scroll-x class="flex gap-3 pb-2" style="white-space:nowrap">
        <view v-for="course in stationData.courses" :key="course.id" class="inline-block w-48 flex-shrink-0 mr-3" @click="goTo('/course/' + course.id)">
          <view class="bg-white rounded-xl overflow-hidden">
            <view class="aspect-[4/3] flex items-center justify-center relative bg-[#F1EDE8]">
              <text class="text-3xl text-muted-foreground/30"></text>
              <view v-if="course.enrolled >= course.seats" class="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium text-white" style="background-color:#EF4444">
                <text>已满</text>
              </view>
            </view>
            <view class="p-3">
              <text class="text-sm font-medium text-foreground block truncate">{{ course.title }}</text>
              <view class="flex items-center gap-2 mt-1.5">
                <text class="text-xs text-muted-foreground">{{ course.date }}</text>
                <text class="text-xs text-muted-foreground">{{ course.time }}</text>
              </view>
              <view class="flex items-center justify-between mt-2">
                <text class="text-sm font-medium" style="color:#C41E3A">¥{{ course.price }}</text>
                <text class="text-[10px] text-muted-foreground">{{ course.enrolled }}/{{ course.seats }}人</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 驿站好物 -->
    <view class="px-4 py-4">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text class="text-base" style="color:#C9A96E"></text>
          <text class="font-semibold text-base text-foreground">驿站好物</text>
        </view>
        <view class="flex items-center gap-1 text-xs text-muted-foreground" @click="goTo('/station/' + stationData.id + '/products')">
          <text>全部商品</text>
          <text class="text-sm">›</text>
        </view>
      </view>
      <view class="grid grid-cols-2 gap-3">
        <view v-for="product in stationData.products" :key="product.id" class="bg-white rounded-xl overflow-hidden" @click="goTo('/mall/product/' + product.id)">
          <view class="aspect-square flex items-center justify-center bg-[#F1EDE8]">
            <text class="text-3xl text-muted-foreground/30"></text>
          </view>
          <view class="p-2.5">
            <text class="text-xs font-medium text-foreground block line-clamp-2">{{ product.name }}</text>
            <view class="flex items-center gap-2 mt-1.5">
              <text class="text-sm font-medium" style="color:#C41E3A">¥{{ product.price }}</text>
              <text class="text-[10px] text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
            </view>
            <text class="text-[10px] text-muted-foreground block">已售{{ product.sales }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 环境预览 -->
    <view class="px-4 py-4">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text class="text-base" style="color:#C41E3A"></text>
          <text class="font-semibold text-base text-foreground">环境预览</text>
        </view>
        <text class="text-xs text-muted-foreground">{{ stationData.photos.length }}张</text>
      </view>
      <view class="grid grid-cols-3 gap-2">
        <view
          v-for="(photo, index) in stationData.photos"
          :key="photo.id"
          class="relative aspect-square rounded-lg overflow-hidden bg-[#F1EDE8]"
          @click="selectedPhoto = index"
        >
          <view class="absolute inset-0 flex items-center justify-center">
            <text class="text-2xl text-muted-foreground/30"></text>
          </view>
          <view class="absolute bottom-0 left-0 right-0 px-1.5 py-1" style="background:linear-gradient(to top,rgba(0,0,0,0.5),transparent)">
            <text class="text-[10px] text-white">{{ photo.caption }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 学员评价 -->
    <view class="px-4 py-4">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text class="text-base" style="color:#C9A96E"></text>
          <text class="font-semibold text-base text-foreground">学员评价</text>
          <text class="text-xs text-muted-foreground">({{ stationData.reviewCount }})</text>
        </view>
        <view class="flex items-center gap-1 text-xs text-muted-foreground">
          <text>全部评价</text>
          <text class="text-sm">›</text>
        </view>
      </view>
      <view class="space-y-3">
        <view v-for="review in stationData.reviews" :key="review.id" class="p-3 bg-white rounded-xl">
          <view class="flex items-center gap-2 mb-2">
            <view class="w-8 h-8 rounded-full flex items-center justify-center bg-[#F1EDE8] text-xs text-foreground">
              <text>{{ review.user[0] }}</text>
            </view>
            <view class="flex-1">
              <text class="text-sm font-medium text-foreground">{{ review.user }}</text>
              <view class="flex items-center gap-0.5">
                <text v-for="i in 5" :key="i" :class="['text-xs', i <= review.rating ? 'text-accent' : 'text-muted-foreground/30']"></text>
              </view>
            </view>
            <text class="text-[10px] text-muted-foreground">{{ review.date }}</text>
          </view>
          <text class="text-sm text-muted-foreground line-clamp-2">{{ review.content }}</text>
        </view>
      </view>
    </view>

    <!-- 图片预览弹窗 -->
    <view v-if="selectedPhoto !== null" class="fixed inset-0 z-50 flex items-center justify-center" style="background-color:rgba(0,0,0,0.9)" @click="selectedPhoto = null">
      <view class="absolute top-4 right-4 p-2 rounded-full z-10" style="background-color:rgba(255,255,255,0.1)" @click="selectedPhoto = null">
        <text class="text-white text-lg">✕</text>
      </view>
      <view class="w-full max-w-lg px-4" @click.stop>
        <view class="aspect-square rounded-xl flex items-center justify-center" style="background-color:rgba(255,255,255,0.1)">
          <text class="text-6xl text-white/30"></text>
        </view>
        <text class="text-center text-white text-sm block mt-3">
          {{ stationData.photos[selectedPhoto]?.caption }}
        </text>
      </view>
      <!-- 切换指示器 -->
      <view class="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
        <view
          v-for="(_, index) in stationData.photos"
          :key="index"
          class="w-2 h-2 rounded-full"
          :class="selectedPhoto === index ? 'bg-white' : 'bg-white/30'"
          @click.stop="selectedPhoto = index"
        />
      </view>
    </view>

    <!-- 底部固定操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-border" style="backdrop-filter:blur(12px)">
      <view class="flex items-center gap-3 px-4 h-16">
        <view class="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium text-white" style="background-color:#C41E3A">
          <text class="text-base">🧭</text>
          <text>导航到店</text>
        </view>
        <view class="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border" style="border-color:#C41E3A;color:#C41E3A">
          <text class="text-base">📞</text>
          <text>电话咨询</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const currentCover = ref(0)
const isCollected = ref(false)
const selectedPhoto = ref<number | null>(null)

const stationData = {
  id: 1,
  name: '热卜国学·杭州西湖驿站',
  address: '浙江省杭州市西湖区龙井路88号',
  phone: '0571-88888888',
  hours: '09:00 - 21:00',
  rating: 4.9,
  reviewCount: 256,
  distance: '2.3km',
  description: '热卜国学杭州旗舰驿站，环境优雅，设施齐全，提供八字、风水、紫微等专业课程培训及一对一咨询服务。',
  covers: [
    { id: 1, url: '', caption: '驿站外观' },
    { id: 2, url: '', caption: '茶室环境' },
    { id: 3, url: '', caption: '教学区域' },
  ],
  courses: [
    { id: 1, title: '八字命理入门班', date: '1月15日', time: '14:00', price: 299, seats: 8, enrolled: 5, cover: '' },
    { id: 2, title: '紫微斗数精讲', date: '1月18日', time: '09:30', price: 599, seats: 12, enrolled: 12, cover: '' },
    { id: 3, title: '风水堪舆实战', date: '1月20日', time: '14:00', price: 899, seats: 6, enrolled: 3, cover: '' },
  ],
  products: [
    { id: 1, name: '专业罗盘（台湾原装）', price: 1280, originalPrice: 1580, sales: 86, image: '' },
    { id: 2, name: '《渊海子平》精装版', price: 128, originalPrice: 168, sales: 256, image: '' },
    { id: 3, name: '紫檀木八卦挂件', price: 368, originalPrice: 468, sales: 128, image: '' },
    { id: 4, name: '沉香线香礼盒', price: 198, originalPrice: 258, sales: 312, image: '' },
  ],
  photos: [
    { id: 1, url: '', caption: '茶室' },
    { id: 2, url: '', caption: '书房' },
    { id: 3, url: '', caption: '庭院' },
    { id: 4, url: '', caption: '教室' },
    { id: 5, url: '', caption: '接待区' },
    { id: 6, url: '', caption: '展示厅' },
  ],
  reviews: [
    { id: 1, user: '云中鹤', avatar: '', rating: 5, content: '环境非常好，老师讲解专业细致，学到了很多实用知识，下次还会来。', date: '2025-01-10' },
    { id: 2, user: '紫薇仙子', avatar: '', rating: 5, content: '茶室环境很雅致，适合静下心来学习。课程安排合理，收获满满。', date: '2025-01-08' },
    { id: 3, user: '易学初学者', avatar: '', rating: 4, content: '老师很有耐心，对初学者很友好。就是停车位比较紧张。', date: '2025-01-05' },
  ],
}

function goBack() {
  uni.navigateBack()
}

function goTo(path: string) {
  uni.navigateTo({ url: path })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
