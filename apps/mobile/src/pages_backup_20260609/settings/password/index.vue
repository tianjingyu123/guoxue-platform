<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">修改密码</text><view style="width:48rpx"/></view>
    <view class="f"><view class="fi"><text class="fl">旧密码</text><input class="fin" placeholder="请输入旧密码" password/></view><view class="fi"><text class="fl">新密码</text><input class="fin" placeholder="6-20位"/></view><view class="fi"><text class="fl">确认密码</text><input class="fin" placeholder="再次输入"/></view><view class="btn" @click="submit">确认修改</view></view>
  </view>
</template>
<script setup lang="ts">function submit(){uni.showToast({title:'修改成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.f{padding:48rpx 32rpx}.fi{margin-bottom:32rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fin{width:100%;height:80rpx;padding:0 24rpx;background:#fff;border:1px solid #E8E0D5;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
