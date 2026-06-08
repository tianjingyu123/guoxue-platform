<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">帮助中心</text>
      <text class="v0-route">V0: help/list-demo</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between h-12 px-4">
              <Link href="/help/guoxue-design" class="flex items-center gap-2">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium">列表组件演示</text>
              <view class="w-5" />
            </view>
          </view>
          
          <view class="p-4 space-y-6">
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">基础列表项</text>
              <ListContainer>
                <ListItem 
                  icon={<User class="w-5 h-5 text-primary" />}
                  title="个人资料"
                  subtitle="修改头像、昵称、简介"
                  href="/profile/edit"
                />
                <ListItem 
                  icon={<Shield class="w-5 h-5 text-success" />}
                  title="账号安全"
                  subtitle="密码、手机号、登录设备"
                  href="/mine/security"
                  badge="2"
                  badgeType="danger"
                />
                <ListItem 
                  icon={<CreditCard class="w-5 h-5 text-gold" />}
                  title="我的钱包"
                  rightText="¥1,280.00"
                  rightTextColor="primary"
                  href="/wallet"
                />
                <ListItem 
                  icon={<HelpCircle class="w-5 h-5 text-info" />}
                  title="帮助中心"
                  href="/help"
                  showBorder={{ false }}
                />
              </ListContainer>
            </view>
            
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">开关型列表项</text>
              <ListContainer>
                <ListItemSwitch
                  icon={<Bell class="w-5 h-5 text-warning" />}
                  title="消息通知"
                  subtitle="接收系统通知和互动消息"
                  :checked={{ notifications }}
                  onCheckedChange={{ setNotifications }}
                />
                <ListItemSwitch
                  icon={<Moon class="w-5 h-5 text-operator" />}
                  title="深色模式"
                  :checked={{ darkMode }}
                  onCheckedChange={{ setDarkMode }}
                />
                <ListItemSwitch
                  icon={<Volume2 class="w-5 h-5 text-info" />}
                  title="声音"
                  subtitle="播放提示音效"
                  :checked={{ sound }}
                  onCheckedChange={{ setSound }}
                  showBorder={{ false }}
                />
              </ListContainer>
            </view>
            
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">选择型列表项</text>
              <ListContainer>
                <ListItemSelect
                  icon={<Globe class="w-5 h-5 text-info" />}
                  title="语言"
                  value="简体中文"
                  @click={() => {}}
                />
                <ListItemSelect
                  icon={<Lock class="w-5 h-5 text-muted-foreground" />}
                  title="隐私设置"
                  placeholder="请选择"
                  @click={() => {}}
                  showBorder={{ false }}
                />
              </ListContainer>
            </view>
            
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">分组列表</text>
              <ListContainer>
                <ListGroupTitle title="消息设置" />
                <ListItemSwitch
                  icon={<MessageCircle class="w-5 h-5 text-info" />}
                  title="评论通知"
                  :checked={{ true }}
                  onCheckedChange={() => {}}
                />
                <ListItemSwitch
                  icon={<Heart class="w-5 h-5 text-primary" />}
                  title="点赞通知"
                  :checked={{ true }}
                  onCheckedChange={() => {}}
                />
                <ListGroupTitle title="隐私设置" />
                <ListItemSwitch
                  icon={<Eye class="w-5 h-5 text-muted-foreground" />}
                  title="显示在线状态"
                  :checked={{ false }}
                  onCheckedChange={() => {}}
                  showBorder={{ false }}
                />
              </ListContainer>
            </view>
            
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">不同尺寸</text>
              <ListContainer>
                <ListItem 
                  icon={<Info class="w-4 h-4 text-muted-foreground" />}
                  title="小尺寸列表项"
                  subtitle="适合紧凑布局"
                  size="sm"
                />
                <ListItem 
                  icon={<Info class="w-5 h-5 text-muted-foreground" />}
                  title="中等尺寸列表项"
                  subtitle="默认尺寸，适合大多数场景"
                  size="md"
                />
                <ListItem 
                  icon={<Info class="w-6 h-6 text-muted-foreground" />}
                  title="大尺寸列表项"
                  subtitle="适合重要入口或强调展示"
                  size="lg"
                  showBorder={{ false }}
                />
              </ListContainer>
            </view>
            
            <!--   -->
            <view>
              <text class="text-sm font-medium text-muted-foreground mb-2 px-1">危险操作</text>
              <ListContainer>
                <ListItem 
                  icon={<LogOut class="w-5 h-5 text-danger" />}
                  title="退出登录"
                  rightText=""
                  showArrow={{ false }}
                  @click={() => {}}
                  showBorder={{ false }}
                  class="text-danger"
                />
              </ListContainer>
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