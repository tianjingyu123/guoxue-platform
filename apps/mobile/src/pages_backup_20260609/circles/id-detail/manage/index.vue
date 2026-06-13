<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text class="back-icon">←</text><text class="nav-title">圈子管理</text></view><view style="width:48rpx"/></view>
    <view class="tab-bar"><view v-for="t in tabs" :key="t.key" class="tb-item" :class="{act:activeTab===t.key}" @click="activeTab=t.key"><text class="tb-icon">{{t.icon}}</text><text>{{t.label}}</text></view></view>

    <!-- 概览 -->
    <scroll-view v-if="activeTab==='overview'&&stats" scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <view class="grid-2"><view class="sc"><text class="sc-num red">{{stats.totalMembers.toLocaleString()}}</text><text class="sc-label">总成员数</text><text class="sc-plus">+{{stats.newMembersToday}}今日</text></view><view class="sc"><text class="sc-num gold">{{stats.totalPosts.toLocaleString()}}</text><text class="sc-label">总帖子数</text><text class="sc-plus">+{{stats.newPostsToday}}今日</text></view><view class="sc"><text class="sc-num dark">{{stats.activeMembers.toLocaleString()}}</text><text class="sc-label">活跃成员</text></view><view class="sc"><text class="sc-num dark">{{stats.essencePosts}}</text><text class="sc-label">精华帖子</text></view></view>
      <view class="card"><view class="card-head"><text>🔔 圈子公告</text><view class="save-btn" :class="{dis:saving}" @click="saveAnnouncement">{{saving?'保存中...':'保存'}}</view></view><textarea v-model="announcement" class="ann-input" placeholder="输入圈子公告..."/></view>
      <view style="height:48rpx"/>
    </scroll-view>

    <!-- 成员 -->
    <scroll-view v-if="activeTab==='members'" scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <view class="search-wrap"><text class="s-icon">🔍</text><input class="s-input" placeholder="搜索成员"/></view>
      <view v-for="m in membersList" :key="m.id" class="mem-card">
        <view class="mem-avatar"><text>{{m.name[0]}}</text></view>
        <view class="mem-info"><text class="mem-name">{{m.name}}<text class="mem-role" :class="'role-'+m.role">{{roleLabel(m.role)}}</text></text><text class="mem-meta">发帖{{m.posts}}·加入于{{m.joinedAt}}</text></view>
        <view v-if="m.role!=='owner'" class="mem-menu" @click="showMenu=m.id"><text>⋯</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <!-- 帖子 -->
    <scroll-view v-if="activeTab==='posts'" scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <view v-for="p in postsList" :key="p.id" class="post-card">
        <view class="pc-head"><text class="pc-avatar">{{p.author.name[0]}}</text><view class="pc-info"><text class="pc-name">{{p.author.name}}</text><view class="pc-badges"><text v-if="p.isPinned" class="pc-badge pin">置顶</text><text v-if="p.isEssence" class="pc-badge essence">精华</text></view></view></view>
        <text class="pc-content">{{p.content}}</text>
        <view class="pc-meta"><text>{{p.likes}}赞</text><text>{{p.comments}}评论</text><text>{{p.createdAt}}</text></view>
        <view class="pc-actions"><view class="pca-btn" :class="{on:p.isPinned}" @click="toggleTop(p.id)">📌{{p.isPinned?'取消置顶':'置顶'}}</view><view class="pca-btn" :class="{on:p.isEssence}" @click="toggleEssence(p.id)">⭐{{p.isEssence?'取消精华':'精华'}}</view><view class="pca-btn del" @click="confirmAction={type:'deletePost',id:p.id,name:p.content.slice(0,20)}">🗑️删除</view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <!-- 设置 -->
    <scroll-view v-if="activeTab==='settings'" scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <view class="card"><text class="card-title">基本信息</text><view class="field"><text class="fl">圈子名称</text><input class="fi" defaultValue="八字命理研习社"/></view><view class="field"><text class="fl">圈子简介</text><textarea class="fi ta" defaultValue="探讨八字命理学问"/></view><view class="field"><text class="fl">分类</text><picker class="fi" range="命理,风水,养生,书法"><text>命理</text></picker></view></view>
      <view class="card"><text class="card-title">圈规设置</text><textarea class="ann-input" placeholder="请输入圈规，每行一条"/></view>
      <view class="save-all-btn">保存设置</view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view v-if="confirmAction" class="mask" @click="confirmAction=null"/>
    <view v-if="confirmAction" class="cfm-modal">
      <text class="cfm-icon">⚠️</text><text class="cfm-title">{{cfmTitle}}</text><text class="cfm-desc">{{cfmDesc}}</text>
      <view class="cfm-btns"><view class="cfm-btn cancel" @click="confirmAction=null">取消</view><view class="cfm-btn ok" @click="doConfirm">确定</view></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const activeTab=ref<'overview'|'members'|'posts'|'settings'>('overview'),saving=ref(false),announcement=ref('欢迎加入圈子！请遵守圈规。'),showMenu=ref<string|null>(null),confirmAction=ref<any>(null)

const tabs=[{key:'overview',label:'概览',icon:'📊'},{key:'members',label:'成员',icon:'👥'},{key:'posts',label:'帖子',icon:'📄'},{key:'settings',label:'设置',icon:'⚙️'}]
const stats=ref({totalMembers:12800,newMembersToday:56,totalPosts:3560,newPostsToday:128,activeMembers:2340,essencePosts:89})
const membersList=ref([{id:'1',name:'周易大师',role:'owner',joinedAt:'2024-01-01',posts:568},{id:'2',name:'紫微真人',role:'admin',joinedAt:'2024-02-15',posts:234},{id:'3',name:'命理学徒',role:'member',joinedAt:'2024-06-01',posts:45},{id:'4',name:'易学新手',role:'member',joinedAt:'2024-06-10',posts:12}])
const postsList=ref([{id:'1',content:'八字入门必看：如何快速掌握基础知识',author:{name:'周易大师'},createdAt:'2024-06-01',likes:256,comments:89,isPinned:true,isEssence:true},{id:'2',content:'今日分享一个有趣的八字案例分析',author:{name:'紫微真人'},createdAt:'2024-06-02',likes:128,comments:45},{id:'3',content:'新人报道，请多多指教',author:{name:'命理学徒'},createdAt:'2024-06-03',likes:34,comments:12}])

function roleLabel(r:string){const m:any={owner:'圈主',admin:'管理员'};return m[r]||'成员'}
function saveAnnouncement(){saving.value=true;setTimeout(()=>{saving.value=false},800)}
function toggleTop(id:string){postsList.value=postsList.value.map(p=>p.id===id?{...p,isPinned:!p.isPinned}:p)}
function toggleEssence(id:string){postsList.value=postsList.value.map(p=>p.id===id?{...p,isEssence:!p.isEssence}:p)}
function doConfirm(){if(confirmAction.value?.type==='deletePost')postsList.value=postsList.value.filter(p=>p.id!==confirmAction.value.id);confirmAction.value=null}
const cfmTitle=computed(()=>{const t=confirmAction.value?.type;return t==='deletePost'?'删除帖子':t==='remove'?'移出圈子':t==='setAdmin'?'设为管理员':'取消管理员'})
const cfmDesc=computed(()=>{const a=confirmAction.value;return a?`确定${a.type==='deletePost'?'删除帖子"'+a.name+'..."':a.type==='remove'?'将"'+a.name+'"移出圈子':'对"'+a.name+'"'+cfmTitle.value}？此操作不可撤销。`:''
})

function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx}
.back-icon{font-size:36rpx;color:#2C2C2C}
.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.tab-bar{display:flex;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:56px;z-index:30}
.tb-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:4rpx;padding:16rpx 0;font-size:20rpx;color:#999;position:relative}
.tb-item.act{color:#C41E3A}
.tb-item.act::after{content:'';position:absolute;bottom:0;width:64rpx;height:4rpx;background:#C41E3A;border-radius:2rpx}
.tb-icon{font-size:32rpx}
.content{padding:24rpx}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:24rpx}
.sc{background:#fff;border-radius:20rpx;padding:28rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.sc-num{font-size:40rpx;font-weight:700;display:block;margin-bottom:4rpx}
.sc-num.red{color:#C41E3A}.sc-num.gold{color:#C9A96E}.sc-num.dark{color:#2C2C2C}
.sc-label{font-size:22rpx;color:#999;display:block}
.sc-plus{font-size:20rpx;color:#22c55e;margin-top:4rpx}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16rpx;font-size:26rpx;font-weight:500;color:#2C2C2C}
.save-btn{background:#C41E3A;color:#fff;padding:8rpx 20rpx;border-radius:40rpx;font-size:22rpx}
.save-btn.dis{opacity:.5}
.ann-input{width:100%;height:160rpx;padding:20rpx;background:#FAF8F5;border-radius:16rpx;font-size:24rpx;box-sizing:border-box;resize:none}
.search-wrap{display:flex;align-items:center;background:#fff;border-radius:40rpx;padding:0 20rpx;margin-bottom:16rpx}
.s-icon{font-size:28rpx;margin-right:12rpx}
.s-input{flex:1;height:72rpx;font-size:26rpx}
.mem-card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.mem-avatar{width:72rpx;height:72rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:28rpx;color:#2C2C2C;flex-shrink:0}
.mem-info{flex:1}
.mem-name{font-size:26rpx;color:#2C2C2C;display:flex;align-items:center;gap:8rpx}
.mem-role{font-size:18rpx;padding:2rpx 10rpx;border-radius:6rpx}
.role-owner{background:rgba(201,169,110,.1);color:#C9A96E}
.role-admin{background:rgba(59,130,246,.1);color:#3b82f6}
.mem-meta{font-size:22rpx;color:#999;margin-top:4rpx}
.mem-menu{font-size:36rpx;color:#999;padding:8rpx}

.post-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.pc-head{display:flex;gap:12rpx;margin-bottom:12rpx}
.pc-avatar{width:56rpx;height:56rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:24rpx;flex-shrink:0}
.pc-name{font-size:26rpx;font-weight:500;color:#2C2C2C}
.pc-badges{display:flex;gap:6rpx;margin-top:4rpx}
.pc-badge{font-size:18rpx;padding:2rpx 10rpx;border-radius:6rpx}
.pc-badge.pin{background:rgba(196,30,58,.1);color:#C41E3A}
.pc-badge.essence{background:rgba(201,169,110,.1);color:#C9A96E}
.pc-content{font-size:26rpx;color:#2C2C2C;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12rpx}
.pc-meta{display:flex;gap:24rpx;font-size:22rpx;color:#999;margin-bottom:16rpx}
.pc-actions{display:flex;gap:12rpx;padding-top:16rpx;border-top:1px solid #E8E0D5}
.pca-btn{padding:12rpx 24rpx;border-radius:40rpx;font-size:22rpx;background:#FAF8F5;color:#666}
.pca-btn.on{background:#C41E3A;color:#fff}
.pca-btn.del{background:rgba(239,68,68,.1);color:#ef4444}

.card-title{font-size:26rpx;font-weight:500;color:#2C2C2C;margin-bottom:20rpx;display:block}
.field{margin-bottom:20rpx}
.fl{font-size:22rpx;color:#999;margin-bottom:8rpx;display:block}
.fi{width:100%;height:72rpx;padding:0 20rpx;background:#FAF8F5;border-radius:16rpx;font-size:24rpx;box-sizing:border-box}
.fi.ta{height:128rpx;padding:20rpx;resize:none}
.save-all-btn{background:linear-gradient(90deg,#C41E3A,#E85050);color:#fff;text-align:center;padding:24rpx;border-radius:24rpx;font-size:28rpx;font-weight:500}

.mask{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100}
.cfm-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:32rpx;padding:40rpx;width:560rpx;z-index:101;text-align:center}
.cfm-icon{font-size:56rpx;display:block;margin-bottom:16rpx}
.cfm-title{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:12rpx}
.cfm-desc{font-size:24rpx;color:#999;display:block;margin-bottom:28rpx}
.cfm-btns{display:flex;gap:16rpx}
.cfm-btn{flex:1;padding:22rpx;border-radius:20rpx;font-size:26rpx;font-weight:500}
.cfm-btn.cancel{background:#F5F1EB;color:#666}
.cfm-btn.ok{background:#C41E3A;color:#fff}
</style>
