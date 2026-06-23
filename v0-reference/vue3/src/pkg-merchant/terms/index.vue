<template>
  <view class="mt-page">
    <!-- 顶部导航 -->
    <view class="mt-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mt-header-inner">
        <view class="mt-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="mt-title">商家入驻协议</text>
      </view>
    </view>

    <scroll-view scroll-y class="mt-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <view class="mt-body">
        <text class="mt-doc-title">商家入驻服务协议</text>
        <text class="mt-update">最后更新：2024年01月01日</text>
        <text class="mt-intro">本协议规定了商家在儒布国学文化平台开展经营活动的权利与义务，请在申请入驻前仔细阅读。</text>
        <view class="mt-sections">
          <view v-for="(s, i) in sections" :key="i" class="mt-section">
            <text class="mt-sec-title">{{ s.title }}</text>
            <text class="mt-sec-content">{{ s.content }}</text>
          </view>
        </view>
        <view class="mt-bottom-placeholder" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

const sections = [
  { title: '1. 商家资质要求', content: '申请成为儒布平台商家，须具备合法的营业执照或个体工商户登记证明；具备履行本协议及提供相关服务的能力；不存在违法经营记录。个人讲师须提供身份证明及专业资质证书。' },
  { title: '2. 平台规则遵守', content: '商家须遵守平台内容审核规范，不得发布违法违规内容；须保证商品/服务信息的真实性和准确性；须按时履行与用户达成的交易；须妥善处理用户投诉。' },
  { title: '3. 佣金与结算', content: '平台对商家销售额收取相应比例的服务费，具体费率详见商家后台费率说明。平台每月结算上月收入，T+7个工作日内打款至绑定账户。如有税务问题，商家须自行承担。' },
  { title: '4. 商家义务', content: '商家须保证课程/服务内容的真实性与质量；须按照约定时间提供服务；须如实开具发票；须保护用户个人信息不外泄；须配合平台进行必要的审核和抽查。' },
  { title: '5. 违规处理', content: '商家违反平台规则，平台有权采取以下措施：警告并要求整改；下架违规商品；暂停商家权限；解除合作关系并追缴违规所得。情节严重者，平台将向相关部门举报。' },
  { title: '6. 知识产权', content: '商家保证所提供的内容不侵犯任何第三方知识产权。因商家内容引发的知识产权纠纷，由商家自行承担法律责任和赔偿损失。' },
  { title: '7. 协议终止', content: '双方均可提前30天书面通知对方终止本协议。协议终止后，平台将结算商家应得款项，商家须停止使用平台提供的所有资源和工具。' },
]

const statusBarHeight = ref(0)

uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 0
  },
})
</script>

<style scoped>
.mt-page { min-height: 100vh; background: #fff; }

.mt-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); }
.mt-header-inner { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.mt-back { margin-right: 12px; }
.mt-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }

.mt-scroll { height: 100vh; box-sizing: border-box; }
.mt-body { padding: 24px 16px; }
.mt-doc-title { display: block; font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
.mt-update { display: block; font-size: 12px; color: #999; margin-bottom: 24px; }
.mt-intro { display: block; font-size: 14px; color: #999; line-height: 1.6; margin-bottom: 24px; }
.mt-sections { display: flex; flex-direction: column; gap: 24px; }
.mt-sec-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.mt-sec-content { font-size: 14px; color: #666; line-height: 1.7; }
.mt-bottom-placeholder { height: 40px; }
</style>
