<template>
  <view class="page v0-page" data-v0-route="about">
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center gap-3 px-4 h-14">
              <Link href="/" class="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
                <ArrowLeft class="w-5 h-5 text-foreground" />
              </Link>
              <text class="h1" class="font-semibold text-lg text-foreground">关于我们</text>
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1">
            <!--   -->
            <view class="bg-gradient-to-br from-primary/10 to-gold/10 p-8 text-center">
              <view class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" class="w-12 h-12">
                  <circle cx="12" cy="12" r="11" fill="white" />
                  <path d="M12 1 A5.5 5.5 0 0 1 12 12 A5.5 5.5 0 0 0 12 23 A11 11 0 0 1 12 1" fill="#C41E3A" />
                  <circle cx="12" cy="6.5" r="2" fill="white" />
                  <circle cx="12" cy="17.5" r="2" fill="#C41E3A" />
                </svg>
              </view>
              <text class="h2" class="text-2xl font-bold text-foreground mb-2">热卜国学</text>
              <text class="text-muted-foreground">传承智慧 · 启迪人生</text>
            </view>
    
            <!--   -->
            <view class="p-6">
              <text class="text-muted-foreground leading-relaxed mb-6">
                热卜国学是一个专注于中华传统文化传承与学习的综合性平台。我们汇聚了易经、风水、命理、中医养生等领域的专家学者，
                致力于让国学智慧以现代化的方式传播，帮助更多人了解和受益于中华传统文化的精髓。
              </text>
    
              <!--   -->
              <view class="grid grid-cols-3 gap-4 mb-8">
                <Card class="p-4 text-center">
                  <text class="text-2xl font-bold text-primary">100+</text>
                  <text class="text-xs text-muted-foreground mt-1">专家讲师</text>
                </Card>
                <Card class="p-4 text-center">
                  <text class="text-2xl font-bold text-gold">500+</text>
                  <text class="text-xs text-muted-foreground mt-1">精品课程</text>
                </Card>
                <Card class="p-4 text-center">
                  <text class="text-2xl font-bold text-success">50万+</text>
                  <text class="text-xs text-muted-foreground mt-1">学习用户</text>
                </Card>
              </view>
    
              <!--   -->
              <text class="h3" class="font-bold text-foreground mb-4">我们的特色</text>
              <view class="space-y-3 mb-8">
                {{ [
                  { icon: BookOpen, title: '专业内容', desc: '严选优质国学课程与古籍资源' }},
                  { icon: Users, title: '圈子交流', desc: '加入志同道合的学习社区' },
                  { icon: Award, title: '名师指导', desc: '一对一咨询，答疑解惑' },
                  { icon: Building2, title: '线下活动', desc: '定期举办国学文化体验活动' },
                ].map(item => (
                  <Card key={{ item.title }} class="p-4 flex items-center gap-4">
                    <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon class="w-5 h-5 text-primary" />
                    </view>
                    <view>
                      <text class="font-medium text-foreground">{{ item.title }}</text>
                      <text class="text-sm text-muted-foreground">{{ item.desc }}</text>
                    </view>
                  </Card>
                ))}
              </view>
    
              <!--   -->
              <text class="h3" class="font-bold text-foreground mb-4">联系我们</text>
              <Card class="divide-y divide-border">
                <Link href="/feedback" class="p-4 flex items-center justify-between">
                  <text class="text-foreground">意见反馈</text>
                  <ChevronRight class="w-5 h-5 text-muted-foreground" />
                </Link>
                <view class="p-4 flex items-center justify-between">
                  <text class="text-foreground">客服邮箱</text>
                  <text class="text-muted-foreground">support@rebu.com</text>
                </view>
                <view class="p-4 flex items-center justify-between">
                  <text class="text-foreground">官方微信</text>
                  <text class="text-muted-foreground">rebu_guoxue</text>
                </view>
              </Card>
    
              <!--   -->
              <view class="mt-8 text-center text-sm text-muted-foreground">
                <text>版本 1.0.0</text>
                <text class="mt-1">Copyright © 2024 热卜国学</text>
              </view>
            </view>
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: about
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.v0-page {
  padding: 24rpx;
}

/* 按钮样式 */
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 列表项 */
.v0-li {
  padding: 24rpx;
  border-bottom: 1px solid #E8E0D5;
}

/* 分隔线 */
.hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>