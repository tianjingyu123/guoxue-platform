<template>
  <view class="ag-page">
    <!-- 自定义导航 -->
    <view class="ag-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ag-nav-bar">
        <view class="ag-nav-back" @tap="goBack">
          <text class="ag-nav-back-ic">‹</text>
        </view>
        <text class="ag-nav-title">运营商服务协议</text>
        <view class="ag-nav-placeholder" />
      </view>
    </view>

    <!-- 协议正文 -->
    <scroll-view scroll-y class="ag-scroll">
      <!-- 协议头 -->
      <view class="ag-head">
        <text class="ag-head-title">热卜国学运营商服务协议</text>
        <text class="ag-head-meta">版本：2026-07-01 · 最近更新：2026-07-01</text>
      </view>

      <!-- 正文 -->
      <view class="ag-body">
        <view class="ag-sec">
          <text class="ag-sh">一、定义与解释</text>
          <text class="ag-p">1.1 本协议所称「运营商」，是指在热卜国学平台（以下简称「平台」）缴纳运营商资格费用后，获得运营商身份，依本协议规则招募、管理站长并获取团队管理奖励的用户。运营商沿用平台统一账号，无独立后台。</text>
          <text class="ag-p">1.2 运营商资格费用为 <text class="ag-hl">4999 元</text>，含 <text class="ag-hl">6 个站长名额</text>（1 个自用 + 5 个可对外出售/赠送），名额总数固定，不可加购。</text>
        </view>

        <view class="ag-sec">
          <text class="ag-sh">二、服务内容</text>
          <text class="ag-p">2.1 平台向运营商提供以下服务：</text>
          <text class="ag-p">（a）站长团队管理工具，包括成员列表、业绩排行、沉寂预警等功能；</text>
          <text class="ag-p">（b）<text class="ag-hl">团队管理奖励</text>：就运营商名下站长产生的收入，平台按 <text class="ag-hl">10%</text> 向运营商额外支付团队管理奖励（该奖励由平台承担，不从站长收益中扣除）；</text>
          <text class="ag-p">（c）名额管理功能，包括查看、分配、赠送站长名额。</text>
        </view>

        <view class="ag-sec">
          <text class="ag-sh">三、收益与结算</text>
          <text class="ag-p">3.1 团队管理奖励按名下站长收入的 10% 计算，以平台账单为准。</text>
          <text class="ag-p">3.2 结算周期：<text class="ag-hl">每月 25 日</text>结算上月已确认收益，到账方式为微信零钱或绑定银行卡。</text>
          <text class="ag-p">3.3 若订单发生退款，对应奖励自动冲销。</text>
        </view>

        <view class="ag-sec">
          <text class="ag-sh">四、权利与义务</text>
          <text class="ag-p">4.1 运营商应遵守平台规则，不得通过虚假交易、刷单等方式套取奖励。</text>
          <text class="ag-p">4.2 运营商不得以平台名义向第三方承诺任何未经平台授权的收益保证。</text>
          <text class="ag-p">4.3 平台有权因违规行为暂停或终止运营商资格，已支付费用不予退还。</text>
        </view>

        <view class="ag-sec">
          <text class="ag-sh">五、协议变更</text>
          <text class="ag-p">平台可根据运营情况对本协议进行修订，修订内容将于平台内公告，运营商继续使用服务视为同意修订内容。</text>
        </view>

        <view class="ag-sec">
          <text class="ag-sh">六、争议解决</text>
          <text class="ag-p">本协议适用中华人民共和国法律，争议由平台所在地有管辖权的人民法院诉讼解决。</text>
        </view>
      </view>

      <view class="ag-bottom-pad" />
    </scroll-view>

    <!-- 底部同意栏（from=apply · 同意并继续） -->
    <view class="ag-bar" :style="{ paddingBottom: (safeBottom + 24) + 'px' }">
      <view class="ag-btn primary" @tap="onAgree">
        <text class="ag-btn-text">同意并继续</text>
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

// from=apply：同意后返回上一页并标记已同意，继续开通流程
function onAgree() {
  const pages = getCurrentPages()
  const prev = pages[pages.length - 2] as { $vm?: { agreedOperator?: boolean } } | undefined
  if (prev?.$vm) prev.$vm.agreedOperator = true
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
.ag-btn.primary { background: #C41E3A; box-shadow: 0 15rpx 46rpx rgba(196,30,58,0.3); }
.ag-btn.primary .ag-btn-text { color: #FFFFFF; }
.ag-btn-text { font-size: 31rpx; font-weight: 600; }
</style>
