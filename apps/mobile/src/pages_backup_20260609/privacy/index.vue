<template>
  <view class="page" data-v0-route="privacy">
        <view class="min-h-screen bg-background flex flex-col">
          
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center gap-3 px-4 h-14">
              <!-- component:link -->
                
              <!-- /component:link -->
              <text class="font-semibold text-lg text-foreground">隐私政策</text>
            </view>
          </view>
    
          <view class="flex-1 p-6">
            <view class="prose prose-sm max-w-none text-foreground">
              <text class="text-muted-foreground mb-6">更新日期：2024年1月1日</text>
              
              <text class="text-lg font-bold mt-6 mb-3">一、信息收集</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                我们可能收集以下类型的信息：
                1. 账号信息：手机号、邮箱、昵称、头像等；
                2. 设备信息：设备型号、操作系统、设备标识符等；
                3. 使用信息：浏览记录、搜索记录、学习记录等；
                4. 位置信息：仅在您授权后获取。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">二、信息使用</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                我们收集的信息将用于：
                1. 提供、维护、改进我们的服务；
                2. 个性化推荐内容；
                3. 安全防护和身份验证；
                4. 与您沟通，包括发送通知和更新。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">三、信息共享</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                我们不会向第三方出售您的个人信息。在以下情况下，我们可能会共享您的信息：
                1. 获得您的明确同意后；
                2. 法律法规要求或政府部门要求；
                3. 与关联公司共享，用于提供服务；
                4. 与合作伙伴共享，用于提供特定服务（如支付）。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">四、信息存储与安全</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                1. 您的信息将存储在中华人民共和国境内的服务器上；
                2. 我们采用行业标准的安全措施保护您的信息；
                3. 我们会定期审查安全措施并及时更新。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">五、您的权利</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                您有权：
                1. 访问、更正您的个人信息；
                2. 删除您的账号和相关数据；
                3. 撤回授权同意；
                4. 注销账号。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">六、未成年人保护</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                我们重视未成年人的隐私保护。如果您是未满18周岁的未成年人，请在监护人的指导下使用我们的服务。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">七、联系我们</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                如您对本隐私政策有任何疑问，请联系：
                客服邮箱：privacy@rebu.com
                客服电话：400-xxx-xxxx
              </text>
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

onMounted(() => { loading.value = false })
onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.hr { height: 1px; background: #E8E0D5; margin: 24rpx 0; }
</style>