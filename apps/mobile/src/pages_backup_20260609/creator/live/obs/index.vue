<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">OBS推流配置</text></view><view style="width:48rpx"/></view>

    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view class="status-card"><text class="sk-icon">🟢</text><view><text class="sk-title">推流状态：在线</text><text class="sk-dur">已推流 {{fmtDur(streamData.duration)}}</text></view></view>

      <view class="card"><text class="card-title">推流信息</text>
        <view class="info-row"><text class="ir-label">服务器地址</text><view class="ir-val-wrap"><text class="ir-val">{{streamData.serverUrl}}</text><text class="ir-copy" @click="copy(streamData.serverUrl)">📋</text></view></view>
        <view class="info-row"><text class="ir-label">串流密钥</text><view class="ir-val-wrap"><text class="ir-val">{{showKey?streamData.streamKey:'••••••••••••••••'}}</text><text class="ir-copy" @click="showKey=!showKey">{{showKey?'🙈':'👁️'}}</text><text class="ir-copy" @click="copy(streamData.streamKey)">📋</text></view></view>
        <view class="info-row"><text class="ir-label">推流状态</text><view class="ir-status on">在线</view></view>
      </view>

      <view class="card"><text class="card-title">实时数据</text>
        <view class="data-grid"><view class="dg"><text class="dg-val">{{streamData.fps}}</text><text class="dg-label">FPS</text></view><view class="dg"><text class="dg-val">{{streamData.bitrate}}</text><text class="dg-label">码率(kbps)</text></view><view class="dg"><text class="dg-val">{{streamData.resolution}}</text><text class="dg-label">分辨率</text></view><view class="dg"><text class="dg-val">{{streamData.droppedFrames}}</text><text class="dg-label">丢帧</text></view></view>
      </view>

      <view class="card"><text class="card-title">画质推荐</text>
        <view v-for="q in qualityPresets" :key="q.id" class="quality-item" :class="{rec:q.recommended}"><view class="qi-head"><text class="qi-name">{{q.name}}</text><text v-if="q.recommended" class="qi-rec">推荐</text></view><text class="qi-res">{{q.resolution}} @ {{q.bitrate}}kbps · 网络{{q.network}}</text></view>
      </view>

      <view class="card"><text class="card-title">OBS配置步骤</text>
        <view v-for="s in obsSteps" :key="s.step" class="step-item"><text class="si-num">{{s.step}}</text><view class="si-info"><text class="si-title">{{s.title}}</text><text class="si-desc">{{s.desc}}</text></view></view>
      </view>

      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const showKey=ref(false)
const streamData={serverUrl:'rtmp://live-push.rebu.cn/live',streamKey:'rebu_live_8f7d6e5c4b3a2910',status:'online',duration:3845,fps:30,bitrate:4500,resolution:'1920x1080',droppedFrames:12}

const qualityPresets=[{id:'high',name:'高清1080P',resolution:'1920x1080',bitrate:'4500-6000',fps:30,network:'上行≥10Mbps',recommended:true,desc:'适合知识授课'},{id:'medium',name:'标清720P',resolution:'1280x720',bitrate:'2500-4000',fps:30,network:'上行≥5Mbps',recommended:false,desc:'适合大部分场景'},{id:'low',name:'流畅480P',resolution:'854x480',bitrate:'1000-2000',fps:30,network:'上行≥2Mbps',recommended:false,desc:'网络较差时使用'}]

const obsSteps=[{step:1,title:'打开OBS设置',desc:'点击菜单栏「设置」或按快捷键 Ctrl+Shift+S'},{step:2,title:'配置推流',desc:'在「推流」选项卡中，服务选择「自定义...」，填入上方的服务器地址和串流密钥'},{step:3,title:'设置输出',desc:'在「输出」选项卡中，输出模式选择「高级」，编码器选择「硬件(NVENC)」或「软件(x264)」'},{step:4,title:'设置视频',desc:'基础画布分辨率和输出分辨率按照上方画质推荐配置'},{step:5,title:'添加视频源',desc:'在来源中添加「视频捕获设备」或「显示器采集」等来源'},{step:6,title:'开始推流',desc:'点击右下角「开始推流」按钮'}]

function fmtDur(s:number){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h+'时'+m+'分'}
function copy(text:string){uni.setClipboardData({data:text});uni.showToast({title:'已复制',icon:'success'})}

function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}
.content{padding:24rpx}
.status-card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.sk-icon{font-size:48rpx}.sk-title{font-size:28rpx;font-weight:600;color:#2C2C2C;display:block}.sk-dur{font-size:22rpx;color:#999}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}
.info-row{padding:16rpx 0;border-bottom:1px solid #F5F1EB}.ir-label{font-size:24rpx;color:#999;margin-bottom:8rpx;display:block}.ir-val-wrap{display:flex;align-items:center;gap:8rpx}.ir-val{font-size:22rpx;color:#2C2C2C;word-break:break-all;flex:1}.ir-copy{font-size:28rpx;padding:8rpx}.ir-status{display:inline-block;padding:4rpx 16rpx;border-radius:8rpx;font-size:22rpx;background:rgba(34,197,94,.1);color:#22c55e}
.data-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16rpx}.dg{text-align:center}.dg-val{font-size:32rpx;font-weight:700;color:#C41E3A;display:block}.dg-label{font-size:20rpx;color:#999;margin-top:4rpx}
.quality-item{padding:20rpx;border:2rpx solid #E8E0D5;border-radius:16rpx;margin-bottom:12rpx}.quality-item.rec{border-color:#C41E3A;background:rgba(196,30,58,.03)}.qi-head{display:flex;align-items:center;gap:8rpx;margin-bottom:8rpx}.qi-name{font-size:26rpx;font-weight:500;color:#2C2C2C}.qi-rec{font-size:18rpx;padding:2rpx 10rpx;background:#C41E3A;color:#fff;border-radius:6rpx}.qi-res{font-size:22rpx;color:#999}
.step-item{display:flex;gap:16rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.si-num{width:48rpx;height:48rpx;border-radius:50%;background:rgba(196,30,58,.1);color:#C41E3A;display:flex;align-items:center;justify-content:center;font-size:22rpx;font-weight:600;flex-shrink:0}.si-title{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.si-desc{font-size:22rpx;color:#999;margin-top:4rpx}
</style>
