<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">客服中心</text></view><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="chat-area" :style="{height:'calc(100vh - 56px - 140rpx)'}">
      <view v-if="isLoading" class="loading"><text class="spinner">⏳</text></view>
      <view v-else class="messages">
        <view class="msg-welcome"><text class="mw-icon">🤖</text><view class="mw-bubble"><text>你好！我是热卜国学AI客服助手，有什么可以帮你的吗？</text></view></view>
        <view v-for="m in messages" :key="m.id" class="msg" :class="m.role">
          <text v-if="m.role==='assistant'" class="msg-avatar">🤖</text>
          <view class="msg-bubble" :class="m.role"><text>{{m.content}}</text></view>
          <text v-if="m.role==='user'" class="msg-avatar">👤</text>
        </view>
        <view v-if="isTyping" class="msg"><text class="msg-avatar">🤖</text><view class="msg-bubble typing"><text>...</text></view></view>
      </view>
    </scroll-view>

    <view class="quick-links"><text v-for="l in quickLinks" :key="l" class="ql" @click="sendMsg(l)">{{l}}</text></view>
    <view class="input-bar"><input v-model="input" class="ib-input" placeholder="输入你的问题..." @confirm="sendMsg(input)"/><view class="ib-send" @click="sendMsg(input)">发送</view></view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const isLoading=ref(true),input=ref(''),isTyping=ref(false)
const messages=ref<any[]>([])
const quickLinks=['如何购买课程？','如何退款？','忘记密码怎么办？','联系人工客服']

async function sendMsg(text:string){if(!text.trim())return;messages.value.push({id:Date.now(),role:'user',content:text});input.value='';isTyping.value=true;await new Promise(r=>setTimeout(r,1500));isTyping.value=false;messages.value.push({id:Date.now()+1,role:'assistant',content:'感谢您的咨询！如需更多帮助，可以点击下方「联系人工客服」获取专属服务。'})}

function goBack(){uni.navigateBack()}
onMounted(async()=>{await new Promise(r=>setTimeout(r,600));isLoading.value=false})
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh;display:flex;flex-direction:column}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}
.chat-area{flex:1;padding:24rpx}.loading{display:flex;align-items:center;justify-content:center;padding:120rpx 0}.spinner{font-size:56rpx;animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.msg-welcome{display:flex;gap:16rpx;margin-bottom:24rpx}.mw-icon{font-size:44rpx;flex-shrink:0}.mw-bubble{background:#fff;border-radius:24rpx;padding:20rpx 24rpx;font-size:26rpx;color:#2C2C2C;line-height:1.5;max-width:80%;box-shadow:0 2rpx 8rpx rgba(0,0,0,.04)}
.msg{display:flex;gap:12rpx;align-items:flex-start;margin-bottom:20rpx}.msg.user{flex-direction:row-reverse}.msg-avatar{font-size:36rpx;flex-shrink:0;width:64rpx;height:64rpx;border-radius:50%;display:flex;align-items:center;justify-content:center}.msg-bubble{padding:20rpx 24rpx;border-radius:24rpx;font-size:26rpx;line-height:1.5;max-width:75%}.msg .msg-bubble.assistant{background:#fff;color:#2C2C2C;box-shadow:0 2rpx 8rpx rgba(0,0,0,.04)}.msg .msg-bubble.user{background:#C41E3A;color:#fff}.msg-bubble.typing{background:#F5F1EB;color:#999;min-width:80rpx}
.quick-links{display:flex;flex-wrap:wrap;gap:12rpx;padding:16rpx 24rpx;background:#fff;border-top:1px solid #E8E0D5}.ql{padding:12rpx 24rpx;background:#F5F1EB;border-radius:40rpx;font-size:22rpx;color:#666}
.input-bar{display:flex;align-items:center;gap:12rpx;padding:16rpx 24rpx 28rpx;background:#fff;border-top:1px solid #E8E0D5}.ib-input{flex:1;height:72rpx;background:#F5F1EB;border-radius:40rpx;padding:0 24rpx;font-size:26rpx;color:#2C2C2C}.ib-send{padding:16rpx 32rpx;background:#C41E3A;color:#fff;border-radius:40rpx;font-size:26rpx;font-weight:500}
</style>
