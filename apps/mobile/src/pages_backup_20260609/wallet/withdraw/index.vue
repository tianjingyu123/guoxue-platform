<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">提现</text><view style="width:48rpx"/></view>
    <view class="c"><view class="card"><text class="ct">可提现余额</text><text class="bal">¥45,680.00</text></view>
    <view class="card"><text class="ct">提现金额</text><input class="inp" placeholder="请输入金额"/></view>
    <view class="card"><text class="ct">到账银行卡</text><text>工商银行(6688)</text></view>
    <view class="btn" @click="wd">确认提现</view></view></view>
</template>
<script setup lang="ts">function wd(){uni.showToast({title:'提现申请已提交'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.bal{font-size:48rpx;font-weight:700;color:#C41E3A}.inp{width:100%;height:80rpx;padding:0 24rpx;background:#F5F1EB;border-radius:16rpx;font-size:32rpx;font-weight:600;color:#C41E3A;box-sizing:border-box}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
