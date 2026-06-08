<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">设计规范</text>
      <text class="v0-route">V0: design/illustrations</text>
    </view>
        <view class="min-h-screen bg-background pb-10">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center h-14 px-4">
              <BackButton />
              <text class="ml-2 font-semibold text-foreground">插画设计资源</text>
            </view>
          </view>
    
          <view class="p-4 space-y-8">
            <!--   -->
            <view>
              <text class="text-lg font-semibold text-foreground mb-4">默认头像（5款）</text>
              <view class="grid grid-cols-5 gap-4">
                <view class="flex flex-col items-center gap-2">
                  <MaleDefaultAvatar size={{ 64 }} />
                  <text class="text-xs text-muted-foreground">男性</text>
                </view>
                <view class="flex flex-col items-center gap-2">
                  <FemaleDefaultAvatar size={{ 64 }} />
                  <text class="text-xs text-muted-foreground">女性</text>
                </view>
                <view class="flex flex-col items-center gap-2">
                  <NeutralDefaultAvatar size={{ 64 }} />
                  <text class="text-xs text-muted-foreground">通用</text>
                </view>
                <view class="flex flex-col items-center gap-2">
                  <CircleOwnerDefaultAvatar size={{ 64 }} />
                  <text class="text-xs text-muted-foreground">圈主</text>
                </view>
                <view class="flex flex-col items-center gap-2">
                  <SystemDefaultAvatar size={{ 64 }} />
                  <text class="text-xs text-muted-foreground">系统</text>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view>
              <text class="text-lg font-semibold text-foreground mb-4">空状态插画（8幅）</text>
              <view class="grid grid-cols-2 gap-4">
                {[
                  { component: <EmptyGeneral size={120} />, label: "通用空状态", desc: "等待书写" },
                  { component: <EmptyContent size={120} />, label: "无内容", desc: "暂无内容" },
                  { component: <EmptyNetwork size={120} />, label: "无网络", desc: "网络异常" },
                  { component: <EmptyMessages size={120} />, label: "无消息", desc: "消息中心" },
                  { component: <EmptySearch size={120} />, label: "搜索无结果", desc: "未找到相关内容" },
                  { component: <EmptyPaymentSuccess size={120} />, label: "支付成功", desc: "喜庆祥和" },
                  { component: <EmptyPaymentFailed size={120} />, label: "支付失败", desc: "安抚情绪" },
                  { component: <Empty404 size={120} />, label: "404错误", desc: "页面不存在" },
                ].map((item, i) => (
                  <Card key={{ i }} class="p-4 flex flex-col items-center gap-2 bg-card">
                    {{ item.component }}
                    <text class="text-sm font-medium text-foreground">{{ item.label }}</text>
                    <text class="text-xs text-muted-foreground">{{ item.desc }}</text>
                  </Card>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view>
              <text class="text-lg font-semibold text-foreground mb-4">引导插画（5幅）</text>
              <view class="grid grid-cols-2 gap-4">
                {[
                  { component: <GuidePaipan size={140} />, label: "排盘引导", desc: "输入生辰，探寻命理" },
                  { component: <GuideJoinCircle size={140} />, label: "加入圈子", desc: "加入圈子，结交同好" },
                  { component: <GuideLearnCourse size={140} />, label: "学习课程", desc: "名师指路，研习经典" },
                  { component: <GuidePublish size={140} />, label: "发布内容", desc: "分享你的国学见解" },
                  { component: <GuideVip size={140} />, label: "开通会员", desc: "解锁更多智慧解读" },
                ].map((item, i) => (
                  <Card key={{ i }} class="p-4 flex flex-col items-center gap-2 bg-card">
                    {{ item.component }}
                    <text class="text-sm font-medium text-foreground">{{ item.label }}</text>
                    <text class="text-xs text-muted-foreground">{{ item.desc }}</text>
                  </Card>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view>
              <text class="text-lg font-semibold text-foreground mb-4">功能图标</text>
              <Card class="p-4 bg-card">
                <view class="grid grid-cols-5 gap-6">
                  {[
                    { icon: <PaipanIcon size={32} />, label: "排盘" },
                    { icon: <CircleIcon size={32} />, label: "圈子" },
                    { icon: <CourseIcon size={32} />, label: "课程" },
                    { icon: <MallIcon size={32} />, label: "商城" },
                    { icon: <DiscoverIcon size={32} />, label: "发现" },
                  ].map((item, i) => (
                    <view key={{ i }} class="flex flex-col items-center gap-2">
                      {{ item.icon }}
                      <text class="text-xs text-muted-foreground">{{ item.label }}</text>
                    </view>
                  ))}
                </view>
                <view class="mt-6 pt-4 border-t border-border">
                  <text class="text-xs text-muted-foreground mb-3">填充样式</text>
                  <view class="grid grid-cols-5 gap-6">
                    {[
                      { icon: <PaipanIcon size={32} variant="fill" />, label: "排盘" },
                      { icon: <CircleIcon size={32} variant="fill" />, label: "圈子" },
                      { icon: <CourseIcon size={32} variant="fill" />, label: "课程" },
                      { icon: <MallIcon size={32} variant="fill" />, label: "商城" },
                      { icon: <DiscoverIcon size={32} variant="fill" />, label: "发现" },
                    ].map((item, i) => (
                      <view key={{ i }} class="flex flex-col items-center gap-2">
                        {{ item.icon }}
                        <text class="text-xs text-muted-foreground">{{ item.label }}</text>
                      </view>
                    ))}
                  </view>
                </view>
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="text-lg font-semibold text-foreground mb-4">占位图与Logo</text>
              <view class="grid grid-cols-2 gap-4">
                <Card class="p-4 flex flex-col items-center gap-2 bg-card">
                  <CoverPlaceholder width={{ 140 }} height={{ 80 }} />
                  <text class="text-sm text-muted-foreground">封面占位图</text>
                </Card>
                <Card class="p-4 flex flex-col items-center gap-2 bg-card">
                  <PlatformLogo size={{ 64 }} />
                  <text class="text-sm text-muted-foreground">平台Logo</text>
                </Card>
              </view>
            </view>
    
            <!--   -->
            <view>
              <text class="text-lg font-semibold text-foreground mb-4">配色方案</text>
              <Card class="p-4 bg-card">
                <view class="grid grid-cols-4 gap-4">
                  {[
                    { color: "#C41E3A", name: "故宫红", usage: "主色/强调" },
                    { color: "#F5F1EB", name: "宣纸米白", usage: "背景/底色" },
                    { color: "#C9A96E", name: "金色", usage: "点缀/装饰" },
                    { color: "#2C2C2C", name: "墨色", usage: "文字/线条" },
                  ].map((item, i) => (
                    <view key={{ i }} class="flex flex-col items-center gap-2">
                      <view 
                        class="w-12 h-12 rounded-lg border border-border" 
                        :style=" backgroundColor: item.color }}
                      />
                      <text class="text-xs font-medium text-foreground">{{ item.name }}</text>
                      <text class="text-[10px] text-muted-foreground">{{ item.usage }}</text>
                    </view>
                  ))}
                </view>
              </Card>
            </view>
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据


async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>