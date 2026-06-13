<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text class="back-icon">←</text><text class="nav-title">扫码结果</text></view><view style="width:48rpx"/></view>

    <view v-if="status==='parsing'" class="state"><text class="spinner">⏳</text><text class="state-text">正在解析二维码...</text></view>

    <view v-else-if="status==='error'" class="state">
      <text class="state-icon">❌</text><text class="state-title">无法识别二维码</text><text class="state-desc">{{content?'该二维码内容无法识别或已失效':'未获取到二维码内容'}}</text>
      <view v-if="result&&result.data.content" class="raw-card"><text class="raw-label">原始内容：</text><text class="raw-text">{{result.data.content}}</text></view>
      <view class="err-btns"><view class="eb-btn" @click="goBack">🔄 重新扫码</view><view class="eb-btn outline" @click="goHome">🏠 返回首页</view></view>
    </view>

    <view v-else-if="result" class="result">
      <view class="type-badge" :style="{backgroundColor:typeConfig.bg}"><text class="type-icon">{{typeConfig.icon}}</text></view>
      <text class="type-label">{{typeConfig.label}}</text>

      <view class="content-card">
        <view v-if="result.type==='friend'" class="friend-row"><text class="fr-avatar">{{result.data.nickname[0]}}</text><view><text class="fr-name">{{result.data.nickname}}</text><text class="fr-sig">{{result.data.signature}}</text></view></view>
        <view v-else-if="result.type==='group'" class="friend-row"><text class="fr-avatar large">{{result.data.name[0]}}</text><view><text class="fr-name">{{result.data.name}}</text><text class="fr-sig">{{result.data.memberCount}}人·{{result.data.description}}</text></view></view>
        <view v-else-if="result.type==='pay'" class="friend-row"><text class="fr-avatar">{{result.data.merchantName[0]}}</text><view><text class="fr-name">{{result.data.merchantName}}</text><text class="fr-sig">向TA付款</text></view></view>
        <view v-else-if="result.type==='course'" class="course-row"><view class="cr-cover">📚</view><view><text class="cr-title">{{result.data.title}}</text><text class="cr-teacher">{{result.data.teacher}}</text><text class="cr-price">¥{{result.data.price}}</text></view></view>
        <view v-else-if="result.type==='article'" class="course-row"><view class="cr-cover">📄</view><view><text class="cr-title">{{result.data.title}}</text><text class="cr-teacher">{{result.data.author}}</text></view></view>
        <view v-else-if="result.type==='live'" class="course-row"><view class="cr-cover">📻</view><view><text class="cr-title">{{result.data.title}}</text><text class="cr-teacher">{{result.data.host}}</text></view></view>
        <view v-else-if="result.type==='invite'" class="center"><text class="fr-avatar large">{{result.data.inviterName[0]}}</text><text class="inv-text">{{result.data.inviterName}} 邀请您加入热卜</text><view v-for="(b,i) in result.data.benefits" :key="i" class="benefit">✓ {{b}}</view></view>
        <view v-else-if="result.type==='checkin'" class="center"><text class="ck-title">{{result.data.eventName}}</text><text class="ck-info">{{result.data.eventTime}}</text><text class="ck-info">{{result.data.location}}</text></view>
        <view v-else-if="result.type==='url'" class="url-wrap"><text class="url-label">即将访问外部链接：</text><text class="url-link">{{result.data.url}}</text><text class="url-warn">⚠️ 请注意识别链接安全性</text></view>
      </view>

      <view v-if="result.action" class="act-btn" :class="{dis:actionLoading}" @click="handleAction">
        <text>{{actionLoading?'⏳':'→'}} {{result.action.label}}</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
const status=ref<'parsing'|'success'|'error'>('parsing'),result=ref<any>(null),actionLoading=ref(false),content=ref('rebu://user/123')

const typeConfigs:any={friend:{icon:'👤',label:'好友名片',bg:'rgba(59,130,246,.1)'},group:{icon:'👥',label:'群聊',bg:'rgba(34,197,94,.1)'},pay:{icon:'💳',label:'收款码',bg:'rgba(245,158,11,.1)'},course:{icon:'📚',label:'课程',bg:'rgba(168,85,247,.1)'},article:{icon:'📄',label:'文章',bg:'rgba(6,182,212,.1)'},live:{icon:'📻',label:'直播',bg:'rgba(239,68,68,.1)'},invite:{icon:'👋',label:'邀请注册',bg:'rgba(196,30,58,.1)'},checkin:{icon:'✅',label:'签到',bg:'rgba(34,197,94,.1)'},url:{icon:'🔗',label:'外部链接',bg:'#F5F1EB'},unknown:{icon:'❓',label:'未知',bg:'#F5F1EB'}}
const typeConfig=computed(()=>result.value?typeConfigs[result.value.type]||typeConfigs.unknown:typeConfigs.unknown)

async function parseQrCode(c:string){await new Promise(r=>setTimeout(r,1000));if(c.includes('rebu.com')||c.includes('rebu://')){
  if(c.includes('/user/'))return{type:'friend',data:{userId:'123',nickname:'国学爱好者',signature:'探索国学智慧，传承传统文化'},action:{label:'添加好友',handler:'addFriend'}}
  if(c.includes('/group/'))return{type:'group',data:{groupId:'456',name:'八字命理交流群',memberCount:128,description:'探讨八字命理'},action:{label:'申请加入',handler:'joinGroup'}}
  if(c.includes('/course/'))return{type:'course',data:{courseId:'1',title:'八字命理入门精讲',price:199,teacher:'张明德'},action:{label:'查看课程',url:'/pages/courses/course-detail/index'}}
  if(c.includes('/invite/'))return{type:'invite',data:{inviteCode:'ABC',inviterName:'国学传承者',benefits:['注册即得100积分','首单立减10元']},action:{label:'立即注册',url:'/pages/login/register/index'}}
}return{type:'unknown',data:{content:c}}}

async function handleAction(){if(!result.value?.action)return;actionLoading.value=true;await new Promise(r=>setTimeout(r,1500));actionLoading.value=false;goBack()}

function goBack(){uni.navigateBack()}
function goHome(){uni.reLaunch({url:'/pages/index/index'})}

onMounted(async()=>{try{result.value=await parseQrCode(content.value);status.value=result.value.type==='unknown'?'error':'success'}catch{status.value='error'}})
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx}
.back-icon{font-size:36rpx;color:#2C2C2C}
.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.state{display:flex;flex-direction:column;align-items:center;padding:120rpx 48rpx;text-align:center}
.spinner{font-size:64rpx;animation:spin 1s linear infinite;margin-bottom:24rpx}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.state-text{font-size:28rpx;color:#999}
.state-icon{font-size:80rpx;margin-bottom:24rpx}
.state-title{font-size:34rpx;font-weight:600;color:#2C2C2C;margin-bottom:12rpx}
.state-desc{font-size:26rpx;color:#999;margin-bottom:32rpx}
.raw-card{background:#fff;border-radius:16rpx;padding:24rpx;width:100%;margin-bottom:24rpx}
.raw-label{font-size:24rpx;color:#999;margin-bottom:8rpx;display:block}
.raw-text{font-size:24rpx;color:#666;word-break:break-all}
.err-btns{display:flex;gap:16rpx}
.eb-btn{padding:20rpx 40rpx;border-radius:40rpx;font-size:26rpx;background:#C41E3A;color:#fff}
.eb-btn.outline{border:1px solid #E8E0D5;background:#fff;color:#666}
.result{display:flex;flex-direction:column;align-items:center;padding:48rpx 24rpx}
.type-badge{width:120rpx;height:120rpx;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:12rpx}
.type-icon{font-size:56rpx}
.type-label{font-size:24rpx;color:#999;margin-bottom:32rpx}
.content-card{width:100%;background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:32rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.friend-row{display:flex;align-items:center;gap:20rpx}
.fr-avatar{width:96rpx;height:96rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:36rpx;color:#2C2C2C;flex-shrink:0}
.fr-avatar.large{border-radius:24rpx}
.fr-name{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block}
.fr-sig{font-size:24rpx;color:#999;margin-top:4rpx}
.course-row{display:flex;gap:16rpx}
.cr-cover{width:160rpx;height:96rpx;background:#F5F1EB;border-radius:16rpx;display:flex;align-items:center;justify-content:center;font-size:48rpx;flex-shrink:0}
.cr-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cr-teacher{font-size:24rpx;color:#999;margin-top:4rpx}
.cr-price{font-size:28rpx;color:#C41E3A;font-weight:600;margin-top:4rpx}
.center{display:flex;flex-direction:column;align-items:center;gap:12rpx}
.inv-text{font-size:26rpx;color:#666}
.benefit{font-size:24rpx;color:#22c55e}
.ck-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.ck-info{font-size:24rpx;color:#999}
.url-wrap{}
.url-label{font-size:24rpx;color:#999;display:block;margin-bottom:8rpx}
.url-link{font-size:24rpx;color:#3b82f6;word-break:break-all}
.url-warn{font-size:22rpx;color:#f97316;display:block;margin-top:12rpx}
.act-btn{width:100%;padding:28rpx;background:#C41E3A;color:#fff;text-align:center;border-radius:24rpx;font-size:28rpx;font-weight:500}
.act-btn.dis{opacity:.5}
</style>
