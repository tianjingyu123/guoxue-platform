<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 加载骨架屏 -->
    <template v-if="loading">
      <header class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <view class="flex items-center gap-3">
          <view class="w-8 h-8 rounded-full skeleton-bg" />
          <view class="h-5 w-32 skeleton-bg rounded" />
        </view>
      </header>
      <view class="p-4 space-y-4">
        <view class="h-10 w-full skeleton-bg rounded-lg" />
        <view v-for="i in 4" :key="i" class="h-40 w-full skeleton-bg rounded-lg" />
      </view>
    </template>

    <!-- 主内容 -->
    <template v-else>
      <!-- 顶部导航 -->
      <header class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1 flex-shrink-0">
            <text class="text-lg text-foreground">&#8592;</text>
          </view>
          <text class="text-lg font-semibold text-foreground flex-1">第三方SDK列表</text>
          <view @click="loadSDKList" class="p-1 flex-shrink-0">
            <text class="text-sm text-muted-foreground">&#128260;</text>
          </view>
        </view>
      </header>

      <view class="p-4">
        <!-- 说明卡片 -->
        <view class="p-4 mb-4 rounded-lg" style="background:rgba(0,102,204,0.05);border:1px solid rgba(0,102,204,0.2)">
          <view class="flex items-start gap-3">
            <text class="text-lg text-[#0066CC] mt-0.5 flex-shrink-0">&#128737;&#65039;</text>
            <view class="text-sm" style="color:#004499">
              <text class="font-medium block mb-1" style="color:#004499">关于第三方SDK说明</text>
              <text class="block" style="color:#0055AA">为保障App相关功能的正常运行，我们集成了以下第三方SDK。这些SDK可能会收集您的部分信息，我们已对合作方的信息收集行为进行严格审查，确保符合相关法律法规要求。</text>
            </view>
          </view>
        </view>

        <!-- 搜索框 -->
        <view class="relative mb-4">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#128269;</text>
          <input v-model="searchKeyword" type="text" placeholder="搜索SDK名称或提供方"
            class="w-full h-10 pl-10 pr-4 bg-white rounded-lg text-sm text-foreground placeholder:text-muted-foreground" style="border:1px solid rgba(232,224,213,0.6)" />
        </view>

        <!-- 分类筛选 -->
        <scroll-view scroll-x class="pb-2 mb-4" style="white-space:nowrap;">
          <view class="flex gap-2" style="display:inline-flex;">
            <view v-for="cat in categories" :key="cat.value"
              @click="selectedCategory = cat.value"
              :class="['px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors', selectedCategory === cat.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']">
              {{ cat.label }}
            </view>
          </view>
        </scroll-view>

        <!-- 统计信息 -->
        <text class="text-sm text-muted-foreground block mb-4">共 {{ filteredList.length }} 个第三方SDK</text>

        <!-- SDK列表 -->
        <view class="space-y-3">
          <view v-for="sdk in filteredList" :key="sdk.id" class="bg-white rounded-lg p-4" style="border:1px solid rgba(232,224,213,0.6)">
            <!-- 头部 -->
            <view class="flex items-start justify-between mb-3">
              <view class="flex items-center gap-3">
                <view :class="['w-10 h-10 rounded-lg flex items-center justify-center', getCategoryColor(sdk.category)]">
                  <text>{{ getCategoryIcon(sdk.category) }}</text>
                </view>
                <view>
                  <text class="font-medium text-foreground block">{{ sdk.name }}</text>
                  <text class="text-xs text-muted-foreground block">{{ sdk.provider }}</text>
                </view>
              </view>
              <text :class="['px-2 py-0.5 rounded text-xs whitespace-nowrap', getCategoryColor(sdk.category)]">{{ getCategoryLabel(sdk.category) }}</text>
            </view>

            <!-- 使用目的 -->
            <view class="mb-3">
              <text class="text-xs text-muted-foreground block mb-1">使用目的</text>
              <text class="text-sm text-foreground block">{{ sdk.purpose }}</text>
            </view>

            <!-- 收集信息 -->
            <view class="mb-3">
              <text class="text-xs text-muted-foreground block mb-1">收集的信息类型</text>
              <view class="flex flex-wrap gap-1">
                <text v-for="(data, idx) in sdk.collectedData" :key="idx" class="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">{{ data }}</text>
              </view>
            </view>

            <!-- 链接 -->
            <view class="flex items-center gap-4 pt-2 text-xs" style="border-top:1px solid rgba(232,224,213,0.6)">
              <view @click="openLink(sdk.privacyPolicyUrl)" class="text-primary flex items-center gap-1">
                <text>&#128737;&#65039;</text>
                <text>隐私政策</text>
                <text>&#8599;</text>
              </view>
              <view v-if="sdk.officialWebsite" @click="openLink(sdk.officialWebsite)" class="text-muted-foreground flex items-center gap-1">
                <text>官方网站</text>
                <text>&#8599;</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="filteredList.length === 0" class="text-center py-12">
          <text class="text-5xl text-muted-foreground/30 block mb-3">&#128269;</text>
          <text class="text-sm text-muted-foreground block">未找到匹配的SDK</text>
        </view>

        <!-- 底部说明 -->
        <view class="mt-6 p-4 rounded-lg" style="background:rgba(240,235,229,0.5)">
          <text class="text-xs text-muted-foreground leading-relaxed block">
            <text class="font-medium text-foreground">温馨提示：</text>
            如您对上述第三方SDK有任何疑问，或希望了解更多信息，请通过以下方式联系我们：
          </text>
          <text class="text-xs text-muted-foreground block mt-2">邮箱：privacy@rebu.com | 电话：400-888-8888</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

type SDKCategory = 'analytics' | 'payment' | 'social' | 'push' | 'map' | 'ad' | 'login' | 'media' | 'other'

interface ThirdPartySDK {
  id: number
  name: string
  provider: string
  category: SDKCategory
  purpose: string
  collectedData: string[]
  privacyPolicyUrl: string
  officialWebsite?: string
}

const loading = ref(true)
const searchKeyword = ref('')
const selectedCategory = ref<string>('all')

const categories = [
  { value: 'all', label: '全部' },
  { value: 'login', label: '账号登录' },
  { value: 'payment', label: '支付服务' },
  { value: 'social', label: '社交分享' },
  { value: 'map', label: '地图服务' },
  { value: 'analytics', label: '数据统计' },
  { value: 'push', label: '消息推送' },
  { value: 'media', label: '媒体播放' },
  { value: 'ad', label: '广告服务' },
  { value: 'other', label: '其他服务' },
]

const mockSDKList: ThirdPartySDK[] = [
  { id: 1, name: '微信开放平台SDK', provider: '深圳市腾讯计算机系统有限公司', category: 'login', purpose: '用于微信登录、微信分享功能', collectedData: ['设备标识符', '网络状态', '微信用户ID'], privacyPolicyUrl: 'https://weixin.qq.com/cgi-bin/readtemplate?lang=zh_CN&t=weixin_agreement&s=privacy', officialWebsite: 'https://open.weixin.qq.com' },
  { id: 2, name: '支付宝SDK', provider: '支付宝（杭州）信息技术有限公司', category: 'payment', purpose: '用于支付宝支付功能', collectedData: ['设备标识符', '网络状态', '交易信息'], privacyPolicyUrl: 'https://render.alipay.com/p/c/k2cx0tg8', officialWebsite: 'https://open.alipay.com' },
  { id: 3, name: '微信支付SDK', provider: '财付通支付科技有限公司', category: 'payment', purpose: '用于微信支付功能', collectedData: ['设备标识符', '网络状态', '交易信息'], privacyPolicyUrl: 'https://pay.weixin.qq.com/index.php/public/wechatpay_portal/privacy', officialWebsite: 'https://pay.weixin.qq.com' },
  { id: 4, name: '高德地图SDK', provider: '高德软件有限公司', category: 'map', purpose: '用于地图展示、位置定位、路线规划', collectedData: ['位置信息', '设备标识符', 'WiFi状态'], privacyPolicyUrl: 'https://lbs.amap.com/pages/privacy/', officialWebsite: 'https://lbs.amap.com' },
  { id: 5, name: '友盟统计SDK', provider: '友盟同欣（北京）科技有限公司', category: 'analytics', purpose: '用于应用数据统计分析', collectedData: ['设备标识符', '应用使用数据', '崩溃日志'], privacyPolicyUrl: 'https://www.umeng.com/page/policy', officialWebsite: 'https://www.umeng.com' },
  { id: 6, name: '极光推送SDK', provider: '深圳市和讯华谷信息技术有限公司', category: 'push', purpose: '用于消息推送服务', collectedData: ['设备标识符', '网络状态', '推送消息内容'], privacyPolicyUrl: 'https://www.jiguang.cn/license/privacy', officialWebsite: 'https://www.jiguang.cn' },
  { id: 7, name: '腾讯Bugly SDK', provider: '深圳市腾讯计算机系统有限公司', category: 'analytics', purpose: '用于应用崩溃监控和性能分析', collectedData: ['设备信息', '崩溃日志', '应用状态'], privacyPolicyUrl: 'https://privacy.qq.com/document/preview/fc748b3d96224fdb825ea79e132c1a56', officialWebsite: 'https://bugly.qq.com' },
  { id: 8, name: '阿里云播放器SDK', provider: '阿里云计算有限公司', category: 'media', purpose: '用于视频播放功能', collectedData: ['设备标识符', '网络状态', '播放记录'], privacyPolicyUrl: 'https://terms.alicdn.com/legal-agreement/terms/privacy_policy_full/20220519162334947/20220519162334947.html', officialWebsite: 'https://www.aliyun.com/product/vod' },
  { id: 9, name: 'QQ互联SDK', provider: '深圳市腾讯计算机系统有限公司', category: 'login', purpose: '用于QQ登录、QQ分享功能', collectedData: ['设备标识符', '网络状态', 'QQ用户ID'], privacyPolicyUrl: 'https://wiki.connect.qq.com/qq%e4%ba%92%e8%81%94sdk%e9%9a%90%e7%a7%81%e4%bf%9d%e6%8a%a4%e5%a3%b0%e6%98%8e', officialWebsite: 'https://connect.qq.com' },
  { id: 10, name: '新浪微博SDK', provider: '北京微梦创科网络技术有限公司', category: 'social', purpose: '用于微博登录、微博分享功能', collectedData: ['设备标识符', '网络状态', '微博用户ID'], privacyPolicyUrl: 'https://weibo.com/signup/v5/privacy', officialWebsite: 'https://open.weibo.com' },
]

const sdkList = ref<ThirdPartySDK[]>([])

const filteredList = computed(() => {
  return sdkList.value.filter(sdk => {
    const matchCategory = selectedCategory.value === 'all' || sdk.category === selectedCategory.value
    const matchKeyword = !searchKeyword.value ||
      sdk.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
      sdk.provider.toLowerCase().includes(searchKeyword.value.toLowerCase())
    return matchCategory && matchKeyword
  })
})

const getCategoryIcon = (cat: string): string => {
  const icons: Record<string, string> = {
    analytics: '📊', payment: '', social: '', push: '',
    map: '📍', ad: '▶', login: '', media: '▶', other: '🛡',
  }
  return icons[cat] || '🛡'
}

const getCategoryLabel = (cat: string): string => {
  const labels: Record<string, string> = {
    analytics: '数据统计', payment: '支付服务', social: '社交分享',
    push: '消息推送', map: '地图服务', ad: '广告服务',
    login: '账号登录', media: '媒体播放', other: '其他服务',
  }
  return labels[cat] || cat
}

const getCategoryColor = (cat: string): string => {
  const colors: Record<string, string> = {
    analytics: 'text-blue-600 bg-blue-50', payment: 'text-green-600 bg-green-50',
    social: 'text-purple-600 bg-purple-50', push: 'text-orange-600 bg-orange-50',
    map: 'text-cyan-600 bg-cyan-50', ad: 'text-red-600 bg-red-50',
    login: 'text-indigo-600 bg-indigo-50', media: 'text-pink-600 bg-pink-50',
    other: 'text-gray-600 bg-gray-50',
  }
  return colors[cat] || 'text-gray-600 bg-gray-50'
}

// 加载SDK列表
const loadSDKList = async () => {
  loading.value = true
  // Mock API 延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  sdkList.value = [...mockSDKList]
  loading.value = false
}

// 打开链接（复制到剪贴板）
const openLink = (url: string) => {
  uni.setClipboardData({
    data: url,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'none' })
    },
  })
}

const goBack = () => { uni.navigateBack() }

onLoad(() => {
  loadSDKList()
})
</script>

<style scoped>
.skeleton-bg {
  background: linear-gradient(90deg, #f0ece6 25%, #e8e0d5 50%, #f0ece6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
