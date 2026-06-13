<template>
  <view class="page">
    <view class="cover-wrap"><view class="cover-img"/>
      <view class="cover-nav"><view class="cn-btn" @click="goBack"><text>←</text></view><view class="cn-btn" @click="handleShare"><text>📤</text></view></view>
      <view v-if="data.joinStatus.discount" class="cover-tag"><text>✨ {{data.joinStatus.discount}}</text></view>
    </view>

    <view class="info-card">
      <view class="ic-row"><view class="ic-avatar">👑</view><view class="ic-info"><text class="ic-name">{{data.circle.name}}</text><text class="ic-desc">{{data.circle.description}}</text><view class="ic-stats"><text>👥{{data.circle.members.toLocaleString()}}成员</text><text>📄{{data.circle.posts.toLocaleString()}}帖子</text><text class="ic-active">🟢今日活跃{{data.circle.todayActive}}</text></view></view></view>
      <view class="ic-tags"><text v-for="t in data.circle.tags" :key="t" class="ic-tag">#{{t}}</text></view>
    </view>

    <view class="section"><text class="s-title">⭐ 精华内容预览</text><text class="s-sub">加入后解锁全部</text></view>
    <view v-for="(post,i) in data.featuredPosts" :key="post.id" class="post-card" @click="showLockTip(post.id)">
      <view class="pc-rank" :class="'r'+i"><text>{{i+1}}</text></view>
      <view class="pc-body"><text class="pc-author-avatar">{{post.author.name[0]}}</text><text class="pc-author">{{post.author.name}}</text><text class="pc-preview">{{post.preview}}</text>
        <view class="pc-stats"><text>❤️{{post.likes}}</text><text>💬{{post.comments}}</text></view>
      </view>
      <view v-if="lockTipId===post.id" class="pc-lock"><text>🔒 加入圈子后查看详情</text></view>
    </view>

    <view class="more-hint"><text>🔒 还有 <text class="more-num">{{data.circle.posts - data.featuredPosts.length}}</text> 篇精彩内容</text><text class="more-sub">加入圈子立即解锁</text></view>

    <view class="section"><text class="s-title">加入后享有</text></view>
    <view class="perks-grid"><view v-for="p in perks" :key="p.text" class="perk"><text class="pk-icon">{{p.icon}}</text><text>{{p.text}}</text></view></view>

    <view class="bottom-bar">
      <view class="bb-price"><text v-if="data.joinStatus.isPaid" class="bb-p">¥{{data.joinStatus.price}}</text><text v-else class="bb-free">免费加入</text></view>
      <view class="bb-btn" @click="handleJoin"><text>{{data.joinStatus.isPaid?'立即加入':'免费加入'}}</text></view>
    </view>

    <view v-if="showJoinModal" class="mask" @click="showJoinModal=false"/>
    <view v-if="showJoinModal" class="join-sheet">
      <view class="js-handle"/><text class="js-title">加入{{data.circle.name}}</text><text class="js-sub">开启您的学习之旅</text>
      <view class="js-price-card"><view class="js-row"><text>会员时长</text><text>{{data.joinStatus.membershipDays}}天</text></view><view class="js-row"><text>支付金额</text><text class="js-amount">¥{{data.joinStatus.price}}</text></view></view>
      <view class="js-pay-btn">确认支付</view>
      <text class="js-agree">点击确认即表示同意《用户协议》</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const isLoading=ref(true),lockTipId=ref<string|null>(null),showJoinModal=ref(false)

const data=ref({circle:{name:'八字命理研习社',description:'专注八字命理学习与交流，从入门到精通，共同探索命理奥秘。',category:'命理',members:12860,posts:3280,todayActive:128,tags:['八字','命理','易学','传统文化']},featuredPosts:[{id:'1',content:'今天给大家分享八字看婚姻的技巧...',author:{name:'命理研究者'},likes:328,comments:56,preview:'日支为配偶宫...'},{id:'2',content:'关于食神制杀格局的详细分析...',author:{name:'易学传承'},likes:256,comments:42,preview:'食神制杀是八字中非常重要的格局...'},{id:'3',content:'八字十神详解系列（一）...',author:{name:'周易学堂'},likes:412,comments:89,preview:'比肩代表同类相助...'},{id:'4',content:'从八字看职业方向...',author:{name:'命理导师'},likes:198,comments:34,preview:'官杀旺者适合从政或管理岗位...'}],joinStatus:{isJoined:false,isPaid:true,price:99,originalPrice:199,membershipDays:365,discount:'限时5折'}})
const perks=[{icon:'📄',text:'查看全部精华帖'},{icon:'💬',text:'参与圈子讨论'},{icon:'👥',text:'结识同好圈友'},{icon:'⭐',text:'专属会员活动'}]

function showLockTip(id:string){lockTipId.value=id;setTimeout(()=>lockTipId.value=null,2000)}
function handleJoin(){data.value.joinStatus.isPaid?showJoinModal.value=true:goBack()}
function handleShare(){}
function goBack(){uni.navigateBack()}

onMounted(async()=>{await new Promise(r=>setTimeout(r,500));isLoading.value=false})
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh;padding-bottom:160rpx}
.cover-wrap{position:relative;height:380rpx}
.cover-img{width:100%;height:100%;background:linear-gradient(135deg,rgba(196,30,58,.3),rgba(201,169,110,.2))}
.cover-nav{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;padding:20rpx 24rpx}
.cn-btn{width:64rpx;height:64rpx;border-radius:50%;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28rpx}
.cover-tag{position:absolute;top:40rpx;left:50%;transform:translateX(-50%);background:linear-gradient(90deg,#C41E3A,#FF6B35);padding:12rpx 28rpx;border-radius:40rpx;color:#fff;font-size:24rpx;font-weight:600}
.info-card{margin:-80rpx 24rpx 0;background:#fff;border-radius:24rpx;padding:28rpx;box-shadow:0 4rpx 24rpx rgba(0,0,0,.1);position:relative;z-index:10}
.ic-row{display:flex;gap:16rpx}
.ic-avatar{width:96rpx;height:96rpx;border-radius:24rpx;background:linear-gradient(135deg,#C9A96E,#A67C52);display:flex;align-items:center;justify-content:center;font-size:44rpx;flex-shrink:0}
.ic-name{font-size:34rpx;font-weight:700;color:#2C2C2C;display:block}
.ic-desc{font-size:24rpx;color:#999;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:4rpx 0 8rpx}
.ic-stats{display:flex;gap:16rpx;font-size:22rpx;color:#999}
.ic-active{color:#C41E3A}
.ic-tags{display:flex;flex-wrap:wrap;gap:10rpx;margin-top:20rpx}
.ic-tag{font-size:22rpx;padding:6rpx 16rpx;background:#F5F1EB;color:#999;border-radius:8rpx}
.section{padding:24rpx 24rpx 12rpx}
.s-title{font-size:30rpx;font-weight:600;color:#2C2C2C}
.s-sub{font-size:22rpx;color:#999;margin-left:8rpx}
.post-card{position:relative;background:#fff;border-radius:20rpx;padding:24rpx;margin:0 24rpx 16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04);overflow:hidden}
.pc-rank{position:absolute;top:0;right:0;width:56rpx;height:56rpx;display:flex;align-items:flex-start;justify-content:flex-end;padding:8rpx 10rpx;font-size:20rpx;font-weight:700;color:#fff}
.r0{background:linear-gradient(135deg,#FFD700,#FFA500)}.r1{background:linear-gradient(135deg,#C0C0C0,#A0A0A0)}.r2{background:linear-gradient(135deg,#CD7F32,#A0522D)}.r3,.r4{background:#999}
.pc-body{display:flex;flex-direction:column;gap:8rpx}
.pc-author-avatar{width:48rpx;height:48rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:20rpx;color:#999}
.pc-author{font-size:24rpx;color:#2C2C2C;font-weight:500}
.pc-preview{font-size:24rpx;color:#666;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pc-stats{display:flex;gap:24rpx;font-size:22rpx;color:#999}
.pc-lock{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);color:#fff;font-size:26rpx;z-index:5}
.more-hint{background:#F5F1EB;border-radius:20rpx;padding:28rpx;margin:0 24rpx 24rpx;text-align:center;font-size:24rpx;color:#999}
.more-num{color:#C41E3A;font-weight:700}.more-sub{display:block;font-size:22rpx;margin-top:4rpx}
.perks-grid{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;padding:0 24rpx 24rpx}
.perk{display:flex;align-items:center;gap:12rpx;background:#fff;border-radius:16rpx;padding:20rpx;font-size:24rpx;color:#2C2C2C}
.pk-icon{font-size:32rpx}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #E8E0D5;padding:20rpx 24rpx;display:flex;align-items:center;gap:24rpx;z-index:50}
.bb-price{flex:1}
.bb-p{font-size:44rpx;font-weight:900;color:#C41E3A}.bb-free{font-size:34rpx;font-weight:600;color:#2C2C2C}
.bb-btn{background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;padding:24rpx 56rpx;border-radius:40rpx;font-size:28rpx;font-weight:600}
.mask{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100}
.join-sheet{position:fixed;bottom:0;left:0;right:0;background:#fff;border-radius:32rpx 32rpx 0 0;padding:24rpx;z-index:101}
.js-handle{width:64rpx;height:8rpx;background:#E8E0D5;border-radius:4rpx;margin:0 auto 24rpx}
.js-title{font-size:34rpx;font-weight:600;color:#2C2C2C;text-align:center;display:block}
.js-sub{font-size:24rpx;color:#999;text-align:center;display:block;margin:8rpx 0 32rpx}
.js-price-card{background:linear-gradient(135deg,#FFF5F0,#FFEBE5);border:1px solid rgba(196,30,58,.2);border-radius:24rpx;padding:24rpx;margin-bottom:24rpx}
.js-row{display:flex;justify-content:space-between;padding:12rpx 0;font-size:26rpx;color:#2C2C2C}
.js-amount{font-size:44rpx;font-weight:900;color:#C41E3A}
.js-pay-btn{background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;text-align:center;padding:24rpx;border-radius:24rpx;font-size:28rpx;font-weight:600;margin-bottom:16rpx}
.js-agree{text-align:center;font-size:20rpx;color:#999;display:block}
</style>
