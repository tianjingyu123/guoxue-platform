<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">推流配置</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="status"><text class="st-icon">🟢</text><text class="st-text">推流在线</text><text class="st-dur">{{fmtDur(streamData.duration)}}</text></view>
      <view class="card"><text class="ct">推流信息</text>
        <view class="field"><text class="fl">服务器</text><view class="val-row"><text class="fv">{{streamData.url}}</text><text class="fc" @click="copy(streamData.url)">📋</text></view></view>
        <view class="field"><text class="fl">串流密钥</text><view class="val-row"><text class="fv">{{showKey?streamData.key:'••••••••'}}</text><text class="fc" @click="showKey=!showKey">{{showKey?'隐藏':'显示'}}</text><text class="fc" @click="copy(streamData.key)">📋</text></view></view>
      </view>
      <view class="card"><text class="ct">实时数据</text>
        <view class="dg"><view class="dg-item"><text class="dgi-val">{{streamData.fps}}</text><text class="dgi-label">FPS</text></view><view class="dg-item"><text class="dgi-val">{{streamData.bitrate}}</text><text class="dgi-label">码率 kbps</text></view><view class="dg-item"><text class="dgi-val">{{streamData.res}}</text><text class="dgi-label">分辨率</text></view></view>
      </view>
      <view class="card"><text class="ct">OBS配置步骤</text>
        <view v-for="s in steps" :key="s.step" class="step"><text class="sn">{{s.step}}</text><view><text class="stt">{{s.title}}</text><text class="sd">{{s.desc}}</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const showKey=ref(false);const streamData={url:'rtmp://live-push.rebu.cn/live',key:'rebu_live_8f7d6e5c',duration:3845,fps:30,bitrate:4500,res:'1920x1080'};const steps=[{step:1,title:'打开OBS设置',desc:'点击菜单栏「设置」'},{step:2,title:'配置推流',desc:'服务选择自定义，填入服务器地址和串流密钥'},{step:3,title:'设置输出',desc:'编码器选择硬件或软件编码'},{step:4,title:'开始推流',desc:'点击右下角「开始推流」'}];function fmtDur(s:number){const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h+'时'+m+'分'};function copy(t:string){uni.setClipboardData({data:t});uni.showToast({title:'已复制'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.status{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.st-icon{font-size:48rpx}.st-text{font-size:28rpx;font-weight:600}.st-dur{font-size:22rpx;color:#999;margin-left:auto}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.field{padding:16rpx 0;border-bottom:1px solid #F5F1EB}.fl{font-size:22rpx;color:#999;margin-bottom:8rpx;display:block}.val-row{display:flex;align-items:center;gap:8rpx}.fv{font-size:24rpx;color:#2C2C2C;word-break:break-all;flex:1}.fc{font-size:24rpx;padding:8rpx;color:#C41E3A}.dg{display:flex;gap:16rpx}.dg-item{flex:1;text-align:center}.dgi-val{font-size:32rpx;font-weight:700;color:#C41E3A;display:block}.dgi-label{font-size:20rpx;color:#999;margin-top:4rpx}.step{display:flex;gap:16rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.sn{width:48rpx;height:48rpx;border-radius:50%;background:rgba(196,30,58,.1);color:#C41E3A;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:22rpx;flex-shrink:0}.stt{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.sd{font-size:22rpx;color:#999;margin-top:2rpx}
</style>
