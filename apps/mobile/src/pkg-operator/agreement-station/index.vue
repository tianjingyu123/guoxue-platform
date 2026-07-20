<template>
  <view class="ag-page">
    <!-- 自定义导航 -->
    <view class="ag-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ag-nav-bar">
        <view class="ag-nav-back" @tap="goBack">
          <text class="ag-nav-back-ic">‹</text>
        </view>
        <text class="ag-nav-title">站长服务协议</text>
        <view class="ag-nav-placeholder" />
      </view>
    </view>

    <!-- 协议正文 -->
    <scroll-view scroll-y class="ag-scroll">
      <!-- 协议头 -->
      <view class="ag-head">
        <text class="ag-head-title">热卜国学站长服务协议</text>
        <text class="ag-head-meta">版本：2026-07-19 · 最近更新：2026-07-19</text>
      </view>

      <!-- 正文 -->
      <view class="ag-body">
        <view class="ag-sec">
          <text class="ag-sh">一、站长身份</text>
          <text class="ag-p">1.1 站长是指通过平台开设分站并进行推广活动的用户。站长沿用平台统一账号，无需单独注册，每位用户最多持有一个分站。</text>
          <text class="ag-p">1.2 分站不提供页面装修、独立域名或独立落地页；站长的推广行为通过在平台各内容板块设置主推位实现，页面样式由平台统一提供。</text>
        </view>

        <view class="ag-sec">
          <text class="ag-sh">二、主推位规则</text>
          <text class="ag-p">2.1 站长可在平台各内容板块设置最多 <text class="ag-hl">6 个主推位</text>，主推位内容由站长自行选择，平台对主推位内容合法合规性不承担担保责任。</text>
          <text class="ag-p">2.2 直播主推位在所选直播结束后自动释放，站长可重新选择。</text>
          <text class="ag-p">2.3 平台保留对违规主推位内容的下架权利。</text>
        </view>

        <view class="ag-sec">
          <text class="ag-sh">三、系统使用费</text>
          <text class="ag-p">3.1 开通分站无准入门槛，站长需缴纳系统租赁费 <text class="ag-hl">999 元/年</text>。</text>
          <text class="ag-p">3.2 当前在线开通与续费按服务端订单显示金额收取；支付成功后激活或顺延一年，未到期的剩余时间不会被扣除。</text>
          <text class="ag-p">3.3 <text class="ag-hl">自动减免与原路退还当前尚未开放</text>，不构成本次付款条件。后续如上线相关权益，平台将另行公示并由用户确认适用规则。</text>
        </view>

        <view class="ag-sec">
          <text class="ag-sh">四、佣金规则</text>
          <text class="ag-p">4.1 用户通过站长推广码进入并完成消费后，平台按约定比例向站长支付佣金。</text>
          <text class="ag-p">4.2 <text class="ag-hl">结算周期</text>：每月 25 日结算上月已确认佣金，到账微信零钱或绑定银行卡。</text>
          <text class="ag-p">4.3 退款订单对应佣金自动冲销。</text>
        </view>

        <view class="ag-sec">
          <text class="ag-sh">五、行为规范</text>
          <text class="ag-p">5.1 站长不得通过虚假推广、诱导点击等方式获取佣金。</text>
          <text class="ag-p">5.2 站长不得以平台名义作出超出本协议范围的承诺。</text>
          <text class="ag-p">5.3 违规行为将导致分站暂停或永久关闭，已结算佣金不予追回，未结算佣金取消发放。</text>
        </view>

        <view class="ag-sec">
          <text class="ag-sh">六、协议变更与终止</text>
          <text class="ag-p">平台可修订本协议，修订公告后继续使用服务视为同意。站长可主动申请关闭分站，关闭后未结算佣金在结算周期内正常发放。</text>
        </view>
      </view>

      <view class="ag-bottom-pad" />
    </scroll-view>

    <!-- 底部按钮栏（from=settings · 纯查看·我知道了） -->
    <view class="ag-bar" :style="{ paddingBottom: (safeBottom + 24) + 'px' }">
      <view class="ag-btn secondary" @tap="goBack">
        <text class="ag-btn-text">我知道了</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const statusBarHeight = ref(0)
const safeBottom = ref(0)

try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  safeBottom.value = info.safeAreaInsets?.bottom || 0
} catch {
  // 忽略：读取系统信息失败时使用默认留白
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.ag-page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }

/* 自定义导航 */
.ag-nav { background: #FFFFFF; border-bottom: 1rpx solid #ECE7DF; }
.ag-nav-bar { height: 88rpx; display: flex; align-items: center; padding: 0 38rpx; }
.ag-nav-back { width: 88rpx; height: 88rpx; margin: 0 -20rpx; display: flex; align-items: center; justify-content: center; } /* 触控热区≥88rpx：容器扩大+负margin保持视觉位置 */
.ag-nav-back-ic { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.ag-nav-title { flex: 1; text-align: center; font-size: 33rpx; font-weight: 600; color: #2C2C2C; }
.ag-nav-placeholder { width: 48rpx; }

.ag-scroll { flex: 1; }

/* 协议头 */
.ag-head { padding: 46rpx 42rpx 35rpx; text-align: center; background: #FFFFFF; border-bottom: 1rpx solid #ECE7DF; }
.ag-head-title { display: block; font-size: 38rpx; font-weight: 700; color: #2C2C2C; }
.ag-head-meta { display: block; font-size: 21rpx; color: #999999; margin-top: 15rpx; }

/* 正文 */
.ag-body { padding: 38rpx 42rpx 16rpx; }
.ag-sec { margin-bottom: 38rpx; }
.ag-sec:last-child { margin-bottom: 0; }
.ag-sh { display: block; font-size: 29rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 19rpx; padding-left: 21rpx; border-left: 6rpx solid #C41E3A; line-height: 1.4; }
.ag-p { display: block; font-size: 25rpx; color: #6E6E73; line-height: 1.85; margin-bottom: 15rpx; }
.ag-p:last-child { margin-bottom: 0; }
.ag-hl { color: #C41E3A; font-weight: 600; }

.ag-bottom-pad { height: 40rpx; }

/* 底部按钮栏 */
.ag-bar { background: #FFFFFF; border-top: 1rpx solid #ECE7DF; padding: 27rpx 42rpx 27rpx; }
.ag-btn { height: 96rpx; border-radius: 35rpx; display: flex; align-items: center; justify-content: center; }
.ag-btn.secondary { background: #FAF8F5; border: 1rpx solid #ECE7DF; }
.ag-btn.secondary .ag-btn-text { color: #2C2C2C; }
.ag-btn-text { font-size: 31rpx; font-weight: 600; }
</style>
