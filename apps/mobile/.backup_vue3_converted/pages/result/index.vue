<template>
  <view class="min-h-screen" style="background-color: #FAF8F5; max-width: 750rpx; margin: 0 auto;">
    <!-- 加载状态 -->
    <view v-if="loading" style="min-height: 100vh; display: flex; align-items: center; justify-content: center;">
      <text style="font-size: 48rpx; color: #C41E3A;"></text>
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-40" style="background-color: rgba(250,248,245,0.95); border-bottom: 2rpx solid #E8E0D5; backdrop-filter: blur(20rpx);">
        <view class="flex items-center justify-between" style="padding: 0 32rpx; height: 112rpx;">
          <view @click="goBack" style="padding: 16rpx;">
            <text style="font-size: 36rpx; color: #2C2C2C;">←</text>
          </view>
          <text style="font-size: 30rpx; font-weight: 600; color: #2C2C2C;">操作结果</text>
          <view style="width: 72rpx;" />
        </view>
      </view>

      <view style="padding: 48rpx;">
        <!-- 结果图标和信息 -->
        <view class="flex flex-col items-center" style="text-align: center; padding-top: 64rpx; padding-bottom: 48rpx;">
          <!-- 动画图标 + 脉动环 -->
          <view :style="{
            position: 'relative',
            width: '160rpx',
            height: '160rpx',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '48rpx',
            backgroundColor: isSuccess ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            transform: showAnimation ? 'scale(1)' : 'scale(0.5)',
            opacity: showAnimation ? 1 : 0,
            transition: 'all 0.5s'
          }">
            <!-- 脉动环 -->
            <view :style="{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: isSuccess ? '#22C55E' : '#EF4444',
              opacity: 0.3,
              animation: 'ping 1.5s 2'
            }" />
            <!-- 图标 -->
            <text :style="{ fontSize: '72rpx', fontWeight: 'bold', color: isSuccess ? '#22C55E' : '#EF4444' }">
              {{ isSuccess ? '✓' : '✕' }}
            </text>
          </view>

          <!-- 标题 -->
          <text :style="{
            fontSize: '40rpx',
            fontWeight: 700,
            marginBottom: '16rpx',
            color: isSuccess ? '#16A34A' : '#DC2626',
            transform: showAnimation ? 'translateY(0)' : 'translateY(32rpx)',
            opacity: showAnimation ? 1 : 0,
            transition: 'all 0.5s 0.1s'
          }">
            {{ customTitle || resultData.title }}
          </text>

          <!-- 描述 -->
          <text :style="{
            fontSize: '26rpx',
            color: '#999999',
            maxWidth: '640rpx',
            display: 'block',
            transform: showAnimation ? 'translateY(0)' : 'translateY(32rpx)',
            opacity: showAnimation ? 1 : 0,
            transition: 'all 0.5s 0.2s'
          }">
            {{ customDesc || resultData.description }}
          </text>

          <!-- 订单号（成功时显示） -->
          <view v-if="isSuccess && orderId" :style="{
            marginTop: '32rpx',
            padding: '16rpx 32rpx',
            backgroundColor: '#F5F1EB',
            borderRadius: '12rpx',
            transform: showAnimation ? 'translateY(0)' : 'translateY(32rpx)',
            opacity: showAnimation ? 1 : 0,
            transition: 'all 0.5s 0.3s'
          }">
            <text style="font-size: 20rpx; color: #999999;">
              订单号：<text style="color: #2C2C2C;">{{ orderId }}</text>
            </text>
          </view>

          <!-- 失败原因详情 -->
          <view v-if="!isSuccess" :style="{
            marginTop: '32rpx',
            padding: '32rpx',
            borderRadius: '16rpx',
            width: '100%',
            backgroundColor: 'rgba(239,68,68,0.05)',
            border: '2rpx solid rgba(239,68,68,0.2)',
            transform: showAnimation ? 'translateY(0)' : 'translateY(32rpx)',
            opacity: showAnimation ? 1 : 0,
            transition: 'all 0.5s 0.3s'
          }">
            <view class="flex items-start" style="gap: 24rpx;">
              <text style="font-size: 36rpx; color: #DC2626; flex-shrink: 0; margin-top: 4rpx;">⚠</text>
              <view style="text-align: left;">
                <text style="font-size: 26rpx; font-weight: 500; color: #DC2626; display: block;">失败原因</text>
                <text style="font-size: 22rpx; color: #999999; margin-top: 8rpx; display: block;">
                  {{ customDesc || resultData.description }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view :style="{
          transform: showAnimation ? 'translateY(0)' : 'translateY(32rpx)',
          opacity: showAnimation ? 1 : 0,
          transition: 'all 0.5s 0.4s'
        }">
          <view @click="navigateTo(resultData.primaryBtn.href)"
            :style="{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '96rpx',
              borderRadius: '16rpx',
              fontWeight: 500,
              fontSize: '26rpx',
              backgroundColor: isSuccess ? '#C41E3A' : '#DC2626',
              color: '#FFFFFF',
              marginBottom: '24rpx'
            }">
            <text>{{ resultData.primaryBtn.text }}</text>
          </view>

          <view v-if="resultData.secondaryBtn" @click="navigateTo(resultData.secondaryBtn.href)"
            style="display: flex; align-items: center; justify-content: center; width: 100%; height: 96rpx; border-radius: 16rpx; font-weight: 500; font-size: 26rpx; background-color: #F5F1EB; color: #2C2C2C;">
            <text>{{ resultData.secondaryBtn.text }}</text>
          </view>
        </view>

        <!-- 推荐区（成功时显示） -->
        <view v-if="isSuccess" :style="{
          marginTop: '64rpx',
          transform: showAnimation ? 'translateY(0)' : 'translateY(32rpx)',
          opacity: showAnimation ? 1 : 0,
          transition: 'all 0.5s 0.5s'
        }">
          <view class="flex items-center justify-between" style="margin-bottom: 32rpx;">
            <view class="flex items-center" style="gap: 16rpx;">
              <text style="font-size: 28rpx; color: #C9A96E;"></text>
              <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C;">猜你喜欢</text>
            </view>
            <view @click="navigateTo('/pages/discover/index')" class="flex items-center" style="gap: 8rpx; font-size: 22rpx; color: #999999;">
              <text>更多</text>
              <text>›</text>
            </view>
          </view>

          <view v-for="item in recommendations" :key="item.id" @click="navigateTo(item.type === 'course' ? '/pages/course/' + item.id + '/index' : '/pages/circle/' + item.id + '/index')"
            class="flex items-center" style="gap: 24rpx; padding: 24rpx; background-color: #FFFFFF; border-radius: 16rpx; margin-bottom: 24rpx;">
            <view style="width: 128rpx; height: 128rpx; border-radius: 16rpx; background-color: #F5F1EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <text :style="{ fontSize: '40rpx', color: item.type === 'course' ? 'rgba(201,169,110,0.6)' : 'rgba(196,30,58,0.6)' }">
                {{ item.type === 'course' ? '' : '' }}
              </text>
            </view>
            <view style="flex: 1; min-width: 0;">
              <view class="flex items-center" style="gap: 16rpx;">
                <text style="font-size: 18rpx; padding: 2rpx 12rpx; background-color: #F5F1EB; color: #999999; border-radius: 4rpx;">
                  {{ item.type === 'course' ? '课程' : '圈子' }}
                </text>
                <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ item.title }}
                </text>
              </view>
              <text style="font-size: 22rpx; color: #999999; margin-top: 8rpx; display: block;">
                {{ item.type === 'course' ? item.students + '人学习' : item.members + '成员' }}
              </text>
              <text v-if="item.type === 'course' && item.price" style="font-size: 26rpx; color: #C41E3A; font-weight: 500; margin-top: 8rpx; display: block;">
                ¥{{ item.price }}
              </text>
            </view>
            <text style="font-size: 24rpx; color: #999999; flex-shrink: 0;">›</text>
          </view>
        </view>

        <!-- 帮助入口（失败时显示） -->
        <view v-if="!isSuccess" :style="{
          marginTop: '64rpx',
          textAlign: 'center',
          transform: showAnimation ? 'translateY(0)' : 'translateY(32rpx)',
          opacity: showAnimation ? 1 : 0,
          transition: 'all 0.5s 0.5s'
        }">
          <text style="font-size: 26rpx; color: #999999; margin-bottom: 16rpx; display: block;">遇到问题？</text>
          <text @click="navigateTo('/pages/help/index')" style="font-size: 26rpx; color: #C41E3A;">联系客服获取帮助</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface ResultConfig {
  title: string
  description: string
  primaryBtn: { text: string; href: string }
  secondaryBtn?: { text: string; href: string }
}

const resultConfigs: Record<string, { success: ResultConfig; failed: ResultConfig }> = {
  payment: {
    success: { title: '支付成功', description: '订单已支付完成，我们已开始为您准备商品', primaryBtn: { text: '查看订单', href: '/pages/orders/index' }, secondaryBtn: { text: '继续逛逛', href: '/pages/mall/index' } },
    failed: { title: '支付失败', description: '余额不足，请充值后重试', primaryBtn: { text: '重新支付', href: '/pages/checkout/index' }, secondaryBtn: { text: '返回首页', href: '/pages/index' } },
  },
  enroll: {
    success: { title: '报名成功', description: '您已成功报名，请准时参加课程', primaryBtn: { text: '查看详情', href: '/pages/reservations/index' }, secondaryBtn: { text: '返回首页', href: '/pages/index' } },
    failed: { title: '报名失败', description: '名额已满，请选择其他场次', primaryBtn: { text: '重新报名', href: '' }, secondaryBtn: { text: '返回首页', href: '/pages/index' } },
  },
  submit: {
    success: { title: '提交成功', description: '您的申请已提交，我们将在1-3个工作日内审核', primaryBtn: { text: '查看进度', href: '/pages/submissions/index' }, secondaryBtn: { text: '返回首页', href: '/pages/index' } },
    failed: { title: '提交失败', description: '网络异常，请稍后重试', primaryBtn: { text: '重新提交', href: '' }, secondaryBtn: { text: '返回首页', href: '/pages/index' } },
  },
  verify: {
    success: { title: '认证成功', description: '您的实名认证已通过审核', primaryBtn: { text: '返回设置', href: '/pages/settings/index' }, secondaryBtn: { text: '返回首页', href: '/pages/index' } },
    failed: { title: '认证失败', description: '证件信息不清晰，请重新上传', primaryBtn: { text: '重新认证', href: '/pages/verification/index' }, secondaryBtn: { text: '返回首页', href: '/pages/index' } },
  },
  join: {
    success: { title: '加入成功', description: '欢迎加入圈子，开始您的学习之旅', primaryBtn: { text: '进入圈子', href: '/pages/circle/1/home/index' }, secondaryBtn: { text: '继续发现', href: '/pages/circle/index' } },
    failed: { title: '加入失败', description: '支付未完成，请重试', primaryBtn: { text: '重新加入', href: '/pages/circle/1/index' }, secondaryBtn: { text: '返回首页', href: '/pages/index' } },
  },
  purchase: {
    success: { title: '购买成功', description: '课程已解锁，立即开始学习吧', primaryBtn: { text: '开始学习', href: '/pages/learn/1/index' }, secondaryBtn: { text: '查看订单', href: '/pages/orders/index' } },
    failed: { title: '购买失败', description: '支付过程中出现问题，请重试', primaryBtn: { text: '重新购买', href: '/pages/course/1/index' }, secondaryBtn: { text: '返回首页', href: '/pages/index' } },
  },
}

const recommendations = [
  { id: 1, type: 'course', title: '紫微斗数精讲', price: 299, image: '', students: 856 },
  { id: 2, type: 'course', title: '八字进阶实战', price: 399, image: '', students: 1024 },
  { id: 3, type: 'circle', title: '风水堪舆学院', members: 2560, image: '' },
]

const loading = ref(true)
const type = ref('payment')
const status = ref('success')
const orderId = ref('')
const customTitle = ref('')
const customDesc = ref('')
const showAnimation = ref(false)

onMounted(() => {
  // 获取路由参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage && currentPage.$page && currentPage.$page.options) {
    const params = currentPage.$page.options
    type.value = params.type || 'payment'
    status.value = params.status || 'success'
    orderId.value = params.orderId || '20260509' + String(Math.random()).slice(2, 8)
    customTitle.value = params.title || ''
    customDesc.value = params.desc || ''
  }

  // 模拟加载延迟
  setTimeout(() => {
    loading.value = false
    // 触发入场动画
    setTimeout(() => {
      showAnimation.value = true
    }, 50)
  }, 300)
})

const config = computed(() => resultConfigs[type.value] || resultConfigs.payment)
const resultData = computed(() => status.value === 'success' ? config.value.success : config.value.failed)
const isSuccess = computed(() => status.value === 'success')

function navigateTo(url: string) {
  if (!url) {
    uni.navigateBack()
    return
  }
  uni.navigateTo({ url })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.items-start { align-items: flex-start; }
.flex-col { flex-direction: column; }

@keyframes ping {
  0% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.5); opacity: 0.1; }
  100% { transform: scale(1); opacity: 0; }
}
</style>
