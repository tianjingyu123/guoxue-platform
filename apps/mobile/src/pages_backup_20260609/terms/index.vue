<template>
  <view class="page" data-v0-route="terms">
        <view class="min-h-screen bg-background flex flex-col">
          
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center gap-3 px-4 h-14">
              <!-- component:link -->
                
              <!-- /component:link -->
              <text class="font-semibold text-lg text-foreground">用户协议</text>
            </view>
          </view>
    
          <view class="flex-1 p-6">
            <view class="prose prose-sm max-w-none text-foreground">
              <text class="text-muted-foreground mb-6">更新日期：2024年1月1日</text>
              
              <text class="text-lg font-bold mt-6 mb-3">一、服务条款</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                欢迎使用热卜国学平台（以下简称"本平台"）。在使用本平台提供的各项服务之前，请您务必仔细阅读并充分理解本协议各条款。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">二、账号注册与安全</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                1. 用户注册时应提供真实、准确、完整的个人资料。
                2. 用户应妥善保管账号密码，因用户个人原因导致的账号安全问题由用户自行负责。
                3. 用户不得将账号借给他人使用，否则由此产生的责任由用户承担。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">三、用户行为规范</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                用户在使用本平台服务时，应遵守中华人民共和国相关法律法规，不得利用本平台从事以下行为：
                1. 发布、传播违法违规内容；
                2. 侵犯他人知识产权或其他合法权益；
                3. 干扰、破坏本平台的正常运行；
                4. 其他违反法律法规或本协议的行为。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">四、知识产权</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                本平台所有内容，包括但不限于文字、图片、音频、视频、软件等，其知识产权归本平台或相关权利人所有。未经许可，用户不得擅自使用。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">五、免责声明</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                1. 本平台提供的国学内容仅供学习参考，不构成任何投资、医疗等专业建议；
                2. 因不可抗力或非本平台原因导致的服务中断，本平台不承担责任；
                3. 用户因违反本协议导致的任何损失，由用户自行承担。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">六、协议修改</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                本平台有权根据需要修改本协议，修改后的协议将在本平台公布。如用户不同意修改后的协议，应停止使用本平台服务。
              </text>
              
              <text class="text-lg font-bold mt-6 mb-3">七、联系我们</text>
              <text class="text-muted-foreground leading-relaxed mb-4">
                如您对本协议有任何疑问，请通过以下方式联系我们：
                客服邮箱：support@rebu.com
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